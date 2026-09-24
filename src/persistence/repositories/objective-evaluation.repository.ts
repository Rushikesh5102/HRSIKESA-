/**
 * HṚṢĪKEŚA (हृषीकेश) — Objective Evaluation Repository
 *
 * Phase 16: Objective Evaluation Cycle Persistence & Audit Trail
 */

import { DatabaseManager } from '../database/database.manager.js';

export interface ObjectiveEvaluationRecord {
  id: string;
  goalId: string;
  cycleNumber: number;
  evaluatedAt: string;
  previousStatus: string;
  newStatus: string;
  healthState: string;
  healthReason?: string;
  isComplete: boolean;
  isBlocked: boolean;
  decision: string;
  nextAction?: string;
  childMissionId?: string;
  modelCallsUsed: number;
  tasksEvaluated: number;
  budgetRemaining?: Record<string, unknown>;
  evidence?: string[];
  createdAt: string;
}

export class ObjectiveEvaluationRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(record: ObjectiveEvaluationRecord): ObjectiveEvaluationRecord {
    const stmt = this.db.prepare(`
      INSERT INTO objective_evaluations (
        id, goal_id, cycle_number, evaluated_at, previous_status, new_status,
        health_state, health_reason, is_complete, is_blocked, decision,
        next_action, child_mission_id, model_calls_used, tasks_evaluated,
        budget_remaining, evidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      record.id,
      record.goalId,
      record.cycleNumber,
      record.evaluatedAt,
      record.previousStatus,
      record.newStatus,
      record.healthState,
      record.healthReason ?? null,
      record.isComplete ? 1 : 0,
      record.isBlocked ? 1 : 0,
      record.decision,
      record.nextAction ?? null,
      record.childMissionId ?? null,
      record.modelCallsUsed ?? 0,
      record.tasksEvaluated ?? 0,
      record.budgetRemaining ? JSON.stringify(record.budgetRemaining) : null,
      record.evidence ? JSON.stringify(record.evidence) : null,
      record.createdAt
    );

    return record;
  }

  public listByGoal(goalId: string): ObjectiveEvaluationRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM objective_evaluations
      WHERE goal_id = ?
      ORDER BY cycle_number ASC, evaluated_at ASC;
    `);

    const rows = stmt.all(goalId) as Record<string, unknown>[];
    return rows.map((r) => this.mapRow(r));
  }

  public findByGoalId(goalId: string): ObjectiveEvaluationRecord[] {
    return this.listByGoal(goalId);
  }

  public getLatest(goalId: string): ObjectiveEvaluationRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM objective_evaluations
      WHERE goal_id = ?
      ORDER BY cycle_number DESC, evaluated_at DESC
      LIMIT 1;
    `);

    const row = stmt.get(goalId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  private mapRow(row: Record<string, unknown>): ObjectiveEvaluationRecord {
    return {
      id: String(row.id),
      goalId: String(row.goal_id),
      cycleNumber: Number(row.cycle_number ?? 1),
      evaluatedAt: String(row.evaluated_at),
      previousStatus: String(row.previous_status),
      newStatus: String(row.new_status),
      healthState: String(row.health_state),
      healthReason: row.health_reason ? String(row.health_reason) : undefined,
      isComplete: Boolean(row.is_complete),
      isBlocked: Boolean(row.is_blocked),
      decision: String(row.decision),
      nextAction: row.next_action ? String(row.next_action) : undefined,
      childMissionId: row.child_mission_id ? String(row.child_mission_id) : undefined,
      modelCallsUsed: Number(row.model_calls_used ?? 0),
      tasksEvaluated: Number(row.tasks_evaluated ?? 0),
      budgetRemaining: row.budget_remaining ? JSON.parse(String(row.budget_remaining)) : undefined,
      evidence: row.evidence ? JSON.parse(String(row.evidence)) : undefined,
      createdAt: String(row.created_at),
    };
  }
}
