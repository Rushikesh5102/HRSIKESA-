/**
 * HṚṢĪKEŚA (हृषीकेश) — Embedding Provider Interface
 *
 * Vendor-neutral abstraction for text-to-vector embedding.
 * Implementations must be safe to call from within the resource-locked
 * inference pipeline — see HardwareDetector.acquireLocalModelLock().
 */

export interface EmbeddingVector {
  readonly values: Float32Array;
  readonly dimensions: number;
}

export type EmbeddingProviderHealthStatus = 'healthy' | 'degraded' | 'unavailable';

export interface EmbeddingProviderHealth {
  readonly status: EmbeddingProviderHealthStatus;
  readonly modelId: string;
  readonly dimensions: number;
  readonly message: string;
  readonly checkedAt: string;
}

export interface IEmbeddingProvider {
  /** Stable provider ID (e.g., 'ollama-nomic-embed-text') */
  readonly id: string;

  /** Model identifier used for embedding calls */
  readonly modelId: string;

  /** Output vector dimensionality */
  readonly dimensions: number;

  /**
   * Embed a single text string.
   * Must throw only on catastrophic failures; degraded state returns a zero vector.
   */
  embedText(text: string): Promise<EmbeddingVector>;

  /**
   * Embed a batch of texts. Sequential, not concurrent, to respect resource limits.
   */
  embedBatch(texts: string[]): Promise<EmbeddingVector[]>;

  /**
   * Health check — must never throw.
   */
  health(): Promise<EmbeddingProviderHealth>;
}
