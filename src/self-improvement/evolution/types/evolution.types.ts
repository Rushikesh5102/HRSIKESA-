/**
 * HṚṢĪKEŚA (हृषीकेश) — Self-Evolution Engine Type Definitions
 *
 * Types for the controlled, observable, reversible self-development environment.
 */

export enum ProtectionTier {
  TIER_0_IMMUTABLE_SAFETY_CORE = 0, // Emergency-stop, supervisors, permissions, credential isolation, boundary checks
  TIER_1_PROTECTED_CORE = 1,        // Kernel, runtime, core orchestration (requires high verification & promotion gate)
  TIER_2_NORMAL_APPLICATION = 2,    // Subsystem services, tools, workflows, adapters
  TIER_3_EXPERIMENT_CODE = 3,       // Isolated experiment files, benchmarks, test harness
}

export type EvolutionObjectiveStatus =
  | 'OBJECTIVE_ACCEPTED'
  | 'BASELINE_CAPTURED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'BLOCKED'
  | 'NEEDS_USER'
  | 'STAGNATED'
  | 'EMERGENCY_STOPPED'
  | 'PROMOTION_READY'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ExperimentLifecycleState =
  | 'EXPERIMENT_CREATED'
  | 'WORKTREE_CREATED'
  | 'CODE_MODIFIED'
  | 'BUILDING'
  | 'TESTING'
  | 'BENCHMARKING'
  | 'SECURITY_VERIFYING'
  | 'SUPERVISOR_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ROLLED_BACK'
  | 'CHECKPOINTED';

export type ComparisonOperator = '<' | '<=' | '>' | '>=' | '==' | '!=' | 'contains';

export interface EvolutionAcceptanceCriterion {
  metric: string;
  targetValue: number | string;
  operator: ComparisonOperator;
  unit: string;
  tolerancePercentage?: number;
  description?: string;
}

export interface EvolutionResourceBudget {
  maxCpuPercent?: number;
  maxRamMb?: number;
  maxDiskMb?: number;
  maxProcesses?: number;
  maxModelCalls?: number;
  maxToolCalls?: number;
}

export interface EvolutionObjective {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: EvolutionAcceptanceCriterion[];
  baselineMeasurements: Record<string, number | string>;
  allowedScope: string[];
  prohibitedActions: string[];
  resourceBudget: EvolutionResourceBudget;
  timeBudgetMs: number;
  maxExperiments: number;
  maxConsecutiveFailures: number;
  stagnationThreshold: number;
  requiredRegressionSuites: string[];
  requiredSecurityChecks: string[];
  supervisorQuorum: 'UNANIMOUS_SAFETY' | 'MAJORITY' | 'UNANIMOUS_ALL';
  terminationConditions: string[];
  status: EvolutionObjectiveStatus;
  progressPercentage: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface EvolutionTestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  failedTestNames: string[];
  stdout?: string;
  stderr?: string;
  success: boolean;
}

export interface EvolutionBenchmarkResults {
  metrics: Record<string, { baseline: number; candidate: number; deltaPercent: number; unit: string; improved: boolean }>;
  overallPassed: boolean;
  notes?: string;
}

export interface EvolutionSecurityResults {
  passed: boolean;
  tierViolations: Array<{ file: string; attemptedTier: ProtectionTier; reason: string }>;
  boundaryViolations: string[];
  credentialLeaksDetected: string[];
  prohibitedImports: string[];
  networkAnomalies: string[];
}

export type SupervisorName = 'antigravity' | 'jules' | 'spark';
export type SupervisorVote = 'APPROVE' | 'REJECT' | 'PAUSE' | 'EMERGENCY_STOP';

export interface EvolutionSupervisorReview {
  id: string;
  experimentId: string;
  supervisorName: SupervisorName;
  vote: SupervisorVote;
  confidence: number;
  findings: string[];
  violations: string[];
  recommendation: string;
  evaluatedAt: string;
}

export interface EvolutionRollbackInfo {
  rolledBackAt: string;
  targetCommit: string;
  strategy: 'GIT_CLEAN' | 'WORKTREE_RESET' | 'CHANGESET_REVERT';
  success: boolean;
  restoredFiles: string[];
}

export interface EvolutionExperiment {
  id: string;
  objectiveId: string;
  experimentNumber: number;
  hypothesis: string;
  baselineCommit: string;
  worktreePath: string;
  status: ExperimentLifecycleState;
  changedFiles: string[];
  diff: string;
  testResults: EvolutionTestResults;
  benchmarkResults: EvolutionBenchmarkResults;
  securityResults: EvolutionSecurityResults;
  supervisorResults: Record<string, EvolutionSupervisorReview>;
  decision: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ROLLED_BACK';
  decisionReason?: string;
  checkpointId?: string;
  rollbackInfo?: EvolutionRollbackInfo;
  startedAt: string;
  endedAt?: string;
}

export interface EvolutionCheckpoint {
  id: string;
  objectiveId: string;
  experimentId?: string;
  milestoneName: string;
  gitCommitSha: string;
  worktreeSnapshotPath?: string;
  stateSnapshot: Record<string, unknown>;
  createdAt: string;
}

export interface EvolutionAuditLog {
  id: string;
  objectiveId?: string;
  experimentId?: string;
  actor: string;
  action: string;
  capability: string;
  filesTouched: string[];
  result: 'SUCCESS' | 'DENIED' | 'FAILED' | 'EMERGENCY_STOPPED';
  evidence: Record<string, unknown>;
  resourceUsage: Record<string, unknown>;
  timestamp: string;
}

export type SafetyState = 'NOMINAL' | 'PAUSED' | 'EMERGENCY_STOPPED';

export interface SafetyStatus {
  state: SafetyState;
  isEmergencyStopped?: boolean;
  isPaused?: boolean;
  reason?: string;
  stoppedAt?: string;
  canResume: boolean;
  activeProcessesTerminated: number;
  worktreesLocked: boolean;
}
