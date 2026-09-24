/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 26: Safe Self-Improvement & Self-Maintenance Types
 */

export type ImprovementLifecycleState =
  | 'OBSERVED'
  | 'DETECTED'
  | 'ANALYZING'
  | 'PROPOSED'
  | 'PLANNED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'IMPLEMENTING'
  | 'TESTING'
  | 'BENCHMARKING'
  | 'VERIFYING'
  | 'DEPLOYED'
  | 'MONITORING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'EXPIRED'
  | 'CANCELLED';

export type ImprovementCategory =
  | 'BUG_FIX'
  | 'PERFORMANCE'
  | 'MEMORY_EFFICIENCY'
  | 'RESOURCE_EFFICIENCY'
  | 'RELIABILITY'
  | 'TEST_COVERAGE'
  | 'SECURITY_HARDENING'
  | 'TOOL_IMPROVEMENT'
  | 'SKILL_IMPROVEMENT'
  | 'MODEL_ROUTING'
  | 'RESEARCH_QUALITY'
  | 'KNOWLEDGE_QUALITY'
  | 'UI_IMPROVEMENT'
  | 'VOICE_IMPROVEMENT'
  | 'COMPUTER_OPERATOR'
  | 'COMPANY_OPERATIONS'
  | 'DOCUMENTATION'
  | 'MAINTENANCE'
  | 'DEPENDENCY_UPDATE'
  | 'CONFIGURATION_IMPROVEMENT';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ImprovementRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BenchmarkOutcome = 'IMPROVED' | 'REGRESSED' | 'UNCHANGED' | 'INCONCLUSIVE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type DeploymentStage = 'SANDBOX' | 'CANARY' | 'LIMITED' | 'FULL';
export type MaintenanceJobType =
  | 'CLEANUP_TEMP_FILES'
  | 'CLEANUP_STALE_SESSIONS'
  | 'RECONNECT_MCP'
  | 'REBUILD_CACHE'
  | 'REBUILD_EMBEDDINGS'
  | 'CHECK_DEPENDENCY_DRIFT'
  | 'CHECK_DATABASE_INTEGRITY'
  | 'VALIDATE_SKILL_VERSIONS';

export type MaintenanceJobStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface ISelfObservation {
  readonly id: string;
  readonly companyId?: string;
  readonly source: string;
  readonly category: string;
  readonly metricName?: string;
  readonly metricValue?: number;
  readonly details: Record<string, unknown>;
  readonly level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  readonly timestamp: string;
}

export interface ISelfAnomaly {
  readonly id: string;
  readonly companyId?: string;
  readonly title: string;
  readonly component: string;
  readonly severity: AnomalySeverity;
  readonly description: string;
  readonly evidenceSummary: string;
  readonly observationIds: string[];
  readonly status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';
  readonly detectedAt: string;
  readonly resolvedAt?: string;
}

export interface IImprovementProposal {
  readonly id: string;
  readonly companyId?: string;
  readonly anomalyId?: string;
  readonly title: string;
  readonly category: ImprovementCategory;
  readonly state: ImprovementLifecycleState;
  readonly problemStatement: string;
  readonly evidenceSummary: string;
  readonly expectedBenefit: string;
  readonly affectedComponents: string[];
  readonly riskLevel: ImprovementRiskLevel;
  readonly confidenceScore: number;
  readonly proposedImplementation: string;
  readonly rollbackStrategy: string;
  readonly testPlan: string;
  readonly benchmarkPlan?: string;
  readonly requiresHumanApproval: boolean;
  readonly estimatedResourceCost: string;
  readonly version: number;
  readonly createdByAgent: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
}

export interface IImprovementEvidence {
  readonly id: string;
  readonly proposalId: string;
  readonly evidenceType: 'LOG' | 'METRIC' | 'DIFF' | 'STACK_TRACE' | 'BENCHMARK' | 'TEST_RUN';
  readonly title: string;
  readonly data: Record<string, unknown>;
  readonly hash: string;
  readonly capturedAt: string;
}

export interface IChangeSetFile {
  readonly path: string;
  readonly action: 'CREATE' | 'MODIFY' | 'DELETE';
  readonly beforeContent?: string;
  readonly afterContent?: string;
  readonly diff?: string;
}

export interface IImprovementChangeSet {
  readonly id: string;
  readonly proposalId: string;
  readonly files: IChangeSetFile[];
  readonly summary: string;
  readonly authorAgent: string;
  readonly isSandboxed: boolean;
  readonly sandboxPath?: string;
  readonly createdAt: string;
}

export interface IImprovementTestResult {
  readonly id: string;
  readonly proposalId: string;
  readonly changeSetId: string;
  readonly suiteName: string;
  readonly totalTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly skippedTests: number;
  readonly durationMs: number;
  readonly errors: string[];
  readonly passed: boolean;
  readonly executedAt: string;
}

export interface IImprovementBenchmarkResult {
  readonly id: string;
  readonly proposalId: string;
  readonly changeSetId: string;
  readonly metricName: string;
  readonly unit: string;
  readonly beforeValue: number;
  readonly afterValue: number;
  readonly delta: number;
  readonly deltaPercentage: number;
  readonly outcome: BenchmarkOutcome;
  readonly executedAt: string;
}

export interface IImprovementApproval {
  readonly id: string;
  readonly proposalId: string;
  readonly requestedBy: string;
  readonly requiredRole: string;
  readonly riskLevel: ImprovementRiskLevel;
  readonly status: ApprovalStatus;
  readonly resolutionRationale?: string;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
  readonly requestedAt: string;
}

export interface IImprovementDeployment {
  readonly id: string;
  readonly proposalId: string;
  readonly changeSetId: string;
  readonly stage: DeploymentStage;
  readonly status: 'ACTIVE' | 'PROMOTED' | 'ROLLED_BACK' | 'FAILED';
  readonly deployedAt: string;
  readonly verifiedAt?: string;
}

export interface IImprovementRollback {
  readonly id: string;
  readonly proposalId: string;
  readonly deploymentId: string;
  readonly reason: string;
  readonly snapshotReference: string;
  readonly verifiedRestored: boolean;
  readonly executedAt: string;
}

export interface IMaintenanceJob {
  readonly id: string;
  readonly type: MaintenanceJobType;
  readonly target: string;
  readonly status: MaintenanceJobStatus;
  readonly details: Record<string, unknown>;
  readonly reclaimedBytes?: number;
  readonly durationMs?: number;
  readonly scheduledAt: string;
  readonly executedAt?: string;
}

export interface IDependencyFinding {
  readonly id: string;
  readonly packageName: string;
  readonly currentVersion: string;
  readonly latestVersion: string;
  readonly isOutdated: boolean;
  readonly hasBreakingChanges: boolean;
  readonly vulnerabilitySeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly recommendation: string;
  readonly detectedAt: string;
}

export interface ISelfHealthReport {
  readonly overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'NEEDS_ATTENTION';
  readonly overallScore: number;
  readonly subsystemScores: {
    readonly kernel: number;
    readonly tests: number;
    readonly memory: number;
    readonly models: number;
    readonly tools: number;
    readonly skills: number;
    readonly mcp: number;
    readonly companyOs: number;
  };
  readonly activeAnomaliesCount: number;
  readonly activeProposalsCount: number;
  readonly pendingApprovalsCount: number;
  readonly timestamp: string;
}
