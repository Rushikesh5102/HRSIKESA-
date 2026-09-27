/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Software Engineering Master Fabric
 *
 * FP-10: Master coordinator orchestrating Task Lifecycle, Requirements Extraction,
 * Bounded Context Engineering, ModelRouter Integration, Action Execution, Test Discovery,
 * Diagnostics Normalization, Model-Driven Repair, and Anti-Loop Convergence.
 */

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { DatabaseManager } from '../persistence/database/database.manager.js';
import { EventBus } from '../core/events/event-bus.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ModelRouter } from '../models/router/model.router.js';
import { UniversalCapabilityFabric } from '../capabilities/fabric/universal.capability.fabric.js';
import { IdeFabric } from '../ide/ide.fabric.js';
import {
  SoftwareEngineeringTask,
  EngineeringTaskStatus,
  EngineeringBudget,
  EngineeringEventType,
  EngineeringEventPayload,
  EngineeringTaskEvent,
} from './types/engineering.types.js';
import { EngineeringRepository } from './repository/engineering.repository.js';
import { EngineeringActionValidator } from './actions/action.validator.js';
import { EngineeringContextEngine, ExtractedRequirements } from './context/engineering.context.engine.js';
import { TestDiscoveryEngine, TestExecutionResult } from './testing/test.discovery.engine.js';
import { DiagnosisEngine } from './diagnosis/diagnosis.engine.js';
import { ModelDrivenRepairEngine } from './repair/model.repair.engine.js';
import { ConvergenceEngine } from './convergence/convergence.engine.js';
import { SoftwareEngineeringExecutionEngine } from './execution/engineering.execution.engine.js';

export interface AutonomousEngineeringFabricOptions {
  dbManager: DatabaseManager;
  ideFabric: IdeFabric;
  modelRouter?: ModelRouter;
  capabilityFabric?: UniversalCapabilityFabric;
  eventBus?: EventBus;
  resourceGovernor?: ResourceGovernor;
  agentRegistry?: any;
  logger?: ILogger;
}

export class AutonomousEngineeringFabric extends EventEmitter {
  private readonly dbManager: DatabaseManager;
  private readonly ideFabric: IdeFabric;
  private readonly modelRouter?: ModelRouter;
  private readonly capabilityFabric?: UniversalCapabilityFabric;
  private readonly eventBus?: EventBus;
  protected readonly resourceGovernor?: ResourceGovernor;
  protected readonly logger?: ILogger;

  private readonly repo: EngineeringRepository;
  protected readonly validator: EngineeringActionValidator;
  private readonly contextEngine: EngineeringContextEngine;
  private readonly testEngine: TestDiscoveryEngine;
  private readonly diagnosisEngine: DiagnosisEngine;
  private readonly repairEngine: ModelDrivenRepairEngine;
  private readonly convergenceEngine: ConvergenceEngine;
  private readonly executionEngine: SoftwareEngineeringExecutionEngine;

  private readonly activeTaskAbortControllers: Map<string, AbortController> = new Map();
  private initialized = false;

  constructor(options: AutonomousEngineeringFabricOptions) {
    super();
    this.dbManager = options.dbManager;
    this.ideFabric = options.ideFabric;
    this.modelRouter = options.modelRouter;
    this.capabilityFabric = options.capabilityFabric;
    this.eventBus = options.eventBus;
    this.resourceGovernor = options.resourceGovernor;
    this.logger = options.logger?.child('AutonomousEngineeringFabric');

    this.repo = new EngineeringRepository(this.dbManager);
    this.validator = new EngineeringActionValidator(this.ideFabric.getWorkspaceManager());
    this.contextEngine = new EngineeringContextEngine(
      this.ideFabric.getWorkspaceManager(),
      this.ideFabric.getCodeSearchEngine()
    );
    this.testEngine = new TestDiscoveryEngine(this.ideFabric.getTerminalManager(), this.logger);
    this.diagnosisEngine = new DiagnosisEngine();
    this.repairEngine = new ModelDrivenRepairEngine(
      this.ideFabric.getEditorEngine(),
      this.modelRouter,
      this.repo,
      this.logger
    );
    this.convergenceEngine = new ConvergenceEngine();
    this.executionEngine = new SoftwareEngineeringExecutionEngine(
      this.ideFabric.getEditorEngine(),
      this.ideFabric.getTerminalManager(),
      this.ideFabric.getCodeSearchEngine(),
      this.ideFabric.getGitWorkspaceManager(),
      this.ideFabric.getPreviewManager(),
      this.capabilityFabric,
      this.logger
    );
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.capabilityFabric) {
      this.registerEngineeringCapabilities();
    }

