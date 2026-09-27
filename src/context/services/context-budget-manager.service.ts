/**
 * HṚṢĪKEŚA (हृषीकेश) — Context Budget Manager Service
 *
 * Track A / INT-007: Cognitive Context Engine
 * Enforces adaptive context token/character limits aligned with INT-004 context tiers
 * and ResourceGovernor memory pressure states.
 */

import { ContextBudget, ContextRequest, TaskComplexity } from '../interfaces/context.types.js';
import { ResourceGovernor } from '../../core/hardware/resource.governor.js';

export class ContextBudgetManagerService {
  private readonly governor?: ResourceGovernor;

  constructor(governor?: ResourceGovernor) {
    this.governor = governor;
  }

  /**
   * Calculates the adaptive context budget for a given tier and task complexity.
   */
  public allocateBudget(
    request: ContextRequest,
    complexity: TaskComplexity,
    tierHint?: number
  ): ContextBudget {
    // Check explicit request budget
    if (request.modelContextBudget?.maxTokens || request.modelContextBudget?.maxChars) {
      const tier = request.modelContextBudget.tier ?? 3;
      const maxTokens = request.modelContextBudget.maxTokens ?? 1000;
      const maxChars = request.modelContextBudget.maxChars ?? (maxTokens * 4);
      return {
        tier,
        maxTokens,
        maxChars,
        usedTokens: 0,
        usedChars: 0,
      };
    }

    // Determine base tier
    let tier = tierHint;
    if (tier === undefined) {
      if (complexity === 'SIMPLE') tier = 1;
      else if (complexity === 'STANDARD') tier = 2;
      else if (complexity === 'COMPLEX') tier = 3;
      else if (complexity === 'RESEARCH_DEEP') tier = 4;
      else tier = 3;
    }

    // Baseline limits based on INT-004
    if (tier === 0) {
      return {
        tier: 0,
        maxTokens: 0,
        maxChars: 0,
        usedTokens: 0,
        usedChars: 0,
      };
    }

    let maxTokens = 600;
    let maxChars = 2400;

    switch (tier) {
      case 1:
        maxTokens = 50;
        maxChars = 200;
        break;
      case 2:
        maxTokens = 300;
        maxChars = 1200;
        break;
      case 3:
        maxTokens = 800;
        maxChars = 3200;
        break;
      case 4:
      default:
        maxTokens = 2000;
        maxChars = 8000;
        break;
    }

    // Adaptive adjustment based on ResourceGovernor pressure (Section 30)
    if (this.governor) {
      const metrics = this.governor.getMetrics();
      const pressure = metrics.pressureLevel;
      if (pressure === 'CRITICAL_MEMORY') {
        maxTokens = Math.max(50, Math.floor(maxTokens * 0.5));
        maxChars = Math.max(200, Math.floor(maxChars * 0.5));
      } else if (pressure === 'LOW_MEMORY') {
        maxTokens = Math.max(50, Math.floor(maxTokens * 0.75));
        maxChars = Math.max(200, Math.floor(maxChars * 0.75));
      }
    }

    return {
      tier,
      maxTokens,
      maxChars,
      usedTokens: 0,
      usedChars: 0,
    };
  }

  public calculateBudget(tier: number, complexity: TaskComplexity): ContextBudget {
    return this.allocateBudget({ userMessage: '' }, complexity, tier);
  }
}
