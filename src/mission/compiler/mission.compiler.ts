/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Compiler
 *
 * FP-14: Compiles natural-language human objectives into validated,
 * outcome-decomposed, workforce-assigned executable Mission Plans.
 */

import {
  MissionDescriptor,
  MissionOutcome,
  MissionTask,
  MissionConstraint,
  PlanVersion,
} from '../types/index.js';
import { AssumptionEngine } from './assumption.engine.js';
import { TemplateRegistry } from './template.registry.js';
import { INITIAL_AGENT_ROSTER } from '../../agents/roster/initial.agents.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface MissionCompileRequest {
  objective: string;
  title?: string;
  owner?: string;
  companyId?: string;
  projectId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'CRITICAL' | 'SOVEREIGN_URGENT';
  constraints?: MissionConstraint[];
  budgetLimitUsd?: number;
  deadline?: string;
  privacyLevel?: 'SOVEREIGN_LOCAL' | 'HIGHLY_PRIVATE' | 'PRIVATE' | 'INTERNAL' | 'AUTHORIZED_EXTERNAL' | 'PUBLIC';
  preferredTemplateId?: string;
}

export interface MissionCompileResult {
  mission: MissionDescriptor;
  outcomes: MissionOutcome[];
  tasks: MissionTask[];
  planVersion: PlanVersion;
  initialPlanVersion: PlanVersion;
  estimatedResources: {
    estimatedDurationSeconds: number;
    estimatedModelCalls: number;
    estimatedToolCalls: number;
  };
  isValid: boolean;
  validationErrors: string[];
}

export class MissionCompiler {
  private readonly templateRegistry: TemplateRegistry;
  private readonly assumptionEngine: AssumptionEngine;
  private readonly logger?: ILogger;

  constructor(
    templateRegistryOrPlanner?: any,
    assumptionEngine?: AssumptionEngine,
    logger?: ILogger
  ) {
    if (templateRegistryOrPlanner && typeof templateRegistryOrPlanner.getTemplate === 'function') {
      this.templateRegistry = templateRegistryOrPlanner;
    } else {
      this.templateRegistry = new TemplateRegistry();
    }
    this.assumptionEngine = assumptionEngine || new AssumptionEngine();
    this.logger = logger;
  }

