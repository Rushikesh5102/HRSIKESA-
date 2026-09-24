/**
 * HṚṢĪKEŚA (हृषीकेश) — Goal Repository
 *
 * Durable SQLite persistence for Goal entities.
 * Pattern matches existing CompanyRepository / MissionRepository.
 */

import { DatabaseManager } from '../database/database.manager.js';
import {
  IGoal,
  GoalStatus,
  GoalPriority,
  GoalPlan,
  GoalReport,
  GoalVerificationResult,
  DEFAULT_GOAL_BUDGET
} from '../../goal/interfaces/goal.types.js';

interface RawGoalRow {
  id: string;
  company_id: string | null;
  project_id: string | null;
  product_id: string | null;
  parent_goal_id: string | null;
  title: string;
  description: string | null;
  objective: string;
  status: string;
  priority: string;
  deadline: string | null;
  budget: string | null;
  constraints: string | null;
  success_criteria: string | null;
  failure_criteria: string | null;
  verification_plan: string | null;
  plan: string | null;
  report: string | null;
  verification_result: string | null;
  blocked_reason: string | null;
  created_by: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalListOptions {
  companyId?: string;
  projectId?: string;
  status?: GoalStatus;
  priority?: GoalPriority;
  limit?: number;
  offset?: number;
}

export class GoalRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(goal: IGoal): IGoal {
    const stmt = this.db.prepare(`
      INSERT INTO goals (
        id, company_id, project_id, product_id, parent_goal_id,
        title, description, objective, status, priority,
        deadline, budget, constraints, success_criteria, failure_criteria,
        verification_plan, plan, report, verification_result,
        blocked_reason, created_by, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      goal.id,
      goal.companyId || null,
      goal.projectId || null,
      goal.productId || null,
      goal.parentGoalId || null,
      goal.title,
      goal.description || null,
      goal.objective,
      goal.status,
      goal.priority || 'medium',
      goal.deadline || null,
      JSON.stringify(goal.budget),
      goal.constraints ? JSON.stringify(goal.constraints) : null,
      goal.successCriteria ? JSON.stringify(goal.successCriteria) : null,
      goal.failureCriteria ? JSON.stringify(goal.failureCriteria) : null,
      goal.verificationPlan || null,
      goal.plan ? JSON.stringify(goal.plan) : null,
      goal.report ? JSON.stringify(goal.report) : null,
      goal.verificationResult ? JSON.stringify(goal.verificationResult) : null,
      goal.blockedReason || null,
      goal.createdBy || 'human_operator',
      goal.metadata ? JSON.stringify(goal.metadata) : null,
      goal.createdAt,
      goal.updatedAt
    );

    return goal;
  }

  public get(id: string): IGoal | undefined {
    const row = this.db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as unknown as RawGoalRow | undefined;
    if (!row) return undefined;
    return this.rowToGoal(row);
  }

  public list(opts: GoalListOptions = {}): IGoal[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (opts.companyId !== undefined) {
      conditions.push('company_id = ?');
      params.push(opts.companyId);
    }
    if (opts.projectId !== undefined) {
      conditions.push('project_id = ?');
      params.push(opts.projectId);
    }
    if (opts.status !== undefined) {
      conditions.push('status = ?');
      params.push(opts.status);
    }
    if (opts.priority !== undefined) {
      conditions.push('priority = ?');
      params.push(opts.priority);
    }

    let sql = 'SELECT * FROM goals';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY created_at DESC';

    if (opts.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(opts.limit);
    }
    if (opts.offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(opts.offset);
    }

    const rows = (this.db.prepare(sql).all as (...args: unknown[]) => unknown[])(...params) as unknown as RawGoalRow[];
    return rows.map(r => this.rowToGoal(r));
  }

  public update(
    id: string,
    updates: {
      status?: GoalStatus;
      plan?: GoalPlan;
      report?: GoalReport;
      verificationResult?: GoalVerificationResult;
      blockedReason?: string | null;
    }
  ): IGoal {
    const current = this.get(id);
    if (!current) throw new Error(`Goal '${id}' not found for update.`);

    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const params: unknown[] = [now];

    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    if (updates.plan !== undefined) { fields.push('plan = ?'); params.push(JSON.stringify(updates.plan)); }
    if (updates.report !== undefined) { fields.push('report = ?'); params.push(JSON.stringify(updates.report)); }
    if (updates.verificationResult !== undefined) {
      fields.push('verification_result = ?');
      params.push(JSON.stringify(updates.verificationResult));
    }
    if (updates.blockedReason !== undefined) {
      fields.push('blocked_reason = ?');
      params.push(updates.blockedReason);
    }

    params.push(id);
    const stmt = this.db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`);
    (stmt.run as (...args: unknown[]) => unknown)(...params);

    return this.get(id)!;
  }

  public delete(id: string): void {
    this.db.prepare('DELETE FROM goals WHERE id = ?').run(id);
  }

  /**
   * Find goals that are in a resumable state after restart.
   * EXECUTING, PLANNED, BLOCKED goals can be inspected for safe resume.
   */
  public findResumable(): IGoal[] {
    const rows = this.db.prepare(
      `SELECT * FROM goals WHERE status IN ('EXECUTING', 'PLANNED', 'BLOCKED', 'AWAITING_APPROVAL')
       ORDER BY created_at ASC`
    ).all() as unknown as RawGoalRow[];
    return rows.map(r => this.rowToGoal(r));
  }

  private rowToGoal(row: RawGoalRow): IGoal {
    return {
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id,
      productId: row.product_id,
      parentGoalId: row.parent_goal_id,
      title: row.title,
      description: row.description ?? undefined,
      objective: row.objective,
      status: row.status as GoalStatus,
      priority: row.priority as GoalPriority,
      deadline: row.deadline,
      budget: row.budget ? JSON.parse(row.budget) : DEFAULT_GOAL_BUDGET,
      constraints: row.constraints ? JSON.parse(row.constraints) : undefined,
      successCriteria: row.success_criteria ? JSON.parse(row.success_criteria) : undefined,
      failureCriteria: row.failure_criteria ? JSON.parse(row.failure_criteria) : undefined,
      verificationPlan: row.verification_plan ?? undefined,
      plan: row.plan ? JSON.parse(row.plan) : undefined,
      report: row.report ? JSON.parse(row.report) : undefined,
      verificationResult: row.verification_result ? JSON.parse(row.verification_result) : undefined,
      blockedReason: row.blocked_reason ?? undefined,
      createdBy: row.created_by,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
