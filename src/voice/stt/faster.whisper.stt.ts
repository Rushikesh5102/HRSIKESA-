/**
 * HṚṢĪKEŚA (हृषीकेश) — Faster-Whisper Speech-to-Text Provider
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { ISpeechToTextProvider, SpeechTranscriptionResult } from '../interfaces/voice.types.js';
import { WindowsSpeechSTTProvider } from './windows.speech.stt.js';
import { ILogger } from '../../core/logging/logger.types.js';

const execFileAsync = promisify(execFile);

export interface FasterWhisperSttOptions {
  readonly modelSize?: string; // 'tiny', 'base', 'small', 'medium'
  readonly device?: 'cpu' | 'auto' | 'cuda';
  readonly computeType?: 'int8' | 'float16' | 'default';
  readonly language?: string;
}

export class FasterWhisperSTTProvider implements ISpeechToTextProvider {
  public readonly id = 'whisper';
  public readonly name = 'Faster-Whisper STT Engine';
  private readonly logger?: ILogger;
  private readonly modelSize: string;
  private readonly device: string;
  private readonly computeType: string;
  private readonly language?: string;
  private readonly fallbackProvider: WindowsSpeechSTTProvider;
  private useFallback = false;
  private initialized = false;

  constructor(options: FasterWhisperSttOptions = {}, logger?: ILogger) {
    this.logger = logger?.child('FasterWhisperSTT');
    this.modelSize = options.modelSize || 'tiny.en';
    this.device = options.device || 'cpu';
    this.computeType = options.computeType || 'int8';
    this.language = options.language || 'en';
    this.fallbackProvider = new WindowsSpeechSTTProvider({ language: this.language }, logger);
  }

  private getUvExecutable(): string {
    const localUv = path.resolve(process.cwd(), 'tools', 'bin', 'uv.exe');
    return fs.existsSync(localUv) ? localUv : 'uv';
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check if uv is available
    const uvBin = this.getUvExecutable();
    try {
      await execFileAsync(uvBin, ['--version'], { timeout: 3000 });
      this.useFallback = false;
      this.logger?.info('uv runtime detected for Faster-Whisper execution.', { uvBin });
    } catch {
      this.useFallback = true;
      this.logger?.warn('uv not found on PATH or in tools/bin. Falling back to native Windows Speech STT.');
      await this.fallbackProvider.initialize();
    }

    this.initialized = true;
  }

  public async transcribe(audioFilePath: string): Promise<SpeechTranscriptionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const resolvedAudio = path.resolve(audioFilePath);
    if (!fs.existsSync(resolvedAudio)) {
      throw new Error(`Audio file not found: ${resolvedAudio}`);
    }

    if (this.useFallback) {
      return this.fallbackProvider.transcribe(resolvedAudio);
    }

    const startTime = Date.now();
    const localModelDir = path.resolve(process.cwd(), 'data', 'audio', 'whisper-tiny').replace(/\\/g, '\\\\');
    const localAudioRoot = path.resolve(process.cwd(), 'data', 'audio').replace(/\\/g, '\\\\');

    // Python inline script to run faster-whisper via uv with local models
    const pyScript = `
import os
import sys
import json
from faster_whisper import WhisperModel

try:
    model_dir = r"${localModelDir}"
    download_root = r"${localAudioRoot}"
    if os.path.exists(model_dir):
        model = WhisperModel(model_dir, device="${this.device}", compute_type="${this.computeType}")
    else:
        model = WhisperModel("${this.modelSize}", device="${this.device}", compute_type="${this.computeType}", download_root=download_root)
    segments, info = model.transcribe(r"${resolvedAudio.replace(/\\/g, '\\\\')}", beam_size=5)
    text = " ".join([seg.text for seg in segments]).strip()
    print(json.dumps({"text": text, "language": info.language, "confidence": 0.95}))
except Exception as e:
    print(json.dumps({"text": "", "error": str(e)}))
`;

    try {
      const uvBin = this.getUvExecutable();
      const { stdout } = await execFileAsync(
        uvBin,
        ['run', '--with', 'faster-whisper', 'python', '-c', pyScript],
        { timeout: 45000 }
      );

      const parsed = JSON.parse(stdout.trim() || '{"text":""}');
      const durationMs = Date.now() - startTime;

      if (parsed.error || !parsed.text) {
        this.logger?.warn('Faster-Whisper returned empty/error. Attempting fallback.', { error: parsed.error });
        return this.fallbackProvider.transcribe(resolvedAudio);
      }

      return {
        text: parsed.text.trim(),
        language: parsed.language || 'en',
        confidence: parsed.confidence ?? 0.95,
        durationMs
      };
    } catch (err) {
      this.logger?.warn('Faster-Whisper execution failed. Falling back to Windows Speech STT.', { err });
      return this.fallbackProvider.transcribe(resolvedAudio);
    }
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
    await this.fallbackProvider.shutdown();
  }
}
