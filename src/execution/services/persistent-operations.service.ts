/**
 * HṚṢĪKEŚA (हृषीकेश) — Persistent Operations Service
 *
 * FP-19: 24/7 Execution Metrics, Multi-Pool Aggregation,
 * and Honest Non-Fabricated Operational Telemetry.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { ExecutionRepository } from '../repositories/execution.repository.js';
import { PersistentOperationsSummary } from '../interfaces/execution.types.js';

export class PersistentOperationsService {
  private readonly repository: ExecutionRepository;
  private readonly logger?: ILogger;

  constructor(repository: ExecutionRepository, logger?: ILogger) {
    this.repository = repository;
    this.logger = logger?.child('PersistentOperationsService');
  }

  // ==========================================
  // 1. COMPUTE OPERATIONS SUMMARY
  // ==========================================

  public getSummary(): PersistentOperationsSummary {
    this.logger?.debug('Computing persistent operations summary');
    const allWorkers = this.repository.listWorkers();
    const allRuntimes = this.repository.listRuntimes();
    const allJobs = this.repository.listJobs();

    const runtimeMap = new Map(allRuntimes.map(r => [r.id, r]));

    const onlineWorkers = allWorkers.filter(w => w.status === 'ONLINE' || w.status === 'BUSY');
    const activeJobs = allJobs.filter(j => j.state === 'RUNNING' || j.state === 'STARTING');
    const queuedJobs = allJobs.filter(j => j.state === 'QUEUED');
    const recoveringJobs = allJobs.filter(j => j.state === 'RECOVERING' || j.state === 'MIGRATING');
    const failedJobs = allJobs.filter(j => j.state === 'FAILED');
    const completedJobs = allJobs.filter(j => j.state === 'COMPLETED');

    // Pools aggregation
    const pools: Record<'local' | 'lan' | 'remote' | 'cloud', {
      total: number;
      online: number;
      busy: number;
      workers: number;
      capacity: number;
      activeJobs: number;
    }> = {
      local: { total: 0, online: 0, busy: 0, workers: 0, capacity: 0, activeJobs: 0 },
      lan: { total: 0, online: 0, busy: 0, workers: 0, capacity: 0, activeJobs: 0 },
      remote: { total: 0, online: 0, busy: 0, workers: 0, capacity: 0, activeJobs: 0 },
      cloud: { total: 0, online: 0, busy: 0, workers: 0, capacity: 0, activeJobs: 0 },
    };

    let nonLocalOnlineCount = 0;

    for (const w of allWorkers) {
      const runtime = runtimeMap.get(w.runtimeId);
      const locality = (runtime?.networkLocality || 'LOCAL').toLowerCase() as 'local' | 'lan' | 'remote' | 'cloud';
      const isOnline = w.status === 'ONLINE' || w.status === 'BUSY';
      const isBusy = w.status === 'BUSY';
      const isAuthorized = w.trustLevel === 'AUTHORIZED' || w.trustLevel === 'TRUSTED';

      const pool = pools[locality] || pools.local;
      pool.total++;
      pool.workers++;
      const maxConc = (w as any).maxConcurrency ?? runtime?.maxConcurrency ?? 1;
      pool.capacity += maxConc;
      pool.activeJobs += (w.currentWorkload ?? 0);

      if (isOnline) {
        pool.online++;
        if (locality !== 'local' && isAuthorized) {
          nonLocalOnlineCount++;
        }
      }
      if (isBusy) pool.busy++;
    }

    // Honest 24/7 Invariant:
    // Only claim 24/7 persistence if at least one persistent non-local worker is online AND authorized!
    const hasPersistentWorker24x7 = nonLocalOnlineCount > 0;

    // Load calculations
    const calcLoad = (pool: { total: number; busy: number }): number => {
      if (pool.total === 0) return 0.0;
      return Math.round((pool.busy / pool.total) * 100) / 100;
    };

    const localLoad = calcLoad(pools.local);
    const remoteLoad = calcLoad(pools.remote);
    const cloudLoad = calcLoad(pools.cloud);

    // Sum cost
    const estimatedCostTotalUsd = allJobs.reduce((acc, j) => acc + (j.estimatedCost || 0), 0);

    const drainingWorkers = allWorkers.filter(w => w.status === 'DRAINING' || w.drainState).length;
    const degradedWorkers = allWorkers.filter(w => w.status === 'DEGRADED' || w.health === 'DEGRADED' || w.health === 'UNHEALTHY').length;

    const cloudProviders = this.repository.listCloudProviders().map(cp => ({
      provider: (cp.metadata as any)?.provider || cp.providerType || (cp as any).provider || cp.name,
      state: cp.state,
      quotaStatus: (cp.metadata as any)?.quotaStatus || (cp as any).quotaStatus || (cp.remainingQuota != null ? 'KNOWN' : 'UNKNOWN'),
      configuredRegions: (cp.metadata as any)?.configuredRegions || (cp.region ? [cp.region] : []),
      costClass: (cp.metadata as any)?.costClass || (cp as any).costClass || (cp.isPaid ? 'PAID' : 'FREE'),
    }));

    return {
      timestamp: new Date().toISOString(),
      totalWorkers: allWorkers.length,
      activeWorkersCount: allWorkers.length,
      onlineWorkersCount: onlineWorkers.length,
      onlineWorkers: onlineWorkers.length,
      activeWorkers: allWorkers.length,
      drainingWorkers,
      degradedWorkers,
      totalJobs: allJobs.length,
      activeJobsCount: activeJobs.length,
      activeJobs: activeJobs.length,
      queuedJobsCount: queuedJobs.length,
      queuedJobs: queuedJobs.length,
      recoveringJobsCount: recoveringJobs.length,
      failedJobsCount: failedJobs.length,
      failedJobs: failedJobs.length,
      completedJobsCount: completedJobs.length,
      completedJobs: completedJobs.length,
      localLoad,
      remoteLoad,
      cloudLoad,
      estimatedCostTotalUsd: Math.round(estimatedCostTotalUsd * 100) / 100,
      hasPersistentWorker24x7,
      cloudProviders,
      pools,
    };
  }
}
