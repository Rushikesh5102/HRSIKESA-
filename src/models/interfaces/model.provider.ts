/**
 * HṚṢĪKEŚA (हृषीकेश) — Vendor-Neutral IModelProvider Interface
 */

import {
  ModelMetadata,
  ModelRequest,
  ChatRequest,
  ModelResponse,
  ProviderHealth
} from './model.types.js';

export interface IModelProvider {
  readonly id: string;
  readonly displayName: string;
  readonly isLocal: boolean;

  /**
   * Check whether this provider is reachable, configured, and operational.
   */
  checkHealth(): Promise<ProviderHealth>;

  /**
   * List all models currently available through this provider.
   */
  listModels(): Promise<ModelMetadata[]>;

  /**
   * Execute text generation or completion using the selected model.
   */
  generate(request: ModelRequest): Promise<ModelResponse>;

  /**
   * Execute multi-turn conversational generation using structured message history.
   */
  chat(request: ChatRequest): Promise<ModelResponse>;
}
