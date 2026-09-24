/**
 * HṚṢĪKEŚA (हृषीकेश) — Semantic UI Automation Tools & Bus Test Suite (Phase 9)
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
import { MockUiaAdapter } from '../src/tools/computer/uia/mock/mock.uia.adapter.js';
import { createUiaTools } from '../src/tools/builtin/computer/uia.tools.js';

describe('Semantic UI Automation Tools Subsystem', () => {
  it('should register all 6 semantic UI tools with correct metadata and categories', () => {
    const logger = new Logger('Test', 'error');
    const bus = new EventBus();
    const registry = new ToolRegistry(bus, logger);
    const mockUiaAdapter = new MockUiaAdapter();

    const tools = createUiaTools(mockUiaAdapter);
    assert.equal(tools.length, 6);

    for (const tool of tools) {
      registry.register(tool);
    }

    const diag = registry.getDiagnostics();
    assert.equal(diag.byCategory.computer, 6);

    const toolIds = registry.list().map((t) => t.id);
    assert.ok(toolIds.includes('computer.ui.observe'));
    assert.ok(toolIds.includes('computer.ui.find'));
    assert.ok(toolIds.includes('computer.ui.focus'));
    assert.ok(toolIds.includes('computer.ui.click'));
    assert.ok(toolIds.includes('computer.ui.type'));
    assert.ok(toolIds.includes('computer.ui.keypress'));
  });

  it('should execute full semantic UI tool execution bus pipeline', async () => {
    const logger = new Logger('Test', 'error');
    const bus = new EventBus();
    const db = new DatabaseManager(':memory:', logger);
    db.open();

    const audit = new ToolAuditManager(db, bus, logger);
    const registry = new ToolRegistry(bus, logger);
    const permissions = new PermissionManager({ allowedWorkspaceRoots: [process.cwd()] }, bus, logger);
    const executionBus = new ToolExecutionBus(registry, permissions, audit, bus, logger);
    const mockUiaAdapter = new MockUiaAdapter();

    for (const tool of createUiaTools(mockUiaAdapter)) {
      registry.register(tool);
    }

    const authContext = {
      userId: 'ROOT_RUSHIKESH',
      isMaster: true,
      workspaceRoot: process.cwd()
    };

    // 1. computer.ui.observe
    const observeRes = await executionBus.execute(
      'computer.ui.observe',
      { maxDepth: 3, maxElements: 50 },
      authContext
    );
    assert.equal(observeRes.success, true);
    const windowTree = observeRes.output as { title: string; elements: Array<{ id: string; controlType: string }> };
    assert.equal(windowTree.title, 'Untitled - Notepad');
    assert.ok(windowTree.elements.length > 0);

    // 2. computer.ui.find
    const findRes = await executionBus.execute(
      'computer.ui.find',
      { controlType: 'edit' },
      authContext
    );
    assert.equal(findRes.success, true);
    const findOutput = findRes.output as { count: number; elements: Array<{ id: string; name: string }> };
    assert.equal(findOutput.count, 1);
    assert.equal(findOutput.elements[0].name, 'Text Editor');
    const editId = findOutput.elements[0].id;

    // 3. computer.ui.focus
    const focusRes = await executionBus.execute(
      'computer.ui.focus',
      { elementId: editId },
      authContext
    );
    assert.equal(focusRes.success, true);
    const focusOutput = focusRes.output as { success: boolean; elementId: string };
    assert.equal(focusOutput.success, true);
    assert.equal(focusOutput.elementId, editId);

    // 4. computer.ui.type
    const typeRes = await executionBus.execute(
      'computer.ui.type',
      { elementId: editId, text: 'HṚṢĪKEŚA Phase 9 Verified' },
      authContext
    );
    assert.equal(typeRes.success, true);
    const typeOutput = typeRes.output as { success: boolean; previousValue: string; updatedValue: string };
    assert.equal(typeOutput.success, true);
    assert.equal(typeOutput.previousValue, '');
    assert.equal(typeOutput.updatedValue, 'HṚṢĪKEŚA Phase 9 Verified');

    // 5. computer.ui.keypress
    const keyRes = await executionBus.execute(
      'computer.ui.keypress',
      { elementId: editId, key: 'ENTER' },
      authContext
    );
    assert.equal(keyRes.success, true);

    // 6. computer.ui.click
    const clickRes = await executionBus.execute(
      'computer.ui.click',
      { elementId: 'elem_4' },
      authContext
    );
    assert.equal(clickRes.success, true);

    // 7. Verify audit records written
    const records = audit.listRecords({ limit: 20 });
    assert.ok(records.length >= 6);
    const toolIds = records.map((r) => r.toolId);
    assert.ok(toolIds.includes('computer.ui.observe'));
    assert.ok(toolIds.includes('computer.ui.find'));
    assert.ok(toolIds.includes('computer.ui.focus'));
    assert.ok(toolIds.includes('computer.ui.type'));
    assert.ok(toolIds.includes('computer.ui.keypress'));
    assert.ok(toolIds.includes('computer.ui.click'));

    db.close();
  });
});
