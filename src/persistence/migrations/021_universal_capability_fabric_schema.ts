/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 021: Universal Capability & Connector Fabric Schema
 *
 * FP-07: Universal Capability Contract, Persistent Registry, Connector Metadata,
 * Credential References, Health State, Invocations Audit, and Provenance.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration021: Migration = {
  version: 21,
  name: '021_universal_capability_fabric_schema',
  up: (db: DatabaseSync): void => {
    // 1. Master Capabilities Registry Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS universal_capabilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        provider TEXT NOT NULL,
        source TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        protocol TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DISCOVERED',
        trust_level TEXT NOT NULL DEFAULT 'UNVERIFIED',
        risk_level TEXT NOT NULL DEFAULT 'TIER_1_SAFE_ACTION',
        privacy_class TEXT NOT NULL DEFAULT 'PRIVATE',
        authentication_type TEXT NOT NULL DEFAULT 'NONE',
        credential_ref TEXT,
        scopes_json TEXT NOT NULL DEFAULT '[]',
        inputs_schema_json TEXT NOT NULL DEFAULT '{}',
        outputs_schema_json TEXT NOT NULL DEFAULT '{}',
        supported_operations_json TEXT NOT NULL DEFAULT '[]',
        environments_json TEXT NOT NULL DEFAULT '[]',
        enabled INTEGER NOT NULL DEFAULT 1,
        documentation TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_capabilities_category ON universal_capabilities(category);
      CREATE INDEX IF NOT EXISTS idx_capabilities_status ON universal_capabilities(status);
      CREATE INDEX IF NOT EXISTS idx_capabilities_protocol ON universal_capabilities(protocol);
      CREATE INDEX IF NOT EXISTS idx_capabilities_trust ON universal_capabilities(trust_level);
      CREATE INDEX IF NOT EXISTS idx_capabilities_privacy ON universal_capabilities(privacy_class);
    `);

    // 2. Capability Credential References Table (Zero Plaintext Secrets)
    db.exec(`
      CREATE TABLE IF NOT EXISTS capability_credentials (
        id TEXT PRIMARY KEY,
        capability_id TEXT NOT NULL,
        credential_ref TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        auth_type TEXT NOT NULL,
        scopes_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'CONFIGURED',
        expires_at TEXT,
        company_id TEXT,
        project_id TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (capability_id) REFERENCES universal_capabilities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_cap_cred_cap_id ON capability_credentials(capability_id);
    `);

    // 3. Capability Dependencies Graph Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS capability_dependencies (
        id TEXT PRIMARY KEY,
        capability_id TEXT NOT NULL,
        dependency_type TEXT NOT NULL, -- 'software' | 'package' | 'credential' | 'mcp' | 'capability' | 'network'
        dependency_ref TEXT NOT NULL,
        required INTEGER NOT NULL DEFAULT 1,
        satisfied INTEGER NOT NULL DEFAULT 1,
        details TEXT,
        FOREIGN KEY (capability_id) REFERENCES universal_capabilities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_cap_dep_cap_id ON capability_dependencies(capability_id);
    `);

    // 4. Capability Health Telemetry Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS capability_health (
        capability_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'UNKNOWN',
        last_checked_at TEXT NOT NULL,
        last_success_at TEXT,
        last_failure_at TEXT,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        latency_ms INTEGER,
        message TEXT,
        provider_status TEXT,
        rate_limit_reset_at TEXT,
        quota_remaining TEXT DEFAULT 'UNKNOWN',
        FOREIGN KEY (capability_id) REFERENCES universal_capabilities(id) ON DELETE CASCADE
      );
    `);

    // 5. Capability Invocations Audit Table (Sanitized / No Secrets)
    db.exec(`
      CREATE TABLE IF NOT EXISTS capability_invocations (
        invocation_id TEXT PRIMARY KEY,
        capability_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        actor TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        agent_id TEXT,
        privacy_class TEXT,
        status TEXT NOT NULL,
        output_json TEXT,
        error_message TEXT,
        verified INTEGER NOT NULL DEFAULT 0,
        verification_strategy TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        provider TEXT,
        capability_version TEXT,
        requested_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (capability_id) REFERENCES universal_capabilities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_cap_inv_cap_id ON capability_invocations(capability_id);
      CREATE INDEX IF NOT EXISTS idx_cap_inv_status ON capability_invocations(status);
      CREATE INDEX IF NOT EXISTS idx_cap_inv_company ON capability_invocations(company_id);
      CREATE INDEX IF NOT EXISTS idx_cap_inv_project ON capability_invocations(project_id);
    `);

    // 6. Capability Provenance & Open-Source Licensing Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS capability_provenance (
        capability_id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        provider TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        license TEXT DEFAULT 'UNKNOWN',
        source_repository TEXT,
        checksum TEXT,
        discovered_at TEXT NOT NULL,
        registered_by TEXT NOT NULL DEFAULT 'SYSTEM',
        verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
        FOREIGN KEY (capability_id) REFERENCES universal_capabilities(id) ON DELETE CASCADE
      );
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS capability_provenance;
      DROP TABLE IF EXISTS capability_invocations;
      DROP TABLE IF EXISTS capability_health;
      DROP TABLE IF EXISTS capability_dependencies;
      DROP TABLE IF EXISTS capability_credentials;
      DROP TABLE IF EXISTS universal_capabilities;
    `);
  },
};
