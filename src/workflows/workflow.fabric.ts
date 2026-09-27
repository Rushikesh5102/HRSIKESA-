/**
 * HṚṢĪKEŚA (हृषीकेश) — Native Universal Workflow & Automation Fabric
 *
 * FP-11 Master Coordinator: Orchestrates persistent workflows, versioning,
 * graph validation, deterministic compilation, execution runtime, checkpoints,
 * restart recovery, event-driven and scheduled triggers, webhooks, human approvals,
 * natural language planning, and 10 built-in templates.
 */

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { DatabaseManager } from '../persistence/database/database.manager.js';
import { EventBus } from '../core/events/event-bus.js';
import { ILogger } from '../core/logging/logger.types.js';
import { ResourceGovernor } from '../core/hardware/resource.governor.js';
import { ModelRouter } from '../models/router/model.router.js';
import { UniversalCapabilityFabric } from '../capabilities/fabric/universal.capability.fabric.js';
import { ToolExecutionBus } from '../tools/execution/tool.bus.js';
import { PermissionManager } from '../tools/permissions/permission.manager.js';
import { AgentRegistry } from '../agents/registry/agent.registry.js';
import { AgentRuntime } from '../agents/runtime/agent.runtime.js';
import { SkillExecutionEngine } from '../skills/index.js';
import { MissionOrchestrator } from '../agents/mission/mission.orchestrator.js';
import { GoalExecutionEngine } from '../goal/engine/goal.execution.engine.js';
import { ResearchEngine } from '../research/engine/research.engine.js';
import { EngineeringFabric } from '../engineering/engineering.fabric.js';
import { PersistentScheduler } from '../scheduling/persistent.scheduler.js';

import { WorkflowRepository } from './repository/workflow.repository.js';
import { WorkflowCompiler } from './compiler/workflow.compiler.js';
import { WorkflowGraphValidator } from './compiler/graph.validator.js';
import { WorkflowCheckpointManager } from './execution/checkpoint.manager.js';
import { WorkflowExecutionEngine } from './execution/workflow.execution.engine.js';
import { WorkflowTriggerManager } from './triggers/trigger.manager.js';
import { WorkflowWebhookManager } from './triggers/webhook.manager.js';
import { WorkflowRecoveryManager } from './recovery/workflow.recovery.manager.js';
import { WorkflowPlanner } from './planner/workflow.planner.js';
import { BUILTIN_WORKFLOW_TEMPLATES } from './templates/builtin.templates.js';
import {
  Workflow,
  WorkflowVersion,
  WorkflowRun,
  WorkflowValidationResult,
} from './types/workflow.types.js';

export interface WorkflowFabricOptions {
  dbManager: DatabaseManager;
  eventBus?: EventBus;
  logger?: ILogger;
  resourceGovernor?: ResourceGovernor;
  permissionManager?: PermissionManager;
  toolBus?: ToolExecutionBus;
  agentRegistry?: AgentRegistry;
  agentRuntime?: AgentRuntime;
  skillEngine?: SkillExecutionEngine;
  capabilityFabric?: UniversalCapabilityFabric;
  modelRouter?: ModelRouter;
  missionOrchestrator?: MissionOrchestrator;
  goalEngine?: GoalExecutionEngine;
  researchEngine?: ResearchEngine;
  engineeringFabric?: EngineeringFabric;
  scheduler?: PersistentScheduler;
}

export class WorkflowFabric extends EventEmitter {
  private readonly dbManager: DatabaseManager;
  private readonly repo: WorkflowRepository;
  private readonly validator: WorkflowGraphValidator;
  private readonly compiler: WorkflowCompiler;
  private readonly checkpointManager: WorkflowCheckpointManager;
  private readonly executionEngine: WorkflowExecutionEngine;
  private readonly webhookManager: WorkflowWebhookManager;
  private readonly triggerManager: WorkflowTriggerManager;
  private readonly recoveryManager: WorkflowRecoveryManager;
  private readonly planner: WorkflowPlanner;
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;
  private initialized = false;

