/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-04 Worker Discovery Layer
 *
 * Provides lightweight UDP broadcast beacon discovery for LAN candidate workers.
 *
 * CRITICAL SECURITY PRINCIPLE:
 * "Discovery means: 'Potential worker found.'
 *  It does NOT mean: 'Authorized worker.'
 *  Never auto-enroll arbitrary LAN devices."
 *
 * Discovered candidates MUST be explicitly paired using a short-lived,
 * single-use enrollment token before they can participate in task dispatch.
 */

import * as dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { ILogger } from '../../core/logging/logger.types.js';

export interface DiscoveredCandidate {
  readonly id: string;
  readonly name: string;
  readonly host: string;
  readonly transportPort: number;
  readonly protocolVersion: string;
  readonly discoveredAt: string;
  readonly fingerprint?: string;
  lastSeen: string;
}

export interface DiscoveryBeaconPayload {
  readonly hrisekesaWorkerBeacon: true;
  readonly id: string;
  readonly name: string;
  readonly port: number;
  readonly protocolVersion: string;
  readonly fingerprint?: string;
}

export class WorkerDiscoveryService extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private readonly port: number;
  private readonly broadcastAddress: string;
  private readonly logger?: ILogger;
  private isRunning = false;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private readonly candidates = new Map<string, DiscoveredCandidate>(); // id -> candidate

  constructor(
    options: {
      port?: number;
      broadcastAddress?: string;
      logger?: ILogger;
    } = {}
  ) {
    super();
    this.port = options.port || Number(process.env.HRSK_DISCOVERY_PORT) || 4301;
    this.broadcastAddress = options.broadcastAddress || '255.255.255.255';
    this.logger = options.logger?.child('WorkerDiscovery');
  }

  /**
   * Starts discovery listener for incoming worker announcement beacons.
   */
  public async startListener(): Promise<void> {
    if (this.isRunning) return;

    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      try {
        const data = JSON.parse(msg.toString('utf-8')) as DiscoveryBeaconPayload;
        if (data && data.hrisekesaWorkerBeacon === true && data.id) {
          this.handleCandidateBeacon(data, rinfo.address);
        }
      } catch {
        // Ignore malformed UDP packets
      }
    });

    this.socket.on('error', (err) => {
      this.logger?.warn(`Discovery socket error: ${err.message}`);
    });

    await new Promise<void>((resolve) => {
      this.socket!.bind(this.port, () => {
        try {
          this.socket!.setBroadcast(true);
        } catch {
          // May not be supported on all interfaces
        }
        this.isRunning = true;
        this.logger?.info(`Worker Discovery listener active on UDP port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Starts periodic broadcast beacon (used by standalone worker nodes to announce presence).
   */
  public async startBeacon(workerInfo: {
    id: string;
    name: string;
    port: number;
    protocolVersion: string;
    fingerprint?: string;
  }, intervalMs = 5000): Promise<void> {
    if (!this.socket) {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      await new Promise<void>((resolve) => {
        this.socket!.bind(0, () => {
          try {
            this.socket!.setBroadcast(true);
          } catch {
            // Ignore
          }
          resolve();
        });
      });
    }

    const payload: DiscoveryBeaconPayload = {
      hrisekesaWorkerBeacon: true,
      id: workerInfo.id,
      name: workerInfo.name,
      port: workerInfo.port,
      protocolVersion: workerInfo.protocolVersion,
      fingerprint: workerInfo.fingerprint,
    };

    const messageBuffer = Buffer.from(JSON.stringify(payload), 'utf-8');

    const broadcast = () => {
      if (!this.socket) return;
      this.socket.send(messageBuffer, 0, messageBuffer.length, this.port, this.broadcastAddress, (err) => {
        if (err) {
          this.logger?.debug(`Discovery beacon broadcast failed: ${err.message}`);
        }
      });
    };

    broadcast();
    this.broadcastInterval = setInterval(broadcast, intervalMs);
  }

  public async stop(): Promise<void> {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    if (this.socket) {
      await new Promise<void>((resolve) => {
        this.socket!.close(() => {
          this.socket = null;
          this.isRunning = false;
          resolve();
        });
      });
    }
  }

  public getDiscoveredCandidates(): DiscoveredCandidate[] {
    return Array.from(this.candidates.values());
  }

  public clearCandidates(): void {
    this.candidates.clear();
  }

  private handleCandidateBeacon(data: DiscoveryBeaconPayload, host: string): void {
    const existing = this.candidates.get(data.id);
    const now = new Date().toISOString();

    if (existing) {
      existing.lastSeen = now;
    } else {
      const candidate: DiscoveredCandidate = {
        id: data.id,
        name: data.name,
        host,
        transportPort: data.port,
        protocolVersion: data.protocolVersion,
        discoveredAt: now,
        fingerprint: data.fingerprint,
        lastSeen: now,
      };

      this.candidates.set(data.id, candidate);
      this.logger?.info(`Discovered potential LAN worker candidate '${data.name}' at ${host}:${data.port}`);
      this.emit('candidate.discovered', candidate);
    }
  }
}
