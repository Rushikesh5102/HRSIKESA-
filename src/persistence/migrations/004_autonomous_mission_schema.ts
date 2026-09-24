/**
 * HRSIKESA - Migration 004: Autonomous Mission, Task DAG, and Artifacts Schema
 *
 * New tables and columns:
 * 1. mission_artifacts - Track files, URLs, screenshots, and processes produced by missions
 * 2. agent_missions schema extension - plan, budget, report, blocked_reason, intervention_request
 * 3. agent_tasks schema extension - title, dependencies, retry_count, max_retries, verification_strategy, verification_result, observation
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration004: Migration = {
  version: 4,
  name: '004_autonomous_mission_schema',
  up: (db: DatabaseSync): void => {
    // 1. Mission Artifacts Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS mission_artifacts (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT NOT NULL,
        name TEXT NOT NULL,
        metadata TEXT,
        verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mission_artifacts_mission ON mission_artifacts(mission_id);
      CREATE INDEX IF NOT EXISTS idx_mission_artifacts_task ON mission_artifacts(task_id);
    `);

    // 2. Extend agent_missions table
    const missionColumns = db.prepare('PRAGMA table_info(agent_missions)').all() as { name: string }[];
    const missionColNames = new Set(missionColumns.map(c => c.name));

    if (!missionColNames.has('plan')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN plan TEXT;');
    }
    if (!missionColNames.has('budget')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN budget TEXT;');
    }
    if (!missionColNames.has('report')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN report TEXT;');
    }
    if (!missionColNames.has('blocked_reason')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN blocked_reason TEXT;');
    }
    if (!missionColNames.has('intervention_request')) {
      db.exec('ALTER TABLE agent_missions ADD COLUMN intervention_request TEXT;');
    }

    // 3. Extend agent_tasks table
    const taskColumns = db.prepare('PRAGMA table_info(agent_tasks)').all() as { name: string }[];
    const taskColNames = new Set(taskColumns.map(c => c.name));

    if (!taskColNames.has('title')) {
      db.exec('ALTER TABLE agent_tasks ADD COLUMN title TEXT;');
    }
    if (!taskColNames.has('dependencies')) {
      db.exec('ALTER TABLE agent_tasks ADD COLUMN dependencies TEXT;');
    }
    if (!taskColNames.has('retry_count')) {
      db.exec('ALTER TABLE agent_tasks ADD COLUMN retry_count INTEGER DEFAULT 0;');
    }
    if (!taskColNames.has('max_retries')) {
      db.exec('ALTER TABLE agent_tasks ADD COLUMN max_retries INTEGER DEFAULT 3;');
    }
    if (!taskColNames.has('verification_strategy')) {
      db.exec('ALTER TABLE agent_tasks ADD COLUMN verification_strategy TEXT;');
    }
    if (!taskColNames.has('verification_result')) {
      db.exec('ALTER TABLE agent_tasks ADD COLUMN verification_result TEXT;');
    }
    if (!taskColNames.has('observation')) {
      db.exec('ALTER TABLE agent_tasks ADD COLUMN observation TEXT;');
    }
  },

  down: (db: DatabaseSync): void => {
    db.exec('DROP TABLE IF EXISTS mission_artifacts;');
  }
};