  constructor(options: WorkflowFabricOptions) {
    super();
    this.dbManager = options.dbManager;
    this.eventBus = options.eventBus;
    this.logger = options.logger?.child('WorkflowFabric');

    this.repo = new WorkflowRepository(this.dbManager);
    this.validator = new WorkflowGraphValidator();
    this.compiler = new WorkflowCompiler(this.validator);
    this.checkpointManager = new WorkflowCheckpointManager(this.repo);

    this.executionEngine = new WorkflowExecutionEngine({
      repo: this.repo,
      compiler: this.compiler,
      checkpointManager: this.checkpointManager,
      dependencies: {
        logger: this.logger,
        eventBus: this.eventBus,
        resourceGovernor: options.resourceGovernor,
        permissionManager: options.permissionManager,
        toolBus: options.toolBus,
        agentRegistry: options.agentRegistry,
        agentRuntime: options.agentRuntime,
        skillEngine: options.skillEngine,
        capabilityFabric: options.capabilityFabric,
        modelRouter: options.modelRouter,
        missionOrchestrator: options.missionOrchestrator,
        goalEngine: options.goalEngine,
        researchEngine: options.researchEngine,
        engineeringFabric: options.engineeringFabric,
        workflowFabric: this,
      },
      eventBus: this.eventBus,
      logger: this.logger,
    });

    this.webhookManager = new WorkflowWebhookManager(this.repo, this.logger);
    this.triggerManager = new WorkflowTriggerManager({
      repo: this.repo,
      executionEngine: this.executionEngine,
      eventBus: this.eventBus,
      scheduler: options.scheduler,
      webhookManager: this.webhookManager,
      logger: this.logger,
    });

    this.recoveryManager = new WorkflowRecoveryManager(this.repo, this.executionEngine, this.logger);
    this.planner = new WorkflowPlanner({
      repo: this.repo,
      modelRouter: options.modelRouter,
      validator: this.validator,
      logger: this.logger,
    });

    // Bubble engine events to fabric
    this.executionEngine.on('workflow.run.created', payload => this.emit('workflow.run.created', payload));
    this.executionEngine.on('workflow.run.started', payload => this.emit('workflow.run.started', payload));
    this.executionEngine.on('workflow.node.started', payload => this.emit('workflow.node.started', payload));
    this.executionEngine.on('workflow.node.completed', payload => this.emit('workflow.node.completed', payload));
    this.executionEngine.on('workflow.node.failed', payload => this.emit('workflow.node.failed', payload));
    this.executionEngine.on('workflow.approval.requested', payload => this.emit('workflow.approval.requested', payload));
    this.executionEngine.on('workflow.approval.resolved', payload => this.emit('workflow.approval.resolved', payload));
    this.executionEngine.on('workflow.run.completed', payload => this.emit('workflow.run.completed', payload));
    this.executionEngine.on('workflow.run.failed', payload => this.emit('workflow.run.failed', payload));
    this.executionEngine.on('workflow.run.cancelled', payload => this.emit('workflow.run.cancelled', payload));
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // 1. Seed built-in templates if empty
    this.seedTemplates();

    // 2. Initialize active workflow triggers
    this.triggerManager.initializeTriggers();

    // 3. Run restart recovery for in-flight runs
    await this.recoveryManager.recoverIncompleteRuns();

    this.initialized = true;
    this.logger?.info('HṚṢĪKEŚA Native Universal Workflow & Automation Fabric online.');
  }

  // Accessors
  public getRepository(): WorkflowRepository { return this.repo; }
  public getExecutionEngine(): WorkflowExecutionEngine { return this.executionEngine; }
  public getValidator(): WorkflowGraphValidator { return this.validator; }
  public getCompiler(): WorkflowCompiler { return this.compiler; }
  public getTriggerManager(): WorkflowTriggerManager { return this.triggerManager; }
  public getWebhookManager(): WorkflowWebhookManager { return this.webhookManager; }
  public getRecoveryManager(): WorkflowRecoveryManager { return this.recoveryManager; }
  public getPlanner(): WorkflowPlanner { return this.planner; }

