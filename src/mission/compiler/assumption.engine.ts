/**
 * HṚṢĪKEŚA (हृषीकेश) — Assumption Engine
 *
 * FP-14: Analyzes high-level objectives, identifies non-critical missing
 * parameters, establishes sensible safe defaults, and records explicit assumptions.
 */

import { MissionAssumption, MissionConstraint } from '../types/mission.types.js';

export class AssumptionEngine {
  public extractAssumptions(
    objective: string,
    constraints: MissionConstraint[] = []
  ): MissionAssumption[] {
    const assumptions: MissionAssumption[] = [];
    const normalized = objective.toLowerCase();
    const now = new Date().toISOString();

    // 1. Environment assumption
    const hasEnvConstraint = constraints.some((c) => c.type === 'ALLOWED_ENVIRONMENTS');
    if (!hasEnvConstraint) {
      if (normalized.includes('website') || normalized.includes('app') || normalized.includes('code') || normalized.includes('portfolio')) {
        assumptions.push({
          id: `asmp_${Date.now()}_env`,
          assumption: 'Use local development workspace environment with standard Node.js/TypeScript stack',
          reason: 'No explicit cloud/VDI environment specified; local development is safest and default',
          confidence: 0.95,
          affectedOutcomeIds: [],
          createdAt: now,
          isStillValid: true,
        });
      }
    }

    // 2. Responsive UI design assumption
    if (normalized.includes('website') || normalized.includes('ui') || normalized.includes('dashboard') || normalized.includes('frontend')) {
      assumptions.push({
        id: `asmp_${Date.now()}_ui`,
        assumption: 'Target modern responsive design layout with dark celestial/temple stone theme',
        reason: 'HṚṢĪKEŚA standard design system and modern cross-device usability standard',
        confidence: 0.9,
        affectedOutcomeIds: [],
        createdAt: now,
        isStillValid: true,
      });
    }

    // 3. Testing & Verification assumption
    if (normalized.includes('build') || normalized.includes('implement') || normalized.includes('fix') || normalized.includes('develop')) {
      assumptions.push({
        id: `asmp_${Date.now()}_qa`,
        assumption: 'Enforce independent verification by Vighna with 100% automated test pass requirement',
        reason: 'Sovereign system quality gate: no completion without verified evidence',
        confidence: 1.0,
        affectedOutcomeIds: [],
        createdAt: now,
        isStillValid: true,
      });
    }

    // 4. Privacy assumption
    const hasPrivacyConstraint = constraints.some((c) => c.type === 'PRIVACY_LEVEL');
    if (!hasPrivacyConstraint) {
      assumptions.push({
        id: `asmp_${Date.now()}_priv`,
        assumption: 'Operate within PRIVATE sovereign context without leaking data to unauthorized external endpoints',
        reason: 'Default data protection boundary for personal and company tasks',
        confidence: 0.98,
        affectedOutcomeIds: [],
        createdAt: now,
        isStillValid: true,
      });
    }

    return assumptions;
  }

  public static extractSafeAssumptions(
    objective: string,
    constraints: MissionConstraint[] = []
  ): MissionAssumption[] {
    return new AssumptionEngine().extractAssumptions(objective, constraints);
  }
}
