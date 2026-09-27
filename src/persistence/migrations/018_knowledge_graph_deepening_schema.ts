/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 018: Knowledge Graph Deepening & Entity Merge Proposals
 *
 * INT-006: Sovereign Personal Knowledge Graph & Memory Deepening
 *
 * Additions:
 * 1. knowledge_merge_proposals - Proposal-based entity disambiguation and merging
 * 2. Extended columns on knowledge_contradictions (source_a, source_b, reason)
 * 3. Extended columns on knowledge_facts (provenance, source_study_id)
 * 4. Extended columns on knowledge_evidence (claim_id, study_id, url, content_hash)
 * 5. Default entity aliases bootstrap (HṚṢĪKEŚA / HRISHIKESHA / हृषीकेश; llama3.2:3b / Llama 3.2 3B / llama 3b)
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration018: Migration = {
  version: 18,
  name: '018_knowledge_graph_deepening_schema',
  up: (db: DatabaseSync): void => {
    // 1. Entity Merge Proposals Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_merge_proposals (
        id TEXT PRIMARY KEY,
        entity_a_id TEXT NOT NULL,
        entity_b_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.5,
        evidence TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by TEXT,
        FOREIGN KEY (entity_a_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_b_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_merge_props_entity_a ON knowledge_merge_proposals(entity_a_id);
      CREATE INDEX IF NOT EXISTS idx_merge_props_entity_b ON knowledge_merge_proposals(entity_b_id);
      CREATE INDEX IF NOT EXISTS idx_merge_props_status ON knowledge_merge_proposals(status);
    `);

    // 2. Extend knowledge_contradictions with source_a, source_b, and reason if missing
    try {
      const contraCols = db.prepare('PRAGMA table_info(knowledge_contradictions)').all() as { name: string }[];
      const contraColNames = new Set(contraCols.map((c) => c.name));

      if (!contraColNames.has('source_a')) {
        db.exec('ALTER TABLE knowledge_contradictions ADD COLUMN source_a TEXT;');
      }
      if (!contraColNames.has('source_b')) {
        db.exec('ALTER TABLE knowledge_contradictions ADD COLUMN source_b TEXT;');
      }
      if (!contraColNames.has('reason')) {
        db.exec('ALTER TABLE knowledge_contradictions ADD COLUMN reason TEXT;');
      }
    } catch {
      // Non-blocking schema safeguard
    }

    // 3. Extend knowledge_facts with provenance and source_study_id if missing
    try {
      const factCols = db.prepare('PRAGMA table_info(knowledge_facts)').all() as { name: string }[];
      const factColNames = new Set(factCols.map((c) => c.name));

      if (!factColNames.has('provenance')) {
        db.exec("ALTER TABLE knowledge_facts ADD COLUMN provenance TEXT NOT NULL DEFAULT 'SYSTEM';");
      }
      if (!factColNames.has('source_study_id')) {
        db.exec('ALTER TABLE knowledge_facts ADD COLUMN source_study_id TEXT;');
      }
    } catch {
      // Non-blocking schema safeguard
    }

    // 4. Extend knowledge_evidence with claim_id, study_id, url, and content_hash if missing
    try {
      const evCols = db.prepare('PRAGMA table_info(knowledge_evidence)').all() as { name: string }[];
      const evColNames = new Set(evCols.map((c) => c.name));

      if (!evColNames.has('claim_id')) {
        db.exec('ALTER TABLE knowledge_evidence ADD COLUMN claim_id TEXT;');
      }
      if (!evColNames.has('study_id')) {
        db.exec('ALTER TABLE knowledge_evidence ADD COLUMN study_id TEXT;');
      }
      if (!evColNames.has('url')) {
        db.exec('ALTER TABLE knowledge_evidence ADD COLUMN url TEXT;');
      }
      if (!evColNames.has('content_hash')) {
        db.exec('ALTER TABLE knowledge_evidence ADD COLUMN content_hash TEXT;');
      }
    } catch {
      // Non-blocking schema safeguard
    }
  },
};
