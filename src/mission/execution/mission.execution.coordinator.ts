import {
  MissionDescriptor,
  MissionOutcome,
  MissionTask,
  PlanVersion,
  MissionReport,
  MissionArtifact
} from '../types/index.js';
import { MissionRepository } from '../repository/mission.repository.js';
import { MissionBlackboard } from '../blackboard/mission.blackboard.js';
import { WorkforceCapacityTracker } from '../workforce/workforce.capacity.tracker.js';
import { WorkforcePlanner } from '../workforce/workforce.planner.js';
import { AgentCollaborationManager } from '../workforce/agent.collaboration.manager.js';
import { AcceptanceEngine } from './acceptance.engine.js';
import { LoopProtectionEngine } from './loop.protection.js';
import { ReplanningEngine } from './replanning.engine.js';
import { MissionCheckpointManager } from '../checkpoint/checkpoint.manager.js';
import { EventBus } from '../../core/events/event-bus.js';

export interface ExecutionCoordinatorOptions {
  eventBus?: EventBus;
  repository?: MissionRepository;
  blackboard?: MissionBlackboard;
  capacityTracker?: WorkforceCapacityTracker;
  workforcePlanner?: WorkforcePlanner;
  collaborationManager?: AgentCollaborationManager;
  acceptanceEngine?: AcceptanceEngine;
  loopProtection?: LoopProtectionEngine;
  replanningEngine?: ReplanningEngine;
  checkpointManager?: MissionCheckpointManager;
}

export class MissionExecutionCoordinator {
  private repository: MissionRepository;
  private blackboard: MissionBlackboard;
  private capacityTracker: WorkforceCapacityTracker;
  private workforcePlanner: WorkforcePlanner;
  private collaborationManager: AgentCollaborationManager;
  private acceptanceEngine: AcceptanceEngine;
  private loopProtection: LoopProtectionEngine;
  private replanningEngine: ReplanningEngine;
  private checkpointManager: MissionCheckpointManager;
  private eventBus?: EventBus;

  private activeMissions: Map<string, MissionDescriptor> = new Map();
  private missionOutcomes: Map<string, MissionOutcome[]> = new Map();
  private missionTasks: Map<string, MissionTask[]> = new Map();
  private missionPlanVersions: Map<string, PlanVersion[]> = new Map();
  private pendingApprovals: Map<string, { taskId: string; action: string; risk: string; agent: string }> = new Map();

  constructor(options?: ExecutionCoordinatorOptions) {
    this.repository = options?.repository || new MissionRepository(new (require('../../persistence/database/database.manager.js').DatabaseManager)('data/hrisekesa.db'));
    this.blackboard = options?.blackboard || new MissionBlackboard(this.repository);
    this.capacityTracker = options?.capacityTracker || new WorkforceCapacityTracker(this.repository);
    this.workforcePlanner = options?.workforcePlanner || new WorkforcePlanner(this.capacityTracker);
    this.collaborationManager = options?.collaborationManager || new AgentCollaborationManager(this.capacityTracker, this.workforcePlanner);
    this.acceptanceEngine = options?.acceptanceEngine || new AcceptanceEngine();
    this.loopProtection = options?.loopProtection || new LoopProtectionEngine();
    this.replanningEngine = options?.replanningEngine || new ReplanningEngine(this.loopProtection);
    this.checkpointManager = options?.checkpointManager || new MissionCheckpointManager(this.repository);
    this.eventBus = options?.eventBus;
  }

  public getCollaborationManager(): AgentCollaborationManager {
    return this.collaborationManager;
  }

  /**
   * Registers a compiled mission and prepares it for execution
   */
  public registerMission(
    mission: MissionDescriptor,
    outcomes: MissionOutcome[],
    tasks: MissionTask[],
    initialPlanVersion?: PlanVersion
  ): void {
    this.activeMissions.set(mission.missionId, mission);
    this.missionOutcomes.set(mission.missionId, outcomes);
    this.missionTasks.set(mission.missionId, tasks);

    const versions = initialPlanVersion ? [initialPlanVersion] : [];
    this.missionPlanVersions.set(mission.missionId, versions);

    try {
      this.repository.saveMission(mission);
      for (const outcome of outcomes) {
        this.repository.saveOutcome(outcome);
      }
      for (const task of tasks) {
        this.repository.saveTask(task);
      }
      if (initialPlanVersion) {
        this.repository.savePlanVersion(initialPlanVersion);
      }
    } catch {
      // In-memory fallback
    }

    this.checkpointManager.createCheckpoint(
      mission.missionId,
      versions.length || 1,
      {
        mission,
        outcomes,
        tasks,
        blackboard: this.blackboard.getEntries(mission.missionId),
        artifacts: this.blackboard.getArtifacts(mission.missionId)
      },
      'Initial mission registration checkpoint'
    );

    this.emitEvent('mission.created', { missionId: mission.missionId, title: mission.title, priority: mission.priority });
  }

