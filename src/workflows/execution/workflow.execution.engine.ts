/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Execution Engine
 *
 * FP-11: Core execution runtime for compiled directed workflow graphs with
 * checkpointing, parallel branch joins, deterministic conditions, bounded loop detection,
 * approvals, retry policies, and restart recovery.
 */

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { WorkflowRepository } from '../repository/workflow.repository.js';
import { WorkflowCompiler } from '../compiler/workflow.compiler.js';
import { SafeExpressionEvaluator } from '../compiler/expression.evaluator.js';
import { WorkflowCheckpointManager } from './checkpoint.manager.js';
import { WorkflowNodeExecutor, NodeExecutorDependencies } from './node.executors.js';
import {
  WorkflowRun,
  WorkflowRunNode,
  WorkflowNode,
  CompiledWorkflow,
  WorkflowTriggerType,
  JoinStrategy,
} from '../types/workflow.types.js';

export interface WorkflowExecutionEngineOptions {
  repo: WorkflowRepository;
  compiler?: WorkflowCompiler;
  checkpointManager?: WorkflowCheckpointManager;
  dependencies: NodeExecutorDependencies;
  eventBus?: EventBus;
  logger?: ILogger;
}

export class WorkflowExecutionEngine extends EventEmitter {
  private readonly repo: WorkflowRepository;
  private readonly compiler: WorkflowCompiler;
  private readonly checkpointManager: WorkflowCheckpointManager;
  private readonly nodeExecutor: WorkflowNodeExecutor;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  // Active run tracking
  private readonly activeRuns: Map<string, { abortController: AbortController; compiled: CompiledWorkflow }> = new Map();
  // Join barriers tracking: runId -> { nodeId -> Set<completedFromNodeIds> }
  private readonly joinBarriers: Map<string, Map<string, Set<string>>> = new Map();
  // Anti-loop state history: runId -> { nodeId -> Array<stateFingerprint> }
  private readonly nodeStateHistory: Map<string, Map<string, string[]>> = new Map();

  constructor(options: WorkflowExecutionEngineOptions) {
    super();
    this.repo = options.repo;
    this.compiler = options.compiler || new WorkflowCompiler();
    this.checkpointManager = options.checkpointManager || new WorkflowCheckpointManager(this.repo);
    this.nodeExecutor = new WorkflowNodeExecutor(options.dependencies);
    this.eventBus = options.eventBus;
    this.logger = options.logger?.child('WorkflowExecutionEngine');
  }

  /**
   * Starts a new workflow run from a workflow definition.
   */
  public async startRun(params: {
    workflowId: string;
    versionNumber?: number;
    triggerType?: WorkflowTriggerType;
    triggerPayload?: Record<string, any>;
    inputVariables?: Record<string, any>;
    companyId?: string;
    projectId?: string;
    parentRunDepth?: number;
  }): Promise<WorkflowRun> {
    const workflow = this.repo.getWorkflow(params.workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${params.workflowId}' not found.`);
    }

    if (workflow.status === 'DISABLED' || workflow.status === 'ARCHIVED') {
      throw new Error(`Workflow '${workflow.id}' cannot run because its status is ${workflow.status}.`);
    }

    // Check subworkflow recursion depth
    const depth = params.parentRunDepth || 0;
    if (depth > 5) {
      throw new Error(`Maximum subworkflow recursion depth (5) exceeded.`);
    }

    const versionNum = params.versionNumber || workflow.activeVersion;
    const version = this.repo.getVersion(workflow.id, versionNum);
    if (!version) {
      throw new Error(`Workflow version ${versionNum} not found for workflow '${workflow.id}'.`);
    }

    // Compile and validate graph
    const compiled = this.compiler.compile(version);
    if (!compiled.validation.valid) {
      throw new Error(`Cannot start run: Workflow graph is invalid (${compiled.validation.errors.join(', ')})`);
    }

    // Initialize run entity
    const runId = `wrun_${crypto.randomUUID().slice(0, 10)}`;
    const initialVariables: Record<string, any> = {
      ...(params.inputVariables || {}),
      ...(params.triggerPayload ? { trigger: params.triggerPayload } : {}),
    };

    // Populate workflow defined variables
    for (const v of version.variables || []) {
      if (initialVariables[v.name] === undefined) {
        initialVariables[v.name] = v.value;
      }
    }

    const run: WorkflowRun = {
      id: runId,
      workflowId: workflow.id,
      versionId: version.id,
      versionNumber: version.versionNumber,
      status: 'STARTING',
      triggerType: params.triggerType || 'MANUAL',
      triggerPayload: params.triggerPayload || {},
      inputVariables: params.inputVariables || {},
      currentVariables: initialVariables,
      activeNodeIds: [...compiled.entryNodeIds],
      completedNodeIds: [],
      failedNodeIds: [],
      iterationCounts: {},
      resourceUsage: {
        modelCalls: 0,
        toolCalls: 0,
        durationMs: 0,
      },
      companyId: params.companyId || workflow.companyId,
      projectId: params.projectId || workflow.projectId,
      startedAt: new Date().toISOString(),
    };

    this.repo.saveRun(run);
    this.emitEvent('workflow.run.created', {
      workflowId: workflow.id,
      runId: run.id,
      versionNumber: version.versionNumber,
      status: run.status,
    });

    // Begin execution loop
    const abortController = new AbortController();
    this.activeRuns.set(run.id, { abortController, compiled });
    this.joinBarriers.set(run.id, new Map());
    this.nodeStateHistory.set(run.id, new Map());

    run.status = 'RUNNING';
    this.repo.saveRun(run);
    this.emitEvent('workflow.run.started', {
      workflowId: workflow.id,
      runId: run.id,
      status: run.status,
    });

    // Execute entry nodes
    try {
      await this.processNodes(run, compiled, compiled.entryNodeIds, abortController.signal);
    } catch (err: any) {
      this.logger?.error(`Fatal error in run ${run.id}`, { error: String(err) });
      this.failRun(run, String(err?.message || err), 'SYSTEM_ERROR');
    }

    return this.repo.getRun(run.id) || run;
  }

