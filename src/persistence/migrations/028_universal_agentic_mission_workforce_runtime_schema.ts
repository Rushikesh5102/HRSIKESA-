/**
 * HṚṢĪKEŚA (हृषीकेश) — Database Migration 028
 *
 * FP-14: Universal Agentic Mission & Workforce Runtime Schema
 * Creates durable tables for Missions, Outcomes, Tasks, Blackboard,
 * Artifacts, Checkpoints, Plan Versions, and Workforce Capacity.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration028: Migration = {
  version: 28,
  name: '028_universal_agentic_mission_workforce_runtime_schema',
  up: (db: DatabaseSync): void => {
    // 1. Runtime Missions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_missions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        description TEXT,
        owner TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        urgency INTEGER NOT NULL DEFAULT 5,
        importance INTEGER NOT NULL DEFAULT 5,
        privacy_level TEXT NOT NULL DEFAULT 'PRIVATE',
        constraints_json TEXT NOT NULL DEFAULT '[]',
        assumptions_json TEXT NOT NULL DEFAULT '[]',
        risks_json TEXT NOT NULL DEFAULT '[]',
        desired_outcome TEXT NOT NULL,
        acceptance_criteria_json TEXT NOT NULL DEFAULT '[]',
        budget_limit_usd REAL,
        deadline TEXT,
        parent_mission_id TEXT,
        current_phase TEXT NOT NULL DEFAULT 'PLANNING',
        health TEXT NOT NULL DEFAULT 'HEALTHY',
        progress_percentage REAL NOT NULL DEFAULT 0,
        confidence_score REAL NOT NULL DEFAULT 1.0,
        evidence_summary TEXT,
        plan_version INTEGER NOT NULL DEFAULT 1,
        resource_usage_json TEXT NOT NULL DEFAULT '{}',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_missions_status ON runtime_missions(status);
      CREATE INDEX IF NOT EXISTS idx_runtime_missions_owner ON runtime_missions(owner);
      CREATE INDEX IF NOT EXISTS idx_runtime_missions_company ON runtime_missions(company_id);
      CREATE INDEX IF NOT EXISTS idx_runtime_missions_project ON runtime_missions(project_id);
    `);

    // 2. Runtime Mission Outcomes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_mission_outcomes (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES runtime_missions(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        acceptance_criteria_json TEXT NOT NULL DEFAULT '[]',
        priority INTEGER NOT NULL DEFAULT 5,
        weight REAL NOT NULL DEFAULT 10,
        status TEXT NOT NULL DEFAULT 'PENDING',
        verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED',
        evidence_json TEXT NOT NULL DEFAULT '{}',
        dependencies_json TEXT NOT NULL DEFAULT '[]',
        assigned_milestone_id TEXT,
        confidence_score REAL NOT NULL DEFAULT 1.0,
        is_critical_path INTEGER NOT NULL DEFAULT 0,
        requires_human_approval INTEGER NOT NULL DEFAULT 0,
        is_approved_by_human INTEGER DEFAULT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        verified_at TEXT,
        verified_by_agent_id TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_outcomes_mission ON runtime_mission_outcomes(mission_id);
      CREATE INDEX IF NOT EXISTS idx_runtime_outcomes_status ON runtime_mission_outcomes(status);
    `);

    // 3. Runtime Mission Tasks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_mission_tasks (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES runtime_missions(id) ON DELETE CASCADE,
        outcome_id TEXT NOT NULL REFERENCES runtime_mission_outcomes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        primary_agent_id TEXT NOT NULL,
        assisting_agent_ids_json TEXT NOT NULL DEFAULT '[]',
        required_capabilities_json TEXT NOT NULL DEFAULT '[]',
        required_skills_json TEXT NOT NULL DEFAULT '[]',
        workflow_id TEXT,
        workspace_id TEXT,
        account_id TEXT,
        dependencies_json TEXT NOT NULL DEFAULT '[]',
        priority INTEGER NOT NULL DEFAULT 5,
        risk_tier INTEGER NOT NULL DEFAULT 1,
        requires_human_approval INTEGER NOT NULL DEFAULT 0,
        is_approved_by_human INTEGER DEFAULT NULL,
        approval_reason TEXT,
        input_payload_json TEXT NOT NULL DEFAULT '{}',
        output_result_json TEXT,
        evidence_json TEXT,
        failure_history_json TEXT NOT NULL DEFAULT '[]',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        timeout_ms INTEGER NOT NULL DEFAULT 60000,
        claimed_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        estimated_duration_ms INTEGER,
        actual_duration_ms INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_tasks_mission ON runtime_mission_tasks(mission_id);
      CREATE INDEX IF NOT EXISTS idx_runtime_tasks_outcome ON runtime_mission_tasks(outcome_id);
      CREATE INDEX IF NOT EXISTS idx_runtime_tasks_agent ON runtime_mission_tasks(primary_agent_id);
      CREATE INDEX IF NOT EXISTS idx_runtime_tasks_status ON runtime_mission_tasks(status);
    `);

    // 4. Runtime Mission Blackboard table
    db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_mission_blackboard (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES runtime_missions(id) ON DELETE CASCADE,
        outcome_id TEXT,
        author_agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        provenance TEXT NOT NULL,
        is_resolved INTEGER NOT NULL DEFAULT 0,
        resolved_by TEXT,
        resolution_notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_blackboard_mission ON runtime_mission_blackboard(mission_id);
      CREATE INDEX IF NOT EXISTS idx_runtime_blackboard_type ON runtime_mission_blackboard(type);
    `);

    // 5. Runtime Mission Artifacts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_mission_artifacts (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES runtime_missions(id) ON DELETE CASCADE,
        outcome_id TEXT,
        task_id TEXT,
        owner_agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        checksum TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED',
        provenance TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_artifacts_mission ON runtime_mission_artifacts(mission_id);
      CREATE INDEX IF NOT EXISTS idx_runtime_artifacts_type ON runtime_mission_artifacts(type);
    `);

    // 6. Runtime Mission Checkpoints table
    db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_mission_checkpoints (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES runtime_missions(id) ON DELETE CASCADE,
        plan_version INTEGER NOT NULL,
        state_snapshot_json TEXT NOT NULL,
        checksum TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_checkpoints_mission ON runtime_mission_checkpoints(mission_id);
    `);

    // 7. Runtime Mission Plan Versions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_mission_plan_versions (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES runtime_missions(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        reason_for_change TEXT NOT NULL,
        author_agent_id TEXT NOT NULL,
        previous_version_number INTEGER,
        outcomes_snapshot_json TEXT NOT NULL,
        tasks_snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_runtime_plan_versions_mission ON runtime_mission_plan_versions(mission_id);
    `);

    // 8. Runtime Workforce Capacity table
    db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_workforce_capacity (
        agent_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        active_task_ids_json TEXT NOT NULL DEFAULT '[]',
        queued_task_ids_json TEXT NOT NULL DEFAULT '[]',
        current_mission_ids_json TEXT NOT NULL DEFAULT '[]',
        current_workload_score REAL NOT NULL DEFAULT 0,
        historical_success_rate REAL NOT NULL DEFAULT 1.0,
        active_workspace_id TEXT,
        last_active_timestamp TEXT NOT NULL
      );
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS runtime_workforce_capacity;
      DROP TABLE IF EXISTS runtime_mission_plan_versions;
      DROP TABLE IF EXISTS runtime_mission_checkpoints;
      DROP TABLE IF EXISTS runtime_mission_artifacts;
      DROP TABLE IF EXISTS runtime_mission_blackboard;
      DROP TABLE IF EXISTS runtime_mission_tasks;
      DROP TABLE IF EXISTS runtime_mission_outcomes;
      DROP TABLE IF EXISTS runtime_missions;
    `);
  },
};
