import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LifecycleManager } from '../src/core/lifecycle/lifecycle.manager.js';

describe('Lifecycle Subsystem', () => {
  test('should initialize in STOPPED state and transition to READY', async () => {
    const lifecycle = new LifecycleManager();
    assert.equal(lifecycle.getState(), 'STOPPED');

    let hookCalled = false;
    lifecycle.registerStartupHook(async () => {
      hookCalled = true;
    });

    await lifecycle.start();
    assert.equal(hookCalled, true);
    assert.equal(lifecycle.getState(), 'READY');

    const snap = lifecycle.getSnapshot();
    assert.equal(snap.state, 'READY');
    assert.ok(snap.startedAt);
    assert.ok(snap.readyAt);
  });

  test('should support DEGRADED state with reason and recovery', () => {
    const lifecycle = new LifecycleManager();
    lifecycle.setDegraded('Ollama unreachable');

    assert.equal(lifecycle.getState(), 'DEGRADED');
    assert.equal(lifecycle.getSnapshot().degradationReason, 'Ollama unreachable');

    lifecycle.setReady();
    assert.equal(lifecycle.getState(), 'READY');
    assert.equal(lifecycle.getSnapshot().degradationReason, null);
  });

  test('should execute shutdown hooks cleanly in LIFO order and transition to STOPPED', async () => {
    const lifecycle = new LifecycleManager();
    await lifecycle.start();

    const order: number[] = [];
    lifecycle.registerShutdownHook(async () => {
      order.push(1);
    });
    lifecycle.registerShutdownHook(async () => {
      order.push(2);
    });

    await lifecycle.shutdown('User termination');

    assert.equal(lifecycle.getState(), 'STOPPED');
    assert.deepEqual(order, [2, 1]); // LIFO execution
    assert.equal(lifecycle.getSnapshot().shutdownReason, 'User termination');
  });
});
