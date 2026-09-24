/**
 * HRSIKESA - Agent Blackboard
 *
 * Shared structured findings store for multi-agent missions.
 * Agents publish findings; the orchestrator and other agents query them.
 */

import { randomUUID } from 'node:crypto';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { BlackboardEntry } from '../interfaces/mission.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

interface RawBlackboardRow {
  id: string;
  mission_id: string;
  task_id: string;
  agent_id: string;
  type: string;
  title: string;
  content: string;
  evidence: string | null;
  created_at: string;
}

export class AgentBlackboard {
  private readonly db: DatabaseManager;
  private readonly logger?: ILogger;

  constructor(db: DatabaseManager, logger?: ILogger) {
    this.db = db;
    this.logger = logger?.child('AgentBlackboard');
  }

  public publish(
    missionId: string,
    taskId: string,
    agentId: string,
    entry: {
      type: string;
      title: string;
      content: string;
      evidence?: string[];
    }
  ): BlackboardEntry {
    const id = 'bb_' + randomUUID().replace(/-/g, '').substring(0, 16);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO blackboard_entries (id, mission_id, task_id, agent_id, type, title, content, evidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      missionId,
      taskId,
      agentId,
      entry.type,
      entry.title,
      entry.content,
      entry.evidence ? JSON.stringify(entry.evidence) : null,
      now
    );

    this.logger?.debug('Published blackboard entry [' + id + '] for mission [' + missionId + '] type=' + entry.type);

    return {
      id,
      missionId,
      taskId,
      agentId,
      type: entry.type,
      title: entry.title,
      content: entry.content,
      evidence: entry.evidence,
      createdAt: now
    };
  }

  public get(id: string): BlackboardEntry | undefined {
    const row = this.db.prepare(
      'SELECT * FROM blackboard_entries WHERE id = ?'
    ).get(id) as unknown as RawBlackboardRow | undefined;
    if (!row) return undefined;
    return this.rowToEntry(row);
  }

  public listByMission(missionId: string, type?: string): BlackboardEntry[] {
    return this.query(missionId, type);
  }

  public listByTask(taskId: string): BlackboardEntry[] {
    const rows = this.db.prepare(
      'SELECT * FROM blackboard_entries WHERE task_id = ? ORDER BY created_at ASC'
    ).all(taskId) as unknown as RawBlackboardRow[];
    return rows.map(r => this.rowToEntry(r));
  }

  public listByAgent(agentId: string): BlackboardEntry[] {
    const rows = this.db.prepare(
      'SELECT * FROM blackboard_entries WHERE agent_id = ? ORDER BY created_at ASC'
    ).all(agentId) as unknown as RawBlackboardRow[];
    return rows.map(r => this.rowToEntry(r));
  }

  public query(missionId: string, type?: string): BlackboardEntry[] {
    let rows: RawBlackboardRow[];
    if (type) {
      rows = this.db.prepare(
        'SELECT * FROM blackboard_entries WHERE mission_id = ? AND type = ? ORDER BY created_at ASC'
      ).all(missionId, type) as unknown as RawBlackboardRow[];
    } else {
      rows = this.db.prepare(
        'SELECT * FROM blackboard_entries WHERE mission_id = ? ORDER BY created_at ASC'
      ).all(missionId) as unknown as RawBlackboardRow[];
    }
    return rows.map(r => this.rowToEntry(r));
  }

  public clear(missionId: string): number {
    const result = this.db.prepare(
      'DELETE FROM blackboard_entries WHERE mission_id = ?'
    ).run(missionId);
    return Number(result.changes);
  }

  private rowToEntry(row: RawBlackboardRow): BlackboardEntry {
    return {
      id: row.id,
      missionId: row.mission_id,
      taskId: row.task_id,
      agentId: row.agent_id,
      type: row.type,
      title: row.title,
      content: row.content,
      evidence: row.evidence ? JSON.parse(row.evidence) : undefined,
      createdAt: row.created_at
    };
  }
}
