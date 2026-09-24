import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { ModelMetadata, ModelRequest, ModelResponse, ProviderHealth, ChatRequest } from '../src/models/interfaces/model.types.js';

class MockProvider implements IModelProvider {
  public readonly id: string;
  public readonly displayName: string;
  public readonly isLocal: boolean;
  private readonly healthStatus: ProviderHealth['status'];
  private readonly mockModels: ModelMetadata[];

  constructor(id: string, isLocal: boolean, healthStatus: ProviderHealth['status'], models: ModelMetadata[] = []) {
    this.id = id;
    this.displayName = `Mock ${id}`;
    this.isLocal = isLocal;
    this.healthStatus = healthStatus;
    this.mockModels = models;
  }

  public async checkHealth(): Promise<ProviderHealth> {
    return {
      status: this.healthStatus,
      message: `Mock health: ${this.healthStatus}`,
      checkedAt: new Date().toISOString()
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return this.mockModels;
  }

  public async generate(request: ModelRequest): Promise<ModelResponse> {
    return {
      text: `Generated response for: ${request.prompt}`,
      providerId: this.id,
      modelId: request.preferredModel || 'default-model',
      durationMs: 50,
      isLocal: this.isLocal
    };
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    const lastMessage = request.messages[request.messages.length - 1]?.content || '';
    return {
      text: `Chat response for: ${lastMessage}`,
      providerId: this.id,
      modelId: request.preferredModel || 'default-model',
      durationMs: 50,
      isLocal: this.isLocal
    };
  }
}

describe('Model Registry Subsystem', () => {
  test('should register and retrieve providers and their models', async () => {
    const registry = new ModelRegistry();
    const mockModel: ModelMetadata = {
      id: 'mock-7b',
      providerId: 'mock-p1',
      displayName: 'Mock 7B',
      isLocal: true,
      capabilities: ['text-generation'],
      costClassification: 'free-local',
      availability: true,
      statusText: 'Available',
      priority: 100
    };

    const provider = new MockProvider('mock-p1', true, 'healthy', [mockModel]);
    await registry.registerProvider(provider);

    assert.equal(registry.getAllProviders().length, 1);
    assert.equal(registry.getProvider('mock-p1')?.id, 'mock-p1');
    assert.equal(registry.getAllModels().length, 1);
    assert.equal(registry.getModel('mock-p1', 'mock-7b')?.displayName, 'Mock 7B');
  });

  test('should not register models if provider is unconfigured or unreachable', async () => {
    const registry = new ModelRegistry();
    const mockModel: ModelMetadata = {
      id: 'cloud-model',
      providerId: 'cloud-p',
      displayName: 'Cloud Model',
      isLocal: false,
      capabilities: ['text-generation'],
      costClassification: 'pay-per-token',
      availability: false,
      statusText: 'Unconfigured',
      priority: 50
    };

    const provider = new MockProvider('cloud-p', false, 'unconfigured', [mockModel]);
    await registry.registerProvider(provider);

    assert.equal(registry.getAllProviders().length, 1);
    assert.equal(registry.getAllModels().length, 0); // Unconfigured providers should have 0 active models
  });
});
