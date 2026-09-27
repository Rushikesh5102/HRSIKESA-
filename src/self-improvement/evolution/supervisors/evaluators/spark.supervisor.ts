/**
 * HṚṢĪKEŚA (हृषीकेश) — Spark Independent Supervisor
 *
 * Evaluation Focus:
 * - Security perimeter & filesystem isolation boundaries
 * - Child process lifecycle & zombie prevention
 * - Resource consumption (CPU, RAM, Disk) vs host thresholds
 * - Network egress telemetry & policy enforcement
 * - Unexpected anomalous behaviors & permission violations
 */

import {
  ISupervisorEvaluator,
  SupervisorEvidence,
} from '../supervisor.types.js';
import { EvolutionSupervisorReview, SupervisorVote } from '../../types/evolution.types.js';

export class SparkSupervisor implements ISupervisorEvaluator {
  public readonly name = 'spark';
  public readonly roleFocus = 'security, filesystem boundaries, processes, resources, network activity, unexpected behavior';

  public async evaluate(evidence: SupervisorEvidence): Promise<EvolutionSupervisorReview> {
    const findings: string[] = [];
    const violations: string[] = [];
    let vote: SupervisorVote = 'APPROVE';
    let recommendation = 'Security perimeter intact. No boundary, credential, or resource violations detected.';

    // 1. Filesystem Boundary Verification
    if (evidence.securityResults.boundaryViolations && evidence.securityResults.boundaryViolations.length > 0) {
      vote = 'EMERGENCY_STOP';
      violations.push(...evidence.securityResults.boundaryViolations.map((v) => `CRITICAL BOUNDARY BREAKOUT: ${v}`));
      recommendation = 'EMERGENCY STOP: Autonomous worker attempted to break out of isolated worktree boundary.';
    } else {
      findings.push('Verified all filesystem modifications strictly contained within isolated experiment worktree.');
    }

    // 2. Credential & Secret Leak Verification
    if (evidence.securityResults.credentialLeaksDetected && evidence.securityResults.credentialLeaksDetected.length > 0) {
      vote = 'EMERGENCY_STOP';
      violations.push(...evidence.securityResults.credentialLeaksDetected.map((l) => `CREDENTIAL LEAK: ${l}`));
      recommendation = 'EMERGENCY STOP: Secret or authentication token detected in candidate artifacts or diff.';
    } else {
      findings.push('Zero raw credentials, private keys, or API tokens detected in diff or logs.');
    }

    // 3. Network Activity Verification
    if (evidence.securityResults.networkAnomalies && evidence.securityResults.networkAnomalies.length > 0) {
      vote = 'EMERGENCY_STOP';
      violations.push(...evidence.securityResults.networkAnomalies.map((a) => `UNAUTHORIZED NETWORK ACTIVITY: ${a}`));
      recommendation = 'EMERGENCY STOP: Candidate experiment made unauthorized external network requests.';
    }

    // 4. Resource & Process Governance
    if (evidence.resourceUsage) {
      const memoryPressure = evidence.resourceUsage.pressureLevel as string;
      if (memoryPressure === 'CRITICAL_MEMORY') {
        vote = 'PAUSE';
        violations.push('Host memory critical (< 600MB free). Host system starvation risk.');
        recommendation = 'Pause evolution: Host memory critical. Protect 16GB host environment.';
      } else {
        findings.push(`Host resource state: ${memoryPressure || 'NORMAL'}`);
      }

      const activeProcesses = (evidence.resourceUsage.activeProcesses as number) || 0;
      if (activeProcesses > 10) {
        vote = 'PAUSE';
        violations.push(`Too many active worker processes (${activeProcesses} > 10).`);
        recommendation = 'Pause evolution: Worker process explosion detected.';
      }
    }

    // 5. Tier 0 Immutable Safety Core Check
    if (evidence.securityResults.tierViolations && evidence.securityResults.tierViolations.length > 0) {
      vote = 'EMERGENCY_STOP';
      violations.push(...evidence.securityResults.tierViolations.map((tv) => `SAFETY CORE BREACH: ${tv.reason}`));
      recommendation = 'EMERGENCY STOP: Candidate modified Tier 0 Immutable Safety Core.';
    }

    return {
      id: `rev_spark_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      experimentId: evidence.experiment.id,
      supervisorName: this.name,
      vote,
      confidence: 0.99,
      findings,
      violations,
      recommendation,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
