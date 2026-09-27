import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { SessionRepository } from '../src/persistence/repositories/session.repository.js';
import { MessageRepository } from '../src/persistence/repositories/message.repository.js';
import { MemoryRepository } from '../src/persistence/repositories/memory.repository.js';

describe('Persistence & SQLite Subsystem', () => {
  const TEST_DB_DIR = 'data/test_persistence';
  const TEST_DB_PATH = `${TEST_DB_DIR}/test.db`;

  after(() => {
    if (fs.existsSync(TEST_DB_DIR)) {
      fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    }
  });

  test('should open database, enable foreign keys and WAL mode, and report diagnostics', () => {
    const db = new DatabaseManager(TEST_DB_PATH);
    db.open();

    const diag = db.getDiagnostics();
    assert.equal(diag.isOpen, true);
    assert.equal(diag.foreignKeys, true);
    assert.equal(diag.journalMode, 'wal');
    assert.ok(diag.path.includes('test.db'));

    db.close();
    const closedDiag = db.getDiagnostics();
    assert.equal(closedDiag.isOpen, false);
  });

  test('should execute migrations in order and maintain schema_migrations ledger', () => {
    const db = new DatabaseManager(':memory:');
    const migrations = new MigrationManager(db);

    const initialVersion = migrations.getCurrentVersion();
    assert.equal(initialVersion, 0);

    const expectedMigrationCount = migrations.getAvailableMigrations().length;
    assert.ok(expectedMigrationCount >= 28, 'Should have at least 28 migrations registered');

    const appliedCount = migrations.runPending();
    assert.equal(appliedCount, expectedMigrationCount);

    const versionAfter = migrations.getCurrentVersion();
    assert.equal(versionAfter, expectedMigrationCount);

    const appliedList = migrations.getAppliedMigrations();
    assert.equal(appliedList.length, expectedMigrationCount);
    appliedList.forEach((m, idx) => {
      assert.equal(m.version, idx + 1);
      assert.equal(m.name, migrations.getAvailableMigrations()[idx].name);
    });

    // Running again should apply 0
    const reRun = migrations.runPending();
    assert.equal(reRun, 0);

    db.close();
  });

  test('SessionRepository and MessageRepository should support durable CRUD and sequencing', () => {
    const db = new DatabaseManager(':memory:');
    const migrations = new MigrationManager(db);
    migrations.runPending();

    const sessionRepo = new SessionRepository(db);
    const messageRepo = new MessageRepository(db);

    // 1. Create Session
    const session = sessionRepo.create({
      id: 'session-100',
      title: 'Architecture Discussion',
      metadata: { topic: 'Micro-Kernel' }
    });
    assert.equal(session.id, 'session-100');
    assert.equal(session.title, 'Architecture Discussion');
    assert.equal(session.status, 'active');

    // 2. Add Messages
    const m1 = messageRepo.create({
      id: 'msg-1',
      sessionId: 'session-100',
      role: 'user',
      content: 'Explain Phase 3B'
    });
    assert.equal(m1.ordinal, 0);

    const m2 = messageRepo.create({
      id: 'msg-2',
      sessionId: 'session-100',
      role: 'assistant',
      content: 'Phase 3B implements persistent memory.',
      model: 'qwen2.5:7b',
      provider: 'ollama'
    });
    assert.equal(m2.ordinal, 1);

    // 3. Query Messages
    const messages = messageRepo.findBySessionId('session-100');
    assert.equal(messages.length, 2);
    assert.equal(messages[0].content, 'Explain Phase 3B');
    assert.equal(messages[1].content, 'Phase 3B implements persistent memory.');
    assert.equal(messages[1].model, 'qwen2.5:7b');

    // 4. Update Session status
    const updated = sessionRepo.update('session-100', { status: 'archived', title: 'Archived Architecture' });
    assert.equal(updated, true);
    const fetched = sessionRepo.findById('session-100');
    assert.equal(fetched?.status, 'archived');
    assert.equal(fetched?.title, 'Archived Architecture');

    db.close();
  });

  test('MemoryRepository should support 14 tiers, provenance, search, and count aggregation', () => {
    const db = new DatabaseManager(':memory:');
    const migrations = new MigrationManager(db);
    migrations.runPending();

    const memoryRepo = new MemoryRepository(db);

    // Initial migration should have seeded items
    const coreIdentity = memoryRepo.retrieve('core_identity', 'system_identity');
    assert.ok(coreIdentity);
    assert.ok(coreIdentity.content.includes('HṚṢĪKEŚA'));
    assert.equal(coreIdentity.provenance, 'explicit');

    // Store custom preference
    const pref = memoryRepo.store({
      id: 'pref-ide',
      tier: 'preferences',
      key: 'primary_ide',
      content: 'Antigravity IDE is the designated control station.',
      source: 'rushikesh_explicit',
      provenance: 'explicit',
      confidence: 1.0
    });
    assert.equal(pref.id, 'pref-ide');

    // Search by keyword
    const searchResults = memoryRepo.search('Antigravity');
    assert.ok(searchResults.length >= 1);
    assert.ok(searchResults.some((r) => r.key === 'primary_ide'));

    // Counts by tier
    const counts = memoryRepo.countByTier();
    assert.ok(counts['core_identity'] >= 1);
    assert.ok(counts['creator_profile'] >= 1);
    assert.ok(counts['preferences'] >= 1);

    db.close();
  });

  // CRITICAL REQUIREMENT 1:
  // 1. Start database.
  // 2. Create conversation.
  // 3. Add: "My favorite development environment is Antigravity."
  // 4. Shut down persistence layer.
  // 5. Reopen database.
  // 6. Retrieve the conversation.
  // 7. Verify the message still exists.
  test('CRITICAL TEST 1: Message must survive database shutdown and reopening', () => {
    const CRITICAL_DB_PATH = 'data/test_persistence/critical_test.db';

    // Step 1: Start database
    let db = new DatabaseManager(CRITICAL_DB_PATH);
    let migrations = new MigrationManager(db);
    migrations.runPending();

    let sessionRepo = new SessionRepository(db);
    let messageRepo = new MessageRepository(db);

    // Step 2: Create conversation
    const sessionId = 'critical-session-1';
    sessionRepo.create({
      id: sessionId,
      title: 'Critical Persistence Test'
    });

    // Step 3: Add message
    messageRepo.create({
      id: 'msg-critical-fav',
      sessionId,
      role: 'user',
      content: 'My favorite development environment is Antigravity.'
    });

    // Step 4: Shut down persistence layer
    db.close();
    assert.equal(db.isOpen(), false);

    // Step 5: Reopen database
    db = new DatabaseManager(CRITICAL_DB_PATH);
    db.open();
    sessionRepo = new SessionRepository(db);
    messageRepo = new MessageRepository(db);

    // Step 6: Retrieve conversation
    const retrievedSession = sessionRepo.findById(sessionId);
    assert.ok(retrievedSession);
    assert.equal(retrievedSession.id, sessionId);

    // Step 7: Verify message still exists
    const messages = messageRepo.findBySessionId(sessionId);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].content, 'My favorite development environment is Antigravity.');
    assert.equal(messages[0].role, 'user');

    db.close();
  });
});
