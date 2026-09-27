/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Checkpoint & Plan Versioning Types
 *
 * FP-14: Immutable versioned plan snapshots, state checkpoints,
 * rollback records, and crash recovery envelopes.
 */

import { MissionOutcome } from './outcome.types.js';
import { MissionTask } from './task.types.js';

export interface PlanVersion {
  versionId?: string;
  version?: number;
  missionId: string;
  planVersionNumber?: number;
  reason: string;
  author: string;
  timestamp: string;
  affectedTasks?: string[];
  affectedOutcomes?: string[];
  tasksSnapshot?: MissionTask[];
  outcomesSnapshot?: MissionOutcome[];
  planDiffSummary?: string;
}

export interface MissionCheckpoint {
  readonly checkpointId: string;
  readonly missionId: string;
  planVersion: number;
  stateSnapshot: Record<string, unknown>;
  checksum: string;
  createdAt: string;
  reason: string;
}
