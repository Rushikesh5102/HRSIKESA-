/**
 * HṚṢĪKEŚA (हृषीकेश) — Voice Activity Detection (VAD) Service
 *
 * Phase 24: Bounded real-time audio energy and voice activity analysis.
 * Detects speech start, ongoing speech, silence pauses, and timeouts to prevent sending noise to STT.
 */

import { ILogger } from '../../core/logging/logger.types.js';

export type VadState = 'SILENCE' | 'SPEECH_STARTED' | 'SPEECH_ACTIVE' | 'SPEECH_ENDED' | 'TIMEOUT';

export interface VadConfig {
  readonly energyThreshold: number;       // Root Mean Square (RMS) threshold for speech
  readonly silenceThresholdMs: number;     // Silence duration before concluding speech has ended (e.g. 800ms)
  readonly maxSpeechDurationMs: number;    // Hard timeout on single utterance (e.g. 15000ms)
  readonly minSpeechDurationMs: number;    // Minimum speech duration to filter out clicks/pops (e.g. 200ms)
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  energyThreshold: 0.02,
  silenceThresholdMs: 800,
  maxSpeechDurationMs: 15000,
  minSpeechDurationMs: 200,
};

export class VadService {
  private readonly config: VadConfig;
  private readonly logger?: ILogger;

  private state: VadState = 'SILENCE';
  private speechStartTime: number | null = null;
  private lastSpeechTime: number | null = null;
  private totalSpeechFrames = 0;

  constructor(config?: Partial<VadConfig>, logger?: ILogger) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
    this.logger = logger?.child('VadService');
  }

  /**
   * Processes an audio PCM buffer frame (16-bit signed integer samples) and determines voice activity.
   */
  public processFrame(pcmBuffer: Buffer, _sampleRate = 16000): { state: VadState; rms: number; isSpeech: boolean } {
    const rms = this.calculateRms(pcmBuffer);
    const now = Date.now();
    const isAboveThreshold = rms >= this.config.energyThreshold;

    if (isAboveThreshold) {
      if (this.state === 'SILENCE' || this.state === 'SPEECH_ENDED') {
        this.state = 'SPEECH_STARTED';
        this.speechStartTime = now;
        this.lastSpeechTime = now;
        this.totalSpeechFrames = 1;
        this.logger?.debug(`[VAD] Speech started (RMS: ${rms.toFixed(4)})`);
      } else {
        this.state = 'SPEECH_ACTIVE';
        this.lastSpeechTime = now;
        this.totalSpeechFrames++;
      }

      // Check max utterance duration timeout
      if (this.speechStartTime && (now - this.speechStartTime) >= this.config.maxSpeechDurationMs) {
        this.state = 'TIMEOUT';
        this.logger?.debug(`[VAD] Speech duration timeout exceeded (${this.config.maxSpeechDurationMs}ms)`);
      }
    } else {
      // Below threshold (Silence / Background noise)
      if (this.state === 'SPEECH_ACTIVE' || this.state === 'SPEECH_STARTED') {
        if (this.lastSpeechTime && (now - this.lastSpeechTime) >= this.config.silenceThresholdMs) {
          const totalDuration = this.speechStartTime ? (now - this.speechStartTime) : 0;
          if (totalDuration >= this.config.minSpeechDurationMs) {
            this.state = 'SPEECH_ENDED';
            this.logger?.debug(`[VAD] Speech ended after ${totalDuration}ms silence`);
          } else {
            // Speech was too brief (e.g. click/noise pop)
            this.state = 'SILENCE';
          }
        }
      }
    }

    return {
      state: this.state,
      rms,
      isSpeech: this.state === 'SPEECH_STARTED' || this.state === 'SPEECH_ACTIVE',
    };
  }

  /**
   * Resets VAD state tracking for a new utterance turn.
   */
  public reset(): void {
    this.state = 'SILENCE';
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    this.totalSpeechFrames = 0;
  }

  public getState(): VadState {
    return this.state;
  }

  public getTotalSpeechFrames(): number {
    return this.totalSpeechFrames;
  }

  /**
   * Computes normalized Root Mean Square (RMS) amplitude from 16-bit PCM buffer.
   */
  private calculateRms(buffer: Buffer): number {
    if (!buffer || buffer.length === 0) return 0;

    let sumSquares = 0;
    const sampleCount = Math.floor(buffer.length / 2);

    for (let i = 0; i < sampleCount; i++) {
      const sample = buffer.readInt16LE(i * 2) / 32768.0;
      sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / sampleCount);
  }
}
