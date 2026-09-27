/**
 * HṚṢĪKEŚA (हृषीकेश) — Ollama Local Model Provider
 */

import { IModelProvider } from '../interfaces/model.provider.js';
import {
  ModelMetadata,
  ModelRequest,
  ChatRequest,
  ModelResponse,
  ProviderHealth,
  ModelCapability,
  ModelTier,
  LatencyClass
} from '../interfaces/model.types.js';
import { OllamaConfig } from '../../core/configuration/config.types.js';

interface OllamaTagModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaTagsResponse {
  models?: OllamaTagModel[];
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  done: boolean;
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
    tool_calls?: Array<{
      id?: string;
      function: {
        name: string;
        arguments: Record<string, unknown> | string;
      };
    }>;
  };
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  done: boolean;
}

export class OllamaProvider implements IModelProvider {
  public readonly id = 'ollama';
  public readonly displayName = 'Ollama Local Engine';
  public readonly isLocal = true;

  private readonly host: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  private cachedModels: ModelMetadata[] | null = null;
  private lastModelCacheTime = 0;
  private readonly MODEL_CACHE_TTL_MS = 60000; // 60s TTL

  constructor(config: OllamaConfig & { fetchFn?: typeof fetch; customFetch?: typeof fetch }) {
    this.host = config.host.replace(/\/+$/, '');
    this.defaultModel = config.defaultModel;
    this.timeoutMs = config.timeoutMs;
    this.fetchFn = config.fetchFn || config.customFetch || fetch;
  }

  public invalidateModelCache(): void {
    this.cachedModels = null;
    this.lastModelCacheTime = 0;
  }

  public isModelAvailable(modelId: string): boolean {
    if (!this.cachedModels) return false;
    return this.cachedModels.some((m) => m.id === modelId || m.id.startsWith(`${modelId}:`));
  }

