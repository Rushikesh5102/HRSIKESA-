/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Agent Reasoning & Task Execution Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { ModelResponse } from '../src/models/interfaces/model.types.js';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER } from '../src/agents/roster/initial.agents.js';
import { AgentRuntime } from '../src/agents/runtime/agent.runtime.js';
import { MockComputerAdapter } from '../src/tools/computer/adapter/mock.computer.adapter.js';
import { createComputerTools } from '../src/tools/builtin/computer/computer.tools.js';

class MockDesktopModelProvider implements IModelProvider {
  public readonly id = 'ollama';
  public readonly name = 'Mock Desktop Ollama Provider';
  public readonly isLocal = true;
  private callCount = 0;

  public async checkHealth() {
    return { status: 'healthy' as const, latencyMs: 1 };
  }

  public async listModels() {
    return [
      {
        id: 'qwen2.5:7b',
        name: 'Qwen 2.5 7B Local',
        providerId: this.id,
        isLocal: true,
        contextWindow: 4096,
        isAvailable: true
      }
    ];
  }

  public async chat(): Promise<ModelResponse> {
    this.callCount++;
    if (this.callCount === 1) {
      return {
        providerId: this.id,
        modelId: 'qwen2.5:7b',
        text: 'Launching Notepad to type the text.',
        isLocal: true,
        durationMs: 5,
        toolCalls: [
          {
            id: 'call_1',
            name: 'computer.app.launch',
            arguments: { appName: 'notepad' }
          }
        ],
        usage: { promptTokens: 20, completionTokens: 15, totalTokens: 35 }
      };
    } else if (this.callCount === 2) {
      return {
        providerId: this.id,
        modelId: 'qwen2.5:7b',
        text: 'Now typing text into Notepad.',
        isLocal: true,
        durationMs: 5,
        toolCalls: [
          {
            id: 'call_2',
            name: 'computer.keyboard.type',
            arguments: { text: 'Hello from Arjuna desktop control!' }
          }
        ],
        usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 }
      };
    } else {
      return {
        providerId: this.id,
        modelId: 'qwen2.5:7b',
        text: 'Notepad was launched and the text "Hello from Arjuna desktop control!" has been successfully typed.',
        isLocal: true,
        durationMs: 5,
        usage: { promptTokens: 40, completionTokens: 25, totalTokens: 65 }
      };
    }
  }
}

describe('Computer Agent Reasoning Subsystem', () => {
  it('Agent Gāṇḍīva should execute multi-turn desktop task via ToolExecutionBus', async () => {
    const logger = new Logger('Test', 'error');
    const bus = new EventBus();
    const db = new DatabaseManager(':memory:', logger);
    db.open();

    const audit = new ToolAuditManager(db, bus, logger);
    const toolRegistry = new ToolRegistry(bus, logger);
    const permissions = new PermissionManager({ allowedWorkspaceRoots: [process.cwd()] }, bus, logger);
    const executionBus = new ToolExecutionBus(toolRegistry, permissions, audit, bus, logger);
    const mockAdapter = new MockComputerAdapter();

    for (const tool of createComputerTools(mockAdapter)) {
      toolRegistry.register(tool);
    }

    const modelRegistry = new ModelRegistry(bus, logger);
    const mockProvider = new MockDesktopModelProvider();
    await modelRegistry.registerProvider(mockProvider);
    const router = new ModelRouter(modelRegistry, bus, logger);

    const agentRegistry = new AgentRegistry(bus, logger);
    for (const agent of INITIAL_AGENT_ROSTER) {
      agentRegistry.register({ ...agent });
    }

    const runtime = new AgentRuntime(agentRegistry, toolRegistry, executionBus, router, bus, logger);

    const task = {
      id: 'task_desktop_gandiva_1',
      agentId: 'gandiva',
      missionId: 'mission_desktop_1',
      title: 'Open Notepad and Type Message',
      objective: 'Open Notepad and type Hello from Arjuna desktop control!',
      depth: 0
    };

    const result = await runtime.execute(task);

    assert.equal(result.status, 'completed');
    assert.match(result.summary, /Notepad was launched/i);
    assert.equal(result.toolCalls.length, 2);
    assert.equal(mockAdapter.launchedApps.length, 1);
    assert.equal(mockAdapter.launchedApps[0].appName, 'Notepad');
    assert.equal(mockAdapter.typedHistory.length, 1);
    assert.equal(mockAdapter.typedHistory[0], 'Hello from Arjuna desktop control!');

    db.close();
  });
});
