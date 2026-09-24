import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../src/core/logging/logger.js';

describe('Logging Subsystem', () => {
  test('should redact API keys and passwords from strings and metadata objects', () => {
    const logger = new Logger('TestComponent', 'info', false);
    const originalLog = console.log;
    const captured: string[] = [];

    console.log = (msg: string) => {
      captured.push(msg);
    };

    try {
      logger.info('Using secret key: sk-abcdef1234567890abcdef1234567890 for auth', {
        password: 'SuperSecretPassword123!',
        token: 'secret-bearer-token',
        normalKey: 'regular-data'
      });

      assert.equal(captured.length, 1);
      const parsed = JSON.parse(captured[0]);

      // Verify message redaction
      assert.ok(!parsed.message.includes('sk-abcdef1234567890abcdef1234567890'));
      assert.ok(parsed.message.includes('[REDACTED]'));

      // Verify metadata redaction
      assert.equal(parsed.metadata.password, '[REDACTED]');
      assert.equal(parsed.metadata.token, '[REDACTED]');
      assert.equal(parsed.metadata.normalKey, 'regular-data');
    } finally {
      console.log = originalLog;
    }
  });

  test('should honor minimum log levels', () => {
    const logger = new Logger('TestComponent', 'warn', false);
    const originalLog = console.log;
    const captured: string[] = [];

    console.log = (msg: string) => {
      captured.push(msg);
    };

    try {
      logger.debug('Debug msg');
      logger.info('Info msg');
      assert.equal(captured.length, 0); // Both below warn
    } finally {
      console.log = originalLog;
    }
  });
});
