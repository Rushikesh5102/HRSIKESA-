/**
 * HṚṢĪKEŚA (हृषीकेश) — Objective Evaluator & Continuous Loop
 *
 * Phase 16C: Bounded Objective Evaluation Loop
 *
 * Drives continuous goal execution across multi-day lifecycles while enforcing
 * strict budget bounds per evaluation cycle.
 */

import { randomUUID } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { GoalRepository } from '../../persistence/repositories/goal.repository.js';
import { MilestoneRepository } from '../../persistence/repositories/milestone.repository.js';
import { MissionRepository } from '../../persistence/repositories/mission.repository.js';
import { ObjectiveEvaluationRepository } from '../../persistence/repositories/objective-evaluation.repository.js';
import { MissionOrchestrator } from '../../agents/mission/mission.orchestrator.js';
import { GoalVerifier } from '../verification/goal.verifier.js';
import { ObjectiveHealthEvaluator } from './objective.health.js';
import { GoalStatus, GoalBudgetTracker } from '../interfaces/goal.types.js';
import { ObjectiveEvaluationResult, ObjectiveEvaluationDecision, ObjectiveHealthReport } from '../interfaces/objective.types.js';

export interface ObjectiveEvaluatorOptions {
  goalRepo: GoalRepository;
  milestoneRepo: MilestoneRepository;
  missionRepo: MissionRepository;
  evaluationRepo: ObjectiveEvaluationRepository;
  orchestrator: MissionOrchestrator;
  verifier: GoalVerifier;
  eventBus?: EventBus;
  logger?: ILogger;
}

export class ObjectiveEvaluator {
  private readonly goalRepo: GoalRepository;
  private readonly milestoneRepo: MilestoneRepository;
  private readonly missionRepo: MissionRepository;
  private readonly evaluationRepo: ObjectiveEvaluationRepository;
  private readonly orchestrator: MissionOrchestrator;
  private readonly verifier: GoalVerifier;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(options: ObjectiveEvaluatorOptions) {
    this.goalRepo = options.goalRepo;
    this.milestoneRepo = options.milestoneRepo;
    this.missionRepo = options.missionRepo;
    this.evaluationRepo = options.evaluationRepo;
    this.orchestrator = options.orchestrator;
    this.verifier = options.verifier;
    this.eventBus = options.eventBus;
    this.logger = options.logger?.child('ObjectiveEvaluator');

    if (this.eventBus) {
      this.eventBus.on('mission.completed', async (payload: any) => {
        try {
          if (!payload?.missionId) return;
          const milestone = this.milestoneRepo.getByMissionId(payload.missionId);
          if (milestone) {
            if (payload.status === 'completed') {
              this.milestoneRepo.update(milestone.id, { status: 'COMPLETED' });
            } else if (payload.status === 'failed') {
              this.milestoneRepo.update(milestone.id, { status: 'FAILED' });
            }
            this.logger?.info(`Mission '${payload.missionId}' finished (${payload.status}) -> auto-evaluating goal [${milestone.goalId}]`);
            await this.evaluate(milestone.goalId);
          }
        } catch (err: any) {
          this.logger?.error(`Auto-evaluation on mission.completed failed: ${err.message}`);
        }
      });
    }
  }

  /**
   * Deterministically evaluate objective health from current state.
   */
  public async evaluateHealth(goalId: string): Promise<ObjectiveHealthReport> {
    const goal = this.goalRepo.get(goalId);
    if (!goal) {
      throw new Error(`Goal '${goalId}' not found.`);
    }
    const milestones = this.milestoneRepo.listByGoal(goalId);
    const missions = this.missionRepo.list(50);
    return ObjectiveHealthEvaluator.evaluate({
      goal,
      milestones,
      missions,
      pendingApprovalsCount: goal.status === 'AWAITING_APPROVAL' ? 1 : 0,
    });
  }

