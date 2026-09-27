/**
 * HṚṢĪKEŚA (हृषीकेश) — Deterministic Capability Matcher
 *
 * FP-07: Fast (<10ms) deterministic capability matching from intent, query,
 * category, and required operations without unnecessary LLM overhead.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { UniversalCapability, PrivacyClass } from '../fabric/capability.types.js';

export interface MatchContext {
  readonly privacyClass?: PrivacyClass;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly environment?: string;
}

export interface MatchResult {
  readonly capability?: UniversalCapability;
  readonly confidence: number;
  readonly rationale: string;
  readonly alternativeCandidates: Array<{ id: string; name: string; score: number }>;
}

export class CapabilityMatcher {
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('CapabilityMatcher');
  }

  /**
   * Deterministically match an intent string against available capabilities.
   */
  public match(
    intent: string,
    candidates: UniversalCapability[],
    context?: MatchContext
  ): MatchResult {
    this.logger?.debug(`Matching intent: "${intent}" across ${candidates.length} candidates`);
    const startTime = Date.now();
    const cleanIntent = intent.trim().toLowerCase();

    // 1. Direct ID match
    const direct = candidates.find((c) => c.id.toLowerCase() === cleanIntent);
    if (direct) {
      return {
        capability: direct,
        confidence: 1.0,
        rationale: `Exact identifier match for '${direct.id}' in ${Date.now() - startTime}ms.`,
        alternativeCandidates: [],
      };
    }

    // 2. Filter out disabled/revoked capabilities and privacy violations
    const activeCandidates = candidates.filter((c) => {
      if (!c.enabled) return false;
      if (c.status === 'REVOKED' || c.status === 'DISABLED' || c.status === 'REMOVED') return false;
      if (context?.privacyClass === 'SOVEREIGN_LOCAL' && (c.protocol === 'REST' || c.privacyClass === 'PUBLIC')) {
        return false;
      }
      return true;
    });

    // 3. Keyword / Token Frequency Scoring
    const intentTokens = cleanIntent
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = activeCandidates.map((cap) => {
      let score = 0;
      const capIdLower = cap.id.toLowerCase();
      const capNameLower = cap.name.toLowerCase();
      const capDescLower = cap.description.toLowerCase();
      const capCatLower = cap.category.toLowerCase();

      // Check operation keywords
      for (const op of cap.supportedOperations) {
        if (cleanIntent.includes(op.toLowerCase())) {
          score += 4.0;
        }
      }

      // Check tokens
      for (const token of intentTokens) {
        if (capIdLower.includes(token)) score += 3.0;
        if (capNameLower.includes(token)) score += 2.5;
        if (capCatLower === token) score += 2.0;
        if (capDescLower.includes(token)) score += 1.0;
      }

      // Domain-specific keyword heuristics
      if (cleanIntent.includes('git') && capIdLower.includes('git')) score += 5.0;
      if (cleanIntent.includes('node') && capIdLower.includes('node')) score += 5.0;
      if (cleanIntent.includes('browse') || cleanIntent.includes('navigate') || cleanIntent.includes('url')) {
        if (cap.category === 'BROWSER') score += 4.0;
      }
      if (cleanIntent.includes('software') || cleanIntent.includes('installed') || cleanIntent.includes('application')) {
        if (cap.category === 'SOFTWARE') score += 4.0;
      }
      if (cleanIntent.includes('file') || cleanIntent.includes('read') || cleanIntent.includes('directory')) {
        if (cap.category === 'FILESYSTEM') score += 3.5;
      }

      return { cap, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];
    if (top && top.score > 2.0) {
      const confidence = Math.min(top.score / 10.0, 1.0);
      return {
        capability: top.cap,
        confidence,
        rationale: `Matched capability '${top.cap.id}' with score ${top.score.toFixed(2)} in ${Date.now() - startTime}ms.`,
        alternativeCandidates: scored.slice(1, 4).map((s) => ({
          id: s.cap.id,
          name: s.cap.name,
          score: s.score,
        })),
      };
    }

    return {
      confidence: 0,
      rationale: `No matching capability found for intent '${intent}' with sufficient confidence.`,
      alternativeCandidates: scored.slice(0, 3).map((s) => ({
        id: s.cap.id,
        name: s.cap.name,
        score: s.score,
      })),
    };
  }
}
