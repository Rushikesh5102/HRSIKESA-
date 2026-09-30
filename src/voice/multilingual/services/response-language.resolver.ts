/**
 * HṚṢĪKEŚA (हृषीकेश) — Response Language Policy Resolver
 *
 * Enforces conversational language continuity, explicit user preference,
 * code-switching preservation, and prompt instruction generation.
 */

import {
  SupportedLanguageCode,
  ResponseLanguageOptions,
  ResponseLanguageResolution,
  DetailedLanguageDetection,
} from '../interfaces/multilingual.types.js';
import { LANGUAGE_REGISTRY } from './language-detector.service.js';
import { ILogger } from '../../../core/logging/logger.types.js';

export const DEFAULT_RESPONSE_LANGUAGE_OPTIONS: ResponseLanguageOptions = {
  policy: 'AUTOMATIC',
  preserveCodeSwitching: true,
  preferNativeScript: false,
};

export class ResponseLanguageResolver {
  private readonly logger?: ILogger;
  private currentConversationLanguage: SupportedLanguageCode = 'en';

  constructor(logger?: ILogger) {
    this.logger = logger?.child('ResponseLanguageResolver');
  }

  /**
   * Resolves the target output language and script for the response turn.
   *
   * Rules:
   * 1. If explicit policy is set to a specific language ('en', 'hi', 'mr', 'sa'), respect it.
   * 2. If user explicitly asks in text for a language ("in Marathi", "translate to Hindi", "अस्य अर्थः कः"), obey that.
   * 3. If policy is 'FOLLOW_USER' or 'AUTOMATIC', reply in the detected input language.
   * 4. If input is code-switched (e.g. Hinglish / Marathi-English) and preserveCodeSwitching is ON,
   *    preserve technical terms in English while matching the primary Indic base.
   * 5. Maintain conversational continuity across turns unless changed.
   */
  public resolve(
    detected: DetailedLanguageDetection,
    userText: string,
    options: ResponseLanguageOptions = DEFAULT_RESPONSE_LANGUAGE_OPTIONS
  ): ResponseLanguageResolution {
    this.logger?.debug('Resolving response language', { textLength: userText.length, detected: detected.code });
    const textLower = userText.toLowerCase();

    // 1. Explicit user in-text instruction override (e.g. "explain this in Marathi", "in Hindi please")
    if (textLower.includes('in marathi') || textLower.includes('मराठीत') || textLower.includes('मराठी मध्ये')) {
      this.currentConversationLanguage = 'mr';
      return {
        language: 'mr',
        script: options.preferNativeScript ? 'Devanagari' : 'Devanagari',
        reason: 'Explicit user request for Marathi in prompt',
        codeSwitchingPreserved: options.preserveCodeSwitching,
        promptInstruction: 'Respond in natural, fluent Marathi (मराठी). You may retain technical terms in English where natural.',
      };
    }

    if (textLower.includes('in hindi') || textLower.includes('हिन्दी में') || textLower.includes('हिंदी में')) {
      this.currentConversationLanguage = 'hi';
      return {
        language: 'hi',
        script: options.preferNativeScript ? 'Devanagari' : 'Devanagari',
        reason: 'Explicit user request for Hindi in prompt',
        codeSwitchingPreserved: options.preserveCodeSwitching,
        promptInstruction: 'Respond in clear, natural Hindi (हिन्दी). You may retain technical terms in English where natural.',
      };
    }

    if (textLower.includes('in sanskrit') || textLower.includes('संस्कृतेन') || textLower.includes('संस्कृत में') || textLower.includes('अस्य अर्थः कः')) {
      this.currentConversationLanguage = 'sa';
      return {
        language: 'sa',
        script: 'Devanagari',
        reason: 'Explicit user request for Sanskrit in prompt',
        codeSwitchingPreserved: false,
        promptInstruction: 'Respond in dignified, grammatically pure classical Sanskrit (संस्कृतम्).',
      };
    }

    if (textLower.includes('in english') || textLower.includes('explain in english')) {
      this.currentConversationLanguage = 'en';
      return {
        language: 'en',
        script: 'Latin',
        reason: 'Explicit user request for English in prompt',
        codeSwitchingPreserved: false,
        promptInstruction: 'Respond in clear, articulate English.',
      };
    }

    // 2. Fixed Policy override from Settings
    if (options.policy !== 'AUTOMATIC' && options.policy !== 'FOLLOW_USER') {
      const fixedLang = options.policy as SupportedLanguageCode;
      this.currentConversationLanguage = fixedLang;
      const profile = LANGUAGE_REGISTRY[fixedLang] || LANGUAGE_REGISTRY.en;
      return {
        language: fixedLang,
        script: profile.script,
        reason: `Configured fixed policy: ${options.policy}`,
        codeSwitchingPreserved: options.preserveCodeSwitching,
        promptInstruction: profile.promptInstruction,
      };
    }

    // 3. Spoken Command override if detected by LanguageDetector
    if (detected.detectedCommand === 'SWITCH_LANGUAGE' && detected.targetLanguageOverride) {
      this.currentConversationLanguage = detected.targetLanguageOverride;
      const profile = LANGUAGE_REGISTRY[detected.targetLanguageOverride] || LANGUAGE_REGISTRY.en;
      return {
        language: detected.targetLanguageOverride,
        script: profile.script,
        reason: 'Detected spoken language switch command',
        codeSwitchingPreserved: options.preserveCodeSwitching,
        promptInstruction: profile.promptInstruction,
      };
    }

    // 4. Follow user / Automatic input detection
    // If input detection confidence is sufficient, adopt input language
    if (detected.confidence >= 0.65) {
      this.currentConversationLanguage = detected.code;
      const profile = LANGUAGE_REGISTRY[detected.code] || LANGUAGE_REGISTRY.en;

      let instruction = profile.promptInstruction;
      if (detected.isCodeSwitched && options.preserveCodeSwitching) {
        instruction += ' Maintain natural conversational code-switching, preserving English technical terms.';
      }

      return {
        language: detected.code,
        script: detected.script === 'Mixed' ? (options.preferNativeScript ? 'Devanagari' : 'Devanagari') : detected.script,
        reason: `Followed user language: ${detected.name} (confidence: ${(detected.confidence * 100).toFixed(0)}%)`,
        codeSwitchingPreserved: detected.isCodeSwitched && options.preserveCodeSwitching,
        promptInstruction: instruction,
      };
    }

    // 5. Fallback to current continuous conversation language
    const currentProfile = LANGUAGE_REGISTRY[this.currentConversationLanguage] || LANGUAGE_REGISTRY.en;
    return {
      language: this.currentConversationLanguage,
      script: currentProfile.script,
      reason: 'Maintained conversation continuity',
      codeSwitchingPreserved: options.preserveCodeSwitching,
      promptInstruction: currentProfile.promptInstruction,
    };
  }

  public getCurrentLanguage(): SupportedLanguageCode {
    return this.currentConversationLanguage;
  }

  public resetLanguage(language: SupportedLanguageCode = 'en'): void {
    this.currentConversationLanguage = language;
  }
}
