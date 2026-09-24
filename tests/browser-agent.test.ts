/**
 * HṚṢĪKEŚA (हृषीकेश) — Agent Browser Automation Integration Tests (Phase 6)
 */

import { test, describe, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { PlaywrightBrowserAdapter } from '../src/tools/browser/adapter/playwright.adapter.js';
import {
  BrowserSessionCreateTool,
  BrowserNavigateTool,
  BrowserPageReadTool,
  BrowserSessionCloseTool,
} from '../src/tools/builtin/browser/browser.tools.js';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { AgentRuntime } from '../src/agents/runtime/agent.runtime.js';
import { RAHU } from '../src/agents/roster/initial.agents.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { HardwareDetector } from '../src/core/hardware/hardware.detector.js';
import { ChatRequest, ModelResponse } from '../src/models/interfaces/model.types.js';

class MockBrowserModelProvider implements IModelProvider {
  public readonly id = 'ollama';
  public readonly displayName = 'Mock Ollama Provider';
  public readonly isLocal = true;
  private turns = 0;
  private serverUrl = '';

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  public async checkHealth() {
    return { status: 'healthy' as const, latencyMs: 1, checkedAt: new Date().toISOString() };
  }

  public async listModels() {
    return [{
      id: 'qwen2.5:7b',
      displayName: 'qwen2.5:7b',
      providerId: this.id,
      isLocal: true,
      contextWindow: 4096,
      capabilities: ['chat' as const, 'tools' as const],
      costClassification: 'free-local' as const,
      availability: true,
      statusText: 'available',
      priority: 1
    }];
  }

  public async generate(): Promise<ModelResponse> {
    throw new Error('Not implemented');
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    this.turns++;
    if (this.turns === 1) {
      // First turn: propose browser navigation
      return {
        text: 'I will navigate to the web page to inspect its title.',
        providerId: this.id,
        modelId: 'qwen2.5:7b',
        durationMs: 10,
        isLocal: true,
        toolCalls: [
          {
            id: 'call_bws_1',
            name: 'browser.navigate',
            arguments: { url: `${this.serverUrl}/research` },
          },
        ],
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      };
    } else {
      // Second turn: synthesize answer
      const lastMsg = request.messages[request.messages.length - 1];
      return {
        text: `I have inspected the page. The title is "Rahu Intelligence Portal" and the content explains: ${lastMsg.content.slice(0, 100)}`,
        providerId: this.id,
        modelId: 'qwen2.5:7b',
        durationMs: 10,
        isLocal: true,
        usage: { promptTokens: 100, completionTokens: 40, totalTokens: 140 },
      };
    }
  }
}

describe('Agent Browser Automation Integration Subsystem', () => {
  let server: http.Server;
  let serverUrl: string;
  const testDbPath = path.resolve(process.cwd(), 'data', 'test-browser-agent.db');
  const testScreenshotDir = path.resolve(process.cwd(), 'data', 'test-browser-agent-shots');

  let db: DatabaseManager;
  let adapter: PlaywrightBrowserAdapter;

  test('setup test environment', async () => {
    if (fs.existsSync(testDbPath)) { try { fs.unlinkSync(testDbPath); } catch {} }

    db = new DatabaseManager(testDbPath);
    db.open();
    new MigrationManager(db).runPending();

    // Local HTTP server
    await new Promise<void>((resolve) => {
      server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Rahu Intelligence Portal</title></head>
            <body>
              <h1>Quantum Computing Architecture</h1>
              <p>Key findings: Quantum supremacy achieved in superconductor qubits.</p>
            </body>
          </html>
        `);
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    adapter = new PlaywrightBrowserAdapter(testScreenshotDir);
  });

  after(async () => {
    if (adapter) await adapter.closeAll();
    if (server) await new Promise<void>((res) => server.close(() => res()));
    if (db) db.close();
    if (fs.existsSync(testDbPath)) { try { fs.unlinkSync(testDbPath); } catch {} }
    if (fs.existsSync(testScreenshotDir)) fs.rmSync(testScreenshotDir, { recursive: true, force: true });
  });

  test('Rahu agent should autonomously navigate, inspect web page, and return synthesis', async () => {
    const eventBus = new EventBus();
    const logger = new Logger('Test', 'error');
    const toolRegistry = new ToolRegistry(eventBus, logger);
    const permissionManager = new PermissionManager({}, eventBus, logger);
    const audit = new ToolAuditManager(db, eventBus, logger);
    const toolBus = new ToolExecutionBus(toolRegistry, permissionManager, audit, eventBus, logger);

    toolRegistry.register(new BrowserSessionCreateTool(adapter));
    toolRegistry.register(new BrowserNavigateTool(adapter));
    toolRegistry.register(new BrowserPageReadTool(adapter));
    toolRegistry.register(new BrowserSessionCloseTool(adapter));

    const agentRegistry = new AgentRegistry(eventBus, logger);
    agentRegistry.register({ ...RAHU });

    const modelRegistry = new ModelRegistry(eventBus, logger);
    const mockProvider = new MockBrowserModelProvider(serverUrl);
    await modelRegistry.registerProvider(mockProvider);

    const hardware = new HardwareDetector();
    const router = new ModelRouter(modelRegistry, eventBus, logger, hardware);

    const agentRuntime = new AgentRuntime(
      agentRegistry,
      toolRegistry,
      toolBus,
      router,
      eventBus,
      logger
    );

    const task = {
      id: 'task_rahu_browse_1',
      agentId: 'rahu',
      objective: `Browse ${serverUrl}/research and report the research findings.`,
      context: {},
      priority: 1 as const,
      status: 'queued' as const,
      createdAt: new Date().toISOString(),
    };

    const result = await agentRuntime.execute(task);

    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.agentId, 'rahu');
    assert.strictEqual(result.toolCalls.length, 1);
    assert.strictEqual(result.toolCalls[0].tool, 'browser.navigate');
    assert.ok(result.summary.includes('Rahu Intelligence Portal'));
  });
});
