/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Runtime Core Types
 *
 * FP-14: First-class persistent Mission Descriptor, States, Priorities,
 * Constraints, Assumptions, Risks, and Reports.
 */

import { MissionOutcome } from './outcome.types.js';
import { MissionArtifact } from './blackboard.types.js';

export type MissionState =
  | 'CREATED'
  | 'UNDERSTANDING'
  | 'PLANNING'
  | 'AWAITING_APPROVAL'
  | 'READY'
  | 'EXECUTING'
  | 'WAITING'
  | 'BLOCKED'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'REPLANNING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PAUSED'
  | 'NEEDS_USER'
  | 'RETIRED';

export type MissionPriority = 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'CRITICAL' | 'SOVEREIGN_URGENT';

export type MissionPrivacyLevel =
  | 'SOVEREIGN_LOCAL'
  | 'HIGHLY_PRIVATE'
  | 'PRIVATE'
  | 'INTERNAL'
  | 'AUTHORIZED_EXTERNAL'
  | 'PUBLIC';

export type MissionHealth = 'HEALTHY' | 'AT_RISK' | 'BLOCKED' | 'DEGRADED' | 'CRITICAL' | 'COMPLETED' | 'FAILED';

export interface MissionConstraint {
  id?: string;
  constraintId?: string;
  type: string;
  description: string;
  value?: unknown;
  isStrict?: boolean;
  enforceStrict?: boolean;
}

export interface MissionAssumption {
  id: string;
  assumption: string;
  reason: string;
  confidence: number;
  affectedOutcomeIds: string[];
  createdAt: string;
  verifiedAt?: string;
  isStillValid: boolean;
}

export interface MissionRiskRecord {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigationPlan: string;
  status: 'IDENTIFIED' | 'MITIGATED' | 'ACCEPTED' | 'TRIGGERED';
}

export interface MissionResourceUsage {
  cpuSeconds?: number;
  memoryMb?: number;
  modelCalls?: number;
  toolCalls?: number;
  workspaceActions?: number;
  externalApiCostUsd?: number;
  estimatedTotalDurationMs?: number;
  actualDurationMs?: number;
  estimatedDurationSeconds?: number;
  estimatedModelCalls?: number;
  estimatedToolCalls?: number;
}

export interface MissionDescriptor {
  readonly missionId: string;
  title: string;
  objective: string;
  description?: string;
  owner: string;
  companyId?: string;
  projectId?: string;
  status: MissionState;
  priority: MissionPriority;
  urgency?: number;
  importance?: number;
  privacyLevel?: MissionPrivacyLevel;
  constraints: MissionConstraint[];
  assumptions?: MissionAssumption[];
  risks?: MissionRiskRecord[];
  desiredOutcome?: string;
  acceptanceCriteria: string[];
  budgetLimitUsd?: number;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  parentMissionId?: string;
  currentPhase?: string;
  health?: MissionHealth;
  progress?: number;
  progressPercentage?: number;
  confidenceScore?: number;
  evidenceSummary?: string;
  evidence?: string[];
  scope?: string;
  planVersion?: number;
  resourceUsage?: MissionResourceUsage;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface MissionReport {
  missionId: string;
  title: string;
  objective: string;
  status: MissionState;
  health?: MissionHealth;
  progress?: number;
  createdAt: string;
  completedAt?: string;
  agentsInvolved: string[];
  outcomes: MissionOutcome[];
  tasksCount: number;
  completedTasksCount: number;
  artifacts: MissionArtifact[];
  decisions: string[];
  blockers: string[];
  failures: string[];
  evidence: string[];
  costsAndUsage?: Record<string, unknown>;
}
