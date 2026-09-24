/**
 * HṚṢĪKEŚA (हृषीकेश) — Ollama Embedding Adapter
 *
 * Implements IEmbeddingProvider using the Ollama /api/embed endpoint
 * with nomic-embed-text (768-dimensional, ~274 MB, unloads when idle).
 *
 * Resource Safety:
 * - Does NOT acquire HardwareDetector lock itself; caller (SemanticIndexer) manages lock
 * - Timeout: 15s per call to prevent hanging
 * - L2-normalizes output so cosine similarity = dot product
 */

import { IEmbeddingProvider, EmbeddingVector, EmbeddingProviderHealth } from './embedding.provider.js';
import { ILogger } from '../../core/logging/logger.types.js';

interface OllamaEmbedResponse {
  model?: string;
  embeddings?: number[][];
  embedding?: number[];   // legacy single-embedding field
}

export interface OllamaEmbeddingConfig {
  readonly host: string;
  readonly modelId: string;
  readonly dimensions: number;
  readonly timeoutMs?: number;
}

export const DEFAULT_NOMIC_CONFIG: OllamaEmbeddingConfig = {
  host: 'http://localhost:11434',
  modelId: 'nomic-embed-text',
  dimensions: 768,
  timeoutMs: 15000,
};

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
  public readonly id = 'ollama-embed';
  public readonly modelId: string;
  public readonly dimensions: number;

  private readonly host: string;
  private readonly timeoutMs: number;
  private readonly logger?: ILogger;

  constructor(config: OllamaEmbeddingConfig = DEFAULT_NOMIC_CONFIG, logger?: ILogger) {
    this.host = config.host.replace(/\/+$/, '');
    this.modelId = config.modelId;
    this.dimensions = config.dimensions;
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.logger = logger?.child('OllamaEmbeddingProvider');
  }

  public async health(): Promise<EmbeddingProviderHealth> {
    const checkedAt = new Date().toISOString();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.host}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { status: 'degraded', modelId: this.modelId, dimensions: this.dimensions, message: `Ollama HTTP ${res.status}`, checkedAt };
      }

      const data = await res.json() as { models?: Array<{ name: string }> };
      const installed = (data.models || []).some(
        (m) => m.name === this.modelId || m.name.startsWith(this.modelId + ':')
      );

      if (!installed) {
        return {
          status: 'unavailable',
          modelId: this.modelId,
          dimensions: this.dimensions,
          message: `Model '${this.modelId}' is not installed in Ollama. Run: ollama pull ${this.modelId}`,
          checkedAt
        };
      }

      return { status: 'healthy', modelId: this.modelId, dimensions: this.dimensions, message: `${this.modelId} is ready`, checkedAt };
    } catch (err) {
      return {
        status: 'unavailable',
        modelId: this.modelId,
        dimensions: this.dimensions,
        message: `Ollama is unreachable: ${err instanceof Error ? err.message : String(err)}`,
        checkedAt
      };
    }
  }

  public async embedText(text: string): Promise<EmbeddingVector> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.host}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.modelId, input: text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama /api/embed returned HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json() as OllamaEmbedResponse;

      // Ollama embed API returns `embeddings` (array of arrays for batch) or `embedding` (legacy)
      let raw: number[] | undefined;
      if (data.embeddings && data.embeddings.length > 0) {
        raw = data.embeddings[0];
      } else if (data.embedding) {
        raw = data.embedding;
      }

      if (!raw || raw.length === 0) {
        throw new Error(`Ollama returned empty embedding for model '${this.modelId}'`);
      }

      const values = this.normalizeL2(new Float32Array(raw));
      return { values, dimensions: values.length };
    } catch (err) {
      clearTimeout(timeoutId);
      this.logger?.warn(`embedText failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  public async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    const results: EmbeddingVector[] = [];
    for (const text of texts) {
      results.push(await this.embedText(text));
    }
    return results;
  }

  /**
   * L2-normalizes a Float32Array so that cosine similarity equals dot product.
   */
  private normalizeL2(vec: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm < 1e-10) return vec;
    const out = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      out[i] = vec[i] / norm;
    }
    return out;
  }
}
