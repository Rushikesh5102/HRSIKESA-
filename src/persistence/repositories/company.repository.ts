/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Repository
 *
 * Durable persistence for Company entities.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { ICompany, CompanyStatus } from '../../company/interfaces/company.types.js';

interface RawCompanyRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mission: string | null;
  vision: string | null;
  status: string;
  industry: string | null;
  created_by: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export class CompanyRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(company: ICompany): ICompany {
    const stmt = this.db.prepare(`
      INSERT INTO companies (
        id, name, slug, description, mission, vision,
        status, industry, created_by, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      company.id,
      company.name,
      company.slug,
      company.description || null,
      company.mission || null,
      company.vision || null,
      company.status,
      company.industry || null,
      company.createdBy || 'hrisekesa',
      company.metadata ? JSON.stringify(company.metadata) : null,
      company.createdAt,
      company.updatedAt
    );

    return company;
  }

  public get(id: string): ICompany | undefined {
    const row = this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as unknown as RawCompanyRow | undefined;
    if (!row) return undefined;
    return this.rowToCompany(row);
  }

  public getBySlug(slug: string): ICompany | undefined {
    const row = this.db.prepare('SELECT * FROM companies WHERE slug = ?').get(slug) as unknown as RawCompanyRow | undefined;
    if (!row) return undefined;
    return this.rowToCompany(row);
  }

  public list(limit = 50, offset = 0): ICompany[] {
    const rows = this.db.prepare(
      'SELECT * FROM companies ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as unknown as RawCompanyRow[];
    return rows.map((r) => this.rowToCompany(r));
  }

  public update(id: string, updates: Partial<ICompany>): ICompany {
    const current = this.get(id);
    if (!current) throw new Error(`Company '${id}' not found for update.`);

    const now = updates.updatedAt || new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE companies SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        mission = COALESCE(?, mission),
        vision = COALESCE(?, vision),
        status = COALESCE(?, status),
        industry = COALESCE(?, industry),
        metadata = COALESCE(?, metadata),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.name || null,
      updates.description !== undefined ? updates.description : null,
      updates.mission !== undefined ? updates.mission : null,
      updates.vision !== undefined ? updates.vision : null,
      updates.status || null,
      updates.industry !== undefined ? updates.industry : null,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      now,
      id
    );

    return this.get(id)!;
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM companies WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToCompany(row: RawCompanyRow): ICompany {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      mission: row.mission || undefined,
      vision: row.vision || undefined,
      status: row.status as CompanyStatus,
      industry: row.industry || undefined,
      createdBy: row.created_by,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
