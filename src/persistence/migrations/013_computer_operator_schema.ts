/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Operator Schema Migration (013)
 *
 * Phase 22: Persistent storage for high-level computer operator tasks,
 * transactional action logs, structured observation snapshots, and learned UI patterns.
 */

import { Migration } from './migration.types.js';

export const migration013: Migration = {
  version: 13,
  name: '013_computer_operator_schema',
  up: (db) => {
    // 1. Computer Operator Tasks
    db.exec(`
      CREATE TABLE IF NOT EXISTS computer_tasks (
        id TEXT PRIMARY KEY,
        intent TEXT NOT NULL,
        objective TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'DESKTOP',
        status TEXT NOT NULL DEFAULT 'PENDING',
        target_application TEXT,
        target_window TEXT,
        max_actions INTEGER NOT NULL DEFAULT 50,
        actions_executed INTEGER NOT NULL DEFAULT 0,
        retries_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        requires_approval INTEGER NOT NULL DEFAULT 0,
        approval_id TEXT,
        agent_id TEXT,
        mission_id TEXT,
        goal_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_comp_tasks_status ON computer_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_comp_tasks_agent ON computer_tasks(agent_id);
      CREATE INDEX IF NOT EXISTS idx_comp_tasks_app ON computer_tasks(target_application);
    `);

    // 2. Transactional Action History
    db.exec(`
      CREATE TABLE IF NOT EXISTS computer_action_history (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        sequence_number INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        target_description TEXT,
        resolved_target TEXT,
        target_confidence REAL,
        resolution_method TEXT,
        action_params TEXT,
        precondition_status TEXT NOT NULL DEFAULT 'VERIFIED',
        execution_status TEXT NOT NULL DEFAULT 'PENDING',
        verification_strategy TEXT,
        verification_status TEXT NOT NULL DEFAULT 'PENDING',
        verification_evidence TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        screenshot_path TEXT,
        error_message TEXT,
        risk_tier TEXT NOT NULL DEFAULT 'SAFE',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES computer_tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_comp_actions_task ON computer_action_history(task_id, sequence_number);
      CREATE INDEX IF NOT EXISTS idx_comp_actions_type ON computer_action_history(action_type);
      CREATE INDEX IF NOT EXISTS idx_comp_actions_risk ON computer_action_history(risk_tier);
    `);

    // 3. Compact Structured Observation History
    db.exec(`
      CREATE TABLE IF NOT EXISTS computer_observation_history (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        active_window_title TEXT,
        active_process_name TEXT,
        active_process_id INTEGER,
        screen_width INTEGER,
        screen_height INTEGER,
        node_count INTEGER NOT NULL DEFAULT 0,
        observation_summary TEXT,
        dom_hash TEXT,
        screenshot_path TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES computer_tasks(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_comp_obs_task ON computer_observation_history(task_id);
      CREATE INDEX IF NOT EXISTS idx_comp_obs_proc ON computer_observation_history(active_process_name);
    `);

    // 4. Learned UI Element Patterns
    db.exec(`
      CREATE TABLE IF NOT EXISTS computer_ui_patterns (
        id TEXT PRIMARY KEY,
        application_name TEXT NOT NULL,
        window_title_pattern TEXT,
        element_descriptor TEXT NOT NULL,
        automation_id TEXT,
        control_type TEXT,
        accessible_name TEXT,
        class_name TEXT,
        confidence REAL NOT NULL DEFAULT 1.0,
        success_count INTEGER NOT NULL DEFAULT 1,
        failure_count INTEGER NOT NULL DEFAULT 0,
        last_verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_patterns_unique ON computer_ui_patterns(application_name, element_descriptor);
      CREATE INDEX IF NOT EXISTS idx_comp_patterns_app ON computer_ui_patterns(application_name);
    `);
  },
  down: (db) => {
    db.exec(`
      DROP TABLE IF EXISTS computer_ui_patterns;
      DROP TABLE IF EXISTS computer_observation_history;
      DROP TABLE IF EXISTS computer_action_history;
      DROP TABLE IF EXISTS computer_tasks;
    `);
  },
};
