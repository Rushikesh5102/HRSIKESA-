/**
 * HṚṢĪKEŚA (हृषीकेश) — Advanced Computer Operator Orchestrator
 *
 * Phase 22: Master operator coordinating perception, planning, execution, verification,
 * recovery, safety policy enforcement, and audit telemetry.
 */

import crypto from 'node:crypto';
import { ILogger } from '../../../core/logging/logger.types.js';
import { EventBus } from '../../../core/events/event-bus.js';
import { ResourceGovernor } from '../../../core/hardware/resource.governor.js';
import {
  ComputerTask,
  ComputerTaskStatus,
  ActionResult,
  DesktopObservation,
  ComputerScope,
} from '../interfaces/operator.types.js';
import { ComputerOperatorRepository } from '../repositories/computer-operator.repository.js';
import { ComputerObservationEngine } from './observation.engine.js';
import { ComputerWindowManager } from './window.manager.js';
import { ComputerTargetResolver } from './target.resolver.js';
import { ComputerActionPlanner } from './action.planner.js';
import { ComputerActionExecutor } from './action.executor.js';
import { ComputerVerificationEngine } from './verification.engine.js';
import { ComputerRecoveryEngine } from './recovery.engine.js';
import { ComputerSafetyPolicy } from './safety.policy.js';
import { KnowledgeEntityRepository } from '../../../knowledge/repositories/knowledge-entity.repository.js';

export interface ExecuteTaskOptions {
  readonly maxActions?: number;
  readonly scope?: ComputerScope;
  readonly agentId?: string;
  readonly missionId?: string;
  readonly goalId?: string;
}

export class ComputerOperator {
  public readonly observationEngine: ComputerObservationEngine;
  public readonly windowManager: ComputerWindowManager;
  public readonly targetResolver: ComputerTargetResolver;
  public readonly actionPlanner: ComputerActionPlanner;
  public readonly actionExecutor: ComputerActionExecutor;
  public readonly verificationEngine: ComputerVerificationEngine;
  public readonly recoveryEngine: ComputerRecoveryEngine;
  public readonly safetyPolicy: ComputerSafetyPolicy;
  public readonly repository: ComputerOperatorRepository;

  private readonly eventBus?: EventBus;
  private readonly resourceGovernor?: ResourceGovernor;
  private readonly entityRepo?: KnowledgeEntityRepository;
  private readonly logger?: ILogger;
  private isPaused = false;

  constructor(
    observationEngine: ComputerObservationEngine,
    windowManager: ComputerWindowManager,
    targetResolver: ComputerTargetResolver,
    actionPlanner: ComputerActionPlanner,
    actionExecutor: ComputerActionExecutor,
    verificationEngine: ComputerVerificationEngine,
    recoveryEngine: ComputerRecoveryEngine,
    safetyPolicy: ComputerSafetyPolicy,
    repository: ComputerOperatorRepository,
    eventBus?: EventBus,
    resourceGovernor?: ResourceGovernor,
    entityRepo?: KnowledgeEntityRepository,
    logger?: ILogger
  ) {
    this.observationEngine = observationEngine;
    this.windowManager = windowManager;
    this.targetResolver = targetResolver;
    this.actionPlanner = actionPlanner;
    this.actionExecutor = actionExecutor;
    this.verificationEngine = verificationEngine;
    this.recoveryEngine = recoveryEngine;
    this.safetyPolicy = safetyPolicy;
    this.repository = repository;
    this.eventBus = eventBus;
    this.resourceGovernor = resourceGovernor;
    this.entityRepo = entityRepo;
    this.logger = logger?.child('ComputerOperator');
  }

