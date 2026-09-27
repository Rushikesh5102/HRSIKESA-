/**
 * HṚṢĪKEŚA (हृषीकेश) — Working Memory Item Repository
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  WorkingMemoryItem,
  WorkingMemoryItemType,
  WorkingMemoryScope,
  WorkingMemorySource,
  WorkingMemoryItemStatus,
} from '../interfaces/working-memory.types.js';

interface RawItemRow {
  id: string;
  session_id: string;
  thread_id: string | null;
  type: string;
  content: string;
  scope: string;
  source: string;
  confidence: number;
  status: string;
  priority: number;
  related_entity_id: string | null;
  related_project_id: string | null;
  related_company_id: string | null;
  related_goal_id: string | null;
  related_mission_id: string | null;
  related_task_id: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  last_referenced_at: string;
  expires_at: string | null;
}

export class WorkingMemoryItemRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  private mapRow(row: RawItemRow): WorkingMemoryItem {
    return {
      id: row.id,
      sessionId: row.session_id,
      threadId: row.thread_id ?? undefined,
      type: row.type as WorkingMemoryItemType,
      content: row.content,
      scope: row.scope as WorkingMemoryScope,
      source: row.source as WorkingMemorySource,
      confidence: Number(row.confidence),
      status: row.status as WorkingMemoryItemStatus,
      priority: Number(row.priority),
      relatedEntityId: row.related_entity_id ?? undefined,
      relatedProjectId: row.related_project_id ?? undefined,
      relatedCompanyId: row.related_company_id ?? undefined,
      relatedGoalId: row.related_goal_id ?? undefined,
      relatedMissionId: row.related_mission_id ?? undefined,
      relatedTaskId: row.related_task_id ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastReferencedAt: row.last_referenced_at,
      expiresAt: row.expires_at ?? undefined,
    };
  }

  public createItem(data: {
    id?: string;
    sessionId: string;
    threadId?: string;
    type: WorkingMemoryItemType;
    content: string;
    scope?: WorkingMemoryScope;
    source?: WorkingMemorySource;
    confidence?: number;
    status?: WorkingMemoryItemStatus;
    priority?: number;
    relatedEntityId?: string;
    relatedProjectId?: string;
    relatedCompanyId?: string;
    relatedGoalId?: string;
    relatedMissionId?: string;
    relatedTaskId?: string;
    metadata?: Record<string, unknown>;
    expiresAt?: string;
  }): WorkingMemoryItem {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const scope = data.scope || 'SESSION';
    const source = data.source || 'SYSTEM';
    const confidence = data.confidence ?? 1.0;
    const status = data.status || 'ACTIVE';
    const priority = data.priority ?? 50;

    const stmt = this.db.prepare(`
      INSERT INTO working_memory_items (
        id, session_id, thread_id, type, content, scope, source, confidence,
        status, priority, related_entity_id, related_project_id, related_company_id,
        related_goal_id, related_mission_id, related_task_id, metadata,
        created_at, updated_at, last_referenced_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.sessionId,
      data.threadId ?? null,
      data.type,
      data.content,
      scope,
      source,
      confidence,
      status,
      priority,
      data.relatedEntityId ?? null,
      data.relatedProjectId ?? null,
      data.relatedCompanyId ?? null,
      data.relatedGoalId ?? null,
      data.relatedMissionId ?? null,
      data.relatedTaskId ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now,
      now,
      now,
      data.expiresAt ?? null
    );

    return {
      id,
      sessionId: data.sessionId,
      threadId: data.threadId,
      type: data.type,
      content: data.content,
      scope,
      source,
      confidence,
      status,
      priority,
      relatedEntityId: data.relatedEntityId,
      relatedProjectId: data.relatedProjectId,
      relatedCompanyId: data.relatedCompanyId,
      relatedGoalId: data.relatedGoalId,
      relatedMissionId: data.relatedMissionId,
      relatedTaskId: data.relatedTaskId,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
      lastReferencedAt: now,
      expiresAt: data.expiresAt,
    };
  }

  public getById(id: string): WorkingMemoryItem | null {
    const stmt = this.db.prepare('SELECT * FROM working_memory_items WHERE id = ?');
    const row = stmt.get(id) as RawItemRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  public listActiveBySession(sessionId: string, limit = 50): WorkingMemoryItem[] {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM working_memory_items
      WHERE session_id = ?
        AND status = 'ACTIVE'
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY priority DESC, last_referenced_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(sessionId, now, limit) as unknown as RawItemRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public listActiveByThread(threadId: string, limit = 50): WorkingMemoryItem[] {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM working_memory_items
      WHERE thread_id = ?
        AND status = 'ACTIVE'
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY priority DESC, last_referenced_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(threadId, now, limit) as unknown as RawItemRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public listActiveByType(sessionId: string, type: WorkingMemoryItemType, limit = 10): WorkingMemoryItem[] {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM working_memory_items
      WHERE session_id = ?
        AND type = ?
        AND status = 'ACTIVE'
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY priority DESC, last_referenced_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(sessionId, type, now, limit) as unknown as RawItemRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public listRecentActive(limit = 20): WorkingMemoryItem[] {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM working_memory_items
      WHERE status = 'ACTIVE'
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY last_referenced_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(now, limit) as unknown as RawItemRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public touch(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE working_memory_items SET last_referenced_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
  }

  public updateStatus(id: string, status: WorkingMemoryItemStatus): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE working_memory_items SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  }

  public supersedeType(sessionId: string, type: WorkingMemoryItemType, exceptId?: string): void {
    const now = new Date().toISOString();
    if (exceptId) {
      this.db.prepare(`
        UPDATE working_memory_items
        SET status = 'SUPERSEDED', updated_at = ?
        WHERE session_id = ? AND type = ? AND id != ? AND status = 'ACTIVE'
      `).run(now, sessionId, type, exceptId);
    } else {
      this.db.prepare(`
        UPDATE working_memory_items
        SET status = 'SUPERSEDED', updated_at = ?
        WHERE session_id = ? AND type = ? AND status = 'ACTIVE'
      `).run(now, sessionId, type);
    }
  }

  public expireOldItems(): number {
    const now = new Date().toISOString();
    const res = this.db.prepare(`
      UPDATE working_memory_items
      SET status = 'EXPIRED', updated_at = ?
      WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= ?
    `).run(now, now);
    return Number(res.changes);
  }

  public delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM working_memory_items WHERE id = ?').run(id);
    return res.changes > 0;
  }
}
