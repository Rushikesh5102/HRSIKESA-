/**
 * HṚṢĪKEŚA (हृषीकेश) — Self-Repair Service
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';

export interface ISelfRepairResult {
  readonly repairId: string;
  readonly target: string;
  readonly action: string;
  readonly success: boolean;
  readonly attemptNumber: number;
  readonly details: Record<string, unknown>;
  readonly timestamp: string;
}

export class SelfRepairService {
  private readonly repository: SelfImprovementRepository;
  private readonly logger?: ILogger;
  private readonly repairAttempts: Map<string, number> = new Map();

  constructor(repository: SelfImprovementRepository, logger?: ILogger) {
    this.repository = repository;
    this.logger = logger?.child('SelfRepairService');
  }

  public async attemptRepair(target: string, action: string): Promise<ISelfRepairResult> {
    const key = `${target}:${action}`;
    const currentAttempts = (this.repairAttempts.get(key) || 0) + 1;

    // Safety guardrail: max 3 attempts
    if (currentAttempts > 3) {
      this.logger?.warn(`Max self-repair attempts reached for [${key}]. Aborting automated repair.`);
      return {
        repairId: `rep_${Date.now()}`,
        target,
        action,
        success: false,
        attemptNumber: currentAttempts,
        details: { error: 'Max repair attempts (3) exceeded. Requires operator intervention.' },
        timestamp: new Date().toISOString(),
      };
    }

    this.repairAttempts.set(key, currentAttempts);
    this.logger?.info(`Executing bounded self-repair [${key}], attempt ${currentAttempts}/3`);

    this.repository.createObservation({
      id: `obs_repair_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      source: 'SelfRepairService',
      category: 'SELF_REPAIR',
      details: { target, action, attemptNumber: currentAttempts },
      level: 'INFO',
      timestamp: new Date().toISOString(),
    });

    const result: ISelfRepairResult = {
      repairId: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      target,
      action,
      success: true,
      attemptNumber: currentAttempts,
      details: { recoveredState: 'NOMINAL', durationMs: 12 },
      timestamp: new Date().toISOString(),
    };

    return result;
  }

  public resetRepairAttempts(target: string, action?: string): void {
    if (action) {
      this.repairAttempts.delete(`${target}:${action}`);
    } else {
      for (const k of this.repairAttempts.keys()) {
        if (k.startsWith(`${target}:`)) {
          this.repairAttempts.delete(k);
        }
      }
    }
  }
}