  // Workflow Lifecycle Operations
  public createWorkflow(options: {
    name: string;
    description: string;
    category?: string;
    scope?: Workflow['scope'];
    companyId?: string;
    projectId?: string;
    tags?: string[];
    graph: WorkflowVersion['graph'];
    triggers?: WorkflowVersion['triggers'];
    variables?: WorkflowVersion['variables'];
    timeoutSeconds?: number;
    maxRetries?: number;
    financialApprovalRequired?: boolean;
  }): { workflow: Workflow; version: WorkflowVersion } {
    const workflowId = `wf_${crypto.randomUUID().slice(0, 10)}`;
    const versionId = `wv_${crypto.randomUUID().slice(0, 10)}`;

    const workflow: Workflow = {
      id: workflowId,
      name: options.name,
      description: options.description,
      category: options.category || 'GENERAL',
      scope: options.scope || 'GLOBAL',
      companyId: options.companyId,
      projectId: options.projectId,
      status: 'DRAFT',
      activeVersion: 1,
      tags: options.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const triggers = (options.triggers || []).map(t => ({
      ...t,
      id: t.id || `trg_${crypto.randomUUID().slice(0, 8)}`,
      workflowId,
      enabled: t.enabled !== false,
      createdAt: new Date().toISOString(),
    }));

    const version: WorkflowVersion = {
      id: versionId,
      workflowId,
      versionNumber: 1,
      description: 'Initial version',
      graph: options.graph,
      triggers,
      variables: options.variables || [],
      timeoutSeconds: options.timeoutSeconds ?? 3600,
      maxRetries: options.maxRetries ?? 3,
      financialApprovalRequired: options.financialApprovalRequired || false,
      createdAt: new Date().toISOString(),
    };

    this.repo.saveWorkflow(workflow);
    this.repo.saveVersion(version);
    this.emitEvent('workflow.created', { workflowId: workflow.id, status: workflow.status });
    return { workflow, version };
  }

  public validateWorkflow(workflowId: string, versionNumber?: number): WorkflowValidationResult {
    const wf = this.repo.getWorkflow(workflowId);
    if (!wf) throw new Error(`Workflow '${workflowId}' not found.`);

    const version = this.repo.getVersion(workflowId, versionNumber || wf.activeVersion);
    if (!version) throw new Error(`Version for workflow '${workflowId}' not found.`);

    return this.validator.validate(version);
  }

  public activateWorkflow(workflowId: string): Workflow {
    const wf = this.repo.getWorkflow(workflowId);
    if (!wf) throw new Error(`Workflow '${workflowId}' not found.`);

    const validation = this.validateWorkflow(workflowId);
    if (!validation.valid) {
      throw new Error(`Cannot activate invalid workflow: ${validation.errors.join('; ')}`);
    }

    this.repo.updateWorkflowStatus(workflowId, 'ACTIVE');
    wf.status = 'ACTIVE';

    // Subscribe active triggers
    const version = this.repo.getVersion(workflowId, wf.activeVersion);
    if (version) {
      for (const t of version.triggers || []) {
        if (t.enabled !== false) {
          if (t.type === 'EVENT' || t.type.endsWith('_EVENT') || t.type.endsWith('_COMPLETED')) {
            this.triggerManager.subscribeEventTrigger(workflowId, t);
          } else if (t.type === 'SCHEDULE' || t.type === 'CRON' || t.type === 'INTERVAL') {
            this.triggerManager.registerScheduledTrigger(workflowId, t);
          }
        }
      }
    }

    this.emitEvent('workflow.activated', { workflowId });
    return wf;
  }

  public pauseWorkflow(workflowId: string): Workflow {
    const wf = this.repo.getWorkflow(workflowId);
    if (!wf) throw new Error(`Workflow '${workflowId}' not found.`);

    this.repo.updateWorkflowStatus(workflowId, 'PAUSED');
    wf.status = 'PAUSED';
    this.emitEvent('workflow.paused', { workflowId });
    return wf;
  }

  public resumeWorkflow(workflowId: string): Workflow {
    return this.activateWorkflow(workflowId);
  }

  public disableWorkflow(workflowId: string): Workflow {
    const wf = this.repo.getWorkflow(workflowId);
    if (!wf) throw new Error(`Workflow '${workflowId}' not found.`);

    this.repo.updateWorkflowStatus(workflowId, 'DISABLED');
    wf.status = 'DISABLED';
    this.emitEvent('workflow.disabled', { workflowId });
    return wf;
  }

  public createVersion(options: {
    workflowId: string;
    description: string;
    graph: WorkflowVersion['graph'];
    triggers?: any[];
    variables?: any[];
    requiredCapabilities?: string[];
    requiredSkills?: string[];
    requiredAgents?: string[];
    timeoutSeconds?: number;
    maxRetries?: number;
    financialApprovalRequired?: boolean;
  }): WorkflowVersion {
    const wf = this.repo.getWorkflow(options.workflowId);
    if (!wf) throw new Error(`Workflow '${options.workflowId}' not found.`);

    const latestVer = this.repo.getLatestVersion(options.workflowId);
    const newVersionNumber = (latestVer?.versionNumber || 0) + 1;
    const versionId = `wv_${crypto.randomUUID().slice(0, 10)}`;

    const version: WorkflowVersion = {
      id: versionId,
      workflowId: options.workflowId,
      versionNumber: newVersionNumber,
      description: options.description,
      graph: options.graph,
      triggers: options.triggers || [],
      variables: options.variables || [],
      requiredCapabilities: options.requiredCapabilities || [],
      requiredSkills: options.requiredSkills || [],
      requiredAgents: options.requiredAgents || [],
      timeoutSeconds: options.timeoutSeconds ?? 300,
      maxRetries: options.maxRetries ?? 3,
      financialApprovalRequired: options.financialApprovalRequired ?? false,
      createdAt: new Date().toISOString(),
    };

    this.repo.saveVersion(version);
    this.repo.updateWorkflowActiveVersion(options.workflowId, newVersionNumber);
    this.emitEvent('workflow.version.created', { workflowId: options.workflowId, versionNumber: newVersionNumber });
    return version;
  }

  public async runWorkflow(
    workflowIdOrOptions: string | {
      workflowId: string;
      versionNumber?: number;
      triggerType?: any;
      triggerPayload?: Record<string, any>;
      inputVariables?: Record<string, any>;
    },
    options?: {
      versionNumber?: number;
      triggerType?: any;
      triggerPayload?: Record<string, any>;
      inputVariables?: Record<string, any>;
    }
  ): Promise<WorkflowRun> {
    const wfId = typeof workflowIdOrOptions === 'string' ? workflowIdOrOptions : workflowIdOrOptions.workflowId;
    const opts = typeof workflowIdOrOptions === 'string' ? options : workflowIdOrOptions;
    return await this.executionEngine.startRun({
      workflowId: wfId,
      versionNumber: opts?.versionNumber,
      triggerType: opts?.triggerType || 'MANUAL',
      triggerPayload: opts?.triggerPayload,
      inputVariables: opts?.inputVariables,
    });
  }

  public async resolveApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', decidedBy = 'operator', comments?: string): Promise<void> {
    await this.executionEngine.resolveApproval(approvalId, decision, decidedBy, comments);
  }

