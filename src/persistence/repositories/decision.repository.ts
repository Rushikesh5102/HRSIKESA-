/**
 * HṚṢĪKEŚA (हृषीकेश) — Decision Repository
 *
 * Durable persistence for Architectural & Operational Decision Records (ADRs/PDRs)
 * at Company and Project scopes.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { IDecision, DecisionStatus } from '../../company/interfaces/company.types.js';

interface RawDecisionRow {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  decision: string;
  reasoning: string | null;
  made_by: string;
  status: string;
  supersedes: string | null;
  created_at: string;
  updated_at: string;
}

export class DecisionRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(record: IDecision): IDecision {
    const stmt = this.db.prepare(`
      INSERT INTO decisions (
        id, company_id, project_id, title, description,
        decision, reasoning, made_by, status, supersedes,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.companyId,
      record.projectId || null,
      record.title,
      record.description || null,
      record.decision,
      record.reasoning || null,
      record.madeBy,
      record.status,
      record.supersedes || null,
      record.createdAt,
      record.updatedAt
    );

    return record;
  }

  public get(id: string): IDecision | undefined {
    const row = this.db.prepare('SELECT * FROM decisions WHERE id = ?').get(id) as unknown as RawDecisionRow | undefined;
    if (!row) return undefined;
    return this.rowToDecision(row);
  }

  public listByCompany(companyId: string, limit = 50): IDecision[] {
    const rows = this.db.prepare(
      'SELECT * FROM decisions WHERE company_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(companyId, limit) as unknown as RawDecisionRow[];
    return rows.map((r) => this.rowToDecision(r));
  }

  public listByProject(projectId: string, limit = 50): IDecision[] {
    const rows = this.db.prepare(
      'SELECT * FROM decisions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(projectId, limit) as unknown as RawDecisionRow[];
    return rows.map((r) => this.rowToDecision(r));
  }

  public update(id: string, updates: Partial<IDecision>): IDecision {
    const current = this.get(id);
    if (!current) throw new Error(`Decision '${id}' not found for update.`);

    const now = updates.updatedAt || new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE decisions SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        decision = COALESCE(?, decision),
        reasoning = COALESCE(?, reasoning),
        status = COALESCE(?, status),
        supersedes = COALESCE(?, supersedes),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.title || null,
      updates.description !== undefined ? updates.description : null,
      updates.decision || null,
      updates.reasoning !== undefined ? updates.reasoning : null,
      updates.status || null,
      updates.supersedes !== undefined ? updates.supersedes : null,
      now,
      id
    );

    return this.get(id)!;
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM decisions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToDecision(row: RawDecisionRow): IDecision {
    return {
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id || undefined,
      title: row.title,
      description: row.description || undefined,
      decision: row.decision,
      reasoning: row.reasoning || undefined,
      madeBy: row.made_by,
      status: row.status as DecisionStatus,
      supersedes: row.supersedes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
