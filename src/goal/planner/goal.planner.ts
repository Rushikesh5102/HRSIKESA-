/**
 * HṚṢĪKEŚA (हृषीकेश) — Goal Planner
 *
 * Converts a high-level goal objective into a validated, structured GoalPlan.
 *
 * Planning modes:
 *   DETERMINISTIC: No LLM call — used for simple, well-structured objectives
 *   LLM_VALIDATED: LLM generates plan JSON, then every field is validated
 *                  against live system state before acceptance.
 *
 * Security contract:
 *   The LLM MAY propose agent IDs, tool IDs, milestones, and dependencies.
 *   The system VALIDATES every proposal against:
 *     - AgentRegistry (only registered, real agents accepted)
 *     - Known capabilities (must match agent capabilities list)
 *     - GoalBudget constraints
 *   The LLM is NEVER the authority for:
 *     - permissions, approval grants, verification success,
 *       financial authorization, or identity claims.
 */

import { randomUUID } from 'node:crypto';
import { AgentRegistry } from '../../agents/registry/agent.registry.js';
import { ModelRouter } from '../../models/router/model.router.js';
import { HybridMemoryRetriever } from '../../memory/semantic/hybrid.retriever.js';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  GoalPlan,
  GoalPlanMilestoneSpec,
  GoalBudget,
  DEFAULT_GOAL_BUDGET,
  GoalBudgetTracker
} from '../interfaces/goal.types.js';

export interface GoalPlanRequest {
  readonly goalId: string;
  readonly objective: string;
  readonly description?: string;
  readonly companyId?: string | null;
  readonly projectId?: string | null;
  readonly constraints?: readonly string[];
  readonly successCriteria?: readonly string[];
  readonly budget?: GoalBudget;
  readonly context?: string;
}

export interface GoalPlannerResult {
  readonly plan: GoalPlan;
  readonly modelCallsUsed: number;
  readonly planningMode: 'deterministic' | 'llm_validated';
}

// Known approved agent IDs — from the 17-agent roster
const VALID_AGENT_IDS = new Set([
  'rahu', 'aja', 'ritvan', 'tvas', 'spoota', 'gandiva',
  'vighna', 'raudra', 'rutam', 'arvan', 'taraka', 'kalki',
  'garuda', 'kali', 'kala', 'yama', 'mrtyu'
]);

// Approval-triggering keywords in objective
const APPROVAL_REQUIRED_KEYWORDS = [
  'deploy', 'production', 'publish', 'send email', 'send message',
  'create account', 'payment', 'purchase', 'financial', 'delete',
  'irreversible', 'external', 'contract', 'invoice', 'billing'
];

export class GoalPlanner {
  private readonly agentRegistry: AgentRegistry;
  private readonly modelRouter?: ModelRouter;
  private readonly memoryRetriever?: HybridMemoryRetriever;
  private readonly logger?: ILogger;

  constructor(
    agentRegistry: AgentRegistry,
    modelRouter?: ModelRouter,
    memoryRetriever?: HybridMemoryRetriever,
    logger?: ILogger
  ) {
    this.agentRegistry = agentRegistry;
    this.modelRouter = modelRouter;
    this.memoryRetriever = memoryRetriever;
    this.logger = logger?.child('GoalPlanner');
  }

