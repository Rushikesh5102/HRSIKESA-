/**
 * HṚṢĪKEŚA (हृषीकेश) — Convergence Engine & Anti-Loop Safeguard
 *
 * FP-10: Detects repeated identical failure states, measures test progression,
 * enforces strict attempt and resource budgets, and halts infinite repair cycles.
 */

import {
  StructuredDiagnostic,
  RepairAttempt,
  EngineeringBudget,
  ConvergenceAssessment,
  RepairOutcome,
} from '../types/engineering.types.js';

export class ConvergenceEngine {
  private taskHistory: Map<string, RepairAttempt[]> = new Map();

  public checkConvergence(
    taskId: string,
    attemptNumber: number,
    diagnostic: StructuredDiagnostic | null,
    budget: EngineeringBudget,
    elapsedSeconds = 0
  ): ConvergenceAssessment {
    let attempts = this.taskHistory.get(taskId);
    if (!attempts) {
      attempts = [];
      this.taskHistory.set(taskId, attempts);
    }
    if (diagnostic) {
      attempts.push({
        id: `att_${attemptNumber}`,
        taskId,
        diagnosticId: diagnostic.fingerprint,
        attemptNumber,
        modelId: 'heuristic',
        proposedPatch: { reason: diagnostic.fingerprint },
        outcome: 'FAILED',
        durationMs: 100,
        createdAt: new Date().toISOString(),
      });
    }
    if (attemptNumber > budget.maxAttempts) {
      return {
        status: 'BUDGET_EXHAUSTED',
        consecutiveIdenticalFailures: 0,
        bestOutcome: this.findBestOutcome(attempts),
        shouldHalt: true,
        reason: `Maximum repair attempt budget (${budget.maxAttempts}) exhausted`,
      };
    }
    return this.assess(attempts, diagnostic, budget, elapsedSeconds);
  }

  /**
   * Evaluates task progression across attempts and decides whether to continue or halt.
   */
  public assess(
    attempts: RepairAttempt[],
    currentDiagnostic: StructuredDiagnostic | null,
    budget: EngineeringBudget,
    totalElapsedSeconds: number = 0
  ): ConvergenceAssessment {
    // 1. Success condition
    if (!currentDiagnostic) {
      return {
        status: 'CONVERGED_SUCCESS',
        consecutiveIdenticalFailures: 0,
        bestOutcome: 'RESOLVED',
        shouldHalt: true,
        reason: 'Verification completed clean with 0 failing diagnostics',
      };
    }

    // 2. Budget limits check
    if (attempts.length > budget.maxAttempts) {
      return {
        status: 'BUDGET_EXHAUSTED',
        consecutiveIdenticalFailures: 0,
        bestOutcome: this.findBestOutcome(attempts),
        shouldHalt: true,
        reason: `Maximum repair attempt budget (${budget.maxAttempts}) exhausted`,
      };
    }

    if (totalElapsedSeconds >= budget.maxDurationSeconds) {
      return {
        status: 'BUDGET_EXHAUSTED',
        consecutiveIdenticalFailures: 0,
        bestOutcome: this.findBestOutcome(attempts),
        shouldHalt: true,
        reason: `Maximum duration budget (${budget.maxDurationSeconds}s) exceeded`,
      };
    }

    // 3. Repeated Failure / Fingerprint Loop Detection
    const currentFingerprint = currentDiagnostic.fingerprint || currentDiagnostic.id;
    let consecutiveIdentical = 0;

    for (let i = attempts.length - 1; i >= 0; i--) {
      const att = attempts[i];
      const match =
        (att.diagnosticId && (att.diagnosticId === currentFingerprint || att.diagnosticId === currentDiagnostic.id)) ||
        (att.proposedPatch?.reason === currentFingerprint) ||
        (att.outcome === 'FAILED');
      if (match) {
        consecutiveIdentical++;
      } else {
        break;
      }
    }

    if (consecutiveIdentical >= 3) {
      return {
        status: 'REPEATED_FAILURE',
        consecutiveIdenticalFailures: consecutiveIdentical,
        bestOutcome: this.findBestOutcome(attempts),
        shouldHalt: true,
        reason: `Anti-Loop Safeguard: Detected ${consecutiveIdentical} consecutive identical failure cycles for diagnostic [${currentFingerprint}]. Terminating repair loop to avoid infinite cycle.`,
      };
    }

    // 4. Progress Assessment
    const lastAttempt = attempts[attempts.length - 1];
    if (lastAttempt && lastAttempt.outcome === 'REGRESSED') {
      return {
        status: 'REGRESSED',
        consecutiveIdenticalFailures: consecutiveIdentical,
        bestOutcome: this.findBestOutcome(attempts),
        shouldHalt: false,
        reason: 'Latest attempt caused regression; rollback suggested prior to next attempt.',
      };
    }

    return {
      status: 'PROGRESSING',
      consecutiveIdenticalFailures: consecutiveIdentical,
      bestOutcome: this.findBestOutcome(attempts),
      shouldHalt: false,
      reason: `Attempt #${attempts.length + 1} permitted within budget (${attempts.length + 1}/${budget.maxAttempts}).`,
    };
  }

  /**
   * Computes comparative outcome between before and after test results.
   */
  public evaluateProgress(
    before: { passed: number; failed: number },
    after: { passed: number; failed: number }
  ): RepairOutcome {
    if (after.failed === 0 && after.passed >= before.passed) {
      return 'RESOLVED';
    }
    if (after.failed < before.failed) {
      return 'IMPROVED';
    }
    if (after.failed > before.failed) {
      return 'REGRESSED';
    }
    return 'UNCHANGED';
  }

  private findBestOutcome(attempts: RepairAttempt[]): RepairOutcome {
    if (attempts.some((a) => a.outcome === 'RESOLVED')) return 'RESOLVED';
    if (attempts.some((a) => a.outcome === 'IMPROVED')) return 'IMPROVED';
    if (attempts.some((a) => a.outcome === 'UNCHANGED')) return 'UNCHANGED';
    if (attempts.some((a) => a.outcome === 'REGRESSED')) return 'REGRESSED';
    return 'FAILED';
  }
}
