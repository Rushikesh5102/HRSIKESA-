import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMcpTransport } from '../src/tools/mcp/mcp.transport.js';
import { McpClientAdapter } from '../src/tools/mcp/mcp.adapter.js';
import { McpServerConfig } from '../src/tools/mcp/mcp.types.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';

describe('Model Context Protocol (MCP) Adapter Subsystem', () => {
  // Mock MCP Server via InMemoryMcpTransport
  function createMockMcpTransport(): InMemoryMcpTransport {
    return new InMemoryMcpTransport(async (req) => {
      if (req.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'MockSearchServer',
              version: '1.2.0'
            }
          }
        };
      }

      if (req.method === 'notifications/initialized') {
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {}
        };
      }

      if (req.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            tools: [
              {
                name: 'search_knowledge',
                description: 'Search internal documentation',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search term' }
                  },
                  required: ['query']
                }
              }
            ]
          }
        };
      }

      if (req.method === 'tools/call') {
        const params = req.params as { name: string; arguments?: { query?: string } };
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Results for query: ${params?.arguments?.query || 'none'}`
              }
            ],
            isError: false
          }
        };
      }

      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32601, message: `Method not found: ${req.method}` }
      };
    });
  }

  const serverConfig: McpServerConfig = {
    id: 'knowledge_mcp',
    name: 'Knowledge MCP Server',
    transport: 'in-memory',
    defaultRiskLevel: DangerTier.TIER_1
  };

  test('should connect, initialize protocol handshake, and discover normalized tools', async () => {
    const transport = createMockMcpTransport();
    const adapter = new McpClientAdapter(serverConfig, transport);

    const tools = await adapter.initialize();
    assert.equal(tools.length, 1);

    const tool = tools[0];
    assert.equal(tool.id, 'mcp.knowledge_mcp.search_knowledge');
    assert.equal(tool.name, 'MCP [Knowledge MCP Server]: search_knowledge');
    assert.equal(tool.category, 'mcp');
    assert.equal(tool.riskLevel, DangerTier.TIER_1);
    assert.equal(adapter.isConnected(), true);
    assert.equal(adapter.getServerInfo()?.name, 'MockSearchServer');

    await adapter.close();
    assert.equal(adapter.isConnected(), false);
  });

  test('should execute MCP tool calls over transport', async () => {
    const transport = createMockMcpTransport();
    const adapter = new McpClientAdapter(serverConfig, transport);
    const tools = await adapter.initialize();

    const tool = tools[0];
    const res = await tool.execute({ query: 'HṚṢĪKEŚA architecture' }, {
      requestId: 'req_mcp_1',
      userId: 'ROOT_RUSHIKESH',
      environment: 'test',
      workspaceRoot: process.cwd()
    });

    assert.equal(res.success, true);
    assert.equal(res.output, 'Results for query: HṚṢĪKEŚA architecture');

    await adapter.close();
  });

  test('should register into ToolRegistry and route through ToolExecutionBus with permissions', async () => {
    const transport = createMockMcpTransport();
    const adapter = new McpClientAdapter(serverConfig, transport);

    const registry = new ToolRegistry();
    const permissions = new PermissionManager();
    const audit = new ToolAuditManager();
    const bus = new ToolExecutionBus(registry, permissions, audit);

    // Register discovered MCP tools into central registry
    await adapter.registerToolsWith(registry);
    assert.equal(registry.has('mcp.knowledge_mcp.search_knowledge'), true);

    // Execute via ToolExecutionBus
    const busResult = await bus.execute('mcp.knowledge_mcp.search_knowledge', {
      query: 'sovereignty'
    });

    assert.equal(busResult.success, true);
    assert.equal(busResult.output, 'Results for query: sovereignty');

    // Verify audit log captured MCP execution
    const auditRecords = audit.listRecords({ toolId: 'mcp.knowledge_mcp.search_knowledge' });
    assert.equal(auditRecords.length, 1);
    assert.equal(auditRecords[0].executionStatus, 'success');

    await adapter.close();
  });
});
