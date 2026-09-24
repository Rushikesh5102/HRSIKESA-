/**
 * HRSIKESA - Agent Delegation Manager
 *
 * Controls structured task delegation between agents.
 * Enforces hard limits on delegation depth and active task counts.
 * Agents cannot spawn sibling agents directly - all delegation goes through this manager.
 */

import { randomUUID } from 'node:crypto';
import { AgentTask, AgentResult } from '../interfaces/task.types.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

/** Delegation policy limits. */
export interface DelegationLimits {
  readonly maxDepth: number;
  readonly maxChildrenPerTask: number;
  readonly maxActiveTasks: number;
}

const DEFAULT_LIMITS: DelegationLimits = {
  maxDepth: 2,
  maxChildrenPerTask: 5,
  maxActiveTasks: 3
};

export interface DelegationRecord {
  readonly parentTaskId: string;
  readonly childTaskId: string;
  readonly toAgentId: string;
  readonly createdAt: string;
}

export class AgentDelegationManager {
  private readonly limits: DelegationLimits;
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;

  /** Active task tracking for limit enforcement. */
  private readonly activeTasks = new Map<string, AgentTask>();
  /** Parent -> children mapping. */
  private readonly childIndex = new Map<string, string[]>();
  /** Task depth index. */
  private readonly depthIndex = new Map<string, number>();

  constructor(
    limits?: Partial<DelegationLimits>,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.eventBus = eventBus;
    this.logger = logger?.child('AgentDelegationManager');
  }

  public getLimits(): DelegationLimits {
    return this.limits;
  }

  /**
   * Register a root task (depth 0). Call this when a mission root task is created.
   */
  public registerRootTask(task: AgentTask): void {
    this.activeTasks.set(task.id, task);
    this.depthIndex.set(task.id, 0);
    this.childIndex.set(task.id, []);
  }

  /**
   * Delegate a subtask from parentTaskId to an agent.
   * Validates depth, children, and total active task limits.
   * Returns the created child AgentTask.
   */
  public delegate(
    parentTaskId: string,
    toAgentId: string,
    objective: string,
    context?: string,
    inputs?: Record<string, unknown>,
    missionId?: string
  ): AgentTask {
    // 1. Verify parent task is known
    const parentTask = this.activeTasks.get(parentTaskId);
    if (!parentTask) {
      throw new Error('Delegation rejected: parent task ' + parentTaskId + ' is not registered as active.');
    }

    // 2. Enforce max depth
    const parentDepth = this.depthIndex.get(parentTaskId) || 0;
    const childDepth = parentDepth + 1;
    if (childDepth > this.limits.maxDepth) {
      throw new Error(
        'Delegation rejected: max delegation depth (' + this.limits.maxDepth + ') exceeded. ' +
        'Parent task is already at depth ' + parentDepth + '.'
      );
    }

    // 3. Enforce max children per task
    const siblings = this.childIndex.get(parentTaskId) || [];
    if (siblings.length >= this.limits.maxChildrenPerTask) {
      throw new Error(
        'Delegation rejected: max children per task (' + this.limits.maxChildrenPerTask + ') exceeded for parent ' + parentTaskId + '.'
      );
    }

    // 4. Enforce total active task limit
    if (this.activeTasks.size >= this.limits.maxActiveTasks) {
      throw new Error(
        'Delegation rejected: max active tasks (' + this.limits.maxActiveTasks + ') reached. ' +
        'Wait for existing tasks to complete before delegating further.'
      );
    }

    // 5. Create child task
    const childTask: AgentTask = {
      id: 'task_' + randomUUID().replace(/-/g, '').substring(0, 16),
      agentId: toAgentId,
      missionId: missionId || parentTask.missionId,
      parentTaskId,
      objective,
      context,
      inputs: inputs || {},
      priority: parentTask.priority,
      status: 'queued',
      depth: childDepth,
      sessionId: parentTask.sessionId,
      createdAt: new Date().toISOString()
    };

    // 6. Register child task
    this.activeTasks.set(childTask.id, childTask);
    this.depthIndex.set(childTask.id, childDepth);
    this.childIndex.set(childTask.id, []);
    siblings.push(childTask.id);
    this.childIndex.set(parentTaskId, siblings);

    this.logger?.info(
      'Delegated subtask [' + childTask.id + '] from [' + parentTaskId + '] to agent [' + toAgentId + '] at depth ' + childDepth
    );
    this.eventBus?.emit('agent.task_delegated', {
      parentTaskId,
      childTaskId: childTask.id,
      toAgentId,
      depth: childDepth
    });

    return childTask;
  }

  /**
   * Mark a task as complete, removing it from active tracking.
   */
  public completeTask(taskId: string, result: AgentResult): void {
    this.activeTasks.delete(taskId);
    this.eventBus?.emit('agent.task_resolved', { taskId, status: result.status });
  }

  public getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  public getTaskDepth(taskId: string): number {
    return this.depthIndex.get(taskId) || 0;
  }

  public getChildren(taskId: string): string[] {
    return [...(this.childIndex.get(taskId) || [])];
  }

  public isActive(taskId: string): boolean {
    return this.activeTasks.has(taskId);
  }
}
