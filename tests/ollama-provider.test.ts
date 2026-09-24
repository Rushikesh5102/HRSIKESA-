import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OllamaProvider } from '../src/models/providers/ollama.provider.js';

describe('Ollama Local Provider', () => {
  test('should detect health and version when Ollama is running', async () => {
    const provider = new OllamaProvider({
      host: 'http://127.0.0.1:11434',
      defaultModel: 'qwen2.5:7b',
      timeoutMs: 5000
    });

    const health = await provider.checkHealth();
    assert.equal(health.status, 'healthy');
    assert.ok(health.message.includes('Ollama operational'));
    assert.ok(typeof health.latencyMs === 'number');
  });

  test('should handle unreachable host gracefully without crashing', async () => {
    const provider = new OllamaProvider({
      host: 'http://127.0.0.1:59999', // Non-existent port
      defaultModel: 'qwen2.5:7b',
      timeoutMs: 1000
    });

    const health = await provider.checkHealth();
    assert.equal(health.status, 'unreachable');
    assert.ok(health.message.includes('unreachable'));
  });

  test('should discover installed qwen2.5:7b model', async () => {
    const provider = new OllamaProvider({
      host: 'http://127.0.0.1:11434',
      defaultModel: 'qwen2.5:7b',
      timeoutMs: 5000
    });

    const models = await provider.listModels();
    assert.ok(Array.isArray(models));
    assert.ok(models.length > 0);
    assert.ok(models.some((m) => m.id.includes('qwen2.5:7b')));
  });

  test('should execute real chat generation with qwen2.5:7b', async () => {
    const provider = new OllamaProvider({
      host: 'http://127.0.0.1:11434',
      defaultModel: 'qwen2.5:7b',
      timeoutMs: 45000
    });

    const res = await provider.chat({
      messages: [
        { role: 'user', content: 'Respond with exactly the single word "VERIFIED".' }
      ],
      maxTokens: 30
    });

    assert.equal(res.providerId, 'ollama');
    assert.ok(res.text.includes('VERIFIED'));
    assert.ok(res.durationMs > 0);
    assert.equal(res.isLocal, true);
  });
});
