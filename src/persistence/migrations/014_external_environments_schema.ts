/**
 * HṚṢĪKEŚA (हृषीकेश) — External & Enterprise Environments Schema
 *
 * Migration 014: Establishes durable persistence for external environment registries,
 * scoped capabilities, active sessions, credential pointers, health logs, and remote operations.
 */

import { Migration } from './migration.types.js';

export const migration014: Migration = {
  version: 14,
  name: '014_external_environments_schema',
  up: (db) => {
    // 1. Environments Registry Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        platform TEXT NOT NULL,
        hostname TEXT NOT NULL,
        address TEXT,
        port INTEGER,
        status TEXT NOT NULL DEFAULT 'DISCOVERED',
        trust_level TEXT NOT NULL DEFAULT 'UNKNOWN',
        is_authorized INTEGER NOT NULL DEFAULT 0,
        owner TEXT NOT NULL DEFAULT 'Rushikesh Pattiwar',
        scope TEXT NOT NULL DEFAULT 'GLOBAL',
        company_id TEXT,
        project_id TEXT,
        department TEXT,
        fingerprint TEXT,
        tags TEXT,
        metadata TEXT,
        last_connected_at TEXT,
        last_health_check_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_environments_status ON environments(status);
      CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(type);
      CREATE INDEX IF NOT EXISTS idx_environments_trust ON environments(trust_level);
      CREATE INDEX IF NOT EXISTS idx_environments_scope ON environments(scope);
      CREATE INDEX IF NOT EXISTS idx_environments_project ON environments(project_id);
    `);

    // 2. Scoped Capabilities Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS environment_capabilities (
        id TEXT PRIMARY KEY,
        environment_id TEXT NOT NULL,
        capability_id TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'ENVIRONMENT',
        is_available INTEGER NOT NULL DEFAULT 1,
        risk_tier TEXT NOT NULL DEFAULT 'LOW_RISK',
        configuration TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_env_cap_unique ON environment_capabilities(environment_id, capability_id);
      CREATE INDEX IF NOT EXISTS idx_env_cap_env ON environment_capabilities(environment_id);
      CREATE INDEX IF NOT EXISTS idx_env_cap_id ON environment_capabilities(capability_id);
    `);

    // 3. Environment Sessions Table (Strictly metadata, NO credentials)
    db.exec(`
      CREATE TABLE IF NOT EXISTS environment_sessions (
        id TEXT PRIMARY KEY,
        environment_id TEXT NOT NULL,
        session_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CREATING',
        agent_id TEXT,
        mission_id TEXT,
        goal_id TEXT,
        remote_pid INTEGER,
        remote_user TEXT,
        active_channel TEXT,
        idle_timeout_ms INTEGER NOT NULL DEFAULT 300000,
        connection_metadata TEXT,
        created_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        closed_at TEXT,
        error_message TEXT,
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_env_sessions_env ON environment_sessions(environment_id);
      CREATE INDEX IF NOT EXISTS idx_env_sessions_status ON environment_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_env_sessions_agent ON environment_sessions(agent_id);
    `);

    // 4. Credential Pointers / Metadata Table (Stores references/types only, NO plaintext secrets)
    db.exec(`
      CREATE TABLE IF NOT EXISTS environment_credentials_metadata (
        id TEXT PRIMARY KEY,
        environment_id TEXT NOT NULL,
        auth_type TEXT NOT NULL,
        credential_reference TEXT NOT NULL,
        username TEXT,
        key_fingerprint TEXT,
        requires_mfa INTEGER NOT NULL DEFAULT 0,
        mfa_type TEXT,
        last_validated_at TEXT,
        is_valid INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_env_cred_env ON environment_credentials_metadata(environment_id);
      CREATE INDEX IF NOT EXISTS idx_env_cred_type ON environment_credentials_metadata(auth_type);
    `);

    // 5. Environment Health Log
    db.exec(`
      CREATE TABLE IF NOT EXISTS environment_health (
        id TEXT PRIMARY KEY,
        environment_id TEXT NOT NULL,
        status TEXT NOT NULL,
        latency_ms INTEGER,
        cpu_usage_pct REAL,
        memory_usage_pct REAL,
        disk_free_bytes INTEGER,
        active_sessions_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_env_health_env ON environment_health(environment_id);
      CREATE INDEX IF NOT EXISTS idx_env_health_time ON environment_health(timestamp);
    `);

    // 6. Remote Operations Ledger
    db.exec(`
      CREATE TABLE IF NOT EXISTS environment_operations (
        id TEXT PRIMARY KEY,
        environment_id TEXT NOT NULL,
        session_id TEXT,
        operation_type TEXT NOT NULL,
        command_or_action TEXT NOT NULL,
        danger_tier TEXT NOT NULL DEFAULT 'SAFE',
        precondition_status TEXT NOT NULL DEFAULT 'PASSED',
        execution_status TEXT NOT NULL DEFAULT 'RUNNING',
        exit_code INTEGER,
        output_summary TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        is_idempotent INTEGER NOT NULL DEFAULT 1,
        verification_status TEXT NOT NULL DEFAULT 'PENDING',
        verification_evidence TEXT,
        agent_id TEXT,
        requires_approval INTEGER NOT NULL DEFAULT 0,
        approved_by TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_env_ops_env ON environment_operations(environment_id);
      CREATE INDEX IF NOT EXISTS idx_env_ops_status ON environment_operations(execution_status);
      CREATE INDEX IF NOT EXISTS idx_env_ops_time ON environment_operations(created_at);
    `);
  },
  down: (db) => {
    db.exec(`
      DROP TABLE IF EXISTS environment_operations;
      DROP TABLE IF EXISTS environment_health;
      DROP TABLE IF EXISTS environment_credentials_metadata;
      DROP TABLE IF EXISTS environment_sessions;
      DROP TABLE IF EXISTS environment_capabilities;
      DROP TABLE IF EXISTS environments;
    `);
  },
};
