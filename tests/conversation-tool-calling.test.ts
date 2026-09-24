import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationService } from '../src/conversation/conversation.service.js';
import { SessionManager } from '../src/conversation/session.manager.js';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { ChatRequest, ModelResponse, ProviderHealth, ModelMetadata } from '../src/models/interfaces/model.types.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { SystemInfoTool } from '../src/tools/builtin/system.info.js';

describe('Conversation Tool Calling Integration Subsystem', () => {
  test('ConversationService should execute model-proposed tool call and return synthesized response', async () => {
    let callCount = 0;

    // Mock Provider that returns a tool call on Turn 1 and text on Turn 2
    const mockProvider: IModelProvider = {
      id: 'mock_llm',
      displayName: 'Mock Tool-Calling LLM',
      isLocal: true,
      async checkHealth(): Promise<ProviderHealth> {
        return { status: 'healthy', message: 'Ready', checkedAt: new Date().toISOString() };
      },
      async listModels(): Promise<ModelMetadata[]> {
        return [{
          id: 'mock_model',
          providerId: 'mock_llm',
          displayName: 'Mock Model',
          isLocal: true,
          capabilities: ['chat', 'tools'],
          costClassification: 'free-local',
          availability: true,
          statusText: 'Available',
          priority: 100
        }];
      },
      async generate(): Promise<ModelResponse> {
        throw new Error('Not implemented');
      },
      async chat(req: ChatRequest): Promise<ModelResponse> {
        callCount++;
        if (callCount === 1) {
          // Turn 1: Model decides to call system.info
          return {
            text: '',
            providerId: 'mock_llm',
            modelId: 'mock_model',
            durationMs: 10,
            isLocal: true,
            toolCalls: [
              {
                id: 'call_abc123',
                name: 'system.info',
                arguments: {}
              }
            ]
          };
        } else {
          // Turn 2: Model receives tool output and gives answer
          const toolMsg = req.messages.find((m) => m.role === 'tool');
          assert.ok(toolMsg, 'Turn 2 must receive tool output message');

          return {
            text: 'System metrics verified: Node runtime is active and host specs are operational.',
            providerId: 'mock_llm',
            modelId: 'mock_model',
            durationMs: 10,
            isLocal: true
          };
        }
      }
    };

    const registry = new ModelRegistry();
    await registry.registerProvider(mockProvider);
    const router = new ModelRouter(registry);
    const sessionManager = new SessionManager();
    const identityManager = new IdentityManager();

    // Tools setup
    const toolRegistry = new ToolRegistry();
    toolRegistry.register(new SystemInfoTool());
    const permissions = new PermissionManager();
    const audit = new ToolAuditManager();
    const toolBus = new ToolExecutionBus(toolRegistry, permissions, audit);

    const convService = new ConversationService(
      sessionManager,
      router,
      identityManager,
      undefined,
      undefined,
      toolBus,
      toolRegistry
    );

    const response = await convService.sendMessage('What are the system specifications?');

    assert.equal(response.success, true);
    assert.equal(response.response, 'System metrics verified: Node runtime is active and host specs are operational.');
    assert.equal(callCount, 2);
    assert.equal(response.toolCallsExecuted?.length, 1);
    assert.equal(response.toolCallsExecuted[0].tool, 'system.info');
    assert.ok(response.toolCallsExecuted[0].output);
  });

  test('ConversationService should cap tool iterations at maxToolIterations to prevent infinite loops', async () => {
    let loopCount = 0;

    // Provider that always endlessly emits a tool call
    const loopingProvider: IModelProvider = {
      id: 'looping_llm',
      displayName: 'Looping LLM',
      isLocal: true,
      async checkHealth(): Promise<ProviderHealth> {
        return { status: 'healthy', message: 'Ready', checkedAt: new Date().toISOString() };
      },
      async listModels(): Promise<ModelMetadata[]> {
        return [{
          id: 'loop_model',
          providerId: 'looping_llm',
          displayName: 'Loop Model',
          isLocal: true,
          capabilities: ['chat', 'tools'],
          costClassification: 'free-local',
          availability: true,
          statusText: 'Available',
          priority: 100
        }];
      },
      async generate(): Promise<ModelResponse> {
        throw new Error('Not implemented');
      },
      async chat(): Promise<ModelResponse> {
        loopCount++;
        return {
          text: 'Attempting another tool call...',
          providerId: 'looping_llm',
          modelId: 'loop_model',
          durationMs: 5,
          isLocal: true,
          toolCalls: [
            {
              id: `call_${loopCount}`,
              name: 'system.info',
              arguments: {}
            }
          ]
        };
      }
    };

    const registry = new ModelRegistry();
    await registry.registerProvider(loopingProvider);
    const router = new ModelRouter(registry);
    const sessionManager = new SessionManager();
    const identityManager = new IdentityManager();

    const toolRegistry = new ToolRegistry();
    toolRegistry.register(new SystemInfoTool());
    const toolBus = new ToolExecutionBus(toolRegistry, new PermissionManager(), new ToolAuditManager());

    const convService = new ConversationService(
      sessionManager,
      router,
      identityManager,
      undefined,
      undefined,
      toolBus,
      toolRegistry
    );

    // Set max iterations to 2
    convService.setToolExecution(toolBus, toolRegistry, 2);

    const response = await convService.sendMessage('Infinite loop test');
    assert.equal(response.success, true);
    // Should break at maxToolIterations without hanging
    assert.ok(loopCount <= 3);
  });
});
