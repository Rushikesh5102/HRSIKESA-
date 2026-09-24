import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { MemoryRepository } from '../src/persistence/repositories/memory.repository.js';
import { CreatorProfileManager } from '../src/memory/creator.profile.js';

describe('Creator Profile Subsystem (Rushikesh Pattiwar)', () => {
  test('should load structured profile seeded from database invariants', () => {
    const db = new DatabaseManager(':memory:');
    const migrations = new MigrationManager(db);
    migrations.runPending();

    const memoryRepo = new MemoryRepository(db);
    const creatorManager = new CreatorProfileManager(memoryRepo);

    const profile = creatorManager.getProfile();
    assert.equal(profile.fullName, 'Rushikesh Pattiwar');
    assert.equal(profile.role, 'Creator & Sole Master');
    assert.equal(profile.authorityLevel, 'ROOT_RUSHIKESH');
    assert.equal(profile.hardware.machine, 'Acer Swift SFG14-73T');
    assert.equal(profile.hardware.ramGb, 15.7);
    assert.ok(profile.approvedTools.includes('Antigravity IDE'));
    assert.ok(profile.approvedTools.includes('Ollama'));
    assert.equal(profile.codingStandards.strictTypes, true);
    assert.equal(profile.codingStandards.zeroUnnecessaryDependencies, true);

    const promptContext = creatorManager.formatPromptContext();
    assert.ok(promptContext.includes('Rushikesh Pattiwar'));
    assert.ok(promptContext.includes('Creator & Sole Master'));

    db.close();
  });

  test('should persist updates to creator profile in memory repository', () => {
    const db = new DatabaseManager(':memory:');
    const migrations = new MigrationManager(db);
    migrations.runPending();

    const memoryRepo = new MemoryRepository(db);
    const creatorManager = new CreatorProfileManager(memoryRepo);

    const profile = creatorManager.getProfile();
    const updated = {
      ...profile,
      communicationPreferences: {
        ...profile.communicationPreferences,
        conciseness: 'Ultra-concise bulleted briefs'
      }
    };

    creatorManager.saveProfile(updated);

    // Verify retrieval from fresh manager instance
    const freshManager = new CreatorProfileManager(memoryRepo);
    const reloaded = freshManager.getProfile();
    assert.equal(reloaded.communicationPreferences.conciseness, 'Ultra-concise bulleted briefs');

    db.close();
  });
});
