/**
 * HṚṢĪKEŚA (हृषीकेश) — Multilingual Language Detector & Code-Switching Engine
 *
 * Provides ultra-fast script analysis, Devanagari dialect disambiguation
 * (Marathi vs Hindi vs Sanskrit), code-switching ratio detection,
 * and spoken voice command interception.
 */

import {
  DetectedLanguage,
  ILanguageDetector,
  LanguageProfile,
  ScriptType,
  SupportedLanguageCode,
} from '../interfaces/multilingual.types.js';
import { ILogger } from '../../../core/logging/logger.types.js';

export const LANGUAGE_REGISTRY: Record<SupportedLanguageCode, LanguageProfile> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    isIndic: false,
    defaultTtsVoice: 'en_US-lessac-medium',
    samplePhrase: 'HṚṢĪKEŚA is online and ready.',
    promptInstruction: 'Respond in clear, natural English.',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    isIndic: true,
    samplePhrase: 'हृषीकेश पूर्णतः क्रियाशील और तत्पर है।',
    promptInstruction: 'उत्तर शुद्ध और सरल हिन्दी में दीजिए।',
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    isIndic: true,
    samplePhrase: 'हृषीकेश कार्यप्रणाली सुरू झाली आहे, आज आपण काय करूया?',
    promptInstruction: 'उत्तर अस्खलित मराठीत द्या.',
  },
  sa: {
    code: 'sa',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    script: 'Devanagari',
    isIndic: true,
    samplePhrase: 'हृषीकेशः सन्नद्धः अस्ति।',
    promptInstruction: 'उत्तरं शुद्धे संस्कृते यच्छतु।',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    isIndic: true,
    samplePhrase: 'হৃষীকেশ প্রস্তুত আছে।',
    promptInstruction: 'উত্তর বাংলায় দিন।',
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    isIndic: true,
    samplePhrase: 'હૃષીકેશ તૈયાર છે.',
    promptInstruction: 'ગુજરાતીમાં જવાબ આપો.',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    isIndic: true,
    samplePhrase: 'ஹ்ருஷிகேசா தயாராக உள்ளது.',
    promptInstruction: 'தமிழில் பதிலளிக்கவும்.',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    isIndic: true,
    samplePhrase: 'హృషీకేశ సిద్ధంగా ఉంది.',
    promptInstruction: 'తెలుగులో సమాధానం ఇవ్వండి.',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    isIndic: true,
    samplePhrase: 'ಹೃಷೀಕೇಶ ಸಿದ್ಧವಾಗಿದೆ.',
    promptInstruction: 'ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ.',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    isIndic: true,
    samplePhrase: 'ഹൃഷികേശ സജ്ജമാണ്.',
    promptInstruction: 'മലയാളത്തിൽ മറുപടി നൽകുക.',
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    isIndic: true,
    samplePhrase: 'ਹਿਰਸ਼ੀਕੇਸ਼ ਤਿਆਰ ਹੈ।',
    promptInstruction: 'ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।',
  },
  ur: {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    script: 'Arabic',
    isIndic: true,
    samplePhrase: 'ہردیشیکیش تیار ہے۔',
    promptInstruction: 'اردو میں جواب دیں۔',
  },
};

// Dialect classification lexicons
const MARATHI_MARKERS = new Set([
  'आहे', 'नाही', 'काय', 'आपण', 'करूया', 'मध्ये', 'होते', 'करणे',
  'वर', 'चं', 'च्या', 'बघू', 'सांगा', 'कसे', 'आहात', 'धन्यवाद',
  'करायचं', 'झाले', 'नको', 'आणि', 'पण', 'कधी', 'कुठे', 'कसा', 'कशी'
]);

const SANSKRIT_MARKERS = new Set([
  'अस्ति', 'भवति', 'नमः', 'कुरु', 'एवम्', 'यत्', 'तत्', 'इति',
  'स्वाहा', 'वदतु', 'वयं', 'अहम्', 'शान्तिः', 'नमो', 'त्वम्',
  'अस्तु', 'सत्यम्', 'ज्ञानेन', 'कर्म', 'योगः'
]);

