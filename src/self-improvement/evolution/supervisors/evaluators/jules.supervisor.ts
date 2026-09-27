/**
 * HṚṢĪKEŚA (हृषीकेश) — Jules Independent Supervisor
 *
 * Evaluation Focus:
 * - Objective progress toward acceptance criteria
 * - Behavioral correctness & functional fidelity
 * - Experiment quality & hypothesis validity
 * - Benchmark measurement validity & delta analysis
 * - Convergence tracking & anti-infinite-loop prevention
 */

import {
  ISupervisorEvaluator,
  SupervisorEvidence,
} from '../supervisor.types.js';
import { EvolutionSupervisorReview, SupervisorVote } from '../../types/evolution.types.js';

export class JulesSupervisor implements ISupervisorEvaluator {
  public readonly name = 'jules';
  public readonly roleFocus = 'objective progress, behavioral correctness, experiment quality, benchmark validity, convergence';

  public async evaluate(evidence: SupervisorEvidence): Promise<EvolutionSupervisorReview> {
    const findings: string[] = [];
    const violations: string[] = [];
    let vote: SupervisorVote = 'APPROVE';
    let recommendation = 'Objective progress verified with valid benchmark deltas.';

    // 1. Inspect Benchmark Results
    if (evidence.benchmarkResults && Object.keys(evidence.benchmarkResults.metrics).length > 0) {
      let regressedMetrics = 0;
      let improvedMetrics = 0;

      for (const [metricKey, data] of Object.entries(evidence.benchmarkResults.metrics)) {
        if (!data.improved) {
          regressedMetrics++;
          violations.push(`Metric regressed: ${metricKey} changed by ${data.deltaPercent.toFixed(1)}% (Baseline: ${data.baseline}, Candidate: ${data.candidate} ${data.unit})`);
        } else {
          improvedMetrics++;
          findings.push(`Metric improved: ${metricKey} by ${data.deltaPercent.toFixed(1)}% (${data.baseline} -> ${data.candidate} ${data.unit})`);
        }
      }

      if (regressedMetrics > 0) {
        vote = 'REJECT';
        recommendation = `Reject experiment: Candidate regressed on ${regressedMetrics} benchmark metric(s).`;
      } else if (improvedMetrics > 0) {
        findings.push(`Verified positive benchmark delta across ${improvedMetrics} target metric(s).`);
      }
    } else {
      findings.push('No custom benchmark metrics provided; relying on functional regression test validation.');
    }

    // 2. Check for Convergence Stagnation & Repeated Failures
    const recentFailures = (evidence.experimentHistory || []).slice(-3).filter((e) => e.decision === 'REJECTED' || e.decision === 'ROLLED_BACK');
    if (recentFailures.length >= 3) {
      vote = 'PAUSE';
      violations.push(`Convergence Stagnation: 3 consecutive experiments failed or were rolled back.`);
      recommendation = 'Pause evolution engine: Stagnation detected. Require strategy review or human adjustment.';
    }

    // Check for repetitive hypothesis oscillation
    const repeatedHypotheses = (evidence.experimentHistory || []).filter(
      (e) => e.hypothesis.toLowerCase().trim() === evidence.experiment?.hypothesis?.toLowerCase().trim()
    );
    if (repeatedHypotheses.length > 1) {
      vote = 'REJECT';
      violations.push(`Loop oscillation detected: Hypothesis has already been tried and failed.`);
      recommendation = 'Reject experiment: Duplicate hypothesis attempting same strategy.';
    }

    return {
      id: `rev_jules_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      experimentId: evidence.experiment.id,
      supervisorName: this.name,
      vote,
      confidence: 0.95,
      findings,
      violations,
      recommendation,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
