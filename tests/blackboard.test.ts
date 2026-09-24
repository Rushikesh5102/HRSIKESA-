/**
 * HRSIKESA - Agent Blackboard Tests
 * Verifies shared findings storage, filtering by mission/task/agent, and clearing.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import fs from 'node:fs';

const TEST_DB_PATH = 'data/test-blackboard.db';

test('Agent Blackboard Subsystem', async (t) => {
  const cleanup = () => {
    for (const ext of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + ext;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
    }
  };

  cleanup();

  const db = new DatabaseManager(TEST_DB_PATH);
  db.open();
  const migrations = new MigrationManager(db);
  migrations.runPending();

  const blackboard = new AgentBlackboard(db);

  await t.test('should publish, retrieve, and filter findings across agents and tasks', () => {
    const entry1 = blackboard.publish('msn_100', 'task_1', 'rahu', {
      type: 'research_finding',
      title: 'Database comparison',
      content: 'SQLite WAL mode provides zero-latency concurrent reads.',
      evidence: ['node:sqlite benchmarks', 'WAL docs']
    });

    assert.ok(entry1.id.startsWith('bb_'));
    assert.equal(entry1.title, 'Database comparison');
    assert.equal(entry1.evidence?.length, 2);

    const entry2 = blackboard.publish('msn_100', 'task_2', 'gandiva', {
      type: 'code_finding',
      title: 'Repository implementation',
      content: 'TaskRepository implementation verified.'
    });

    const entry3 = blackboard.publish('msn_200', 'task_3', 'vighna', {
      type: 'qa_finding',
      title: 'Test report',
      content: 'All 77 unit tests passed.'
    });

    // 1. Get by ID
    const retrieved = blackboard.get(entry1.id);
    assert.ok(retrieved);
    assert.equal(retrieved.title, 'Database comparison');

    // 2. List by Mission
    const msn100Findings = blackboard.listByMission('msn_100');
    assert.equal(msn100Findings.length, 2);

    const msn100Research = blackboard.listByMission('msn_100', 'research_finding');
    assert.equal(msn100Research.length, 1);
    assert.equal(msn100Research[0].id, entry1.id);

    // 3. List by Task
    const task1Findings = blackboard.listByTask('task_1');
    assert.equal(task1Findings.length, 1);
    assert.equal(task1Findings[0].id, entry1.id);

    // 4. List by Agent
    const rahuFindings = blackboard.listByAgent('rahu');
    assert.equal(rahuFindings.length, 1);
    assert.equal(rahuFindings[0].id, entry1.id);

    // 5. Clear mission findings
    const clearedCount = blackboard.clear('msn_100');
    assert.equal(clearedCount, 2);
    assert.equal(blackboard.listByMission('msn_100').length, 0);
    assert.equal(blackboard.listByMission('msn_200').length, 1);
  });

  db.close();
  cleanup();
});
