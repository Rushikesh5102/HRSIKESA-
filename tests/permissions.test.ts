import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';
import { ITool } from '../src/tools/interfaces/tool.types.js';
import { ToolExecutionContext } from '../src/tools/interfaces/execution.types.js';

describe('Permission & Human Approval Subsystem', () => {
  const workspaceRoot = path.resolve(process.cwd());

  const context: ToolExecutionContext = {
    requestId: 'req_test_1',
    userId: 'ROOT_RUSHIKESH',
    environment: 'development',
    workspaceRoot
  };

  const harmlessTool: ITool = {
    id: 'test.read',
    name: 'Read Tool',
    description: 'Harmless read',
    version: '1.0.0',
    category: 'system',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['read'],
    inputSchema: { type: 'object', properties: {} },
    execute: async () => ({ success: true, durationMs: 0 })
  };

  const dangerousTool: ITool = {
    id: 'test.dangerous',
    name: 'Dangerous Action',
    description: 'Deletes system files',
    version: '1.0.0',
    category: 'custom',
    riskLevel: DangerTier.TIER_3,
    requiresApproval: true,
    capabilities: ['delete'],
    inputSchema: { type: 'object', properties: {} },
    execute: async () => ({ success: true, durationMs: 0 })
  };

  test('should allow Tier 0 autonomous tool execution', () => {
    const pm = new PermissionManager();
    const result = pm.evaluate(harmlessTool, {}, context);

    assert.equal(result.decision, 'ALLOW');
    assert.equal(result.requiresApproval, false);
  });

  test('should deny execution of explicitly blocked tools', () => {
    const pm = new PermissionManager({
      blockedTools: ['test.read']
    });
    const result = pm.evaluate(harmlessTool, {}, context);

    assert.equal(result.decision, 'DENY');
    assert.ok(result.reason.includes('explicitly blocked'));
  });

  test('should require human approval for Tier 3 actions and manage approval flow', () => {
    const pm = new PermissionManager();
    const result = pm.evaluate(dangerousTool, {}, context);

    assert.equal(result.decision, 'REQUIRE_APPROVAL');
    assert.equal(result.requiresApproval, true);
    assert.ok(result.approvalRequest);

    const approvalId = result.approvalRequest?.id;
    assert.ok(approvalId);

    // Verify pending approvals list
    const pending = pm.getPendingApprovals();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, approvalId);

    // Human operator approves request
    const approved = pm.approve(approvalId!, 'ROOT_RUSHIKESH');
    assert.equal(approved.status, 'approved');
    assert.equal(approved.resolvedBy, 'ROOT_RUSHIKESH');

    // Re-evaluate with approved ID -> ALLOW
    const evalWithApproval = pm.evaluate(dangerousTool, {}, {
      ...context,
      approvalId
    });
    assert.equal(evalWithApproval.decision, 'ALLOW');
  });

  test('should deny execution if human operator rejects approval request', () => {
    const pm = new PermissionManager();
    const result = pm.evaluate(dangerousTool, {}, context);
    const approvalId = result.approvalRequest!.id;

    // Reject request
    const rejected = pm.reject(approvalId, 'Too risky for current environment', 'ROOT_RUSHIKESH');
    assert.equal(rejected.status, 'rejected');

    // Re-evaluate with rejected ID -> DENY
    const evalWithApproval = pm.evaluate(dangerousTool, {}, {
      ...context,
      approvalId
    });
    assert.equal(evalWithApproval.decision, 'DENY');
    assert.ok(evalWithApproval.reason.includes('rejected'));
  });

  test('should validate workspace boundary and reject traversal attempts', () => {
    const pm = new PermissionManager({
      allowedWorkspaceRoots: [workspaceRoot]
    });

    // Valid path inside workspace
    const validCheck = pm.validateWorkspaceBoundary('src/index.ts', workspaceRoot);
    assert.equal(validCheck.allowed, true);

    // Path traversal outside workspace
    const traversalCheck = pm.validateWorkspaceBoundary('../../Windows/System32', workspaceRoot);
    assert.equal(traversalCheck.allowed, false);
    assert.ok(traversalCheck.reason.includes('outside authorized workspace'));
  });
});
