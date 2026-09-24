/**
 * HRSIKESA (हृषीकेश) — Autonomous Mission Orchestrator & Execution Loop
 *
 * Coordinates finite, governed, observable mission execution with:
 * - Structured MissionPlanner (DAG task decomposition & complexity classification)
 * - Agent capability & tool matching dynamically via AgentRegistry
 * - ToolExecutionBus & PermissionManager governance (no arbitrary executions)
 * - Genuine MissionVerifier for filesystem, processes, and exit codes (zero LLM calls)
 * - Failure classification & bounded retries via RecoveryManager
 * - Human-in-the-loop BLOCKED state for Tier 3/4 approvals & interventions
 * - Mission-wide budget governance (max tasks, retries, time, model calls)
 * - Durable artifact tracking and memory outcome storage
 */

import { randomUUID } from 'node:crypto';
import { AgentRegistry } from '../registry/agent.registry.js';
import { AgentRuntime } from '../runtime/agent.runtime.js';
import { AgentDelegationManager } from '../delegation/delegation.manager.js';
import { AgentBlackboard } from '../blackboard/blackboard.js';
import { TaskRepository } from '../../persistence/repositories/task.repository.js';
import { MissionRepository } from '../../persistence/repositories/mission.repository.js';
import { ArtifactRepository } from '../../persistence/repositories/artifact.repository.js';
import { AgentTask, AgentResult, StructuredObservation } from '../interfaces/task.types.js';
import {
  IMission,
  MissionResult,
  MissionPlan,
  PlannedTask,
  MissionBudget,
  DEFAULT_MISSION_BUDGET,
  MissionReport,
  MissionArtifact,
  HumanInterventionRequest,
  MissionBudgetTracker
} from '../interfaces/mission.types.js';
import { TaskGraph } from '../tasks/task.graph.js';
import { MissionPlanner } from '../planner/mission.planner.js';
import { MissionVerifier } from '../verification/mission.verifier.js';
import { RecoveryManager } from '../recovery/recovery.manager.js';
import { MemoryRepository } from '../../persistence/repositories/memory.repository.js';
import { SemanticMemoryIndexer } from '../../memory/semantic/semantic.indexer.js';
import { HardwareDetector } from '../../core/hardware/hardware.detector.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

export interface CreateMissionOptions {
  readonly objective: string;
  readonly rootAgentId?: string;
  readonly context?: string;
  readonly constraints?: readonly string[];
  readonly budget?: MissionBudget;
  readonly plan?: MissionPlan;
  readonly inputs?: Record<string, unknown>;
  readonly sessionId?: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly productId?: string;
  readonly departmentId?: string;
}

export class MissionOrchestrator {
  private readonly agentRegistry: AgentRegistry;
  private readonly agentRuntime: AgentRuntime;
  private readonly delegationManager: AgentDelegationManager;
  private readonly blackboard: AgentBlackboard;
  private readonly taskRepo: TaskRepository;
  private readonly missionRepo: MissionRepository;
  private readonly artifactRepo?: ArtifactRepository;
  private readonly planner?: MissionPlanner;
  private readonly verifier: MissionVerifier;
  private readonly recovery: RecoveryManager;
  private readonly memoryRepo?: MemoryRepository;
  private readonly memoryIndexer?: SemanticMemoryIndexer;
  private readonly hardware?: HardwareDetector;
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;

