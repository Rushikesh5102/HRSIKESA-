/**
 * HṚṢĪKEŚA (हृषीकेश) — OpenAI Cloud Provider Adapter
 */

import { IModelProvider } from '../interfaces/model.provider.js';
import {
  ModelMetadata,
  ModelRequest,
  ChatRequest,
  ModelResponse,
  ProviderHealth
} from '../interfaces/model.types.js';

export class OpenAIProvider implements IModelProvider {
  public readonly id = 'openai';
  public readonly displayName = 'OpenAI Cloud Provider';
  public readonly isLocal = false;

  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey?.trim();
  }

  public async checkHealth(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        status: 'unconfigured',
        message: 'OpenAI API key is not configured (OPENAI_API_KEY environment variable missing)',
        checkedAt: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: 'OpenAI provider credentials configured',
      checkedAt: new Date().toISOString()
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    if (!this.apiKey) {
      return [];
    }

    // Static catalogue of supported models when credentials are valid
    return [
      {
        id: 'gpt-4o',
        providerId: this.id,
        displayName: 'GPT-4o (Omni Frontier)',
        isLocal: false,
        contextWindow: 128000,
        capabilities: ['text-generation', 'chat', 'vision', 'code', 'tools'],
        costClassification: 'pay-per-token',
        availability: true,
        statusText: 'Configured and ready',
        priority: 80
      },
      {
        id: 'gpt-4o-mini',
        providerId: this.id,
        displayName: 'GPT-4o Mini (Fast Efficiency)',
        isLocal: false,
        contextWindow: 128000,
        capabilities: ['text-generation', 'chat', 'vision', 'code', 'tools'],
        costClassification: 'pay-per-token',
        availability: true,
        statusText: 'Configured and ready',
        priority: 85
      }
    ];
  }

  public async generate(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Cannot execute OpenAI request: OPENAI_API_KEY is not configured.');
    }

    const targetModel = request.preferredModel || 'gpt-4o-mini';
    const startTime = Date.now();

    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const durationMs = Date.now() - startTime;
    return {
      text: data.choices[0]?.message?.content || '',
      providerId: this.id,
      modelId: targetModel,
      durationMs,
      isLocal: false,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      }
    };
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Cannot execute OpenAI chat request: OPENAI_API_KEY is not configured.');
    }

    const targetModel = request.preferredModel || 'gpt-4o-mini';
    const startTime = Date.now();

    const messages = request.messages.map((m) => ({
      role: m.role,
      content: m.content
    }));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const durationMs = Date.now() - startTime;
    return {
      text: data.choices[0]?.message?.content || '',
      providerId: this.id,
      modelId: targetModel,
      durationMs,
      isLocal: false,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      }
    };
  }
}
