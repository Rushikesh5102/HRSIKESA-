/**
 * HṚṢĪKEŚA (हृषीकेश) — Indic Parler-TTS Text-to-Speech Provider
 *
 * Implements ITextToSpeechProvider with AI4Bharat Indic Parler-TTS.
 * Supports English, Hindi, Marathi, Sanskrit, dynamic acoustic captions,
 * prosody/emotion control, lazy loading, and graceful fallback to Piper/SAPI.
 */

import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';
import { ITextToSpeechProvider, SpeechSynthesisResult } from '../interfaces/voice.types.js';
import { PiperTTSProvider } from './piper.tts.js';
import { WindowsSapiTTSProvider } from './windows.sapi.tts.js';
import { SupportedLanguageCode } from '../multilingual/interfaces/multilingual.types.js';
import { TTSDeliveryEmotion, PitchLevel, ExpressivenessLevel, ReverbLevel, VoiceQualityLevel } from '../affect/affect.types.js';
import { TtsCaptionBuilder } from '../affect/tts-caption.builder.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface IndicParlerOptions {
  speaker?: string;
  language?: SupportedLanguageCode;
  caption?: string;
  emotion?: TTSDeliveryEmotion;
  intensity?: number;
  rate?: number;
  pitch?: PitchLevel;
  expressiveness?: ExpressivenessLevel;
  reverberation?: ReverbLevel;
  quality?: VoiceQualityLevel;
  hfToken?: string;
}

export interface IndicParlerStatus {
  primaryModel: string;
  primaryStatus: 'AVAILABLE' | 'CONFIGURED' | 'NOT_CONFIGURED' | 'NOT_AVAILABLE';
  isGated: boolean;
  hasToken: boolean;
  activeModel: string | null;
  isLoaded: boolean;
  isLoading: boolean;
  memoryMB: number;
  workerRunning: boolean;
  fallbackActive: boolean;
  fallbackReason?: string;
}

export interface SynthesisTelemetry {
  provider: string;
  model: string;
  speaker: string;
  language: string;
  deliveryCaption?: string;
  durationMs: number;
  generationDurationMs?: number;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export class IndicParlerTTSProvider implements ITextToSpeechProvider {
  public readonly id = 'indic-parler';
  public readonly name = 'Indic Parler-TTS';

  private readonly logger?: ILogger;
  private readonly pythonPath: string;
  private readonly workerScriptPath: string;
  private readonly artifactDir: string;
  private readonly piperFallback: PiperTTSProvider;
  private readonly sapiFallback: WindowsSapiTTSProvider;

  private workerProcess: ChildProcess | null = null;
  private rl: readline.Interface | null = null;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private initialized = false;
  private useFallback = false;
  private fallbackReason = '';
  private lastTelemetry: SynthesisTelemetry | null = null;
  private speakerMap: Record<SupportedLanguageCode, string> = {
    en: 'Thoma',
    hi: 'Rohit',
    mr: 'Sanjay',
    sa: 'Aryan',
    bn: 'Rohit',
    gu: 'Rohit',
    ta: 'Rohit',
    te: 'Rohit',
    kn: 'Rohit',
    ml: 'Rohit',
    pa: 'Rohit',
    ur: 'Rohit',
  };

  constructor(
    options: {
      pythonPath?: string;
      artifactDir?: string;
      speakerMap?: Partial<Record<SupportedLanguageCode, string>>;
    } = {},
    logger?: ILogger
  ) {
    this.logger = logger?.child('IndicParlerTTS');
    this.artifactDir = options.artifactDir || 'data/audio';

    // Auto-detect project virtual environment python
    const venvPy = path.resolve(process.cwd(), '.venv_indic_tts', 'Scripts', 'python.exe');
    this.pythonPath = options.pythonPath || (fs.existsSync(venvPy) ? venvPy : 'python');

    this.workerScriptPath = path.resolve(
      process.cwd(),
      'src',
      'voice',
      'tts',
      'runtime',
      'indic_parler_worker.py'
    );

    if (options.speakerMap) {
      this.speakerMap = { ...this.speakerMap, ...options.speakerMap };
    }

    this.piperFallback = new PiperTTSProvider({ artifactDir: this.artifactDir }, logger);
    this.sapiFallback = new WindowsSapiTTSProvider({ artifactDir: this.artifactDir }, logger);
  }

  public setSpeakerForLanguage(lang: SupportedLanguageCode, speaker: string): void {
    this.speakerMap[lang] = speaker;
  }

  public getSpeakerForLanguage(lang: SupportedLanguageCode): string {
    return this.speakerMap[lang] || 'Rohit';
  }

  public getLastTelemetry(): SynthesisTelemetry | null {
    return this.lastTelemetry;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(this.artifactDir)) {
      fs.mkdirSync(this.artifactDir, { recursive: true });
    }

    // Initialize fallbacks in background
    await this.piperFallback.initialize();
    await this.sapiFallback.initialize();

    // Check if Python worker environment exists
    if (!fs.existsSync(this.pythonPath)) {
      this.useFallback = true;
      this.fallbackReason = `Python virtual environment not found at ${this.pythonPath}`;
      this.logger?.warn(`[IndicParlerTTS] ${this.fallbackReason}. Falling back to secondary engine.`);
      this.initialized = true;
      return;
    }

    try {
      this.spawnWorker();
      const status = await this.getStatus();
      if (status.primaryStatus === 'NOT_CONFIGURED') {
        this.logger?.warn('[IndicParlerTTS] Model is gated on Hugging Face and requires access/token. Fallback available.');
      }
      this.useFallback = false;
      this.logger?.info('[IndicParlerTTS] Native Python worker connected and verified.');
    } catch (err) {
      this.useFallback = true;
      this.fallbackReason = `Failed to start Indic Parler worker: ${String(err)}`;
      this.logger?.warn(`[IndicParlerTTS] ${this.fallbackReason}. Utilizing fallback.`);
    }

    this.initialized = true;
  }

