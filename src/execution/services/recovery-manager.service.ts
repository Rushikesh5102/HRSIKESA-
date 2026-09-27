/**
 * HṚṢĪKEŚA (हृषीकेश) — Recovery Manager Service
 *
 * FP-19: Startup Crash Recovery, Worker Failure Handling,
 * Resumption from Checkpoints, and Distributed Job Migration.
 */

import { randomUUID } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ExecutionRepository } from '../repositories/execution.repository.js';
import { LeaseFencingService } from './lease-fencing.service.js';
import { CheckpointService } from './checkpoint.service.js';
import { ExecutionJob, JobState } from '../interfaces/execution.types.js';

export interface StartupRecoveryReport {
  recoveredJobsCount: number;
  migratedJobsCount: number;
  failedJobsCount: number;
  requeuedJobsCount: number;
  interruptedJobsCount?: number;
  recoveredJobs: Array<{ jobId: string; lastCheckpointStep?: number }>;
  failedJobs?: Array<{ jobId: string }>;
  details: Array<{ jobId: string; action: string; previousState: JobState; newState: JobState }>;
}

export class RecoveryManagerService {
  private readonly repository: ExecutionRepository;
  private readonly leaseFencing: LeaseFencingService;
  private readonly checkpointService: CheckpointService;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(
    repository: ExecutionRepository,
    leaseFencing: LeaseFencingService,
    checkpointService: CheckpointService,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.repository = repository;
    this.leaseFencing = leaseFencing;
    this.checkpointService = checkpointService;
    this.eventBus = eventBus;
    this.logger = logger?.child('RecoveryManagerService');
  }

  // ==========================================
  // 1. STARTUP RECOVERY
  // ==========================================

  public onStartupRecovery(): StartupRecoveryReport {
    this.logger?.info('Starting startup execution crash recovery audit...');
    const inFlightJobs = this.repository.getInFlightJobs();
    const report: StartupRecoveryReport = {
      recoveredJobsCount: 0,
      migratedJobsCount: 0,
      failedJobsCount: 0,
      requeuedJobsCount: 0,
      interruptedJobsCount: inFlightJobs.length,
      recoveredJobs: [],
      failedJobs: [],
      details: [],
    };

    for (const job of inFlightJobs) {
      const previousState = job.state;
      const latestCheckpoint = this.checkpointService.getLatestCheckpoint(job.id);

      const attempt = job.attempt ?? 0;
      const maxAttempts = job.maxAttempts ?? 3;

      // Check attempt budget
      if (attempt >= maxAttempts) {
        this.repository.updateJob(job.id, {
          state: 'FAILED',
          errorMessage: `Maximum retry attempts (${maxAttempts}) exceeded during crash recovery`,
          completedAt: new Date().toISOString(),
        });
        report.failedJobsCount++;
        report.failedJobs!.push({ jobId: job.id });
        report.details.push({
          jobId: job.id,
          action: 'FAIL_MAX_ATTEMPTS',
          previousState,
          newState: 'FAILED',
        });
        this.eventBus?.emit('execution.failed', { jobId: job.id, reason: 'CRASH_RECOVERY_EXHAUSTED' });
        continue;
      }

      // On startup recovery, in-flight jobs are safely requeued to QUEUED with preserved checkpoints
      if (job.leaseToken) {
        this.leaseFencing.releaseLease(job.leaseToken);
      }
      const activeLease = this.repository.getActiveLeaseForJob(job.id);
      if (activeLease) {
        this.leaseFencing.releaseLease(activeLease.leaseToken);
      }

      this.repository.updateJob(job.id, {
        state: 'QUEUED',
        assignedWorkerId: undefined,
        leaseToken: undefined,
        checkpointId: latestCheckpoint ? latestCheckpoint.id : undefined,
        attempt: attempt + 1,
      });

      report.recoveredJobsCount++;
      report.requeuedJobsCount++;
      report.recoveredJobs.push({ jobId: job.id, lastCheckpointStep: latestCheckpoint?.stepNumber });
      report.details.push({
        jobId: job.id,
        action: latestCheckpoint ? 'RESUME_CHECKPOINT_REQUEUE' : 'REQUEUE_FOR_PLACEMENT',
        previousState,
        newState: 'QUEUED',
      });
      this.eventBus?.emit('execution.queued', { jobId: job.id, reason: 'CRASH_RECOVERY_REQUEUE' });
    }

    this.logger?.info(
      `Crash recovery complete: ${report.recoveredJobsCount} recovered, ${report.requeuedJobsCount} requeued, ${report.failedJobsCount} failed.`
    );
    return report;
  }

