/**
 * HṚṢĪKEŚA (हृषीकेश) — Operator Action, Precondition, Target & Verification Types
 *
 * FP-13: Structured actions, target resolution with confidence assessment,
 * precondition checks, and empirical post-action verification.
 */

import type { ObservationConfidence, ObservationLayer } from './observation.types.js';
export type { ObservationConfidence, ObservationLayer };

export type ActionRiskLevel =
  | 'TIER_0_OBSERVE'
  | 'TIER_1_READ'
  | 'TIER_2_WRITE'
  | 'TIER_3_EXTERNAL'
  | 'TIER_4_DESTRUCTIVE'
  | 'TIER_0'
  | 'TIER_1'
  | 'TIER_2'
  | 'TIER_3'
  | 'TIER_4';

export type OperatorActionType =
  | 'CLICK'
  | 'DOUBLE_CLICK'
  | 'RIGHT_CLICK'
  | 'TYPE'
  | 'KEY_PRESS'
  | 'HOTKEY'
  | 'SCROLL'
  | 'DRAG'
  | 'SELECT'
  | 'FOCUS'
  | 'OPEN'
  | 'CLOSE'
  | 'LAUNCH'
  | 'TERMINATE'
  | 'NAVIGATE'
  | 'WAIT'
  | 'COPY'
  | 'PASTE'
  | 'FILE_OPEN'
  | 'FILE_SAVE'
  | 'MENU_SELECT'
  | 'TAB_SELECT'
  | 'WINDOW_SWITCH'
  | 'TERMINAL_EXECUTE'
  | 'BROWSER_ACTION'
  | 'UIA_ACTION'
  | 'SCREENSHOT'
  | 'OCR'
  | 'VERIFY'
  | 'GENERIC';

export type ActionVerificationStrategy =
  | 'OBSERVE_STATE_CHANGE'
  | 'FILE_SYSTEM_VERIFICATION'
  | 'PROCESS_EXIT_CODE'
  | 'URL_NAVIGATION_CHECK'
  | 'DOM_MUTATION_CHECK'
  | 'OCR_TEXT_MATCH'
  | 'UI_STATE_CHANGE'
  | 'ELEMENT_APPEARED'
  | 'ELEMENT_DISAPPEARED'
  | 'FILE_EXISTS'
  | 'PROCESS_RUNNING'
  | 'DOM_MATCH'
  | 'TEXT_PRESENT'
  | 'CUSTOM';

export type RecoveryStrategy =
  | 'RE_OBSERVE'
  | 'REFOCUS_WINDOW'
  | 'REACQUIRE_TARGET'
  | 'RETRY_ACTION'
  | 'REOPEN_APPLICATION'
  | 'RECONNECT_WORKSPACE'
  | 'RESTORE_CHECKPOINT'
  | 'ESCALATE_HUMAN';

export interface OperatorActionTarget {
  elementId?: string;
  semanticSelector?: string;
  textLabel?: string;
  role?: string;
  coordinates?: { x: number; y: number };
  bounds?: { x: number; y: number; width: number; height: number };
  confidence?: number;
}

export interface TargetResolutionRequest {
  semanticSelector?: string;
  textLabel?: string;
  role?: string;
  visualDescription?: string;
  coordinates?: { x: number; y: number };
  description?: string;
  selector?: string;
  automationId?: string;
  name?: string;
  text?: string;
  className?: string;
  disambiguationHint?: string;
}

export interface TargetResolutionResult {
  target: OperatorActionTarget;
  confidence: ObservationConfidence;
  resolutionMethod: ObservationLayer | string;
  isAmbiguous: boolean;
  candidateCount: number;
  evidence: Record<string, any>;
  found?: boolean;
}

export interface ActionPrecondition {
  rule?: string;
  description?: string;
  requiredWorkspaceId?: string;
  requiredApplicationId?: string;
  requiredWindowTitle?: string;
  requiredFocusElementId?: string;
  requireNoModalDialog?: boolean;
  requiredAuthStatus?: 'AUTHENTICATED' | 'NONE';
  minConfidence?: ObservationConfidence;
  humanApprovalRequired?: boolean;
  humanApproved?: boolean;
}

export interface OperatorActionPayload {
  actionId: string;
  id?: string;
  workspaceId: string;
  applicationId?: string;
  actionType: OperatorActionType;
  type?: OperatorActionType;
  riskLevel: ActionRiskLevel;
  target?: OperatorActionTarget;
  parameters: Record<string, any>;
  preconditions?: ActionPrecondition[];
  confidence: ObservationConfidence;
  verificationStrategy?: ActionVerificationStrategy;
  timeoutMs?: number;
  agentId?: string;
  workflowId?: string;
  taskId?: string;
}

export interface OperatorActionResult {
  actionId: string;
  workspaceId: string;
  status: 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'PENDING';
  isVerified: boolean;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  evidence?: Record<string, any>;
  verificationEvidence?: Record<string, any>;
  errorMessage?: string;
  success?: boolean;
}

export interface ActionVerificationResult {
  strategy: ActionVerificationStrategy | string;
  isVerified: boolean;
  evidence: Record<string, any>;
  discrepancies: string[];
  verifiedAt: string;
  durationMs: number;
}

export interface RecoveryAttemptResult {
  strategy: RecoveryStrategy | string;
  attemptNumber: number;
  success: boolean;
  evidence: Record<string, any>;
}
