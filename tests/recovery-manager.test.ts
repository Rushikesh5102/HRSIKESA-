/**
 * HRSIKESA (हृषीकेश) — Failure Recovery & Retry Classifier Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RecoveryManager } from '../src/agents/recovery/recovery.manager.js';

test('RecoveryManager Subsystem', async (t) => {
  const recovery = new RecoveryManager(3);

  await t.test('classifies security & human approval blocks as non-retryable and triggers block_human', () => {
    const classification = recovery.classifyError('Tier 3 operation requires Human Approval');
    assert.strictEqual(classification.category, 'security_blocked');
    assert.strictEqual(classification.isRetryable, false);
    assert.strictEqual(classification.suggestedAction, 'block_human');
  });

  await t.test('classifies transient network/lock errors as retryable when within budget', () => {
    const classification = recovery.classifyError('Temporary socket timeout connecting to endpoint', 0, 1, 3);
    assert.strictEqual(classification.category, 'transient');
    assert.strictEqual(classification.isRetryable, true);
    assert.strictEqual(classification.suggestedAction, 'retry');
  });

  await t.test('stops retrying transient errors when retry budget is exhausted and signals fail', () => {
    const classification = recovery.classifyError('Temporary network timeout', 0, 3, 3);
    assert.strictEqual(classification.isRetryable, false);
    assert.strictEqual(classification.suggestedAction, 'fail');
  });

  await t.test('never retries dangerous/destructive operations blindly and triggers replan', () => {
    // Danger tier >= 2 (destructive filesystem or process kill)
    const classification = recovery.classifyError('Failed to remove directory: busy', 2, 0, 3);
    assert.strictEqual(classification.isRetryable, false);
    assert.strictEqual(classification.suggestedAction, 'replan');
  });

  await t.test('classifies resource exhaustion errors', () => {
    const classification = recovery.classifyError('Out of memory: memory limit reached');
    assert.strictEqual(classification.category, 'resource_exhausted');
    assert.strictEqual(classification.isRetryable, false);
    assert.strictEqual(classification.suggestedAction, 'fail');
  });
});
