import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HrisekesaKernel } from '../src/runtime/kernel.js';

describe('Global Instant Response & Low-Latency Chat Subsystem', () => {
  const TEST_PORT = '19177';
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  let kernel: HrisekesaKernel;

  test('setup: should start kernel', async () => {
    kernel = new HrisekesaKernel({
      HRISEKESA_PORT: TEST_PORT,
      HRISEKESA_LOG_LEVEL: 'warn'
    });
    await kernel.start();
  });

  test('1. Casual Greeting Fast-Path: TTFB must be instantaneous (< 100ms) without heavy orchestration', async () => {
    const t0 = Date.now();
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' })
    });

    const elapsedMs = Date.now() - t0;
    assert.equal(res.status, 200);

    const data = await res.json() as any;
    assert.equal(data.success, true);
    assert.ok(data.response.length > 0);
    assert.equal(data.model, 'fast-gate-instant');
    assert.ok(elapsedMs < 150, `Expected fast-gate greeting < 150ms, got ${elapsedMs}ms`);
    assert.ok(data.metrics.ttfbMs < 100, `Expected TTFB metric < 100ms, got ${data.metrics.ttfbMs}ms`);
  });

  test('2. Casual Courtesy Fast-Path: "how are you?" must respond instantly (< 100ms)', async () => {
    const t0 = Date.now();
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'how are you?' })
    });

    const elapsedMs = Date.now() - t0;
    assert.equal(res.status, 200);

    const data = await res.json() as any;
    assert.equal(data.success, true);
    assert.ok(data.response.length > 0);
    assert.equal(data.model, 'fast-gate-instant');
    assert.ok(elapsedMs < 150, `Expected courtesy response < 150ms, got ${elapsedMs}ms`);
  });

  test('3. Immediate Task Acknowledgement: Research tasks must return immediate acknowledgement without blocking chat', async () => {
    const t0 = Date.now();
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Research the best open-source ERP systems in the world' })
    });

    const elapsedMs = Date.now() - t0;
    assert.equal(res.status, 200);

    const data = await res.json() as any;
    assert.equal(data.success, true);
    assert.ok(data.response.includes('Research Initiated') || data.response.includes('Rahu'));
    assert.equal(data.model, 'system-ack');
    assert.ok(elapsedMs < 250, `Expected immediate research acknowledgement < 250ms, got ${elapsedMs}ms`);
  });

  test('4. Immediate Computer Task Acknowledgement: Computer GUI tasks must not block chat', async () => {
    const t0 = Date.now();
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Open Notepad and type hello world' })
    });

    const elapsedMs = Date.now() - t0;
    assert.equal(res.status, 200);

    const data = await res.json() as any;
    assert.equal(data.success, true);
    assert.ok(data.response.includes('Action Accepted') || data.response.includes('Computer'));
    assert.equal(data.model, 'system-ack');
    assert.ok(elapsedMs < 250, `Expected immediate computer task acknowledgement < 250ms, got ${elapsedMs}ms`);
  });

  test('5. Streaming SSE Support on /chat: Should stream tokens incrementally over Server-Sent Events', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        message: 'hello there',
        stream: true
      })
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/event-stream'));

    const reader = res.body?.getReader();
    assert.ok(reader);

    const decoder = new TextDecoder();
    let receivedTokens = 0;
    let receivedDone = false;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = JSON.parse(line.slice(6));
          if (payload.token) {
            receivedTokens++;
          }
          if (payload.success !== undefined || payload.response) {
            receivedDone = true;
          }
        }
      }
    }

    assert.ok(receivedTokens >= 1 || receivedDone);
  });

  test('6. Latency Telemetry Endpoint: GET /chat/telemetry must return aggregated latency metrics and span distributions', async () => {
    const res = await fetch(`${BASE_URL}/chat/telemetry`);
    assert.equal(res.status, 200);

    const data = await res.json() as any;
    assert.equal(data.success, true);
    assert.ok(data.telemetry);
    assert.ok(typeof data.telemetry.sampleCount === 'number');
    assert.ok(data.telemetry.sampleCount >= 1);
    assert.ok(typeof data.telemetry.avgTtfbMs === 'number');
  });

  test('7. Concurrent Chat Unblocking: User can continue chatting while background tasks exist', async () => {
    const chatTurn = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is your name?' })
    });

    assert.equal(chatTurn.status, 200);
    const turnData = await chatTurn.json() as any;
    assert.equal(turnData.success, true);
    assert.ok(turnData.response.includes('HṚṢĪKEŚA'));
  });

  test('teardown: should cleanly shut down kernel', async () => {
    await kernel.shutdown();
  });
});
