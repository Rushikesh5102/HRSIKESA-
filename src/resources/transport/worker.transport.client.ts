/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Worker Transport Client
 *
 * Runs on physical LAN worker machines (or loopback) to connect securely to
 * HṚṢĪKEŚA's dedicated worker transport server. Manages encrypted TLS connection,
 * cryptographic pairing, session tokens, heartbeats, task execution, progress streaming,
 * and cooperative cancellation.
 */

import * as net from 'node:net';
import * as tls from 'node:tls';
import * as crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { ILogger } from '../../core/logging/logger.types.js';
import { Worker, WorkerTask, ResourceSnapshot } from '../resource.types.js';
import {
  TransportMessage,
  WorkerTransportClientConfig,
  EnrollPayload,
  EnrollAckPayload,
  AuthPayload,
  AuthAckPayload,
  HeartbeatPayload,
  ResourceUpdatePayload,
  TaskSubmitPayload,
  TaskProgressPayload,
  TaskCompletedPayload,
  TaskFailedPayload,
  TaskCancelPayload,
} from './worker.transport.types.js';
import { TransportProtocolFraming } from './worker.transport.protocol.js';

export interface WorkerTaskExecutor {
  executeTask(
    task: WorkerTask,
    callbacks: {
      onProgress: (progress: number, message?: string, tokenChunk?: string) => void;
      abortSignal: AbortSignal;
    }
  ): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }>;
}

export class WorkerTransportClient extends EventEmitter {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private readonly config: WorkerTransportClientConfig;
  private readonly logger?: ILogger;
  private readonly framing: TransportProtocolFraming;
  private sessionToken?: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isShuttingDown = false;
  private reconnectAttempts = 0;
  private activeAbortControllers = new Map<string, AbortController>(); // taskId -> AbortController
  private workerDescriptor: Worker | null = null;
  private taskExecutor: WorkerTaskExecutor | null = null;
  private serverFingerprint?: string;

  constructor(config: WorkerTransportClientConfig, logger?: ILogger) {
    super();
    this.config = {
      heartbeatIntervalMs: 10000,
      maxReconnectAttempts: 10,
      reconnectBackoffMs: 1000,
      ...config,
    };
    this.logger = logger?.child(`WorkerClient[${config.workerName}]`);
    this.framing = new TransportProtocolFraming();
    this.sessionToken = config.sessionToken;
  }

  public setTaskExecutor(executor: WorkerTaskExecutor): void {
    this.taskExecutor = executor;
  }

