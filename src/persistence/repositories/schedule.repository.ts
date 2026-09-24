/**
 * HṚṢĪKEŚA (हृषीकेश) — Persistent Schedule Repository
 *
 * Phase 16: Persistent Scheduler Storage
 */

import { DatabaseManager } from '../database/database.manager.js';

export type ScheduleTargetType = 'goal' | 'mission' | 'tool' | 'evaluation' | 'custom';
export type ScheduleType = 'ONE_TIME' | 'RECURRING' | 'INTERVAL' | 'EVENT_DRIVEN' | 'MANUAL';
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface PersistentScheduleRecord {
  id: string;
  name: string;
  description?: string;
  targetType: ScheduleTargetType;
  targetId: string;
  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalMs?: number;
  eventPattern?: string;
  nextRunAt?: string;
  lastRunAt?: string;
  runCount: number;
  maxRuns?: number;
  status: ScheduleStatus;
  payload?: Record<string, unknown>;
  createdBy: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class ScheduleRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(schedule: PersistentScheduleRecord): PersistentScheduleRecord {
    const stmt = this.db.prepare(`
      INSERT INTO schedules (
        id, name, description, target_type, target_id, schedule_type,
        cron_expression, interval_ms, event_pattern, next_run_at, last_run_at,
        run_count, max_runs, status, payload, created_by, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      schedule.id,
      schedule.name,
      schedule.description ?? null,
      schedule.targetType,
      schedule.targetId,
      schedule.scheduleType,
      schedule.cronExpression ?? null,
      schedule.intervalMs ?? null,
      schedule.eventPattern ?? null,
      schedule.nextRunAt ?? null,
      schedule.lastRunAt ?? null,
      schedule.runCount ?? 0,
      schedule.maxRuns ?? null,
      schedule.status ?? 'ACTIVE',
      schedule.payload ? JSON.stringify(schedule.payload) : null,
      schedule.createdBy ?? 'rushikesh',
      schedule.metadata ? JSON.stringify(schedule.metadata) : null,
      schedule.createdAt,
      schedule.updatedAt
    );

    return schedule;
  }

  public get(id: string): PersistentScheduleRecord | null {
    const stmt = this.db.prepare('SELECT * FROM schedules WHERE id = ?;');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  public findById(id: string): PersistentScheduleRecord | null {
    return this.get(id);
  }

  public list(filter?: { status?: ScheduleStatus; targetType?: ScheduleTargetType; targetId?: string }): PersistentScheduleRecord[] {
    let sql = 'SELECT * FROM schedules WHERE 1=1';
    const params: (string | number | null)[] = [];

    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.targetType) {
      sql += ' AND target_type = ?';
      params.push(filter.targetType);
    }
    if (filter?.targetId) {
      sql += ' AND target_id = ?';
      params.push(filter.targetId);
    }

    sql += ' ORDER BY created_at DESC;';
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapRow(r));
  }

  public findAll(): PersistentScheduleRecord[] {
    return this.list();
  }

  public listDue(nowIso: string): PersistentScheduleRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM schedules
      WHERE status = 'ACTIVE'
        AND next_run_at IS NOT NULL
        AND next_run_at <= ?
      ORDER BY next_run_at ASC;
    `);

    const rows = stmt.all(nowIso) as Record<string, unknown>[];
    return rows.map((r) => this.mapRow(r));
  }

  public update(id: string, updates: Partial<PersistentScheduleRecord>): PersistentScheduleRecord | null {
    const existing = this.get(id);
    if (!existing) return null;

    const updated: PersistentScheduleRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE schedules SET
        name = ?, description = ?, target_type = ?, target_id = ?, schedule_type = ?,
        cron_expression = ?, interval_ms = ?, event_pattern = ?, next_run_at = ?, last_run_at = ?,
        run_count = ?, max_runs = ?, status = ?, payload = ?, metadata = ?, updated_at = ?
      WHERE id = ?;
    `);

    stmt.run(
      updated.name,
      updated.description ?? null,
      updated.targetType,
      updated.targetId,
      updated.scheduleType,
      updated.cronExpression ?? null,
      updated.intervalMs ?? null,
      updated.eventPattern ?? null,
      updated.nextRunAt ?? null,
      updated.lastRunAt ?? null,
      updated.runCount,
      updated.maxRuns ?? null,
      updated.status,
      updated.payload ? JSON.stringify(updated.payload) : null,
      updated.metadata ? JSON.stringify(updated.metadata) : null,
      updated.updatedAt,
      id
    );

    return updated;
  }

  public delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM schedules WHERE id = ?;');
    const res = stmt.run(id);
    return res.changes > 0;
  }

  private mapRow(row: Record<string, unknown>): PersistentScheduleRecord {
    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : undefined,
      targetType: row.target_type as ScheduleTargetType,
      targetId: String(row.target_id),
      scheduleType: row.schedule_type as ScheduleType,
      cronExpression: row.cron_expression ? String(row.cron_expression) : undefined,
      intervalMs: row.interval_ms !== null && row.interval_ms !== undefined ? Number(row.interval_ms) : undefined,
      eventPattern: row.event_pattern ? String(row.event_pattern) : undefined,
      nextRunAt: row.next_run_at ? String(row.next_run_at) : undefined,
      lastRunAt: row.last_run_at ? String(row.last_run_at) : undefined,
      runCount: Number(row.run_count ?? 0),
      maxRuns: row.max_runs !== null && row.max_runs !== undefined ? Number(row.max_runs) : undefined,
      status: (row.status as ScheduleStatus) ?? 'ACTIVE',
      payload: row.payload ? JSON.parse(String(row.payload)) : undefined,
      createdBy: String(row.created_by ?? 'rushikesh'),
      metadata: row.metadata ? JSON.parse(String(row.metadata)) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
