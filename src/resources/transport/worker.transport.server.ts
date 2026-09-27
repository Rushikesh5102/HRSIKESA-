/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Dedicated Worker Transport Server
 *
 * Runs an isolated encrypted TLS/TCP listener specifically for physical worker
 * nodes. Does NOT expose control plane REST APIs or sensitive internal state.
 * Implements IDispatchHandler to integrate seamlessly with ResourceScheduler.
 */

import * as net from 'node:net';
import * as tls from 'node:tls';
import * as crypto from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { CancellationToken } from '../../inference/backend.types.js';
import { Worker, WorkerTask } from '../resource.types.js';
import { ResourceManager } from '../resource.manager.js';
import { IDispatchHandler } from '../resource.scheduler.js';
import {
  TransportMessage,
  WorkerTransportServerConfig,
  TransportMetrics,
  EnrollPayload,
  EnrollAckPayload,
  AuthPayload,
  AuthAckPayload,
  HeartbeatPayload,
  HeartbeatAckPayload,
  ResourceUpdatePayload,
  TaskProgressPayload,
  TaskCompletedPayload,
  TaskFailedPayload,
  TaskCancelledPayload,
  NetworkTier,
} from './worker.transport.types.js';
import { TlsCertificateManager, TlsKeyPair } from './worker.transport.tls.js';
import { TransportProtocolFraming } from './worker.transport.protocol.js';
import { LanNetworkHelper } from './worker.transport.network.js';

interface ConnectedWorkerSession {
  readonly workerId: string;
  readonly sessionToken: string;
  readonly socket: net.Socket;
  readonly framing: TransportProtocolFraming;
  readonly connectedAt: string;
  lastHeartbeat: string;
  readonly activeTaskIds: Set<string>;
  fingerprint?: string;
  lastPingRttMs?: number;
  averagePingRttMs?: number;
  networkTier?: NetworkTier;
}

interface PendingTaskExecution {
  readonly task: WorkerTask;
  readonly worker: Worker;
  readonly resolve: (result: { success: boolean; workerId?: string; output?: Record<string, unknown>; error?: string }) => void;
  readonly onProgress?: (progress: number, message?: string, tokenChunk?: string) => void;
  readonly cancellationToken?: CancellationToken;
  readonly unbindCancel?: () => void;
}

export class WorkerTransportServer implements IDispatchHandler {
  private server: net.Server | tls.Server | null = null;
  private readonly config: WorkerTransportServerConfig;
  private readonly resourceManager: ResourceManager;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly sessions = new Map<string, ConnectedWorkerSession>(); // workerId -> session
  private readonly socketSessions = new Map<net.Socket, ConnectedWorkerSession>(); // socket -> session
  private readonly sessionTokens = new Map<string, string>(); // sessionToken -> workerId
  private readonly pendingTasks = new Map<string, PendingTaskExecution>(); // taskId -> execution
  private readonly pendingPings = new Map<string, { sentAt: number; resolve: (rtt: number) => void }>(); // correlationId -> ping
  private tlsKeyPair: TlsKeyPair | null = null;
  private isListening = false;

