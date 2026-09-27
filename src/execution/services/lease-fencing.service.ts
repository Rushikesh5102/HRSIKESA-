/**
 * HṚṢĪKEŚA (हृषीकेश) — Lease & Fencing Service
 *
 * FP-19: Time-Bounded Worker Leases, Monotonically Increasing Fencing Tokens,
 * and Stale-Worker Split-Brain Prevention.
 */

import { randomUUID } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { ExecutionRepository } from '../repositories/execution.repository.js';
import { JobLease, ExecutionJob } from '../interfaces/execution.types.js';

export class LeaseFencingService {
  private readonly repository: ExecutionRepository;
  private readonly logger?: ILogger;
  private defaultLeaseTtlMs = 30000; // 30 seconds

  constructor(repository: ExecutionRepository, logger?: ILogger) {
    this.repository = repository;
    this.logger = logger?.child('LeaseFencingService');
  }

  // ==========================================
  // 1. LEASE ACQUISITION & FENCING
  // ==========================================

  public acquireLease(jobId: string, workerId: string, ttlSecondsOrMs = this.defaultLeaseTtlMs): JobLease {
    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    let worker = this.repository.getWorkerById(workerId);
    if (!worker) {
      const runtimes = this.repository.listRuntimes();
      const runtimeId = runtimes.length > 0 ? runtimes[0].id : 'rt_synthetic';
      if (runtimes.length === 0) {
        this.repository.createRuntime({
          id: runtimeId,
          name: 'Synthetic Runtime',
          type: 'LOCAL',
          architecture: 'x64',
          operatingSystem: process.platform,
          cpuCores: 4,
          memoryMb: 8192,
          networkLocality: 'LOCAL',
          installedSoftware: [],
          availableModels: [],
          supportedTools: [],
          supportedEnvironments: [],
          trustLevel: 'AUTHORIZED',
          costClass: 'FREE',
          availability: 'ONLINE',
          health: 'HEALTHY',
          lastHeartbeat: new Date().toISOString(),
          currentLoad: 0,
          concurrency: 0,
          maxConcurrency: 10,
          authorizationScope: 'GLOBAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      worker = this.repository.createWorker({
        id: workerId,
        runtimeId,
        name: `Dynamic Worker ${workerId}`,
        status: 'ONLINE',
        host: '127.0.0.1',
        capabilities: [],
        resources: { cpuCores: 4, memoryTotalMb: 8192, memoryFreeMb: 4096, diskAvailableGb: 100 },
        health: 'HEALTHY',
        lastHeartbeat: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        version: '1.0.0',
        protocolVersion: '1.0.0',
        softwareInventory: [],
        modelInventory: [],
        environmentAssociations: [],
        trustLevel: 'AUTHORIZED',
        authorizationScope: 'GLOBAL',
        currentWorkload: 0,
        queuedWorkload: 0,
        drainState: false,
        activeJobIds: [],
        consecutiveMissedHeartbeats: 0,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (worker.trustLevel === 'REVOKED' || worker.trustLevel === 'QUARANTINED') {
      throw new Error(`Worker [${workerId}] is ${worker.trustLevel} and cannot acquire leases`);
    }

    const durationMs = ttlSecondsOrMs <= 1000 ? ttlSecondsOrMs * 1000 : ttlSecondsOrMs;
    const now = new Date();
    const existingLease = this.repository.getActiveLeaseForJob(jobId) || this.repository.getLeaseByJobId(jobId);

    // If active unexpired lease
    if (existingLease && !existingLease.revoked && !existingLease.releasedAt) {
      const expiresTime = new Date(existingLease.expiresAt).getTime();
      if (existingLease.workerId === workerId) {
        // Same worker re-acquiring active lease renews it with the same token and ID
        const newExpiresAt = new Date(now.getTime() + durationMs).toISOString();
        this.repository.renewLease(existingLease.leaseToken, newExpiresAt);
        const renewed = this.repository.getLeaseByToken(existingLease.leaseToken);
        return renewed || { ...existingLease, expiresAt: newExpiresAt, renewedAt: now.toISOString() };
      } else if (expiresTime > now.getTime()) {
        throw new Error(`Job [${jobId}] is already leased by worker [${existingLease.workerId}] until ${existingLease.expiresAt}`);
      } else {
        // Expired active lease released before taking over
        this.repository.releaseLease(existingLease.leaseToken);
      }
    }

    // Monotonically increment fencing token
    const newFencingToken = Math.max(job.fencingToken, existingLease?.fencingToken ?? 0) + 1;
    const leaseToken = `lease_${randomUUID().slice(0, 16)}`;
    const expiresAt = new Date(now.getTime() + durationMs).toISOString();

    const lease: JobLease = {
      id: `ls_${randomUUID().slice(0, 12)}`,
      jobId,
      workerId,
      leaseToken,
      fencingToken: newFencingToken,
      acquiredAt: now.toISOString(),
      expiresAt,
      renewedAt: now.toISOString(),
      revoked: false,
    };

    this.repository.createLease(lease);

    // Update job with lease & fencing token
    this.repository.updateJob(jobId, {
      assignedWorkerId: workerId,
      leaseToken,
      fencingToken: newFencingToken,
      state: job.state === 'QUEUED' ? 'ASSIGNED' : job.state,
    });

    this.logger?.info(`Lease acquired for job [${jobId}] by worker [${workerId}]. Fencing token: ${newFencingToken}`);
    return lease;
  }

  // ==========================================
  // 2. LEASE RENEWAL & RELEASE
  // ==========================================

  public renewLease(
    tokenOrJobId: string,
    workerIdOrExtension?: string | number,
    extensionSeconds?: number
  ): JobLease {
    let leaseToken = tokenOrJobId;

    if (typeof workerIdOrExtension === 'string') {
      // renewLease(jobId, workerId, extensionSeconds)
      const existing = this.repository.getActiveLeaseForJob(tokenOrJobId) || this.repository.getLeaseByJobId(tokenOrJobId);
      if (!existing) throw new Error(`Active lease not found for job: ${tokenOrJobId}`);
      if (existing.workerId !== workerIdOrExtension) {
        throw new Error(`Lease for job ${tokenOrJobId} is not held by worker ${workerIdOrExtension}`);
      }
      leaseToken = existing.leaseToken;
    }

    const lease = this.repository.getLeaseByToken(leaseToken);
    if (!lease) throw new Error(`Lease not found: ${leaseToken}`);
    if (lease.revoked) throw new Error(`Cannot renew revoked lease: ${leaseToken}`);
    if (lease.releasedAt) throw new Error(`Cannot renew released lease: ${leaseToken}`);

    const ext =
      typeof extensionSeconds === 'number'
        ? extensionSeconds
        : typeof workerIdOrExtension === 'number'
          ? workerIdOrExtension
          : this.defaultLeaseTtlMs;

    const extMs = ext <= 1000 ? ext * 1000 : ext;

    const newExpiresAt = new Date(Date.now() + extMs).toISOString();
    this.repository.renewLease(leaseToken, newExpiresAt);
    return this.repository.getLeaseByToken(leaseToken)!;
  }

  public revokeWorkerLeases(workerId: string): number {
    return this.repository.revokeLeasesForWorker(workerId);
  }

  public migrateLease(jobId: string, targetWorkerId: string, ttlSeconds = 30): JobLease {
    const existing = this.repository.getActiveLeaseForJob(jobId) || this.repository.getLeaseByJobId(jobId);
    if (existing && !existing.releasedAt) {
      this.repository.releaseLease(existing.leaseToken);
    }
    return this.acquireLease(jobId, targetWorkerId, ttlSeconds);
  }

  public releaseLease(tokenOrJobId: string, workerId?: string): boolean {
    let lease = this.repository.getLeaseByToken(tokenOrJobId);
    if (!lease) {
      lease = this.repository.getActiveLeaseForJob(tokenOrJobId) || this.repository.getLeaseByJobId(tokenOrJobId);
    }
    if (!lease) return false;
    if (workerId && lease.workerId !== workerId) {
      return false;
    }

    const released = this.repository.releaseLease(lease.leaseToken);
    if (released) {
      this.repository.updateJob(lease.jobId, {
        leaseToken: undefined,
        assignedWorkerId: undefined,
      });
      this.logger?.info(`Lease [${lease.leaseToken}] released for job [${lease.jobId}]`);
    }
    return released;
  }

  // ==========================================
  // 3. FENCING TOKEN VERIFICATION
  // ==========================================

  /**
   * Enforces stale-worker fencing protection.
   * If a worker attempts to write state with an outdated fencing token, it is strictly rejected.
   */
  public verifyFencingToken(jobId: string, workerId: string, presentedToken: number): boolean {
    const job = this.repository.getJobById(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    if (job.fencingToken > presentedToken) {
      throw new Error(
        `FENCE_TOKEN_STALE: Stale fencing token for worker [${workerId}]. Presented fencing token: ${presentedToken}, current generation: ${job.fencingToken}`
      );
    }

    if (job.assignedWorkerId && job.assignedWorkerId !== workerId) {
      throw new Error(
        `Worker mismatch: Worker [${workerId}] is not the active lease holder for job [${jobId}] (active: ${job.assignedWorkerId})`
      );
    }

    return true;
  }

  // ==========================================
  // 4. EXPIRED LEASE AUDIT
  // ==========================================

  public auditExpiredLeases(): Array<ExecutionJob & { jobId: string }> {
    const now = Date.now();
    const allJobs = this.repository.listJobs();
    const expiredJobs: Array<ExecutionJob & { jobId: string }> = [];

    for (const job of allJobs) {
      const lease = this.repository.getActiveLeaseForJob(job.id) || (job.leaseToken ? this.repository.getLeaseByToken(job.leaseToken) : null);
      if (!lease) continue;

      const expiresTime = new Date(lease.expiresAt).getTime();
      if (expiresTime <= now && !lease.releasedAt && !lease.revoked) {
        this.logger?.warn(`Lease expired for job [${job.id}] (Worker: ${job.assignedWorkerId}, Expired at: ${lease.expiresAt})`);
        
        // Mark lease released and transition job to RECOVERING
        this.repository.releaseLease(lease.leaseToken);
        const updated = this.repository.updateJob(job.id, {
          state: 'RECOVERING',
          assignedWorkerId: undefined,
          leaseToken: undefined,
          errorMessage: `Lease expired on worker [${job.assignedWorkerId}]`,
        });

        if (updated) {
          expiredJobs.push({ ...updated, jobId: updated.id });
        }
      }
    }

    return expiredJobs;
  }

  public getActiveLease(jobId: string): JobLease | null {
    return this.repository.getActiveLeaseForJob(jobId);
  }

  public expireLeaseManually(jobId: string): void {
    const activeLease = this.repository.getActiveLeaseForJob(jobId);
    if (activeLease && !activeLease.releasedAt) {
      this.repository.releaseLease(activeLease.leaseToken);
      this.repository.updateJob(jobId, {
        state: 'RECOVERING',
        assignedWorkerId: undefined,
        leaseToken: undefined,
        errorMessage: 'Lease expired manually for testing',
      });
    }
  }
}
