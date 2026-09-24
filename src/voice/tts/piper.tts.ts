/**
 * HṚṢĪKEŚA (हृषीकेश) — Piper Neural Text-to-Speech Provider
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { ITextToSpeechProvider, SpeechSynthesisResult } from '../interfaces/voice.types.js';
import { WindowsSapiTTSProvider } from './windows.sapi.tts.js';
import { ILogger } from '../../core/logging/logger.types.js';

const execFileAsync = promisify(execFile);

export interface PiperTtsOptions {
  readonly piperPath?: string;
  readonly modelPath?: string;
  readonly artifactDir?: string;
}

export class PiperTTSProvider implements ITextToSpeechProvider {
  public readonly id = 'piper';
  public readonly name = 'Piper Neural TTS Engine';
  private readonly logger?: ILogger;
  private readonly piperPath: string;
  private readonly modelPath?: string;
  private readonly artifactDir: string;
  private readonly fallbackProvider: WindowsSapiTTSProvider;
  private useFallback = false;
  private initialized = false;

  constructor(options: PiperTtsOptions = {}, logger?: ILogger) {
    this.logger = logger?.child('PiperTTS');
    
    // Auto-detect project-local piper binary
    const localPiperBin = path.resolve(process.cwd(), 'tools', 'bin', 'piper.exe');
    const localPiperScripts = path.resolve(process.cwd(), 'tools', 'piper', 'Scripts', 'piper.exe');
    const resolvedPiper = fs.existsSync(localPiperBin)
      ? localPiperBin
      : (fs.existsSync(localPiperScripts) ? localPiperScripts : 'piper');

    this.piperPath = options.piperPath || resolvedPiper;

    // Auto-detect project-local neural voice model
    const localModel = path.resolve(process.cwd(), 'data', 'audio', 'en-us-lessac-low.onnx');
    this.modelPath = options.modelPath || (fs.existsSync(localModel) ? localModel : undefined);

    this.artifactDir = options.artifactDir || 'data/audio';
    this.fallbackProvider = new WindowsSapiTTSProvider({ artifactDir: this.artifactDir }, logger);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(this.artifactDir)) {
      fs.mkdirSync(this.artifactDir, { recursive: true });
    }

    try {
      await execFileAsync(this.piperPath, ['--help'], { timeout: 3000 });
      this.useFallback = false;
      this.logger?.info('Piper binary detected and verified.');
    } catch {
      this.useFallback = true;
      this.logger?.warn('Piper binary not found on PATH. Falling back to native Windows SAPI TTS.');
      await this.fallbackProvider.initialize();
    }

    this.initialized = true;
  }

  public async synthesize(text: string, outputPath?: string): Promise<SpeechSynthesisResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useFallback || !this.modelPath) {
      return this.fallbackProvider.synthesize(text, outputPath);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Text to synthesize cannot be empty.');
    }

    const targetPath = outputPath || path.join(
      this.artifactDir,
      `tts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`
    );

    const startTime = Date.now();
    const resolvedPath = path.resolve(targetPath);

    const args = ['--model', this.modelPath, '--output_file', resolvedPath];
    const child = execFile(this.piperPath, args);

    if (child.stdin) {
      child.stdin.write(trimmed);
      child.stdin.end();
    }

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Piper synthesis failed with code ${code}`));
      });
      child.on('error', reject);
    });

    const durationMs = Date.now() - startTime;

    return {
      audioFilePath: resolvedPath,
      durationMs,
      characterCount: trimmed.length
    };
  }

  public async speak(text: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useFallback || !this.modelPath) {
      return this.fallbackProvider.speak(text);
    }

    const synthResult = await this.synthesize(text);
    const psScript = `
      $player = New-Object System.Media.SoundPlayer("${synthResult.audioFilePath.replace(/\\/g, '\\\\')}")
      $player.PlaySync()
      $player.Dispose()
    `;
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      timeout: 30000
    });
  }

  public async stop(): Promise<void> {
    if (this.useFallback) {
      await this.fallbackProvider.stop();
    }
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
    await this.fallbackProvider.shutdown();
  }
}