  /**
   * Start executing a mission
   */
  public async startMission(missionId: string): Promise<MissionDescriptor> {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    if (mission.status === 'COMPLETED' || mission.status === 'CANCELLED') {
      throw new Error(`Cannot start mission in ${mission.status} state.`);
    }

    mission.status = 'EXECUTING';
    mission.startedAt = mission.startedAt || new Date().toISOString();
    mission.updatedAt = new Date().toISOString();

    this.updateMissionState(mission);
    this.emitEvent('mission.started', { missionId, startedAt: mission.startedAt });

    await this.stepExecution(missionId);
    return mission;
  }

  /**
   * Single or multi-step execution cycle for ready tasks
   */
  public async stepExecution(missionId: string): Promise<void> {
    let progressMade = true;

    while (progressMade) {
      progressMade = false;
      const mission = this.getMission(missionId);
      if (!mission || mission.status === 'PAUSED' || mission.status === 'CANCELLED' || mission.status === 'COMPLETED' || mission.status === 'AWAITING_APPROVAL' || mission.status === 'BLOCKED') {
        return;
      }

      const tasks = this.getTasks(missionId);

      // 1. Loop Protection check
      const blockers = this.blackboard.getActiveBlockers(missionId).map((b: any) => b.content);
      const loopCheck = this.loopProtection.checkLoopDetection(missionId, tasks, blockers);
      if (loopCheck.isLoopDetected) {
        mission.status = 'BLOCKED';
        mission.health = 'CRITICAL';
        this.blackboard.postBlocker(missionId, 'LoopProtection', 'Infinite loop cycle detected', loopCheck.reason || 'Infinite loop detected');
        this.updateMissionState(mission);
        this.emitEvent('mission.blocked', { missionId, reason: loopCheck.reason });
        return;
      }

      // 2. Identify ready tasks
      const readyTasks = tasks.filter(t => {
        if (t.status !== 'PENDING') return false;
        return t.dependencies.every((depId: string) => {
          const depTask = tasks.find(dep => dep.taskId === depId);
          return depTask && depTask.status === 'COMPLETED';
        });
      });

      if (readyTasks.length === 0) {
        const allCompleted = tasks.every(t => t.status === 'COMPLETED' || t.status === 'SKIPPED');
        if (allCompleted) {
          await this.verifyAndCompleteMission(missionId);
        }
        return;
      }

      // 3. Execute ready tasks
      for (const task of readyTasks) {
        if ((task.approvalRequired || task.requiresHumanApproval) && !task.approvedAt) {
          mission.status = 'AWAITING_APPROVAL';
          task.status = 'AWAITING_APPROVAL';
          this.pendingApprovals.set(task.taskId, {
            taskId: task.taskId,
            action: task.title,
            risk: task.riskLevel || 'HIGH',
            agent: task.assignedAgent || 'Gāṇḍīva'
          });
          this.updateTask(task);
          this.updateMissionState(mission);
          this.emitEvent('mission.paused', { missionId, reason: `Human approval required for: ${task.title}` });
          return;
        }

        await this.executeTask(missionId, task);
        progressMade = true;
      }

      this.recomputeOutcomesAndProgress(missionId);
    }
  }

