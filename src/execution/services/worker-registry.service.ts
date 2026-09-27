/**
 * HṚṢĪKEŚA (हृषीकेश) — Worker Registry Service
 *
 * FP-19: Worker & Runtime Lifecycle, Registration, Authorization,
 * Heartbeat Tracking, Drain States, and Pool Aggregation.
 */

import { randomUUID } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ExecutionRepository } from '../repositories/execution.repository.js';
import {
  ExecutionRuntime,
  ExecutionWorker,
  WorkerStatus,
  TrustLevel,
  WorkerHeartbeatPayload,
  RuntimeType,
  ExecutionScope,
} from '../interfaces/execution.types.js';

export interface RegisterWorkerInput {
  name: string;
  runtimeType: RuntimeType;
  host: string;
  port?: number;
  architecture: string;
  operatingSystem: string;
  cpuCores: number;
  memoryMb: number;
  gpu?: ExecutionRuntime['gpu'];
  capabilities: string[];
  installedSoftware?: string[];
  availableModels?: string[];
  supportedTools?: string[];
  supportedEnvironments?: string[];
  environmentId?: string;
  networkLocality?: ExecutionRuntime['networkLocality'];
  trustLevel?: TrustLevel;
  authorizationScope?: ExecutionScope;
  maxConcurrency?: number;
  metadata?: Record<string, unknown>;
}

export class WorkerRegistryService {
  private readonly repository: ExecutionRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private missedHeartbeatThreshold = 3;

  constructor(repository: ExecutionRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repository = repository;
    this.eventBus = eventBus;
    this.logger = logger?.child('WorkerRegistryService');
  }

  // ==========================================
  // 1. RUNTIME & WORKER ENROLLMENT
  // ==========================================

  public enrollWorker(input: any): { worker: ExecutionWorker; runtime: ExecutionRuntime } {
    const rType: RuntimeType = input.type || input.runtimeType || 'LOCAL';
    const cpuCores = input.hardwareSpecs?.cpuCores ?? input.cpuCores ?? 8;
    const memoryMb = input.hardwareSpecs?.memoryMb ?? input.memoryMb ?? 16384;
    const defaultTrust: TrustLevel = rType === 'LOCAL' ? 'TRUSTED' : rType === 'LAN_WORKER' ? 'DISCOVERED' : 'REGISTERED';

    return this.registerWorker({
      name: input.name,
      runtimeType: rType,
      host: input.host || 'localhost',
      port: input.port,
      architecture: 'x64',
      operatingSystem: process.platform,
      cpuCores,
      memoryMb,
      capabilities: input.capabilities || [],
      installedSoftware: input.softwareInventory || input.installedSoftware || [],
      availableModels: input.modelInventory || input.availableModels || [],
      trustLevel: input.trustLevel || defaultTrust,
      authorizationScope: input.authorizationScope || 'GLOBAL',
      metadata: input.metadata,
    });
  }

