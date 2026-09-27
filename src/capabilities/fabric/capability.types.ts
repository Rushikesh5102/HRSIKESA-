/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Capability Contract & Domain Types
 *
 * FP-07: Universal Capability & Connector Fabric
 * Defines the canonical contract through which HṚṢĪKEŚA discovers, evaluates,
 * authenticates, authorizes, invokes, observes, verifies, versions, and retires external capabilities.
 */

export type CapabilityCategory =
  | 'RESEARCH'
  | 'WEB'
  | 'BROWSER'
  | 'COMPUTER'
  | 'SOFTWARE'
  | 'FILESYSTEM'
  | 'TERMINAL'
  | 'API'
  | 'MCP'
  | 'CLI'
  | 'DATABASE'
  | 'COMMUNICATION'
  | 'PRODUCTIVITY'
  | 'DEVELOPMENT'
  | 'DEVOPS'
  | 'CLOUD'
  | 'MEDIA'
  | 'DATA'
  | 'BUSINESS'
  | 'FINANCE'
  | 'DOCUMENT'
  | 'CUSTOM';

export type CapabilityProtocol =
  | 'NATIVE'
  | 'REST'
  | 'GRAPHQL'
  | 'MCP'
  | 'CLI'
  | 'BROWSER'
  | 'DESKTOP'
  | 'LOCAL_PROCESS'
  | 'SDK'
  | 'WEBHOOK'
  | 'CUSTOM';

export type CapabilityLifecycleStatus =
  | 'DISCOVERED'
  | 'EVALUATING'
  | 'PENDING_APPROVAL'
  | 'REGISTERED'
  | 'CONFIGURING'
  | 'AUTHENTICATED'
  | 'AVAILABLE'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'DISABLED'
  | 'REVOKED'
  | 'DEPRECATED'
  | 'REMOVED';

export type CapabilityTrustLevel =
  | 'SYSTEM'
  | 'TRUSTED'
  | 'VERIFIED'
  | 'USER_APPROVED'
  | 'UNVERIFIED'
  | 'UNTRUSTED'
  | 'BLOCKED';

export type CapabilityRiskLevel =
  | 'TIER_0_READ_ONLY'
  | 'TIER_1_SAFE_ACTION'
  | 'TIER_2_EXTERNAL_SIDE_EFFECT'
  | 'TIER_3_SENSITIVE'
  | 'TIER_4_IRREVERSIBLE';

export type PrivacyClass =
  | 'SOVEREIGN_LOCAL'
  | 'HIGHLY_PRIVATE'
  | 'PRIVATE'
  | 'PUBLIC';

export type AuthenticationType =
  | 'NONE'
  | 'OAUTH2'
  | 'API_KEY'
  | 'BEARER_TOKEN'
  | 'BASIC_AUTH'
  | 'LOCAL_CREDENTIAL'
  | 'CERTIFICATE'
  | 'SESSION'
  | 'CUSTOM';

export type CapabilityScopeLevel = 'GLOBAL' | 'COMPANY' | 'PROJECT' | 'USER';

export type EvaluationVerdict = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';

export interface AuthenticationRequirement {
  readonly type: AuthenticationType;
  readonly credentialRef?: string;
  readonly scopes?: string[];
  readonly authUrl?: string;
  readonly tokenEndpoint?: string;
  readonly requiresInteractiveAuth?: boolean;
}

export interface CapabilityProvenance {
  readonly source: string;
  readonly provider: string;
  readonly version: string;
  readonly license?: string;
  readonly discoveredAt: string;
  readonly registeredBy: string;
  readonly verificationStatus: 'VERIFIED' | 'COMMUNITY_AUDITED' | 'UNVERIFIED' | 'SELF_HOSTED';
  readonly sourceRepository?: string;
}

export interface CapabilityHealth {
  readonly status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'RATE_LIMITED' | 'ERROR' | 'UNKNOWN';
  readonly lastCheckedAt: string;
  readonly lastSuccessAt?: string;
  readonly lastFailureAt?: string;
  readonly consecutiveFailures: number;
  readonly latencyMs?: number;
  readonly message?: string;
  readonly providerStatus?: string;
  readonly rateLimitResetAt?: string;
  readonly quotaRemaining?: number | 'UNKNOWN';
}

export interface CapabilityVerificationRecord {
  readonly verified: boolean;
  readonly strategy: 'schema_match' | 'read_after_write' | 'process_state' | 'checksum' | 'dom_presence' | 'exit_code' | 'dry_run' | 'none';
  readonly lastVerifiedAt?: string;
  readonly details?: string;
}

export interface UniversalCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: CapabilityCategory;
  readonly provider: string;
  readonly source: string;
  readonly version: string;
  readonly protocol: CapabilityProtocol;
  readonly status: CapabilityLifecycleStatus;
  readonly trustLevel: CapabilityTrustLevel;
  readonly riskLevel: CapabilityRiskLevel;
  readonly privacyClass: PrivacyClass;
  readonly authentication: AuthenticationRequirement;
  readonly scopes: string[];
  readonly inputs: Record<string, unknown>;
  readonly outputs: Record<string, unknown>;
  readonly dependencies: string[];
  readonly environments: string[];
  readonly supportedOperations: string[];
  readonly provenance: CapabilityProvenance;
  readonly verification: CapabilityVerificationRecord;
  readonly health: CapabilityHealth;
  readonly enabled: boolean;
  readonly scopeLevel?: CapabilityScopeLevel;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly documentation?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CapabilityInvocation {
  readonly invocationId: string;
  readonly capabilityId: string;
  readonly operation: string;
  readonly inputs: Record<string, unknown>;
  readonly actor: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly agentId?: string;
  readonly goalId?: string;
  readonly missionId?: string;
  readonly privacyClass: PrivacyClass;
  readonly requestedAt: string;
  readonly timeoutMs?: number;
}

export interface CapabilityResult {
  readonly invocationId: string;
  readonly status: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'DENIED' | 'TIMEOUT' | 'UNVERIFIED';
  readonly output?: unknown;
  readonly error?: string;
  readonly evidence?: Record<string, unknown>;
  readonly verification: {
    readonly verified: boolean;
    readonly strategy: string;
    readonly details?: string;
    readonly timestamp: string;
  };
  readonly durationMs: number;
  readonly provider: string;
  readonly capabilityVersion: string;
}

export interface CapabilityDependency {
  readonly id: string;
  readonly capabilityId: string;
  readonly dependencyType: 'SOFTWARE' | 'PACKAGE' | 'CREDENTIAL' | 'MCP_SERVER' | 'MODEL' | 'NETWORK' | 'BROWSER' | 'CAPABILITY';
  readonly dependencyRef: string;
  readonly required: boolean;
  readonly satisfied: boolean;
  readonly details?: string;
}

export interface CapabilityCredentialReference {
  readonly id: string;
  readonly capabilityId: string;
  readonly credentialRef: string; // e.g. "vault://provider/account/key-id"
  readonly provider: string;
  readonly authType: AuthenticationType;
  readonly scopes: string[];
  readonly status: 'CONFIGURED' | 'EXPIRED' | 'REVOKED' | 'MISSING';
  readonly expiresAt?: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CapabilityEvaluation {
  readonly capabilityId: string;
  readonly identityVerdict: EvaluationVerdict;
  readonly securityVerdict: EvaluationVerdict;
  readonly privacyVerdict: EvaluationVerdict;
  readonly dependencyVerdict: EvaluationVerdict;
  readonly overallVerdict: EvaluationVerdict;
  readonly reasons: string[];
  readonly evaluatedAt: string;
}
