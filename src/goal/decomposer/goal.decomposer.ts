/**
 * HṚṢĪKEŚA (हृषīकेश) — Goal Decomposer
 *
 * Converts a validated GoalPlan into:
 *   IGoalMilestone[] — persistent milestone records
 *   CreateMissionOptions[] — ready to pass to the existing MissionOrchestrator
 *
 * Rules:
 * - Every milestone maps to exactly one existing mission (reuses Phase 13 engine)
 * - Agent assignments are capability-validated against AgentRegistry
 * - Incorrect capability assignments are corrected deterministically
 * - goalId and milestoneId are always stamped on created missions
 * - No duplicate mission creation for already-COMPLETED milestones
 */

import { randomUUID } from 'node:crypto';
import { AgentRegistry } from '../../agents/registry/agent.registry.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { CreateMissionOptions } from '../../agents/mission/mission.orchestrator.js';
import { DEFAULT_MISSION_BUDGET, MissionBudget } from '../../agents/interfaces/mission.types.js';
import {
  GoalPlan,
  GoalPlanMilestoneSpec,
  IGoalMilestone,
  GoalBudget
} from '../interfaces/goal.types.js';

export interface DecompositionResult {
  readonly milestones: readonly IGoalMilestone[];
  readonly missionSpecs: readonly MissionSpec[];
}

export interface MissionSpec {
  readonly milestoneId: string;
  readonly milestoneSequence: number;
  readonly createOptions: CreateMissionOptions;
}

export class GoalDecomposer {
  private readonly agentRegistry: AgentRegistry;
  private readonly logger?: ILogger;

  constructor(agentRegistry: AgentRegistry, logger?: ILogger) {
    this.agentRegistry = agentRegistry;
    this.logger = logger?.child('GoalDecomposer');
  }

  /**
   * Decompose a validated plan into milestones and mission specs.
   */
  public decompose(
    goalId: string,
    plan: GoalPlan,
    goalBudget: GoalBudget,
    context: {
      companyId?: string | null;
      projectId?: string | null;
      productId?: string | null;
    }
  ): DecompositionResult {
    this.logger?.info(`Decomposing goal '${goalId}': ${plan.milestones.length} milestones`);

    const milestones: IGoalMilestone[] = [];
    const missionSpecs: MissionSpec[] = [];

    // Budget: per-mission budget is constrained by goal budget
    const perMissionBudget: MissionBudget = {
      maxTasks: Math.max(3, Math.floor(goalBudget.maxTasks / Math.max(1, plan.milestones.length))),
      maxRetries: 2,
      maxExecutionTimeMs: Math.min(DEFAULT_MISSION_BUDGET.maxExecutionTimeMs, Math.floor(goalBudget.maxExecutionTimeMs / Math.max(1, plan.milestones.length))),
      maxAgentDepth: 2,
      maxConcurrentTasks: Math.min(goalBudget.maxConcurrentTasks, DEFAULT_MISSION_BUDGET.maxConcurrentTasks),
      maxModelCalls: Math.max(3, Math.floor(goalBudget.maxModelCalls / Math.max(1, plan.milestones.length)))
    };

    const now = new Date().toISOString();

    for (const spec of plan.milestones) {
      const milestoneId = spec.id || randomUUID();

      // Validate and select the best agent for this milestone
      const agentId = this.selectBestAgent(spec);

      const milestone: IGoalMilestone = {
        id: milestoneId,
        goalId,
        missionId: null,
        title: spec.title,
        description: spec.description,
        sequence: spec.sequence,
        status: 'PENDING',
        successCriteria: spec.successCriteria ? [...spec.successCriteria] : undefined,
        verificationCriteria: spec.verificationCriteria ? [...spec.verificationCriteria] : undefined,
        requiredAgentIds: spec.requiredAgentIds ? [...spec.requiredAgentIds] : undefined,
        requiredCapabilities: spec.requiredCapabilities ? [...spec.requiredCapabilities] : undefined,
        createdAt: now,
        updatedAt: now
      };

      milestones.push(milestone);

      // Build CreateMissionOptions for the existing MissionOrchestrator
      const missionSpec: MissionSpec = {
        milestoneId,
        milestoneSequence: spec.sequence,
        createOptions: {
          objective: spec.missionObjective,
          rootAgentId: agentId,
          context: [
            `Goal: ${goalId}`,
            `Milestone: ${spec.title} (${spec.sequence}/${plan.milestones.length})`,
            `Interpretation: ${plan.interpretation}`,
            ...(plan.constraints.length > 0 ? [`Constraints: ${plan.constraints.join('; ')}`] : [])
          ].join('\n'),
          constraints: [...(plan.constraints ?? []), ...(spec.successCriteria ?? [])],
          budget: perMissionBudget,
          companyId: context.companyId ?? undefined,
          projectId: context.projectId ?? undefined,
          productId: context.productId ?? undefined
        }
      };

      missionSpecs.push(missionSpec);
      this.logger?.debug(`Milestone '${spec.title}' → agent '${agentId}'`);
    }

    return { milestones, missionSpecs };
  }

  /**
   * Select the best registered agent for a milestone.
   * Uses AgentRegistry capability validation — never trusts LLM alone.
   */
  private selectBestAgent(spec: GoalPlanMilestoneSpec): string {
    const preferredIds = spec.requiredAgentIds ?? [];

    // Try preferred agents in order
    for (const agentId of preferredIds) {
      const agent = this.agentRegistry.get(agentId);
      if (!agent) continue;

      // Check capability compatibility
      if (spec.requiredCapabilities && spec.requiredCapabilities.length > 0) {
        const agentCaps = new Set(agent.capabilities);
        const hasAny = spec.requiredCapabilities.some(cap => agentCaps.has(cap));
        if (!hasAny) {
          this.logger?.debug(`Agent '${agentId}' lacks required capabilities for '${spec.title}'. Trying next.`);
          continue;
        }
      }

      return agentId;
    }

    // Fall back to best specialist from AgentRegistry
    const fallback = this.agentRegistry.findBestSpecialist
      ? this.agentRegistry.findBestSpecialist(spec.requiredCapabilities ?? [])
      : undefined;

    if (fallback) {
      this.logger?.debug(`Milestone '${spec.title}': using fallback specialist '${fallback.id}'`);
      return fallback.id;
    }

    // Last resort: Gāṇḍīva (engineering agent, general-purpose)
    this.logger?.warn(`Milestone '${spec.title}': no valid agent found; defaulting to 'gandiva'`);
    return 'gandiva';
  }
}
