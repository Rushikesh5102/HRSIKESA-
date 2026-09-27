/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Checkpoint Manager
 *
 * FP-11: Manages idempotent state snapshots and restart recovery checkpoints
 * after meaningful node transitions.
 */

import crypto from 'node:crypto';
import { WorkflowRepository } from '../repository/workflow.repository.js';
import { WorkflowCheckpoint, WorkflowRun } from '../types/workflow.types.js';

export class WorkflowCheckpointManager {
  private readonly repo: WorkflowRepository;

  constructor(repo: WorkflowRepository) {
    this.repo = repo;
  }

  /**
   * Generates a deterministic idempotency key for a node execution in a run.
   */
  public generateIdempotencyKey(runId: string, nodeId: string, attempt: number): string {
    return crypto
      .createHash('sha256')
      .update(`${runId}:${nodeId}:${attempt}`)
      .digest('hex');
  }

  /**
   * Creates and persists a checkpoint for an active workflow run.
   */
  public createCheckpoint(
    runOrOptions: WorkflowRun | { run: WorkflowRun; nodeId: string; attempt?: number },
    nodeId?: string,
    attempt = 1
  ): WorkflowCheckpoint {
    const run = 'run' in runOrOptions ? runOrOptions.run : runOrOptions;
    const finalNodeId = 'run' in runOrOptions ? runOrOptions.nodeId : (nodeId || 'entry');
    const finalAttempt = 'run' in runOrOptions ? (runOrOptions.attempt || 1) : attempt;

    const idempotencyKey = this.generateIdempotencyKey(run.id, finalNodeId, finalAttempt);
    const checkpoint: WorkflowCheckpoint = {
      id: `wcp_${crypto.randomUUID().slice(0, 10)}`,
      runId: run.id,
      nodeId: finalNodeId,
      idempotencyKey,
      stateSnapshot: {
        status: run.status,
        variables: { ...run.currentVariables },
        activeNodeIds: [...(run.activeNodeIds || [])],
        completedNodeIds: [...(run.completedNodeIds || [])],
        iterationCounts: { ...run.iterationCounts },
        resourceUsage: { ...run.resourceUsage },
      },
      createdAt: new Date().toISOString(),
    };

    this.repo.saveCheckpoint(checkpoint);
    run.checkpointId = checkpoint.id;
    this.repo.saveRun(run);
    return checkpoint;
  }

  public getLatestCheckpoint(runId: string): WorkflowCheckpoint | null {
    return this.repo.getLatestCheckpoint(runId);
  }

  public getCheckpointByKey(key: string): WorkflowCheckpoint | null {
    return this.repo.getCheckpointByKey(key);
  }
}
