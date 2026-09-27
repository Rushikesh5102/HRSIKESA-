/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tool: ollama.chat
 */

import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../interfaces/execution.types.js';

export interface OllamaChatToolOutput {
  readonly model: string;
  readonly response: string;
  readonly durationMs: number;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
}

export class OllamaChatTool implements ITool<
  { prompt: string; model?: string; systemPrompt?: string; maxTokens?: number },
  OllamaChatToolOutput
> {
  public readonly id = 'ollama.chat';
  public readonly name = 'Ollama Direct Inference';
  public readonly description = 'Invokes a local Ollama model directly for bounded sub-task reasoning or classification. Recursive tool execution is strictly disabled.';
  public readonly version = '1.0.0';
  public readonly category = 'ollama';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['ollama.generate', 'model.inference'];

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      prompt: {
        type: 'string' as const,
        description: 'Prompt text to send to the local model.'
      },
      model: {
        type: 'string' as const,
        description: 'Target model name. Defaults to qwen2.5:7b.'
      },
      systemPrompt: {
        type: 'string' as const,
        description: 'Optional system prompt conditioning.'
      },
      maxTokens: {
        type: 'integer' as const,
        description: 'Maximum tokens to generate. Capped at 1024 to prevent runaway loops.'
      }
    },
    required: ['prompt']
  };

  public async execute(
    input: { prompt: string; model?: string; systemPrompt?: string; maxTokens?: number },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<OllamaChatToolOutput>> {
    const host = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    const targetModel = input.model || 'qwen2.5:7b';
    const maxTokens = Math.min(input.maxTokens ?? 512, 1024);

    const startTime = Date.now();
    try {
      const res = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          prompt: input.prompt,
          system: input.systemPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: maxTokens
          }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          error: `Ollama chat failed with HTTP ${res.status}: ${errText}`,
          durationMs: Date.now() - startTime
        };
      }

      const data = (await res.json()) as {
        response: string;
        prompt_eval_count?: number;
        eval_count?: number;
      };

      return {
        success: true,
        output: {
          model: targetModel,
          response: data.response,
          durationMs: Date.now() - startTime,
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count
        },
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: `Ollama chat invocation error: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - startTime
      };
    }
  }
}
