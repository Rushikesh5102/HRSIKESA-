/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Security & Sandboxing Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ComputerSecurityValidator } from '../src/tools/computer/security/coordinate.validator.js';
import { ApplicationAllowlist } from '../src/tools/computer/security/app.allowlist.js';
import { ScreenBounds } from '../src/tools/computer/interfaces/computer.types.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { MockComputerAdapter } from '../src/tools/computer/adapter/mock.computer.adapter.js';
import { createComputerTools } from '../src/tools/builtin/computer/computer.tools.js';

describe('Computer Security & Sandboxing Subsystem', () => {
  const screen: ScreenBounds = { width: 1920, height: 1080, x: 0, y: 0 };

  it('CRITICAL SECURITY: should validate coordinates within screen boundaries and reject invalid/out-of-bounds input', () => {
    // Valid coordinates
    assert.equal(ComputerSecurityValidator.validateCoordinates(0, 0, screen).valid, true);
    assert.equal(ComputerSecurityValidator.validateCoordinates(1920, 1080, screen).valid, true);
    assert.equal(ComputerSecurityValidator.validateCoordinates(500, 500, screen).valid, true);

    // Negative coordinates rejected
    const negX = ComputerSecurityValidator.validateCoordinates(-1, 500, screen);
    assert.equal(negX.valid, false);
    assert.match(negX.reason || '', /cannot be negative/i);

    const negY = ComputerSecurityValidator.validateCoordinates(500, -10, screen);
    assert.equal(negY.valid, false);

    // Out of bounds coordinates rejected
    const outX = ComputerSecurityValidator.validateCoordinates(2000, 500, screen);
    assert.equal(outX.valid, false);
    assert.match(outX.reason || '', /exceed screen resolution/i);

    const outY = ComputerSecurityValidator.validateCoordinates(500, 1200, screen);
    assert.equal(outY.valid, false);

    // Non-finite numbers rejected
    assert.equal(ComputerSecurityValidator.validateCoordinates(NaN, 500, screen).valid, false);
    assert.equal(ComputerSecurityValidator.validateCoordinates(500, Infinity, screen).valid, false);
  });

  it('CRITICAL SECURITY: should enforce typing payload length limit of max 500 characters', () => {
    assert.equal(ComputerSecurityValidator.validateTypingPayload('').valid, false);
    assert.equal(ComputerSecurityValidator.validateTypingPayload('Hello World').valid, true);

    const smallText = 'A'.repeat(500);
    assert.equal(ComputerSecurityValidator.validateTypingPayload(smallText).valid, true);

    const runawayText = 'A'.repeat(501);
    const check = ComputerSecurityValidator.validateTypingPayload(runawayText);
    assert.equal(check.valid, false);
    assert.match(check.reason || '', /exceeds safety cap of 500 characters/i);
  });

  it('CRITICAL SECURITY: ApplicationAllowlist must strictly reject arbitrary/dangerous executables', () => {
    // Allowlisted apps
    assert.equal(ApplicationAllowlist.isAllowed('notepad'), true);
    assert.equal(ApplicationAllowlist.isAllowed('calculator'), true);
    assert.equal(ApplicationAllowlist.isAllowed('calc.exe'), true);
    assert.equal(ApplicationAllowlist.isAllowed('paint'), true);
    assert.equal(ApplicationAllowlist.isAllowed('browser'), true);

    // Arbitrary unlisted binaries strictly rejected
    assert.equal(ApplicationAllowlist.isAllowed('cmd.exe'), false);
    assert.equal(ApplicationAllowlist.isAllowed('powershell.exe'), false);
    assert.equal(ApplicationAllowlist.isAllowed('malicious_script.bat'), false);
    assert.equal(ApplicationAllowlist.isAllowed('C:\\Windows\\System32\\cmd.exe'), false);
    assert.equal(ApplicationAllowlist.isAllowed(''), false);
  });

  it('CRITICAL SECURITY: ToolAuditManager must redact passwords and secrets from computer typing tool records', async () => {
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

    const secretPassword = 'SUPER_SECRET_DESKTOP_TOKEN_9988';
    const res = await executionBus.execute(
      'computer.keyboard.type',
      { text: `User login token: Bearer ${secretPassword}` },
      {
        userId: 'ROOT_RUSHIKESH',
        isMaster: true,
        workspaceRoot: process.cwd()
      }
    );

    assert.equal(res.success, true);

    const records = audit.listRecords({ toolId: 'computer.keyboard.type' });
    assert.equal(records.length, 1);
    const summaryStr = JSON.stringify(records[0].inputSummary);
    assert.equal(summaryStr.includes(secretPassword), false);
    assert.equal(summaryStr.includes('[REDACTED]'), true);

    db.close();
  });
});
