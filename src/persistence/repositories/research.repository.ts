/**
 * HṚṢĪKEŚA (हृषीकेश) — Research Study Repository
 *
 * Durable SQLite persistence for Research Study entities.
 */

import { DatabaseManager } from '../database/database.manager.js';
import {
  IResearchStudy,
  ResearchStatus,
  ResearchDepth,
  DEFAULT_RESEARCH_BUDGET
} from '../../research/interfaces/research.types.js';

interface RawResearchRow {
  id: string;
  title: string;
  question: string;
  objective: string;
  scope: string | null;
  status: string;
  depth: string;
  budget: string | null;
  summary: string | null;
  conclusion: string | null;
  confidence_score: number;
  company_id: string | null;
  project_id: string | null;
  goal_id: string | null;
  created_by: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export class ResearchRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(study: IResearchStudy): IResearchStudy {
    const stmt = this.db.prepare(`
      INSERT INTO research_studies (
        id, title, question, objective, scope, status, depth,
        budget, summary, conclusion, confidence_score,
        company_id, project_id, goal_id, created_by,
        metadata, created_at, updated_at, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      study.id,
      study.title,
      study.question,
      study.objective,
      study.scope || null,
      study.status,
      study.depth || 'STANDARD',
      JSON.stringify(study.budget || DEFAULT_RESEARCH_BUDGET.STANDARD),
      study.summary || null,
      study.conclusion || null,
      study.confidenceScore || 0.0,
      study.companyId || null,
      study.projectId || null,
      study.goalId || null,
      study.createdBy || study.requestedBy || 'rushikesh',
      study.metadata ? JSON.stringify(study.metadata) : null,
      study.createdAt,
      study.updatedAt,
      study.completedAt || null
    );

    return study;
  }

  public get(id: string): IResearchStudy | undefined {
    const row = this.db.prepare('SELECT * FROM research_studies WHERE id = ?').get(id) as unknown as RawResearchRow | undefined;
    if (!row) return undefined;
    return this.rowToStudy(row);
  }

  public findById(id: string): IResearchStudy | undefined {
    return this.get(id);
  }

  public list(opts: { companyId?: string; projectId?: string; status?: ResearchStatus; limit?: number; offset?: number } = {}): IResearchStudy[] {
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

    let sql = 'SELECT * FROM research_studies';
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

    const rows = (this.db.prepare(sql).all as (...args: unknown[]) => unknown[])(...params) as unknown as RawResearchRow[];
    return rows.map((r) => this.rowToStudy(r));
  }

  public find(opts: { companyId?: string; projectId?: string; status?: ResearchStatus; limit?: number; offset?: number } = {}): IResearchStudy[] {
    return this.list(opts);
  }

  public update(idOrStudy: string | IResearchStudy, updates?: Partial<IResearchStudy>): IResearchStudy | undefined {
    const id = typeof idOrStudy === 'string' ? idOrStudy : idOrStudy.id;
    const patch = typeof idOrStudy === 'string' ? (updates || {}) : idOrStudy;

    const current = this.get(id);
    if (!current) return undefined;

    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const params: unknown[] = [now];

    if (patch.status !== undefined) { fields.push('status = ?'); params.push(patch.status); }
    if (patch.title !== undefined) { fields.push('title = ?'); params.push(patch.title); }
    if (patch.summary !== undefined) { fields.push('summary = ?'); params.push(patch.summary); }
    if (patch.conclusion !== undefined) { fields.push('conclusion = ?'); params.push(patch.conclusion); }
    if (patch.confidenceScore !== undefined) { fields.push('confidence_score = ?'); params.push(patch.confidenceScore); }
    if (patch.completedAt !== undefined) { fields.push('completed_at = ?'); params.push(patch.completedAt); }
    if (patch.metadata !== undefined) { fields.push('metadata = ?'); params.push(JSON.stringify(patch.metadata)); }

    params.push(id);
    const stmt = this.db.prepare(`UPDATE research_studies SET ${fields.join(', ')} WHERE id = ?`);
    (stmt.run as (...args: unknown[]) => unknown)(...params);

    return this.get(id);
  }

  public delete(id: string): boolean {
    const result = (this.db.prepare('DELETE FROM research_studies WHERE id = ?').run as (id: string) => { changes: number })(id);
    return (result?.changes ?? 0) > 0;
  }

  private rowToStudy(row: RawResearchRow): IResearchStudy {
    return {
      id: row.id,
      title: row.title,
      question: row.question,
      objective: row.objective,
      scope: row.scope ?? undefined,
      status: row.status as ResearchStatus,
      depth: (row.depth as ResearchDepth) || 'STANDARD',
      budget: row.budget ? JSON.parse(row.budget) : DEFAULT_RESEARCH_BUDGET.STANDARD,
      summary: row.summary ?? undefined,
      conclusion: row.conclusion ?? undefined,
      confidenceScore: row.confidence_score,
      companyId: row.company_id ?? undefined,
      projectId: row.project_id ?? undefined,
      goalId: row.goal_id ?? undefined,
      createdBy: row.created_by,
      requestedBy: row.created_by,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at ?? undefined,
    };
  }
}
