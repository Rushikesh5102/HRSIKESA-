/**
 * HṚṢĪKEŚA (हृषीकेश) — Customer Repository
 *
 * Durable persistence for Customer and Prospect entities (Domain model only, zero credentials).
 */

import { DatabaseManager } from '../database/database.manager.js';
import { ICustomer, CustomerType, CustomerStatus } from '../../company/interfaces/company.types.js';

interface RawCustomerRow {
  id: string;
  company_id: string;
  name: string;
  type: string;
  status: string;
  contact_reference: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export class CustomerRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(customer: ICustomer): ICustomer {
    const stmt = this.db.prepare(`
      INSERT INTO customers (
        id, company_id, name, type, status,
        contact_reference, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      customer.id,
      customer.companyId,
      customer.name,
      customer.type,
      customer.status,
      customer.contactReference || null,
      customer.metadata ? JSON.stringify(customer.metadata) : null,
      customer.createdAt,
      customer.updatedAt
    );

    return customer;
  }

  public get(id: string): ICustomer | undefined {
    const row = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as unknown as RawCustomerRow | undefined;
    if (!row) return undefined;
    return this.rowToCustomer(row);
  }

  public listByCompany(companyId: string, limit = 50): ICustomer[] {
    const rows = this.db.prepare(
      'SELECT * FROM customers WHERE company_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(companyId, limit) as unknown as RawCustomerRow[];
    return rows.map((r) => this.rowToCustomer(r));
  }

  public list(limit = 50, offset = 0): ICustomer[] {
    const rows = this.db.prepare(
      'SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as unknown as RawCustomerRow[];
    return rows.map((r) => this.rowToCustomer(r));
  }

  public update(id: string, updates: Partial<ICustomer>): ICustomer {
    const current = this.get(id);
    if (!current) throw new Error(`Customer '${id}' not found for update.`);

    const now = updates.updatedAt || new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        status = COALESCE(?, status),
        contact_reference = COALESCE(?, contact_reference),
        metadata = COALESCE(?, metadata),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.name || null,
      updates.type || null,
      updates.status || null,
      updates.contactReference !== undefined ? updates.contactReference : null,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      now,
      id
    );

    return this.get(id)!;
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToCustomer(row: RawCustomerRow): ICustomer {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      type: row.type as CustomerType,
      status: row.status as CustomerStatus,
      contactReference: row.contact_reference || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
