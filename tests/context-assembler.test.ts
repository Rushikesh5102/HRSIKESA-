import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { CreatorProfileManager } from '../src/memory/creator.profile.js';
import { SessionManager } from '../src/conversation/session.manager.js';
import { ContextAssembler } from '../src/conversation/context.assembler.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { MemoryRepository } from '../src/persistence/repositories/memory.repository.js';
import { SessionRepository } from '../src/persistence/repositories/session.repository.js';
import { MessageRepository } from '../src/persistence/repositories/message.repository.js';

describe('Context Assembler Subsystem', () => {
  // buildSystemPrompt and assembleContext are now async (Phase 12: semantic recall support)
  test('should assemble unified prompt context with identity, creator, and history', async () => {
    const db = new DatabaseManager(':memory:');
    const migrations = new MigrationManager(db);
    migrations.runPending();

    const identity = new IdentityManager();
    const memoryRepo = new MemoryRepository(db);
    const creatorManager = new CreatorProfileManager(memoryRepo);
    const sessionRepo = new SessionRepository(db);
    const messageRepo = new MessageRepository(db);

    const sessionManager = new SessionManager(sessionRepo, messageRepo, {
      maxHistoryMessages: 4,
      maxHistoryChars: 2000
    });

    const assembler = new ContextAssembler(identity, creatorManager, sessionManager, memoryRepo);

    // Build system prompt (now async — no hybridRetriever wired, so falls through gracefully)
    const sysPrompt = await assembler.buildSystemPrompt();
    assert.ok(sysPrompt.includes('HṚṢĪKEŚA'));
    assert.ok(sysPrompt.includes('Rushikesh Pattiwar'));
    assert.ok(sysPrompt.includes('Creator & Sole Master'));
    assert.ok(sysPrompt.includes('qwen2.5:7b'));

    // Create session and add messages
    const session = sessionManager.createSession('assembler-test-session');
    sessionManager.addMessage(session.id, 'user', 'Turn 1');
    sessionManager.addMessage(session.id, 'assistant', 'Response 1');
    sessionManager.addMessage(session.id, 'user', 'Turn 2');
    sessionManager.addMessage(session.id, 'assistant', 'Response 2');
    sessionManager.addMessage(session.id, 'user', 'Turn 3');

    // Assemble context (now async, max 4 messages + 1 anchored system prompt = 5)
    const context = await assembler.assembleContext(session.id);
    assert.equal(context.length, 5);
    assert.equal(context[0].role, 'system');
    assert.ok(context[0].content.includes('HṚṢĪKEŚA'));
    assert.equal(context[1].content, 'Response 1');
    assert.equal(context[2].content, 'Turn 2');
    assert.equal(context[3].content, 'Response 2');
    assert.equal(context[4].content, 'Turn 3');

    db.close();
  });
});