  public compile(request: MissionCompileRequest): MissionCompileResult {
    this.logger?.debug('Compiling mission request', { objective: request.objective });
    const now = new Date().toISOString();
    const missionId = `mis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const title = request.title || this.deriveTitle(request.objective);
    const priority = request.priority === 'MEDIUM' ? 'NORMAL' : (request.priority || 'NORMAL');
    const privacy = request.privacyLevel || 'PRIVATE';

    // 1. Extract assumptions
    const assumptions = this.assumptionEngine.extractAssumptions(
      request.objective,
      request.constraints || []
    );

    // 2. Resolve matching template or construct default decomposition
    const template =
      (request.preferredTemplateId && this.templateRegistry.getTemplate(request.preferredTemplateId)) ||
      this.templateRegistry.findMatchingTemplate(request.objective);

    const outcomes: MissionOutcome[] = [];
    const tasks: MissionTask[] = [];

    if (template) {
      let prevOutcomeId: string | undefined = undefined;

      for (let i = 0; i < template.outcomes.length; i++) {
        const oTmpl = template.outcomes[i];
        const outcomeId = `out_${missionId}_${i + 1}`;
        const taskId = `tsk_${missionId}_${i + 1}`;

        const outcome: MissionOutcome = {
          outcomeId,
          missionId,
          description: oTmpl.description,
          acceptanceCriteria: oTmpl.acceptanceCriteria,
          priority: 'NORMAL',
          status: 'PENDING',
          verificationState: 'UNVERIFIED',
          confidence: 1.0,
          weight: oTmpl.weight || 10,
          dependencies: prevOutcomeId ? [prevOutcomeId] : [],
        };
        outcomes.push(outcome);

        const task: MissionTask = {
          taskId,
          missionId,
          outcomeId,
          title: oTmpl.title,
          description: oTmpl.description,
          kind: oTmpl.kind,
          executionKind: oTmpl.kind,
          status: 'PENDING',
          primaryAgentId: oTmpl.primaryAgentId,
          assignedAgent: this.resolveAgentDisplayName(oTmpl.primaryAgentId),
          requiredCapabilities: [],
          dependencies: prevOutcomeId ? [`tsk_${missionId}_${i}`] : [],
          priority: oTmpl.priority || (i + 1),
          riskTier: 0,
          requiresHumanApproval: oTmpl.requiresHumanApproval,
          inputPayload: {},
          failureHistory: [],
          retryCount: 0,
          maxRetries: 3,
          timeoutMs: 60000,
          evidence: [],
          artifacts: [],
          createdAt: now,
          updatedAt: now,
        };
        tasks.push(task);

        prevOutcomeId = outcomeId;
      }
    } else {
      // Default 3-phase decomposition
      const phases = [
        {
          title: 'Understand & Scope Objective',
          agent: 'Dhātā',
          kind: 'AGENT_DIRECT' as const,
          criteria: ['Objective requirements understood and documented'],
        },
        {
          title: 'Execute Technical Engineering',
          agent: 'Manyu',
          kind: 'ENGINEERING' as const,
          criteria: ['Core deliverable implementation complete and passing tests'],
        },
        {
          title: 'Verify & Finalize Outcomes',
          agent: 'Ṛtadhvaja',
          kind: 'AGENT_DIRECT' as const,
          criteria: ['All acceptance criteria independently verified'],
        },
      ];

      let prevTaskId: string | undefined = undefined;
      for (let i = 0; i < phases.length; i++) {
        const p = phases[i];
        const outcomeId = `out_${missionId}_${i + 1}`;
        const taskId = `tsk_${missionId}_${i + 1}`;

        outcomes.push({
          outcomeId,
          missionId,
          description: p.title,
          acceptanceCriteria: p.criteria,
          priority: 'NORMAL',
          status: 'PENDING',
          verificationState: 'UNVERIFIED',
          confidence: 1.0,
          weight: 10,
          dependencies: prevTaskId ? [`out_${missionId}_${i}`] : [],
        });

        tasks.push({
          taskId,
          missionId,
          outcomeId,
          title: p.title,
          description: `${p.title} for ${request.objective}`,
          kind: p.kind,
          executionKind: p.kind,
          status: 'PENDING',
          primaryAgentId: p.agent,
          assignedAgent: p.agent,
          dependencies: prevTaskId ? [prevTaskId] : [],
          priority: i + 1,
          riskTier: 0,
          requiresHumanApproval: false,
          inputPayload: {},
          failureHistory: [],
          retryCount: 0,
          maxRetries: 3,
          timeoutMs: 60000,
          evidence: [],
          artifacts: [],
          createdAt: now,
          updatedAt: now,
        });

        prevTaskId = taskId;
      }
    }

    const defaultConstraints: MissionConstraint[] = [
      {
        constraintId: `cnst_${missionId}_priv`,
        type: 'PRIVACY',
        description: 'Sovereign local privacy boundary enforced',
        enforceStrict: true,
      },
      {
        constraintId: `cnst_${missionId}_appr`,
        type: 'APPROVAL_GATE',
        description: 'Human approval required for financial, irreversible, or production operations',
        enforceStrict: true,
      }
    ];

    const constraints = [...(request.constraints || []), ...defaultConstraints];

    const mission: MissionDescriptor = {
      missionId,
      title,
      objective: request.objective,
      description: request.objective,
      owner: request.owner || 'Rushikesh',
      companyId: request.companyId,
      projectId: request.projectId,
      status: 'PLANNING',
      priority,
      urgency: 5,
      importance: 5,
      privacyLevel: privacy,
      constraints,
      assumptions,
      risks: [],
      desiredOutcome: 'Autonomous execution of objective with verified evidence',
      acceptanceCriteria: outcomes.flatMap((o) => o.acceptanceCriteria),
      budgetLimitUsd: request.budgetLimitUsd,
      deadline: request.deadline,
      currentPhase: 'PLANNING',
      health: 'HEALTHY',
      progress: 0,
      progressPercentage: 0,
      confidenceScore: 1.0,
      planVersion: 1,
      resourceUsage: {
        cpuSeconds: 0,
        memoryMb: 0,
        modelCalls: 0,
        toolCalls: 0,
        workspaceActions: 0,
        externalApiCostUsd: 0,
        estimatedTotalDurationMs: 60000,
        actualDurationMs: 0,
        estimatedDurationSeconds: 120,
        estimatedModelCalls: tasks.length * 2,
        estimatedToolCalls: tasks.length * 3,
      },
      createdAt: now,
      updatedAt: now,
    };

    // 4. Validate DAG and Plan
    const validationErrors = this.validatePlan(outcomes, tasks, false);
    const isValid = validationErrors.length === 0;

    const planVersion: PlanVersion = {
      versionId: `pv_${missionId}_1`,
      version: 1,
      missionId,
      planVersionNumber: 1,
      reason: 'Initial autonomous plan compilation',
      author: 'Dhātā',
      outcomesSnapshot: outcomes,
      tasksSnapshot: tasks,
      timestamp: now,
    };

    return {
      mission,
      outcomes,
      tasks,
      planVersion,
      initialPlanVersion: planVersion,
      estimatedResources: {
        estimatedDurationSeconds: 120,
        estimatedModelCalls: tasks.length * 2,
        estimatedToolCalls: tasks.length * 3,
      },
      isValid,
      validationErrors,
    };
  }

  public validatePlan(outcomes: MissionOutcome[], tasks: MissionTask[], shouldThrow: boolean = true): string[] {
    const errors: string[] = [];
    const outcomeIds = new Set(outcomes.map((o) => o.outcomeId));
    const taskIds = new Set(tasks.map((t) => t.taskId));

    // Check structural integrity: each task must have a non-empty taskId and outcomeId
    for (const task of tasks) {
      if (!task.taskId || task.taskId.trim() === '') {
        errors.push(`Task has empty or missing taskId`);
      }
      if (!task.outcomeId || task.outcomeId.trim() === '') {
        errors.push(`Task ${task.taskId || '(unknown)'} has empty or missing outcomeId`);
      }
    }

    // Check orphan tasks
    for (const task of tasks) {
      if (outcomes.length > 0 && !outcomeIds.has(task.outcomeId)) {
        errors.push(`Task ${task.taskId} references non-existent outcome ${task.outcomeId}`);
      }
    }

    // Check unknown dependencies
    for (const task of tasks) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep)) {
          errors.push(`Task ${task.taskId} references non-existent dependency ${dep}`);
        }
      }
    }

    // Check circular dependencies in tasks
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      visited.add(taskId);
      recStack.add(taskId);

      const task = tasks.find((t) => t.taskId === taskId);
      if (task) {
        for (const dep of task.dependencies) {
          if (!visited.has(dep) && hasCycle(dep)) return true;
          if (recStack.has(dep)) return true;
        }
      }

      recStack.delete(taskId);
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.taskId)) {
        if (hasCycle(task.taskId)) {
          errors.push(`Cycle detected involving task ${task.taskId}`);
          break;
        }
      }
    }

    if (shouldThrow && errors.length > 0) {
      throw new Error(`Invalid plan: ${errors.join(', ')}`);
    }

    return errors;
  }

  private deriveTitle(objective: string): string {
    const cleaned = objective.replace(/^(build|create|make|develop|launch|do|please|i want to)\s+/i, '');
    const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return title.length > 50 ? `${title.slice(0, 47)}...` : title;
  }

  private resolveAgentDisplayName(agentId: string): string {
    const agent = INITIAL_AGENT_ROSTER.find((a) => a.id === agentId.toLowerCase());
    return agent ? agent.displayName : agentId;
  }
}
