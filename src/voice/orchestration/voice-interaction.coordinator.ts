/**
 * HṚṢĪKEŚA (हृषीकेश) — Voice Interaction Coordinator & Barge-In Engine
 *
 * Orchestrates real-time voice loops:
 * VAD -> Streaming STT -> Language Detection -> Fast-Path / Conversation ->
 * Pronunciation Normalizer -> Streaming TTS -> Audio Playback.
 * Handles instantaneous barge-in / interruption and self-hearing echo protection.
 */

import { EventEmitter } from 'node:events';
import {
  ISpeechToTextProvider,
  ITextToSpeechProvider,
  IAudioPlayer,
  SpeechTranscriptionResult,
} from '../interfaces/voice.types.js';
import { PronunciationNormalizer } from '../pronunciation/services/pronunciation-normalizer.service.js';
import { LanguageDetector } from '../multilingual/services/language-detector.service.js';
import { VoiceProfileManager } from '../profiles/voice-profile.manager.js';
import { StreamingTtsEngine } from '../streaming/streaming-tts-engine.js';
import { VadService } from '../../multimodal/voice/vad.service.js';
import { ConversationService } from '../../conversation/conversation.service.js';
import { ResponseLanguageResolver } from '../multilingual/services/response-language.resolver.js';
import { UserSpeakingStateInferrer } from '../affect/user-speaking-state.inferrer.js';
import { ResponseDeliveryResolver } from '../affect/response-delivery.resolver.js';
import { UserSpeakingState, TTSDeliveryState } from '../affect/affect.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export type VoiceState = 'IDLE' | 'LISTENING' | 'TRANSCRIBING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED';

export interface VoiceMetricsSnapshot {
  readonly audioInputStartedAt?: number;
  readonly speechDetectedAt?: number;
  readonly speechFinalizedAt?: number;
  readonly sttStartedAt?: number;
  readonly sttFinalizedAt?: number;
  readonly routingStartedAt?: number;
  readonly llmStartedAt?: number;
  readonly llmFirstTokenAt?: number;
  readonly ttsStartedAt?: number;
  readonly ttsFirstAudioAt?: number;
  readonly playbackStartedAt?: number;
  readonly voiceResponseLatencyMs: number; // Duration from user speech end -> first audible sound
  readonly totalTurnDurationMs: number;
  readonly inputLanguage?: string;
  readonly languageConfidence?: number;
  readonly outputLanguage?: string;
  readonly userAffect?: string;
  readonly deliveryEmotion?: string;
  readonly ttsCaption?: string;
  readonly providerUsed?: string;
  readonly fallbackUsed?: boolean;
}

export class VoiceInteractionCoordinator extends EventEmitter {
  public readonly stt: ISpeechToTextProvider;
  public readonly tts: ITextToSpeechProvider;
  public readonly player: IAudioPlayer;
  public readonly normalizer: PronunciationNormalizer;
  public readonly langDetector: LanguageDetector;
  public readonly profileManager: VoiceProfileManager;
  public readonly streamingTts: StreamingTtsEngine;
  public readonly vad: VadService;
  public readonly responseLangResolver: ResponseLanguageResolver;
  public readonly userStateInferrer: UserSpeakingStateInferrer;
  public readonly deliveryResolver: ResponseDeliveryResolver;
  private readonly conversationService: ConversationService;
  private readonly logger?: ILogger;

  private state: VoiceState = 'IDLE';
  private currentSessionId = 'voice_session_default';
  private isSelfSpeaking = false;
  private lastLatencySnapshot: VoiceMetricsSnapshot | null = null;
  private lastInferredState: UserSpeakingState | null = null;
  private lastDeliveryState: TTSDeliveryState | null = null;

