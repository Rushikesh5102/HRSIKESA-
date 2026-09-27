/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Ollama Local Inference Backend Wrapper
 */

import http from 'http';
import {
  InferenceBackendType,
  ComputeDeviceType,
  CancellationToken,
} from './backend.types.js';
import { ChatMessage, ToolDefinition } from '../models/interfaces/model.types.js';

export interface OllamaExecutionOptions {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  cancellationToken?: CancellationToken;
  onToken?: (token: string) => void;
  tools?: ToolDefinition[];
  endpoint?: string;
}

export interface OllamaResult {
  text: string;
  modelId: string;
  backendType: InferenceBackendType;
  deviceType: ComputeDeviceType;
  promptTokens: number;
  generatedTokens: number;
  promptMs: number;
  generationMs: number;
  totalMs: number;
  promptTokensPerSec: number;
  generationTokensPerSec: number;
  timeToFirstTokenMs: number;
}

export class OllamaBackend {
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
  }

  public async isAvailable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const req = http.get(`${this.baseUrl}/api/version`, { timeout: 1500 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public async getLoadedModels(): Promise<Array<{ name: string; sizeBytes: number; vramBytes: number }>> {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/api/ps`, { timeout: 2000 }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const models = (data.models || []).map((m: any) => ({
              name: m.name,
              sizeBytes: m.size || 0,
              vramBytes: m.size_vram || 0,
            }));
            resolve(models);
          } catch {
            resolve([]);
          }
        });
      });
      req.on('error', () => resolve([]));
    });
  }

  public async executeChat(options: OllamaExecutionOptions): Promise<OllamaResult> {
    const startTime = Date.now();
    let timeToFirstToken = 0;
    let fullText = '';
    let promptTokens = 0;
    let generatedTokens = 0;
    let promptDurationNs = 0;
    let evalDurationNs = 0;

    const payload = {
      model: options.modelId,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 384,
      },
      stream: true,
    };

    return new Promise<OllamaResult>((resolve, reject) => {
      const url = new URL(`${this.baseUrl}/api/chat`);
      const postData = JSON.stringify(payload);

      const req = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Ollama HTTP ${res.statusCode}: failed to process chat request`));
            return;
          }

          let buffer = '';
          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const parsed = JSON.parse(trimmed);
                if (parsed.message?.content) {
                  if (!timeToFirstToken) {
                    timeToFirstToken = Date.now() - startTime;
                  }
                  fullText += parsed.message.content;
                  if (options.onToken) {
                    options.onToken(parsed.message.content);
                  }
                }
                if (parsed.done) {
                  promptTokens = parsed.prompt_eval_count || 0;
                  generatedTokens = parsed.eval_count || 0;
                  promptDurationNs = parsed.prompt_eval_duration || 0;
                  evalDurationNs = parsed.eval_duration || 0;
                }
              } catch {
                // Ignore parse errors on partial streams
              }
            }
          });

          res.on('end', () => {
            const totalMs = Date.now() - startTime;
            const promptMs = promptDurationNs ? Math.round(promptDurationNs / 1e6) : timeToFirstToken;
            const genMs = evalDurationNs ? Math.round(evalDurationNs / 1e6) : totalMs - timeToFirstToken;

            const promptSpeed = promptMs > 0 ? (promptTokens / (promptMs / 1000)) : 0;
            const genSpeed = genMs > 0 ? (generatedTokens / (genMs / 1000)) : 0;

            resolve({
              text: fullText,
              modelId: options.modelId,
              backendType: 'OLLAMA',
              deviceType: 'LOCAL_CPU',
              promptTokens,
              generatedTokens,
              promptMs,
              generationMs: genMs,
              totalMs,
              promptTokensPerSec: Math.round(promptSpeed * 10) / 10,
              generationTokensPerSec: Math.round(genSpeed * 10) / 10,
              timeToFirstTokenMs: timeToFirstToken || totalMs,
            });
          });
        }
      );

      if (options.cancellationToken) {
        options.cancellationToken.onCancel(() => {
          req.destroy();
          reject(new Error(`Inference cancelled: ${options.cancellationToken?.reason || 'Cancelled by user.'}`));
        });
      }

      req.on('error', (err) => reject(err));
      req.write(postData);
      req.end();
    });
  }
}
