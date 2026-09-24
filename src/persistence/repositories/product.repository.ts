/**
 * HṚṢĪKEŚA (हृषीकेश) — Product Repository
 *
 * Durable persistence for Product and Service entities.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { IProduct, ProductType, ProductStatus } from '../../company/interfaces/company.types.js';

interface RawProductRow {
  id: string;
  company_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  type: string;
  status: string;
  version: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export class ProductRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(product: IProduct): IProduct {
    const stmt = this.db.prepare(`
      INSERT INTO products (
        id, company_id, project_id, name, description,
        type, status, version, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      product.id,
      product.companyId,
      product.projectId || null,
      product.name,
      product.description || null,
      product.type,
      product.status,
      product.version,
      product.metadata ? JSON.stringify(product.metadata) : null,
      product.createdAt,
      product.updatedAt
    );

    return product;
  }

  public get(id: string): IProduct | undefined {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as unknown as RawProductRow | undefined;
    if (!row) return undefined;
    return this.rowToProduct(row);
  }

  public listByCompany(companyId: string, limit = 50): IProduct[] {
    const rows = this.db.prepare(
      'SELECT * FROM products WHERE company_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(companyId, limit) as unknown as RawProductRow[];
    return rows.map((r) => this.rowToProduct(r));
  }

  public listByProject(projectId: string, limit = 50): IProduct[] {
    const rows = this.db.prepare(
      'SELECT * FROM products WHERE project_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(projectId, limit) as unknown as RawProductRow[];
    return rows.map((r) => this.rowToProduct(r));
  }

  public list(limit = 50, offset = 0): IProduct[] {
    const rows = this.db.prepare(
      'SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as unknown as RawProductRow[];
    return rows.map((r) => this.rowToProduct(r));
  }

  public update(id: string, updates: Partial<IProduct>): IProduct {
    const current = this.get(id);
    if (!current) throw new Error(`Product '${id}' not found for update.`);

    const now = updates.updatedAt || new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        type = COALESCE(?, type),
        status = COALESCE(?, status),
        version = COALESCE(?, version),
        project_id = COALESCE(?, project_id),
        metadata = COALESCE(?, metadata),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.name || null,
      updates.description !== undefined ? updates.description : null,
      updates.type || null,
      updates.status || null,
      updates.version || null,
      updates.projectId !== undefined ? updates.projectId : null,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      now,
      id
    );

    return this.get(id)!;
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToProduct(row: RawProductRow): IProduct {
    return {
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id || undefined,
      name: row.name,
      description: row.description || undefined,
      type: row.type as ProductType,
      status: row.status as ProductStatus,
      version: row.version,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
