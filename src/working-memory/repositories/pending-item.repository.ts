/**
 * HṚṢĪKEŚA (हृषीकेश) — Pending Item Repository
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  PendingItem,
  PendingItemType,
  PendingItemStatus,
} from '../interfaces/working-memory.types.js';

interface RawPendingRow {
  id: string;
  session_id: string;
  thread_id: string | null;
  type: string;
  description: string;
  status: string;
  priority: number;
  assigned_agent_id: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export class PendingItemRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  private mapRow(row: RawPendingRow): PendingItem {
    return {
      id: row.id,
      sessionId: row.session_id,
      threadId: row.thread_id ?? undefined,
      type: row.type as PendingItemType,
      description: row.description,
      status: row.status as PendingItemStatus,
      priority: Number(row.priority),
      assignedAgentId: row.assigned_agent_id ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at ?? undefined,
    };
  }

  public createPendingItem(data: {
    id?: string;
    sessionId: string;
    threadId?: string;
    type: PendingItemType;
    description: string;
    status?: PendingItemStatus;
    priority?: number;
    assignedAgentId?: string;
    metadata?: Record<string, unknown>;
    expiresAt?: string;
  }): PendingItem {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const status = data.status || 'OPEN';
    const priority = data.priority ?? 50;

    const stmt = this.db.prepare(`
      INSERT INTO pending_items (
        id, session_id, thread_id, type, description, status, priority,
        assigned_agent_id, metadata, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.sessionId,
      data.threadId ?? null,
      data.type,
      data.description,
      status,
      priority,
      data.assignedAgentId ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now,
      now,
      data.expiresAt ?? null
    );

    return {
      id,
      sessionId: data.sessionId,
      threadId: data.threadId,
      type: data.type,
      description: data.description,
      status,
      priority,
      assignedAgentId: data.assignedAgentId,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt: data.expiresAt,
    };
  }

  public getById(id: string): PendingItem | null {
    const stmt = this.db.prepare('SELECT * FROM pending_items WHERE id = ?');
    const row = stmt.get(id) as RawPendingRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  public listOpenBySession(sessionId: string, limit = 20): PendingItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pending_items
      WHERE session_id = ? AND status = 'OPEN'
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `);
    const rows = stmt.all(sessionId, limit) as unknown as RawPendingRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public listOpen(limit = 20): PendingItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pending_items
      WHERE status = 'OPEN'
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as unknown as RawPendingRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public updateStatus(id: string, status: PendingItemStatus): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE pending_items SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  }

  public delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM pending_items WHERE id = ?').run(id);
    return res.changes > 0;
  }
}