  constructor(
    stt: ISpeechToTextProvider,
    tts: ITextToSpeechProvider,
    player: IAudioPlayer,
    normalizer: PronunciationNormalizer,
    langDetector: LanguageDetector,
    profileManager: VoiceProfileManager,
    conversationService: ConversationService,
    vad?: VadService,
    logger?: ILogger
  ) {
    super();
    this.stt = stt;
    this.tts = tts;
    this.player = player;
    this.normalizer = normalizer;
    this.langDetector = langDetector;
    this.profileManager = profileManager;
    this.conversationService = conversationService;
    this.vad = vad || new VadService();
    this.responseLangResolver = new ResponseLanguageResolver(logger);
    this.userStateInferrer = new UserSpeakingStateInferrer(logger);
    this.deliveryResolver = new ResponseDeliveryResolver(logger);

    this.streamingTts = new StreamingTtsEngine(this.tts, this.player, this.normalizer, logger);

    this.streamingTts.on('firstAudio', () => {
      this.isSelfSpeaking = true;
      this.setState('SPEAKING');
    });

    this.streamingTts.on('completed', () => {
      this.isSelfSpeaking = false;
      if (this.state === 'SPEAKING') {
        this.setState('IDLE');
      }
    });

    this.streamingTts.on('aborted', (reason) => {
      this.isSelfSpeaking = false;
      this.setState('INTERRUPTED');
      this.logger?.info(`Speech output interrupted: ${reason}`);
      this.setState('IDLE');
    });
  }

  public getState(): VoiceState {
    return this.state;
  }

  public getLastMetrics(): VoiceMetricsSnapshot | null {
    return this.lastLatencySnapshot;
  }

  /**
   * Instantly stops playback and cancels queued TTS when user interrupts.
   */
  public async handleBargeIn(reason = 'User interruption'): Promise<void> {
    if (this.state === 'SPEAKING' || this.isSelfSpeaking) {
      this.logger?.info(`[Barge-In] User interrupted speaking: ${reason}`);
      await this.streamingTts.abort(reason);
      this.isSelfSpeaking = false;
      this.setState('INTERRUPTED');
      this.emit('interrupted', { reason, timestamp: new Date().toISOString() });
      this.setState('IDLE');
    }
  }

  /**
   * Ingests real-time audio PCM frames, evaluating VAD and echo protection.
   */
  public async ingestAudioPcm(pcmBuffer: Buffer): Promise<void> {
    // Echo / Self-Hearing Protection:
    // If the speaker is currently outputting sound, suppress normal low-energy triggers
    const prefs = this.profileManager.getPreferences();
    if (this.isSelfSpeaking && prefs.echoProtection) {
      const vadResult = this.vad.processFrame(pcmBuffer);
      // Only treat as genuine barge-in if the user's speech amplitude significantly exceeds speaker noise
      if (vadResult.isSpeech && vadResult.rms > 0.15) {
        await this.handleBargeIn('Loud user voice detected during playback');
      }
      return;
    }

    const vadResult = this.vad.processFrame(pcmBuffer);

    if (vadResult.state === 'SPEECH_STARTED') {
      if (this.isSelfSpeaking) {
        await this.handleBargeIn('User speech started');
      }
      this.setState('LISTENING');
    } else if (vadResult.state === 'SPEECH_ENDED') {
      this.setState('TRANSCRIBING');
    }
  }

