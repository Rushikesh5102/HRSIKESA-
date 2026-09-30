/**
 * HṚṢĪKEŚA (हृषीकेश) — Voice Profile & Identity Types
 *
 * Enforces a consistent, authoritative, respectful sovereign voice identity
 * across English, Hindi, Marathi, Sanskrit, and regional Indic languages.
 */

import { SupportedLanguageCode } from '../multilingual/interfaces/multilingual.types.js';

export interface VoiceProfile {
  readonly id: string;
  readonly name: string;
  readonly language: SupportedLanguageCode;
  readonly gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  readonly style: 'SOVEREIGN_AUTHORITATIVE' | 'RESPECTFUL_SCHOLARLY' | 'CALM_BALANCED' | 'ENERGETIC' | 'NATURAL_CONVERSATIONAL';
  readonly speakingRate: number; // 0.5 to 2.0 (1.0 = normal)
  readonly pitch: number;        // -10 to +10 (0 = natural)
  readonly volume: number;       // 0 to 100 (100 = full)
  readonly preferredProvider: 'indic-parler' | 'piper' | 'sapi' | 'mock';
  readonly modelOrVoiceName?: string;
  readonly fallbackChain: readonly ('indic-parler' | 'piper' | 'sapi' | 'mock')[];
  readonly description: string;
  readonly ssmlGender?: string;
  readonly defaultSpeaker?: string;
}

export interface VoicePreferenceState {
  readonly activeProfileId: string;
  readonly voiceEngine: 'indic-parler' | 'piper' | 'sapi';
  readonly autoDetectLanguage: boolean;
  readonly defaultLanguage: SupportedLanguageCode;
  readonly outputLanguagePolicy: 'AUTOMATIC' | 'FOLLOW_USER' | 'en' | 'hi' | 'mr' | 'sa';
  readonly preserveCodeSwitching: boolean;
  readonly preferNativeScript: boolean;
  readonly speakerMap: Record<string, string>;
  readonly speakingRateModifier: number; // user speed adjustment (-0.5 to +0.5)
  readonly autoEmotion: boolean;
  readonly emotionalIntensity: number;   // 0.0 to 1.0
  readonly naturalness: number;          // 0.0 to 1.0
  readonly responseMode: 'balanced' | 'concise' | 'explanatory' | 'urgent';
  readonly pitchLevel: 'low' | 'medium-low' | 'medium' | 'medium-high';
  readonly reverbLevel: 'none' | 'minimal' | 'studio';
  readonly voiceQuality: 'refined' | 'natural' | 'studio';
  readonly interruptible: boolean;
  readonly streamingTts: boolean;
  readonly echoProtection: boolean;
  readonly updatedAt: string;
}

