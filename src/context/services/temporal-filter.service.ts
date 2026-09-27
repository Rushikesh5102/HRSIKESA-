/**
 * HṚṢĪKEŚA (हृषीकेश) — Temporal Filter Service
 *
 * Track A / INT-007: Cognitive Context Engine
 * Applies temporal reasoning, fact versioning awareness, and historical filtering.
 */

import { ContextCandidate, TemporalIntent } from '../interfaces/context.types.js';

export class TemporalFilterService {
  /**
   * Filters and labels candidates based on temporal scope.
   */
  public filter(
    candidates: ContextCandidate[],
    temporalScope: TemporalIntent = 'CURRENT',
    referenceTime?: string
  ): ContextCandidate[] {
    const refDate = referenceTime ? new Date(referenceTime).getTime() : Date.now();

    return candidates.filter(cand => {
      // Non-temporal items (skills, directives, conversation) pass through
      if (!cand.temporal) {
        return true;
      }

      const { isCurrent, validFrom, validUntil } = cand.temporal;
      const fromMs = validFrom ? new Date(validFrom).getTime() : undefined;
      const untilMs = validUntil ? new Date(validUntil).getTime() : undefined;

      switch (temporalScope) {
        case 'CURRENT':
          // For current query, keep current facts. If fact is superseded (validUntil set), drop it.
          if (untilMs !== undefined && untilMs <= refDate) {
            return false;
          }
          return isCurrent || untilMs === undefined;

        case 'HISTORICAL':
          // Keep all versions, including superseded ones
          return true;

        case 'BEFORE':
          // Keep facts valid strictly before reference date
          if (fromMs !== undefined && fromMs >= refDate) {
            return false;
          }
          return true;

        case 'AFTER':
          // Keep facts valid on or after reference date
          if (untilMs !== undefined && untilMs < refDate) {
            return false;
          }
          return true;

        case 'AT_TIME':
          // Keep facts that were valid at the specific point in time
          if (fromMs !== undefined && fromMs > refDate) return false;
          if (untilMs !== undefined && untilMs < refDate) return false;
          return true;

        case 'ALL':
        default:
          return true;
      }
    });
  }
}