  constructor(
    agentRegistry: AgentRegistry,
    agentRuntime: AgentRuntime,
    delegationManager: AgentDelegationManager,
    blackboard: AgentBlackboard,
    taskRepo: TaskRepository,
    missionRepo: MissionRepository,
    eventBus?: EventBus,
    logger?: ILogger,
    artifactRepo?: ArtifactRepository,
    planner?: MissionPlanner,
    verifier?: MissionVerifier,
    recovery?: RecoveryManager,
    memoryRepo?: MemoryRepository,
    memoryIndexer?: SemanticMemoryIndexer,
    hardware?: HardwareDetector
  ) {
    this.agentRegistry = agentRegistry;
    this.agentRuntime = agentRuntime;
    this.delegationManager = delegationManager;
    this.blackboard = blackboard;
    this.taskRepo = taskRepo;
    this.missionRepo = missionRepo;
    this.eventBus = eventBus;
    this.logger = logger?.child('MissionOrchestrator');
    this.artifactRepo = artifactRepo;
    this.planner = planner;
    this.verifier = verifier || new MissionVerifier(blackboard, logger);
    this.recovery = recovery || new RecoveryManager(3, logger);
    this.memoryRepo = memoryRepo;
    this.memoryIndexer = memoryIndexer;
    this.hardware = hardware;
  }

  /**
   * Plan and create a structured mission with DAG tasks.
   */
  public async planAndCreateMission(options: CreateMissionOptions): Promise<IMission> {
    const defaultAgentId = options.rootAgentId || 'gandiva';
    const budget = options.budget || DEFAULT_MISSION_BUDGET;

    this.logger?.info(`Creating & planning mission: "${options.objective.substring(0, 60)}"`);
    const missionId = 'msn_' + randomUUID().replace(/-/g, '').substring(0, 16);
    const rootTaskId = 'task_' + randomUUID().replace(/-/g, '').substring(0, 16);
    const now = new Date().toISOString();

    this.eventBus?.emit('mission.planning', { missionId, objective: options.objective });

    // Generate or use provided plan
    let plan: MissionPlan;
    if (options.plan) {
      plan = options.plan;
    } else if (this.planner) {
      plan = await this.planner.createPlan({
        objective: options.objective,
        context: options.context,
        constraints: options.constraints,
        budget,
        defaultAgentId
      });
    } else {
      // Basic 1-task fallback
      plan = {
        objective: options.objective,
        constraints: options.constraints ? [...options.constraints] : [],
        successCriteria: ['Task executed successfully'],
        tasks: [
          {
            id: rootTaskId,
            title: 'Execute Objective',
            objective: options.objective,
            agentId: defaultAgentId,
            dependencies: [],
            requiredCapabilities: [],
            expectedOutputs: [],
            dangerLevel: 0
          }
        ],
        riskLevel: 'low',
        estimatedModelCalls: 0,
        createdAt: now
      };
    }

    // Ensure globally unique task IDs per mission and rewrite dependencies
    const idMap = new Map<string, string>();
    for (let i = 0; i < plan.tasks.length; i++) {
      const origId = plan.tasks[i].id;
      const uniqueId = `task_${missionId.replace('msn_', '')}_${i + 1}`;
      idMap.set(origId, uniqueId);
    }
    const sanitizedTasks: PlannedTask[] = plan.tasks.map(t => ({
      ...t,
      id: idMap.get(t.id) || t.id,
      dependencies: t.dependencies.map(d => idMap.get(d) || d)
    }));
    plan = { ...plan, tasks: sanitizedTasks };

    const mission: IMission = {
      id: missionId,
      companyId: options.companyId,
      projectId: options.projectId,
      productId: options.productId,
      departmentId: options.departmentId,
      objective: options.objective,
      rootAgentId: defaultAgentId,
      rootTaskId,
      status: 'ready',
      plan,
      budget,
      createdAt: now,
      updatedAt: now
    };

    this.missionRepo.create(mission);

    // Persist all planned tasks
    for (const pTask of plan.tasks) {
      const agentTask: AgentTask = {
        id: pTask.id,
        agentId: pTask.agentId,
        missionId,
        title: pTask.title,
        objective: pTask.objective,
        context: options.context,
        priority: 'normal',
        status: 'pending',
        depth: 0,
        dependencies: pTask.dependencies,
        maxRetries: budget.maxRetries,
        retryCount: 0,
        deterministicToolAction: pTask.deterministicToolAction,
        verificationStrategy: pTask.verificationStrategy,
        sessionId: options.sessionId,
        createdAt: now
      };

      this.taskRepo.create(agentTask);
      if (pTask.dependencies.length === 0) {
        this.delegationManager.registerRootTask(agentTask);
      }
    }

    this.logger?.info(`Mission [${missionId}] planned with ${plan.tasks.length} task(s).`);
    this.eventBus?.emit('mission.created', { missionId, rootAgentId: defaultAgentId });

    return mission;
  }

