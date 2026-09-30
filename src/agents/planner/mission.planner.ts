/**
 * HRSIKESA (हृषीकेश) — Vendor-Neutral Mission Planner
 *
 * Decomposes high-level objectives into structured DAG task plans with:
 * - Complexity classification (SIMPLE, STANDARD, COMPLEX)
 * - Zero-model-call fast planning for deterministic tasks
 * - Semantic memory context integration
 * - Agent capability & tool matching dynamically via AgentRegistry
 * - DAG dependency validation via TaskGraph
 * - Risk & danger tier estimation
 * - Dynamic failure replanning
 */

import { randomUUID } from 'node:crypto';
import { AgentRegistry } from '../registry/agent.registry.js';
import { ModelRouter } from '../../models/router/model.router.js';
import { HybridMemoryRetriever } from '../../memory/semantic/hybrid.retriever.js';
import { MissionPlan, PlannedTask, MissionBudget, DEFAULT_MISSION_BUDGET } from '../interfaces/mission.types.js';
import { TaskGraph } from '../tasks/task.graph.js';
import { ILogger } from '../../core/logging/logger.types.js';

export type MissionComplexity = 'SIMPLE' | 'STANDARD' | 'COMPLEX';

export interface CreatePlanOptions {
  readonly objective: string;
  readonly context?: string;
  readonly constraints?: readonly string[];
  readonly budget?: MissionBudget;
  readonly defaultAgentId?: string;
}

export class MissionPlanner {
  private readonly agentRegistry: AgentRegistry;
  private readonly modelRouter: ModelRouter;
  private readonly memoryRetriever?: HybridMemoryRetriever;
  private readonly logger?: ILogger;

  constructor(
    agentRegistry: AgentRegistry,
    modelRouter: ModelRouter,
    memoryRetriever?: HybridMemoryRetriever,
    logger?: ILogger
  ) {
    this.agentRegistry = agentRegistry;
    this.modelRouter = modelRouter;
    this.memoryRetriever = memoryRetriever;
    this.logger = logger?.child('MissionPlanner');
  }

  /**
   * Classify the complexity of a mission objective.
   */
  public classifyComplexity(objective: string): MissionComplexity {
    const lower = objective.toLowerCase().trim();

    // SIMPLE: direct verification, single file existence, single file read, simple status check
    const isSimpleFileCheck = (lower.startsWith('check whether ') || lower.startsWith('verify file ') || lower.startsWith('check if ') || lower.startsWith('does file ')) &&
      (lower.includes('exists') || lower.includes('exist') || lower.includes('present')) &&
      !lower.includes('and report') && !lower.includes('and synthesize');

    // SIMPLE: direct deterministic single-file creation with explicit text
    const isSimpleFileCreation = (lower.startsWith('create ') || lower.startsWith('write ')) &&
      (lower.includes('containing') || lower.includes('with content')) &&
      (lower.includes('.txt') || lower.includes('.json') || lower.includes('.md') || lower.includes('.log')) &&
      !lower.includes('refactor') && !lower.includes('redesign') && !lower.includes('implement a full');

    if (isSimpleFileCheck || isSimpleFileCreation) {
      return 'SIMPLE';
    }

    // COMPLEX: multi-step research, architectural refactoring, full test suite design, security audits
    const isComplex = lower.includes('refactor') ||
      lower.includes('architecture') ||
      lower.includes('redesign') ||
      lower.includes('migrate') ||
      (lower.includes('synthesize') && lower.includes('comparative'));

    if (isComplex) {
      return 'COMPLEX';
    }

    // Default to STANDARD
    return 'STANDARD';
  }

