/**
 * HṚṢĪKEŚA (हृषीकेश) — Workforce & Dynamic Assignment Types
 *
 * FP-14: Tracks 17-agent workforce states, multi-factor assignment scoring,
 * structured handoffs, delegation limits, and collaboration traces.
 */

import { MissionArtifact } from './blackboard.types.js';

export type AgentWorkforceStatus =
  | 'AVAILABLE'
  | 'BUSY'
  | 'OVERLOADED'
  | 'BLOCKED'
  | 'WAITING'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'RECOVERING';

export interface AgentWorkforceCapacity {
  agentId: string;
  name: string;
  role: string;
  primarySpecialization: string;
  status: AgentWorkforceStatus;
  activeTaskIds: string[];
  queuedTaskIds: string[];
  currentMissionIds: string[];
  maxConcurrentTasks: number;
  currentWorkloadScore: number;
  historicalSuccessRate: number;
  activeWorkspaceId?: string;
  lastActiveTimestamp: string;
}

export interface AgentAssignmentScore {
  agentId: string;
  agentName?: string;
  specializationScore: number;
  availabilityScore: number;
  workloadPenalty: number;
  historicalFitScore: number;
  environmentFitScore: number;
  privacyFitScore: number;
  compositeScore: number;
  rationale: string;
}

export interface StructuredHandoff {
  readonly handoffId: string;
  readonly missionId: string;
  readonly outcomeId: string;
  readonly taskId?: string;
  readonly fromAgent: string;
  readonly toAgent: string;
  readonly timestamp: string;
  readonly reason: string;
  readonly completedWork: string[];
  readonly evidence: string[];
  readonly artifacts: MissionArtifact[];
  readonly constraints?: string[];
  readonly assumptions?: string[];
  readonly nextAction: string;
  readonly verificationRequirement: string;
  readonly metadata?: Record<string, unknown>;
}