  /**
   * Backward-compatible mission creation (synchronous create without full planning).
   */
  public createMission(options: CreateMissionOptions): IMission {
    const agentId = options.rootAgentId || 'gandiva';
    this.agentRegistry.getOrThrow(agentId);

    const now = new Date().toISOString();
    const missionId = 'msn_' + randomUUID().replace(/-/g, '').substring(0, 16);
    const rootTaskId = 'task_' + randomUUID().replace(/-/g, '').substring(0, 16);

    const rootTask: AgentTask = {
      id: rootTaskId,
      agentId,
      missionId,
      objective: options.objective,
      context: options.context,
      inputs: options.inputs || {},
      priority: 'normal',
      status: 'pending',
      depth: 0,
      sessionId: options.sessionId,
      createdAt: now
    };

    const mission: IMission = {
      id: missionId,
      companyId: options.companyId,
      projectId: options.projectId,
      productId: options.productId,
      departmentId: options.departmentId,
      objective: options.objective,
      rootAgentId: agentId,
      rootTaskId,
      status: 'ready',
      budget: options.budget || DEFAULT_MISSION_BUDGET,
      createdAt: now,
      updatedAt: now
    };

    this.taskRepo.create(rootTask);
    this.missionRepo.create(mission);
    this.delegationManager.registerRootTask(rootTask);

    this.logger?.info(`Created mission [${missionId}] for agent [${agentId}]`);
    this.eventBus?.emit('mission.created', { missionId, rootAgentId: agentId });

    return mission;
  }