  /**
   * Executes a complete end-to-end voice conversational turn from transcribed or audio input.
   */
  public async handleUtterance(
    input: string | { audioFilePath: string },
    sessionId?: string
  ): Promise<{ responseText: string; metrics: VoiceMetricsSnapshot }> {
    const turnStart = Date.now();
    const activeSession = sessionId || this.currentSessionId;
    this.currentSessionId = activeSession;

    let speechDetectedAt = turnStart;
    let speechFinalizedAt = turnStart;
    let sttStartedAt = Date.now();
    let sttFinalizedAt = Date.now();
    let transcribedText = '';

    // 1. Transcription (if audio given)
    if (typeof input === 'object' && input.audioFilePath) {
      this.setState('TRANSCRIBING');
      sttStartedAt = Date.now();
      const sttResult: SpeechTranscriptionResult = await this.stt.transcribe(input.audioFilePath);
      sttFinalizedAt = Date.now();
      transcribedText = sttResult.text.trim();
    } else {
      transcribedText = String(input).trim();
    }

    if (!transcribedText) {
      this.setState('IDLE');
      const emptyMetrics: VoiceMetricsSnapshot = {
        voiceResponseLatencyMs: 0,
        totalTurnDurationMs: Date.now() - turnStart,
      };
      return { responseText: '', metrics: emptyMetrics };
    }

    // 2. Multi-Signal Language Detection & Conversational State Inference
    const detectedLang = this.langDetector.detectDetailed(transcribedText);
    const prefs = this.profileManager.getPreferences();

    // Prosody features from audio timing if available
    const prosody = {
      durationMs: sttFinalizedAt - sttStartedAt,
      wordsPerMinute: (transcribedText.split(/\s+/).length / Math.max(0.5, (sttFinalizedAt - sttStartedAt) / 60000)),
    };

    const userState = this.userStateInferrer.infer(transcribedText, prosody, {
      lastTurnAffect: this.lastInferredState?.affect,
    });
    this.lastInferredState = userState;

    this.logger?.info(
      `User utterance: "${transcribedText}" [Lang: ${detectedLang.name} (${detectedLang.code}), Confidence: ${(detectedLang.confidence * 100).toFixed(0)}%, Affect: ${userState.affect}, Mode: ${userState.interactionMode}]`
    );

    // 3. Response Language Resolution
    const resolvedLang = this.responseLangResolver.resolve(detectedLang, transcribedText, {
      policy: prefs.outputLanguagePolicy || 'AUTOMATIC',
      preserveCodeSwitching: prefs.preserveCodeSwitching ?? true,
      preferNativeScript: prefs.preferNativeScript ?? false,
    });

    // Handle Spoken Commands directly
    if (detectedLang.detectedCommand) {
      const commandResponse = await this.executeSpokenCommand(detectedLang.detectedCommand, detectedLang.targetLanguageOverride);
      if (commandResponse) {
        const metrics: VoiceMetricsSnapshot = {
          sttStartedAt,
          sttFinalizedAt,
          voiceResponseLatencyMs: Date.now() - sttFinalizedAt,
          totalTurnDurationMs: Date.now() - turnStart,
          inputLanguage: detectedLang.code,
          languageConfidence: detectedLang.confidence,
          outputLanguage: resolvedLang.language,
          userAffect: userState.affect,
        };
        this.lastLatencySnapshot = metrics;
        return { responseText: commandResponse, metrics };
      }
    }

    // 4. Fast-Path Conversational Gate (bypasses heavy multi-agent scheduling for quick banter)
    const fastPathResponse = this.checkFastPath(transcribedText, resolvedLang.language);
    if (fastPathResponse) {
      this.logger?.info(`Fast-path matched for utterance: "${transcribedText}" [Lang: ${resolvedLang.language}]`);
      const ttsStartedAt = Date.now();
      this.setState('SPEAKING');

      const speaker = prefs.speakerMap?.[resolvedLang.language] || (this.tts as any).getSpeakerForLanguage?.(resolvedLang.language) || 'Rohit';
      const deliveryState = this.deliveryResolver.resolve(userState, fastPathResponse, resolvedLang.language, speaker, {
        autoEmotion: prefs.autoEmotion ?? true,
        emotionalIntensity: prefs.emotionalIntensity ?? 0.35,
        naturalness: prefs.naturalness ?? 0.85,
        responseMode: prefs.responseMode || 'balanced',
      });
      this.lastDeliveryState = deliveryState;

      await this.speakDirect(fastPathResponse, resolvedLang.language, speaker, deliveryState.caption);

      const metrics: VoiceMetricsSnapshot = {
        sttStartedAt,
        sttFinalizedAt,
        routingStartedAt: ttsStartedAt,
        ttsStartedAt,
        voiceResponseLatencyMs: Date.now() - sttFinalizedAt,
        totalTurnDurationMs: Date.now() - turnStart,
        inputLanguage: detectedLang.code,
        languageConfidence: detectedLang.confidence,
        outputLanguage: resolvedLang.language,
        userAffect: userState.affect,
        deliveryEmotion: deliveryState.emotion,
        ttsCaption: deliveryState.caption,
        providerUsed: this.tts.id,
      };
      this.lastLatencySnapshot = metrics;
      this.setState('IDLE');
      return { responseText: fastPathResponse, metrics };
    }

    // 5. Standard Sovereign Conversation Turn (inherits memory, tools, and models)
    this.setState('THINKING');
    const routingStartedAt = Date.now();
    const llmStartedAt = Date.now();

    // Prepare language instruction hint for model based on resolved language
    let promptWithLanguage = transcribedText;
    if (resolvedLang.language !== 'en' || resolvedLang.promptInstruction) {
      promptWithLanguage = `${transcribedText}\n\n[Language Policy: ${resolvedLang.promptInstruction}]`;
    }

    // Initiate conversation turn
    const convResponse = await this.conversationService.sendMessage(promptWithLanguage, activeSession);
    const llmFirstTokenAt = Date.now();

    const responseText = convResponse.response || 'HṚṢĪKEŚA is listening.';

    // 6. Response Emotion / Delivery State Resolution
    const speaker = prefs.speakerMap?.[resolvedLang.language] || (this.tts as any).getSpeakerForLanguage?.(resolvedLang.language) || 'Rohit';
    const deliveryState = this.deliveryResolver.resolve(userState, responseText, resolvedLang.language, speaker, {
      autoEmotion: prefs.autoEmotion ?? true,
      emotionalIntensity: prefs.emotionalIntensity ?? 0.35,
      naturalness: prefs.naturalness ?? 0.85,
      responseMode: prefs.responseMode || 'balanced',
    });
    this.lastDeliveryState = deliveryState;

    // 7. Streaming Synthesis & Playback
    this.setState('SPEAKING');
    const ttsStartedAt = Date.now();

    // Turn string into an async token stream for the segmenter
    const tokenStream = this.createTokenStream(responseText);
    const streamingMetrics = await this.streamingTts.speakTokenStream(tokenStream, {
      language: resolvedLang.language,
      speaker,
      caption: deliveryState.caption,
      emotion: deliveryState.emotion,
      speakingRate: deliveryState.rate,
    });

    const turnEnd = Date.now();
    const metrics: VoiceMetricsSnapshot = {
      speechDetectedAt,
      speechFinalizedAt,
      sttStartedAt,
      sttFinalizedAt,
      routingStartedAt,
      llmStartedAt,
      llmFirstTokenAt,
      ttsStartedAt,
      ttsFirstAudioAt: ttsStartedAt + streamingMetrics.firstAudioLatencyMs,
      playbackStartedAt: ttsStartedAt + streamingMetrics.firstAudioLatencyMs,
      voiceResponseLatencyMs: (ttsStartedAt + streamingMetrics.firstAudioLatencyMs) - sttFinalizedAt,
      totalTurnDurationMs: turnEnd - turnStart,
      inputLanguage: detectedLang.code,
      languageConfidence: detectedLang.confidence,
      outputLanguage: resolvedLang.language,
      userAffect: userState.affect,
      deliveryEmotion: deliveryState.emotion,
      ttsCaption: deliveryState.caption,
      providerUsed: this.tts.id,
      fallbackUsed: (this.tts as any).getLastTelemetry?.()?.fallbackUsed,
    };

    this.lastLatencySnapshot = metrics;
    this.setState('IDLE');
    return { responseText, metrics };
  }

