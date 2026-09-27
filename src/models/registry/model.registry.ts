/**
 * HṚṢĪKEŚA (हृषीकेश) — Model Registry
 *
 * Phase 18: Enhanced Model & Provider Metadata Registry
 */

import { IModelProvider } from '../interfaces/model.provider.js';
import { ModelMetadata, ProviderHealth, ModelPricing } from '../interfaces/model.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface RegisteredProviderRecord {
  readonly provider: IModelProvider;
  health: ProviderHealth;
  models: ModelMetadata[];
  enabled: boolean;
  lastRefreshedAt: string;
}

export class ModelRegistry {
  private readonly providers = new Map<string, RegisteredProviderRecord>();
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(eventBus?: EventBus, logger?: ILogger) {
    this.eventBus = eventBus;
    this.logger = logger?.child('ModelRegistry');
  }

  public async registerProvider(provider: IModelProvider): Promise<void> {
    const health = await provider.checkHealth();
    let models: ModelMetadata[] = [];

    if (health.status === 'healthy' || health.status === 'degraded') {
      try {
        const rawModels = await provider.listModels();
        models = rawModels.map((m) => this.enrichModelMetadata(m, provider));
      } catch (err) {
        this.logger?.warn(`Failed to list models for provider ${provider.id}`, { error: String(err) });
      }
    }

    const record: RegisteredProviderRecord = {
      provider,
      health,
      models,
      enabled: true,
      lastRefreshedAt: new Date().toISOString(),
    };

    this.providers.set(provider.id, record);

    this.logger?.info(`Registered model provider: ${provider.displayName}`, {
      providerId: provider.id,
      isLocal: provider.isLocal,
      status: health.status,
      modelsCount: models.length,
    });

    for (const model of models) {
      this.eventBus?.emit('model.registered', {
        providerId: provider.id,
        modelId: model.id,
        displayName: model.displayName,
        isLocal: model.isLocal,
      });
    }
  }

  public getProvider(id: string): IModelProvider | undefined {
    return this.providers.get(id)?.provider;
  }

  public getProviderRecord(id: string): RegisteredProviderRecord | undefined {
    return this.providers.get(id);
  }

