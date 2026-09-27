/**
 * HṚṢĪKEŚA (हृषीकेश) — Anthropic Cloud Provider Adapter
 */

import { IModelProvider } from '../interfaces/model.provider.js';
import {
  ModelMetadata,
  ModelRequest,
  ChatRequest,
  ModelResponse,
  ProviderHealth
} from '../interfaces/model.types.js';

export class AnthropicProvider implements IModelProvider {
  public readonly id = 'anthropic';
  public readonly displayName = 'Anthropic Cloud Provider';
  public readonly isLocal = false;

  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey?.trim();
  }

  public async checkHealth(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        status: 'unconfigured',
        message: 'Anthropic API key is not configured (ANTHROPIC_API_KEY environment variable missing)',
        checkedAt: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: 'Anthropic provider credentials configured',
      checkedAt: new Date().toISOString()
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    if (!this.apiKey) {
      return [];
    }

    return [
      {
        id: 'claude-3-7-sonnet-20250219',
        providerId: this.id,
        displayName: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
        isLocal: false,
        contextWindow: 200000,
        capabilities: ['text-generation', 'chat', 'vision', 'code', 'tools'],
        costClassification: 'pay-per-token',
        availability: true,
        statusText: 'Configured and ready',
        priority: 95
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        providerId: this.id,
        displayName: 'Claude 3.5 Sonnet (Frontier Coding)',
        isLocal: false,
        contextWindow: 200000,
        capabilities: ['text-generation', 'chat', 'vision', 'code', 'tools'],
        costClassification: 'pay-per-token',
        availability: true,
        statusText: 'Configured and ready',
        priority: 90
      },
      {
        id: 'claude-3-5-haiku-20241022',
        providerId: this.id,
        displayName: 'Claude 3.5 Haiku (Fast Efficiency)',
        isLocal: false,
        contextWindow: 200000,
        capabilities: ['text-generation', 'chat', 'code', 'tools'],
        costClassification: 'pay-per-token',
        availability: true,
        statusText: 'Configured and ready',
        priority: 85
      }
    ];
  }

  public async generate(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Cannot execute Anthropic request: ANTHROPIC_API_KEY is not configured.');
    }

    const targetModel = request.preferredModel || 'claude-3-5-haiku-20241022';
    const startTime = Date.now();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: request.maxTokens ?? 2048,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.prompt }]
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const durationMs = Date.now() - startTime;
    const text = data.content.find((c) => c.type === 'text')?.text || '';

    return {
      text,
      providerId: this.id,
      modelId: targetModel,
      durationMs,
      isLocal: false,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Cannot execute Anthropic chat request: ANTHROPIC_API_KEY is not configured.');
    }

    const targetModel = request.preferredModel || 'claude-3-5-haiku-20241022';
    const startTime = Date.now();

    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = request.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: request.maxTokens ?? 2048,
        system: systemMessage,
        messages: conversationMessages
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const durationMs = Date.now() - startTime;
    const text = data.content.find((c) => c.type === 'text')?.text || '';

    return {
      text,
      providerId: this.id,
      modelId: targetModel,
      durationMs,
      isLocal: false,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }
}
