/**
 * HṚṢĪKEŚA (हृषीकेश) — Master Resource Fabric Manager
 *
 * FP-03: Foundation Performance & Execution Block
 * Distributed Local/LAN Resource Fabric & Execution Capacity
 *
 * Coordinates worker lifecycle, enrollment tokens, health tracking,
 * hardware detection, task placement, and policy governance.
 */

import { DatabaseManager } from '../persistence/database/database.manager.js';
import { EventBus } from '../core/events/event-bus.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import { CancellationToken } from '../inference/backend.types.js';
import { ResourceRegistry } from './resource.registry.js';
import { ResourcePolicyManager } from './resource.policy.js';
import { ResourceHealthTracker } from './resource.health.js';
import { ResourceScheduler } from './resource.scheduler.js';
import { LocalWorker } from './workers/local.worker.js';
import { WorkerTransportServer } from './transport/worker.transport.server.js';
import {
  Worker,
  WorkerTask,
  WorkerPrivacyLevel,
  ResourceRequirements,
  ResourceFabricOverview,
} from './resource.types.js';

export interface SubmitTaskRequest {
  readonly id?: string;
  readonly taskType: string;
  readonly priority?: number;
  readonly privacyLevel?: WorkerPrivacyLevel;
  readonly requiredCapabilities?: readonly string[];
  readonly resourceRequirements?: ResourceRequirements;
  readonly preferredWorkerId?: string;
  readonly idempotencyKey?: string;
  readonly inputPayload?: Record<string, unknown>;
  readonly deadline?: string;
  readonly timeoutMs?: number;
  readonly metadata?: Record<string, unknown>;
  readonly cancellationToken?: CancellationToken;
  readonly onProgress?: (progress: number, message?: string, tokenChunk?: string) => void;
  readonly waitForCapacity?: boolean;
  readonly allowMigration?: boolean;
}

export class ResourceManager {
  private static instance: ResourceManager | null = null;
  public readonly registry: ResourceRegistry;
  public readonly policyManager: ResourcePolicyManager;
  public readonly healthTracker: ResourceHealthTracker;
  public readonly scheduler: ResourceScheduler;
  public readonly localWorker: LocalWorker;
  public readonly transportServer: WorkerTransportServer;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private started = false;

  constructor(
    db: DatabaseManager,
    governor?: ResourceGovernor,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.eventBus = eventBus;
    this.logger = logger?.child('ResourceManager');
    this.policyManager = new ResourcePolicyManager();
    this.registry = new ResourceRegistry(db, eventBus, logger);
    this.healthTracker = new ResourceHealthTracker(this.registry, {}, eventBus, logger);
    this.scheduler = new ResourceScheduler(this.registry, this.policyManager, governor, eventBus, logger);
    this.localWorker = new LocalWorker('worker_local_primary', logger);
    this.transportServer = new WorkerTransportServer({}, this, eventBus, logger);

    // Register default local dispatch handler
    this.scheduler.registerDispatchHandler('LOCAL', this.localWorker);
    // Register dedicated LAN transport server for remote/LAN workers
    this.scheduler.registerDispatchHandler('LAN', this.transportServer);
    this.scheduler.registerDispatchHandler('REMOTE', this.transportServer);
  }

  public static initialize(
    db: DatabaseManager,
    governor?: ResourceGovernor,
    eventBus?: EventBus,
    logger?: ILogger
  ): ResourceManager {
    if (!this.instance || this.instance.registry.getDatabase() !== db) {
      if (this.instance) {
        this.instance.stop();
      }
      this.instance = new ResourceManager(db, governor, eventBus, logger);
    }
    return this.instance;
  }

  public static async resetInstance(): Promise<void> {
    if (this.instance) {
      await this.instance.stop();
      this.instance = null;
    }
  }

  public static getInstance(): ResourceManager {
    if (!this.instance) {
      throw new Error('ResourceManager not initialized. Call ResourceManager.initialize() first.');
    }
    return this.instance;
  }

  /**
   * Starts the Resource Fabric: registers local worker, starts health sweep.
   */
  public async start(options: {
    gpuName?: string;
    vulkanSupported?: boolean;
    availableModels?: string[];
  } = {}): Promise<void> {
    if (this.started) return;

    // 1. Build and register local primary worker
    const localDescriptor = this.localWorker.buildWorkerDescriptor(options);
    this.registry.registerWorker(localDescriptor);
    this.logger?.info(`Primary local worker registered: ${localDescriptor.id} (${localDescriptor.name})`);

    // 2. Start health tracker
    this.healthTracker.start();

    // 3. Start dedicated worker transport server if enabled
    if (process.env.HRSK_WORKER_TRANSPORT !== 'false') {
      try {
        await this.transportServer.start();
      } catch (err: any) {
        this.logger?.warn(`Worker transport server start notice: ${err.message}`);
      }
    }

    this.started = true;
    this.logger?.info('Resource Fabric Manager started successfully.');
  }

  public async stop(): Promise<void> {
    if (!this.started) return;
    this.healthTracker.stop();
    await this.transportServer.stop().catch(() => {});
    this.started = false;
    this.logger?.info('Resource Fabric Manager stopped.');
  }

