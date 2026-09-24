/**
 * HṚṢĪKEŚA (हृषीकेश) — Process Manager Subsystem Unit Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessManager } from '../src/environment/process/process.manager.js';

describe('Process Manager Subsystem', () => {
  test('listProcesses should return active system processes', async () => {
    const manager = new ProcessManager();
    const processes = await manager.listProcesses();

    assert.ok(Array.isArray(processes));
    assert.ok(processes.length > 0);

    const first = processes[0];
    assert.ok(typeof first.pid === 'number');
    assert.ok(typeof first.processName === 'string');
    assert.equal(typeof first.isHrisekesaSpawned, 'boolean');
  });

  test('inspectProcess should find current node process', async () => {
    const manager = new ProcessManager();
    const current = await manager.inspectProcess(process.pid);

    assert.ok(current, 'Should inspect current Node.js process');
    assert.equal(current.pid, process.pid);
    assert.equal(current.status, 'running');
  });

  test('CRITICAL SECURITY: terminate must reject terminating protected system processes', async () => {
    const manager = new ProcessManager();
    const res = await manager.terminate(0); // System Idle PID 0

    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Security violation') || res.error?.includes('protected'));
  });

  test('CRITICAL SECURITY: terminate must reject terminating unowned processes without authorization', async () => {
    const manager = new ProcessManager();
    // Try to terminate current node process (not spawned by manager) without force
    const res = await manager.terminate(process.pid, false);

    assert.equal(res.success, false);
    assert.ok(res.error?.includes('protected') || res.error?.includes('Safety boundary'));
  });

  test('launch should reject invalid or missing executable path', async () => {
    const manager = new ProcessManager();
    const res = await manager.launch({
      id: 'fake-app',
      name: 'Fake Application',
      source: 'custom',
      installed: false,
      running: false
    });

    assert.equal(res.success, false);
    assert.equal(res.status, 'FAILED');
    assert.ok(res.error?.includes('missing or invalid'));
  });
});
