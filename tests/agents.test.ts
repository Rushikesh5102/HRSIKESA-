/**
 * HRSIKESA - Agents Subsystem Tests
 * Verifies AgentRegistry, INITIAL_AGENT_ROSTER, and agent validation for the 17-agent workforce.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER, GANDIVA, AJA, RAHU, VIGHNA } from '../src/agents/roster/initial.agents.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';

test('Agent Registry Subsystem', async (t) => {
  await t.test('should validate and register all 17 initial agents', () => {
    const registry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      registry.register({ ...agent });
    }

    const all = registry.getAll();
    assert.equal(all.length, 17);

    const ids = all.map(a => a.id).sort();
    assert.deepEqual(ids, [
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

  await t.test('all initial agents must have dangerTierLimit TIER_1 and scoped allowedTools', () => {
    const registry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      registry.register({ ...agent });
    }

    for (const agent of registry.getAll()) {
      assert.equal(agent.dangerTierLimit, DangerTier.TIER_1, `Agent ${agent.id} must be limited to TIER_1`);
      assert.ok(agent.allowedTools.length > 0, `Agent ${agent.id} must have allowedTools defined`);
      assert.ok(agent.systemPrompt.length > 20, `Agent ${agent.id} must have a non-empty systemPrompt`);
      assert.ok(agent.capabilities.length > 0, `Agent ${agent.id} must declare capabilities`);
      assert.ok(agent.responsibilities && agent.responsibilities.length > 0, `Agent ${agent.id} must declare responsibilities`);
      assert.ok(agent.sanskritName, `Agent ${agent.id} must have a sanskritName`);
    }
  });

  await t.test('should reject duplicate agent registration', () => {
    const registry = new AgentRegistry();
    registry.register({ ...GANDIVA });

    assert.throws(() => {
      registry.register({ ...GANDIVA });
    }, /already registered/);
  });

  await t.test('should reject invalid agent schema', () => {
    const registry = new AgentRegistry();

    assert.throws(() => {
      registry.register({
        id: 'INVALID_ID_UPPER',
        name: 'test',
        displayName: 'Test',
        role: 'tester',
        description: 'test',
        systemPrompt: 'test',
        capabilities: ['test'],
        allowedTools: ['time.now'],
        dangerTierLimit: DangerTier.TIER_0,
        memoryScope: 'agent_memory',
        modelPreference: { preferLocal: true },
        status: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }, /Invalid agent ID/);
  });

  await t.test('should find agents by role and capability', () => {
    const registry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      registry.register({ ...agent });
    }

    const coders = registry.findByRole('software_engineering');
    assert.equal(coders.length, 1);
    assert.equal(coders[0].id, 'gandiva');

    const marketIntelligence = registry.findByCapability('market_research');
    assert.equal(marketIntelligence.length, 1);
    assert.equal(marketIntelligence[0].id, 'rahu');
  });

  await t.test('should update agent status and reflect in diagnostics', () => {
    const registry = new AgentRegistry();
    registry.register({ ...GANDIVA });

    assert.equal(registry.get('gandiva')?.status, 'idle');
    registry.updateStatus('gandiva', 'working');
    assert.equal(registry.get('gandiva')?.status, 'working');

    const diag = registry.getDiagnostics();
    assert.equal(diag.totalRegistered, 1);
    assert.equal(diag.byStatus.working, 1);
    assert.equal(diag.byStatus.idle, 0);
  });
});
