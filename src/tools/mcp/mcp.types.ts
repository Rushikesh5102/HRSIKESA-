/**
 * HṚṢĪKEŚA (हृषीकेश) — Model Context Protocol (MCP) Foundation Types
 * 
 * Implements JSON-RPC 2.0 contracts and standard MCP 2024-11-05 protocol primitives.
 */

import { DangerTier } from '../interfaces/danger.types.js';
import { JsonSchemaObject } from '../interfaces/execution.types.js';

export interface JsonRpcRequest<T = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly method: string;
  readonly params?: T;
}

export interface JsonRpcResponse<T = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly result?: T;
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

export interface JsonRpcNotification<T = unknown> {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params?: T;
}

export interface McpServerConfig {
  readonly id: string;
  readonly name: string;
  readonly transport: 'stdio' | 'in-memory';
  readonly command?: string;
  readonly args?: readonly string[];
  readonly env?: Record<string, string>;
  readonly defaultRiskLevel?: DangerTier;
}

export interface McpToolDefinition {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: JsonSchemaObject;
}

export interface McpInitializeParams {
  readonly protocolVersion: string;
  readonly capabilities: Record<string, unknown>;
  readonly clientInfo: {
    readonly name: string;
    readonly version: string;
  };
}

export interface McpInitializeResult {
  readonly protocolVersion: string;
  readonly capabilities: Record<string, unknown>;
  readonly serverInfo: {
    readonly name: string;
    readonly version: string;
  };
}

export interface McpToolsListResult {
  readonly tools: readonly McpToolDefinition[];
}

export interface McpCallToolParams {
  readonly name: string;
  readonly arguments?: Record<string, unknown>;
}

export interface McpToolContentItem {
  readonly type: 'text' | 'image' | 'resource';
  readonly text?: string;
  readonly data?: unknown;
}

export interface McpCallToolResult {
  readonly content: readonly McpToolContentItem[];
  readonly isError?: boolean;
}
