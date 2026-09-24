/**
 * HRSIKESA (हृषीकेश) — Task Directed Acyclic Graph (DAG) Engine
 *
 * Enforces dependency validation, cycle detection, topological sequencing,
 * depth bounds, and ready task resolution for autonomous missions.
 */

import { PlannedTask, MissionBudget, DEFAULT_MISSION_BUDGET } from '../interfaces/mission.types.js';

export interface GraphValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly maxDepth: number;
  readonly totalTasks: number;
}

export class TaskGraph {
  private readonly tasks = new Map<string, PlannedTask>();
  private readonly dependencies = new Map<string, Set<string>>();
  private readonly dependents = new Map<string, Set<string>>();
  private readonly budget: MissionBudget;

  constructor(tasks: readonly PlannedTask[], budget: MissionBudget = DEFAULT_MISSION_BUDGET) {
    this.budget = budget;
    for (const task of tasks) {
      this.tasks.set(task.id, task);
      this.dependencies.set(task.id, new Set(task.dependencies || []));
      if (!this.dependents.has(task.id)) {
        this.dependents.set(task.id, new Set());
      }
    }

    // Build dependents index
    for (const [taskId, deps] of this.dependencies.entries()) {
      for (const depId of deps) {
        if (!this.dependents.has(depId)) {
          this.dependents.set(depId, new Set());
        }
        this.dependents.get(depId)!.add(taskId);
      }
    }
  }

  public validate(): GraphValidationResult {
    const errors: string[] = [];

    // 1. Check max tasks count limit
    if (this.tasks.size === 0) {
      errors.push('Task graph cannot be empty.');
    }
    if (this.tasks.size > this.budget.maxTasks) {
      errors.push(`Task count (${this.tasks.size}) exceeds mission budget maxTasks (${this.budget.maxTasks}).`);
    }

    // 2. Validate individual task dependencies
    for (const [taskId, deps] of this.dependencies.entries()) {
      // Self dependency
      if (deps.has(taskId)) {
        errors.push(`Task '${taskId}' has a self-dependency.`);
      }

      // Missing dependency
      for (const depId of deps) {
        if (!this.tasks.has(depId)) {
          errors.push(`Task '${taskId}' depends on non-existent task '${depId}'.`);
        }
      }
    }

    // 3. Cycle detection and topological sort
    const inDegree = new Map<string, number>();
    for (const taskId of this.tasks.keys()) {
      inDegree.set(taskId, (this.dependencies.get(taskId) || new Set()).size);
    }

    const queue: string[] = [];
    for (const [taskId, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(taskId);
    }

    let visitedCount = 0;
    const taskDepths = new Map<string, number>();
    for (const rootId of queue) {
      taskDepths.set(rootId, 0);
    }

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      visitedCount++;
      const currentDepth = taskDepths.get(currentId) || 0;

      const children = this.dependents.get(currentId) || new Set();
      for (const childId of children) {
        const nextDepth = Math.max(taskDepths.get(childId) || 0, currentDepth + 1);
        taskDepths.set(childId, nextDepth);

        const newDeg = (inDegree.get(childId) || 1) - 1;
        inDegree.set(childId, newDeg);
        if (newDeg === 0) {
          queue.push(childId);
        }
      }
    }

    if (visitedCount !== this.tasks.size) {
      errors.push('Circular dependency detected in task graph.');
    }

    // 4. Validate max depth
    let maxDepth = 0;
    for (const depth of taskDepths.values()) {
      if (depth > maxDepth) maxDepth = depth;
    }

    if (maxDepth > this.budget.maxAgentDepth) {
      errors.push(`Task graph depth (${maxDepth}) exceeds mission budget maxAgentDepth (${this.budget.maxAgentDepth}).`);
    }

    return {
      valid: errors.length === 0,
      errors,
      maxDepth,
      totalTasks: this.tasks.size
    };
  }

  public getReadyTasks(
    completedTaskIds: ReadonlySet<string>,
    failedTaskIds: ReadonlySet<string>,
    runningTaskIds: ReadonlySet<string>,
    blockedTaskIds: ReadonlySet<string> = new Set()
  ): PlannedTask[] {
    const ready: PlannedTask[] = [];

    for (const [taskId, task] of this.tasks.entries()) {
      if (
        completedTaskIds.has(taskId) ||
        failedTaskIds.has(taskId) ||
        runningTaskIds.has(taskId) ||
        blockedTaskIds.has(taskId)
      ) {
        continue;
      }

      const deps = this.dependencies.get(taskId) || new Set();
      // All dependencies must be completed
      let allDepsSatisfied = true;
      for (const depId of deps) {
        if (!completedTaskIds.has(depId)) {
          allDepsSatisfied = false;
          break;
        }
      }

      if (allDepsSatisfied) {
        ready.push(task);
      }
    }

    return ready;
  }

  public isBlockedByFailure(taskId: string, failedTaskIds: ReadonlySet<string>): boolean {
    const deps = this.dependencies.get(taskId) || new Set();
    for (const depId of deps) {
      if (failedTaskIds.has(depId)) {
        return true;
      }
    }
    return false;
  }

  public getTask(id: string): PlannedTask | undefined {
    return this.tasks.get(id);
  }

  public getAllTasks(): PlannedTask[] {
    return Array.from(this.tasks.values());
  }

  public getDependencies(taskId: string): string[] {
    return Array.from(this.dependencies.get(taskId) || []);
  }

  public getDependents(taskId: string): string[] {
    return Array.from(this.dependents.get(taskId) || []);
  }

  public getTopologicalOrder(): PlannedTask[] {
    const inDegree = new Map<string, number>();
    for (const taskId of this.tasks.keys()) {
      inDegree.set(taskId, (this.dependencies.get(taskId) || new Set()).size);
    }

    const queue: string[] = [];
    for (const [taskId, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(taskId);
    }

    const order: PlannedTask[] = [];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const task = this.tasks.get(currentId);
      if (task) order.push(task);

      const children = this.dependents.get(currentId) || new Set();
      for (const childId of children) {
        const newDeg = (inDegree.get(childId) || 1) - 1;
        inDegree.set(childId, newDeg);
        if (newDeg === 0) {
          queue.push(childId);
        }
      }
    }

    return order;
  }
}
