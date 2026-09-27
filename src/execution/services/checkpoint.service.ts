/**
 * HṚṢĪKEŚA (हृषीकेश) — Checkpoint Service
 *
 * FP-19: Periodic Execution Checkpoints, Credential Redaction,
 * and Durable State Snapshots for Failure Recovery.
 */

import { randomUUID } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { ExecutionRepository } from '../repositories/execution.repository.js';
import { JobCheckpoint } from '../interfaces/execution.types.js';

export interface CreateCheckpointInput {
  jobId: string;
  stepNumber: number;
  stepName: string;
  stateSnapshot: Record<string, unknown>;
  completedActions: string[];
  pendingActions: string[];
  artifactIds?: string[];
  memoryReferences?: string[];
  toolState?: Record<string, unknown>;
  environmentState?: Record<string, unknown>;
  retryCount?: number;
}

export class CheckpointService {
  private readonly repository: ExecutionRepository;
  private readonly logger?: ILogger;

  constructor(repository: ExecutionRepository, logger?: ILogger) {
    this.repository = repository;
    this.logger = logger?.child('CheckpointService');
  }

  // ==========================================
  // 1. CREATE CHECKPOINT
  // ==========================================

  public createCheckpoint(input: CreateCheckpointInput): JobCheckpoint {
    const job = this.repository.getJobById(input.jobId);
    if (!job) throw new Error(`Job not found for checkpoint: ${input.jobId}`);

    const id = `cp_${randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    // Redact sensitive secrets from state snapshot before saving
    const sanitizedSnapshot = this.sanitizeState(input.stateSnapshot);

    const checkpoint: JobCheckpoint = {
      id,
      jobId: input.jobId,
      stepNumber: input.stepNumber,
      stepName: input.stepName,
      stateSnapshot: sanitizedSnapshot,
      completedActions: input.completedActions,
      pendingActions: input.pendingActions,
      artifactIds: input.artifactIds || [],
      memoryReferences: input.memoryReferences || [],
      toolState: input.toolState ? this.sanitizeState(input.toolState) : undefined,
      environmentState: input.environmentState,
      retryCount: input.retryCount ?? 0,
      createdAt: now,
    };

    this.repository.createCheckpoint(checkpoint);

    // Link latest checkpoint to job
    this.repository.updateJob(input.jobId, {
      checkpointId: id,
    });

    this.logger?.info(`Checkpoint created [${id}] for job [${input.jobId}] at step ${input.stepNumber} (${input.stepName})`);
    return checkpoint;
  }

  // ==========================================
  // 2. RETRIEVE CHECKPOINTS
  // ==========================================

  public getLatestCheckpoint(jobId: string): JobCheckpoint | null {
    return this.repository.getLatestCheckpointForJob(jobId);
  }

  public listCheckpoints(jobId: string): JobCheckpoint[] {
    return this.repository.listCheckpointsForJob(jobId);
  }

  // ==========================================
  // 3. INTEGRITY VERIFICATION
  // ==========================================

  public verifyCheckpointIntegrity(checkpointId: string): { isValid: boolean; stepNumber?: number; reason?: string } {
    const cp = this.repository.getCheckpointById(checkpointId);
    if (!cp) {
      return { isValid: false, reason: `Checkpoint [${checkpointId}] not found` };
    }
    return {
      isValid: true,
      stepNumber: cp.stepNumber,
    };
  }

  // ==========================================
  // 4. CREDENTIAL SANITIZATION
  // ==========================================

  private sanitizeState(data: Record<string, unknown>): Record<string, unknown> {
    const copy = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    this.recursiveRedact(copy);
    return copy;
  }

  private recursiveRedact(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.recursiveRedact(item);
      }
      return;
    }

    const record = obj as Record<string, unknown>;
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'access_token', 'refresh_token', 'privateKey', 'auth'];

    for (const [key, value] of Object.entries(record)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(s => lowerKey.includes(s.toLowerCase()));

      if (isSensitive && typeof value === 'string') {
        if (!value.startsWith('vault://')) {
          record[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        this.recursiveRedact(value);
      }
    }
  }
}
