/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tool: ollama.models
 */

import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../interfaces/execution.types.js';

export interface OllamaModelInfo {
  readonly name: string;
  readonly sizeGb: number;
  readonly parameterSize?: string;
  readonly quantization?: string;
  readonly family?: string;
  readonly modifiedAt?: string;
}

export interface OllamaModelsOutput {
  readonly host: string;
  readonly models: readonly OllamaModelInfo[];
  readonly totalModels: number;
}

export class OllamaModelsTool implements ITool<{ host?: string }, OllamaModelsOutput> {
  public readonly id = 'ollama.models';
  public readonly name = 'Ollama Models Discovery';
  public readonly description = 'Returns the list of locally installed Ollama neural models with their parameter sizes, quantizations, and footprints.';
  public readonly version = '1.0.0';
  public readonly category = 'ollama';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['ollama.list', 'models.inspect'];

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      host: {
        type: 'string' as const,
        description: 'Optional Ollama host URL. Defaults to http://127.0.0.1:11434.'
      }
    }
  };

  public async execute(
    input: { host?: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<OllamaModelsOutput>> {
    const host = (input.host || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');

    try {
      const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        return {
          success: false,
          error: `Ollama host returned HTTP ${res.status}: ${res.statusText}`,
          durationMs: 0
        };
      }

      const data = (await res.json()) as {
        models?: Array<{
          name: string;
          size: number;
          modified_at?: string;
          details?: {
            parameter_size?: string;
            quantization_level?: string;
            family?: string;
          };
        }>;
      };

      const rawModels = data.models || [];
      const models: OllamaModelInfo[] = rawModels.map((m) => ({
        name: m.name,
        sizeGb: Math.round((m.size / (1024 ** 3)) * 100) / 100,
        parameterSize: m.details?.parameter_size,
        quantization: m.details?.quantization_level,
        family: m.details?.family,
        modifiedAt: m.modified_at
      }));

      return {
        success: true,
        output: {
          host,
          models,
          totalModels: models.length
        },
        durationMs: 0
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to contact Ollama at ${host}: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: 0
      };
    }
  }
}
