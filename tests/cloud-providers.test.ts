import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIProvider } from '../src/models/providers/openai.provider.js';
import { AnthropicProvider } from '../src/models/providers/anthropic.provider.js';
import { GeminiProvider } from '../src/models/providers/gemini.provider.js';

describe('Cloud Provider Adapters', () => {
  test('OpenAI provider should report unconfigured when no API key is provided', async () => {
    const provider = new OpenAIProvider(undefined);

    const health = await provider.checkHealth();
    assert.equal(health.status, 'unconfigured');
    assert.ok(health.message.includes('OPENAI_API_KEY'));

    const models = await provider.listModels();
    assert.equal(models.length, 0);

    await assert.rejects(
      async () => {
        await provider.generate({ prompt: 'Hello' });
      },
      (err: Error) => {
        assert.ok(err.message.includes('OPENAI_API_KEY is not configured'));
        return true;
      }
    );
  });

  test('Anthropic provider should report unconfigured when no API key is provided', async () => {
    const provider = new AnthropicProvider('');

    const health = await provider.checkHealth();
    assert.equal(health.status, 'unconfigured');
    assert.ok(health.message.includes('ANTHROPIC_API_KEY'));

    const models = await provider.listModels();
    assert.equal(models.length, 0);

    await assert.rejects(
      async () => {
        await provider.generate({ prompt: 'Hello' });
      },
      (err: Error) => {
        assert.ok(err.message.includes('ANTHROPIC_API_KEY is not configured'));
        return true;
      }
    );
  });

  test('Gemini provider should report unconfigured when no API key is provided', async () => {
    const provider = new GeminiProvider(undefined);

    const health = await provider.checkHealth();
    assert.equal(health.status, 'unconfigured');
    assert.ok(health.message.includes('GEMINI_API_KEY'));

    const models = await provider.listModels();
    assert.equal(models.length, 0);

    await assert.rejects(
      async () => {
        await provider.generate({ prompt: 'Hello' });
      },
      (err: Error) => {
        assert.ok(err.message.includes('GEMINI_API_KEY is not configured'));
        return true;
      }
    );
  });
});
