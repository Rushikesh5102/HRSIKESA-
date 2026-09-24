/**
 * HRSIKESA - Mission Orchestrator Tests
 * Verifies mission lifecycle, root task execution, blackboard findings aggregation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { TaskRepository } from '../src/persistence/repositories/task.repository.js';
import { MissionRepository } from '../src/persistence/repositories/mission.repository.js';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { AJA, RAHU } from '../src/agents/roster/initial.agents.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import { AgentDelegationManager } from '../src/agents/delegation/delegation.manager.js';
import { AgentRuntime } from '../src/agents/runtime/agent.runtime.js';
import { MissionOrchestrator } from '../src/agents/mission/mission.orchestrator.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { ModelResponse, ModelRequest, ChatRequest, ProviderHealth, ModelMetadata } from '../src/models/interfaces/model.types.js';
import { FileListTool } from '../src/tools/builtin/filesystem.list.js';
import fs from 'node:fs';

const TEST_DB_PATH = 'data/test-mission-orchestrator.db';

class MockMissionModelProvider implements IModelProvider {
  public readonly id = 'ollama';
  public readonly displayName = 'Mock Ollama Provider';
  public readonly isLocal = true;

  private responses: ModelResponse[] = [];

  public queueResponse(response: ModelResponse): void {
    this.responses.push(response);
  }

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

  public async generate(request: ModelRequest): Promise<ModelResponse> {
    return {
      text: 'mock generation',
      providerId: this.id,
      modelId: 'qwen2.5:7b',
      durationMs: 10,
      isLocal: true
    };
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    const next = this.responses.shift();
    if (next) return next;
    return {
      text: 'Mission analysis complete. Workspace structure is valid.',
      providerId: this.id,
      modelId: 'qwen2.5:7b',
      durationMs: 10,
      isLocal: true,
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    };
  }
}

test('Mission Orchestrator Subsystem', async (t) => {
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

  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new FileListTool());

  const permissionManager = new PermissionManager({
    allowedWorkspaceRoots: [process.cwd()]
  });
  const toolAudit = new ToolAuditManager(db);
  const toolBus = new ToolExecutionBus(toolRegistry, permissionManager, toolAudit);

  const modelRegistry = new ModelRegistry();
  const mockProvider = new MockMissionModelProvider();
  await modelRegistry.registerProvider(mockProvider);
  const modelRouter = new ModelRouter(modelRegistry);

  const agentRegistry = new AgentRegistry();
  agentRegistry.register({ ...AJA });
  agentRegistry.register({ ...RAHU });

  const taskRepo = new TaskRepository(db);
  const missionRepo = new MissionRepository(db);
  const blackboard = new AgentBlackboard(db);
  const delegationManager = new AgentDelegationManager();

  const agentRuntime = new AgentRuntime(agentRegistry, toolRegistry, toolBus, modelRouter);
  const orchestrator = new MissionOrchestrator(
    agentRegistry,
    agentRuntime,
    delegationManager,
    blackboard,
    taskRepo,
    missionRepo
  );

  await t.test('should create and execute mission end-to-end with tool invocation', async () => {
    // 1st turn: model proposes filesystem.list
    mockProvider.queueResponse({
      text: '',
      modelId: 'qwen2.5:7b',
      providerId: 'ollama',
      durationMs: 10,
      isLocal: true,
      toolCalls: [
        {
          id: 'call_fs',
          name: 'filesystem.list',
          arguments: { relativePath: 'src' }
        }
      ],
      usage: { promptTokens: 15, completionTokens: 10, totalTokens: 25 }
    });

    // 2nd turn: model synthesizes final output
    mockProvider.queueResponse({
      text: 'Workspace verified. src directory contains agents, tools, core, api.',
      modelId: 'qwen2.5:7b',
      providerId: 'ollama',
      durationMs: 10,
      isLocal: true,
      usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 }
    });

    const result = await orchestrator.runMission({
      objective: 'Inspect src workspace structure',
      rootAgentId: 'aja'
    });

    assert.equal(result.status, 'completed');
    assert.ok(result.summary.includes('Workspace verified'));

    // Check mission in DB
    const savedMission = missionRepo.get(result.missionId);
    assert.ok(savedMission);
    assert.equal(savedMission.status, 'completed');

    // Check blackboard entry was published
    const findings = blackboard.listByMission(result.missionId);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].type, 'task_result');
    assert.ok(findings[0].content.includes('Workspace verified'));
  });

  db.close();
  cleanup();
});
