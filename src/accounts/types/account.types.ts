/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Service & Account Integration Fabric Domain Types
 *
 * FP-12: Provider-independent contracts for service discovery, OAuth 2.0 with PKCE,
 * credential reference vaults, multi-account routing, health monitoring, quota tracking,
 * webhooks, and account-backed capability execution.
 */

export type ServiceProviderCategory =
  | 'COMMUNICATION'
  | 'DEVELOPMENT'
  | 'PRODUCTIVITY'
  | 'STORAGE'
  | 'CLOUD'
  | 'CRM'
  | 'FINANCE'
  | 'AI'
  | 'DATABASE'
  | 'SECURITY'
  | 'CUSTOM'
  | 'CODE';

export type ServiceProviderStatus =
  | 'DISCOVERED'
  | 'REGISTERED'
  | 'ENABLED'
  | 'DISABLED'
  | 'CONFIGURATION_REQUIRED'
  | 'DEPRECATED'
  | 'REVOKED';

export type AuthenticationMethod =
  | 'OAUTH2'
  | 'API_KEY'
  | 'CLI'
  | 'MCP'
  | 'BEARER_TOKEN'
  | 'BASIC_AUTH'
  | 'CUSTOM'
  | 'CUSTOM_HEADER';

export type AccountScopeType = 'PERSONAL' | 'COMPANY' | 'PROJECT' | 'SHARED_AUTHORIZED';

export type ServiceAccountStatus =
  | 'DISCONNECTED'
  | 'AUTHORIZING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'EXPIRED'
  | 'REAUTH_REQUIRED'
  | 'REVOKING'
  | 'REVOKED'
  | 'ERROR';

export type OAuthAuthorizationStatus =
  | 'CREATED'
  | 'WAITING_USER'
  | 'AUTHORIZED'
  | 'DENIED'
  | 'EXPIRED'
  | 'FAILED'
  | 'COMPLETED';

export type AccountHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'RATE_LIMITED'
  | 'ERROR'
  | 'UNKNOWN'
  | 'EXPIRED'
  | 'UNHEALTHY';

export interface OAuthScopeDefinition {
  readonly scope: string;
  readonly description: string;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly required: boolean;
  readonly grantedCapabilities: string[];
}

export interface AccountCapabilityDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly action?: string;
  readonly requiredScopes?: string[];
  readonly riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly financial?: boolean;
  readonly destructive?: boolean;
  readonly privacyClass?: string;
}

