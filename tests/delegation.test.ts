/**
 * HRSIKESA - Agent Delegation Manager Tests
 * Verifies delegation boundaries, depth limits, sibling limits, and active task limits.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentDelegationManager } from '../src/agents/delegation/delegation.manager.js';
import { AgentTask } from '../src/agents/interfaces/task.types.js';

test('Agent Delegation Subsystem', async (t) => {
  await t.test('should register root task and delegate child tasks', () => {
    const manager = new AgentDelegationManager();

    const rootTask: AgentTask = {
      id: 'task_root',
      agentId: 'aja',
      objective: 'Coordinate release',
      priority: 'normal',
      status: 'running',
      depth: 0,
      createdAt: new Date().toISOString()
    };

    manager.registerRootTask(rootTask);
    assert.equal(manager.getActiveTaskCount(), 1);
    assert.equal(manager.getTaskDepth('task_root'), 0);

    const child = manager.delegate('task_root', 'gandiva', 'Implement feature');
    assert.equal(child.agentId, 'gandiva');
    assert.equal(child.depth, 1);
    assert.equal(child.parentTaskId, 'task_root');
    assert.equal(manager.getActiveTaskCount(), 2);
  });

  await t.test('CRITICAL SECURITY: Delegation manager must enforce max depth limit (default=2)', () => {
    const manager = new AgentDelegationManager({ maxDepth: 2, maxActiveTasks: 10 });

    const root: AgentTask = {
      id: 'root',
      agentId: 'aja',
      objective: 'Root',
      priority: 'normal',
      status: 'running',
      depth: 0,
      createdAt: new Date().toISOString()
    };

    manager.registerRootTask(root);

    // Depth 1 (Allowed)
    const level1 = manager.delegate('root', 'rahu', 'Research');
    assert.equal(level1.depth, 1);

    // Depth 2 (Allowed)
    const level2 = manager.delegate(level1.id, 'gandiva', 'Code');
    assert.equal(level2.depth, 2);

    // Depth 3 (Must Be Blocked - Exceeds maxDepth=2)
    assert.throws(() => {
      manager.delegate(level2.id, 'vighna', 'Verify');
    }, /max delegation depth \(2\) exceeded/);
  });

  await t.test('CRITICAL SECURITY: Delegation manager must enforce max children limit (default=5)', () => {
    const manager = new AgentDelegationManager({ maxChildrenPerTask: 3, maxActiveTasks: 10 });

    const root: AgentTask = {
      id: 'root_limit',
      agentId: 'aja',
      objective: 'Root',
      priority: 'normal',
      status: 'running',
      depth: 0,
      createdAt: new Date().toISOString()
    };

    manager.registerRootTask(root);

    manager.delegate('root_limit', 'gandiva', 'Child 1');
    manager.delegate('root_limit', 'rahu', 'Child 2');
    manager.delegate('root_limit', 'vighna', 'Child 3');

    // 4th child must be blocked (maxChildrenPerTask = 3)
    assert.throws(() => {
      manager.delegate('root_limit', 'garuda', 'Child 4');
    }, /max children per task \(3\) exceeded/);
  });

  await t.test('CRITICAL SECURITY: Delegation manager must enforce active task cap (default=3)', () => {
    const manager = new AgentDelegationManager({ maxActiveTasks: 3 });

    const root: AgentTask = {
      id: 'root_active',
      agentId: 'aja',
      objective: 'Root',
      priority: 'normal',
      status: 'running',
      depth: 0,
      createdAt: new Date().toISOString()
    };

    manager.registerRootTask(root); // active = 1
    const child1 = manager.delegate('root_active', 'gandiva', 'Task 1'); // active = 2
    const child2 = manager.delegate('root_active', 'rahu', 'Task 2'); // active = 3

    // 4th active task must be rejected
    assert.throws(() => {
      manager.delegate('root_active', 'vighna', 'Task 3');
    }, /max active tasks \(3\) reached/);

    // Completing child1 should free up a slot
    manager.completeTask(child1.id, {
      taskId: child1.id,
      agentId: 'gandiva',
      status: 'completed',
      summary: 'Done',
      toolCalls: [],
      childTaskIds: [],
      errors: [],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    });

    assert.equal(manager.getActiveTaskCount(), 2);

    // Now delegating another task should succeed
    const child3 = manager.delegate('root_active', 'vighna', 'Task 3');
    assert.ok(child3);
    assert.equal(manager.getActiveTaskCount(), 3);
  });
});
