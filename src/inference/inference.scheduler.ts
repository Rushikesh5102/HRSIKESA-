/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Inference Scheduler & Hardware-Agnostic Execution Engine
 */

import {
  InferenceBackendType,
  ComputeDeviceType,
  ComputeTier,
  ResponseMode,
  getResponseModeConfig,
  CancellationToken,
  FP01StructuredTiming,
  DetailedDiagnosticSpans,
} from './backend.types.js';
import { InferenceRegistry } from './inference.registry.js';
import { ChatMessage, ToolDefinition } from '../models/interfaces/model.types.js';
import { FastChatGate } from '../conversation/fast.chat.gate.js';

export interface SchedulerExecutionRequest {
  messages: ChatMessage[];
  tier?: ComputeTier;
  responseMode?: ResponseMode;
  preferredModel?: string;
  preferredBackend?: InferenceBackendType;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  cancellationToken?: CancellationToken;
  onToken?: (token: string) => void;
  correlationId?: string;
  sessionId?: string;
  promptSummary?: string;
}

export interface SchedulerExecutionResult {
  text: string;
  modelId: string;
  backendType: InferenceBackendType;
  deviceType: ComputeDeviceType;
  modelTier: ComputeTier;
  durationMs: number;
  timeToFirstTokenMs: number;
  timing: FP01StructuredTiming;
}

export class InferenceScheduler {
  private static instance: InferenceScheduler | null = null;
  private readonly registry: InferenceRegistry;

  private constructor() {
    this.registry = InferenceRegistry.getInstance();
  }

  public static getInstance(): InferenceScheduler {
    if (!this.instance) {
      this.instance = new InferenceScheduler();
    }
    return this.instance;
  }

  /**
   * Resolves the appropriate model tier based on task complexity.
   */
  public resolveModelForTier(tier: ComputeTier, preferredModel?: string): { modelId: string; tier: ComputeTier } {
    if (preferredModel) {
      return { modelId: preferredModel, tier };
    }

    switch (tier) {
      case 'T0':
        return { modelId: 'deterministic-fast-gate', tier: 'T0' };
      case 'T1':
        // Fast/tiny local model
        return { modelId: 'deepseek-r1:1.5b', tier: 'T1' };
      case 'T2':
      default:
        // Normal interactive local model (Llama 3.2 3B or equivalent small fast model)
        return { modelId: 'llama3.2:3b', tier: 'T2' };
      case 'T3':
        // Complex reasoning (Qwen 2.5 7B)
        return { modelId: 'qwen2.5:7b', tier: 'T3' };
      case 'T4':
        // Heavy agentic coding / research
        return { modelId: 'qwen2.5:7b', tier: 'T4' };
    }
  }

  /**
   * Selects optimal backend in priority order:
   * 1. Preferred backend if specified and available
   * 2. Resident model engine (Ollama with keep_alive: 15m) for low-latency interactive conversation (TTFT < 400ms)
   * 3. Local Intel GPU (llama.cpp Vulkan)
   * 4. Local CPU (llama.cpp CPU)
   */
  public selectOptimalBackend(preferredBackend?: InferenceBackendType, tier: ComputeTier = 'T2'): InferenceBackendType {
    if (preferredBackend) {
      const avail = this.registry.getBackendAvailability(preferredBackend);
      if (avail?.available) {
        return preferredBackend;
      }
    }

    // For interactive T1/T2 tiers: Ollama maintains warm model residency in memory
    // delivering 300ms TTFT vs 15s cold spawn on single-shot CLI
    const ollamaAvail = this.registry.getBackendAvailability('OLLAMA');
    if (ollamaAvail?.available && (tier === 'T1' || tier === 'T2')) {
      return 'OLLAMA';
    }

    // Check Intel Arc GPU via Vulkan
    const vulkanAvail = this.registry.getBackendAvailability('LLAMACPP_VULKAN');
    if (vulkanAvail?.available) {
      return 'LLAMACPP_VULKAN';
    }

    // Check llama.cpp CPU
    const cpuAvail = this.registry.getBackendAvailability('LLAMACPP_CPU');
    if (cpuAvail?.available) {
      return 'LLAMACPP_CPU';
    }

    // Fallback to Ollama
    return 'OLLAMA';
  }

