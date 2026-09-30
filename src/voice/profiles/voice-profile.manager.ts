/**
 * HṚṢĪKEŚA (हृषीकेश) — Voice Profile Manager
 *
 * Maintains voice personality consistency, language-specific voice routing,
 * speaking rate adjustments, and persistent user voice settings.
 */

import fs from 'node:fs';
import path from 'node:path';
import { VoiceProfile, VoicePreferenceState } from './voice-profile.types.js';
import { SupportedLanguageCode } from '../multilingual/interfaces/multilingual.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export const BUILT_IN_VOICE_PROFILES: readonly VoiceProfile[] = [
  {
    id: 'hrisekesa-natural',
    name: 'HṚṢĪKEŚA Natural Conversational (Canonical)',
    language: 'en',
    gender: 'MALE',
    style: 'NATURAL_CONVERSATIONAL',
    speakingRate: 1.0,
    pitch: 0,
    volume: 100,
    preferredProvider: 'indic-parler',
    modelOrVoiceName: 'ai4bharat/indic-parler-tts',
    fallbackChain: ['indic-parler', 'piper', 'sapi', 'mock'],
    description: 'A natural Indian male assistant with a warm, intelligent, calm and confident conversational presence. Human conversational prosody rather than announcer delivery. Clear Indian English pronunciation. Natural pauses. Subtle emotional variation. Medium-deep voice. Refined close-microphone recording quality.',
    ssmlGender: 'Male',
    defaultSpeaker: 'Thoma',
  },
  {
    id: 'hrisekesa-indic-hi',
    name: 'HṚṢĪKEŚA Indic Hindi (Rohit)',
    language: 'hi',
    gender: 'MALE',
    style: 'NATURAL_CONVERSATIONAL',
    speakingRate: 0.98,
    pitch: 0,
    volume: 100,
    preferredProvider: 'indic-parler',
    modelOrVoiceName: 'ai4bharat/indic-parler-tts',
    fallbackChain: ['indic-parler', 'sapi', 'piper', 'mock'],
    description: 'Warm, fluent conversational Hindi delivered with dignified clarity and refined cadence.',
    ssmlGender: 'Male',
    defaultSpeaker: 'Rohit',
  },
  {
    id: 'hrisekesa-indic-mr',
    name: 'HṚṢĪKEŚA Indic Marathi (Sanjay)',
    language: 'mr',
    gender: 'MALE',
    style: 'NATURAL_CONVERSATIONAL',
    speakingRate: 0.98,
    pitch: 0,
    volume: 100,
    preferredProvider: 'indic-parler',
    modelOrVoiceName: 'ai4bharat/indic-parler-tts',
    fallbackChain: ['indic-parler', 'sapi', 'piper', 'mock'],
    description: 'Authentic, articulate Marathi delivery with natural conversational cadence and clear phonetics.',
    ssmlGender: 'Male',
    defaultSpeaker: 'Sanjay',
  },
  {
    id: 'hrisekesa-indic-sa',
    name: 'HṚṢĪKEŚA Sacred Sanskrit (Aryan)',
    language: 'sa',
    gender: 'MALE',
    style: 'RESPECTFUL_SCHOLARLY',
    speakingRate: 0.92,
    pitch: 0,
    volume: 100,
    preferredProvider: 'indic-parler',
    modelOrVoiceName: 'ai4bharat/indic-parler-tts',
    fallbackChain: ['indic-parler', 'sapi', 'piper', 'mock'],
    description: 'Reverent Sanskrit delivery preserving rigorous syllable weights, sandhi, and sacred cadence.',
    ssmlGender: 'Male',
    defaultSpeaker: 'Aryan',
  },
  {
    id: 'hrisekesa-sovereign-en',
    name: 'HṚṢĪKEŚA Sovereign Piper (English)',
    language: 'en',
    gender: 'MALE',
    style: 'SOVEREIGN_AUTHORITATIVE',
    speakingRate: 1.0,
    pitch: 0,
    volume: 100,
    preferredProvider: 'piper',
    modelOrVoiceName: 'data/audio/en-us-lessac-low.onnx',
    fallbackChain: ['piper', 'sapi', 'mock'],
    description: 'Calm, authoritative sovereign persona with clear articulation for engineering and leadership.',
    ssmlGender: 'Male',
  },
];

