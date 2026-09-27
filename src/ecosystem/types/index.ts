/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Application & Service Ecosystem Types (FP-15)
 *
 * Core domain contracts, normalized service models, interface bindings,
 * and operation envelopes.
 */

// Re-use FP-13's ApplicationDescriptor directly without duplication (Per Prompt Section 5)
export {
  ApplicationDescriptor,
  ApplicationCategory,
  ApplicationReadinessState,
  ApplicationHealthStatus,
  ApplicationSession,
  ApplicationLaunchOptions,
} from '../../operator/types/application.types.js';

export type ServiceCategory =
  | 'PRODUCTIVITY'
  | 'DEVELOPMENT'
  | 'CODE'
  | 'COMMUNICATION'
  | 'CLOUD'
  | 'MEDIA'
  | 'ENTERPRISE'
  | 'CUSTOM';

export type EcosystemInterfaceType =
  | 'LOCAL_API'
  | 'AUTHENTICATED_API'
  | 'MCP'
  | 'CLI'
  | 'BROWSER_DOM'
  | 'DESKTOP_UIA'
  | 'OCR_VISION'
  | 'COORDINATE_INPUT';

export type ServiceHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNCONFIGURED'
  | 'EXPIRED'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'DISCONNECTED';

export interface ServiceInterfaceBinding {
  interfaceType: EcosystemInterfaceType;
  priority: number; // Lower number = higher priority (1 = highest)
  reliabilityScore: number; // 0.0 - 1.0
  averageLatencyMs: number;
  isAvailable: boolean;
  requiresApproval?: boolean;
  notes?: string;
  config?: Record<string, unknown>;
}

export interface ServiceDescriptor {
  serviceId: string;
  providerId: string;
  name: string;
  displayName: string;
  category: ServiceCategory;
  interfaces: ServiceInterfaceBinding[];
  capabilities: string[];
  authenticationMethods: string[];
  accountRequirements?: {
    required: boolean;
    recommendedScopeType?: 'PERSONAL' | 'COMPANY' | 'PROJECT';
    supportedScopes?: string[];
  };
  scopes: string[];
  environments: string[]; // e.g. ['local', 'windows', 'cloud', 'browser']
  supportedOperations: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  privacy: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SECRET';
  availability: 'AVAILABLE' | 'UNAVAILABLE' | 'WAITING_FOR_NETWORK' | 'NOT_INSTALLED';
  health: ServiceHealthStatus;
  quota?: {
    known: boolean;
    remaining?: number;
    total?: number;
    resetAt?: number;
  };
  rateLimit?: {
    isLimited: boolean;
    resetAt?: number;
    backoffMs?: number;
  };
  provenance: {
    source: string;
    version: string;
    license: string;
    author?: string;
    verifiedAt: number;
    documentationUrl?: string;
  };
  license: string;
  version: string;
  documentation?: string;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InterfaceResolutionContext {
  serviceId?: string;
  providerId?: string;
  capabilityId: string;
  operationName?: string;
  companyId?: string;
  projectId?: string;
  ownerIdentity?: string;
  preferredInterface?: EcosystemInterfaceType;
  networkAvailable?: boolean;
  allowDegradedFallback?: boolean;
}

export interface InterfaceResolutionResult {
  selectedInterface: EcosystemInterfaceType;
  serviceId: string;
  providerId: string;
  capabilityId: string;
  accountId?: string;
  reliabilityScore: number;
  expectedLatencyMs: number;
  requiresApproval: boolean;
  reason: string;
  fallbackAvailable: boolean;
  alternateInterfaces: EcosystemInterfaceType[];
}

export interface EcosystemOperationEnvelope {
  operationId: string;
  providerId: string;
  serviceId: string;
  accountId?: string;
  capabilityId: string;
  operationName: string;
  interfaceType: EcosystemInterfaceType;
  scope?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'BLOCKED_APPROVAL' | 'VERIFIED' | 'RATE_LIMITED';
  evidence?: Record<string, unknown>;
  executionTimeMs?: number;
  startedAt: string;
  completedAt?: string;
  error?: {
    category: string;
    message: string;
    retryable: boolean;
  };
  provenance: Record<string, unknown>;
}

export interface ConsequentialVerificationPlan {
  operationId: string;
  capabilityId: string;
  strategy: 'RETRIEVE_AND_COMPARE' | 'CHECK_EXISTENCE' | 'POLL_STATUS' | 'PROVIDER_CONFIRMATION';
  verificationParams: Record<string, unknown>;
}

export interface ConsequentialVerificationResult {
  operationId: string;
  verified: boolean;
  strategy: string;
  evidence: Record<string, unknown>;
  verifiedAt: string;
  error?: string;
}

export interface NaturalLanguageCapabilityQuery {
  rawQuery: string;
  targetService?: string;
  targetApp?: string;
  targetCapability?: string;
  intent?: 'CHECK_AVAILABILITY' | 'INVOKE' | 'OPEN_APP' | 'SEARCH_CAPABILITIES';
}

export interface NaturalLanguageCapabilityResult {
  handled: boolean;
  serviceName?: string;
  serviceId?: string;
  isAvailable: boolean;
  health: ServiceHealthStatus;
  primaryInterface?: EcosystemInterfaceType;
  availableInterfaces: EcosystemInterfaceType[];
  connectedAccountsCount: number;
  responseMessage: string;
  supportedOperations: string[];
  suggestedAction?: {
    type: 'CONNECT' | 'OPEN' | 'INSTALL' | 'EXECUTE' | 'NONE';
    payload?: Record<string, unknown>;
  };
}

export interface EcosystemHealthSummary {
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  totalServices: number;
  availableServices: number;
  totalApplications: number;
  connectedAccounts: number;
  activeMcpServers: number;
  rateLimitedServices: string[];
  timestamp: string;
}
