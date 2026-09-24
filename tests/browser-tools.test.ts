/**
 * HṚṢĪKEŚA (हृषीकेश) — Browser Tools & ToolExecutionBus Integration Tests (Phase 6)
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
  BrowserClickTool,
  BrowserTypeTool,
  BrowserKeypressTool,
  BrowserScreenshotTool,
  BrowserSessionCloseTool,
} from '../src/tools/builtin/browser/browser.tools.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { ToolExecutionContext } from '../src/tools/interfaces/execution.types.js';

describe('Browser Tools Execution Bus Subsystem', () => {
  let server: http.Server;
  let serverUrl: string;
  const testDbPath = path.resolve(process.cwd(), 'data', 'test-browser-tools.db');
  const testScreenshotDir = path.resolve(process.cwd(), 'data', 'test-browser-tool-shots');

  let db: DatabaseManager;
  let adapter: PlaywrightBrowserAdapter;
  let bus: ToolExecutionBus;

  test('setup test environment', async () => {
    if (fs.existsSync(testDbPath)) { try { fs.unlinkSync(testDbPath); } catch {} }

    db = new DatabaseManager(testDbPath);
    db.open();
    new MigrationManager(db).runPending();

    const eventBus = new EventBus();
    const logger = new Logger('Test', 'error');
    const registry = new ToolRegistry(eventBus, logger);
    const permissionManager = new PermissionManager({}, eventBus, logger);
    const audit = new ToolAuditManager(db, eventBus, logger);
    bus = new ToolExecutionBus(registry, permissionManager, audit, eventBus, logger);

    adapter = new PlaywrightBrowserAdapter(testScreenshotDir);

    // Register all 8 browser tools
    registry.register(new BrowserSessionCreateTool(adapter));
    registry.register(new BrowserNavigateTool(adapter));
    registry.register(new BrowserPageReadTool(adapter));
    registry.register(new BrowserClickTool(adapter));
    registry.register(new BrowserTypeTool(adapter));
    registry.register(new BrowserKeypressTool(adapter));
    registry.register(new BrowserScreenshotTool(adapter));
    registry.register(new BrowserSessionCloseTool(adapter));

    // Spin up local HTTP server
    await new Promise<void>((resolve) => {
      server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Browser Tools Bus Test</title></head>
            <body>
              <h1>Header One</h1>
              <p>Text for tool testing.</p>
              <input id="search-box" type="text" />
              <button id="search-btn" onclick="document.body.innerHTML += '<span>Searched</span>'">Search</button>
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
  });

  after(async () => {
    if (adapter) await adapter.closeAll();
    if (server) await new Promise<void>((res) => server.close(() => res()));
    if (db) db.close();
    if (fs.existsSync(testDbPath)) { try { fs.unlinkSync(testDbPath); } catch {} }
    if (fs.existsSync(testScreenshotDir)) fs.rmSync(testScreenshotDir, { recursive: true, force: true });
  });

  test('should execute browser tools via ToolExecutionBus and record audit', async () => {
    const context: ToolExecutionContext = {
      requestId: 'req_bws_1',
      sessionId: 'ses_bws_1',
      userId: 'ROOT_RUSHIKESH',
      authorityLevel: 'creator',
      timestamp: new Date().toISOString(),
      allowedTools: [
        'browser.session.create',
        'browser.navigate',
        'browser.page.read',
        'browser.click',
        'browser.type',
        'browser.keypress',
        'browser.screenshot',
        'browser.session.close',
      ],
    };

    // 1. Create Session
    const createRes = await bus.execute('browser.session.create', { headless: true }, context);
    assert.strictEqual(createRes.success, true);
    const session = createRes.output as { id: string };
    assert.ok(session.id);

    // 2. Navigate
    const navRes = await bus.execute('browser.navigate', { sessionId: session.id, url: serverUrl }, context);
    assert.strictEqual(navRes.success, true);
    const navObs = navRes.output as { title: string; headings: string[] };
    assert.strictEqual(navObs.title, 'Browser Tools Bus Test');
    assert.deepStrictEqual(navObs.headings, ['Header One']);

    // 3. Page Read
    const readRes = await bus.execute('browser.page.read', { sessionId: session.id }, context);
    assert.strictEqual(readRes.success, true);
    const readObs = readRes.output as { visibleText: string };
    assert.ok(readObs.visibleText.includes('Text for tool testing.'));

    // 4. Type text
    const typeRes = await bus.execute('browser.type', { sessionId: session.id, selector: '#search-box', text: 'query string' }, context);
    assert.strictEqual(typeRes.success, true);

    // 5. Click
    const clickRes = await bus.execute('browser.click', { sessionId: session.id, selector: '#search-btn' }, context);
    assert.strictEqual(clickRes.success, true);
    const clickObs = clickRes.output as { visibleText: string };
    assert.ok(clickObs.visibleText.includes('Searched'));

    // 6. Screenshot
    const shotRes = await bus.execute('browser.screenshot', { sessionId: session.id }, context);
    assert.strictEqual(shotRes.success, true);
    const shotOutput = shotRes.output as { path: string };
    assert.ok(fs.existsSync(shotOutput.path));

    // 7. Close Session
    const closeRes = await bus.execute('browser.session.close', { sessionId: session.id }, context);
    assert.strictEqual(closeRes.success, true);
  });
});