export const DEFAULT_PREFERENCE_STATE: VoicePreferenceState = {
  activeProfileId: 'hrisekesa-natural',
  voiceEngine: 'indic-parler',
  autoDetectLanguage: true,
  defaultLanguage: 'en',
  outputLanguagePolicy: 'AUTOMATIC',
  preserveCodeSwitching: true,
  preferNativeScript: false,
  speakerMap: {
    en: 'Thoma',
    hi: 'Rohit',
    mr: 'Sanjay',
    sa: 'Aryan',
  },
  speakingRateModifier: 0.0,
  autoEmotion: true,
  emotionalIntensity: 0.35,
  naturalness: 0.85,
  responseMode: 'balanced',
  pitchLevel: 'medium-low',
  reverbLevel: 'minimal',
  voiceQuality: 'refined',
  interruptible: true,
  streamingTts: true,
  echoProtection: true,
  updatedAt: new Date().toISOString(),
};

export class VoiceProfileManager {
  private readonly storagePath: string;
  private readonly logger?: ILogger;
  private profiles = new Map<string, VoiceProfile>();
  private preferences: VoicePreferenceState = { ...DEFAULT_PREFERENCE_STATE };

  constructor(storagePath = 'data/voice_preferences.json', logger?: ILogger) {
    this.storagePath = storagePath;
    this.logger = logger?.child('VoiceProfileManager');
    this.initialize();
  }

  private initialize(): void {
    for (const p of BUILT_IN_VOICE_PROFILES) {
      this.profiles.set(p.id, p);
    }

    if (fs.existsSync(this.storagePath)) {
      try {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const loaded = JSON.parse(raw);
        this.preferences = {
          ...DEFAULT_PREFERENCE_STATE,
          ...loaded,
          speakerMap: {
            ...DEFAULT_PREFERENCE_STATE.speakerMap,
            ...(loaded.speakerMap || {}),
          },
        };
      } catch (err) {
        this.logger?.warn(`Could not load voice preferences from ${this.storagePath}, using defaults`, { err });
      }
    } else {
      this.persist();
    }
  }

  public getProfile(profileId: string): VoiceProfile | undefined {
    return this.profiles.get(profileId);
  }

  public getActiveProfile(): VoiceProfile {
    return this.profiles.get(this.preferences.activeProfileId) || BUILT_IN_VOICE_PROFILES[0];
  }

  public getProfileForLanguage(lang: SupportedLanguageCode): VoiceProfile {
    // 1. Check exact language match
    for (const profile of this.profiles.values()) {
      if (profile.language === lang) return profile;
    }
    // 2. Default fallback: active profile
    return this.getActiveProfile();
  }

  public listProfiles(): readonly VoiceProfile[] {
    return Array.from(this.profiles.values());
  }

  public getPreferences(): VoicePreferenceState {
    return { ...this.preferences };
  }

  public updatePreferences(patch: Partial<VoicePreferenceState>): VoicePreferenceState {
    this.preferences = {
      ...this.preferences,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    this.logger?.info(`Updated voice preferences: activeProfile=${this.preferences.activeProfileId}, defaultLang=${this.preferences.defaultLanguage}`);
    return this.getPreferences();
  }

  public adjustSpeed(delta: number): number {
    const current = this.preferences.speakingRateModifier;
    const next = Math.max(-0.4, Math.min(0.6, current + delta));
    this.updatePreferences({ speakingRateModifier: next });
    return next;
  }

  public resetSpeed(): void {
    this.updatePreferences({ speakingRateModifier: 0.0 });
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.preferences, null, 2), 'utf-8');
    } catch (err) {
      this.logger?.warn(`Failed to persist voice preferences to ${this.storagePath}`, { err });
    }
  }
}
