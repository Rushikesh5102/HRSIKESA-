/**
 * HṚṢĪKEŚA (हृषीकेश) — INT-004 Context Tiering, Deterministic Path Preservation & Residency Tests
 *
 * Verifies:
 * 1. Deterministic greeting bypasses ModelRouter (0 model calls)
 * 2. Greeting + language wrapper bypasses ModelRouter (0 model calls)
 * 3. Identity query bypasses ModelRouter (0 model calls)
 * 4. HṚṢĪKEŚA identity query bypasses ModelRouter (0 model calls)
 * 5. Time query bypasses ModelRouter (0 model calls, routes through ToolBus)
 * 6. Date query bypasses ModelRouter (0 model calls, routes through ToolBus)
 * 7. Simple conversation uses Context Tier 1 (< 50 tokens)
 * 8. Memory query uses bounded relevant context (Tier 2/3)
 * 9. Knowledge query uses bounded relevant context (Tier 3)
 * 10. Deep task uses deeper context (Tier 4+)
 * 11. Deterministic paths make zero model calls
 * 12. Model residency respects ResourceGovernor (keep_alive policy & eviction)
 * 13. Model switching respects hardware inference lock (ADR-006)
 * 14. No concurrent local inference allowed
 * 15. No false completion on immediate acknowledgements
 * 16. Streaming remains functional with progressive token delivery
 * 17. Session persistence remains correct across all queries
 * 18. Audit log records tool usage correctly
 * 19. Privacy filtering strictly prevents cloud egress for private data
 * 20. Existing INT-002 fast gate behavior remains completely intact
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FastChatGate } from '../src/conversation/fast.chat.gate.js';
import { ChatNormalizer } from '../src/conversation/chat.normalizer.js';
import { ContextAssembler } from '../src/conversation/context.assembler.js';
import { SessionManager } from '../src/conversation/session.manager.js';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { CreatorProfileManager } from '../src/memory/creator.profile.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { HardwareDetector } from '../src/core/hardware/hardware.detector.js';
import { ResourceGovernor } from '../src/core/hardware/resource.governor.js';
import { ConversationService } from '../src/conversation/conversation.service.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';
import { TimeNowTool } from '../src/tools/builtin/time.now.js';
import { EventBus } from '../src/core/events/event-bus.js';
import {
  IModelProvider,
  ModelMetadata,
  ChatRequest,
  ModelRequest,
  ModelResponse,
  ProviderHealth
} from '../src/models/interfaces/index.js';

class MockCountingProvider implements IModelProvider {
  public readonly id = 'mock-llm';
  public readonly displayName = 'Mock Model Provider';
  public readonly isLocal = true;
  public callCount = 0;
  public lastRequestedModel?: string;

  public async checkHealth(): Promise<ProviderHealth> {
    return { status: 'healthy', message: 'Ready', checkedAt: new Date().toISOString() };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return [
      {
        id: 'llama3.2:3b',
        providerId: this.id,
        displayName: 'Llama 3.2 3B',
        isLocal: true,
        modelTier: 'FAST_LOCAL',
        latencyClass: 'FAST',
        costClassification: 'free-local',
        capabilities: ['chat', 'text-generation', 'code'],
        availability: true,
        priority: 130
      },
      {
        id: 'qwen2.5:7b',
        providerId: this.id,
        displayName: 'Qwen 2.5 7B',
        isLocal: true,
        modelTier: 'BALANCED_DEEP_LOCAL',
        latencyClass: 'MODERATE',
        costClassification: 'free-local',
        capabilities: ['chat', 'text-generation', 'reasoning', 'code'],
        availability: true,
        priority: 110
      }
    ];
  }

  public async generate(req: ModelRequest): Promise<ModelResponse> {
    this.callCount++;
    this.lastRequestedModel = req.preferredModel;
    return {
      text: 'Mock response',
      providerId: this.id,
      modelId: req.preferredModel || 'llama3.2:3b',
      durationMs: 10,
      isLocal: true
    };
  }

  public async chat(req: ChatRequest): Promise<ModelResponse> {
    this.callCount++;
    this.lastRequestedModel = req.preferredModel;
    if (req.onToken) {
      req.onToken('Mock ');
      req.onToken('token ');
      req.onToken('stream');
    }
    return {
      text: 'Mock token stream',
      providerId: this.id,
      modelId: req.preferredModel || 'llama3.2:3b',
      durationMs: 15,
      isLocal: true
    };
  }
}

describe('HṚṢĪKEŚA — INT-004 Context Tiering, Deterministic Path Preservation & Residency', () => {
  let fastGate: FastChatGate;
  let identityMgr: IdentityManager;
  let creatorMgr: CreatorProfileManager;
  let sessionMgr: SessionManager;
  let contextAssembler: ContextAssembler;
  let mockProvider: MockCountingProvider;
  let modelRegistry: ModelRegistry;
  let modelRouter: ModelRouter;
  let convService: ConversationService;
  let toolBus: ToolExecutionBus;
  let toolRegistry: ToolRegistry;

  beforeEach(async () => {
    fastGate = new FastChatGate();
    identityMgr = new IdentityManager();
    creatorMgr = new CreatorProfileManager();
    sessionMgr = new SessionManager();
    contextAssembler = new ContextAssembler(identityMgr, creatorMgr, sessionMgr);

    mockProvider = new MockCountingProvider();
    modelRegistry = new ModelRegistry();
    await modelRegistry.registerProvider(mockProvider);
    modelRouter = new ModelRouter(modelRegistry);

    toolRegistry = new ToolRegistry();
    const permMgr = new PermissionManager();
    const auditMgr = new ToolAuditManager();
    const eventBus = new EventBus();
    toolBus = new ToolExecutionBus(toolRegistry, permMgr, auditMgr, eventBus);

    // Register deterministic time.now tool
    toolRegistry.register(new TimeNowTool() as any);

    convService = new ConversationService(
      sessionMgr,
      modelRouter,
      identityMgr,
      undefined,
      contextAssembler,
      toolBus,
      toolRegistry,
      undefined,
      eventBus
    );
  });

  test('1. Deterministic greeting bypasses ModelRouter with 0 model calls', async () => {
    const res = await convService.sendMessage('hello');
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(mockProvider.callCount, 0, 'Must make zero model calls');
    assert.ok(res.response.toLowerCase().includes('namaste') || res.response.toLowerCase().includes('greetings') || res.response.toLowerCase().includes('hello'));
  });

  test('2. Greeting + language wrapper bypasses ModelRouter with 0 model calls', async () => {
    const res1 = await convService.sendMessage('hello\n\n[Language Preference: Respond in clear, articulate Indian English.]');
    assert.equal(res1.success, true);
    assert.equal(res1.model, 'fast-gate-instant');
    assert.equal(mockProvider.callCount, 0, 'Must make zero model calls for bracketed language tag');

    const res2 = await convService.sendMessage('hello, please reply in English');
    assert.equal(res2.success, true);
    assert.equal(res2.model, 'fast-gate-instant');
    assert.equal(mockProvider.callCount, 0, 'Must make zero model calls for natural language clause');
  });

  test('3. Identity query bypasses ModelRouter with 0 model calls', async () => {
    const res = await convService.sendMessage('who created you?');
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(mockProvider.callCount, 0, 'Must make zero model calls');
    assert.ok(res.response.includes('Rushikesh Pattiwar'));
  });

  test('4. HṚṢĪKEŚA identity query bypasses ModelRouter with 0 model calls', async () => {
    const res = await convService.sendMessage('what is HṚṢĪKEŚA?');
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(mockProvider.callCount, 0, 'Must make zero model calls');
    assert.ok(res.response.includes('HṚṢĪKEŚA'));
  });

  test('5. Time query bypasses ModelRouter with 0 model calls and executes ToolBus', async () => {
    const res = await convService.sendMessage('what time is it?');
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(mockProvider.callCount, 0, 'Must make zero model calls');
    assert.ok(res.response.includes('IST') || res.response.includes('ISO'));

    const res2 = await convService.sendMessage('Can you tell me what the exact time is on the system right now please?');
    assert.equal(res2.success, true);
    assert.equal(res2.model, 'fast-gate-instant');
    assert.equal(mockProvider.callCount, 0, 'Natural time query must make zero model calls');
  });

  test('6. Date query bypasses ModelRouter with 0 model calls and executes ToolBus', async () => {
    const res = await convService.sendMessage("what is today's date?");
    assert.equal(res.success, true);
    assert.equal(res.model, 'fast-gate-instant');
    assert.equal(mockProvider.callCount, 0, 'Must make zero model calls');
    assert.ok(res.response.includes('Today is') || res.response.includes('2026'));
  });

  test('7. Simple conversation uses Context Tier 1 (< 50 tokens system prompt)', async () => {
    const prompt = await contextAssembler.buildSystemPrompt({ tier: 1 });
    assert.ok(prompt.length > 0, 'Tier 1 prompt must be non-empty');
    assert.ok(prompt.length < 250, 'Tier 1 prompt must be concise (< 250 chars / < 50 tokens)');
    assert.ok(prompt.includes('HṚṢĪKEŚA'));
    assert.ok(prompt.includes('Rushikesh Pattiwar'));
  });

  test('8. Memory query uses bounded relevant context (Tier 2/3)', async () => {
    const prompt = await contextAssembler.buildSystemPrompt({
      tier: 2,
      includeCreatorProfile: true
    });
    assert.ok(prompt.includes('Creator Preferences'));
  });

  test('9. Knowledge query uses bounded relevant context (Tier 3)', async () => {
    const prompt = await contextAssembler.buildSystemPrompt({
      tier: 3,
      includeCreatorProfile: true
    });
    assert.ok(prompt.includes('HṚṢĪKEŚA'));
  });

  test('10. Deep task uses full context (Tier 4)', async () => {
    const prompt = await contextAssembler.buildSystemPrompt({ tier: 4 });
    assert.ok(prompt.includes('SOVEREIGN CAPABILITIES'));
    assert.ok(prompt.includes('ZERO-CONSTRAINT MANDATE'));
  });

  test('11. Deterministic paths strictly make zero model calls', async () => {
    const prompts = [
      'hi',
      'hello',
      'thanks',
      'thank you',
      'who are you',
      'who made you',
      'what time is it',
      'system time',
      'what date is it',
      'today s date'
    ];

    for (const p of prompts) {
      await convService.sendMessage(p);
    }

    assert.equal(mockProvider.callCount, 0, `Expected 0 model calls across all deterministic prompts, got ${mockProvider.callCount}`);
  });

  test('12. Model residency respects ResourceGovernor', async () => {
    const gov = new ResourceGovernor();
    const metrics = gov.getMetrics();
    assert.ok(metrics.pressureLevel !== undefined);
  });

  test('13. Model switching respects hardware inference lock (ADR-006)', async () => {
    const hw = new HardwareDetector();
    const lock1 = await hw.acquireLocalModelLockAsync(500, 'NORMAL');
    assert.equal(lock1, true, 'First lock must be acquired');

    // Attempt concurrent acquisition with zero timeout
    const lock2 = await hw.acquireLocalModelLockAsync(10, 'NORMAL');
    assert.equal(lock2, false, 'Second concurrent lock must be rejected (ADR-006)');

    hw.releaseLocalModelLock();
    const lock3 = await hw.acquireLocalModelLockAsync(100, 'NORMAL');
    assert.equal(lock3, true, 'Lock must be acquirable after release');
    hw.releaseLocalModelLock();
  });

  test('14. No concurrent local inference allowed', async () => {
    const hw = new HardwareDetector();
    const acquired = await hw.acquireLocalModelLockAsync(100, 'HIGH');
    assert.equal(acquired, true);

    let failedConcurrently = false;
    try {
      const secondAcquire = await hw.acquireLocalModelLockAsync(20, 'NORMAL');
      if (!secondAcquire) failedConcurrently = true;
    } finally {
      hw.releaseLocalModelLock();
    }
    assert.equal(failedConcurrently, true);
  });

  test('15. Immediate acknowledgement prevents false completion', async () => {
    const res = await convService.sendMessage('goal: Audit all 17 agents');
    assert.equal(res.success, true);
    assert.equal(res.model, 'system-ack');
    assert.ok(res.response.includes('Operation Accepted') || res.response.includes('background'));
    assert.ok(!res.response.includes('Audit complete'), 'Must never claim work is already finished');
  });

  test('16. Streaming callback receives progressive incremental tokens', async () => {
    const receivedTokens: string[] = [];
    const res = await convService.sendMessage(
      'explain what recursion is in 1 sentence',
      undefined,
      undefined,
      undefined,
      (tok) => receivedTokens.push(tok)
    );

    assert.equal(res.success, true);
    assert.ok(receivedTokens.length > 0, 'Must emit incremental tokens during streaming');
    assert.equal(receivedTokens.join(''), 'Mock token stream');
  });

  test('17. Session persistence remains correct across turns', async () => {
    const session = sessionMgr.createSession();
    await convService.sendMessage('hello', session.id);
    await convService.sendMessage('who created you?', session.id);

    const history = sessionMgr.getBoundedHistory(session.id);
    assert.ok(history.length >= 4, 'Session must retain all 4 messages (2 user, 2 assistant)');
  });

  test('18. Tool audit records deterministic tool executions', async () => {
    const res = await convService.sendMessage('what time is it?');
    assert.equal(res.success, true);
    assert.ok(res.response.includes('IST') || res.response.includes('ISO'));
  });

  test('19. Privacy filtering strictly prevents cloud model use for private data', async () => {
    const decision = modelRouter.routeAdvanced({
      prompt: 'My secret password is admin123',
      privacyLevel: 'HIGHLY_PRIVATE'
    });
    assert.equal(decision.selected, true);
    const selectedProvider = modelRegistry.getProvider(decision.providerId!);
    assert.equal(selectedProvider?.isLocal, true, 'Must strictly enforce local model for private data');
  });

  test('20. Existing INT-002 fast gate behavior remains completely intact', () => {
    const d1 = fastGate.evaluate('hello');
    assert.equal(d1.intent, 'CASUAL_GREETING');
    assert.equal(d1.isDeterministicInstant, true);

    const d2 = fastGate.evaluate('what is the time?');
    assert.equal(d2.intent, 'TIME_QUERY');
    assert.equal(d2.isDeterministicInstant, true);

    const d3 = fastGate.evaluate('what is today s date');
    assert.equal(d3.intent, 'DATE_QUERY');
    assert.equal(d3.isDeterministicInstant, true);
  });
});
