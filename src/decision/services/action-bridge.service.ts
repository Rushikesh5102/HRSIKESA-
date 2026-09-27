/**
 * HṚṢĪKEŚA (हृषीकेश) — Research-To-Action Bridge Service
 *
 * FP-18: Converts approved research outcomes and decision briefs into proposed
 * executable structures (Missions, Goals, Workflows, Skills, Creation Jobs, Environment Changes)
 * while strictly requiring operator approval before consequential execution.
 */

import {
  DecisionBrief,
  ProposedAction,
  ResearchCandidate,
} from '../interfaces/decision.types.js';

export class ActionBridgeService {
  /**
   * Compiles an implementation plan and proposed actions from a DecisionBrief and chosen candidate.
   */
  public compileImplementationPlan(
    caseId: string,
    brief: DecisionBrief,
    selectedCandidate?: ResearchCandidate
  ): {
    planSteps: string[];
    proposedActions: ProposedAction[];
  } {
    const candidateName = selectedCandidate?.name || brief.recommendation?.optionName || 'Selected Solution';
    const planSteps: string[] = [
      `Step 1: Verify host pre-requisites and disk space for ${candidateName}.`,
      `Step 2: Inspect repository license and dependencies without executing arbitrary code.`,
      `Step 3: Acquire or build local runtime in isolated sandbox workspace.`,
      `Step 4: Execute deterministic local benchmark / verification test.`,
      `Step 5: Emit operational readiness report to Rushikesh Pattiwar.`,
    ];

    const proposedActions: ProposedAction[] = [
      {
        id: `act_${Date.now()}_1`,
        caseId,
        type: 'MISSION',
        title: `Deploy and Benchmark ${candidateName}`,
        description: `Orchestrates a bounded multi-agent mission to prepare and test ${candidateName} in local sandbox.`,
        parameters: {
          targetCandidate: candidateName,
          steps: planSteps,
          tier: 'TIER_2',
        },
        requiresApproval: true,
        status: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
      },
      {
        id: `act_${Date.now()}_2`,
        caseId,
        type: 'ENVIRONMENT_CHANGE',
        title: `Configure Local Runtime Environment for ${candidateName}`,
        description: `Sets up local configuration flags and PATH entries required for ${candidateName}.`,
        parameters: {
          candidateId: selectedCandidate?.id,
          vulkanEnabled: selectedCandidate?.compatibilityDetails?.gpuVulkanSupported ?? true,
        },
        requiresApproval: true,
        status: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
      },
    ];

    return { planSteps, proposedActions };
  }
}
