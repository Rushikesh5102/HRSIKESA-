/**
 * HṚṢĪKEŚA (हृषीकेश) — Trust Levels & Protection Tiers
 *
 * Implements strict, immutable protection tiers for autonomous self-development.
 *
 * TIER 0 — IMMUTABLE SAFETY CORE:
 * The autonomous evolution engine cannot autonomously modify:
 * - emergency-stop mechanism
 * - supervisor control
 * - permission enforcement
 * - credential isolation
 * - filesystem boundary enforcement
 * - network boundary enforcement
 * - audit integrity
 * - production promotion controls
 * - trust roots
 * - human authority controls
 *
 * TIER 1 — PROTECTED CORE:
 * Core kernel, runtime and orchestration changes require stronger verification
 * and promotion controls.
 *
 * TIER 2 — NORMAL APPLICATION CODE:
 * Autonomous modification is allowed strictly inside the isolated experiment worktree.
 *
 * TIER 3 — EXPERIMENT CODE:
 * Full autonomous experimentation is allowed.
 *
 * RULE: Never weaken a higher protection tier merely to make an experiment succeed.
 */

import path from 'node:path';
import { ProtectionTier } from '../types/evolution.types.js';

export class TrustTierManager {
  // Regex or path fragments representing Tier 0 Immutable Safety Core
  private readonly tier0Patterns: RegExp[] = [
    /safety-controller/i,
    /emergency[-_]?stop/i,
    /permission\.manager/i,
    /boundary-guard/i,
    /trust-tiers/i,
    /supervisor\.gateway/i,
    /supervisors[/\\]/i,
    /evaluators[/\\](?:antigravity|jules|spark)/i,
    /tool[-_.]?audit/i,
    /accounts[/\\](?:vault|credentials|secrets)/i,
    /\.env/i,
    /migration\.manager/i,
    /001_initial_schema/i,
  ];

  // Regex or path fragments representing Tier 1 Protected Core
  private readonly tier1Patterns: RegExp[] = [
    /src[/\\]runtime[/\\]kernel\.ts/i,
    /src[/\\]runtime[/\\]lifecycle\.ts/i,
    /src[/\\]core[/\\]events[/\\]event-bus\.ts/i,
    /src[/\\]core[/\\]hardware[/\\]resource\.governor\.ts/i,
    /src[/\\]persistence[/\\]database[/\\]database\.manager\.ts/i,
    /src[/\\]tools[/\\]execution[/\\]tool\.bus\.ts/i,
  ];

  /**
   * Determine the protection tier of a given file path.
   */
  public getFileTier(filePath: string): ProtectionTier {
    const normalized = path.normalize(filePath).replace(/\\/g, '/');

    // Check Tier 0
    for (const pattern of this.tier0Patterns) {
      if (pattern.test(normalized)) {
        return ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE;
      }
    }

    // Check Tier 1
    for (const pattern of this.tier1Patterns) {
      if (pattern.test(normalized)) {
        return ProtectionTier.TIER_1_PROTECTED_CORE;
      }
    }

    // Check Tier 3 (Experiment code / temporary fixtures)
    if (normalized.includes('evolution/experiments/') || normalized.includes('fixtures/')) {
      return ProtectionTier.TIER_3_EXPERIMENT_CODE;
    }

    // Default to Tier 2 (Normal application code)
    return ProtectionTier.TIER_2_NORMAL_APPLICATION;
  }

  /**
   * Validate whether an autonomous modification to this file is permitted.
   */
  public validateModification(
    filePath: string,
    isHumanPromoting = false
  ): { allowed: boolean; tier: ProtectionTier; reason: string } {
    const tier = this.getFileTier(filePath);

    if (tier === ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE) {
      return {
        allowed: false,
        tier,
        reason: `CRITICAL SAFETY VIOLATION: Path '${filePath}' is classified as TIER 0 (IMMUTABLE SAFETY CORE). Autonomous evolution worker is strictly prohibited from modifying safety and governance infrastructure.`,
      };
    }

    if (tier === ProtectionTier.TIER_1_PROTECTED_CORE && !isHumanPromoting) {
      // Allowed inside experiment worktree for experimentation, but flagged for sovereign promotion gate
      return {
        allowed: true,
        tier,
        reason: `TIER 1 (PROTECTED CORE): Modification permitted in isolated experiment worktree, but requires mandatory strict verification and sovereign human promotion gate.`,
      };
    }

    return {
      allowed: true,
      tier,
      reason: `TIER ${tier}: Modification permitted inside isolated development workspace.`,
    };
  }
}
