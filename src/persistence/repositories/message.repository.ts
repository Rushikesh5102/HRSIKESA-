/**
 * HṚṢĪKEŚA (हृषीकेश) — Durable Message Repository
 */

import { DatabaseManager } from '../database/database.manager.js';
import { ChatRole } from '../../models/interfaces/model.types.js';

export interface MessageRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly role: ChatRole;
  readonly content: string;
  readonly timestamp: string;
  readonly model: string | null;
  readonly provider: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly ordinal: number;
}

export class MessageRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public getNextOrdinal(sessionId: string): number {
    const row = this.db.prepare(
      'SELECT COALESCE(MAX(ordinal), -1) + 1 as nextOrdinal FROM messages WHERE session_id = ?;'
    ).get(sessionId) as { nextOrdinal: number } | undefined;

    return Number(row?.nextOrdinal ?? 0);
  }

  public create(params: {
    id: string;
    sessionId: string;
    role: ChatRole;
    content: string;
    timestamp?: string;
    model?: string;
    provider?: string;
    metadata?: Record<string, unknown>;
    ordinal?: number;
  }): MessageRecord {
    const timestamp = params.timestamp || new Date().toISOString();
    const ordinal = params.ordinal !== undefined ? params.ordinal : this.getNextOrdinal(params.sessionId);
    const model = params.model || null;
    const provider = params.provider || null;
    const metaStr = params.metadata ? JSON.stringify(params.metadata) : null;

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp, model, provider, metadata, ordinal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      params.id,
      params.sessionId,
      params.role,
      params.content,
      timestamp,
      model,
      provider,
      metaStr,
      ordinal
    );

    return {
      id: params.id,
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      timestamp,
      model,
      provider,
      metadata: params.metadata || null,
      ordinal
    };
  }

  /**
   * Retrieves messages for a session in strict chronological order (ascending ordinal).
   */
  public findBySessionId(sessionId: string, limit: number = 1000, offset: number = 0): MessageRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, session_id as sessionId, role, content, timestamp, model, provider, metadata, ordinal
      FROM messages
      WHERE session_id = ?
      ORDER BY ordinal ASC
      LIMIT ? OFFSET ?;
    `);

    const rows = stmt.all(sessionId, limit, offset) as Array<{
      id: string;
      sessionId: string;
      role: string;
      content: string;
      timestamp: string;
      model: string | null;
      provider: string | null;
      metadata: string | null;
      ordinal: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      role: r.role as ChatRole,
      content: r.content,
      timestamp: r.timestamp,
      model: r.model,
      provider: r.provider,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
      ordinal: Number(r.ordinal)
    }));
  }

  /**
   * Retrieves the most recent N messages for a session, preserving chronological order.
   */
  public findRecentBySessionId(sessionId: string, limit: number = 20): MessageRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, session_id as sessionId, role, content, timestamp, model, provider, metadata, ordinal
      FROM (
        SELECT id, session_id, role, content, timestamp, model, provider, metadata, ordinal
        FROM messages
        WHERE session_id = ?
        ORDER BY ordinal DESC
        LIMIT ?
      )
      ORDER BY ordinal ASC;
    `);

    const rows = stmt.all(sessionId, limit) as Array<{
      id: string;
      sessionId: string;
      role: string;
      content: string;
      timestamp: string;
      model: string | null;
      provider: string | null;
      metadata: string | null;
      ordinal: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      role: r.role as ChatRole,
      content: r.content,
      timestamp: r.timestamp,
      model: r.model,
      provider: r.provider,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
      ordinal: Number(r.ordinal)
    }));
  }

  public countBySessionId(sessionId: string): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) as total FROM messages WHERE session_id = ?;'
    ).get(sessionId) as { total: number } | undefined;

    return Number(row?.total || 0);
  }

  public deleteBySessionId(sessionId: string): number {
    const stmt = this.db.prepare('DELETE FROM messages WHERE session_id = ?;');
    const result = stmt.run(sessionId);
    return Number(result.changes);
  }

  public countAll(): number {
    const row = this.db.prepare('SELECT COUNT(*) as total FROM messages;').get() as { total: number } | undefined;
    return Number(row?.total || 0);
  }
}
