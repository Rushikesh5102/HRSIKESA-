/**
 * HṚṢĪKEŚA (हृषीकेश) — Response Emotion & Delivery Engine
 *
 * Deterministically computes bounded acoustic delivery parameters from
 * conversational affect, task intent, user settings, and canonical persona.
 */

import {
  UserSpeakingState,
  TTSDeliveryEmotion,
  TTSDeliveryState,
  DeliveryPolicyOptions,
  PitchLevel,
  ExpressivenessLevel,
  ReverbLevel,
  VoiceQualityLevel,
} from './affect.types.js';
import { SupportedLanguageCode } from '../multilingual/interfaces/multilingual.types.js';
import { TtsCaptionBuilder } from './tts-caption.builder.js';
import { ILogger } from '../../core/logging/logger.types.js';

export const DEFAULT_DELIVERY_POLICY: DeliveryPolicyOptions = {
  autoEmotion: true,
  emotionalIntensity: 0.35, // Subtle by default
  naturalness: 0.85,
  responseMode: 'balanced',
};

export class ResponseDeliveryResolver {
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('ResponseDeliveryResolver');
  }

  /**
   * Deterministically resolves the delivery emotion, rate, pitch, and caption.
   */
  public resolve(
    userState: UserSpeakingState,
    responseContent: string,
    targetLanguage: SupportedLanguageCode,
    speakerName: string,
    options: DeliveryPolicyOptions = DEFAULT_DELIVERY_POLICY,
    isHighRiskOrDangerous = false
  ): TTSDeliveryState {
    const resLower = (responseContent || '').toLowerCase();

    let emotion: TTSDeliveryEmotion = 'neutral';
    let rate = 1.0;
    let pitch: PitchLevel = 'medium-low';
    let expressiveness: ExpressivenessLevel = 'subtle';
    let reverberation: ReverbLevel = 'minimal';
    let quality: VoiceQualityLevel = 'refined';
    let intensity = Math.min(1.0, Math.max(0.1, options.emotionalIntensity));

    if (!options.autoEmotion) {
      // Flat conversational neutral when auto emotion disabled
      emotion = 'neutral';
      intensity = 0.2;
    } else if (isHighRiskOrDangerous || resLower.includes('warning') || resLower.includes('danger') || resLower.includes('caution')) {
      // High-risk or security operations: serious, deliberate delivery
      emotion = 'serious';
      rate = 0.92;
      pitch = 'low';
      expressiveness = 'subtle';
    } else if (userState.affect === 'frustrated') {
      // Frustrated user -> HṚṢĪKEŚA becomes calmer, clearer, reassuring (does NOT escalate)
      emotion = 'reassuring';
      rate = 0.95;
      pitch = 'medium-low';
      expressiveness = 'subtle';
    } else if (userState.affect === 'excited' || userState.affect === 'happy') {
      // Positive energy in response to success
      emotion = 'happy';
      rate = 1.04;
      pitch = 'medium';
      expressiveness = 'moderate';
    } else if (userState.interactionMode === 'command' || userState.urgency > 0.8) {
      // Urgent command execution: concise, firm, clear
      emotion = 'command';
      rate = 1.08;
      pitch = 'medium-low';
      expressiveness = 'subtle';
    } else if (userState.interactionMode === 'teaching') {
      // Pedagogical / explanatory: patient, warm, clear pauses
      emotion = 'warm';
      rate = 0.92;
      pitch = 'medium';
      expressiveness = 'subtle';
    } else if (userState.interactionMode === 'technical') {
      // Controlled, confident, professional technical delivery
      emotion = 'neutral';
      rate = 0.98;
      pitch = 'medium-low';
      expressiveness = 'subtle';
    } else {
      // Casual / default conversational presence
      emotion = 'neutral';
      rate = 1.0;
      pitch = 'medium-low';
      expressiveness = 'subtle';
    }

    // Apply responseMode modifiers
    if (options.responseMode === 'urgent') {
      rate = Math.max(rate, 1.1);
      expressiveness = 'subtle';
    } else if (options.responseMode === 'explanatory') {
      rate = Math.min(rate, 0.92);
    }

    // Bound speaking rate between 0.8 and 1.3
    rate = +Math.max(0.8, Math.min(1.3, rate)).toFixed(2);

    const caption = TtsCaptionBuilder.build({
      speakerName,
      language: targetLanguage,
      emotion,
      intensity,
      rate,
      pitch,
      expressiveness,
      reverberation,
      quality,
    });

    const deliveryState: TTSDeliveryState = {
      emotion,
      intensity,
      rate,
      pitch,
      expressiveness,
      reverberation,
      quality,
      caption,
    };

    this.logger?.debug('Resolved TTS delivery state', deliveryState as unknown as Record<string, unknown>);
    return deliveryState;
  }
}