  /**
   * Decompose an objective into a validated MissionPlan.
   */
  public async createPlan(options: CreatePlanOptions): Promise<MissionPlan> {
    const budget = options.budget || DEFAULT_MISSION_BUDGET;
    const registeredAgents = this.agentRegistry.getAll();
    const complexity = this.classifyComplexity(options.objective);
    this.logger?.info(`Planning mission [Complexity: ${complexity}] for objective: "${options.objective.substring(0, 80)}"`);

    // 1. For SIMPLE missions, generate an immediate deterministic plan without calling LLM
    if (complexity === 'SIMPLE') {
      const simplePlan = this.generateSimplePlan(options, registeredAgents);
      const validation = this.validatePlan(simplePlan, budget);
      if (validation.valid) {
        this.logger?.info(`Generated instant deterministic plan for SIMPLE mission (${simplePlan.tasks.length} task(s), 0 model calls).`);
        return simplePlan;
      }
    }

    // 2. Retrieve relevant memory if available
    let memoryContext = '';
    if (this.memoryRetriever) {
      try {
        const memoryResults = await this.memoryRetriever.retrieve(options.objective, { topK: 3 });
        if (memoryResults.length > 0) {
          memoryContext = memoryResults
            .map((r) => `[${r.item.tier}] ${r.item.key}: ${r.item.content}`)
            .join('\n');
        }
      } catch (err) {
        this.logger?.warn('Failed to retrieve semantic memory for planning:', { error: String(err) });
      }
    }

    // 3. Build candidate agent roster description dynamically from AgentRegistry
    const agentDescriptions = registeredAgents
      .map((a) => `- ID: "${a.id}", Name: "${a.displayName}", Role: "${a.role}", Capabilities: [${a.capabilities.join(', ')}], AllowedTools: [${a.allowedTools.slice(0, 10).join(', ')}${a.allowedTools.length > 10 ? '...' : ''}]`)
      .join('\n');

    // 4. Ask ModelRouter for structured JSON plan or use deterministic archetype
    let generatedPlan: MissionPlan;
    try {
      generatedPlan = await this.generateStructuredPlan(
        options.objective,
        options.context,
        options.constraints,
        memoryContext,
        agentDescriptions,
        registeredAgents,
        budget
      );
    } catch (err) {
      this.logger?.warn('Model planning failed or timed out, using structured archetype planner:', { error: String(err) });
      generatedPlan = this.generateFallbackPlan(options, registeredAgents);
    }

    // 5. Validate the generated plan
    const validation = this.validatePlan(generatedPlan, budget);
    if (!validation.valid) {
      this.logger?.warn(`Generated plan was invalid (${validation.errors.join(', ')}). Falling back to safe archetype plan.`);
      generatedPlan = this.generateFallbackPlan(options, registeredAgents);
    }

    return generatedPlan;
  }

