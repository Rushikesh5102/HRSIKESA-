/**
 * HṚṢĪKEŚA (हृषीकेश) — Enterprise Environment Domain Types & Interfaces
 *
 * Phase 23: Structured abstractions for managing, authenticating with, operating across,
 * and auditing external, remote, cloud, container, VDI, RDP, and CI environments.
 */

export const EnvironmentType = {
  LOCAL: 'LOCAL',
  WINDOWS: 'WINDOWS',
  LINUX: 'LINUX',
  MACOS: 'MACOS',
  RDP: 'RDP',
  VDI: 'VDI',
  SSH: 'SSH',
  VM: 'VM',
  CONTAINER: 'CONTAINER',
  CLOUD: 'CLOUD',
  CI: 'CI',
  REMOTE_BROWSER: 'REMOTE_BROWSER',
  ENTERPRISE: 'ENTERPRISE',
  CUSTOM: 'CUSTOM',
} as const;
export type EnvironmentType = (typeof EnvironmentType)[keyof typeof EnvironmentType];

export const EnvironmentLifecycleStatus = {
  DISCOVERED: 'DISCOVERED',
  INSPECTING: 'INSPECTING',
  PENDING_AUTHORIZATION: 'PENDING_AUTHORIZATION',
  AUTHORIZED: 'AUTHORIZED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DEGRADED: 'DEGRADED',
  DISCONNECTED: 'DISCONNECTED',
  FAILED: 'FAILED',
  DISABLED: 'DISABLED',
  REVOKED: 'REVOKED',
  REMOVED: 'REMOVED',
} as const;
export type EnvironmentLifecycleStatus = (typeof EnvironmentLifecycleStatus)[keyof typeof EnvironmentLifecycleStatus];

export const EnvironmentTrustLevel = {
  UNKNOWN: 'UNKNOWN',
  UNTRUSTED: 'UNTRUSTED',
  REVIEWED: 'REVIEWED',
  TRUSTED: 'TRUSTED',
  USER_APPROVED: 'USER_APPROVED',
} as const;
export type EnvironmentTrustLevel = (typeof EnvironmentTrustLevel)[keyof typeof EnvironmentTrustLevel];

