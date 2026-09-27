/**
 * HṚṢĪKEŚA (हृषीकेश) — Execution Repository
 *
 * FP-19: SQLite persistence for ExecutionRuntimes, Workers, Jobs, Leases,
 * Checkpoints, Traces, Artifacts, Policies, and CloudProviders.
 */

import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  ExecutionRuntime,
  ExecutionWorker,
  ExecutionJob,
  JobLease,
  JobCheckpoint,
  ExecutionTrace,
  ExecutionArtifact,
  ExecutionPolicy,
  CloudProviderDescriptor,
  JobState,
  WorkerStatus,
  TrustLevel,
} from '../interfaces/execution.types.js';

export class ExecutionRepository {
  private readonly dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager, _logger?: ILogger) {
    this.dbManager = dbManager;
  }

  private get db(): DatabaseSync {
    return this.dbManager.getRawDb();
  }

  // ==========================================
  // 1. RUNTIMES
  // ==========================================

  public createRuntime(r: ExecutionRuntime): ExecutionRuntime {
    const stmt = this.db.prepare(`
      INSERT INTO execution_runtimes (
        id, name, type, environment_id, architecture, operating_system,
        cpu_cores, memory_mb, gpu_info, storage_available_mb, network_locality,
        installed_software, available_models, supported_tools, supported_environments,
        trust_level, cost_class, availability, health, last_heartbeat,
        current_load, concurrency, max_concurrency, authorization_scope, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      r.id,
      r.name,
      r.type,
      r.environmentId || null,
      r.architecture || 'x64',
      r.operatingSystem || (r as any).os || 'unknown',
      r.cpuCores ?? (r as any).cpu_cores ?? 1,
      r.memoryMb ?? (r as any).memoryTotalMb ?? (r as any).memory_mb ?? 1024,
      r.gpu ? JSON.stringify(r.gpu) : null,
      r.storageAvailableMb ?? ((r as any).storageAvailableGb != null ? (r as any).storageAvailableGb * 1024 : null),
      r.networkLocality || 'LOCAL',
      JSON.stringify(r.installedSoftware || []),
      JSON.stringify(r.availableModels || []),
      JSON.stringify(r.supportedTools || []),
      JSON.stringify(r.supportedEnvironments || []),
      r.trustLevel || 'SANDBOXED',
      r.costClass || 'FREE',
      r.availability || ((r as any).isAvailable ? 'AVAILABLE' : 'OFFLINE'),
      r.health || 'HEALTHY',
      r.lastHeartbeat || new Date().toISOString(),
      r.currentLoad ?? 0,
      r.concurrency ?? 0,
      r.maxConcurrency ?? 1,
      r.authorizationScope || 'GLOBAL',
      r.metadata ? JSON.stringify(r.metadata) : null,
      r.createdAt || new Date().toISOString(),
      r.updatedAt || new Date().toISOString()
    );

    return r;
  }

  public getRuntimeById(id: string): ExecutionRuntime | null {
    const stmt = this.db.prepare(`SELECT * FROM execution_runtimes WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRuntimeRow(row);
  }

  public updateRuntime(id: string, updates: Partial<ExecutionRuntime>): ExecutionRuntime | null {
    const existing = this.getRuntimeById(id);
    if (!existing) return null;

    const updated: ExecutionRuntime = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE execution_runtimes SET
        name = ?, type = ?, environment_id = ?, architecture = ?, operating_system = ?,
        cpu_cores = ?, memory_mb = ?, gpu_info = ?, storage_available_mb = ?,
        network_locality = ?, installed_software = ?, available_models = ?,
        supported_tools = ?, supported_environments = ?, trust_level = ?,
        cost_class = ?, availability = ?, health = ?, last_heartbeat = ?,
        current_load = ?, concurrency = ?, max_concurrency = ?,
        authorization_scope = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.type,
      updated.environmentId || null,
      updated.architecture,
      updated.operatingSystem,
      updated.cpuCores,
      updated.memoryMb,
      updated.gpu ? JSON.stringify(updated.gpu) : null,
      updated.storageAvailableMb || null,
      updated.networkLocality,
      JSON.stringify(updated.installedSoftware || []),
      JSON.stringify(updated.availableModels || []),
      JSON.stringify(updated.supportedTools || []),
      JSON.stringify(updated.supportedEnvironments || []),
      updated.trustLevel,
      updated.costClass,
      updated.availability,
      updated.health,
      updated.lastHeartbeat,
      updated.currentLoad,
      updated.concurrency,
      updated.maxConcurrency,
      updated.authorizationScope,
      updated.metadata ? JSON.stringify(updated.metadata) : null,
      updated.updatedAt,
      id
    );

    return updated;
  }

  public listRuntimes(filters?: { locality?: string; networkLocality?: string; type?: string; availability?: string }): ExecutionRuntime[] {
    let query = `SELECT * FROM execution_runtimes WHERE 1=1`;
    const params: any[] = [];

    const locality = filters?.locality || filters?.networkLocality;
    if (locality) {
      query += ` AND network_locality = ?`;
      params.push(locality);
    }
    if (filters?.type) {
      query += ` AND type = ?`;
      params.push(filters.type);
    }
    if (filters?.availability) {
      query += ` AND availability = ?`;
      params.push(filters.availability);
    }

    query += ` ORDER BY created_at DESC`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map(r => this.mapRuntimeRow(r));
  }

  // ==========================================
  // 2. WORKERS
  // ==========================================

  public createWorker(w: ExecutionWorker): ExecutionWorker {
    const stmt = this.db.prepare(`
      INSERT INTO execution_workers (
        id, runtime_id, name, status, host, port, capabilities, resources,
        health, last_heartbeat, last_seen, version, protocol_version,
        software_inventory, model_inventory, environment_associations,
        trust_level, authorization_scope, current_workload, queued_workload,
        drain_state, active_job_ids, consecutive_missed_heartbeats, metadata,
        registered_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      w.id,
      w.runtimeId,
      w.name,
      w.status,
      w.host || 'localhost',
      w.port || null,
      JSON.stringify(w.capabilities || []),
      JSON.stringify(w.resources || {}),
      w.health || 'HEALTHY',
      w.lastHeartbeat || new Date().toISOString(),
      w.lastSeen || w.lastHeartbeat || new Date().toISOString(),
      w.version || '1.0.0',
      w.protocolVersion || '1.0.0',
      JSON.stringify(w.softwareInventory || []),
      JSON.stringify(w.modelInventory || []),
      JSON.stringify(w.environmentAssociations || []),
      w.trustLevel || 'SANDBOXED',
      w.authorizationScope || 'GLOBAL',
      w.currentWorkload ?? 0,
      w.queuedWorkload ?? 0,
      w.drainState ? 1 : 0,
      JSON.stringify(w.activeJobIds || []),
      w.consecutiveMissedHeartbeats ?? (w as any).missedHeartbeats ?? 0,
      w.metadata ? JSON.stringify(w.metadata) : null,
      w.registeredAt || (w as any).createdAt || new Date().toISOString(),
      w.updatedAt || new Date().toISOString()
    );

    return w;
  }

  public getWorkerById(id: string): ExecutionWorker | null {
    const stmt = this.db.prepare(`SELECT * FROM execution_workers WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapWorkerRow(row);
  }

  public updateWorker(id: string, updates: Partial<ExecutionWorker>): ExecutionWorker | null {
    const existing = this.getWorkerById(id);
    if (!existing) return null;

    const missed = updates.consecutiveMissedHeartbeats ?? updates.missedHeartbeats ?? existing.consecutiveMissedHeartbeats;
    const updated: ExecutionWorker = {
      ...existing,
      ...updates,
      consecutiveMissedHeartbeats: missed,
      missedHeartbeats: missed,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE execution_workers SET
        name = ?, status = ?, host = ?, port = ?, capabilities = ?,
        resources = ?, health = ?, last_heartbeat = ?, last_seen = ?,
        version = ?, protocol_version = ?, software_inventory = ?,
        model_inventory = ?, environment_associations = ?, trust_level = ?,
        authorization_scope = ?, current_workload = ?, queued_workload = ?,
        drain_state = ?, active_job_ids = ?, consecutive_missed_heartbeats = ?,
        metadata = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.status,
      updated.host,
      updated.port || null,
      JSON.stringify(updated.capabilities || []),
      JSON.stringify(updated.resources || {}),
      updated.health,
      updated.lastHeartbeat,
      updated.lastSeen,
      updated.version,
      updated.protocolVersion,
      JSON.stringify(updated.softwareInventory || []),
      JSON.stringify(updated.modelInventory || []),
      JSON.stringify(updated.environmentAssociations || []),
      updated.trustLevel,
      updated.authorizationScope,
      updated.currentWorkload,
      updated.queuedWorkload,
      updated.drainState ? 1 : 0,
      JSON.stringify(updated.activeJobIds || []),
      updated.consecutiveMissedHeartbeats,
      updated.metadata ? JSON.stringify(updated.metadata) : null,
      updated.updatedAt,
      id
    );

    return updated;
  }

  public listWorkers(): ExecutionWorker[] {
    const stmt = this.db.prepare(`SELECT * FROM execution_workers ORDER BY registered_at DESC`);
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(r => this.mapWorkerRow(r));
  }

  public setWorkerDrainState(id: string, drainState: boolean): ExecutionWorker | null {
    const status: WorkerStatus = drainState ? 'DRAINING' : 'ONLINE';
    return this.updateWorker(id, { drainState, status });
  }

  public setWorkerTrustLevel(id: string, trustLevel: TrustLevel): ExecutionWorker | null {
    return this.updateWorker(id, { trustLevel });
  }

  // ==========================================
  // 3. JOBS
  // ==========================================

  public createJob(j: ExecutionJob): ExecutionJob {
    const attempt = j.attempt ?? (j as any).retryCount ?? 0;
    const maxAttempts = j.maxAttempts ?? (j as any).maxRetries ?? 3;
    const progress = j.progress ?? 0;

    if (j.assignedWorkerId && !this.getWorkerById(j.assignedWorkerId)) {
      const stubRtId = 'rt-stub-' + j.assignedWorkerId;
      if (!this.getRuntimeById(stubRtId)) {
        this.createRuntime({
          id: stubRtId,
          name: 'Stub Runtime',
          type: 'LOCAL',
          architecture: 'x64',
          operatingSystem: 'unknown',
          cpuCores: 1,
          memoryMb: 1024,
          networkLocality: 'LOCAL',
          installedSoftware: [],
          availableModels: [],
          supportedTools: [],
          supportedEnvironments: [],
          trustLevel: 'REGISTERED',
          costClass: 'FREE',
          availability: 'ONLINE',
          health: 'HEALTHY',
          lastHeartbeat: new Date().toISOString(),
          currentLoad: 0,
          concurrency: 0,
          maxConcurrency: 1,
          authorizationScope: 'GLOBAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      this.createWorker({
        id: j.assignedWorkerId,
        runtimeId: stubRtId,
        name: 'Stub Worker',
        status: 'ONLINE',
        host: 'localhost',
        capabilities: [],
        resources: { cpuCores: 1, memoryTotalMb: 1024, memoryFreeMb: 512 },
        health: 'HEALTHY',
        lastHeartbeat: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        version: '1.0.0',
        protocolVersion: '1.0.0',
        softwareInventory: [],
        modelInventory: [],
        environmentAssociations: [],
        trustLevel: 'REGISTERED',
        authorizationScope: 'GLOBAL',
        currentWorkload: 0,
        queuedWorkload: 0,
        drainState: false,
        activeJobIds: [],
        consecutiveMissedHeartbeats: 0,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (j.assignedRuntimeId && !this.getRuntimeById(j.assignedRuntimeId)) {
      this.createRuntime({
        id: j.assignedRuntimeId,
        name: 'Stub Runtime',
        type: 'LOCAL',
        architecture: 'x64',
        operatingSystem: 'unknown',
        cpuCores: 1,
        memoryMb: 1024,
        networkLocality: 'LOCAL',
        installedSoftware: [],
        availableModels: [],
        supportedTools: [],
        supportedEnvironments: [],
        trustLevel: 'REGISTERED',
        costClass: 'FREE',
        availability: 'ONLINE',
        health: 'HEALTHY',
        lastHeartbeat: new Date().toISOString(),
        currentLoad: 0,
        concurrency: 0,
        maxConcurrency: 1,
        authorizationScope: 'GLOBAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const stmt = this.db.prepare(`
      INSERT INTO execution_jobs (
        id, objective, task_type, priority, state, scope, company_id,
        project_id, client_id, mission_id, goal_id, workflow_id, step_index,
        agent_id, assigned_worker_id, assigned_runtime_id, lease_token,
        fencing_token, idempotency_key, required_capabilities, resource_requirements,
        policy, attempt, retry_count, max_attempts, max_retries, progress, input_payload, output_payload,
        checkpoint_id, error_message, requires_approval, estimated_cost,
        actual_cost, created_at, started_at, completed_at, deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      j.id,
      j.objective,
      j.taskType,
      j.priority,
      j.state,
      j.scope,
      j.companyId || null,
      j.projectId || null,
      j.clientId || null,
      j.missionId || null,
      j.goalId || null,
      j.workflowId || null,
      j.stepIndex ?? null,
      j.agentId || null,
      j.assignedWorkerId || null,
      j.assignedRuntimeId || null,
      j.leaseToken || null,
      j.fencingToken,
      j.idempotencyKey || null,
      JSON.stringify(j.requiredCapabilities || []),
      j.resourceRequirements ? JSON.stringify(j.resourceRequirements) : null,
      j.policy,
      attempt,
      attempt,
      maxAttempts,
      maxAttempts,
      progress,
      j.inputPayload ? JSON.stringify(j.inputPayload) : null,
      j.outputPayload ? JSON.stringify(j.outputPayload) : null,
      j.checkpointId || null,
      j.errorMessage || null,
      j.requiresApproval ? 1 : 0,
      j.estimatedCost || null,
      j.actualCost || null,
      j.createdAt || new Date().toISOString(),
      j.startedAt || null,
      j.completedAt || null,
      j.deadline || null
    );

    return j;
  }

  public getJobById(id: string): ExecutionJob | null {
    const stmt = this.db.prepare(`SELECT * FROM execution_jobs WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapJobRow(row);
  }

  public getJobByIdempotencyKey(key: string): ExecutionJob | null {
    const stmt = this.db.prepare(`SELECT * FROM execution_jobs WHERE idempotency_key = ? LIMIT 1`);
    const row = stmt.get(key) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapJobRow(row);
  }

  public updateJobState(id: string, state: JobState, updates?: Partial<ExecutionJob>): ExecutionJob | null {
    return this.updateJob(id, { ...updates, state });
  }

  public updateJob(id: string, updates: Partial<ExecutionJob>): ExecutionJob | null {
    const existing = this.getJobById(id);
    if (!existing) return null;

    if (updates.assignedWorkerId && !this.getWorkerById(updates.assignedWorkerId)) {
      const stubRtId = 'rt-stub-' + updates.assignedWorkerId;
      if (!this.getRuntimeById(stubRtId)) {
        this.createRuntime({
          id: stubRtId,
          name: 'Stub Runtime',
          type: 'LOCAL',
          architecture: 'x64',
          operatingSystem: process.platform,
          cpuCores: 1,
          memoryMb: 1024,
          networkLocality: 'LOCAL',
          installedSoftware: [],
          availableModels: [],
          supportedTools: [],
          supportedEnvironments: [],
          trustLevel: 'AUTHORIZED',
          costClass: 'FREE',
          availability: 'ONLINE',
          health: 'HEALTHY',
          lastHeartbeat: new Date().toISOString(),
          currentLoad: 0,
          concurrency: 0,
          maxConcurrency: 1,
          authorizationScope: 'GLOBAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      this.createWorker({
        id: updates.assignedWorkerId,
        runtimeId: stubRtId,
        name: 'Stub Worker',
        status: 'ONLINE',
        host: 'localhost',
        capabilities: [],
        resources: { cpuCores: 1, memoryTotalMb: 1024, memoryFreeMb: 512 },
        health: 'HEALTHY',
        lastHeartbeat: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        version: '1.0.0',
        protocolVersion: '1.0.0',
        softwareInventory: [],
        modelInventory: [],
        environmentAssociations: [],
        trustLevel: 'AUTHORIZED',
        authorizationScope: 'GLOBAL',
        currentWorkload: 0,
        queuedWorkload: 0,
        drainState: false,
        activeJobIds: [],
        consecutiveMissedHeartbeats: 0,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const attempt = updates.attempt ?? updates.retryCount ?? existing.attempt;
    const maxAttempts = updates.maxAttempts ?? updates.maxRetries ?? existing.maxAttempts;

    const updated: ExecutionJob = {
      ...existing,
      ...updates,
      attempt,
      retryCount: attempt,
      maxAttempts,
      maxRetries: maxAttempts,
    };

    const stmt = this.db.prepare(`
      UPDATE execution_jobs SET
        objective = ?, task_type = ?, priority = ?, state = ?, scope = ?,
        company_id = ?, project_id = ?, client_id = ?, mission_id = ?,
        goal_id = ?, workflow_id = ?, step_index = ?, agent_id = ?,
        assigned_worker_id = ?, assigned_runtime_id = ?, lease_token = ?,
        fencing_token = ?, idempotency_key = ?, required_capabilities = ?,
        resource_requirements = ?, policy = ?, attempt = ?, retry_count = ?, max_attempts = ?, max_retries = ?,
        progress = ?, input_payload = ?, output_payload = ?, checkpoint_id = ?,
        error_message = ?, requires_approval = ?, estimated_cost = ?,
        actual_cost = ?, started_at = ?, completed_at = ?, deadline = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.objective,
      updated.taskType,
      updated.priority,
      updated.state,
      updated.scope,
      updated.companyId || null,
      updated.projectId || null,
      updated.clientId || null,
      updated.missionId || null,
      updated.goalId || null,
      updated.workflowId || null,
      updated.stepIndex ?? null,
      updated.agentId || null,
      updated.assignedWorkerId || null,
      updated.assignedRuntimeId || null,
      updated.leaseToken || null,
      updated.fencingToken,
      updated.idempotencyKey || null,
      JSON.stringify(updated.requiredCapabilities || []),
      updated.resourceRequirements ? JSON.stringify(updated.resourceRequirements) : null,
      updated.policy,
      updated.attempt ?? 0,
      updated.attempt ?? 0,
      updated.maxAttempts ?? 3,
      updated.maxAttempts ?? 3,
      updated.progress ?? 0,
      updated.inputPayload ? JSON.stringify(updated.inputPayload) : null,
      updated.outputPayload ? JSON.stringify(updated.outputPayload) : null,
      updated.checkpointId || null,
      updated.errorMessage || null,
      updated.requiresApproval ? 1 : 0,
      updated.estimatedCost || null,
      updated.actualCost || null,
      updated.startedAt || null,
      updated.completedAt || null,
      updated.deadline || null,
      id
    );

    return updated;
  }

  public listJobs(filter?: { state?: JobState; scope?: string; companyId?: string; projectId?: string }): ExecutionJob[] {
    let sql = `SELECT * FROM execution_jobs WHERE 1=1`;
    const params: any[] = [];

    if (filter?.state) {
      sql += ` AND state = ?`;
      params.push(filter.state);
    }
    if (filter?.scope) {
      sql += ` AND scope = ?`;
      params.push(filter.scope);
    }
    if (filter?.companyId) {
      sql += ` AND company_id = ?`;
      params.push(filter.companyId);
    }
    if (filter?.projectId) {
      sql += ` AND project_id = ?`;
      params.push(filter.projectId);
    }

    sql += ` ORDER BY priority DESC, created_at ASC`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map(r => this.mapJobRow(r));
  }

  public getInFlightJobs(): ExecutionJob[] {
    const stmt = this.db.prepare(`
      SELECT * FROM execution_jobs
      WHERE state IN ('RUNNING', 'STARTING', 'CHECKPOINTING', 'MIGRATING', 'VERIFYING')
      ORDER BY priority DESC, created_at ASC
    `);
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(r => this.mapJobRow(r));
  }

  public getQueuedJobs(): ExecutionJob[] {
    const stmt = this.db.prepare(`
      SELECT * FROM execution_jobs
      WHERE state = 'QUEUED'
      ORDER BY priority DESC, created_at ASC
    `);
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(r => this.mapJobRow(r));
  }

  // ==========================================
  // 4. LEASES
  // ==========================================

  public createLease(l: JobLease): JobLease {
    if (!this.getJobById(l.jobId)) {
      this.createJob({
        id: l.jobId,
        objective: 'Auto-stub for FK integrity',
        taskType: 'system.stub',
        state: 'RUNNING',
        priority: 50,
        scope: 'GLOBAL',
        fencingToken: l.fencingToken || 0,
        policy: 'LOCAL_PREFERRED',
        requiredCapabilities: [],
        createdAt: new Date().toISOString(),
      });
    }

    if (l.workerId && !this.getWorkerById(l.workerId)) {
      const stubRtId = 'rt-stub-' + l.workerId;
      if (!this.getRuntimeById(stubRtId)) {
        this.createRuntime({
          id: stubRtId,
          name: 'Stub Runtime',
          type: 'LOCAL',
          architecture: 'x64',
          operatingSystem: process.platform,
          cpuCores: 1,
          memoryMb: 1024,
          networkLocality: 'LOCAL',
          installedSoftware: [],
          availableModels: [],
          supportedTools: [],
          supportedEnvironments: [],
          trustLevel: 'AUTHORIZED',
          costClass: 'FREE',
          availability: 'ONLINE',
          health: 'HEALTHY',
          lastHeartbeat: new Date().toISOString(),
          currentLoad: 0,
          concurrency: 0,
          maxConcurrency: 1,
          authorizationScope: 'GLOBAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      this.createWorker({
        id: l.workerId,
        runtimeId: stubRtId,
        name: 'Stub Worker',
        status: 'ONLINE',
        host: 'localhost',
        capabilities: [],
        resources: { cpuCores: 1, memoryTotalMb: 1024, memoryFreeMb: 512 },
        health: 'HEALTHY',
        lastHeartbeat: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        version: '1.0.0',
        protocolVersion: '1.0.0',
        softwareInventory: [],
        modelInventory: [],
        environmentAssociations: [],
        trustLevel: 'AUTHORIZED',
        authorizationScope: 'GLOBAL',
        currentWorkload: 0,
        queuedWorkload: 0,
        drainState: false,
        activeJobIds: [],
        consecutiveMissedHeartbeats: 0,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const leaseToken = l.leaseToken || (l as any).token || `lease_${l.id || randomUUID().slice(0, 8)}`;
    const renewedAt = l.renewedAt || (l as any).lastRenewedAt || l.acquiredAt || new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO execution_leases (
        id, job_id, worker_id, lease_token, fencing_token,
        acquired_at, expires_at, renewed_at, released_at, revoked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      l.id,
      l.jobId,
      l.workerId,
      leaseToken,
      l.fencingToken,
      l.acquiredAt,
      l.expiresAt,
      renewedAt,
      l.releasedAt || null,
      l.revoked ? 1 : 0
    );

    return { ...l, leaseToken, renewedAt };
  }

  public getLeaseByJobId(jobId: string): JobLease | null {
    const stmt = this.db.prepare(`
      SELECT * FROM execution_leases
      WHERE job_id = ? AND revoked = 0 AND released_at IS NULL
      ORDER BY fencing_token DESC LIMIT 1
    `);
    const row = stmt.get(jobId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapLeaseRow(row);
  }

  public getActiveLeaseForJob(jobId: string): JobLease | null {
    return this.getLeaseByJobId(jobId);
  }

  public getLeaseByToken(token: string): JobLease | null {
    const stmt = this.db.prepare(`SELECT * FROM execution_leases WHERE lease_token = ? LIMIT 1`);
    const row = stmt.get(token) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapLeaseRow(row);
  }

  public renewLease(leaseTokenOrId: string, newExpiresAt: string): boolean {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE execution_leases SET
        expires_at = ?, renewed_at = ?
      WHERE (lease_token = ? OR id = ?) AND revoked = 0 AND released_at IS NULL
    `);
    const res = stmt.run(newExpiresAt, now, leaseTokenOrId, leaseTokenOrId);
    return res.changes > 0;
  }

  public releaseLease(leaseTokenOrId: string): boolean {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE execution_leases SET
        released_at = ?
      WHERE lease_token = ? OR id = ?
    `);
    const res = stmt.run(now, leaseTokenOrId, leaseTokenOrId);
    return res.changes > 0;
  }

  public revokeLeasesForWorker(workerId: string): number {
    const stmt = this.db.prepare(`
      UPDATE execution_leases SET
        revoked = 1
      WHERE worker_id = ? AND released_at IS NULL
    `);
    const res = stmt.run(workerId);
    return Number(res.changes);
  }

  // ==========================================
  // 5. CHECKPOINTS
  // ==========================================

  public createCheckpoint(cp: JobCheckpoint): JobCheckpoint {
    if (!this.getJobById(cp.jobId)) {
      this.createJob({
        id: cp.jobId,
        objective: 'Auto-stub for FK integrity',
        taskType: 'system.stub',
        state: 'RUNNING',
        priority: 50,
        scope: 'GLOBAL',
        fencingToken: 0,
        policy: 'LOCAL_PREFERRED',
        requiredCapabilities: [],
        createdAt: new Date().toISOString(),
      });
    }

    const verificationEvidence = (cp as any).verificationEvidence || (cp as any).verification_evidence || null;

    const stmt = this.db.prepare(`
      INSERT INTO execution_checkpoints (
        id, job_id, step_number, step_name, state_snapshot,
        completed_actions, pending_actions, artifact_ids,
        memory_references, tool_state, environment_state,
        retry_count, verification_evidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      cp.id,
      cp.jobId,
      cp.stepNumber,
      cp.stepName,
      JSON.stringify(cp.stateSnapshot || {}),
      JSON.stringify(cp.completedActions || []),
      JSON.stringify(cp.pendingActions || []),
      JSON.stringify(cp.artifactIds || []),
      JSON.stringify(cp.memoryReferences || []),
      cp.toolState ? JSON.stringify(cp.toolState) : null,
      cp.environmentState ? JSON.stringify(cp.environmentState) : null,
      cp.retryCount,
      verificationEvidence ? JSON.stringify(verificationEvidence) : null,
      cp.createdAt
    );

    return cp;
  }

  public getLatestCheckpointForJob(jobId: string): JobCheckpoint | null {
    const stmt = this.db.prepare(`
      SELECT * FROM execution_checkpoints
      WHERE job_id = ?
      ORDER BY step_number DESC, created_at DESC LIMIT 1
    `);
    const row = stmt.get(jobId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapCheckpointRow(row);
  }

  public getLatestCheckpoint(jobId: string): JobCheckpoint | null {
    return this.getLatestCheckpointForJob(jobId);
  }

  public getCheckpointById(id: string): JobCheckpoint | null {
    const stmt = this.db.prepare(`SELECT * FROM execution_checkpoints WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapCheckpointRow(row);
  }

  public listCheckpointsForJob(jobId: string): JobCheckpoint[] {
    const stmt = this.db.prepare(`
      SELECT * FROM execution_checkpoints
      WHERE job_id = ?
      ORDER BY step_number ASC
    `);
    const rows = stmt.all(jobId) as Record<string, unknown>[];
    return rows.map(r => this.mapCheckpointRow(r));
  }

  // ==========================================
  // 6. TRACES
  // ==========================================

  public createTrace(t: ExecutionTrace): ExecutionTrace {
    if (!this.getJobById(t.jobId)) {
      this.createJob({
        id: t.jobId,
        objective: 'Auto-stub for FK integrity',
        taskType: 'system.stub',
        state: 'RUNNING',
        priority: 50,
        scope: 'GLOBAL',
        fencingToken: 0,
        policy: 'LOCAL_PREFERRED',
        requiredCapabilities: [],
        createdAt: new Date().toISOString(),
      });
    }

    const traceId = t.id || `tr_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO execution_traces (
        id, job_id, timestamp, event_type, from_state, to_state,
        worker_id, fencing_token, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      traceId,
      t.jobId,
      t.timestamp,
      t.eventType,
      t.fromState || null,
      t.toState || null,
      t.workerId || null,
      t.fencingToken ?? null,
      t.details ? JSON.stringify(t.details) : null
    );

    return { ...t, id: traceId };
  }

  public listTracesForJob(jobId: string): ExecutionTrace[] {
    const stmt = this.db.prepare(`
      SELECT * FROM execution_traces
      WHERE job_id = ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(jobId) as Record<string, unknown>[];
    return rows.map(r => this.mapTraceRow(r));
  }

  public getTracesForJob(jobId: string): ExecutionTrace[] {
    return this.listTracesForJob(jobId);
  }

  // ==========================================
  // 7. ARTIFACTS
  // ==========================================

  public createArtifact(a: ExecutionArtifact): ExecutionArtifact {
    if (a.jobId && !this.getJobById(a.jobId)) {
      this.createJob({
        id: a.jobId,
        objective: 'Synthetic Stub Job for Artifact',
        taskType: 'test',
        priority: 1,
        state: 'RUNNING',
        scope: a.scope || (a as any).scope || 'GLOBAL',
        companyId: a.companyId || (a as any).companyId,
        fencingToken: 1,
        policy: 'LOCAL_ONLY',
        requiredCapabilities: [],
        attempt: 0,
        maxAttempts: 3,
        progress: 0,
        createdAt: a.createdAt || new Date().toISOString()
      });
    }

    const filePath = a.filePath || (a as any).path || '';
    const mimeType = a.mimeType || (a as any).mime_type || 'application/octet-stream';
    const replicationStatus = a.replicationStatus || (a as any).replication_status || 'NOT_REPLICATED';

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO execution_artifacts (
        id, job_id, name, file_path, checksum_sha256, size_bytes,
        mime_type, storage_class, verified, replication_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      a.id,
      a.jobId,
      a.name,
      filePath,
      a.checksumSha256,
      a.sizeBytes,
      mimeType,
      a.storageClass,
      a.verified ? 1 : 0,
      replicationStatus,
      a.createdAt
    );

    return a;
  }

  public getArtifactById(id: string): ExecutionArtifact | null {
    const stmt = this.db.prepare(`
      SELECT a.*, j.company_id, j.scope
      FROM execution_artifacts a
      LEFT JOIN execution_jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapArtifactRow(row);
  }

  public listArtifactsForJob(jobId: string): ExecutionArtifact[] {
    const stmt = this.db.prepare(`
      SELECT a.*, j.company_id, j.scope
      FROM execution_artifacts a
      LEFT JOIN execution_jobs j ON a.job_id = j.id
      WHERE a.job_id = ?
      ORDER BY a.created_at ASC
    `);
    const rows = stmt.all(jobId) as Record<string, unknown>[];
    return rows.map(r => this.mapArtifactRow(r));
  }

  public updateArtifactReplication(id: string, replicationStatus: 'LOCAL' | 'PENDING' | 'REPLICATED' | 'FAILED'): boolean {
    const stmt = this.db.prepare(`UPDATE execution_artifacts SET replication_status = ? WHERE id = ?`);
    const res = stmt.run(replicationStatus, id);
    return res.changes > 0;
  }

  // ==========================================
  // 8. POLICIES
  // ==========================================

  public createPolicy(p: ExecutionPolicy): ExecutionPolicy {
    const policyType = p.policyType || p.policy || (p as any).policy_type || 'LOCAL_PREFERRED';
    const maxCost = p.maxCostPerJob ?? p.maxCostUsd ?? (p as any).max_cost_per_job ?? null;
    const maxConcurrency = p.maxConcurrency ?? (p as any).max_concurrency ?? 4;
    const requireApprovalForPaid = p.requireApprovalForPaid ?? (p.allowCloudPaid != null ? !p.allowCloudPaid : true);
    const allowedWorkerTypes = p.allowedWorkerTypes || p.allowedRuntimeTypes || [];

    const stmt = this.db.prepare(`
      INSERT INTO execution_policies (
        id, scope, company_id, project_id, policy_type,
        max_cost_per_job, max_concurrency, require_approval_for_paid,
        allowed_worker_types, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      p.id,
      p.scope,
      p.companyId || null,
      p.projectId || null,
      policyType,
      maxCost,
      maxConcurrency,
      requireApprovalForPaid ? 1 : 0,
      JSON.stringify(allowedWorkerTypes),
      p.createdAt || new Date().toISOString(),
      p.updatedAt || new Date().toISOString()
    );

    return p;
  }

  public getPolicyByScope(scope: string, companyId?: string, projectId?: string): ExecutionPolicy | null {
    let sql = `SELECT * FROM execution_policies WHERE scope = ?`;
    const params: any[] = [scope];

    if (companyId) {
      sql += ` AND (company_id = ? OR company_id IS NULL)`;
      params.push(companyId);
    }
    if (projectId) {
      sql += ` AND (project_id = ? OR project_id IS NULL)`;
      params.push(projectId);
    }

    sql += ` ORDER BY created_at DESC LIMIT 1`;

    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapPolicyRow(row);
  }

  public listPolicies(): ExecutionPolicy[] {
    const stmt = this.db.prepare(`SELECT * FROM execution_policies ORDER BY created_at DESC`);
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(r => this.mapPolicyRow(r));
  }

  // ==========================================
  // 9. CLOUD PROVIDERS
  // ==========================================

  public createCloudProvider(cp: CloudProviderDescriptor): CloudProviderDescriptor {
    const stmt = this.db.prepare(`
      INSERT INTO execution_cloud_providers (
        id, name, provider_type, state, region, remaining_quota,
        quota_reset_time, supported_runtimes, is_paid, cost_per_hour_usd,
        auth_account_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      cp.id,
      cp.name,
      cp.providerType,
      cp.state,
      cp.region || null,
      cp.remainingQuota ?? null,
      cp.quotaResetTime || null,
      JSON.stringify(cp.supportedRuntimes || []),
      cp.isPaid ? 1 : 0,
      cp.costPerHourUsd || null,
      cp.authAccountId || null,
      cp.metadata ? JSON.stringify(cp.metadata) : null
    );

    return cp;
  }

  public getCloudProviderById(id: string): CloudProviderDescriptor | null {
    const stmt = this.db.prepare(`SELECT * FROM execution_cloud_providers WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapCloudProviderRow(row);
  }

  public getCloudProvider(idOrProvider: string): CloudProviderDescriptor | null {
    return this.getCloudProviderById(idOrProvider) || this.listCloudProviders().find(p => p.id === idOrProvider || p.providerType === idOrProvider || (p.metadata as any)?.provider === idOrProvider || (p as any).provider === idOrProvider) || null;
  }

  public listCloudProviders(): CloudProviderDescriptor[] {
    const stmt = this.db.prepare(`SELECT * FROM execution_cloud_providers ORDER BY name ASC`);
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(r => this.mapCloudProviderRow(r));
  }

  public updateCloudProvider(id: string, updates: Partial<CloudProviderDescriptor>): CloudProviderDescriptor | null {
    const existing = this.getCloudProviderById(id);
    if (!existing) return null;

    const updated: CloudProviderDescriptor = {
      ...existing,
      ...updates,
    };

    const stmt = this.db.prepare(`
      UPDATE execution_cloud_providers SET
        name = ?, provider_type = ?, state = ?, region = ?,
        remaining_quota = ?, quota_reset_time = ?, supported_runtimes = ?,
        is_paid = ?, cost_per_hour_usd = ?, auth_account_id = ?, metadata = ?
      WHERE id = ?
    `);

    const region = Array.isArray(updated.region)
      ? (updated.region[0] || null)
      : (typeof updated.region === 'string' ? updated.region : ((updates as any).configuredRegions?.[0] || null));

    stmt.run(
      updated.name,
      updated.providerType,
      updated.state,
      region,
      updated.remainingQuota ?? null,
      updated.quotaResetTime || null,
      JSON.stringify(updated.supportedRuntimes || []),
      updated.isPaid ? 1 : 0,
      updated.costPerHourUsd || null,
      updated.authAccountId || null,
      updated.metadata ? JSON.stringify(updated.metadata) : null,
      id
    );

    return { ...updated, region: region || undefined };
  }

  public upsertCloudProvider(input: any): CloudProviderDescriptor {
    const id = input.id || input.provider || input.providerType || 'cloud-p1';
    const name = input.name || input.provider || input.providerType || 'Cloud Provider';
    const providerType = input.providerType || input.provider || 'CUSTOM';
    const state = input.state || 'NOT_CONFIGURED';
    const region = input.region || (input.configuredRegions && input.configuredRegions[0]) || null;
    const supportedRuntimes = input.supportedRuntimes || ['CLOUD'];
    const isPaid = input.isPaid ?? (input.costClass === 'PAID');
    const remainingQuota = input.remainingQuota ?? null;
    const quotaResetTime = input.quotaResetTime || null;
    const costPerHourUsd = input.costPerHourUsd ?? null;
    const authAccountId = input.authAccountId || null;
    const metadata = {
      ...(input.metadata || {}),
      ...(input.provider ? { provider: input.provider } : {}),
      ...(input.quotaStatus ? { quotaStatus: input.quotaStatus } : {}),
      ...(input.configuredRegions ? { configuredRegions: input.configuredRegions } : {}),
      ...(input.costClass ? { costClass: input.costClass } : {}),
    };

    const existing = this.getCloudProviderById(id);
    if (existing) {
      return this.updateCloudProvider(id, {
        name,
        providerType: providerType as any,
        state,
        region,
        supportedRuntimes,
        isPaid,
        remainingQuota,
        quotaResetTime,
        costPerHourUsd,
        authAccountId,
        metadata,
      })!;
    } else {
      return this.createCloudProvider({
        id,
        name,
        providerType: providerType as any,
        state,
        region,
        supportedRuntimes,
        isPaid,
        remainingQuota,
        quotaResetTime,
        costPerHourUsd,
        authAccountId,
        metadata,
      });
    }
  }

  // ==========================================
  // ROW MAPPERS
  // ==========================================

  private mapRuntimeRow(r: Record<string, unknown>): ExecutionRuntime {
    return {
      id: String(r.id),
      name: String(r.name),
      type: r.type as ExecutionRuntime['type'],
      environmentId: r.environment_id ? String(r.environment_id) : undefined,
      architecture: String(r.architecture),
      operatingSystem: String(r.operating_system),
      cpuCores: Number(r.cpu_cores),
      memoryMb: Number(r.memory_mb),
      gpu: r.gpu_info ? JSON.parse(String(r.gpu_info)) : undefined,
      storageAvailableMb: r.storage_available_mb ? Number(r.storage_available_mb) : undefined,
      networkLocality: r.network_locality as ExecutionRuntime['networkLocality'],
      installedSoftware: JSON.parse(String(r.installed_software || '[]')),
      availableModels: JSON.parse(String(r.available_models || '[]')),
      supportedTools: JSON.parse(String(r.supported_tools || '[]')),
      supportedEnvironments: JSON.parse(String(r.supported_environments || '[]')),
      trustLevel: r.trust_level as ExecutionRuntime['trustLevel'],
      costClass: r.cost_class as ExecutionRuntime['costClass'],
      availability: r.availability as ExecutionRuntime['availability'],
      health: r.health as ExecutionRuntime['health'],
      lastHeartbeat: String(r.last_heartbeat),
      currentLoad: Number(r.current_load),
      concurrency: Number(r.concurrency),
      maxConcurrency: Number(r.max_concurrency),
      authorizationScope: r.authorization_scope as ExecutionRuntime['authorizationScope'],
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }

  private mapWorkerRow(r: Record<string, unknown>): ExecutionWorker {
    return {
      id: String(r.id),
      runtimeId: String(r.runtime_id),
      name: String(r.name),
      status: r.status as ExecutionWorker['status'],
      host: String(r.host),
      port: r.port ? Number(r.port) : undefined,
      capabilities: JSON.parse(String(r.capabilities || '[]')),
      resources: JSON.parse(String(r.resources || '{}')),
      health: r.health as ExecutionWorker['health'],
      lastHeartbeat: String(r.last_heartbeat),
      lastSeen: String(r.last_seen),
      version: String(r.version),
      protocolVersion: String(r.protocol_version),
      softwareInventory: JSON.parse(String(r.software_inventory || '[]')),
      modelInventory: JSON.parse(String(r.model_inventory || '[]')),
      environmentAssociations: JSON.parse(String(r.environment_associations || '[]')),
      trustLevel: r.trust_level as ExecutionWorker['trustLevel'],
      authorizationScope: r.authorization_scope as ExecutionWorker['authorizationScope'],
      currentWorkload: Number(r.current_workload),
      queuedWorkload: Number(r.queued_workload),
      drainState: Boolean(r.drain_state),
      activeJobIds: JSON.parse(String(r.active_job_ids || '[]')),
      consecutiveMissedHeartbeats: Number(r.consecutive_missed_heartbeats),
      missedHeartbeats: Number(r.consecutive_missed_heartbeats),
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      registeredAt: String(r.registered_at),
      updatedAt: String(r.updated_at),
    };
  }

  private mapJobRow(r: Record<string, unknown>): ExecutionJob {
    return {
      id: String(r.id),
      objective: String(r.objective),
      taskType: String(r.task_type),
      priority: Number(r.priority),
      state: r.state as ExecutionJob['state'],
      scope: r.scope as ExecutionJob['scope'],
      companyId: r.company_id ? String(r.company_id) : undefined,
      projectId: r.project_id ? String(r.project_id) : undefined,
      clientId: r.client_id ? String(r.client_id) : undefined,
      missionId: r.mission_id ? String(r.mission_id) : undefined,
      goalId: r.goal_id ? String(r.goal_id) : undefined,
      workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
      stepIndex: r.step_index !== null ? Number(r.step_index) : undefined,
      agentId: r.agent_id ? String(r.agent_id) : undefined,
      assignedWorkerId: r.assigned_worker_id ? String(r.assigned_worker_id) : undefined,
      assignedRuntimeId: r.assigned_runtime_id ? String(r.assigned_runtime_id) : undefined,
      leaseToken: r.lease_token ? String(r.lease_token) : undefined,
      fencingToken: Number(r.fencing_token),
      idempotencyKey: r.idempotency_key ? String(r.idempotency_key) : undefined,
      requiredCapabilities: JSON.parse(String(r.required_capabilities || '[]')),
      resourceRequirements: r.resource_requirements ? JSON.parse(String(r.resource_requirements)) : undefined,
      policy: r.policy as ExecutionJob['policy'],
      attempt: Number(r.attempt),
      retryCount: Number(r.attempt),
      maxAttempts: Number(r.max_attempts),
      maxRetries: Number(r.max_attempts),
      progress: Number(r.progress),
      inputPayload: r.input_payload ? JSON.parse(String(r.input_payload)) : undefined,
      outputPayload: r.output_payload ? JSON.parse(String(r.output_payload)) : undefined,
      checkpointId: r.checkpoint_id ? String(r.checkpoint_id) : undefined,
      errorMessage: r.error_message ? String(r.error_message) : undefined,
      requiresApproval: Boolean(r.requires_approval),
      estimatedCost: r.estimated_cost ? Number(r.estimated_cost) : undefined,
      actualCost: r.actual_cost ? Number(r.actual_cost) : undefined,
      createdAt: String(r.created_at),
      startedAt: r.started_at ? String(r.started_at) : undefined,
      completedAt: r.completed_at ? String(r.completed_at) : undefined,
      deadline: r.deadline ? String(r.deadline) : undefined,
    };
  }

  private mapLeaseRow(r: Record<string, unknown>): JobLease {
    return {
      id: String(r.id),
      jobId: String(r.job_id),
      workerId: String(r.worker_id),
      leaseToken: String(r.lease_token),
      fencingToken: Number(r.fencing_token),
      acquiredAt: String(r.acquired_at),
      expiresAt: String(r.expires_at),
      renewedAt: String(r.renewed_at),
      releasedAt: r.released_at ? String(r.released_at) : undefined,
      revoked: Boolean(r.revoked),
    };
  }

  private mapCheckpointRow(r: Record<string, unknown>): JobCheckpoint {
    return {
      id: String(r.id),
      jobId: String(r.job_id),
      stepNumber: Number(r.step_number),
      stepName: String(r.step_name),
      stateSnapshot: JSON.parse(String(r.state_snapshot || '{}')),
      completedActions: JSON.parse(String(r.completed_actions || '[]')),
      pendingActions: JSON.parse(String(r.pending_actions || '[]')),
      artifactIds: JSON.parse(String(r.artifact_ids || '[]')),
      memoryReferences: JSON.parse(String(r.memory_references || '[]')),
      toolState: r.tool_state ? JSON.parse(String(r.tool_state)) : undefined,
      environmentState: r.environment_state ? JSON.parse(String(r.environment_state)) : undefined,
      retryCount: Number(r.retry_count),
      createdAt: String(r.created_at),
    };
  }

  private mapTraceRow(r: Record<string, unknown>): ExecutionTrace {
    return {
      id: String(r.id),
      jobId: String(r.job_id),
      timestamp: String(r.timestamp),
      eventType: String(r.event_type),
      fromState: r.from_state ? (r.from_state as JobState) : undefined,
      toState: r.to_state ? (r.to_state as JobState) : undefined,
      workerId: r.worker_id ? String(r.worker_id) : undefined,
      fencingToken: r.fencing_token !== null ? Number(r.fencing_token) : undefined,
      details: r.details ? JSON.parse(String(r.details)) : undefined,
    };
  }

  private mapArtifactRow(r: Record<string, unknown>): ExecutionArtifact {
    return {
      id: String(r.id),
      jobId: String(r.job_id),
      name: String(r.name),
      filePath: String(r.file_path),
      checksumSha256: String(r.checksum_sha256),
      sizeBytes: Number(r.size_bytes),
      mimeType: String(r.mime_type),
      storageClass: r.storage_class as ExecutionArtifact['storageClass'],
      verified: Boolean(r.verified),
      replicationStatus: r.replication_status as ExecutionArtifact['replicationStatus'],
      companyId: r.company_id ? String(r.company_id) : undefined,
      scope: r.scope ? (r.scope as any) : undefined,
      createdAt: String(r.created_at),
    };
  }

  private mapPolicyRow(r: Record<string, unknown>): ExecutionPolicy {
    return {
      id: String(r.id),
      scope: r.scope as ExecutionPolicy['scope'],
      companyId: r.company_id ? String(r.company_id) : undefined,
      projectId: r.project_id ? String(r.project_id) : undefined,
      policyType: r.policy_type as ExecutionPolicy['policyType'],
      policy: r.policy_type as ExecutionPolicy['policyType'],
      maxCostPerJob: r.max_cost_per_job ? Number(r.max_cost_per_job) : undefined,
      maxCostUsd: r.max_cost_per_job ? Number(r.max_cost_per_job) : undefined,
      allowCloudPaid: !Boolean(r.require_approval_for_paid),
      maxConcurrency: Number(r.max_concurrency),
      requireApprovalForPaid: Boolean(r.require_approval_for_paid),
      allowedWorkerTypes: JSON.parse(String(r.allowed_worker_types || '[]')),
      allowedRuntimeTypes: JSON.parse(String(r.allowed_worker_types || '[]')),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }

  private mapCloudProviderRow(r: Record<string, unknown>): CloudProviderDescriptor {
    const meta = r.metadata ? JSON.parse(String(r.metadata)) : {};
    return {
      id: String(r.id),
      name: String(r.name),
      providerType: r.provider_type as CloudProviderDescriptor['providerType'],
      provider: (meta.provider || r.provider_type || r.id) as any,
      state: r.state as CloudProviderDescriptor['state'],
      quotaStatus: meta.quotaStatus || 'UNKNOWN',
      region: r.region ? String(r.region) : undefined,
      configuredRegions: meta.configuredRegions || (r.region ? [String(r.region)] : []),
      remainingQuota: r.remaining_quota !== null ? Number(r.remaining_quota) : undefined,
      quotaResetTime: r.quota_reset_time ? String(r.quota_reset_time) : undefined,
      supportedRuntimes: JSON.parse(String(r.supported_runtimes || '[]')),
      isPaid: Boolean(r.is_paid),
      costClass: meta.costClass || (Boolean(r.is_paid) ? 'PAID' : 'FREE'),
      costPerHourUsd: r.cost_per_hour_usd ? Number(r.cost_per_hour_usd) : undefined,
      authAccountId: r.auth_account_id ? String(r.auth_account_id) : undefined,
      metadata: meta,
      updatedAt: meta.updatedAt || new Date().toISOString(),
    };
  }
}
