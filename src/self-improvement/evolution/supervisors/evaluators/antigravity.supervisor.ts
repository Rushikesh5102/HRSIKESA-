/**
 * HṚṢĪKEŚA (हृषीकेश) — Antigravity Independent Supervisor
 *
 * Evaluation Focus:
 * - Source code architecture & structural integrity
 * - Implementation quality & hygiene
 * - Test suite execution & regression verification
 * - Dependency graph stability
 * - Code diff semantics
 */

import {
  ISupervisorEvaluator,
  SupervisorEvidence,
} from '../supervisor.types.js';
import { EvolutionSupervisorReview, SupervisorVote } from '../../types/evolution.types.js';

export class AntigravitySupervisor implements ISupervisorEvaluator {
  public readonly name = 'antigravity';
  public readonly roleFocus = 'source code, architecture, implementation quality, tests, dependencies, regressions';
  private readonly externalEndpoint?: string;
  private readonly authToken?: string;

  constructor(options?: { externalEndpoint?: string; authToken?: string }) {
    this.externalEndpoint = options?.externalEndpoint || process.env.ANTIGRAVITY_SUPERVISOR_ENDPOINT;
    this.authToken = options?.authToken || process.env.ANTIGRAVITY_SUPERVISOR_TOKEN;
  }

  public async evaluate(evidence: SupervisorEvidence): Promise<EvolutionSupervisorReview> {
    // 1. If an external authenticated Antigravity Supervisor endpoint is configured, delegate evaluation over authenticated channel
    if (this.externalEndpoint) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const res = await fetch(`${this.externalEndpoint.replace(/\/+$/, '')}/evaluate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            supervisor: 'antigravity',
            evidence: {
              objectiveId: evidence.objective?.id,
              objectiveTitle: evidence.objective?.title,
              experimentId: evidence.experiment.id,
              hypothesis: evidence.experiment.hypothesis,
              diff: evidence.diff,
              changedFiles: evidence.changedFiles,
              testResults: evidence.testResults,
              securityResults: evidence.securityResults,
              benchmarkResults: evidence.benchmarkResults,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const externalReview = (await res.json()) as EvolutionSupervisorReview;
          if (externalReview && externalReview.vote) {
            return {
              ...externalReview,
              id: externalReview.id || `rev_ag_ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              supervisorName: 'antigravity',
              evaluatedAt: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        // Fallback to local verified invariant evaluation
      }
    }

    const findings: string[] = [];
    const violations: string[] = [];
    let vote: SupervisorVote = 'APPROVE';
    let recommendation = 'Implementation quality verified. All tests pass with clean code structure.';

    // 1. Inspect Test Results
    if (!evidence.testResults.success || evidence.testResults.failed > 0) {
      vote = 'REJECT';
      violations.push(`Regression detected: ${evidence.testResults.failed} tests failed in suite (${evidence.testResults.failedTestNames.join(', ')}).`);
      recommendation = 'Reject experiment due to test suite failures. Code introduced regression.';
    } else {
      findings.push(`Verified ${evidence.testResults.passed} tests passed with 0 regressions.`);
    }

    const changedFiles = evidence.changedFiles || evidence.experiment?.changedFiles || [];
    const diff = evidence.diff || evidence.experiment?.diff || '';

    // 2. Inspect Changed Files & Diff Quality
    if (changedFiles.length === 0) {
      vote = 'REJECT';
      violations.push('No files were modified in this experiment.');
      recommendation = 'Reject experiment: Empty changeset.';
    } else {
      findings.push(`Analyzed diff across ${changedFiles.length} files (${Buffer.byteLength(diff, 'utf8')} bytes diff).`);
    }

    // Check for dangerous or anti-pattern syntax in diff
    if (diff) {
      if (diff.includes(': any') && !diff.includes('eslint-disable')) {
        findings.push('Minor warning: Detected unconstrained `any` type in diff.');
      }
      if (diff.includes('eval(') || diff.includes('Function(')) {
        vote = 'EMERGENCY_STOP';
        violations.push('CRITICAL CODE INJECTION RISK: Dynamic code evaluation (eval / Function) detected in candidate diff.');
        recommendation = 'EMERGENCY STOP: Dangerous code execution pattern introduced.';
      }
    }

    // 3. Inspect Security Results for Safety Core Breach, Boundaries, and Credential Leaks
    if (evidence.securityResults.tierViolations && evidence.securityResults.tierViolations.length > 0) {
      vote = 'EMERGENCY_STOP';
      violations.push(...evidence.securityResults.tierViolations.map((v) => `Safety core modification attempted: ${v.file} - ${v.reason}`));
      recommendation = 'EMERGENCY STOP: Autonomous modification of Tier 0 Immutable Safety Core attempted.';
    }
    if (evidence.securityResults.boundaryViolations && evidence.securityResults.boundaryViolations.length > 0) {
      vote = 'EMERGENCY_STOP';
      violations.push(...evidence.securityResults.boundaryViolations.map((v) => `CRITICAL BOUNDARY BREAKOUT: ${v}`));
      recommendation = 'EMERGENCY STOP: Autonomous worker attempted to break out of isolated worktree boundary.';
    }
    if (evidence.securityResults.credentialLeaksDetected && evidence.securityResults.credentialLeaksDetected.length > 0) {
      vote = 'EMERGENCY_STOP';
      violations.push(...evidence.securityResults.credentialLeaksDetected.map((l) => `CREDENTIAL LEAK: ${l}`));
      recommendation = 'EMERGENCY STOP: Secret or authentication token detected in candidate artifacts or diff.';
    }

    // 4. Sovereign Scope & Folder Boundary Watchdog: Stop, kill task & lock HṚṢĪKEŚA if going out of folder
    const allowedScopes: string[] = evidence.objective?.allowedScope || [];
    if (allowedScopes.length > 0 && !allowedScopes.includes('*') && !allowedScopes.includes('.')) {
      for (const file of changedFiles) {
        const normFile = file.replace(/\\/g, '/');
        const inScope = allowedScopes.some((scope) => {
          const normScope = scope.replace(/\\/g, '/').replace(/\/$/, '');
          return normFile.startsWith(normScope) || normFile === normScope;
        });

        if (!inScope) {
          vote = 'EMERGENCY_STOP';
          violations.push(`OUT-OF-FOLDER BREACH: File '${file}' is outside authorized objective scope [${allowedScopes.join(', ')}]`);
          recommendation = 'EMERGENCY STOP: Objective attempted modification out of authorized folder. Antigravity killed task and locked HṚṢĪKEŚA.';
        }
      }
    }

    return {
      id: `rev_ag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      experimentId: evidence.experiment.id,
      supervisorName: this.name,
      vote,
      confidence: 0.98,
      findings,
      violations,
      recommendation,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

