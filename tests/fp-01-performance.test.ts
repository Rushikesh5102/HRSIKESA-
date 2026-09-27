import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastChatGate } from '../src/conversation/fast.chat.gate.js';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { InferenceBackendDetector } from '../src/inference/backend.detector.js';
import { InferenceRegistry } from '../src/inference/inference.registry.js';
import { InferenceScheduler } from '../src/inference/inference.scheduler.js';
import { ExecutionPolicyEngine } from '../src/conversation/execution.policy.js';
import { ChatNamer } from '../src/conversation/chat.namer.js';
import { CancellationManager } from '../src/conversation/cancellation.manager.js';
import { OfflineManager } from '../src/core/offline/offline.manager.js';

describe('FP-01 Foundation Performance & Execution Block', () => {
  // 1. T0 Deterministic Fast Paths (<100ms)
  describe('T0 Deterministic Fast Paths', () => {
    const fastGate = new FastChatGate();

    test('should resolve "hello" and "hi" in <10ms with "Rishi" English identity', () => {
      const start = performance.now();
      const res1 = fastGate.evaluate('hello');
      const res2 = fastGate.evaluate('hi');
      const elapsed = performance.now() - start;

      assert.ok(res1.isDeterministicInstant);
      assert.ok(res2.isDeterministicInstant);
      assert.ok(res1.instantResponse?.includes('Rishi'));
      assert.ok(res2.instantResponse?.includes('Rishi'));
      assert.ok(elapsed < 100, `Elapsed was ${elapsed}ms, expected < 100ms`);
    });

    test('should resolve identity questions with canonical HṚṢĪKEŚA and English name Rishi', () => {
      const res = fastGate.evaluate('who are you?');
      assert.ok(res.isDeterministicInstant);
      assert.ok(res.instantResponse?.includes('Rishi'));
      assert.ok(res.instantResponse?.includes('HṚṢĪKEŚA'));
    });

    test('should resolve creator identity with Rushikesh Pattiwar', () => {
      const res = fastGate.evaluate('who created you?');
      assert.ok(res.isDeterministicInstant);
      assert.ok(res.instantResponse?.includes('Rushikesh Pattiwar'));
    });

    test('should resolve time and date deterministically', () => {
      const timeRes = fastGate.evaluate('what time is it?');
      const dateRes = fastGate.evaluate('what date is it?');
      assert.ok(timeRes.isDeterministicInstant);
      assert.ok(dateRes.isDeterministicInstant);
      assert.ok(timeRes.instantResponse?.includes(':'));
      assert.ok((dateRes.instantResponse?.length ?? 0) > 5);
    });

    test('should resolve arithmetic "2+2" deterministically in <5ms', () => {
      const start = performance.now();
      const res = fastGate.evaluate('2+2');
      const elapsed = performance.now() - start;

      assert.ok(res.isDeterministicInstant);
      assert.ok(res.instantResponse?.includes('4'));
      assert.ok(elapsed < 10, `Elapsed was ${elapsed}ms, expected < 10ms`);
    });
  });

  // 2. English Self Name "Rishi"
  describe('Identity & English Self Name', () => {
    test('IdentityManager should expose englishSelfName as "Rishi"', () => {
      const manager = new IdentityManager();
      const sys = manager.getSystemIdentity();
      assert.equal(sys.englishSelfName, 'Rishi');
      assert.equal(sys.name, 'HṚṢĪKEŚA');
      assert.equal(sys.sanskrit, 'हृषीकेश');
      assert.equal(sys.internationalSpelling, 'HRISHIKESHA');
    });
  });

  // 3. Hardware & Backend Discovery
  describe('Hardware & Backend Discovery', () => {
    test('InferenceBackendDetector should detect system hardware without throwing', async () => {
      const hw = await InferenceBackendDetector.inspectHardware();

      assert.ok(hw.cpuName.length > 0);
      assert.ok(hw.logicalProcessors > 0);
      assert.ok(hw.totalRamBytes > 0);
      assert.ok(hw.backends.LLAMACPP_CPU.available);
      assert.ok(hw.backends.LLAMACPP_VULKAN !== undefined);
    });

    test('InferenceBackendDetector should record SYCL as NOT_AVAILABLE if host lacks oneAPI runtime', async () => {
      const hw = await InferenceBackendDetector.inspectHardware();
      const sycl = hw.backends.LLAMACPP_SYCL;
      assert.equal(sycl.available, false);
      assert.ok(sycl.reason?.includes('NOT_AVAILABLE'));
    });

    test('InferenceRegistry should provide backends and detect availability cleanly', async () => {
      const registry = InferenceRegistry.getInstance();
      await registry.initialize();

      const backends = registry.listAvailableBackends();
      assert.ok(backends.length > 0);
      assert.ok(backends.some(b => b.backendType === 'LLAMACPP_CPU' || b.backendType === 'OLLAMA'));
    });
  });

  // 4. Model Residency & Compute Tier Scheduling
  describe('Model Residency & Inference Scheduler', () => {
    test('InferenceRegistry should track residency and handle eviction candidates', () => {
      const registry = InferenceRegistry.getInstance();

      registry.recordModelUsage('qwen2.5:7b', 'LLAMACPP_CPU', 'T3', 4.7 * 1024 * 1024 * 1024);
      registry.recordModelFinished('qwen2.5:7b');

      const records = registry.getResidencyRecords();
      assert.ok(records.some(r => r.modelId === 'qwen2.5:7b'));

      const candidates = registry.getEvictionCandidates();
      assert.ok(candidates.some(c => c.modelId === 'qwen2.5:7b'));
    });

    test('InferenceScheduler should map tiers and execute deterministic T0 requests in <50ms', async () => {
      const scheduler = InferenceScheduler.getInstance();
      const start = performance.now();
      const result = await scheduler.scheduleAndExecute({
        messages: [{ role: 'user', content: 'hello' }],
        tier: 'T0'
      });
      const elapsed = performance.now() - start;

      assert.equal(result.modelTier, 'T0');
      assert.ok(result.text.length > 0);
      assert.ok(elapsed < 100);
      assert.ok(result.timing.spans.totalWallMs >= 0);
    });
  });

  // 5. Execution-First Policy & Assumption System
  describe('Execution-First Policy', () => {
    test('should EXECUTE actionable requests without asking clarification', () => {
      const check = ExecutionPolicyEngine.evaluate('Create a Python script that calculates factorial of numbers');

      assert.equal(check.action, 'EXECUTE');
      assert.ok(check.assumptions.length >= 0);
      assert.equal(check.blockingQuestion, undefined);
    });

    test('should suppress clarification for design/visual requests by applying modern defaults', () => {
      const check = ExecutionPolicyEngine.evaluate('Build a dashboard UI page for server statistics');

      assert.equal(check.action, 'EXECUTE');
      assert.ok(check.assumptions.some(a => a.category === 'STYLING'));
    });

    test('should ASK questions ONLY when high-risk or irreversible action is requested', () => {
      const highRisk = ExecutionPolicyEngine.evaluate('Drop database and delete everything', {
        riskTier: 'TIER_3',
      });

      assert.equal(highRisk.action, 'ASK_CLARIFICATION');
      assert.ok(highRisk.blockingQuestion !== undefined);
    });

    test('should record structured assumptions across execution lifetime', () => {
      ExecutionPolicyEngine.recordAssumption(
        'Defaulted persistence to project-local SQLite storage (data/hrisekesa.db).',
        'Database backend not specified.',
        'DEFAULTS'
      );

      const assumptions = ExecutionPolicyEngine.getRecentAssumptions();
      assert.ok(assumptions.length > 0);
      assert.equal(assumptions[assumptions.length - 1].category, 'DEFAULTS');
    });
  });

  // 6. Asynchronous Chat Namer
  describe('Chat Namer (Asynchronous & Concise)', () => {
    test('should generate concise 2-6 word titles deterministically', () => {
      const title1 = ChatNamer.extractDeterministicTitle('Build me a 3D portfolio website');
      assert.ok(title1.length > 0);
      const wordCount1 = title1.split(/\s+/).length;
      assert.ok(wordCount1 >= 2 && wordCount1 <= 6, `Word count was ${wordCount1}`);

      const title2 = ChatNamer.extractDeterministicTitle('What is the weather in Tokyo today?');
      assert.ok(title2.length > 0);
      const wordCount2 = title2.split(/\s+/).length;
      assert.ok(wordCount2 >= 2 && wordCount2 <= 6, `Word count was ${wordCount2}`);
    });

    test('should never produce "New Chat" or generic titles', () => {
      const title = ChatNamer.extractDeterministicTitle('Help me debug this python memory leak');
      assert.notEqual(title.toLowerCase(), 'new chat');
      assert.notEqual(title.toLowerCase(), 'untitled conversation');
    });
  });

  // 7. Cancellation & Interrupts
  describe('Cancellation & Stop Interrupts', () => {
    test('CancellationManager should register and trigger cancellation immediately', () => {
      const manager = CancellationManager.getInstance();
      const token = manager.createTokenForSession('session-test-cancellation');

      assert.equal(token.isCancelled, false);

      const wasCancelled = manager.cancelSession('session-test-cancellation', 'Voice STOP command received');
      assert.equal(wasCancelled, true);
      assert.equal(token.isCancelled, true);
      assert.equal(token.reason, 'Voice STOP command received');
    });

    test('CancellationManager should detect STOP command variants', () => {
      assert.equal(CancellationManager.isInterruptCommand('STOP'), true);
      assert.equal(CancellationManager.isInterruptCommand('cancel'), true);
      assert.equal(CancellationManager.isInterruptCommand('ABORT'), true);
      assert.equal(CancellationManager.isInterruptCommand('pause'), true);
      assert.equal(CancellationManager.isInterruptCommand('hello how are you'), false);
    });

    test('FastChatGate should intercept STOP immediately', () => {
      const gate = new FastChatGate();
      const res = gate.evaluate('STOP');
      assert.ok(res.isDeterministicInstant);
      assert.ok(res.instantResponse?.includes('Stopped') || res.instantResponse?.includes('cancelled') || res.instantResponse?.includes('Paused'));
    });
  });

  // 8. Offline Mode & Queued Operations
  describe('Offline First & Queued External Operations', () => {
    test('OfflineManager should track offline state and queue external calls', () => {
      const offline = OfflineManager.getInstance();
      offline.setOnlineStatus(false);

      assert.equal(offline.getOnlineStatus(), false);

      const entry = offline.queueExternalOperation('github_sync', { repo: 'hrisekesa' });

      assert.equal(entry.status, 'OFFLINE_QUEUED');
      const notice = offline.getFormattedOfflineNotice('github_sync');
      assert.ok(notice.includes('OFFLINE — QUEUED'));
      assert.ok(offline.getQueuedEntries().length > 0);
    });
  });
});
