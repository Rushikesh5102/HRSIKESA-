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

  await t.test('should contain exactly the 17 authoritative workforce agents in initial roster', () => {
    setup();
    const agents = agentRegistry.getAll();
    assert.strictEqual(agents.length, 17);

    const agentIds = agents.map((a) => a.id).sort();
    assert.deepStrictEqual(agentIds, [
      'aja',
      'arvan',
      'gandiva',
      'garuda',
      'kaala',
      'kali',
      'kalki',
      'mrtyu',
      'rahu',
      'raudra',
      'ritvan',
      'rutam',
      'spoota',
      'taraka',
      'tvas',
      'vighna',
      'yama'
    ]);
  });

  await t.test('should verify key authoritative agents have designated role and danger limits', () => {
    setup();
    const gandiva = agentRegistry.get('gandiva')!;
    assert.strictEqual(gandiva.displayName, 'Gāṇḍīva');
    assert.strictEqual(gandiva.sanskritName, 'Gāṇḍīva (गाण्डीव)');
    assert.strictEqual(gandiva.role, 'software_engineering');
    assert.strictEqual(gandiva.dangerTierLimit, DangerTier.TIER_1);
    assert.ok(gandiva.capabilities.includes('software_engineering'));
    assert.ok(gandiva.capabilities.includes('coding'));

    const rahu = agentRegistry.get('rahu')!;
    assert.strictEqual(rahu.displayName, 'Rahu');
    assert.strictEqual(rahu.role, 'market_intelligence');
    assert.ok(rahu.capabilities.includes('market_research'));

    const aja = agentRegistry.get('aja')!;
    assert.strictEqual(aja.displayName, 'Aja');
    assert.strictEqual(aja.role, 'strategy_planning');
    assert.ok(aja.capabilities.includes('strategy'));

    const vighna = agentRegistry.get('vighna')!;
    assert.strictEqual(vighna.displayName, 'Vighna');
    assert.strictEqual(vighna.role, 'qa_verification');
    assert.ok(vighna.capabilities.includes('testing'));
    assert.ok(vighna.capabilities.includes('verification'));

    const yama = agentRegistry.get('yama')!;
    assert.strictEqual(yama.displayName, 'Yama');
    assert.strictEqual(yama.role, 'recovery_disaster');
    assert.ok(yama.capabilities.includes('recovery'));
    assert.ok(yama.capabilities.includes('rollback'));

    const mrtyu = agentRegistry.get('mrtyu')!;
    assert.strictEqual(mrtyu.displayName, 'Mṛtyu');
    assert.strictEqual(mrtyu.role, 'decommissioning_exit');
    assert.ok(mrtyu.capabilities.includes('retirement'));
    assert.ok(mrtyu.capabilities.includes('decommissioning'));

    const kaala = agentRegistry.get('kaala')!;
    assert.strictEqual(kaala.displayName, 'KĀLA');
    assert.strictEqual(kaala.role, 'resource_coordination');
    assert.ok(kaala.capabilities.includes('scheduling'));
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
          agentId: 'gandiva',
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
    assert.strictEqual(plan.tasks[0].agentId, 'garuda');
    assert.strictEqual(plan.tasks[0].deterministicToolAction?.tool, 'filesystem.read');
    assert.strictEqual(plan.tasks[0].verificationStrategy?.type, 'file_exists');
    assert.strictEqual(plan.tasks[0].verificationStrategy?.target, 'package.json');

    const validation = planner.validatePlan(plan);
    assert.strictEqual(validation.valid, true);
  });
});
