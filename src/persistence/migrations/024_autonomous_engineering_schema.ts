/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 024: Autonomous Software Engineering Schema
 *
 * FP-10: SoftwareEngineeringTask, Plans, Structured Actions, Diagnostics,
 * Model-Driven Repairs, Verifications, and Convergence State.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration024: Migration = {
  version: 24,
  name: '024_autonomous_engineering_schema',
  up: (db: DatabaseSync): void => {
    // 1. Engineering Tasks Master Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS engineering_tasks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        project_id TEXT,
        company_id TEXT,
        objective TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        complexity TEXT NOT NULL DEFAULT 'STANDARD',
        current_phase TEXT NOT NULL DEFAULT 'QUEUED',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        budget_json TEXT NOT NULL DEFAULT '{}',
        model_calls INTEGER NOT NULL DEFAULT 0,
        tool_calls INTEGER NOT NULL DEFAULT 0,
        changed_files_json TEXT NOT NULL DEFAULT '[]',
        tests_run INTEGER NOT NULL DEFAULT 0,
        verification_state TEXT NOT NULL DEFAULT 'PENDING',
        failure_reason TEXT,
        final_summary TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_eng_tasks_ws ON engineering_tasks(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_eng_tasks_status ON engineering_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_eng_tasks_created ON engineering_tasks(created_at);
    `);

    // 2. Structured Engineering Plans
    db.exec(`
      CREATE TABLE IF NOT EXISTS engineering_plans (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        architecture_summary TEXT,
        target_files_json TEXT NOT NULL DEFAULT '[]',
        steps_json TEXT NOT NULL DEFAULT '[]',
        verification_plan_json TEXT NOT NULL DEFAULT '[]',
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        requires_approval INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES engineering_tasks(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_eng_plans_task ON engineering_plans(task_id);
    `);

    // 3. Structured Model & Tool Actions
    db.exec(`
      CREATE TABLE IF NOT EXISTS engineering_actions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, APPROVED, EXECUTED, REJECTED, FAILED
        validation_result_json TEXT,
        execution_result_json TEXT,
        executed_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES engineering_tasks(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_eng_actions_task ON engineering_actions(task_id);
      CREATE INDEX IF NOT EXISTS idx_eng_actions_status ON engineering_actions(status);
    `);

    // 4. Normalized Failure Diagnostics
    db.exec(`
      CREATE TABLE IF NOT EXISTS engineering_diagnostics (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        category TEXT NOT NULL,
        confidence TEXT NOT NULL DEFAULT 'MEDIUM',
        fingerprint TEXT NOT NULL,
        raw_output TEXT NOT NULL,
        normalized_json TEXT NOT NULL DEFAULT '{}',
        hypotheses_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES engineering_tasks(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_eng_diag_task ON engineering_diagnostics(task_id);
      CREATE INDEX IF NOT EXISTS idx_eng_diag_fingerprint ON engineering_diagnostics(fingerprint);
    `);

    // 5. Model-Driven Repair Attempts
    db.exec(`
      CREATE TABLE IF NOT EXISTS engineering_repairs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        diagnostic_id TEXT,
        attempt_number INTEGER NOT NULL,
        model_id TEXT NOT NULL,
        proposed_patch_json TEXT NOT NULL,
        changeset_id TEXT,
        outcome TEXT NOT NULL DEFAULT 'UNCHANGED', -- IMPROVED, UNCHANGED, REGRESSED, RESOLVED, FAILED
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES engineering_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (diagnostic_id) REFERENCES engineering_diagnostics(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_eng_repairs_task ON engineering_repairs(task_id);
    `);

    // 6. Verification Stage Ledger
    db.exec(`
      CREATE TABLE IF NOT EXISTS engineering_verifications (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        passed INTEGER NOT NULL DEFAULT 0,
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES engineering_tasks(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_eng_verif_task ON engineering_verifications(task_id);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS engineering_verifications;
      DROP TABLE IF EXISTS engineering_repairs;
      DROP TABLE IF EXISTS engineering_diagnostics;
      DROP TABLE IF EXISTS engineering_actions;
      DROP TABLE IF EXISTS engineering_plans;
      DROP TABLE IF EXISTS engineering_tasks;
    `);
  },
};
