/**
 * HṚṢĪKEŚA (हृषीकेश) — Execution Fabric
 *
 * FP-19: Master Persistent Distributed Execution & 24/7 Operations Fabric Orchestrator
 */

import { randomUUID, createHash } from 'node:crypto';
import { ILogger } from '../core/logging/logger.types.js';
import { EventBus } from '../core/events/event-bus.js';
import { DatabaseManager } from '../persistence/database/database.manager.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import { ExecutionRepository } from './repositories/execution.repository.js';
import { WorkerRegistryService } from './services/worker-registry.service.js';
import { LeaseFencingService } from './services/lease-fencing.service.js';
import { CheckpointService, CreateCheckpointInput } from './services/checkpoint.service.js';
import { PlacementEngineService } from './services/placement-engine.service.js';
import { RecoveryManagerService, StartupRecoveryReport } from './services/recovery-manager.service.js';
import { CloudRuntimeService } from './services/cloud-runtime.service.js';
import { PersistentOperationsService } from './services/persistent-operations.service.js';
import {
  ExecutionJob,
  JobCheckpoint,
  ExecutionArtifact,
  ExecutionTrace,
  JobState,
  ExecutionScope,
  ExecutionPolicyType,
  WorkerHeartbeatPayload,
  PersistentOperationsSummary,
  ArtifactStorageClass,
} from './interfaces/execution.types.js';

export interface SubmitJobInput {
  objective: string;
  taskType: string;
  priority?: number;
  scope?: ExecutionScope;
  companyId?: string;
  projectId?: string;
  clientId?: string;
  missionId?: string;
  goalId?: string;
  workflowId?: string;
  stepIndex?: number;
  agentId?: string;
  idempotencyKey?: string;
  requiredCapabilities?: string[];
  resourceRequirements?: ExecutionJob['resourceRequirements'];
  policy?: ExecutionPolicyType;
  maxAttempts?: number;
  inputPayload?: Record<string, unknown>;
  requiresApproval?: boolean;
  estimatedCost?: number;
}

export class ExecutionFabric {
  public readonly repository: ExecutionRepository;
  public readonly workerRegistry: WorkerRegistryService;
  public readonly leaseFencing: LeaseFencingService;
  public readonly checkpointService: CheckpointService;
  public readonly placementEngine: PlacementEngineService;
  public readonly recoveryManager: RecoveryManagerService;
  public readonly cloudRuntime: CloudRuntimeService;
  public readonly persistentOperations: PersistentOperationsService;

  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private isStarted = false;

  constructor(
    dbManager: DatabaseManager,
    resourceGovernor?: ResourceGovernor,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.logger = logger?.child('ExecutionFabric');
    this.eventBus = eventBus;

    this.repository = new ExecutionRepository(dbManager, this.logger);
    this.workerRegistry = new WorkerRegistryService(this.repository, this.eventBus, this.logger);
    this.leaseFencing = new LeaseFencingService(this.repository, this.logger);
    this.checkpointService = new CheckpointService(this.repository, this.logger);
    this.placementEngine = new PlacementEngineService(
      this.repository,
      this.workerRegistry,
      resourceGovernor,
      this.logger
    );
    this.recoveryManager = new RecoveryManagerService(
      this.repository,
      this.leaseFencing,
      this.checkpointService,
      this.eventBus,
      this.logger
    );
    this.cloudRuntime = new CloudRuntimeService(this.repository, this.logger);
    this.persistentOperations = new PersistentOperationsService(this.repository, this.logger);

    this.ensureLocalWorker();
  }

  private ensureLocalWorker(): void {
    const existing = this.repository.listWorkers();
    if (existing.length === 0) {
      this.workerRegistry.enrollWorker({
        name: 'Local Host Worker',
        type: 'LOCAL',
        capabilities: ['bash', 'editor', 'code.compile', 'calc', 'general'],
        hardwareSpecs: {
          cpuCores: 16,
          memoryMb: 16384,
          diskAvailableGb: 200,
        },
        softwareInventory: ['node', 'git'],
        modelInventory: ['qwen2.5-coder'],
      });
    }
  }

