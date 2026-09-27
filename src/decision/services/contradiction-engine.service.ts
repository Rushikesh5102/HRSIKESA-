/**
 * HṚṢĪKEŚA (हृषीकेश) — Contradiction & Temporal Intelligence Engine
 *
 * FP-18: Identifies conflicting claims across sources, correlates temporal
 * freshness, analyzes conditioning factors (version, quantization, OS), and preserves uncertainty.
 */

import {
  StructuredClaim,
  ContradictionAnalysis,
  UncertaintyLevel,
} from '../interfaces/decision.types.js';

export class ContradictionEngineService {
  /**
   * Analyzes a collection of structured claims for contradictions, discrepancies, and temporal staleness.
   */
  public analyzeClaims(
    caseId: string,
    claims: StructuredClaim[]
  ): {
    contradictions: ContradictionAnalysis[];
    annotatedClaims: StructuredClaim[];
  } {
    const contradictions: ContradictionAnalysis[] = [];
    const annotatedClaims = claims.map((c) => ({ ...c }));

    // 1. Temporal Staleness Check
    const currentYear = new Date().getFullYear();
    for (const claim of annotatedClaims) {
      if (claim.publishedAt) {
        const pubYear = new Date(claim.publishedAt).getFullYear();
        if (currentYear - pubYear >= 2) {
          claim.uncertainty = UncertaintyLevel.OUTDATED;
          claim.caveats = claim.caveats || [];
          claim.caveats.push(`Claim published in ${pubYear} may not reflect current software releases.`);
        }
      }
    }

    // 2. Pairwise Contradiction Detection
    for (let i = 0; i < annotatedClaims.length; i++) {
      for (let j = i + 1; j < annotatedClaims.length; j++) {
        const a = annotatedClaims[i];
        const b = annotatedClaims[j];

        // Check if claims discuss the same subject & predicate with conflicting objects
        if (this.isConflictingSubject(a, b)) {
          const conflict = this.evaluateConflict(caseId, a, b);
          if (conflict) {
            contradictions.push(conflict);
            a.uncertainty = UncertaintyLevel.CONTRADICTED;
            b.uncertainty = UncertaintyLevel.CONTRADICTED;
          }
        }
      }
    }

    return { contradictions, annotatedClaims };
  }

  private isConflictingSubject(a: StructuredClaim, b: StructuredClaim): boolean {
    const norm = (s: string) => s.toLowerCase().trim();
    if (norm(a.subject) !== norm(b.subject)) {
      // Check partial match (e.g. "sd.cpp" vs "stable-diffusion.cpp")
      if (!norm(a.subject).includes(norm(b.subject)) && !norm(b.subject).includes(norm(a.subject))) {
        return false;
      }
    }

    // Check predicate conflict
    const predA = norm(a.predicate);
    const predB = norm(b.predicate);
    if (predA === predB) return true;

    if (
      (predA.includes('vram') || predA.includes('ram') || predA.includes('memory')) &&
      (predB.includes('vram') || predB.includes('ram') || predB.includes('memory'))
    ) {
      return true;
    }

    return false;
  }

  private evaluateConflict(
    caseId: string,
    a: StructuredClaim,
    b: StructuredClaim
  ): ContradictionAnalysis | null {
    const textA = a.object.toLowerCase();
    const textB = b.object.toLowerCase();

    // Check if objects directly contradict
    if (textA === textB) return null; // agreement

    // Factor detection
    const versionDiff = Boolean(a.version && b.version && a.version !== b.version);
    const hasQuantA = (textA.includes('quant') || a.quote.toLowerCase().includes('quant') || a.quote.toLowerCase().includes('q4')) &&
      !textA.includes('unquant') && !a.quote.toLowerCase().includes('unquant');
    const hasQuantB = (textB.includes('quant') || b.quote.toLowerCase().includes('quant') || b.quote.toLowerCase().includes('q4')) &&
      !textB.includes('unquant') && !b.quote.toLowerCase().includes('unquant');
    const quantDiff = hasQuantA !== hasQuantB;
    const osDiff =
      (textA.includes('windows') || textA.includes('linux')) &&
      (textB.includes('windows') || textB.includes('linux')) &&
      textA !== textB;
    const temporalDiff = a.uncertainty === UncertaintyLevel.OUTDATED || b.uncertainty === UncertaintyLevel.OUTDATED;

    let resolutionHypothesis = 'Discrepancy observed between reported specifications.';
    if (quantDiff) {
      resolutionHypothesis =
        'Difference likely explained by model quantization (unquantized FP16 vs quantized INT4/Q4 weights).';
    } else if (versionDiff) {
      resolutionHypothesis = `Difference correlated with software versions (${a.version || 'unknown'} vs ${b.version || 'unknown'}).`;
    } else if (temporalDiff) {
      resolutionHypothesis = 'Older benchmark superseded by more recent software optimizations.';
    }

    return {
      id: `contra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId,
      claimA: a,
      claimB: b,
      topic: `${a.subject} — ${a.predicate}`,
      natureOfConflict: `Source [${a.sourceTitle}] reports "${a.object}" while Source [${b.sourceTitle}] reports "${b.object}".`,
      resolutionHypothesis,
      factors: {
        versionDifference: versionDiff,
        quantizationDifference: quantDiff,
        osDifference: osDiff,
        temporalDifference: temporalDiff,
      },
      requiresUserReview: !quantDiff && !temporalDiff && !versionDiff,
      resolved: quantDiff || temporalDiff || versionDiff,
    };
  }
}
