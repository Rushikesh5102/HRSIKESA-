/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 023: Universal IDE & Development Workspace Schema
 *
 * FP-09: Workspaces, Projects, Staged Changesets, Terminal Sessions, Preview Servers,
 * and Autonomous 10-Stage Verification Runs.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration023: Migration = {
  version: 23,
  name: '023_universal_ide_workspace_schema',
  up: (db: DatabaseSync): void => {
    // 1. Workspaces & Projects Metadata
    db.exec(`
      CREATE TABLE IF NOT EXISTS ide_workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL UNIQUE,
        company_id TEXT,
        project_id TEXT,
        architecture TEXT NOT NULL DEFAULT 'GENERIC',
        framework TEXT,
        package_manager TEXT,
        settings_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        last_accessed_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ide_ws_path ON ide_workspaces(root_path);
      CREATE INDEX IF NOT EXISTS idx_ide_ws_company ON ide_workspaces(company_id);
    `);

    // 2. Staged Code Changesets & Diffs
    db.exec(`
      CREATE TABLE IF NOT EXISTS ide_changesets (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'STAGED', -- STAGED, APPROVED, APPLIED, REJECTED, REVERTED
        author_agent TEXT NOT NULL,            -- e.g. 'gandiva', 'vighna', 'human'
        danger_tier INTEGER NOT NULL DEFAULT 1,
        files_json TEXT NOT NULL DEFAULT '[]', -- array of modified file paths
        diff_unified TEXT NOT NULL,
        diff_checksum TEXT NOT NULL,
        created_at TEXT NOT NULL,
        applied_at TEXT,
        reviewed_by TEXT,
        FOREIGN KEY (workspace_id) REFERENCES ide_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ide_cs_ws ON ide_changesets(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_ide_cs_status ON ide_changesets(status);
    `);

    // 3. Persistent Terminal Sessions
    db.exec(`
      CREATE TABLE IF NOT EXISTS ide_terminals (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        shell_path TEXT NOT NULL,
        cwd TEXT NOT NULL,
        pid INTEGER,
        status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, IDLE, TERMINATED
        created_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES ide_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ide_term_ws ON ide_terminals(workspace_id);
    `);

    // 4. Preview / Dev Servers Supervisor
    db.exec(`
      CREATE TABLE IF NOT EXISTS ide_preview_servers (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        framework TEXT NOT NULL,
        port INTEGER NOT NULL,
        url TEXT NOT NULL,
        pid INTEGER,
        status TEXT NOT NULL DEFAULT 'RUNNING', -- STARTING, RUNNING, STOPPED, FAILED
        health_status TEXT NOT NULL DEFAULT 'HEALTHY',
        started_at TEXT NOT NULL,
        stopped_at TEXT,
        FOREIGN KEY (workspace_id) REFERENCES ide_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ide_prev_ws ON ide_preview_servers(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_ide_prev_port ON ide_preview_servers(port);
    `);

    // 5. 10-Stage Autonomous Verification Runs
    db.exec(`
      CREATE TABLE IF NOT EXISTS ide_verification_runs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        objective TEXT NOT NULL,
        current_stage TEXT NOT NULL,            -- UNDERSTAND, PLAN, MODIFY, EXECUTE, OBSERVE, TEST, VERIFY, FIX, REVERIFY, REPORT
        status TEXT NOT NULL DEFAULT 'RUNNING',  -- RUNNING, SUCCESS, FAILED, CANCELLED
        stages_log_json TEXT NOT NULL DEFAULT '[]',
        tests_passed INTEGER NOT NULL DEFAULT 0,
        tests_failed INTEGER NOT NULL DEFAULT 0,
        iterations_count INTEGER NOT NULL DEFAULT 1,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        summary TEXT,
        FOREIGN KEY (workspace_id) REFERENCES ide_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ide_verif_ws ON ide_verification_runs(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_ide_verif_status ON ide_verification_runs(status);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS ide_verification_runs;
      DROP TABLE IF EXISTS ide_preview_servers;
      DROP TABLE IF EXISTS ide_terminals;
      DROP TABLE IF EXISTS ide_changesets;
      DROP TABLE IF EXISTS ide_workspaces;
    `);
  },
};
