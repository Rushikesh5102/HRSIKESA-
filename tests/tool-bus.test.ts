import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';
import { ITool } from '../src/tools/interfaces/tool.types.js';

describe('Tool Execution Bus Subsystem', () => {
  const sampleTool: ITool = {
    id: 'math.add',
    name: 'Add Numbers',
    description: 'Adds two numbers together',
    version: '1.0.0',
    category: 'custom',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['math.add'],
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' }
      },
      required: ['a', 'b']
    },
    execute: async (input: { a: number; b: number }) => ({
      success: true,
      output: input.a + input.b,
      durationMs: 1
    })
  };

  test('should validate input schema and reject invalid or missing fields', async () => {
    const registry = new ToolRegistry();
    registry.register(sampleTool);
    const bus = new ToolExecutionBus(registry, new PermissionManager(), new ToolAuditManager());

    // Missing required field 'b'
    const res1 = await bus.execute('math.add', { a: 10 });
    assert.equal(res1.success, false);
    assert.ok(res1.error?.includes("Missing required parameter 'b'"));

    // Wrong type: 'a' is a string instead of number
    const res2 = await bus.execute('math.add', { a: 'not-a-number', b: 5 });
    assert.equal(res2.success, false);
    assert.ok(res2.error?.includes("Parameter 'a' must be a number"));
  });

  test('should execute tool and record audit entry upon success', async () => {
    const registry = new ToolRegistry();
    registry.register(sampleTool);
    const audit = new ToolAuditManager();
    const bus = new ToolExecutionBus(registry, new PermissionManager(), audit);

    const res = await bus.execute('math.add', { a: 15, b: 27 });
    assert.equal(res.success, true);
    assert.equal(res.output, 42);
    assert.ok(res.auditRecordId);

    const records = audit.listRecords({ toolId: 'math.add' });
    assert.equal(records.length, 1);
    assert.equal(records[0].executionStatus, 'success');
  });

  test('should catch tool execution exceptions, log audit failure, and return structured error', async () => {
    const explodingTool: ITool = {
      id: 'faulty.operation',
      name: 'Faulty Tool',
      description: 'Throws error',
      version: '1.0.0',
      category: 'custom',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['fault'],
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        throw new Error('Simulated internal hardware fault');
      }
    };

    const registry = new ToolRegistry();
    registry.register(explodingTool);
    const audit = new ToolAuditManager();
    const bus = new ToolExecutionBus(registry, new PermissionManager(), audit);

    const res = await bus.execute('faulty.operation', {});
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Simulated internal hardware fault'));

    const records = audit.listRecords({ toolId: 'faulty.operation' });
    assert.equal(records.length, 1);
    assert.equal(records[0].executionStatus, 'failed');
  });

  test('should reject execution of unregistered tools', async () => {
    const bus = new ToolExecutionBus(new ToolRegistry(), new PermissionManager(), new ToolAuditManager());
    const res = await bus.execute('non.existent.tool', {});

    assert.equal(res.success, false);
    assert.ok(res.error?.includes('not registered'));
  });
});