  /**
   * Fast-path recognition for rapid conversational responsiveness.
   */
  private checkFastPath(text: string, lang: string): string | null {
    const lower = text.toLowerCase().trim().replace(/[.,!?;:]/g, '');

    // Pronunciation Query (Critical requirement Section 19)
    if (
      lower.includes('pronounce your name') ||
      lower.includes('how do you pronounce') ||
      lower.includes('how to pronounce hrisekesa') ||
      lower.includes('how do you pronounce hrṣīkeśa') ||
      lower.includes('what is your name')
    ) {
      if (lang === 'mr') {
        return 'माझे नाव हृषीकेश आहे. हे संस्कृत भाषेतील पूज्य नाव आहे, ज्याचा अर्थ मनाचा आणि इंद्रियांचा स्वामी असा होतो.';
      }
      if (lang === 'hi') {
        return 'मेरा नाम हृषीकेश है। यह संस्कृत का पावन नाम है, जिसका अर्थ है इंद्रियों का स्वामी।';
      }
      return 'My name is HṚṢĪKEŚA, pronounced /hṛ-ṣī-ke-śa/. It is the Sanskrit title signifying the Lord of the Senses and Sovereign Master of the Mind.';
    }

    // Greetings
    if (lower === 'hello' || lower === 'hi' || lower === 'hey' || lower === 'hello hrisekesa' || lower === 'hello hrṣīkeśa') {
      return 'Greetings, Master. HṚṢĪKEŚA is online and ready for your command.';
    }

    if (lower === 'नमस्ते' || lower === 'नमस्ते हृषीकेश' || lower === 'प्रणाम') {
      return 'नमस्ते। हृषीकेश पूर्णतः सन्नद्ध है, आज्ञा दीजिए।';
    }

    if (lower === 'नमस्कार' || lower === 'नमस्कार हृषीकेश') {
      return 'सस्नेह नमस्कार। हृषीकेश प्रणाली सज्ज आहे, आज्ञा करा.';
    }

    if (lower === 'thank you' || lower === 'thanks') {
      return 'You are most welcome, Master.';
    }

    if (lower === 'धन्यवाद' || lower === 'आभार') {
      return 'आपले स्वागत आहे. मी सदैव आपल्या सेवेसाठी तत्पर आहे.';
    }

    return null;
  }

