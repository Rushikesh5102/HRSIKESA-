/**
 * HRSIKESA - Task and Mission Persistence Tests
 * Verifies TaskRepository, MissionRepository, and durability across restart.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { TaskRepository } from '../src/persistence/repositories/task.repository.js';
import { MissionRepository } from '../src/persistence/repositories/mission.repository.js';
import { AgentTask } from '../src/agents/interfaces/task.types.js';
import { IMission } from '../src/agents/interfaces/mission.types.js';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB_PATH = 'data/test-task-persistence.db';

test('Task and Mission Persistence Subsystem', async (t) => {
  const cleanup = () => {
    for (const ext of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + ext;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
    }
  };

  cleanup();

  await t.test('should persist tasks, list by agent/mission/status, and retrieve children', () => {
    const db = new DatabaseManager(TEST_DB_PATH);
    db.open();
    const migrations = new MigrationManager(db);
    migrations.runPending();

    const taskRepo = new TaskRepository(db);

    const rootTask: AgentTask = {
      id: 'task_root_001',
      agentId: 'aja',
      missionId: 'msn_001',
      objective: 'Plan architecture',
      priority: 'high',
      status: 'queued',
      depth: 0,
      createdAt: new Date().toISOString()
    };

    const childTask: AgentTask = {
      id: 'task_child_001',
      agentId: 'gandiva',
      missionId: 'msn_001',
      parentTaskId: 'task_root_001',
      objective: 'Implement modules',
      priority: 'high',
      status: 'queued',
      depth: 1,
      createdAt: new Date().toISOString()
    };

    taskRepo.create(rootTask);
    taskRepo.create(childTask);

    const retrievedRoot = taskRepo.get('task_root_001');
    assert.ok(retrievedRoot);
    assert.equal(retrievedRoot.objective, 'Plan architecture');
    assert.equal(retrievedRoot.depth, 0);

    const children = taskRepo.listChildren('task_root_001');
    assert.equal(children.length, 1);
    assert.equal(children[0].id, 'task_child_001');

    const activeTasks = taskRepo.listActive();
    assert.equal(activeTasks.length, 2);

    taskRepo.updateStatus('task_child_001', 'completed', undefined, new Date().toISOString());
    const updatedChild = taskRepo.get('task_child_001');
    assert.equal(updatedChild?.status, 'completed');

    const activeAfter = taskRepo.listActive();
    assert.equal(activeAfter.length, 1);
    assert.equal(activeAfter[0].id, 'task_root_001');

    db.close();
  });

  await t.test('CRITICAL TEST: Tasks and missions must survive database reload', () => {
    // Reopen same database
    const db = new DatabaseManager(TEST_DB_PATH);
    db.open();

    const taskRepo = new TaskRepository(db);
    const missionRepo = new MissionRepository(db);

    const mission: IMission = {
      id: 'msn_001',
      objective: 'System Architecture Mission',
      rootAgentId: 'aja',
      rootTaskId: 'task_root_001',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    missionRepo.create(mission);

    const loadedMission = missionRepo.get('msn_001');
    assert.ok(loadedMission);
    assert.equal(loadedMission.objective, 'System Architecture Mission');

    const tasks = taskRepo.listByMission('msn_001');
    assert.equal(tasks.length, 2);
    assert.equal(tasks[0].id, 'task_root_001');
    assert.equal(tasks[1].id, 'task_child_001');

    db.close();
    cleanup();
  });
});
