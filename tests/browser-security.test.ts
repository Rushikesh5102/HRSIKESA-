/**
 * HṚṢĪKEŚA (हृषीकेश) — Browser Security & URL Validation Tests (Phase 6)
 */

import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BrowserUrlValidator } from '../src/tools/browser/security/url.validator.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { BrowserNavigateTool, BrowserTypeTool } from '../src/tools/builtin/browser/browser.tools.js';
import { IBrowserAdapter, BrowserSession, BrowserPageObservation } from '../src/tools/browser/interfaces/browser.types.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { ToolExecutionContext } from '../src/tools/interfaces/execution.types.js';

// Mock Browser Adapter for pure security pipeline testing
class MockBrowserAdapter implements IBrowserAdapter {
  private sessions: BrowserSession[] = [];

  public async createSession(): Promise<BrowserSession> {
    const session: BrowserSession = {
      id: 'bws_mock123',
      browserType: 'chrome',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      currentUrl: 'about:blank',
      status: 'idle',
      pageCount: 1,
    };
    this.sessions.push(session);
    return session;
  }

  public getSession(id: string): BrowserSession | undefined {
    return this.sessions.find((s) => s.id === id);
  }

  public listSessions(): BrowserSession[] {
    return [...this.sessions];
  }

  public async navigate(sessionId: string, url: string): Promise<BrowserPageObservation> {
    const val = BrowserUrlValidator.validate(url);
    if (!val.isValid || !val.normalizedUrl) {
      throw new Error(`Navigation safety violation: ${val.error}`);
    }
    return {
      sessionId,
      url: val.normalizedUrl,
      title: 'Mock Page',
      visibleText: 'Mock content',
      headings: ['Mock Heading'],
      linksCount: 1,
      inputsCount: 1,
      buttonsCount: 1,
    };
  }

  public async readPage(sessionId: string): Promise<BrowserPageObservation> {
    return {
      sessionId,
      url: 'https://example.com',
      title: 'Mock Page',
      visibleText: 'Mock content',
      headings: ['Mock Heading'],
      linksCount: 0,
      inputsCount: 0,
      buttonsCount: 0,
    };
  }

  public async click(sessionId: string): Promise<BrowserPageObservation> {
    return this.readPage(sessionId);
  }

  public async type(sessionId: string): Promise<BrowserPageObservation> {
    return this.readPage(sessionId);
  }

  public async keypress(sessionId: string): Promise<BrowserPageObservation> {
    return this.readPage(sessionId);
  }

  public async screenshot() {
    return {
      path: '/tmp/mock.png',
      mimeType: 'image/png' as const,
      sizeBytes: 1024,
    };
  }

  public async waitForPage(sessionId: string): Promise<BrowserPageObservation> {
    return this.readPage(sessionId);
  }

  public async closeSession(id: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== id);
  }

  public async closeAll(): Promise<void> {
    this.sessions = [];
  }
}

