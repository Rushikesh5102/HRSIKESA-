/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 027: Universal Digital Workspace & Application Operator Schema
 *
 * FP-13: Digital Workspaces, Workspace Sessions, Applications, Application Sessions,
 * Workspace Observations, Operator Actions, Verifications, Recoveries, Action Traces,
 * Action Trace Steps, Learned UI Patterns, and Workspace Locks.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration027: Migration = {
  version: 27,
  name: '027_universal_digital_workspace_operator_schema',
  up: (db: DatabaseSync): void => {
    // 1. Digital Workspaces
    db.exec(`
      CREATE TABLE IF NOT EXISTS digital_workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workspace_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        target_uri TEXT,
        capabilities_json TEXT NOT NULL DEFAULT '{}',
        resource_usage_json TEXT NOT NULL DEFAULT '{}',
        active_application_id TEXT,
        is_authenticated INTEGER NOT NULL DEFAULT 1,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_dworkspaces_type ON digital_workspaces(workspace_type);
      CREATE INDEX IF NOT EXISTS idx_dworkspaces_status ON digital_workspaces(status);
    `);

    // 2. Workspace Sessions
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_sessions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        owner_agent_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CONNECTED',
        connected_at TEXT NOT NULL,
        disconnected_at TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wsessions_ws ON workspace_sessions(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_wsessions_status ON workspace_sessions(status);
    `);

    // 3. Applications
    db.exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        executable_path TEXT NOT NULL,
        version TEXT,
        publisher TEXT,
        category TEXT NOT NULL DEFAULT 'UTILITY',
        workspace_id TEXT NOT NULL,
        capabilities_json TEXT NOT NULL DEFAULT '[]',
        readiness_state TEXT NOT NULL DEFAULT 'INSTALLED',
        health_status TEXT NOT NULL DEFAULT 'HEALTHY',
        installation_source TEXT NOT NULL DEFAULT 'SYSTEM',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_apps_ws ON applications(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_apps_name ON applications(name);
      CREATE INDEX IF NOT EXISTS idx_apps_readiness ON applications(readiness_state);
    `);

    // 4. Application Sessions
    db.exec(`
      CREATE TABLE IF NOT EXISTS application_sessions (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        process_id INTEGER,
        main_window_id TEXT,
        is_focused INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        closed_at TEXT,
        health_status TEXT NOT NULL DEFAULT 'HEALTHY',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_appsessions_app ON application_sessions(application_id);
      CREATE INDEX IF NOT EXISTS idx_appsessions_ws ON application_sessions(workspace_id);
    `);

    // 5. Workspace Observations
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_observations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        active_application_id TEXT,
        active_window_title TEXT,
        active_window_handle TEXT,
        windows_json TEXT NOT NULL DEFAULT '[]',
        ui_tree_json TEXT NOT NULL DEFAULT '[]',
        ocr_text TEXT,
        screenshot_ref TEXT,
        focused_element_json TEXT,
        dialogs_json TEXT NOT NULL DEFAULT '[]',
        is_loading INTEGER NOT NULL DEFAULT 0,
        is_error INTEGER NOT NULL DEFAULT 0,
        has_modal INTEGER NOT NULL DEFAULT 0,
        has_security_challenge INTEGER NOT NULL DEFAULT 0,
        confidence TEXT NOT NULL DEFAULT 'HIGH',
        observed_layers_json TEXT NOT NULL DEFAULT '[]',
        captured_at TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wsobserve_ws ON workspace_observations(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_wsobserve_time ON workspace_observations(captured_at);
    `);

    // 6. Operator Actions
    db.exec(`
      CREATE TABLE IF NOT EXISTS operator_actions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        application_id TEXT,
        action_type TEXT NOT NULL,
        risk_level TEXT NOT NULL DEFAULT 'TIER_1_READ',
        target_json TEXT,
        parameters_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'PENDING',
        confidence TEXT NOT NULL DEFAULT 'HIGH',
        agent_id TEXT,
        workflow_id TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        error_message TEXT,
        evidence_json TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_opactions_ws ON operator_actions(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_opactions_status ON operator_actions(status);
      CREATE INDEX IF NOT EXISTS idx_opactions_time ON operator_actions(started_at);
    `);

    // 7. Operator Verifications
    db.exec(`
      CREATE TABLE IF NOT EXISTS operator_verifications (
        id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        strategy TEXT NOT NULL,
        is_verified INTEGER NOT NULL DEFAULT 0,
        evidence_json TEXT NOT NULL DEFAULT '{}',
        discrepancies_json TEXT NOT NULL DEFAULT '[]',
        verified_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (action_id) REFERENCES operator_actions(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_opverif_act ON operator_verifications(action_id);
    `);

    // 8. Operator Recoveries
    db.exec(`
      CREATE TABLE IF NOT EXISTS operator_recoveries (
        id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        strategy TEXT NOT NULL,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        success INTEGER NOT NULL DEFAULT 0,
        evidence_json TEXT NOT NULL DEFAULT '{}',
        recovered_at TEXT NOT NULL,
        FOREIGN KEY (action_id) REFERENCES operator_actions(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_oprecov_act ON operator_recoveries(action_id);
    `);

    // 9. Action Traces
    db.exec(`
      CREATE TABLE IF NOT EXISTS action_traces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        workspace_id TEXT NOT NULL,
        application_id TEXT,
        initiator_agent_id TEXT,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        started_at TEXT NOT NULL,
        completed_at TEXT,
        is_reusable_proposal INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_acttraces_ws ON action_traces(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_acttraces_status ON action_traces(status);
    `);

    // 10. Action Trace Steps
    db.exec(`
      CREATE TABLE IF NOT EXISTS action_trace_steps (
        id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        application_id TEXT,
        observation_hash TEXT,
        action_json TEXT NOT NULL,
        result_json TEXT NOT NULL,
        verification_json TEXT,
        confidence TEXT NOT NULL DEFAULT 'HIGH',
        agent_id TEXT,
        skill_id TEXT,
        workflow_id TEXT,
        provenance TEXT NOT NULL DEFAULT 'OPERATOR_AUTONOMOUS',
        FOREIGN KEY (trace_id) REFERENCES action_traces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_trace_steps_trace ON action_trace_steps(trace_id);
      CREATE INDEX IF NOT EXISTS idx_trace_steps_order ON action_trace_steps(trace_id, step_index);
    `);

    // 11. Learned UI Patterns
    db.exec(`
      CREATE TABLE IF NOT EXISTS learned_ui_patterns (
        id TEXT PRIMARY KEY,
        application_name TEXT NOT NULL,
        application_version TEXT,
        intent TEXT NOT NULL,
        successful_selector TEXT NOT NULL,
        resolution_method TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        use_count INTEGER NOT NULL DEFAULT 1,
        last_used_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_patterns_app ON learned_ui_patterns(application_name);
      CREATE INDEX IF NOT EXISTS idx_patterns_intent ON learned_ui_patterns(intent);
    `);

    // 12. Workspace Locks
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_locks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        application_id TEXT,
        holder_agent_id TEXT NOT NULL,
        lock_type TEXT NOT NULL DEFAULT 'EXCLUSIVE',
        task_id TEXT NOT NULL,
        acquired_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        is_released INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (workspace_id) REFERENCES digital_workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wslocks_ws ON workspace_locks(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_wslocks_agent ON workspace_locks(holder_agent_id);
      CREATE INDEX IF NOT EXISTS idx_wslocks_active ON workspace_locks(workspace_id, is_released);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS workspace_locks;
      DROP TABLE IF EXISTS learned_ui_patterns;
      DROP TABLE IF EXISTS action_trace_steps;
      DROP TABLE IF EXISTS action_traces;
      DROP TABLE IF EXISTS operator_recoveries;
      DROP TABLE IF EXISTS operator_verifications;
      DROP TABLE IF EXISTS operator_actions;
      DROP TABLE IF EXISTS workspace_observations;
      DROP TABLE IF EXISTS application_sessions;
      DROP TABLE IF EXISTS applications;
      DROP TABLE IF EXISTS workspace_sessions;
      DROP TABLE IF EXISTS digital_workspaces;
    `);
  }
};
