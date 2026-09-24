/**
 * HṚṢĪKEŚA (हृषीकेश) — Multilingual Voice & Code-Switching Types
 */

export type SupportedLanguageCode =
  | 'en' // English
  | 'hi' // Hindi (हिन्दी)
  | 'mr' // Marathi (मराठी)
  | 'sa' // Sanskrit (संस्कृतम्)
  | 'bn' // Bengali (বাংলা)
  | 'gu' // Gujarati (ગુજરાતી)
  | 'ta' // Tamil (தமிழ்)
  | 'te' // Telugu (తెలుగు)
  | 'kn' // Kannada (ಕನ್ನಡ)
  | 'ml' // Malayalam (മലയാളം)
  | 'pa' // Punjabi (ਪੰਜਾਬੀ)
  | 'ur'; // Urdu (اردو)

export type ScriptType =
  | 'Latin'
  | 'Devanagari'
  | 'Bengali'
  | 'Gujarati'
  | 'Gurmukhi'
  | 'Tamil'
  | 'Telugu'
  | 'Kannada'
  | 'Malayalam'
  | 'Arabic'
  | 'Mixed';

export interface LanguageProfile {
  readonly code: SupportedLanguageCode;
  readonly name: string;
  readonly nativeName: string;
  readonly script: ScriptType;
  readonly isIndic: boolean;
  readonly defaultTtsVoice?: string;
  readonly samplePhrase: string;
  readonly promptInstruction: string;
}

export interface DetectedLanguage {
  readonly code: SupportedLanguageCode;
  readonly name: string;
  readonly confidence: number;
  readonly script: ScriptType;
  readonly isIndic: boolean;
  readonly isCodeSwitched: boolean;
  readonly secondaryLanguage?: SupportedLanguageCode;
  readonly primaryProportion: number; // 0.0 to 1.0
  readonly detectedCommand?: 'SWITCH_LANGUAGE' | 'SPEAK_SLOWER' | 'SPEAK_FASTER' | 'RESET_VOICE' | 'STOP';
  readonly targetLanguageOverride?: SupportedLanguageCode;
}

export interface ILanguageDetector {
  detect(text: string): DetectedLanguage;
  getProfile(code: SupportedLanguageCode): LanguageProfile | undefined;
  listSupportedLanguages(): readonly LanguageProfile[];
}
