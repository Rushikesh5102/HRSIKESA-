/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Inference Backend Abstractions & Type Definitions
 */

export type InferenceBackendType =
  | 'LLAMACPP_VULKAN'
  | 'LLAMACPP_CPU'
  | 'LLAMACPP_SYCL'
  | 'OLLAMA'
  | 'LAN_WORKER'
  | 'REMOTE_WORKER'
  | 'CLOUD_GPU';

export type ComputeDeviceType =
  | 'LOCAL_INTEL_GPU'
  | 'LOCAL_OTHER_GPU'
  | 'LOCAL_CPU'
  | 'LAN_WORKER'
  | 'REMOTE_WORKER'
  | 'CLOUD_GPU';

export type ComputeTier =
  | 'T0' // Deterministic, zero-model (<100ms)
  | 'T1' // Tiny/fast local model (1B-3B)
  | 'T2' // Normal interactive local model (3B-4B)
  | 'T3' // Complex local reasoning (7B+)
  | 'T4'; // Heavy research/coding/agentic multi-step reasoning

export type ResponseMode =
  | 'CONCISE'   // 40-80 tokens, direct, no fluff
  | 'NORMAL'    // 150-256 tokens, standard interactive conversational (default)
  | 'DETAILED'  // 384-512 tokens, detailed explanations and code snippets
  | 'DEEP';     // 768-1024 tokens, deep analytical breakdown & comprehensive code

export interface ResponseModeConfig {
  readonly mode: ResponseMode;
  readonly maxTokens: number;
  readonly promptGuidance?: string;
}

export function getResponseModeConfig(mode: ResponseMode = 'NORMAL'): ResponseModeConfig {
  switch (mode) {
    case 'CONCISE':
      return {
        mode: 'CONCISE',
        maxTokens: 75,
        promptGuidance: '[Instruction: Respond concisely in 1-2 direct sentences or brief bullet points. Be high-signal and avoid filler.]'
      };
    case 'DETAILED':
      return {
        mode: 'DETAILED',
        maxTokens: 512,
        promptGuidance: '[Instruction: Provide a comprehensive, detailed explanation with examples where applicable.]'
      };
    case 'DEEP':
      return {
        mode: 'DEEP',
        maxTokens: 1024,
        promptGuidance: '[Instruction: Provide deep analytical reasoning, edge-case coverage, and comprehensive architecture.]'
      };
    case 'NORMAL':
    default:
      return {
        mode: 'NORMAL',
        maxTokens: 256
      };
  }
}

export interface BackendAvailability {
  readonly backendType: InferenceBackendType;
  readonly deviceType: ComputeDeviceType;
  readonly available: boolean;
  readonly deviceName?: string;
  readonly driverVersion?: string;
  readonly vramBytes?: number;
  readonly sharedVramBytes?: number;
  readonly reason?: string;
  readonly binaryPath?: string;
  readonly testedFps?: number;
  readonly testedPromptTs?: number;
  readonly testedGenTs?: number;
}

export interface HardwareInspectionReport {
  readonly cpuName: string;
  readonly physicalCores: number;
  readonly logicalProcessors: number;
  readonly totalRamBytes: number;
  readonly freeRamBytes: number;
  readonly cpuFeatures: readonly string[];
  readonly gpuName: string;
  readonly gpuVendor: string;
  readonly driverVersion: string;
  readonly vulkanSupported: boolean;
  readonly vulkanDeviceName?: string;
  readonly vulkanMemoryMiB?: number;
  readonly levelZeroSupported: boolean;
  readonly syclAvailable: boolean;
  readonly backends: Record<InferenceBackendType, BackendAvailability>;
  readonly timestamp: string;
}

export interface ModelResidencyRecord {
  readonly modelId: string;
  readonly backendType: InferenceBackendType;
  readonly sizeBytes: number;
  readonly ramBytesEstimate: number;
  readonly vramBytesEstimate: number;
  readonly lastUsedAt: string;
  readonly activeRequests: number;
  readonly resident: boolean;
  readonly priorityTier: ComputeTier;
}

export interface DetailedDiagnosticSpans {
  requestReceivedAt: string;
  normalizationMs?: number;
  intentClassificationMs?: number;
  fastPathLookupMs?: number;
  memoryRetrievalMs?: number;
  knowledgeRetrievalMs?: number;
  modelSelectionMs?: number;
  backendSelectionMs?: number;
  modelAvailabilityCheckMs?: number;
  modelLoadMs?: number;
  promptConstructionMs?: number;
  promptEvaluationMs?: number;
  timeToFirstTokenMs?: number;
  generationMs?: number;
  totalGenerationMs?: number;
  persistenceMs?: number;
  memoryIndexingMs?: number;
  telemetryMs?: number;
  finalResponseDeliveryMs?: number;
  totalWallMs: number;
}

export interface FP01StructuredTiming {
  readonly correlationId: string;
  readonly sessionId: string;
  readonly promptSummary: string;
  readonly modelTier: ComputeTier;
  readonly modelSelected: string;
  readonly backendSelected: InferenceBackendType;
  readonly deviceUsed: ComputeDeviceType;
  readonly spans: DetailedDiagnosticSpans;
  readonly tokensPrompt?: number;
  readonly tokensGenerated?: number;
  readonly tokensPerSecond?: number;
  readonly isFastPath: boolean;
}

export interface AssumptionRecord {
  readonly id: string;
  readonly assumption: string;
  readonly context: string;
  readonly category: 'STYLING' | 'DEFAULTS' | 'TOOL_SELECTION' | 'DATA_FORMAT' | 'GENERAL';
  readonly timestamp: string;
}

export interface ExecutionDecision {
  readonly action: 'EXECUTE' | 'ASK_CLARIFICATION';
  readonly reason: string;
  readonly assumptions: readonly AssumptionRecord[];
  readonly blockingQuestion?: string;
  readonly riskTier?: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
}

export interface CancellationToken {
  isCancelled: boolean;
  onCancel(callback: () => void): void;
  cancel(reason?: string): void;
  readonly reason?: string;
}

export interface OfflineQueueEntry {
  readonly id: string;
  readonly action: string;
  readonly payload: Record<string, unknown>;
  readonly queuedAt: string;
  readonly status: 'OFFLINE_QUEUED' | 'RETRYING' | 'EXECUTED' | 'DISCARDED';
}
