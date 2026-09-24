import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigManager } from '../src/core/configuration/config.manager.js';

describe('Configuration Subsystem', () => {
  test('should load sensible default configurations', () => {
    const configManager = new ConfigManager({});
    const config = configManager.getConfig();

    assert.equal(config.server.port, 4200);
    assert.equal(config.server.host, '127.0.0.1');
    assert.equal(config.server.env, 'development');
    assert.equal(config.server.logLevel, 'info');
    assert.equal(config.ollama.host, 'http://127.0.0.1:11434');
    assert.equal(config.hardwareLimits.maxConcurrentLocalInference, 1);
  });

  test('should correctly parse overrides and validate port bounds', () => {
    const configManager = new ConfigManager({
      HRISEKESA_PORT: '5500',
      HRISEKESA_LOG_LEVEL: 'debug',
      HRISEKESA_ENV: 'production',
      OLLAMA_HOST: 'http://localhost:11435'
    });
    const config = configManager.getConfig();

    assert.equal(config.server.port, 5500);
    assert.equal(config.server.logLevel, 'debug');
    assert.equal(config.server.env, 'production');
    assert.equal(config.ollama.host, 'http://localhost:11435');
  });

  test('should sanitize configuration when exporting for status without leaking secrets', () => {
    const configManager = new ConfigManager({
      OPENAI_API_KEY: 'sk-proj-super-secret-key-12345'
    });
    const sanitized = configManager.getSanitizedConfig();

    assert.equal(sanitized.cloud.hasOpenAI, true);
    assert.equal(sanitized.cloud.hasAnthropic, false);
    assert.equal(sanitized.cloud.hasGemini, false);
    // Ensure raw secret is not in the sanitized view
    assert.equal(Object.keys(sanitized.cloud).includes('openaiApiKey'), false);
  });
});
