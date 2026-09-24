/**
 * HṚṢĪKEŚA (हृषीकेश) — Milestone Repository
 *
 * Durable SQLite persistence for GoalMilestone entities.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { IGoalMilestone, MilestoneStatus } from '../../goal/interfaces/goal.types.js';

interface RawMilestoneRow {
  id: string;
  goal_id: string;
  mission_id: string | null;
  title: string;
  description: string | null;
  sequence: number;
  status: string;
  success_criteria: string | null;
  verification_criteria: string | null;
  required_agent_ids: string | null;
  required_capabilities: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export class MilestoneRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(milestone: IGoalMilestone): IGoalMilestone {
    const stmt = this.db.prepare(`
      INSERT INTO goal_milestones (
        id, goal_id, mission_id, title, description, sequence, status,
        success_criteria, verification_criteria,
        required_agent_ids, required_capabilities,
        metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      milestone.id,
      milestone.goalId,
      milestone.missionId || null,
      milestone.title,
      milestone.description || null,
      milestone.sequence,
      milestone.status,
      milestone.successCriteria ? JSON.stringify(milestone.successCriteria) : null,
      milestone.verificationCriteria ? JSON.stringify(milestone.verificationCriteria) : null,
      milestone.requiredAgentIds ? JSON.stringify(milestone.requiredAgentIds) : null,
      milestone.requiredCapabilities ? JSON.stringify(milestone.requiredCapabilities) : null,
      milestone.metadata ? JSON.stringify(milestone.metadata) : null,
      milestone.createdAt,
      milestone.updatedAt
    );

    return milestone;
  }

  public get(id: string): IGoalMilestone | undefined {
    const row = this.db.prepare('SELECT * FROM goal_milestones WHERE id = ?').get(id) as unknown as RawMilestoneRow | undefined;
    if (!row) return undefined;
    return this.rowToMilestone(row);
  }

  public getByMissionId(missionId: string): IGoalMilestone | undefined {
    const row = this.db.prepare('SELECT * FROM goal_milestones WHERE mission_id = ?').get(missionId) as unknown as RawMilestoneRow | undefined;
    if (!row) return undefined;
    return this.rowToMilestone(row);
  }

  public listByGoal(goalId: string): IGoalMilestone[] {
    const rows = this.db.prepare(
      'SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY sequence ASC'
    ).all(goalId) as unknown as RawMilestoneRow[];
    return rows.map(r => this.rowToMilestone(r));
  }

  public update(
    id: string,
    updates: {
      status?: MilestoneStatus;
      missionId?: string | null;
    }
  ): IGoalMilestone {
    const current = this.get(id);
    if (!current) throw new Error(`Milestone '${id}' not found for update.`);

    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const params: unknown[] = [now];

    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    if (updates.missionId !== undefined) { fields.push('mission_id = ?'); params.push(updates.missionId); }

    params.push(id);
    const stmt = this.db.prepare(`UPDATE goal_milestones SET ${fields.join(', ')} WHERE id = ?`);
    (stmt.run as (...args: unknown[]) => unknown)(...params);

    return this.get(id)!;
  }

  public deleteByGoal(goalId: string): void {
    this.db.prepare('DELETE FROM goal_milestones WHERE goal_id = ?').run(goalId);
  }

  private rowToMilestone(row: RawMilestoneRow): IGoalMilestone {
    return {
      id: row.id,
      goalId: row.goal_id,
      missionId: row.mission_id,
      title: row.title,
      description: row.description ?? undefined,
      sequence: row.sequence,
      status: row.status as MilestoneStatus,
      successCriteria: row.success_criteria ? JSON.parse(row.success_criteria) : undefined,
      verificationCriteria: row.verification_criteria ? JSON.parse(row.verification_criteria) : undefined,
      requiredAgentIds: row.required_agent_ids ? JSON.parse(row.required_agent_ids) : undefined,
      requiredCapabilities: row.required_capabilities ? JSON.parse(row.required_capabilities) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