  // ==========================================
  // ACCESSORS / GETTERS
  // ==========================================

  public getRepository(): ExecutionRepository { return this.repository; }
  public getWorkerRegistry(): WorkerRegistryService { return this.workerRegistry; }
  public getLeaseService(): LeaseFencingService { return this.leaseFencing; }
  public getCheckpointService(): CheckpointService { return this.checkpointService; }
  public getPlacementEngine(): PlacementEngineService { return this.placementEngine; }
  public getRecoveryManager(): RecoveryManagerService { return this.recoveryManager; }
  public getCloudRuntime(): CloudRuntimeService { return this.cloudRuntime; }
  public getPersistentOperations(): PersistentOperationsService { return this.persistentOperations; }
  public recoverOnStartup(): StartupRecoveryReport { return this.recoveryManager.onStartupRecovery(); }
  public handleWorkerHeartbeat(payload: WorkerHeartbeatPayload) { return this.workerRegistry.recordHeartbeat(payload); }
  public getJob(id: string): ExecutionJob | null { return this.repository.getJobById(id); }
  public listCheckpoints(jobId: string): JobCheckpoint[] { return this.repository.listCheckpointsForJob(jobId); }
  public getLatestCheckpoint(jobId: string): JobCheckpoint | null { return this.repository.getLatestCheckpoint(jobId); }
  public getExecutionTraces(jobId: string): ExecutionTrace[] { return this.repository.getTracesForJob(jobId); }

  // ==========================================
  // 1. LIFECYCLE & STARTUP RECOVERY
  // ==========================================

  public async start(): Promise<StartupRecoveryReport> {
    if (this.isStarted) {
      return { recoveredJobs: [], recoveredJobsCount: 0, migratedJobsCount: 0, failedJobsCount: 0, requeuedJobsCount: 0, details: [] };
    }
    this.isStarted = true;
    this.logger?.info('Starting ExecutionFabric and running startup recovery...');

    // Execute crash recovery on boot
    const report = this.recoveryManager.onStartupRecovery();
    return report;
  }

  public stop(): void {
    this.isStarted = false;
    this.logger?.info('ExecutionFabric stopped.');
  }

  // ==========================================
  // 2. JOB SUBMISSION & DISPATCH
  // ==========================================

  public submitJob(input: SubmitJobInput): ExecutionJob {
    // 1. Check idempotency
    if (input.idempotencyKey) {
      const existing = this.repository.getJobByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        this.logger?.info(`Reusing idempotent job [${existing.id}] for key [${input.idempotencyKey}]`);
        return existing;
      }
    }

    const id = `job_${randomUUID().slice(0, 16)}`;
    const now = new Date().toISOString();

    const job: ExecutionJob = {
      id,
      objective: input.objective,
      taskType: input.taskType,
      priority: input.priority ?? 50,
      state: 'QUEUED',
      scope: input.scope || 'GLOBAL',
      companyId: input.companyId,
      projectId: input.projectId,
      clientId: input.clientId,
      missionId: input.missionId,
      goalId: input.goalId,
      workflowId: input.workflowId,
      stepIndex: input.stepIndex,
      agentId: input.agentId,
      fencingToken: 0,
      idempotencyKey: input.idempotencyKey,
      requiredCapabilities: input.requiredCapabilities || [],
      resourceRequirements: input.resourceRequirements,
      policy: input.policy || 'LOCAL_PREFERRED',
      attempt: 0,
      retryCount: 0,
      maxAttempts: (input as any).maxRetries !== undefined ? (input as any).maxRetries : (input.maxAttempts || 3),
      maxRetries: (input as any).maxRetries !== undefined ? (input as any).maxRetries : (input.maxAttempts || 3),
      progress: 0.0,
      inputPayload: Object.assign({}, input.inputPayload, { maxRetries: (input as any).maxRetries }),
      requiresApproval: input.requiresApproval || false,
      estimatedCost: input.estimatedCost,
      createdAt: now,
    };

