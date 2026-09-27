/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Client Adapter
 * 
 * Bridges external Model Context Protocol (MCP) servers into
 * HṚṢĪKEŚA's standardized tool registry and permission bus.
 */

import { randomUUID } from 'node:crypto';
import { IMcpTransport } from './mcp.transport.js';
import {
  McpServerConfig,
  McpToolDefinition,
  McpInitializeParams,
  McpInitializeResult,
  McpToolsListResult,
  McpCallToolParams,
  McpCallToolResult
} from './mcp.types.js';
import { ITool } from '../interfaces/tool.types.js';
import { DangerTier, requiresHumanApproval } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../interfaces/execution.types.js';
import { ToolRegistry } from '../registry/tool.registry.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class McpClientAdapter {
  private readonly config: McpServerConfig;
  private readonly transport: IMcpTransport;
  private readonly logger?: ILogger;
  private initialized = false;
  private remoteServerInfo?: { name: string; version: string };

  constructor(config: McpServerConfig, transport: IMcpTransport, logger?: ILogger) {
    this.config = config;
    this.transport = transport;
    this.logger = logger?.child(`McpAdapter:${config.id}`);
  }

  /**
   * Connect to the MCP server, perform protocol handshake, and return normalized tools.
   */
  public async initialize(): Promise<readonly ITool[]> {
    this.logger?.info(`Connecting to MCP server '${this.config.name}' (${this.config.transport})...`);
    await this.transport.connect();

    // 1. Initialize Handshake
    const initReq = {
      jsonrpc: '2.0' as const,
      id: `init_${Date.now()}`,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: {
          name: 'HṚṢĪKEŚA',
          version: '0.2.0'
        }
      } as McpInitializeParams
    };

    const initRes = await this.transport.send<McpInitializeParams, McpInitializeResult>(initReq);
    if (initRes.error) {
      throw new Error(`MCP initialize failed on server '${this.config.id}': ${initRes.error.message}`);
    }

    this.remoteServerInfo = initRes.result?.serverInfo;
    this.logger?.info(`Connected to MCP server: ${this.remoteServerInfo?.name || this.config.id} (v${this.remoteServerInfo?.version || '1.0.0'})`);

    // 2. Send initialized notification
    await this.transport.send({
      jsonrpc: '2.0',
      id: `notif_${Date.now()}`,
      method: 'notifications/initialized'
    });

    this.initialized = true;

    // 3. Discover remote tools
    return this.discoverTools();
  }

  /**
   * Fetch available tools from the MCP server and normalize to HṚṢĪKEŚA tool interface.
   */
  public async discoverTools(): Promise<readonly ITool[]> {
    if (!this.initialized) {
      throw new Error(`Cannot discover tools: MCP adapter '${this.config.id}' is not initialized.`);
    }

    const listRes = await this.transport.send<Record<string, unknown>, McpToolsListResult>({
      jsonrpc: '2.0',
      id: `tools_${Date.now()}`,
      method: 'tools/list'
    });

    if (listRes.error) {
      throw new Error(`Failed to list tools from MCP server '${this.config.id}': ${listRes.error.message}`);
    }

    const rawTools = listRes.result?.tools || [];
    this.logger?.info(`Discovered ${rawTools.length} tools from MCP server '${this.config.id}'.`);

    return rawTools.map((raw) => this.normalizeTool(raw));
  }

  /**
   * Normalize an external MCP tool definition to the vendor-neutral ITool interface.
   */
  public normalizeTool(raw: McpToolDefinition): ITool {
    const adapter = this;
    const toolId = `mcp.${this.config.id}.${raw.name}`;
    const riskLevel = this.config.defaultRiskLevel ?? DangerTier.TIER_1;
    const inputSchema: JsonSchemaObject = (raw.inputSchema && raw.inputSchema.type === 'object')
      ? raw.inputSchema
      : { type: 'object', properties: {} };

    return {
      id: toolId,
      name: `MCP [${this.config.name}]: ${raw.name}`,
      description: raw.description || `External MCP tool '${raw.name}' provided by server '${this.config.name}'.`,
      version: '1.0.0',
      category: 'mcp',
      riskLevel,
      requiresApproval: requiresHumanApproval(riskLevel),
      capabilities: ['mcp.tool', `mcp.${this.config.id}`],
      inputSchema,
      async execute(
        input: Record<string, unknown>,
        _context: ToolExecutionContext
      ): Promise<ToolExecutionResult> {
        return adapter.callRemoteTool(raw.name, input);
      }
    };
  }

  /**
   * Execute remote tool call over transport.
   */
  public async callRemoteTool(
    remoteToolName: string,
    args: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const callRes = await this.transport.send<McpCallToolParams, McpCallToolResult>({
        jsonrpc: '2.0',
        id: `call_${Date.now()}_${randomUUID().substring(0, 6)}`,
        method: 'tools/call',
        params: {
          name: remoteToolName,
          arguments: args
        }
      });

      const durationMs = Date.now() - startTime;

      if (callRes.error) {
        return {
          success: false,
          error: `MCP server error: ${callRes.error.message}`,
          durationMs
        };
      }

      const result = callRes.result;
      if (!result) {
        return { success: true, output: null, durationMs };
      }

      if (result.isError) {
        const errText = result.content?.map((c) => c.text).filter(Boolean).join('\n') || 'Unknown MCP tool error';
        return {
          success: false,
          error: errText,
          durationMs
        };
      }

      // Format response text or data
      const textOutput = result.content?.map((c) => c.text).filter(Boolean).join('\n');
      return {
        success: true,
        output: textOutput || result.content,
        durationMs
      };
    } catch (err) {
      return {
        success: false,
        error: `MCP transport call failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - startTime
      };
    }
  }

  /**
   * Register all discovered tools into the centralized ToolRegistry.
   */
  public async registerToolsWith(registry: ToolRegistry): Promise<readonly ITool[]> {
    const tools = await this.initialize();
    for (const tool of tools) {
      registry.register(tool);
    }
    return tools;
  }

  public async close(): Promise<void> {
    await this.transport.close();
    this.initialized = false;
  }

  public isConnected(): boolean {
    return this.transport.isConnected();
  }

  public getServerInfo(): { name: string; version: string } | undefined {
    return this.remoteServerInfo;
  }
}