export const SessionStatus = {
  CREATING: 'CREATING',
  AUTHENTICATING: 'AUTHENTICATING',
  CONNECTED: 'CONNECTED',
  IDLE: 'IDLE',
  BUSY: 'BUSY',
  DISCONNECTING: 'DISCONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  FAILED: 'FAILED',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export type EnvironmentScope = 'GLOBAL' | 'COMPANY' | 'PROJECT' | 'ENVIRONMENT' | 'APPLICATION' | 'AGENT';

export type DangerTier = 'SAFE' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'CRITICAL';

export type EnvironmentHealthLevel = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'RESOURCE_LIMITED' | 'POLICY_BLOCKED';

export interface EnvironmentFingerprint {
  readonly os: string;
  readonly platform: string;
  readonly arch: string;
  readonly hostname: string;
  readonly cpuCores?: number;
  readonly totalMemoryGb?: number;
  readonly diskFreeGb?: number;
  readonly availableShells: readonly string[];
  readonly installedSoftwareSummary: readonly string[];
  readonly networkMetadata?: {
    readonly localIp?: string;
    readonly domain?: string;
    readonly isVpnActive?: boolean;
  };
  readonly capturedAt: string;
}

export interface EnvironmentRecord {
  readonly id: string;
  readonly name: string;
  readonly type: EnvironmentType;
  readonly platform: string;
  readonly hostname: string;
  readonly address?: string;
  readonly port?: number;
  readonly status: EnvironmentLifecycleStatus;
  readonly trustLevel: EnvironmentTrustLevel;
  readonly isAuthorized: boolean;
  readonly owner: string;
  readonly scope: EnvironmentScope;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly department?: string;
  readonly fingerprint?: EnvironmentFingerprint;
  readonly tags: readonly string[];
  readonly metadata: Record<string, unknown>;
  readonly lastConnectedAt?: string;
  readonly lastHealthCheckAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EnvironmentCapabilityRecord {
  readonly id: string;
  readonly environmentId: string;
  readonly capabilityId: string;
  readonly scope: EnvironmentScope;
  readonly isAvailable: boolean;
  readonly riskTier: DangerTier;
  readonly configuration?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EnvironmentSessionRecord {
  readonly id: string;
  readonly environmentId: string;
  readonly sessionType: string;
  readonly status: SessionStatus;
  readonly agentId?: string;
  readonly missionId?: string;
  readonly goalId?: string;
  readonly remotePid?: number;
  readonly remoteUser?: string;
  readonly activeChannel?: string;
  readonly idleTimeoutMs: number;
  readonly connectionMetadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly lastActivityAt: string;
  readonly closedAt?: string;
  readonly errorMessage?: string;
}

export interface CredentialMetadataRecord {
  readonly id: string;
  readonly environmentId: string;
  readonly authType: 'SSH_KEY' | 'SSH_AGENT' | 'PASSWORD' | 'WINRM' | 'RDP' | 'OAUTH' | 'TOKEN' | 'KEYCHAIN';
  readonly credentialReference: string; // Identifier or env var name (NEVER the secret)
  readonly username?: string;
  readonly keyFingerprint?: string;
  readonly requiresMfa: boolean;
  readonly mfaType?: 'OTP' | 'PUSH' | 'HARDWARE_KEY' | 'BIOMETRIC';
  readonly lastValidatedAt?: string;
  readonly isValid: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EnvironmentHealthRecord {
  readonly id: string;
  readonly environmentId: string;
  readonly status: EnvironmentHealthLevel;
  readonly latencyMs?: number;
  readonly cpuUsagePct?: number;
  readonly memoryUsagePct?: number;
  readonly diskFreeBytes?: number;
  readonly activeSessionsCount: number;
  readonly errorMessage?: string;
  readonly timestamp: string;
}

export interface RemoteOperationRecord {
  readonly id: string;
  readonly environmentId: string;
  readonly sessionId?: string;
  readonly operationType: string;
  readonly commandOrAction: string;
  readonly dangerTier: DangerTier;
  readonly preconditionStatus: 'PASSED' | 'FAILED';
  readonly executionStatus: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL' | 'BLOCKED';
  readonly exitCode?: number;
  readonly outputSummary?: string;
  readonly errorMessage?: string;
  readonly durationMs?: number;
  readonly isIdempotent: boolean;
  readonly verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED' | 'SKIPPED';
  readonly verificationEvidence?: string;
  readonly agentId?: string;
  readonly requiresApproval: boolean;
  readonly approvedBy?: string;
  readonly createdAt: string;
  readonly completedAt?: string;
}

export interface RemoteCommandOptions {
  readonly timeoutMs?: number;
  readonly workingDir?: string;
  readonly env?: Record<string, string>;
  readonly isIdempotent?: boolean;
  readonly dangerTier?: DangerTier;
  readonly requiresApproval?: boolean;
  readonly agentId?: string;
  readonly maxOutputBytes?: number;
}

export interface RemoteCommandResult {
  readonly commandId: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly success: boolean;
  readonly verificationStatus: 'VERIFIED' | 'FAILED' | 'SKIPPED';
  readonly evidence?: string;
  readonly error?: string;
}

export interface RemoteFileEntry {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
  readonly sizeBytes: number;
  readonly permissions?: string;
  readonly modifiedAt?: string;
}

export interface RemoteProcessInfo {
  readonly pid: number;
  readonly name: string;
  readonly commandLine?: string;
  readonly memoryMb?: number;
  readonly cpuPercent?: number;
  readonly user?: string;
}

export interface IEnvironmentAdapter {
  readonly environmentId: string;
  readonly environmentType: EnvironmentType;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getFingerprint(): Promise<EnvironmentFingerprint>;
  executeCommand(command: string, options?: RemoteCommandOptions): Promise<RemoteCommandResult>;
  listFiles(remotePath: string, maxItems?: number): Promise<RemoteFileEntry[]>;
  readFile(remotePath: string, maxBytes?: number): Promise<Buffer | string>;
  writeFile(remotePath: string, content: Buffer | string): Promise<boolean>;
  listProcesses(): Promise<RemoteProcessInfo[]>;
  healthCheck(): Promise<EnvironmentHealthRecord>;
}
