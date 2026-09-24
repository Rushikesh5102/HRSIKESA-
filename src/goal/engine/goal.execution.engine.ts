/**
 * HṚṢĪKEŚA (हृषīकेश) — Goal Execution Engine
 *
 * The autonomous execution loop for Phase 15.
 * Orchestrates: Goal → Milestone → Mission (existing) → Verification → Report
 *
 * Lifecycle:
 *   1. Load goal + company/project context
 *   2. Validate constraints + budget
 *   3. Generate plan (GoalPlanner)
 *   4. Validate plan
 *   5. Decompose into milestones (GoalDecomposer)
 *   6. Create missions via existing MissionOrchestrator
 *   7. Check approval requirements → AWAITING_APPROVAL if needed
 *   8. Execute eligible milestones
 *   9. Observe mission results
 *  10. Evaluate milestone completion
 *  11. Recover failed work (bounded replanning)
 *  12. Continue until all milestones done or budget exhausted
 *  13. Independent verification (GoalVerifier)
 *  14. Mark COMPLETED only after verification passes
 *  15. Generate evidence-backed GoalReport
 *
 * Security:
 *   - Never bypasses ToolExecutionBus or PermissionManager
 *   - Approval gates inherited from existing HITL infrastructure
 *   - Budget limits enforced at each step
 *   - Max replan limit prevents infinite loops
 *   - Completed milestones never re-executed
 */

import { randomUUID } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { GoalRepository } from '../../persistence/repositories/goal.repository.js';
import { MilestoneRepository } from '../../persistence/repositories/milestone.repository.js';
import { MissionRepository } from '../../persistence/repositories/mission.repository.js';
import { MissionOrchestrator } from '../../agents/mission/mission.orchestrator.js';
import { GoalPlanner, GoalPlanRequest } from '../planner/goal.planner.js';
import { GoalDecomposer } from '../decomposer/goal.decomposer.js';
import { GoalVerifier } from '../verification/goal.verifier.js';
import {
  IGoal,
  IGoalMilestone,
  GoalStatus,
  GoalBudget,
  GoalBudgetTracker,
  GoalReport,
  GoalProgress,
  DEFAULT_GOAL_BUDGET,
  GoalPlan
} from '../interfaces/goal.types.js';

export interface CreateGoalRequest {
  readonly title: string;
  readonly description?: string;
  readonly objective: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly productId?: string;
  readonly priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  readonly deadline?: string;
  readonly budget?: Partial<GoalBudget>;
  readonly constraints?: string[];
  readonly successCriteria?: string[];
  readonly failureCriteria?: string[];
  readonly verificationPlan?: string;
  readonly createdBy?: string;
}

export class GoalExecutionEngine {
  private readonly goalRepo: GoalRepository;
  private readonly milestoneRepo: MilestoneRepository;
  private readonly missionRepo: MissionRepository;
  private readonly orchestrator: MissionOrchestrator;
  private readonly planner: GoalPlanner;
  private readonly decomposer: GoalDecomposer;
  private readonly verifier: GoalVerifier;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  // In-memory tracker of active budget usage per goal
  private readonly budgetTrackers = new Map<string, GoalBudgetTracker>();
  private isShuttingDown = false;

