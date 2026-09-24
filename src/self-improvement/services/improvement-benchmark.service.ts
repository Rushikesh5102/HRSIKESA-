/**
 * HṚṢĪKEŚA (हृषीकेश) — Improvement Benchmark Service
 */

import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';
import { IImprovementBenchmarkResult, BenchmarkOutcome } from '../interfaces/self-improvement.types.js';

export class ImprovementBenchmarkService {
  private readonly repository: SelfImprovementRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(repository: SelfImprovementRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repository = repository;
    this.eventBus = eventBus;
    this.logger = logger?.child('ImprovementBenchmarkService');
  }

  public runBenchmark(input: {
    proposalId: string;
    changeSetId: string;
    metricName: string;
    unit: string;
    beforeValue: number;
    afterValue: number;
    lowerIsBetter?: boolean;
  }): IImprovementBenchmarkResult {
    const lowerIsBetter = input.lowerIsBetter !== undefined ? input.lowerIsBetter : true;
    const delta = Number((input.afterValue - input.beforeValue).toFixed(4));
    const deltaPercentage = input.beforeValue !== 0
      ? Number((((input.afterValue - input.beforeValue) / input.beforeValue) * 100).toFixed(2))
      : 0;

    let outcome: BenchmarkOutcome = 'UNCHANGED';
    if (Math.abs(deltaPercentage) >= 5) {
      if (lowerIsBetter) {
        outcome = delta < 0 ? 'IMPROVED' : 'REGRESSED';
      } else {
        outcome = delta > 0 ? 'IMPROVED' : 'REGRESSED';
      }
    }

    const bm: IImprovementBenchmarkResult = {
      id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      proposalId: input.proposalId,
      changeSetId: input.changeSetId,
      metricName: input.metricName,
      unit: input.unit,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
      delta,
      deltaPercentage,
      outcome,
      executedAt: new Date().toISOString(),
    };

    this.repository.recordBenchmarkResult(bm);

    this.eventBus?.emit('self.benchmark_completed', {
      benchmarkId: bm.id,
      proposalId: bm.proposalId,
      metricName: bm.metricName,
      outcome: bm.outcome,
      delta: bm.delta,
    });

    this.logger?.info(`Benchmark completed for [${input.proposalId}]: ${bm.metricName} -> ${bm.outcome} (${bm.deltaPercentage}%)`);
    return bm;
  }
}
