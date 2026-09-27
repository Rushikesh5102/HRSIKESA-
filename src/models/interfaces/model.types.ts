/**
 * HṚṢĪKEŚA (हृषीकेश) — Vendor-Neutral Model Types & Advanced Routing Abstractions
 *
 * Phase 18: Advanced Model Router
 */

export type ModelCapability =
  | 'text-generation'
  | 'chat'
  | 'vision'
  | 'audio'
  | 'multimodal'
  | 'ocr_reasoning'
  | 'voice'
  | 'code'
  | 'tools'
  | 'embedding'
  | 'reasoning'
  | 'structured-output'
  | 'json';

export type CostClassification = 'free-local' | 'pay-per-token';

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'unconfigured' | 'disabled';

export interface ProviderHealth {
  readonly status: ProviderHealthStatus;
  readonly message: string;
  readonly latencyMs?: number;
  readonly checkedAt: string;
}

export type LatencyClass = 'FAST' | 'MODERATE' | 'SLOW';
export type CostClass = 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type PrivacyClass = 'LOCAL_PRIVATE' | 'CLOUD_AUTHORIZED';

export interface ModelPricing {
  readonly promptPerMillionUsd: number;
  readonly completionPerMillionUsd: number;
}

export type ModelTier =
  | 'DETERMINISTIC_INSTANT'
  | 'FAST_LOCAL'
  | 'BALANCED_DEEP_LOCAL'
  | 'CLOUD_GENERAL'
  | 'CLOUD_REASONING'
  | 'CLOUD_VISION';

export interface ModelMetadata {
  readonly id: string;
  readonly name?: string;
  readonly providerId: string;
  readonly displayName: string;
  readonly isLocal: boolean;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly capabilities: readonly ModelCapability[];
  readonly costClassification: CostClassification;
  readonly pricing?: ModelPricing;
  readonly latencyClass?: LatencyClass;
  readonly costClass?: CostClass;
  readonly privacyClass?: PrivacyClass;
  readonly modelTier?: ModelTier;
  readonly availability: boolean;
  readonly statusText: string;
  readonly priority: number;
  readonly supportsTools?: boolean;
  readonly supportsStructuredOutput?: boolean;
  readonly supportsVision?: boolean;
  readonly supportsReasoning?: boolean;
}

export interface ModelRequest {
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly preferredModel?: string;
  readonly preferredProvider?: string;
  readonly requireLocal?: boolean;
  readonly priority?: 'HIGH' | 'NORMAL';
  readonly taskProfile?: TaskProfile;
  readonly taskType?: TaskType;
  readonly complexity?: TaskComplexity;
  readonly privacyLevel?: PrivacyLevel;
  readonly agentId?: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly goalId?: string;
  readonly missionId?: string;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface ToolResult {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: string;
}

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
  readonly timestamp?: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolCallId?: string;
}

export interface ChatRequest {
  readonly messages: readonly ChatMessage[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly preferredModel?: string;
  readonly preferredProvider?: string;
  readonly requireLocal?: boolean;
  readonly priority?: 'HIGH' | 'NORMAL';
  readonly format?: 'json' | string;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly tools?: readonly ToolDefinition[];
  readonly stream?: boolean;
  readonly onToken?: (token: string) => void;
  readonly taskProfile?: TaskProfile;
  readonly taskType?: TaskType;
  readonly complexity?: TaskComplexity;
  readonly privacyLevel?: PrivacyLevel;
  readonly agentId?: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly goalId?: string;
  readonly missionId?: string;
}

export interface TokenUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
}

export interface ModelResponse {
  readonly text: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly durationMs: number;
  readonly isLocal: boolean;
  readonly toolCalls?: readonly ToolCall[];
  readonly usage?: TokenUsage;
  readonly estimatedCostUsd?: number;
  readonly routingReason?: string;
  readonly fallbackOccurred?: boolean;
  readonly fallbackReason?: string;
}

// ============================================================
// PHASE 18: ADVANCED MODEL ROUTING TYPES
// ============================================================

