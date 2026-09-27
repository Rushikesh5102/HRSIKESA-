/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-06 LAN Fabric Coordinator
 *
 * Top-level orchestrator that unifies the transport server, discovery service,
 * pairing generator, and network diagnostics into a single cohesive LAN fabric.
 *
 * Responsibilities:
 *  1. Start/stop transport server on a LAN-bindable address
 *  2. Manage pairing lifecycle for physical worker enrollment
 *  3. Coordinate discovery beacons and candidate tracking
 *  4. Provide network diagnostics (latency, tier, connectivity probes)
 *  5. Generate LAN fabric status reports
 */

import * as net from 'node:net';
import * as tls from 'node:tls';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ResourceManager } from '../resource.manager.js';
import { WorkerTransportServer } from './worker.transport.server.js';
import { WorkerDiscoveryService } from './worker.transport.discovery.js';
import { LanNetworkHelper } from './worker.transport.network.js';
import { LanPairingGenerator } from './worker.transport.pairing.js';
import { LanPairingPackage, NetworkTier } from './worker.transport.types.js';

export interface LanFabricConfig {
  /** Bind address for the transport server. '0.0.0.0' binds all interfaces. */
  readonly bindHost?: string;
  /** TCP port for the transport server */
  readonly port?: number;
  /** Enable UDP discovery beacon listener */
  readonly enableDiscovery?: boolean;
  /** UDP discovery port */
  readonly discoveryPort?: number;
}

export interface LanFabricStatus {
  readonly isRunning: boolean;
  readonly primaryLanIp: string;
  readonly lanEndpoint: string;
  readonly serverFingerprint: string;
  readonly connectedWorkers: number;
  readonly connectedWorkerIds: string[];
  readonly discoveredCandidates: number;
  readonly latencies: Record<string, { rttMs: number; averageRttMs: number; tier: NetworkTier }>;
  readonly transportMetrics: {
    totalConnections: number;
    activeConnections: number;
    messagesReceived: number;
    messagesSent: number;
  };
}

export interface LanConnectivityProbeResult {
  readonly targetHost: string;
  readonly targetPort: number;
  readonly reachable: boolean;
  readonly latencyMs: number;
  readonly tlsHandshake: boolean;
  readonly tlsProtocol?: string;
  readonly peerFingerprint?: string;
  readonly error?: string;
  readonly probedAt: string;
}

export class LanFabricCoordinator {
  private readonly transportServer: WorkerTransportServer;
  private readonly discovery: WorkerDiscoveryService;
  private readonly resourceManager: ResourceManager;
  private readonly logger?: ILogger;
  private readonly config: Required<LanFabricConfig>;
  private isRunning = false;
  private activePairings: LanPairingPackage[] = [];

