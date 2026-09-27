/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Software Engineering & Agentic Coding Types
 *
 * FP-10: Master type definitions for tasks, plans, actions, diagnostics, repairs,
 * convergence verification, and execution events.
 */

export type EngineeringTaskStatus =
  | 'QUEUED'
  | 'UNDERSTANDING'
  | 'PLANNING'
  | 'AWAITING_APPROVAL'
  | 'EXECUTING'
  | 'TESTING'
  | 'DIAGNOSING'
  | 'REPAIRING'
  | 'VERIFYING'
  | 'CONVERGING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'NEEDS_USER'
  | 'CANCELLED'
  | 'PAUSED';

export type EngineeringPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type EngineeringComplexity = 'SIMPLE' | 'STANDARD' | 'COMPLEX' | 'CRITICAL';

export interface EngineeringBudget {
  maxAttempts: number;
  maxModelCalls: number;
  maxTokens: number;
  maxDurationSeconds: number;
  maxChangedFiles: number;
  maxPatchLines: number;
}

export interface SoftwareEngineeringTask {
  id: string;
  workspaceId: string;
  projectId?: string;
  companyId?: string;
  objective: string;
  status: EngineeringTaskStatus;
  priority: EngineeringPriority;
  complexity: EngineeringComplexity;
  currentPhase: string;
  attemptCount: number;
  maxAttempts: number;
  budget: EngineeringBudget;
  modelCalls: number;
  toolCalls: number;
  changedFiles: string[];
  testsRun: number;
  verificationState: 'PENDING' | 'PASSED' | 'VERIFIED' | 'FAILED' | 'SKIPPED';
  failureReason?: string;
  finalSummary?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type EngineeringActionType =
  | 'READ_FILE'
  | 'SEARCH'
  | 'EDIT_FILE'
  | 'CREATE_FILE'
  | 'DELETE_FILE'
  | 'RUN_TEST'
  | 'RUN_BUILD'
  | 'RUN_LINT'
  | 'RUN_COMMAND'
  | 'GIT_DIFF'
  | 'START_PREVIEW'
  | 'STOP_PREVIEW'
  | 'RESEARCH'
  | 'ASK_USER'
  | 'COMPLETE';

export interface ActionLineRange {
  startLine: number;
  endLine: number;
}

export interface EngineeringActionPayload {
  path?: string;
  file?: string;
  filePath?: string;
  query?: string;
  isRegex?: boolean;
  content?: string;
  targetContent?: string;
  replacementContent?: string;
  range?: ActionLineRange;
  startLine?: number;
  endLine?: number;
  replacements?: Array<{
    startLine: number;
    endLine: number;
    targetContent: string;
    replacementContent: string;
  }>;
  command?: string;
  commandLine?: string;
  timeoutMs?: number;
  question?: string;
  summary?: string;
  reason?: string;
  expectedHash?: string;
}

export interface EngineeringAction {
  id: string;
  taskId: string;
  actionType: EngineeringActionType;
  payload: EngineeringActionPayload;
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'FAILED';
  validationResult?: {
    valid: boolean;
    reason?: string;
    riskTier?: number;
    requiresApproval?: boolean;
  };
  executionResult?: {
    success: boolean;
    output?: unknown;
    error?: string;
    durationMs?: number;
    diff?: string;
  };
  executedAt?: string;
  createdAt: string;
}

export interface EngineeringPlanStep {
  sequence: number;
  title: string;
  description: string;
  targetFiles?: string[];
  actionType: EngineeringActionType;
  expectedOutput?: string;
  dangerTier: number;
  requiresApproval?: boolean;
}

export interface EngineeringPlan {
  id: string;
  taskId: string;
  architectureSummary: string;
  summary?: string;
  targetFiles: string[];
  steps: EngineeringPlanStep[];
  verificationPlan: string[];
  acceptanceCriteria?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskAssessment?: string;
  requiresApproval: boolean;
  createdAt: string;
}

export type DiagnosticCategory =
  | 'TYPE_ERROR'
  | 'LINT_ERROR'
  | 'TEST_FAILURE'
  | 'BUILD_FAILURE'
  | 'RUNTIME_ERROR'
  | 'DEPENDENCY_ERROR'
  | 'NETWORK_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'ENVIRONMENT_ERROR'
  | 'PERMISSION_ERROR'
  | 'TIMEOUT'
  | 'RESOURCE_EXHAUSTION'
  | 'UNKNOWN';

export interface StructuredDiagnostic {
  id: string;
  taskId: string;
  category: DiagnosticCategory;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  fingerprint: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  expected?: string;
  received?: string;
  message: string;
  rawOutput: string;
  hypotheses: string[];
  proposedFix?: string;
  createdAt: string;
}

export type RepairOutcome = 'IMPROVED' | 'UNCHANGED' | 'REGRESSED' | 'RESOLVED' | 'FAILED';

export interface RepairAttempt {
  id: string;
  taskId: string;
  diagnosticId?: string;
  attemptNumber: number;
  modelId: string;
  proposedPatch: EngineeringActionPayload;
  changesetId?: string;
  outcome: RepairOutcome;
  durationMs: number;
  reason?: string;
  createdAt: string;
}

export interface ConvergenceAssessment {
  status: 'PROGRESSING' | 'REPEATED_FAILURE' | 'BUDGET_EXHAUSTED' | 'CONVERGED_SUCCESS' | 'REGRESSED';
  consecutiveIdenticalFailures: number;
  bestOutcome: RepairOutcome;
  shouldHalt: boolean;
  reason: string;
}

export interface EngineeringTaskFilter {
  workspaceId?: string;
  projectId?: string;
  companyId?: string;
  status?: EngineeringTaskStatus;
  limit?: number;
  offset?: number;
}

export type EngineeringEventType =
  | 'engineering.task.created'
  | 'engineering.task.started'
  | 'engineering.plan.created'
  | 'engineering.action.proposed'
  | 'engineering.action.approved'
  | 'engineering.action.executed'
  | 'engineering.file.changed'
  | 'engineering.test.started'
  | 'engineering.test.completed'
  | 'engineering.failure.detected'
  | 'engineering.diagnosis.started'
  | 'engineering.diagnosis.completed'
  | 'engineering.repair.started'
  | 'engineering.repair.completed'
  | 'engineering.verification.started'
  | 'engineering.verification.completed'
  | 'engineering.convergence.changed'
  | 'engineering.task.completed'
  | 'engineering.task.failed'
  | 'engineering.task.paused'
  | 'engineering.task.resumed'
  | 'engineering.task.cancelled';

export interface EngineeringEventPayload {
  taskId: string;
  status?: EngineeringTaskStatus;
  phase?: string;
  step?: number;
  action?: EngineeringAction;
  diagnostic?: StructuredDiagnostic;
  repair?: RepairAttempt;
  testsPassed?: number;
  testsFailed?: number;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface EngineeringTaskEvent extends EngineeringEventPayload {
  type: EngineeringEventType;
}