  public getRecord(id: string): RegisteredProviderRecord | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): IModelProvider[] {
    return Array.from(this.providers.values()).map((r) => r.provider);
  }

  public getAllRecords(): RegisteredProviderRecord[] {
    return Array.from(this.providers.values());
  }

  public setProviderEnabled(id: string, enabled: boolean): boolean {
    const record = this.providers.get(id);
    if (!record) return false;
    record.enabled = enabled;
    return true;
  }

  public async refreshAll(): Promise<void> {
    for (const [id, record] of this.providers.entries()) {
      const health = await record.provider.checkHealth();
      let models: ModelMetadata[] = [];
      if (health.status === 'healthy' || health.status === 'degraded') {
        try {
          const rawModels = await record.provider.listModels();
          models = rawModels.map((m) => this.enrichModelMetadata(m, record.provider));
        } catch (err) {
          this.logger?.warn(`Error refreshing models for ${id}:`, { error: String(err) });
        }
      }

      this.providers.set(id, {
        provider: record.provider,
        health,
        models,
        enabled: record.enabled,
        lastRefreshedAt: new Date().toISOString(),
      });
    }
  }

  public getAllModels(): ModelMetadata[] {
    const all: ModelMetadata[] = [];
    for (const record of this.providers.values()) {
      if (record.enabled) {
        all.push(...record.models);
      }
    }
    return all;
  }

  public getAvailableModels(): ModelMetadata[] {
    return this.getAllModels().filter((m) => m.availability);
  }

  public getModel(providerId: string, modelId: string): ModelMetadata | undefined {
    const record = this.providers.get(providerId);
    if (!record || !record.enabled) return undefined;
    return record.models.find((m) => m.id === modelId);
  }

  public getModelById(modelId: string): { model: ModelMetadata; provider: IModelProvider } | undefined {
    for (const record of this.providers.values()) {
      if (record.enabled) {
        const found = record.models.find((m) => m.id === modelId);
        if (found) {
          return { model: found, provider: record.provider };
        }
      }
    }
    return undefined;
  }

  /**
   * Enriches model metadata with observable capability profiles, context limits, and pricing.
   */
  private enrichModelMetadata(raw: ModelMetadata, provider: IModelProvider): ModelMetadata {
    const isLocal = provider.isLocal;
    const lowerId = raw.id.toLowerCase();

    // Default context windows
    let contextWindow = raw.contextWindow || (isLocal ? 8192 : 128000);
    if (lowerId.includes('gpt-4o') || lowerId.includes('claude-3-5')) {
      contextWindow = 128000;
    } else if (lowerId.includes('gemini-1.5') || lowerId.includes('gemini-2.0')) {
      contextWindow = 1000000;
    } else if (lowerId.includes('qwen2.5')) {
      contextWindow = 32768;
    }

    // Default pricing metadata ($ per 1M tokens)
    let pricing: ModelPricing | undefined;
    if (!isLocal) {
      if (lowerId.includes('gpt-4o-mini') || lowerId.includes('claude-3-5-haiku')) {
        pricing = { promptPerMillionUsd: 0.15, completionPerMillionUsd: 0.60 };
      } else if (lowerId.includes('gpt-4o') || lowerId.includes('claude-3-5-sonnet')) {
        pricing = { promptPerMillionUsd: 2.50, completionPerMillionUsd: 10.00 };
      } else if (lowerId.includes('gemini-1.5-flash')) {
        pricing = { promptPerMillionUsd: 0.075, completionPerMillionUsd: 0.30 };
      } else {
        pricing = { promptPerMillionUsd: 1.00, completionPerMillionUsd: 3.00 };
      }
    }

    const capabilities = new Set(raw.capabilities);
    if (isLocal) {
      capabilities.add('chat');
      capabilities.add('text-generation');
      if (lowerId.includes('coder')) capabilities.add('code');
      if (lowerId.includes('qwen2.5')) {
        capabilities.add('code');
        capabilities.add('tools');
        capabilities.add('structured-output');
        capabilities.add('json');
      }
      if (lowerId.includes('r1') || lowerId.includes('deepseek')) {
        capabilities.add('reasoning');
      }
      if (lowerId.includes('llama3.2') || lowerId.includes('llama-3.2')) {
        capabilities.add('tools');
        capabilities.add('structured-output');
        capabilities.add('json');
      }
    } else {
      capabilities.add('chat');
      capabilities.add('text-generation');
      capabilities.add('tools');
      capabilities.add('structured-output');
      capabilities.add('json');
      capabilities.add('reasoning');
      if (lowerId.includes('vision') || lowerId.includes('4o') || lowerId.includes('sonnet') || lowerId.includes('gemini')) {
        capabilities.add('vision');
      }
    }

    const supportsTools = capabilities.has('tools');
    const supportsStructuredOutput = capabilities.has('structured-output') || capabilities.has('json');
    const supportsVision = capabilities.has('vision');
    const supportsReasoning = capabilities.has('reasoning') || lowerId.includes('qwen2.5') || lowerId.includes('gpt-4') || lowerId.includes('r1') || lowerId.includes('deepseek');

    return {
      ...raw,
      contextWindow,
      capabilities: Array.from(capabilities),
      pricing,
      latencyClass: isLocal ? 'FAST' : 'MODERATE',
      costClass: isLocal ? 'FREE' : (pricing && pricing.promptPerMillionUsd < 0.5 ? 'LOW' : 'MEDIUM'),
      privacyClass: isLocal ? 'LOCAL_PRIVATE' : 'CLOUD_AUTHORIZED',
      supportsTools,
      supportsStructuredOutput,
      supportsVision,
      supportsReasoning,
    };
  }
}
