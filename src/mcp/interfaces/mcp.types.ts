/**
 * HṚṢĪKEŚA (हृषीकेश) — Model Context Protocol (MCP) & Capability Ecosystem Types
 *
 * Phase 21: Full-featured, sandboxed, and governed MCP integration architecture.
 */

import { DangerTier } from '../../tools/interfaces/danger.types.js';
import { JsonSchemaObject } from '../../tools/interfaces/execution.types.js';

export type MCPServerStatus =
  | 'DISCOVERED'
  | 'INSPECTING'
  | 'VALIDATING'
  | 'PENDING_APPROVAL'
  | 'AUTHORIZED'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'DISABLED'
  | 'REVOKED'
  | 'FAILED'
  | 'REMOVED';

export type MCPTrustLevel =
  | 'UNKNOWN'
  | 'UNTRUSTED'
  | 'REVIEWED'
  | 'TRUSTED'
  | 'USER_APPROVED';

export type MCPHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'CRASHED'
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'REVOKED';

export type MCPTransportType = 'stdio' | 'http' | 'in-memory';

export type MCPCapabilityScope =
  | 'GLOBAL'
  | 'CREATOR'
  | 'COMPANY'
  | 'PROJECT'
  | 'DEPARTMENT'
  | 'AGENT';

export interface MCPServer {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
  readonly transport: MCPTransportType;
  readonly command?: string;
  readonly args?: readonly string[];
  readonly endpoint?: string;
  readonly envMetadata?: Record<string, string>; // Keys only or non-sensitive metadata (no secrets)
  readonly status: MCPServerStatus;
  readonly trustLevel: MCPTrustLevel;
  readonly source: string;
  readonly repositoryUrl?: string;
  readonly license: string;
  readonly enabled: boolean;
  readonly authorized: boolean;
  readonly health: MCPHealthStatus;
  readonly lastCheckedAt?: string;
  readonly pid?: number;
  readonly restartCount: number;
  readonly configHash?: string;
  readonly errorMessage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MCPServerVersion {
  readonly id: string;
  readonly serverId: string;
  readonly version: string;
  readonly definition: Record<string, unknown>;
  readonly changelog?: string;
  readonly createdAt: string;
}

export interface MCPTool {
  readonly id: string;
  readonly serverId: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly inputSchema: JsonSchemaObject;
  readonly outputSchema?: JsonSchemaObject;
  readonly riskLevel: DangerTier;
  readonly requiredPermissions: string[];
  readonly networkRequirement: 'NONE' | 'LOCAL' | 'OUTBOUND' | 'INBOUND';
  readonly filesystemRequirement: 'NONE' | 'READ' | 'WRITE' | 'FULL';
  readonly credentialRequirement: 'NONE' | 'API_KEY' | 'OAUTH' | 'TOKEN';
  readonly enabled: boolean;
  readonly verified: boolean;
  readonly isDestructive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MCPResource {
  readonly id: string;
  readonly serverId: string;
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType: string;
  readonly sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  readonly accessPolicy?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MCPPrompt {
  readonly id: string;
  readonly serverId: string;
  readonly name: string;
  readonly description?: string;
  readonly arguments: Array<{
    readonly name: string;
    readonly description?: string;
    readonly required?: boolean;
  }>;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MCPCapabilityBinding {
  readonly id: string;
  readonly serverId: string;
  readonly toolId: string;
  readonly capabilityId: string;
  readonly scope: MCPCapabilityScope;
  readonly tenantId?: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MCPSecurityReview {
  readonly id: string;
  readonly serverId: string;
  readonly reviewedAt: string;
  readonly reviewer: string;
  readonly findings: Array<{
    readonly type?: string;
    readonly severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly category: string;
    readonly description: string;
    readonly remediation?: string;
  }>;
  readonly riskScore: number;
  readonly decision: 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
  readonly notes?: string;
}

export interface MCPExecutionStats {
  readonly id: string;
  readonly serverId: string;
  readonly toolId: string;
  readonly totalCalls: number;
  readonly successfulCalls: number;
  readonly failedCalls: number;
  readonly totalLatencyMs: number;
  readonly avgLatencyMs: number;
  readonly lastCalledAt?: string;
  readonly lastError?: string;
}

export interface MCPToolContentItem {
  readonly type: 'text' | 'image' | 'resource';
  readonly text?: string;
  readonly data?: unknown;
}

export interface MCPCallResult {
  readonly success: boolean;
  readonly content: readonly MCPToolContentItem[];
  readonly isError?: boolean;
  readonly error?: string;
  readonly latencyMs: number;
}

export interface MCPDiscoveryPreview {
  readonly serverId?: string;
  readonly serverName?: string;
  readonly server: {
    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly version: string;
    readonly transport: MCPTransportType;
    readonly source: string;
    readonly repositoryUrl?: string;
    readonly license: string;
  };
  readonly tools: readonly MCPTool[];
  readonly resources: readonly MCPResource[];
  readonly prompts: readonly MCPPrompt[];
  readonly securityReview: MCPSecurityReview;
  readonly requiredCapabilities: string[];
}
