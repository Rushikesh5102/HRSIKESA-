/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Client Service
 *
 * Phase 21: High-level MCP client executing protocol handshakes, capability
 * enumeration, bounded tool invocations, and health checks.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { IMcpTransport } from './mcp-transport.factory.js';
import {
  MCPServer,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPCallResult,
  MCPToolContentItem,
} from '../interfaces/mcp.types.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';

export class MCPClientService {
  private readonly server: MCPServer;
  private readonly transport: IMcpTransport;
  private readonly logger?: ILogger;
  private serverInfo?: { name: string; version: string };
  private reqId = 1;

  constructor(serverOrTransport: MCPServer | IMcpTransport, transportOrLogger?: IMcpTransport | ILogger, logger?: ILogger) {
    if ('send' in serverOrTransport && 'connect' in serverOrTransport) {
      this.transport = serverOrTransport as IMcpTransport;
      this.server = {
        id: 'direct-client',
        name: 'DirectMCPClient',
        displayName: 'Direct MCP Client',
        description: 'Direct Transport Client',
        version: '1.0.0',
        transport: 'in-memory',
        status: 'AUTHORIZED',
        trustLevel: 'TRUSTED',
        source: 'LOCAL',
        license: 'MIT',
        enabled: true,
        authorized: true,
        health: 'HEALTHY',
        restartCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.logger = (transportOrLogger as ILogger)?.child('MCPClient:Direct');
    } else {
      this.server = serverOrTransport as MCPServer;
      this.transport = transportOrLogger as IMcpTransport;
      this.logger = logger?.child(`MCPClient:${this.server.name}`);
    }
  }

  public isConnected(): boolean {
    return this.transport.isConnected();
  }

  public async connect(): Promise<void> {
    if (!this.transport.isConnected()) {
      await this.transport.connect();
    }

    // Protocol Handshake
    const initRes = await this.transport.send({
      jsonrpc: '2.0',
      id: this.reqId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        clientInfo: {
          name: 'HṚṢĪKEŚA',
          version: '0.2.0',
        },
      },
    });

    if (initRes.error) {
      throw new Error(`MCP initialize failed on server '${this.server.name}': ${initRes.error.message}`);
    }

    this.serverInfo = (initRes.result as any)?.serverInfo || { name: this.server.name, version: this.server.version };
    this.logger?.info(`Connected to MCP server: ${this.serverInfo?.name} (v${this.serverInfo?.version})`);
  }

  public async initialize(_clientName = 'HṚṢĪKEŚA', _version = '1.0.0'): Promise<{ serverName: string; version: string }> {
    await this.connect();
    return {
      serverName: this.serverInfo?.name || this.server.name,
      version: this.serverInfo?.version || this.server.version || '1.0.0',
    };
  }

  public async listTools(): Promise<MCPTool[]> {
    const res = await this.transport.send({
      jsonrpc: '2.0',
      id: this.reqId++,
      method: 'tools/list',
      params: {},
    });

    if (res.error) {
      throw new Error(`Failed to list tools from MCP server '${this.server.name}': ${res.error.message}`);
    }

    const rawTools = (res.result as any)?.tools || [];
    const now = new Date().toISOString();

    return rawTools.map((raw: any) => {
      const name = String(raw.name);
      return {
        id: `mcp.${this.server.id}.${name}`,
        serverId: this.server.id,
        name,
        displayName: raw.displayName || `MCP [${this.server.displayName || this.server.name}]: ${name}`,
        description: raw.description || `External MCP tool '${name}' provided by server '${this.server.name}'.`,
        inputSchema: raw.inputSchema || { type: 'object', properties: {} },
        outputSchema: raw.outputSchema || {},
        riskLevel: raw.riskLevel || DangerTier.TIER_1,
        requiredPermissions: raw.requiredPermissions || [`mcp.${this.server.name}`],
        networkRequirement: raw.networkRequirement || 'NONE',
        filesystemRequirement: raw.filesystemRequirement || 'NONE',
        credentialRequirement: raw.credentialRequirement || 'NONE',
        enabled: true,
        verified: true,
        isDestructive: Boolean(raw.isDestructive),
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  public async listResources(): Promise<MCPResource[]> {
    try {
      const res = await this.transport.send({
        jsonrpc: '2.0',
        id: this.reqId++,
        method: 'resources/list',
        params: {},
      });

      if (res.error) return [];

      const rawResources = (res.result as any)?.resources || [];
      const now = new Date().toISOString();

      return rawResources.map((raw: any) => ({
        id: `mcp.${this.server.id}.res.${raw.name || raw.uri}`,
        serverId: this.server.id,
        uri: String(raw.uri),
        name: String(raw.name || raw.uri),
        description: raw.description,
        mimeType: raw.mimeType || 'text/plain',
        sensitivity: raw.sensitivity || 'INTERNAL',
        accessPolicy: raw.accessPolicy || {},
        createdAt: now,
        updatedAt: now,
      }));
    } catch {
      return []; // Optional primitive
    }
  }

  public async listPrompts(): Promise<MCPPrompt[]> {
    try {
      const res = await this.transport.send({
        jsonrpc: '2.0',
        id: this.reqId++,
        method: 'prompts/list',
        params: {},
      });

      if (res.error) return [];

      const rawPrompts = (res.result as any)?.prompts || [];
      const now = new Date().toISOString();

      return rawPrompts.map((raw: any) => ({
        id: `mcp.${this.server.id}.prompt.${raw.name}`,
        serverId: this.server.id,
        name: String(raw.name),
        description: raw.description,
        arguments: raw.arguments || [],
        riskLevel: raw.riskLevel || 'LOW',
        createdAt: now,
        updatedAt: now,
      }));
    } catch {
      return []; // Optional primitive
    }
  }

  public async callTool(
    toolName: string,
    args: Record<string, unknown> = {},
    timeoutMs?: number
  ): Promise<MCPCallResult> {
    const start = Date.now();
    try {
      const sendPromise = this.transport.send({
        jsonrpc: '2.0',
        id: this.reqId++,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      });

      const res = timeoutMs
        ? await Promise.race([
            sendPromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`MCP tool call '${toolName}' timed out after ${timeoutMs}ms.`)), timeoutMs)
            ),
          ])
        : await sendPromise;

      const latencyMs = Date.now() - start;

      if (res.error) {
        return {
          success: false,
          content: [{ type: 'text', text: res.error.message }],
          isError: true,
          error: res.error.message,
          latencyMs,
        };
      }

      const result = (res.result as any) || {};
      const rawContent: any[] = result.content || [];

      // Truncate output if exceeding 1MB
      const content: MCPToolContentItem[] = rawContent.map((item) => {
        if (item.type === 'text' && typeof item.text === 'string' && item.text.length > 1024 * 1024) {
          return {
            type: 'text',
            text: item.text.slice(0, 1024 * 1024) + '\n... [MCP OUTPUT TRUNCATED AT 1MB LIMIT]',
          };
        }
        return item;
      });

      return {
        success: !result.isError,
        content,
        isError: Boolean(result.isError),
        error: result.isError ? content.map((c) => c.text).filter(Boolean).join('\n') : undefined,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        success: false,
        content: [{ type: 'text', text: err.message }],
        isError: true,
        error: err.message,
        latencyMs,
      };
    }
  }

  public async ping(): Promise<boolean> {
    try {
      const res = await this.transport.send({
        jsonrpc: '2.0',
        id: this.reqId++,
        method: 'ping',
        params: {},
      });
      return !res.error;
    } catch {
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    await this.transport.close();
  }

  public getServerInfo(): { name: string; version: string } | undefined {
    return this.serverInfo;
  }
}
