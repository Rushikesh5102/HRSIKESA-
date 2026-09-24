/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Capability & Tool Adapter
 *
 * Phase 21: Adapts dynamic MCP tools into vendor-neutral ITool instances registered
 * with ToolRegistry, executing strictly through ToolExecutionBus and PermissionManager.
 */

import { ITool } from '../../tools/interfaces/tool.types.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../../tools/interfaces/execution.types.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { MCPTool, MCPServer } from '../interfaces/mcp.types.js';
import { MCPProcessManager } from './mcp-process-manager.service.js';
import { MCPToolRepository } from '../repositories/mcp-tool.repository.js';
import { MCPServerRepository } from '../repositories/mcp-server.repository.js';
import { ToolRegistry } from '../../tools/registry/tool.registry.js';
import { CapabilityRegistry } from '../../capabilities/registry/capability.registry.js';

export class MCPCapabilityAdapter {
  private readonly processManager: MCPProcessManager;
  private readonly toolRepo: MCPToolRepository;
  private readonly serverRepo: MCPServerRepository;
  private readonly toolRegistry?: ToolRegistry;
  private readonly capabilityRegistry?: CapabilityRegistry;
  private readonly logger?: ILogger;

  constructor(
    processManager: MCPProcessManager,
    toolRepo: MCPToolRepository,
    serverRepo: MCPServerRepository,
    toolRegistry?: ToolRegistry,
    capabilityRegistry?: CapabilityRegistry,
    logger?: ILogger
  ) {
    this.processManager = processManager;
    this.toolRepo = toolRepo;
    this.serverRepo = serverRepo;
    this.toolRegistry = toolRegistry;
    this.capabilityRegistry = capabilityRegistry;
    this.logger = logger?.child('MCPCapabilityAdapter');
  }

  /**
   * Adapts an MCPTool into a standard ITool instance.
   */
  public adaptTool(tool: MCPTool, server: MCPServer): ITool {
    const processMgr = this.processManager;
    const toolRepository = this.toolRepo;
    const serverRepository = this.serverRepo;
    const log = this.logger;

    const toolId = tool.id;
    const capabilities = [`mcp.${server.name}.${tool.name}`, `mcp.${server.name}`, ...tool.requiredPermissions];

    return {
      id: toolId,
      name: tool.displayName || `MCP [${server.displayName || server.name}]: ${tool.name}`,
      description: tool.description,
      version: server.version || '1.0.0',
      category: 'mcp',
      riskLevel: (typeof tool.riskLevel === 'number' && (tool.riskLevel in DangerTier)) ? tool.riskLevel : DangerTier.TIER_1,
      requiresApproval: tool.riskLevel === DangerTier.TIER_3 || tool.riskLevel === DangerTier.TIER_4 || tool.isDestructive,
      capabilities,
      inputSchema: {
        type: 'object',
        properties: (tool.inputSchema && typeof tool.inputSchema === 'object' && (tool.inputSchema as any).properties)
          ? (tool.inputSchema as any).properties
          : {},
        ...(tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : {}),
      } as unknown as JsonSchemaObject,
      outputSchema: (tool.outputSchema && typeof tool.outputSchema === 'object' && (tool.outputSchema as any).type === 'object')
        ? (tool.outputSchema as unknown as JsonSchemaObject)
        : undefined,

      async execute(input: Record<string, unknown>, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> {
        const currentServer = serverRepository.findById(server.id);
        if (!currentServer || !currentServer.authorized || !currentServer.enabled) {
          return {
            success: false,
            error: `MCP server '${server.name}' is not authorized or is disabled.`,
            durationMs: 0,
          };
        }

        const currentTool = toolRepository.findToolById(tool.id);
        if (currentTool && !currentTool.enabled) {
          return {
            success: false,
            error: `MCP tool '${tool.name}' is disabled by policy.`,
            durationMs: 0,
          };
        }

        try {
          const { client } = await processMgr.startServer(currentServer);
          const callResult = await client.callTool(tool.name, input);

          toolRepository.recordExecution(server.id, tool.id, callResult.success, callResult.latencyMs, callResult.error);

          if (!callResult.success || callResult.isError) {
            return {
              success: false,
              error: callResult.error || 'MCP tool execution failed.',
              output: callResult.content,
              durationMs: callResult.latencyMs,
            };
          }

          // Extract text or structured output from content array
          let outputValue: unknown = callResult.content;
          if (callResult.content.length === 1 && callResult.content[0].type === 'text') {
            const txt = callResult.content[0].text || '';
            try {
              outputValue = JSON.parse(txt);
            } catch {
              outputValue = txt;
            }
          }

          return {
            success: true,
            output: outputValue,
            durationMs: callResult.latencyMs,
          };
        } catch (err: any) {
          toolRepository.recordExecution(server.id, tool.id, false, 0, err.message);
          log?.error(`Execution error for MCP tool '${toolId}': ${err.message}`);
          return {
            success: false,
            error: `MCP tool execution failed: ${err.message}`,
            durationMs: 0,
          };
        }
      },
    };
  }

  /**
   * Registers an MCP tool with ToolRegistry and CapabilityRegistry.
   */
  public registerWithEcosystem(tool: MCPTool, server: MCPServer): void {
    const adapted = this.adaptTool(tool, server);

    if (this.toolRegistry) {
      if (this.toolRegistry.has(adapted.id)) {
        this.toolRegistry.unregister(adapted.id);
      }
      this.toolRegistry.register(adapted);
    }

    if (this.capabilityRegistry) {
      const capId = `mcp.${server.name}.${tool.name}`;
      const adapter = {
        getMetadata: () => ({
          id: capId,
          name: tool.displayName || tool.name,
          description: tool.description,
          category: 'mcp' as const,
          provider: `MCP Server: ${server.displayName || server.name}`,
          source: 'mcp' as const,
          version: server.version || '1.0.0',
          license: server.license || 'UNKNOWN',
          runtimeType: 'mcp' as const,
          supportedPlatforms: ['win32', 'linux', 'darwin'] as ('win32' | 'linux' | 'darwin')[],
          requiredPermissions: tool.requiredPermissions || [],
          riskLevel: (tool.riskLevel === DangerTier.TIER_0 ? 'LOW' : tool.riskLevel === DangerTier.TIER_1 ? 'MEDIUM' : tool.riskLevel === DangerTier.TIER_2 ? 'HIGH' : 'CRITICAL') as any,
          dependencies: [],
          enabled: tool.enabled && server.enabled && server.authorized,
          securityStatus: (server.authorized ? 'VERIFIED' : 'UNVERIFIED') as any,
        }),
        checkHealth: async () => ({
          status: (server.health === 'HEALTHY' ? 'HEALTHY' : server.health === 'DEGRADED' ? 'DEGRADED' : 'UNAVAILABLE') as any,
          message: `MCP Server ${server.name} status: ${server.status}`,
          latencyMs: 0,
          lastCheckedAt: new Date().toISOString(),
        }),
        execute: async (req: any) => {
          const res = await adapted.execute(req.parameters || req.input || {}, { sessionId: req.sessionId || 'anonymous' } as any);
          return {
            capabilityId: capId,
            success: res.success,
            output: res.output,
            error: res.error,
            executionTimeMs: res.durationMs,
          };
        },
      };

      this.capabilityRegistry.register(adapter);
    }

    this.logger?.info(`Registered adapted MCP tool '${adapted.id}' in ToolRegistry and CapabilityRegistry`);
  }
}
