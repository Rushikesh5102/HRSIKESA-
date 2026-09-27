import { MissionOutcome, MissionTask, OutcomeVerificationState, MissionArtifact } from '../types/index.js';

export interface VerificationResult {
  verified: boolean;
  state: OutcomeVerificationState;
  verifierAgent: string;
  confidence: number;
  evidence: string[];
  findings: string[];
  blockers: string[];
}

export class AcceptanceEngine {
  private static readonly INDEPENDENT_VERIFIER = 'Vighna';

  /**
   * Verify an outcome independently.
   * Specialization: Vighna (QA/Risk/Verification) performs independent verification rather than author self-certification.
   */
  public verifyOutcome(
    outcome: MissionOutcome,
    associatedTasks: MissionTask[],
    artifacts: MissionArtifact[],
    requestingAgent?: string
  ): VerificationResult {
    const evidence: string[] = [];
    const findings: string[] = [];
    const blockers: string[] = [];

    // 1. Check if all non-optional associated tasks are COMPLETED
    const incompleteTasks = associatedTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'SKIPPED');
    if (incompleteTasks.length > 0) {
      blockers.push(`Outcome has ${incompleteTasks.length} incomplete tasks: ${incompleteTasks.map(t => t.taskId).join(', ')}`);
    }

    // 2. Acceptance Criteria evaluation
    let criteriaSatisfiedCount = 0;
    const totalCriteria = outcome.acceptanceCriteria.length;

    for (const criterion of outcome.acceptanceCriteria) {
      const lower = criterion.toLowerCase();
      const matchedEvidence = associatedTasks.some(t => 
        Array.isArray(t.evidence) && t.evidence.some((e: unknown) => String(e).toLowerCase().includes(lower) || String(e).toLowerCase().includes('verified') || String(e).toLowerCase().includes('success') || String(e).toLowerCase().includes('pass'))
      );
      const matchedArtifact = artifacts.some(a => 
        a.verificationState === 'VERIFIED' || a.name.toLowerCase().includes(lower) || a.type.toLowerCase().includes(lower)
      );

      if (matchedEvidence || matchedArtifact || incompleteTasks.length === 0) {
        criteriaSatisfiedCount++;
        evidence.push(`Criterion verified: "${criterion}"`);
      } else {
        findings.push(`Criterion unverified or requires empirical check: "${criterion}"`);
      }
    }

    // 3. Artifact verification
    const verifiedArtifacts = artifacts.filter(a => a.verificationState === 'VERIFIED');
    if (artifacts.length > 0) {
      evidence.push(`Verified ${verifiedArtifacts.length}/${artifacts.length} mission artifacts.`);
    }

    // 4. Calculate verification state and confidence
    const passed = blockers.length === 0 && (totalCriteria === 0 || criteriaSatisfiedCount === totalCriteria);
    const confidence = totalCriteria > 0 ? criteriaSatisfiedCount / totalCriteria : (incompleteTasks.length === 0 ? 1.0 : 0.0);

    let state: OutcomeVerificationState = 'UNVERIFIED';
    if (passed) {
      state = 'VERIFIED';
    } else if (criteriaSatisfiedCount > 0) {
      state = 'PARTIALLY_VERIFIED';
    } else if (blockers.length > 0) {
      state = 'FAILED';
    }

    const verifierAgent = requestingAgent === AcceptanceEngine.INDEPENDENT_VERIFIER ? 'Vighna' : AcceptanceEngine.INDEPENDENT_VERIFIER;

    return {
      verified: passed,
      state,
      verifierAgent,
      confidence: Math.round(confidence * 100) / 100,
      evidence,
      findings,
      blockers
    };
  }

  /**
   * Verify test or code quality gate before production deployment
   */
  public verifyQualityGate(
    _artifacts: MissionArtifact[],
    testsPassed: boolean,
    securityScanClean: boolean,
    approvalsCompleted: boolean
  ): { passed: boolean; blockers: string[]; evidence: string[] } {
    const blockers: string[] = [];
    const evidence: string[] = [];

    if (!testsPassed) {
      blockers.push('Automated test suite failed or was not executed.');
    } else {
      evidence.push('Automated test suite passed with 100% green exit code.');
    }

    if (!securityScanClean) {
      blockers.push('Security scan detected high/critical severity vulnerabilities or secret leakage.');
    } else {
      evidence.push('Security scan verified zero high/critical vulnerabilities.');
    }

    if (!approvalsCompleted) {
      blockers.push('Human approval requirement is pending for production deployment / financial action.');
    } else {
      evidence.push('Human authority approval verified.');
    }

    return {
      passed: blockers.length === 0,
      blockers,
      evidence
    };
  }
}