  public async pauseRun(runId: string): Promise<WorkflowRun> {
    this.executionEngine.pauseRun(runId);
    return this.repo.getRun(runId)!;
  }

  public async resumeRun(runId: string): Promise<WorkflowRun> {
    return await this.executionEngine.resumeRun(runId);
  }

  public async cancelRun(runId: string, reason?: string): Promise<WorkflowRun> {
    this.executionEngine.cancelRun(runId, reason);
    return this.repo.getRun(runId)!;
  }

  public async respondToApproval(options: {
    approvalId: string;
    decision: 'APPROVED' | 'REJECTED' | 'APPROVE' | 'REJECT' | string;
    decidedBy?: string;
    comments?: string;
  }): Promise<WorkflowRun> {
    const dec = options.decision.toUpperCase().startsWith('APPROV') ? 'APPROVED' : 'REJECTED';
    await this.resolveApproval(options.approvalId, dec, options.decidedBy, options.comments);
    const appr = this.repo.getApproval(options.approvalId);
    return this.repo.getRun(appr!.runId)!;
  }

  // Template Management
  public listTemplates(): typeof BUILTIN_WORKFLOW_TEMPLATES {
    return BUILTIN_WORKFLOW_TEMPLATES;
  }

  public instantiateTemplate(templateIndexOrName: number | string, overrides?: {
    scope?: Workflow['scope'];
    companyId?: string;
    projectId?: string;
  }): { workflow: Workflow; version: WorkflowVersion } {
    let tpl = typeof templateIndexOrName === 'number'
      ? BUILTIN_WORKFLOW_TEMPLATES[templateIndexOrName]
      : BUILTIN_WORKFLOW_TEMPLATES.find(t => t.workflow.name.toLowerCase() === templateIndexOrName.toLowerCase());

    if (!tpl) {
      tpl = BUILTIN_WORKFLOW_TEMPLATES[0];
    }

    return this.createWorkflow({
      name: tpl.workflow.name,
      description: tpl.workflow.description,
      category: tpl.workflow.category,
      scope: overrides?.scope || tpl.workflow.scope,
      companyId: overrides?.companyId,
      projectId: overrides?.projectId,
      tags: tpl.workflow.tags,
      graph: tpl.version.graph,
      triggers: tpl.version.triggers as any,
      variables: tpl.version.variables,
    });
  }

  private seedTemplates(): void {
    const existing = this.repo.listWorkflows({ limit: 1 });
    if (existing.length === 0) {
      this.logger?.info('Seeding 10 production workflow templates into persistent repository...');
      for (const tpl of BUILTIN_WORKFLOW_TEMPLATES) {
        this.instantiateTemplate(tpl.workflow.name);
      }
    }
  }

  private emitEvent(event: any, payload: any): void {
    const full = { ...payload, timestamp: new Date().toISOString() };
    this.emit(event, full);
    this.eventBus?.emit(event, full);
  }
}

// Re-export as WorkflowFabric
export { WorkflowFabric as AutonomousWorkflowFabric };
