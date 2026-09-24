import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ChatGptImporter } from '../src/memory/import/chatgpt.importer.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { SessionRepository } from '../src/persistence/repositories/session.repository.js';
import { MessageRepository } from '../src/persistence/repositories/message.repository.js';
import { MemoryRepository } from '../src/persistence/repositories/memory.repository.js';
import { ChatGptExportConversation } from '../src/memory/import/chatgpt.types.js';

describe('ChatGPT Export Ingestion Subsystem', () => {
  const SAMPLE_CHATGPT_CONVERSATION: ChatGptExportConversation = {
    id: 'convo-uuid-1234',
    title: 'HṚṢĪKEŚA Initial Architecture',
    create_time: 1726915200, // 2024-09-21
    update_time: 1726915500,
    mapping: {
      'node-root': {
        id: 'node-root',
        message: null,
        children: ['node-msg-1']
      },
      'node-msg-1': {
        id: 'node-msg-1',
        parent: 'node-root',
        children: ['node-msg-2'],
        message: {
          id: 'msg-gpt-1',
          author: { role: 'user' },
          create_time: 1726915210,
          content: {
            content_type: 'text',
            parts: ['What is the core philosophy of HṚṢĪKEŚA?']
          }
        }
      },
      'node-msg-2': {
        id: 'node-msg-2',
        parent: 'node-msg-1',
        children: [],
        message: {
          id: 'msg-gpt-2',
          author: { role: 'assistant' },
          create_time: 1726915230,
          content: {
            content_type: 'text',
            parts: ['HṚṢĪKEŚA is a sovereign personal AI operating system for Rushikesh Pattiwar.']
          }
        }
      }
    },
    current_node: 'node-msg-2'
  };

  test('should parse and normalize a ChatGPT conversation DAG into linear turns', () => {
    const importer = new ChatGptImporter();
    const normalized = importer.normalizeConversation(SAMPLE_CHATGPT_CONVERSATION);

    assert.equal(normalized.id, 'convo-uuid-1234');
    assert.equal(normalized.title, 'HṚṢĪKEŚA Initial Architecture');
    assert.equal(normalized.turns.length, 2);

    assert.equal(normalized.turns[0].role, 'user');
    assert.equal(normalized.turns[0].content, 'What is the core philosophy of HṚṢĪKEŚA?');

    assert.equal(normalized.turns[1].role, 'assistant');
    assert.ok(normalized.turns[1].content.includes('sovereign personal AI operating system'));
  });

  test('should validate JSON export structure and reject non-array data', () => {
    const importer = new ChatGptImporter();
    assert.throws(
      () => importer.parseExportJson('{"not": "an array"}'),
      /Invalid ChatGPT export format/
    );

    const parsed = importer.parseExportJson(JSON.stringify([SAMPLE_CHATGPT_CONVERSATION]));
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, 'convo-uuid-1234');
  });

  test('should import normalized conversations with strict provenance metadata', () => {
    const db = new DatabaseManager(':memory:');
    const migrations = new MigrationManager(db);
    migrations.runPending();

    const sessionRepo = new SessionRepository(db);
    const messageRepo = new MessageRepository(db);
    const memoryRepo = new MemoryRepository(db);

    const importer = new ChatGptImporter(sessionRepo, messageRepo, memoryRepo);

    const result = importer.importConversations([SAMPLE_CHATGPT_CONVERSATION], {
      dryRun: false,
      createEpisodicMemories: true
    });

    assert.equal(result.totalConversationsParsed, 1);
    assert.equal(result.totalMessagesExtracted, 2);
    assert.equal(result.sessionsCreated, 1);
    assert.equal(result.messagesStored, 2);
    assert.equal(result.memoriesCreated, 1);
    assert.equal(result.errors.length, 0);

    // Verify persisted session in SQLite
    const session = sessionRepo.findById('chatgpt-convo-uuid-1234');
    assert.ok(session);
    assert.equal(session.title, 'HṚṢĪKEŚA Initial Architecture');
    assert.equal(session.metadata?.source, 'chatgpt_export');

    // Verify persisted messages in SQLite
    const messages = messageRepo.findBySessionId('chatgpt-convo-uuid-1234');
    assert.equal(messages.length, 2);
    assert.equal(messages[0].ordinal, 0);
    assert.equal(messages[1].ordinal, 1);
    assert.equal(messages[0].metadata?.source, 'chatgpt_export');

    // Verify episodic memory
    const episodes = memoryRepo.listByTier('conversational_episodic');
    assert.ok(episodes.length >= 1);
    assert.equal(episodes[0].provenance, 'imported');

    db.close();
  });
});