  constructor(
    resourceManager: ResourceManager,
    config: LanFabricConfig = {},
    _eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.resourceManager = resourceManager;
    this.logger = logger?.child('LanFabricCoordinator');
    this.config = {
      bindHost: config.bindHost || '0.0.0.0',
      port: config.port || 4300,
      enableDiscovery: config.enableDiscovery ?? true,
      discoveryPort: config.discoveryPort || 4301,
    };

    // Use the existing transport server from the ResourceManager
    this.transportServer = resourceManager.transportServer;
    this.discovery = new WorkerDiscoveryService({
      port: this.config.discoveryPort,
      logger,
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.logger?.info('Starting LAN Fabric Coordinator...');

    // Transport server is started by ResourceManager.start()
    // We verify it's running
    const endpoint = this.transportServer.getLanEndpoint();
    this.logger?.info(`Transport server LAN endpoint: ${endpoint}`);

    // Start discovery listener if enabled
    if (this.config.enableDiscovery) {
      try {
        await this.discovery.startListener();
        this.logger?.info('LAN discovery listener started.');
      } catch (err: any) {
        this.logger?.warn(`Discovery listener start notice: ${err.message}`);
      }
    }

    this.isRunning = true;
    this.logger?.info('LAN Fabric Coordinator is ONLINE.');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    await this.discovery.stop();
    this.isRunning = false;
    this.logger?.info('LAN Fabric Coordinator stopped.');
  }

  /**
   * Creates a full pairing package for enrolling a new physical LAN worker.
   */
  public createPairingPackage(workerName: string, ttlSeconds = 600): LanPairingPackage {
    // 1. Generate enrollment token through ResourceManager
    const { token } = this.resourceManager.generateEnrollmentToken(workerName, ttlSeconds);

    // 2. Build the full pairing package
    const pkg = LanPairingGenerator.generate({
      enrollmentToken: token,
      bindHost: this.transportServer.getBindHost(),
      port: this.transportServer.getPort(),
      serverFingerprint: this.transportServer.getFingerprint(),
      ttlSeconds,
      workerNameHint: workerName,
    });

    this.activePairings.push(pkg);
    this.logger?.info(`Pairing package created for '${workerName}' → ${pkg.lanEndpoint}`);

    return pkg;
  }

  /**
   * Probes a specific host:port to test raw TCP/TLS connectivity.
   * This is used to verify physical LAN reachability BEFORE enrollment.
   */
  public async probeConnectivity(
    targetHost: string,
    targetPort: number,
    timeoutMs = 5000
  ): Promise<LanConnectivityProbeResult> {
    const startTime = Date.now();

    return new Promise<LanConnectivityProbeResult>((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          targetHost,
          targetPort,
          reachable: false,
          latencyMs: Date.now() - startTime,
          tlsHandshake: false,
          error: `Connection timed out after ${timeoutMs}ms`,
          probedAt: new Date().toISOString(),
        });
      }, timeoutMs);

      // Attempt TLS connection first
      const socket = tls.connect(
        {
          host: targetHost,
          port: targetPort,
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined,
          timeout: timeoutMs,
        },
        () => {
          clearTimeout(timer);
          const latencyMs = Date.now() - startTime;
          const peerCert = (socket as tls.TLSSocket).getPeerCertificate();
          const fingerprint = peerCert?.fingerprint256 || peerCert?.fingerprint;

          resolve({
            targetHost,
            targetPort,
            reachable: true,
            latencyMs,
            tlsHandshake: true,
            tlsProtocol: (socket as tls.TLSSocket).getProtocol() || undefined,
            peerFingerprint: fingerprint || undefined,
            probedAt: new Date().toISOString(),
          });

          socket.destroy();
        }
      );

      socket.on('error', (err: Error) => {
        clearTimeout(timer);

        // Fall back to raw TCP probe
        const tcpSocket = net.connect({ host: targetHost, port: targetPort, timeout: timeoutMs }, () => {
          const latencyMs = Date.now() - startTime;
          resolve({
            targetHost,
            targetPort,
            reachable: true,
            latencyMs,
            tlsHandshake: false,
            error: `TLS handshake failed (${err.message}), but TCP port is reachable.`,
            probedAt: new Date().toISOString(),
          });
          tcpSocket.destroy();
        });

        tcpSocket.on('error', (tcpErr: Error) => {
          resolve({
            targetHost,
            targetPort,
            reachable: false,
            latencyMs: Date.now() - startTime,
            tlsHandshake: false,
            error: `TCP: ${tcpErr.message}`,
            probedAt: new Date().toISOString(),
          });
        });

        tcpSocket.on('timeout', () => {
          resolve({
            targetHost,
            targetPort,
            reachable: false,
            latencyMs: Date.now() - startTime,
            tlsHandshake: false,
            error: 'TCP connection timed out.',
            probedAt: new Date().toISOString(),
          });
          tcpSocket.destroy();
        });
      });

      socket.on('timeout', () => {
        clearTimeout(timer);
        resolve({
          targetHost,
          targetPort,
          reachable: false,
          latencyMs: Date.now() - startTime,
          tlsHandshake: false,
          error: 'TLS connection timed out.',
          probedAt: new Date().toISOString(),
        });
        socket.destroy();
      });
    });
  }

  /**
   * Returns the current status of the LAN fabric.
   */
  public getStatus(): LanFabricStatus {
    const metrics = this.transportServer.getMetrics();
    return {
      isRunning: this.isRunning,
      primaryLanIp: LanNetworkHelper.getPrimaryLanIpv4(),
      lanEndpoint: this.transportServer.getLanEndpoint(),
      serverFingerprint: this.transportServer.getFingerprint(),
      connectedWorkers: this.transportServer.getConnectedWorkerIds().length,
      connectedWorkerIds: this.transportServer.getConnectedWorkerIds(),
      discoveredCandidates: this.discovery.getDiscoveredCandidates().length,
      latencies: this.transportServer.getAllWorkerLatencies(),
      transportMetrics: {
        totalConnections: metrics.totalConnections,
        activeConnections: metrics.activeConnections,
        messagesReceived: metrics.messagesReceived,
        messagesSent: metrics.messagesSent,
      },
    };
  }

  /**
   * Retrieves all active (non-expired) pairing packages.
   */
  public getActivePairings(): LanPairingPackage[] {
    this.activePairings = this.activePairings.filter((p) => !LanPairingGenerator.isExpired(p));
    return [...this.activePairings];
  }

  public getTransportServer(): WorkerTransportServer {
    return this.transportServer;
  }

  public getDiscoveryService(): WorkerDiscoveryService {
    return this.discovery;
  }
}
