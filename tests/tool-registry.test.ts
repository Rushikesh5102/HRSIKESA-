import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';
import { ITool } from '../src/tools/interfaces/tool.types.js';

describe('Tool Registry Subsystem', () => {
  const dummyTool: ITool = {
    id: 'test.dummy',
    name: 'Dummy Tool',
    description: 'A tool for testing the registry.',
    version: '1.0.0',
    category: 'custom',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['test.dummy', 'testing'],
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Test message' }
      },
      required: ['message']
    },
    execute: async (input) => ({
      success: true,
      output: `Echo: ${input.message}`,
      durationMs: 1
    })
  };

  test('should register and retrieve tools by ID', () => {
    const registry = new ToolRegistry();
    registry.register(dummyTool);

    assert.equal(registry.has('test.dummy'), true);
    const retrieved = registry.get('test.dummy');
    assert.ok(retrieved);
    assert.equal(retrieved?.name, 'Dummy Tool');
    assert.equal(registry.list().length, 1);
  });

  test('should prevent duplicate tool IDs', () => {
    const registry = new ToolRegistry();
    registry.register(dummyTool);

    assert.throws(
      () => registry.register(dummyTool),
      /duplicate tool id 'test\.dummy' is already registered/
    );
  });

  test('should reject invalid tool definitions', () => {
    const registry = new ToolRegistry();

    // Invalid ID characters
    assert.throws(
      () => registry.register({ ...dummyTool, id: 'bad ID with spaces' }),
      /invalid tool id/
    );

    // Empty name
    assert.throws(
      () => registry.register({ ...dummyTool, id: 'valid.id', name: '' }),
      /must have a non-empty name/
    );

    // Missing input schema
    assert.throws(
      () => registry.register({ ...dummyTool, id: 'valid.id', inputSchema: undefined as any }),
      /must define an inputSchema/
    );
  });

  test('should find tools by capability, category, and risk tier', () => {
    const registry = new ToolRegistry();
    registry.register(dummyTool);

    const highRiskTool: ITool = {
      ...dummyTool,
      id: 'test.dangerous',
      name: 'Dangerous Tool',
      riskLevel: DangerTier.TIER_3,
      capabilities: ['dangerous.action']
    };
    registry.register(highRiskTool);

    // Capability search
    const testTools = registry.findByCapability('testing');
    assert.equal(testTools.length, 1);
    assert.equal(testTools[0].id, 'test.dummy');

    // Risk search
    const tier0Tools = registry.findByRisk(DangerTier.TIER_0);
    assert.equal(tier0Tools.length, 1);
    assert.equal(tier0Tools[0].id, 'test.dummy');

    const allRiskTools = registry.findByRisk(DangerTier.TIER_4);
    assert.equal(allRiskTools.length, 2);

    // Category search
    const customTools = registry.findByCategory('custom');
    assert.equal(customTools.length, 2);
  });

  test('should report accurate diagnostics and handle unregister', () => {
    const registry = new ToolRegistry();
    registry.register(dummyTool);

    const diag = registry.getDiagnostics();
    assert.equal(diag.totalRegistered, 1);
    assert.equal(diag.byCategory.custom, 1);
    assert.equal(diag.byRisk.TIER_0, 1);

    const removed = registry.unregister('test.dummy');
    assert.equal(removed, true);
    assert.equal(registry.has('test.dummy'), false);
    assert.equal(registry.list().length, 0);
  });
});
