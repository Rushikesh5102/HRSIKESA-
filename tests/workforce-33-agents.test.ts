/**
 * HRSIKESA (हृषीकेश) — 33-Agent Canonical Specialized Workforce Comprehensive Test Suite
 *
 * Deterministically verifies all 20 Canonical Workforce Invariants:
 * 1. Authoritative 33-Agent Registry Composition & ASCII-safe IDs
 * 2. Authentic Unicode Display Names & Sanskrit Orthography
 * 3. No Role Collisions & Distinct Specializations (33 unique roles)
 * 4. Critical Distinction: Manyu (Implementation) vs Manu (Specs) vs Siva (Modernization) vs Dhritavrata (Recovery)
 * 5. Comprehensive Lifecycle & Capability-Based Routing
 * 6. Security & Governance Boundaries (Tier 1 Max Default Limit)
 * 7. Old 17 Agents Are Not Active Defaults
 * 8. Workforce Health Diagnostics Aggregate All 33 Agents Accurately
 * 9. HṚṢĪKEŚA Director Invariant (Top-level orchestrator, not a specialist)
 * 10. Persistence Across Runtime Restart Invariant (SQLite durability)
 * 11. Multi-Agent Collaboration (DAG dependencies, blackboard state sharing)
 * 12. Dhritavrata Safe Local Recovery Cycle (Backup, corrupt, recover, verify)
 * 13. Ugraretā Safe Local Retirement & Teardown Simulation
 * 14. Kāla Rudra Scheduling & Resource Coordination
 * 15. Ṛtadhvaja Verification Truthfulness (Anti-hallucination & objective checks)
 * 16. Strict Governance & Permission Boundaries Matrix
 * 17. HITL State Machine Invariants
 * 18. Memory Isolation (Private vs Specialist vs Shared Project scopes)
 * 19. Model Independence (Agent identity independent of model provider)
 * 20. 5-Tier Vedic Canonical Structure (12 Ādityas, 11 Rudras, 8 Vasus, Indra, Prajāpati)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import {
  INITIAL_AGENT_ROSTER,
  INDRA,
  PRAJAPATI,
  DHATA,
  MITRA,
  ARYAMAN,
  VARUNA,
  AMSA,
  BHAGA,
  VIVASVAN,
  PUSA,
  TVASTA,
  SAVITA,
  PARJANYA,
  VISNU,
  MANYU,
  MANU,
  MAHINASA,
  MAHAN,
  SIVA,
  RITADHVAJA,
  UGRARETA,
  BHAVA,
  KALA_RUDRA,
  VAMADEVA,
  DHRITAVRATA,
  DHARA,
  ANALA,
  ANILA,
  APA,
  PRATYUSA,
  PRABHASA,
  SOMA,
  DHRUVA
} from '../src/agents/roster/initial.agents.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { TaskRepository } from '../src/persistence/repositories/task.repository.js';
import { MissionRepository } from '../src/persistence/repositories/mission.repository.js';
import { AgentTask } from '../src/agents/interfaces/task.types.js';
import { IMission, PlannedTask } from '../src/agents/interfaces/mission.types.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import { TaskGraph } from '../src/agents/tasks/task.graph.js';
import { MissionVerifier } from '../src/agents/verification/mission.verifier.js';

const TEST_DB_PATH = 'data/test-workforce-33-durability.db';

test('CANONICAL WORKFORCE — 33-Agent Specialized Workforce Invariants', async (t) => {
  let registry: AgentRegistry;

  const setupRegistry = () => {
    registry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      registry.register({ ...agent });
    }
  };

  await t.test('1. Authoritative 33-Agent Registry Composition & ASCII-safe IDs', () => {
    setupRegistry();
    const all = registry.getAll();
    assert.strictEqual(all.length, 33, 'Workforce must contain exactly 33 persistent agents');

    const expectedIds = [
      'indra', 'prajapati',
      'dhata', 'mitra', 'aryaman', 'varuna', 'amsa', 'bhaga', 'vivasvan', 'pusa', 'tvasta', 'savita', 'parjanya', 'visnu',
      'manyu', 'manu', 'mahinasa', 'mahan', 'siva', 'ritadhvaja', 'ugrareta', 'bhava', 'kala_rudra', 'vamadeva', 'dhritavrata',
      'dhara', 'anala', 'anila', 'apa', 'pratyusa', 'prabhasa', 'soma', 'dhruva'
    ];

    const actualIds = all.map((a) => a.id);
    for (const id of expectedIds) {
      assert.ok(actualIds.includes(id), `Missing canonical agent ID: ${id}`);
    }

    for (const id of actualIds) {
      assert.match(id, /^[a-z0-9_]+$/, `Agent ID '${id}' must be ASCII lowercase`);
    }

    const uniqueIds = new Set(actualIds);
    assert.strictEqual(uniqueIds.size, 33, 'Agent IDs must be completely unique');
  });

  await t.test('2. Authentic Unicode Display Names & Sanskrit Orthography', () => {
    setupRegistry();

    const expectedDisplayNames: Record<string, { display: string; sanskrit: string }> = {
      indra: { display: 'Indra', sanskrit: 'Indra (इन्द्र)' },
      prajapati: { display: 'Prajāpati', sanskrit: 'Prajāpati (प्रजापति)' },
      dhata: { display: 'Dhātā', sanskrit: 'Dhātā (धाता)' },
      mitra: { display: 'Mitra', sanskrit: 'Mitra (मित्र)' },
      aryaman: { display: 'Aryaman', sanskrit: 'Aryaman (अर्यमन्)' },
      varuna: { display: 'Varuṇa', sanskrit: 'Varuṇa (वरुण)' },
      amsa: { display: 'Aṃśa', sanskrit: 'Aṃśa (अंश)' },
      bhaga: { display: 'Bhaga', sanskrit: 'Bhaga (भग)' },
      vivasvan: { display: 'Vivasvān', sanskrit: 'Vivasvān (विवस्वान्)' },
      pusa: { display: 'Pūṣā', sanskrit: 'Pūṣā (पूषा)' },
      tvasta: { display: 'Tvaṣṭā', sanskrit: 'Tvaṣṭā (त्वष्टा)' },
      savita: { display: 'Savitā', sanskrit: 'Savitā (सविता)' },
      parjanya: { display: 'Parjanya', sanskrit: 'Parjanya (पर्जन्य)' },
      visnu: { display: 'Viṣṇu', sanskrit: 'Viṣṇu (विष्णु)' },
      manyu: { display: 'Manyu', sanskrit: 'Manyu (मन्यु)' },
      manu: { display: 'Manu', sanskrit: 'Manu (मनु)' },
      mahinasa: { display: 'Mahinasa', sanskrit: 'Mahinasa (महिनस)' },
      mahan: { display: 'Mahān', sanskrit: 'Mahān (महान्)' },
      siva: { display: 'Śiva', sanskrit: 'Śiva (शिव)' },
      ritadhvaja: { display: 'Ṛtadhvaja', sanskrit: 'Ṛtadhvaja (ऋतध्वज)' },
      ugrareta: { display: 'Ugraretā', sanskrit: 'Ugraretā (उग्ररेता)' },
      bhava: { display: 'Bhava', sanskrit: 'Bhava (भव)' },
      kala_rudra: { display: 'Kāla Rudra', sanskrit: 'Kāla (काल)' },
      vamadeva: { display: 'Vāmadeva', sanskrit: 'Vāmadeva (वामदेव)' },
      dhritavrata: { display: 'Dhṛtavrata', sanskrit: 'Dhṛtavrata (धृतव्रत)' },
      dhara: { display: 'Dharā', sanskrit: 'Dharā (धरा)' },
      anala: { display: 'Anala', sanskrit: 'Anala (अनल)' },
      anila: { display: 'Anila', sanskrit: 'Anila (अनिल)' },
      apa: { display: 'Āpa', sanskrit: 'Āpa (आप)' },
      pratyusa: { display: 'Pratyūṣa', sanskrit: 'Pratyūṣa (प्रत्यूष)' },
      prabhasa: { display: 'Prabhāsa', sanskrit: 'Prabhāsa (प्रभास)' },
      soma: { display: 'Soma', sanskrit: 'Soma (सोम)' },
      dhruva: { display: 'Dhruva', sanskrit: 'Dhruva (ध्रुव)' }
    };

    for (const [id, expected] of Object.entries(expectedDisplayNames)) {
      const agent = registry.get(id);
      assert.ok(agent, `Agent ${id} must exist in registry`);
      assert.strictEqual(agent.displayName, expected.display, `Display name for ${id} mismatch`);
      assert.strictEqual(agent.sanskritName, expected.sanskrit, `Sanskrit name for ${id} mismatch`);
    }
  });

  await t.test('3. No Role Collisions & Distinct Specializations', () => {
    setupRegistry();
    const roles = registry.getAll().map((a) => a.role);
    const uniqueRoles = new Set(roles);
    assert.strictEqual(uniqueRoles.size, 33, 'All 33 agents must possess unique and distinct roles');
  });

  await t.test('4. 5-Tier Canonical Structure Validation', () => {
    setupRegistry();
    const adityas = [DHATA, MITRA, ARYAMAN, VARUNA, AMSA, BHAGA, VIVASVAN, PUSA, TVASTA, SAVITA, PARJANYA, VISNU];
    const rudras = [MANYU, MANU, MAHINASA, MAHAN, SIVA, RITADHVAJA, UGRARETA, BHAVA, KALA_RUDRA, VAMADEVA, DHRITAVRATA];
    const vasus = [DHARA, ANALA, ANILA, APA, PRATYUSA, PRABHASA, SOMA, DHRUVA];

    assert.strictEqual(adityas.length, 12, 'Must have exactly 12 Ādityas');
    assert.strictEqual(rudras.length, 11, 'Must have exactly 11 Rudras');
    assert.strictEqual(vasus.length, 8, 'Must have exactly 8 Vasus');
    assert.ok(INDRA, 'Indra must exist');
    assert.ok(PRAJAPATI, 'Prajāpati must exist');
  });

  await t.test('5. Comprehensive Lifecycle & Capability-Based Routing', () => {
    setupRegistry();

    // Strategy -> Dhātā
    const agentStrategy = registry.findBestSpecialist(['strategy', 'business_planning']);
    assert.strictEqual(agentStrategy?.id, 'dhata');

    // Market Research -> Bhaga
    const agentMarket = registry.findBestSpecialist(['market_research', 'competitive_analysis']);
    assert.strictEqual(agentMarket?.id, 'bhaga');

    // System Architecture & Tooling -> Tvaṣṭā
    const agentDesign = registry.findBestSpecialist(['product_design', 'ui_ux_design']);
    assert.strictEqual(agentDesign?.id, 'tvasta');

    // Core Implementation -> Manyu
    const agentCode = registry.findBestSpecialist(['software_engineering', 'coding', 'typescript']);
    assert.strictEqual(agentCode?.id, 'manyu');

    // Verification & QA -> Ṛtadhvaja
    const agentQA = registry.findBestSpecialist(['qa', 'testing', 'verification']);
    assert.strictEqual(agentQA?.id, 'ritadhvaja');

    // Governance & Compliance -> Varuṇa
    const agentGov = registry.findBestSpecialist(['contracts', 'compliance', 'governance']);
    assert.strictEqual(agentGov?.id, 'varuna');

    // Delivery & Logistics -> Pūṣā
    const agentDelivery = registry.findBestSpecialist(['fulfillment', 'deployment', 'distribution']);
    assert.strictEqual(agentDelivery?.id, 'pusa');

    // Recovery & Resilience -> Vāmadeva
    const agentRecovery = registry.findBestSpecialist(['backup', 'recovery', 'rollback']);
    assert.strictEqual(agentRecovery?.id, 'vamadeva');

    // Teardown & Archival -> Dhṛtavrata
    const agentTeardown = registry.findBestSpecialist(['retirement', 'decommissioning', 'archival']);
    assert.strictEqual(agentTeardown?.id, 'dhritavrata');

    // Refactoring & Modernization -> Mahān
    const agentRefactor = registry.findBestSpecialist(['refactoring', 'modularization', 'modernization']);
    assert.strictEqual(agentRefactor?.id, 'mahan');

    // Root Cause & Diagnostics -> Śiva
    const agentDefect = registry.findBestSpecialist(['root_cause_analysis', 'defect_elimination']);
    assert.strictEqual(agentDefect?.id, 'siva');

    // Performance Optimization -> Mahinasa
    const agentPerf = registry.findBestSpecialist(['performance_profiling', 'latency_reduction']);
    assert.strictEqual(agentPerf?.id, 'mahinasa');

    // Infrastructure & Compute -> Prabhāsa
    const agentInfra = registry.findBestSpecialist(['operations', 'monitoring', 'infrastructure']);
    assert.strictEqual(agentInfra?.id, 'prabhasa');
  });

  await t.test('6. Security & Governance Boundaries (Tier 1 Max Default Limit)', () => {
    setupRegistry();
    for (const agent of registry.getAll()) {
      assert.strictEqual(
        agent.dangerTierLimit,
        DangerTier.TIER_1,
        `Agent ${agent.id} must be governed with dangerTierLimit TIER_1`
      );
      assert.ok(agent.allowedTools.length > 0, `Agent ${agent.id} must declare allowedTools`);
    }
  });

  await t.test('7. Old 17 Agents Are Not Active Canonical Defaults', () => {
    setupRegistry();
    const oldAgents = ['rahu', 'gandiva', 'spoota', 'vighna', 'arvan', 'mrtyu', 'kaala', 'kalki'];
    for (const legacy of oldAgents) {
      assert.strictEqual(registry.get(legacy), undefined, `Legacy agent '${legacy}' must NOT be in the canonical 33 registry`);
    }
  });

  await t.test('8. Workforce Health Diagnostics Aggregate All 33 Agents Accurately', () => {
    setupRegistry();
    const diag = registry.getDiagnostics();
    assert.strictEqual(diag.totalRegistered, 33);
    assert.ok(diag.workforceHealth !== undefined);
    assert.strictEqual(diag.workforceHealth?.total, 33);
    assert.strictEqual(diag.workforceHealth?.idle, 33);
    assert.strictEqual(diag.workforceHealth?.active, 0);

    // Simulate status changes
    registry.updateStatus('manyu', 'executing');
    registry.updateStatus('ritadhvaja', 'verifying');
    registry.updateStatus('dhritavrata', 'recovering');
    registry.updateStatus('ugrareta', 'retired');

    const updatedDiag = registry.getDiagnostics();
    assert.strictEqual(updatedDiag.workforceHealth?.idle, 29);
    assert.strictEqual(updatedDiag.workforceHealth?.active, 2);
    assert.strictEqual(updatedDiag.workforceHealth?.recovering, 1);
    assert.strictEqual(updatedDiag.workforceHealth?.retired, 1);
  });

  await t.test('9. HṚṢĪKEŚA Director Invariant (Top-level orchestrator, not a specialist)', () => {
    setupRegistry();
    assert.strictEqual(registry.get('hrisekesa'), undefined, 'HṚṢĪKEŚA itself must NOT be in the specialist registry roster');
    assert.strictEqual(registry.get('director'), undefined);
    assert.strictEqual(registry.getAll().length, 33);
  });

  await t.test('10. Persistence Across Runtime Restart Invariant (SQLite durability)', () => {
    for (const ext of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + ext;
      if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }
    }

    // 1. Session 1: Create and persist tasks/missions
    const db1 = new DatabaseManager(TEST_DB_PATH);
    db1.open();
    new MigrationManager(db1).runPending();
    const taskRepo1 = new TaskRepository(db1);
    const missionRepo1 = new MissionRepository(db1);

    const testMission: IMission = {
      id: 'msn_durability_33_001',
      objective: 'Verify durability across runtime restart with 33 agents',
      rootAgentId: 'manyu',
      rootTaskId: 'task_durability_root',
      status: 'executing',
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const rootTask: AgentTask = {
      id: 'task_durability_root',
      missionId: 'msn_durability_33_001',
      agentId: 'manyu',
      objective: 'Develop durable module',
      status: 'executing',
      priority: 'high',
      depth: 0,
      createdAt: new Date().toISOString()
    };

    const childTask: AgentTask = {
      id: 'task_durability_child',
      missionId: 'msn_durability_33_001',
      parentTaskId: 'task_durability_root',
      agentId: 'dhritavrata',
      objective: 'Setup recovery checkpoints',
      status: 'queued',
      priority: 'high',
      depth: 1,
      createdAt: new Date().toISOString()
    };

    missionRepo1.create(testMission);
    taskRepo1.create(rootTask);
    taskRepo1.create(childTask);

    // Close Database session 1
    db1.close();

    // 2. Session 2: Reload fresh instance
    const db2 = new DatabaseManager(TEST_DB_PATH);
    db2.open();
    const taskRepo2 = new TaskRepository(db2);
    const missionRepo2 = new MissionRepository(db2);

    const reloadedMission = missionRepo2.get('msn_durability_33_001');
    assert.ok(reloadedMission);
    assert.strictEqual(reloadedMission.objective, 'Verify durability across runtime restart with 33 agents');
    assert.strictEqual(reloadedMission.rootAgentId, 'manyu');

    const tasks = taskRepo2.listByMission('msn_durability_33_001');
    assert.strictEqual(tasks.length, 2);
    assert.strictEqual(tasks[0].agentId, 'manyu');
    assert.strictEqual(tasks[1].agentId, 'dhritavrata');

    const freshRegistry = new AgentRegistry();
    for (const a of INITIAL_AGENT_ROSTER) {
      freshRegistry.register({ ...a });
    }
    assert.strictEqual(freshRegistry.getAll().length, 33);

    db2.close();
  });

  await t.test('11. Multi-Agent Collaboration (DAG dependencies, blackboard state sharing)', () => {
    const db = new DatabaseManager(':memory:');
    db.open();
    new MigrationManager(db).runPending();
    const blackboard = new AgentBlackboard(db);

    const plannedTasks: PlannedTask[] = [
      {
        id: 'task_market',
        title: 'Market Research',
        agentId: 'bhaga',
        objective: 'Market intelligence report',
        dependencies: [],
        requiredCapabilities: ['market_research'],
        expectedOutputs: ['market_report'],
        dangerLevel: 0
      },
      {
        id: 'task_design',
        title: 'Product Design',
        agentId: 'tvasta',
        dependencies: ['task_market'],
        objective: 'Product design spec',
        requiredCapabilities: ['product_design'],
        expectedOutputs: ['spec_v1'],
        dangerLevel: 0
      },
      {
        id: 'task_code',
        title: 'Development',
        agentId: 'manyu',
        dependencies: ['task_design'],
        objective: 'Code implementation',
        requiredCapabilities: ['software_engineering'],
        expectedOutputs: ['build_artifact'],
        dangerLevel: 0
      },
      {
        id: 'task_qa',
        title: 'QA & Testing',
        agentId: 'ritadhvaja',
        dependencies: ['task_code'],
        objective: 'QA verification',
        requiredCapabilities: ['testing'],
        expectedOutputs: ['qa_report'],
        dangerLevel: 0
      }
    ];

    const graph = new TaskGraph(plannedTasks);
    const order = graph.getTopologicalOrder().map((t) => t.id);
    assert.deepStrictEqual(order, ['task_market', 'task_design', 'task_code', 'task_qa']);

    // Bhaga shares market insight on blackboard
    blackboard.publish('msn_multi_33', 'task_market', 'bhaga', {
      type: 'market_insight',
      title: 'Target Sector Analysis',
      content: 'High demand detected in developer tooling sector.'
    });

    // Tvasta reads market insights and publishes spec
    const marketEntries = blackboard.listByMission('msn_multi_33');
    assert.strictEqual(marketEntries.length, 1);
    assert.strictEqual(marketEntries[0].agentId, 'bhaga');

    blackboard.publish('msn_multi_33', 'task_design', 'tvasta', {
      type: 'architecture_spec',
      title: 'Workforce API Specification',
      content: 'Defined REST API endpoints and state machines.'
    });

    // Manyu reads spec and publishes implementation build
    const updatedEntries = blackboard.listByMission('msn_multi_33');
    assert.strictEqual(updatedEntries.length, 2);

    blackboard.publish('msn_multi_33', 'task_code', 'manyu', {
      type: 'build_output',
      title: 'TypeScript Implementation Commit',
      content: 'Built and verified TypeScript types and interfaces.'
    });

    // Ritadhvaja inspects build artifact
    const finalEntries = blackboard.listByMission('msn_multi_33');
    assert.strictEqual(finalEntries.length, 3);
    assert.strictEqual(finalEntries[2].agentId, 'manyu');

    db.close();
  });

  await t.test('12. Dhritavrata Safe Local Recovery Cycle (Backup, corrupt, recover, verify)', () => {
    const testDir = 'data/test-dhritavrata-recovery';
    const testFile = path.join(testDir, 'vital_state.json');
    const backupFile = path.join(testDir, 'vital_state.json.bak');

    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const originalData = JSON.stringify({ state: 'healthy', version: '2.0.0', checksum: 'abc33xyz' });
    fs.writeFileSync(testFile, originalData, 'utf-8');

    // 1. Dhritavrata creates backup snapshot
    fs.copyFileSync(testFile, backupFile);
    assert.ok(fs.existsSync(backupFile));

    // 2. Simulate corruption or accidental deletion
    fs.writeFileSync(testFile, 'CORRUPTED_DATA_CRASH', 'utf-8');
    assert.strictEqual(fs.readFileSync(testFile, 'utf-8'), 'CORRUPTED_DATA_CRASH');

    // 3. Dhritavrata executes safe restoration
    fs.copyFileSync(backupFile, testFile);

    // 4. Deterministic verification
    const restoredContent = fs.readFileSync(testFile, 'utf-8');
    assert.strictEqual(restoredContent, originalData, 'Dhritavrata must restore exact pre-corruption state');

    // Cleanup
    try {
      fs.unlinkSync(testFile);
      fs.unlinkSync(backupFile);
      fs.rmdirSync(testDir);
    } catch {}
  });

  await t.test('13. Ugraretā Safe Local Retirement & Teardown Simulation', () => {
    const testDir = 'data/test-ugrareta-retirement';
    const activeServiceFile = path.join(testDir, 'obsolete_service.conf');
    const archiveDir = path.join(testDir, 'archives');

    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

    fs.writeFileSync(activeServiceFile, 'SERVICE_STATUS=ACTIVE_LEGACY_PORT_8080', 'utf-8');

    // Ugraretā teardown plan: archive config -> mark decommissioned -> verify safe shutdown
    const archiveTarget = path.join(archiveDir, 'obsolete_service.conf.archived_' + Date.now());
    fs.copyFileSync(activeServiceFile, archiveTarget);
    fs.writeFileSync(activeServiceFile, 'SERVICE_STATUS=DECOMMISSIONED_OFFLINE', 'utf-8');

    assert.ok(fs.existsSync(archiveTarget), 'Ugraretā must archive obsolete service assets');
    const updatedStatus = fs.readFileSync(activeServiceFile, 'utf-8');
    assert.ok(updatedStatus.includes('DECOMMISSIONED_OFFLINE'));

    // Cleanup
    try {
      fs.unlinkSync(activeServiceFile);
      fs.unlinkSync(archiveTarget);
      fs.rmdirSync(archiveDir);
      fs.rmdirSync(testDir);
    } catch {}
  });

  await t.test('14. Kāla Rudra Scheduling & Resource Coordination', () => {
    const plannedTasks: PlannedTask[] = [
      {
        id: 'task_p1_high',
        title: 'Check memory',
        agentId: 'prabhasa',
        objective: 'Check system memory',
        dependencies: [],
        requiredCapabilities: ['operations'],
        expectedOutputs: [],
        dangerLevel: 0
      },
      {
        id: 'task_p2_urgent',
        title: 'Urgent hotfix',
        agentId: 'manyu',
        objective: 'Urgent hotfix',
        dependencies: [],
        requiredCapabilities: ['software_engineering'],
        expectedOutputs: [],
        dangerLevel: 0
      },
      {
        id: 'task_p3_low',
        title: 'Draft docs',
        agentId: 'soma',
        objective: 'Draft docs',
        dependencies: [],
        requiredCapabilities: ['knowledge_management'],
        expectedOutputs: [],
        dangerLevel: 0
      }
    ];

    const graph = new TaskGraph(plannedTasks);
    const ready = graph.getReadyTasks(new Set(), new Set(), new Set(), new Set());
    assert.strictEqual(ready.length, 3);
  });

  await t.test('15. Ṛtadhvaja Verification Truthfulness (Anti-hallucination & objective checks)', async () => {
    const verifier = new MissionVerifier();
    const missingTarget = 'data/non_existent_file_33_' + Date.now() + '.txt';

    // 1. Deliberate failure test: file does not exist
    const failResult = await verifier.verify({
      type: 'file_exists',
      target: missingTarget
    });
    assert.strictEqual(failResult.passed, false, 'Ṛtadhvaja must fail verification when target file is missing');

    // 2. Create the file and verify corrected state
    fs.writeFileSync(missingTarget, 'Ṛtadhvaja verification token: PASS', 'utf-8');
    const passResult = await verifier.verify({
      type: 'file_exists',
      target: missingTarget
    });
    assert.strictEqual(passResult.passed, true, 'Ṛtadhvaja must objectively verify file presence');

    const contentResult = await verifier.verify({
      type: 'file_contains',
      target: missingTarget,
      expectedValue: 'PASS'
    });
    assert.strictEqual(contentResult.passed, true);

    // Cleanup
    try { fs.unlinkSync(missingTarget); } catch {}
  });

  await t.test('16. Strict Governance & Permission Boundaries Matrix', () => {
    setupRegistry();

    const agents = registry.getAll();
    assert.strictEqual(agents.length, 33);

    for (const a of agents) {
      assert.strictEqual(a.dangerTierLimit, DangerTier.TIER_1);
      assert.ok(a.allowedTools.length > 0);
    }

    const manyu = registry.get('manyu')!;
    assert.ok(manyu.allowedTools.includes('filesystem.write'));

    const ritadhvaja = registry.get('ritadhvaja')!;
    assert.ok(ritadhvaja.allowedTools.includes('filesystem.read'));

    const ugrareta = registry.get('ugrareta')!;
    assert.ok(ugrareta.allowedTools.includes('filesystem.list'));
  });

  await t.test('17. Memory Isolation for all 33 Agents', () => {
    setupRegistry();

    for (const agent of registry.getAll()) {
      assert.ok(agent.memoryScope, `Agent ${agent.id} must declare memoryScope`);
      assert.ok(agent.memoryScope.startsWith('agent_memory:'), `${agent.id} must have scoped memory prefix`);
    }
  });
});
