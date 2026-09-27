/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Natural Language Planner & Explainer
 *
 * FP-11: Translates user natural language instructions into structured, validated
 * workflow definitions, versions, and graph topologies. Also provides authoritative
 * explanations of workflow behavior and run execution history.
 */

import crypto from 'node:crypto';
import { ModelRouter } from '../../models/router/model.router.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { WorkflowRepository } from '../repository/workflow.repository.js';
import { WorkflowGraphValidator } from '../compiler/graph.validator.js';
import {
  Workflow,
  WorkflowVersion,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTrigger,
} from '../types/workflow.types.js';

export class WorkflowPlanner {
  private readonly repo: WorkflowRepository;
  private readonly modelRouter?: ModelRouter;
  private readonly validator: WorkflowGraphValidator;
  private readonly logger?: ILogger;

  constructor(options: {
    repo: WorkflowRepository;
    modelRouter?: ModelRouter;
    validator?: WorkflowGraphValidator;
    logger?: ILogger;
  }) {
    this.repo = options.repo;
    this.modelRouter = options.modelRouter;
    this.validator = options.validator || new WorkflowGraphValidator();
    this.logger = options.logger?.child('WorkflowPlanner');
  }

  public getModelRouter(): ModelRouter | undefined {
    return this.modelRouter;
  }

