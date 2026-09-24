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
  readonly style: 'SOVEREIGN_AUTHORITATIVE' | 'RESPECTFUL_SCHOLARLY' | 'CALM_BALANCED' | 'ENERGETIC';
  readonly speakingRate: number; // 0.5 to 2.0 (1.0 = normal)
  readonly pitch: number;        // -10 to +10 (0 = natural)
  readonly volume: number;       // 0 to 100 (100 = full)
  readonly preferredProvider: 'piper' | 'sapi' | 'mock';
  readonly modelOrVoiceName?: string;
  readonly fallbackChain: readonly ('piper' | 'sapi' | 'mock')[];
  readonly description: string;
  readonly ssmlGender?: string;
}

export interface VoicePreferenceState {
  readonly activeProfileId: string;
  readonly autoDetectLanguage: boolean;
  readonly defaultLanguage: SupportedLanguageCode;
  readonly speakingRateModifier: number; // user speed adjustment (-0.5 to +0.5)
  readonly interruptible: boolean;
  readonly streamingTts: boolean;
  readonly echoProtection: boolean;
  readonly updatedAt: string;
}