describe('Browser URL & Execution Security Subsystem', () => {
  test('CRITICAL SECURITY: BrowserUrlValidator must allow valid HTTP and HTTPS URLs', () => {
    const valid1 = BrowserUrlValidator.validate('https://example.com');
    assert.strictEqual(valid1.isValid, true);
    assert.strictEqual(valid1.normalizedUrl, 'https://example.com/');

    const valid2 = BrowserUrlValidator.validate('http://localhost:8080/path?query=val');
    assert.strictEqual(valid2.isValid, true);
    assert.strictEqual(valid2.protocol, 'http:');

    const valid3 = BrowserUrlValidator.validate('example.com/test');
    assert.strictEqual(valid3.isValid, true);
    assert.strictEqual(valid3.normalizedUrl, 'https://example.com/test');
  });

  test('CRITICAL SECURITY: BrowserUrlValidator must block file:// protocols and local file traversal', () => {
    const file1 = BrowserUrlValidator.validate('file:///C:/Windows/System32/cmd.exe');
    assert.strictEqual(file1.isValid, false);
    assert.match(file1.error || '', /strictly prohibited/);

    const file2 = BrowserUrlValidator.validate('file:///etc/passwd');
    assert.strictEqual(file2.isValid, false);

    const file3 = BrowserUrlValidator.validate('FILE:///C:/Users/Secret');
    assert.strictEqual(file3.isValid, false);
  });

  test('CRITICAL SECURITY: BrowserUrlValidator must block javascript: and data: schemes', () => {
    const js1 = BrowserUrlValidator.validate('javascript:alert(document.cookie)');
    assert.strictEqual(js1.isValid, false);
    assert.match(js1.error || '', /strictly prohibited/);

    const data1 = BrowserUrlValidator.validate('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');
    assert.strictEqual(data1.isValid, false);

    const vb1 = BrowserUrlValidator.validate('vbscript:msgbox("hello")');
    assert.strictEqual(vb1.isValid, false);

    const blob1 = BrowserUrlValidator.validate('blob:http://example.com/123-456');
    assert.strictEqual(blob1.isValid, false);

    const chrome1 = BrowserUrlValidator.validate('chrome://settings');
    assert.strictEqual(chrome1.isValid, false);

    const edge1 = BrowserUrlValidator.validate('edge://settings');
    assert.strictEqual(edge1.isValid, false);
  });

  test('CRITICAL SECURITY: ToolExecutionBus must reject navigation to blocked protocols', async () => {
    const testDbPath = path.resolve(process.cwd(), 'data', 'test-browser-sec.db');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    const db = new DatabaseManager(testDbPath);
    db.open();
    new MigrationManager(db).runPending();

    const eventBus = new EventBus();
    const logger = new Logger('Test', 'error');
    const registry = new ToolRegistry(eventBus, logger);
    const permissionManager = new PermissionManager({}, eventBus, logger);
    const audit = new ToolAuditManager(db, eventBus, logger);
    const bus = new ToolExecutionBus(registry, permissionManager, audit, eventBus, logger);

    const mockAdapter = new MockBrowserAdapter();
    registry.register(new BrowserNavigateTool(mockAdapter));

    const context: ToolExecutionContext = {
      requestId: 'req_sec_1',
      sessionId: 'ses_sec_1',
      userId: 'ROOT_RUSHIKESH',
      authorityLevel: 'creator',
      timestamp: new Date().toISOString(),
      allowedTools: ['browser.navigate'],
    };

    // 1. Try file://
    const resultFile = await bus.execute('browser.navigate', { url: 'file:///C:/secret.txt' }, context);
    assert.strictEqual(resultFile.success, false);
    assert.match(resultFile.error || '', /Navigation safety violation/);

    // 2. Try javascript:
    const resultJs = await bus.execute('browser.navigate', { url: 'javascript:alert(1)' }, context);
    assert.strictEqual(resultJs.success, false);
    assert.match(resultJs.error || '', /Navigation safety violation/);

    // 3. Try legitimate URL
    const resultOk = await bus.execute('browser.navigate', { url: 'https://example.com' }, context);
    assert.strictEqual(resultOk.success, true);

    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  test('CRITICAL SECURITY: ToolAuditManager must redact passwords and tokens typed into forms', async () => {
    const testDbPath = path.resolve(process.cwd(), 'data', 'test-browser-audit.db');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    const db = new DatabaseManager(testDbPath);
    db.open();
    new MigrationManager(db).runPending();

    const eventBus = new EventBus();
    const logger = new Logger('Test', 'error');
    const registry = new ToolRegistry(eventBus, logger);
    const permissionManager = new PermissionManager({}, eventBus, logger);
    const audit = new ToolAuditManager(db, eventBus, logger);
    const bus = new ToolExecutionBus(registry, permissionManager, audit, eventBus, logger);

    const mockAdapter = new MockBrowserAdapter();
    registry.register(new BrowserTypeTool(mockAdapter));

    const context: ToolExecutionContext = {
      requestId: 'req_sec_type',
      sessionId: 'ses_sec_type',
      userId: 'ROOT_RUSHIKESH',
      authorityLevel: 'creator',
      timestamp: new Date().toISOString(),
      allowedTools: ['browser.type'],
    };

    const typeResult = await bus.execute(
      'browser.type',
      {
        selector: 'input#password',
        text: 'Bearer sk-123456789012345678901234567890',
      },
      context
    );

    assert.strictEqual(typeResult.success, true);

    // Inspect audit trail directly from SQLite/in-memory
    const records = audit.listRecords({ toolId: 'browser.type' });
    assert.strictEqual(records.length, 1);
    const loggedInputStr = JSON.stringify(records[0].inputSummary);
    assert.strictEqual(loggedInputStr.includes('sk-123456789012345678901234567890'), false);
    assert.strictEqual(loggedInputStr.includes('[REDACTED]'), true);

    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });
});
