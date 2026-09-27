/**
 * FP-13 Universal Digital Workspace & Application Operator
 * Action Trace, Step, Pattern, and Lock Type Definitions
 */

import { OperatorActionResult, OperatorActionPayload } from './action.types.js';

export interface ActionTraceStep {
  stepId: string;
  traceId: string;
  stepIndex: number;
  timestamp: string;
  workspaceId: string;
  applicationId?: string | null;
  observationHash?: string | null;
  action: OperatorActionPayload;
  result: OperatorActionResult;
  verificationEvidence?: Record<string, unknown> | null;
  confidence: string;
  agentId?: string | null;
  skillId?: string | null;
  workflowId?: string | null;
  provenance: string;
}

export interface ActionTrace {
  traceId: string;
  name: string;
  description?: string | null;
  workspaceId: string;
  applicationId?: string | null;
  initiatorAgentId?: string | null;
  status: 'RECORDING' | 'COMPLETED' | 'FAILED' | 'REPLAYING' | 'CANCELLED';
  steps: ActionTraceStep[];
  startedAt: string;
  completedAt?: string | null;
  isReusableProposal: boolean;
  metadata: Record<string, unknown>;
}

export interface LearnedUIPattern {
  patternId: string;
  applicationName: string;
  applicationVersion?: string | null;
  intent: string;
  successfulSelector: string;
  resolutionMethod: string;
  confidence: number;
  useCount: number;
  lastUsedAt: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceLock {
  lockId: string;
  workspaceId: string;
  applicationId?: string | null;
  holderAgentId: string;
  lockType: 'EXCLUSIVE' | 'SHARED_OBSERVE' | 'QUEUED';
  taskId: string;
  acquiredAt: string;
  expiresAt: string;
  isReleased: boolean;
}