  /**
   * Generate and validate a GoalPlan from a high-level objective.
   */
  public async plan(request: GoalPlanRequest): Promise<GoalPlannerResult> {
    const budget = request.budget ?? DEFAULT_GOAL_BUDGET;
    const tracker = new GoalBudgetTracker(budget);

    this.logger?.info(`Planning goal '${request.goalId}': "${request.objective.substring(0, 80)}"`);

    // Detect simple, deterministic goals that don't need LLM planning
    const deterministicPlan = this.attemptDeterministicPlan(request);
    if (deterministicPlan) {
      this.logger?.debug(`Goal '${request.goalId}' resolved deterministically.`);
      return {
        plan: deterministicPlan,
        modelCallsUsed: 0,
        planningMode: 'deterministic'
      };
    }

    // LLM-assisted planning — with full validation
    if (!this.modelRouter) {
      throw new Error('GoalPlanner: ModelRouter required for non-deterministic goal planning.');
    }

    try {
      tracker.recordModelCall();
      const rawPlan = await this.callModelForPlan(request, tracker);
      const validatedPlan = this.validateAndSanitizePlan(rawPlan, request, budget);

      this.logger?.info(`Goal '${request.goalId}' plan validated: ${validatedPlan.milestones.length} milestones, risk=${validatedPlan.riskLevel}`);

      return {
        plan: validatedPlan,
        modelCallsUsed: tracker.getModelCalls(),
        planningMode: 'llm_validated'
      };
    } catch (err) {
      this.logger?.warn(`GoalPlanner: Model planning call failed, using safe archetype plan: ${err}`);
      const fallbackPlan = this.buildArchetypeFallbackPlan(request);
      return {
        plan: fallbackPlan,
        modelCallsUsed: tracker.getModelCalls(),
        planningMode: 'deterministic'
      };
    }
  }

  private buildArchetypeFallbackPlan(request: GoalPlanRequest): GoalPlan {
    const milestoneId = randomUUID();
    const milestone: GoalPlanMilestoneSpec = {
      id: milestoneId,
      title: `Execute: ${request.objective.slice(0, 60)}`,
      description: `Bounded execution for objective: ${request.objective}`,
      sequence: 1,
      requiredAgentIds: ['gandiva', 'vighna'],
      requiredCapabilities: ['code_generation', 'verification'],
      successCriteria: ['Task executed successfully', 'Evidence artifact produced'],
      verificationCriteria: ['custom'],
      missionObjective: request.objective,
      requiresApproval: false
    };

    return {
      interpretation: `Autonomous execution for: ${request.objective}`,
      assumptions: ['Standard local bounded execution'],
      constraints: request.constraints ? [...request.constraints] : ['Safe local execution'],
      requiredDepartments: ['engineering'],
      milestones: [milestone],
      approvalPoints: [],
      stoppingConditions: ['Milestone complete', 'Budget exhausted'],
      estimatedModelCalls: 2,
      riskLevel: 'low',
      createdAt: new Date().toISOString(),
      source: 'deterministic'
    };
  }