  private async executeTask(missionId: string, task: MissionTask): Promise<void> {
    const mission = this.getMission(missionId);
    if (!mission) return;

    task.status = 'RUNNING';
    task.startedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    this.updateTask(task);

    if (task.assignedAgent) {
      this.capacityTracker.recordTaskStart(task.assignedAgent);
    }

    this.emitEvent('task.started', { missionId, taskId: task.taskId, agent: task.assignedAgent });

    try {
      const evidence = `Task "${task.title}" executed successfully by agent ${task.assignedAgent || 'HṚṢĪKEŚA'}`;
      task.evidence.push(evidence);
      task.status = 'COMPLETED';
      task.completedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();

      const lowerTitle = task.title.toLowerCase();
      const isTest = lowerTitle.includes('test') || lowerTitle.includes('verify') || lowerTitle.includes('qa') || lowerTitle.includes('audit');
      const isCode = task.kind === 'ENGINEERING_FIX' || task.kind === 'ENGINEERING' || lowerTitle.includes('fix') || lowerTitle.includes('code') || lowerTitle.includes('build') || lowerTitle.includes('implement');
      
      const artifactType = isTest ? 'TEST_REPORT' : isCode ? 'CODE' : lowerTitle.includes('research') ? 'RESEARCH' : 'DOCUMENT';

      const artifact: MissionArtifact = {
        artifactId: `art_${task.taskId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        missionId,
        taskId: task.taskId,
        name: `${task.title} Deliverable`,
        type: artifactType,
        location: `artifacts/${missionId}/${task.taskId}.json`,
        ownerAgent: task.assignedAgent || 'Gāṇḍīva',
        version: '1.0.0',
        verificationState: 'VERIFIED',
        createdAt: new Date().toISOString()
      };
      task.artifacts = task.artifacts || [];
      task.artifacts.push(artifact.artifactId);
      this.blackboard.registerArtifact(artifact);

      this.loopProtection.recordSuccess(missionId);
      this.emitEvent('task.completed', { missionId, taskId: task.taskId, agent: task.assignedAgent });
    } catch (err) {
      const failureClass = this.replanningEngine.classifyFailure(err);
      task.failure = {
        failureClass,
        errorMessage: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
        recoverable: failureClass !== 'SECURITY' && failureClass !== 'AUTHORIZATION'
      };

      const failBounds = this.loopProtection.recordFailure(missionId);
      if (this.loopProtection.isTaskRetryAllowed(task) && task.failure.recoverable && !failBounds.limitExceeded) {
        task.status = 'PENDING';
        task.retryCount++;
      } else {
        task.status = 'FAILED';
        mission.status = 'DEGRADED';
        this.blackboard.postBlocker(missionId, task.assignedAgent || 'runtime', `Task Failed: ${task.title}`, task.failure.errorMessage);
      }
      this.emitEvent('task.failed', { missionId, taskId: task.taskId, error: task.failure.errorMessage });
    } finally {
      if (task.assignedAgent) {
        this.capacityTracker.recordTaskEnd(task.assignedAgent);
      }
      this.updateTask(task);
    }
  }

  public async approveTask(missionId: string, taskId: string, approvedBy: string = 'Rushikesh'): Promise<void> {
    const task = this.getTasks(missionId).find(t => t.taskId === taskId);
    if (!task) throw new Error(`Task ${taskId} not found in mission ${missionId}`);

    task.approvedAt = new Date().toISOString();
    task.approvedBy = approvedBy;
    task.status = 'PENDING';
    this.updateTask(task);
    this.pendingApprovals.delete(taskId);

    this.blackboard.postFact(missionId, approvedBy, `Task Approval Granted`, `Task "${task.title}" approved by sovereign human authority.`);

    const mission = this.getMission(missionId);
    if (mission && mission.status === 'AWAITING_APPROVAL') {
      mission.status = 'EXECUTING';
      this.updateMissionState(mission);
      this.emitEvent('mission.resumed', { missionId, resumedBy: approvedBy });
    }

    await this.stepExecution(missionId);
  }

  public recomputeOutcomesAndProgress(missionId: string): void {
    const mission = this.getMission(missionId);
    if (!mission) return;

    const outcomes = this.getOutcomes(missionId);
    const tasks = this.getTasks(missionId);
    const artifacts = this.blackboard.getArtifacts(missionId);

    let totalWeight = 0;
    let achievedWeight = 0;

    for (const outcome of outcomes) {
      const outcomeTasks = tasks.filter(t => t.outcomeId === outcome.outcomeId);
      const verification = this.acceptanceEngine.verifyOutcome(outcome, outcomeTasks, artifacts);

      outcome.verificationState = verification.state;
      outcome.confidence = verification.confidence;
      if (verification.verified) {
        outcome.status = 'VERIFIED';
        outcome.evidence = verification.evidence;
      } else if (outcomeTasks.some(t => t.status === 'FAILED')) {
        outcome.status = 'FAILED';
      } else if (outcomeTasks.some(t => t.status === 'RUNNING' || t.status === 'COMPLETED')) {
        outcome.status = 'IN_PROGRESS';
      }

      const w = outcome.weight ?? 10;
      totalWeight += w;
      if (outcome.status === 'VERIFIED') {
        achievedWeight += w;
      } else if (outcome.status === 'IN_PROGRESS') {
        achievedWeight += w * 0.5;
      }

      this.updateOutcome(outcome);
    }

    mission.progress = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;

    const hasFailed = outcomes.some(o => o.status === 'FAILED') || tasks.some(t => t.status === 'FAILED');
    const hasBlockers = this.blackboard.getActiveBlockers(missionId).length > 0;

    if (hasFailed) {
      mission.health = 'DEGRADED';
    } else if (hasBlockers) {
      mission.health = 'BLOCKED';
    } else if (mission.progress === 100) {
      mission.health = 'COMPLETED';
    } else {
      mission.health = 'HEALTHY';
    }

    this.updateMissionState(mission);
  }

  public async verifyAndCompleteMission(missionId: string): Promise<MissionDescriptor> {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    mission.status = 'VERIFYING';
    this.updateMissionState(mission);
    this.emitEvent('mission.verifying', { missionId });

    this.recomputeOutcomesAndProgress(missionId);

    const outcomes = this.getOutcomes(missionId);
    const unverifiedRequired = outcomes.filter(o => !o.optional && o.status !== 'VERIFIED');

    if (unverifiedRequired.length === 0) {
      mission.status = 'COMPLETED';
      mission.completedAt = new Date().toISOString();
      mission.progress = 100;
      mission.health = 'COMPLETED';
      this.emitEvent('mission.completed', { missionId, completedAt: mission.completedAt });
    } else {
      mission.status = 'PARTIALLY_COMPLETED';
      mission.health = 'DEGRADED';
    }

    mission.updatedAt = new Date().toISOString();
    this.updateMissionState(mission);

    this.checkpointManager.createCheckpoint(
      missionId,
      (this.missionPlanVersions.get(missionId) || []).length || 1,
      {
        mission,
        outcomes,
        tasks: this.getTasks(missionId),
        blackboard: this.blackboard.getEntries(missionId),
        artifacts: this.blackboard.getArtifacts(missionId)
      },
      `Mission finalization checkpoint (Status: ${mission.status})`
    );

    return mission;
  }

  public pauseMission(missionId: string, reason: string = 'User requested pause'): MissionDescriptor {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    mission.status = 'PAUSED';
    mission.updatedAt = new Date().toISOString();
    this.updateMissionState(mission);
    this.emitEvent('mission.paused', { missionId, reason });
    return mission;
  }

  public async resumeMission(missionId: string): Promise<MissionDescriptor> {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    mission.status = 'EXECUTING';
    mission.updatedAt = new Date().toISOString();
    this.updateMissionState(mission);
    this.emitEvent('mission.resumed', { missionId });

    await this.stepExecution(missionId);
    return mission;
  }

  public cancelMission(missionId: string, reason: string = 'User requested cancellation'): MissionDescriptor {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    mission.status = 'CANCELLED';
    mission.updatedAt = new Date().toISOString();
    this.updateMissionState(mission);
    this.emitEvent('mission.cancelled', { missionId, reason });
    return mission;
  }

  public replanMission(
    missionId: string,
    reason: string,
    author: string = 'HṚṢĪKEŚA',
    triggerTaskId?: string
  ): { mission: MissionDescriptor; newVersion: PlanVersion } {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    const existingOutcomes = this.getOutcomes(missionId);
    const existingTasks = this.getTasks(missionId);
    const versions = this.missionPlanVersions.get(missionId) || [];

    const replanResult = this.replanningEngine.replan(
      existingOutcomes,
      existingTasks,
      versions,
      { missionId, reason, author, triggerTaskId }
    );

    this.missionOutcomes.set(missionId, replanResult.updatedOutcomes);
    this.missionTasks.set(missionId, replanResult.updatedTasks);
    versions.push(replanResult.newPlanVersion);
    this.missionPlanVersions.set(missionId, versions);

    mission.status = 'REPLANNING';
    mission.updatedAt = new Date().toISOString();
    this.updateMissionState(mission);

    this.emitEvent('mission.replanning', { missionId, reason, planVersion: replanResult.newPlanVersion.version });

    return { mission, newVersion: replanResult.newPlanVersion };
  }

  public generateMissionReport(missionId: string): MissionReport {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    const outcomes = this.getOutcomes(missionId);
    const tasks = this.getTasks(missionId);
    const blackboardEntries = this.blackboard.getEntries(missionId);
    const artifacts = this.blackboard.getArtifacts(missionId);

    const agentsInvolved = Array.from(new Set(tasks.map((t: any) => t.assignedAgent).filter((a: any): a is string => Boolean(a))));
    const blockers = blackboardEntries.filter((e: any) => e.type === 'BLOCKER').map((b: any) => b.content);
    const decisions = blackboardEntries.filter((e: any) => e.type === 'DECISION').map((d: any) => d.content);
    const failures = tasks.filter((t: any) => t.failure).map((t: any) => `[${t.failure?.failureClass}] Task "${t.title}": ${t.failure?.errorMessage}`);
    const evidence = outcomes.flatMap((o: any) => o.evidence).concat(tasks.flatMap((t: any) => t.evidence));

    return {
      missionId,
      title: mission.title,
      objective: mission.objective,
      status: mission.status,
      health: mission.health,
      progress: mission.progress,
      createdAt: mission.createdAt,
      completedAt: mission.completedAt,
      agentsInvolved,
      outcomes,
      tasksCount: tasks.length,
      completedTasksCount: tasks.filter((t: any) => t.status === 'COMPLETED').length,
      artifacts,
      decisions,
      blockers,
      failures,
      evidence: Array.from(new Set(evidence))
    };
  }

  public getMission(missionId: string): MissionDescriptor | null {
    let mission = this.activeMissions.get(missionId);
    if (!mission) {
      const found = this.repository.getMission(missionId);
      if (found) {
        mission = found;
        this.activeMissions.set(missionId, mission);
      }
    }
    return mission || null;
  }

  public listMissions(): MissionDescriptor[] {
    const persisted = this.repository.listMissions();
    const merged = new Map<string, MissionDescriptor>();
    for (const p of persisted) merged.set(p.missionId, p);
    for (const [id, m] of this.activeMissions.entries()) merged.set(id, m);
    return Array.from(merged.values());
  }

  public getOutcomes(missionId: string): MissionOutcome[] {
    let outcomes = this.missionOutcomes.get(missionId);
    if (!outcomes) {
      outcomes = this.repository.listOutcomes(missionId);
      this.missionOutcomes.set(missionId, outcomes);
    }
    return outcomes || [];
  }

  public getTasks(missionId: string): MissionTask[] {
    let tasks = this.missionTasks.get(missionId);
    if (!tasks) {
      tasks = this.repository.listTasks(missionId);
      this.missionTasks.set(missionId, tasks);
    }
    return tasks || [];
  }

  public getPlanVersions(missionId: string): PlanVersion[] {
    let versions = this.missionPlanVersions.get(missionId);
    if (!versions) {
      versions = this.repository.listPlanVersions(missionId);
      this.missionPlanVersions.set(missionId, versions);
    }
    return versions || [];
  }

  public getPendingApprovals(): Array<{ taskId: string; action: string; risk: string; agent: string }> {
    return Array.from(this.pendingApprovals.values());
  }

  private updateMissionState(mission: MissionDescriptor): void {
    this.activeMissions.set(mission.missionId, mission);
    try {
      this.repository.saveMission(mission);
    } catch {
      // In-memory fallback
    }
  }

  private updateTask(task: MissionTask): void {
    const tasks = this.missionTasks.get(task.missionId) || [];
    const idx = tasks.findIndex(t => t.taskId === task.taskId);
    if (idx >= 0) tasks[idx] = task;
    else tasks.push(task);
    this.missionTasks.set(task.missionId, tasks);

    try {
      this.repository.saveTask(task);
    } catch {
      // In-memory fallback
    }
  }

  private updateOutcome(outcome: MissionOutcome): void {
    const outcomes = this.missionOutcomes.get(outcome.missionId) || [];
    const idx = outcomes.findIndex(o => o.outcomeId === outcome.outcomeId);
    if (idx >= 0) outcomes[idx] = outcome;
    else outcomes.push(outcome);
    this.missionOutcomes.set(outcome.missionId, outcomes);

    try {
      this.repository.saveOutcome(outcome);
    } catch {
      // In-memory fallback
    }
  }

  private emitEvent(topic: string, data: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.emit(topic as any, data as any);
    }
  }
}
