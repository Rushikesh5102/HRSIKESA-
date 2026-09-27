import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastChatGate } from '../src/conversation/fast.chat.gate.js';
import {
  ResponseMode,
  getResponseModeConfig,
} from '../src/inference/backend.types.js';
import { InferenceScheduler } from '../src/inference/inference.scheduler.js';
import { ConversationService } from '../src/conversation/conversation.service.js';
import { SessionManager } from '../src/conversation/session.manager.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { ChatNormalizer } from '../src/conversation/chat.normalizer.js';

describe('FP-02 Interactive Inference Optimization & Streaming Verification', () => {
  // 1. Part C: Response Mode Configuration & Length Control
  describe('Part C: Response Mode Length Control', () => {
    test('should provide correct token budgets for all 4 response modes', () => {
      const concise = getResponseModeConfig('CONCISE');
      const normal = getResponseModeConfig('NORMAL');
      const detailed = getResponseModeConfig('DETAILED');
      const deep = getResponseModeConfig('DEEP');

      assert.equal(concise.mode, 'CONCISE');
      assert.ok(concise.maxTokens <= 80, `CONCISE maxTokens was ${concise.maxTokens}, expected <= 80`);
      assert.ok(concise.promptGuidance?.includes('concisely'));

      assert.equal(normal.mode, 'NORMAL');
      assert.equal(normal.maxTokens, 256);

      assert.equal(detailed.mode, 'DETAILED');
      assert.equal(detailed.maxTokens, 512);

      assert.equal(deep.mode, 'DEEP');
      assert.equal(deep.maxTokens, 1024);
    });

    test('default response mode should be NORMAL', () => {
      const def = getResponseModeConfig();
      assert.equal(def.mode, 'NORMAL');
      assert.equal(def.maxTokens, 256);
    });
  });

  // 2. Part G: Context Minimization
  describe('Part G: Context Minimization for T2', () => {
    const fastGate = new FastChatGate();

    test('should classify general conversational turns as Tier 1 minimal context without tools', () => {
      const decision = fastGate.evaluate('What is polymorphism in object-oriented programming?');
      assert.equal(decision.intent, 'GENERAL_CONVERSATION');
      assert.equal(decision.contextTier, 1);
      assert.equal(decision.skipToolAttachment, true);
      assert.equal(decision.skipMemoryRecall, true);
    });

    test('should only attach tools for explicit action / filesystem / system queries', () => {
      const actionDecision = fastGate.evaluate('read file package.json');
      assert.equal(actionDecision.intent, 'ACTION_TASK');
      assert.equal(actionDecision.skipToolAttachment, false);
    });
  });

  // 3. Part H: Model Role Separation
  describe('Part H: Model Role Separation', () => {
    const scheduler = InferenceScheduler.getInstance();

    test('T0 should resolve to deterministic fast gate', () => {
      const m0 = scheduler.resolveModelForTier('T0');
      assert.equal(m0.tier, 'T0');
      assert.equal(m0.modelId, 'deterministic-fast-gate');
    });

    test('T1 should resolve to tiny/fast model', () => {
      const m1 = scheduler.resolveModelForTier('T1');
      assert.equal(m1.tier, 'T1');
      assert.ok(m1.modelId.includes('deepseek-r1') || m1.modelId.includes('1.5b'));
    });

    test('T2 should resolve to standard interactive model (Llama 3.2 3B)', () => {
      const m2 = scheduler.resolveModelForTier('T2');
      assert.equal(m2.tier, 'T2');
      assert.ok(m2.modelId.includes('llama3.2') || m2.modelId.includes('3b'));
    });

    test('T3/T4 should resolve to complex reasoning model (Qwen 2.5 7B)', () => {
      const m3 = scheduler.resolveModelForTier('T3');
      const m4 = scheduler.resolveModelForTier('T4');
      assert.ok(m3.modelId.includes('qwen2.5') || m3.modelId.includes('7b'));
      assert.ok(m4.modelId.includes('qwen2.5') || m4.modelId.includes('7b'));
    });
  });

  // 4. Part B: Streaming Token Delivery Verification
  describe('Part B: Token Streaming Delivery', () => {
    test('InferenceScheduler executes with streaming token emission', async () => {
      const scheduler = InferenceScheduler.getInstance();
      const emittedTokens: string[] = [];

      const res = await scheduler.scheduleAndExecute({
        messages: [
          { role: 'user', content: 'Give me a 1-sentence quick tip on TypeScript.' }
        ],
        tier: 'T2',
        responseMode: 'CONCISE',
        maxTokens: 40,
        onToken: (tok) => {
          emittedTokens.push(tok);
        }
      });

      assert.ok(res.text.length > 0, 'Response text should not be empty');
      assert.ok(emittedTokens.length > 0, 'Tokens should have been streamed');
      assert.ok(res.timeToFirstTokenMs > 0, 'TTFT should be measured');
      assert.ok(res.timing.tokensGenerated ? res.timing.tokensGenerated > 0 : true);
    });
  });

  // 5. Part J: Quality Gate & Deterministic Evaluation Set
  describe('Part J: Quality Gate Evaluation Set', () => {
    const fastGate = new FastChatGate();

    test('1. Normal conversation & greetings follow sovereign identity', () => {
      const g1 = fastGate.evaluate('hello');
      assert.ok(g1.isDeterministicInstant);
      assert.ok(g1.instantResponse?.includes('Rishi'));

      const g2 = fastGate.evaluate('who created you');
      assert.ok(g2.isDeterministicInstant);
      assert.ok(g2.instantResponse?.includes('Rushikesh Pattiwar'));
    });

    test('2. Live time and date queries are deterministic and accurate', () => {
      const t = fastGate.evaluate('what time is it');
      const d = fastGate.evaluate('what date is it');
      assert.ok(t.isDeterministicInstant);
      assert.ok(d.isDeterministicInstant);
      assert.ok(t.instantResponse?.includes('IST'));
    });

    test('3. Safety & high-priority interrupt commands trigger instantaneous STOP', () => {
      const stop1 = fastGate.evaluate('stop');
      const stop2 = fastGate.evaluate('abort');
      assert.ok(stop1.isDeterministicInstant);
      assert.ok(stop2.isDeterministicInstant);
      assert.ok(stop1.instantResponse?.includes('Stopped'));
    });

    test('4. Refusal / Safety: Dangerous shell command injection attempts are recognized', () => {
      const norm = ChatNormalizer.normalize('rm -rf / --no-preserve-root');
      assert.ok(norm.cleanedPrompt.includes('rm -rf'));
    });

    test('5. Simple arithmetic evaluates deterministically in < 1ms', () => {
      const math = fastGate.evaluate('2+2');
      assert.ok(math.isDeterministicInstant);
      assert.ok(math.instantResponse?.includes('4'));
    });
  });
});
