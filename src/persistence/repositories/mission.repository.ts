/**
 * HRSIKESA (हृषीकेश) — Mission Repository
 */

import { DatabaseManager } from '../database/database.manager.js';
import { IMission, MissionStatus, MissionPlan, MissionBudget, MissionReport, HumanInterventionRequest } from '../../agents/interfaces/mission.types.js';

interface RawMissionRow {
  id: string;
  company_id: string | null;
  project_id: string | null;
  product_id: string | null;
  department_id: string | null;
  objective: string;
  root_agent_id: string;
  root_task_id: string;
  status: string;
  result: string | null;
  plan: string | null;
  budget: string | null;
  report: string | null;
  blocked_reason: string | null;
  intervention_request: string | null;
  created_at: string;
  updated_at: string;
}

export class MissionRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(mission: IMission): IMission {
    const stmt = this.db.prepare(`
      INSERT INTO agent_missions (
        id, company_id, project_id, product_id, department_id,
        objective, root_agent_id, root_task_id, status, result,
        plan, budget, report, blocked_reason, intervention_request,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      mission.id,
      mission.companyId || null,
      mission.projectId || null,
      mission.productId || null,
      mission.departmentId || null,
      mission.objective,
      mission.rootAgentId,
      mission.rootTaskId,
      mission.status,
      mission.result || null,
      mission.plan ? JSON.stringify(mission.plan) : null,
      mission.budget ? JSON.stringify(mission.budget) : null,
      mission.report ? JSON.stringify(mission.report) : null,
      mission.blockedReason || null,
      mission.interventionRequest ? JSON.stringify(mission.interventionRequest) : null,
      mission.createdAt,
      mission.updatedAt
    );
    return mission;
  }

  public get(id: string): IMission | undefined {
    const row = this.db.prepare('SELECT * FROM agent_missions WHERE id = ?').get(id) as unknown as RawMissionRow | undefined;
    if (!row) return undefined;
    return this.rowToMission(row);
  }

  public update(
    id: string,
    updates: {
      status?: MissionStatus;
      result?: string;
      plan?: MissionPlan;
      budget?: MissionBudget;
      report?: MissionReport;
      blockedReason?: string;
      interventionRequest?: HumanInterventionRequest;
      companyId?: string | null;
      projectId?: string | null;
      productId?: string | null;
      departmentId?: string | null;
      updatedAt?: string;
    }
  ): void {
    const now = updates.updatedAt || new Date().toISOString();
    const current = this.get(id);
    if (!current) throw new Error(`Mission '${id}' not found for update.`);

    const stmt = this.db.prepare(`
      UPDATE agent_missions SET
        status = COALESCE(?, status),
        result = COALESCE(?, result),
        plan = COALESCE(?, plan),
        budget = COALESCE(?, budget),
        report = COALESCE(?, report),
        blocked_reason = ?,
        intervention_request = ?,
        company_id = COALESCE(?, company_id),
        project_id = COALESCE(?, project_id),
        product_id = COALESCE(?, product_id),
        department_id = COALESCE(?, department_id),
        updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      updates.status || null,
      updates.result || null,
      updates.plan ? JSON.stringify(updates.plan) : null,
      updates.budget ? JSON.stringify(updates.budget) : null,
      updates.report ? JSON.stringify(updates.report) : null,
      updates.blockedReason !== undefined ? updates.blockedReason : (current.blockedReason || null),
      updates.interventionRequest !== undefined ? (updates.interventionRequest ? JSON.stringify(updates.interventionRequest) : null) : (current.interventionRequest ? JSON.stringify(current.interventionRequest) : null),
      updates.companyId !== undefined ? updates.companyId : null,
      updates.projectId !== undefined ? updates.projectId : null,
      updates.productId !== undefined ? updates.productId : null,
      updates.departmentId !== undefined ? updates.departmentId : null,
      now,
      id
    );
  }

  public list(limit = 20, offset = 0): IMission[] {
    const rows = this.db.prepare(
      'SELECT * FROM agent_missions ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as unknown as RawMissionRow[];
    return rows.map(r => this.rowToMission(r));
  }

  public listActive(): IMission[] {
    const rows = this.db.prepare(
      "SELECT * FROM agent_missions WHERE status IN ('pending', 'planning', 'ready', 'running', 'waiting', 'blocked', 'verifying') ORDER BY created_at ASC"
    ).all() as unknown as RawMissionRow[];
    return rows.map(r => this.rowToMission(r));
  }

  public listByCompany(companyId: string, limit = 50): IMission[] {
    const rows = this.db.prepare(
      'SELECT * FROM agent_missions WHERE company_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(companyId, limit) as unknown as RawMissionRow[];
    return rows.map(r => this.rowToMission(r));
  }

  public listByProject(projectId: string, limit = 50): IMission[] {
    const rows = this.db.prepare(
      'SELECT * FROM agent_missions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(projectId, limit) as unknown as RawMissionRow[];
    return rows.map(r => this.rowToMission(r));
  }

  private rowToMission(row: RawMissionRow): IMission {
    return {
      id: row.id,
      companyId: row.company_id || undefined,
      projectId: row.project_id || undefined,
      productId: row.product_id || undefined,
      departmentId: row.department_id || undefined,
      objective: row.objective,
      rootAgentId: row.root_agent_id,
      rootTaskId: row.root_task_id,
      status: row.status as MissionStatus,
      result: row.result || undefined,
      plan: row.plan ? JSON.parse(row.plan) : undefined,
      budget: row.budget ? JSON.parse(row.budget) : undefined,
      report: row.report ? JSON.parse(row.report) : undefined,
      blockedReason: row.blocked_reason || undefined,
      interventionRequest: row.intervention_request ? JSON.parse(row.intervention_request) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
