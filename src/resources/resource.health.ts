/**
 * HṚṢĪKEŚA (हृषीकेश) — Worker Health & Heartbeat Monitor
 *
 * FP-03: Foundation Performance & Execution Block
 * Distributed Local/LAN Resource Fabric & Execution Capacity
 *
 * Automatically detects stale, disconnected, or degraded workers, and triggers
 * task recovery or requeueing.
 */

import { EventBus } from '../core/events/event-bus.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ResourceRegistry } from './resource.registry.js';
import { WorkerStatus } from './resource.types.js';

export interface HealthCheckOptions {
  readonly heartbeatTimeoutMs?: number; // Time before marking OFFLINE (default: 30,000ms)
  readonly degradationThresholdMs?: number; // Time before marking DEGRADED (default: 15,000ms)
  readonly checkIntervalMs?: number; // How often the health sweep runs (default: 5,000ms)
}

export class ResourceHealthTracker {
  private readonly registry: ResourceRegistry;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly heartbeatTimeoutMs: number;
  private readonly degradationThresholdMs: number;
  private readonly checkIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private onWorkerFailureCallback?: (workerId: string, failedTasksCount: number) => Promise<void>;

  constructor(
    registry: ResourceRegistry,
    options: HealthCheckOptions = {},
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.logger = logger?.child('ResourceHealthTracker');
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 30000;
    this.degradationThresholdMs = options.degradationThresholdMs ?? 15000;
    this.checkIntervalMs = options.checkIntervalMs ?? 5000;
  }

  public setOnWorkerFailure(callback: (workerId: string, failedTasksCount: number) => Promise<void>): void {
    this.onWorkerFailureCallback = callback;
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.checkAllWorkersHealth().catch(err => {
        this.logger?.error(`Error during worker health check: ${err.message}`);
      });
    }, this.checkIntervalMs);
    this.timer.unref(); // Ensure process does not hang on exit
    this.logger?.info(`Resource health tracker started (sweep interval: ${this.checkIntervalMs}ms).`);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Sweeps all workers and evaluates heartbeat freshness.
   */
  public async checkAllWorkersHealth(): Promise<void> {
    const now = Date.now();
    const workers = this.registry.getAllWorkers();

    for (const worker of workers) {
      // Local worker heartbeat is self-managed; do not mark local offline
      if (worker.type === 'LOCAL') {
        continue;
      }

      // Do not transition permanently revoked or draining workers
      if (worker.status === 'REVOKED' || worker.status === 'DRAINING') {
        continue;
      }

      const lastHeartbeatTime = new Date(worker.lastHeartbeat).getTime();
      const elapsedMs = now - lastHeartbeatTime;

      let newStatus: WorkerStatus | null = null;

      if (elapsedMs > this.heartbeatTimeoutMs) {
        if (worker.status !== 'OFFLINE' && worker.status !== 'UNHEALTHY') {
          newStatus = 'OFFLINE';
        }
      } else if (elapsedMs > this.degradationThresholdMs) {
        if (worker.status === 'ONLINE' || worker.status === 'BUSY') {
          newStatus = 'DEGRADED';
        }
      }

      if (newStatus && newStatus !== worker.status) {
        this.logger?.warn(
          `Worker '${worker.name}' (${worker.id}) heartbeat missed (${(elapsedMs / 1000).toFixed(1)}s elapsed). Status -> ${newStatus}`
        );
        this.registry.updateWorkerStatus(worker.id, newStatus);

        if (newStatus === 'OFFLINE') {
          await this.handleWorkerFailure(worker.id);
        }
      }
    }
  }

  /**
   * Responds to worker failure by checking running tasks and triggering recovery/requeue.
   */
  public async handleWorkerFailure(workerId: string): Promise<void> {
    const runningTasks = this.registry.getTasksByWorker(workerId).filter(t => t.status === 'RUNNING' || t.status === 'DISPATCHING');

    for (const task of runningTasks) {
      this.logger?.warn(`Task '${task.id}' failed due to worker failure on '${workerId}'. Requeueing...`);
      task.status = 'REQUEUED';
      task.assignedWorkerId = undefined;
      task.attempt += 1;
      task.errorMessage = `Worker '${workerId}' disconnected or failed heartbeat during execution.`;
      this.registry.saveTask(task);
      this.eventBus?.emit('task.requeued', { taskId: task.id, previousWorkerId: workerId });
    }

    if (this.onWorkerFailureCallback) {
      await this.onWorkerFailureCallback(workerId, runningTasks.length);
    }
  }
}
