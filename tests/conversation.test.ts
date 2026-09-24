import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager } from '../src/conversation/session.manager.js';
import { ConversationService } from '../src/conversation/conversation.service.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import {
  ModelMetadata,
  ModelRequest,
  ChatRequest,
  ModelResponse,
  ProviderHealth
} from '../src/models/interfaces/model.types.js';

class MockChatProvider implements IModelProvider {
  public readonly id = 'mock-llm';
  public readonly displayName = 'Mock LLM Provider';
  public readonly isLocal = true;

  public async checkHealth(): Promise<ProviderHealth> {
    return {
      status: 'healthy',
      message: 'Mock active',
      checkedAt: new Date().toISOString()
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return [
      {
        id: 'mock-chat-7b',
        providerId: this.id,
        displayName: 'Mock Chat 7B',
        isLocal: true,
        capabilities: ['chat'],
        costClassification: 'free-local',
        availability: true,
        statusText: 'Ready',
        priority: 100
      }
    ];
  }

  public async generate(request: ModelRequest): Promise<ModelResponse> {
    return {
      text: `Generate: ${request.prompt}`,
      providerId: this.id,
      modelId: 'mock-chat-7b',
      durationMs: 20,
      isLocal: true
    };
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    const lastUserMsg = request.messages.filter((m) => m.role === 'user').pop();
    const historyCount = request.messages.length;

    // Check if previous turn context is present
    const hasNameContext = request.messages.some((m) => m.content.includes('Rushikesh'));

    let reply = `Echo: ${lastUserMsg?.content || ''} (Context messages: ${historyCount})`;
    if (lastUserMsg?.content.includes('What is my name?')) {
      reply = hasNameContext ? 'Your name is Rushikesh.' : 'I do not know your name.';
    }

    return {
      text: reply,
      providerId: this.id,
      modelId: 'mock-chat-7b',
      durationMs: 25,
      isLocal: true
    };
  }
}

describe('Conversation & Session Management Subsystem', () => {
  test('SessionManager should create sessions, add messages, and assign timestamps', () => {
    const mgr = new SessionManager();
    const session = mgr.createSession();

    assert.ok(session.id);
    assert.ok(session.createdAt);
    assert.equal(session.messages.length, 0);

    const msg1 = mgr.addMessage(session.id, 'user', 'Hello');
    assert.equal(msg1.role, 'user');
    assert.equal(msg1.content, 'Hello');
    assert.ok(msg1.id);
    assert.ok(msg1.timestamp);

    const msg2 = mgr.addMessage(session.id, 'assistant', 'Greetings.');
    assert.equal(session.messages.length, 2);
    assert.equal(msg2.role, 'assistant');
  });

  test('SessionManager should enforce context window sliding policy and system prompt anchor', () => {
    // Policy with max 4 history messages
    const mgr = new SessionManager({ maxHistoryMessages: 4, maxHistoryChars: 1000 });
    const session = mgr.createSession();

    mgr.addMessage(session.id, 'user', 'Message 1');
    mgr.addMessage(session.id, 'assistant', 'Reply 1');
    mgr.addMessage(session.id, 'user', 'Message 2');
    mgr.addMessage(session.id, 'assistant', 'Reply 2');
    mgr.addMessage(session.id, 'user', 'Message 3');
    mgr.addMessage(session.id, 'assistant', 'Reply 3');

    const history = mgr.getBoundedHistory(session.id, 'System Instruction Here');

    // Expected: System prompt at [0], plus the last 4 messages (Message 2, Reply 2, Message 3, Reply 3)
    assert.equal(history.length, 5);
    assert.equal(history[0].role, 'system');
    assert.equal(history[0].content, 'System Instruction Here');
    assert.equal(history[1].content, 'Message 2');
    assert.equal(history[4].content, 'Reply 3');
  });

  test('ConversationService should maintain multi-turn context across consecutive turns', async () => {
    const registry = new ModelRegistry();
    const mockProvider = new MockChatProvider();
    await registry.registerProvider(mockProvider);

    const router = new ModelRouter(registry);
    const sessionMgr = new SessionManager();
    const identityMgr = new IdentityManager();
    const convoService = new ConversationService(sessionMgr, router, identityMgr);

    // Turn 1: Introduce user
    const res1 = await convoService.sendMessage('My name is Rushikesh.');
    assert.equal(res1.success, true);
    assert.ok(res1.sessionId);

    // Turn 2: Query user name using the same session ID
    const res2 = await convoService.sendMessage('What is my name?', res1.sessionId);
    assert.equal(res2.sessionId, res1.sessionId);
    assert.equal(res2.response, 'Your name is Rushikesh.');
  });

  test('ConversationService should reject empty messages', async () => {
    const registry = new ModelRegistry();
    const router = new ModelRouter(registry);
    const sessionMgr = new SessionManager();
    const identityMgr = new IdentityManager();
    const convoService = new ConversationService(sessionMgr, router, identityMgr);

    await assert.rejects(
      async () => {
        await convoService.sendMessage('   ');
      },
      (err: Error) => {
        assert.ok(err.message.includes('cannot be empty'));
        return true;
      }
    );
  });
});