  constructor(
    goalRepo: GoalRepository,
    milestoneRepo: MilestoneRepository,
    missionRepo: MissionRepository,
    orchestrator: MissionOrchestrator,
    planner: GoalPlanner,
    decomposer: GoalDecomposer,
    verifier: GoalVerifier,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.goalRepo = goalRepo;
    this.milestoneRepo = milestoneRepo;
    this.missionRepo = missionRepo;
    this.orchestrator = orchestrator;
    this.planner = planner;
    this.decomposer = decomposer;
    this.verifier = verifier;
    this.eventBus = eventBus;
    this.logger = logger?.child('GoalExecutionEngine');
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  public shutdown(): void {
    this.isShuttingDown = true;
    this.logger?.info('GoalExecutionEngine shutting down.');
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  public createGoal(request: CreateGoalRequest): IGoal {
    const budget: GoalBudget = {
      ...DEFAULT_GOAL_BUDGET,
      ...(request.budget ?? {})
    };

    const now = new Date().toISOString();
    const goal: IGoal = {
      id: randomUUID(),
      companyId: request.companyId ?? null,
      projectId: request.projectId ?? null,
      productId: request.productId ?? null,
      parentGoalId: null,
      title: request.title,
      description: request.description,
      objective: request.objective,
      status: 'DRAFT',
      priority: request.priority ?? 'NORMAL',
      deadline: request.deadline ?? null,
      budget,
      constraints: request.constraints,
      successCriteria: request.successCriteria,
      failureCriteria: request.failureCriteria,
      verificationPlan: request.verificationPlan,
      createdBy: request.createdBy ?? 'rushikesh',
      createdAt: now,
      updatedAt: now
    };

    this.goalRepo.create(goal);

    this.emit('goal.created', {
      goalId: goal.id,
      title: goal.title,
      priority: goal.priority
    });

    this.logger?.info(`Goal created: '${goal.id}' — "${goal.title}"`);
    return goal;
  }

  public getGoal(id: string): IGoal | undefined {
    return this.goalRepo.get(id);
  }

  public listGoals(opts: Parameters<GoalRepository['list']>[0] = {}): IGoal[] {
    return this.goalRepo.list(opts);
  }

  // ---------------------------------------------------------------------------
  // PLAN
  // ---------------------------------------------------------------------------

  public async planGoal(goalId: string): Promise<IGoal> {
    const goal = this.requireGoal(goalId);

    if (goal.status !== 'DRAFT' && goal.status !== 'FAILED' && goal.status !== 'PLANNED') {
      throw new Error(`Cannot plan goal in status '${goal.status}'. Only DRAFT, FAILED, or PLANNED goals can be (re)planned.`);
    }

    // Transition to ANALYZING
    this.updateGoalStatus(goalId, 'ANALYZING');

    try {
      // Build the plan request
      const planRequest: GoalPlanRequest = {
        goalId,
        objective: goal.objective,
        description: goal.description,
        companyId: goal.companyId,
        projectId: goal.projectId,
        constraints: goal.constraints,
        successCriteria: goal.successCriteria,
        budget: goal.budget
      };

      const { plan, modelCallsUsed } = await this.planner.plan(planRequest);

      this.logger?.info(`Goal '${goalId}' planned: ${plan.milestones.length} milestones, ${modelCallsUsed} model calls`);

      // Decompose into milestones
      const { milestones } = this.decomposer.decompose(
        goalId,
        plan,
        goal.budget,
        { companyId: goal.companyId, projectId: goal.projectId, productId: goal.productId }
      );

      // Persist milestones (remove any previous ones if re-planning)
      this.milestoneRepo.deleteByGoal(goalId);
      for (const milestone of milestones) {
        this.milestoneRepo.create(milestone);
      }

      // Save plan and transition to PLANNED
      this.goalRepo.update(goalId, { status: 'PLANNED', plan });

      this.emit('goal.planned', {
        goalId,
        milestonesCount: milestones.length,
        riskLevel: plan.riskLevel,
        approvalRequired: plan.approvalPoints.length > 0
      });

      return this.goalRepo.get(goalId)!;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error(`Goal '${goalId}' planning failed: ${msg}`);
      this.goalRepo.update(goalId, { status: 'FAILED', blockedReason: `Planning failed: ${msg}` });
      this.emit('goal.failed', { goalId, reason: msg });
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // START EXECUTION
  // ---------------------------------------------------------------------------

  public async startGoal(goalId: string): Promise<void> {
    const goal = this.requireGoal(goalId);

    if (goal.status !== 'PLANNED' && goal.status !== 'PAUSED') {
      throw new Error(`Cannot start goal in status '${goal.status}'. Only PLANNED or PAUSED goals can be started.`);
    }

    const milestones = this.milestoneRepo.listByGoal(goalId);
    if (milestones.length === 0) {
      throw new Error(`Goal '${goalId}' has no milestones. Run /plan first.`);
    }

    // Check approval requirements
    const approvalMilestones = milestones.filter(m => {
      const spec = goal.plan?.milestones.find(s => s.id === m.id);
      return spec?.requiresApproval && m.status === 'PENDING';
    });

    if (approvalMilestones.length > 0 && goal.status !== 'PAUSED') {
      this.goalRepo.update(goalId, {
        status: 'AWAITING_APPROVAL',
        blockedReason: `${approvalMilestones.length} milestone(s) require human approval: ${approvalMilestones.map(m => m.title).join(', ')}`
      });
      this.emit('goal.awaiting_approval', { goalId, count: approvalMilestones.length });
      return;
    }

    this.updateGoalStatus(goalId, 'EXECUTING');
    this.emit('goal.started', { goalId });

    // Initialize budget tracker
    const tracker = new GoalBudgetTracker(goal.budget);
    this.budgetTrackers.set(goalId, tracker);

    // Execute in background (non-blocking for API response)
    this.executeLoop(goalId, tracker).catch(err => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error(`Goal '${goalId}' execution loop crashed: ${msg}`);
      this.goalRepo.update(goalId, { status: 'FAILED', blockedReason: msg });
      this.emit('goal.failed', { goalId, reason: msg });
    });
  }

  /**
   * Run goal execution loop synchronously until terminal state or approval blocker.
   */
  public async runGoalToCompletion(goalId: string): Promise<IGoal> {
    const goal = this.requireGoal(goalId);

    if (goal.status !== 'PLANNED' && goal.status !== 'PAUSED') {
      throw new Error(`Cannot run goal in status '${goal.status}'. Only PLANNED or PAUSED goals can be started.`);
    }

    const milestones = this.milestoneRepo.listByGoal(goalId);
    if (milestones.length === 0) {
      throw new Error(`Goal '${goalId}' has no milestones. Run /plan first.`);
    }

    // Check approval requirements
    const approvalMilestones = milestones.filter(m => {
      const spec = goal.plan?.milestones.find(s => s.id === m.id);
      return spec?.requiresApproval && m.status === 'PENDING';
    });

    if (approvalMilestones.length > 0 && goal.status !== 'PAUSED') {
      this.goalRepo.update(goalId, {
        status: 'AWAITING_APPROVAL',
        blockedReason: `${approvalMilestones.length} milestone(s) require human approval: ${approvalMilestones.map(m => m.title).join(', ')}`
      });
      this.emit('goal.awaiting_approval', { goalId, count: approvalMilestones.length });
      return this.goalRepo.get(goalId)!;
    }

    this.updateGoalStatus(goalId, 'EXECUTING');
    this.emit('goal.started', { goalId });

    const tracker = new GoalBudgetTracker(goal.budget);
    this.budgetTrackers.set(goalId, tracker);

    await this.executeLoop(goalId, tracker);
    return this.goalRepo.get(goalId)!;
  }

  // ---------------------------------------------------------------------------
  // EXECUTION LOOP
  // ---------------------------------------------------------------------------

  private async executeLoop(goalId: string, tracker: GoalBudgetTracker): Promise<void> {
    const startMs = Date.now();

    try {
      // Execute milestones in sequence order
      const allMilestones = this.milestoneRepo.listByGoal(goalId);
      const pendingMilestones = allMilestones
        .filter(m => m.status === 'PENDING' || m.status === 'READY')
        .sort((a, b) => a.sequence - b.sequence);

      for (const milestone of pendingMilestones) {
        if (this.isShuttingDown) {
          this.logger?.info(`Engine shutting down — aborting loop for goal '${goalId}'`);
          return;
        }

        const goal = this.goalRepo.get(goalId);
        if (!goal) break;

        // Stop if goal was cancelled or paused externally
        if (goal.status === 'CANCELLED' || goal.status === 'PAUSED') {
          this.logger?.info(`Goal '${goalId}' ${goal.status.toLowerCase()} — stopping execution loop.`);
          return;
        }

        // Check time budget
        if (Date.now() - startMs > goal.budget.maxExecutionTimeMs) {
          this.goalRepo.update(goalId, {
            status: 'FAILED',
            blockedReason: `Goal execution time exceeded maximum (${goal.budget.maxExecutionTimeMs}ms).`
          });
          this.emit('goal.failed', { goalId, reason: 'Execution time budget exceeded.' });
          return;
        }

        // Execute this milestone
        await this.executeMilestone(goalId, milestone, tracker);

        // Re-read to get current status
        const updated = this.milestoneRepo.get(milestone.id);
        if (updated?.status === 'FAILED') {
          // Attempt bounded replanning
          const shouldFail = await this.attemptRecovery(goalId, milestone, tracker);
          if (shouldFail) return;
        }
      }

      // All milestones processed — run verification
      const goal = this.goalRepo.get(goalId);
      if (!goal || goal.status === 'CANCELLED') return;

      this.updateGoalStatus(goalId, 'VERIFYING');
      this.emit('goal.verifying', { goalId });

      const verificationResult = await this.verifier.verify(goal);
      const executionTimeMs = Date.now() - startMs;

      // Build final report
      const finalMilestones = this.milestoneRepo.listByGoal(goalId);
      const report = this.buildReport(goal, finalMilestones, verificationResult, tracker, executionTimeMs);

      if (verificationResult.verified) {
        this.goalRepo.update(goalId, {
          status: 'COMPLETED',
          verificationResult,
          report
        });
        this.emit('goal.completed', { goalId, executionTimeMs });
        this.logger?.info(`✅ Goal '${goalId}' COMPLETED and verified in ${executionTimeMs}ms`);
      } else {
        const failureReason = `Verification failed: ${verificationResult.failedCriteria.join('; ')}`;
        this.goalRepo.update(goalId, {
          status: 'FAILED',
          verificationResult,
          report,
          blockedReason: failureReason
        });
        this.emit('goal.failed', { goalId, reason: failureReason });
        this.logger?.warn(`❌ Goal '${goalId}' FAILED verification: ${failureReason}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.goalRepo.update(goalId, { status: 'FAILED', blockedReason: msg });
      this.emit('goal.failed', { goalId, reason: msg });
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // MILESTONE EXECUTION
  // ---------------------------------------------------------------------------

  private async executeMilestone(
    goalId: string,
    milestone: IGoalMilestone,
    tracker: GoalBudgetTracker
  ): Promise<void> {
    this.logger?.info(`Executing milestone '${milestone.title}' (seq ${milestone.sequence})`);

    // Mark EXECUTING
    this.milestoneRepo.update(milestone.id, { status: 'EXECUTING' });
    this.emit('milestone.started', { goalId, milestoneId: milestone.id, title: milestone.title });

    try {
      tracker.recordMissionCreated();
    } catch (budgetErr) {
      const msg = budgetErr instanceof Error ? budgetErr.message : String(budgetErr);
      this.milestoneRepo.update(milestone.id, { status: 'FAILED' });
      this.goalRepo.update(goalId, { status: 'FAILED', blockedReason: msg });
      this.emit('goal.failed', { goalId, reason: msg });
      return;
    }

    // Get goal to retrieve plan for this milestone
    const goal = this.goalRepo.get(goalId);
    const plan = goal?.plan;

    // Build mission options using GoalDecomposer logic
    const { missionSpecs } = this.decomposer.decompose(
      goalId,
      plan ?? {
        interpretation: milestone.title,
        assumptions: [],
        constraints: [],
        requiredDepartments: [],
        milestones: [{
          id: milestone.id,
          title: milestone.title,
          description: milestone.description ?? '',
          sequence: milestone.sequence,
          requiredAgentIds: milestone.requiredAgentIds ? [...milestone.requiredAgentIds] : ['gandiva'],
          requiredCapabilities: milestone.requiredCapabilities ? [...milestone.requiredCapabilities] : [],
          successCriteria: milestone.successCriteria ? [...milestone.successCriteria] : [],
          verificationCriteria: milestone.verificationCriteria ? [...milestone.verificationCriteria] : [],
          missionObjective: milestone.title,
          requiresApproval: false
        }],
        approvalPoints: [],
        stoppingConditions: [],
        estimatedModelCalls: 2,
        riskLevel: 'low',
        createdAt: new Date().toISOString(),
        source: 'deterministic'
      },
      goal?.budget ?? DEFAULT_GOAL_BUDGET,
      {
        companyId: goal?.companyId,
        projectId: goal?.projectId,
        productId: goal?.productId
      }
    );

    const missionSpec = missionSpecs.find(s => s.milestoneId === milestone.id) ?? missionSpecs[0];
    if (!missionSpec) {
      this.milestoneRepo.update(milestone.id, { status: 'FAILED' });
      this.logger?.error(`No mission spec generated for milestone '${milestone.id}'`);
      return;
    }

    try {
      // Create and run mission through the EXISTING MissionOrchestrator
      const createdMission = await this.orchestrator.planAndCreateMission({
        ...missionSpec.createOptions,
        inputs: {
          goalId,
          milestoneId: milestone.id,
          milestoneTitle: milestone.title
        }
      });
      const missionResult = await this.orchestrator.executeMission(createdMission.id);

      // Link mission to milestone
      this.milestoneRepo.update(milestone.id, { missionId: missionResult.missionId });

      if (missionResult.status === 'completed') {
        this.milestoneRepo.update(milestone.id, { status: 'COMPLETED' });
        this.emit('milestone.completed', { goalId, milestoneId: milestone.id, title: milestone.title, missionId: missionResult.missionId });
        this.logger?.info(`Milestone '${milestone.title}' completed (mission: ${missionResult.missionId})`);
      } else if (missionResult.status === 'blocked') {
        this.milestoneRepo.update(milestone.id, { status: 'BLOCKED' });
        this.emit('milestone.blocked', { goalId, milestoneId: milestone.id, title: milestone.title, reason: missionResult.summary });
        this.logger?.warn(`Milestone '${milestone.title}' BLOCKED (requires approval or intervention)`);
        // Pause the goal execution for HITL
        this.goalRepo.update(goalId, {
          status: 'AWAITING_APPROVAL',
          blockedReason: `Milestone '${milestone.title}' blocked: ${missionResult.summary}`
        });
        this.emit('goal.awaiting_approval', { goalId, reason: missionResult.summary });
      } else {
        // Mission failed
        this.milestoneRepo.update(milestone.id, { status: 'FAILED' });
        this.logger?.warn(`Milestone '${milestone.title}' FAILED (mission status: ${missionResult.status})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.milestoneRepo.update(milestone.id, { status: 'FAILED' });
      this.logger?.error(`Milestone '${milestone.title}' threw: ${msg}`);
    }
  }

  // ---------------------------------------------------------------------------
  // BOUNDED REPLANNING
  // ---------------------------------------------------------------------------

  private async attemptRecovery(
    goalId: string,
    failedMilestone: IGoalMilestone,
    tracker: GoalBudgetTracker
  ): Promise<boolean> {
    const remainingReplans = tracker.getRemainingReplans();
    this.logger?.warn(`Milestone '${failedMilestone.title}' failed. Remaining replans: ${remainingReplans}`);

    if (remainingReplans <= 0) {
      const reason = `Max replans (${tracker.getReplanCount()}/${tracker.getRemainingReplans() + tracker.getReplanCount()}) exhausted after milestone '${failedMilestone.title}' failed.`;
      this.goalRepo.update(goalId, { status: 'FAILED', blockedReason: reason });
      this.emit('goal.failed', { goalId, reason });
      return true; // shouldFail
    }

    try {
      tracker.recordReplan();
    } catch {
      const reason = 'Replan budget exhausted.';
      this.goalRepo.update(goalId, { status: 'FAILED', blockedReason: reason });
      this.emit('goal.failed', { goalId, reason });
      return true;
    }

    this.emit('goal.replanned', {
      goalId,
      failedMilestone: failedMilestone.title,
      replansUsed: tracker.getReplanCount()
    });

    // Reset the failed milestone for retry (bounded)
    this.milestoneRepo.update(failedMilestone.id, { status: 'READY', missionId: null });
    this.logger?.info(`Goal '${goalId}' replanning (attempt ${tracker.getReplanCount()}): retrying milestone '${failedMilestone.title}'`);

    // Retry the milestone once
    await this.executeMilestone(goalId, failedMilestone, tracker);
    return false; // don't fail — continue loop
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE CONTROLS
  // ---------------------------------------------------------------------------

  public pauseGoal(goalId: string): IGoal {
    const goal = this.requireGoal(goalId);
    if (goal.status !== 'EXECUTING' && goal.status !== 'PLANNED') {
      throw new Error(`Cannot pause goal in status '${goal.status}'.`);
    }
    this.goalRepo.update(goalId, { status: 'PAUSED' });
    this.emit('goal.paused', { goalId });
    return this.goalRepo.get(goalId)!;
  }

  public resumeGoal(goalId: string): IGoal {
    const goal = this.requireGoal(goalId);
    if (goal.status !== 'PAUSED' && goal.status !== 'AWAITING_APPROVAL') {
      throw new Error(`Cannot resume goal in status '${goal.status}'.`);
    }
    // Re-start execution — start will handle the transition
    this.startGoal(goalId).catch(err => {
      this.logger?.error(`Resume failed for goal '${goalId}': ${err}`);
    });
    return this.goalRepo.get(goalId)!;
  }

  public cancelGoal(goalId: string, reason?: string): IGoal {
    const goal = this.requireGoal(goalId);
    if (goal.status === 'COMPLETED' || goal.status === 'CANCELLED') {
      throw new Error(`Goal '${goalId}' is already ${goal.status}.`);
    }
    this.goalRepo.update(goalId, { status: 'CANCELLED', blockedReason: reason || 'Cancelled by operator.' });

    // Cancel any executing milestones
    const milestones = this.milestoneRepo.listByGoal(goalId);
    for (const m of milestones) {
      if (m.status === 'EXECUTING' || m.status === 'READY') {
        this.milestoneRepo.update(m.id, { status: 'CANCELLED' });
      }
    }

    this.budgetTrackers.delete(goalId);
    this.emit('goal.cancelled', { goalId });
    return this.goalRepo.get(goalId)!;
  }

  public async replanGoal(goalId: string): Promise<IGoal> {
    const goal = this.requireGoal(goalId);
    if (goal.status !== 'BLOCKED' && goal.status !== 'FAILED' && goal.status !== 'PAUSED' && goal.status !== 'CANCELLED') {
      throw new Error(`Cannot replan goal in status '${goal.status}'. Only BLOCKED, FAILED, PAUSED, or CANCELLED goals can be replanned.`);
    }
    // Reset to DRAFT for full replan
    this.goalRepo.update(goalId, { status: 'DRAFT', blockedReason: null });
    return this.planGoal(goalId);
  }

  public async replan(goalId: string, failedMilestoneId?: string, reason?: string): Promise<GoalPlan> {
    const goal = this.requireGoal(goalId);
    if (goal.status !== 'BLOCKED' && goal.status !== 'FAILED' && goal.status !== 'PAUSED' && goal.status !== 'EXECUTING' && goal.status !== 'CANCELLED') {
      throw new Error(`Cannot replan goal in status '${goal.status}'.`);
    }
    if (failedMilestoneId) {
      this.milestoneRepo.update(failedMilestoneId, { status: 'READY', missionId: null });
    }
    this.goalRepo.update(goalId, { status: 'DRAFT', blockedReason: reason ?? null });
    const plannedGoal = await this.planGoal(goalId);
    return plannedGoal.plan!;
  }

  public getMilestones(goalId: string): IGoalMilestone[] {
    return this.milestoneRepo.listByGoal(goalId);
  }

  public getReport(goalId: string): GoalReport | undefined {
    return this.goalRepo.get(goalId)?.report;
  }

  // ---------------------------------------------------------------------------
  // PROGRESS
  // ---------------------------------------------------------------------------

  public getProgress(goalId: string): GoalProgress {
    const goal = this.requireGoal(goalId);
    const milestones = this.milestoneRepo.listByGoal(goalId);
    const tracker = this.budgetTrackers.get(goalId);

    const completed = milestones.filter(m => m.status === 'COMPLETED');
    const failed = milestones.filter(m => m.status === 'FAILED');
    const executing = milestones.find(m => m.status === 'EXECUTING');
    const blockers: string[] = [];

    if (goal.blockedReason) blockers.push(goal.blockedReason);
    milestones
      .filter(m => m.status === 'BLOCKED')
      .forEach(m => blockers.push(`Milestone '${m.title}' blocked`));

    const startTime = new Date(goal.createdAt).getTime();
    const elapsedMs = Date.now() - startTime;

    return {
      goalId,
      status: goal.status,
      priority: goal.priority,
      milestonesTotal: milestones.length,
      milestonesCompleted: completed.length,
      milestonesFailed: failed.length,
      currentMilestoneId: executing?.id,
      currentMilestoneTitle: executing?.title,
      currentMissionId: executing?.missionId ?? undefined,
      blockers,
      pendingApprovals: goal.status === 'AWAITING_APPROVAL' ? 1 : 0,
      elapsedMs,
      budgetUsage: {
        missionsUsed: tracker?.getMissionCount() ?? 0,
        missionsMax: goal.budget.maxMissions,
        modelCallsUsed: tracker?.getModelCalls() ?? 0,
        modelCallsMax: goal.budget.maxModelCalls,
        replansUsed: tracker?.getReplanCount() ?? 0,
        replansMax: goal.budget.maxReplans
      }
    };
  }

  // ---------------------------------------------------------------------------
  // RESTART RECOVERY
  // ---------------------------------------------------------------------------

  /**
   * Recover in-flight goals after a process restart.
   * Inspects EXECUTING/PLANNED/BLOCKED goals and resumes safe work.
   * Never blindly re-executes COMPLETED milestones.
   */
  public async recoverGoalsOnRestart(): Promise<void> {
    const resumable = this.goalRepo.findResumable();
    if (resumable.length === 0) return;

    this.logger?.info(`Restart recovery: ${resumable.length} resumable goal(s) found.`);

    for (const goal of resumable) {
      const milestones = this.milestoneRepo.listByGoal(goal.id);
      const completedCount = milestones.filter(m => m.status === 'COMPLETED').length;
      const pendingCount = milestones.filter(m => m.status === 'PENDING' || m.status === 'READY').length;

      this.logger?.info(
        `  Goal '${goal.id}' ('${goal.title}'): status=${goal.status}, ` +
        `milestones=${completedCount}/${milestones.length} completed, ${pendingCount} pending`
      );

      if (goal.status === 'EXECUTING') {
        // Mark any stale EXECUTING milestones as READY (they were interrupted mid-flight)
        for (const m of milestones.filter(m => m.status === 'EXECUTING')) {
          this.logger?.info(`  Resetting interrupted milestone '${m.title}' to READY`);
          this.milestoneRepo.update(m.id, { status: 'READY' });
        }
        // Resume execution
        this.logger?.info(`  Resuming goal '${goal.id}'`);
        const tracker = new GoalBudgetTracker(goal.budget);
        this.budgetTrackers.set(goal.id, tracker);
        this.executeLoop(goal.id, tracker).catch(err => {
          this.logger?.error(`Recovery execution failed for '${goal.id}': ${err}`);
        });
      } else if (goal.status === 'PLANNED') {
        this.logger?.info(`  Goal '${goal.id}' was PLANNED but not started — awaiting manual start.`);
      } else if (goal.status === 'AWAITING_APPROVAL' || goal.status === 'BLOCKED') {
        this.logger?.info(`  Goal '${goal.id}' is ${goal.status} — awaiting human action.`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private requireGoal(goalId: string): IGoal {
    const goal = this.goalRepo.get(goalId);
    if (!goal) throw new Error(`Goal '${goalId}' not found.`);
    return goal;
  }

  private updateGoalStatus(goalId: string, status: GoalStatus): void {
    this.goalRepo.update(goalId, { status, blockedReason: null });
  }

  private buildReport(
    goal: IGoal,
    milestones: IGoalMilestone[],
    verificationResult: import('../interfaces/goal.types.js').GoalVerificationResult,
    tracker: GoalBudgetTracker,
    executionTimeMs: number
  ): GoalReport {
    const completedMilestones = milestones.filter(m => m.status === 'COMPLETED');
    const failedMilestones = milestones.filter(m => m.status === 'FAILED');

    const missionIds = milestones.filter(m => m.missionId).map(m => m.missionId!);
    const agentsUsed = new Set<string>();
    let totalMissions = 0;
    let completedMissions = 0;
    let failedMissions = 0;

    for (const missionId of missionIds) {
      const mission = this.missionRepo.get(missionId);
      if (!mission) continue;
      totalMissions++;
      if (mission.status === 'completed') completedMissions++;
      if (mission.status === 'failed') failedMissions++;
      if (mission.report?.agentsUsed) {
        for (const a of mission.report.agentsUsed) agentsUsed.add(a);
      }
    }

    return {
      goalId: goal.id,
      title: goal.title,
      status: verificationResult.verified ? 'COMPLETED' : 'FAILED',
      summary: verificationResult.verified
        ? `Goal '${goal.title}' completed and independently verified. All ${completedMilestones.length} milestones passed.`
        : `Goal '${goal.title}' failed verification. ${verificationResult.failedCriteria.length} criteria not met.`,
      milestones: {
        total: milestones.length,
        completed: completedMilestones.length,
        failed: failedMilestones.length,
        skipped: milestones.length - completedMilestones.length - failedMilestones.length
      },
      missions: {
        total: totalMissions,
        completed: completedMissions,
        failed: failedMissions
      },
      agentsUsed: [...agentsUsed],
      toolsUsed: [],
      artifactsCreated: 0,
      verification: verificationResult,
      modelCallsUsed: tracker.getModelCalls(),
      replansUsed: tracker.getReplanCount(),
      executionTimeMs,
      completedAt: new Date().toISOString()
    };
  }

  // Type-safe event emission
  private emit(event: string, payload: Record<string, unknown>): void {
    try {
      this.eventBus?.emit(event as never, payload as never);
    } catch {
      // Event emission must never crash execution
    }
  }
}
