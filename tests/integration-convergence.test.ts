import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { HrisekesaKernel } from '../src/runtime/kernel.js';

describe('HṚṢĪKEŚA Integration Convergence & Contract Hardening Suite', () => {
  let kernel: HrisekesaKernel;
  const PORT = Math.floor(Math.random() * 1000) + 5200;

  before(async () => {
    process.env.HRISEKESA_PORT = String(PORT);
    process.env.PORT = String(PORT);
    kernel = new HrisekesaKernel({
      HRISEKESA_PORT: String(PORT),
      PORT: String(PORT),
      HRISEKESA_LOG_LEVEL: 'warn'
    });
    await kernel.start();
  });

  after(async () => {
    try {
      await kernel.stop();
    } catch {
      // Clean teardown
    }
  });

  function get(path: string): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 0, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 0, body: data });
          }
        });
      }).on('error', reject);
    });
  }

  test('1. Core /health & /api/health dual prefix returns 200 OK', async () => {
    const res1 = await get('/health');
    assert.equal(res1.status, 200);
    assert.equal(res1.body.status, 'ok');

    const res2 = await get('/api/health');
    assert.equal(res2.status, 200);
    assert.equal(res2.body.status, 'ok');
  });

  test('2. /agents and /api/agents dual prefix returns 200 OK', async () => {
    const res1 = await get('/agents');
    assert.equal(res1.status, 200);
    assert.ok(Array.isArray(res1.body.agents));

    const res2 = await get('/api/agents');
    assert.equal(res2.status, 200);
    assert.ok(Array.isArray(res2.body.agents));
  });

  test('3. FP-17 Creation Fabric endpoints are live and respond with 200 OK', async () => {
    const res1 = await get('/api/creation/jobs');
    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);

    const res2 = await get('/api/creation/capabilities');
    assert.equal(res2.status, 200);
    assert.equal(res2.body.success, true);
  });

  test('4. FP-18 Decision Intelligence endpoints are live and respond with 200 OK', async () => {
    const res1 = await get('/api/decision/records');
    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);

    const res2 = await get('/api/research/cases');
    assert.equal(res2.status, 200);
    assert.equal(res2.body.success, true);
  });

  test('5. FP-19 Persistent Operations & Worker Fabric endpoints are live with 200 OK', async () => {
    const resSummary = await get('/api/execution/summary');
    assert.equal(resSummary.status, 200);
    assert.equal(resSummary.body.success, true);

    const resWorkers = await get('/api/execution/workers');
    assert.equal(resWorkers.status, 200);
    assert.equal(resWorkers.body.success, true);
  });

  test('6. Workflow Contract Endpoints are live with 200 OK', async () => {
    const resTemplates = await get('/api/workflow-templates');
    assert.equal(resTemplates.status, 200);
    assert.equal(resTemplates.body.success, true);

    const resApprovals = await get('/api/workflow-approvals');
    assert.equal(resApprovals.status, 200);
    assert.equal(resApprovals.body.success, true);
  });

  test('7. MCP and /api/mcp dual routing returns 200 OK', async () => {
    const res1 = await get('/mcp');
    assert.equal(res1.status, 200);

    const res2 = await get('/api/mcp');
    assert.equal(res2.status, 200);
  });

  test('8. /approvals and /api/approvals dual prefix returns 200 OK and JSON', async () => {
    const res1 = await get('/approvals');
    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);
    assert.ok(Array.isArray(res1.body.approvals));

    const res2 = await get('/api/approvals');
    assert.equal(res2.status, 200);
    assert.equal(res2.body.success, true);
    assert.ok(Array.isArray(res2.body.approvals));
  });

  test('9. /audit and /api/audit dual prefix returns 200 OK and JSON', async () => {
    const res1 = await get('/audit');
    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);
    assert.ok(Array.isArray(res1.body.logs));

    const res2 = await get('/api/audit');
    assert.equal(res2.status, 200);
    assert.equal(res2.body.success, true);
    assert.ok(Array.isArray(res2.body.logs));
  });
});