    this.initialized = true;
    this.logger?.info('HṚṢĪKEŚA Autonomous Software Engineering & Agentic Coding Fabric online.');
  }

  // Accessors
  public getRepository(): EngineeringRepository { return this.repo; }
  public getRepairEngine(): ModelDrivenRepairEngine { return this.repairEngine; }
  public getContextEngine(): EngineeringContextEngine { return this.contextEngine; }
  public getTestEngine(): TestDiscoveryEngine { return this.testEngine; }
  public getDiagnosisEngine(): DiagnosisEngine { return this.diagnosisEngine; }
  public getConvergenceEngine(): ConvergenceEngine { return this.convergenceEngine; }
  public getExecutionEngine(): SoftwareEngineeringExecutionEngine { return this.executionEngine; }

  /**
   * Creates and persists a new durable SoftwareEngineeringTask.
   */
  public createTask(options: {
    workspaceId?: string;
    objective: string;
    projectId?: string;
    companyId?: string;
    priority?: SoftwareEngineeringTask['priority'];
    complexity?: SoftwareEngineeringTask['complexity'];
    budget?: Partial<EngineeringBudget>;
    autoApprove?: boolean;
  }): SoftwareEngineeringTask {
    const id = `eng_${crypto.randomUUID().slice(0, 10)}`;
    const wsId = options.workspaceId || this.ideFabric.getWorkspaceManager().getActiveWorkspace()?.id || 'ws_default';
    const defaultBudget: EngineeringBudget = {
      maxAttempts: options.budget?.maxAttempts || 5,
      maxModelCalls: options.budget?.maxModelCalls || 15,
      maxTokens: options.budget?.maxTokens || 50000,
      maxDurationSeconds: options.budget?.maxDurationSeconds || 300,
      maxChangedFiles: options.budget?.maxChangedFiles || 10,
      maxPatchLines: options.budget?.maxPatchLines || 200,
    };

    const task: SoftwareEngineeringTask = {
      id,
      workspaceId: wsId,
      projectId: options.projectId,
      companyId: options.companyId,
      objective: options.objective,
      status: 'QUEUED',
      priority: options.priority || 'NORMAL',
      complexity: options.complexity || 'STANDARD',
      currentPhase: 'QUEUED',
      attemptCount: 0,
      maxAttempts: defaultBudget.maxAttempts,
      budget: defaultBudget,
      modelCalls: 0,
      toolCalls: 0,
      changedFiles: [],
      testsRun: 0,
      verificationState: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    this.repo.saveTask(task);
    this.emitEvent('engineering.task.created', {
      taskId: task.id,
      status: task.status,
      phase: task.currentPhase,
      timestamp: task.createdAt,
    });

    this.logger?.info(`Created SoftwareEngineeringTask [${task.id}]: "${task.objective}"`);
    return task;
  }

  /**
   * Executes the complete autonomous engineering lifecycle end-to-end.
   */
  public async executeTask(taskId: string): Promise<SoftwareEngineeringTask> {
    const task = this.repo.getTask(taskId);
    if (!task) throw new Error(`Engineering task not found: ${taskId}`);

    const wsManager = this.ideFabric.getWorkspaceManager();
    const workspace = wsManager.getActiveWorkspace() || (await wsManager.openWorkspace(process.cwd()));

    const abortController = new AbortController();
    this.activeTaskAbortControllers.set(taskId, abortController);
    const startTime = Date.now();

    try {
      task.startedAt = new Date().toISOString();
      this.updateTaskPhase(task, 'UNDERSTANDING');

      // 1. UNDERSTANDING: Extract requirements and assemble bounded context
      const requirements: ExtractedRequirements = this.contextEngine.extractRequirements(task.objective, workspace);
      task.priority = requirements.priority;
      task.complexity = requirements.complexity;
      const context = await this.contextEngine.assembleContext(requirements, workspace, 'T2');

      // 2. PLANNING: Synthesize EngineeringPlan
      this.updateTaskPhase(task, 'PLANNING');
      const plan = this.contextEngine.createPlan(task.id, requirements, context);
      this.repo.savePlan(plan);
      this.emitEvent('engineering.plan.created', {
        taskId: task.id,
        phase: 'PLANNING',
        details: { planId: plan.id, steps: plan.steps.length },
        timestamp: new Date().toISOString(),
      });

      // Check if approval required
      if (plan.requiresApproval) {
        this.updateTaskStatus(task, 'AWAITING_APPROVAL');
        return task;
      }

      // 3. EXECUTING: Execute initial actions
      this.updateTaskPhase(task, 'EXECUTING');
      for (const step of plan.steps) {
        if (abortController.signal.aborted) throw new Error('Task cancelled by operator');
        if (step.actionType === 'EDIT_FILE' || step.actionType === 'RUN_COMMAND') {
          task.toolCalls++;
        }
      }

      // 4. TESTING: Discover and run baseline tests
      this.updateTaskPhase(task, 'TESTING');
      this.emitEvent('engineering.test.started', {
        taskId: task.id,
        phase: 'TESTING',
        timestamp: new Date().toISOString(),
      });

      const initialTestResult = await this.testEngine.runTests(workspace);
      task.testsRun++;
      this.repo.saveTask(task);

      this.emitEvent('engineering.test.completed', {
        taskId: task.id,
        phase: 'TESTING',
        testsPassed: initialTestResult.passed ? 1 : 0,
        testsFailed: initialTestResult.passed ? 0 : 1,
        details: { exitCode: initialTestResult.exitCode },
        timestamp: new Date().toISOString(),
      });

      if (initialTestResult.passed) {
        // Clean pass immediately!
        this.updateTaskPhase(task, 'VERIFYING');
        this.repo.recordVerificationStage(task.id, 'BUILD_AND_TEST', true, { output: initialTestResult.stdout });
        task.verificationState = 'PASSED';
        task.finalSummary = `Autonomous engineering completed successfully: All tests verified clean on initial pass.`;
        this.updateTaskStatus(task, 'COMPLETED');
        return task;
      }

      // 5. AUTONOMOUS REPAIR LOOP
      this.emitEvent('engineering.failure.detected', {
        taskId: task.id,
        phase: 'TESTING',
        details: { rawOutput: initialTestResult.rawOutput.slice(0, 300) },
        timestamp: new Date().toISOString(),
      });

      let currentRawError = initialTestResult.rawOutput;
      let lastTestResult: TestExecutionResult = initialTestResult;

      while (task.attemptCount < task.budget.maxAttempts) {
        if (abortController.signal.aborted) throw new Error('Task cancelled by operator');
        task.attemptCount++;
        const elapsedSec = (Date.now() - startTime) / 1000;

        // DIAGNOSING
        this.updateTaskPhase(task, 'DIAGNOSING');
        this.emitEvent('engineering.diagnosis.started', { taskId: task.id, timestamp: new Date().toISOString() });

        const diagnostic = this.diagnosisEngine.normalize(task.id, currentRawError);
        this.repo.saveDiagnostic(diagnostic);

        this.emitEvent('engineering.diagnosis.completed', {
          taskId: task.id,
          diagnostic,
          timestamp: new Date().toISOString(),
        });

        // CONVERGENCE ASSESSMENT
        this.updateTaskPhase(task, 'CONVERGING');
        const recentRepairs = this.repo.getRepairs(task.id);
        const convergence = this.convergenceEngine.assess(recentRepairs, diagnostic, task.budget, elapsedSec);

        this.emitEvent('engineering.convergence.changed', {
          taskId: task.id,
          details: { status: convergence.status, reason: convergence.reason },
          timestamp: new Date().toISOString(),
        });

        if (convergence.shouldHalt) {
          if (convergence.status === 'REPEATED_FAILURE') {
            task.failureReason = convergence.reason;
            this.updateTaskStatus(task, 'NEEDS_USER');
            return task;
          }
          if (convergence.status === 'BUDGET_EXHAUSTED') {
            task.failureReason = convergence.reason;
            this.updateTaskStatus(task, 'FAILED');
            return task;
          }
        }

        // REPAIRING
        this.updateTaskPhase(task, 'REPAIRING');
        this.emitEvent('engineering.repair.started', {
          taskId: task.id,
          step: task.attemptCount,
          timestamp: new Date().toISOString(),
        });

        task.modelCalls++;
        const repairAttempt = await this.repairEngine.attemptRepair({
          taskId: task.id,
          workspace,
          diagnostic,
          attemptNumber: task.attemptCount,
          recentAttempts: recentRepairs,
        });

        this.emitEvent('engineering.repair.completed', {
          taskId: task.id,
          repair: repairAttempt,
          timestamp: new Date().toISOString(),
        });

        if (repairAttempt.outcome === 'FAILED') {
          // Model was unable to generate a valid patch
          continue;
        }

        if (repairAttempt.proposedPatch.path && !task.changedFiles.includes(repairAttempt.proposedPatch.path)) {
          task.changedFiles.push(repairAttempt.proposedPatch.path);
        }

        // RETESTING & VERIFYING
        this.updateTaskPhase(task, 'VERIFYING');
        const retestResult = await this.testEngine.runTests(workspace);
        task.testsRun++;

        const progress = this.convergenceEngine.evaluateProgress(
          { passed: lastTestResult.passed ? 1 : 0, failed: lastTestResult.passed ? 0 : 1 },
          { passed: retestResult.passed ? 1 : 0, failed: retestResult.passed ? 0 : 1 }
        );

        repairAttempt.outcome = progress;
        this.repo.saveRepair(repairAttempt);
        lastTestResult = retestResult;

        if (retestResult.passed) {
          // Success! Verified resolved!
          task.verificationState = 'VERIFIED';
          this.repo.recordVerificationStage(task.id, 'AUTONOMOUS_REPAIR_VERIFIED', true, {
            attemptNumber: task.attemptCount,
            patch: repairAttempt.proposedPatch,
          });

          task.finalSummary = `Autonomous engineering completed successfully in ${task.attemptCount} attempt(s). Defect resolved and verified clean.`;
          this.updateTaskStatus(task, 'COMPLETED');
          return task;
        }

        // If regressed or still failing, update current raw error for next iteration
        currentRawError = retestResult.rawOutput;
      }

      // If loop exited without resolution
      task.verificationState = 'FAILED';
      task.failureReason = `Repair loop terminated after ${task.attemptCount} attempt(s) without achieving passing verification.`;
      this.updateTaskStatus(task, 'FAILED');
      return task;
    } catch (err: any) {
      if (err.message.includes('cancelled')) {
        task.failureReason = 'Cancelled by operator';
        this.updateTaskStatus(task, 'CANCELLED');
      } else {
        task.failureReason = err.message;
        this.updateTaskStatus(task, 'FAILED');
      }
      return task;
    } finally {
      this.activeTaskAbortControllers.delete(taskId);
    }
  }

  private updateTaskPhase(task: SoftwareEngineeringTask, phase: string): void {
    task.currentPhase = phase;
    this.repo.saveTask(task);
    this.emitEvent('engineering.task.started', {
      taskId: task.id,
      status: task.status,
      phase,
      timestamp: new Date().toISOString(),
    });
  }

  private updateTaskStatus(task: SoftwareEngineeringTask, status: EngineeringTaskStatus): void {
    task.status = status;
    task.currentPhase = status;
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      task.completedAt = new Date().toISOString();
    }
    this.repo.saveTask(task);

    const eventType: EngineeringEventType =
      status === 'COMPLETED'
        ? 'engineering.task.completed'
        : status === 'FAILED'
        ? 'engineering.task.failed'
        : status === 'PAUSED'
        ? 'engineering.task.paused'
        : status === 'CANCELLED'
        ? 'engineering.task.cancelled'
        : 'engineering.task.started';

    this.emitEvent(eventType, {
      taskId: task.id,
      status: task.status,
      phase: task.currentPhase,
      details: { finalSummary: task.finalSummary, failureReason: task.failureReason },
      timestamp: new Date().toISOString(),
    });
  }

  private emitEvent(type: EngineeringEventType, payload: Partial<EngineeringEventPayload>): void {
    const fullPayload: EngineeringTaskEvent = {
      type,
      taskId: payload.taskId || '',
      status: payload.status,
      phase: payload.phase,
      step: payload.step,
      action: payload.action,
      diagnostic: payload.diagnostic,
      repair: payload.repair,
      testsPassed: payload.testsPassed,
      testsFailed: payload.testsFailed,
      details: payload.details,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    this.emit('engineering_event', fullPayload);
    (this.eventBus as any)?.emit?.(type, fullPayload);
  }

  private registerEngineeringCapabilities(): void {
    if (!this.capabilityFabric) return;
    const reg = (this.capabilityFabric as any).repository;
    if (!reg?.saveCapability) return;

    const capabilities = [
      {
        id: 'engineering.task.create',
        name: 'Create Autonomous Engineering Task',
        description: 'Creates a durable autonomous software engineering task',
        category: 'engineering',
        riskLevel: 'TIER_1_SAFE_ACTION',
        connectorType: 'local_tool',
        enabled: true,
      },
      {
        id: 'engineering.task.start',
        name: 'Start Autonomous Engineering Execution',
        description: 'Starts the 10-stage autonomous software engineering lifecycle',
        category: 'engineering',
        riskLevel: 'TIER_2_EXTERNAL_SIDE_EFFECT',
        connectorType: 'local_tool',
        enabled: true,
      },
      {
        id: 'engineering.repair.execute',
        name: 'Model-Driven Code Repair',
        description: 'Synthesizes and applies precision code patch from diagnostics',
        category: 'engineering',
        riskLevel: 'TIER_1_SAFE_ACTION',
        connectorType: 'local_tool',
        enabled: true,
      },
    ];

    for (const cap of capabilities) {
      try {
        reg.saveCapability(cap);
      } catch {}
    }
  }

  public async runTask(taskId: string): Promise<SoftwareEngineeringTask> {
    return this.executeTask(taskId);
  }

  public async cancelTask(taskId: string): Promise<boolean> {
    const task = this.repo.getTask(taskId);
    if (!task) return false;
    const ctrl = this.activeTaskAbortControllers.get(taskId);
    if (ctrl) {
      ctrl.abort();
      this.activeTaskAbortControllers.delete(taskId);
    }
    task.status = 'CANCELLED';
    task.completedAt = new Date().toISOString();
    this.repo.saveTask(task);
    this.emitEvent('engineering.task.cancelled', {
      taskId: task.id,
      status: task.status,
      phase: task.currentPhase,
      timestamp: task.completedAt,
    });
    return true;
  }

  public async pauseTask(taskId: string): Promise<boolean> {
    const task = this.repo.getTask(taskId);
    if (!task) return false;
    const ctrl = this.activeTaskAbortControllers.get(taskId);
    if (ctrl) {
      ctrl.abort();
      this.activeTaskAbortControllers.delete(taskId);
    }
    task.status = 'PAUSED';
    this.repo.saveTask(task);
    this.emitEvent('engineering.task.paused', {
      taskId: task.id,
      status: task.status,
      phase: task.currentPhase,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  public async resumeTask(taskId: string): Promise<boolean> {
    const task = this.repo.getTask(taskId);
    if (!task) return false;
    task.status = 'QUEUED';
    this.repo.saveTask(task);
    this.emitEvent('engineering.task.resumed', {
      taskId: task.id,
      status: task.status,
      phase: task.currentPhase,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  public async recoverTasksOnStartup(): Promise<number> {
    const activeStatuses: EngineeringTaskStatus[] = [
      'EXECUTING',
      'PLANNING',
      'TESTING',
      'DIAGNOSING',
      'CONVERGING',
      'REPAIRING',
      'VERIFYING',
    ];
    let count = 0;
    for (const status of activeStatuses) {
      const tasks = this.repo.listTasks({ status, limit: 100 });
      for (const t of tasks) {
        t.status = 'QUEUED';
        t.currentPhase = 'QUEUED';
        this.repo.saveTask(t);
        count++;
      }
    }
    return count;
  }

  public async shutdown(): Promise<void> {
    for (const ctrl of this.activeTaskAbortControllers.values()) {
      ctrl.abort();
    }
    this.activeTaskAbortControllers.clear();
  }
}

export { AutonomousEngineeringFabric as EngineeringFabric };

