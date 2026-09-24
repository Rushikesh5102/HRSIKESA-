/**
 * HṚṢĪKEŚA (हृषीकेश) — Embedding Repository
 *
 * Stores and retrieves vector embeddings as raw binary BLOBs in SQLite.
 * Each 768-dim Float32Array occupies 3,072 bytes (768 × 4 bytes).
 *
 * Schema: memory_embeddings (created by migration 003)
 *   memory_id   TEXT PRIMARY KEY → references memory_items(id)
 *   model_id    TEXT
 *   dimensions  INTEGER
 *   vector_blob BLOB             ← raw Float32Array bytes (little-endian)
 *   status      TEXT             ← 'indexed' | 'failed'
 *   created_at  TEXT
 *   updated_at  TEXT
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { EmbeddingVector } from './embedding.provider.js';

export type EmbeddingStatus = 'indexed' | 'failed';

export interface StoredEmbedding {
  readonly memoryId: string;
  readonly modelId: string;
  readonly dimensions: number;
  readonly vector: Float32Array;
  readonly status: EmbeddingStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EmbeddingCounts {
  readonly indexed: number;
  readonly failed: number;
}

export class EmbeddingRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Stores or updates an embedding for a given memory item.
   */
  public store(memoryId: string, vector: EmbeddingVector, modelId: string): void {
    const now = new Date().toISOString();
    // Serialize Float32Array → Buffer (raw bytes)
    const blob = Buffer.from(vector.values.buffer, vector.values.byteOffset, vector.values.byteLength);

    this.db.prepare(`
      INSERT INTO memory_embeddings (memory_id, model_id, dimensions, vector_blob, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'indexed', ?, ?)
      ON CONFLICT(memory_id) DO UPDATE SET
        model_id = excluded.model_id,
        dimensions = excluded.dimensions,
        vector_blob = excluded.vector_blob,
        status = 'indexed',
        updated_at = excluded.updated_at;
    `).run(memoryId, modelId, vector.dimensions, blob, now, now);
  }

  /**
   * Marks an embedding as failed (e.g., provider error during indexing).
   */
  public storeFailure(memoryId: string, modelId: string): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO memory_embeddings (memory_id, model_id, dimensions, vector_blob, status, created_at, updated_at)
      VALUES (?, ?, 0, X'', 'failed', ?, ?)
      ON CONFLICT(memory_id) DO UPDATE SET
        model_id = excluded.model_id,
        status = 'failed',
        updated_at = excluded.updated_at;
    `).run(memoryId, modelId, now, now);
  }

  /**
   * Retrieves the Float32Array for a memory item, or null if not indexed.
   */
  public retrieve(memoryId: string): StoredEmbedding | null {
    const row = this.db.prepare(`
      SELECT memory_id, model_id, dimensions, vector_blob, status, created_at, updated_at
      FROM memory_embeddings WHERE memory_id = ?;
    `).get(memoryId) as {
      memory_id: string;
      model_id: string;
      dimensions: number;
      vector_blob: Buffer;
      status: string;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * Retrieves all indexed (non-failed) embeddings for similarity scan.
   * Bounded by limit to prevent excessive memory use.
   */
  public retrieveAllIndexed(limit = 1000): StoredEmbedding[] {
    const rows = this.db.prepare(`
      SELECT memory_id, model_id, dimensions, vector_blob, status, created_at, updated_at
      FROM memory_embeddings
      WHERE status = 'indexed' AND dimensions > 0
      ORDER BY updated_at DESC
      LIMIT ?;
    `).all(limit) as Array<{
      memory_id: string;
      model_id: string;
      dimensions: number;
      vector_blob: Buffer;
      status: string;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Returns all memory_ids that are NOT yet indexed (or failed).
   */
  public listUnindexedMemoryIds(limit = 200): string[] {
    const rows = this.db.prepare(`
      SELECT m.id
      FROM memory_items m
      LEFT JOIN memory_embeddings e ON m.id = e.memory_id
      WHERE e.memory_id IS NULL
         OR e.status = 'failed'
      LIMIT ?;
    `).all(limit) as Array<{ id: string }>;

    return rows.map((r) => r.id);
  }

  /**
   * Removes an embedding when the parent memory item is deleted.
   */
  public delete(memoryId: string): void {
    this.db.prepare('DELETE FROM memory_embeddings WHERE memory_id = ?;').run(memoryId);
  }

  /**
   * Returns count of indexed vs failed embeddings.
   */
  public countByStatus(): EmbeddingCounts {
    const rows = this.db.prepare(`
      SELECT status, COUNT(*) as cnt FROM memory_embeddings GROUP BY status;
    `).all() as Array<{ status: string; cnt: number }>;

    let indexed = 0;
    let failed = 0;
    for (const r of rows) {
      if (r.status === 'indexed') indexed = Number(r.cnt);
      else if (r.status === 'failed') failed = Number(r.cnt);
    }
    return { indexed, failed };
  }

  /**
   * Returns total count of memory items without embeddings.
   */
  public countUnindexed(): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) as cnt
      FROM memory_items m
      LEFT JOIN memory_embeddings e ON m.id = e.memory_id
      WHERE e.memory_id IS NULL OR e.status = 'failed';
    `).get() as { cnt: number };
    return Number(row?.cnt || 0);
  }

  private mapRow(row: {
    memory_id: string;
    model_id: string;
    dimensions: number;
    vector_blob: Buffer;
    status: string;
    created_at: string;
    updated_at: string;
  }): StoredEmbedding {
    // Deserialize Buffer → Float32Array
    const buf = row.vector_blob;
    const float32 = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

    return {
      memoryId: row.memory_id,
      modelId: row.model_id,
      dimensions: row.dimensions,
      vector: float32,
      status: row.status as EmbeddingStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