  /**
   * Executes spoken voice commands (speed, language switch, reset).
   */
  private async executeSpokenCommand(command: string, targetLanguage?: string): Promise<string | null> {
    if (command === 'SWITCH_LANGUAGE' && targetLanguage) {
      this.profileManager.updatePreferences({ defaultLanguage: targetLanguage as any });
      const targetName = this.langDetector.getProfile(targetLanguage as any)?.name || targetLanguage;

      if (targetLanguage === 'mr') {
        const msg = 'नक्कीच. आतापासून मी आपल्याशी मराठीत संवाद साधेन.';
        await this.speakDirect(msg, 'mr');
        return msg;
      }
      if (targetLanguage === 'hi') {
        const msg = 'अवश्य। अब से मैं आपसे हिन्दी में वार्तालाप करूँगा।';
        await this.speakDirect(msg, 'hi');
        return msg;
      }
      const msg = `Language preference updated to ${targetName}.`;
      await this.speakDirect(msg, 'en');
      return msg;
    }

    if (command === 'SPEAK_SLOWER') {
      this.profileManager.adjustSpeed(-0.15);
      const msg = 'Speaking rate reduced.';
      await this.speakDirect(msg, 'en');
      return msg;
    }

    if (command === 'SPEAK_FASTER') {
      this.profileManager.adjustSpeed(0.15);
      const msg = 'Speaking rate increased.';
      await this.speakDirect(msg, 'en');
      return msg;
    }

    if (command === 'RESET_VOICE') {
      this.profileManager.resetSpeed();
      const msg = 'Voice speed restored to default.';
      await this.speakDirect(msg, 'en');
      return msg;
    }

    if (command === 'STOP') {
      await this.handleBargeIn('User commanded stop');
      return 'Stopped.';
    }

    return null;
  }

  /**
   * Directly speaks a short message through the streaming engine.
   */
  private async speakDirect(text: string, language = 'en', speaker?: string, caption?: string): Promise<void> {
    const stream = this.createTokenStream(text);
    await this.streamingTts.speakTokenStream(stream, { language, speaker, caption });
  }

  private async *createTokenStream(text: string): AsyncIterable<string> {
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield (i === 0 ? '' : ' ') + words[i];
    }
  }

  public getLastInferredState(): UserSpeakingState | null {
    return this.lastInferredState;
  }

  public getLastDeliveryState(): TTSDeliveryState | null {
    return this.lastDeliveryState;
  }

  private setState(state: VoiceState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state);
      this.logger?.debug(`[VoiceInteractionCoordinator] State transition: ${state}`);
    }
  }
}
