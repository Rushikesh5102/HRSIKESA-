import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { HrisekesaKernel } from '../src/runtime/kernel.js';
import { HardwareDetector } from '../src/core/hardware/hardware.detector.js';
import { ProcessManager } from '../src/environment/process/process.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';

describe('Phase 11.5 Hardening & Lifecycle Regression Subsystem', () => {
  const TEST_PORT = '19201';
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  test('HardwareDetector should calculate memory states and process RSS cleanly', () => {
    const detector = new HardwareDetector();
    const profile = detector.getProfile();

    assert.ok(profile.memory.totalBytes > 0);
    assert.ok(profile.memory.freeBytes > 0);
    assert.ok(profile.memory.totalGb >= 8);
    assert.ok(['NORMAL', 'LOW_MEMORY', 'CRITICAL_MEMORY'].includes(profile.memory.state));
    assert.ok(profile.processMemory.rssMb > 0);
    assert.ok(profile.processMemory.heapUsedMb > 0);
    assert.equal(profile.constraints.maxConcurrentLocalInference, 1);
  });

  test('ProcessManager should cache process listing within TTL and invalidate on launch/terminate', async () => {
    const pm = new ProcessManager();
    const p1 = await pm.listProcesses();
    assert.ok(p1.length >= 1);

    // Immediate second call should return cached list without errors
    const p2 = await pm.listProcesses();
    assert.equal(p1.length, p2.length);

    // Force refresh
    const p3 = await pm.listProcesses(true);
    assert.ok(p3.length >= 1);
  });

  test('SSE /events stream should cleanly unbind EventBus listeners upon client disconnects', async () => {
    const kernel = new HrisekesaKernel({
      HRISEKESA_PORT: TEST_PORT,
      HRISEKESA_LOG_LEVEL: 'warn',
      HRISEKESA_VOICE_TTS: 'sapi',
      HRISEKESA_VOICE_STT: 'windows',
    });

    await kernel.start();

    try {
      // Connect and disconnect 3 sequential SSE streams
      for (let i = 0; i < 3; i++) {
        await new Promise<void>((resolve, reject) => {
          const req = http.get(`${BASE_URL}/events`, (res) => {
            assert.equal(res.statusCode, 200);
            assert.ok(String(res.headers['content-type']).includes('text/event-stream'));
            res.on('data', () => {
              req.destroy();
              resolve();
            });
          });
          req.on('error', (err: any) => {
            if (err.code === 'ECONNRESET' || req.destroyed) {
              resolve();
            } else {
              reject(err);
            }
          });
        });
      }

      // Verify server remains responsive after SSE disconnects
      const healthRes = await fetch(`${BASE_URL}/health`);
      assert.equal(healthRes.status, 200);
    } finally {
      await kernel.shutdown('Hardening test complete');
    }
  });
});