  private spawnWorker(): void {
    if (this.workerProcess) return;

    this.workerProcess = spawn(this.pythonPath, [this.workerScriptPath], {
      stdio: ['pipe', 'pipe', 'inherit'],
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
      },
    });

    this.workerProcess.on('error', (err) => {
      this.logger?.error('Worker process error', { error: String(err) });
      this.useFallback = true;
      this.fallbackReason = `Worker process error: ${String(err)}`;
    });

    this.workerProcess.on('exit', (code, signal) => {
      this.logger?.warn(`Worker process exited (code=${code}, signal=${signal})`);
      this.workerProcess = null;
      this.rl = null;
      this.rejectAllPending(new Error(`Worker exited with code ${code}`));
    });

    if (this.workerProcess.stdout) {
      this.rl = readline.createInterface({ input: this.workerProcess.stdout });
      this.rl.on('line', (line) => {
        try {
          const res = JSON.parse(line);
          const reqId = res.id;
          if (reqId && this.pendingRequests.has(reqId)) {
            const { resolve } = this.pendingRequests.get(reqId)!;
            this.pendingRequests.delete(reqId);
            resolve(res);
          }
        } catch (parseErr) {
          this.logger?.error('Failed to parse worker stdout JSON', { line, error: String(parseErr) });
        }
      });
    }
  }

  private rejectAllPending(err: Error): void {
    for (const req of this.pendingRequests.values()) {
      req.reject(err);
    }
    this.pendingRequests.clear();
  }

  private sendCommand<T = any>(cmd: string, params: Record<string, any> = {}, timeoutMs = 60000): Promise<T> {
    if (!this.workerProcess || !this.workerProcess.stdin) {
      return Promise.reject(new Error('Worker process is not running.'));
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = JSON.stringify({ id, cmd, params }) + '\n';

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Command '${cmd}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      this.workerProcess?.stdin?.write(payload);
    });
  }

  public async getStatus(): Promise<IndicParlerStatus> {
    if (!this.workerProcess) {
      return {
        primaryModel: 'ai4bharat/indic-parler-tts',
        primaryStatus: 'NOT_AVAILABLE',
        isGated: true,
        hasToken: Boolean(process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN),
        activeModel: null,
        isLoaded: false,
        isLoading: false,
        memoryMB: 0,
        workerRunning: false,
        fallbackActive: true,
        fallbackReason: this.fallbackReason || 'Worker not running',
      };
    }

    try {
      const res = await this.sendCommand('status', {}, 5000);
      return {
        primaryModel: res.primaryModel || 'ai4bharat/indic-parler-tts',
        primaryStatus: res.primaryStatus || 'UNKNOWN',
        isGated: res.isGated ?? true,
        hasToken: res.hasToken ?? false,
        activeModel: res.activeModel || null,
        isLoaded: res.isLoaded ?? false,
        isLoading: res.isLoading ?? false,
        memoryMB: res.memoryMB || 0,
        workerRunning: true,
        fallbackActive: this.useFallback,
        fallbackReason: this.useFallback ? this.fallbackReason : undefined,
      };
    } catch {
      return {
        primaryModel: 'ai4bharat/indic-parler-tts',
        primaryStatus: 'NOT_AVAILABLE',
        isGated: true,
        hasToken: Boolean(process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN),
        activeModel: null,
        isLoaded: false,
        isLoading: false,
        memoryMB: 0,
        workerRunning: false,
        fallbackActive: true,
        fallbackReason: 'Worker status query timed out',
      };
    }
  }

  public async unloadModel(): Promise<void> {
    if (this.workerProcess) {
      await this.sendCommand('unload', {}, 5000);
    }
  }

  public async preloadModel(): Promise<boolean> {
    if (!this.workerProcess) return false;
    try {
      const res = await this.sendCommand('load', {}, 60000);
      return Boolean(res.success);
    } catch {
      return false;
    }
  }

  public async synthesize(
    text: string,
    outputPath?: string,
    options: IndicParlerOptions = {}
  ): Promise<SpeechSynthesisResult> {
    if (!this.initialized) await this.initialize();

    const trimmed = (text || '').trim();
    if (!trimmed) {
      throw new Error('Text to synthesize cannot be empty.');
    }

    const lang: SupportedLanguageCode = options.language || 'en';
    const speaker = options.speaker || this.getSpeakerForLanguage(lang);

    // Build dynamic acoustic caption if not given
    const caption = options.caption || TtsCaptionBuilder.build({
      speakerName: speaker,
      language: lang,
      emotion: options.emotion || 'neutral',
      intensity: options.intensity || 0.35,
      rate: options.rate || 1.0,
      pitch: options.pitch || 'medium-low',
      expressiveness: options.expressiveness || 'subtle',
      reverberation: options.reverberation || 'minimal',
      quality: options.quality || 'refined',
    });

    const targetAudioPath = outputPath || path.join(
      this.artifactDir,
      `tts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`
    );

    // If native worker is active, try synthesizing with Indic Parler
    if (!this.useFallback && this.workerProcess) {
      try {
        const res = await this.sendCommand('synthesize', {
          text: trimmed,
          caption,
          speaker,
          language: lang,
          outputPath: targetAudioPath,
          hfToken: options.hfToken,
        }, 120000);

        if (res.success && res.audioFilePath && fs.existsSync(res.audioFilePath)) {
          this.lastTelemetry = {
            provider: 'indic-parler',
            model: res.modelUsed || 'ai4bharat/indic-parler-tts',
            speaker,
            language: lang,
            deliveryCaption: caption,
            durationMs: res.durationMs || 1000,
            generationDurationMs: res.generationDurationMs,
            fallbackUsed: false,
          };
          return {
            audioFilePath: res.audioFilePath,
            durationMs: res.durationMs || 1000,
            characterCount: trimmed.length,
          };
        } else {
          this.logger?.warn(`Indic Parler synthesis returned failure: ${res.error}. Invoking Piper/SAPI fallback.`);
          this.fallbackReason = res.error || 'Worker synthesis failed';
        }
      } catch (err) {
        this.logger?.warn(`Indic Parler worker synthesis error: ${String(err)}. Invoking fallback.`);
        this.fallbackReason = String(err);
      }
    }

    // Graceful Fallback Pipeline: Piper -> Windows SAPI
    const fallbackStart = Date.now();
    let fallbackResult: SpeechSynthesisResult;
    let fallbackEngine = 'piper';

    try {
      fallbackResult = await this.piperFallback.synthesize(trimmed, targetAudioPath);
    } catch {
      fallbackEngine = 'sapi';
      fallbackResult = await this.sapiFallback.synthesize(trimmed, targetAudioPath);
    }

    this.lastTelemetry = {
      provider: fallbackEngine,
      model: fallbackEngine === 'piper' ? 'piper-neural' : 'windows-sapi',
      speaker: 'fallback',
      language: lang,
      deliveryCaption: 'Fallback synthesis',
      durationMs: fallbackResult.durationMs,
      generationDurationMs: Date.now() - fallbackStart,
      fallbackUsed: true,
      fallbackReason: this.fallbackReason || 'Primary engine fallback',
    };

    return fallbackResult;
  }

  public async speak(text: string, options?: IndicParlerOptions): Promise<void> {
    const res = await this.synthesize(text, undefined, options);
    const resolvedPath = path.resolve(res.audioFilePath);

    // Use PowerShell SoundPlayer for native playback on Windows
    const psScript = `
      $player = New-Object System.Media.SoundPlayer("${resolvedPath.replace(/\\/g, '\\\\')}")
      $player.PlaySync()
      $player.Dispose()
    `;
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      timeout: 60000,
    });
  }

  public async stop(): Promise<void> {
    if (this.workerProcess) {
      // Unload or cancel queued
    }
    await this.piperFallback.stop();
    await this.sapiFallback.stop();
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
    if (this.workerProcess) {
      try {
        await this.sendCommand('unload', {}, 2000).catch(() => {});
        this.workerProcess.kill('SIGTERM');
      } catch {}
      this.workerProcess = null;
      this.rl = null;
    }
    await this.piperFallback.shutdown();
    await this.sapiFallback.shutdown();
  }
}
