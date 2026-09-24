/**
 * HRSIKESA (हृषीकेश) — Mission Planner Unit Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER, GANDIVA, AJA, GARUDA, VIGHNA, RAHU } from '../src/agents/roster/initial.agents.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { MissionPlanner } from '../src/agents/planner/mission.planner.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { ModelResponse, ModelRequest, ChatRequest, ProviderHealth, ModelMetadata } from '../src/models/interfaces/model.types.js';

class MockPlannerProvider implements IModelProvider {
  public readonly id = 'ollama';
  public readonly displayName = 'Mock Planner Provider';
  public readonly isLocal = true;

  public async checkHealth(): Promise<ProviderHealth> {
    return { status: 'healthy', message: 'Ready', checkedAt: new Date().toISOString() };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return [{
      id: 'qwen2.5:7b',
      providerId: this.id,
      displayName: 'qwen2.5:7b',
      isLocal: true,
      contextWindow: 4096,
      capabilities: ['text-generation', 'chat', 'tools'],
      costClassification: 'free-local',
      availability: true,
      statusText: 'available',
      priority: 1
    }];
  }

  public async generate(req: ModelRequest): Promise<ModelResponse> {
    return { text: '{}', providerId: this.id, modelId: 'qwen2.5:7b', durationMs: 10, isLocal: true };
  }

  public async chat(req: ChatRequest): Promise<ModelResponse> {
    // Return structured JSON plan
    const samplePlanJson = JSON.stringify({
      objective: req.messages[1]?.content || 'Sample Objective',
      constraints: ['Read-only workspace inspection'],
      successCriteria: ['Summary report generated'],
      riskLevel: 'LOW',
      tasks: [
        {
          id: 'task_1',
          title: 'Inspect Workspace Structure',
          objective: 'Inspect project directory and files',
          agentId: 'garuda',
          dependencies: [],
          estimatedDangerTier: 0,
          verification: {
            type: 'blackboard_entry_present',
            target: 'workspace_summary'
          }
        },
        {
          id: 'task_2',
          title: 'Compile Analysis Report',
          objective: 'Synthesize findings into final brief',
          agentId: 'aja',
          dependencies: ['task_1'],
          estimatedDangerTier: 0
        }
      ]
    });

    return {
      text: `\`\`\`json\n${samplePlanJson}\n\`\`\``,
      providerId: this.id,
      modelId: 'qwen2.5:7b',
      durationMs: 15,
      isLocal: true
    };
  }
}

test('MissionPlanner Subsystem', async (t) => {
  const agentRegistry = new AgentRegistry();
  for (const agent of INITIAL_AGENT_ROSTER) {
    agentRegistry.register({ ...agent });
  }

  const modelRegistry = new ModelRegistry();
  await modelRegistry.registerProvider(new MockPlannerProvider());
  const modelRouter = new ModelRouter(modelRegistry);

  const planner = new MissionPlanner(agentRegistry, modelRouter);

  await t.test('decomposes objective into structured validated MissionPlan via LLM', async () => {
    const plan = await planner.createPlan({
      objective: 'Inspect the project workspace and produce a system report'
    });

    assert.ok(plan);
    assert.strictEqual(plan.tasks.length, 2);
    assert.strictEqual(plan.tasks[0].id, 'task_1');
    assert.strictEqual(plan.tasks[0].agentId, 'garuda');
    assert.strictEqual(plan.tasks[1].dependencies[0], 'task_1');
    assert.strictEqual(plan.riskLevel, 'low');
  });

  await t.test('falls back gracefully to deterministic archetype plan if model fails', async () => {
    // Model router with no providers to force fallback
    const emptyModelRegistry = new ModelRegistry();
    const emptyRouter = new ModelRouter(emptyModelRegistry);
    const fallbackPlanner = new MissionPlanner(agentRegistry, emptyRouter);

    const plan = await fallbackPlanner.createPlan({
      objective: 'Create a test file and verify content'
    });

    assert.ok(plan);
    assert.ok(plan.tasks.length >= 2);
    assert.ok(plan.tasks.some((t) => t.agentId === 'gandiva' || t.agentId === 'aja'));
  });

  await t.test('revises plan dynamically after task failure without wiping intact tasks', async () => {
    const initialPlan = await planner.createPlan({
      objective: 'Inspect and report'
    });

    const revised = await planner.revisePlan(
      initialPlan,
      'task_1',
      'Directory not found',
      ['Found partial workspace files']
    );

    assert.ok(revised);
    assert.strictEqual(revised.tasks.length, initialPlan.tasks.length);
    assert.ok(revised.tasks.some((t) => t.title.includes('Recovery')));
  });

  await t.test('validates plan bounds and agent capability assignments', () => {
    const valid = planner.validatePlan({
      objective: 'Valid objective',
      constraints: [],
      successCriteria: [],
      riskLevel: 'LOW',
      tasks: [
        { id: 'T1', title: 'T1', objective: 'T1', agentId: 'gandiva', dependencies: [], dangerLevel: 0, expectedOutputs: [], requiredCapabilities: [] }
      ]
    });
    assert.strictEqual(valid.valid, true);

    const invalidAgent = planner.validatePlan({
      objective: 'Invalid agent plan',
      constraints: [],
      successCriteria: [],
      riskLevel: 'LOW',
      tasks: [
        { id: 'T1', title: 'T1', objective: 'T1', agentId: 'non_existent_agent', dependencies: [], dangerLevel: 0, expectedOutputs: [], requiredCapabilities: [] }
      ]
    });
    assert.strictEqual(invalidAgent.valid, false);
    assert.ok(invalidAgent.errors.some((e) => e.includes('non_existent_agent')));
  });
});