  public recoverOnStartup(): StartupRecoveryReport {
    return this.onStartupRecovery();
  }

  // ==========================================
  // 2. WORKER FAILURE HANDLING
  // ==========================================

  public handleWorkerFailure(workerId: string, reason = 'WORKER_UNREACHABLE'): ExecutionJob[] {
    this.logger?.warn(`Handling worker failure for [${workerId}]: ${reason}`);
    const worker = this.repository.getWorkerById(workerId);
    if (worker) {
      this.repository.updateWorker(workerId, {
        status: 'OFFLINE',
        health: 'UNHEALTHY',
      });
    }

    // Find affected jobs: assigned to worker OR active lease belongs to worker
    const inFlightJobs = this.repository.getInFlightJobs();
    const affectedJobIds = new Set<string>();

    for (const job of inFlightJobs) {
      if (job.assignedWorkerId === workerId) {
        affectedJobIds.add(job.id);
      } else {
        const lease = this.repository.getActiveLeaseForJob(job.id);
        if (lease && lease.workerId === workerId) {
          affectedJobIds.add(job.id);
        }
      }
    }

    // Revoke all leases for this worker
    this.repository.revokeLeasesForWorker(workerId);

    // Requeue in-flight jobs assigned to this worker
    const affectedJobs: ExecutionJob[] = [];

    for (const jobId of affectedJobIds) {
      const job = this.repository.getJobById(jobId);
      if (!job) continue;

      const attempt = job.attempt ?? 0;
      const maxAttempts = job.maxAttempts ?? 3;

      if (attempt >= maxAttempts) {
        const failed = this.repository.updateJob(job.id, {
          state: 'FAILED',
          errorMessage: `Worker [${workerId}] failed and retry budget exhausted`,
          completedAt: new Date().toISOString(),
        });
        if (failed) affectedJobs.push(failed);
        this.eventBus?.emit('execution.failed', { jobId: job.id, reason: 'WORKER_FAILURE_EXHAUSTED' });
      } else {
        const requeued = this.repository.updateJob(job.id, {
          state: 'QUEUED',
          assignedWorkerId: undefined,
          leaseToken: undefined,
          attempt: attempt + 1,
          errorMessage: `Requeued after worker [${workerId}] failure (${reason})`,
        });
        if (requeued) affectedJobs.push(requeued);
        this.eventBus?.emit('execution.queued', { jobId: job.id, reason: 'WORKER_FAILED' });
      }
    }

    return affectedJobs;
  }

  public recoverWorkerFailure(workerId: string, reason = 'WORKER_UNREACHABLE'): number {
    return this.handleWorkerFailure(workerId, reason).length;
  }

  // ==========================================
  // 3. JOB MIGRATION
  // ==========================================

  public migrateJob(jobId: string, targetWorkerId: string): ExecutionJob {
    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found for migration: ${jobId}`);

    const targetWorker = this.repository.getWorkerById(targetWorkerId);
    if (!targetWorker) throw new Error(`Target worker not found: ${targetWorkerId}`);
    if (targetWorker.status === 'OFFLINE' || targetWorker.trustLevel === 'REVOKED') {
      throw new Error(`Target worker [${targetWorkerId}] is not available for migration`);
    }

    const previousWorkerId = job.assignedWorkerId;

    // Use leaseFencing.migrateLease
    const newLease = this.leaseFencing.migrateLease(job.id, targetWorkerId);

    // Update job state
    const updated = this.repository.updateJob(job.id, {
      state: 'ASSIGNED',
      assignedWorkerId: targetWorkerId,
      assignedRuntimeId: targetWorker.runtimeId,
      leaseToken: newLease.leaseToken,
      fencingToken: newLease.fencingToken,
    });

    // Record trace
    this.repository.createTrace({
      id: `tr_${Date.now()}_${randomUUID().slice(0, 8)}`,
      jobId: job.id,
      timestamp: new Date().toISOString(),
      eventType: 'MIGRATION',
      fromState: job.state,
      toState: 'ASSIGNED',
      workerId: targetWorkerId,
      fencingToken: newLease.fencingToken,
      details: { previousWorkerId, newWorkerId: targetWorkerId, reason: 'EXPLICIT_MIGRATION' },
    });

    this.logger?.info(`Job [${jobId}] successfully migrated from [${previousWorkerId}] to [${targetWorkerId}]`);
    this.eventBus?.emit('execution.migrating', {
      jobId,
      fromWorker: previousWorkerId,
      toWorker: targetWorkerId,
      fencingToken: newLease.fencingToken,
    });

    return updated!;
  }
}
