/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Outcome Types
 *
 * FP-14: Explicit verifiable outcome contracts, acceptance criteria,
 * milestones, evidence mappings, and independent verification states.
 */

export type OutcomeStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'VERIFIED'
  | 'FAILED'
  | 'WAIVED'
  | 'CANCELLED';

export type OutcomeVerificationState =
  | 'UNVERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'VERIFIED'
  | 'FAILED'
  | 'WAIVED';

export interface MissionMilestone {
  readonly milestoneId: string;
  readonly missionId: string;
  title: string;
  description: string;
  order: number;
  outcomeIds: string[];
  isCompleted: boolean;
  completedAt?: string;
}

export interface MissionOutcome {
  readonly outcomeId: string;
  readonly missionId: string;
  description: string;
  acceptanceCriteria: string[];
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: OutcomeStatus;
  evidence?: string[] | Record<string, unknown>;
  dependencies: string[];
  verificationState: OutcomeVerificationState;
  confidence?: number;
  weight?: number;
  optional?: boolean;
  verifiedAt?: string;
  verifiedByAgentId?: string;
  createdAt?: string;
  updatedAt?: string;
}
