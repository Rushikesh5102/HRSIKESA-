/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Blackboard & Artifact Types
 *
 * FP-14: Shared mission memory, structured collaboration entries,
 * and traceable mission artifacts.
 */

export type BlackboardEntryType =
  | 'DECISION'
  | 'DISCOVERY'
  | 'BLOCKER'
  | 'ASSUMPTION'
  | 'VERIFIED_FACT'
  | 'FACT'
  | 'RISK'
  | 'OPEN_QUESTION'
  | 'AGENT_OUTPUT'
  | 'ARTIFACT_REF';

export interface BlackboardEntry {
  readonly entryId: string;
  readonly missionId: string;
  readonly outcomeId?: string;
  author?: string;
  authorAgentId?: string;
  type: BlackboardEntryType;
  title: string;
  content: string;
  confidence?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  provenance?: string;
  isResolved?: boolean;
  resolvedBy?: string;
  resolutionNotes?: string;
  timestamp?: string;
  createdAt?: string;
}

export type ArtifactType =
  | 'DOCUMENT'
  | 'CODE'
  | 'WEBSITE'
  | 'IMAGE'
  | 'DATASET'
  | 'REPORT'
  | 'TEST_REPORT'
  | 'BUILD'
  | 'BUILD_OUTPUT'
  | 'DEPLOYMENT'
  | 'CONTRACT'
  | 'RESEARCH'
  | 'TEST_RESULT'
  | 'EVIDENCE_BLOB';

export interface MissionArtifact {
  readonly artifactId: string;
  readonly missionId: string;
  readonly outcomeId?: string;
  readonly taskId?: string;
  ownerAgent?: string;
  ownerAgentId?: string;
  type: ArtifactType;
  name: string;
  location: string;
  checksum?: string;
  version: string | number;
  verificationState: 'UNVERIFIED' | 'PARTIALLY_VERIFIED' | 'VERIFIED' | 'FAILED';
  provenance?: string;
  createdAt: string;
  verifiedAt?: string;
}
