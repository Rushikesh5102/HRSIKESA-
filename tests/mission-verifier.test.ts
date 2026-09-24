/**
 * HRSIKESA (हृषीकेश) — Mission Verifier Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MissionVerifier } from '../src/agents/verification/mission.verifier.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';

test('MissionVerifier Subsystem', async (t) => {
  const db = new DatabaseManager(':memory:');
  const migrations = new MigrationManager(db);
  migrations.runPending();

  const blackboard = new AgentBlackboard(db);
  const verifier = new MissionVerifier(blackboard);
  const testFilePath = path.join(process.cwd(), 'data', 'test-verification-file.txt');

  t.after(() => {
    db.close();
    if (fs.existsSync(testFilePath)) {
      try { fs.unlinkSync(testFilePath); } catch { /* ignore */ }
    }
  });

  await t.test('verifies file_exists strategy correctly', async () => {
    // 1. When file does not exist
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    const failRes = await verifier.verify({
      type: 'file_exists',
      target: testFilePath
    });
    assert.strictEqual(failRes.passed, false);

    // 2. When file exists
    fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    fs.writeFileSync(testFilePath, 'Phase 13 Sovereign Verification', 'utf8');
    const passRes = await verifier.verify({
      type: 'file_exists',
      target: testFilePath
    });
    assert.strictEqual(passRes.passed, true);
    assert.ok(passRes.details.includes('Verified file exists'));
  });

  await t.test('verifies file_contains strategy correctly', async () => {
    fs.writeFileSync(testFilePath, 'Phase 13 Sovereign Verification: Autonomous Loop Active', 'utf8');

    // Matching substring
    const passRes = await verifier.verify({
      type: 'file_contains',
      target: testFilePath,
      expectedValue: 'Autonomous Loop Active'
    });
    assert.strictEqual(passRes.passed, true);

    // Missing substring
    const failRes = await verifier.verify({
      type: 'file_contains',
      target: testFilePath,
      expectedValue: 'NonExistentString12345'
    });
    assert.strictEqual(failRes.passed, false);
  });

  await t.test('verifies blackboard_entry_present strategy', async () => {
    // Key not yet posted for mission msn_test
    const failRes = await verifier.verify({
      type: 'blackboard_entry_present',
      target: 'msn_test',
      expectedValue: 'security_audit'
    });
    assert.strictEqual(failRes.passed, false);

    // Publish finding to blackboard
    blackboard.publish('msn_test', 'task_1', 'garuda', {
      type: 'security_audit',
      title: 'Security Audit Finding',
      content: 'System security is verified clean.'
    });

    const passRes = await verifier.verify({
      type: 'blackboard_entry_present',
      target: 'msn_test',
      expectedValue: 'security_audit'
    });
    assert.strictEqual(passRes.passed, true);
  });

  await t.test('verifies command_exit_code strategy', async () => {
    const passRes = await verifier.verify(
      { type: 'command_exit_code', target: 'npm test', expectedValue: 0 },
      { exitCode: 0 } as any
    );
    assert.strictEqual(passRes.passed, true);

    const failRes = await verifier.verify(
      { type: 'command_exit_code', target: 'npm test', expectedValue: 0 },
      { exitCode: 1 } as any
    );
    assert.strictEqual(failRes.passed, false);
  });
});
