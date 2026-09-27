/**
 * HṚṢĪKEŚA (हृषीकेश) — Conversation Checkpoint Repository
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  ConversationCheckpoint,
  CheckpointState,
} from '../interfaces/working-memory.types.js';

interface RawCheckpointRow {
  id: string;
  session_id: string;
  thread_id: string;
  title: string;
  project_id: string | null;
  company_id: string | null;
  goal_id: string | null;
  mission_id: string | null;
  task_id: string | null;
  status: string;
  state_json: string;
  created_at: string;
  updated_at: string;
}

export class ConversationCheckpointRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  private mapRow(row: RawCheckpointRow): ConversationCheckpoint {
    let state: CheckpointState;
    try {
      state = JSON.parse(row.state_json);
    } catch {
      state = {
        assumptions: [],
        recentDecisions: [],
        pendingItems: [],
        blockers: [],
        nextSteps: [],
        timestamp: row.created_at,
      };
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      threadId: row.thread_id,
      title: row.title,
      projectId: row.project_id ?? undefined,
      companyId: row.company_id ?? undefined,
      goalId: row.goal_id ?? undefined,
      missionId: row.mission_id ?? undefined,
      taskId: row.task_id ?? undefined,
      status: row.status as 'ACTIVE' | 'SUPERSEDED' | 'RESTORED',
      state,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public createCheckpoint(data: {
    id?: string;
    sessionId: string;
    threadId: string;
    title: string;
    projectId?: string;
    companyId?: string;
    goalId?: string;
    missionId?: string;
    taskId?: string;
    status?: 'ACTIVE' | 'SUPERSEDED' | 'RESTORED';
    state: CheckpointState;
  }): ConversationCheckpoint {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    const status = data.status || 'ACTIVE';

    // Supersede previous active checkpoints for this session and thread
    this.db.prepare(`
      UPDATE conversation_checkpoints
      SET status = 'SUPERSEDED', updated_at = ?
      WHERE session_id = ? AND thread_id = ? AND status = 'ACTIVE'
    `).run(now, data.sessionId, data.threadId);

    const stmt = this.db.prepare(`
      INSERT INTO conversation_checkpoints (
        id, session_id, thread_id, title, project_id, company_id,
        goal_id, mission_id, task_id, status, state_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.sessionId,
      data.threadId,
      data.title,
      data.projectId ?? null,
      data.companyId ?? null,
      data.goalId ?? null,
      data.missionId ?? null,
      data.taskId ?? null,
      status,
      JSON.stringify(data.state),
      now,
      now
    );

    return {
      id,
      sessionId: data.sessionId,
      threadId: data.threadId,
      title: data.title,
      projectId: data.projectId,
      companyId: data.companyId,
      goalId: data.goalId,
      missionId: data.missionId,
      taskId: data.taskId,
      status,
      state: data.state,
      createdAt: now,
      updatedAt: now,
    };
  }

  public getById(id: string): ConversationCheckpoint | null {
    const stmt = this.db.prepare('SELECT * FROM conversation_checkpoints WHERE id = ?');
    const row = stmt.get(id) as RawCheckpointRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  public getLatestActive(sessionId?: string): ConversationCheckpoint | null {
    if (sessionId) {
      const stmt = this.db.prepare(`
        SELECT * FROM conversation_checkpoints
        WHERE session_id = ? AND status = 'ACTIVE'
        ORDER BY created_at DESC LIMIT 1
      `);
      const row = stmt.get(sessionId) as RawCheckpointRow | undefined;
      return row ? this.mapRow(row) : null;
    }
    const stmt = this.db.prepare(`
      SELECT * FROM conversation_checkpoints
      WHERE status = 'ACTIVE'
      ORDER BY created_at DESC LIMIT 1
    `);
    const row = stmt.get() as RawCheckpointRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  public getLatestAnySession(): ConversationCheckpoint | null {
    const stmt = this.db.prepare(`
      SELECT * FROM conversation_checkpoints
      ORDER BY created_at DESC LIMIT 1
    `);
    const row = stmt.get() as RawCheckpointRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  public listBySession(sessionId: string): ConversationCheckpoint[] {
    const stmt = this.db.prepare(`
      SELECT * FROM conversation_checkpoints
      WHERE session_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(sessionId) as unknown as RawCheckpointRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public listAll(limit = 20): ConversationCheckpoint[] {
    const stmt = this.db.prepare(`
      SELECT * FROM conversation_checkpoints
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as unknown as RawCheckpointRow[];
    return rows.map((r) => this.mapRow(r));
  }

  public markRestored(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE conversation_checkpoints SET status = 'RESTORED', updated_at = ? WHERE id = ?").run(now, id);
  }

  public delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM conversation_checkpoints WHERE id = ?').run(id);
    return res.changes > 0;
  }
}
