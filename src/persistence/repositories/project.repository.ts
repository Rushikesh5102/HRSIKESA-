/**
 * HṚṢĪKEŚA (हृषीकेश) — Project Repository
 *
 * Durable persistence for Project entities (both standalone and company-scoped).
 */

import { DatabaseManager } from '../database/database.manager.js';
import { IProject, ProjectStatus, ProjectPriority } from '../../company/interfaces/company.types.js';

interface RawProjectRow {
  id: string;
  company_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  objective: string;
  status: string;
  priority: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export class ProjectRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(project: IProject): IProject {
    const stmt = this.db.prepare(`
      INSERT INTO projects (
        id, company_id, name, slug, description, objective,
        status, priority, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      project.id,
      project.companyId || null,
      project.name,
      project.slug,
      project.description || null,
      project.objective || null,
      project.status || 'ACTIVE',
      project.priority || 'medium',
      project.metadata ? JSON.stringify(project.metadata) : null,
      project.createdAt,
      project.updatedAt
    );

    return project;
  }

  public get(id: string): IProject | undefined {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as RawProjectRow | undefined;
    if (!row) return undefined;
    return this.rowToProject(row);
  }

  public getBySlug(slug: string): IProject | undefined {
    const row = this.db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug) as unknown as RawProjectRow | undefined;
    if (!row) return undefined;
    return this.rowToProject(row);
  }

  public list(limit = 50, offset = 0): IProject[] {
    const rows = this.db.prepare(
      'SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as unknown as RawProjectRow[];
    return rows.map((r) => this.rowToProject(r));
  }

  public listByCompany(companyId: string, limit = 50): IProject[] {
    const rows = this.db.prepare(
      'SELECT * FROM projects WHERE company_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(companyId, limit) as unknown as RawProjectRow[];
    return rows.map((r) => this.rowToProject(r));
  }

  public listStandalone(limit = 50): IProject[] {
    const rows = this.db.prepare(
      'SELECT * FROM projects WHERE company_id IS NULL ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as unknown as RawProjectRow[];
    return rows.map((r) => this.rowToProject(r));
  }

  public update(id: string, updates: Partial<IProject>): IProject {
    const current = this.get(id);
    if (!current) throw new Error(`Project '${id}' not found for update.`);

    const now = updates.updatedAt || new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE projects SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        objective = COALESCE(?, objective),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        company_id = COALESCE(?, company_id),
        metadata = COALESCE(?, metadata),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.name || null,
      updates.description !== undefined ? updates.description : null,
      updates.objective || null,
      updates.status || null,
      updates.priority || null,
      updates.companyId !== undefined ? updates.companyId : null,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      now,
      id
    );

    return this.get(id)!;
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToProject(row: RawProjectRow): IProject {
    return {
      id: row.id,
      companyId: row.company_id || undefined,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      objective: row.objective,
      status: row.status as ProjectStatus,
      priority: row.priority as ProjectPriority,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
