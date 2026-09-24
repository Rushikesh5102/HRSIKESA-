/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 001: Initial Persistence Schema
 *
 * Establishes tables for:
 * 1. sessions (durable conversation threads)
 * 2. messages (durable conversation turns with strict ordinal sequencing)
 * 3. memory_items (14 structured memory tiers with provenance metadata)
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration001: Migration = {
  version: 1,
  name: '001_initial_schema',
  up: (db: DatabaseSync): void => {
    // 1. Sessions Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      );
    `);

    // 2. Messages Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        model TEXT,
        provider TEXT,
        metadata TEXT,
        ordinal INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session_ordinal ON messages(session_id, ordinal);
      CREATE INDEX IF NOT EXISTS idx_messages_session_timestamp ON messages(session_id, timestamp);
    `);

    // 3. Memory Items Table (14 Tiers)
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_items (
        id TEXT PRIMARY KEY,
        tier TEXT NOT NULL,
        key TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        provenance TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_memory_tier ON memory_items(tier);
      CREATE INDEX IF NOT EXISTS idx_memory_tier_key ON memory_items(tier, key);
      CREATE INDEX IF NOT EXISTS idx_memory_provenance ON memory_items(provenance);
    `);

    // 4. Initial Seed Data (Core Identity & Creator Profile)
    const now = new Date().toISOString();

    const insertMemory = db.prepare(`
      INSERT OR IGNORE INTO memory_items (
        id, tier, key, content, source, provenance, confidence, created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    // Seed Tier 1: Core Identity
    insertMemory.run(
      'seed-core-identity',
      'core_identity',
      'system_identity',
      JSON.stringify({
        name: 'HṚṢĪKEŚA',
        sanskrit: 'हृषीकेश',
        internationalSpelling: 'HRISHIKESHA',
        nature: 'Sovereign Personal AI Operating System & Autonomous Workforce Control Plane',
        immutableRules: [
          'Sole master and root authority is Rushikesh Pattiwar.',
          'Underlying neural models (Qwen, etc.) are cognition engines, not HṚṢĪKEŚA itself.',
          'Zero execution without explicit or authorized autonomous delegation.'
        ]
      }),
      'system_bootstrap',
      'explicit',
      1.0,
      now,
      now,
      JSON.stringify({ version: '0.2.0', locked: true })
    );

    // Seed Tier 2: Creator Profile
    insertMemory.run(
      'seed-creator-profile',
      'creator_profile',
      'rushikesh_pattiwar',
      JSON.stringify({
        fullName: 'Rushikesh Pattiwar',
        role: 'Creator & Sole Master',
        authorityLevel: 'ROOT_RUSHIKESH',
        hardware: {
          machine: 'Acer Swift SFG14-73T',
          cpu: 'Intel Core Ultra 5 125H (14 cores, 18 threads)',
          ramGb: 15.7,
          gpu: 'Intel Arc Graphics'
        },
        engineeringPreferences: {
          primaryLanguages: ['TypeScript', 'Python'],
          nodeVersion: '24.x',
          architectureStyle: 'Strict typing, modular separation of concerns, zero unnecessary dependencies, deterministic pipelines',
          testingStandard: '100% automated test coverage with native runners'
        },
        approvedTools: ['Antigravity IDE', 'Ollama', 'Git', 'PowerShell', 'VS Code'],
        operatingPrinciples: [
          'Sovereign self-containment',
          'Local-first zero-cost cognition',
          'ADR-driven architectural decisions',
          'Non-invasive VDI operation'
        ]
      }),
      'system_bootstrap',
      'explicit',
      1.0,
      now,
      now,
      JSON.stringify({ verified: true, authority: 'ROOT' })
    );

    // Seed Tier 3: Operating Principles
    insertMemory.run(
      'seed-operating-principles',
      'operating_principles',
      'core_principles',
      JSON.stringify({
        localFirst: true,
        zeroCostInference: true,
        singleInferenceLock: true,
        nonInvasiveVdi: true,
        humanInTheLoop: true
      }),
      'system_bootstrap',
      'explicit',
      1.0,
      now,
      now,
      null
    );
  },

  down: (db: DatabaseSync): void => {
    db.exec('DROP TABLE IF EXISTS messages;');
    db.exec('DROP TABLE IF EXISTS sessions;');
    db.exec('DROP TABLE IF EXISTS memory_items;');
  }
};
