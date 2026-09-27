/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 033: Persistent Distributed Execution & 24/7 Operations Fabric Schema
 *
 * FP-19: Foundation Performance & Execution Block
 * Persistent, Distributed, Resumable Execution Platform
 *
 * Adds:
 * 1. execution_runtimes - Abstraction for execution environments (LOCAL, LAN, REMOTE, CLOUD)
 * 2. execution_workers - Persistent worker registry with health, heartbeats, and drain state
 * 3. execution_jobs - Durable persistent job lifecycle tracking across restarts
 * 4. execution_leases - Time-bounded worker execution leases with fencing tokens
 * 5. execution_checkpoints - Periodic step state snapshots for safe failure recovery
 * 6. execution_traces - Auditable timeline traces of job transitions and worker handoffs
 * 7. execution_artifacts - Artifact durability, checksums, and replication tracking
 * 8. execution_policies - Execution placement, cost controls, and approval policies
 * 9. execution_cloud_providers - Honest provider descriptors with quota tracking
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration033: Migration = {
  version: 33,
  name: '033_persistent_execution_schema',
  up: (db: DatabaseSync): void => {
    // 1. Execution Runtimes Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_runtimes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        environment_id TEXT,
        architecture TEXT NOT NULL,
        operating_system TEXT NOT NULL,
        cpu_cores INTEGER NOT NULL,
        memory_mb INTEGER NOT NULL,
        gpu_info TEXT,
        storage_available_mb INTEGER,
        network_locality TEXT NOT NULL DEFAULT 'LOCAL',
        installed_software TEXT NOT NULL DEFAULT '[]',
        available_models TEXT NOT NULL DEFAULT '[]',
        supported_tools TEXT NOT NULL DEFAULT '[]',
        supported_environments TEXT NOT NULL DEFAULT '[]',
        trust_level TEXT NOT NULL DEFAULT 'REGISTERED',
        cost_class TEXT NOT NULL DEFAULT 'FREE',
        availability TEXT NOT NULL DEFAULT 'ONLINE',
        health TEXT NOT NULL DEFAULT 'HEALTHY',
        last_heartbeat TEXT NOT NULL,
        current_load REAL NOT NULL DEFAULT 0.0,
        concurrency INTEGER NOT NULL DEFAULT 0,
        max_concurrency INTEGER NOT NULL DEFAULT 4,
        authorization_scope TEXT NOT NULL DEFAULT 'GLOBAL',
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_exec_runtimes_type ON execution_runtimes(type);
      CREATE INDEX IF NOT EXISTS idx_exec_runtimes_avail ON execution_runtimes(availability);
      CREATE INDEX IF NOT EXISTS idx_exec_runtimes_health ON execution_runtimes(health);
    `);

    // 2. Execution Workers Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_workers (
        id TEXT PRIMARY KEY,
        runtime_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ONLINE',
        host TEXT NOT NULL,
        port INTEGER,
        capabilities TEXT NOT NULL DEFAULT '[]',
        resources TEXT NOT NULL,
        health TEXT NOT NULL DEFAULT 'HEALTHY',
        last_heartbeat TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        protocol_version TEXT NOT NULL DEFAULT '1.0.0',
        software_inventory TEXT NOT NULL DEFAULT '[]',
        model_inventory TEXT NOT NULL DEFAULT '[]',
        environment_associations TEXT NOT NULL DEFAULT '[]',
        trust_level TEXT NOT NULL DEFAULT 'AUTHORIZED',
        authorization_scope TEXT NOT NULL DEFAULT 'GLOBAL',
        current_workload INTEGER NOT NULL DEFAULT 0,
        queued_workload INTEGER NOT NULL DEFAULT 0,
        drain_state INTEGER NOT NULL DEFAULT 0,
        active_job_ids TEXT NOT NULL DEFAULT '[]',
        consecutive_missed_heartbeats INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        registered_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (runtime_id) REFERENCES execution_runtimes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_exec_workers_status ON execution_workers(status);
      CREATE INDEX IF NOT EXISTS idx_exec_workers_trust ON execution_workers(trust_level);
      CREATE INDEX IF NOT EXISTS idx_exec_workers_heartbeat ON execution_workers(last_heartbeat);
      CREATE INDEX IF NOT EXISTS idx_exec_workers_runtime ON execution_workers(runtime_id);
    `);

    // 3. Execution Jobs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_jobs (
        id TEXT PRIMARY KEY,
        objective TEXT NOT NULL,
        task_type TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 50,
        state TEXT NOT NULL DEFAULT 'QUEUED',
        scope TEXT NOT NULL DEFAULT 'GLOBAL',
        company_id TEXT,
        project_id TEXT,
        client_id TEXT,
        mission_id TEXT,
        goal_id TEXT,
        workflow_id TEXT,
        step_index INTEGER,
        agent_id TEXT,
        assigned_worker_id TEXT,
        assigned_runtime_id TEXT,
        lease_token TEXT,
        fencing_token INTEGER NOT NULL DEFAULT 0,
        idempotency_key TEXT,
        required_capabilities TEXT NOT NULL DEFAULT '[]',
        resource_requirements TEXT,
        policy TEXT NOT NULL DEFAULT 'LOCAL_PREFERRED',
        attempt INTEGER NOT NULL DEFAULT 1,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        max_retries INTEGER NOT NULL DEFAULT 3,
        progress REAL NOT NULL DEFAULT 0.0,
        input_payload TEXT,
        output_payload TEXT,
        checkpoint_id TEXT,
        error_message TEXT,
        requires_approval INTEGER NOT NULL DEFAULT 0,
        estimated_cost REAL,
        actual_cost REAL,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        deadline TEXT,
        FOREIGN KEY (assigned_worker_id) REFERENCES execution_workers(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_runtime_id) REFERENCES execution_runtimes(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_exec_jobs_state ON execution_jobs(state);
      CREATE INDEX IF NOT EXISTS idx_exec_jobs_mission ON execution_jobs(mission_id);
      CREATE INDEX IF NOT EXISTS idx_exec_jobs_goal ON execution_jobs(goal_id);
      CREATE INDEX IF NOT EXISTS idx_exec_jobs_worker ON execution_jobs(assigned_worker_id);
      CREATE INDEX IF NOT EXISTS idx_exec_jobs_idempotency ON execution_jobs(idempotency_key);
    `);

    // 4. Execution Leases Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_leases (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        lease_token TEXT NOT NULL,
        fencing_token INTEGER NOT NULL,
        acquired_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        renewed_at TEXT NOT NULL,
        released_at TEXT,
        revoked INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (job_id) REFERENCES execution_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES execution_workers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_exec_leases_job ON execution_leases(job_id);
      CREATE INDEX IF NOT EXISTS idx_exec_leases_worker ON execution_leases(worker_id);
      CREATE INDEX IF NOT EXISTS idx_exec_leases_expires ON execution_leases(expires_at);
      CREATE INDEX IF NOT EXISTS idx_exec_leases_active ON execution_leases(job_id, worker_id, released_at, revoked);
    `);

    // 5. Execution Checkpoints Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_checkpoints (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        step_name TEXT NOT NULL,
        state_snapshot TEXT NOT NULL,
        completed_actions TEXT NOT NULL DEFAULT '[]',
        pending_actions TEXT NOT NULL DEFAULT '[]',
        artifact_ids TEXT NOT NULL DEFAULT '[]',
        memory_references TEXT NOT NULL DEFAULT '[]',
        tool_state TEXT,
        environment_state TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        verification_evidence TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES execution_jobs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_exec_checkpoints_job ON execution_checkpoints(job_id);
      CREATE INDEX IF NOT EXISTS idx_exec_checkpoints_step ON execution_checkpoints(job_id, step_number);
    `);

    // 6. Execution Traces Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_traces (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        from_state TEXT,
        to_state TEXT,
        worker_id TEXT,
        fencing_token INTEGER,
        details TEXT,
        FOREIGN KEY (job_id) REFERENCES execution_jobs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_exec_traces_job ON execution_traces(job_id);
      CREATE INDEX IF NOT EXISTS idx_exec_traces_time ON execution_traces(timestamp);
    `);

    // 7. Execution Artifacts Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_artifacts (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        checksum_sha256 TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        storage_class TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
        verified INTEGER NOT NULL DEFAULT 0,
        replication_status TEXT NOT NULL DEFAULT 'LOCAL',
        created_at TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES execution_jobs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_exec_artifacts_job ON execution_artifacts(job_id);
    `);

    // 8. Execution Policies Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_policies (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        policy_type TEXT NOT NULL DEFAULT 'LOCAL_PREFERRED',
        max_cost_per_job REAL,
        max_concurrency INTEGER NOT NULL DEFAULT 4,
        require_approval_for_paid INTEGER NOT NULL DEFAULT 1,
        allowed_worker_types TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_exec_policies_scope ON execution_policies(scope);
    `);

    // 9. Execution Cloud Providers Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_cloud_providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider_type TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
        region TEXT,
        remaining_quota REAL,
        quota_reset_time TEXT,
        supported_runtimes TEXT NOT NULL DEFAULT '[]',
        is_paid INTEGER NOT NULL DEFAULT 1,
        cost_per_hour_usd REAL,
        auth_account_id TEXT,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_exec_providers_type ON execution_cloud_providers(provider_type);
      CREATE INDEX IF NOT EXISTS idx_exec_providers_state ON execution_cloud_providers(state);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS execution_cloud_providers;
      DROP TABLE IF EXISTS execution_policies;
      DROP TABLE IF EXISTS execution_artifacts;
      DROP TABLE IF EXISTS execution_traces;
      DROP TABLE IF EXISTS execution_checkpoints;
      DROP TABLE IF EXISTS execution_leases;
      DROP TABLE IF EXISTS execution_jobs;
      DROP TABLE IF EXISTS execution_workers;
      DROP TABLE IF EXISTS execution_runtimes;
    `);
  },
};
