/**
 * HṚṢĪKEŚA (हृषीकेश) — Semantic Memory Search
 *
 * Performs vector similarity search against all indexed memory embeddings.
 *
 * Algorithm:
 *   1. Embed the query text via EmbeddingProvider
 *   2. Load all indexed embeddings from SQLite (bounded: max 1000)
 *   3. Compute cosine similarity in-process using Float32Array dot product
 *      (vectors are L2-normalized by the provider, so cos(θ) = dot product)
 *   4. Filter by minSimilarity, optionally filter by tiers/provenance
 *   5. Return topK results ordered by descending similarity
 *
 * Scaling: O(N × D) per query. Safe for N < 10,000, D = 768.
 *   At 10k items: ~7.68M multiply-accumulates → < 10ms on modern CPU.
 */

import { IEmbeddingProvider } from './embedding.provider.js';
import { EmbeddingRepository } from './embedding.repository.js';
import { MemoryRepository } from '../../persistence/repositories/memory.repository.js';
import { MemoryItem, MemoryTier, MemoryProvenance } from '../../memory/memory.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface SemanticSearchOptions {
  readonly topK?: number;
  readonly minSimilarity?: number;
  readonly tiers?: MemoryTier[];
  readonly provenance?: MemoryProvenance;
}

export interface SemanticSearchResult {
  readonly item: MemoryItem;
  readonly similarity: number;   // 0.0 – 1.0
  readonly rank: number;         // 1-indexed
}

export class SemanticMemorySearch {
  private readonly provider: IEmbeddingProvider;
  private readonly embeddingRepo: EmbeddingRepository;
  private readonly memoryRepo: MemoryRepository;
  private readonly logger?: ILogger;

  constructor(
    provider: IEmbeddingProvider,
    embeddingRepo: EmbeddingRepository,
    memoryRepo: MemoryRepository,
    logger?: ILogger
  ) {
    this.provider = provider;
    this.embeddingRepo = embeddingRepo;
    this.memoryRepo = memoryRepo;
    this.logger = logger?.child('SemanticMemorySearch');
  }

  /**
   * Semantic similarity search across indexed memory.
   * Returns empty array if provider is unavailable or query is empty.
   */
  public async search(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const topK = options.topK ?? 5;
    const minSimilarity = options.minSimilarity ?? 0.55;

    if (!query || query.trim().length === 0) {
      return [];
    }

    // Check provider health (quick — cached in indexer, but we do inline here)
    const health = await this.provider.health();
    if (health.status === 'unavailable') {
      this.logger?.debug(`Semantic search skipped: provider unavailable (${health.message})`);
      return [];
    }

    let queryVector: Float32Array;
    try {
      const embedded = await this.provider.embedText(query.slice(0, 500));
      queryVector = embedded.values;
    } catch (err) {
      this.logger?.warn(`Failed to embed query: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }

    // Load indexed embeddings
    const stored = this.embeddingRepo.retrieveAllIndexed(1000);
    if (stored.length === 0) return [];

    // Compute cosine similarities
    const candidates: Array<{ memoryId: string; similarity: number }> = [];
    for (const s of stored) {
      if (s.dimensions !== queryVector.length) continue; // dimension mismatch — skip
      const sim = this.dotProduct(queryVector, s.vector);
      if (sim >= minSimilarity) {
        candidates.push({ memoryId: s.memoryId, similarity: sim });
      }
    }

    // Sort descending by similarity
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topCandidates = candidates.slice(0, topK);

    // Fetch full memory items
    const results: SemanticSearchResult[] = [];
    let rank = 1;
    for (const c of topCandidates) {
      const item = this.memoryRepo.retrieveById(c.memoryId);
      if (!item) continue;

      // Apply tier filter
      if (options.tiers && options.tiers.length > 0) {
        if (!options.tiers.includes(item.tier)) continue;
      }

      // Apply provenance filter
      if (options.provenance && item.provenance !== options.provenance) continue;

      results.push({ item, similarity: c.similarity, rank: rank++ });
    }

    this.logger?.debug(`Semantic search: query="${query.slice(0, 60)}…" → ${results.length} results (from ${stored.length} indexed)`);
    return results;
  }

  /**
   * Dot product of two L2-normalized Float32Arrays.
   * Equals cosine similarity when both vectors are unit-length.
   */
  private dotProduct(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }
}