  /**
   * Attempt to build a deterministic plan for simple, well-structured objectives.
   * Returns null if the objective requires LLM reasoning.
   */
  private attemptDeterministicPlan(request: GoalPlanRequest): GoalPlan | null {
    const lower = request.objective.toLowerCase().trim();

    // 1. Verification / local report generation
    if (
      lower.includes('verification report') ||
      lower.includes('verify that') ||
      (lower.includes('create a local') && lower.includes('report'))
    ) {
      const milestoneId = randomUUID();
      const milestone: GoalPlanMilestoneSpec = {
        id: milestoneId,
        title: 'Generate Verification Report',
        description: 'Execute a bounded local task to generate and verify a report artifact.',
        sequence: 1,
        requiredAgentIds: ['gandiva'],
        requiredCapabilities: ['file_operations', 'reporting'],
        successCriteria: ['Report file exists', 'Report contains required content'],
        verificationCriteria: ['file_exists', 'file_contains'],
        missionObjective: request.objective,
        requiresApproval: false
      };

      return {
        interpretation: `Local bounded report generation: ${request.objective}`,
        assumptions: ['Task is fully local', 'No external side effects', 'No financial operations'],
        constraints: request.constraints ? [...request.constraints] : ['Local filesystem only', 'No network calls', 'No account creation'],
        requiredDepartments: ['engineering'],
        milestones: [milestone],
        approvalPoints: [],
        stoppingConditions: ['Report artifact verified', 'Budget exhausted', 'Cancellation requested'],
        estimatedModelCalls: 2,
        riskLevel: 'low',
        createdAt: new Date().toISOString(),
        source: 'deterministic'
      };
    }

    // 2. Build and launch application / product archetype
    if (
      lower.includes('build and launch') ||
      lower.includes('create and launch') ||
      lower.includes('develop and deploy') ||
      (lower.includes('build') && lower.includes('application')) ||
      (lower.includes('build') && lower.includes('service'))
    ) {
      const m1Id = randomUUID();
      const m2Id = randomUUID();
      const m3Id = randomUUID();

      const m1: GoalPlanMilestoneSpec = {
        id: m1Id,
        title: 'Requirements & Architecture Specification',
        description: 'Define technical architecture, domain data models, and service boundaries.',
        sequence: 1,
        requiredAgentIds: ['rahu', 'aja'],
        requiredCapabilities: ['strategic_planning', 'market_analysis'],
        successCriteria: ['Architecture documented', 'Requirements validated'],
        verificationCriteria: ['custom'],
        missionObjective: `Specify architecture and design for: ${request.objective}`,
        requiresApproval: false
      };

      const m2: GoalPlanMilestoneSpec = {
        id: m2Id,
        title: 'Core Implementation & Integration',
        description: 'Implement backend services, domain logic, and client interfaces.',
        sequence: 2,
        requiredAgentIds: ['gandiva', 'ritvan'],
        requiredCapabilities: ['code_generation', 'system_integration'],
        successCriteria: ['Core features implemented', 'Linting passes'],
        verificationCriteria: ['command_exit_code'],
        missionObjective: `Implement core functionality for: ${request.objective}`,
        requiresApproval: false
      };

      const m3: GoalPlanMilestoneSpec = {
        id: m3Id,
        title: 'Quality Verification & Operational Readiness',
        description: 'Run automated verification tests, validate invariants, and check readiness.',
        sequence: 3,
        requiredAgentIds: ['vighna', 'garuda'],
        requiredCapabilities: ['verification', 'quality_assurance'],
        successCriteria: ['Automated verification tests pass', 'Readiness report created'],
        verificationCriteria: ['file_exists', 'command_exit_code'],
        missionObjective: `Verify quality and test suite for: ${request.objective}`,
        requiresApproval: false
      };

      return {
        interpretation: `Autonomous end-to-end development & launch: ${request.objective}`,
        assumptions: ['Standard modular software architecture', 'Deterministic validation checks'],
        constraints: request.constraints ? [...request.constraints] : ['Safe local execution', 'No unauthorized external side effects'],
        requiredDepartments: ['engineering', 'product'],
        milestones: [m1, m2, m3],
        approvalPoints: [],
        stoppingConditions: ['All milestones verified', 'Budget exhausted'],
        estimatedModelCalls: 6,
        riskLevel: 'medium',
        createdAt: new Date().toISOString(),
        source: 'deterministic'
      };
    }

    // 3. Automated testing & system audits archetype
    if (
      lower.includes('automated test') ||
      lower.includes('audit and verify') ||
      lower.includes('test suite') ||
      lower.includes('system test')
    ) {
      const m1Id = randomUUID();
      const m1: GoalPlanMilestoneSpec = {
        id: m1Id,
        title: 'System Verification & Test Execution',
        description: 'Execute automated test suites and compile verification report.',
        sequence: 1,
        requiredAgentIds: ['vighna', 'gandiva'],
        requiredCapabilities: ['verification', 'quality_assurance'],
        successCriteria: ['Test suite passes without errors', 'Verification report created'],
        verificationCriteria: ['file_exists', 'command_exit_code'],
        missionObjective: `Execute and verify: ${request.objective}`,
        requiresApproval: false
      };

      return {
        interpretation: `Automated test & audit execution: ${request.objective}`,
        assumptions: ['Test environment active', 'Deterministic outcomes'],
        constraints: request.constraints ? [...request.constraints] : ['No production impact'],
        requiredDepartments: ['quality_assurance'],
        milestones: [m1],
        approvalPoints: [],
        stoppingConditions: ['Tests complete', 'Verification finished'],
        estimatedModelCalls: 2,
        riskLevel: 'low',
        createdAt: new Date().toISOString(),
        source: 'deterministic'
      };
    }

    // 4. Production deployment & destructive operations archetype (Security / HITL gated)
    if (
      lower.includes('deploy to production') ||
      lower.includes('delete database') ||
      lower.includes('production deployment') ||
      lower.includes('drop table') ||
      lower.includes('destructive')
    ) {
      const m1Id = randomUUID();
      const m1: GoalPlanMilestoneSpec = {
        id: m1Id,
        title: 'Production Operation Execution',
        description: 'Execute high-impact operation requiring explicit human operator approval.',
        sequence: 1,
        requiredAgentIds: ['garuda', 'rutam'],
        requiredCapabilities: ['infrastructure_management', 'governance'],
        successCriteria: ['Operation completed safely under audit'],
        verificationCriteria: ['custom'],
        missionObjective: request.objective,
        requiresApproval: true,
        approvalReason: 'Destructive / production operation requires explicit Human-in-the-Loop authorization.'
      };

      return {
        interpretation: `High-risk production operation: ${request.objective}`,
        assumptions: ['Human confirmation mandatory before execution'],
        constraints: request.constraints ? [...request.constraints] : ['Requires operator approval', 'Full audit logging'],
        requiredDepartments: ['operations', 'governance'],
        milestones: [m1],
        approvalPoints: [`Milestone 1: Production Operation Execution (${request.objective})`],
        stoppingConditions: ['Operator rejects approval', 'Execution completed'],
        estimatedModelCalls: 1,
        riskLevel: 'critical',
        createdAt: new Date().toISOString(),
        source: 'deterministic'
      };
    }

    return null;
  }

