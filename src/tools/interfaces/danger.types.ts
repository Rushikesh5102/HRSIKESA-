/**
 * HṚṢĪKEŚA (हृषीकेश) — Danger Tiers & Security Classification
 * 
 * Statically categorizes all system operations and tool actions
 * into five standardized danger tiers per docs/SECURITY.md.
 */

export enum DangerTier {
  /**
   * Tier 0: Pure Read-Only / Harmless
   * Reading source code, memory lookup, inspecting system specs, querying model lists.
   * Authorization: Autonomous execution; logged in session history.
   */
  TIER_0 = 0,

  /**
   * Tier 1: Low-Impact Reversible Action
   * Writing to temporary scratchpad, formatting test code, read-only shell commands, bounded model chats.
   * Authorization: Autonomous execution within project scope; logged in audit ledger.
   */
  TIER_1 = 1,

  /**
   * Tier 2: Project State Modification / External Side Effect
   * Creating/editing project files, package installation, network mutation.
   * Authorization: Autonomous within active project scope; requires prompt if outside scope.
   */
  TIER_2 = 2,

  /**
   * Tier 3: Sensitive / Dangerous Action
   * File deletion, elevated commands, installing system packages, modifying configs.
   * Authorization: Mandatory Interactive Human Approval Gate.
   */
  TIER_3 = 3,

  /**
   * Tier 4: Critical & Irreversible Action
   * Pushing to remote repositories, deleting root directories, exposing network ports, modifying credentials.
   * Authorization: Explicit Interactive Confirmation with Visual Diff / Summary.
   */
  TIER_4 = 4
}

export type DangerTierName = 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';

export const DANGER_TIER_NAMES: Record<DangerTier, DangerTierName> = {
  [DangerTier.TIER_0]: 'TIER_0',
  [DangerTier.TIER_1]: 'TIER_1',
  [DangerTier.TIER_2]: 'TIER_2',
  [DangerTier.TIER_3]: 'TIER_3',
  [DangerTier.TIER_4]: 'TIER_4'
};

export const DANGER_TIER_DESCRIPTIONS: Record<DangerTier, string> = {
  [DangerTier.TIER_0]: 'Read-only / harmless inspection and queries',
  [DangerTier.TIER_1]: 'Local reversible action within workspace',
  [DangerTier.TIER_2]: 'Project modification or external side-effect',
  [DangerTier.TIER_3]: 'Sensitive/dangerous action (requires human approval gate)',
  [DangerTier.TIER_4]: 'Critical/destructive action (requires explicit interactive confirmation)'
};

/**
 * Returns true if the tier requires explicit human approval before execution.
 */
export function requiresHumanApproval(tier: DangerTier): boolean {
  return tier >= DangerTier.TIER_3;
}
