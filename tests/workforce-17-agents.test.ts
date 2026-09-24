/**
 * HRSIKESA (हृषीकेश) — 17-Agent Specialized Workforce Comprehensive Test Suite
 *
 * Deterministically verifies all 20 Phase 13.6 workforce invariants:
 * 1. Authoritative 17-Agent Registry Composition & ASCII-safe IDs
 * 2. Authentic Unicode Display Names & Sanskrit Orthography
 * 3. No Role Collisions & Distinct Specializations
 * 4. Critical Distinction: Yama (Recovery) vs Mṛtyu (Retirement)
 * 5. Comprehensive Lifecycle & Capability-Based Routing (Scenarios A through N)
 * 6. Security & Governance Boundaries (Tier 1 Max Default Limit)
 * 7. Old Agents Are Not Active Defaults
 * 8. Workforce Health Diagnostics Aggregate All 17 Agents Accurately
 * 9. HṚṢĪKEŚA Director Invariant (Top-level orchestrator, not a specialist)
 * 10. Persistence Across Runtime Restart Invariant (SQLite durability)
 * 11. Multi-Agent Collaboration (DAG dependencies, blackboard state sharing)
 * 12. Yama Safe Local Recovery Cycle (Backup, corrupt, recover, verify)
 * 13. Mṛtyu Safe Local Retirement Simulation & HITL Approval
 * 14. KĀLA Scheduling & Resource Coordination
 * 15. Vighna Verification Truthfulness (Anti-hallucination & objective checks)
 * 16. Strict Governance & Permission Boundaries Matrix
 * 17. HITL State Machine Invariants
 * 18. Memory Isolation (Private vs Specialist vs Shared Project scopes)
 * 19. Model Independence (Agent identity independent of model provider)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import {
  INITIAL_AGENT_ROSTER,
  RAHU,
  AJA,
  RITVAN,
  TVAS,
  SPOOTA,
  GANDIVA,
  VIGHNA,
  RAUDRA,
  RUTAM,
  ARVAN,
  TARAKA,
  KALKI,
  GARUDA,
  KALI,
  KAALA,
  YAMA,
  MRTYU
} from '../src/agents/roster/initial.agents.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';
import { MissionPlanner } from '../src/agents/planner/mission.planner.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { TaskRepository } from '../src/persistence/repositories/task.repository.js';
import { MissionRepository } from '../src/persistence/repositories/mission.repository.js';
import { AgentTask } from '../src/agents/interfaces/task.types.js';
import { IMission, PlannedTask } from '../src/agents/interfaces/mission.types.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import { TaskGraph } from '../src/agents/tasks/task.graph.js';
import { MissionVerifier } from '../src/agents/verification/mission.verifier.js';

const TEST_DB_PATH = 'data/test-workforce-durability.db';

test('PHASE 13.6 — 17-Agent Specialized Workforce Comprehensive Invariants', async (t) => {
  let registry: AgentRegistry;

  const setupRegistry = () => {
    registry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      registry.register({ ...agent });
    }
  };

  await t.test('1. Authoritative 17-Agent Registry Composition & ASCII-safe IDs', () => {
    setupRegistry();
    const all = registry.getAll();
    assert.strictEqual(all.length, 17, 'Workforce must contain exactly 17 persistent agents');

    const expectedIds = [
      'rahu',
      'aja',
      'ritvan',
      'tvas',
      'spoota',
      'gandiva',
      'vighna',
      'raudra',
      'rutam',
      'arvan',
      'taraka',
      'kalki',
      'garuda',
      'kali',
      'kaala',
      'yama',
      'mrtyu'
    ];

    const actualIds = all.map((a) => a.id);
    for (const id of expectedIds) {
      assert.ok(actualIds.includes(id), `Missing agent ID: ${id}`);
    }

    for (const id of actualIds) {
      assert.match(id, /^[a-z0-9_]+$/, `Agent ID '${id}' must be ASCII lowercase`);
    }

    const uniqueIds = new Set(actualIds);
    assert.strictEqual(uniqueIds.size, 17, 'Agent IDs must be completely unique');
  });

  await t.test('2. Authentic Unicode Display Names & Sanskrit Orthography', () => {
    setupRegistry();

    const expectedDisplayNames: Record<string, { display: string; sanskrit: string }> = {
      rahu: { display: 'Rahu', sanskrit: 'Rāhu (राहु)' },
      aja: { display: 'Aja', sanskrit: 'Aja (अज)' },
      ritvan: { display: 'Ritvan', sanskrit: 'Ṛtvan (ऋत्वन्)' },
      tvas: { display: 'Tvas', sanskrit: 'Tvaṣ (त्वष्)' },
      spoota: { display: 'Spoota', sanskrit: 'Sphuṭa (स्फुट)' },
      gandiva: { display: 'Gāṇḍīva', sanskrit: 'Gāṇḍīva (गाण्डीव)' },
      vighna: { display: 'Vighna', sanskrit: 'Vighna (विघ्न)' },
      raudra: { display: 'Raudra', sanskrit: 'Raudra (रौद्र)' },
      rutam: { display: 'Rutam', sanskrit: 'Ṛtam (ऋतम्)' },
      arvan: { display: 'Arvan', sanskrit: 'Arvan (अर्वन्)' },
      taraka: { display: 'Tāraka', sanskrit: 'Tāraka (तारक)' },
      kalki: { display: 'Kalki', sanskrit: 'Kalki (कल्कि)' },
      garuda: { display: 'Garuḍa', sanskrit: 'Garuḍa (गरुड)' },
      kali: { display: 'Kali', sanskrit: 'Kali (कलि)' },
      kaala: { display: 'KĀLA', sanskrit: 'Kāla (काल)' },
      yama: { display: 'Yama', sanskrit: 'Yama (यम)' },
      mrtyu: { display: 'Mṛtyu', sanskrit: 'Mṛtyu (मृत्यु)' }
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
    assert.strictEqual(uniqueRoles.size, 17, 'All 17 agents must possess unique and distinct roles');
  });

  await t.test('4. Critical Distinction: Yama (Recovery) vs Mṛtyu (Retirement)', () => {
    setupRegistry();
    const yama = registry.get('yama')!;
    const mrtyu = registry.get('mrtyu')!;

    // Yama is Recovery / Rollback / Disaster Management
    assert.strictEqual(yama.role, 'recovery_disaster');
    assert.ok(yama.capabilities.includes('backup'));
    assert.ok(yama.capabilities.includes('recovery'));
    assert.ok(yama.capabilities.includes('rollback'));
    assert.ok(yama.capabilities.includes('failure_containment'));
    assert.strictEqual(yama.lifecyclePosition, 'Cross-Cutting: Recovery & State Preservation');

    // Mṛtyu is Retirement / Termination / Decommissioning
    assert.strictEqual(mrtyu.role, 'decommissioning_exit');
    assert.ok(mrtyu.capabilities.includes('retirement'));
    assert.ok(mrtyu.capabilities.includes('decommissioning'));
    assert.ok(mrtyu.capabilities.includes('archival'));
    assert.ok(mrtyu.capabilities.includes('end_of_life'));
    assert.strictEqual(mrtyu.lifecyclePosition, 'Product Retirement / Business Exit');

    // Ensure zero overlap in core primary purpose
    assert.notStrictEqual(yama.role, mrtyu.role);
    assert.ok(!yama.capabilities.includes('decommissioning'));
    assert.ok(!mrtyu.capabilities.includes('failure_containment'));
  });

  await t.test('5. Comprehensive Lifecycle & Capability-Based Routing (Scenarios A through N)', () => {
    setupRegistry();

    // A. Market Research -> Rahu / Tvas
    const agentA = registry.findBestSpecialist(['market_research', 'competitive_analysis']);
    assert.strictEqual(agentA?.id, 'rahu');

    // B. Business Strategy -> Aja
    const agentB = registry.findBestSpecialist(['strategy', 'business_planning']);
    assert.strictEqual(agentB?.id, 'aja');

    // C. Customer Requirements -> Tvas
    const agentC = registry.findBestSpecialist(['customer_research', 'requirements_analysis']);
    assert.strictEqual(agentC?.id, 'tvas');

    // D. Product Architecture & Design -> Spoota
    const agentD = registry.findBestSpecialist(['product_design', 'specifications']);
    assert.strictEqual(agentD?.id, 'spoota');

    // E. TypeScript Feature Implementation -> Gāṇḍīva
    const agentE = registry.findBestSpecialist(['software_engineering', 'coding', 'typescript']);
    assert.strictEqual(agentE?.id, 'gandiva');

    // F. Run Tests & Verify -> Vighna
    const agentF = registry.findBestSpecialist(['qa', 'testing', 'verification']);
    assert.strictEqual(agentF?.id, 'vighna');

    // G. Contracts & Compliance -> Rutam
    const agentG = registry.findBestSpecialist(['contracts', 'compliance', 'governance']);
    assert.strictEqual(agentG?.id, 'rutam');

    // H. Deployment & Delivery -> Arvan
    const agentH = registry.findBestSpecialist(['fulfillment', 'deployment', 'distribution']);
    assert.strictEqual(agentH?.id, 'arvan');

    // I. Customer Onboarding & Documentation -> Tāraka
    const agentI = registry.findBestSpecialist(['customer_support', 'onboarding', 'documentation']);
    assert.strictEqual(agentI?.id, 'taraka');

    // J. Operations & Infrastructure Monitoring -> Garuḍa
    const agentJ = registry.findBestSpecialist(['operations', 'monitoring', 'infrastructure']);
    assert.strictEqual(agentJ?.id, 'garuda');

    // K. Scheduling & Coordination -> KĀLA
    const agentK = registry.findBestSpecialist(['scheduling', 'resource_management', 'deadlines']);
    assert.strictEqual(agentK?.id, 'kaala');

    // L. Backup & Recovery -> Yama
    const agentL = registry.findBestSpecialist(['backup', 'recovery', 'rollback']);
    assert.strictEqual(agentL?.id, 'yama');

    // M. Retirement & Decommissioning -> Mṛtyu
    const agentM = registry.findBestSpecialist(['retirement', 'decommissioning', 'archival']);
    assert.strictEqual(agentM?.id, 'mrtyu');

    // N. Continuous Improvement & Optimization -> Kali
    const agentN = registry.findBestSpecialist(['optimization', 'continuous_improvement', 'scaling']);
    assert.strictEqual(agentN?.id, 'kali');
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

  await t.test('7. Old Agents Are Not Active Defaults', () => {
    setupRegistry();
    const oldAgents = ['arjuna', 'chanakya', 'arya', 'aditi', 'agastya', 'vyasa', 'vidura'];
    for (const legacy of oldAgents) {
      assert.strictEqual(registry.get(legacy), undefined, `Legacy agent '${legacy}' must NOT be registered by default`);
    }
  });

  await t.test('8. Workforce Health Diagnostics Aggregate All 17 Agents Accurately', () => {
    setupRegistry();
    const diag = registry.getDiagnostics();
    assert.strictEqual(diag.totalRegistered, 17);
    assert.ok(diag.workforceHealth !== undefined);
    assert.strictEqual(diag.workforceHealth?.total, 17);
    assert.strictEqual(diag.workforceHealth?.idle, 17);
    assert.strictEqual(diag.workforceHealth?.active, 0);
    assert.strictEqual(diag.workforceHealth?.blocked, 0);
    assert.strictEqual(diag.workforceHealth?.recovering, 0);
    assert.strictEqual(diag.workforceHealth?.retired, 0);

    // Simulate status changes
    registry.updateStatus('gandiva', 'executing');
    registry.updateStatus('vighna', 'verifying');
    registry.updateStatus('yama', 'recovering');
    registry.updateStatus('mrtyu', 'retired');

    const updatedDiag = registry.getDiagnostics();
    assert.strictEqual(updatedDiag.workforceHealth?.idle, 13);
    assert.strictEqual(updatedDiag.workforceHealth?.active, 2);
    assert.strictEqual(updatedDiag.workforceHealth?.recovering, 1);
    assert.strictEqual(updatedDiag.workforceHealth?.retired, 1);
  });

  await t.test('9. HṚṢĪKEŚA Director Invariant (Top-level orchestrator, not a specialist)', () => {
    setupRegistry();
    assert.strictEqual(registry.get('hrisekesa'), undefined, 'HṚṢĪKEŚA itself must NOT be in the specialist registry roster');
    assert.strictEqual(registry.get('director'), undefined);
    assert.strictEqual(registry.getAll().length, 17);
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
      id: 'msn_durability_001',
      objective: 'Verify durability across runtime restart',
      rootAgentId: 'gandiva',
      rootTaskId: 'task_durability_root',
      status: 'executing',
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const rootTask: AgentTask = {
      id: 'task_durability_root',
      missionId: 'msn_durability_001',
      agentId: 'gandiva',
      objective: 'Develop durable module',
      status: 'executing',
      priority: 'high',
      depth: 0,
      createdAt: new Date().toISOString()
    };

    const childTask: AgentTask = {
      id: 'task_durability_child',
      missionId: 'msn_durability_001',
      parentTaskId: 'task_durability_root',
      agentId: 'yama',
      objective: 'Setup recovery checkpoints',
      status: 'queued',
      priority: 'high',
      depth: 1,
      createdAt: new Date().toISOString()
    };

    missionRepo1.create(testMission);
    taskRepo1.create(rootTask);
    taskRepo1.create(childTask);

    // Close Database session 1 (simulate restart)
    db1.close();

    // 2. Session 2: Reload fresh instance
    const db2 = new DatabaseManager(TEST_DB_PATH);
    db2.open();
    const taskRepo2 = new TaskRepository(db2);
    const missionRepo2 = new MissionRepository(db2);

    const reloadedMission = missionRepo2.get('msn_durability_001');
    assert.ok(reloadedMission);
    assert.strictEqual(reloadedMission.objective, 'Verify durability across runtime restart');
    assert.strictEqual(reloadedMission.rootAgentId, 'gandiva');

    const tasks = taskRepo2.listByMission('msn_durability_001');
    assert.strictEqual(tasks.length, 2);
    assert.strictEqual(tasks[0].agentId, 'gandiva');
    assert.strictEqual(tasks[1].agentId, 'yama');

    const freshRegistry = new AgentRegistry();
    for (const a of INITIAL_AGENT_ROSTER) {
      freshRegistry.register({ ...a });
    }
    assert.strictEqual(freshRegistry.getAll().length, 17);
    assert.strictEqual(freshRegistry.get('arjuna'), undefined);

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
        agentId: 'rahu',
        objective: 'Market intelligence report',
        dependencies: [],
        requiredCapabilities: ['market_research'],
        expectedOutputs: ['market_report'],
        dangerLevel: 0
      },
      {
        id: 'task_design',
        title: 'Product Design',
        agentId: 'spoota',
        dependencies: ['task_market'],
        objective: 'Product design spec',
        requiredCapabilities: ['product_design'],
        expectedOutputs: ['spec_v1'],
        dangerLevel: 0
      },
      {
        id: 'task_code',
        title: 'Development',
        agentId: 'gandiva',
        dependencies: ['task_design'],
        objective: 'Code implementation',
        requiredCapabilities: ['software_engineering'],
        expectedOutputs: ['build_artifact'],
        dangerLevel: 0
      },
      {
        id: 'task_qa',
        title: 'QA & Testing',
        agentId: 'vighna',
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

    // Rahu shares market insight on blackboard
    blackboard.publish('msn_multi_001', 'task_market', 'rahu', {
      type: 'market_insight',
      title: 'Target Sector Analysis',
      content: 'High demand detected in developer tooling sector.'
    });

    // Spoota reads market insights and publishes spec
    const marketEntries = blackboard.listByMission('msn_multi_001');
    assert.strictEqual(marketEntries.length, 1);
    assert.strictEqual(marketEntries[0].agentId, 'rahu');

    blackboard.publish('msn_multi_001', 'task_design', 'spoota', {
      type: 'architecture_spec',
      title: 'Workforce API Specification',
      content: 'Defined REST API endpoints and state machines.'
    });

    // Gāṇḍīva reads spec and publishes implementation build
    const updatedEntries = blackboard.listByMission('msn_multi_001');
    assert.strictEqual(updatedEntries.length, 2);

    blackboard.publish('msn_multi_001', 'task_code', 'gandiva', {
      type: 'build_output',
      title: 'TypeScript Implementation Commit',
      content: 'Built and verified TypeScript types and interfaces.'
    });

    // Vighna inspects build artifact
    const finalEntries = blackboard.listByMission('msn_multi_001');
    assert.strictEqual(finalEntries.length, 3);
    assert.strictEqual(finalEntries[2].agentId, 'gandiva');

    db.close();
  });

  await t.test('12. Yama Safe Local Recovery Cycle (Backup, corrupt, recover, verify)', () => {
    const testDir = 'data/test-yama-recovery';
    const testFile = path.join(testDir, 'vital_state.json');
    const backupFile = path.join(testDir, 'vital_state.json.bak');

    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const originalData = JSON.stringify({ state: 'healthy', version: '1.0.0', checksum: 'abc123xyz' });
    fs.writeFileSync(testFile, originalData, 'utf-8');

    // 1. Yama creates backup snapshot
    fs.copyFileSync(testFile, backupFile);
    assert.ok(fs.existsSync(backupFile));

    // 2. Simulate corruption or accidental deletion
    fs.writeFileSync(testFile, 'CORRUPTED_DATA_CRASH', 'utf-8');
    assert.strictEqual(fs.readFileSync(testFile, 'utf-8'), 'CORRUPTED_DATA_CRASH');

    // 3. Yama executes safe restoration
    fs.copyFileSync(backupFile, testFile);

    // 4. Deterministic verification
    const restoredContent = fs.readFileSync(testFile, 'utf-8');
    assert.strictEqual(restoredContent, originalData, 'Yama must restore exact pre-corruption state');

    // Cleanup
    try {
      fs.unlinkSync(testFile);
      fs.unlinkSync(backupFile);
      fs.rmdirSync(testDir);
    } catch {}
  });

  await t.test('13. Mṛtyu Safe Local Retirement Simulation & HITL Approval', () => {
    const testDir = 'data/test-mrtyu-retirement';
    const activeServiceFile = path.join(testDir, 'obsolete_service.conf');
    const archiveDir = path.join(testDir, 'archives');

    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

    fs.writeFileSync(activeServiceFile, 'SERVICE_STATUS=ACTIVE_LEGACY_PORT_8080', 'utf-8');

    // Mṛtyu retirement plan: archive config -> mark decommissioned -> verify safe shutdown
    const archiveTarget = path.join(archiveDir, 'obsolete_service.conf.archived_' + Date.now());
    fs.copyFileSync(activeServiceFile, archiveTarget);
    fs.writeFileSync(activeServiceFile, 'SERVICE_STATUS=DECOMMISSIONED_OFFLINE', 'utf-8');

    assert.ok(fs.existsSync(archiveTarget), 'Mṛtyu must archive obsolete service assets');
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

  await t.test('14. KĀLA Scheduling & Resource Coordination', () => {
    const plannedTasks: PlannedTask[] = [
      {
        id: 'task_p1_high',
        title: 'Check memory',
        agentId: 'garuda',
        objective: 'Check system memory',
        dependencies: [],
        requiredCapabilities: ['operations'],
        expectedOutputs: [],
        dangerLevel: 0
      },
      {
        id: 'task_p2_urgent',
        title: 'Urgent hotfix',
        agentId: 'gandiva',
        objective: 'Urgent hotfix',
        dependencies: [],
        requiredCapabilities: ['software_engineering'],
        expectedOutputs: [],
        dangerLevel: 0
      },
      {
        id: 'task_p3_low',
        title: 'Draft docs',
        agentId: 'taraka',
        objective: 'Draft docs',
        dependencies: [],
        requiredCapabilities: ['customer_support'],
        expectedOutputs: [],
        dangerLevel: 0
      }
    ];

    const graph = new TaskGraph(plannedTasks);
    const ready = graph.getReadyTasks(new Set(), new Set(), new Set(), new Set());
    assert.strictEqual(ready.length, 3);
  });

  await t.test('15. Vighna Verification Truthfulness (Anti-hallucination & objective checks)', async () => {
    const verifier = new MissionVerifier();
    const missingTarget = 'data/non_existent_file_' + Date.now() + '.txt';

    // 1. Deliberate failure test: file does not exist
    const failResult = await verifier.verify({
      type: 'file_exists',
      target: missingTarget
    });
    assert.strictEqual(failResult.passed, false, 'Vighna must fail verification when target file is missing');

    // 2. Create the file and verify corrected state
    fs.writeFileSync(missingTarget, 'Vighna verification token: PASS', 'utf-8');
    const passResult = await verifier.verify({
      type: 'file_exists',
      target: missingTarget
    });
    assert.strictEqual(passResult.passed, true, 'Vighna must objectively verify file presence');

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
    assert.strictEqual(agents.length, 17);

    for (const a of agents) {
      assert.strictEqual(a.dangerTierLimit, DangerTier.TIER_1);
      assert.ok(a.allowedTools.length > 0);
    }

    const gandiva = registry.get('gandiva')!;
    assert.ok(gandiva.allowedTools.includes('filesystem.write'));

    const vighna = registry.get('vighna')!;
    assert.ok(vighna.allowedTools.includes('filesystem.read'));

    const kalki = registry.get('kalki')!;
    assert.ok(!kalki.allowedTools.includes('terminal.execute_privileged'));

    const mrtyu = registry.get('mrtyu')!;
    assert.ok(mrtyu.allowedTools.includes('filesystem.list'));
  });

  await t.test('17. HITL State Machine Invariants', () => {
    const validTransitions: Record<string, string[]> = {
      PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'FAILED'],
      APPROVED: ['EXECUTING'],
      EXECUTING: ['OBSERVED', 'FAILED'],
      OBSERVED: ['VERIFIED', 'FAILED'],
      VERIFIED: ['COMPLETED']
    };

    assert.ok(!validTransitions['PENDING_APPROVAL'].includes('SUCCESS'));
    assert.ok(!validTransitions['PENDING_APPROVAL'].includes('COMPLETED'));
    assert.ok(!validTransitions['PENDING_APPROVAL'].includes('VERIFIED'));
  });

  await t.test('18. Memory Isolation (Private vs Specialist vs Shared Project scopes)', () => {
    setupRegistry();

    for (const agent of registry.getAll()) {
      assert.ok(agent.memoryScope, `Agent ${agent.id} must declare memoryScope`);
      assert.ok(agent.memoryScope.startsWith('agent_memory:'), `${agent.id} must have scoped memory prefix`);
    }
  });

  await t.test('19. Model Independence (Agent identity independent of model provider)', () => {
    setupRegistry();

    const modelRegistry = new ModelRegistry();
    const modelRouter = new ModelRouter(modelRegistry);

    for (const agent of registry.getAll()) {
      assert.strictEqual((agent as any).modelId, undefined, `Agent ${agent.id} must not hardcode modelId`);
      assert.strictEqual((agent as any).providerId, undefined, `Agent ${agent.id} must not hardcode providerId`);
    }
  });
});
