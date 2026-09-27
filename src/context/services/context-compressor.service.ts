/**
 * HṚṢĪKEŚA (हृषीकेश) — Context Compressor Service
 *
 * Track A / INT-007: Cognitive Context Engine
 * Applies structured, semantic compression: deduplication, low-relevance pruning,
 * and high-priority preservation within allocated token/char budgets.
 */

import { ContextCandidate, ContextBudget } from '../interfaces/context.types.js';

export interface CompressionResult {
  readonly selectedCandidates: ContextCandidate[];
  readonly rejectedCandidates: ContextCandidate[];
  readonly rejectionReasons: Record<string, string>;
  readonly finalChars: number;
  readonly finalTokens: number;
}

export class ContextCompressorService {
  /**
   * Compresses candidates to strictly fit the allocated budget while preserving
   * essential meaning and high-priority items.
   */
  public compress(
    rankedCandidates: ContextCandidate[],
    budget: ContextBudget,
    minRelevanceThreshold = 0.40
  ): CompressionResult {
    const selected: ContextCandidate[] = [];
    const rejected: ContextCandidate[] = [];
    const rejectionReasons: Record<string, string> = {};

    let currentChars = 0;
    let currentTokens = 0;

    // Track seen contents to eliminate near-duplicate entries
    const seenContentHashes = new Set<string>();

    for (const cand of rankedCandidates) {
      const normalizedContent = cand.content.trim().toLowerCase().replace(/\s+/g, ' ');
      const contentHash = `${cand.sourceType}:${normalizedContent.slice(0, 80)}`;

      // 1. Deduplication
      if (seenContentHashes.has(contentHash)) {
        rejected.push(cand);
        rejectionReasons[cand.id] = 'duplicate_content_eliminated';
        continue;
      }

      // 2. Low-Relevance Pruning
      if (cand.relevanceScore < minRelevanceThreshold) {
        // High priority bypass: explicit user preferences, corrections, active tasks & unresolved contradictions are never dropped for low score
        const isProtected =
          cand.rankingReasons.includes('explicit_user_preference_priority') ||
          cand.rankingReasons.includes('working_memory_user_correction_priority') ||
          cand.rankingReasons.includes('working_memory_active_task_priority') ||
          cand.contradiction?.isContested;

        if (!isProtected) {
          rejected.push(cand);
          rejectionReasons[cand.id] = `below_relevance_threshold_${cand.relevanceScore.toFixed(2)}`;
          continue;
        }
      }

      // 3. Budget Checking
      const estimatedTokens = cand.tokensEstimated || Math.ceil(cand.content.length / 4);
      const candChars = cand.content.length;

      if (
        budget.maxChars > 0 &&
        currentChars + candChars > budget.maxChars &&
        selected.length >= 1
      ) {
        // High priority bypass for first occurrence of critical items
        const isCrucial =
          cand.rankingReasons.includes('explicit_user_preference_priority') ||
          cand.sourceType === 'DECISION' ||
          cand.contradiction?.isContested;

        if (!isCrucial || currentChars + candChars > budget.maxChars * 1.25) {
          rejected.push(cand);
          rejectionReasons[cand.id] = 'exceeded_context_budget';
          continue;
        }
      }

      // Candidate selected
      selected.push(cand);
      seenContentHashes.add(contentHash);
      currentChars += candChars;
      currentTokens += estimatedTokens;
    }

    budget.usedChars = currentChars;
    budget.usedTokens = currentTokens;

    return {
      selectedCandidates: selected,
      rejectedCandidates: rejected,
      rejectionReasons,
      finalChars: currentChars,
      finalTokens: currentTokens,
    };
  }
}