  /**
   * Hardware-agnostic execution with token streaming and deep timing instrumentation.
   */
  public async scheduleAndExecute(request: SchedulerExecutionRequest): Promise<SchedulerExecutionResult> {
    const correlationId = request.correlationId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessionId = request.sessionId || 'default';
    const requestReceivedAt = new Date().toISOString();
    const startTime = Date.now();

    const spans: DetailedDiagnosticSpans = {
      requestReceivedAt,
      totalWallMs: 0,
    };

    // 1. Model Selection
    const tModelSelStart = Date.now();
    const effectiveTier = request.tier || 'T2';
    const { modelId, tier } = this.resolveModelForTier(effectiveTier, request.preferredModel);
    spans.modelSelectionMs = Date.now() - tModelSelStart;

    // Fast-path T0 deterministic handling (<5ms)
    if (tier === 'T0' || modelId === 'deterministic-fast-gate') {
      const lastUserMsg = request.messages.filter(m => m.role === 'user').pop()?.content || '';
      const fastGate = new FastChatGate();
      const decision = fastGate.evaluate(lastUserMsg);
      const fastText = decision.instantResponse || 'Standing by.';
      const totalWallMs = Date.now() - startTime;
      if (request.onToken) request.onToken(fastText);
      return {
        text: fastText,
        modelId: 'deterministic-fast-gate',
        backendType: 'LLAMACPP_CPU',
        deviceType: 'LOCAL_CPU',
        modelTier: 'T0',
        durationMs: totalWallMs,
        timeToFirstTokenMs: 1,
        timing: {
          correlationId,
          sessionId,
          promptSummary: lastUserMsg.slice(0, 50),
          modelTier: 'T0',
          modelSelected: 'deterministic-fast-gate',
          backendSelected: 'LLAMACPP_CPU',
          deviceUsed: 'LOCAL_CPU',
          isFastPath: true,
          tokensPrompt: 0,
          tokensGenerated: 1,
          tokensPerSecond: 1000,
          spans: {
            ...spans,
            totalWallMs,
          },
        },
      };
    }

    // 2. Backend Selection
    const tBackendSelStart = Date.now();
    const backendType = this.selectOptimalBackend(request.preferredBackend, tier);
    spans.backendSelectionMs = Date.now() - tBackendSelStart;

    const tAvailStart = Date.now();
    const llamaCpp = this.registry.getLlamaCppBackend();
    const ollama = this.registry.getOllamaBackend();
    spans.modelAvailabilityCheckMs = Date.now() - tAvailStart;

    // 3. Response Mode Configuration & Token Budgeting (Part C & G)
    const modeConfig = getResponseModeConfig(request.responseMode || 'NORMAL');
    const effectiveMaxTokens = request.maxTokens ?? modeConfig.maxTokens;
    const effectiveMessages = [...request.messages];
    if (modeConfig.promptGuidance && effectiveMessages.length > 0) {
      const lastIdx = effectiveMessages.length - 1;
      const lastMsg = effectiveMessages[lastIdx];
      if (lastMsg.role === 'user') {
        effectiveMessages[lastIdx] = {
          ...lastMsg,
          content: `${lastMsg.content}\n\n${modeConfig.promptGuidance}`
        };
      }
    }

    // 4. Execution via selected backend
    this.registry.recordModelUsage(modelId, backendType, tier);

    let text = '';
    let deviceType: ComputeDeviceType = 'LOCAL_CPU';
    let timeToFirstTokenMs = 0;
    let tokensPrompt = 0;
    let tokensGenerated = 0;
    let tokensPerSecond = 0;

    try {
      if (backendType === 'LLAMACPP_VULKAN' || backendType === 'LLAMACPP_CPU') {
        deviceType = backendType === 'LLAMACPP_VULKAN' ? 'LOCAL_INTEL_GPU' : 'LOCAL_CPU';

        try {
          const result = await llamaCpp.executeChat({
            modelId,
            messages: effectiveMessages,
            temperature: request.temperature,
            maxTokens: effectiveMaxTokens,
            useVulkan: backendType === 'LLAMACPP_VULKAN',
            cancellationToken: request.cancellationToken,
            onToken: (tok) => {
              if (!timeToFirstTokenMs) {
                timeToFirstTokenMs = Date.now() - startTime;
              }
              if (request.onToken) request.onToken(tok);
            },
            tools: request.tools,
          });

          text = result.text;
          deviceType = result.deviceType;
          timeToFirstTokenMs = result.timeToFirstTokenMs;
          tokensPrompt = result.promptTokens;
          tokensGenerated = result.generatedTokens;
          tokensPerSecond = result.generationTokensPerSec;
          spans.promptEvaluationMs = result.promptMs;
          spans.generationMs = result.generationMs;
          spans.timeToFirstTokenMs = timeToFirstTokenMs;
        } catch {
          // Graceful fallback to Ollama if llama-cli encounters process errors
          deviceType = 'LOCAL_CPU';
          const result = await ollama.executeChat({
            modelId,
            messages: effectiveMessages,
            temperature: request.temperature,
            maxTokens: effectiveMaxTokens,
            cancellationToken: request.cancellationToken,
            onToken: (tok) => {
              if (!timeToFirstTokenMs) {
                timeToFirstTokenMs = Date.now() - startTime;
              }
              if (request.onToken) request.onToken(tok);
            },
            tools: request.tools,
          });

          text = result.text;
          deviceType = result.deviceType;
          timeToFirstTokenMs = result.timeToFirstTokenMs;
          tokensPrompt = result.promptTokens;
          tokensGenerated = result.generatedTokens;
          tokensPerSecond = result.generationTokensPerSec;
          spans.promptEvaluationMs = result.promptMs;
          spans.generationMs = result.generationMs;
          spans.timeToFirstTokenMs = timeToFirstTokenMs;
        }
      } else {
        // Ollama Fallback
        deviceType = 'LOCAL_CPU';
        const result = await ollama.executeChat({
          modelId,
          messages: effectiveMessages,
          temperature: request.temperature,
          maxTokens: effectiveMaxTokens,
          cancellationToken: request.cancellationToken,
          onToken: (tok) => {
            if (!timeToFirstTokenMs) {
              timeToFirstTokenMs = Date.now() - startTime;
            }
            if (request.onToken) request.onToken(tok);
          },
          tools: request.tools,
        });

        text = result.text;
        deviceType = result.deviceType;
        timeToFirstTokenMs = result.timeToFirstTokenMs;
        tokensPrompt = result.promptTokens;
        tokensGenerated = result.generatedTokens;
        tokensPerSecond = result.generationTokensPerSec;
        spans.promptEvaluationMs = result.promptMs;
        spans.generationMs = result.generationMs;
        spans.timeToFirstTokenMs = timeToFirstTokenMs;
      }
    } finally {
      this.registry.recordModelFinished(modelId);
    }

    const totalWallMs = Date.now() - startTime;
    spans.totalWallMs = totalWallMs;
    spans.totalGenerationMs = totalWallMs - (spans.timeToFirstTokenMs || 0);

    const timing: FP01StructuredTiming = {
      correlationId,
      sessionId,
      promptSummary: request.promptSummary || (request.messages[request.messages.length - 1]?.content || '').slice(0, 50),
      modelTier: tier,
      modelSelected: modelId,
      backendSelected: backendType,
      deviceUsed: deviceType,
      spans,
      tokensPrompt,
      tokensGenerated,
      tokensPerSecond,
      isFastPath: false,
    };

    return {
      text,
      modelId,
      backendType,
      deviceType,
      modelTier: tier,
      durationMs: totalWallMs,
      timeToFirstTokenMs: timeToFirstTokenMs || totalWallMs,
      timing,
    };
  }
}
