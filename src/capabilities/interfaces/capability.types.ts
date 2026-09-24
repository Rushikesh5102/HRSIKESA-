/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability System Domain Interfaces
 *
 * Phase 16I & 16J: Capability Registry & Adapter Architecture
 */

export type CapabilityCategory =
  | 'browser'
  | 'filesystem'
  | 'terminal'
  | 'computer'
  | 'voice'
  | 'memory'
  | 'research'
  | 'document'
  | 'mcp'
  | 'custom';

export type CapabilityRuntimeType = 'native' | 'subprocess' | 'mcp' | 'api';
export type CapabilityHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNCONFIGURED';
export type CapabilityRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CapabilityMetadata {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: CapabilityCategory;
  readonly provider: string; // e.g., 'Microsoft Playwright', 'Systran faster-whisper', 'Ollama nomic-embed'
  readonly source: 'open_source' | 'native' | 'mcp' | 'cloud';
  readonly version: string;
  readonly license: string; // e.g., 'Apache-2.0', 'MIT', 'BSD-3-Clause'
  readonly runtimeType: CapabilityRuntimeType;
  readonly supportedPlatforms: ('win32' | 'linux' | 'darwin')[];
  readonly requiredPermissions: string[];
  readonly riskLevel: CapabilityRiskLevel;
  readonly dependencies: string[];
  readonly enabled: boolean;
  readonly securityStatus: 'VERIFIED' | 'COMMUNITY_AUDITED' | 'UNVERIFIED';
  readonly documentation?: string;
  readonly configuration?: Record<string, unknown>;
}

export interface CapabilityHealthCheckResult {
  readonly status: CapabilityHealthStatus;
  readonly message: string;
  readonly latencyMs?: number;
  readonly lastCheckedAt: string;
  readonly details?: Record<string, unknown>;
}

export interface CapabilityExecutionRequest {
  readonly capabilityId: string;
  readonly action: string;
  readonly parameters: Record<string, unknown>;
  readonly agentId?: string;
  readonly callerAgentId?: string;
  readonly missionId?: string;
  readonly goalId?: string;
  readonly companyId?: string;
  readonly projectId?: string;
}

export interface CapabilityExecutionResult {
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: string;
  readonly executionTimeMs: number;
  readonly capabilityId: string;
}
