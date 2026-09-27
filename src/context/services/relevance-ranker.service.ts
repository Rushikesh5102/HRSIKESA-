/**
 * HṚṢĪKEŚA (हृषीकेश) — Relevance Ranker Service
 *
 * Track A / INT-007: Cognitive Context Engine
 * Transparent, multi-factor relevance ranking engine with explainable ranking reasons.
 */

import { ContextCandidate, ContextRequest } from '../interfaces/context.types.js';
import { ClassificationResult } from './request-classifier.service.js';
import { ResolvedScope } from './scope-resolver.service.js';

export class RelevanceRankerService {
  /**
   * Ranks candidates based on query relevance, scope alignment, intent matching,
   * provenance tier, and temporal fitness.
   */
  public rank(
    candidates: ContextCandidate[],
    request: ContextRequest,
    classification: ClassificationResult,
    scope: ResolvedScope
  ): ContextCandidate[] {
    const rawQuery = (request.userMessage || '').toLowerCase();
    const queryTokens = new Set(
      rawQuery
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3)
    );

    const scored = candidates.map(cand => {
      let score = 0.40; // baseline candidate score
      const reasons: string[] = [];

      // 1. User Preference Priority (Section 17: Explicit user preferences receive top priority)
      if (
        cand.provenance === 'EXPLICIT' &&
        (cand.rankingReasons.includes('explicit_user_preference') ||
         cand.rankingReasons.includes('creator_authority_directive') ||
         cand.title?.toLowerCase().includes('user preference'))
      ) {
        score += 0.30;
        reasons.push('explicit_user_preference_priority');
      }

      // 1b. Working Memory Priority (Track A / INT-008: Explicit user corrections, active task, blockers)
      if (cand.sourceType === 'WORKING_MEMORY') {
        if (cand.rankingReasons.includes('explicit_user_correction_priority')) {
          score += 0.40;
          reasons.push('working_memory_user_correction_priority');
        } else if (cand.rankingReasons.includes('active_task_blocker_priority')) {
          score += 0.35;
          reasons.push('working_memory_active_task_priority');
        } else if (cand.rankingReasons.includes('active_project_company_continuity')) {
          score += 0.30;
          reasons.push('working_memory_project_continuity_priority');
        } else {
          score += 0.25;
          reasons.push('working_memory_continuity_boost');
        }
      }

      // 2. Intent-to-Source Alignment
      if (
        classification.intent === 'DECISION_QUERY' &&
        cand.sourceType === 'DECISION'
      ) {
        score += 0.25;
        reasons.push('intent_decision_match');
      } else if (
        classification.intent === 'RESEARCH_QUERY' &&
        cand.sourceType === 'RESEARCH_EVIDENCE'
      ) {
        score += 0.25;
        reasons.push('intent_research_match');
      } else if (
        classification.intent === 'IDENTITY' &&
        cand.scope === 'CREATOR'
      ) {
        score += 0.25;
        reasons.push('intent_identity_match');
      }

      // 3. Scope Matching (Section 6 & 19: Boundary Isolation)
      if (cand.scope === scope.primaryScope) {
        score += 0.20;
        reasons.push(`primary_scope_match_${scope.primaryScope}`);
      } else if (scope.allowedScopes.includes(cand.scope)) {
        score += 0.10;
        reasons.push(`allowed_scope_match_${cand.scope}`);
      } else if (scope.boundaryEnforced) {
        // Heavy penalty if boundary is enforced and scope does not match
        score -= 0.50;
        reasons.push(`scope_boundary_penalty_${cand.scope}`);
      }

      // 4. Exact Entity Match
      for (const ent of classification.extractedEntities) {
        if (
          cand.content.toLowerCase().includes(ent.toLowerCase()) ||
          cand.title?.toLowerCase().includes(ent.toLowerCase())
        ) {
          score += 0.15;
          reasons.push(`entity_match_${ent}`);
          break;
        }
      }

      // 5. Keyword Overlap
      const candTokens = cand.content.toLowerCase().split(/\s+/);
      let matchCount = 0;
      for (const token of candTokens) {
        if (queryTokens.has(token)) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        const boost = Math.min(0.20, matchCount * 0.04);
        score += boost;
        reasons.push(`keyword_overlap_${matchCount}`);
      }

      // 6. Provenance Quality Weighting (Section 14: EXPLICIT > SYSTEM/RESEARCH > DERIVED > INFERRED)
      if (cand.provenance === 'EXPLICIT') {
        score += 0.10;
        reasons.push('provenance_explicit');
      } else if (cand.provenance === 'RESEARCH' || cand.provenance === 'SYSTEM') {
        score += 0.08;
        reasons.push(`provenance_${cand.provenance.toLowerCase()}`);
      } else if (cand.provenance === 'DERIVED') {
        score += 0.04;
        reasons.push('provenance_derived');
      } else if (cand.provenance === 'INFERRED') {
        score -= 0.05; // weak inference penalized
        reasons.push('provenance_weak_inference');
      }

      // 7. Temporal Alignment (Section 12)
      if (classification.temporalScope === 'CURRENT') {
        if (cand.temporal?.isCurrent) {
          score += 0.08;
          reasons.push('current_fact_match');
        } else if (cand.temporal && !cand.temporal.isCurrent) {
          score -= 0.15; // demote historical facts when user asks for current
          reasons.push('demoted_historical_fact');
        }
      } else if (
        classification.temporalScope === 'HISTORICAL' ||
        classification.temporalScope === 'BEFORE' ||
        classification.temporalScope === 'AFTER'
      ) {
        if (cand.temporal && !cand.temporal.isCurrent) {
          score += 0.20; // promote historical facts when user asks about previous state
          reasons.push('historical_fact_match');
        }
      }

      // 8. Contradiction Flag Boost (Section 13: Must preserve disputed facts for transparency)
      if (cand.contradiction?.isContested) {
        score += 0.10;
        reasons.push('contested_fact_preservation');
      }

      // Confidence factor
      const finalScore = Number(Math.max(0.01, Math.min(1.0, score * cand.confidence)).toFixed(3));

      return {
        ...cand,
        relevanceScore: finalScore,
        rankingReasons: Array.from(new Set([...cand.rankingReasons, ...reasons])),
      };
    });

    // Sort descending by relevance score
    return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