  /**
   * Resumes an existing paused, waiting, or recovered run.
   */
  public async resumeRun(runId: string): Promise<WorkflowRun> {
    const run = this.repo.getRun(runId);
    if (!run) throw new Error(`Run '${runId}' not found.`);

    if (run.status === 'COMPLETED' || run.status === 'CANCELLED') {
      throw new Error(`Run '${runId}' is already ${run.status}.`);
    }

    const version = this.repo.getVersionById(run.versionId);
    if (!version) throw new Error(`Version '${run.versionId}' for run '${runId}' not found.`);

    const compiled = this.compiler.compile(version);
    const abortController = new AbortController();
    this.activeRuns.set(run.id, { abortController, compiled });
    if (!this.joinBarriers.has(run.id)) this.joinBarriers.set(run.id, new Map());
    if (!this.nodeStateHistory.has(run.id)) this.nodeStateHistory.set(run.id, new Map());

    run.status = 'RUNNING';
    run.pausedAt = undefined;
    this.repo.saveRun(run);

    this.emitEvent('workflow.run.resumed', {
      workflowId: run.workflowId,
      runId: run.id,
      status: run.status,
    });

    const nodesToResume = run.activeNodeIds.length > 0 ? run.activeNodeIds : compiled.entryNodeIds;
    try {
      await this.processNodes(run, compiled, nodesToResume, abortController.signal);
    } catch (err: any) {
      this.failRun(run, String(err?.message || err), 'SYSTEM_ERROR');
    }

    return this.repo.getRun(run.id) || run;
  }

  /**
   * Pauses an active run.
   */
  public pauseRun(runId: string): void {
    const run = this.repo.getRun(runId);
    if (!run) throw new Error(`Run '${runId}' not found.`);

    const active = this.activeRuns.get(runId);
    if (active) {
      active.abortController.abort();
      this.activeRuns.delete(runId);
    }

    run.status = 'PAUSED';
    run.pausedAt = new Date().toISOString();
    this.repo.saveRun(run);

    this.emitEvent('workflow.run.paused', {
      workflowId: run.workflowId,
      runId: run.id,
      status: run.status,
    });
  }

  /**
   * Cancels an active run.
   */
  public cancelRun(runId: string, reason = 'Cancelled by operator'): void {
    const run = this.repo.getRun(runId);
    if (!run) throw new Error(`Run '${runId}' not found.`);

    const active = this.activeRuns.get(runId);
    if (active) {
      active.abortController.abort();
      this.activeRuns.delete(runId);
    }

    run.status = 'CANCELLED';
    run.completedAt = new Date().toISOString();
    run.failureReason = reason;
    this.repo.saveRun(run);

    this.emitEvent('workflow.run.cancelled', {
      workflowId: run.workflowId,
      runId: run.id,
      status: run.status,
      details: { reason },
    });
  }

  /**
   * Resolves a pending human approval for a run.
   */
  public async resolveApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', decidedBy = 'operator', comments?: string): Promise<void> {
    const approval = this.repo.getApproval(approvalId);
    if (!approval) throw new Error(`Approval '${approvalId}' not found.`);

