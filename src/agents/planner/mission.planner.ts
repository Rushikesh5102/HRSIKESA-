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
    const validAgentIds = registeredAgents.map(a => `"${a.id}"`).join(' | ') || '"rahu" | "aja" | "ritvan" | "tvas" | "spoota" | "gandiva" | "vighna" | "raudra" | "rutam" | "arvan" | "taraka" | "kalki" | "garuda" | "kali" | "kaala" | "yama" | "mrtyu"';

    const systemPrompt = `You are HṚṢĪKEŚA's strategic mission planning director. Your master is Rushikesh Pattiwar.
Your job is to break down a high-level user objective into a structured, executable task graph (DAG) assigning tasks to the 17 specialized workforce agents.

WORKFORCE AGENTS & LIFECYCLE ROLES:
- rahu: Market Intelligence (market research, gaps, competitors, trends, threats)
- aja: Strategy & Business Planning (business models, strategic roadmaps, feasibility)
- ritvan: Company & Team Setup (organizational structure, team architecture, roles)
- tvas: Customer & Requirements Research (customer discovery, user needs, problem analysis)
- spoota: Product / Service Design (UX, specifications, architecture blueprints, prototypes)
- gandiva: Software Engineering / Development (coding, implementation, debugging, Git)
- vighna: QA / Risk / Verification (testing, validation, blockers, failure detection)
- raudra: Marketing & Sales (campaigns, positioning, lead generation, sales workflows)
- rutam: Governance / Compliance / Contracts (policy validation, contracts, legal gates)
- arvan: Fulfillment & Delivery (deployment, distribution, logistics, delivery tracking)
- taraka: Customer Onboarding & Support (documentation, onboarding, user troubleshooting)
- kalki: Billing / Commercial Operations (invoices, subscriptions, payments, reconciliation)
- garuda: Operations / Infrastructure / Monitoring (system health, processes, observability)
- kali: Improvement / Transformation / Expansion (optimization, scaling, restructuring)
- kaala: Time / Scheduling / Resource Coordination (deadlines, queues, workload balancing)
- yama: Backup / Recovery / Disaster Management (backups, safe rollbacks, failure containment)
- mrtyu: Retirement / Decommissioning / Exit (product sunsetting, service shutdown, archival)

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
        agentId: String(t.agentId || 'gandiva'),
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

    // Specialists from the 17-agent workforce
    const gandivaAgent = registeredAgents.find(a => a.id === 'gandiva');
    const garudaAgent = registeredAgents.find(a => a.id === 'garuda');
    const tvasAgent = registeredAgents.find(a => a.id === 'tvas');
    const rahuAgent = registeredAgents.find(a => a.id === 'rahu');
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
      const writeAgent = gandivaAgent?.allowedTools.includes('filesystem.write')
        ? gandivaAgent
        : (registeredAgents.find(a => a.allowedTools.includes('filesystem.write')) || fallbackAgent);

      tasks.push({
        id: 'task_1',
        title: `Create ${filePath}`,
        objective: `Create ${filePath} containing '${content}'`,
        agentId: writeAgent?.id || 'gandiva',
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
      const readAgent = garudaAgent?.allowedTools.includes('filesystem.read')
        ? garudaAgent
        : (tvasAgent || rahuAgent || registeredAgents.find(a => a.allowedTools.includes('filesystem.read')) || fallbackAgent);

      tasks.push({
        id: 'task_1',
        title: `Verify ${filePath} Exists`,
        objective: `Check whether ${filePath} exists in the workspace.`,
        agentId: readAgent?.id || 'garuda',
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
      const inspectionAgent = garudaAgent || gandivaAgent || fallbackAgent;
      tasks.push({
        id: 'task_1',
        title: 'Execute Deterministic Inspection',
        objective: options.objective,
        agentId: inspectionAgent?.id || 'garuda',
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

    // Workforce specialist resolvers
    const gandiva = registeredAgents.find(a => a.id === 'gandiva')?.id || 'gandiva';
    const vighna = registeredAgents.find(a => a.id === 'vighna')?.id || 'vighna';
    const rahu = registeredAgents.find(a => a.id === 'rahu')?.id || 'rahu';
    const aja = registeredAgents.find(a => a.id === 'aja')?.id || 'aja';
    const ritvan = registeredAgents.find(a => a.id === 'ritvan')?.id || 'ritvan';
    const tvas = registeredAgents.find(a => a.id === 'tvas')?.id || 'tvas';
    const spoota = registeredAgents.find(a => a.id === 'spoota')?.id || 'spoota';
    const raudra = registeredAgents.find(a => a.id === 'raudra')?.id || 'raudra';
    const rutam = registeredAgents.find(a => a.id === 'rutam')?.id || 'rutam';
    const arvan = registeredAgents.find(a => a.id === 'arvan')?.id || 'arvan';
    const taraka = registeredAgents.find(a => a.id === 'taraka')?.id || 'taraka';
    const kalki = registeredAgents.find(a => a.id === 'kalki')?.id || 'kalki';
    const garuda = registeredAgents.find(a => a.id === 'garuda')?.id || 'garuda';
    const kali = registeredAgents.find(a => a.id === 'kali')?.id || 'kali';
    const kaala = registeredAgents.find(a => a.id === 'kaala')?.id || 'kaala';
    const yama = registeredAgents.find(a => a.id === 'yama')?.id || 'yama';
    const mrtyu = registeredAgents.find(a => a.id === 'mrtyu')?.id || 'mrtyu';

    const tasks: PlannedTask[] = [];

    // 1. Market Research & Intelligence
    if (objectiveLower.includes('market') || objectiveLower.includes('competitor') || objectiveLower.includes('trend')) {
      tasks.push({
        id: 'task_1',
        title: 'Market & Competitive Research',
        objective: `Analyze market dynamics, gaps, and competitors for: ${options.objective}`,
        agentId: rahu,
        dependencies: [],
        requiredCapabilities: ['market_research', 'competitive_analysis'],
        expectedOutputs: ['Market research intelligence report'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Customer Requirements Synthesis',
        objective: `Discover user needs and synthesize requirement boundaries for: ${options.objective}`,
        agentId: tvas,
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
        agentId: aja,
        dependencies: [],
        requiredCapabilities: ['strategy', 'business_planning'],
        expectedOutputs: ['Strategic business plan'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Workforce & Organization Architecture',
        objective: `Define team topology and role boundaries for: ${options.objective}`,
        agentId: ritvan,
        dependencies: ['task_1'],
        requiredCapabilities: ['organization_design', 'team_architecture'],
        expectedOutputs: ['Organization architecture design'],
        dangerLevel: 0
      });
    }
    // 3. Backup / Disaster Recovery / Rollback (YAMA)
    else if (objectiveLower.includes('recover') || objectiveLower.includes('backup') || objectiveLower.includes('restore') || objectiveLower.includes('rollback')) {
      tasks.push({
        id: 'task_1',
        title: 'Execute State Containment & Safe Rollback',
        objective: `Safely contain failure, execute rollback and restore state for: ${options.objective}`,
        agentId: yama,
        dependencies: [],
        requiredCapabilities: ['backup', 'recovery', 'rollback'],
        expectedOutputs: ['System recovery report'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Verify System Health Post-Recovery',
        objective: `Verify operational stability and monitoring metrics post-recovery for: ${options.objective}`,
        agentId: garuda,
        dependencies: ['task_1'],
        requiredCapabilities: ['operations', 'service_health'],
        expectedOutputs: ['Post-recovery health report'],
        dangerLevel: 0
      });
    }
    // 4. Retirement / Decommissioning / Exit (MRTYU)
    else if (objectiveLower.includes('retire') || objectiveLower.includes('decommission') || objectiveLower.includes('sunset') || objectiveLower.includes('shutdown')) {
      tasks.push({
        id: 'task_1',
        title: 'Compliance & Legal Decommissioning Check',
        objective: `Verify compliance, contractual, and policy rules for retirement of: ${options.objective}`,
        agentId: rutam,
        dependencies: [],
        requiredCapabilities: ['compliance', 'governance'],
        expectedOutputs: ['Retirement compliance clearance'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Execute Decommissioning & Safe Archival',
        objective: `Decommission services, archive data, and cleanly sunset components for: ${options.objective}`,
        agentId: mrtyu,
        dependencies: ['task_1'],
        requiredCapabilities: ['retirement', 'decommissioning', 'archival'],
        expectedOutputs: ['Decommissioning and archival summary'],
        dangerLevel: 0
      });
    }
    // 5. Improvement / Optimization / Scaling (KALI)
    else if (objectiveLower.includes('improve') || objectiveLower.includes('optimize') || objectiveLower.includes('scale') || objectiveLower.includes('restructure')) {
      tasks.push({
        id: 'task_1',
        title: 'Analyze Friction & Obsolete Bottlenecks',
        objective: `Identify optimization targets and refactoring opportunities for: ${options.objective}`,
        agentId: kali,
        dependencies: [],
        requiredCapabilities: ['optimization', 'continuous_improvement'],
        expectedOutputs: ['Transformation architecture plan'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Implement Optimized Architecture',
        objective: `Implement optimizations and code refactorings for: ${options.objective}`,
        agentId: gandiva,
        dependencies: ['task_1'],
        requiredCapabilities: ['software_engineering', 'implementation'],
        expectedOutputs: ['Optimized implementation'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_3',
        title: 'Verify Performance & Quality Gates',
        objective: `Verify that optimizations meet regression and QA benchmarks for: ${options.objective}`,
        agentId: vighna,
        dependencies: ['task_2'],
        requiredCapabilities: ['testing', 'verification'],
        expectedOutputs: ['Verification benchmarks'],
        dangerLevel: 0
      });
    }
    // 6. Marketing, Launch & Commercial Lifecycle (RAUDRA, RUTAM, ARVAN, TARAKA)
    else if (objectiveLower.includes('launch') || objectiveLower.includes('market') || objectiveLower.includes('sales') || objectiveLower.includes('campaign')) {
      tasks.push({
        id: 'task_1',
        title: 'Formulate Go-To-Market & Campaign Positioning',
        objective: `Formulate marketing positioning, campaign messaging, and sales outreach for: ${options.objective}`,
        agentId: raudra,
        dependencies: [],
        requiredCapabilities: ['marketing', 'sales'],
        expectedOutputs: ['GTM campaign roadmap'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Verify Contractual & Compliance Clearance',
        objective: `Validate compliance rules, legal terms, and governance policies for: ${options.objective}`,
        agentId: rutam,
        dependencies: ['task_1'],
        requiredCapabilities: ['compliance', 'governance'],
        expectedOutputs: ['Compliance clearance report'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_3',
        title: 'Execute Release Delivery & Distribution',
        objective: `Deploy artifacts and manage fulfillment logistics for: ${options.objective}`,
        agentId: arvan,
        dependencies: ['task_2'],
        requiredCapabilities: ['fulfillment', 'deployment'],
        expectedOutputs: ['Deployment and fulfillment record'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_4',
        title: 'Prepare Onboarding & Customer Support Runbooks',
        objective: `Prepare customer documentation, guides, and support workflows for: ${options.objective}`,
        agentId: taraka,
        dependencies: ['task_3'],
        requiredCapabilities: ['customer_support', 'onboarding'],
        expectedOutputs: ['Customer onboarding runbook'],
        dangerLevel: 0
      });
    }
    // 7. Billing, Invoicing & Payments (KALKI)
    else if (objectiveLower.includes('bill') || objectiveLower.includes('payment') || objectiveLower.includes('invoice') || objectiveLower.includes('subscription')) {
      tasks.push({
        id: 'task_1',
        title: 'Process Commercial Billing & Reconciliation',
        objective: `Execute invoice generation, subscription reconciliation, and commercial tracking for: ${options.objective}`,
        agentId: kalki,
        dependencies: [],
        requiredCapabilities: ['billing', 'payments'],
        expectedOutputs: ['Commercial reconciliation summary'],
        dangerLevel: 0
      });
    }
    // 8. Scheduling, Timelines & Resource Coordination (KAALA)
    else if (objectiveLower.includes('schedule') || objectiveLower.includes('deadline') || objectiveLower.includes('timeline') || objectiveLower.includes('workload')) {
      tasks.push({
        id: 'task_1',
        title: 'Coordinate Resource Windows & Timelines',
        objective: `Construct execution timelines, balance workload queues, and coordinate scheduling for: ${options.objective}`,
        agentId: kaala,
        dependencies: [],
        requiredCapabilities: ['scheduling', 'resource_management'],
        expectedOutputs: ['Resource scheduling plan'],
        dangerLevel: 0
      });
    }
    // 9. Default Creation / Engineering Flow: Spoota -> Gandiva -> Vighna
    else if (objectiveLower.includes('create') || objectiveLower.includes('write') || objectiveLower.includes('build') || objectiveLower.includes('develop')) {
      tasks.push({
        id: 'task_1',
        title: 'Design & Specification Blueprint',
        objective: `Design specifications and blueprint for: ${options.objective}`,
        agentId: spoota,
        dependencies: [],
        requiredCapabilities: ['product_design', 'specifications'],
        expectedOutputs: ['Design specifications'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Software Engineering Implementation',
        objective: `Implement and code required artifacts for: ${options.objective}`,
        agentId: gandiva,
        dependencies: ['task_1'],
        requiredCapabilities: ['software_engineering', 'coding'],
        expectedOutputs: ['Implemented files and code'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_3',
        title: 'QA & Programmatic Verification',
        objective: `Verify implementation against quality gates and unit tests for: ${options.objective}`,
        agentId: vighna,
        dependencies: ['task_2'],
        requiredCapabilities: ['testing', 'verification'],
        expectedOutputs: ['QA verification report'],
        dangerLevel: 0
      });
    }
    // 10. General Inspection / Operations: Garuda -> Gandiva -> Vighna
    else {
      tasks.push({
        id: 'task_1',
        title: 'Inspect Environment & Workspace',
        objective: `Inspect workspace files and environment telemetry for: ${options.objective}`,
        agentId: garuda,
        dependencies: [],
        requiredCapabilities: ['operations', 'monitoring'],
        expectedOutputs: ['Operational inspection telemetry'],
        dangerLevel: 0
      });
      tasks.push({
        id: 'task_2',
        title: 'Synthesize Findings & Technical Report',
        objective: `Synthesize operational observations and produce comprehensive report for: ${options.objective}`,
        agentId: gandiva,
        dependencies: ['task_1'],
        requiredCapabilities: ['software_engineering', 'typescript'],
        expectedOutputs: ['Final technical report'],
        dangerLevel: 0
      });
    }

    return {
      objective: options.objective,
      constraints: options.constraints ? [...options.constraints] : [],
      successCriteria: ['Tasks executed and verified across specialized lifecycle stages'],
      tasks,
      riskLevel: 'low',
      estimatedModelCalls: tasks.length,
      createdAt: new Date().toISOString()
    };
  }
}
