/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Restart Recovery Manager
 *
 * FP-11: Recovers in-flight workflow runs upon process boot or crash recovery
 * by inspecting persistent checkpoints and safely restoring execution.
 */

import { WorkflowRepository } from '../repository/workflow.repository.js';
import { WorkflowExecutionEngine } from '../execution/workflow.execution.engine.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface RecoveryReport {
  scannedRuns: number;
  recoveredRuns: string[];
  failedRuns: string[];
  skippedRuns: string[];
}

export class WorkflowRecoveryManager {
  private readonly repo: WorkflowRepository;
  private readonly executionEngine: WorkflowExecutionEngine;
  private readonly logger?: ILogger;

  constructor(repo: WorkflowRepository, executionEngine: WorkflowExecutionEngine, logger?: ILogger) {
    this.repo = repo;
    this.executionEngine = executionEngine;
    this.logger = logger?.child('WorkflowRecoveryManager');
  }

  /**
   * Scans for incomplete workflow runs and attempts safe restart recovery.
   */
  public async recoverIncompleteRuns(): Promise<RecoveryReport> {
    const incompleteRuns = this.repo.listIncompleteRuns();
    const report: RecoveryReport = {
      scannedRuns: incompleteRuns.length,
      recoveredRuns: [],
      failedRuns: [],
      skippedRuns: [],
    };

    if (incompleteRuns.length === 0) {
      this.logger?.info('Workflow recovery scan complete: No in-flight runs pending.');
      return report;
    }

    this.logger?.info(`Workflow recovery scan: Found ${incompleteRuns.length} incomplete run(s).`);

    for (const run of incompleteRuns) {
      try {
        if (run.status === 'WAITING_APPROVAL') {
          // Keep in waiting approval state so operator can respond
          this.logger?.info(`Run '${run.id}' is awaiting approval; preserved in WAITING_APPROVAL state.`);
          report.skippedRuns.push(run.id);
          continue;
        }

        const latestCheckpoint = this.repo.getLatestCheckpoint(run.id);
        if (latestCheckpoint) {
          // Restore variables and active nodes from checkpoint snapshot
          run.currentVariables = { ...latestCheckpoint.stateSnapshot.variables };
          run.activeNodeIds = [...latestCheckpoint.stateSnapshot.activeNodeIds];
          run.completedNodeIds = [...latestCheckpoint.stateSnapshot.completedNodeIds];
          run.status = 'RECOVERING';
          this.repo.saveRun(run);

          this.logger?.info(`Resuming run '${run.id}' from checkpoint '${latestCheckpoint.id}'`);
          await this.executionEngine.resumeRun(run.id);
          report.recoveredRuns.push(run.id);
        } else {
          // No checkpoint yet, restart from beginning if STARTING or QUEUED
          if (run.status === 'STARTING' || run.status === 'QUEUED') {
            await this.executionEngine.resumeRun(run.id);
            report.recoveredRuns.push(run.id);
          } else {
            // Cannot safely restart without checkpoint
            run.status = 'FAILED';
            run.failureReason = 'Abrupt termination before first checkpoint';
            run.completedAt = new Date().toISOString();
            this.repo.saveRun(run);
            report.failedRuns.push(run.id);
          }
        }
      } catch (err) {
        this.logger?.error(`Failed to recover workflow run '${run.id}':`, { error: String(err) });
        report.failedRuns.push(run.id);
      }
    }

    return report;
  }
}