  /**
   * Generates a single-use pairing token for enrolling a new remote/LAN worker.
   */
  public generateEnrollmentToken(name: string, ttlSeconds = 600): { token: string; expiresAt: string } {
    const { token, record } = this.policyManager.generateEnrollmentToken(name, ttlSeconds);
    this.registry.saveEnrollmentToken(record);
    this.logger?.info(`Generated pairing token for '${name}' (expires in ${ttlSeconds}s).`);
    return { token, expiresAt: record.expiresAt };
  }

  /**
   * Enrolls and authenticates a LAN worker presenting an enrollment token.
   */
  public authenticateAndRegisterWorker(worker: Worker, presentedToken: string): { success: boolean; error?: string } {
    const tokenHash = this.policyManager.hashToken(presentedToken);
    const storedToken = this.registry.getEnrollmentToken(tokenHash);

    if (!storedToken) {
      this.logger?.warn(`Worker registration rejected: Invalid enrollment token for '${worker.name}'.`);
      return { success: false, error: 'Invalid or unknown enrollment token.' };
    }

    if (storedToken.revoked) {
      return { success: false, error: 'Enrollment token has been revoked.' };
    }

    if (storedToken.usedAt) {
      return { success: false, error: 'Enrollment token has already been used. Single-use only.' };
    }

    if (new Date(storedToken.expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'Enrollment token has expired.' };
    }

    // Mark token used
    this.registry.markEnrollmentTokenUsed(tokenHash);

    // Set worker properties
    worker.trustLevel = 'ENROLLED';
    worker.status = 'ONLINE';
    worker.authTokenHash = tokenHash;
    worker.lastHeartbeat = new Date().toISOString();
    worker.lastSeen = new Date().toISOString();

    this.registry.registerWorker(worker);
    this.logger?.info(`Successfully authenticated and enrolled LAN worker: '${worker.name}' (${worker.id})`);
    return { success: true };
  }

  /**
   * Submits a task to the Resource Fabric for placement and execution.
   */
  public async submitTask(request: SubmitTaskRequest): Promise<{
    success: boolean;
    taskId: string;
    workerId?: string;
    output?: Record<string, unknown>;
    error?: string;
  }> {
    // Idempotency early-return check
    if (request.idempotencyKey) {
      const existing = this.registry.findTaskByIdempotency(request.idempotencyKey);
      if (existing && (existing.status === 'COMPLETED' || existing.status === 'RUNNING')) {
        return {
          success: existing.status === 'COMPLETED',
          taskId: existing.id,
          workerId: existing.assignedWorkerId,
          output: existing.outputPayload,
          error: existing.errorMessage,
        };
      }
    }

    const taskId = request.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const task: WorkerTask = {
      id: taskId,
      taskType: request.taskType,
      priority: request.priority ?? 50,
      status: 'QUEUED',
      privacyLevel: request.privacyLevel ?? 'PRIVATE',
      requiredCapabilities: request.requiredCapabilities || [],
      resourceRequirements: request.resourceRequirements,
      preferredWorkerId: request.preferredWorkerId,
      attempt: 1,
      progress: 0.0,
      idempotencyKey: request.idempotencyKey,
      inputPayload: request.inputPayload,
      createdAt: new Date().toISOString(),
      deadline: request.deadline,
      timeoutMs: request.timeoutMs,
      metadata: request.metadata,
    };

    this.registry.saveTask(task);
    this.eventBus?.emit('task.queued', { taskId, taskType: task.taskType, priority: task.priority });

    const dispatchResult = await this.scheduler.scheduleAndDispatch(task, {
      cancellationToken: request.cancellationToken,
      onProgress: request.onProgress,
      waitForCapacity: request.waitForCapacity,
      allowMigration: request.allowMigration,
    });

    return {
      success: dispatchResult.success,
      taskId,
      workerId: dispatchResult.workerId,
      output: dispatchResult.output,
      error: dispatchResult.error,
    };
  }

  public cancelTask(taskId: string, reason?: string): boolean {
    return this.scheduler.cancelTask(taskId, reason);
  }

  public drainWorker(workerId: string): void {
    this.registry.drainWorker(workerId);
    this.transportServer.drainWorker(workerId);
  }

  public resumeWorker(workerId: string): void {
    this.registry.resumeWorker(workerId);
    this.scheduler.processQueue();
  }

  public revokeWorker(workerId: string): void {
    this.registry.revokeWorker(workerId);
  }

  public recordHeartbeat(workerId: string, loadScore?: number): void {
    this.registry.recordHeartbeat(workerId, loadScore);
  }

  public getQueueLength(): number {
    return this.scheduler.getQueueLength();
  }

  public processQueue(): void {
    this.scheduler.processQueue();
  }

  public getWorkerActiveTasks(workerId: string): WorkerTask[] {
    return this.registry.getActiveTasksForWorker(workerId);
  }

  public getFabricOverview(): ResourceFabricOverview {
    return this.registry.getFabricOverview(this.localWorker.getWorkerId());
  }
}
