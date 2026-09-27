/**
 * HṚṢĪKEŚA (हृषीकेश) — Repository Comparison Service
 *
 * Compares open-source candidate repositories across factual technical dimensions
 * with transparent criteria, evidence, and deterministic suitability scoring.
 */

import { CandidateComparisonResult, GitHubRepository, RepositoryIntelligence } from '../types/github.types.js';

export class RepositoryComparisonService {
  /**
   * Compares candidate repositories and computes transparent suitability assessment.
   */
  public static compareCandidates(
    candidates: Array<{ repository: GitHubRepository; intelligence?: RepositoryIntelligence }>
  ): CandidateComparisonResult {
    const scoredCandidates = candidates.map(({ repository, intelligence }) => {
      const suitabilityReasons: string[] = [];
      let suitabilityScore = 50; // Neutral baseline
      let securityScore = 100;

      if (intelligence) {
        // 1. License compatibility
        if (intelligence.license.compatibility === 'COMPATIBLE') {
          suitabilityScore += 25;
          suitabilityReasons.push(`Permissive license (${intelligence.license.spdx}) is fully compatible.`);
        } else if (intelligence.license.compatibility === 'CONDITIONALLY_COMPATIBLE') {
          suitabilityScore += 10;
          suitabilityReasons.push(`Weak copyleft license (${intelligence.license.spdx}) requires dynamic linking.`);
        } else if (intelligence.license.compatibility === 'INCOMPATIBLE') {
          suitabilityScore -= 40;
          suitabilityReasons.push(`Incompatible copyleft/proprietary license (${intelligence.license.spdx}).`);
        } else {
          suitabilityScore -= 20;
          suitabilityReasons.push('License unknown or unspecified; requires legal review.');
        }

        // 2. Technical compatibility
        if (intelligence.compatibility.status === 'COMPATIBLE') {
          suitabilityScore += 15;
          suitabilityReasons.push('Fully compatible with Windows host runtime.');
        } else if (intelligence.compatibility.status === 'INCOMPATIBLE') {
          suitabilityScore -= 50;
          suitabilityReasons.push(`Host incompatibility: ${intelligence.compatibility.reasons.join(', ')}`);
        }

        // 3. Maintenance and activity
        if (intelligence.activity.status === 'ACTIVE') {
          suitabilityScore += 10;
          suitabilityReasons.push(`Actively maintained (pushed ${intelligence.activity.lastPushDaysAgo} days ago).`);
        } else if (intelligence.activity.status === 'ARCHIVED') {
          suitabilityScore -= 30;
          suitabilityReasons.push('Repository is officially archived.');
        } else if (intelligence.activity.status === 'STALE_RELEASE') {
          suitabilityScore -= 15;
          suitabilityReasons.push('Stale maintenance (last push > 1 year ago).');
        }

        // 4. Resource requirements
        if (intelligence.resourceEstimate.cpu === 'HIGH' || intelligence.resourceEstimate.gpu) {
          suitabilityScore -= 10;
          suitabilityReasons.push('Demands significant compute/GPU hardware resources.');
        }
      }

      // 5. Star popularity baseline (capped at +10 to prevent star bias)
      const starBonus = Math.min(10, Math.floor(Math.log10(Math.max(1, repository.stars)) * 2));
      suitabilityScore += starBonus;
      if (starBonus > 0) {
        suitabilityReasons.push(`Community traction: ${repository.stars} stars.`);
      }

      suitabilityScore = Math.max(0, Math.min(100, suitabilityScore));

      return {
        repository,
        intelligence,
        securityScore,
        suitabilityScore,
        suitabilityReasons,
      };
    });

    // Sort descending by suitability score
    scoredCandidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    const winner = scoredCandidates.length > 0 ? scoredCandidates[0].repository.id : undefined;

    return {
      candidates: scoredCandidates,
      winnerRepositoryId: winner,
      criteriaUsed: [
        'License compatibility (MIT/Apache +25, Copyleft -40, Unknown -20)',
        'Host platform runtime compatibility (+15 / -50)',
        'Maintenance activity recency (+10 / -30)',
        'Hardware resource demands (-10 for high CPU/GPU)',
        'Logarithmic star count bonus (max +10)',
      ],
      evidenceSummary: scoredCandidates.map((c) =>
        `${c.repository.fullName} [Score: ${c.suitabilityScore}]: ${c.suitabilityReasons.join(' ')}`
      ).join('\n\n'),
    };
  }
}
