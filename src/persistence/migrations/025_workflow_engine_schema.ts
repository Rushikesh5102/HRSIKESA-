/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 025: Native Universal Workflow & Automation Engine Schema
 *
 * FP-11: Workflows, Versions, Runs, Run Nodes, Approvals, Checkpoints, Artifacts,
 * Schedules, and Webhooks.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration025: Migration = {
  version: 25,
  name: '025_workflow_engine_schema',
  up: (db: DatabaseSync): void => {
    // 1. Workflows Master Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GENERAL',
        scope TEXT NOT NULL DEFAULT 'GLOBAL',
        company_id TEXT,
        project_id TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        active_version INTEGER NOT NULL DEFAULT 1,
        tags_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
      CREATE INDEX IF NOT EXISTS idx_workflows_scope ON workflows(scope);
      CREATE INDEX IF NOT EXISTS idx_workflows_company ON workflows(company_id);
      CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id);
    `);

    // 2. Workflow Versions
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_versions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        description TEXT NOT NULL,
        graph_json TEXT NOT NULL,
        triggers_json TEXT NOT NULL DEFAULT '[]',
        variables_json TEXT NOT NULL DEFAULT '[]',
        required_capabilities_json TEXT NOT NULL DEFAULT '[]',
        required_skills_json TEXT NOT NULL DEFAULT '[]',
        required_agents_json TEXT NOT NULL DEFAULT '[]',
        required_permissions_json TEXT NOT NULL DEFAULT '[]',
        timeout_seconds INTEGER NOT NULL DEFAULT 3600,
        max_retries INTEGER NOT NULL DEFAULT 3,
        financial_approval_required INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wv_wf_version ON workflow_versions(workflow_id, version_number);
    `);

    // 3. Workflow Runs
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        version_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        trigger_type TEXT NOT NULL DEFAULT 'MANUAL',
        trigger_payload_json TEXT NOT NULL DEFAULT '{}',
        input_variables_json TEXT NOT NULL DEFAULT '{}',
        current_variables_json TEXT NOT NULL DEFAULT '{}',
        active_node_ids_json TEXT NOT NULL DEFAULT '[]',
        completed_node_ids_json TEXT NOT NULL DEFAULT '[]',
        failed_node_ids_json TEXT NOT NULL DEFAULT '[]',
        iteration_counts_json TEXT NOT NULL DEFAULT '{}',
        error_message TEXT,
        failure_reason TEXT,
        resource_usage_json TEXT NOT NULL DEFAULT '{}',
        checkpoint_id TEXT,
        company_id TEXT,
        project_id TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        paused_at TEXT,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wruns_wf ON workflow_runs(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_wruns_status ON workflow_runs(status);
      CREATE INDEX IF NOT EXISTS idx_wruns_created ON workflow_runs(started_at);
    `);

    // 4. Workflow Run Nodes Execution Log
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_run_nodes (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        node_type TEXT NOT NULL,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'PENDING',
        input_data_json TEXT NOT NULL DEFAULT '{}',
        output_data_json TEXT NOT NULL DEFAULT '{}',
        error TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        agent_id TEXT,
        model_id TEXT,
        capability_id TEXT,
        tool_calls INTEGER NOT NULL DEFAULT 0,
        artifacts_json TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wrnodes_run ON workflow_run_nodes(run_id);
      CREATE INDEX IF NOT EXISTS idx_wrnodes_node ON workflow_run_nodes(node_id);
      CREATE INDEX IF NOT EXISTS idx_wrnodes_status ON workflow_run_nodes(status);
    `);

    // 5. Workflow Approvals
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_approvals (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
        payload_summary_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'PENDING',
        requested_at TEXT NOT NULL,
        responded_at TEXT,
        decided_by TEXT,
        comments TEXT,
        FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wappr_run ON workflow_approvals(run_id);
      CREATE INDEX IF NOT EXISTS idx_wappr_status ON workflow_approvals(status);
    `);

    // 6. Workflow Checkpoints
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_checkpoints (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        state_snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wcp_run ON workflow_checkpoints(run_id);
      CREATE INDEX IF NOT EXISTS idx_wcp_key ON workflow_checkpoints(idempotency_key);
    `);

    // 7. Workflow Artifacts
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_artifacts (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        path TEXT,
        uri TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wartifacts_run ON workflow_artifacts(run_id);
    `);

    // 8. Workflow Persistent Schedules
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_schedules (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        trigger_id TEXT NOT NULL,
        schedule_type TEXT NOT NULL,
        cron_expression TEXT,
        interval_seconds INTEGER,
        next_run_at TEXT,
        last_run_at TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wsched_wf ON workflow_schedules(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_wsched_next ON workflow_schedules(next_run_at);
    `);

    // 9. Workflow Webhook Registrations
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_webhooks (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        webhook_path TEXT NOT NULL UNIQUE,
        webhook_secret TEXT NOT NULL,
        signature_header TEXT NOT NULL DEFAULT 'X-Hub-Signature-256',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wwebhooks_path ON workflow_webhooks(webhook_path);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS workflow_webhooks;
      DROP TABLE IF EXISTS workflow_schedules;
      DROP TABLE IF EXISTS workflow_artifacts;
      DROP TABLE IF EXISTS workflow_checkpoints;
      DROP TABLE IF EXISTS workflow_approvals;
      DROP TABLE IF EXISTS workflow_run_nodes;
      DROP TABLE IF EXISTS workflow_runs;
      DROP TABLE IF EXISTS workflow_versions;
      DROP TABLE IF EXISTS workflows;
    `);
  },
};