  public async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await this.fetchFn(`${this.host}/api/version`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          status: 'degraded',
          message: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
          latencyMs,
          checkedAt: new Date().toISOString()
        };
      }

      const data = (await res.json()) as { version?: string };

      // Explicit health check refreshes the model availability cache
      await this.listModels(true);

      return {
        status: 'healthy',
        message: `Ollama operational (version: ${data.version || 'unknown'})`,
        latencyMs,
        checkedAt: new Date().toISOString()
      };
    } catch (err) {
      return {
        status: 'unreachable',
        message: `Ollama is unreachable at ${this.host} (${err instanceof Error ? err.message : String(err)})`,
        latencyMs: Date.now() - startTime,
        checkedAt: new Date().toISOString()
      };
    }
  }

  public async listModels(forceRefresh = false): Promise<ModelMetadata[]> {
    if (!forceRefresh && this.cachedModels && (Date.now() - this.lastModelCacheTime < this.MODEL_CACHE_TTL_MS)) {
      return [...this.cachedModels];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await this.fetchFn(`${this.host}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return this.cachedModels ? [...this.cachedModels] : [];
      }

      const data = (await res.json()) as OllamaTagsResponse;
      const rawModels = data.models || [];

      const models: ModelMetadata[] = rawModels.map((m) => {
        const paramSize = m.details?.parameter_size ? ` (${m.details.parameter_size})` : '';
        const quant = m.details?.quantization_level ? ` [${m.details.quantization_level}]` : '';
        const nameLower = m.name.toLowerCase();

        let capabilities: ModelCapability[] = ['text-generation', 'chat'];
        let modelTier: ModelTier = 'BALANCED_DEEP_LOCAL';
        let latencyClass: LatencyClass = 'MODERATE';
        let supportsTools = false;
        let supportsStructuredOutput = false;
        let supportsReasoning = false;

        if (nameLower.includes('embed')) {
          capabilities = ['embedding'];
          latencyClass = 'FAST';
        } else if (nameLower.includes('llama3.2') || nameLower.includes('3b')) {
          capabilities = ['text-generation', 'chat', 'code', 'tools', 'structured-output', 'json'];
          modelTier = 'FAST_LOCAL';
          latencyClass = 'FAST';
          supportsTools = true;
          supportsStructuredOutput = true;
        } else if (nameLower.includes('deepseek-r1') || nameLower.includes('1.5b')) {
          capabilities = ['text-generation', 'chat', 'reasoning'];
          modelTier = 'FAST_LOCAL';
          latencyClass = 'SLOW';
          supportsReasoning = true;
        } else if (nameLower.includes('qwen2.5') || nameLower.includes('7b')) {
          capabilities = ['text-generation', 'chat', 'code', 'tools', 'reasoning', 'structured-output', 'json'];
          modelTier = 'BALANCED_DEEP_LOCAL';
          latencyClass = 'MODERATE';
          supportsTools = true;
          supportsReasoning = true;
          supportsStructuredOutput = true;
        }

        let priority = 100;
        if (nameLower.includes('llama3.2') || nameLower.includes('3b')) {
          priority = 130; // Primary high-speed compact model (837ms TTFT, 14.4 t/s, 11/13 benchmark pass)
        } else if (nameLower.includes('qwen2.5') || nameLower.includes('7b')) {
          priority = 110; // Primary deep reasoning/planning model (12/13 benchmark pass, complex planning specialist)
        } else if (nameLower.includes('deepseek-r1') || nameLower.includes('1.5b')) {
          priority = 70; // Specialized thinking model (requires large token budget for <think> blocks)
        }

        return {
          id: m.name,
          providerId: this.id,
          displayName: `${m.name}${paramSize}${quant}`,
          isLocal: true,
          capabilities,
          modelTier,
          latencyClass,
          costClassification: 'free-local',
          availability: true,
          statusText: 'Installed locally in Ollama',
          priority,
          supportsTools,
          supportsStructuredOutput,
          supportsReasoning
        };
      });

      this.cachedModels = models;
      this.lastModelCacheTime = Date.now();
      return [...models];
    } catch {
      return this.cachedModels ? [...this.cachedModels] : [];
    }
  }

  public async generate(request: ModelRequest): Promise<ModelResponse> {
    const models = await this.listModels();
    const targetModel = request.preferredModel || (models.length > 0 ? models[0].id : this.defaultModel);

    const modelExists = models.some((m) => m.id === targetModel || m.id.startsWith(`${targetModel}:`));
    if (!modelExists && models.length === 0) {
      throw new Error(
        `Ollama has no models installed. Please run 'ollama pull ${targetModel}' in your terminal to download a model.`
      );
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const isHeavy = targetModel.includes('7b') || targetModel.includes('14b') || targetModel.includes('qwen2.5:7b');
      const keepAlive = isHeavy ? '2m' : '15m';

      const res = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          prompt: request.prompt,
          system: request.systemPrompt,
          stream: false,
          keep_alive: keepAlive,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 2048
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ollama generation failed with HTTP ${res.status}: ${errorText}`);
      }

      const data = (await res.json()) as OllamaGenerateResponse;
      const durationMs = Date.now() - startTime;

      return {
        text: data.response,
        providerId: this.id,
        modelId: targetModel,
        durationMs,
        isLocal: true,
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        }
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    const models = await this.listModels();

    // Resolve target model: prefer explicitly requested model → configured default → first available
    const resolveModel = (): string => {
      if (request.preferredModel) return request.preferredModel;
      // Use configured default if it exists in the installed list
      if (this.defaultModel && models.some((m) => m.id === this.defaultModel || m.id.startsWith(`${this.defaultModel}:`))) {
        return this.defaultModel;
      }
      // Skip embedding-only models for chat
      const chatModels = models.filter((m) => !m.id.includes('embed'));
      return chatModels.length > 0 ? chatModels[0].id : (models[0]?.id ?? this.defaultModel);
    };
    const targetModel = resolveModel();

    const modelExists = models.some((m) => m.id === targetModel || m.id.startsWith(`${targetModel}:`));
    if (!modelExists && models.length === 0) {
      throw new Error(
        `Ollama has no models installed. Please run 'ollama pull ${targetModel}' in your terminal to download a model.`
      );
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const effectiveTimeout = request.timeoutMs ?? this.timeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
    if (request.signal) {
      request.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const chatBody: Record<string, unknown> = {
        model: targetModel,
        messages: request.messages.map((m) => {
          const msgObj: Record<string, unknown> = {
            role: m.role,
            content: m.content
          };
          if (m.toolCalls && m.toolCalls.length > 0) {
            msgObj.tool_calls = m.toolCalls.map((tc) => ({
              id: tc.id,
              function: {
                name: tc.name,
                arguments: tc.arguments
              }
            }));
          }
          return msgObj;
        }),
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 512,
          num_ctx: 2048, // Optimized context window for fast local inference
          num_thread: 8 // Utilize multi-core parallel threads
        },
        keep_alive: (targetModel.includes('7b') || targetModel.includes('14b') || targetModel.includes('qwen2.5:7b')) ? '2m' : '15m',
        stream: !!(request.onToken || request.stream)
      };

      if (request.format) {
        chatBody.format = request.format;
      }

      // Only attach tools if explicitly requested and tools exist
      if (request.tools && request.tools.length > 0) {
        chatBody.tools = request.tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        }));
      }

      const res = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ollama chat failed with HTTP ${res.status}: ${errorText}`);
      }

      // 1. Streaming response handling
      if (request.onToken || request.stream) {
        if (!res.body) {
          throw new Error('Ollama streaming response body is null');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let totalPromptTokens = 0;
        let totalEvalTokens = 0;
        let rawToolCalls: any[] | undefined = undefined;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            try {
              const chunk = JSON.parse(trimmedLine) as OllamaChatResponse;
              if (chunk.message?.content) {
                accumulatedText += chunk.message.content;
                if (request.onToken) {
                  request.onToken(chunk.message.content);
                }
              }
              if (chunk.message?.tool_calls) {
                rawToolCalls = chunk.message.tool_calls;
              }
              if (chunk.prompt_eval_count) totalPromptTokens = chunk.prompt_eval_count;
              if (chunk.eval_count) totalEvalTokens = chunk.eval_count;
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }

        const durationMs = Date.now() - startTime;
        const toolCalls = rawToolCalls && rawToolCalls.length > 0
          ? rawToolCalls.map((tc, idx) => ({
              id: tc.id || `call_${Date.now()}_${idx}`,
              name: tc.function.name,
              arguments: typeof tc.function.arguments === 'string'
                ? (() => {
                    try { return JSON.parse(tc.function.arguments); }
                    catch { return {}; }
                  })()
                : (tc.function.arguments || {})
            }))
          : undefined;

        return {
          text: accumulatedText,
          providerId: this.id,
          modelId: targetModel,
          durationMs,
          isLocal: true,
          toolCalls,
          usage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalEvalTokens,
            totalTokens: totalPromptTokens + totalEvalTokens
          }
        };
      }

      // 2. Non-streaming JSON response handling
      const data = (await res.json()) as OllamaChatResponse;
      const durationMs = Date.now() - startTime;

      const rawToolCalls = data.message?.tool_calls;
      const toolCalls = rawToolCalls && rawToolCalls.length > 0
        ? rawToolCalls.map((tc, idx) => ({
            id: tc.id || `call_${Date.now()}_${idx}`,
            name: tc.function.name,
            arguments: typeof tc.function.arguments === 'string'
              ? (() => {
                  try { return JSON.parse(tc.function.arguments); }
                  catch { return {}; }
                })()
              : (tc.function.arguments || {})
          }))
        : undefined;

      return {
        text: data.message?.content || '',
        providerId: this.id,
        modelId: targetModel,
        durationMs,
        isLocal: true,
        toolCalls,
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        }
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Explicitly evicts a model from RAM to free system memory under pressure.
   * Sends keep_alive: 0 to Ollama daemon.
   */
  public async unloadModel(modelId: string): Promise<boolean> {
    try {
      const res = await this.fetchFn(`${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, keep_alive: 0 })
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
