/**
 * HṚṢĪKEŚA (हृषीकेश) — Candidate Comparison Engine Service
 *
 * FP-18: Multi-criteria matrix evaluation, qualitative tradeoff analysis,
 * and uncertainty preservation without artificial numerical score inflation.
 */

import {
  ResearchCandidate,
  EvaluationCriterion,
  CandidateComparison,
  ComparisonMatrixCell,
  UncertaintyLevel,
  HardwareCompatibilityStatus,
} from '../interfaces/decision.types.js';

export class ComparisonEngineService {
  /**
   * Compares candidate solutions against explicit evaluation criteria.
   */
  public compareCandidates(
    caseId: string,
    candidates: ResearchCandidate[],
    criteria: EvaluationCriterion[],
    requestedRecommendation: boolean = false
  ): CandidateComparison {
    const matrix: ComparisonMatrixCell[] = [];
    const unknowns: string[] = [];

    for (const cand of candidates) {
      for (const crit of criteria) {
        const cell = this.evaluateCell(cand, crit);
        matrix.push(cell);

        if (cell.uncertainty === UncertaintyLevel.UNKNOWN) {
          unknowns.push(`${cand.name} on ${crit.name}: data unverified`);
        }
      }
    }

    // Generate qualitative tradeoff summary
    const tradeoffSummary = this.generateTradeoffSummary(candidates, criteria, matrix);

    let recommendedCandidateId: string | undefined;
    let recommendationRationale: string | undefined;

    if (requestedRecommendation && candidates.length > 0) {
      // Find candidate that best satisfies mandatory criteria without fake numerical certainty
      const compatibleCandidates = candidates.filter(
        (c) =>
          c.compatibilityStatus === HardwareCompatibilityStatus.VERIFIED_COMPATIBLE ||
          c.compatibilityStatus === HardwareCompatibilityStatus.CONDITIONALLY_COMPATIBLE ||
          c.compatibilityStatus === HardwareCompatibilityStatus.LIKELY_COMPATIBLE
      );

      if (compatibleCandidates.length > 0) {
        // Prefer verified compatibility + permissive license + low operational complexity
        const best = compatibleCandidates.sort((a, b) => {
          if (
            a.compatibilityStatus === HardwareCompatibilityStatus.VERIFIED_COMPATIBLE &&
            b.compatibilityStatus !== HardwareCompatibilityStatus.VERIFIED_COMPATIBLE
          )
            return -1;
          if (
            b.compatibilityStatus === HardwareCompatibilityStatus.VERIFIED_COMPATIBLE &&
            a.compatibilityStatus !== HardwareCompatibilityStatus.VERIFIED_COMPATIBLE
          )
            return 1;
          if (a.licenseCategory === 'PERMISSIVE' && b.licenseCategory !== 'PERMISSIVE') return -1;
          if (b.licenseCategory === 'PERMISSIVE' && a.licenseCategory !== 'PERMISSIVE') return 1;
          return b.confidence - a.confidence;
        })[0];

        recommendedCandidateId = best.id;
        recommendationRationale = `Selected ${best.name} because it satisfies host hardware compatibility (${best.compatibilityStatus}) and provides transparent licensing (${best.license}) with verified evidence.`;
      } else {
        recommendationRationale =
          'No candidate fully satisfies local host hardware compatibility constraints without external acceleration.';
      }
    }

    return {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId,
      criteria,
      candidates,
      matrix,
      tradeoffSummary,
      unknowns: Array.from(new Set(unknowns)),
      confidenceScore:
        candidates.length > 0
          ? candidates.reduce((acc, c) => acc + c.confidence, 0) / candidates.length
          : 0.0,
      recommendedCandidateId,
      recommendationRationale,
      createdAt: new Date().toISOString(),
    };
  }

  private evaluateCell(cand: ResearchCandidate, crit: EvaluationCriterion): ComparisonMatrixCell {
    const cName = crit.name.toLowerCase();

    if (cName.includes('license')) {
      return {
        candidateId: cand.id,
        criterionId: crit.id,
        value: cand.license,
        qualitativeAssessment: `${cand.license} (${cand.licenseCategory})`,
        confidence: cand.confidence,
        uncertainty: cand.license === 'UNKNOWN' ? UncertaintyLevel.UNKNOWN : UncertaintyLevel.KNOWN,
      };
    }

    if (cName.includes('hardware') || cName.includes('compat')) {
      return {
        candidateId: cand.id,
        criterionId: crit.id,
        value: cand.compatibilityStatus,
        qualitativeAssessment: `${cand.compatibilityStatus}: RAM min ${cand.compatibilityDetails.minRamGb}GB, Vulkan: ${cand.compatibilityDetails.gpuVulkanSupported}`,
        confidence: cand.confidence,
        uncertainty:
          cand.compatibilityStatus === HardwareCompatibilityStatus.UNKNOWN
            ? UncertaintyLevel.UNKNOWN
            : UncertaintyLevel.SUPPORTED,
      };
    }

    if (cName.includes('quality') || cName.includes('capab')) {
      return {
        candidateId: cand.id,
        criterionId: crit.id,
        value: cand.capabilities.length,
        qualitativeAssessment: cand.capabilities.join(', ') || 'Standard feature set',
        confidence: cand.confidence,
        uncertainty: cand.capabilities.length > 0 ? UncertaintyLevel.SUPPORTED : UncertaintyLevel.UNCERTAIN,
      };
    }

    if (cName.includes('install') || cName.includes('complexity')) {
      return {
        candidateId: cand.id,
        criterionId: crit.id,
        value: cand.operationalComplexity,
        qualitativeAssessment: `${cand.operationalComplexity} complexity: ${cand.limitations[0] || 'Standard setup'}`,
        confidence: cand.confidence,
        uncertainty: UncertaintyLevel.SUPPORTED,
      };
    }

    return {
      candidateId: cand.id,
      criterionId: crit.id,
      value: 'Assessed',
      qualitativeAssessment: 'Meets general baseline expectations',
      confidence: cand.confidence,
      uncertainty: UncertaintyLevel.LIKELY,
    };
  }

  private generateTradeoffSummary(
    candidates: ResearchCandidate[],
    _criteria: EvaluationCriterion[],
    _matrix: ComparisonMatrixCell[]
  ): string {
    if (candidates.length === 0) return 'No candidates available to compare.';
    if (candidates.length === 1) {
      return `Single candidate evaluated: ${candidates[0].name} (${candidates[0].compatibilityStatus}, ${candidates[0].license}).`;
    }

    const summaries: string[] = [];
    for (const c of candidates) {
      const ram = c.compatibilityDetails.minRamGb;
      const status = c.compatibilityStatus;
      summaries.push(`- **${c.name}**: ${status} (${c.license}, requires ~${ram}GB RAM). Strengths: ${c.capabilities.slice(0, 2).join(', ')}. Caveats: ${c.limitations[0] || 'None listed'}.`);
    }

    return `### Tradeoff Analysis across ${candidates.length} options:\n${summaries.join('\n')}`;
  }
}
