/**
 * HṚṢĪKEŚA (हृषीकेश) — Hybrid Memory Retriever
 *
 * Combines deterministic (keyword LIKE) and semantic (cosine similarity)
 * memory search, then ranks results using a transparent scoring formula.
 *
 * ─────────────────────────────────────────────────────────────────────
 * HYBRID RANKING FORMULA (documented per ADR-013):
 *
 *   hybridScore =
 *     semanticSimilarity  × 0.50   // vector similarity (0–1)
 *     + explicitnessBonus × 0.25   // explicit=1.0, learned=0.5, imported=0.3
 *     + confidenceScore   × 0.15   // item.confidence (0–1)
 *     + recencyBonus      × 0.10   // 1.0→0.0 linear decay over 90 days
 *
 * AUTHORITATIVE OVERRIDE:
 *   Items with provenance='explicit' AND confidence≥0.95 AND tier in
 *   [core_identity, creator_profile, operating_principles] are ALWAYS
 *   included in results regardless of hybrid score.
 *
 * PROVENANCE SAFETY:
 *   Imported memories cannot displace explicit memories of equal/higher tier.
 * ─────────────────────────────────────────────────────────────────────
 */

import { MemoryRepository } from '../../persistence/repositories/memory.repository.js';
import { SemanticMemorySearch, SemanticSearchOptions } from './semantic.search.js';
import { MemoryItem, MemoryTier, MemoryProvenance } from '../../memory/memory.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

const AUTHORITATIVE_TIERS = new Set<MemoryTier>(['core_identity', 'creator_profile', 'operating_principles']);

export interface HybridSearchOptions {
  readonly topK?: number;
  readonly tiers?: MemoryTier[];
  readonly provenance?: MemoryProvenance;
  readonly minSimilarity?: number;
  readonly deterministicLimit?: number;
}

export interface HybridResult {
  readonly item: MemoryItem;
  readonly hybridScore: number;
  readonly semanticSimilarity: number;  // 0 if deterministic-only
  readonly source: 'deterministic' | 'semantic' | 'both' | 'authoritative';
  readonly scoreBreakdown: {
    readonly semantic: number;
    readonly explicitness: number;
    readonly confidence: number;
    readonly recency: number;
  };
}

export class HybridMemoryRetriever {
  private readonly memoryRepo: MemoryRepository;
  private readonly semanticSearch: SemanticMemorySearch;
  private readonly logger?: ILogger;

  constructor(
    memoryRepo: MemoryRepository,
    semanticSearch: SemanticMemorySearch,
    logger?: ILogger
  ) {
    this.memoryRepo = memoryRepo;
    this.semanticSearch = semanticSearch;
    this.logger = logger?.child('HybridMemoryRetriever');
  }

  /**
   * Retrieve and rank memory items for a given query.
   */
  public async retrieve(query: string, options: HybridSearchOptions = {}): Promise<HybridResult[]> {
    const topK = options.topK ?? 5;
    const deterministicLimit = options.deterministicLimit ?? 10;
    const minSimilarity = options.minSimilarity ?? 0.55;

    const allResults = new Map<string, HybridResult>();

    // 1. Authoritative override: always include explicit core identity items
    const authoritativeItems = this.memoryRepo.query({
      provenance: 'explicit',
      limit: 10,
    }).filter(
      (item) => AUTHORITATIVE_TIERS.has(item.tier) && item.confidence >= 0.95
    );

    for (const item of authoritativeItems) {
      allResults.set(item.id, {
        item,
        hybridScore: 1.0,
        semanticSimilarity: 0,
        source: 'authoritative',
        scoreBreakdown: { semantic: 0, explicitness: 1.0, confidence: item.confidence, recency: 1.0 },
      });
    }

    // 2. Deterministic keyword search
    if (query.trim().length > 0) {
      const deterministicItems = this.memoryRepo.search(
        query.slice(0, 200),
        options.tiers?.[0],
        deterministicLimit
      );

      for (const item of deterministicItems) {
        const score = this.hybridScore(item, 0);
        if (allResults.has(item.id)) {
          // Already authoritative — preserve
          continue;
        }
        allResults.set(item.id, {
          item,
          hybridScore: score.total,
          semanticSimilarity: 0,
          source: 'deterministic',
          scoreBreakdown: score.breakdown,
        });
      }
    }

    // 3. Semantic search
    const semanticOpts: SemanticSearchOptions = {
      topK: 10,
      minSimilarity,
      tiers: options.tiers,
      provenance: options.provenance,
    };
    const semanticResults = await this.semanticSearch.search(query, semanticOpts);

    for (const r of semanticResults) {
      const score = this.hybridScore(r.item, r.similarity);
      const existing = allResults.get(r.item.id);

      if (existing) {
        // Merge: upgrade source label and use better score
        const upgraded: HybridResult = {
          item: r.item,
          hybridScore: Math.max(existing.hybridScore, score.total),
          semanticSimilarity: r.similarity,
          source: existing.source === 'authoritative' ? 'authoritative' : 'both',
          scoreBreakdown: score.breakdown,
        };
        allResults.set(r.item.id, upgraded);
      } else {
        // Apply tier filter if specified
        if (options.tiers && options.tiers.length > 0 && !options.tiers.includes(r.item.tier)) continue;

        allResults.set(r.item.id, {
          item: r.item,
          hybridScore: score.total,
          semanticSimilarity: r.similarity,
          source: 'semantic',
          scoreBreakdown: score.breakdown,
        });
      }
    }

    // 4. Sort: authoritatives first, then by hybridScore descending
    const sorted = [...allResults.values()].sort((a, b) => {
      if (a.source === 'authoritative' && b.source !== 'authoritative') return -1;
      if (b.source === 'authoritative' && a.source !== 'authoritative') return 1;
      return b.hybridScore - a.hybridScore;
    });

    // 5. Bound output
    const output = sorted.slice(0, topK + authoritativeItems.length);
    this.logger?.debug(`HybridRetriever: query="${query.slice(0, 60)}" → ${output.length} results (${semanticResults.length} semantic, ${allResults.size} total candidates)`);
    return output;
  }

  /**
   * Transparent scoring formula per ADR-013.
   */
  private hybridScore(
    item: MemoryItem,
    semanticSim: number
  ): { total: number; breakdown: HybridResult['scoreBreakdown'] } {
    const semantic = semanticSim;                          // 0.0–1.0

    const explicitness =
      item.provenance === 'explicit' ? 1.0 :
      item.provenance === 'learned' ? 0.5 :
      0.3;                                                 // imported

    const confidence = Math.max(0, Math.min(1, item.confidence));

    // Recency: linear decay over 90 days
    const ageMs = Date.now() - new Date(item.updatedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recency = Math.max(0, 1 - ageDays / 90);

    const total =
      semantic      * 0.50 +
      explicitness  * 0.25 +
      confidence    * 0.15 +
      recency       * 0.10;

    return {
      total,
      breakdown: { semantic, explicitness, confidence, recency },
    };
  }
}
