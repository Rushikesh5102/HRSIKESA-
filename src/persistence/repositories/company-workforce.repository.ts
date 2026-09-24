/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Workforce Repository
 *
 * Durable persistence for agent assignments to companies and departments.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { ICompanyWorkforce, CompanyWorkforceStatus } from '../../company/interfaces/company.types.js';

interface RawWorkforceRow {
  id: string;
  company_id: string;
  agent_id: string;
  department_id: string | null;
  role_title: string | null;
  status: string;
  joined_at: string;
}

export class CompanyWorkforceRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(assignment: ICompanyWorkforce): ICompanyWorkforce {
    const stmt = this.db.prepare(`
      INSERT INTO company_workforce (
        id, company_id, agent_id, department_id, role_title, status, joined_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      assignment.id,
      assignment.companyId,
      assignment.agentId,
      assignment.departmentId || null,
      assignment.roleTitle || null,
      assignment.status,
      assignment.joinedAt
    );

    return assignment;
  }

  public get(id: string): ICompanyWorkforce | undefined {
    const row = this.db.prepare('SELECT * FROM company_workforce WHERE id = ?').get(id) as unknown as RawWorkforceRow | undefined;
    if (!row) return undefined;
    return this.rowToWorkforce(row);
  }

  public getByCompanyAndAgent(companyId: string, agentId: string): ICompanyWorkforce | undefined {
    const row = this.db.prepare(
      'SELECT * FROM company_workforce WHERE company_id = ? AND agent_id = ?'
    ).get(companyId, agentId) as unknown as RawWorkforceRow | undefined;
    if (!row) return undefined;
    return this.rowToWorkforce(row);
  }

  public listByCompany(companyId: string): ICompanyWorkforce[] {
    const rows = this.db.prepare(
      'SELECT * FROM company_workforce WHERE company_id = ? ORDER BY joined_at ASC'
    ).all(companyId) as unknown as RawWorkforceRow[];
    return rows.map((r) => this.rowToWorkforce(r));
  }

  public listByAgent(agentId: string): ICompanyWorkforce[] {
    const rows = this.db.prepare(
      'SELECT * FROM company_workforce WHERE agent_id = ? ORDER BY joined_at DESC'
    ).all(agentId) as unknown as RawWorkforceRow[];
    return rows.map((r) => this.rowToWorkforce(r));
  }

  public update(id: string, updates: Partial<ICompanyWorkforce>): ICompanyWorkforce {
    const current = this.get(id);
    if (!current) throw new Error(`Workforce assignment '${id}' not found for update.`);

    const stmt = this.db.prepare(`
      UPDATE company_workforce SET
        department_id = COALESCE(?, department_id),
        role_title = COALESCE(?, role_title),
        status = COALESCE(?, status)
      WHERE id = ?
    `);

    stmt.run(
      updates.departmentId !== undefined ? updates.departmentId : null,
      updates.roleTitle !== undefined ? updates.roleTitle : null,
      updates.status || null,
      id
    );

    return this.get(id)!;
  }

  public remove(companyId: string, agentId: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM company_workforce WHERE company_id = ? AND agent_id = ?'
    ).run(companyId, agentId);
    return result.changes > 0;
  }

  private rowToWorkforce(row: RawWorkforceRow): ICompanyWorkforce {
    return {
      id: row.id,
      companyId: row.company_id,
      agentId: row.agent_id,
      departmentId: row.department_id || undefined,
      roleTitle: row.role_title || undefined,
      status: row.status as CompanyWorkforceStatus,
      joinedAt: row.joined_at
    };
  }
}