  public registerWorker(input: RegisterWorkerInput): { worker: ExecutionWorker; runtime: ExecutionRuntime } {
    const now = new Date().toISOString();
    const runtimeId = `rt_${randomUUID().slice(0, 12)}`;
    const workerId = `wk_${randomUUID().slice(0, 12)}`;

    // Create execution runtime record
    const runtime: ExecutionRuntime = {
      id: runtimeId,
      name: `${input.name} Runtime`,
      type: input.runtimeType,
      environmentId: input.environmentId,
      architecture: input.architecture,
      operatingSystem: input.operatingSystem,
      cpuCores: input.cpuCores,
      memoryMb: input.memoryMb,
      gpu: input.gpu,
      storageAvailableMb: 50000,
      networkLocality: input.networkLocality || (input.runtimeType === 'LOCAL' ? 'LOCAL' : input.runtimeType === 'LAN_WORKER' ? 'LAN' : 'REMOTE'),
      installedSoftware: input.installedSoftware || [],
      availableModels: input.availableModels || [],
      supportedTools: input.supportedTools || [],
      supportedEnvironments: input.supportedEnvironments || [],
      trustLevel: input.trustLevel || (input.runtimeType === 'LOCAL' ? 'TRUSTED' : 'REGISTERED'),
      costClass: input.runtimeType === 'CLOUD_VM' ? 'MEDIUM' : 'FREE',
      availability: 'ONLINE',
      health: 'HEALTHY',
      lastHeartbeat: now,
      currentLoad: 0.0,
      concurrency: 0,
      maxConcurrency: input.maxConcurrency || 4,
      authorizationScope: input.authorizationScope || 'GLOBAL',
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.repository.createRuntime(runtime);

    // Create execution worker record
    const worker: ExecutionWorker = {
      id: workerId,
      runtimeId,
      name: input.name,
      status: 'ONLINE',
      host: input.host,
      port: input.port,
      capabilities: input.capabilities,
      resources: {
        cpuCores: input.cpuCores,
        memoryTotalMb: input.memoryMb,
        memoryFreeMb: Math.round(input.memoryMb * 0.7),
        gpu: input.gpu,
        diskFreeMb: 50000,
      },
      health: 'HEALTHY',
      lastHeartbeat: now,
      lastSeen: now,
      version: '1.0.0',
      protocolVersion: '1.0.0',
      softwareInventory: input.installedSoftware || [],
      modelInventory: input.availableModels || [],
      environmentAssociations: input.supportedEnvironments || [],
      trustLevel: input.trustLevel || (input.runtimeType === 'LOCAL' ? 'TRUSTED' : 'AUTHORIZED'),
      authorizationScope: input.authorizationScope || 'GLOBAL',
      currentWorkload: 0,
      queuedWorkload: 0,
      drainState: false,
      activeJobIds: [],
      consecutiveMissedHeartbeats: 0,
      metadata: input.metadata,
      registeredAt: now,
      updatedAt: now,
    };

    this.repository.createWorker(worker);

    this.logger?.info(`Worker enrolled: [${worker.id}] (${worker.name}) on runtime [${runtime.id}]`);
    this.eventBus?.emit('worker.registered', { workerId: worker.id, runtimeId: runtime.id, name: worker.name });

    return { worker, runtime };
  }

  // ==========================================
  // 2. AUTHORIZATION & TRUST
  // ==========================================

  public authorizeWorker(workerId: string, trustLevel: TrustLevel = 'AUTHORIZED'): ExecutionWorker {
    const worker = this.repository.getWorkerById(workerId);
    if (!worker) throw new Error(`Worker not found: ${workerId}`);

    const updated = this.repository.updateWorker(workerId, { trustLevel });
    if (!updated) throw new Error(`Failed to update worker: ${workerId}`);

    this.logger?.info(`Worker authorized: [${workerId}] trust set to [${trustLevel}]`);
    this.eventBus?.emit('worker.authorized', { workerId, trustLevel });
    return updated;
  }

  public revokeWorker(workerId: string): ExecutionWorker {
    const worker = this.repository.getWorkerById(workerId);
    if (!worker) throw new Error(`Worker not found: ${workerId}`);

    // Set worker to REVOKED status and revoke active leases
    const updated = this.repository.updateWorker(workerId, {
      trustLevel: 'REVOKED',
      status: 'OFFLINE',
    });
    this.repository.revokeLeasesForWorker(workerId);

    this.logger?.warn(`Worker revoked immediately: [${workerId}]`);
    this.eventBus?.emit('worker.offline', { workerId, reason: 'REVOKED' });
    return updated!;
  }

  public quarantineWorker(workerId: string, reason: string): ExecutionWorker {
    const worker = this.repository.getWorkerById(workerId);
    if (!worker) throw new Error(`Worker not found: ${workerId}`);

    const updated = this.repository.updateWorker(workerId, {
      trustLevel: 'QUARANTINED',
      status: 'DEGRADED',
      metadata: { ...worker.metadata, quarantineReason: reason, quarantinedAt: new Date().toISOString() },
    });

    this.logger?.warn(`Worker quarantined: [${workerId}] reason: ${reason}`);
    this.eventBus?.emit('worker.degraded', { workerId, reason });
    return updated!;
  }

  // ==========================================
  // 3. HEARTBEATS & STALE DETECTION
  // ==========================================

  public handleHeartbeat(payload: any): ExecutionWorker {
    return this.recordHeartbeat(payload);
  }

  public recordHeartbeat(payload: WorkerHeartbeatPayload | any): ExecutionWorker {
    const worker = this.repository.getWorkerById(payload.workerId);
    if (!worker) throw new Error(`Worker not found: ${payload.workerId}`);

    // If worker was revoked, reject heartbeat
    if (worker.trustLevel === 'REVOKED') {
      throw new Error(`Heartbeat rejected from revoked worker: ${payload.workerId}`);
    }

    const now = payload.timestamp || new Date().toISOString();
    const updatedWorkload = payload.activeJobIds?.length ?? payload.currentWorkload ?? 0;
    const isBusy = updatedWorkload > 0;
    
    const status: WorkerStatus = worker.drainState
      ? 'DRAINING'
      : (payload.status === 'DEGRADED' || payload.health === 'UNHEALTHY' || payload.health === 'DEGRADED')
        ? 'DEGRADED'
        : isBusy
          ? 'BUSY'
          : 'ONLINE';

    const softwareInventory = payload.softwareInventory || worker.softwareInventory;
    const modelInventory = payload.modelInventory || worker.modelInventory;

    const cpuUsagePercent = payload.cpuUsagePercent ?? payload.cpuPercent ?? worker.resources.cpuUsagePercent ?? 0;
    const memoryAvailableMb = payload.memoryAvailableMb ?? (payload.ramTotalMb && payload.ramUsedMb ? Math.max(0, payload.ramTotalMb - payload.ramUsedMb) : worker.resources.memoryFreeMb);

    const updated = this.repository.updateWorker(payload.workerId, {
      lastHeartbeat: now,
      lastSeen: now,
      health: payload.health || worker.health,
      status,
      currentWorkload: updatedWorkload,
      activeJobIds: payload.activeJobIds || worker.activeJobIds || [],
      consecutiveMissedHeartbeats: 0,
      missedHeartbeats: 0,
      softwareInventory,
      modelInventory,
      resources: {
        ...worker.resources,
        cpuUsagePercent,
        memoryAvailableMb,
        memoryFreeMb: memoryAvailableMb,
      },
    });

    // Also update runtime heartbeat & load
    if (worker.runtimeId) {
      this.repository.updateRuntime(worker.runtimeId, {
        lastHeartbeat: now,
        health: payload.health || worker.health,
        currentLoad: payload.loadScore ?? (cpuUsagePercent / 100),
        concurrency: updatedWorkload,
        availability: 'ONLINE',
      });
    }

    this.eventBus?.emit('worker.heartbeat', {
      workerId: payload.workerId,
      health: payload.health,
      loadScore: payload.loadScore ?? 0,
    });

    return updated!;
  }

  public detectStaleWorkers(heartbeatTimeoutMs = 15000): ExecutionWorker[] {
    const now = Date.now();
    const allWorkers = this.repository.listWorkers();
    const staleWorkers: ExecutionWorker[] = [];

    for (const worker of allWorkers) {
      if (worker.status === 'OFFLINE' || worker.status === 'RETIRED' || worker.trustLevel === 'REVOKED') {
        continue;
      }

      const lastHeartbeatTime = new Date(worker.lastHeartbeat).getTime();
      const elapsedMs = now - lastHeartbeatTime;

      if (elapsedMs >= heartbeatTimeoutMs) {
        const missedIntervals = heartbeatTimeoutMs > 0 ? Math.floor(elapsedMs / heartbeatTimeoutMs) : 1;
        const missed = Math.max(worker.consecutiveMissedHeartbeats + 1, missedIntervals);
        const newStatus: WorkerStatus = (missed >= this.missedHeartbeatThreshold || heartbeatTimeoutMs === 0 || elapsedMs >= heartbeatTimeoutMs * 3) ? 'OFFLINE' : 'DEGRADED';

        const updated = this.repository.updateWorker(worker.id, {
          consecutiveMissedHeartbeats: missed,
          missedHeartbeats: missed,
          status: newStatus,
          health: newStatus === 'OFFLINE' ? 'UNHEALTHY' : 'DEGRADED',
        });

        if (updated) {
          staleWorkers.push(updated);
          this.logger?.warn(`Worker [${worker.id}] missed ${missed} heartbeat(s). Status set to [${newStatus}]`);
          if (newStatus === 'OFFLINE') {
            this.eventBus?.emit('worker.offline', { workerId: worker.id, reason: 'HEARTBEAT_TIMEOUT' });
          } else {
            this.eventBus?.emit('worker.degraded', { workerId: worker.id, reason: 'MISSED_HEARTBEAT' });
          }
        }
      }
    }

    return staleWorkers;
  }

  public auditStaleWorkers(timeoutMs = 15000): ExecutionWorker[] {
    return this.detectStaleWorkers(timeoutMs);
  }

  // ==========================================
  // 4. DRAINING & MAINTENANCE
  // ==========================================

  public drainWorker(workerId: string): ExecutionWorker {
    const worker = this.repository.getWorkerById(workerId);
    if (!worker) throw new Error(`Worker not found: ${workerId}`);

    const updated = this.repository.setWorkerDrainState(workerId, true);
    this.logger?.info(`Worker [${workerId}] set to DRAINING`);
    this.eventBus?.emit('worker.draining', { workerId });
    return updated!;
  }

  public resumeWorker(workerId: string): ExecutionWorker {
    const worker = this.repository.getWorkerById(workerId);
    if (!worker) throw new Error(`Worker not found: ${workerId}`);

    const updated = this.repository.setWorkerDrainState(workerId, false);
    this.logger?.info(`Worker [${workerId}] resumed from draining to ONLINE`);
    this.eventBus?.emit('worker.online', { workerId });
    return updated!;
  }

  // ==========================================
  // 5. QUERY & POOL AGGREGATION
  // ==========================================

  public getWorker(id: string): ExecutionWorker | null {
    return this.repository.getWorkerById(id);
  }

  public listWorkers(): ExecutionWorker[] {
    return this.repository.listWorkers();
  }

  public getRuntime(id: string): ExecutionRuntime | null {
    return this.repository.getRuntimeById(id);
  }

  public listRuntimes(): ExecutionRuntime[] {
    return this.repository.listRuntimes();
  }

  public getOnlineWorkers(): ExecutionWorker[] {
    return this.repository.listWorkers().filter(
      w => (w.status === 'ONLINE' || w.status === 'BUSY') &&
           w.trustLevel !== 'REVOKED' &&
           w.trustLevel !== 'QUARANTINED' &&
           !w.drainState
    );
  }
}
