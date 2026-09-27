/**
 * HṚṢĪKEŚA (हृषीकेश) — Persistent Worker & Resource Fabric Registry
 *
 * FP-03: Foundation Performance & Execution Block
 * Distributed Local/LAN Resource Fabric & Execution Capacity
 *
 * Provides persistent SQLite state with in-memory caching for low-latency lookups (<1ms).
 */

import { DatabaseManager } from '../persistence/database/database.manager.js';
import { EventBus } from '../core/events/event-bus.js';
import { ILogger } from '../core/logging/logger.types.js';
import {
  Worker,
  WorkerStatus,
  WorkerTask,
  ResourceSnapshot,
  EnrollmentToken,
  ResourceFabricOverview,
} from './resource.types.js';

export class ResourceRegistry {
  private readonly db: DatabaseManager;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly workerCache: Map<string, Worker> = new Map();

  constructor(db: DatabaseManager, eventBus?: EventBus, logger?: ILogger) {
    this.db = db;
    this.eventBus = eventBus;
    this.logger = logger?.child('ResourceRegistry');
    this.loadWorkersFromDatabase();
  }

  public getDatabase(): DatabaseManager {
    return this.db;
  }

  /**
   * Initializes in-memory cache from database.
   */
  private loadWorkersFromDatabase(): void {
    try {
      const rows = this.db.prepare('SELECT * FROM workers').all() as any[];
      for (const row of rows) {
        const worker = this.deserializeWorker(row);
        this.workerCache.set(worker.id, worker);
      }
      this.logger?.info(`Loaded ${this.workerCache.size} worker(s) into memory cache.`);
    } catch (err: any) {
      this.logger?.warn(`Could not load workers from database (migrations pending?): ${err.message}`);
    }
  }

