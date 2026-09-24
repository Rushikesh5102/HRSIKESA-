import { test, describe, after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { HrisekesaKernel } from '../src/runtime/kernel.js';

describe('Kernel Restart & Session Durability Subsystem', () => {
  const RESTART_DB_DIR = 'data/test_restart_kernel';
  const RESTART_DB_PATH = `${RESTART_DB_DIR}/restart.db`;
  const TEST_PORT = '4299';

  before(() => {
    if (fs.existsSync(RESTART_DB_DIR)) {
      fs.rmSync(RESTART_DB_DIR, { recursive: true, force: true });
    }
  });

  after(() => {
    if (fs.existsSync(RESTART_DB_DIR)) {
      fs.rmSync(RESTART_DB_DIR, { recursive: true, force: true });
    }
  });

  // CRITICAL REQUIREMENT 2:
  // 1. Start HṚṢĪKEŚA.
  // 2. Create conversation.
  // 3. Have a conversation.
  // 4. Shut down HṚṢĪKEŚA.
  // 5. Restart HṚṢĪKEŚA.
  // 6. Continue the same session.
  // 7. Verify previous messages are available.
  test('CRITICAL TEST 2: Multi-turn session context must persist across independent kernel restarts', async () => {
    const sessionId = 'durable-restart-session-1';

    // 1. Start HṚṢĪKEŚA Instance 1
    const kernel1 = new HrisekesaKernel({
      HRISEKESA_PORT: TEST_PORT,
      HRISEKESA_DB_PATH: RESTART_DB_PATH,
      HRISEKESA_LOG_LEVEL: 'warn'
    });
    await kernel1.start();

    // 2. Create conversation session
    kernel1.sessionManager.createSession(sessionId, { test: true }, 'Durable Restart Test');

    // 3. Have a conversation turn
    kernel1.sessionManager.addMessage(
      sessionId,
      'user',
      'My name is Rushikesh and this conversation should survive a restart.'
    );
    kernel1.sessionManager.addMessage(
      sessionId,
      'assistant',
      'Understood, Rushikesh. I have recorded this in durable memory.',
      { model: 'qwen2.5:7b', provider: 'ollama' }
    );

    const instance1Session = kernel1.sessionManager.getSession(sessionId);
    assert.ok(instance1Session);
    assert.equal(instance1Session.messages.length, 2);

    // 4. Shut down HṚṢĪKEŚA Instance 1 cleanly
    await kernel1.shutdown('Instance 1 test shutdown');

    // 5. Restart HṚṢĪKEŚA Instance 2 (completely new process object pointing to same DB)
    const kernel2 = new HrisekesaKernel({
      HRISEKESA_PORT: TEST_PORT,
      HRISEKESA_DB_PATH: RESTART_DB_PATH,
      HRISEKESA_LOG_LEVEL: 'warn'
    });
    await kernel2.start();

    // 6. Continue the same session
    const instance2Session = kernel2.sessionManager.getSession(sessionId);
    assert.ok(instance2Session, 'Session should be rehydrated from SQLite database');
    assert.equal(instance2Session.id, sessionId);
    assert.equal(instance2Session.title, 'Durable Restart Test');

    // 7. Verify previous messages are available in bounded history
    assert.equal(instance2Session.messages.length, 2);
    assert.equal(
      instance2Session.messages[0].content,
      'My name is Rushikesh and this conversation should survive a restart.'
    );
    assert.equal(instance2Session.messages[0].role, 'user');
    assert.equal(
      instance2Session.messages[1].content,
      'Understood, Rushikesh. I have recorded this in durable memory.'
    );
    assert.equal(instance2Session.messages[1].role, 'assistant');
    assert.equal(instance2Session.messages[1].model, 'qwen2.5:7b');

    // Add next message to continued session in Instance 2
    kernel2.sessionManager.addMessage(
      sessionId,
      'user',
      'What did I tell you before the restart?'
    );
    assert.equal(instance2Session.messages.length, 3);

    // Context Assembler check on Instance 2
    const context = await kernel2.contextAssembler.assembleContext(sessionId);
    assert.ok(context.length >= 4); // system prompt + 3 turns
    assert.equal(context[context.length - 1].content, 'What did I tell you before the restart?');

    await kernel2.shutdown('Instance 2 test shutdown');
  });
});
