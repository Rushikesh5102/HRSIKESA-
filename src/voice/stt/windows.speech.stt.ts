/**
 * HṚṢĪKEŚA (हृषीकेश) — Windows Speech-to-Text Provider
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { ISpeechToTextProvider, SpeechTranscriptionResult } from '../interfaces/voice.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

const execFileAsync = promisify(execFile);

export interface WindowsSpeechSttOptions {
  readonly language?: string;
  readonly confidenceThreshold?: number;
}

export class WindowsSpeechSTTProvider implements ISpeechToTextProvider {
  public readonly id = 'windows';
  public readonly name = 'Windows Speech Recognition Engine';
  private readonly logger?: ILogger;
  public readonly confidenceThreshold: number;
  private initialized = false;

  constructor(options: WindowsSpeechSttOptions = {}, logger?: ILogger) {
    this.logger = logger?.child('WindowsSpeechSTT');
    this.confidenceThreshold = options.confidenceThreshold ?? 0.1;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.logger?.info('Windows Speech STT Provider initialized.');
  }

  public async transcribe(audioFilePath: string): Promise<SpeechTranscriptionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const resolvedAudio = path.resolve(audioFilePath);
    if (!fs.existsSync(resolvedAudio)) {
      throw new Error(`Audio file not found: ${resolvedAudio}`);
    }

    const startTime = Date.now();

    const psScript = `
      Add-Type -AssemblyName System.Speech
      $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
      $grammar = New-Object System.Speech.Recognition.DictationGrammar
      $engine.LoadGrammar($grammar)
      $engine.SetInputToWaveFile("${resolvedAudio.replace(/\\/g, '\\\\')}")
      $result = $engine.Recognize()
      if ($result -ne $null) {
        $output = @{
          Text = $result.Text
          Confidence = $result.Confidence
        } | ConvertTo-Json -Compress
        Write-Output $output
      } else {
        Write-Output '{"Text":"","Confidence":0}'
      }
      $engine.Dispose()
    `;

    try {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 30000 }
      );

      const durationMs = Date.now() - startTime;
      const parsed = JSON.parse(stdout.trim() || '{"Text":"","Confidence":0}');

      return {
        text: (parsed.Text || '').trim(),
        language: 'en',
        confidence: typeof parsed.Confidence === 'number' ? parsed.Confidence : 0,
        durationMs
      };
    } catch (err) {
      this.logger?.error('Windows Speech recognition error', { err });
      return {
        text: '',
        language: 'en',
        confidence: 0,
        durationMs: Date.now() - startTime
      };
    }
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
    this.logger?.info('Windows Speech STT Provider shutdown complete.');
  }
}