  private metrics: TransportMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0,
    rejectedConnections: 0,
    averagePingRttMs: 0,
  };

  constructor(
    config: Partial<WorkerTransportServerConfig>,
    resourceManager: ResourceManager,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.config = {
      bindHost: config.bindHost || process.env.HRSK_WORKER_BIND_HOST || '127.0.0.1',
      port: config.port || Number(process.env.HRSK_WORKER_PORT) || 4300,
      tlsEnabled: config.tlsEnabled ?? true,
      keyPem: config.keyPem,
      certPem: config.certPem,
      maxPayloadBytes: config.maxPayloadBytes || 5 * 1024 * 1024,
      rateLimitPerMinute: config.rateLimitPerMinute || 600,
      heartbeatTimeoutMs: config.heartbeatTimeoutMs || 30000,
    };
    this.resourceManager = resourceManager;
    this.eventBus = eventBus;
    this.logger = logger?.child('WorkerTransportServer');
  }

  public async start(): Promise<void> {
    if (this.isListening) return;

    if (this.config.tlsEnabled) {
      if (!this.config.certPem || !this.config.keyPem) {
        this.logger?.info('Generating self-signed development/LAN TLS 1.3 certificate pair.');
        this.tlsKeyPair = TlsCertificateManager.generateSelfSignedCertificate('hrisekesa-worker-transport');
      } else {
        this.tlsKeyPair = {
          certPem: this.config.certPem,
          keyPem: this.config.keyPem,
          fingerprint: TlsCertificateManager.computeFingerprint(this.config.certPem),
          commonName: 'hrisekesa-worker-transport',
          expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        };
      }

      this.server = tls.createServer(
        {
          key: this.tlsKeyPair.keyPem,
          cert: this.tlsKeyPair.certPem,
          minVersion: 'TLSv1.2',
        },
        (socket: tls.TLSSocket) => this.handleConnection(socket)
      );
    } else {
      this.server = net.createServer((socket: net.Socket) => this.handleConnection(socket));
    }

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(this.config.port, this.config.bindHost, () => {
        this.isListening = true;
        this.logger?.info(
          `Dedicated Worker Transport listening on ${this.config.bindHost}:${this.config.port} (TLS: ${this.config.tlsEnabled ? 'ENABLED' : 'DISABLED'})`
        );
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.isListening || !this.server) return;

    // Disconnect all sessions
    for (const session of this.sessions.values()) {
      try {
        session.socket.destroy();
      } catch {
        // ignore
      }
    }
    this.sessions.clear();
    this.socketSessions.clear();
    this.sessionTokens.clear();

    try {
      if (typeof (this.server as any).closeAllConnections === 'function') {
        (this.server as any).closeAllConnections();
      }
    } catch {}

    await new Promise<void>((resolve) => {
      this.server!.close(() => {
        this.isListening = false;
        this.server = null;
        this.logger?.info('Dedicated Worker Transport stopped.');
        resolve();
      });
    });
  }

  public getFingerprint(): string {
    return this.tlsKeyPair?.fingerprint || 'NO_TLS';
  }

  public getCertPem(): string | undefined {
    return this.tlsKeyPair?.certPem;
  }

  public getMetrics(): TransportMetrics {
    return { ...this.metrics };
  }

  public getConnectedWorkerIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  public isWorkerConnected(workerId: string): boolean {
    return this.sessions.has(workerId);
  }

  public drainWorker(workerId: string): void {
    const session = this.sessions.get(workerId);
    if (session) {
      this.sendMessage(session, {
        header: {
          messageId: crypto.randomUUID(),
          protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
          timestamp: new Date().toISOString(),
          type: 'WORKER_DRAIN',
          workerId,
        },
        payload: { workerId },
      });
      this.logger?.info(`Emitted WORKER_DRAIN frame to worker '${workerId}'.`);
    }
  }

  public getActiveTaskIdsForWorker(workerId: string): string[] {
    const session = this.sessions.get(workerId);
    return session ? Array.from(session.activeTaskIds) : [];
  }

  public getPrimaryLanIp(): string {
    return LanNetworkHelper.getPrimaryLanIpv4();
  }

  public getLanEndpoint(): string {
    return LanNetworkHelper.formatLanEndpoint(this.config.bindHost, this.config.port);
  }

  public getPort(): number {
    return this.config.port;
  }

  public getBindHost(): string {
    return this.config.bindHost;
  }

  public getWorkerLatency(workerId: string): { rttMs: number; averageRttMs: number; tier: NetworkTier } | undefined {
    const session = this.sessions.get(workerId);
    if (!session || session.lastPingRttMs === undefined) return undefined;
    return {
      rttMs: session.lastPingRttMs,
      averageRttMs: Math.round(session.averagePingRttMs || session.lastPingRttMs),
      tier: session.networkTier || LanNetworkHelper.determineNetworkTier(session.lastPingRttMs),
    };
  }

  public getAllWorkerLatencies(): Record<string, { rttMs: number; averageRttMs: number; tier: NetworkTier }> {
    const result: Record<string, { rttMs: number; averageRttMs: number; tier: NetworkTier }> = {};
    for (const [id, session] of this.sessions.entries()) {
      if (session.lastPingRttMs !== undefined) {
        result[id] = {
          rttMs: session.lastPingRttMs,
          averageRttMs: Math.round(session.averagePingRttMs || session.lastPingRttMs),
          tier: session.networkTier || LanNetworkHelper.determineNetworkTier(session.lastPingRttMs),
        };
      }
    }
    return result;
  }

  public async pingWorker(workerId: string, timeoutMs = 3000): Promise<number> {
    const session = this.sessions.get(workerId);
    if (!session) {
      throw new Error(`Worker '${workerId}' is not connected.`);
    }

    const correlationId = crypto.randomUUID();
    const sentAt = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingPings.delete(correlationId);
        reject(new Error(`Ping to worker '${workerId}' timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      this.pendingPings.set(correlationId, {
        sentAt,
        resolve: (rtt: number) => {
          clearTimeout(timer);
          this.pendingPings.delete(correlationId);
          resolve(rtt);
        },
      });

      this.sendMessage(session, {
        header: {
          messageId: crypto.randomUUID(),
          protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
          timestamp: new Date().toISOString(),
          type: 'PING',
          workerId,
          correlationId,
        },
        payload: { clientTime: new Date().toISOString() },
      });
    });
  }

  public updateSessionLatency(session: ConnectedWorkerSession, rttMs: number): void {
    session.lastPingRttMs = rttMs;
    session.averagePingRttMs =
      session.averagePingRttMs === undefined || session.averagePingRttMs === 0
        ? rttMs
        : session.averagePingRttMs * 0.7 + rttMs * 0.3;
    session.networkTier = LanNetworkHelper.determineNetworkTier(session.averagePingRttMs);

    // Update in worker registry metadata
    const worker = this.resourceManager.registry.getWorker(session.workerId);
    if (worker) {
      worker.metadata = {
        ...worker.metadata,
        networkLatencyMs: rttMs,
        averagePingRttMs: Math.round(session.averagePingRttMs),
        networkTier: session.networkTier,
      };
    }
  }

  /**
   * IDispatchHandler implementation for LAN/REMOTE workers.
   */
  public async execute(
    task: WorkerTask,
    worker: Worker,
    callbacks?: {
      onProgress?: (progress: number, message?: string, tokenChunk?: string) => void;
      cancellationToken?: CancellationToken;
    }
  ): Promise<{ success: boolean; workerId?: string; output?: Record<string, unknown>; error?: string }> {
    const session = this.sessions.get(worker.id);
    if (!session) {
      return {
        success: false,
        workerId: worker.id,
        error: `Physical LAN worker '${worker.name}' (${worker.id}) is not connected to transport.`,
      };
    }

    if (callbacks?.cancellationToken?.isCancelled) {
      return {
        success: false,
        workerId: worker.id,
        error: callbacks.cancellationToken.reason || 'Cancelled prior to dispatch.',
      };
    }

    return new Promise((resolve) => {
      let unbindCancel: (() => void) | undefined;

      if (callbacks?.cancellationToken) {
        callbacks.cancellationToken.onCancel(() => {
          this.logger?.info(`Broadcasting TASK_CANCEL for task '${task.id}' to worker '${worker.id}'`);
          this.sendMessage(session, {
            header: {
              messageId: crypto.randomUUID(),
              protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
              timestamp: new Date().toISOString(),
              type: 'TASK_CANCEL',
              workerId: worker.id,
              taskId: task.id,
            },
            payload: {
              taskId: task.id,
              reason: callbacks.cancellationToken?.reason || 'User cancelled task',
            },
          });
        });
      }

      this.pendingTasks.set(task.id, {
        task,
        worker,
        resolve,
        onProgress: callbacks?.onProgress,
        cancellationToken: callbacks?.cancellationToken,
        unbindCancel,
      });

      session.activeTaskIds.add(task.id);

      // Submit task to remote worker socket
      this.sendMessage(session, {
        header: {
          messageId: crypto.randomUUID(),
          protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
          timestamp: new Date().toISOString(),
          type: 'TASK_SUBMIT',
          workerId: worker.id,
          taskId: task.id,
        },
        payload: { task },
      });
    });
  }

  // --- Internal Socket & Protocol Handling ---

  private handleConnection(socket: net.Socket): void {
    this.metrics = {
      ...this.metrics,
      totalConnections: this.metrics.totalConnections + 1,
      activeConnections: this.metrics.activeConnections + 1,
    };

    const framing = new TransportProtocolFraming(this.config.maxPayloadBytes);

    socket.on('data', (chunk: Buffer) => {
      this.metrics = {
        ...this.metrics,
        bytesReceived: this.metrics.bytesReceived + chunk.length,
      };

      try {
        const messages = framing.pushChunk(chunk);
        for (const msg of messages) {
          this.metrics = {
            ...this.metrics,
            messagesReceived: this.metrics.messagesReceived + 1,
          };
          this.handleMessage(socket, msg);
        }
      } catch (err: any) {
        this.logger?.warn(`Framing error from client ${socket.remoteAddress}: ${err.message}`);
        this.sendError(socket, 'FRAMING_ERROR', err.message);
        socket.destroy();
      }
    });

    socket.on('close', () => {
      this.handleSocketClose(socket);
    });

    socket.on('error', (err) => {
      this.logger?.warn(`Socket error from client ${socket.remoteAddress}: ${err.message}`);
      socket.destroy();
    });
  }

  private handleSocketClose(socket: net.Socket): void {
    const session = this.socketSessions.get(socket);
    if (session) {
      this.logger?.info(`Physical worker '${session.workerId}' disconnected from transport.`);
      this.sessions.delete(session.workerId);
      this.socketSessions.delete(socket);

      // Transition worker in health tracker
      this.resourceManager.registry.updateWorkerStatus(session.workerId, 'OFFLINE');

      // If in the middle of tasks, fail or requeue
      for (const [taskId, pending] of this.pendingTasks.entries()) {
        if (pending.worker.id === session.workerId || session.activeTaskIds.has(taskId)) {
          this.pendingTasks.delete(taskId);
          pending.resolve({
            success: false,
            workerId: session.workerId,
            error: `Physical worker disconnected unexpectedly during execution.`,
          });
        }
      }
    }

    this.metrics = {
      ...this.metrics,
      activeConnections: Math.max(0, this.metrics.activeConnections - 1),
    };
  }

  private handleMessage(socket: net.Socket, msg: TransportMessage): void {
    switch (msg.header.type) {
      case 'ENROLL':
        this.handleEnroll(socket, msg);
        break;

      case 'AUTH':
        this.handleAuth(socket, msg);
        break;

      case 'HEARTBEAT':
        this.handleHeartbeat(socket, msg);
        break;

      case 'RESOURCE_UPDATE':
        this.handleResourceUpdate(socket, msg);
        break;

      case 'TASK_PROGRESS':
        this.handleTaskProgress(socket, msg);
        break;

      case 'TASK_COMPLETED':
        this.handleTaskCompleted(socket, msg);
        break;

      case 'TASK_FAILED':
        this.handleTaskFailed(socket, msg);
        break;

      case 'TASK_CANCELLED':
        this.handleTaskCancelled(socket, msg);
        break;

      case 'PING':
        this.sendRaw(
          socket,
          TransportProtocolFraming.encode({
            header: {
              messageId: crypto.randomUUID(),
              protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
              timestamp: new Date().toISOString(),
              type: 'PONG',
              workerId: msg.header.workerId,
              correlationId: msg.header.messageId,
            },
            payload: { serverTime: new Date().toISOString() },
          })
        );
        break;

      case 'PONG': {
        const correlationId = msg.header.correlationId;
        if (correlationId) {
          const pending = this.pendingPings.get(correlationId);
          if (pending) {
            const rtt = Math.max(0, Date.now() - pending.sentAt);
            const session = this.socketSessions.get(socket);
            if (session) {
              this.updateSessionLatency(session, rtt);
            }
            pending.resolve(rtt);
          }
        }
        break;
      }

      default:
        this.logger?.warn(`Unknown message type: ${msg.header.type}`);
    }
  }

  private handleEnroll(socket: net.Socket, msg: TransportMessage): void {
    const payload = msg.payload as EnrollPayload;
    if (!payload?.enrollmentToken || !payload?.workerDescriptor) {
      this.sendError(socket, 'INVALID_PAYLOAD', 'Missing enrollmentToken or workerDescriptor.');
      return;
    }

    const workerDesc = payload.workerDescriptor;
    workerDesc.host = socket.remoteAddress || workerDesc.host;

    const enrollRes = this.resourceManager.authenticateAndRegisterWorker(workerDesc, payload.enrollmentToken);
    if (!enrollRes.success) {
      this.metrics = { ...this.metrics, rejectedConnections: this.metrics.rejectedConnections + 1 };
      this.sendMessageSocket(socket, {
        header: {
          messageId: crypto.randomUUID(),
          protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
          timestamp: new Date().toISOString(),
          type: 'ENROLL_ACK',
          workerId: workerDesc.id,
          correlationId: msg.header.messageId,
        },
        payload: {
          success: false,
          workerId: workerDesc.id,
          heartbeatIntervalMs: 10000,
          serverFingerprint: this.getFingerprint(),
          error: enrollRes.error,
        } as EnrollAckPayload,
      });
      socket.destroy();
      return;
    }

    const sessionToken = `hrsk_sess_${crypto.randomBytes(24).toString('hex')}`;
    this.sessionTokens.set(sessionToken, workerDesc.id);

    const session: ConnectedWorkerSession = {
      workerId: workerDesc.id,
      sessionToken,
      socket,
      framing: new TransportProtocolFraming(this.config.maxPayloadBytes),
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      activeTaskIds: new Set<string>(),
      fingerprint: payload.clientFingerprint,
    };

    this.sessions.set(workerDesc.id, session);
    this.socketSessions.set(socket, session);

    this.logger?.info(`Worker '${workerDesc.name}' (${workerDesc.id}) successfully enrolled via LAN transport.`);
    this.eventBus?.emit('worker.enrolled', { workerId: workerDesc.id });

    this.sendMessageSocket(socket, {
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'ENROLL_ACK',
        workerId: workerDesc.id,
        correlationId: msg.header.messageId,
      },
      payload: {
        success: true,
        sessionToken,
        workerId: workerDesc.id,
        heartbeatIntervalMs: 10000,
        serverFingerprint: this.getFingerprint(),
      } as EnrollAckPayload,
    });
  }

  private handleAuth(socket: net.Socket, msg: TransportMessage): void {
    const payload = msg.payload as AuthPayload;
    let workerId = this.sessionTokens.get(payload.sessionToken);

    if (!workerId && payload.workerId) {
      // Restore valid session for enrolled worker across server restarts
      const worker = this.resourceManager.registry.getWorker(payload.workerId);
      if (worker && (worker.trustLevel === 'ENROLLED' || worker.trustLevel === 'TRUSTED') && worker.status !== 'REVOKED') {
        workerId = worker.id;
        this.sessionTokens.set(payload.sessionToken, workerId);
      }
    }

    if (!workerId || workerId !== payload.workerId) {
      this.metrics = { ...this.metrics, rejectedConnections: this.metrics.rejectedConnections + 1 };
      this.sendMessageSocket(socket, {
        header: {
          messageId: crypto.randomUUID(),
          protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
          timestamp: new Date().toISOString(),
          type: 'AUTH_ACK',
          workerId: payload.workerId,
          correlationId: msg.header.messageId,
        },
        payload: { success: false, error: 'Invalid session token. Re-enrollment required.' } as AuthAckPayload,
      });
      socket.destroy();
      return;
    }

    const session: ConnectedWorkerSession = {
      workerId,
      sessionToken: payload.sessionToken,
      socket,
      framing: new TransportProtocolFraming(this.config.maxPayloadBytes),
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      activeTaskIds: new Set<string>(),
      fingerprint: payload.clientFingerprint,
    };

    this.sessions.set(workerId, session);
    this.socketSessions.set(socket, session);

    this.resourceManager.registry.updateWorkerStatus(workerId, 'ONLINE');

    this.sendMessageSocket(socket, {
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'AUTH_ACK',
        workerId,
        correlationId: msg.header.messageId,
      },
      payload: { success: true } as AuthAckPayload,
    });
  }

  private handleHeartbeat(socket: net.Socket, msg: TransportMessage): void {
    const session = this.socketSessions.get(socket);
    if (!session) return;

    const payload = msg.payload as HeartbeatPayload;
    session.lastHeartbeat = new Date().toISOString();

    if (payload?.timestamp) {
      const clientSentAt = new Date(payload.timestamp).getTime();
      const rttEstimate = Math.max(0, Date.now() - clientSentAt);
      if (rttEstimate < 10000) {
        this.updateSessionLatency(session, rttEstimate);
      }
    }

    this.resourceManager.registry.recordHeartbeat(session.workerId, payload?.loadScore);

    this.sendMessage(session, {
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'HEARTBEAT_ACK',
        workerId: session.workerId,
        correlationId: msg.header.messageId,
      },
      payload: {
        serverTime: new Date().toISOString(),
      } as HeartbeatAckPayload,
    });
  }

  private handleResourceUpdate(socket: net.Socket, msg: TransportMessage): void {
    const session = this.socketSessions.get(socket);
    if (!session) return;

    const payload = msg.payload as ResourceUpdatePayload;
    if (payload?.snapshot) {
      this.resourceManager.registry.recordSnapshot(payload.snapshot);
    }
  }

  private handleTaskProgress(_socket: net.Socket, msg: TransportMessage): void {
    const payload = msg.payload as TaskProgressPayload;
    const pending = this.pendingTasks.get(payload.taskId);
    if (pending) {
      pending.onProgress?.(payload.progress, payload.message, payload.tokenChunk);
    }
  }

  private handleTaskCompleted(socket: net.Socket, msg: TransportMessage): void {
    const payload = msg.payload as TaskCompletedPayload;
    const session = this.socketSessions.get(socket);
    if (session) session.activeTaskIds.delete(payload.taskId);

    const pending = this.pendingTasks.get(payload.taskId);
    if (pending) {
      this.pendingTasks.delete(payload.taskId);
      pending.resolve({
        success: true,
        workerId: pending.worker.id,
        output: payload.outputPayload,
      });
    }
  }

  private handleTaskFailed(socket: net.Socket, msg: TransportMessage): void {
    const payload = msg.payload as TaskFailedPayload;
    const session = this.socketSessions.get(socket);
    if (session) session.activeTaskIds.delete(payload.taskId);

    const pending = this.pendingTasks.get(payload.taskId);
    if (pending) {
      this.pendingTasks.delete(payload.taskId);
      pending.resolve({
        success: false,
        workerId: pending.worker.id,
        error: payload.error,
      });
    }
  }

  private handleTaskCancelled(socket: net.Socket, msg: TransportMessage): void {
    const payload = msg.payload as TaskCancelledPayload;
    const session = this.socketSessions.get(socket);
    if (session) session.activeTaskIds.delete(payload.taskId);

    const pending = this.pendingTasks.get(payload.taskId);
    if (pending) {
      this.pendingTasks.delete(payload.taskId);
      pending.resolve({
        success: false,
        workerId: pending.worker.id,
        error: 'Task cancelled by worker.',
      });
    }
  }

  private sendMessage<T>(session: ConnectedWorkerSession, message: TransportMessage<T>): void {
    this.sendMessageSocket(session.socket, message);
  }

  private sendMessageSocket<T>(socket: net.Socket, message: TransportMessage<T>): void {
    const encoded = TransportProtocolFraming.encode(message);
    this.sendRaw(socket, encoded);
  }

  private sendRaw(socket: net.Socket, buffer: Buffer): void {
    try {
      socket.write(buffer);
      this.metrics = {
        ...this.metrics,
        messagesSent: this.metrics.messagesSent + 1,
        bytesSent: this.metrics.bytesSent + buffer.length,
      };
    } catch (err: any) {
      this.logger?.warn(`Failed to send transport frame: ${err.message}`);
    }
  }

  private sendError(socket: net.Socket, code: string, message: string): void {
    this.sendRaw(
      socket,
      TransportProtocolFraming.encode({
        header: {
          messageId: crypto.randomUUID(),
          protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
          timestamp: new Date().toISOString(),
          type: 'ERROR',
          workerId: 'system',
        },
        payload: { code, message },
      })
    );
  }
}
