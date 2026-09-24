/**
 * HṚṢĪKEŚA (हृषीकेश) — Persistent Objective & Health Domain Types
 *
 * Phase 16: Persistent Autonomous Operations & Evaluation
 */

import { IGoal, GoalStatus, GoalBudget } from './goal.types.js';

export type ObjectiveHealthState =
  | 'HEALTHY'    // Active tasks progressing within budget, recent progress recorded
  | 'WAITING'    // Waiting for schedule, external event, or predecessor milestone
  | 'BLOCKED'    // Blocked on system condition, missing capability, or tool failure
  | 'NEEDS_USER' // Waiting for human approval gate or operator intervention
  | 'DEGRADED'   // Running with fallback tool, retry active, or under resource constraint
  | 'FAILED'     // Terminal failure; budget exhausted or unrecoverable error
  | 'COMPLETED'; // Verified complete by GoalVerifier

export type ObjectiveEvaluationDecision =
  | 'CONTINUE'      // Create/execute next eligible milestone mission
  | 'WAIT_APPROVAL' // Pause for human-in-the-loop approval gate
  | 'REPLAN'        // Bounded replan of failed milestone
  | 'COMPLETE'      // All success criteria verified; mark goal COMPLETED
  | 'FAIL'          // Mark goal FAILED due to budget or policy
  | 'IDLE';         // Objective is paused, waiting for timer/event, or no work pending

export interface ObjectiveHealthReport {
  readonly state: ObjectiveHealthState;
  readonly reason: string;
  readonly lastActivityAt: string;
  readonly failedTasksCount: number;
  readonly pendingApprovalsCount: number;
  readonly activeMissionsCount: number;
  readonly budgetExhausted: boolean;
  readonly verifiedCriteriaCount: number;
  readonly totalCriteriaCount: number;
}

export interface ObjectiveEvaluationResult {
  readonly goalId: string;
  readonly cycleNumber: number;
  readonly evaluatedAt: string;
  readonly previousStatus: GoalStatus;
  readonly newStatus: GoalStatus;
  readonly health: ObjectiveHealthReport;
  readonly isComplete: boolean;
  readonly isBlocked: boolean;
  readonly decision: ObjectiveEvaluationDecision;
  readonly nextAction?: string;
  readonly childMissionId?: string;
  readonly modelCallsUsed: number;
  readonly tasksEvaluated: number;
  readonly budgetRemaining: GoalBudget;
  readonly evidence: string[];
}

export interface PersistentObjective extends IGoal {
  healthState?: ObjectiveHealthState;
  derivedHealthReason?: string;
  scheduledAt?: string;
  evaluationSchedule?: string;
  lastEvaluatedAt?: string;
  activeMissionId?: string;
  resourceLimits?: Record<string, unknown>;
  archivedAt?: string;
}
