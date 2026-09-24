/**
 * HṚṢĪKEŚA (हृषीकेश) — Durable Session Repository
 */

import { DatabaseManager } from '../database/database.manager.js';

export interface SessionRecord {
  readonly id: string;
  readonly title: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: Record<string, unknown> | null;
}

export class SessionRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(params: {
    id: string;
    title?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, unknown>;
  }): SessionRecord {
    const now = new Date().toISOString();
    const createdAt = params.createdAt || now;
    const updatedAt = params.updatedAt || now;
    const status = params.status || 'active';
    const title = params.title || null;
    const metaStr = params.metadata ? JSON.stringify(params.metadata) : null;

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, title, status, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?);
    `);

    stmt.run(params.id, title, status, createdAt, updatedAt, metaStr);

    return {
      id: params.id,
      title,
      status,
      createdAt,
      updatedAt,
      metadata: params.metadata || null
    };
  }

  public findById(id: string): SessionRecord | null {
    const stmt = this.db.prepare(`
      SELECT id, title, status, created_at as createdAt, updated_at as updatedAt, metadata
      FROM sessions
      WHERE id = ?;
    `);

    const row = stmt.get(id) as {
      id: string;
      title: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
      metadata: string | null;
    } | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  public findAll(limit: number = 50, offset: number = 0): SessionRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, title, status, created_at as createdAt, updated_at as updatedAt, metadata
      FROM sessions
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?;
    `);

    const rows = stmt.all(limit, offset) as Array<{
      id: string;
      title: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
      metadata: string | null;
    }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      metadata: r.metadata ? JSON.parse(r.metadata) : null
    }));
  }

  public touch(id: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE sessions
      SET updated_at = ?
      WHERE id = ?;
    `);
    stmt.run(now, id);
  }

  public update(
    id: string,
    updates: {
      title?: string;
      status?: string;
      updatedAt?: string;
      metadata?: Record<string, unknown>;
    }
  ): boolean {
    const existing = this.findById(id);
    if (!existing) {
      return false;
    }

    const title = updates.title !== undefined ? updates.title : existing.title;
    const status = updates.status !== undefined ? updates.status : existing.status;
    const updatedAt = updates.updatedAt || new Date().toISOString();
    const metaStr = updates.metadata !== undefined
      ? JSON.stringify(updates.metadata)
      : existing.metadata ? JSON.stringify(existing.metadata) : null;

    const stmt = this.db.prepare(`
      UPDATE sessions
      SET title = ?, status = ?, updated_at = ?, metadata = ?
      WHERE id = ?;
    `);

    const res = stmt.run(title, status, updatedAt, metaStr, id);
    return Number(res.changes) > 0;
  }

  public delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?;');
    const res = stmt.run(id);
    return Number(res.changes) > 0;
  }

  public count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as total FROM sessions;').get() as { total: number };
    return Number(row?.total || 0);
  }
}