  public setWorkerDescriptor(descriptor: Worker): void {
    this.workerDescriptor = descriptor;
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    this.isShuttingDown = false;

    return new Promise((resolve) => {
      const onConnect = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger?.info(
          `Connected to HṚṢĪKEŚA Transport Server at ${this.config.serverHost}:${this.config.serverPort}`
        );

        // FP-06: Fingerprint Pinning Verification
        if (this.config.expectedFingerprint && this.socket instanceof tls.TLSSocket) {
          const peerCert = this.socket.getPeerCertificate();
          const peerFingerprint = peerCert?.fingerprint256 || peerCert?.fingerprint;
          if (peerFingerprint) {
            const cleanPeer = peerFingerprint.replace(/:/g, '').toUpperCase();
            const cleanExpected = this.config.expectedFingerprint.replace(/:/g, '').toUpperCase();
            if (cleanPeer !== cleanExpected) {
              this.logger?.error(`Server fingerprint mismatch! Expected: ${cleanExpected}, got: ${cleanPeer}`);
              this.disconnect();
              resolve(false);
              return;
            }
            this.logger?.info(`Server certificate fingerprint verified (${cleanPeer.slice(0, 16)}...).`);
          }
        }

        // Perform Enrollment or Auth Handshake
        if (this.sessionToken) {
          this.sendAuth(this.sessionToken);
        } else if (this.config.enrollmentToken && this.workerDescriptor) {
          this.sendEnrollment(this.config.enrollmentToken, this.workerDescriptor);
        }

        resolve(true);
      };

      const onError = (err: Error) => {
        this.logger?.warn(`Connection error to ${this.config.serverHost}:${this.config.serverPort}: ${err.message}`);
        this.handleDisconnect();
        resolve(false);
      };

      if (this.config.tlsEnabled) {
        const tlsOptions: tls.ConnectionOptions = {
          host: this.config.serverHost,
          port: this.config.serverPort,
          ca: this.config.caPem,
          rejectUnauthorized: false, // Allows self-signed LAN certificates
          checkServerIdentity: () => undefined, // Accept LAN hostname
          minVersion: 'TLSv1.2',
        };
        this.socket = tls.connect(tlsOptions, onConnect);
      } else {
        this.socket = net.connect({ host: this.config.serverHost, port: this.config.serverPort }, onConnect);
      }

      this.socket.on('data', (chunk: Buffer) => {
        try {
          const messages = this.framing.pushChunk(chunk);
          for (const msg of messages) {
            this.handleIncomingMessage(msg);
          }
        } catch (err: any) {
          this.logger?.warn(`Framing decode error from server: ${err.message}`);
        }
      });

      this.socket.once('error', onError);
      this.socket.on('close', () => {
        this.handleDisconnect();
      });
    });
  }

  public disconnect(): void {
    this.isShuttingDown = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        // ignore
      }
      this.socket = null;
    }
    this.isConnected = false;
    this.emit('disconnected');
  }

  public getSessionToken(): string | undefined {
    return this.sessionToken;
  }

  public getServerFingerprint(): string | undefined {
    return this.serverFingerprint;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public sendResourceSnapshot(snapshot: ResourceSnapshot): void {
    if (!this.isConnected) return;
    this.send({
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'RESOURCE_UPDATE',
        workerId: this.config.workerId,
      },
      payload: {
        workerId: this.config.workerId,
        snapshot,
      } as ResourceUpdatePayload,
    });
  }

  public publishResourceUpdate(snapshot: ResourceSnapshot): void {
    this.sendResourceSnapshot(snapshot);
  }

  public sendHeartbeat(loadScore = 0): void {
    if (!this.isConnected) return;
    this.send({
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'HEARTBEAT',
        workerId: this.config.workerId,
      },
      payload: {
        workerId: this.config.workerId,
        loadScore,
        timestamp: new Date().toISOString(),
      } as HeartbeatPayload,
    });
  }

  // --- Internal Protocol Handlers ---

  private sendEnrollment(enrollmentToken: string, descriptor: Worker): void {
    this.logger?.info(`Submitting enrollment token '${enrollmentToken.slice(0, 16)}...' to Control Plane.`);
    this.send({
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'ENROLL',
        workerId: this.config.workerId,
      },
      payload: {
        enrollmentToken,
        workerDescriptor: descriptor,
        clientFingerprint: crypto.randomBytes(16).toString('hex'),
      } as EnrollPayload,
    });
  }

  private sendAuth(sessionToken: string): void {
    this.logger?.info(`Re-authenticating session token with Control Plane.`);
    this.send({
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'AUTH',
        workerId: this.config.workerId,
      },
      payload: {
        workerId: this.config.workerId,
        sessionToken,
        clientFingerprint: crypto.randomBytes(16).toString('hex'),
      } as AuthPayload,
    });
  }

  private handleIncomingMessage(msg: TransportMessage): void {
    switch (msg.header.type) {
      case 'ENROLL_ACK': {
        const payload = msg.payload as EnrollAckPayload;
        if (payload.success && payload.sessionToken) {
          this.sessionToken = payload.sessionToken;
          this.serverFingerprint = payload.serverFingerprint;
          this.logger?.info(`Successfully enrolled! Session token received. Server fingerprint: ${payload.serverFingerprint}`);
          this.startHeartbeat(payload.heartbeatIntervalMs || 10000);
          this.emit('enrolled', payload);
        } else {
          this.logger?.error(`Enrollment rejected by Control Plane: ${payload.error}`);
          this.emit('enroll_failed', payload.error);
          this.disconnect();
        }
        break;
      }

      case 'AUTH_ACK': {
        const payload = msg.payload as AuthAckPayload;
        if (payload.success) {
          this.logger?.info(`Re-authentication accepted by Control Plane.`);
          this.startHeartbeat(this.config.heartbeatIntervalMs || 10000);
          this.emit('authenticated');
        } else {
          this.logger?.warn(`Re-authentication failed: ${payload.error}. Clearing session token.`);
          this.sessionToken = undefined;
          this.emit('auth_failed', payload.error);
        }
        break;
      }

      case 'HEARTBEAT_ACK': {
        // Heartbeat acknowledged
        break;
      }

      case 'TASK_SUBMIT': {
        const payload = msg.payload as TaskSubmitPayload;
        if (payload?.task) {
          this.executeTask(payload.task);
        }
        break;
      }

      case 'TASK_CANCEL': {
        const payload = msg.payload as TaskCancelPayload;
        if (payload?.taskId) {
          const controller = this.activeAbortControllers.get(payload.taskId);
          if (controller) {
            this.logger?.info(`Received TASK_CANCEL for task '${payload.taskId}'. Aborting task.`);
            controller.abort(payload.reason || 'Cancelled by Control Plane');
            this.activeAbortControllers.delete(payload.taskId);
          }
        }
        break;
      }

      case 'WORKER_DRAIN': {
        this.logger?.info('Control plane requested WORKER_DRAIN. Finishing active tasks.');
        this.emit('draining');
        break;
      }

      case 'PING': {
        this.send({
          header: {
            messageId: crypto.randomUUID(),
            protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
            timestamp: new Date().toISOString(),
            type: 'PONG',
            workerId: this.config.workerId,
            correlationId: msg.header.correlationId || msg.header.messageId,
          },
          payload: {
            clientTime: new Date().toISOString(),
            serverTime: msg.header.timestamp,
          },
        });
        break;
      }

      case 'PONG': {
        // Ping response received
        break;
      }

      default:
        this.logger?.warn(`Unhandled message from server: ${msg.header.type}`);
    }
  }

  private async executeTask(task: WorkerTask): Promise<void> {
    this.logger?.info(`Executing task '${task.id}' (type: ${task.taskType}) from Control Plane.`);

    const abortController = new AbortController();
    this.activeAbortControllers.set(task.id, abortController);

    // Send initial progress
    this.sendProgress(task.id, 0.1, 'Task accepted by physical LAN worker');

    if (!this.taskExecutor) {
      this.sendFailed(task.id, 'Worker has no registered TaskExecutor.');
      this.activeAbortControllers.delete(task.id);
      return;
    }

    try {
      const result = await this.taskExecutor.executeTask(task, {
        onProgress: (p, msg, tokenChunk) => {
          this.sendProgress(task.id, p, msg, tokenChunk);
        },
        abortSignal: abortController.signal,
      });

      this.activeAbortControllers.delete(task.id);

      if (abortController.signal.aborted) {
        this.send({
          header: {
            messageId: crypto.randomUUID(),
            protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
            timestamp: new Date().toISOString(),
            type: 'TASK_CANCELLED',
            workerId: this.config.workerId,
            taskId: task.id,
          },
          payload: { taskId: task.id },
        });
        return;
      }

      if (result.success) {
        this.sendCompleted(task.id, result.output);
      } else {
        this.sendFailed(task.id, result.error || 'Execution failed on worker.');
      }
    } catch (err: any) {
      this.activeAbortControllers.delete(task.id);
      this.sendFailed(task.id, err.message || String(err));
    }
  }

  private sendProgress(taskId: string, progress: number, message?: string, tokenChunk?: string): void {
    this.send({
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'TASK_PROGRESS',
        workerId: this.config.workerId,
        taskId,
      },
      payload: {
        taskId,
        progress,
        message,
        tokenChunk,
        timestamp: new Date().toISOString(),
      } as TaskProgressPayload,
    });
  }

  private sendCompleted(taskId: string, outputPayload?: Record<string, unknown>): void {
    this.send({
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'TASK_COMPLETED',
        workerId: this.config.workerId,
        taskId,
      },
      payload: {
        taskId,
        outputPayload,
      } as TaskCompletedPayload,
    });
  }

  private sendFailed(taskId: string, error: string): void {
    this.send({
      header: {
        messageId: crypto.randomUUID(),
        protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
        type: 'TASK_FAILED',
        workerId: this.config.workerId,
        taskId,
      },
      payload: {
        taskId,
        error,
      } as TaskFailedPayload,
    });
  }

  private startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          header: {
            messageId: crypto.randomUUID(),
            protocolVersion: TransportProtocolFraming.PROTOCOL_VERSION,
            timestamp: new Date().toISOString(),
            type: 'HEARTBEAT',
            workerId: this.config.workerId,
          },
          payload: {
            workerId: this.config.workerId,
            loadScore: this.activeAbortControllers.size * 25.0,
            timestamp: new Date().toISOString(),
          } as HeartbeatPayload,
        });
      }
    }, intervalMs);
    this.heartbeatTimer.unref();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.stopHeartbeat();

    // Abort active running tasks
    for (const controller of this.activeAbortControllers.values()) {
      controller.abort('Lost connection to Control Plane');
    }
    this.activeAbortControllers.clear();

    if (this.isShuttingDown) return;

    // Exponential backoff reconnect loop
    const maxAttempts = this.config.maxReconnectAttempts || 10;
    if (this.reconnectAttempts < maxAttempts) {
      this.reconnectAttempts++;
      const baseDelay = this.config.reconnectBackoffMs || 1000;
      const jitter = Math.floor(Math.random() * 200);
      const delay = Math.min(15000, baseDelay * Math.pow(1.5, this.reconnectAttempts - 1) + jitter);

      this.logger?.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${maxAttempts})...`);
      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(() => {});
      }, delay);
      this.reconnectTimer.unref();
    } else {
      this.logger?.error('Maximum reconnection attempts reached. Worker stopping.');
      this.emit('reconnect_exhausted');
    }
  }

  private send<T>(message: TransportMessage<T>): void {
    if (!this.socket || !this.isConnected) return;
    try {
      const encoded = TransportProtocolFraming.encode(message);
      this.socket.write(encoded);
    } catch (err: any) {
      this.logger?.warn(`Failed to send frame to server: ${err.message}`);
    }
  }
}
