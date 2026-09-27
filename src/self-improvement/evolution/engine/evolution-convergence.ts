/**
 * HṚṢĪKEŚA (हृषीकेश) — Evolution Convergence & Anti-Infinite-Loop Engine
 *
 * Guarantees bounded termination of autonomous self-development experiments.
 * Prevents endless recursion, hypothesis oscillation, and host exhaustion.
 */

import { EvolutionObjective, EvolutionExperiment } from '../types/evolution.types.js';
import { ResourceGovernor } from '../../../core/hardware/resource.governor.js';

export type ConvergenceAction =
  | 'CONTINUE'
  | 'CHANGE_STRATEGY'
  | 'ROLLBACK'
  | 'PAUSE'
  | 'STOP'
  | 'EMERGENCY_STOP';

export interface ConvergenceEvaluation {
  action: ConvergenceAction;
  reason: string;
  details?: Record<string, unknown>;
}

export type FailureCategory =
  | 'ENV_DEFECT'
  | 'COMPILATION_ERROR'
  | 'HYPOTHESIS_REGRESSION'
  | 'BOUNDARY_BREACH';

export class EvolutionConvergenceEngine {
  /**
   * Classifies an experiment failure reason into its root cause category.
   */
  public classifyFailure(reason: string, details?: Record<string, unknown>): FailureCategory {
    const text = (reason + ' ' + JSON.stringify(details || {})).toLowerCase();
    if (text.includes('boundary') || text.includes('tier 0') || text.includes('prohibited') || text.includes('secret')) {
      return 'BOUNDARY_BREACH';
    }
    if (
      text.includes('cannot find module') ||
      text.includes('ts2307') ||
      text.includes('baseline compiler check') ||
      text.includes('node_modules') ||
      text.includes('environment defect') ||
      text.includes('worktree checkout')
    ) {
      return 'ENV_DEFECT';
    }
    if (text.includes('typecheck failed') || text.includes('compil') || text.includes('syntax')) {
      return 'COMPILATION_ERROR';
    }
    return 'HYPOTHESIS_REGRESSION';
  }

  /**
   * Evaluates the experiment trajectory to enforce bounded, safe convergence.
   */
  public evaluateConvergence(
    objective: EvolutionObjective,
    history: EvolutionExperiment[],
    currentExperiment: EvolutionExperiment,
    resourceGovernor?: ResourceGovernor
  ): ConvergenceEvaluation {
    // 1. Check Experiment Limit Exceeded
    if (history.length >= objective.maxExperiments) {
      return {
        action: 'STOP',
        reason: `Reached maximum allowed experiment budget (${objective.maxExperiments} experiments). Halting iteration.`,
        details: { totalExperiments: history.length, maxExperiments: objective.maxExperiments },
      };
    }

    // 2. Check Host Resource Pressure (16GB RAM Protection)
    if (resourceGovernor) {
      const metrics = resourceGovernor.getMetrics();
      if (metrics.pressureLevel === 'CRITICAL_MEMORY') {
        return {
          action: 'PAUSE',
          reason: `Host memory pressure is CRITICAL (${metrics.freeMemoryGb.toFixed(2)} GB free). Pausing to protect host system.`,
          details: { freeMemoryGb: metrics.freeMemoryGb, pressure: metrics.pressureLevel },
        };
      }
    }

    // 3. Check for Duplicate / Equivalent Hypotheses
    const normalizedCurrentHypothesis = currentExperiment.hypothesis.toLowerCase().trim();
    const duplicateCount = history.filter(
      (h) => h.hypothesis.toLowerCase().trim() === normalizedCurrentHypothesis
    ).length;

    if (duplicateCount >= 2) {
      return {
        action: 'PAUSE',
        reason: `Repeated equivalent hypothesis detected (${duplicateCount + 1} times): "${currentExperiment.hypothesis}". Stopping redundant attempts.`,
        details: { hypothesis: currentExperiment.hypothesis, occurrences: duplicateCount + 1 },
      };
    }

    // 4. Check for Consecutive Identical Failures (Only Genuine Hypothesis Regressions Count Against Stagnation)
    const recent = history.slice(-objective.maxConsecutiveFailures);
    const consecutiveHypothesisFailures = recent.filter((h) => {
      const isFailed = h.decision === 'REJECTED' || h.decision === 'ROLLED_BACK';
      if (!isFailed) return false;
      const category = this.classifyFailure(h.decisionReason || '');
      // Environment defects do not penalize the objective
      return category === 'HYPOTHESIS_REGRESSION' || category === 'COMPILATION_ERROR';
    }).length;

    if (recent.length >= objective.maxConsecutiveFailures && consecutiveHypothesisFailures >= objective.maxConsecutiveFailures) {
      return {
        action: 'PAUSE',
        reason: `Stagnation: ${consecutiveHypothesisFailures} consecutive hypothesis experiments regressed. Strategy change or human review required.`,
        details: { consecutiveFailures: consecutiveHypothesisFailures, threshold: objective.maxConsecutiveFailures },
      };
    }

    // 5. Check for Regression Oscillation
    if (history.length >= 4) {
      const lastFour = history.slice(-4);
      const isOscillating =
        lastFour[0].decision === 'ACCEPTED' &&
        lastFour[1].decision === 'ROLLED_BACK' &&
        lastFour[2].decision === 'ACCEPTED' &&
        lastFour[3].decision === 'ROLLED_BACK';

      if (isOscillating) {
        return {
          action: 'CHANGE_STRATEGY',
          reason: 'Regression oscillation detected: Code alternating between temporary gain and subsequent regression. Re-anchoring baseline.',
        };
      }
    }

    // 6. Check for No Measurable Improvement (Stagnation)
    if (history.length >= objective.stagnationThreshold) {
      const lastN = history.slice(-objective.stagnationThreshold);
      const acceptedCount = lastN.filter((h) => h.decision === 'ACCEPTED').length;
      if (acceptedCount === 0) {
        return {
          action: 'CHANGE_STRATEGY',
          reason: `No measurable progress in the last ${objective.stagnationThreshold} experiments. Adapting hypothesis space.`,
        };
      }
    }

    return {
      action: 'CONTINUE',
      reason: 'Convergence nominal. Iteration proceeding within safety and resource bounds.',
    };
  }

  /**
   * Convenience helper to evaluate convergence on history.
   */
  public checkConvergence(
    history: Array<{ hypothesis: string; decision?: string }>,
    options: { maxExperiments?: number; maxConsecutiveFailures?: number; stagnationThreshold?: number } = {}
  ): { converged: boolean; decision: 'CONTINUE' | 'PAUSE' | 'STOP' | 'CHANGE_STRATEGY'; reason: string } {
    const objective: any = {
      maxExperiments: options.maxExperiments || 10,
      maxConsecutiveFailures: options.maxConsecutiveFailures || 3,
      stagnationThreshold: options.stagnationThreshold || 4,
    };
    const current: any = history[history.length - 1] || { hypothesis: 'candidate' };
    const past = history.slice(0, -1).map((h) => ({
      ...h,
      decision: h.decision === 'REJECT' ? 'REJECTED' : h.decision,
    }));
    const res = this.evaluateConvergence(objective, past as any, current as any);
    return {
      converged: res.action !== 'CONTINUE',
      decision: (res.action === 'PAUSE' ? 'PAUSE' : res.action === 'STOP' ? 'STOP' : res.action === 'CHANGE_STRATEGY' ? 'CHANGE_STRATEGY' : 'CONTINUE'),
      reason: res.reason,
    };
  }
}
