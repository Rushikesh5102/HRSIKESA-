/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 003: Semantic Memory Vector Storage
 *
 * Adds the memory_embeddings table for storing Float32Array vectors as BLOBs.
 * Each row is ~3KB (768 × 4 bytes), making this negligible in size.
 *
 * Cascade deletion: when a memory_items row is deleted, its embedding is
 * automatically removed via ON DELETE CASCADE.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration003: Migration = {
  version: 3,
  name: '003_semantic_memory_schema',
  up: (db: DatabaseSync): void => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_embeddings (
        memory_id    TEXT PRIMARY KEY REFERENCES memory_items(id) ON DELETE CASCADE,
        model_id     TEXT NOT NULL,
        dimensions   INTEGER NOT NULL DEFAULT 0,
        vector_blob  BLOB NOT NULL DEFAULT (X''),
        status       TEXT NOT NULL DEFAULT 'indexed',
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_embeddings_status ON memory_embeddings(status);
    `);
  },

  down: (db: DatabaseSync): void => {
    db.exec('DROP TABLE IF EXISTS memory_embeddings;');
  }
};
