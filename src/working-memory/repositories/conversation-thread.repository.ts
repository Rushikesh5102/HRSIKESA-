/**
 * HṚṢĪKEŚA (हृषीकेश) — Conversation Thread Repository
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { ConversationThread, ThreadStatus } from '../interfaces/working-memory.types.js';

interface RawThreadRow {
  id: string;
  session_id: string;
  title: string;
  status: string;
  target_project_id: string | null;
  target_company_id: string | null;
  target_goal_id: string | null;
  target_mission_id: string | null;
  active_task_id: string | null;
  priority: number;
  summary: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export class ConversationThreadRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  private mapRow(row: RawThreadRow): ConversationThread {
    return {
      id: row.id,
      sessionId: row.session_id,
      title: row.title,
      status: row.status as ThreadStatus,
      targetProjectId: row.target_project_id ?? undefined,
      targetCompanyId: row.target_company_id ?? undefined,
      targetGoalId: row.target_goal_id ?? undefined,
      targetMissionId: row.target_mission_id ?? undefined,
      activeTaskId: row.active_task_id ?? undefined,
      priority: Number(row.priority),
      summary: row.summary ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };
  }

  public createThread(data: {
    id?: string;
    sessionId: string;
    title: string;
    status?: ThreadStatus;
    targetProjectId?: string;
    targetCompanyId?: string;
    targetGoalId?: string;
    targetMissionId?: string;
    activeTaskId?: string;
    priority?: number;
    summary?: string;
    metadata?: Record<string, unknown>;
  }): ConversationThread {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const status = data.status || 'ACTIVE';
    const priority = data.priority ?? 50;

    const stmt = this.db.prepare(`
      INSERT INTO conversation_threads (
        id, session_id, title, status, target_project_id, target_company_id,
        target_goal_id, target_mission_id, active_task_id, priority, summary,
        metadata, created_at, updated_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.sessionId,
      data.title,
      status,
      data.targetProjectId ?? null,
      data.targetCompanyId ?? null,
      data.targetGoalId ?? null,
      data.targetMissionId ?? null,
      data.activeTaskId ?? null,
      priority,
      data.summary ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now,
      now,
      now
    );

    return {
      id,
      sessionId: data.sessionId,
      title: data.title,
      status,
      targetProjectId: data.targetProjectId,
      targetCompanyId: data.targetCompanyId,
      targetGoalId: data.targetGoalId,
      targetMissionId: data.targetMissionId,
      activeTaskId: data.activeTaskId,
      priority,
      summary: data.summary,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };
  }

  public getById(id: string): ConversationThread | null {
    const stmt = this.db.prepare('SELECT * FROM conversation_threads WHERE id = ?');
    const row = stmt.get(id) as RawThreadRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  public listBySession(sessionId: string, status?: ThreadStatus): ConversationThread[] {
    if (status) {
      const stmt = this.db.prepare(
        'SELECT * FROM conversation_threads WHERE session_id = ? AND status = ? ORDER BY last_active_at DESC'
      );
      const rows = stmt.all(sessionId, status) as unknown as RawThreadRow[];
      return rows.map((r) => this.mapRow(r));
    }
    const stmt = this.db.prepare(
      'SELECT * FROM conversation_threads WHERE session_id = ? ORDER BY last_active_at DESC'
    );
    const rows = stmt.all(sessionId) as unknown as RawThreadRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public listActive(limit = 10): ConversationThread[] {
    const stmt = this.db.prepare(
      "SELECT * FROM conversation_threads WHERE status = 'ACTIVE' ORDER BY last_active_at DESC LIMIT ?"
    );
    const rows = stmt.all(limit) as unknown as RawThreadRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public getActiveThreadForSession(sessionId: string): ConversationThread | null {
    const stmt = this.db.prepare(
      "SELECT * FROM conversation_threads WHERE session_id = ? AND status = 'ACTIVE' ORDER BY last_active_at DESC LIMIT 1"
    );
    const row = stmt.get(sessionId) as unknown as RawThreadRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  public getLatestThreadAcrossSessions(limit = 1): ConversationThread[] {
    const stmt = this.db.prepare(
      "SELECT * FROM conversation_threads WHERE status IN ('ACTIVE', 'PAUSED', 'BLOCKED', 'RESUMABLE') ORDER BY last_active_at DESC LIMIT ?"
    );
    const rows = stmt.all(limit) as unknown as RawThreadRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public update(
    id: string,
    updates: Partial<{
      sessionId: string;
      title: string;
      status: ThreadStatus;
      targetProjectId: string | null;
      targetCompanyId: string | null;
      targetGoalId: string | null;
      targetMissionId: string | null;
      activeTaskId: string | null;
      priority: number;
      summary: string | null;
      metadata: Record<string, unknown>;
      lastActiveAt: string;
    }>
  ): ConversationThread | null {
    const current = this.getById(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.sessionId !== undefined) {
      fields.push('session_id = ?');
      values.push(updates.sessionId);
    }
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.targetProjectId !== undefined) {
      fields.push('target_project_id = ?');
      values.push(updates.targetProjectId);
    }
    if (updates.targetCompanyId !== undefined) {
      fields.push('target_company_id = ?');
      values.push(updates.targetCompanyId);
    }
    if (updates.targetGoalId !== undefined) {
      fields.push('target_goal_id = ?');
      values.push(updates.targetGoalId);
    }
    if (updates.targetMissionId !== undefined) {
      fields.push('target_mission_id = ?');
      values.push(updates.targetMissionId);
    }
    if (updates.activeTaskId !== undefined) {
      fields.push('active_task_id = ?');
      values.push(updates.activeTaskId);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.summary !== undefined) {
      fields.push('summary = ?');
      values.push(updates.summary);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.lastActiveAt !== undefined) {
      fields.push('last_active_at = ?');
      values.push(updates.lastActiveAt);
    } else {
      fields.push('last_active_at = ?');
      values.push(now);
    }

    values.push(id);
    const sql = `UPDATE conversation_threads SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    return this.getById(id);
  }

  public touch(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE conversation_threads SET last_active_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
  }

  public delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM conversation_threads WHERE id = ?').run(id);
    return res.changes > 0;
  }
}