const HINDI_MARKERS = new Set([
  'है', 'नहीं', 'क्या', 'हम', 'करेंगे', 'में', 'था', 'करना',
  'पर', 'का', 'की', 'के', 'नमस्ते', 'आप', 'कैसे', 'हैं', 'हो',
  'रहा', 'रही', 'करो', 'मुझे', 'उसका', 'उनकी', 'होगा'
]);

export class LanguageDetector implements ILanguageDetector {
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('LanguageDetector');
  }

  public getProfile(code: SupportedLanguageCode): LanguageProfile | undefined {
    return LANGUAGE_REGISTRY[code];
  }

  public listSupportedLanguages(): readonly LanguageProfile[] {
    return Object.values(LANGUAGE_REGISTRY);
  }

  /**
   * Fast detection of script, language, code-switching ratio, and voice commands.
   */
  public detect(text: string): DetectedLanguage {
    const trimmed = (text || '').trim();
    this.logger?.debug('Detecting language', { length: trimmed.length });
    if (!trimmed) {
      return {
        code: 'en',
        name: 'English',
        confidence: 1.0,
        script: 'Latin',
        isIndic: false,
        isCodeSwitched: false,
        primaryProportion: 1.0,
      };
    }

    // 1. Check for Spoken Voice Language & Speed Override Commands
    const commandCheck = this.detectSpokenCommand(trimmed);
    if (commandCheck) {
      return commandCheck;
    }

    // 2. Count character distributions per Unicode script block
    let latinCount = 0;
    let devanagariCount = 0;
    let bengaliCount = 0;
    let gujaratiCount = 0;
    let gurmukhiCount = 0;
    let tamilCount = 0;
    let teluguCount = 0;
    let kannadaCount = 0;
    let malayalamCount = 0;
    let arabicCount = 0;
    let totalChars = 0;

    for (const char of trimmed) {
      const code = char.charCodeAt(0);
      if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
        latinCount++;
        totalChars++;
      } else if (code >= 0x0900 && code <= 0x097f) {
        devanagariCount++;
        totalChars++;
      } else if (code >= 0x0980 && code <= 0x09ff) {
        bengaliCount++;
        totalChars++;
      } else if (code >= 0x0a80 && code <= 0x0aff) {
        gujaratiCount++;
        totalChars++;
      } else if (code >= 0x0a00 && code <= 0x0a7f) {
        gurmukhiCount++;
        totalChars++;
      } else if (code >= 0x0b80 && code <= 0x0bff) {
        tamilCount++;
        totalChars++;
      } else if (code >= 0x0c00 && code <= 0x0c7f) {
        teluguCount++;
        totalChars++;
      } else if (code >= 0x0c80 && code <= 0x0cff) {
        kannadaCount++;
        totalChars++;
      } else if (code >= 0x0d00 && code <= 0x0d7f) {
        malayalamCount++;
        totalChars++;
      } else if (code >= 0x0600 && code <= 0x06ff) {
        arabicCount++;
        totalChars++;
      }
    }

    if (totalChars === 0) {
      return {
        code: 'en',
        name: 'English',
        confidence: 0.8,
        script: 'Latin',
        isIndic: false,
        isCodeSwitched: false,
        primaryProportion: 1.0,
      };
    }

    // Determine highest non-Latin Indic script count
    const indicCounts = [
      { code: 'bn' as SupportedLanguageCode, script: 'Bengali' as ScriptType, count: bengaliCount },
      { code: 'gu' as SupportedLanguageCode, script: 'Gujarati' as ScriptType, count: gujaratiCount },
      { code: 'pa' as SupportedLanguageCode, script: 'Gurmukhi' as ScriptType, count: gurmukhiCount },
      { code: 'ta' as SupportedLanguageCode, script: 'Tamil' as ScriptType, count: tamilCount },
      { code: 'te' as SupportedLanguageCode, script: 'Telugu' as ScriptType, count: teluguCount },
      { code: 'kn' as SupportedLanguageCode, script: 'Kannada' as ScriptType, count: kannadaCount },
      { code: 'ml' as SupportedLanguageCode, script: 'Malayalam' as ScriptType, count: malayalamCount },
      { code: 'ur' as SupportedLanguageCode, script: 'Arabic' as ScriptType, count: arabicCount },
    ];

    indicCounts.sort((a, b) => b.count - a.count);
    const topNonDevanagari = indicCounts[0];

    // If Devanagari is dominant or present
    if (devanagariCount > 0 && devanagariCount >= topNonDevanagari.count) {
      const devanagariLang = this.disambiguateDevanagari(trimmed);
      const isCodeSwitched = latinCount > 0 && (latinCount / totalChars) >= 0.15;
      const proportion = devanagariCount / totalChars;

      return {
        code: devanagariLang,
        name: LANGUAGE_REGISTRY[devanagariLang].name,
        confidence: Math.min(0.98, Math.max(0.7, proportion + 0.2)),
        script: isCodeSwitched ? 'Mixed' : 'Devanagari',
        isIndic: true,
        isCodeSwitched,
        secondaryLanguage: isCodeSwitched ? 'en' : undefined,
        primaryProportion: proportion,
      };
    }

    // If other regional Indic script is present
    if (topNonDevanagari && topNonDevanagari.count > 0 && topNonDevanagari.count >= (totalChars * 0.25)) {
      const isCodeSwitched = latinCount > 0 && (latinCount / totalChars) >= 0.15;
      return {
        code: topNonDevanagari.code,
        name: LANGUAGE_REGISTRY[topNonDevanagari.code].name,
        confidence: 0.95,
        script: isCodeSwitched ? 'Mixed' : topNonDevanagari.script,
        isIndic: true,
        isCodeSwitched,
        secondaryLanguage: isCodeSwitched ? 'en' : undefined,
        primaryProportion: topNonDevanagari.count / totalChars,
      };
    }

    // Otherwise Latin / English with possible Indic terms
    return {
      code: 'en',
      name: 'English',
      confidence: 0.95,
      script: 'Latin',
      isIndic: false,
      isCodeSwitched: false,
      primaryProportion: 1.0,
    };
  }

  /**
   * Distinguishes between Marathi, Hindi, and Sanskrit in Devanagari text.
   */
  private disambiguateDevanagari(text: string): SupportedLanguageCode {
    const words = text
      .toLowerCase()
      .split(/[\s,।॥!?.()"'—–\-_/]+/)
      .filter((w) => w.length > 0);

    let marathiScore = 0;
    let sanskritScore = 0;
    let hindiScore = 0;

    for (const word of words) {
      if (MARATHI_MARKERS.has(word)) marathiScore += 2;
      if (SANSKRIT_MARKERS.has(word)) sanskritScore += 2;
      if (HINDI_MARKERS.has(word)) hindiScore += 2;

      // Morphological suffix checks
      if (word.endsWith('चं') || word.endsWith('च्या') || word.endsWith('तील') || word.endsWith('कडे') || word.endsWith('वरून')) {
        marathiScore += 3;
      }
      if (word.endsWith('तः') || word.endsWith('म्') || word.endsWith('ाय') || word.endsWith('ेषु') || word.includes('्') && word.endsWith('ः')) {
        sanskritScore += 3;
      }
      if (word.endsWith('ूंगा') || word.endsWith('ेंगे') || word.endsWith('एगा') || word.endsWith('ोगी') || word.endsWith('रहे')) {
        hindiScore += 3;
      }
    }

    if (marathiScore > hindiScore && marathiScore > sanskritScore) {
      return 'mr';
    }
    if (sanskritScore > hindiScore && sanskritScore > marathiScore) {
      return 'sa';
    }
    if (hindiScore > 0) {
      return 'hi';
    }

    // Default Devanagari fallback: Hindi
    return 'hi';
  }

  /**
   * Detects spoken conversational commands to override language or speaking style.
   */
  private detectSpokenCommand(text: string): DetectedLanguage | null {
    const lower = text.toLowerCase().trim();

    // Language switch commands
    if (
      lower.includes('speak in marathi') ||
      lower.includes('switch to marathi') ||
      lower.includes('मराठीत बोला') ||
      lower.includes('मराठी मध्ये बोला')
    ) {
      return {
        code: 'mr',
        name: 'Marathi',
        confidence: 1.0,
        script: 'Mixed',
        isIndic: true,
        isCodeSwitched: false,
        primaryProportion: 1.0,
        detectedCommand: 'SWITCH_LANGUAGE',
        targetLanguageOverride: 'mr',
      };
    }

    if (
      lower.includes('speak in hindi') ||
      lower.includes('switch to hindi') ||
      lower.includes('हिंदी में बोलो') ||
      lower.includes('हिंदी बोलो')
    ) {
      return {
        code: 'hi',
        name: 'Hindi',
        confidence: 1.0,
        script: 'Mixed',
        isIndic: true,
        isCodeSwitched: false,
        primaryProportion: 1.0,
        detectedCommand: 'SWITCH_LANGUAGE',
        targetLanguageOverride: 'hi',
      };
    }

    if (
      lower.includes('speak in english') ||
      lower.includes('switch to english') ||
      lower.includes('use english')
    ) {
      return {
        code: 'en',
        name: 'English',
        confidence: 1.0,
        script: 'Latin',
        isIndic: false,
        isCodeSwitched: false,
        primaryProportion: 1.0,
        detectedCommand: 'SWITCH_LANGUAGE',
        targetLanguageOverride: 'en',
      };
    }

    if (
      lower.includes('speak in sanskrit') ||
      lower.includes('संस्कृते वदतु') ||
      lower.includes('संस्कृत में बोलो')
    ) {
      return {
        code: 'sa',
        name: 'Sanskrit',
        confidence: 1.0,
        script: 'Devanagari',
        isIndic: true,
        isCodeSwitched: false,
        primaryProportion: 1.0,
        detectedCommand: 'SWITCH_LANGUAGE',
        targetLanguageOverride: 'sa',
      };
    }

    // Speed commands
    if (lower === 'speak slower' || lower === 'slower' || lower === 'धीमे बोलो' || lower === 'हळू बोला') {
      return {
        code: 'en',
        name: 'English',
        confidence: 1.0,
        script: 'Latin',
        isIndic: false,
        isCodeSwitched: false,
        primaryProportion: 1.0,
        detectedCommand: 'SPEAK_SLOWER',
      };
    }

    if (lower === 'speak faster' || lower === 'faster' || lower === 'तेज़ बोलो' || lower === 'जलद बोला') {
      return {
        code: 'en',
        name: 'English',
        confidence: 1.0,
        script: 'Latin',
        isIndic: false,
        isCodeSwitched: false,
        primaryProportion: 1.0,
        detectedCommand: 'SPEAK_FASTER',
      };
    }

    // Stop / Barge-in command
    if (lower === 'stop' || lower === 'थांब' || lower === 'रुको' || lower === 'शांत') {
      return {
        code: 'en',
        name: 'English',
        confidence: 1.0,
        script: 'Latin',
        isIndic: false,
        isCodeSwitched: false,
        primaryProportion: 1.0,
        detectedCommand: 'STOP',
      };
    }

    return null;
  }

  public parseVoiceCommand(text: string): { type: string; targetLanguage?: SupportedLanguageCode } | null {
    const res = this.detectSpokenCommand(text);
    if (res?.detectedCommand) {
      return {
        type: res.detectedCommand,
        targetLanguage: res.targetLanguageOverride,
      };
    }
    return null;
  }
}
