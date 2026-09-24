/**
 * HRSIKESA - Migration 002: Agent Tasks, Missions, and Blackboard Schema
 *
 * New tables:
 * 1. agent_tasks - Persistent task records with status, priority, parent linkage
 * 2. agent_missions - Mission records linking to a root task
 * 3. blackboard_entries - Shared structured findings per mission
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration002: Migration = {
  version: 2,
  name: '002_agent_tasks_schema',
  up: (db: DatabaseSync): void => {

    // 1. Agent Tasks Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        mission_id TEXT,
        parent_task_id TEXT,
        objective TEXT NOT NULL,
        context TEXT,
        inputs TEXT,
        priority TEXT NOT NULL DEFAULT 'normal',
        status TEXT NOT NULL DEFAULT 'queued',
        depth INTEGER NOT NULL DEFAULT 0,
        session_id TEXT,
        result_summary TEXT,
        result_output TEXT,
        result_tool_calls TEXT,
        result_errors TEXT,
        result_child_task_ids TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_mission ON agent_tasks(mission_id);
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_parent ON agent_tasks(parent_task_id);
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
    `);

    // 2. Agent Missions Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_missions (
        id TEXT PRIMARY KEY,
        objective TEXT NOT NULL,
        root_agent_id TEXT NOT NULL,
        root_task_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        result TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_agent_missions_status ON agent_missions(status);
    `);

    // 3. Blackboard Entries Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS blackboard_entries (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        evidence TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_blackboard_mission ON blackboard_entries(mission_id);
      CREATE INDEX IF NOT EXISTS idx_blackboard_mission_type ON blackboard_entries(mission_id, type);
    `);
  },

  down: (db: DatabaseSync): void => {
    db.exec('DROP TABLE IF EXISTS blackboard_entries;');
    db.exec('DROP TABLE IF EXISTS agent_missions;');
    db.exec('DROP TABLE IF EXISTS agent_tasks;');
  }
};