  /**
   * Executes a high-level computer task end-to-end.
   */
  public async executeTask(
    intent: string,
    objective: string,
    options: ExecuteTaskOptions = {}
  ): Promise<{ task: ComputerTask; results: ActionResult[] }> {
    this.logger?.info(`Starting computer operator task: '${objective}'`);
    this.actionPlanner.clearHistory();

    // Check Resource Governor
    if (this.resourceGovernor && this.resourceGovernor.getMetrics().pressureLevel === 'CRITICAL_MEMORY') {
      throw new Error('Computer task execution blocked: Host is under CRITICAL_MEMORY pressure.');
    }

    // 1. Create Task in SQLite
    let task = this.repository.createTask({
      intent,
      objective,
      scope: options.scope || 'DESKTOP',
      status: 'RUNNING',
      maxActions: options.maxActions || 25,
      agentId: options.agentId || 'Gāṇḍīva',
      missionId: options.missionId,
      goalId: options.goalId,
    });

    const results: ActionResult[] = [];
    let executedCount = 0;
    let retriesCount = 0;

    try {
      // 2. Initial Observation
      let observation = await this.observationEngine.observeDesktop({ taskId: task.id });
      this.repository.recordObservation(observation, task.id);
      this.eventBus?.emit('computer.observation', {
        taskId: task.id,
        activeWindow: observation.activeWindow?.title,
        nodeCount: observation.nodeCount,
        timestamp: observation.timestamp,
      });

      // 3. Plan Actions
      const plan = this.actionPlanner.planActions(task, observation);
      this.eventBus?.emit('computer.action.planned', {
        taskId: task.id,
        actionCount: plan.actions.length,
        intent: task.intent,
      });

      // 4. Execution Loop
      for (let i = 0; i < plan.actions.length; i++) {
        if (this.isPaused) {
          this.repository.updateTask(task.id, { status: 'PAUSED' });
          this.eventBus?.emit('computer.task.paused', { taskId: task.id, reason: 'Operator paused execution' });
          break;
        }

        let action = plan.actions[i];

        // 4a. Safety & Approval Evaluation
        const safety = this.safetyPolicy.evaluateAction(action, task.scope);
        if (safety.pauseReason) {
          task = this.repository.updateTask(task.id, {
            status: 'NEEDS_USER',
            errorMessage: safety.reason,
          })!;
          this.eventBus?.emit('computer.task.paused', { taskId: task.id, reason: safety.reason || 'User interaction required' });
          break;
        }

        if (safety.requiresApproval) {
          task = this.repository.updateTask(task.id, {
            status: 'PENDING_APPROVAL',
            requiresApproval: true,
            approvalId: crypto.randomUUID(),
            errorMessage: safety.reason,
          })!;
          this.eventBus?.emit('computer.approval_required', {
            taskId: task.id,
            actionId: action.id,
            reason: safety.reason || 'Approval required',
            riskTier: safety.riskTier,
          });
          break;
        }

        // 4b. Execute Action
        this.eventBus?.emit('computer.action.started', {
          taskId: task.id,
          actionId: action.id,
          actionType: action.type,
          target: typeof action.target === 'object' && 'query' in action.target ? action.target.query : (action.target as any)?.name,
        });

        let result = await this.actionExecutor.executeAction(action, observation);
        executedCount++;

        // 4c. Recovery Handling if Failed
        if (!result.success) {
          retriesCount++;
          const recovery = await this.recoveryEngine.recover(action, result, retriesCount);
          this.eventBus?.emit('computer.recovery', {
            taskId: task.id,
            failure: recovery.attempt.failure,
            strategy: recovery.attempt.strategy,
            success: recovery.recovered,
          });

          if (recovery.recovered && recovery.replannedAction) {
            action = recovery.replannedAction;
            result = await this.actionExecutor.executeAction(action, observation);
          }
        }

        // 4d. Record History
        results.push(result);
        this.repository.recordAction(task.id, i + 1, action, result, safety.riskTier);

        if (result.success) {
          this.eventBus?.emit('computer.action.completed', {
            taskId: task.id,
            actionId: action.id,
            actionType: action.type,
            durationMs: result.durationMs,
          });
        } else {
          this.eventBus?.emit('computer.action.failed', {
            taskId: task.id,
            actionId: action.id,
            error: result.error || 'Action failed',
            classification: result.failureClassification,
          });
          // Non-recoverable failure halts task
          task = this.repository.updateTask(task.id, {
            status: 'FAILED',
            errorMessage: result.error,
          })!;
          break;
        }

        // 4e. Refresh Observation for next step
        observation = await this.observationEngine.observeDesktop({ taskId: task.id, captureScreenshot: false });
        this.repository.recordObservation(observation, task.id);

        // 4f. Loop Detection
        if (this.actionPlanner.detectLoop(observation.domHash)) {
          this.logger?.warn(`Task ${task.id} halted: UI state loop detected.`);
          task = this.repository.updateTask(task.id, {
            status: 'FAILED',
            errorMessage: 'Execution aborted: Infinite UI state loop detected.',
          })!;
          break;
        }
      }

      // 5. Finalize Task Status
      const finalStatus: ComputerTaskStatus = task.status === 'RUNNING' ? 'COMPLETED' : task.status;
      task = this.repository.updateTask(task.id, {
        status: finalStatus,
        actionsExecuted: executedCount,
        retriesCount,
        completedAt: finalStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
      })!;

      // Sync application entity to Knowledge Graph
      if (task.targetApplication && this.entityRepo) {
        this.syncKnowledgeGraph(task.targetApplication);
      }

      return { task, results };
    } catch (err: any) {
      this.logger?.error(`Computer task execution error: ${err.message}`);
      task = this.repository.updateTask(task.id, {
        status: 'FAILED',
        errorMessage: err.message,
      })!;
      return { task, results };
    }
  }

  public pauseTask(taskId: string): ComputerTask | null {
    this.isPaused = true;
    return this.repository.updateTask(taskId, { status: 'PAUSED' });
  }

  public resumeTask(taskId: string): ComputerTask | null {
    this.isPaused = false;
    this.eventBus?.emit('computer.task.resumed', { taskId });
    return this.repository.updateTask(taskId, { status: 'RUNNING' });
  }

  public approveTask(taskId: string): ComputerTask | null {
    const task = this.repository.findTaskById(taskId);
    if (!task) return null;
    return this.repository.updateTask(taskId, {
      status: 'RUNNING',
      requiresApproval: false,
    });
  }

  public async observeDesktop(options?: any): Promise<DesktopObservation> {
    const obs = await this.observationEngine.observeDesktop(options);
    this.eventBus?.emit('computer.observation', {
      type: 'computer.observation',
      taskId: options?.taskId,
      activeWindow: obs.activeWindow?.title,
      nodeCount: obs.nodeCount,
      timestamp: obs.timestamp,
    } as any);
    return obs;
  }

  private syncKnowledgeGraph(appName: string): void {
    try {
      let entity = this.entityRepo?.findByCanonicalName(appName);
      if (!entity && this.entityRepo) {
        this.entityRepo.createEntity({
          canonicalName: appName.toLowerCase(),
          displayName: appName,
          entityType: 'TOOL' as any,
          scope: 'GLOBAL' as any,
          description: `Desktop application operated by HṚṢĪKEŚA Computer Operator`,
        });
      }
    } catch (e: any) {
      this.logger?.debug(`Knowledge Graph sync note: ${e.message}`);
    }
  }
}