  /**
   * Execute a mission through the governed DAG execution loop.
   */
  public async executeMission(missionId: string): Promise<MissionResult> {
    const mission = this.missionRepo.get(missionId);
    if (!mission) {
      throw new Error(`Mission '${missionId}' not found.`);
    }

    if (mission.status === 'completed' || mission.status === 'failed' || mission.status === 'cancelled') {
      const allTasks = this.taskRepo.listByMission(missionId);
      return {
        missionId,
        status: mission.status,
        objective: mission.objective,
        summary: mission.result || `Mission already ${mission.status}.`,
        taskCount: allTasks.length,
        report: mission.report,
        completedAt: mission.updatedAt
      };
    }

    const startTime = Date.now();
    const budget = mission.budget || DEFAULT_MISSION_BUDGET;
    const budgetTracker = new MissionBudgetTracker(budget.maxModelCalls);

    this.missionRepo.update(missionId, { status: 'running', updatedAt: new Date().toISOString() });
    this.eventBus?.emit('mission.started', { missionId });

    const completedTaskIds = new Set<string>();
    const failedTaskIds = new Set<string>();
    const runningTaskIds = new Set<string>();
    const blockedTaskIds = new Set<string>();

    // Load tasks from repository
    let allTasks = this.taskRepo.listByMission(missionId);

    // If mission was created without pre-planned tasks, ensure root task exists
    if (allTasks.length === 0) {
      const rootTask: AgentTask = {
        id: mission.rootTaskId,
        agentId: mission.rootAgentId,
        missionId,
        objective: mission.objective,
        priority: 'normal',
        status: 'pending',
        depth: 0,
        createdAt: new Date().toISOString()
      };
      this.taskRepo.create(rootTask);
      allTasks = [rootTask];
    }

    // Populate initial state from DB
    for (const t of allTasks) {
      if (t.status === 'completed') completedTaskIds.add(t.id);
      if (t.status === 'failed') failedTaskIds.add(t.id);
      if (t.status === 'blocked') blockedTaskIds.add(t.id);
    }

    const agentsUsed = new Set<string>();
    const toolsUsed = new Set<string>();
    const recordedArtifacts: MissionArtifact[] = [];
    const warnings: string[] = [];
    let verificationsTotal = 0;
    let verificationsPassed = 0;
    let totalRetries = 0;
    let totalApprovals = 0;
    let totalVerificationDurationMs = 0;

    if (this.hardware) {
      const profile = this.hardware.getProfile();
      this.logger?.debug(`Mission execution initialized on ${profile.memory.state} memory state (${profile.memory.totalGb}GB RAM).`);
    }

    // Execution loop
    let isTerminated = false;
    let finalMissionStatus: 'completed' | 'failed' | 'blocked' = 'completed';
    let terminationReason = '';
    let lastTaskOutput = '';

    while (!isTerminated) {
      // 1. Check mission-level execution timeout
      if (Date.now() - startTime > budget.maxExecutionTimeMs) {
        finalMissionStatus = 'failed';
        terminationReason = `Execution timeout exceeded (${budget.maxExecutionTimeMs / 1000}s).`;
        warnings.push(terminationReason);
        break;
      }

      // 2. Build task graph from current task list
      allTasks = this.taskRepo.listByMission(missionId);
      const plannedTasks: PlannedTask[] = allTasks.map(t => ({
        id: t.id,
        title: t.title || t.id,
        objective: t.objective,
        agentId: t.agentId,
        dependencies: t.dependencies || [],
        requiredCapabilities: [],
        expectedOutputs: [],
        deterministicToolAction: t.deterministicToolAction,
        verificationStrategy: t.verificationStrategy,
        dangerLevel: 0
      }));

      const taskGraph = new TaskGraph(plannedTasks, budget);
      const readyTasks = taskGraph.getReadyTasks(completedTaskIds, failedTaskIds, runningTaskIds, blockedTaskIds);

      // If no tasks ready and none running: we are done or stuck
      if (readyTasks.length === 0 && runningTaskIds.size === 0) {
        const remainingTasks = allTasks.filter(t => !completedTaskIds.has(t.id) && !failedTaskIds.has(t.id) && !blockedTaskIds.has(t.id));
        if (remainingTasks.length > 0) {
          finalMissionStatus = 'failed';
          terminationReason = `Deadlock or dependency failure: ${remainingTasks.length} task(s) could not execute.`;
        }
        break;
      }

      // 3. Process ready tasks
      for (const pTask of readyTasks) {
        if (runningTaskIds.size >= budget.maxConcurrentTasks) {
          break; // Concurrency limit reached
        }

        const task = allTasks.find(t => t.id === pTask.id);
        if (!task) continue;

        runningTaskIds.add(task.id);
        agentsUsed.add(task.agentId);
        this.taskRepo.updateStatus(task.id, 'running', new Date().toISOString());
        this.eventBus?.emit('mission.task.started', { missionId, taskId: task.id, agentId: task.agentId });

        try {
          // Execute task via AgentRuntime with mission budget tracker
          const agentResult: AgentResult = await this.agentRuntime.execute(task, budgetTracker);

          // Track tools used
          for (const tc of agentResult.toolCalls) {
            toolsUsed.add(tc.tool);
          }

          // Check if task entered BLOCKED status (e.g. human approval required)
          if (agentResult.status === 'blocked' || agentResult.requiresApproval || agentResult.pendingApprovalId) {
            runningTaskIds.delete(task.id);
            blockedTaskIds.add(task.id);
            totalApprovals++;

            const approvalId = agentResult.pendingApprovalId || `apr_${Date.now()}_${randomUUID().substring(0, 6)}`;
            const blockReason = agentResult.summary || 'Task action requires human authorization.';

            this.taskRepo.update(task.id, {
              status: 'blocked',
              error: blockReason
            });

            const interventionRequest: HumanInterventionRequest = {
              id: approvalId,
              missionId,
              taskId: task.id,
              reason: blockReason,
              resolved: false,
              requestedAt: new Date().toISOString()
            };

            this.missionRepo.update(missionId, {
              status: 'blocked',
              blockedReason: blockReason,
              interventionRequest,
              updatedAt: new Date().toISOString()
            });

            this.eventBus?.emit('mission.blocked', {
              missionId,
              taskId: task.id,
              approvalId,
              reason: blockReason
            });

            finalMissionStatus = 'blocked';
            terminationReason = blockReason;
            isTerminated = true;
            break;
          }

          // Track produced artifacts
          const extractedArtifacts = this.extractArtifactsFromToolCalls(missionId, task.id, agentResult);
          for (const art of extractedArtifacts) {
            if (this.artifactRepo) {
              this.artifactRepo.create(art);
            }
            recordedArtifacts.push(art);
            this.eventBus?.emit('mission.artifact.created', {
              missionId,
              taskId: task.id,
              artifactId: art.id,
              name: art.name,
              type: art.type
            });
          }

          // 4. MissionVerifier check (Strictly non-LLM)
          let verificationPassed = true;
          if (task.verificationStrategy) {
            verificationsTotal++;
            this.eventBus?.emit('mission.verification.started', {
              missionId,
              taskId: task.id,
              strategyType: task.verificationStrategy.type
            });

            const vStart = Date.now();
            const vResult = await this.verifier.verifyTask(task, agentResult);
            totalVerificationDurationMs += (Date.now() - vStart);

            if (vResult) {
              verificationPassed = vResult.passed;
              if (vResult.passed) {
                verificationsPassed++;
              }
              this.eventBus?.emit('mission.verification.completed', {
                missionId,
                taskId: task.id,
                passed: vResult.passed,
                details: vResult.details
              });
            }
          }

          // Capture observation
          const observation: StructuredObservation = {
            success: agentResult.status === 'completed' && verificationPassed,
            output: agentResult.output,
            artifacts: extractedArtifacts.map(a => a.name),
            warnings: agentResult.errors.length > 0 ? agentResult.errors : undefined,
            timestamp: new Date().toISOString()
          };

          if (agentResult.status === 'completed' && verificationPassed) {
            // Task Succeeded!
            lastTaskOutput = typeof agentResult.output === 'string' ? agentResult.output : JSON.stringify(agentResult.output || '');
            runningTaskIds.delete(task.id);
            completedTaskIds.add(task.id);
            this.taskRepo.saveResult(task.id, {
              ...agentResult,
              status: 'completed',
              observation
            });

            // Publish to blackboard
            this.blackboard.publish(missionId, task.id, task.agentId, {
              type: 'task_result',
              title: task.title || task.objective.substring(0, 40),
              content: agentResult.summary,
              evidence: agentResult.evidence
            });

            this.eventBus?.emit('mission.task.completed', {
              missionId,
              taskId: task.id,
              agentId: task.agentId,
              resultSummary: agentResult.summary
            });
          } else {
            // Task Failed or Verification Failed
            runningTaskIds.delete(task.id);
            const errorMsg = agentResult.errors.join('; ') || (verificationPassed ? 'Task failed without explicit error.' : 'Task verification criteria failed.');
            const classification = this.recovery.classifyError(errorMsg, 0, task.retryCount || 0, budget.maxRetries);

            if (classification.suggestedAction === 'block_human') {
              totalApprovals++;
              blockedTaskIds.add(task.id);
              this.taskRepo.updateStatus(task.id, 'blocked');

              const interventionRequest: HumanInterventionRequest = {
                id: 'int_' + randomUUID().substring(0, 8),
                missionId,
                taskId: task.id,
                reason: classification.reason,
                resolved: false,
                requestedAt: new Date().toISOString()
              };

              this.missionRepo.update(missionId, {
                status: 'blocked',
                blockedReason: classification.reason,
                interventionRequest,
                updatedAt: new Date().toISOString()
              });

              this.eventBus?.emit('mission.blocked', {
                missionId,
                taskId: task.id,
                reason: classification.reason
              });

              finalMissionStatus = 'blocked';
              terminationReason = classification.reason;
              isTerminated = true;
              break;
            } else if (this.recovery.canRetry(task, classification)) {
              totalRetries++;
              const nextRetry = (task.retryCount || 0) + 1;
              this.taskRepo.update(task.id, {
                status: 'retrying',
                retryCount: nextRetry
              });

              this.eventBus?.emit('mission.task.retrying', {
                missionId,
                taskId: task.id,
                retryCount: nextRetry,
                maxRetries: budget.maxRetries
              });

              const backoff = Math.max(1000, classification.suggestedBackoffMs || 1000);
              this.logger?.info(`Task [${task.id}] retrying (attempt ${nextRetry}/${budget.maxRetries}) after ${backoff}ms backoff...`);
              await new Promise(r => setTimeout(r, backoff));
            } else if (this.planner && classification.suggestedAction === 'replan') {
              this.eventBus?.emit('mission.planning', { missionId, objective: mission.objective });
              const blackboardEntries = this.blackboard.listByMission(missionId).map(b => b.content);
              const revisedPlan = await this.planner.revisePlan(mission.plan || {
                objective: mission.objective,
                constraints: [],
                successCriteria: [],
                tasks: plannedTasks,
                riskLevel: 'low',
                estimatedModelCalls: 1,
                createdAt: new Date().toISOString()
              }, task.id, errorMsg, blackboardEntries);

              for (const rTask of revisedPlan.tasks) {
                if (!allTasks.some(t => t.id === rTask.id)) {
                  this.taskRepo.create({
                    id: rTask.id,
                    agentId: rTask.agentId,
                    missionId,
                    title: rTask.title,
                    objective: rTask.objective,
                    priority: 'normal',
                    status: 'pending',
                    depth: 0,
                    dependencies: rTask.dependencies,
                    maxRetries: budget.maxRetries,
                    retryCount: 0,
                    createdAt: new Date().toISOString()
                  });
                }
              }

              this.missionRepo.update(missionId, { plan: revisedPlan });
              this.eventBus?.emit('mission.replanned', { missionId, newTasksCount: revisedPlan.tasks.length });
              failedTaskIds.add(task.id);
            } else {
              failedTaskIds.add(task.id);
              this.taskRepo.updateStatus(task.id, 'failed');
              this.eventBus?.emit('mission.task.failed', {
                missionId,
                taskId: task.id,
                agentId: task.agentId,
                error: errorMsg
              });
            }
          }
        } catch (err) {
          runningTaskIds.delete(task.id);
          failedTaskIds.add(task.id);
          const errMsg = err instanceof Error ? err.message : String(err);
          this.taskRepo.updateStatus(task.id, 'failed');
          this.eventBus?.emit('mission.task.failed', {
            missionId,
            taskId: task.id,
            agentId: task.agentId,
            error: errMsg
          });
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    // Determine final status
    const allFinalTasks = this.taskRepo.listByMission(missionId);
    const completedCount = allFinalTasks.filter(t => t.status === 'completed').length;
    const failedCount = allFinalTasks.filter(t => t.status === 'failed').length;
    const blockedCount = allFinalTasks.filter(t => t.status === 'blocked').length;

    let finalStatus: 'completed' | 'failed' | 'blocked';
    if (finalMissionStatus === 'blocked' || blockedCount > 0) {
      finalStatus = 'blocked';
    } else if (failedCount > 0 && completedCount === 0) {
      finalStatus = 'failed';
    } else if (completedCount === allFinalTasks.length) {
      finalStatus = 'completed';
    } else if (failedCount > 0) {
      finalStatus = 'failed';
    } else {
      finalStatus = 'completed';
    }

    const summary = finalStatus === 'completed'
      ? (lastTaskOutput ? `Mission completed successfully. ${lastTaskOutput}` : `Mission completed successfully. ${completedCount}/${allFinalTasks.length} tasks verified.`)
      : (finalStatus === 'blocked' ? `Mission paused (BLOCKED): ${terminationReason}` : `Mission failed: ${terminationReason || `${failedCount} task(s) failed.`}`);

    // Compile structured MissionReport
    const report: MissionReport = {
      missionId,
      objective: mission.objective,
      status: finalStatus,
      summary,
      tasks: {
        total: allFinalTasks.length,
        completed: completedCount,
        failed: failedCount,
        skipped: allFinalTasks.filter(t => t.status === 'pending').length,
        blocked: blockedCount,
        retried: totalRetries
      },
      agentsUsed: Array.from(agentsUsed),
      toolsUsed: Array.from(toolsUsed),
      artifacts: recordedArtifacts,
      verifications: {
        total: verificationsTotal,
        passed: verificationsPassed,
        failed: verificationsTotal - verificationsPassed
      },
      retriesCount: totalRetries,
      approvalsCount: totalApprovals,
      warnings,
      executionTimeMs,
      modelCallsCount: budgetTracker.getModelCallsCount(),
      completedAt
    };

    // Update mission record
    this.missionRepo.update(missionId, {
      status: finalStatus,
      result: summary,
      report,
      updatedAt: completedAt
    });

    if (finalStatus === 'completed') {
      this.eventBus?.emit('mission.completed', { missionId, status: finalStatus });

      if (this.memoryRepo) {
        try {
          const outcomeItem = {
            id: 'mem_msn_' + missionId,
            tier: 'project_memory' as const,
            key: `mission_${missionId}_outcome`,
            content: `Completed Mission: "${mission.objective}". Summary: ${summary}. Artifacts: ${recordedArtifacts.map(a => a.name).join(', ') || 'none'}.`,
            source: 'mission_orchestrator',
            provenance: 'learned' as const,
            confidence: 0.95,
            createdAt: completedAt,
            updatedAt: completedAt
          };
          this.memoryRepo.store(outcomeItem);
          this.memoryIndexer?.enqueue(outcomeItem);
        } catch (memErr) {
          this.logger?.warn('Failed to store mission outcome to memory:', { error: String(memErr) });
        }
      }
    } else if (finalStatus === 'failed') {
      this.eventBus?.emit('mission.failed', { missionId, error: summary });
    }

    this.logger?.info(`Mission [${missionId}] ${finalStatus} in ${executionTimeMs}ms (${completedCount}/${allFinalTasks.length} tasks completed).`);

    return {
      missionId,
      status: finalStatus,
      objective: mission.objective,
      summary,
      taskCount: allFinalTasks.length,
      report,
      artifacts: recordedArtifacts,
      completedAt
    };
  }

  /**
   * Cancel an active mission safely.
   */
  public async cancelMission(missionId: string, reason = 'User requested cancellation'): Promise<IMission> {
    const mission = this.missionRepo.get(missionId);
    if (!mission) throw new Error(`Mission '${missionId}' not found.`);

    const now = new Date().toISOString();
    this.missionRepo.update(missionId, {
      status: 'cancelled',
      result: `Cancelled: ${reason}`,
      updatedAt: now
    });

    // Cancel pending/running/blocked tasks
    const tasks = this.taskRepo.listByMission(missionId);
    for (const t of tasks) {
      if (t.status === 'pending' || t.status === 'ready' || t.status === 'running' || t.status === 'retrying' || t.status === 'blocked') {
        this.taskRepo.updateStatus(t.id, 'cancelled', undefined, now);
      }
    }

    this.eventBus?.emit('mission.cancelled', { missionId, reason });
    return this.missionRepo.get(missionId)!;
  }

  /**
   * Resume a blocked mission after human resolution.
   */
  public async resumeMission(
    missionId: string,
    options?: { approvalId?: string; resolution?: string; decision?: 'APPROVED' | 'REJECTED' }
  ): Promise<MissionResult> {
    const mission = this.missionRepo.get(missionId);
    if (!mission) throw new Error(`Mission '${missionId}' not found.`);
    if (mission.status !== 'blocked') {
      throw new Error(`Mission '${missionId}' is not in blocked state (current: ${mission.status}).`);
    }

    const decision = options?.decision || 'APPROVED';
    const resolution = options?.resolution || (decision === 'APPROVED' ? 'Human approved action' : 'Human rejected action');
    const approvalId = options?.approvalId || mission.interventionRequest?.id;
    const now = new Date().toISOString();

    if (decision === 'REJECTED') {
      // Mark mission and blocked tasks as failed / aborted
      const updatedIntervention = mission.interventionRequest
        ? { ...mission.interventionRequest, resolved: true, resolution, resolvedAt: now }
        : undefined;

      this.missionRepo.update(missionId, {
        status: 'failed',
        result: `Aborted: ${resolution}`,
        interventionRequest: updatedIntervention,
        updatedAt: now
      });

      const tasks = this.taskRepo.listByMission(missionId);
      for (const t of tasks) {
        if (t.status === 'blocked') {
          this.taskRepo.update(t.id, { status: 'failed', error: resolution });
        }
      }

      this.eventBus?.emit('mission.failed', { missionId, error: resolution });
      return {
        missionId,
        status: 'failed',
        objective: mission.objective,
        summary: `Mission rejected by operator: ${resolution}`,
        taskCount: tasks.length,
        completedAt: now
      };
    }

    const updatedIntervention = mission.interventionRequest
      ? { ...mission.interventionRequest, resolved: true, resolution, resolvedAt: now }
      : undefined;

    this.missionRepo.update(missionId, {
      status: 'ready',
      blockedReason: undefined,
      interventionRequest: updatedIntervention,
      updatedAt: now
    });

    // Unblock blocked tasks and pass approvalId
    const tasks = this.taskRepo.listByMission(missionId);
    for (const t of tasks) {
      if (t.status === 'blocked') {
        this.taskRepo.update(t.id, {
          status: 'pending',
          approvalId
        });
      }
    }

    this.eventBus?.emit('mission.resumed', { missionId, resolution });
    return this.executeMission(missionId);
  }

  /**
   * Run a mission end-to-end with planning in one step.
   */
  public async runMission(options: CreateMissionOptions): Promise<MissionResult> {
    const mission = await this.planAndCreateMission(options);
    return this.executeMission(mission.id);
  }

  private extractArtifactsFromToolCalls(
    missionId: string,
    taskId: string,
    result: AgentResult
  ): MissionArtifact[] {
    const artifacts: MissionArtifact[] = [];
    const now = new Date().toISOString();

    for (const tc of result.toolCalls) {
      if (!tc.success) continue;

      if (tc.tool === 'filesystem.write' && tc.input.path) {
        artifacts.push({
          id: 'art_' + randomUUID().substring(0, 8),
          missionId,
          taskId,
          type: 'file',
          location: String(tc.input.path),
          name: String(tc.input.path).split(/[\\/]/).pop() || 'file',
          metadata: { writtenBytes: typeof tc.input.content === 'string' ? tc.input.content.length : undefined },
          verified: false,
          createdAt: now
        });
      } else if (tc.tool === 'browser.screenshot' && tc.output && typeof tc.output === 'object') {
        artifacts.push({
          id: 'art_' + randomUUID().substring(0, 8),
          missionId,
          taskId,
          type: 'screenshot',
          location: (tc.output as any).path || 'screenshot.png',
          name: 'browser_screenshot.png',
          verified: true,
          createdAt: now
        });
      }
    }

    return artifacts;
  }
}
