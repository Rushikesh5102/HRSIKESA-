/**
 * HṚṢĪKEŚA (हृषीकेश) — Foundation Performance & Execution (FP-01)
 * Llama.cpp Inference Backend (Intel Arc Vulkan GPU + Multi-Threaded CPU)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, ChildProcess } from 'child_process';
import {
  InferenceBackendType,
  ComputeDeviceType,
  CancellationToken,
} from './backend.types.js';
import { ChatMessage, ToolDefinition } from '../models/interfaces/model.types.js';

export interface LlamaCppExecutionOptions {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  useVulkan?: boolean;
  gpuLayers?: number;
  threads?: number;
  cancellationToken?: CancellationToken;
  onToken?: (token: string) => void;
  tools?: ToolDefinition[];
}

export interface LlamaCppResult {
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

export class LlamaCppBackend {
  private readonly vulkanBinaryPath: string;
  private readonly cpuBinaryPath: string;
  private readonly vulkanCliPath: string;
  private activeProcesses: Set<ChildProcess> = new Set();

  constructor() {
    this.vulkanBinaryPath = path.resolve('tools/llama-vulkan/llama-server.exe');
    this.vulkanCliPath = path.resolve('tools/llama-vulkan/llama-cli.exe');
    this.cpuBinaryPath = path.resolve('tools/ollama/lib/ollama/llama-server.exe');
  }

  public isVulkanAvailable(): boolean {
    return fs.existsSync(this.vulkanBinaryPath) && fs.existsSync('C:\\Windows\\System32\\vulkan-1.dll');
  }

  public isCpuAvailable(): boolean {
    return fs.existsSync(this.vulkanCliPath) || fs.existsSync(this.cpuBinaryPath);
  }

  /**
   * Resolves a human model ID (e.g. 'llama3.2:3b', 'qwen2.5:7b') to an existing GGUF blob path.
   */
  public resolveModelPath(modelId: string): string | null {
    // If it's already an absolute or relative file path to a GGUF
    if (fs.existsSync(modelId) && modelId.toLowerCase().endsWith('.gguf')) {
      return path.resolve(modelId);
    }

    const homeDir = os.homedir();
    const cleanId = modelId.toLowerCase();
    const parts = cleanId.split(':');
    const name = parts[0];
    const tag = parts[1] || 'latest';

    // 1. Try reading Ollama manifest
    const manifestPath = path.join(
      homeDir,
      '.ollama',
      'models',
      'manifests',
      'registry.ollama.ai',
      'library',
      name,
      tag
    );

    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const modelLayer = manifest.layers?.find((l: any) =>
          l.mediaType?.includes('model')
        );
        if (modelLayer?.digest) {
          const blobFilename = modelLayer.digest.replace(':', '-');
          const blobPath = path.join(homeDir, '.ollama', 'models', 'blobs', blobFilename);
          if (fs.existsSync(blobPath)) {
            return blobPath;
          }
        }
      } catch {
        // Fall through
      }
    }

    // 2. Direct well-known fallback hashes on this machine
    const wellKnown: Record<string, string> = {
      'llama3.2:3b': 'sha256-dde5aa3fc5ffc17176b5e8bdc82f587b24b2678c6c66101bf7da77af9f7ccdff',
      'deepseek-r1:1.5b': 'sha256-aabd4debf0c8f08881923f2c25fc0fdeed24435271c2b3e92c4af36704040dbc',
      'qwen2.5:7b': 'sha256-2bada8a7450677000f678be90653b85d364de7db25eb5ea54136ada5f3933730',
      'nomic-embed-text:latest': 'sha256-970aa74c0a90ef7482477cf803618e776e173c007bf957f635f1015bfcfef0e6',
    };

    const targetHash = wellKnown[cleanId] || wellKnown[`${cleanId}:latest`];
    if (targetHash) {
      const p = path.join(homeDir, '.ollama', 'models', 'blobs', targetHash);
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  /**
   * Executes inference via llama-cli on Vulkan (Intel Arc GPU) or CPU.
   */
  public async executeChat(options: LlamaCppExecutionOptions): Promise<LlamaCppResult> {
    const modelPath = this.resolveModelPath(options.modelId);
    if (!modelPath) {
      throw new Error(`Model '${options.modelId}' could not be resolved to a local GGUF asset.`);
    }

    const useVulkan = options.useVulkan !== false && this.isVulkanAvailable();
    const backendType: InferenceBackendType = useVulkan ? 'LLAMACPP_VULKAN' : 'LLAMACPP_CPU';
    const deviceType: ComputeDeviceType = useVulkan ? 'LOCAL_INTEL_GPU' : 'LOCAL_CPU';

    const binary = fs.existsSync(this.vulkanCliPath) ? this.vulkanCliPath : 'llama-cli';
    const gpuLayers = useVulkan ? (options.gpuLayers ?? 99) : 0;
    const threads = options.threads ?? 8;
    const maxTokens = options.maxTokens ?? 384;
    const temperature = options.temperature ?? 0.7;

    // Convert messages to prompt representation
    const formattedPrompt = this.formatChatPrompt(options.messages, options.tools);

    const args = [
      '-m', modelPath,
      '-p', formattedPrompt,
      '-n', String(maxTokens),
      '--temp', String(temperature),
      '-ngl', String(gpuLayers),
      '-t', String(threads),
      '--no-warmup',
      '--no-display-prompt',
      '--simple-io',
      '--log-disable',
    ];

    const startTime = Date.now();
    let timeToFirstToken = 0;
    let outputText = '';
    let promptTokens = 0;
    let generatedTokens = 0;
    let promptSpeed = 0;
    let genSpeed = 0;
    let hasStartedActualGeneration = false;

    return new Promise<LlamaCppResult>((resolve, reject) => {
      const proc = spawn(binary, args, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.activeProcesses.add(proc);
      try {
        proc.stdin.end();
      } catch {}

      const timeoutTimer = setTimeout(() => {
        try {
          proc.kill();
        } catch {}
      }, 35000);

      if (options.cancellationToken) {
        options.cancellationToken.onCancel(() => {
          clearTimeout(timeoutTimer);
          proc.kill('SIGKILL');
          reject(new Error(`Inference cancelled: ${options.cancellationToken?.reason || 'Cancelled by user.'}`));
        });
      }

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        if (text) {
          if (!hasStartedActualGeneration && (text.includes('Loading model') || text.includes('▄▄') || text.includes('llama_'))) {
            return;
          }
          hasStartedActualGeneration = true;
          if (!timeToFirstToken) {
            timeToFirstToken = Date.now() - startTime;
          }
          outputText += text;
          if (options.onToken) {
            options.onToken(text);
          }
        }
      });

      let stderrLog = '';
      proc.stderr.on('data', (chunk: Buffer) => {
        stderrLog += chunk.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutTimer);
        this.activeProcesses.delete(proc);
        const totalMs = Date.now() - startTime;

        // Parse speed metrics from llama output or estimate
        const speedMatch = stderrLog.match(/Prompt:\s*([\d.]+)\s*t\/s\s*\|\s*Generation:\s*([\d.]+)\s*t\/s/);
        if (speedMatch) {
          promptSpeed = parseFloat(speedMatch[1]);
          genSpeed = parseFloat(speedMatch[2]);
        }

        // Estimate tokens if not parsed
        generatedTokens = Math.max(1, Math.round(outputText.split(/\s+/).length * 1.3));
        promptTokens = Math.max(1, Math.round(formattedPrompt.split(/\s+/).length * 1.3));

        if (!genSpeed && totalMs > 0) {
          genSpeed = (generatedTokens / (totalMs / 1000));
        }

        // Clean up output text (remove residual input prompt echo or stop tags if any)
        let cleaned = outputText.trim();
        cleaned = cleaned.replace(/^(Assistant:|HṚṢĪKEŚA:)\s*/i, '');
        cleaned = cleaned.replace(/\[\s*Prompt:.*?\]/g, '').trim();

        if (code === 0 || cleaned.length > 0) {
          resolve({
            text: cleaned,
            modelId: options.modelId,
            backendType,
            deviceType,
            promptTokens,
            generatedTokens,
            promptMs: timeToFirstToken,
            generationMs: totalMs - timeToFirstToken,
            totalMs,
            promptTokensPerSec: promptSpeed || 20,
            generationTokensPerSec: genSpeed || 11,
            timeToFirstTokenMs: timeToFirstToken || totalMs,
          });
        } else {
          reject(new Error(`llama-cli exited with code ${code}. Error: ${stderrLog.slice(0, 300)}`));
        }
      });

      proc.on('error', (err) => {
        this.activeProcesses.delete(proc);
        reject(err);
      });
    });
  }

  private formatChatPrompt(messages: ChatMessage[], tools?: ToolDefinition[]): string {
    let out = '';
    for (const msg of messages) {
      if (msg.role === 'system') {
        out += `<|im_start|>system\n${msg.content}<|im_end|>\n`;
      } else if (msg.role === 'user') {
        out += `<|im_start|>user\n${msg.content}<|im_end|>\n`;
      } else if (msg.role === 'assistant') {
        out += `<|im_start|>assistant\n${msg.content}<|im_end|>\n`;
      }
    }

    if (tools && tools.length > 0) {
      // Append minimal tools hint
      out += `\n[Available tools: ${tools.map(t => t.name).join(', ')}]\n`;
    }

    out += `<|im_start|>assistant\n`;
    return out;
  }
}
