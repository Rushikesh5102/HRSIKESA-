/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Tools & Execution Bus Test Suite
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
import { MockComputerAdapter } from '../src/tools/computer/adapter/mock.computer.adapter.js';
import { createComputerTools } from '../src/tools/builtin/computer/computer.tools.js';

describe('Computer Tools Subsystem', () => {
  it('should register all 9 standard computer tools with correct metadata and categories', () => {
    const logger = new Logger('Test', 'error');
    const bus = new EventBus();
    const registry = new ToolRegistry(bus, logger);
    const mockAdapter = new MockComputerAdapter();

    const tools = createComputerTools(mockAdapter);
    assert.equal(tools.length, 9);

    for (const tool of tools) {
      registry.register(tool);
    }

    const diag = registry.getDiagnostics();
    assert.equal(diag.byCategory.computer, 9);

    const toolIds = registry.list().map((t) => t.id);
    assert.ok(toolIds.includes('computer.screen.size'));
    assert.ok(toolIds.includes('computer.screenshot'));
    assert.ok(toolIds.includes('computer.window.active'));
    assert.ok(toolIds.includes('computer.mouse.move'));
    assert.ok(toolIds.includes('computer.mouse.click'));
    assert.ok(toolIds.includes('computer.mouse.double_click'));
    assert.ok(toolIds.includes('computer.keyboard.type'));
    assert.ok(toolIds.includes('computer.keyboard.keypress'));
    assert.ok(toolIds.includes('computer.app.launch'));
  });

  it('should execute full desktop tool execution bus pipeline', async () => {
    const logger = new Logger('Test', 'error');
    const bus = new EventBus();
    const db = new DatabaseManager(':memory:', logger);
    db.open();

    const audit = new ToolAuditManager(db, bus, logger);
    const registry = new ToolRegistry(bus, logger);
    const permissions = new PermissionManager({ allowedWorkspaceRoots: [process.cwd()] }, bus, logger);
    const executionBus = new ToolExecutionBus(registry, permissions, audit, bus, logger);
    const mockAdapter = new MockComputerAdapter();

    for (const tool of createComputerTools(mockAdapter)) {
      registry.register(tool);
    }

    const authContext = {
      userId: 'ROOT_RUSHIKESH',
      isMaster: true,
      workspaceRoot: process.cwd()
    };

    // 1. computer.screen.size
    const sizeRes = await executionBus.execute('computer.screen.size', {}, authContext);
    assert.equal(sizeRes.success, true);
    assert.equal((sizeRes.output as { width: number }).width, 1920);

    // 2. computer.screenshot
    const screenRes = await executionBus.execute(
      'computer.screenshot',
      { filename: 'test_cap' },
      authContext
    );
    assert.equal(screenRes.success, true);
    assert.match((screenRes.output as { artifactPath: string }).artifactPath, /test_cap\.png/);

    // 3. computer.window.active
    const winRes = await executionBus.execute('computer.window.active', {}, authContext);
    assert.equal(winRes.success, true);
    assert.equal((winRes.output as { title: string }).title, 'HṚṢĪKEŚA Command Center');

    // 4. computer.mouse.move
    const moveRes = await executionBus.execute(
      'computer.mouse.move',
      { x: 300, y: 400 },
      authContext
    );
    assert.equal(moveRes.success, true);
    assert.deepEqual(moveRes.output, { x: 300, y: 400 });

    // 5. computer.mouse.click
    const clickRes = await executionBus.execute(
      'computer.mouse.click',
      { button: 'left' },
      authContext
    );
    assert.equal(clickRes.success, true);

    // 6. computer.keyboard.type
    const typeRes = await executionBus.execute(
      'computer.keyboard.type',
      { text: 'Hello from Gāṇḍīva' },
      authContext
    );
    assert.equal(typeRes.success, true);

    // 7. computer.keyboard.keypress
    const keyRes = await executionBus.execute(
      'computer.keyboard.keypress',
      { key: 'ENTER' },
      authContext
    );
    assert.equal(keyRes.success, true);

    // 8. computer.app.launch
    const launchRes = await executionBus.execute(
      'computer.app.launch',
      { appName: 'notepad' },
      authContext
    );
    assert.equal(launchRes.success, true);
    assert.equal((launchRes.output as { appName: string }).appName, 'Notepad');

    db.close();
  });
});
