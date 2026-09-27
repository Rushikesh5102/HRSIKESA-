/**
 * HṚṢĪKEŚA (हृषीकेश) — Resource-Aware Placement Engine & Task Scheduler
 *
 * FP-03 & FP-05: Foundation Performance & Execution Block
 * Multi-Worker Execution, Concurrent Inference & Physical LAN Validation
 *
 * Implements:
 * 1. Multi-factor worker capability matching
 * 2. Privacy level constraint enforcement
 * 3. Resource-backed scoring (RAM, CPU, GPU, priority, load, latency, active tasks)
 * 4. Model-aware placement and warm residency scoring
 * 5. Transparent, explainable placement decisions
 * 6. Per-worker concurrency limits & capacity accounting
 * 7. Prioritized task queue with starvation prevention (aging bonus)
 * 8. Automatic saturation queueing and queue pumping
 * 9. Worker draining lifecycle (DRAINING -> DRAINED)
 * 10. Automatic task migration and requeue on worker failure
 * 11. Integration with ResourceGovernor (adaptive pressure management)
 * 12. Multi-worker concurrent dispatch and streaming inference
 */

import { EventBus } from '../core/events/event-bus.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import { CancellationToken } from '../inference/backend.types.js';
import { ResourceRegistry } from './resource.registry.js';
import { ResourcePolicyManager } from './resource.policy.js';
import {
  Worker,
  WorkerTask,
  PlacementCandidate,
  PlacementDecision,
} from './resource.types.js';

export interface DispatchHandler {
  execute(
    task: WorkerTask,
    worker: Worker,
    callbacks?: {
      onProgress?: (progress: number, message?: string, tokenChunk?: string) => void;
      cancellationToken?: CancellationToken;
    }
  ): Promise<{ success: boolean; workerId?: string; output?: Record<string, unknown>; error?: string }>;
}

export type IDispatchHandler = DispatchHandler;

interface QueuedTaskEntry {
  task: WorkerTask;
  options: {
    cancellationToken?: CancellationToken;
    onProgress?: (progress: number, message?: string, tokenChunk?: string) => void;
    waitForCapacity?: boolean;
    allowMigration?: boolean;
  };
  resolve: (result: { success: boolean; workerId?: string; output?: Record<string, unknown>; error?: string }) => void;
  reject: (err: any) => void;
  enqueuedAt: number;
}

export class ResourceScheduler {
  private readonly registry: ResourceRegistry;
  private readonly policyManager: ResourcePolicyManager;
  private readonly governor?: ResourceGovernor;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly dispatchHandlers: Map<string, DispatchHandler> = new Map();
  private readonly activeTasksByWorker: Map<string, Set<string>> = new Map();
  private readonly taskQueue: QueuedTaskEntry[] = [];
  private readonly inFlightByIdempotency: Map<string, Promise<{ success: boolean; workerId?: string; output?: Record<string, unknown>; error?: string }>> = new Map();
  private isProcessingQueue = false;

  constructor(
    registry: ResourceRegistry,
    policyManager: ResourcePolicyManager,
    governor?: ResourceGovernor,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.registry = registry;
    this.policyManager = policyManager;
    this.governor = governor;
    this.eventBus = eventBus;
    this.logger = logger?.child('ResourceScheduler');
  }

  public registerDispatchHandler(workerType: string, handler: DispatchHandler): void {
    this.dispatchHandlers.set(workerType, handler);
  }

  /**
   * Returns current active task count for a given worker.
   */
  public getActiveTasksCount(workerId: string): number {
    const memoryCount = this.activeTasksByWorker.get(workerId)?.size;
    if (memoryCount !== undefined) return memoryCount;
    return this.registry.getActiveTasksCount(workerId);
  }

  /**
   * Returns queue length of pending tasks awaiting capacity.
   */
  public getQueueLength(): number {
    return this.taskQueue.length;
  }

