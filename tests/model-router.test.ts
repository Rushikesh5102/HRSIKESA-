import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { IModelProvider } from '../src/models/interfaces/model.provider.js';
import { ModelMetadata, ModelRequest, ModelResponse, ProviderHealth } from '../src/models/interfaces/model.types.js';

class MockTestProvider implements IModelProvider {
  public readonly id: string;
  public readonly displayName: string;
  public readonly isLocal: boolean;
  private readonly modelsList: ModelMetadata[];

  constructor(id: string, isLocal: boolean, modelsList: ModelMetadata[]) {
    this.id = id;
    this.displayName = `Test Provider ${id}`;
    this.isLocal = isLocal;
    this.modelsList = modelsList;
  }

  public async checkHealth(): Promise<ProviderHealth> {
    return {
      status: 'healthy',
      message: 'OK',
      checkedAt: new Date().toISOString()
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return this.modelsList;
  }

  public async generate(request: ModelRequest): Promise<ModelResponse> {
    return {
      text: `Mocked response for prompt: ${request.prompt}`,
      providerId: this.id,
      modelId: request.preferredModel || this.modelsList[0]?.id || 'default',
      durationMs: 40,
      isLocal: this.isLocal
    };
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    return {
      text: `Mocked chat response for ${request.messages.length} messages`,
      providerId: this.id,
      modelId: request.preferredModel || this.modelsList[0]?.id || 'default',
      durationMs: 40,
      isLocal: this.isLocal
    };
  }
}

describe('Model Router Subsystem', () => {
  test('should prioritize local models when available', async () => {
    const registry = new ModelRegistry();

    const localModel: ModelMetadata = {
      id: 'qwen2.5:7b',
      providerId: 'ollama',
      displayName: 'Qwen 2.5 7B',
      isLocal: true,
      capabilities: ['text-generation'],
      costClassification: 'free-local',
      availability: true,
      statusText: 'Installed',
      priority: 100
    };

    const cloudModel: ModelMetadata = {
      id: 'gpt-4o-mini',
      providerId: 'openai',
      displayName: 'GPT-4o Mini',
      isLocal: false,
      capabilities: ['text-generation'],
      costClassification: 'pay-per-token',
      availability: true,
      statusText: 'Configured',
      priority: 85
    };

    await registry.registerProvider(new MockTestProvider('ollama', true, [localModel]));
    await registry.registerProvider(new MockTestProvider('openai', false, [cloudModel]));

    const router = new ModelRouter(registry);
    const decision = router.route({ prompt: 'Hello HṚṢĪKEŚA' });

    assert.equal(decision.selected, true);
    assert.equal(decision.provider?.id, 'ollama');
    assert.equal(decision.modelId, 'qwen2.5:7b');
  });

  test('should fallback to cloud models when local models are unavailable', async () => {
    const registry = new ModelRegistry();

    // Ollama with 0 installed models
    await registry.registerProvider(new MockTestProvider('ollama', true, []));

    const cloudModel: ModelMetadata = {
      id: 'claude-3-5-haiku',
      providerId: 'anthropic',
      displayName: 'Claude 3.5 Haiku',
      isLocal: false,
      capabilities: ['text-generation'],
      costClassification: 'pay-per-token',
      availability: true,
      statusText: 'Configured',
      priority: 90
    };

    await registry.registerProvider(new MockTestProvider('anthropic', false, [cloudModel]));

    const router = new ModelRouter(registry);
    const decision = router.route({ prompt: 'Deep architecture query' });

    assert.equal(decision.selected, true);
    assert.equal(decision.provider?.id, 'anthropic');
    assert.equal(decision.modelId, 'claude-3-5-haiku');
  });

  test('should return clear diagnostic reason when no models are available anywhere', async () => {
    const registry = new ModelRegistry();
    // Ollama registered with 0 models
    await registry.registerProvider(new MockTestProvider('ollama', true, []));

    const router = new ModelRouter(registry);
    const decision = router.route({ prompt: 'Test query' });

    assert.equal(decision.selected, false);
    assert.ok(decision.reason.includes('0 models installed'));
    assert.ok(decision.reason.includes('ollama pull'));
  });
});
