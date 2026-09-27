/**
 * HṚṢĪKEŚA (हृषीकेश) — Google Gemini Cloud Provider Adapter
 */

import { IModelProvider } from '../interfaces/model.provider.js';
import {
  ModelMetadata,
  ModelRequest,
  ChatRequest,
  ModelResponse,
  ProviderHealth
} from '../interfaces/model.types.js';

export class GeminiProvider implements IModelProvider {
  public readonly id = 'gemini';
  public readonly displayName = 'Google Gemini Provider';
  public readonly isLocal = false;

  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey?.trim();
  }

  public async checkHealth(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        status: 'unconfigured',
        message: 'Google Gemini API key is not configured (GEMINI_API_KEY environment variable missing)',
        checkedAt: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: 'Gemini provider credentials configured',
      checkedAt: new Date().toISOString()
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    if (!this.apiKey) {
      return [];
    }

    return [
      {
        id: 'gemini-2.5-flash',
        providerId: this.id,
        displayName: 'Gemini 2.5 Flash (Ultra Fast & Adaptive)',
        isLocal: false,
        contextWindow: 1000000,
        capabilities: ['text-generation', 'chat', 'vision', 'code', 'tools'],
        costClassification: 'pay-per-token',
        availability: true,
        statusText: 'Configured and ready',
        priority: 92
      },
      {
        id: 'gemini-2.5-pro',
        providerId: this.id,
        displayName: 'Gemini 2.5 Pro (Deep Reasoning & Multimodal)',
        isLocal: false,
        contextWindow: 2000000,
        capabilities: ['text-generation', 'chat', 'vision', 'code', 'tools'],
        costClassification: 'pay-per-token',
        availability: true,
        statusText: 'Configured and ready',
        priority: 94
      }
    ];
  }

  public async generate(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Cannot execute Gemini request: GEMINI_API_KEY is not configured.');
    }

    const targetModel = request.preferredModel || 'gemini-2.5-flash';
    const startTime = Date.now();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${this.apiKey}`;

    const contents = [];
    if (request.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: `System Instruction: ${request.systemPrompt}` }] });
    }
    contents.push({ role: 'user', parts: [{ text: request.prompt }] });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048
        }
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    };

    const durationMs = Date.now() - startTime;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      text,
      providerId: this.id,
      modelId: targetModel,
      durationMs,
      isLocal: false,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        totalTokens: data.usageMetadata?.totalTokenCount
      }
    };
  }

  public async chat(request: ChatRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Cannot execute Gemini chat request: GEMINI_API_KEY is not configured.');
    }

    const targetModel = request.preferredModel || 'gemini-2.5-flash';
    const startTime = Date.now();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${this.apiKey}`;

    const systemMessage = request.messages.find((m) => m.role === 'system');
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const bodyPayload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048
      }
    };

    if (systemMessage) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    };

    const durationMs = Date.now() - startTime;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      text,
      providerId: this.id,
      modelId: targetModel,
      durationMs,
      isLocal: false,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        totalTokens: data.usageMetadata?.totalTokenCount
      }
    };
  }
}
