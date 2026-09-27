/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Provider Adapter
 *
 * FP-12: Adapter for authenticated Model Context Protocol (MCP) servers.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  ServiceProvider,
  ServiceAccount,
  AccountHealth,
  ProviderOperationResult,
} from '../types/account.types.js';
import { IProviderAdapter, ProviderInvokeOptions } from './provider.adapter.interface.js';

export class McpProviderAdapter implements IProviderAdapter {
  public readonly providerId = 'mcp_server';

  public readonly providerDefinition: ServiceProvider = {
    id: 'mcp_server',
    name: 'mcp_server',
    displayName: 'MCP Server',
    description: 'Connects authenticated Model Context Protocol (MCP) servers exposing specialized capabilities.',
    category: 'CUSTOM',
    authMethods: ['API_KEY', 'CUSTOM_HEADER'],
    status: 'ENABLED',
    documentationUrl: 'https://modelcontextprotocol.io',
    supportedScopes: [
      {
        scope: 'tools.call',
        description: 'Call tools exposed by the MCP server',
        riskLevel: 'MEDIUM',
        required: true,
        grantedCapabilities: ['mcp.tool.invoke'],
      },
      {
        scope: 'resources.read',
        description: 'Read resources provided by the MCP server',
        riskLevel: 'LOW',
        required: false,
        grantedCapabilities: ['mcp.resource.read'],
      },
    ],
    capabilities: [
      {
        id: 'mcp.tool.invoke',
        name: 'Invoke MCP Tool',
        description: 'Invoke an MCP tool on the authenticated server',
        action: 'EXECUTE',
        requiredScopes: ['tools.call'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'mcp.resource.read',
        name: 'Read MCP Resource',
        description: 'Read an MCP resource URI',
        action: 'READ',
        requiredScopes: ['resources.read'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
    ],
    defaultScopes: ['tools.call'],
    rateLimitSupport: true,
    usageSupport: true,
    webhookSupport: false,
    provenance: {
      source: 'Model Context Protocol (MCP)',
      officialDocsUrl: 'https://modelcontextprotocol.io',
      version: '2024-11-05',
      license: 'MIT',
      providerAuthor: 'Anthropic / MCP Working Group',
      verifiedAt: Date.now(),
    },
  };

  constructor(private readonly logger: ILogger) {
    if (this.logger) {
      // logger bound
    }
  }

  public async validateConnection(
    account: ServiceAccount,
    credentials?: { apiKey?: string; customHeaders?: Record<string, string> }
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }> {
    const serverUrl = account.metadata?.serverUrl as string | undefined;
    const nowIso = new Date().toISOString();

    if (!serverUrl) {
      return {
        valid: false,
        error: 'Missing serverUrl in MCP account metadata',
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'DEGRADED',
          latencyMs: 0,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: 'Missing serverUrl',
          updatedAt: nowIso,
        },
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(credentials?.customHeaders || {}),
      };
      if (credentials?.apiKey) {
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      }

      // JSON-RPC ping or initialize test
      const res = await fetch(serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'ping',
          params: {},
        }),
        signal: AbortSignal.timeout(5000),
      });

      const valid = res.ok;
      return {
        valid,
        identity: (account.metadata?.serverName as string) || serverUrl,
        error: valid ? undefined : `MCP server returned HTTP ${res.status}`,
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: valid ? 'HEALTHY' : 'DEGRADED',
          latencyMs: 0,
          lastSuccessfulCheck: valid ? nowIso : undefined,
          failureCount: valid ? 0 : 1,
          consecutiveErrors: valid ? 0 : 1,
          lastError: valid ? undefined : `HTTP ${res.status}`,
          updatedAt: nowIso,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `MCP server validation failed: ${msg}`,
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'DEGRADED',
          latencyMs: 0,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: msg,
          updatedAt: nowIso,
        },
      };
    }
  }

  public async invoke(
    capabilityId: string,
    params: Record<string, unknown>,
    options: ProviderInvokeOptions
  ): Promise<ProviderOperationResult> {
    const startTime = Date.now();
    const serverUrl = options.account.metadata?.serverUrl as string | undefined;

    if (!serverUrl) {
      return {
        success: false,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        error: {
          category: 'CONFIGURATION_ERROR',
          message: 'No serverUrl configured for MCP account',
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.credentials?.customHeaders || {}),
      };
      if (options.credentials?.apiKey) {
        headers['Authorization'] = `Bearer ${options.credentials.apiKey}`;
      }

      let rpcMethod = 'tools/call';
      let rpcParams = params;

      if (capabilityId === 'mcp.resource.read') {
        rpcMethod = 'resources/read';
      }

      const res = await fetch(serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: rpcMethod,
          params: rpcParams,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`MCP server HTTP ${res.status}: ${txt}`);
      }

      const responseJson = (await res.json()) as { error?: { message: string }; result?: unknown };
      if (responseJson.error) {
        throw new Error(`MCP RPC error: ${responseJson.error.message}`);
      }

      return {
        success: true,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        data: responseJson.result,
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        error: {
          category: 'EXECUTION_FAILED',
          message: msg,
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }
}
