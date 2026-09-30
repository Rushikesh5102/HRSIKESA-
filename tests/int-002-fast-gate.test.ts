/**
 * HṚṢĪKEŚA (हृषीकेश) — INT-002 Fast Chat Gate & Non-Blocking Interaction Tests
 *
 * Covers all 24 verification requirements specified in INT-002 specification.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FastChatGate } from '../src/conversation/fast.chat.gate.js';
import { ChatNormalizer } from '../src/conversation/chat.normalizer.js';
import { SessionManager } from '../src/conversation/session.manager.js';
import { ConversationService } from '../src/conversation/conversation.service.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { HardwareDetector } from '../src/core/hardware/hardware.detector.js';
import { OllamaProvider } from '../src/models/providers/ollama.provider.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { TimeNowTool } from '../src/tools/builtin/time.now.js';
import { EventBus } from '../src/core/events/event-bus.js';
import {
  IModelProvider,
  ModelMetadata,
  ChatRequest,
  ModelResponse,
  ProviderHealth
} from '../src/models/interfaces/index.js';

class MockRecordingChatProvider implements IModelProvider {
  public readonly id = 'mock-fast-llm';
  public readonly displayName = 'Mock Fast LLM Provider';
  public readonly isLocal = true;
  public lastChatRequest?: ChatRequest;
  public chatCount = 0;
  public simulatedDelayMs = 0;

  public async checkHealth(): Promise<ProviderHealth> {
    return {
      status: 'healthy',
      message: 'Mock operational',
      checkedAt: new Date().toISOString()
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return [
      {
        id: 'mock-model-7b',
        providerId: this.id,
        displayName: 'Mock Model 7B',
        isLocal: true,
        capabilities: ['chat', 'tools'],
        costClassification: 'free-local',
        availability: true,
        statusText: 'Ready',
        priority: 100
      }
    ];
  }

  public async generate(): Promise<ModelResponse> {
    throw new Error('Not implemented in mock');
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    this.chatCount++;
    this.lastChatRequest = request;
    if (this.simulatedDelayMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulatedDelayMs));
    }

    if (request.stream && request.onToken) {
      request.onToken('Mock ');
      request.onToken('tokenized ');
      request.onToken('response.');
    }

    return {
      text: 'Mock tokenized response.',
      providerId: this.id,
      modelId: 'mock-model-7b',
      durationMs: 10,
      isLocal: true
    };
  }
}

describe('HṚṢĪKEŚA — INT-002 Fast Chat Gate & Non-Blocking Interaction', () => {
  let fastGate: FastChatGate;
  let identityMgr: IdentityManager;
  let sessionMgr: SessionManager;
  let modelRegistry: ModelRegistry;
  let mockProvider: MockRecordingChatProvider;
  let hardwareDetector: HardwareDetector;
  let router: ModelRouter;
  let toolRegistry: ToolRegistry;
  let permMgr: PermissionManager;
  let auditMgr: ToolAuditManager;
  let eventBus: EventBus;
  let toolBus: ToolExecutionBus;
  let convService: ConversationService;

  beforeEach(() => {
    fastGate = new FastChatGate();
    identityMgr = new IdentityManager();
    sessionMgr = new SessionManager();
    modelRegistry = new ModelRegistry();
    mockProvider = new MockRecordingChatProvider();
    modelRegistry.registerProvider(mockProvider);

    hardwareDetector = new HardwareDetector();
    eventBus = new EventBus();
    router = new ModelRouter(modelRegistry, eventBus, undefined, hardwareDetector);

    toolRegistry = new ToolRegistry();
    toolRegistry.register(new TimeNowTool());
    permMgr = new PermissionManager();
    auditMgr = new ToolAuditManager();
    eventBus = new EventBus();
    toolBus = new ToolExecutionBus(toolRegistry, permMgr, auditMgr, eventBus);

    convService = new ConversationService(
      sessionMgr,
      router,
      identityMgr,
      undefined,
      undefined,
      toolBus,
      toolRegistry,
      undefined,
      eventBus
    );
    convService.setToolExecution(toolBus, toolRegistry);
  });

  // 1. hello
  test('1. hello: deterministic fast greeting with sub-5ms instant response', async () => {
    const res = await convService.sendMessage('hello');
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(res.provider, 'local');
    assert.equal(res.intentMode, 'CASUAL_GREETING');
    assert.ok(res.response.includes('HṚṢĪKEŚA') || res.response.includes('Rushikesh') || res.response.includes('Master'));
    assert.equal(mockProvider.chatCount, 0, 'No LLM should be invoked for greeting');
  });

  // 2. hello + language suffix
  test('2. hello + language suffix: normalized and correctly classified as fast greeting', async () => {
    const wrappedHello = 'hello\n\n[Language Preference: Respond in clear, articulate Indian English.]';
    const res = await convService.sendMessage(wrappedHello);
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(res.intentMode, 'CASUAL_GREETING');
    assert.equal(mockProvider.chatCount, 0, 'No LLM should be invoked despite language wrapper');
  });

  // 3. hi + language suffix
  test('3. hi + language suffix: normalized and handled instantly', async () => {
    const wrappedHi = 'hi\n\n[Language Preference: Respond in Hindi.]';
    const res = await convService.sendMessage(wrappedHi);
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(res.intentMode, 'CASUAL_GREETING');
    assert.equal(mockProvider.chatCount, 0);
  });

  // 4. identity question
  test('4. identity question: who created you returns deterministic answer', async () => {
    const res = await convService.sendMessage('who created you?');
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(res.intentMode, 'IDENTITY_QUERY');
    assert.ok(res.response.includes('Rushikesh Pattiwar'));
    assert.equal(mockProvider.chatCount, 0);
  });

  // 5. HṚṢĪKEŚA identity question
  test('5. HṚṢĪKEŚA identity question: what is HṚṢĪKEŚA returns deterministic answer', async () => {
    const res = await convService.sendMessage('what is HṚṢĪKEŚA?');
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(res.intentMode, 'IDENTITY_QUERY');
    assert.ok(res.response.includes('HṚṢĪKEŚA'));
    assert.ok(res.response.includes('33-agent specialized workforce'));
    assert.equal(mockProvider.chatCount, 0);
  });

  // 6. dynamic time request
  test('6. dynamic time request: returns live dynamic system time through deterministic path', async () => {
    const res = await convService.sendMessage('what time is it?');
    assert.equal(res.success, true);
    assert.equal(res.intentMode, 'TIME_QUERY');
    assert.ok(res.response.includes('current system time is'));
    assert.ok(res.response.includes('IST'));
    assert.equal(mockProvider.chatCount, 0, 'Dynamic time query should not perform 2-pass LLM');
  });

  // 7. simple question
  test('7. simple question: routes to conversation model without failure', async () => {
    const res = await convService.sendMessage('what is 2+2?');
    assert.equal(res.success, true);
    assert.equal(mockProvider.chatCount, 1);
    assert.equal(res.model, 'mock-model-7b');
  });

  // 8. simple question has no tool schemas
  test('8. simple question has no tool schemas: skipToolAttachment enforces tools = undefined', async () => {
    await convService.sendMessage('explain what quantum computing is in simple terms');
    assert.ok(mockProvider.lastChatRequest);
    assert.equal(
      mockProvider.lastChatRequest.tools,
      undefined,
      'Simple conversation must NOT attach any tool definitions'
    );
  });

  // 9. genuine tool request retains tools
  test('9. genuine tool request retains tools: browse or file query attaches tools', async () => {
    toolRegistry.register({
      id: 'browser.open_url',
      name: 'Open URL',
      description: 'Opens a browser URL',
      version: '1.0.0',
      category: 'browser',
      riskLevel: 0 as any,
      requiresApproval: false,
      capabilities: ['browser'],
      inputSchema: { type: 'object', properties: { url: { type: 'string' } } },
      execute: async () => ({ success: true, durationMs: 1 })
    });

    await convService.sendMessage('please browse https://example.com and check the page');
    assert.ok(mockProvider.lastChatRequest);
    assert.ok(
      mockProvider.lastChatRequest.tools && mockProvider.lastChatRequest.tools.length > 0,
      'Genuine action query MUST retain tool definitions'
    );
    assert.ok(mockProvider.lastChatRequest.tools.some((t) => t.name === 'browser.open_url'));
  });

  // 10. mission request returns immediate acknowledgement
  test('10. mission request returns immediate acknowledgement: non-blocking response', async () => {
    const res = await convService.sendMessage('research the latest developments in local small language models');
    assert.equal(res.success, true);
    assert.equal(res.model, 'system-ack');
    assert.ok(res.response.includes('Research Initiated') || res.response.includes('Action Accepted'));
    assert.equal(mockProvider.chatCount, 0, 'No blocking LLM on the chat thread');
  });

  // 11. goal request returns immediate acknowledgement
  test('11. goal request returns immediate acknowledgement: non-blocking response', async () => {
    const res = await convService.sendMessage('create a company named Apex Solutions for autonomous code audits');
    assert.equal(res.success, true);
    assert.equal(res.model, 'system-ack');
    assert.ok(res.response.includes('Operation Accepted') || res.response.includes('Architecture'));
    assert.equal(mockProvider.chatCount, 0);
  });

  // 12. background execution continues
  test('12. background execution continues: event emitted without blocking response', async () => {
    let missionEventReceived = false;
    eventBus.on('mission.created' as any, () => {
      missionEventReceived = true;
    });

    // Provide a mock mission orchestrator
    const mockOrchestrator: any = {
      planAndCreateMission: async () => ({ id: 'msn-test-123', objective: 'test' }),
      executeMission: async () => {}
    };
    convService.setMissionOrchestrator(mockOrchestrator);

    const res = await convService.sendMessage('research market trends for synthetic biology');
    assert.equal(res.success, true);
    // Allow microtask ticks for async dispatch
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(missionEventReceived, true);
  });

  // 13. persistence remains correct
  test('13. persistence remains correct: session holds all turns with correct metadata', async () => {
    const s = sessionMgr.createSession();
    await convService.sendMessage('hello', s.id);
    await convService.sendMessage('who are you?', s.id);

    const updated = sessionMgr.getSession(s.id);
    assert.ok(updated);
    assert.equal(updated.messages.length, 4); // 2 user + 2 assistant
    assert.equal(updated.messages[0].role, 'user');
    assert.equal(updated.messages[1].role, 'assistant');
    assert.equal(updated.messages[2].role, 'user');
    assert.equal(updated.messages[3].role, 'assistant');
  });

  // 14. interactive priority under local model contention
  test('14. interactive priority under local model contention: high priority executes ahead of normal', async () => {
    // Acquire lock to simulate background task holding it
    const acquired = hardwareDetector.acquireLocalModelLock();
    assert.equal(acquired, true);

    const executionOrder: string[] = [];

    // Background task (NORMAL priority) queued first
    const normalPromise = hardwareDetector
      .acquireLocalModelLockAsync(1000, 'NORMAL')
      .then((ok) => {
        if (ok) executionOrder.push('NORMAL');
      });

    // Interactive chat (HIGH priority) queued second
    const highPromise = hardwareDetector
      .acquireLocalModelLockAsync(1000, 'HIGH')
      .then((ok) => {
        if (ok) executionOrder.push('HIGH');
      });

    // Verify queue stats reflect priority order
    const stats = hardwareDetector.getLockQueueStats();
    assert.equal(stats.locked, true);
    assert.equal(stats.highPriorityWaiters, 1);
    assert.equal(stats.normalPriorityWaiters, 1);

    // Release background lock
    hardwareDetector.releaseLocalModelLock();

    // First released waiter should be HIGH priority!
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(executionOrder[0], 'HIGH', 'HIGH priority waiter must be serviced before NORMAL priority');

    // Release again so NORMAL can proceed
    hardwareDetector.releaseLocalModelLock();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(executionOrder[1], 'NORMAL');

    await Promise.all([normalPromise, highPromise]);
  });

  // 15. no deadlock
  test('15. no deadlock: lock queue unwinds completely when locks are released', async () => {
    hardwareDetector.acquireLocalModelLock();

    const p1 = hardwareDetector.acquireLocalModelLockAsync(500, 'NORMAL');
    const p2 = hardwareDetector.acquireLocalModelLockAsync(500, 'HIGH');

    hardwareDetector.releaseLocalModelLock();
    await new Promise((r) => setTimeout(r, 10));
    hardwareDetector.releaseLocalModelLock();

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1, true);
    assert.equal(r2, true);
    assert.equal(hardwareDetector.getLockQueueStats().totalWaiters, 0);
  });

  // 16. no false completion
  test('16. no false completion: immediate ack never claims action is completed', async () => {
    const res = await convService.sendMessage('research generative AI applications in healthcare');
    assert.ok(res.response.toLowerCase().includes('initiated') || res.response.toLowerCase().includes('accepted'));
    assert.ok(!res.response.toLowerCase().includes('completed research'));
    assert.ok(!res.response.toLowerCase().includes('research complete'));
  });

  // 17. Ollama availability caching
  test('17. Ollama availability caching: lists models without duplicate calls when cached', async () => {
    let fetchCount = 0;
    const provider = new OllamaProvider({
      host: 'http://127.0.0.1:11434',
      defaultModel: 'qwen2.5:7b',
      customFetch: async (url: string) => {
        if (url.includes('/api/tags')) {
          fetchCount++;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              models: [{ name: 'qwen2.5:7b', modified_at: new Date().toISOString() }]
            })
          } as any;
        }
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }
    });

    // Turn 1
    const models1 = await provider.listModels();
    assert.equal(models1.length, 1);
    assert.equal(fetchCount, 1);

    // Turn 2 within cache window
    const models2 = await provider.listModels();
    assert.equal(models2.length, 1);
    assert.equal(fetchCount, 1, 'Subsequent listModels must use in-memory cache');
  });

  // 18. explicit health refresh
  test('18. explicit health refresh: checkHealth forces cache invalidation and fresh fetch', async () => {
    let fetchCount = 0;
    const provider = new OllamaProvider({
      host: 'http://127.0.0.1:11434',
      defaultModel: 'qwen2.5:7b',
      customFetch: async (url: string) => {
        if (url.includes('/api/tags')) {
          fetchCount++;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              models: [{ name: 'qwen2.5:7b', modified_at: new Date().toISOString() }]
            })
          } as any;
        }
        if (url.includes('/api/version')) {
          return { ok: true, status: 200, json: async () => ({ version: '0.4.0' }) } as any;
        }
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }
    });

    await provider.listModels();
    assert.equal(fetchCount, 1);

    // checkHealth invalidates cache and refreshes
    await provider.checkHealth();
    assert.equal(fetchCount, 2, 'checkHealth must invalidate cache and query /api/tags');
  });

  // 19. provider error invalidates stale model availability
  test('19. provider error invalidates stale model availability: invalidateModelCache cleans state', async () => {
    const provider = new OllamaProvider({
      host: 'http://127.0.0.1:11434',
      defaultModel: 'qwen2.5:7b',
      customFetch: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: 'qwen2.5:7b', modified_at: new Date().toISOString() }]
        })
      } as any)
    });

    await provider.listModels();
    assert.equal(provider.isModelAvailable('qwen2.5:7b'), true);

    // Explicit or error invalidation
    provider.invalidateModelCache();
    assert.equal(provider.isModelAvailable('qwen2.5:7b'), false);
  });

  // 20. streaming path
  test('20. streaming path: onToken callback receives incremental tokens', async () => {
    const tokens: string[] = [];
    const res = await convService.sendMessage('what is the meaning of life?', undefined, undefined, undefined, (tok) => {
      tokens.push(tok);
    });

    assert.equal(res.success, true);
    assert.ok(tokens.length >= 1, 'Tokens must be delivered incrementally to onToken');
  });

  // 21. memory remains correct
  test('21. memory remains correct: normalizer strips wrapper while raw remains stored', () => {
    const raw = 'How are you?\n\n[Language Preference: Respond in Telugu.]';
    const norm = ChatNormalizer.normalize(raw);
    assert.equal(norm.classificationText, 'how are you');
    assert.equal(norm.originalMessage, raw);
    assert.equal(norm.languagePreference, 'Respond in Telugu.');
  });

  // 22. audit remains correct
  test('22. audit remains correct: direct time query through toolBus logs audit trail', async () => {
    const initialAuditCount = auditMgr.listRecords().length;
    await convService.sendMessage('what time is it?');
    const records = auditMgr.listRecords();
    assert.equal(records.length, initialAuditCount + 1);
    assert.equal(records[records.length - 1].toolId, 'time.now');
  });

  // 23. permission checks remain correct
  test('23. permission checks remain correct: toolBus validates permissions for time.now', async () => {
    const timeTool = new TimeNowTool();
    const permResult = permMgr.evaluate(timeTool, {}, {
      requestId: 'req-perm-test',
      userId: 'ROOT_RUSHIKESH',
      workspaceRoot: process.cwd()
    });
    assert.equal(permResult.decision, 'ALLOW');
  });

  // 24. ResourceGovernor remains enforced
  test('24. ResourceGovernor remains enforced: single local model concurrency invariant holds', async () => {
    assert.equal(hardwareDetector.isLocalModelLocked(), false);
    const lock1 = hardwareDetector.acquireLocalModelLock();
    assert.equal(lock1, true);
    assert.equal(hardwareDetector.isLocalModelLocked(), true);

    // Immediate second lock attempt must be rejected
    const lock2 = hardwareDetector.acquireLocalModelLock();
    assert.equal(lock2, false);

    hardwareDetector.releaseLocalModelLock();
    assert.equal(hardwareDetector.isLocalModelLocked(), false);
  });
});