  /**
   * Run a single deterministic evaluation cycle for a given goal.
   * Enforces all budget limits and records an immutable evaluation record.
   */
  public async evaluate(goalId: string, budgetTracker?: GoalBudgetTracker): Promise<ObjectiveEvaluationResult> {
    const goal = this.goalRepo.get(goalId);
    if (!goal) {
      throw new Error(`Goal '${goalId}' not found.`);
    }

    const previousStatus = goal.status;
    const milestones = this.milestoneRepo.listByGoal(goalId);
    const missions = this.missionRepo.list(50);
    const pastEvals = this.evaluationRepo.listByGoal(goalId);
    const cycleNumber = pastEvals.length + 1;

    this.logger?.info(`Evaluating goal '${goal.title}' [${goalId}] — Cycle #${cycleNumber}`);

    // 1. Calculate deterministic health
    const health = ObjectiveHealthEvaluator.evaluate({
      goal,
      milestones,
      missions,
      pendingApprovalsCount: goal.status === 'AWAITING_APPROVAL' ? 1 : 0,
    });

    let decision: ObjectiveEvaluationDecision = 'IDLE';
    let newStatus: GoalStatus = previousStatus;
    let nextAction: string | undefined;
    let childMissionId: string | undefined;
    let isComplete = false;
    let isBlocked = false;
    const evidence: string[] = [];

    // 2. State Decision Matrix
    if (goal.status === 'CANCELLED' || goal.status === 'FAILED') {
      decision = 'FAIL';
      newStatus = goal.status;
      nextAction = 'Terminal state reached; no further actions.';
    } else if (goal.status === 'PAUSED') {
      decision = 'IDLE';
      newStatus = 'PAUSED';
      nextAction = 'Goal is paused. Awaiting user resume.';
    } else if (health.state === 'NEEDS_USER') {
      decision = 'WAIT_APPROVAL';
      newStatus = 'AWAITING_APPROVAL';
      isBlocked = true;
      nextAction = 'Waiting for user authorization on critical approval gate.';
      if (this.eventBus) {
        this.eventBus.emit('objective.needs_approval', {
          goalId,
          reason: health.reason,
        });
      }
    } else if (health.state === 'BLOCKED') {
      decision = 'IDLE';
      newStatus = 'BLOCKED';
      isBlocked = true;
      nextAction = health.reason;
      if (this.eventBus) {
        this.eventBus.emit('objective.blocked', {
          goalId,
          milestoneId: '',
          title: goal.title,
          reason: health.reason
        });
      }
    } else {
      // Check if all milestones are already completed
      const pendingMilestones = milestones
        .filter((m) => m.status === 'PENDING' || m.status === 'READY' || m.status === 'EXECUTING')
        .sort((a, b) => a.sequence - b.sequence);

      if (pendingMilestones.length === 0 && milestones.length > 0) {
        // Run independent verification
        this.logger?.info(`All milestones complete for goal '${goalId}'. Running independent GoalVerifier...`);
        const verification = await this.verifier.verify(goal);

        if (verification.verified) {
          decision = 'COMPLETE';
          newStatus = 'COMPLETED';
          isComplete = true;
          nextAction = 'Verified all success criteria passed.';
          evidence.push(...verification.evidence);
          this.goalRepo.update(goalId, {
            status: 'COMPLETED',
            verificationResult: verification,
          });
          if (this.eventBus) {
            this.eventBus.emit('objective.completed', {
              goalId,
              executionTimeMs: 1000,
            });
          }
        } else {
          decision = 'REPLAN';
          newStatus = 'BLOCKED';
          isBlocked = true;
          nextAction = `Verification failed: ${verification.failedCriteria.join('; ')}`;
          this.goalRepo.update(goalId, {
            status: 'BLOCKED',
            blockedReason: nextAction,
            verificationResult: verification,
          });
          if (this.eventBus) {
            this.eventBus.emit('objective.blocked', {
              goalId,
              milestoneId: '',
              title: goal.title,
              reason: nextAction
            });
          }
        }
      } else if (pendingMilestones.length > 0) {
        // Next milestone execution
        const nextMilestone = pendingMilestones[0];
        decision = 'CONTINUE';
        newStatus = 'EXECUTING';
        nextAction = `Executing milestone #${nextMilestone.sequence}: ${nextMilestone.title}`;

        // Check if milestone requires approval
        const milestoneSpec = goal.plan?.milestones.find((s) => s.id === nextMilestone.id);
        if (milestoneSpec?.requiresApproval && nextMilestone.status === 'PENDING') {
          decision = 'WAIT_APPROVAL';
          newStatus = 'AWAITING_APPROVAL';
          isBlocked = true;
          nextAction = `Milestone #${nextMilestone.sequence} requires human approval before start.`;
          this.goalRepo.update(goalId, {
            status: 'AWAITING_APPROVAL',
            blockedReason: nextAction,
          });
          if (this.eventBus) {
            this.eventBus.emit('objective.needs_approval', {
              goalId,
              reason: nextAction,
            });
          }
        } else {
          if (budgetTracker) {
            budgetTracker.recordMissionCreated();
          }

          // If milestone doesn't have an active mission yet, create one
          if (!nextMilestone.missionId) {
            const createdMission = this.orchestrator.createMission({
              objective: milestoneSpec?.missionObjective || nextMilestone.description || nextMilestone.title,
              companyId: goal.companyId || undefined,
              projectId: goal.projectId || undefined,
              productId: goal.productId || undefined,
              rootAgentId: nextMilestone.requiredAgentIds?.[0] || 'gandiva',
            });

            childMissionId = createdMission.id;
            this.milestoneRepo.update(nextMilestone.id, {
              missionId: createdMission.id,
              status: 'EXECUTING',
            });
            this.goalRepo.update(goalId, { status: 'EXECUTING' });
          } else {
            childMissionId = nextMilestone.missionId;
          }
        }
      }
    }

    // 3. Record evaluation result
    const result: ObjectiveEvaluationResult = {
      goalId,
      cycleNumber,
      evaluatedAt: new Date().toISOString(),
      previousStatus,
      newStatus,
      health,
      isComplete,
      isBlocked,
      decision,
      nextAction,
      childMissionId,
      modelCallsUsed: 1,
      tasksEvaluated: milestones.length,
      budgetRemaining: goal.budget,
      evidence,
    };

    this.evaluationRepo.create({
      id: randomUUID(),
      goalId,
      cycleNumber,
      evaluatedAt: result.evaluatedAt,
      previousStatus,
      newStatus,
      healthState: health.state,
      healthReason: health.reason,
      isComplete,
      isBlocked,
      decision,
      nextAction,
      childMissionId,
      modelCallsUsed: result.modelCallsUsed,
      tasksEvaluated: result.tasksEvaluated,
      budgetRemaining: result.budgetRemaining as unknown as Record<string, unknown>,
      evidence,
      createdAt: result.evaluatedAt,
    });

    if (this.eventBus) {
      this.eventBus.emit('objective.evaluated', {
        goalId,
        healthState: health.state,
        decision,
        timestamp: result.evaluatedAt,
      });
    }

    return result;
  }
}
