/**
 * HṚṢĪKEŚA (हृषीकेश) — 14-Tier Memory Repository
 *
 * Implements durable CRUD, tier-based filtering, keyword search,
 * and provenance safety controls across all 14 memory tiers.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { MemoryItem, MemoryTier, MemoryProvenance, MemoryQuery } from '../../memory/memory.types.js';

export class MemoryRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Stores a new memory item or updates existing if id/tier+key matches.
   */
  public store(item: {
    id: string;
    tier: MemoryTier;
    key: string;
    content: string;
    source: string;
    provenance: MemoryProvenance;
    confidence?: number;
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, unknown> | null;
  }): MemoryItem {
    const now = new Date().toISOString();
    const createdAt = item.createdAt || now;
    const updatedAt = item.updatedAt || now;
    const confidence = item.confidence !== undefined ? item.confidence : 1.0;
    const metaStr = item.metadata ? JSON.stringify(item.metadata) : null;

    const stmt = this.db.prepare(`
      INSERT INTO memory_items (
        id, tier, key, content, source, provenance, confidence, created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        source = excluded.source,
        provenance = excluded.provenance,
        confidence = excluded.confidence,
        updated_at = excluded.updated_at,
        metadata = excluded.metadata;
    `);

    stmt.run(
      item.id,
      item.tier,
      item.key,
      item.content,
      item.source,
      item.provenance,
      confidence,
      createdAt,
      updatedAt,
      metaStr
    );

    return {
      id: item.id,
      tier: item.tier,
      key: item.key,
      content: item.content,
      source: item.source,
      provenance: item.provenance,
      confidence,
      createdAt,
      updatedAt,
      metadata: item.metadata || null
    };
  }

  /**
   * Retrieves a single memory item by tier and key.
   */
  public retrieve(tier: MemoryTier, key: string): MemoryItem | null {
    const stmt = this.db.prepare(`
      SELECT id, tier, key, content, source, provenance, confidence,
             created_at as createdAt, updated_at as updatedAt, metadata
      FROM memory_items
      WHERE tier = ? AND key = ?
      LIMIT 1;
    `);

    const row = stmt.get(tier, key) as {
      id: string;
      tier: string;
      key: string;
      content: string;
      source: string;
      provenance: string;
      confidence: number;
      createdAt: string;
      updatedAt: string;
      metadata: string | null;
    } | undefined;

    if (!row) {
      return null;
    }

    return this.mapRow(row);
  }

  /**
   * Retrieves a single memory item by unique ID.
   */
  public retrieveById(id: string): MemoryItem | null {
    const stmt = this.db.prepare(`
      SELECT id, tier, key, content, source, provenance, confidence,
             created_at as createdAt, updated_at as updatedAt, metadata
      FROM memory_items
      WHERE id = ?;
    `);

    const row = stmt.get(id) as {
      id: string;
      tier: string;
      key: string;
      content: string;
      source: string;
      provenance: string;
      confidence: number;
      createdAt: string;
      updatedAt: string;
      metadata: string | null;
    } | undefined;

    if (!row) {
      return null;
    }

    return this.mapRow(row);
  }

  /**
   * Lists memory items for a specific tier.
   */
  public listByTier(tier: MemoryTier, limit: number = 50, offset: number = 0): MemoryItem[] {
    const stmt = this.db.prepare(`
      SELECT id, tier, key, content, source, provenance, confidence,
             created_at as createdAt, updated_at as updatedAt, metadata
      FROM memory_items
      WHERE tier = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?;
    `);

    const rows = stmt.all(tier, limit, offset) as Array<{
      id: string;
      tier: string;
      key: string;
      content: string;
      source: string;
      provenance: string;
      confidence: number;
      createdAt: string;
      updatedAt: string;
      metadata: string | null;
    }>;

    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Searches memory content and keys for a substring/keyword.
   */
  public search(query: string, tier?: MemoryTier, limit: number = 20): MemoryItem[] {
    const pattern = `%${query}%`;
    let rows: Array<{
      id: string;
      tier: string;
      key: string;
      content: string;
      source: string;
      provenance: string;
      confidence: number;
      createdAt: string;
      updatedAt: string;
      metadata: string | null;
    }>;

    if (tier) {
      const stmt = this.db.prepare(`
        SELECT id, tier, key, content, source, provenance, confidence,
               created_at as createdAt, updated_at as updatedAt, metadata
        FROM memory_items
        WHERE tier = ? AND (key LIKE ? OR content LIKE ?)
        ORDER BY updated_at DESC
        LIMIT ?;
      `);
      rows = stmt.all(tier, pattern, pattern, limit) as typeof rows;
    } else {
      const stmt = this.db.prepare(`
        SELECT id, tier, key, content, source, provenance, confidence,
               created_at as createdAt, updated_at as updatedAt, metadata
        FROM memory_items
        WHERE key LIKE ? OR content LIKE ?
        ORDER BY updated_at DESC
        LIMIT ?;
      `);
      rows = stmt.all(pattern, pattern, limit) as typeof rows;
    }

    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Flexible query builder across tiers, keys, and provenance.
   */
  public query(q: MemoryQuery): MemoryItem[] {
    const conditions: string[] = [];
    const params: (string | number | null)[] = [];

    if (q.tier) {
      conditions.push('tier = ?');
      params.push(q.tier);
    }
    if (q.key) {
      conditions.push('key = ?');
      params.push(q.key);
    }
    if (q.provenance) {
      conditions.push('provenance = ?');
      params.push(q.provenance);
    }
    if (q.search) {
      conditions.push('(key LIKE ? OR content LIKE ?)');
      params.push(`%${q.search}%`, `%${q.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = q.limit || 50;
    const offset = q.offset || 0;

    params.push(limit, offset);

    const stmt = this.db.prepare(`
      SELECT id, tier, key, content, source, provenance, confidence,
             created_at as createdAt, updated_at as updatedAt, metadata
      FROM memory_items
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?;
    `);

    const rows = stmt.all(...params) as Array<{
      id: string;
      tier: string;
      key: string;
      content: string;
      source: string;
      provenance: string;
      confidence: number;
      createdAt: string;
      updatedAt: string;
      metadata: string | null;
    }>;

    return rows.map((r) => this.mapRow(r));
  }

  public update(id: string, updates: Partial<Omit<MemoryItem, 'id' | 'createdAt'>>): boolean {
    const existing = this.retrieveById(id);
    if (!existing) {
      return false;
    }

    const content = updates.content !== undefined ? updates.content : existing.content;
    const confidence = updates.confidence !== undefined ? updates.confidence : existing.confidence;
    const updatedAt = updates.updatedAt || new Date().toISOString();
    const metaStr = updates.metadata !== undefined
      ? JSON.stringify(updates.metadata)
      : existing.metadata ? JSON.stringify(existing.metadata) : null;

    const stmt = this.db.prepare(`
      UPDATE memory_items
      SET content = ?, confidence = ?, updated_at = ?, metadata = ?
      WHERE id = ?;
    `);

    const res = stmt.run(content, confidence, updatedAt, metaStr, id);
    return Number(res.changes) > 0;
  }

  public delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM memory_items WHERE id = ?;');
    const res = stmt.run(id);
    return Number(res.changes) > 0;
  }

  public countByTier(): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT tier, COUNT(*) as count
      FROM memory_items
      GROUP BY tier;
    `).all() as Array<{ tier: string; count: number }>;

    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r.tier] = Number(r.count);
    }
    return result;
  }

  public countTotal(): number {
    const row = this.db.prepare('SELECT COUNT(*) as total FROM memory_items;').get() as { total: number };
    return Number(row?.total || 0);
  }

  private mapRow(row: {
    id: string;
    tier: string;
    key: string;
    content: string;
    source: string;
    provenance: string;
    confidence: number;
    createdAt: string;
    updatedAt: string;
    metadata: string | null;
  }): MemoryItem {
    return {
      id: row.id,
      tier: row.tier as MemoryTier,
      key: row.key,
      content: row.content,
      source: row.source,
      provenance: row.provenance as MemoryProvenance,
      confidence: Number(row.confidence),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }
}
