/**
 * HRSIKESA (हृषीकेश) — Agent Registry Integrity & Dynamic Roster Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER } from '../src/agents/roster/initial.agents.js';
import { MissionPlanner } from '../src/agents/planner/mission.planner.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';

test('Phase 13.6 — Agent Registry Integrity', async (t) => {
  let agentRegistry: AgentRegistry;
  let modelRegistry: ModelRegistry;
  let modelRouter: ModelRouter;
  let planner: MissionPlanner;

  const setup = () => {
    agentRegistry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      agentRegistry.register(agent);
    }
    modelRegistry = new ModelRegistry();
    modelRouter = new ModelRouter(modelRegistry);
    planner = new MissionPlanner(agentRegistry, modelRouter);
  };

  await t.test('should contain exactly the 33 authoritative canonical workforce agents in initial roster', () => {
    setup();
    const agents = agentRegistry.getAll();
    assert.strictEqual(agents.length, 33);

    const agentIds = agents.map((a) => a.id).sort();
    assert.deepStrictEqual(agentIds, [
      'amsa',
      'anala',
      'anila',
      'apa',
      'aryaman',
      'bhaga',
      'bhava',
      'dhara',
      'dhata',
      'dhritavrata',
      'dhruva',
      'indra',
      'kala_rudra',
      'mahan',
      'mahinasa',
      'manu',
      'manyu',
      'mitra',
      'parjanya',
      'prabhasa',
      'prajapati',
      'pratyusa',
      'pusa',
      'ritadhvaja',
      'savita',
      'siva',
      'soma',
      'tvasta',
      'ugrareta',
      'vamadeva',
      'varuna',
      'visnu',
      'vivasvan'
    ]);
  });

  await t.test('should verify key authoritative agents have designated role and danger limits', () => {
    setup();
    const manyu = agentRegistry.get('manyu')!;
    assert.strictEqual(manyu.displayName, 'Manyu');
    assert.strictEqual(manyu.sanskritName, 'Manyu (मन्यु)');
    assert.strictEqual(manyu.role, 'software_engineering');
    assert.strictEqual(manyu.dangerTierLimit, DangerTier.TIER_1);
    assert.ok(manyu.capabilities.includes('software_engineering'));
    assert.ok(manyu.capabilities.includes('coding'));

    const indra = agentRegistry.get('indra')!;
    assert.strictEqual(indra.displayName, 'Indra');
    assert.strictEqual(indra.role, 'mission_field_command');
    assert.ok(indra.capabilities.includes('mission_orchestration'));

    const prajapati = agentRegistry.get('prajapati')!;
    assert.strictEqual(prajapati.displayName, 'Prajāpati');
    assert.strictEqual(prajapati.role, 'workforce_progenitor');
    assert.ok(prajapati.capabilities.includes('agent_spawning'));

    const dhata = agentRegistry.get('dhata')!;
    assert.strictEqual(dhata.displayName, 'Dhātā');
    assert.strictEqual(dhata.role, 'strategy_architecture');
    assert.ok(dhata.capabilities.includes('strategy'));

    const ritadhvaja = agentRegistry.get('ritadhvaja')!;
    assert.strictEqual(ritadhvaja.displayName, 'Ṛtadhvaja');
    assert.strictEqual(ritadhvaja.role, 'qa_verification');
    assert.ok(ritadhvaja.capabilities.includes('testing'));
    assert.ok(ritadhvaja.capabilities.includes('verification'));

    const varuna = agentRegistry.get('varuna')!;
    assert.strictEqual(varuna.displayName, 'Varuṇa');
    assert.strictEqual(varuna.role, 'governance_compliance');
    assert.ok(varuna.capabilities.includes('compliance'));

    const siva = agentRegistry.get('siva')!;
    assert.strictEqual(siva.displayName, 'Śiva');
    assert.strictEqual(siva.role, 'integrity_verification');
    assert.ok(siva.capabilities.includes('defect_elimination'));
  });

  await t.test('should not contain duplicate agent IDs', () => {
    setup();
    const agents = agentRegistry.getAll();
    const uniqueIds = new Set(agents.map((a) => a.id));
    assert.strictEqual(uniqueIds.size, agents.length);
  });

  await t.test('should validate plans against real AgentRegistry and reject invalid agent IDs', () => {
    setup();
    const validPlan = {
      objective: 'Inspect workspace',
      constraints: [],
      successCriteria: ['Done'],
      riskLevel: 'low' as const,
      estimatedModelCalls: 1,
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: 'task_1',
          title: 'Code review',
          objective: 'Inspect typescript code',
          agentId: 'manyu',
          dependencies: [],
          requiredCapabilities: ['coding'],
          expectedOutputs: ['Report'],
          dangerLevel: 0
        }
      ]
    };

    const validResult = planner.validatePlan(validPlan);
    assert.strictEqual(validResult.valid, true);

    const invalidPlan = {
      ...validPlan,
      tasks: [
        {
          ...validPlan.tasks[0],
          agentId: 'phantom_agent_id'
        }
      ]
    };

    const invalidResult = planner.validatePlan(invalidPlan);
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.errors[0].includes("non-existent agent 'phantom_agent_id'"));
  });

  await t.test('should classify mission complexity deterministically', () => {
    setup();
    assert.strictEqual(planner.classifyComplexity('Check whether package.json exists in the HṚṢĪKEŚA workspace.'), 'SIMPLE');
    assert.strictEqual(planner.classifyComplexity("Create data/test.txt containing 'Hello World'"), 'SIMPLE');
    assert.strictEqual(planner.classifyComplexity('Inspect the workspace and report project structure'), 'STANDARD');
    assert.strictEqual(planner.classifyComplexity('Refactor the architecture and redesign the pipeline'), 'COMPLEX');
  });

  await t.test('should generate instant deterministic simple plan with 0 estimated model calls', () => {
    setup();
    const registered = agentRegistry.getAll();
    const plan = planner.generateSimplePlan({
      objective: 'Check whether package.json exists in the HṚṢĪKEŚA workspace.'
    }, registered);

    assert.strictEqual(plan.tasks.length, 1);
    assert.strictEqual(plan.estimatedModelCalls, 0);
    assert.strictEqual(plan.tasks[0].agentId, 'prabhasa');
    assert.strictEqual(plan.tasks[0].deterministicToolAction?.tool, 'filesystem.read');
    assert.strictEqual(plan.tasks[0].verificationStrategy?.type, 'file_exists');
    assert.strictEqual(plan.tasks[0].verificationStrategy?.target, 'package.json');

    const validation = planner.validatePlan(plan);
    assert.strictEqual(validation.valid, true);
  });
});