    approval.status = decision;
    approval.respondedAt = new Date().toISOString();
    approval.decidedBy = decidedBy;
    approval.comments = comments;
    this.repo.saveApproval(approval);

    const run = this.repo.getRun(approval.runId);
    if (!run) return;

    this.emitEvent('workflow.approval.resolved', {
      workflowId: run.workflowId,
      runId: run.id,
      nodeId: approval.nodeId,
      details: { decision, decidedBy, comments },
    });

    if (decision === 'REJECTED') {
      this.failRun(run, `Approval rejected for node '${approval.nodeName}' by ${decidedBy}: ${comments || 'No comment'}`, 'APPROVAL_REJECTED');
      return;
    }

    // Set approval flag in variables and resume run
    run.currentVariables[`__approval_${approval.nodeId}`] = 'APPROVED';
    run.currentVariables[`__approval_${approval.nodeId}_by`] = decidedBy;
    if (approval.riskLevel === 'HIGH' || approval.prompt.toLowerCase().includes('financial')) {
      run.currentVariables.__financial_approved = true;
    }
    this.repo.saveRun(run);

    await this.resumeRun(run.id);
  }

  // ================= Node Orchestration Loop =================

  private async processNodes(
    run: WorkflowRun,
    compiled: CompiledWorkflow,
    nodeIds: string[],
    abortSignal: AbortSignal
  ): Promise<void> {
    if (abortSignal.aborted) return;
    if (nodeIds.length === 0) {
      this.checkRunCompletion(run, compiled);
      return;
    }

    // Process nodes concurrently or sequentially
    const nextRoundsNodeIds: string[] = [];

    for (const nodeId of nodeIds) {
      if (abortSignal.aborted) return;
      const node = compiled.nodeMap.get(nodeId);
      if (!node) continue;

      // Anti-loop check on LOOP nodes or re-visited nodes
      const isLoopViolation = this.checkAntiLoop(run, node);
      if (isLoopViolation) {
        this.failRun(run, isLoopViolation, 'ANTI_LOOP_VIOLATION');
        return;
      }

      const nextTargetNodes = await this.executeNodeWithRetries(run, compiled, node, abortSignal);
      if (abortSignal.aborted || run.status === 'FAILED' || run.status === 'WAITING_APPROVAL' || run.status === 'WAITING' || run.status === 'PAUSED') {
        return;
      }

      if (nextTargetNodes && nextTargetNodes.length > 0) {
        nextRoundsNodeIds.push(...nextTargetNodes);
      }
    }

    // Filter unique targets for next round
    const uniqueNext = Array.from(new Set(nextRoundsNodeIds));
    run.activeNodeIds = uniqueNext;
    this.repo.saveRun(run);

    if (uniqueNext.length > 0) {
      await this.processNodes(run, compiled, uniqueNext, abortSignal);
    } else {
      this.checkRunCompletion(run, compiled);
    }
  }

  private async executeNodeWithRetries(
    run: WorkflowRun,
    compiled: CompiledWorkflow,
    node: WorkflowNode,
    abortSignal: AbortSignal
  ): Promise<string[] | null> {
    const maxAttempts = node.retryPolicy?.maxAttempts || 1;
    let attempt = 1;
    let lastError: string | undefined;

    // Checkpoint before executing node
    this.checkpointManager.createCheckpoint(run, node.id, attempt);

    while (attempt <= maxAttempts) {
      if (abortSignal.aborted) return null;

      const runNode: WorkflowRunNode = {
        id: `wrn_${crypto.randomUUID().slice(0, 10)}`,
        runId: run.id,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        attemptNumber: attempt,
        status: 'RUNNING',
        inputData: { ...run.currentVariables },
        outputData: {},
        startedAt: new Date().toISOString(),
        durationMs: 0,
        toolCalls: 0,
        artifacts: [],
      };
      this.repo.saveRunNode(runNode);

      this.emitEvent('workflow.node.started', {
        workflowId: run.workflowId,
        runId: run.id,
        nodeId: node.id,
        status: 'RUNNING',
      });

      const startTime = Date.now();
      const result = await this.nodeExecutor.executeNode({
        run,
        node,
        variables: run.currentVariables,
        attempt,
        abortSignal,
      });

      const durationMs = Date.now() - startTime;
      runNode.durationMs = durationMs;
      run.resourceUsage.durationMs += durationMs;
      if (result.modelId) run.resourceUsage.modelCalls++;
      if (result.toolCalls) run.resourceUsage.toolCalls += result.toolCalls;

      // Handle Waiting / Approval
      if (result.status === 'WAITING_APPROVAL' && result.approvalRequired) {
        this.repo.saveApproval(result.approvalRequired);
        run.status = 'WAITING_APPROVAL';
        this.repo.saveRun(run);

        runNode.status = 'WAITING';
        runNode.outputData = result.outputData;
        this.repo.saveRunNode(runNode);

        this.emitEvent('workflow.approval.requested', {
          workflowId: run.workflowId,
          runId: run.id,
          nodeId: node.id,
          details: { approvalId: result.approvalRequired.id, prompt: result.approvalRequired.prompt },
        });
        return null;
      }

      if (result.status === 'WAITING') {
        run.status = 'WAITING';
        this.repo.saveRun(run);
        runNode.status = 'WAITING';
        runNode.outputData = result.outputData;
        this.repo.saveRunNode(runNode);
        return null;
      }

      if (result.status === 'SUCCEEDED') {
        runNode.status = 'SUCCEEDED';
        runNode.outputData = result.outputData;
        runNode.completedAt = new Date().toISOString();
        runNode.agentId = result.agentId;
        runNode.modelId = result.modelId;
        runNode.capabilityId = result.capabilityId;
        runNode.toolCalls = result.toolCalls || 0;

        // Persist artifacts
        if (result.artifacts) {
          for (const art of result.artifacts) {
            this.repo.saveArtifact(art);
            runNode.artifacts.push(art.id);
          }
        }
        this.repo.saveRunNode(runNode);

        // Update run variables
        if (result.variablesToUpdate) {
          Object.assign(run.currentVariables, result.variablesToUpdate);
        }
        if (!run.completedNodeIds.includes(node.id)) {
          run.completedNodeIds.push(node.id);
        }

        this.emitEvent('workflow.node.completed', {
          workflowId: run.workflowId,
          runId: run.id,
          nodeId: node.id,
          status: 'SUCCEEDED',
        });

        // Determine next nodes
        return this.resolveNextNodes(run, compiled, node, result.nextBranches);
      }

      // If FAILED
      lastError = result.error || 'Unknown node execution error';
      runNode.status = 'FAILED';
      runNode.error = lastError;
      runNode.completedAt = new Date().toISOString();
      this.repo.saveRunNode(runNode);

      // Check retry policy
      if (attempt < maxAttempts) {
        attempt++;
        this.emitEvent('workflow.node.retrying', {
          workflowId: run.workflowId,
          runId: run.id,
          nodeId: node.id,
          details: { attempt, maxAttempts, error: lastError },
        });

        const backoff = (node.retryPolicy?.backoffMs || 1000) * Math.pow(node.retryPolicy?.backoffMultiplier || 1, attempt - 1);
        await new Promise(res => setTimeout(res, Math.min(backoff, node.retryPolicy?.maxBackoffMs || 10000)));
      } else {
        break;
      }
    }

    // Failed after all attempts
    run.failedNodeIds.push(node.id);
    this.emitEvent('workflow.node.failed', {
      workflowId: run.workflowId,
      runId: run.id,
      nodeId: node.id,
      error: lastError,
    });

    this.failRun(run, `Node '${node.name}' (${node.id}) failed: ${lastError}`, 'NODE_FAILED');
    return null;
  }

  /**
   * Resolves outgoing edges from a completed node based on conditions and joins.
   */
  private resolveNextNodes(
    run: WorkflowRun,
    compiled: CompiledWorkflow,
    node: WorkflowNode,
    explicitBranches?: string[]
  ): string[] {
    if (explicitBranches && explicitBranches.length > 0) {
      return explicitBranches;
    }

    const outgoing = compiled.adjacencyList.get(node.id) || [];
    const nextNodes: string[] = [];

    // Special handling for LOOP nodes to separate cycle body from exit path
    if (node.type === 'LOOP') {
      const currentCount = run.iterationCounts[node.id] || 0;
      const maxIterations = node.config.maxIterations || 10;
      let shouldContinue = currentCount < maxIterations;
      if (shouldContinue && node.config.condition) {
        shouldContinue = SafeExpressionEvaluator.evaluateCondition(node.config.condition, {
          ...run.currentVariables,
          iteration: currentCount,
        });
      }

      const cycleTargets: string[] = [];
      const exitTargets: string[] = [];

      for (const edge of outgoing) {
        if (this.canReach(compiled, edge.toNodeId, node.id)) {
          cycleTargets.push(edge.toNodeId);
        } else {
          exitTargets.push(edge.toNodeId);
        }
      }

      return shouldContinue ? cycleTargets : exitTargets;
    }

    for (const edge of outgoing) {
      // If edge has a condition expression, evaluate it
      if (edge.condition) {
        const passes = SafeExpressionEvaluator.evaluateCondition(edge.condition, run.currentVariables);
        if (!passes) {
          continue;
        }
      }

      const targetNode = compiled.nodeMap.get(edge.toNodeId);
      if (!targetNode) continue;

      // Handle JOIN node barriers
      if (targetNode.type === 'JOIN') {
        const joinSatisfied = this.checkJoinBarrier(run, compiled, targetNode, node.id);
        if (!joinSatisfied) {
          continue; // Wait until other branches arrive
        }
      }

      nextNodes.push(targetNode.id);
    }

    return nextNodes;
  }

  private canReach(compiled: CompiledWorkflow, startId: string, targetId: string): boolean {
    const queue = [startId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === targetId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);

      const outEdges = compiled.adjacencyList.get(curr) || [];
      for (const e of outEdges) {
        if (!visited.has(e.toNodeId)) {
          queue.push(e.toNodeId);
        }
      }
    }
    return false;
  }

  private checkJoinBarrier(
    run: WorkflowRun,
    compiled: CompiledWorkflow,
    joinNode: WorkflowNode,
    fromNodeId: string
  ): boolean {
    let runBarriers = this.joinBarriers.get(run.id);
    if (!runBarriers) {
      runBarriers = new Map();
      this.joinBarriers.set(run.id, runBarriers);
    }

    let completedIncoming = runBarriers.get(joinNode.id);
    if (!completedIncoming) {
      completedIncoming = new Set();
      runBarriers.set(joinNode.id, completedIncoming);
    }
    completedIncoming.add(fromNodeId);

    const requiredIncoming = compiled.reverseAdjacencyList.get(joinNode.id) || [];
    const strategy: JoinStrategy = joinNode.config.strategy || 'ALL';

    if (strategy === 'ANY') {
      return true;
    } else if (strategy === 'QUORUM') {
      const needed = Math.ceil(requiredIncoming.length / 2);
      return completedIncoming.size >= needed;
    } else {
      // 'ALL' default
      return requiredIncoming.every(reqId => completedIncoming.has(reqId));
    }
  }

  private checkAntiLoop(run: WorkflowRun, node: WorkflowNode): string | null {
    let runHistory = this.nodeStateHistory.get(run.id);
    if (!runHistory) {
      runHistory = new Map();
      this.nodeStateHistory.set(run.id, runHistory);
    }

    let history = runHistory.get(node.id);
    if (!history) {
      history = [];
      runHistory.set(node.id, history);
    }

    // Create fingerprint of variables
    const varsCopy = { ...run.currentVariables };
    delete varsCopy.trigger;
    const fingerprint = crypto.createHash('md5').update(JSON.stringify(varsCopy)).digest('hex');
    history.push(fingerprint);

    // If identical state occurred 4+ times without progress, detect cycle
    const sameStateCount = history.filter(fp => fp === fingerprint).length;
    if (sameStateCount > 4) {
      return `Anti-loop violation: Detected identical repeated state on node '${node.name}' (${node.id}) ${sameStateCount} times without convergence.`;
    }

    return null;
  }

  private checkRunCompletion(run: WorkflowRun, _compiled: CompiledWorkflow): void {
    if (run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELLED' || run.status === 'WAITING_APPROVAL' || run.status === 'WAITING') {
      return;
    }

    run.status = 'COMPLETED';
    run.completedAt = new Date().toISOString();
    this.repo.saveRun(run);
    this.activeRuns.delete(run.id);

    this.emitEvent('workflow.run.completed', {
      workflowId: run.workflowId,
      runId: run.id,
      status: run.status,
      details: {
        completedNodes: run.completedNodeIds.length,
        resourceUsage: run.resourceUsage,
      },
    });
    this.logger?.info(`Workflow run [${run.id}] completed successfully.`);
  }

  private failRun(run: WorkflowRun, errorMsg: string, reason: string): void {
    run.status = 'FAILED';
    run.completedAt = new Date().toISOString();
    run.errorMessage = errorMsg;
    run.failureReason = reason;
    this.repo.saveRun(run);
    this.activeRuns.delete(run.id);

    this.emitEvent('workflow.run.failed', {
      workflowId: run.workflowId,
      runId: run.id,
      status: run.status,
      error: errorMsg,
      details: { reason },
    });
    this.logger?.error(`Workflow run [${run.id}] failed: ${errorMsg}`);
  }

  private emitEvent(event: any, payload: any): void {
    const fullPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    this.emit(event, fullPayload);
    this.eventBus?.emit(event, fullPayload);
  }
}
