/**
 * HRSIKESA - Agent HTTP API Gateway Tests
 * Verifies GET /agents, GET /agents/:id, GET /tasks, POST /tasks, GET /missions, POST /missions.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { HrisekesaKernel } from '../src/runtime/kernel.js';
import fs from 'node:fs';

const TEST_DB_PATH = 'data/test-api-agents.db';
const TEST_PORT = 19195;

function makeRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : {};
            resolve({ status: res.statusCode || 500, data });
          } catch {
            resolve({ status: res.statusCode || 500, data: raw });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

test('Agent HTTP API Gateway Subsystem', async (t) => {
  const cleanup = () => {
    for (const ext of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + ext;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
    }
  };

  cleanup();

  const kernel = new HrisekesaKernel({
    HRISEKESA_PORT: String(TEST_PORT),
    HRISEKESA_DB_PATH: TEST_DB_PATH,
    HRISEKESA_LOG_LEVEL: 'warn'
  });

  await kernel.start();

  await t.test('GET /agents should return all registered agents with diagnostics', async () => {
    const res = await makeRequest('GET', '/agents');
    assert.equal(res.status, 200);
    assert.equal(res.data.totalRegistered, 17);
    assert.ok(res.data.agents.some((a: any) => a.id === 'gandiva'));
    assert.ok(res.data.agents.some((a: any) => a.id === 'rahu'));
    assert.ok(res.data.agents.some((a: any) => a.id === 'mrtyu'));
  });

  await t.test('GET /agents/:id should return single agent or 404', async () => {
    const res = await makeRequest('GET', '/agents/gandiva');
    assert.equal(res.status, 200);
    assert.equal(res.data.agent.id, 'gandiva');
    assert.equal(res.data.agent.role, 'software_engineering');

    const res404 = await makeRequest('GET', '/agents/non_existent_agent');
    assert.equal(res404.status, 404);
  });

  await t.test('GET /agents/:id/status should return status snapshot', async () => {
    const res = await makeRequest('GET', '/agents/aja/status');
    assert.equal(res.status, 200);
    assert.equal(res.data.id, 'aja');
    assert.equal(res.data.status, 'idle');
  });

  await t.test('POST /tasks and GET /tasks should create and retrieve tasks', async () => {
    const postRes = await makeRequest('POST', '/tasks', {
      agentId: 'gandiva',
      objective: 'Verify TypeScript types'
    });
    assert.equal(postRes.status, 201);
    assert.ok(postRes.data.task.id);
    const taskId = postRes.data.task.id;

    const getRes = await makeRequest('GET', `/tasks/${taskId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.data.task.id, taskId);
    assert.equal(getRes.data.task.objective, 'Verify TypeScript types');

    const listRes = await makeRequest('GET', '/tasks');
    assert.equal(listRes.status, 200);
    assert.ok(listRes.data.tasks.length >= 1);
  });

  await t.test('POST /missions and GET /missions should create and list missions', async () => {
    const postRes = await makeRequest('POST', '/missions', {
      objective: 'High-level architectural audit',
      rootAgentId: 'aja',
      executeImmediately: false
    });
    assert.equal(postRes.status, 201);
    assert.ok(postRes.data.mission.id);
    const missionId = postRes.data.mission.id;

    const getRes = await makeRequest('GET', `/missions/${missionId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.data.mission.id, missionId);
    assert.equal(getRes.data.mission.objective, 'High-level architectural audit');

    const listRes = await makeRequest('GET', '/missions');
    assert.equal(listRes.status, 200);
    assert.ok(listRes.data.missions.length >= 1);
  });

  await kernel.shutdown('Test complete');
  cleanup();
});
