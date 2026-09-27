/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Task & Execution Types
 *
 * FP-14: Structured tasks associated with outcomes, assigned agents,
 * capabilities, accounts, workflows, workspaces, and failure records.
 */

export type MissionTaskStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'CLAIMED'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'AWAITING_APPROVAL'
  | 'WAITING_DEPENDENCY'
  | 'BLOCKED'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED';

export type TaskExecutionKind =
  | 'AGENT_DIRECT'
  | 'AGENT_DISPATCH'
  | 'WORKFLOW'
  | 'WORKFLOW_EXECUTION'
  | 'SKILL_EXECUTION'
  | 'CAPABILITY'
  | 'CAPABILITY_INVOCATION'
  | 'ENGINEERING'
  | 'ENGINEERING_FIX'
  | 'WORKSPACE_OPERATION'
  | 'ACCOUNT_OPERATION'
  | 'HUMAN_APPROVAL_GATE';

export type FailureClass =
  | 'TRANSIENT'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RESOURCE'
  | 'NETWORK'
  | 'PROVIDER'
  | 'LOGIC'
  | 'APPLICATION'
  | 'ENVIRONMENT'
  | 'DATA'
  | 'SECURITY'
  | 'HUMAN_APPROVAL'
  | 'UNKNOWN';

export interface TaskFailureRecord {
  attempt?: number;
  failureClass: FailureClass;
  errorMessage: string;
  errorStack?: string;
  failedAt?: string;
  timestamp?: string;
  recoverable?: boolean;
  recoveryStrategyAttempted?: string;
}

export interface MissionTask {
  readonly taskId: string;
  readonly missionId: string;
  readonly outcomeId: string;
  title: string;
  description: string;
  kind?: TaskExecutionKind;
  executionKind?: TaskExecutionKind;
  status: MissionTaskStatus;
  primaryAgentId?: string;
  assignedAgent?: string;
  assistingAgentIds?: string[];
  requiredCapabilities?: string[];
  requiredSkills?: string[];
  workflowId?: string;
  workspaceId?: string;
  accountId?: string;
  dependencies: string[];
  priority?: number;
  riskTier?: number;
  riskLevel?: string;
  requiresHumanApproval?: boolean;
  approvalRequired?: boolean;
  isApprovedByHuman?: boolean;
  approvedAt?: string;
  approvedBy?: string;
  approvalReason?: string;
  inputPayload?: Record<string, unknown>;
  outputResult?: Record<string, unknown>;
  evidence?: any;
  artifacts?: string[];
  failure?: TaskFailureRecord;
  failureHistory?: TaskFailureRecord[];
  retryCount: number;
  maxRetries: number;
  timeoutMs?: number;
  delegationDepth?: number;
  parentTaskId?: string;
  claimedAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDurationMs?: number;
  actualDurationMs?: number;
  createdAt: string;
  updatedAt: string;
}
