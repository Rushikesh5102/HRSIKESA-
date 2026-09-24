/**
 * HRSIKESA (हृषीकेश) — Autonomous Mission Engine & Execution Loop Integration Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { TaskRepository } from '../src/persistence/repositories/task.repository.js';
import { MissionRepository } from '../src/persistence/repositories/mission.repository.js';
import { ArtifactRepository } from '../src/persistence/repositories/artifact.repository.js';
import { MemoryRepository } from '../src/persistence/repositories/memory.repository.js';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER } from '../src/agents/roster/initial.agents.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import { AgentDelegationManager } from '../src/agents/delegation/delegation.manager.js';
import { AgentRuntime } from '../src/agents/runtime/agent.runtime.js';
import { MissionOrchestrator } from '../src/agents/mission/mission.orchestrator.js';
import { MissionPlanner } from '../src/agents/planner/mission.planner.js';
import { MissionVerifier } from '../src/agents/verification/mission.verifier.js';
import { RecoveryManager } from '../src/agents/recovery/recovery.manager.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { ModelResponse, ModelRequest, ChatRequest, ProviderHealth, ModelMetadata } from '../src/models/interfaces/model.types.js';
import { FileListTool } from '../src/tools/builtin/filesystem.list.js';
import { FileWriteTool } from '../src/tools/builtin/filesystem.write.js';
import { FileReadTool } from '../src/tools/builtin/filesystem.read.js';

const TEST_DB_PATH = 'data/test-mission-loop.db';

class MockLoopModelProvider implements IModelProvider {
  public readonly id = 'ollama';
  public readonly displayName = 'Mock Loop Provider';
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
    const isPlanning = req.messages.some(m => m.content.includes('strategic mission planner') || m.content.includes('JSON SCHEMA') || m.content.includes('Generate the structured JSON mission plan'));

    // If planning request, return structured plan JSON
    if (isPlanning) {
      const planJson = JSON.stringify({
        objective: 'Test Multi-Agent Mission',
        constraints: [],
        successCriteria: ['Completed'],
        riskLevel: 'LOW',
        tasks: [
          {
            id: 'task_1',
            title: 'List Files',
            objective: 'List files in workspace',
            agentId: 'garuda',
            dependencies: [],
            estimatedDangerTier: 0,
            verification: {
              type: 'command_exit_code',
              expected: 0
            }
          },
          {
            id: 'task_2',
            title: 'Synthesize Findings',
            objective: 'Synthesize findings into final summary',
            agentId: 'aja',
            dependencies: ['task_1'],
            estimatedDangerTier: 0
          }
        ]
      });
      return {
        text: `\`\`\`json\n${planJson}\n\`\`\``,
        providerId: this.id,
        modelId: 'qwen2.5:7b',
        durationMs: 10,
        isLocal: true
      };
    }

    // Default agent execution response
    return {
      text: 'Task objective accomplished. Findings: Workspace has been examined and verified.',
      providerId: this.id,
      modelId: 'qwen2.5:7b',
      durationMs: 10,
      isLocal: true,
      toolCalls: []
    };
  }
}

test('Autonomous Mission Engine Integration', async (t) => {
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

  const taskRepo = new TaskRepository(db);
  const missionRepo = new MissionRepository(db);
  const artifactRepo = new ArtifactRepository(db);
  const memoryRepo = new MemoryRepository(db);
  const eventBus = new EventBus();

  const agentRegistry = new AgentRegistry();
  for (const agent of INITIAL_AGENT_ROSTER) {
    agentRegistry.register({ ...agent });
  }

  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new FileListTool());
  toolRegistry.register(new FileWriteTool());
  toolRegistry.register(new FileReadTool());

  const auditManager = new ToolAuditManager();
  const permissionManager = new PermissionManager();
  const toolBus = new ToolExecutionBus(toolRegistry, permissionManager, auditManager);

  const modelRegistry = new ModelRegistry();
  await modelRegistry.registerProvider(new MockLoopModelProvider());
  const modelRouter = new ModelRouter(modelRegistry);

  const blackboard = new AgentBlackboard(db);
  const delegationManager = new AgentDelegationManager(agentRegistry, taskRepo);
  const agentRuntime = new AgentRuntime(agentRegistry, toolRegistry, toolBus, modelRouter, eventBus);

  const verifier = new MissionVerifier(blackboard);
  const recovery = new RecoveryManager(3);
  const planner = new MissionPlanner(agentRegistry, modelRouter);

  const orchestrator = new MissionOrchestrator(
    agentRegistry,
    agentRuntime,
    delegationManager,
    blackboard,
    taskRepo,
    missionRepo,
    eventBus,
    undefined,
    artifactRepo,
    planner,
    verifier,
    recovery,
    memoryRepo
  );

  t.after(() => {
    db.close();
    cleanup();
  });

  await t.test('executes complete autonomous mission DAG: plan -> assign -> execute -> verify -> report -> memory', async () => {
    // 1. Plan & create mission
    const mission = await orchestrator.planAndCreateMission({
      objective: 'Inspect project structure and synthesize findings'
    });

    assert.ok(mission.id);
    assert.strictEqual(mission.status, 'ready');
    assert.ok(mission.plan);
    assert.strictEqual(mission.plan.tasks.length, 2);

    // 2. Execute mission
    const result = await orchestrator.executeMission(mission.id);

    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.taskCount, 2);
    assert.ok(result.summary);
    assert.ok(result.report);
    assert.strictEqual(result.report.tasks.completed, 2);
    assert.strictEqual(result.report.tasks.failed, 0);

    // 3. Verify mission was stored in repository
    const storedMission = missionRepo.get(mission.id);
    assert.ok(storedMission);
    assert.strictEqual(storedMission.status, 'completed');

    // 4. Verify durable memory item was persisted
    const memItem = memoryRepo.retrieve('project_memory', `mission_${mission.id}_outcome`);
    assert.ok(memItem);
    assert.strictEqual(memItem.tier, 'project_memory');
    assert.ok(memItem.content.includes('Completed Mission'));
  });

  await t.test('safely cancels an in-flight mission and transitions status to cancelled', async () => {
    const mission = await orchestrator.planAndCreateMission({
      objective: 'Long running task to cancel'
    });

    const cancelled = await orchestrator.cancelMission(mission.id, 'User requested cancel');
    assert.strictEqual(cancelled.status, 'cancelled');

    const stored = missionRepo.get(mission.id);
    assert.strictEqual(stored?.status, 'cancelled');
  });

  await t.test('handles human-in-the-loop blocking and resumption', async () => {
    const mission = await orchestrator.planAndCreateMission({
      objective: 'Test HITL Blocking and Resume'
    });

    // Manually simulate a task blocking on security
    const tasks = taskRepo.listByMission(mission.id);
    assert.ok(tasks.length > 0);

    // Update mission to blocked with intervention request
    missionRepo.update(mission.id, {
      status: 'blocked',
      blockedReason: 'Requires human confirmation for deployment',
      interventionRequest: {
        id: 'int_12345',
        missionId: mission.id,
        taskId: tasks[0].id,
        reason: 'Please approve deployment step',
        resolved: false,
        requestedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    const blockedMission = missionRepo.get(mission.id);
    assert.strictEqual(blockedMission?.status, 'blocked');
    assert.ok(blockedMission?.interventionRequest);

    // Resume mission
    const resumedResult = await orchestrator.resumeMission(mission.id, 'Approved by admin');
    assert.ok(resumedResult);
    assert.strictEqual(resumedResult.status, 'completed');
  });
});