export type TaskType =
  | 'CONVERSATION'
  | 'REASONING'
  | 'CODE'
  | 'CODE_REVIEW'
  | 'RESEARCH'
  | 'PLANNING'
  | 'GOAL_DECOMPOSITION'
  | 'MISSION_EXECUTION'
  | 'VERIFICATION'
  | 'SUMMARIZATION'
  | 'DOCUMENT_ANALYSIS'
  | 'DATA_ANALYSIS'
  | 'VISION'
  | 'VOICE'
  | 'EMBEDDING'
  | 'STRUCTURED_EXTRACTION'
  | 'CLASSIFICATION';

export type TaskComplexity = 'SIMPLE' | 'STANDARD' | 'COMPLEX' | 'CRITICAL';

export type PrivacyLevel = 'PUBLIC' | 'NORMAL' | 'PRIVATE' | 'HIGHLY_PRIVATE';

export type RoutingPolicy =
  | 'BALANCED'
  | 'LOCAL_FIRST'
  | 'QUALITY_FIRST'
  | 'SPEED_FIRST'
  | 'COST_FIRST'
  | 'PRIVACY_FIRST';

export type FallbackReason =
  | 'MODEL_UNAVAILABLE'
  | 'PROVIDER_TIMEOUT'
  | 'RATE_LIMIT'
  | 'CONTEXT_TOO_LARGE'
  | 'CAPABILITY_MISSING'
  | 'RESOURCE_PRESSURE'
  | 'AUTHORIZATION'
  | 'PROVIDER_ERROR';

export interface TaskProfile {
  readonly taskType: TaskType;
  readonly complexity: TaskComplexity;
  readonly estimatedInputTokens: number;
  readonly requiresTools: boolean;
  readonly requiresStructuredOutput: boolean;
  readonly requiresVision: boolean;
  readonly requiresReasoning: boolean;
  readonly requiresAudio: boolean;
  readonly privacyLevel: PrivacyLevel;
  readonly latencyPriority: 'LOW' | 'NORMAL' | 'HIGH';
  readonly costSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly preferredTier?: ModelTier;
  readonly agentId?: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly goalId?: string;
  readonly missionId?: string;
}

export interface CandidateModelScore {
  readonly modelId: string;
  readonly providerId: string;
  readonly totalScore: number;
  readonly capabilityScore: number;
  readonly taskSuitabilityScore: number;
  readonly privacyScore: number;
  readonly reliabilityScore: number;
  readonly latencyScore: number;
  readonly costScore: number;
  readonly passedHardConstraints: boolean;
  readonly rejectionReason?: string;
}

export interface RoutingDecision {
  readonly selected: boolean;
  readonly modelId?: string;
  readonly providerId?: string;
  readonly modelTier?: ModelTier;
  readonly reason: string;
  readonly taskProfile: TaskProfile;
  readonly policyApplied: RoutingPolicy;
  readonly estimatedCostUsd?: number;
  readonly estimatedLatencyMs?: number;
  readonly privacyClassification: PrivacyLevel;
  readonly fallbacks: Array<{ modelId: string; providerId: string; reason?: string }>;
  readonly candidateScores: CandidateModelScore[];
  readonly policyChecks: {
    readonly privacyPassed: boolean;
    readonly contextPassed: boolean;
    readonly capabilitiesPassed: boolean;
    readonly authorizationPassed: boolean;
    readonly resourceGovernorApproved: boolean;
  };
}

export interface ModelUsageAuditRecord {
  readonly id: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly taskType: TaskType;
  readonly complexity: TaskComplexity;
  readonly agentId?: string;
  readonly goalId?: string;
  readonly missionId?: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCostUsd: number;
  readonly latencyMs: number;
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly fallbackOccurred: boolean;
  readonly fallbackReason?: string;
  readonly routingReason: string;
  readonly policyApplied: RoutingPolicy;
  readonly createdAt: string;
}

export interface ModelPreferenceConfig {
  readonly id: string;
  readonly activePolicy: RoutingPolicy;
  readonly privacyThreshold: PrivacyLevel;
  readonly costLimitUsd: number;
  readonly defaultLocalModel: string;
  readonly defaultCloudModel: string;
  readonly weights?: {
    readonly capabilityWeight?: number;
    readonly taskSuitabilityWeight?: number;
    readonly privacyWeight?: number;
    readonly reliabilityWeight?: number;
    readonly latencyWeight?: number;
    readonly costWeight?: number;
  };
  readonly autoFallback?: boolean;
  readonly maxCloudCostPerTaskUsd?: number;
  readonly updatedAt: string;
}
