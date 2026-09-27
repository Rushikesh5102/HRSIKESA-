/**
 * HṚṢĪKEŚA (हृषीकेश) — Tool Audit Types
 */

import { DangerTier } from './danger.types.js';
import { PermissionDecision } from './permission.types.js';

export type ToolExecutionStatus = 'success' | 'failed' | 'denied' | 'pending_approval';

export interface ToolAuditRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly requestId: string;
  readonly sessionId?: string;
  readonly toolId: string;
  readonly inputSummary: Record<string, unknown>;
  readonly riskLevel: DangerTier;
  readonly permissionDecision: PermissionDecision;
  readonly approvalId?: string;
  readonly executionStatus: ToolExecutionStatus;
  readonly durationMs: number;
  readonly errorSummary?: string;
  readonly userId: string;
}
