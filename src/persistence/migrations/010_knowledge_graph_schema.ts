/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 010: Advanced Memory & Knowledge Graph Schema
 *
 * Phase 19: Structured, Temporal, Provenance-Aware Knowledge Graph System
 *
 * Tables:
 * 1. knowledge_entities - First-class entities with canonical normalization
 * 2. knowledge_entity_aliases - Known aliases for canonical resolution
 * 3. knowledge_relationships - Directed typed relationships with temporal bounds
 * 4. knowledge_facts - Structured assertions (subject-predicate-object)
 * 5. knowledge_evidence - Provenance and citations anchoring facts
 * 6. knowledge_claims - Candidate claims awaiting validation
 * 7. knowledge_contradictions - Conflicting claims and resolution states
 * 8. knowledge_fact_versions - Immutable history of fact changes
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration010: Migration = {
  version: 10,
  name: '010_knowledge_graph_schema',
  up: (db: DatabaseSync): void => {
    // 1. Entities
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_entities (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        canonical_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        scope TEXT NOT NULL DEFAULT 'GLOBAL',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_entities_canonical ON knowledge_entities(canonical_name);
      CREATE INDEX IF NOT EXISTS idx_entities_type ON knowledge_entities(entity_type);
      CREATE INDEX IF NOT EXISTS idx_entities_scope ON knowledge_entities(scope);
      CREATE INDEX IF NOT EXISTS idx_entities_status ON knowledge_entities(status);
    `);

    // 2. Entity Aliases
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_entity_aliases (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        normalized_alias TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_aliases_normalized ON knowledge_entity_aliases(normalized_alias);
      CREATE INDEX IF NOT EXISTS idx_aliases_entity ON knowledge_entity_aliases(entity_id);
    `);

    // 3. Relationships
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_relationships (
        id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'OUTGOING',
        confidence REAL NOT NULL DEFAULT 1.0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        scope TEXT NOT NULL DEFAULT 'GLOBAL',
        valid_from TEXT,
        valid_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (source_entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE,
        FOREIGN KEY (target_entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rel_source ON knowledge_relationships(source_entity_id);
      CREATE INDEX IF NOT EXISTS idx_rel_target ON knowledge_relationships(target_entity_id);
      CREATE INDEX IF NOT EXISTS idx_rel_type ON knowledge_relationships(relationship_type);
      CREATE INDEX IF NOT EXISTS idx_rel_scope ON knowledge_relationships(scope);
      CREATE INDEX IF NOT EXISTS idx_rel_status ON knowledge_relationships(status);
    `);

    // 4. Facts
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_facts (
        id TEXT PRIMARY KEY,
        subject_entity_id TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object_entity_id TEXT,
        object_value TEXT NOT NULL,
        value_type TEXT NOT NULL DEFAULT 'STRING',
        confidence REAL NOT NULL DEFAULT 1.0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        scope TEXT NOT NULL DEFAULT 'GLOBAL',
        valid_from TEXT,
        valid_until TEXT,
        observed_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (subject_entity_id) REFERENCES knowledge_entities(id) ON DELETE CASCADE,
        FOREIGN KEY (object_entity_id) REFERENCES knowledge_entities(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_facts_subject ON knowledge_facts(subject_entity_id);
      CREATE INDEX IF NOT EXISTS idx_facts_predicate ON knowledge_facts(predicate);
      CREATE INDEX IF NOT EXISTS idx_facts_object_entity ON knowledge_facts(object_entity_id);
      CREATE INDEX IF NOT EXISTS idx_facts_status ON knowledge_facts(status);
      CREATE INDEX IF NOT EXISTS idx_facts_scope ON knowledge_facts(scope);
      CREATE INDEX IF NOT EXISTS idx_facts_observed ON knowledge_facts(observed_at);
    `);

    // 5. Evidence
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_evidence (
        id TEXT PRIMARY KEY,
        fact_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_reference TEXT NOT NULL,
        quote TEXT,
        location TEXT,
        source_date TEXT,
        retrieved_at TEXT NOT NULL,
        credibility TEXT NOT NULL DEFAULT 'PRIMARY',
        confidence REAL NOT NULL DEFAULT 1.0,
        provenance TEXT NOT NULL DEFAULT 'SYSTEM',
        FOREIGN KEY (fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_fact ON knowledge_evidence(fact_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_source_type ON knowledge_evidence(source_type);
      CREATE INDEX IF NOT EXISTS idx_evidence_credibility ON knowledge_evidence(credibility);
    `);

    // 6. Claims
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_claims (
        id TEXT PRIMARY KEY,
        claim_text TEXT NOT NULL,
        extracted_entities TEXT,
        status TEXT NOT NULL DEFAULT 'CANDIDATE',
        confidence REAL NOT NULL DEFAULT 0.5,
        source_type TEXT NOT NULL,
        source_reference TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_claims_status ON knowledge_claims(status);
      CREATE INDEX IF NOT EXISTS idx_claims_source_type ON knowledge_claims(source_type);
    `);

    // 7. Contradictions
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_contradictions (
        id TEXT PRIMARY KEY,
        fact_id_a TEXT NOT NULL,
        fact_id_b TEXT NOT NULL,
        subject_entity_id TEXT NOT NULL,
        predicate TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'DETECTED',
        resolution_strategy TEXT,
        resolved_fact_id TEXT,
        detected_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_contradictions_subject ON knowledge_contradictions(subject_entity_id);
      CREATE INDEX IF NOT EXISTS idx_contradictions_status ON knowledge_contradictions(status);
    `);

    // 8. Fact Versions (Temporal history)
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_fact_versions (
        id TEXT PRIMARY KEY,
        fact_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        predicate TEXT NOT NULL,
        object_value TEXT NOT NULL,
        status TEXT NOT NULL,
        valid_from TEXT,
        valid_until TEXT,
        replaced_by_fact_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_fact_versions_fact ON knowledge_fact_versions(fact_id);
    `);
  }
};