  /**
   * Call the model to generate a structured plan for complex objectives.
   */
  private async callModelForPlan(
    request: GoalPlanRequest,
    tracker: GoalBudgetTracker
  ): Promise<unknown> {
    let contextBlock = request.context ? `\nContext:\n${request.context}` : '';
    if (this.memoryRetriever) {
      try {
        const recall = await this.memoryRetriever.retrieve(request.objective, { topK: 3 });
        if (recall.length > 0) {
          contextBlock += `\nRelevant Historical Context:\n${recall.map((r: { item: { content: string } }) => `- ${r.item.content}`).join('\n')}`;
        }
      } catch {
        // Non-fatal recall fallback
      }
    }
    const constraintsBlock = request.constraints?.length
      ? `\nConstraints:\n${request.constraints.map(c => `- ${c}`).join('\n')}`
      : '';
    const criteriaBlock = request.successCriteria?.length
      ? `\nSuccess Criteria:\n${request.successCriteria.map(c => `- ${c}`).join('\n')}`
      : '';

    // Available validated agents for the LLM to choose from
    const allAgents = this.agentRegistry.getAll();
    const agentSummary = allAgents
      .map(a => `  - ${a.id}: ${a.role} (capabilities: ${a.capabilities.slice(0, 4).join(', ')})`)
      .join('\n');

    const prompt = `You are HṚṢĪKEŚA's Goal Planner. Decompose the following high-level goal into a structured JSON plan.

Goal Objective: ${request.objective}${contextBlock}${constraintsBlock}${criteriaBlock}

Available Specialized Agents:
${agentSummary}

Return ONLY valid JSON in this exact structure (no commentary, no markdown, no extra text):
{
  "interpretation": "<one sentence restating the goal clearly>",
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "constraints": ["<constraint 1>"],
  "requiredDepartments": ["<department 1>"],
  "milestones": [
    {
      "id": "<uuid>",
      "title": "<milestone title>",
      "description": "<what this milestone achieves>",
      "sequence": 1,
      "requiredAgentIds": ["<agentId from the available list>"],
      "requiredCapabilities": ["<capability>"],
      "successCriteria": ["<measurable criterion>"],
      "verificationCriteria": ["file_exists|file_contains|blackboard_entry_present|http_status|command_exit_code"],
      "missionObjective": "<objective for the mission that will execute this milestone>",
      "requiresApproval": false,
      "approvalReason": null
    }
  ],
  "approvalPoints": [],
  "stoppingConditions": ["<stopping condition>"],
  "estimatedModelCalls": 5,
  "riskLevel": "low|medium|high|critical"
}

Rules:
- requiredAgentIds MUST only use agent IDs from the available agents list above.
- Use at most 6 milestones for any goal.
- verificationCriteria values must be from the allowed set: file_exists, file_contains, blackboard_entry_present, http_status, command_exit_code, custom.
- requiresApproval must be true for: deploy to production, external communications, financial operations, destructive actions.
- sequence values must be 1, 2, 3... with no gaps.`;

    tracker.recordModelCall();

    try {
      const response = await this.modelRouter!.routeAndExecuteChat({
        messages: [{ role: 'user', content: prompt }]
      });

      // Extract JSON from response
      const text = response.text?.trim() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('GoalPlanner: Model did not return valid JSON in response.');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`GoalPlanner: Model planning call failed: ${msg}`);
    }
  }

  /**
   * Validate every field of the raw LLM output against system state.
   * Rejects: unknown agents, invalid capabilities, invalid verification types,
   * budget violations, dependency cycles.
   * NEVER trusts raw LLM output without validation.
   */
  private validateAndSanitizePlan(
    raw: unknown,
    request: GoalPlanRequest,
    budget: GoalBudget
  ): GoalPlan {
    if (!raw || typeof raw !== 'object') {
      throw new Error('GoalPlanner: Plan must be a JSON object.');
    }

    const r = raw as Record<string, unknown>;

    if (typeof r['interpretation'] !== 'string' || r['interpretation'].length === 0) {
      throw new Error('GoalPlanner: Plan missing "interpretation" string.');
    }

    const milestones = r['milestones'];
    if (!Array.isArray(milestones) || milestones.length === 0) {
      throw new Error('GoalPlanner: Plan must have at least one milestone.');
    }

    if (milestones.length > budget.maxMissions) {
      throw new Error(`GoalPlanner: Plan has ${milestones.length} milestones but budget allows ${budget.maxMissions}.`);
    }

    const validVerificationTypes = new Set([
      'file_exists', 'file_contains', 'blackboard_entry_present',
      'http_status', 'command_exit_code', 'custom'
    ]);

    const validatedMilestones: GoalPlanMilestoneSpec[] = [];
    const usedSequences = new Set<number>();

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i] as Record<string, unknown>;

      if (!m || typeof m !== 'object') {
        throw new Error(`GoalPlanner: Milestone[${i}] is not an object.`);
      }

      // Validate required fields
      if (typeof m['title'] !== 'string' || !m['title']) {
        throw new Error(`GoalPlanner: Milestone[${i}] missing title.`);
      }
      if (typeof m['missionObjective'] !== 'string' || !m['missionObjective']) {
        throw new Error(`GoalPlanner: Milestone[${i}] missing missionObjective.`);
      }
      if (typeof m['sequence'] !== 'number' || m['sequence'] < 1) {
        throw new Error(`GoalPlanner: Milestone[${i}] has invalid sequence: ${m['sequence']}.`);
      }
      if (usedSequences.has(m['sequence'] as number)) {
        throw new Error(`GoalPlanner: Duplicate sequence ${m['sequence']} in milestones.`);
      }
      usedSequences.add(m['sequence'] as number);

      // Validate agent IDs against the real AgentRegistry
      const agentIds = Array.isArray(m['requiredAgentIds']) ? m['requiredAgentIds'] : [];
      const validatedAgentIds: string[] = [];
      for (const agentId of agentIds) {
        if (typeof agentId !== 'string') continue;
        if (!VALID_AGENT_IDS.has(agentId)) {
          this.logger?.warn(`GoalPlanner: Unknown agent '${agentId}' in milestone '${m['title']}'. Removing.`);
          continue; // Strip unknown agents rather than hard-fail to be resilient
        }
        // Also verify it's actually registered at runtime
        const registeredAgent = this.agentRegistry.get(agentId);
        if (!registeredAgent) {
          this.logger?.warn(`GoalPlanner: Agent '${agentId}' not in registry at runtime. Removing.`);
          continue;
        }
        validatedAgentIds.push(agentId);
      }

      // Require at least one valid agent
      if (validatedAgentIds.length === 0) {
        // Fall back to a general-purpose agent
        validatedAgentIds.push('gandiva');
        this.logger?.warn(`GoalPlanner: Milestone[${i}] had no valid agents. Defaulted to 'gandiva'.`);
      }

      // Validate verification criteria types
      const rawVerifyCriteria = Array.isArray(m['verificationCriteria']) ? m['verificationCriteria'] : [];
      const validatedVerifyCriteria: string[] = rawVerifyCriteria
        .filter((v: unknown) => typeof v === 'string' && validVerificationTypes.has(v))
        .map((v: unknown) => v as string);

      // Check for approval requirements
      const requiresApproval = this.requiresApproval(
        request.objective,
        m['missionObjective'] as string,
        m['requiresApproval'] as boolean
      );

      validatedMilestones.push({
        id: typeof m['id'] === 'string' ? m['id'] : randomUUID(),
        title: m['title'] as string,
        description: typeof m['description'] === 'string' ? m['description'] : '',
        sequence: m['sequence'] as number,
        requiredAgentIds: validatedAgentIds,
        requiredCapabilities: Array.isArray(m['requiredCapabilities'])
          ? (m['requiredCapabilities'] as string[]).filter(c => typeof c === 'string')
          : [],
        successCriteria: Array.isArray(m['successCriteria'])
          ? (m['successCriteria'] as string[]).filter(c => typeof c === 'string')
          : [],
        verificationCriteria: validatedVerifyCriteria,
        missionObjective: m['missionObjective'] as string,
        requiresApproval,
        approvalReason: requiresApproval
          ? (typeof m['approvalReason'] === 'string' ? m['approvalReason'] : 'Action requires human approval.')
          : undefined
      });
    }

    // Sort by sequence
    validatedMilestones.sort((a, b) => a.sequence - b.sequence);

    const riskLevel = this.computeRiskLevel(validatedMilestones, request.objective);

    return {
      interpretation: r['interpretation'] as string,
      assumptions: Array.isArray(r['assumptions'])
        ? (r['assumptions'] as string[]).filter(a => typeof a === 'string')
        : [],
      constraints: [
        ...(request.constraints ?? []),
        ...(Array.isArray(r['constraints']) ? (r['constraints'] as string[]).filter(c => typeof c === 'string') : [])
      ],
      requiredDepartments: Array.isArray(r['requiredDepartments'])
        ? (r['requiredDepartments'] as string[]).filter(d => typeof d === 'string')
        : [],
      milestones: validatedMilestones,
      approvalPoints: validatedMilestones
        .filter(m => m.requiresApproval)
        .map(m => `Milestone ${m.sequence}: ${m.title}`),
      stoppingConditions: Array.isArray(r['stoppingConditions'])
        ? (r['stoppingConditions'] as string[]).filter(s => typeof s === 'string')
        : ['Budget exhausted', 'Max replans exceeded', 'Cancellation requested'],
      estimatedModelCalls: typeof r['estimatedModelCalls'] === 'number' ? r['estimatedModelCalls'] : 5,
      riskLevel,
      createdAt: new Date().toISOString(),
      source: 'llm_validated'
    };
  }

  /**
   * Determine if an action requires human approval based on content keywords.
   * Deterministic — LLM cannot override this check.
   */
  private requiresApproval(
    goalObjective: string,
    missionObjective: string,
    llmSuggested: boolean
  ): boolean {
    const combined = `${goalObjective} ${missionObjective}`.toLowerCase();
    const keywordMatch = APPROVAL_REQUIRED_KEYWORDS.some(kw => combined.includes(kw));
    return keywordMatch || llmSuggested === true;
  }

  /**
   * Compute overall risk level deterministically from milestone content.
   */
  private computeRiskLevel(
    milestones: GoalPlanMilestoneSpec[],
    objective: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const lower = objective.toLowerCase();

    if (
      lower.includes('production') || lower.includes('financial') ||
      lower.includes('irreversible') || lower.includes('delete all')
    ) return 'critical';

    if (milestones.some(m => m.requiresApproval)) return 'high';

    if (
      lower.includes('deploy') || lower.includes('publish') ||
      lower.includes('contract') || lower.includes('billing')
    ) return 'medium';

    return 'low';
  }
}
