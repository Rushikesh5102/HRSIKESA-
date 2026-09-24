/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 012: Dynamic MCP & Capability Ecosystem Schema
 *
 * Phase 21: Model Context Protocol (MCP) Server Registry, Capability Bindings,
 * Sandboxing, Security Reviews, and Execution Telemetry.
 *
 * Tables:
 * 1. mcp_servers - Master catalog of registered external & local MCP servers
 * 2. mcp_server_versions - Immutable history and configuration snapshots per version
 * 3. mcp_tools - Discovered tools with input/output schemas and risk classification
 * 4. mcp_resources - Discovered data resources with sensitivity and access policies
 * 5. mcp_prompts - Discovered prompt templates and argument schemas
 * 6. mcp_capability_bindings - Scope-aware bindings to standard HṚṢĪKEŚA capabilities
 * 7. mcp_security_reviews - Static inspection reports and danger tier evaluations
 * 8. mcp_execution_stats - Usage, latency, and error telemetry
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration012: Migration = {
  version: 12,
  name: '012_mcp_capability_ecosystem_schema',
  up: (db: DatabaseSync): void => {
    // 1. Master MCP Servers Catalog
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        transport TEXT NOT NULL DEFAULT 'stdio',
        command TEXT,
        arguments_json TEXT NOT NULL DEFAULT '[]',
        endpoint TEXT,
        env_metadata_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'DISCOVERED',
        trust_level TEXT NOT NULL DEFAULT 'UNKNOWN',
        source TEXT NOT NULL DEFAULT 'LOCAL',
        repository_url TEXT,
        license TEXT NOT NULL DEFAULT 'UNKNOWN',
        enabled INTEGER NOT NULL DEFAULT 0,
        authorized INTEGER NOT NULL DEFAULT 0,
        health TEXT NOT NULL DEFAULT 'UNCONFIGURED',
        last_checked_at TEXT,
        pid INTEGER,
        restart_count INTEGER NOT NULL DEFAULT 0,
        config_hash TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name);
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_trust ON mcp_servers(trust_level);
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_health ON mcp_servers(health);
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_transport ON mcp_servers(transport);
    `);

    // 2. MCP Server Version Snapshots
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_server_versions (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        version TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        changelog TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
        UNIQUE (server_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_server_ver_server ON mcp_server_versions(server_id);
      CREATE INDEX IF NOT EXISTS idx_mcp_server_ver_version ON mcp_server_versions(version);
    `);

    // 3. Discovered MCP Tools
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_tools (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT NOT NULL,
        input_schema_json TEXT NOT NULL DEFAULT '{}',
        output_schema_json TEXT NOT NULL DEFAULT '{}',
        risk_level TEXT NOT NULL DEFAULT 'TIER_1',
        required_permissions_json TEXT NOT NULL DEFAULT '[]',
        network_requirement TEXT NOT NULL DEFAULT 'NONE',
        filesystem_requirement TEXT NOT NULL DEFAULT 'NONE',
        credential_requirement TEXT NOT NULL DEFAULT 'NONE',
        enabled INTEGER NOT NULL DEFAULT 1,
        verified INTEGER NOT NULL DEFAULT 0,
        is_destructive INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
        UNIQUE (server_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(server_id);
      CREATE INDEX IF NOT EXISTS idx_mcp_tools_name ON mcp_tools(name);
      CREATE INDEX IF NOT EXISTS idx_mcp_tools_risk ON mcp_tools(risk_level);
    `);

    // 4. Discovered MCP Resources
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_resources (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        uri TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        mime_type TEXT NOT NULL DEFAULT 'text/plain',
        sensitivity TEXT NOT NULL DEFAULT 'INTERNAL',
        access_policy_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
        UNIQUE (server_id, uri)
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_resources_server ON mcp_resources(server_id);
      CREATE INDEX IF NOT EXISTS idx_mcp_resources_uri ON mcp_resources(uri);
    `);

    // 5. Discovered MCP Prompts
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_prompts (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        arguments_json TEXT NOT NULL DEFAULT '[]',
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
        UNIQUE (server_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_prompts_server ON mcp_prompts(server_id);
      CREATE INDEX IF NOT EXISTS idx_mcp_prompts_name ON mcp_prompts(name);
    `);

    // 6. Capability Bindings & Scoping
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_capability_bindings (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        tool_id TEXT NOT NULL,
        capability_id TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'GLOBAL',
        tenant_id TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 100,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
        FOREIGN KEY (tool_id) REFERENCES mcp_tools(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_cap_bind_cap ON mcp_capability_bindings(capability_id);
      CREATE INDEX IF NOT EXISTS idx_mcp_cap_bind_scope ON mcp_capability_bindings(scope, tenant_id);
    `);

    // 7. Security Reviews & Audit Reports
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_security_reviews (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        reviewed_at TEXT NOT NULL,
        reviewer TEXT NOT NULL DEFAULT 'SYSTEM',
        findings_json TEXT NOT NULL DEFAULT '[]',
        risk_score REAL NOT NULL DEFAULT 0.0,
        decision TEXT NOT NULL DEFAULT 'APPROVED',
        notes TEXT,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_sec_reviews_server ON mcp_security_reviews(server_id);
    `);

    // 8. Execution Statistics & Telemetry
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_execution_stats (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        tool_id TEXT NOT NULL,
        total_calls INTEGER NOT NULL DEFAULT 0,
        successful_calls INTEGER NOT NULL DEFAULT 0,
        failed_calls INTEGER NOT NULL DEFAULT 0,
        total_latency_ms INTEGER NOT NULL DEFAULT 0,
        avg_latency_ms REAL NOT NULL DEFAULT 0.0,
        last_called_at TEXT,
        last_error TEXT,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
        UNIQUE (server_id, tool_id)
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_exec_stats_server ON mcp_execution_stats(server_id);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS mcp_execution_stats;
      DROP TABLE IF EXISTS mcp_security_reviews;
      DROP TABLE IF EXISTS mcp_capability_bindings;
      DROP TABLE IF EXISTS mcp_prompts;
      DROP TABLE IF EXISTS mcp_resources;
      DROP TABLE IF EXISTS mcp_tools;
      DROP TABLE IF EXISTS mcp_server_versions;
      DROP TABLE IF EXISTS mcp_servers;
    `);
  },
};
