/**
 * HṚṢĪKEŚA (हृषीकेश) — Windows SAPI Text-to-Speech Provider
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { ITextToSpeechProvider, SpeechSynthesisResult } from '../interfaces/voice.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

const execFileAsync = promisify(execFile);

export interface WindowsSapiTtsOptions {
  readonly voiceName?: string;
  readonly rate?: number; // -10 to 10
  readonly volume?: number; // 0 to 100
  readonly artifactDir?: string;
}

export class WindowsSapiTTSProvider implements ITextToSpeechProvider {
  public readonly id = 'sapi';
  public readonly name = 'Windows SAPI TTS Engine';
  private readonly logger?: ILogger;
  private readonly voiceName?: string;
  private readonly rate: number;
  private readonly volume: number;
  private readonly artifactDir: string;
  private initialized = false;

  constructor(options: WindowsSapiTtsOptions = {}, logger?: ILogger) {
    this.logger = logger?.child('WindowsSapiTTS');
    this.voiceName = options.voiceName;
    this.rate = options.rate ?? 0;
    this.volume = options.volume ?? 100;
    this.artifactDir = options.artifactDir ?? 'data/audio';
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(this.artifactDir)) {
      fs.mkdirSync(this.artifactDir, { recursive: true });
    }

    this.initialized = true;
    this.logger?.info('Windows SAPI TTS Provider initialized.');
  }

  public async synthesize(text: string, outputPath?: string): Promise<SpeechSynthesisResult> {
    if (!this.initialized) {
      await this.initialize();
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

    // Escape text for PowerShell script literal
    const sanitizedText = trimmed.replace(/"/g, '`"').replace(/\$/g, '`$');
    const resolvedPath = path.resolve(targetPath);
    const isSsml = trimmed.startsWith('<speak') || trimmed.includes('<sub alias=');
    let ssmlOrText = sanitizedText;
    if (isSsml && !trimmed.startsWith('<speak')) {
      ssmlOrText = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>${sanitizedText}</speak>`;
    }
    const speakInvocation = isSsml ? `$synth.SpeakSsml("${ssmlOrText}")` : `$synth.Speak("${sanitizedText}")`;

    const psScript = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      ${this.voiceName ? `$synth.SelectVoice("${this.voiceName}")` : ''}
      $synth.Rate = ${this.rate}
      $synth.Volume = ${this.volume}
      $synth.SetOutputToWaveFile("${resolvedPath.replace(/\\/g, '\\\\')}")
      ${speakInvocation}
      $synth.Dispose()
    `;

    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      timeout: 15000
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

    const trimmed = text.trim();
    if (!trimmed) return;

    const sanitizedText = trimmed.replace(/"/g, '`"').replace(/\$/g, '`$');
    const isSsml = trimmed.startsWith('<speak') || trimmed.includes('<sub alias=');
    let ssmlOrText = sanitizedText;
    if (isSsml && !trimmed.startsWith('<speak')) {
      ssmlOrText = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>${sanitizedText}</speak>`;
    }
    const speakInvocation = isSsml ? `$synth.SpeakSsml("${ssmlOrText}")` : `$synth.Speak("${sanitizedText}")`;

    const psScript = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      ${this.voiceName ? `$synth.SelectVoice("${this.voiceName}")` : ''}
      $synth.Rate = ${this.rate}
      $synth.Volume = ${this.volume}
      ${speakInvocation}
      $synth.Dispose()
    `;

    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      timeout: 30000
    });
  }

  public async stop(): Promise<void> {
    // SAPI ephemeral commands terminate on completion
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
    this.logger?.info('Windows SAPI TTS Provider shutdown complete.');
  }
}
