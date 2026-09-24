import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { HrisekesaKernel } from '../src/runtime/kernel.js';

describe('Control Center & Environment HTTP API Subsystem', () => {
  const TEST_PORT = '19203';
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  test('should serve /events, /environment/status, /voice/status, /memory/items cleanly', async () => {
    const kernel = new HrisekesaKernel({
      HRISEKESA_PORT: TEST_PORT,
      HRISEKESA_LOG_LEVEL: 'warn',
      HRISEKESA_VOICE_TTS: 'sapi',
      HRISEKESA_VOICE_STT: 'windows'
    });

    await kernel.start();

    try {
      // 1. GET /events (SSE stream connection)
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

      // 2. GET /environment/status
      const envStatusRes = await fetch(`${BASE_URL}/environment/status`);
      assert.equal(envStatusRes.status, 200);
      const envStatus = await envStatusRes.json() as {
        status: string;
        totalApplicationsDiscovered: number;
        installedApplicationsCount: number;
        totalActiveProcesses: number;
      };
      assert.equal(envStatus.status, 'online');
      assert.ok(envStatus.totalApplicationsDiscovered >= 1);
      assert.ok(envStatus.totalActiveProcesses >= 1);

      // 3. GET /environment/applications
      const envAppsRes = await fetch(`${BASE_URL}/environment/applications`);
      assert.equal(envAppsRes.status, 200);
      const envApps = await envAppsRes.json() as { applications: Array<{ id: string; name: string }>; total: number };
      assert.ok(envApps.total >= 1);
      assert.ok(envApps.applications.some(a => a.name.toLowerCase().includes('notepad') || a.id.length > 0));

      // 4. GET /environment/processes
      const envProcRes = await fetch(`${BASE_URL}/environment/processes`);
      assert.equal(envProcRes.status, 200);
      const envProc = await envProcRes.json() as { processes: Array<{ pid: number; processName: string }>; totalProcesses: number };
      assert.ok(envProc.totalProcesses >= 1);
      assert.ok(envProc.processes.some(p => p.pid > 0));

      // 5. GET /voice/status
      const voiceRes = await fetch(`${BASE_URL}/voice/status`);
      assert.equal(voiceRes.status, 200);
      const voiceData = await voiceRes.json() as { stt: { id: string }; tts: { id: string } };
      assert.ok(voiceData.stt.id);
      assert.ok(voiceData.tts.id);

      // 6. GET /memory/items
      const memItemsRes = await fetch(`${BASE_URL}/memory/items?limit=10`);
      assert.equal(memItemsRes.status, 200);
      const memItems = await memItemsRes.json() as { success: boolean; items: unknown[]; totalReturned: number };
      assert.equal(memItems.success, true);
      assert.ok(memItems.totalReturned >= 1);

      // 7. GET /memory/items by tier
      const coreMemRes = await fetch(`${BASE_URL}/memory/items?tier=core_identity`);
      assert.equal(coreMemRes.status, 200);
      const coreMem = await coreMemRes.json() as { success: boolean; items: Array<{ key: string }>; totalReturned: number };
      assert.equal(coreMem.success, true);
      assert.ok(coreMem.totalReturned >= 1);
    } finally {
      await kernel.shutdown();
    }
  });
});
