/**
 * HṚṢĪKEŚA (हृषीकेश) — Streaming Voice & Barge-In Coordinator
 *
 * Phase 24: Unifies streaming STT transcription, partial transcript handling,
 * sentence-chunked TTS playback, and instant voice interruption / barge-in.
 */

import { EventEmitter } from 'node:events';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  MicrophoneState,
  SpeakerState,
} from '../interfaces/multimodal.types.js';
import { VadService } from './vad.service.js';

export interface StreamingVoiceEventMap {
  'state.microphone': (state: MicrophoneState) => void;
  'state.speaker': (state: SpeakerState) => void;
  'transcript.partial': (partialText: string, confidence: number) => void;
  'transcript.final': (finalText: string, confidence: number, language: string) => void;
  'voice.interrupted': (reason: string) => void;
  'playback.started': (text: string) => void;
  'playback.finished': () => void;
}

export class StreamingVoiceCoordinator extends EventEmitter {
  private readonly vad: VadService;
  private readonly logger?: ILogger;

  private micState: MicrophoneState = 'IDLE';
  private speakerState: SpeakerState = 'IDLE';
  private currentPartial = '';
  private partialsCount = 0;
  private confidence = 1.0;
  private activeLanguage = 'en';

  constructor(vad?: VadService, logger?: ILogger) {
    super();
    this.vad = vad || new VadService();
    this.logger = logger?.child('StreamingVoiceCoordinator');
  }

  // =========================================================================
  // State Inspection
  // =========================================================================

  public getMicrophoneState(): MicrophoneState {
    return this.micState;
  }

  public getSpeakerState(): SpeakerState {
    return this.speakerState;
  }

  public getCurrentPartial(): string {
    return this.currentPartial;
  }

  // =========================================================================
  // STT Pipeline & Ingestion
  // =========================================================================

  public startListening(): void {
    this.vad.reset();
    this.currentPartial = '';
    this.partialsCount = 0;
    this.setMicrophoneState('LISTENING');
    this.logger?.debug(`[StreamingVoiceCoordinator] Started listening for voice input`);
  }

  public stopListening(): void {
    this.setMicrophoneState('IDLE');
    this.logger?.debug(`[StreamingVoiceCoordinator] Stopped listening`);
  }

  /**
   * Processes incoming streaming audio frame.
   */
  public ingestAudioFrame(pcmBuffer: Buffer): void {
    const vadResult = this.vad.processFrame(pcmBuffer);

    // Barge-in check: If TTS is active and user starts speaking -> trigger immediate interruption
    if (this.speakerState === 'PLAYING' && vadResult.isSpeech) {
      this.handleBargeIn('User voice activity detected during playback');
    }

    if (vadResult.state === 'SPEECH_STARTED' || vadResult.state === 'SPEECH_ACTIVE') {
      if (this.micState !== 'TRANSCRIBING' && this.micState !== 'PARTIAL') {
        this.setMicrophoneState('TRANSCRIBING');
      }
    } else if (vadResult.state === 'SPEECH_ENDED' || vadResult.state === 'TIMEOUT') {
      if (this.currentPartial) {
        this.emitFinalTranscript(this.currentPartial, this.confidence, this.activeLanguage);
      }
    }
  }

  /**
   * Pushes a partial streaming transcript from STT engine.
   */
  public pushPartialTranscript(partialText: string, confidence = 0.9, language = 'en'): void {
    this.currentPartial = partialText;
    this.confidence = confidence;
    this.activeLanguage = language;
    this.partialsCount++;
    this.setMicrophoneState('PARTIAL');

    this.emit('transcript.partial', partialText, confidence);
    this.logger?.debug(`[StreamingVoiceCoordinator] Partial transcript: "${partialText}" (conf: ${confidence})`);
  }

  /**
   * Commits the final verified transcript.
   */
  public emitFinalTranscript(finalText: string, confidence = 0.95, language = 'en'): void {
    this.currentPartial = '';
    this.confidence = confidence;
    this.activeLanguage = language;
    this.setMicrophoneState('FINAL');

    this.emit('transcript.final', finalText, confidence, language);
    this.logger?.info(`[StreamingVoiceCoordinator] Final transcript committed: "${finalText}" [${language}] (conf: ${confidence})`);

    // Reset back to IDLE after finalizing
    this.setMicrophoneState('IDLE');
  }

  // =========================================================================
  // TTS & Playback Management
  // =========================================================================

  public startPlayback(text: string): void {
    this.setSpeakerState('PLAYING');
    this.emit('playback.started', text);
    this.logger?.debug(`[StreamingVoiceCoordinator] Started TTS playback: "${text.substring(0, 60)}..."`);
  }

  public finishPlayback(): void {
    this.setSpeakerState('IDLE');
    this.emit('playback.finished');
    this.logger?.debug(`[StreamingVoiceCoordinator] Finished TTS playback`);
  }

  /**
   * Barge-in handler: Instantly halts active TTS and re-allocates priority to incoming speech.
   */
  public handleBargeIn(reason = 'User interruption'): void {
    if (this.speakerState === 'PLAYING') {
      this.setSpeakerState('INTERRUPTED');
      this.emit('voice.interrupted', reason);
      this.logger?.info(`[StreamingVoiceCoordinator] Barge-in triggered: ${reason}`);

      // Transition speaker back to IDLE and ready microphone for incoming speech
      this.setSpeakerState('IDLE');
      this.setMicrophoneState('TRANSCRIBING');
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private setMicrophoneState(state: MicrophoneState): void {
    if (this.micState !== state) {
      this.micState = state;
      this.emit('state.microphone', state);
    }
  }

  private setSpeakerState(state: SpeakerState): void {
    if (this.speakerState !== state) {
      this.speakerState = state;
      this.emit('state.speaker', state);
    }
  }
}
