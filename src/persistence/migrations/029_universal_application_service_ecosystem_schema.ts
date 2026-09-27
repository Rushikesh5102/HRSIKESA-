/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 029: Universal Application & Service Ecosystem Schema
 *
 * FP-15: Service Descriptors, Interface Bindings, Ecosystem Operations,
 * and Consequential Action Verifications.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration029: Migration = {
  version: 29,
  name: '029_universal_application_service_ecosystem_schema',
  up: (db: DatabaseSync): void => {
    // 1. Ecosystem Services Catalog
    db.exec(`
      CREATE TABLE IF NOT EXISTS ecosystem_services (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        category TEXT NOT NULL,
        interfaces_json TEXT NOT NULL DEFAULT '[]',
        capabilities_json TEXT NOT NULL DEFAULT '[]',
        auth_methods_json TEXT NOT NULL DEFAULT '[]',
        account_requirements_json TEXT NOT NULL DEFAULT '{}',
        scopes_json TEXT NOT NULL DEFAULT '[]',
        environments_json TEXT NOT NULL DEFAULT '[]',
        supported_operations_json TEXT NOT NULL DEFAULT '[]',
        risk TEXT NOT NULL DEFAULT 'LOW',
        privacy TEXT NOT NULL DEFAULT 'INTERNAL',
        availability TEXT NOT NULL DEFAULT 'AVAILABLE',
        health_status TEXT NOT NULL DEFAULT 'HEALTHY',
        quota_json TEXT NOT NULL DEFAULT '{}',
        rate_limit_json TEXT NOT NULL DEFAULT '{}',
        provenance_json TEXT NOT NULL DEFAULT '{}',
        license TEXT NOT NULL DEFAULT 'PROPRIETARY',
        version TEXT NOT NULL DEFAULT '1.0.0',
        documentation_url TEXT,
        dependencies_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ecosystem_services_provider ON ecosystem_services(provider_id);
      CREATE INDEX IF NOT EXISTS idx_ecosystem_services_category ON ecosystem_services(category);
      CREATE INDEX IF NOT EXISTS idx_ecosystem_services_health ON ecosystem_services(health_status);
    `);

    // 2. Ecosystem Interface Bindings
    db.exec(`
      CREATE TABLE IF NOT EXISTS ecosystem_interfaces (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        interface_type TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 100,
        reliability_score REAL NOT NULL DEFAULT 1.0,
        average_latency_ms INTEGER NOT NULL DEFAULT 50,
        is_available INTEGER NOT NULL DEFAULT 1,
        requires_approval INTEGER NOT NULL DEFAULT 0,
        config_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (service_id) REFERENCES ecosystem_services(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ecosystem_interfaces_svc ON ecosystem_interfaces(service_id);
      CREATE INDEX IF NOT EXISTS idx_ecosystem_interfaces_type ON ecosystem_interfaces(interface_type);
    `);

    // 3. Ecosystem Operations Ledger (Normalized Envelopes)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ecosystem_operations (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL UNIQUE,
        provider_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        account_id TEXT,
        capability_id TEXT NOT NULL,
        operation_name TEXT NOT NULL,
        interface_type TEXT NOT NULL,
        scope TEXT,
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        request_json TEXT NOT NULL DEFAULT '{}',
        response_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'PENDING',
        error_json TEXT,
        evidence_json TEXT,
        execution_time_ms INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        provenance_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_ecosystem_ops_svc ON ecosystem_operations(service_id);
      CREATE INDEX IF NOT EXISTS idx_ecosystem_ops_acc ON ecosystem_operations(account_id);
      CREATE INDEX IF NOT EXISTS idx_ecosystem_ops_cap ON ecosystem_operations(capability_id);
      CREATE INDEX IF NOT EXISTS idx_ecosystem_ops_status ON ecosystem_operations(status);
    `);

    // 4. Consequential Action Verifications
    db.exec(`
      CREATE TABLE IF NOT EXISTS ecosystem_verifications (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        strategy TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        evidence_json TEXT NOT NULL DEFAULT '{}',
        verified_at TEXT NOT NULL,
        error TEXT,
        FOREIGN KEY (operation_id) REFERENCES ecosystem_operations(operation_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ecosystem_verif_op ON ecosystem_verifications(operation_id);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS ecosystem_verifications;
      DROP TABLE IF EXISTS ecosystem_operations;
      DROP TABLE IF EXISTS ecosystem_interfaces;
      DROP TABLE IF EXISTS ecosystem_services;
    `);
  },
};