  /**
   * Returns copy of queued tasks.
   */
  public getQueuedTasks(): WorkerTask[] {
    return this.taskQueue.map(item => item.task);
  }

  /**
   * Evaluates all candidates and generates an explainable placement decision for a task.
   */
  public evaluatePlacement(task: WorkerTask): PlacementDecision {
    const allWorkers = this.registry.getAllWorkers();
    const candidateResults: PlacementCandidate[] = [];

    const govMetrics = this.governor?.getMetrics();
    const isCriticalMemory = govMetrics?.pressureLevel === 'CRITICAL_MEMORY';
    const isLowMemory = govMetrics?.pressureLevel === 'LOW_MEMORY';

    for (const worker of allWorkers) {
      const factors: Record<string, number> = {};
      let eligible = true;
      let rejectionReason: string | undefined;

      const activeCount = this.getActiveTasksCount(worker.id);
      const maxConcurrent = worker.resourceLimits?.maxConcurrentTasks ?? (worker.type === 'LOCAL' ? 2 : 2);
      const isSaturated = activeCount >= maxConcurrent;

      // 1. Worker Status Check
      if (worker.status !== 'ONLINE' && worker.status !== 'BUSY') {
        eligible = false;
        rejectionReason = `Worker status is '${worker.status}' (must be ONLINE or BUSY).`;
      }

      // 2. Trust Level Check
      if (eligible && (worker.trustLevel === 'BLOCKED' || worker.trustLevel === 'REVOKED')) {
        eligible = false;
        rejectionReason = `Worker trust level is '${worker.trustLevel}'.`;
      }

      // 3. Privacy Policy Enforcement
      if (eligible) {
        const privCheck = this.policyManager.evaluatePrivacy(task.privacyLevel, worker);
        if (!privCheck.allowed) {
          eligible = false;
          rejectionReason = privCheck.reason;
        }
      }

      // 4. Safe Workload Authorization
      if (eligible) {
        const authCheck = this.policyManager.authorizeWorkload(task.taskType, worker);
        if (!authCheck.authorized) {
          eligible = false;
          rejectionReason = authCheck.reason;
        }
      }

      // 5. Capability Matching
      if (eligible && task.requiredCapabilities.length > 0) {
        const workerCaps = new Set(
          worker.capabilities.filter(c => c.available).map(c => c.capabilityId.toLowerCase())
        );
        for (const reqCap of task.requiredCapabilities) {
          if (!workerCaps.has(reqCap.toLowerCase())) {
            eligible = false;
            rejectionReason = `Worker lacks required capability '${reqCap}'.`;
            break;
          }
        }
      }

      // 6. Hardware & Model Resource Requirements
      if (eligible && task.resourceRequirements) {
        const req = task.resourceRequirements;

        if (req.requireGpu) {
          const hasGpu = worker.gpu && worker.gpu.name && worker.gpu.name !== 'none';
          if (!hasGpu) {
            eligible = false;
            rejectionReason = `Task requires GPU compute, but worker has no GPU.`;
          } else if (req.gpuBackend && worker.gpuBackend && !worker.gpuBackend.toLowerCase().includes(req.gpuBackend.toLowerCase())) {
            eligible = false;
            rejectionReason = `Task requires GPU backend '${req.gpuBackend}', but worker offers '${worker.gpuBackend}'.`;
          }
        }

        if (eligible && req.minRamBytes && worker.memory.freeBytes < req.minRamBytes) {
          eligible = false;
          rejectionReason = `Insufficient free RAM (${(worker.memory.freeBytes / (1024 * 1024)).toFixed(0)}MB free, required ${(req.minRamBytes / (1024 * 1024)).toFixed(0)}MB).`;
        }

        if (eligible && req.requiredModel) {
          const reqModel = req.requiredModel.toLowerCase();
          const hasModel = worker.models.some(m => m.toLowerCase().includes(reqModel));
          if (!hasModel) {
            eligible = false;
            rejectionReason = `Worker does not have requested model '${req.requiredModel}' available.`;
          } else {
            // FP-05: Model Residency Awareness
            const residentList = worker.residentModels || (worker.metadata?.residentModels as string[]) || [];
            const isResident = residentList.some(m => m.toLowerCase().includes(reqModel));
            if (isResident) {
              const residencyBonus = 40;
              factors['model_residency'] = residencyBonus;
            }
          }
        }
      }

      // 7. FP-05: Worker Concurrency & Saturation Gate
      if (eligible && isSaturated) {
        eligible = false;
        rejectionReason = `Worker is saturated (${activeCount}/${maxConcurrent} active tasks).`;
      }

      // 8. Calculate Placement Score for eligible candidates
      let score = 0;
      if (eligible) {
        // Preference 1: Base worker priority
        score += worker.priority;
        factors['base_priority'] = worker.priority;

        // Preference 2: Local execution affinity (+40 bonus by default)
        if (worker.type === 'LOCAL') {
          let localBonus = 40;
          if (isCriticalMemory && task.privacyLevel !== 'SOVEREIGN_LOCAL' && task.privacyLevel !== 'HIGHLY_PRIVATE') {
            localBonus = -30; // Offload to LAN worker under critical memory pressure
          } else if (isLowMemory) {
            localBonus = 10;
          }
          score += localBonus;
          factors['local_affinity'] = localBonus;
        } else if (worker.type === 'LAN') {
          score += 25;
          factors['lan_affinity'] = 25;
        }

        // Preference 3: GPU Acceleration Bonus
        if (task.resourceRequirements?.requireGpu && worker.gpu && worker.gpu.name) {
          const gpuBonus = 35;
          score += gpuBonus;
          factors['gpu_acceleration'] = gpuBonus;
        }

        // Preference 4: Preferred worker direct bonus
        if (task.preferredWorkerId === worker.id) {
          score += 50;
          factors['preferred_worker'] = 50;
        }

        // Preference 5: Available Memory Headroom
        const freeGb = worker.memory.freeBytes / (1024 * 1024 * 1024);
        const ramBonus = Math.min(20, Math.round(freeGb * 2));
        score += ramBonus;
        factors['memory_headroom'] = ramBonus;

        // Preference 6: Load Score Penalty (0 - 100 load -> subtract up to 30 points)
        const loadPenalty = Math.round((worker.loadScore / 100) * 30);
        score -= loadPenalty;
        factors['load_penalty'] = -loadPenalty;

        // Preference 7: Active Tasks Load Balancing Penalty (FP-05)
        const activeTaskPenalty = activeCount * 15;
        score -= activeTaskPenalty;
        factors['active_tasks_penalty'] = -activeTaskPenalty;

        // Preference 8: Model Residency Bonus (from requirement 6 above)
        if (factors['model_residency']) {
          score += factors['model_residency'];
        }
      }

      candidateResults.push({
        worker,
        eligible,
        rejectionReason,
        score,
        factors,
        isSaturated,
        activeTasks: activeCount,
        maxConcurrentTasks: maxConcurrent,
      });
    }

    // Rank eligible candidates descending by score (with tie-breaking by lowest active tasks)
    const eligibleCandidates = candidateResults
      .filter(c => c.eligible)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.activeTasks || 0) - (b.activeTasks || 0);
      });

    const allEligibleSaturated =
      eligibleCandidates.length === 0 &&
      candidateResults.some(
        c =>
          c.isSaturated &&
          c.rejectionReason?.includes('saturated') &&
          (c.worker.status === 'ONLINE' || c.worker.status === 'BUSY')
      );

    if (eligibleCandidates.length === 0) {
      const topRejection = candidateResults[0]?.rejectionReason || 'No registered workers match requirements.';
      return {
        taskId: task.id,
        selectedWorkerId: '',
        selectedWorkerName: 'NONE',
        score: -1,
        reason: `Placement failed: ${topRejection}`,
        candidates: candidateResults,
        allEligibleSaturated,
        timestamp: new Date().toISOString(),
      };
    }

    const winner = eligibleCandidates[0];
    const reasonParts = [
      `Selected worker '${winner.worker.name}' (${winner.worker.type}) with score ${winner.score}.`,
      `Required capabilities: [${task.requiredCapabilities.join(', ') || 'none'}].`,
      `Privacy level: ${task.privacyLevel}.`,
      `Active tasks: ${winner.activeTasks}/${winner.maxConcurrentTasks}.`,
      `Worker RAM: ${(winner.worker.memory.freeBytes / (1024 * 1024 * 1024)).toFixed(1)}GB free.`,
      `Load score: ${winner.worker.loadScore}.`,
    ];

    return {
      taskId: task.id,
      selectedWorkerId: winner.worker.id,
      selectedWorkerName: winner.worker.name,
      score: winner.score,
      reason: reasonParts.join(' '),
      candidates: candidateResults,
      allEligibleSaturated: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Places a task and executes it on the chosen worker.
   * If workers are saturated, queues the task and resolves when capacity becomes available.
   */
  public async scheduleAndDispatch(
    task: WorkerTask,
    options: {
      cancellationToken?: CancellationToken;
      onProgress?: (progress: number, message?: string, tokenChunk?: string) => void;
      waitForCapacity?: boolean;
      allowMigration?: boolean;
    } = {}
  ): Promise<{ success: boolean; workerId?: string; output?: Record<string, unknown>; error?: string }> {
    // 1. Idempotency Check
    if (task.idempotencyKey) {
      const inFlight = this.inFlightByIdempotency.get(task.idempotencyKey);
      if (inFlight) {
        this.logger?.info(`Task with idempotency key '${task.idempotencyKey}' currently in-flight. Reusing execution promise.`);
        return inFlight;
      }

      const existing = this.registry.findTaskByIdempotency(task.idempotencyKey);
      if (existing && existing.status === 'COMPLETED') {
        this.logger?.info(`Task with idempotency key '${task.idempotencyKey}' already completed. Reusing result.`);
        return {
          success: true,
          workerId: existing.assignedWorkerId,
          output: existing.outputPayload,
          error: existing.errorMessage,
        };
      }

      const executionPromise = this.executeDispatch(task, options);
      this.inFlightByIdempotency.set(task.idempotencyKey, executionPromise);
      try {
        return await executionPromise;
      } finally {
        this.inFlightByIdempotency.delete(task.idempotencyKey);
      }
    }

    return this.executeDispatch(task, options);
  }

  private async executeDispatch(
    task: WorkerTask,
    options: {
      cancellationToken?: CancellationToken;
      onProgress?: (progress: number, message?: string, tokenChunk?: string) => void;
      waitForCapacity?: boolean;
      allowMigration?: boolean;
    } = {}
  ): Promise<{ success: boolean; workerId?: string; output?: Record<string, unknown>; error?: string }> {
    // 2. Evaluate Placement
    const decision = this.evaluatePlacement(task);
    if (!decision.selectedWorkerId) {
      // Saturation handling: enqueue if all eligible workers are busy
      if (decision.allEligibleSaturated && options.waitForCapacity !== false) {
        this.logger?.info(`All eligible workers saturated for task '${task.id}'. Enqueuing in priority task queue.`);
        return new Promise((resolve, reject) => {
          task.status = 'QUEUED';
          task.placementReason = decision.reason;
          this.registry.saveTask(task);
          this.eventBus?.emit('task.queued', { taskId: task.id, taskType: task.taskType, priority: task.priority });

          this.taskQueue.push({
            task,
            options,
            resolve,
            reject,
            enqueuedAt: Date.now(),
          });
        });
      }

      task.status = 'BLOCKED';
      task.errorMessage = decision.reason;
      task.placementReason = decision.reason;
      this.registry.saveTask(task);
      this.eventBus?.emit('task.failed', { taskId: task.id, reason: decision.reason });
      return { success: false, error: decision.reason };
    }

    const worker = this.registry.getWorker(decision.selectedWorkerId);
    if (!worker) {
      return { success: false, error: `Selected worker '${decision.selectedWorkerId}' not found in registry.` };
    }

    task.assignedWorkerId = worker.id;
    task.placementReason = decision.reason;
    task.status = 'PLACED';
    this.registry.saveTask(task);
    this.eventBus?.emit('task.placed', { taskId: task.id, workerId: worker.id, reason: decision.reason });

    // 3. Dispatch to worker handler
    const handler = this.dispatchHandlers.get(worker.type) || this.dispatchHandlers.get('DEFAULT');
    if (!handler) {
      const err = `No dispatch handler registered for worker type '${worker.type}'.`;
      task.status = 'FAILED';
      task.errorMessage = err;
      this.registry.saveTask(task);
      return { success: false, workerId: worker.id, error: err };
    }

    task.status = 'DISPATCHING';
    task.startedAt = new Date().toISOString();
    this.registry.saveTask(task);
    this.eventBus?.emit('task.dispatched', { taskId: task.id, workerId: worker.id });

    // Track active task for worker
    let workerTasks = this.activeTasksByWorker.get(worker.id);
    if (!workerTasks) {
      workerTasks = new Set();
      this.activeTasksByWorker.set(worker.id, workerTasks);
    }
    workerTasks.add(task.id);

    const maxConcurrent = worker.resourceLimits?.maxConcurrentTasks ?? (worker.type === 'LOCAL' ? 2 : 2);
    worker.status = workerTasks.size >= maxConcurrent ? 'BUSY' : 'ONLINE';
    this.registry.recordHeartbeat(worker.id);

    try {
      task.status = 'RUNNING';
      this.registry.saveTask(task);
      this.eventBus?.emit('task.started', { taskId: task.id, workerId: worker.id });

      const result = await handler.execute(task, worker, {
        onProgress: (p, msg, tokenChunk) => {
          task.progress = p;
          this.registry.saveTask(task);
          this.eventBus?.emit('task.progress', { taskId: task.id, progress: p, message: msg, tokenChunk });
          if (options.onProgress) options.onProgress(p, msg, tokenChunk);
        },
        cancellationToken: options.cancellationToken,
      });

      if (options.cancellationToken?.isCancelled) {
        task.status = 'CANCELLED';
        task.errorMessage = options.cancellationToken.reason || 'Task cancelled by user.';
        this.registry.saveTask(task);
        this.eventBus?.emit('task.cancelled', { taskId: task.id, workerId: worker.id });
        return { success: false, workerId: worker.id, error: task.errorMessage };
      }

      if (result.success) {
        task.status = 'COMPLETED';
        task.progress = 1.0;
        task.outputPayload = result.output;
        task.completedAt = new Date().toISOString();
        this.registry.saveTask(task);
        this.eventBus?.emit('task.completed', { taskId: task.id, workerId: worker.id });
        return { success: true, workerId: worker.id, output: result.output };
      } else {
        // Automatic Task Migration on worker disconnection/network drop when requested
        if (
          options.allowMigration === true &&
          task.attempt < 3 &&
          (result.error?.includes('disconnected') || result.error?.includes('Socket') || result.error?.includes('offline'))
        ) {
          this.logger?.info(`Worker '${worker.id}' failed with network error. Attempting task migration for '${task.id}'...`);
          task.attempt += 1;
          task.assignedWorkerId = undefined;
          task.status = 'REQUEUED';
          this.registry.saveTask(task);
          this.eventBus?.emit('task.requeued', { taskId: task.id, previousWorkerId: worker.id });
          return this.scheduleAndDispatch(task, { ...options, allowMigration: false });
        }

        task.status = 'FAILED';
        task.errorMessage = result.error || 'Execution failed on worker.';
        task.completedAt = new Date().toISOString();
        this.registry.saveTask(task);
        this.eventBus?.emit('task.failed', { taskId: task.id, workerId: worker.id, error: task.errorMessage });
        return { success: false, workerId: worker.id, error: task.errorMessage };
      }
    } catch (err: any) {
      task.status = 'FAILED';
      task.errorMessage = err.message || String(err);
      task.completedAt = new Date().toISOString();
      this.registry.saveTask(task);
      this.eventBus?.emit('task.failed', { taskId: task.id, workerId: worker.id, error: task.errorMessage });
      return { success: false, workerId: worker.id, error: task.errorMessage };
    } finally {
      this.activeTasksByWorker.get(worker.id)?.delete(task.id);
      const currentActive = this.getActiveTasksCount(worker.id);
      const currentWorker = this.registry.getWorker(worker.id);

      if (currentWorker) {
        if (currentWorker.status === 'DRAINING' && currentActive === 0) {
          this.registry.markWorkerDrained(worker.id);
          this.logger?.info(`Worker '${currentWorker.name}' (${worker.id}) finished all active tasks and is now DRAINED.`);
        } else if (
          currentWorker.status !== 'OFFLINE' &&
          currentWorker.status !== 'REVOKED' &&
          currentWorker.status !== 'DRAINING' &&
          currentWorker.status !== 'DRAINED'
        ) {
          const maxConc = currentWorker.resourceLimits?.maxConcurrentTasks ?? (currentWorker.type === 'LOCAL' ? 2 : 2);
          currentWorker.status = currentActive >= maxConc ? 'BUSY' : 'ONLINE';
          this.registry.recordHeartbeat(worker.id);
        }
      }

      // Process pending queued tasks when capacity becomes free
      this.processQueue();
    }
  }

  /**
   * Pumps the task queue, scheduling pending tasks according to priority with aging bonus.
   */
  public processQueue(): void {
    if (this.isProcessingQueue || this.taskQueue.length === 0) return;
    this.isProcessingQueue = true;

    try {
      // Calculate effective priority with aging bonus (+1 point per 5 seconds of wait time)
      const now = Date.now();
      this.taskQueue.sort((a, b) => {
        const aEffective = a.task.priority + Math.floor((now - a.enqueuedAt) / 5000);
        const bEffective = b.task.priority + Math.floor((now - b.enqueuedAt) / 5000);
        return bEffective - aEffective;
      });

      for (let i = 0; i < this.taskQueue.length; i++) {
        const item = this.taskQueue[i];
        const decision = this.evaluatePlacement(item.task);

        if (decision.selectedWorkerId) {
          this.taskQueue.splice(i, 1);
          i--;
          this.scheduleAndDispatch(item.task, item.options)
            .then(item.resolve)
            .catch(item.reject);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Cancels a running or queued task.
   */
  public cancelTask(taskId: string, reason = 'Cancelled by user'): boolean {
    // 1. Check if task is waiting in the priority queue
    const queueIdx = this.taskQueue.findIndex(item => item.task.id === taskId);
    if (queueIdx !== -1) {
      const [item] = this.taskQueue.splice(queueIdx, 1);
      item.task.status = 'CANCELLED';
      item.task.errorMessage = reason;
      item.task.completedAt = new Date().toISOString();
      this.registry.saveTask(item.task);
      this.eventBus?.emit('task.cancelled', { taskId, reason });
      item.resolve({ success: false, error: reason });
      return true;
    }

    // 2. Check registry for placed or running task
    const task = this.registry.getTask(taskId);
    if (!task) return false;

    if (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') {
      return false; // Already finished
    }

    task.status = 'CANCELLED';
    task.errorMessage = reason;
    task.completedAt = new Date().toISOString();
    this.registry.saveTask(task);

    this.eventBus?.emit('task.cancelled', { taskId, reason });
    return true;
  }
}
