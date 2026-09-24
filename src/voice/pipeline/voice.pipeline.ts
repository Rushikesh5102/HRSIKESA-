/**
 * HṚṢĪKEŚA (हृषीकेश) — End-to-End Voice Pipeline
 */

import {
  ISpeechToTextProvider,
  ITextToSpeechProvider,
  IAudioRecorder,
  IAudioPlayer,
  VoiceInteractionResult,
  SpeechTranscriptionResult,
  SpeechSynthesisResult
} from '../interfaces/voice.types.js';
import { ConversationService, ConversationResponse } from '../../conversation/conversation.service.js';
import { VoiceSession } from '../session/voice.session.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { PronunciationNormalizer } from '../pronunciation/services/pronunciation-normalizer.service.js';
import { TargetEngineFormat } from '../pronunciation/interfaces/pronunciation.types.js';

export interface VoicePipelineOptions {
  readonly autoPlayTTS?: boolean;
  readonly defaultLanguage?: string;
  readonly normalizer?: PronunciationNormalizer;
}

export class VoicePipeline {
  public readonly stt: ISpeechToTextProvider;
  public readonly tts: ITextToSpeechProvider;
  public readonly recorder: IAudioRecorder;
  public readonly player: IAudioPlayer;
  public readonly normalizer?: PronunciationNormalizer;
  private readonly conversationService: ConversationService;
  private readonly logger?: ILogger;
  private readonly autoPlayTTS: boolean;
  private readonly activeSessions = new Map<string, VoiceSession>();
  private initialized = false;

  constructor(
    stt: ISpeechToTextProvider,
    tts: ITextToSpeechProvider,
    recorder: IAudioRecorder,
    player: IAudioPlayer,
    conversationService: ConversationService,
    options: VoicePipelineOptions = {},
    logger?: ILogger
  ) {
    this.stt = stt;
    this.tts = tts;
    this.recorder = recorder;
    this.player = player;
    this.conversationService = conversationService;
    this.normalizer = options.normalizer;
    this.autoPlayTTS = options.autoPlayTTS ?? true;
    this.logger = logger?.child('VoicePipeline');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger?.info('Initializing Voice Pipeline components...');
    await this.stt.initialize();
    await this.tts.initialize();
    this.initialized = true;
    this.logger?.info('Voice Pipeline initialization complete.');
  }

  public getOrCreateVoiceSession(sessionId: string): VoiceSession {
    let session = this.activeSessions.get(sessionId);
    if (!session) {
      session = new VoiceSession(sessionId);
      this.activeSessions.set(sessionId, session);
    }
    return session;
  }

  public async transcribeAudio(audioFilePath: string): Promise<SpeechTranscriptionResult> {
    if (!this.initialized) await this.initialize();
    return this.stt.transcribe(audioFilePath);
  }

  private getTargetEngineFormat(): TargetEngineFormat {
    if (this.tts.id === 'sapi') return 'sapi-ssml';
    if (this.tts.id === 'piper') return 'piper-phonetic';
    return 'plain-phonetic';
  }

  public async synthesizeAndPlay(text: string): Promise<SpeechSynthesisResult> {
    if (!this.initialized) await this.initialize();
    const format = this.getTargetEngineFormat();
    const normalizedText = this.normalizer ? this.normalizer.normalize(text, format) : text;
    const synthResult = await this.tts.synthesize(normalizedText);
    if (this.autoPlayTTS) {
      await this.player.play(synthResult.audioFilePath);
    }
    return synthResult;
  }

  /**
   * Processes a pre-recorded audio file through the full STT -> Conversation -> TTS loop.
   */
  public async processAudio(
    audioFilePath: string,
    sessionId?: string
  ): Promise<VoiceInteractionResult> {
    if (!this.initialized) await this.initialize();

    const overallStart = Date.now();

    // 1. Speech-to-Text
    const sttStart = Date.now();
    const transcription = await this.stt.transcribe(audioFilePath);
    const sttMs = Date.now() - sttStart;

    this.logger?.info('STT transcription complete', {
      text: transcription.text,
      durationMs: sttMs
    });

    if (!transcription.text.trim()) {
      return {
        success: false,
        sessionId: sessionId || 'unknown',
        transcription,
        responseText: 'No speech recognized.',
        totalDurationMs: Date.now() - overallStart,
        latencies: {
          sttMs,
          conversationMs: 0,
          ttsMs: 0
        }
      };
    }

    // 2. Sovereign Conversation Bridge (inherits memory, tools, models, permissions)
    const convStart = Date.now();
    const convResponse: ConversationResponse = await this.conversationService.sendMessage(
      transcription.text,
      sessionId
    );
    const conversationMs = Date.now() - convStart;

    this.logger?.info('Conversation turn completed', {
      sessionId: convResponse.sessionId,
      durationMs: conversationMs
    });

    // 3. Text-to-Speech
    const ttsStart = Date.now();
    let synthesisResult: SpeechSynthesisResult | undefined;
    if (convResponse.response && this.autoPlayTTS) {
      const format = this.getTargetEngineFormat();
      const normalizedText = this.normalizer ? this.normalizer.normalize(convResponse.response, format) : convResponse.response;
      synthesisResult = await this.tts.synthesize(normalizedText);
      await this.player.play(synthesisResult.audioFilePath);
    }
    const ttsMs = Date.now() - ttsStart;

    // 4. Update voice session metadata
    const voiceSession = this.getOrCreateVoiceSession(convResponse.sessionId);
    voiceSession.recordInteraction(
      transcription.text,
      convResponse.response,
      transcription.durationMs
    );

    const totalDurationMs = Date.now() - overallStart;

    return {
      success: true,
      sessionId: convResponse.sessionId,
      transcription,
      responseText: convResponse.response,
      synthesisResult,
      totalDurationMs,
      latencies: {
        sttMs,
        conversationMs,
        ttsMs
      }
    };
  }

  public async shutdown(): Promise<void> {
    this.logger?.info('Shutting down Voice Pipeline...');
    if (this.recorder.isRecording) {
      try { await this.recorder.stopRecording(); } catch {}
    }
    if (this.player.isPlaying) {
      try { await this.player.stop(); } catch {}
    }
    await this.stt.shutdown();
    await this.tts.shutdown();
    this.activeSessions.clear();
    this.initialized = false;
    this.logger?.info('Voice Pipeline shutdown complete.');
  }
}