  private deserializeWorker(row: any): Worker {
    const meta = row.metadata ? JSON.parse(row.metadata) : undefined;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      host: row.host,
      port: row.port ?? undefined,
      platform: row.platform,
      architecture: row.architecture,
      cpu: JSON.parse(row.cpu_info || '{}'),
      memory: JSON.parse(row.memory_info || '{}'),
      gpu: JSON.parse(row.gpu_info || '{}'),
      gpuBackend: row.gpu_backend ?? undefined,
      models: JSON.parse(row.models || '[]'),
      residentModels: meta?.residentModels || meta?.resident_models || undefined,
      capabilities: JSON.parse(row.capabilities || '[]'),
      environmentIds: JSON.parse(row.environment_ids || '[]'),
      priority: row.priority ?? 50,
      trustLevel: row.trust_level,
      registeredAt: row.registered_at,
      lastHeartbeat: row.last_heartbeat,
      lastSeen: row.last_seen,
      loadScore: row.load_score ?? 0.0,
      resourceLimits: row.resource_limits ? JSON.parse(row.resource_limits) : undefined,
      protocolVersion: row.protocol_version || '1.0.0',
      version: row.version || '1.0.0',
      authTokenHash: row.auth_token_hash ?? undefined,
      metadata: meta,
    };
  }

  /**
   * Registers or updates a worker.
   */
  public registerWorker(worker: Worker): void {
    const isNew = !this.workerCache.has(worker.id);
    this.workerCache.set(worker.id, worker);

    const metadataObj: Record<string, unknown> = { ...(worker.metadata || {}) };
    if (worker.residentModels && worker.residentModels.length > 0) {
      metadataObj.residentModels = worker.residentModels;
    }

    this.db.prepare(`
      INSERT INTO workers (
        id, name, type, status, host, port, platform, architecture,
        cpu_info, memory_info, gpu_info, gpu_backend, models, capabilities,
        environment_ids, priority, trust_level, registered_at, last_heartbeat,
        last_seen, load_score, resource_limits, protocol_version, version,
        auth_token_hash, metadata
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        status = excluded.status,
        host = excluded.host,
        port = excluded.port,
        platform = excluded.platform,
        architecture = excluded.architecture,
        cpu_info = excluded.cpu_info,
        memory_info = excluded.memory_info,
        gpu_info = excluded.gpu_info,
        gpu_backend = excluded.gpu_backend,
        models = excluded.models,
        capabilities = excluded.capabilities,
        environment_ids = excluded.environment_ids,
        priority = excluded.priority,
        trust_level = excluded.trust_level,
        last_heartbeat = excluded.last_heartbeat,
        last_seen = excluded.last_seen,
        load_score = excluded.load_score,
        resource_limits = excluded.resource_limits,
        protocol_version = excluded.protocol_version,
        version = excluded.version,
        auth_token_hash = excluded.auth_token_hash,
        metadata = excluded.metadata
    `).run(
      worker.id,
      worker.name,
      worker.type,
      worker.status,
      worker.host,
      worker.port ?? null,
      worker.platform,
      worker.architecture,
      JSON.stringify(worker.cpu),
      JSON.stringify(worker.memory),
      JSON.stringify(worker.gpu),
      worker.gpuBackend ?? null,
      JSON.stringify(worker.models),
      JSON.stringify(worker.capabilities),
      JSON.stringify(worker.environmentIds || []),
      worker.priority,
      worker.trustLevel,
      worker.registeredAt,
      worker.lastHeartbeat,
      worker.lastSeen,
      worker.loadScore,
      worker.resourceLimits ? JSON.stringify(worker.resourceLimits) : null,
      worker.protocolVersion,
      worker.version,
      worker.authTokenHash ?? null,
      Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null
    );

    // Sync capabilities
    for (const cap of worker.capabilities) {
      this.db.prepare(`
        INSERT INTO worker_capabilities (
          worker_id, capability_id, version, available, metadata, security_level
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(worker_id, capability_id) DO UPDATE SET
          version = excluded.version,
          available = excluded.available,
          metadata = excluded.metadata,
          security_level = excluded.security_level
      `).run(
        worker.id,
        cap.capabilityId,
        cap.version,
        cap.available ? 1 : 0,
        cap.metadata ? JSON.stringify(cap.metadata) : null,
        cap.securityLevel ?? 'SAFE'
      );
    }

    if (isNew) {
      this.eventBus?.emit('worker.registered', { workerId: worker.id, name: worker.name, type: worker.type });
    }
    if (worker.status === 'ONLINE') {
      this.eventBus?.emit('worker.online', { workerId: worker.id, name: worker.name });
    }
  }

  public getWorker(id: string): Worker | undefined {
    let worker = this.workerCache.get(id);
    if (!worker) {
      try {
        const row = this.db.prepare('SELECT * FROM workers WHERE id = ?').get(id) as any;
        if (row) {
          worker = this.deserializeWorker(row);
          this.workerCache.set(worker.id, worker);
        }
      } catch {
        // Table not ready or closed
      }
    }
    return worker;
  }

  public getAllWorkers(): Worker[] {
    return Array.from(this.workerCache.values());
  }

  public getOnlineWorkers(): Worker[] {
    return this.getAllWorkers().filter(w => w.status === 'ONLINE' || w.status === 'BUSY');
  }

  public updateWorkerStatus(workerId: string, status: WorkerStatus): void {
    const worker = this.workerCache.get(workerId);
    if (!worker) return;

    const oldStatus = worker.status;
    worker.status = status;
    worker.lastSeen = new Date().toISOString();

    this.db.prepare('UPDATE workers SET status = ?, last_seen = ? WHERE id = ?').run(
      status,
      worker.lastSeen,
      workerId
    );

    if (oldStatus !== status) {
      this.logger?.info(`Worker '${worker.name}' (${workerId}) transitioned: ${oldStatus} -> ${status}`);
      this.eventBus?.emit('worker.health_changed', { workerId, oldStatus, status, timestamp: worker.lastSeen });
      if (status === 'OFFLINE') {
        this.eventBus?.emit('worker.offline', { workerId, name: worker.name });
      }
    }
  }

  public recordHeartbeat(workerId: string, loadScore?: number): void {
    const worker = this.workerCache.get(workerId);
    if (!worker) return;

    const now = new Date().toISOString();
    worker.lastHeartbeat = now;
    worker.lastSeen = now;
    if (loadScore !== undefined) {
      worker.loadScore = loadScore;
    }
    if (worker.status === 'OFFLINE' || worker.status === 'DEGRADED') {
      worker.status = 'ONLINE';
      this.eventBus?.emit('worker.online', { workerId, name: worker.name });
    }

    this.db.prepare(
      'UPDATE workers SET last_heartbeat = ?, last_seen = ?, load_score = ?, status = ? WHERE id = ?'
    ).run(now, now, worker.loadScore, worker.status, workerId);
  }

  public updateWorkerLoad(workerId: string, loadScore: number): void {
    const worker = this.workerCache.get(workerId);
    if (!worker) return;
    worker.loadScore = loadScore;
    this.db.prepare('UPDATE workers SET load_score = ? WHERE id = ?').run(loadScore, workerId);
    this.eventBus?.emit('worker.resource_changed', { workerId, loadScore });
  }

  /**
   * Records a hardware resource snapshot with bounded retention (retains latest 100 per worker).
   */
  public recordSnapshot(snapshot: ResourceSnapshot): void {
    this.db.prepare(`
      INSERT INTO worker_resource_snapshots (
        id, worker_id, cpu_usage, ram_used_bytes, ram_total_bytes,
        gpu_utilization, gpu_memory_used_bytes, active_tasks, queue_depth, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshot.id,
      snapshot.workerId,
      snapshot.cpuUsage,
      snapshot.ramUsedBytes,
      snapshot.ramTotalBytes,
      snapshot.gpuUtilization ?? null,
      snapshot.gpuMemoryUsedBytes ?? null,
      snapshot.activeTasks,
      snapshot.queueDepth,
      snapshot.timestamp
    );

    // Prune historical snapshots exceeding 100 per worker to prevent database bloat
    this.db.prepare(`
      DELETE FROM worker_resource_snapshots
      WHERE worker_id = ? AND id NOT IN (
        SELECT id FROM worker_resource_snapshots
        WHERE worker_id = ?
        ORDER BY timestamp DESC
        LIMIT 100
      )
    `).run(snapshot.workerId, snapshot.workerId);
  }

  public getLatestSnapshots(workerId: string, limit = 10): ResourceSnapshot[] {
    const rows = this.db.prepare(`
      SELECT * FROM worker_resource_snapshots
      WHERE worker_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(workerId, limit) as any[];

    return rows.map(r => ({
      id: r.id,
      workerId: r.worker_id,
      cpuUsage: r.cpu_usage,
      ramUsedBytes: r.ram_used_bytes,
      ramTotalBytes: r.ram_total_bytes,
      gpuUtilization: r.gpu_utilization ?? undefined,
      gpuMemoryUsedBytes: r.gpu_memory_used_bytes ?? undefined,
      activeTasks: r.active_tasks,
      queueDepth: r.queue_depth,
      timestamp: r.timestamp,
    }));
  }

  public getSnapshots(workerId: string, limit = 10): ResourceSnapshot[] {
    return this.getLatestSnapshots(workerId, limit);
  }

  public requeueTask(taskId: string): boolean {
    const task = this.getTask(taskId);
    if (!task) return false;
    task.status = 'REQUEUED';
    task.attempt += 1;
    task.assignedWorkerId = undefined;
    this.saveTask(task);
    return true;
  }

  public getActiveTasksCount(workerId: string): number {
    try {
      const row = this.db.prepare(`
        SELECT COUNT(*) as count FROM worker_tasks
        WHERE assigned_worker_id = ? AND status IN ('PLACED', 'DISPATCHING', 'RUNNING')
      `).get(workerId) as any;
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  }

  public getActiveTasksForWorker(workerId: string): WorkerTask[] {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM worker_tasks
        WHERE assigned_worker_id = ? AND status IN ('PLACED', 'DISPATCHING', 'RUNNING')
        ORDER BY priority DESC, created_at ASC
      `).all(workerId) as any[];
      return rows.map(r => this.deserializeTask(r));
    } catch {
      return [];
    }
  }

  public getAllActiveTasks(): WorkerTask[] {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM worker_tasks
        WHERE status IN ('PLACED', 'DISPATCHING', 'RUNNING')
        ORDER BY priority DESC, created_at ASC
      `).all() as any[];
      return rows.map(r => this.deserializeTask(r));
    } catch {
      return [];
    }
  }

  // ==========================================
  // TASK QUEUE PERSISTENCE
  // ==========================================

  public saveTask(task: WorkerTask): void {
    this.db.prepare(`
      INSERT INTO worker_tasks (
        id, task_type, priority, status, privacy_level, required_capabilities,
        resource_requirements, preferred_worker_id, assigned_worker_id, attempt,
        progress, idempotency_key, input_payload, output_payload, error_message,
        placement_reason, created_at, started_at, completed_at, deadline,
        timeout_ms, metadata
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        priority = excluded.priority,
        status = excluded.status,
        assigned_worker_id = excluded.assigned_worker_id,
        attempt = excluded.attempt,
        progress = excluded.progress,
        output_payload = excluded.output_payload,
        error_message = excluded.error_message,
        placement_reason = excluded.placement_reason,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at
    `).run(
      task.id,
      task.taskType,
      task.priority,
      task.status,
      task.privacyLevel,
      JSON.stringify(task.requiredCapabilities),
      task.resourceRequirements ? JSON.stringify(task.resourceRequirements) : null,
      task.preferredWorkerId ?? null,
      task.assignedWorkerId ?? null,
      task.attempt,
      task.progress,
      task.idempotencyKey ?? null,
      task.inputPayload ? JSON.stringify(task.inputPayload) : null,
      task.outputPayload ? JSON.stringify(task.outputPayload) : null,
      task.errorMessage ?? null,
      task.placementReason ?? null,
      task.createdAt,
      task.startedAt ?? null,
      task.completedAt ?? null,
      task.deadline ?? null,
      task.timeoutMs ?? null,
      task.metadata ? JSON.stringify(task.metadata) : null
    );
  }

  public getTask(taskId: string): WorkerTask | undefined {
    const row = this.db.prepare('SELECT * FROM worker_tasks WHERE id = ?').get(taskId) as any;
    if (!row) return undefined;
    return this.deserializeTask(row);
  }

  public getQueuedTasks(): WorkerTask[] {
    const rows = this.db.prepare(`
      SELECT * FROM worker_tasks
      WHERE status = 'QUEUED' OR status = 'REQUEUED'
      ORDER BY priority DESC, created_at ASC
    `).all() as any[];
    return rows.map(r => this.deserializeTask(r));
  }

  public getTasksByWorker(workerId: string, limit = 20): WorkerTask[] {
    const rows = this.db.prepare(`
      SELECT * FROM worker_tasks
      WHERE assigned_worker_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(workerId, limit) as any[];
    return rows.map(r => this.deserializeTask(r));
  }

  public findTaskByIdempotency(key: string): WorkerTask | undefined {
    const row = this.db.prepare('SELECT * FROM worker_tasks WHERE idempotency_key = ?').get(key) as any;
    if (!row) return undefined;
    return this.deserializeTask(row);
  }

  private deserializeTask(row: any): WorkerTask {
    return {
      id: row.id,
      taskType: row.task_type,
      priority: row.priority,
      status: row.status,
      privacyLevel: row.privacy_level,
      requiredCapabilities: JSON.parse(row.required_capabilities || '[]'),
      resourceRequirements: row.resource_requirements ? JSON.parse(row.resource_requirements) : undefined,
      preferredWorkerId: row.preferred_worker_id ?? undefined,
      assignedWorkerId: row.assigned_worker_id ?? undefined,
      attempt: row.attempt,
      progress: row.progress,
      idempotencyKey: row.idempotency_key ?? undefined,
      inputPayload: row.input_payload ? JSON.parse(row.input_payload) : undefined,
      outputPayload: row.output_payload ? JSON.parse(row.output_payload) : undefined,
      errorMessage: row.error_message ?? undefined,
      placementReason: row.placement_reason ?? undefined,
      createdAt: row.created_at,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      deadline: row.deadline ?? undefined,
      timeoutMs: row.timeout_ms ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  // ==========================================
  // ENROLLMENT TOKENS
  // ==========================================

  public saveEnrollmentToken(token: EnrollmentToken): void {
    this.db.prepare(`
      INSERT INTO worker_enrollment_tokens (
        token_hash, name, created_at, expires_at, used_at, revoked, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      token.tokenHash,
      token.name,
      token.createdAt,
      token.expiresAt,
      token.usedAt ?? null,
      token.revoked ? 1 : 0,
      token.metadata ? JSON.stringify(token.metadata) : null
    );
  }

  public getEnrollmentToken(tokenHash: string): EnrollmentToken | undefined {
    const row = this.db.prepare('SELECT * FROM worker_enrollment_tokens WHERE token_hash = ?').get(tokenHash) as any;
    if (!row) return undefined;
    return {
      tokenHash: row.token_hash,
      name: row.name,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedAt: row.used_at ?? undefined,
      revoked: Boolean(row.revoked),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  public markEnrollmentTokenUsed(tokenHash: string): void {
    this.db.prepare('UPDATE worker_enrollment_tokens SET used_at = ? WHERE token_hash = ?').run(
      new Date().toISOString(),
      tokenHash
    );
  }

  public revokeWorker(workerId: string): void {
    const worker = this.workerCache.get(workerId);
    if (worker) {
      worker.status = 'REVOKED';
      worker.trustLevel = 'REVOKED';
      this.db.prepare(`UPDATE workers SET status = 'REVOKED', trust_level = 'REVOKED' WHERE id = ?`).run(workerId);
      this.logger?.warn(`Worker '${worker.name}' (${workerId}) revoked.`);
      this.eventBus?.emit('worker.health_changed', { workerId, status: 'REVOKED' });
    }
  }

  public drainWorker(workerId: string): void {
    const worker = this.workerCache.get(workerId);
    if (worker) {
      worker.status = 'DRAINING';
      this.db.prepare(`UPDATE workers SET status = 'DRAINING' WHERE id = ?`).run(workerId);
      this.logger?.info(`Worker '${worker.name}' (${workerId}) set to DRAINING.`);
      this.eventBus?.emit('worker.health_changed', { workerId, status: 'DRAINING' });
    }
  }

  public resumeWorker(workerId: string): void {
    const worker = this.workerCache.get(workerId);
    if (worker && (worker.status === 'DRAINING' || worker.status === 'DRAINED')) {
      worker.status = 'ONLINE';
      this.db.prepare(`UPDATE workers SET status = 'ONLINE' WHERE id = ?`).run(workerId);
      this.logger?.info(`Worker '${worker.name}' (${workerId}) resumed to ONLINE.`);
      this.eventBus?.emit('worker.health_changed', { workerId, status: 'ONLINE' });
    }
  }

  public markWorkerDrained(workerId: string): void {
    const worker = this.workerCache.get(workerId);
    if (worker) {
      worker.status = 'DRAINED';
      this.db.prepare(`UPDATE workers SET status = 'DRAINED' WHERE id = ?`).run(workerId);
      this.logger?.info(`Worker '${worker.name}' (${workerId}) transitioned to DRAINED.`);
      this.eventBus?.emit('worker.health_changed', { workerId, status: 'DRAINED' });
    }
  }

  public getFabricOverview(localWorkerId: string): ResourceFabricOverview {
    const all = this.getAllWorkers();
    const online = all.filter(w => w.status === 'ONLINE');
    const busy = all.filter(w => w.status === 'BUSY');
    const offline = all.filter(w => w.status === 'OFFLINE' || w.status === 'UNHEALTHY');

    let totalCores = 0;
    let totalRamBytes = 0;
    let usedRamBytes = 0;
    const modelInventory: Record<string, number> = {};
    const activeTasksPerWorker: Record<string, number> = {};

    for (const w of all) {
      totalCores += w.cpu.physicalCores || 0;
      totalRamBytes += w.memory.totalBytes || 0;
      usedRamBytes += (w.memory.totalBytes - w.memory.freeBytes) || 0;

      // Aggregate model inventory
      for (const m of w.models || []) {
        modelInventory[m] = (modelInventory[m] || 0) + 1;
      }

      // Track active tasks per worker
      const activeCount = this.getActiveTasksCount(w.id);
      if (activeCount > 0) {
        activeTasksPerWorker[w.id] = activeCount;
      }
    }

    const queuedRows = this.db.prepare(`SELECT count(*) as count FROM worker_tasks WHERE status IN ('QUEUED', 'REQUEUED')`).get() as any;
    const activeRows = this.db.prepare(`SELECT count(*) as count FROM worker_tasks WHERE status IN ('PLACED', 'DISPATCHING', 'RUNNING')`).get() as any;

    return {
      totalWorkers: all.length,
      onlineWorkers: online.length,
      busyWorkers: busy.length,
      offlineWorkers: offline.length,
      totalCores,
      totalRamBytes,
      usedRamBytes,
      activeTasksCount: activeRows?.count ?? 0,
      queueDepth: queuedRows?.count ?? 0,
      localWorkerId,
      timestamp: new Date().toISOString(),
      modelInventory,
      activeTasksPerWorker,
    };
  }
}
