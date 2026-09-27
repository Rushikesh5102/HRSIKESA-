/**
 * HṚṢĪKEŚA (हृषीकेश) — Conflict Resolver Service
 *
 * Track A / INT-007: Cognitive Context Engine
 * Detects contradictory context items and represents them transparently
 * without silent dropping or premature resolution.
 */

import { ContextCandidate } from '../interfaces/context.types.js';

export interface ConflictResolutionResult {
  readonly processedCandidates: ContextCandidate[];
  readonly detectedConflictsCount: number;
}

export class ConflictResolverService {
  /**
   * Identifies contradictory candidates and ensures both conflicting viewpoints
   * are explicitly marked and formatted rather than silently discarded.
   */
  public resolveConflicts(candidates: ContextCandidate[]): ConflictResolutionResult {
    let conflictsCount = 0;
    const candidateMap = new Map<string, ContextCandidate>();
    for (const c of candidates) {
      candidateMap.set(c.id, c);
      if (c.sourceId) candidateMap.set(c.sourceId, c);
    }

    const processed = candidates.map(cand => {
      // 1. Explicitly tagged contradiction
      if (cand.contradiction?.isContested) {
        conflictsCount++;
        const otherCand = cand.contradiction.conflictingCandidateId
          ? candidateMap.get(cand.contradiction.conflictingCandidateId)
          : undefined;

        const reason = cand.contradiction.conflictReason || 'Conflicting claims found across authoritative sources.';
        const modifiedContent = `[CONTESTED INFORMATION / UNRESOLVED]:\n- Primary Claim: ${cand.content}\n${otherCand ? `- Opposing Claim: ${otherCand.content}\n` : ''}- Reason: ${reason}`;

        return {
          ...cand,
          content: modifiedContent,
          relevanceScore: Math.min(1.0, cand.relevanceScore + 0.05), // Retain high priority for contested facts
        };
      }

      return cand;
    });

    return {
      processedCandidates: processed,
      detectedConflictsCount: conflictsCount,
    };
  }
}