export interface ServiceProvider {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly category: ServiceProviderCategory;
  readonly authMethods: AuthenticationMethod[];
  readonly status: ServiceProviderStatus;
  readonly documentationUrl?: string;
  readonly privacyPolicyUrl?: string;
  readonly iconUrl?: string;
  readonly supportedScopes: OAuthScopeDefinition[];
  readonly defaultScopes?: string[];
  readonly requiredConfigKeys?: string[];
  readonly capabilities: (string | AccountCapabilityDefinition)[];
  readonly rateLimitPolicy?: {
    readonly requestsPerMinute?: number;
    readonly dailyLimit?: number;
    readonly quotaUnit?: string;
  };
  readonly webhookSupport?: boolean;
  readonly rateLimitSupport?: boolean;
  readonly usageSupport?: boolean;
  readonly provenance: {
    readonly source: string;
    readonly officialApi?: string;
    readonly officialDocsUrl?: string;
    readonly version: string;
    readonly license?: string;
    readonly implementationProvenance?: string;
    readonly providerAuthor?: string;
    readonly verifiedAt?: number | string;
  };
  readonly metadata?: Record<string, any>;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface ServiceAccount {
  readonly id: string;
  readonly providerId: string;
  readonly accountName: string;
  readonly email?: string;
  readonly ownerIdentity: string;
  readonly scopeType: AccountScopeType;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly status: ServiceAccountStatus;
  readonly scopes: string[];
  readonly credentialRef: string; // vault://providers/{providerId}/{accountId}
  readonly credentialReference?: string; // alias
  readonly lastVerifiedAt?: string;
  readonly lastError?: string;
  readonly metadata?: Record<string, any>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccountCredentialMetadata {
  readonly ref: string;
  readonly providerId: string;
  readonly accountId: string;
  readonly keyAlgorithm: string;
  readonly keyId: string;
  readonly hasRefreshToken: boolean;
  readonly expiresAt?: string;
  readonly createdAt: string;
  readonly rotatedAt?: string;
}

export interface OAuthClientConfiguration {
  readonly providerId: string;
  readonly clientId: string;
  readonly clientSecretRef?: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly revocationEndpoint?: string;
  readonly userInfoEndpoint?: string;
  readonly redirectUri: string;
  readonly additionalParams?: Record<string, string>;
}

export interface OAuthAuthorizationRequest {
  readonly id: string;
  readonly providerId: string;
  readonly accountId?: string;
  readonly ownerIdentity?: string;
  readonly state: string;
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly redirectUri: string;
  readonly scopes: string[];
  readonly authorizationUrl: string;
  readonly authUrl?: string; // alias
  readonly status: OAuthAuthorizationStatus;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly scopeType?: AccountScopeType;
  readonly createdAt: string | number;
  readonly expiresAt: string | number;
}

export interface OAuthTokenSet {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly refreshToken?: string;
  readonly expiresIn?: number;
  readonly expiresAt?: string;
  readonly scope?: string;
  readonly idToken?: string;
  readonly rawResponse?: Record<string, any>;
}

export interface AccountHealth {
  readonly accountId: string;
  readonly providerId: string;
  readonly status: AccountHealthStatus;
  readonly latencyMs: number;
  readonly lastSuccessfulCheck?: string;
  readonly lastSuccessfulCheckAt?: number | string;
  readonly lastFailure?: string;
  readonly lastError?: string;
  readonly lastCheckedAt?: number | string;
  readonly failureCount: number;
  readonly consecutiveErrors?: number;
  readonly details?: Record<string, any>;
  readonly updatedAt: string;
}

export interface AccountUsage {
  readonly accountId: string;
  readonly providerId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly requestsMade: number;
  readonly totalRequests?: number;
  readonly successfulRequests?: number;
  readonly failedRequests?: number;
  readonly requestsRemaining: number | 'UNKNOWN';
  readonly requestLimit: number | 'UNKNOWN';
  readonly resetAt?: string | number;
  readonly tokensUsed?: number;
  readonly totalTokens?: number;
  readonly quotas?: { quotaType: string; remaining: number | null }[];
  readonly estimatedCostUsd?: number;
  readonly updatedAt: string;
}

export interface AccountRateLimitState {
  readonly accountId: string;
  readonly isRateLimited: boolean;
  readonly retryAfterSeconds?: number;
  readonly resetAt?: string | number;
  readonly lastRateLimitedAt?: string | number;
}

export interface AccountWebhook {
  readonly id: string;
  readonly providerId: string;
  readonly accountId: string;
  readonly endpointPath: string;
  readonly secretRef: string;
  readonly subscribedEvents: string[];
  readonly status: 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'ERROR';
  readonly lastReceivedAt?: string;
  readonly failureCount: number;
  readonly createdAt: string;
}

export interface AccountAuditEntry {
  readonly id: string;
  readonly accountId: string;
  readonly providerId: string;
  readonly capabilityId?: string;
  readonly operation: string;
  readonly actor: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'RATE_LIMITED';
  readonly timestamp: string;
  readonly latencyMs: number;
  readonly errorCategory?: string;
  readonly detailsSummary?: Record<string, any>;
}

export interface ProviderOperationResult<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string | { category?: string; message: string; retryable?: boolean };
  readonly statusCode?: number;
  readonly capabilityId?: string;
  readonly providerId?: string;
  readonly accountId?: string;
  readonly executionTimeMs?: number;
  readonly timestamp?: number;
  readonly rateLimit?: {
    readonly remaining: number | 'UNKNOWN';
    readonly limit: number | 'UNKNOWN';
    readonly resetAt?: string;
    readonly retryAfterSeconds?: number;
  };
  readonly latencyMs?: number;
}
