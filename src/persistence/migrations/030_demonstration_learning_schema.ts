/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 030: Demonstration Learning Schema
 *
 * FP-16: Persistent storage for demonstration sessions, semantic action traces,
 * procedure proposals, learned procedures, and versions.
 *
 * Does NOT duplicate: workflow_versions, skill_definitions, action_traces (operator),
 * workspace_observations, improvement_proposals — this links to them via IDs.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration030: Migration = {
  version: 30,
  name: '030_demonstration_learning_schema',
  up: (db: DatabaseSync): void => {
    // 1. Demonstration Sessions
    db.exec(`
      CREATE TABLE IF NOT EXISTS demonstration_sessions (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        workspace_id TEXT,
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'RECORDING',
        scope TEXT NOT NULL DEFAULT 'USER',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        paused_at TEXT,
        resumed_at TEXT,
        environment TEXT,
        observation_sources_json TEXT NOT NULL DEFAULT '[]',
        action_count INTEGER NOT NULL DEFAULT 0,
        checkpoint_count INTEGER NOT NULL DEFAULT 0,
        teaching_mode INTEGER NOT NULL DEFAULT 0,
        voice_annotations_enabled INTEGER NOT NULL DEFAULT 0,
        inferred_intent_summary TEXT,
        proposed_procedure_id TEXT,
        compiled_skill_id TEXT,
        compiled_workflow_id TEXT,
        approval_status TEXT,
        approved_by TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        rejection_reason TEXT,
        confidence REAL,
        security_classification TEXT NOT NULL DEFAULT 'INTERNAL',
        provenance TEXT NOT NULL DEFAULT 'HUMAN_DEMONSTRATION',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_demo_sessions_owner ON demonstration_sessions(owner);
      CREATE INDEX IF NOT EXISTS idx_demo_sessions_status ON demonstration_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_demo_sessions_scope ON demonstration_sessions(scope);
      CREATE INDEX IF NOT EXISTS idx_demo_sessions_company ON demonstration_sessions(company_id);
      CREATE INDEX IF NOT EXISTS idx_demo_sessions_project ON demonstration_sessions(project_id);
    `);

    // 2. Semantic Actions (the semantic-level trace, above raw operator actions)
    db.exec(`
      CREATE TABLE IF NOT EXISTS demonstration_semantic_actions (
        id TEXT PRIMARY KEY,
        demonstration_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        semantic_intent TEXT NOT NULL,
        target_json TEXT,
        application TEXT,
        environment TEXT,
        precondition TEXT,
        parameters_json TEXT NOT NULL DEFAULT '[]',
        resulting_state TEXT,
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'INFERRED',
        confidence REAL NOT NULL DEFAULT 0.8,
        verification_evidence_json TEXT,
        is_verified INTEGER NOT NULL DEFAULT 0,
        is_reversible INTEGER NOT NULL DEFAULT 1,
        danger_level TEXT NOT NULL DEFAULT 'SAFE',
        teaching_annotation TEXT,
        is_ignored INTEGER NOT NULL DEFAULT 0,
        is_important INTEGER NOT NULL DEFAULT 0,
        is_optional INTEGER NOT NULL DEFAULT 0,
        raw_operator_action_id TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (demonstration_id) REFERENCES demonstration_sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_demo_actions_session ON demonstration_semantic_actions(demonstration_id);
      CREATE INDEX IF NOT EXISTS idx_demo_actions_type ON demonstration_semantic_actions(action_type);
      CREATE INDEX IF NOT EXISTS idx_demo_actions_step ON demonstration_semantic_actions(demonstration_id, step_index);
    `);

    // 3. Demonstration Checkpoints
    db.exec(`
      CREATE TABLE IF NOT EXISTS demonstration_checkpoints (
        id TEXT PRIMARY KEY,
        demonstration_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        label TEXT NOT NULL,
        annotation TEXT,
        state_snapshot_json TEXT,
        captured_at TEXT NOT NULL,
        FOREIGN KEY (demonstration_id) REFERENCES demonstration_sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_demo_checkpoints_session ON demonstration_checkpoints(demonstration_id);
    `);

    // 4. Demonstration Artifacts (references, not blobs)
    db.exec(`
      CREATE TABLE IF NOT EXISTS demonstration_artifacts (
        id TEXT PRIMARY KEY,
        demonstration_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT,
        uri TEXT,
        size_bytes INTEGER,
        mime_type TEXT,
        is_redacted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (demonstration_id) REFERENCES demonstration_sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_demo_artifacts_session ON demonstration_artifacts(demonstration_id);
    `);

    // 5. Procedure Proposals
    db.exec(`
      CREATE TABLE IF NOT EXISTS procedure_proposals (
        id TEXT PRIMARY KEY,
        demonstration_id TEXT NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        trigger_phrases_json TEXT NOT NULL DEFAULT '[]',
        required_capabilities_json TEXT NOT NULL DEFAULT '[]',
        required_services_json TEXT NOT NULL DEFAULT '[]',
        required_applications_json TEXT NOT NULL DEFAULT '[]',
        required_permissions_json TEXT NOT NULL DEFAULT '[]',
        inputs_json TEXT NOT NULL DEFAULT '[]',
        outputs_json TEXT NOT NULL DEFAULT '[]',
        assumptions_json TEXT NOT NULL DEFAULT '[]',
        steps_json TEXT NOT NULL DEFAULT '[]',
        checkpoints_json TEXT NOT NULL DEFAULT '[]',
        verification_conditions_json TEXT NOT NULL DEFAULT '[]',
        recovery_strategies_json TEXT NOT NULL DEFAULT '[]',
        rollback_strategy TEXT,
        expected_artifacts_json TEXT NOT NULL DEFAULT '[]',
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        confidence REAL NOT NULL DEFAULT 0.0,
        confidence_factors_json TEXT NOT NULL DEFAULT '{}',
        is_generalizable INTEGER NOT NULL DEFAULT 0,
        generalization_caveats_json TEXT NOT NULL DEFAULT '[]',
        compilation_target TEXT NOT NULL DEFAULT 'UNDETERMINED',
        scope TEXT NOT NULL DEFAULT 'USER',
        company_id TEXT,
        project_id TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        validation_result_json TEXT,
        rejection_reason TEXT,
        rejection_explanation TEXT,
        provenance TEXT NOT NULL DEFAULT 'PROCEDURE_INFERENCE',
        source_demonstration_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (demonstration_id) REFERENCES demonstration_sessions(id)
      );
      CREATE INDEX IF NOT EXISTS idx_proposals_demo ON procedure_proposals(demonstration_id);
      CREATE INDEX IF NOT EXISTS idx_proposals_status ON procedure_proposals(status);
      CREATE INDEX IF NOT EXISTS idx_proposals_scope ON procedure_proposals(scope);
      CREATE INDEX IF NOT EXISTS idx_proposals_company ON procedure_proposals(company_id);
    `);

    // 6. Learned Procedures (catalog, one per name)
    db.exec(`
      CREATE TABLE IF NOT EXISTS learned_procedures (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'USER',
        company_id TEXT,
        project_id TEXT,
        current_version INTEGER NOT NULL DEFAULT 0,
        active_version_id TEXT,
        source_demonstration_ids_json TEXT NOT NULL DEFAULT '[]',
        trigger_phrases_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_learned_proc_scope ON learned_procedures(scope);
      CREATE INDEX IF NOT EXISTS idx_learned_proc_company ON learned_procedures(company_id);
      CREATE INDEX IF NOT EXISTS idx_learned_proc_name ON learned_procedures(name);
    `);

    // 7. Learned Procedure Versions (immutable snapshots — never mutated silently)
    db.exec(`
      CREATE TABLE IF NOT EXISTS learned_procedure_versions (
        id TEXT PRIMARY KEY,
        learned_procedure_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT NOT NULL,
        proposal_id TEXT NOT NULL,
        demonstration_id TEXT NOT NULL,
        compiled_skill_id TEXT,
        compiled_workflow_id TEXT,
        compilation_target TEXT NOT NULL DEFAULT 'UNDETERMINED',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        confidence REAL NOT NULL DEFAULT 0.0,
        validation_result_json TEXT NOT NULL DEFAULT '{}',
        approval_history_json TEXT NOT NULL DEFAULT '[]',
        execution_history_json TEXT NOT NULL DEFAULT '[]',
        rollback_from_version INTEGER,
        scope TEXT NOT NULL DEFAULT 'USER',
        company_id TEXT,
        project_id TEXT,
        provenance TEXT NOT NULL DEFAULT 'DEMONSTRATION_COMPILER',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (learned_procedure_id) REFERENCES learned_procedures(id) ON DELETE CASCADE,
        UNIQUE(learned_procedure_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_lpv_proc ON learned_procedure_versions(learned_procedure_id);
      CREATE INDEX IF NOT EXISTS idx_lpv_status ON learned_procedure_versions(status);
      CREATE INDEX IF NOT EXISTS idx_lpv_demo ON learned_procedure_versions(demonstration_id);
    `);

    // 8. Learned Procedure Execution Records
    db.exec(`
      CREATE TABLE IF NOT EXISTS learned_procedure_executions (
        id TEXT PRIMARY KEY,
        learned_procedure_id TEXT NOT NULL,
        version_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'SUCCESS',
        duration_ms INTEGER NOT NULL DEFAULT 0,
        deviations_json TEXT NOT NULL DEFAULT '[]',
        recovery_events_json TEXT NOT NULL DEFAULT '[]',
        user_corrections_json TEXT NOT NULL DEFAULT '[]',
        confidence_delta REAL NOT NULL DEFAULT 0.0,
        verification_results_json TEXT NOT NULL DEFAULT '[]',
        executed_at TEXT NOT NULL,
        executed_by TEXT,
        mission_id TEXT,
        FOREIGN KEY (learned_procedure_id) REFERENCES learned_procedures(id) ON DELETE CASCADE,
        FOREIGN KEY (version_id) REFERENCES learned_procedure_versions(id)
      );
      CREATE INDEX IF NOT EXISTS idx_lpe_proc ON learned_procedure_executions(learned_procedure_id);
      CREATE INDEX IF NOT EXISTS idx_lpe_version ON learned_procedure_executions(version_id);
    `);
  },

  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS learned_procedure_executions;
      DROP TABLE IF EXISTS learned_procedure_versions;
      DROP TABLE IF EXISTS learned_procedures;
      DROP TABLE IF EXISTS procedure_proposals;
      DROP TABLE IF EXISTS demonstration_artifacts;
      DROP TABLE IF EXISTS demonstration_checkpoints;
      DROP TABLE IF EXISTS demonstration_semantic_actions;
      DROP TABLE IF EXISTS demonstration_sessions;
    `);
  },
};
