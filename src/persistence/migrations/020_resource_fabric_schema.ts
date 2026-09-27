/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 020: Distributed Resource Fabric & Execution Capacity Schema
 *
 * Foundation Performance & Execution Block FP-03:
 * Distributed Local/LAN Resource Fabric & Execution Capacity
 *
 * Adds:
 * 1. workers - Registered execution nodes (LOCAL, LAN, REMOTE, CLOUD)
 * 2. worker_capabilities - Declared capabilities per worker
 * 3. worker_tasks - Dispatched tasks and execution queue tracking
 * 4. worker_resource_snapshots - Bounded hardware telemetry snapshots
 * 5. worker_enrollment_tokens - Cryptographically hashed pairing tokens
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration020: Migration = {
  version: 20,
  name: '020_resource_fabric_schema',
  up: (db: DatabaseSync): void => {
    // 1. Workers Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'REGISTERING',
        host TEXT NOT NULL,
        port INTEGER,
        platform TEXT NOT NULL,
        architecture TEXT NOT NULL,
        cpu_info TEXT NOT NULL,
        memory_info TEXT NOT NULL,
        gpu_info TEXT NOT NULL,
        gpu_backend TEXT,
        models TEXT NOT NULL DEFAULT '[]',
        capabilities TEXT NOT NULL DEFAULT '[]',
        environment_ids TEXT DEFAULT '[]',
        priority INTEGER NOT NULL DEFAULT 50,
        trust_level TEXT NOT NULL DEFAULT 'PROVISIONAL',
        registered_at TEXT NOT NULL,
        last_heartbeat TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        load_score REAL NOT NULL DEFAULT 0.0,
        resource_limits TEXT,
        protocol_version TEXT NOT NULL DEFAULT '1.0.0',
        version TEXT NOT NULL DEFAULT '1.0.0',
        auth_token_hash TEXT,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
      CREATE INDEX IF NOT EXISTS idx_workers_type ON workers(type);
      CREATE INDEX IF NOT EXISTS idx_workers_trust ON workers(trust_level);
      CREATE INDEX IF NOT EXISTS idx_workers_heartbeat ON workers(last_heartbeat);
    `);

    // 2. Worker Capabilities Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS worker_capabilities (
        worker_id TEXT NOT NULL,
        capability_id TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        available INTEGER NOT NULL DEFAULT 1,
        metadata TEXT,
        security_level TEXT DEFAULT 'SAFE',
        PRIMARY KEY (worker_id, capability_id),
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_worker_caps_cap ON worker_capabilities(capability_id);
    `);

    // 3. Worker Tasks Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS worker_tasks (
        id TEXT PRIMARY KEY,
        task_type TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 50,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        privacy_level TEXT NOT NULL DEFAULT 'PRIVATE',
        required_capabilities TEXT NOT NULL DEFAULT '[]',
        resource_requirements TEXT,
        preferred_worker_id TEXT,
        assigned_worker_id TEXT,
        attempt INTEGER NOT NULL DEFAULT 1,
        progress REAL NOT NULL DEFAULT 0.0,
        idempotency_key TEXT,
        input_payload TEXT,
        output_payload TEXT,
        error_message TEXT,
        placement_reason TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        deadline TEXT,
        timeout_ms INTEGER,
        metadata TEXT,
        FOREIGN KEY (assigned_worker_id) REFERENCES workers(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_wtasks_status ON worker_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_wtasks_assigned ON worker_tasks(assigned_worker_id);
      CREATE INDEX IF NOT EXISTS idx_wtasks_priority ON worker_tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_wtasks_created ON worker_tasks(created_at);
      CREATE INDEX IF NOT EXISTS idx_wtasks_idempotency ON worker_tasks(idempotency_key);
    `);

    // 4. Worker Resource Snapshots Table (Telemetry with bounded retention)
    db.exec(`
      CREATE TABLE IF NOT EXISTS worker_resource_snapshots (
        id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        cpu_usage REAL NOT NULL,
        ram_used_bytes REAL NOT NULL,
        ram_total_bytes REAL NOT NULL,
        gpu_utilization REAL,
        gpu_memory_used_bytes REAL,
        active_tasks INTEGER NOT NULL DEFAULT 0,
        queue_depth INTEGER NOT NULL DEFAULT 0,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_wrs_worker ON worker_resource_snapshots(worker_id);
      CREATE INDEX IF NOT EXISTS idx_wrs_timestamp ON worker_resource_snapshots(timestamp);
    `);

    // 5. Worker Enrollment Tokens Table (Pairing secrets hashed with SHA-256)
    db.exec(`
      CREATE TABLE IF NOT EXISTS worker_enrollment_tokens (
        token_hash TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        revoked INTEGER NOT NULL DEFAULT 0,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_wet_expires ON worker_enrollment_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_wet_revoked ON worker_enrollment_tokens(revoked);
    `);
  },
};
