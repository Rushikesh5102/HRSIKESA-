import { createHash } from 'node:crypto';
import { MissionCheckpoint, MissionDescriptor, MissionOutcome, MissionTask, BlackboardEntry, MissionArtifact } from '../types/index.js';
import { MissionRepository } from '../repository/mission.repository.js';

export interface CheckpointSnapshotData {
  mission: MissionDescriptor;
  outcomes: MissionOutcome[];
  tasks: MissionTask[];
  blackboard: BlackboardEntry[];
  artifacts: MissionArtifact[];
}

export class MissionCheckpointManager {
  private inMemoryCheckpoints: Map<string, MissionCheckpoint[]> = new Map();

  constructor(private readonly repository?: MissionRepository) {}

  /**
   * Sanitizes snapshot data to ensure secrets, tokens, and raw keys are strictly stripped
   */
  private sanitizeData(data: CheckpointSnapshotData): CheckpointSnapshotData {
    const jsonStr = JSON.stringify(data, (key, value) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password') || lowerKey.includes('apikey') || lowerKey.includes('auth')) {
        return '[REDACTED_SECRET]';
      }
      return value;
    });
    return JSON.parse(jsonStr);
  }

  /**
   * Create an immutable state checkpoint for a mission
   */
  public createCheckpoint(
    missionId: string,
    planVersion: number,
    data: CheckpointSnapshotData,
    reason: string
  ): MissionCheckpoint {
    const sanitized = this.sanitizeData(data);
    const serialized = JSON.stringify(sanitized);
    const checksum = createHash('sha256').update(serialized).digest('hex');

    const checkpoint: MissionCheckpoint = {
      checkpointId: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      missionId,
      planVersion,
      stateSnapshot: sanitized as unknown as Record<string, unknown>,
      checksum,
      createdAt: new Date().toISOString(),
      reason
    };

    const checkpoints = this.inMemoryCheckpoints.get(missionId) || [];
    checkpoints.push(checkpoint);
    this.inMemoryCheckpoints.set(missionId, checkpoints);

    if (this.repository) {
      try {
        this.repository.saveCheckpoint(checkpoint);
      } catch {
        // In-memory fallback
      }
    }

    return checkpoint;
  }

  /**
   * Get latest checkpoint for a mission
   */
  public getLatestCheckpoint(missionId: string): MissionCheckpoint | null {
    let checkpoints = this.inMemoryCheckpoints.get(missionId);
    if (!checkpoints && this.repository) {
      checkpoints = this.repository.listCheckpoints(missionId);
      this.inMemoryCheckpoints.set(missionId, checkpoints);
    }
    if (!checkpoints || checkpoints.length === 0) return null;
    return checkpoints[checkpoints.length - 1];
  }

  /**
   * Get all checkpoints for a mission
   */
  public getCheckpoints(missionId: string): MissionCheckpoint[] {
    let checkpoints = this.inMemoryCheckpoints.get(missionId);
    if (!checkpoints && this.repository) {
      checkpoints = this.repository.listCheckpoints(missionId);
      this.inMemoryCheckpoints.set(missionId, checkpoints);
    }
    return checkpoints || [];
  }

  /**
   * Verify integrity of a checkpoint
   */
  public verifyCheckpointIntegrity(checkpoint: MissionCheckpoint): boolean {
    const serialized = JSON.stringify(checkpoint.stateSnapshot);
    const computed = createHash('sha256').update(serialized).digest('hex');
    return computed === checkpoint.checksum;
  }
}
