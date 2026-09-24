/**
 * HRSIKESA (हृषीकेश) — Task DAG & Dependency Resolution Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskGraph } from '../src/agents/tasks/task.graph.js';
import { PlannedTask, DEFAULT_MISSION_BUDGET } from '../src/agents/interfaces/mission.types.js';

test('TaskGraph — DAG Validation & Execution Order', async (t) => {
  await t.test('detects valid linear DAG and produces topological order', () => {
    const tasks: PlannedTask[] = [
      { id: 'task-1', title: 'Task 1', objective: 'Obj 1', assignedAgentId: 'aja', dependencies: [], estimatedDangerTier: 0 },
      { id: 'task-2', title: 'Task 2', objective: 'Obj 2', assignedAgentId: 'gandiva', dependencies: ['task-1'], estimatedDangerTier: 0 },
      { id: 'task-3', title: 'Task 3', objective: 'Obj 3', assignedAgentId: 'vighna', dependencies: ['task-2'], estimatedDangerTier: 0 }
    ];

    const graph = new TaskGraph(tasks);
    const validation = graph.validate();
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.errors.length, 0);

    const order = graph.getTopologicalOrder().map((t) => t.id);
    assert.deepStrictEqual(order, ['task-1', 'task-2', 'task-3']);
  });

  await t.test('detects branched DAG and determines ready tasks correctly', () => {
    const tasks: PlannedTask[] = [
      { id: 'A', title: 'A', objective: 'A', assignedAgentId: 'aja', dependencies: [], estimatedDangerTier: 0 },
      { id: 'B', title: 'B', objective: 'B', assignedAgentId: 'gandiva', dependencies: ['A'], estimatedDangerTier: 0 },
      { id: 'C', title: 'C', objective: 'C', assignedAgentId: 'rahu', dependencies: ['A'], estimatedDangerTier: 0 },
      { id: 'D', title: 'D', objective: 'D', assignedAgentId: 'vighna', dependencies: ['B', 'C'], estimatedDangerTier: 0 }
    ];

    const graph = new TaskGraph(tasks);
    assert.strictEqual(graph.validate().valid, true);

    // Initial ready tasks (no completed tasks)
    const initialReady = graph.getReadyTasks(new Set(), new Set(), new Set()).map((t) => t.id);
    assert.deepStrictEqual(initialReady, ['A']);

    // After A is completed, B and C should be ready
    const readyAfterA = graph.getReadyTasks(new Set(['A']), new Set(), new Set()).map((t) => t.id);
    assert.deepStrictEqual(readyAfterA.sort(), ['B', 'C'].sort());

    // After only B is completed, D is NOT ready yet (requires C)
    const readyAfterB = graph.getReadyTasks(new Set(['A', 'B']), new Set(), new Set()).map((t) => t.id);
    assert.deepStrictEqual(readyAfterB, ['C']);

    // After both B and C are completed, D is ready
    const readyAfterBC = graph.getReadyTasks(new Set(['A', 'B', 'C']), new Set(), new Set()).map((t) => t.id);
    assert.deepStrictEqual(readyAfterBC, ['D']);
  });

  await t.test('rejects circular dependencies (cycle detection)', () => {
    const tasks: PlannedTask[] = [
      { id: 'A', title: 'A', objective: 'A', assignedAgentId: 'aja', dependencies: ['C'], estimatedDangerTier: 0 },
      { id: 'B', title: 'B', objective: 'B', assignedAgentId: 'gandiva', dependencies: ['A'], estimatedDangerTier: 0 },
      { id: 'C', title: 'C', objective: 'C', assignedAgentId: 'rahu', dependencies: ['B'], estimatedDangerTier: 0 }
    ];

    const graph = new TaskGraph(tasks);
    const validation = graph.validate();
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes('cycle') || e.includes('Circular')));
  });

  await t.test('rejects self-dependencies', () => {
    const tasks: PlannedTask[] = [
      { id: 'A', title: 'A', objective: 'A', assignedAgentId: 'aja', dependencies: ['A'], estimatedDangerTier: 0 }
    ];

    const graph = new TaskGraph(tasks);
    const validation = graph.validate();
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes('self-dependency') || e.includes('Self-dependency')));
  });

  await t.test('rejects non-existent task dependencies', () => {
    const tasks: PlannedTask[] = [
      { id: 'A', title: 'A', objective: 'A', assignedAgentId: 'aja', dependencies: ['ghost-task'], estimatedDangerTier: 0 }
    ];

    const graph = new TaskGraph(tasks);
    const validation = graph.validate();
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes('does not exist') || e.includes('non-existent')));
  });

  await t.test('enforces max task depth limit', () => {
    // Chain of depth 5 when limit is 3
    const tasks: PlannedTask[] = [
      { id: 'T1', title: 'T1', objective: 'T1', assignedAgentId: 'gandiva', dependencies: [], estimatedDangerTier: 0 },
      { id: 'T2', title: 'T2', objective: 'T2', assignedAgentId: 'gandiva', dependencies: ['T1'], estimatedDangerTier: 0 },
      { id: 'T3', title: 'T3', objective: 'T3', assignedAgentId: 'gandiva', dependencies: ['T2'], estimatedDangerTier: 0 },
      { id: 'T4', title: 'T4', objective: 'T4', assignedAgentId: 'gandiva', dependencies: ['T3'], estimatedDangerTier: 0 },
      { id: 'T5', title: 'T5', objective: 'T5', assignedAgentId: 'gandiva', dependencies: ['T4'], estimatedDangerTier: 0 },
      { id: 'T6', title: 'T6', objective: 'T6', assignedAgentId: 'gandiva', dependencies: ['T5'], estimatedDangerTier: 0 }
    ];

    const graph = new TaskGraph(tasks, { ...DEFAULT_MISSION_BUDGET, maxAgentDepth: 3 });
    const validation = graph.validate();
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.some((e) => e.includes('depth') || e.includes('exceeds')));
  });
});
