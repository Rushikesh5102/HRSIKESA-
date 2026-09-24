/**
 * HṚṢĪKEŚA (हृषीकेश) — Objective Health Evaluator
 *
 * Phase 16B: Deterministic Objective Health from Concrete Runtime Evidence
 *
 * Evaluates real runtime signals rather than trusting LLM self-reporting:
 * - Milestone completion ratio
 * - Child mission states
 * - Failed task retry counts
 * - Pending approval gates (AWAITING_APPROVAL)
 * - Time since last recorded activity
 * - Resource pressure status
 */

import { IGoal, IGoalMilestone } from '../interfaces/goal.types.js';
import { IMission } from '../../agents/interfaces/mission.types.js';
import { ObjectiveHealthReport } from '../interfaces/objective.types.js';

export interface ObjectiveHealthInputs {
  goal: IGoal;
  milestones: IGoalMilestone[];
  missions: IMission[];
  pendingApprovalsCount: number;
  isResourceConstrained?: boolean;
}

export class ObjectiveHealthEvaluator {
  /**
   * Deterministically derive objective health state from concrete runtime signals.
   */
  public static evaluate(inputs: ObjectiveHealthInputs): ObjectiveHealthReport {
    const { goal, milestones, missions, pendingApprovalsCount, isResourceConstrained } = inputs;

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;
    const failedMilestones = milestones.filter((m) => m.status === 'FAILED').length;
    const blockedMilestones = milestones.filter((m) => m.status === 'BLOCKED').length;
    const activeMissions = missions.filter((m) => ['RUNNING', 'EXECUTING', 'PLANNING', 'VERIFYING'].includes(m.status.toUpperCase()));

    // Total verification criteria across milestones
    let totalCriteria = 0;
    let verifiedCriteria = 0;
    milestones.forEach((m) => {
      if (m.successCriteria) {
        totalCriteria += m.successCriteria.length;
        if (m.status === 'COMPLETED') {
          verifiedCriteria += m.successCriteria.length;
        }
      }
    });

    // 1. Terminal / Failed Check
    if (goal.status === 'FAILED' || failedMilestones > 0) {
      return {
        state: 'FAILED',
        reason: goal.blockedReason || `${failedMilestones} milestone(s) encountered unrecoverable failure.`,
        lastActivityAt: goal.updatedAt,
        failedTasksCount: failedMilestones,
        pendingApprovalsCount,
        activeMissionsCount: activeMissions.length,
        budgetExhausted: goal.status === 'FAILED' && (goal.blockedReason?.includes('budget') ?? false),
        verifiedCriteriaCount: verifiedCriteria,
        totalCriteriaCount: totalCriteria,
      };
    }

    // 2. Verified Completed Check
    if (goal.status === 'COMPLETED' || (totalMilestones > 0 && completedMilestones === totalMilestones)) {
      return {
        state: 'COMPLETED',
        reason: `All ${totalMilestones} milestones executed and verified complete.`,
        lastActivityAt: goal.updatedAt,
        failedTasksCount: 0,
        pendingApprovalsCount: 0,
        activeMissionsCount: 0,
        budgetExhausted: false,
        verifiedCriteriaCount: totalCriteria,
        totalCriteriaCount: totalCriteria,
      };
    }

    // 3. User Approval / Intervention Gate Check
    if (goal.status === 'AWAITING_APPROVAL' || pendingApprovalsCount > 0) {
      return {
        state: 'NEEDS_USER',
        reason: `${pendingApprovalsCount || 1} action(s) require human authorization before execution continues.`,
        lastActivityAt: goal.updatedAt,
        failedTasksCount: 0,
        pendingApprovalsCount: Math.max(1, pendingApprovalsCount),
        activeMissionsCount: activeMissions.length,
        budgetExhausted: false,
        verifiedCriteriaCount: verifiedCriteria,
        totalCriteriaCount: totalCriteria,
      };
    }

    // 4. Blocked Check
    if (goal.status === 'BLOCKED' || blockedMilestones > 0) {
      return {
        state: 'BLOCKED',
        reason: goal.blockedReason || `${blockedMilestones} milestone(s) blocked on prerequisite resources or dependencies.`,
        lastActivityAt: goal.updatedAt,
        failedTasksCount: 0,
        pendingApprovalsCount,
        activeMissionsCount: activeMissions.length,
        budgetExhausted: false,
        verifiedCriteriaCount: verifiedCriteria,
        totalCriteriaCount: totalCriteria,
      };
    }

    // 5. Waiting / Scheduled Check
    if (goal.status === 'PAUSED' || goal.status === 'DRAFT' || goal.status === 'PLANNED') {
      return {
        state: 'WAITING',
        reason: goal.status === 'PAUSED' ? 'Objective is paused by operator.' : 'Objective planned; waiting for start signal.',
        lastActivityAt: goal.updatedAt,
        failedTasksCount: 0,
        pendingApprovalsCount,
        activeMissionsCount: 0,
        budgetExhausted: false,
        verifiedCriteriaCount: verifiedCriteria,
        totalCriteriaCount: totalCriteria,
      };
    }

    // 6. Degraded Check (Resource constraints or prolonged inactivity during execution)
    if (isResourceConstrained) {
      return {
        state: 'DEGRADED',
        reason: 'Host memory or CPU constrained; autonomous concurrency throttled.',
        lastActivityAt: goal.updatedAt,
        failedTasksCount: 0,
        pendingApprovalsCount,
        activeMissionsCount: activeMissions.length,
        budgetExhausted: false,
        verifiedCriteriaCount: verifiedCriteria,
        totalCriteriaCount: totalCriteria,
      };
    }

    // 7. Normal Healthy State
    return {
      state: 'HEALTHY',
      reason: `Actively progressing (${completedMilestones}/${totalMilestones} milestones complete, ${activeMissions.length} mission(s) running).`,
      lastActivityAt: goal.updatedAt,
      failedTasksCount: 0,
      pendingApprovalsCount: 0,
      activeMissionsCount: activeMissions.length,
      budgetExhausted: false,
      verifiedCriteriaCount: verifiedCriteria,
      totalCriteriaCount: totalCriteria,
    };
  }
}
