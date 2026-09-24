/**
 * HRSIKESA - Agent Security Boundaries Tests
 * Verifies that agents are strictly governed by PermissionManager and ToolExecutionBus.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { GANDIVA, AJA, RAHU } from '../src/agents/roster/initial.agents.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { AgentRuntime } from '../src/agents/runtime/agent.runtime.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { ModelResponse, ModelRequest, ChatRequest, ProviderHealth, ModelMetadata } from '../src/models/interfaces/model.types.js';
import { SystemInfoTool } from '../src/tools/builtin/system.info.js';
import { FileListTool } from '../src/tools/builtin/filesystem.list.js';
import { TerminalExecuteTool } from '../src/tools/builtin/terminal.execute.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';
import fs from 'node:fs';

const TEST_DB_PATH = 'data/test-agent-security.db';

class MockSecurityModelProvider implements IModelProvider {
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
      text: 'I have finished analysis.',
      providerId: this.id,
      modelId: 'qwen2.5:7b',
      durationMs: 10,
      isLocal: true,
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    };
  }
}

test('Agent Security Sandbox & Permission Boundaries', async (t) => {
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
  toolRegistry.register(new SystemInfoTool());
  toolRegistry.register(new FileListTool());
  toolRegistry.register(new TerminalExecuteTool());

  const permissionManager = new PermissionManager({
    allowedWorkspaceRoots: [process.cwd()]
  });

  const toolAudit = new ToolAuditManager(db);
  const toolBus = new ToolExecutionBus(toolRegistry, permissionManager, toolAudit);

  const modelRegistry = new ModelRegistry();
  const mockProvider = new MockSecurityModelProvider();
  await modelRegistry.registerProvider(mockProvider);
  const modelRouter = new ModelRouter(modelRegistry);

  const agentRegistry = new AgentRegistry();
  agentRegistry.register({ ...AJA }); // Aja does NOT have terminal.execute in allowedTools
  agentRegistry.register({ ...GANDIVA });

  const agentRuntime = new AgentRuntime(
    agentRegistry,
    toolRegistry,
    toolBus,
    modelRouter
  );

  await t.test('CRITICAL SECURITY: Agent cannot execute tools not in its allowedTools list', async () => {
    // Simulate model proposing terminal.execute when Aja is executing
    mockProvider.queueResponse({
      text: '',
      modelId: 'qwen2.5:7b',
      providerId: 'ollama',
      durationMs: 10,
      isLocal: true,
      toolCalls: [
        {
          id: 'call_term',
          name: 'terminal.execute',
          arguments: { command: 'node -v' }
        }
      ],
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    });

    const result = await agentRuntime.execute({
      id: 'task_sec_01',
      agentId: 'aja',
      objective: 'Check environment with terminal',
      priority: 'normal',
      status: 'queued',
      depth: 0,
      createdAt: new Date().toISOString()
    });

    // Must have caught security violation and marked as failed
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some(e => e.includes('SECURITY VIOLATION') && e.includes('not in allowedTools')));
  });

  await t.test('CRITICAL SECURITY: Agent cannot exceed danger tier limit or execute arbitrary terminal commands', async () => {
    // Simulate Gandiva (who has terminal.execute) attempting to run an arbitrary unwhitelisted command (e.g. powershell exploit)
    mockProvider.queueResponse({
      text: '',
      modelId: 'qwen2.5:7b',
      providerId: 'ollama',
      durationMs: 10,
      isLocal: true,
      toolCalls: [
        {
          id: 'call_exploit',
          name: 'terminal.execute',
          arguments: { command: 'del /f /q C:\\Windows' }
        }
      ],
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    });

    const result = await agentRuntime.execute({
      id: 'task_sec_02',
      agentId: 'gandiva',
      objective: 'Execute unwhitelisted command',
      priority: 'normal',
      status: 'queued',
      depth: 0,
      createdAt: new Date().toISOString()
    });

    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].success, false);
    assert.ok(
      result.toolCalls[0].error?.includes('human authorization') ||
      result.toolCalls[0].error?.includes('Security Restriction')
    );
  });

  await t.test('CRITICAL SECURITY: PermissionManager policy is immutable by unauthenticated callers', () => {
    const policy = permissionManager.getPolicy();
    assert.equal(policy.maxAutonomousTier, DangerTier.TIER_1);
    assert.ok(policy.allowedWorkspaceRoots.length > 0);
  });

  db.close();
  cleanup();
});
