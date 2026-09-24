/**
 * HṚṢĪKEŚA (हृषीकेश) — Department Repository
 *
 * Durable persistence for Company Departments.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { IDepartment } from '../../company/interfaces/company.types.js';

interface RawDepartmentRow {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  lead_agent_id: string | null;
  capabilities: string;
  created_at: string;
  updated_at: string;
}

export class DepartmentRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(department: IDepartment): IDepartment {
    const stmt = this.db.prepare(`
      INSERT INTO departments (
        id, company_id, name, slug, description,
        lead_agent_id, capabilities, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      department.id,
      department.companyId,
      department.name,
      department.slug,
      department.description || null,
      department.leadAgentId || null,
      JSON.stringify(department.capabilities || []),
      department.createdAt,
      department.updatedAt
    );

    return department;
  }

  public get(id: string): IDepartment | undefined {
    const row = this.db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as unknown as RawDepartmentRow | undefined;
    if (!row) return undefined;
    return this.rowToDepartment(row);
  }

  public getByCompanyAndSlug(companyId: string, slug: string): IDepartment | undefined {
    const row = this.db.prepare(
      'SELECT * FROM departments WHERE company_id = ? AND slug = ?'
    ).get(companyId, slug) as unknown as RawDepartmentRow | undefined;
    if (!row) return undefined;
    return this.rowToDepartment(row);
  }

  public listByCompany(companyId: string): IDepartment[] {
    const rows = this.db.prepare(
      'SELECT * FROM departments WHERE company_id = ? ORDER BY name ASC'
    ).all(companyId) as unknown as RawDepartmentRow[];
    return rows.map((r) => this.rowToDepartment(r));
  }

  public update(id: string, updates: Partial<IDepartment>): IDepartment {
    const current = this.get(id);
    if (!current) throw new Error(`Department '${id}' not found for update.`);

    const now = updates.updatedAt || new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE departments SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        lead_agent_id = COALESCE(?, lead_agent_id),
        capabilities = COALESCE(?, capabilities),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.name || null,
      updates.description !== undefined ? updates.description : null,
      updates.leadAgentId !== undefined ? updates.leadAgentId : null,
      updates.capabilities ? JSON.stringify(updates.capabilities) : null,
      now,
      id
    );

    return this.get(id)!;
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToDepartment(row: RawDepartmentRow): IDepartment {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      leadAgentId: row.lead_agent_id || undefined,
      capabilities: JSON.parse(row.capabilities || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
