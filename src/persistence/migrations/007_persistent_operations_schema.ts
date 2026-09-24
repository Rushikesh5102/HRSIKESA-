/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 007: Persistent Operations & Scheduling Schema
 *
 * Phase 16: Persistent Autonomous Operations + Open-Source Capability Foundation
 *
 * New tables:
 * 1. schedules - Persistent scheduler records (ONE_TIME, RECURRING, INTERVAL, EVENT_DRIVEN, MANUAL)
 * 2. objective_evaluations - Audit trail of goal evaluation cycles, decisions, and evidence
 *
 * Schema extensions:
 * 3. goals table extended with health_state, derived_health_reason, scheduled_at,
 *    evaluation_schedule, last_evaluated_at, active_mission_id, resource_limits, archived_at
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration007: Migration = {
  version: 7,
  name: '007_persistent_operations_schema',
  up: (db: DatabaseSync): void => {
    // 1. Schedules Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        target_type TEXT NOT NULL, -- 'goal' | 'mission' | 'tool' | 'evaluation' | 'custom'
        target_id TEXT NOT NULL,
        schedule_type TEXT NOT NULL, -- 'ONE_TIME' | 'RECURRING' | 'INTERVAL' | 'EVENT_DRIVEN' | 'MANUAL'
        cron_expression TEXT,
        interval_ms INTEGER,
        event_pattern TEXT,
        next_run_at TEXT,
        last_run_at TEXT,
        run_count INTEGER NOT NULL DEFAULT 0,
        max_runs INTEGER,
        status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED'
        payload TEXT, -- JSON metadata passed on trigger
        created_by TEXT NOT NULL DEFAULT 'rushikesh',
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
      CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run_at);
      CREATE INDEX IF NOT EXISTS idx_schedules_target ON schedules(target_type, target_id);
    `);

    // 2. Objective Evaluations Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS objective_evaluations (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        cycle_number INTEGER NOT NULL DEFAULT 1,
        evaluated_at TEXT NOT NULL,
        previous_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        health_state TEXT NOT NULL,
        health_reason TEXT,
        is_complete INTEGER NOT NULL DEFAULT 0,
        is_blocked INTEGER NOT NULL DEFAULT 0,
        decision TEXT NOT NULL, -- 'CONTINUE' | 'WAIT_APPROVAL' | 'REPLAN' | 'COMPLETE' | 'FAIL' | 'IDLE'
        next_action TEXT,
        child_mission_id TEXT,
        model_calls_used INTEGER NOT NULL DEFAULT 0,
        tasks_evaluated INTEGER NOT NULL DEFAULT 0,
        budget_remaining TEXT,
        evidence TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_obj_evals_goal ON objective_evaluations(goal_id);
      CREATE INDEX IF NOT EXISTS idx_obj_evals_date ON objective_evaluations(evaluated_at);
    `);

    // 3. Extend goals table with Phase 16 persistent fields
    const goalColumns = db.prepare('PRAGMA table_info(goals)').all() as { name: string }[];
    const goalColNames = new Set(goalColumns.map((c) => c.name));

    if (!goalColNames.has('health_state')) {
      db.exec("ALTER TABLE goals ADD COLUMN health_state TEXT NOT NULL DEFAULT 'HEALTHY';");
    }
    if (!goalColNames.has('derived_health_reason')) {
      db.exec('ALTER TABLE goals ADD COLUMN derived_health_reason TEXT;');
    }
    if (!goalColNames.has('scheduled_at')) {
      db.exec('ALTER TABLE goals ADD COLUMN scheduled_at TEXT;');
    }
    if (!goalColNames.has('evaluation_schedule')) {
      db.exec('ALTER TABLE goals ADD COLUMN evaluation_schedule TEXT;');
    }
    if (!goalColNames.has('last_evaluated_at')) {
      db.exec('ALTER TABLE goals ADD COLUMN last_evaluated_at TEXT;');
    }
    if (!goalColNames.has('active_mission_id')) {
      db.exec('ALTER TABLE goals ADD COLUMN active_mission_id TEXT;');
    }
    if (!goalColNames.has('resource_limits')) {
      db.exec('ALTER TABLE goals ADD COLUMN resource_limits TEXT;');
    }
    if (!goalColNames.has('archived_at')) {
      db.exec('ALTER TABLE goals ADD COLUMN archived_at TEXT;');
    }
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS objective_evaluations;
      DROP TABLE IF EXISTS schedules;
    `);
  },
};
