/**
 * HRSIKESA (हृषीकेश) — Chat vs Mission Intent Classifier Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { MissionIntentClassifier } from '../src/conversation/intent.classifier.js';

test('MissionIntentClassifier Subsystem', async (t) => {
  const classifier = new MissionIntentClassifier();

  await t.test('classifies conversational and informational queries as chat', async () => {
    const r1 = classifier.classify('What is Python?');
    assert.strictEqual(r1.isMission, false);

    const r2 = classifier.classify('Explain how quantum computing works');
    assert.strictEqual(r2.isMission, false);

    const r3 = classifier.classify('Who is Chanakya in Indian history?');
    assert.strictEqual(r3.isMission, false);

    const r4 = classifier.classify('Hi HṚṢĪKEŚA, how are you today?');
    assert.strictEqual(r4.isMission, false);
  });

  await t.test('classifies action-oriented, multi-step engineering requests as missions', async () => {
    const r1 = classifier.classify('Create a Python script that monitors CPU usage and test it');
    assert.strictEqual(r1.isMission, true);
    assert.ok(r1.objective);

    const r2 = classifier.classify('Inspect the workspace and produce a report containing directory structure');
    assert.strictEqual(r2.isMission, true);

    const r3 = classifier.classify('Build an application to monitor system health');
    assert.strictEqual(r3.isMission, true);

    const r4 = classifier.classify('Run a full audit and test all environment variables');
    assert.strictEqual(r4.isMission, true);
  });

  await t.test('remains conservative on short questions', async () => {
    const r1 = classifier.classify('Can you help me?');
    assert.strictEqual(r1.isMission, false);
  });
});
