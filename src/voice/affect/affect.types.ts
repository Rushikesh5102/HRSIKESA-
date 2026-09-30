/**
 * HṚṢĪKEŚA (हृषीकेश) — Voice Affect, Context & Delivery Types
 */

export type UserAffect =
  | 'calm'
  | 'happy'
  | 'excited'
  | 'frustrated'
  | 'concerned'
  | 'serious'
  | 'urgent'
  | 'sad'
  | 'confused'
  | 'neutral';

export type InteractionMode =
  | 'casual'
  | 'professional'
  | 'technical'
  | 'teaching'
  | 'troubleshooting'
  | 'command'
  | 'urgent';

export interface UserSpeakingState {
  readonly affect: UserAffect;
  readonly confidence: number;
  readonly arousal: number; // 0.0 to 1.0 (energy level)
  readonly urgency: number; // 0.0 to 1.0
  readonly interactionMode: InteractionMode;
  readonly evidence: readonly string[];
}

export type TTSDeliveryEmotion =
  | 'neutral'
  | 'warm'
  | 'happy'
  | 'serious'
  | 'concerned'
  | 'excited'
  | 'command'
  | 'reassuring';

export type PitchLevel = 'low' | 'medium-low' | 'medium' | 'medium-high';
export type ExpressivenessLevel = 'subtle' | 'moderate' | 'expressive';
export type ReverbLevel = 'none' | 'minimal' | 'studio';
export type VoiceQualityLevel = 'refined' | 'natural' | 'studio';

export interface TTSDeliveryState {
  readonly emotion: TTSDeliveryEmotion;
  readonly intensity: number; // 0.0 to 1.0 (subtle: ~0.25 to 0.40)
  readonly rate: number;      // 0.8 to 1.3 (1.0 = normal)
  readonly pitch: PitchLevel;
  readonly expressiveness: ExpressivenessLevel;
  readonly reverberation: ReverbLevel;
  readonly quality: VoiceQualityLevel;
  readonly caption: string;   // Synthesized acoustic description for Indic Parler-TTS
}

export interface DeliveryPolicyOptions {
  readonly autoEmotion: boolean;
  readonly emotionalIntensity: number; // User setting 0.0 - 1.0
  readonly naturalness: number;        // User setting 0.0 - 1.0
  readonly responseMode: 'balanced' | 'concise' | 'explanatory' | 'urgent';
}
