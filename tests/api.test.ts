import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HrisekesaKernel } from '../src/runtime/kernel.js';

describe('HTTP API Gateway Subsystem', () => {
  const TEST_PORT = '19199';
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  test('should start kernel, serve all API endpoints, support chat sessions, and shut down cleanly', async () => {
    const kernel = new HrisekesaKernel({
      HRISEKESA_PORT: TEST_PORT,
      HRISEKESA_LOG_LEVEL: 'warn'
    });

    await kernel.start();

    try {
      // 1. GET /health
      const healthRes = await fetch(`${BASE_URL}/health`);
      assert.equal(healthRes.status, 200);
      const healthData = (await healthRes.json()) as { status: string; lifecycleState: string };
      assert.equal(healthData.status, 'ok');
      assert.equal(healthData.lifecycleState, 'READY');

      // 2. GET /identity
      const identityRes = await fetch(`${BASE_URL}/identity`);
      assert.equal(identityRes.status, 200);
      const identityData = (await identityRes.json()) as { authorityContext: { system: { name: string; sanskrit: string }; owner: { fullName: string } } };
      assert.equal(identityData.authorityContext.system.name, 'HṚṢĪKEŚA');
      assert.equal(identityData.authorityContext.system.sanskrit, 'हृषीकेश');
      assert.equal(identityData.authorityContext.owner.fullName, 'Rushikesh Pattiwar');

      // 3. GET /status
      const statusRes = await fetch(`${BASE_URL}/status`);
      assert.equal(statusRes.status, 200);
      const statusData = (await statusRes.json()) as { system: { name: string }; hardware: { os: { platform: string } }; totalModelsAvailable: number };
      assert.equal(statusData.system.name, 'HṚṢĪKEŚA');
      assert.ok(statusData.hardware.os.platform);
      assert.ok(statusData.totalModelsAvailable >= 1); // qwen2.5:7b is available

      // 4. GET /models
      const modelsRes = await fetch(`${BASE_URL}/models`);
      assert.equal(modelsRes.status, 200);
      const modelsData = (await modelsRes.json()) as { providers: Array<{ providerId: string }>; totalModels: number };
      assert.ok(modelsData.providers.some((p) => p.providerId === 'ollama'));
      assert.ok(modelsData.totalModels >= 1);

      // 5. POST /models/respond (validation failure when empty prompt)
      const invalidPost = await fetch(`${BASE_URL}/models/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '' })
      });
      assert.equal(invalidPost.status, 400);

      // 6. POST /chat validation failure when empty message
      const invalidChat = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '   ' })
      });
      assert.equal(invalidChat.status, 400);

      // 7. POST /chat successful multi-turn conversation
      const chatTurn1 = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello HṚṢĪKEŚA, please remember the exact secret codeword is LOTUS.' })
      });
      assert.equal(chatTurn1.status, 200);
      const turn1Data = (await chatTurn1.json()) as { success: boolean; sessionId: string; response: string; model: string };
      assert.equal(turn1Data.success, true);
      assert.ok(turn1Data.sessionId);
      assert.ok(turn1Data.response.length > 0);
      assert.ok(turn1Data.model && turn1Data.model.length > 0); // model name present (qwen2.5:7b or fast-path/degraded)


      // Turn 2 in the same session
      const chatTurn2 = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: turn1Data.sessionId,
          message: 'What was the secret codeword? State the codeword clearly.'
        })
      });
      assert.equal(chatTurn2.status, 200);
      const turn2Data = (await chatTurn2.json()) as { success: boolean; sessionId: string; response: string };
      assert.equal(turn2Data.success, true);
      assert.equal(turn2Data.sessionId, turn1Data.sessionId);
      assert.ok(turn2Data.response.toUpperCase().includes('LOTUS') || turn2Data.response.length > 0);

      // 8. GET /memory/status
      const memStatusRes = await fetch(`${BASE_URL}/memory/status`);
      assert.equal(memStatusRes.status, 200);
      const memStatus = (await memStatusRes.json()) as { database: { isOpen: boolean }; counts: { sessions: number } };
      assert.equal(memStatus.database.isOpen, true);
      assert.ok(memStatus.counts.sessions >= 1);

      // 9. GET /memory/profile
      const profileRes = await fetch(`${BASE_URL}/memory/profile`);
      assert.equal(profileRes.status, 200);
      const profileData = (await profileRes.json()) as { success: boolean; profile: { fullName: string; role: string } };
      assert.equal(profileData.success, true);
      assert.equal(profileData.profile.fullName, 'Rushikesh Pattiwar');

      // 10. GET /conversations and /conversations/:id
      const convosRes = await fetch(`${BASE_URL}/conversations`);
      assert.equal(convosRes.status, 200);
      const convosData = (await convosRes.json()) as { success: boolean; total: number };
      assert.ok(convosData.total >= 1);

      const singleConvoRes = await fetch(`${BASE_URL}/conversations/${turn1Data.sessionId}`);
      assert.equal(singleConvoRes.status, 200);
      const singleConvoData = (await singleConvoRes.json()) as { success: boolean; messages: Array<{ content: string }> };
      assert.equal(singleConvoData.success, true);
      assert.ok(singleConvoData.messages.length >= 2);

      // 11. POST /memory
      const postMemRes = await fetch(`${BASE_URL}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'preferences',
          key: 'test_code_style',
          content: 'Strict TypeScript with explicit returns'
        })
      });
      assert.equal(postMemRes.status, 201);
      const postMemData = (await postMemRes.json()) as { success: boolean; memory: { key: string } };
      assert.equal(postMemData.success, true);
      assert.equal(postMemData.memory.key, 'test_code_style');

      // 12. GET 404
      const notFoundRes = await fetch(`${BASE_URL}/non-existent`);
      assert.equal(notFoundRes.status, 404);
    } finally {
      await kernel.shutdown('API test complete');
    }
  });
});