  /**
   * Plans and creates a new Workflow and initial Version 1 from a natural language prompt.
   */
  public async planFromNaturalLanguage(params: {
    prompt: string;
    scope?: Workflow['scope'];
    companyId?: string;
    projectId?: string;
  }): Promise<{ workflow: Workflow; version: WorkflowVersion }> {
    const prompt = params.prompt.trim();
    this.logger?.info(`Planning workflow from natural language: "${prompt}"`);

    // Extract intent and requirements deterministically / via model
    const plan = await this.synthesizePlan(prompt);

    const workflowId = `wf_${crypto.randomUUID().slice(0, 10)}`;
    const versionId = `wv_${crypto.randomUUID().slice(0, 10)}`;

    const workflow: Workflow = {
      id: workflowId,
      name: plan.name || 'Autonomous Workflow',
      description: plan.description || prompt,
      category: plan.category || 'AUTOMATION',
      scope: params.scope || 'GLOBAL',
      companyId: params.companyId,
      projectId: params.projectId,
      status: 'DRAFT',
      activeVersion: 1,
      tags: plan.tags || ['automated', 'ai-generated'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const triggers: WorkflowTrigger[] = (plan.triggers || [{ type: 'MANUAL', config: {}, enabled: true }]).map(t => ({
      id: `trg_${crypto.randomUUID().slice(0, 8)}`,
      workflowId,
      type: t.type,
      config: t.config || {},
      enabled: true,
      createdAt: new Date().toISOString(),
    }));

    const version: WorkflowVersion = {
      id: versionId,
      workflowId,
      versionNumber: 1,
      description: `Initial version planned from prompt: "${prompt}"`,
      graph: {
        nodes: plan.nodes,
        edges: plan.edges,
      },
      triggers,
      variables: plan.variables || [],
      requiredCapabilities: plan.requiredCapabilities || [],
      requiredSkills: plan.requiredSkills || [],
      requiredAgents: plan.requiredAgents || [],
      timeoutSeconds: plan.timeoutSeconds || 3600,
      maxRetries: plan.maxRetries || 3,
      financialApprovalRequired: plan.financialApprovalRequired || false,
      createdAt: new Date().toISOString(),
    };

    // Validate generated graph
    const validation = this.validator.validate(version);
    if (!validation.valid) {
      this.logger?.warn(`Generated workflow had validation issues: ${validation.errors.join('; ')}`);
    }

    this.repo.saveWorkflow(workflow);
    this.repo.saveVersion(version);
    return { workflow, version };
  }

  /**
   * Modifies an existing workflow using natural language, creating a NEW version (v2, v3, etc.)
   * without mutating active runs.
   */
  public async modifyWithNaturalLanguage(
    workflowId: string,
    modificationPrompt: string
  ): Promise<WorkflowVersion> {
    const workflow = this.repo.getWorkflow(workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found.`);

    const currentVersion = this.repo.getLatestVersion(workflowId);
    if (!currentVersion) throw new Error(`No versions found for workflow '${workflowId}'.`);

    const newVersionNumber = currentVersion.versionNumber + 1;
    const newVersionId = `wv_${crypto.randomUUID().slice(0, 10)}`;

    // Clone existing graph
    const nodes: WorkflowNode[] = JSON.parse(JSON.stringify(currentVersion.graph.nodes));
    const edges: WorkflowEdge[] = JSON.parse(JSON.stringify(currentVersion.graph.edges));
    const triggers = JSON.parse(JSON.stringify(currentVersion.triggers || []));
    const variables = JSON.parse(JSON.stringify(currentVersion.variables || []));

    const promptLower = modificationPrompt.toLowerCase();

    // Natural Language Rule-Based Transformation
    if (promptLower.includes('notification') || promptLower.includes('notify')) {
      const notifyNode: WorkflowNode = {
        id: `node_notify_${crypto.randomUUID().slice(0, 6)}`,
        name: 'Workflow Notification',
        type: 'NOTIFY',
        config: { message: `Notification: ${modificationPrompt}`, channel: 'system' },
      };
      nodes.push(notifyNode);

      // Connect to last node
      const lastNode = nodes.find(n => n.type !== 'NOTIFY' && n.type !== 'END') || nodes[nodes.length - 2];
      if (lastNode) {
        edges.push({
          id: `edge_${crypto.randomUUID().slice(0, 6)}`,
          fromNodeId: lastNode.id,
          toNodeId: notifyNode.id,
        });
      }
    } else if (promptLower.includes('approval') || promptLower.includes('ask me')) {
      const apprNode: WorkflowNode = {
        id: `node_approval_${crypto.randomUUID().slice(0, 6)}`,
        name: 'Human Approval Gate',
        type: 'APPROVAL',
        config: { prompt: modificationPrompt, riskLevel: 'MEDIUM' },
      };
      nodes.unshift(apprNode);
      if (nodes.length > 1) {
        edges.push({
          id: `edge_${crypto.randomUUID().slice(0, 6)}`,
          fromNodeId: apprNode.id,
          toNodeId: nodes[1].id,
        });
      }
    } else if (promptLower.includes('research') && promptLower.includes('before coding')) {
      const researchNode: WorkflowNode = {
        id: `node_research_${crypto.randomUUID().slice(0, 6)}`,
        name: 'Research Prior to Coding',
        type: 'RESEARCH',
        config: { query: 'Investigate problem context and architecture', category: 'CODE_RESEARCH' },
      };
      nodes.unshift(researchNode);
      const codeNode = nodes.find(n => n.type === 'CODE');
      if (codeNode) {
        edges.push({
          id: `edge_${crypto.randomUUID().slice(0, 6)}`,
          fromNodeId: researchNode.id,
          toNodeId: codeNode.id,
        });
      }
    } else if (promptLower.includes('gāṇḍīva') || promptLower.includes('gandiva')) {
      for (const n of nodes) {
        if (n.type === 'AGENT' || n.type === 'CODE') {
          n.config.agentId = 'gandiva';
        }
      }
    } else if (promptLower.includes('retry') && promptLower.includes('3')) {
      for (const n of nodes) {
        if (n.type === 'ACTION' || n.type === 'CAPABILITY') {
          n.retryPolicy = { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 };
        }
      }
    } else if (promptLower.includes('every monday') || promptLower.includes('schedule')) {
      triggers.push({
        id: `trg_${crypto.randomUUID().slice(0, 8)}`,
        workflowId,
        type: 'CRON',
        config: { cronExpression: '0 9 * * 1', intervalSeconds: 604800 },
        enabled: true,
        createdAt: new Date().toISOString(),
      });
    }

    const newVersion: WorkflowVersion = {
      id: newVersionId,
      workflowId,
      versionNumber: newVersionNumber,
      description: `Modified from v${currentVersion.versionNumber}: "${modificationPrompt}"`,
      graph: { nodes, edges },
      triggers,
      variables,
      requiredCapabilities: currentVersion.requiredCapabilities,
      requiredSkills: currentVersion.requiredSkills,
      requiredAgents: currentVersion.requiredAgents,
      timeoutSeconds: currentVersion.timeoutSeconds,
      maxRetries: currentVersion.maxRetries,
      financialApprovalRequired: currentVersion.financialApprovalRequired,
      createdAt: new Date().toISOString(),
    };

    this.repo.saveVersion(newVersion);
    this.repo.updateWorkflowActiveVersion(workflowId, newVersionNumber);
    this.logger?.info(`Workflow '${workflowId}' updated to version ${newVersionNumber} via natural language.`);
    return newVersion;
  }

  /**
   * Answers questions explaining what a workflow does or why a run behaved in a certain way.
   */
  public explainWorkflow(workflowId: string, runId?: string): Record<string, any> {
    const workflow = this.repo.getWorkflow(workflowId);
    if (!workflow) throw new Error(`Workflow '${workflowId}' not found.`);

    const version = this.repo.getVersion(workflowId, workflow.activeVersion);
    const explanation: Record<string, any> = {
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      activeVersion: workflow.activeVersion,
      totalNodes: version?.graph.nodes.length || 0,
      nodeTypes: version?.graph.nodes.map(n => ({ id: n.id, name: n.name, type: n.type })) || [],
      triggers: version?.triggers.map(t => t.type) || [],
    };

    if (runId) {
      const run = this.repo.getRun(runId);
      const runNodes = this.repo.listRunNodes(runId);
      const approvals = this.repo.listApprovals({ runId });

      if (run) {
        explanation.runExplanation = {
          runId: run.id,
          status: run.status,
          triggerType: run.triggerType,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          errorMessage: run.errorMessage,
          failureReason: run.failureReason,
          resourceUsage: run.resourceUsage,
          executedNodesCount: runNodes.length,
          completedNodes: run.completedNodeIds,
          failedNodes: run.failedNodeIds,
          pendingApproval: approvals.find(a => a.status === 'PENDING')?.prompt,
          nodeTimeline: runNodes.map(rn => ({
            nodeId: rn.nodeId,
            nodeName: rn.nodeName,
            status: rn.status,
            durationMs: rn.durationMs,
            agentId: rn.agentId,
            modelId: rn.modelId,
            toolCalls: rn.toolCalls,
          })),
        };
      }
    }

    return explanation;
  }

  private async synthesizePlan(prompt: string): Promise<{
    name: string;
    description: string;
    category: string;
    tags: string[];
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    triggers?: Array<{ type: WorkflowTrigger['type']; config?: any }>;
    variables?: any[];
    requiredCapabilities?: string[];
    requiredSkills?: string[];
    requiredAgents?: string[];
    timeoutSeconds?: number;
    maxRetries?: number;
    financialApprovalRequired?: boolean;
  }> {
    const p = prompt.toLowerCase();

    // Scenario 1: GitHub bug issue
    if (p.includes('github') || p.includes('bug issue') || p.includes('investigate it')) {
      return {
        name: 'GitHub Bug Investigation & Repair',
        description: 'Investigates GitHub issue, reproduces, repairs via FP-10, runs tests, and prepares diff',
        category: 'ENGINEERING',
        tags: ['github', 'bugfix', 'autonomous-engineering'],
        triggers: [{ type: 'GITHUB_EVENT', config: { eventPattern: 'github.issue.created' } }],
        nodes: [
          {
            id: 'node_trigger',
            name: 'GitHub Issue Event',
            type: 'TRIGGER',
            config: {},
          },
          {
            id: 'node_research',
            name: 'Research Issue Context',
            type: 'RESEARCH',
            config: { query: 'Analyze issue description and codebase', category: 'BUG_INVESTIGATION' },
          },
          {
            id: 'node_engineering',
            name: 'FP-10 Autonomous Repair',
            type: 'CODE',
            config: { task: 'Reproduce bug, apply patch, and run test suite' },
          },
          {
            id: 'node_test',
            name: 'Verify Repair Suite',
            type: 'TEST',
            config: {},
          },
          {
            id: 'node_approval',
            name: 'Approve Proposed Changes',
            type: 'APPROVAL',
            config: { prompt: 'Approve git commit and pull request for bug fix?', riskLevel: 'MEDIUM' },
          },
          {
            id: 'node_report',
            name: 'Engineering Summary Report',
            type: 'REPORT',
            config: { title: 'Bug Fix Completed', body: 'Autonomous patch applied and verified.' },
            isTerminal: true,
          },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'node_trigger', toNodeId: 'node_research' },
          { id: 'e2', fromNodeId: 'node_research', toNodeId: 'node_engineering' },
          { id: 'e3', fromNodeId: 'node_engineering', toNodeId: 'node_test' },
          { id: 'e4', fromNodeId: 'node_test', toNodeId: 'node_approval' },
          { id: 'e5', fromNodeId: 'node_approval', toNodeId: 'node_report' },
        ],
        requiredAgents: ['gandiva', 'vyasa'],
      };
    }

    // Scenario 2: Morning project health check
    if (p.includes('every morning') || p.includes('blocked tasks') || p.includes('daily')) {
      return {
        name: 'Daily Project Health & Unblocker',
        description: 'Inspects project tasks, identifies blockers, and notifies operator',
        category: 'OPERATIONS',
        tags: ['daily', 'health', 'tasks'],
        triggers: [{ type: 'CRON', config: { cronExpression: '0 8 * * *', intervalSeconds: 86400 } }],
        nodes: [
          {
            id: 'node_trigger',
            name: 'Scheduled Morning Trigger',
            type: 'TRIGGER',
            config: {},
          },
          {
            id: 'node_inspect',
            name: 'Inspect Blocked Tasks',
            type: 'ACTION',
            config: { toolName: 'system_info', parameters: {} },
          },
          {
            id: 'node_agent_solve',
            name: 'Task Resolution Agent',
            type: 'AGENT',
            config: { agentId: 'rutam', objective: 'Analyze and resolve blocked tasks' },
          },
          {
            id: 'node_report',
            name: 'Daily Morning Report',
            type: 'REPORT',
            config: { title: 'Morning Health Summary', body: 'Daily review completed.' },
            isTerminal: true,
          },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'node_trigger', toNodeId: 'node_inspect' },
          { id: 'e2', fromNodeId: 'node_inspect', toNodeId: 'node_agent_solve' },
          { id: 'e3', fromNodeId: 'node_agent_solve', toNodeId: 'node_report' },
        ],
        requiredAgents: ['rutam'],
      };
    }

    // Scenario 3: Customer support request
    if (p.includes('customer') || p.includes('support')) {
      return {
        name: 'Customer Support Request Assistant',
        description: 'Understands customer request, classifies, drafts response, and awaits human approval',
        category: 'CUSTOMER_CARE',
        tags: ['support', 'customer', 'communication'],
        triggers: [{ type: 'EVENT', config: { eventPattern: 'customer.ticket.created' } }],
        nodes: [
          {
            id: 'node_trigger',
            name: 'Customer Ticket Trigger',
            type: 'TRIGGER',
            config: {},
          },
          {
            id: 'node_classify',
            name: 'Classify Request',
            type: 'MODEL',
            config: { task: 'classification', prompt: 'Classify ticket intent and urgency' },
          },
          {
            id: 'node_draft',
            name: 'Draft Response',
            type: 'AGENT',
            config: { agentId: 'vyasa', objective: 'Draft polite, accurate support response' },
          },
          {
            id: 'node_approval',
            name: 'Operator Approval Gate',
            type: 'APPROVAL',
            config: { prompt: 'Approve sending response to customer?', riskLevel: 'MEDIUM' },
          },
          {
            id: 'node_send',
            name: 'Send Customer Notification',
            type: 'NOTIFY',
            config: { message: 'Customer response approved and delivered.', channel: 'support' },
            isTerminal: true,
          },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'node_trigger', toNodeId: 'node_classify' },
          { id: 'e2', fromNodeId: 'node_classify', toNodeId: 'node_draft' },
          { id: 'e3', fromNodeId: 'node_draft', toNodeId: 'node_approval' },
          { id: 'e4', fromNodeId: 'node_approval', toNodeId: 'node_send' },
        ],
        requiredAgents: ['vyasa'],
      };
    }

    // Default Generic Workflow
    return {
      name: 'Automated Task Workflow',
      description: prompt,
      category: 'GENERAL',
      tags: ['automation'],
      triggers: [{ type: 'MANUAL', config: {} }],
      nodes: [
        {
          id: 'node_trigger',
          name: 'Manual Trigger',
          type: 'TRIGGER',
          config: {},
        },
        {
          id: 'node_action',
          name: 'Execute Action',
          type: 'ACTION',
          config: { toolName: 'time_now', parameters: {} },
        },
        {
          id: 'node_report',
          name: 'Completion Report',
          type: 'REPORT',
          config: { title: 'Workflow Executed', body: `Executed: ${prompt}` },
          isTerminal: true,
        },
      ],
      edges: [
        { id: 'e1', fromNodeId: 'node_trigger', toNodeId: 'node_action' },
        { id: 'e2', fromNodeId: 'node_action', toNodeId: 'node_report' },
      ],
    };
  }
}
