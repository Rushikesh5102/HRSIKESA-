import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { FileListTool } from '../src/tools/builtin/filesystem.list.js';
import { FileReadTool } from '../src/tools/builtin/filesystem.read.js';
import { FileWriteTool } from '../src/tools/builtin/filesystem.write.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';
import { ITool } from '../src/tools/interfaces/tool.types.js';
import { ToolExecutionContext } from '../src/tools/interfaces/execution.types.js';

describe('Security Sandbox & Danger Tier Enforcement Subsystem', () => {
  const workspaceRoot = path.resolve(process.cwd());

  const context: ToolExecutionContext = {
    requestId: 'req_security_test',
    userId: 'ROOT_RUSHIKESH',
    environment: 'test',
    workspaceRoot
  };

  test('CRITICAL SECURITY: FileListTool must block directory traversal out of workspace', async () => {
    const tool = new FileListTool();

    // Traversal via relative ../../
    const res1 = await tool.execute({ path: '../../' }, context);
    assert.equal(res1.success, false);
    assert.ok(res1.error?.includes('Security boundary violation'));

    // Traversal via Windows root
    const res2 = await tool.execute({ path: 'C:\\Windows\\System32' }, context);
    assert.equal(res2.success, false);
    assert.ok(res2.error?.includes('Security boundary violation'));
  });

  test('CRITICAL SECURITY: FileReadTool must block arbitrary file reading outside workspace', async () => {
    const tool = new FileReadTool();

    const res = await tool.execute({ path: '../../Windows/System32/drivers/etc/hosts' }, context);
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Security boundary violation'));
  });

  test('CRITICAL SECURITY: FileWriteTool must block writing files outside workspace', async () => {
    const tool = new FileWriteTool();

    const res = await tool.execute({
      path: '../../escaped_malicious_file.txt',
      content: 'malicious payload'
    }, context);

    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Security boundary violation'));
  });

  test('CRITICAL SECURITY: ToolExecutionBus must block execution of denied tools', async () => {
    const registry = new ToolRegistry();
    const permissions = new PermissionManager({
      blockedTools: ['restricted.operation']
    });
    const audit = new ToolAuditManager();
    const bus = new ToolExecutionBus(registry, permissions, audit);

    let executed = false;
    const restrictedTool: ITool = {
      id: 'restricted.operation',
      name: 'Restricted Op',
      description: 'Dangerous',
      version: '1.0.0',
      category: 'custom',
      riskLevel: DangerTier.TIER_2,
      requiresApproval: false,
      capabilities: ['restricted'],
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        executed = true;
        return { success: true, durationMs: 0 };
      }
    };

    registry.register(restrictedTool);

    const result = await bus.execute('restricted.operation', {}, context);
    assert.equal(result.success, false);
    assert.equal(executed, false, 'Denied tool must NEVER execute');
    assert.ok(result.error?.includes('Execution Denied'));

    // Check audit log recorded denial
    const records = audit.listRecords({ toolId: 'restricted.operation' });
    assert.equal(records.length, 1);
    assert.equal(records[0].permissionDecision, 'DENY');
    assert.equal(records[0].executionStatus, 'denied');
  });

  test('CRITICAL SECURITY: ToolExecutionBus must halt Tier 3 and Tier 4 actions without approval', async () => {
    const registry = new ToolRegistry();
    const permissions = new PermissionManager();
    const audit = new ToolAuditManager();
    const bus = new ToolExecutionBus(registry, permissions, audit);

    let tier3Executed = false;
    let tier4Executed = false;

    const tier3Tool: ITool = {
      id: 'system.deleteFile',
      name: 'Delete File',
      description: 'Deletes file',
      version: '1.0.0',
      category: 'custom',
      riskLevel: DangerTier.TIER_3,
      requiresApproval: true,
      capabilities: ['delete'],
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        tier3Executed = true;
        return { success: true, durationMs: 0 };
      }
    };

    const tier4Tool: ITool = {
      id: 'system.reconfigureSecurity',
      name: 'Reconfigure Security',
      description: 'Modifies auth',
      version: '1.0.0',
      category: 'custom',
      riskLevel: DangerTier.TIER_4,
      requiresApproval: true,
      capabilities: ['admin'],
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        tier4Executed = true;
        return { success: true, durationMs: 0 };
      }
    };

    registry.register(tier3Tool);
    registry.register(tier4Tool);

    // Attempt Tier 3 without approval
    const res3 = await bus.execute('system.deleteFile', {}, context);
    assert.equal(res3.success, false);
    assert.equal(tier3Executed, false, 'Tier 3 tool must NOT execute without approval');
    assert.ok(res3.error?.includes('requires human authorization'));

    // Attempt Tier 4 without approval
    const res4 = await bus.execute('system.reconfigureSecurity', {}, context);
    assert.equal(res4.success, false);
    assert.equal(tier4Executed, false, 'Tier 4 tool must NOT execute without approval');
    assert.ok(res4.error?.includes('requires human authorization'));

    // Verify approval requests exist
    const pending = permissions.getPendingApprovals();
    assert.equal(pending.length, 2);
  });

  test('CRITICAL SECURITY: ToolAuditManager must redact passwords, tokens, and credentials from audit records', () => {
    const audit = new ToolAuditManager();

    const sensitiveInput = {
      username: 'rushikesh',
      password: 'SuperSecretPassword123!',
      apiKey: 'sk-proj-1234567890abcdefghijklmnop',
      authorizationHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      cookie: 'session_id=abc123secret',
      nested: {
        token: 'ghp_secretToken12345'
      },
      normalParam: 'hello_world'
    };

    const record = audit.record({
      requestId: 'req_sec_audit',
      toolId: 'test.tool',
      rawInput: sensitiveInput,
      riskLevel: DangerTier.TIER_1,
      permissionDecision: 'ALLOW',
      executionStatus: 'success',
      durationMs: 5,
      userId: 'ROOT_RUSHIKESH'
    });

    const summary = record.inputSummary as Record<string, unknown>;
    assert.equal(summary.password, '[REDACTED]');
    assert.equal(summary.apiKey, '[REDACTED]');
    assert.equal(summary.cookie, '[REDACTED]');
    assert.equal((summary.nested as any)?.token, '[REDACTED]');
    assert.equal(summary.normalParam, 'hello_world');
  });
});