  /**
   * Validate that a plan meets all structural, agent, capability, and DAG constraints.
   */
  public validatePlan(plan: MissionPlan, budget: MissionBudget = DEFAULT_MISSION_BUDGET): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.objective || !plan.objective.trim()) {
      errors.push('Plan must have a non-empty objective.');
    }

    if (!plan.tasks || plan.tasks.length === 0) {
      errors.push('Plan must have at least one task.');
      return { valid: false, errors };
    }

    // Validate tasks against agent registry
    for (const task of plan.tasks) {
      if (!task.id) {
        errors.push('All tasks must have an ID.');
        continue;
      }
      if (!task.objective) {
        errors.push(`Task '${task.id}' is missing an objective.`);
      }

      const agentId = String(task.agentId || (task as any).assignedAgentId || '');
      const agent = this.agentRegistry.get(agentId);
      if (!agent) {
        errors.push(`Task '${task.id}' assigns non-existent agent '${agentId}'.`);
      } else if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
        const missing = task.requiredCapabilities.filter(
          (c) => !agent.capabilities.some((ac) => ac.toLowerCase() === c.toLowerCase())
        );
        if (missing.length > 0) {
          errors.push(`Agent '${agent.id}' lacks required capabilities for task '${task.id}': ${missing.join(', ')}`);
        }
      }
    }

    // Validate DAG structure
    const graph = new TaskGraph(plan.tasks, budget);
    const graphValidation = graph.validate();
    if (!graphValidation.valid) {
      errors.push(...graphValidation.errors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Revise a plan following a task failure while keeping completed tasks intact.
   */
  public async revisePlan(
    originalPlan: MissionPlan,
    failedTaskId: string,
    failureReason: string,
    _blackboardFindings: string[]
  ): Promise<MissionPlan> {
    this.logger?.info(`Revising plan for mission "${originalPlan.objective.substring(0, 40)}" after task [${failedTaskId}] failed.`);

    const remainingTasks: PlannedTask[] = [];
    for (const task of originalPlan.tasks) {
      if (task.id === failedTaskId) {
        remainingTasks.push({
          ...task,
          id: `task_${randomUUID().substring(0, 8)}`,
          title: `Recovery for ${task.title || task.id}`,
          objective: `Diagnose and resolve failure: ${failureReason}. Original task: ${task.objective}`,
          dependencies: [...task.dependencies],
          timeoutMs: task.timeoutMs
        });
      } else {
        remainingTasks.push(task);
      }
    }

    const revised: MissionPlan = {
      objective: originalPlan.objective,
      constraints: originalPlan.constraints,
      successCriteria: originalPlan.successCriteria,
      tasks: remainingTasks,
      riskLevel: originalPlan.riskLevel,
      estimatedModelCalls: originalPlan.estimatedModelCalls + 1,
      createdAt: new Date().toISOString()
    };

    return revised;
  }

  /**
   * Estimate the risk level of a mission plan.
   */
  public estimateRisk(plan: MissionPlan): 'low' | 'medium' | 'high' | 'critical' {
    let maxDanger = 0;
    for (const task of plan.tasks) {
      const danger = task.dangerLevel ?? 0;
      if (danger > maxDanger) maxDanger = danger;
    }

    if (maxDanger >= 3) return 'critical';
    if (maxDanger === 2) return 'high';
    if (maxDanger === 1) return 'medium';
    return 'low';
  }

  private async generateStructuredPlan(
    objective: string,
    context?: string,
    constraints?: readonly string[],
    memoryContext?: string,
    agentDescriptions?: string,
    registeredAgents: readonly any[] = [],
    budget: MissionBudget = DEFAULT_MISSION_BUDGET
  ): Promise<MissionPlan> {
    const validAgentIds = registeredAgents.map(a => `"${a.id}"`).join(' | ') || '"manyu" | "dhata" | "bhaga" | "indra" | "ritadhvaja"';

    const systemPrompt = `You are HṚṢĪKEŚA's strategic mission planning director. Your master is Rushikesh Pattiwar.
Your job is to break down a high-level user objective into a structured, executable task graph (DAG) assigning tasks to the canonical 33-agent workforce (12 Ādityas, 11 Rudras, 8 Vasus, Indra, Prajāpati).

CANONICAL WORKFORCE TIERS & SPECIALISTS:
- 12 Ādityas (Vision/Strategy/Gov): dhata (Strategy), mitra (Success), aryaman (Org), varuna (Gov/Compliance), amsa (Billing), bhaga (Market Intel), vivasvan (Marketing), pusa (Fulfillment), tvasta (Product/UX Specs), savita (Prototyping), parjanya (Telemetry), visnu (Sovereign Coherence)
- 11 Rudras (Engineering/QA/Security): manyu (Lead Software Eng), manu (Code Standards), mahinasa (Optimization), mahan (Refactoring), siva (Flaw Exterminator), ritadhvaja (QA/Verification), ugrareta (Security Defense), bhava (Builds/CI-CD), kala_rudra (Circuit Breaker), vamadeva (Recovery), dhritavrata (Decommissioning)
- 8 Vasus (Infrastructure/Foundations): dhara (Storage/FS), anala (Shell/Terminal), anila (Network/Events), apa (Database/Persistence), pratyusa (Scheduling/Time), prabhasa (SRE/Observability), soma (Memory/Knowledge), dhruva (Audit/Ledger)
- Operational Leaders: indra (Supreme Field Commander), prajapati (Workforce Progenitor & Evolution)

RULES:
1. Output ONLY valid JSON conforming to the schema below. No conversational prose.
2. Assign each task to the most appropriate agent from the roster based on their capabilities.
3. Keep task count concise (between 2 and ${Math.min(8, budget.maxTasks)} tasks).
4. Define explicit dependencies by task ID (e.g. "dependencies": ["task_1"]).
5. Ensure task IDs are short ("task_1", "task_2", etc.).
6. Specify verification strategy where applicable.

JSON SCHEMA:
{
  "objective": "...",
  "constraints": ["..."],
  "successCriteria": ["..."],
  "riskLevel": "low" | "medium" | "high" | "critical",
  "estimatedModelCalls": 3,
  "tasks": [
    {
      "id": "task_1",
      "title": "Short title",
      "objective": "Concrete step objective",
      "agentId": ${validAgentIds},
      "dependencies": [],
      "requiredCapabilities": ["software_engineering"],
      "expectedOutputs": ["file.txt"],
      "dangerLevel": 0 | 1 | 2 | 3 | 4,
      "verificationStrategy": {
        "type": "file_exists" | "file_contains" | "command_exit_code" | "process_running" | "blackboard_entry_present",
        "target": "path/or/name",
        "expectedValue": "value"
      }
    }
  ]
}`;

    const userPrompt = `OBJECTIVE:
${objective}

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}
${constraints && constraints.length > 0 ? `CONSTRAINTS:\n${constraints.join('\n')}\n` : ''}
${memoryContext ? `RELEVANT MEMORY:\n${memoryContext}\n` : ''}
AVAILABLE AGENTS:
${agentDescriptions}

Generate the structured JSON mission plan.`;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    try {
      const response = await this.modelRouter.routeAndExecuteChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        preferredModel: undefined,
        preferredProvider: undefined
      });

      clearTimeout(timeoutId);

      const parsedPlan = this.extractJsonPlan(response.text, objective);
      return parsedPlan;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private extractJsonPlan(content: string, fallbackObjective: string): MissionPlan {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new Error('No valid JSON structure found in planner response.');
    }

    const rawJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    if (!rawJson.tasks || !Array.isArray(rawJson.tasks) || rawJson.tasks.length === 0) {
      throw new Error('Mission plan JSON missing valid tasks array.');
    }

    return {
      objective: rawJson.objective || fallbackObjective,
      constraints: Array.isArray(rawJson.constraints) ? rawJson.constraints : [],
      successCriteria: Array.isArray(rawJson.successCriteria) ? rawJson.successCriteria : ['All tasks completed and verified'],
      tasks: rawJson.tasks.map((t: any) => ({
        id: String(t.id),
        title: String(t.title || t.id),
        objective: String(t.objective || ''),
        agentId: String(t.agentId || 'manyu'),
        dependencies: Array.isArray(t.dependencies) ? t.dependencies.map(String) : [],
        requiredCapabilities: Array.isArray(t.requiredCapabilities) ? t.requiredCapabilities : [],
        expectedOutputs: Array.isArray(t.expectedOutputs) ? t.expectedOutputs : [],
        dangerLevel: typeof t.dangerLevel === 'number' ? t.dangerLevel : 0,
        verificationStrategy: t.verificationStrategy ? {
          type: t.verificationStrategy.type,
          target: t.verificationStrategy.target,
          expectedValue: t.verificationStrategy.expectedValue
        } : undefined
      })),
      riskLevel: typeof rawJson.riskLevel === 'string' ? rawJson.riskLevel.toLowerCase() : 'low',
      estimatedModelCalls: typeof rawJson.estimatedModelCalls === 'number' ? rawJson.estimatedModelCalls : rawJson.tasks.length,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Generate an instant, zero-model-call deterministic plan for SIMPLE missions.
   */
  public generateSimplePlan(options: CreatePlanOptions, registeredAgents: readonly any[]): MissionPlan {
    const objective = options.objective;

    // Resolve canonical specialists from registry
    const manyuAgent = registeredAgents.find(a => a.id === 'manyu');
    const prabhasaAgent = registeredAgents.find(a => a.id === 'prabhasa');
    const tvastaAgent = registeredAgents.find(a => a.id === 'tvasta');
    const bhagaAgent = registeredAgents.find(a => a.id === 'bhaga');
    const fallbackAgent = registeredAgents[0];

    const tasks: PlannedTask[] = [];

    // 1. Single text file creation
    const fileCreateMatch = objective.match(/create\s+([a-zA-Z0-9_\-./\\]+)\s+containing\s+['"]([^'"]+)['"]/i);

    // 2. Check file existence / read
    const fileCheckMatch = objective.match(/(?:check\s+(?:whether|if)?\s*|verify\s+)([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)\s+exists/i) ||
                           objective.match(/([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)\s+exists/i);

    if (fileCreateMatch) {
      const filePath = fileCreateMatch[1];
      const content = fileCreateMatch[2];
      const writeAgent = manyuAgent?.allowedTools.includes('filesystem.write')
        ? manyuAgent
        : (registeredAgents.find(a => a.allowedTools.includes('filesystem.write')) || fallbackAgent);

      tasks.push({
        id: 'task_1',
        title: `Create ${filePath}`,
        objective: `Create ${filePath} containing '${content}'`,
        agentId: writeAgent?.id || 'manyu',
        dependencies: [],
        requiredCapabilities: writeAgent?.capabilities || ['coding', 'software_engineering'],
        expectedOutputs: [`Created ${filePath}`],
        deterministicToolAction: {
          tool: 'filesystem.write',
          input: { path: filePath, content }
        },
        verificationStrategy: {
          type: 'file_contains',
          target: filePath,
          expectedValue: content
        },
        dangerLevel: 0
      });
    } else if (fileCheckMatch) {
      const filePath = fileCheckMatch[1];
      const readAgent = prabhasaAgent?.allowedTools.includes('filesystem.read')
        ? prabhasaAgent
        : (tvastaAgent || bhagaAgent || registeredAgents.find(a => a.allowedTools.includes('filesystem.read')) || fallbackAgent);

      tasks.push({
        id: 'task_1',
        title: `Verify ${filePath} Exists`,
        objective: `Check whether ${filePath} exists in the workspace.`,
        agentId: readAgent?.id || 'prabhasa',
        dependencies: [],
        requiredCapabilities: readAgent?.capabilities || ['operations', 'monitoring'],
        expectedOutputs: [`Verification that ${filePath} exists`],
        deterministicToolAction: {
          tool: 'filesystem.read',
          input: { path: filePath }
        },
        verificationStrategy: {
          type: 'file_exists',
          target: filePath
        },
        dangerLevel: 0
      });
    } else {
      const inspectionAgent = prabhasaAgent || manyuAgent || fallbackAgent;
      tasks.push({
        id: 'task_1',
        title: 'Execute Deterministic Inspection',
        objective: options.objective,
        agentId: inspectionAgent?.id || 'prabhasa',
        dependencies: [],
        requiredCapabilities: inspectionAgent?.capabilities || ['operations'],
        expectedOutputs: ['Execution verified'],
        deterministicToolAction: {
          tool: 'filesystem.list',
          input: { path: '.' }
        },
        dangerLevel: 0
      });
    }

    return {
      objective: options.objective,
      constraints: options.constraints ? [...options.constraints] : [],
      successCriteria: [`Deterministic verification for: ${options.objective}`],
      tasks,
      riskLevel: 'low',
      estimatedModelCalls: 0,
      createdAt: new Date().toISOString()
    };
  }

  private generateFallbackPlan(options: CreatePlanOptions, registeredAgents: readonly any[]): MissionPlan {
    const objectiveLower = options.objective.toLowerCase();

    // Canonical 33-agent workforce resolvers
    const resolve = (id: string, fallback = 'manyu') => registeredAgents.find(a => a.id === id)?.id || fallback;

    const manyu = resolve('manyu');
    const ritadhvaja = resolve('ritadhvaja');
    const bhaga = resolve('bhaga');
    const dhata = resolve('dhata');
    const aryaman = resolve('aryaman');
    const tvasta = resolve('tvasta');
    const vivasvan = resolve('vivasvan');
    const varuna = resolve('varuna');
    const pusa = resolve('pusa');
    const mitra = resolve('mitra');
    const prabhasa = resolve('prabhasa');
    const mahinasa = resolve('mahinasa');
    const vamadeva = resolve('vamadeva');
    const dhritavrata = resolve('dhritavrata');

    const tasks: PlannedTask[] = [];

    // 1. Market Research & Intelligence
    if (objectiveLower.includes('market') || objectiveLower.includes('competitor') || objectiveLower.includes('trend')) {
      tasks.push({
        id: 'task_1',
        title: 'Market & Competitive Research',
        objective: `Analyze market dynamics, gaps, and competitors for: ${options.objective}`,
        agentId: bhaga,
        dependencies: [],
        requiredCapabilities: ['market_research', 'competitive_analysis'],
        expectedOutputs: ['Market research intelligence report'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Customer Requirements Synthesis',
        objective: `Discover user needs and synthesize requirement boundaries for: ${options.objective}`,
        agentId: tvasta,
        dependencies: ['task_1'],
        requiredCapabilities: ['customer_research', 'requirements_analysis'],
        expectedOutputs: ['Customer requirements analysis'],
        dangerLevel: 0
      });
    }
    // 2. Strategy & Business Planning
    else if (objectiveLower.includes('strategy') || objectiveLower.includes('business plan') || objectiveLower.includes('roadmap')) {
      tasks.push({
        id: 'task_1',
        title: 'Formulate Business Strategy & Model',
        objective: `Formulate business objectives, models, and feasibility for: ${options.objective}`,
        agentId: dhata,
        dependencies: [],
        requiredCapabilities: ['strategy', 'business_planning'],
        expectedOutputs: ['Strategic business plan'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Workforce & Organization Architecture',
        objective: `Define team topology and role boundaries for: ${options.objective}`,
        agentId: aryaman,
        dependencies: ['task_1'],
        requiredCapabilities: ['organization_design', 'team_architecture'],
        expectedOutputs: ['Organization architecture design'],
        dangerLevel: 0
      });
    }
    // 3. Backup / Disaster Recovery / Rollback (VAMADEVA)
    else if (objectiveLower.includes('recover') || objectiveLower.includes('backup') || objectiveLower.includes('restore') || objectiveLower.includes('rollback')) {
      tasks.push({
        id: 'task_1',
        title: 'Execute State Containment & Safe Rollback',
        objective: `Safely contain failure, execute rollback and restore state for: ${options.objective}`,
        agentId: vamadeva,
        dependencies: [],
        requiredCapabilities: ['backup', 'recovery', 'rollback'],
        expectedOutputs: ['System recovery report'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Verify System Health Post-Recovery',
        objective: `Verify operational stability and monitoring metrics post-recovery for: ${options.objective}`,
        agentId: prabhasa,
        dependencies: ['task_1'],
        requiredCapabilities: ['operations', 'service_health'],
        expectedOutputs: ['Post-recovery health report'],
        dangerLevel: 0
      });
    }
    // 4. Retirement / Decommissioning / Exit (DHRITAVRATA)
    else if (objectiveLower.includes('retire') || objectiveLower.includes('decommission') || objectiveLower.includes('sunset') || objectiveLower.includes('shutdown')) {
      tasks.push({
        id: 'task_1',
        title: 'Compliance & Legal Decommissioning Check',
        objective: `Verify compliance, contractual, and policy rules for retirement of: ${options.objective}`,
        agentId: varuna,
        dependencies: [],
        requiredCapabilities: ['compliance', 'governance'],
        expectedOutputs: ['Retirement compliance clearance'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Execute Decommissioning & Safe Archival',
        objective: `Decommission services, archive data, and cleanly sunset components for: ${options.objective}`,
        agentId: dhritavrata,
        dependencies: ['task_1'],
        requiredCapabilities: ['retirement', 'decommissioning', 'archival'],
        expectedOutputs: ['Decommissioning and archival summary'],
        dangerLevel: 0
      });
    }
    // 5. Improvement / Optimization / Scaling (MAHINASA)
    else if (objectiveLower.includes('improve') || objectiveLower.includes('optimize') || objectiveLower.includes('scale') || objectiveLower.includes('restructure')) {
      tasks.push({
        id: 'task_1',
        title: 'Analyze Friction & Obsolete Bottlenecks',
        objective: `Identify optimization targets and refactoring opportunities for: ${options.objective}`,
        agentId: mahinasa,
        dependencies: [],
        requiredCapabilities: ['optimization', 'continuous_improvement'],
        expectedOutputs: ['Transformation architecture plan'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Implement Optimized Architecture',
        objective: `Implement optimizations and code refactorings for: ${options.objective}`,
        agentId: manyu,
        dependencies: ['task_1'],
        requiredCapabilities: ['software_engineering', 'implementation'],
        expectedOutputs: ['Optimized implementation'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_3',
        title: 'Verify Performance & Quality Gates',
        objective: `Verify that optimizations meet regression and QA benchmarks for: ${options.objective}`,
        agentId: ritadhvaja,
        dependencies: ['task_2'],
        requiredCapabilities: ['testing', 'verification'],
        expectedOutputs: ['Verification benchmarks'],
        dangerLevel: 0
      });
    }
    // 6. Marketing, Launch & Commercial Lifecycle (VIVASVAN, VARUNA, PUSA, MITRA)
    else if (objectiveLower.includes('launch') || objectiveLower.includes('market') || objectiveLower.includes('sales') || objectiveLower.includes('campaign')) {
      tasks.push({
        id: 'task_1',
        title: 'Formulate Go-To-Market & Campaign Positioning',
        objective: `Formulate marketing positioning, campaign messaging, and sales outreach for: ${options.objective}`,
        agentId: vivasvan,
        dependencies: [],
        requiredCapabilities: ['marketing', 'campaigns'],
        expectedOutputs: ['Marketing campaign plan'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Compliance & Governance Clearance',
        objective: `Verify regulatory and policy terms for: ${options.objective}`,
        agentId: varuna,
        dependencies: ['task_1'],
        requiredCapabilities: ['governance', 'compliance'],
        expectedOutputs: ['Compliance clearance report'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_3',
        title: 'Execute Delivery & Release Packaging',
        objective: `Package and dispatch deliverables for: ${options.objective}`,
        agentId: pusa,
        dependencies: ['task_2'],
        requiredCapabilities: ['fulfillment', 'deployment'],
        expectedOutputs: ['Fulfillment and release summary'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_4',
        title: 'Customer Onboarding & Support Readiness',
        objective: `Prepare user enablement materials and support workflows for: ${options.objective}`,
        agentId: mitra,
        dependencies: ['task_3'],
        requiredCapabilities: ['customer_onboarding', 'documentation'],
        expectedOutputs: ['Customer success documentation'],
        dangerLevel: 0
      });
    }
    // Default Engineering & QA Workflow (MANYU, RITADHVAJA)
    else {
      tasks.push({
        id: 'task_1',
        title: 'Decompose & Implement Objective',
        objective: `Plan and implement the technical execution for: ${options.objective}`,
        agentId: manyu,
        dependencies: [],
        requiredCapabilities: ['software_engineering', 'implementation'],
        expectedOutputs: ['Execution artifacts'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Verify Results & Validate Quality Gates',
        objective: `Execute testing and verify that ${options.objective} meets quality criteria.`,
        agentId: ritadhvaja,
        dependencies: ['task_1'],
        requiredCapabilities: ['testing', 'verification'],
        expectedOutputs: ['Verification report'],
        dangerLevel: 0
      });
    }

    return {
      objective: options.objective,
      constraints: options.constraints ? [...options.constraints] : [],
      successCriteria: [`Execution and quality verification completed for: ${options.objective}`],
      tasks,
      riskLevel: 'low',
      estimatedModelCalls: tasks.length,
      createdAt: new Date().toISOString()
    };
  }
}