    this.repository.createJob(job);
    this.repository.createTrace({
      id: `tr_${Date.now()}_${randomUUID().slice(0, 8)}`,
      jobId: id,
      timestamp: now,
      eventType: 'SUBMITTED',
      toState: 'QUEUED',
      details: { objective: job.objective, taskType: job.taskType },
    });
    this.eventBus?.emit('execution.queued', { jobId: id, objective: job.objective });

    return job;
  }

  public dispatchJob(jobId: string): ExecutionJob {
    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    // If job requires approval before execution, halt in BLOCKED or WAITING
    if (job.requiresApproval && job.state === 'QUEUED') {
      const updated = this.repository.updateJob(jobId, { state: 'WAITING' });
      this.eventBus?.emit('execution.waiting', { jobId, reason: 'AWAITING_APPROVAL' });
      return updated!;
    }

    // Evaluate placement
    const candidate = this.placementEngine.selectWorker(job);
    if (!candidate) {
      // Leave queued for future capacity
      return null as any;
    }

    // Acquire lease
    const lease = this.leaseFencing.acquireLease(job.id, candidate.worker.id);

    // Update job to RUNNING
    const updated = this.repository.updateJob(job.id, {
      state: 'RUNNING',
      assignedWorkerId: candidate.worker.id,
      assignedRuntimeId: candidate.runtime.id,
      leaseToken: lease.leaseToken,
      fencingToken: lease.fencingToken,
      startedAt: new Date().toISOString(),
    });

    // Record trace
    this.repository.createTrace({
      id: `tr_${Date.now()}_${randomUUID().slice(0, 8)}`,
      jobId: job.id,
      timestamp: new Date().toISOString(),
      eventType: 'DISPATCH',
      fromState: 'QUEUED',
      toState: 'RUNNING',
      workerId: candidate.worker.id,
      fencingToken: lease.fencingToken,
      details: { placementReason: candidate.reason, score: candidate.score },
    });

    this.eventBus?.emit('execution.started', {
      jobId: job.id,
      workerId: candidate.worker.id,
      fencingToken: lease.fencingToken,
    });

    const result = Object.assign(updated || job, {
      worker: candidate.worker,
      runtime: candidate.runtime,
      fencingToken: lease.fencingToken,
      job: updated || job,
    });

    return result as any;
  }

  // ==========================================
  // 3. EXECUTION PROGRESS & CHECKPOINTING
  // ==========================================

  public checkpointJob(
    inputOrJobId: CreateCheckpointInput | string,
    workerId?: string,
    fencingToken?: number,
    partialInput?: Partial<CreateCheckpointInput>
  ): JobCheckpoint {
    let input: CreateCheckpointInput;
    if (typeof inputOrJobId === 'string') {
      if (workerId && fencingToken !== undefined) {
        this.leaseFencing.verifyFencingToken(inputOrJobId, workerId, fencingToken);
      }
      input = {
        jobId: inputOrJobId,
        stepNumber: partialInput?.stepNumber ?? 1,
        stepName: partialInput?.stepName ?? 'Step',
        stateSnapshot: partialInput?.stateSnapshot ?? {},
        completedActions: partialInput?.completedActions ?? [],
        pendingActions: partialInput?.pendingActions ?? [],
        artifactIds: partialInput?.artifactIds,
        memoryReferences: partialInput?.memoryReferences,
        toolState: partialInput?.toolState,
        environmentState: partialInput?.environmentState,
        retryCount: partialInput?.retryCount,
      };
    } else {
      input = inputOrJobId;
    }

    const cp = this.checkpointService.createCheckpoint(input);

    const progress = Math.min(1.0, Math.round(((input.stepNumber + 1) / Math.max(1, (input.stepNumber + 1 + input.pendingActions.length))) * 100) / 100);

    this.repository.updateJob(input.jobId, {
      progress,
      checkpointId: cp.id,
      state: 'RUNNING',
    });

    this.repository.createTrace({
      id: `tr_${Date.now()}_${randomUUID().slice(0, 8)}`,
      jobId: input.jobId,
      timestamp: new Date().toISOString(),
      eventType: 'CHECKPOINT',
      fromState: 'RUNNING',
      toState: 'RUNNING',
      workerId,
      fencingToken,
      details: { stepNumber: input.stepNumber, stepName: input.stepName },
    });

    this.eventBus?.emit('execution.checkpoint', {
      jobId: input.jobId,
      checkpointId: cp.id,
      stepNumber: input.stepNumber,
      progress,
    });

    return cp;
  }

  // ==========================================
  // 4. COMPLETION & FAILURE
  // ==========================================

  public completeJob(
    jobId: string,
    workerId: string,
    fencingToken: number,
    outputPayload?: Record<string, unknown>
  ): ExecutionJob {
    // 1. Verify fencing token (reject stale workers)
    this.leaseFencing.verifyFencingToken(jobId, workerId, fencingToken);

    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const now = new Date().toISOString();

    // Release lease
    if (job.leaseToken) {
      this.leaseFencing.releaseLease(job.leaseToken);
    }

    const updated = this.repository.updateJob(jobId, {
      state: 'COMPLETED',
      progress: 1.0,
      outputPayload,
      completedAt: now,
    });

    // Record trace
    this.repository.createTrace({
      id: `tr_${Date.now()}_${randomUUID().slice(0, 8)}`,
      jobId,
      timestamp: now,
      eventType: 'COMPLETED',
      fromState: job.state,
      toState: 'COMPLETED',
      workerId,
      fencingToken,
    });

    this.eventBus?.emit('execution.completed', { jobId, workerId });
    return updated!;
  }

  public failJob(
    jobId: string,
    workerId: string,
    fencingToken: number,
    errorMessage: string
  ): ExecutionJob {
    this.leaseFencing.verifyFencingToken(jobId, workerId, fencingToken);

    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const now = new Date().toISOString();

    if (job.leaseToken) {
      this.leaseFencing.releaseLease(job.leaseToken);
    }

    const currentAttempt = job.attempt ?? (job as any).retryCount ?? 0;
    const retryCount = currentAttempt + 1;
    const maxRetries = (job.inputPayload as any)?.maxRetries ?? (job as any).maxRetries ?? job.maxAttempts ?? 3;

    let newState: JobState = 'FAILED';
    if (retryCount < maxRetries) {
      newState = 'QUEUED'; // Requeue for next attempt
    }

    const updated = this.repository.updateJob(jobId, {
      state: newState,
      errorMessage,
      attempt: retryCount,
      retryCount,
      inputPayload: Object.assign({}, job.inputPayload, { retryCount }),
      completedAt: newState === 'FAILED' ? now : undefined,
      assignedWorkerId: newState === 'QUEUED' ? undefined : job.assignedWorkerId,
      leaseToken: undefined,
    });

    this.repository.createTrace({
      id: `tr_${Date.now()}_${randomUUID().slice(0, 8)}`,
      jobId,
      timestamp: now,
      eventType: 'FAILED',
      fromState: job.state,
      toState: newState,
      workerId,
      fencingToken,
      details: { errorMessage },
    });

    if (newState === 'FAILED') {
      this.eventBus?.emit('execution.failed', { jobId, errorMessage });
    } else {
      this.eventBus?.emit('execution.queued', { jobId, reason: 'RETRY' });
    }

    const result = Object.assign({}, updated || job, { retryCount });
    return result as any;
  }

  // ==========================================
  // 5. CONTROL: PAUSE / RESUME / CANCEL / MIGRATE
  // ==========================================

  public pauseJob(jobId: string): ExecutionJob {
    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    if (job.leaseToken) {
      this.leaseFencing.releaseLease(job.leaseToken);
    }

    const updated = this.repository.updateJob(jobId, {
      state: 'PAUSED',
      assignedWorkerId: undefined,
      leaseToken: undefined,
    });

    this.eventBus?.emit('execution.paused', { jobId });
    return updated!;
  }

  public resumeJob(jobId: string): ExecutionJob {
    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const updated = this.repository.updateJob(jobId, { state: 'QUEUED' });
    this.eventBus?.emit('execution.queued', { jobId, reason: 'RESUMED' });

    return updated!;
  }

  public cancelJob(jobId: string, reason = 'OPERATOR_CANCELLED'): ExecutionJob {
    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    if (job.leaseToken) {
      this.leaseFencing.releaseLease(job.leaseToken);
    }

    const updated = this.repository.updateJob(jobId, {
      state: 'CANCELLED',
      errorMessage: reason,
      completedAt: new Date().toISOString(),
    });

    this.eventBus?.emit('execution.cancelled', { jobId, reason });
    return updated!;
  }

  public migrateJob(jobId: string, targetWorkerId: string): ExecutionJob {
    return this.recoveryManager.migrateJob(jobId, targetWorkerId);
  }

  // ==========================================
  // 6. ARTIFACTS
  // ==========================================

  public registerArtifact(
    inputOrJobId: {
      jobId: string;
      name: string;
      filePath?: string;
      content: string | Buffer;
      mimeType?: string;
      storageClass?: ArtifactStorageClass;
    } | string,
    name?: string,
    content?: string | Buffer,
    storageClass?: ArtifactStorageClass
  ): ExecutionArtifact {
    let jobId: string;
    let artName: string;
    let filePath: string;
    let data: string | Buffer;
    let sClass: ArtifactStorageClass = storageClass || 'LOCAL_ONLY';

    if (typeof inputOrJobId === 'string') {
      jobId = inputOrJobId;
      artName = name || 'artifact.bin';
      data = content ?? '';
      filePath = `/artifacts/${artName}`;
    } else {
      jobId = inputOrJobId.jobId;
      artName = inputOrJobId.name;
      data = inputOrJobId.content ?? '';
      filePath = inputOrJobId.filePath || `/artifacts/${artName}`;
      sClass = inputOrJobId.storageClass || sClass;
    }

    const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const checksumSha256 = createHash('sha256').update(buf).digest('hex');

    const artifact: ExecutionArtifact = {
      id: `art_${randomUUID().slice(0, 12)}`,
      jobId,
      name: artName,
      filePath,
      checksumSha256,
      sizeBytes: buf.length,
      mimeType: (typeof inputOrJobId === 'object' && inputOrJobId.mimeType) || 'application/octet-stream',
      storageClass: sClass,
      verified: true,
      replicationStatus: 'LOCAL',
      createdAt: new Date().toISOString(),
    };

    return this.repository.createArtifact(artifact);
  }

  // ==========================================
  // 7. HEARTBEATS & LEASE AUDITS
  // ==========================================

  public recordHeartbeat(payload: WorkerHeartbeatPayload) {
    return this.workerRegistry.recordHeartbeat(payload);
  }

  public auditHeartbeatsAndLeases() {
    const staleWorkers = this.workerRegistry.detectStaleWorkers();
    const expiredJobs = this.leaseFencing.auditExpiredLeases();

    // Re-dispatch recoverable expired jobs
    for (const job of expiredJobs) {
      this.dispatchJob(job.id);
    }

    return { staleWorkersCount: staleWorkers.length, expiredJobsCount: expiredJobs.length };
  }

  // ==========================================
  // 8. PERSISTENT OPERATIONS SUMMARY
  // ==========================================

  public getOperationsSummary(): PersistentOperationsSummary {
    return this.persistentOperations.getSummary();
  }
}
