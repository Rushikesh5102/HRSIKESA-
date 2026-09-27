/**
 * HṚṢĪKEŚA (हृषीकेश) — Permission & Human Approval Types
 */

import { DangerTier } from './danger.types.js';

export type PermissionDecision = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalRequest {
  readonly id: string;
  readonly toolId: string;
  readonly risk: DangerTier;
  readonly description: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly expiresAt: string;
  readonly status: ApprovalStatus;
  readonly inputSummary: Record<string, unknown>;
  readonly resolvedAt?: string;
  readonly resolvedBy?: string;
  readonly resolutionReason?: string;
}

export interface PermissionEvaluationResult {
  readonly decision: PermissionDecision;
  readonly reason: string;
  readonly riskLevel: DangerTier;
  readonly requiresApproval: boolean;
  readonly approvalRequest?: ApprovalRequest;
}

export interface IPermissionPolicy {
  /**
   * Maximum danger tier allowed to execute autonomously without interactive human approval.
   * Default: TIER_1 for development / test, TIER_0 for production unattended.
   */
  readonly maxAutonomousTier: DangerTier;

  /**
   * Allowed workspace roots. Any filesystem access outside these roots is denied.
   */
  readonly allowedWorkspaceRoots: readonly string[];

  /**
   * Allowed terminal commands (if terminal execution is enabled).
   */
  readonly allowedCommands?: readonly string[];

  /**
   * Explicitly blocked tool IDs.
   */
  readonly blockedTools?: readonly string[];
}
