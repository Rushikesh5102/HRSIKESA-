/**
 * HṚṢĪKEŚA (हृषीकेश) — Indic Parler-TTS Acoustic Caption Builder
 *
 * Dynamically synthesizes natural language acoustic descriptions from
 * structured delivery states, speaker identities, and target languages.
 */

import { TTSDeliveryEmotion, PitchLevel, ExpressivenessLevel, ReverbLevel, VoiceQualityLevel } from './affect.types.js';
import { SupportedLanguageCode } from '../multilingual/interfaces/multilingual.types.js';

export interface CaptionBuilderParams {
  speakerName: string;
  language: SupportedLanguageCode;
  emotion: TTSDeliveryEmotion;
  intensity: number; // 0.0 - 1.0
  rate: number;      // 0.8 - 1.3
  pitch: PitchLevel;
  expressiveness: ExpressivenessLevel;
  reverberation: ReverbLevel;
  quality: VoiceQualityLevel;
}

export class TtsCaptionBuilder {
  /**
   * Generates a descriptive prompt for Indic Parler-TTS conditional generation.
   */
  public static build(params: CaptionBuilderParams): string {
    const { speakerName, language, emotion, intensity, rate, pitch, expressiveness, reverberation, quality } = params;

    // 1. Base Speaker Introduction
    let speakerDesc = `An Indian speaker named ${speakerName}`;
    if (language === 'en') {
      speakerDesc = `A fluent Indian English speaker named ${speakerName}`;
    } else if (language === 'hi') {
      speakerDesc = `A native Hindi speaker named ${speakerName}`;
    } else if (language === 'mr') {
      speakerDesc = `A native Marathi speaker named ${speakerName}`;
    } else if (language === 'sa') {
      speakerDesc = `A classical Sanskrit speaker named ${speakerName}`;
    }

    // 2. Emotion & Delivery Style
    let emotionStyle = 'delivers the speech in a calm, balanced, and conversational tone';
    switch (emotion) {
      case 'reassuring':
        emotionStyle = intensity > 0.4
          ? 'speaks in a very calm, supportive, and reassuring tone with gentle emphasis'
          : 'speaks in a calm and reassuring conversational tone with subtle warmth';
        break;
      case 'warm':
        emotionStyle = 'speaks in a warm, pleasant, and friendly conversational manner';
        break;
      case 'happy':
        emotionStyle = 'speaks with positive energy and cheerful enthusiasm';
        break;
      case 'serious':
        emotionStyle = 'delivers the response in a serious, controlled, and deeply authoritative tone';
        break;
      case 'concerned':
        emotionStyle = 'speaks in a cautious, attentive, and serious tone';
        break;
      case 'excited':
        emotionStyle = intensity > 0.5
          ? 'delivers the speech with bright excitement, high energy, and engagement'
          : 'speaks with genuine positive excitement and engagement';
        break;
      case 'command':
        emotionStyle = 'delivers a concise, firm, and decisive command with resolute authority';
        break;
      case 'neutral':
      default:
        emotionStyle = 'delivers the speech in an intelligent, articulate, and natural conversational style';
        break;
    }

    // 3. Pacing & Articulation
    let pacing = 'at a moderate, natural pace with clear pauses';
    if (rate > 1.15) {
      pacing = 'at a brisk, energetic pace with crisp articulation';
    } else if (rate < 0.9) {
      pacing = 'at a deliberate, measured, and patient pace';
    }

    // 4. Pitch & Voice Color
    let pitchStr = 'medium pitch';
    if (pitch === 'low') pitchStr = 'low, resonant pitch';
    if (pitch === 'medium-low') pitchStr = 'medium-low, warm pitch';
    if (pitch === 'medium-high') pitchStr = 'medium-high, bright pitch';

    // 5. Expressiveness & Quality
    let expressivenessStr = 'natural conversational expressiveness';
    if (expressiveness === 'subtle') expressivenessStr = 'subtle and understated expressiveness';
    if (expressiveness === 'expressive') expressivenessStr = 'rich, expressive prosody';

    let reverbStr = 'minimal room reverberation';
    if (reverberation === 'none') reverbStr = 'completely dry acoustics with no reverberation';
    if (reverberation === 'studio') reverbStr = 'clean acoustic studio environment';

    let qualityStr = 'refined close-microphone voice quality with great clarity';
    if (quality === 'studio') qualityStr = 'pristine studio recording quality and very clear audio';

    return `${speakerDesc} ${emotionStyle} ${pacing}, with a ${pitchStr}, ${expressivenessStr}, ${reverbStr}, and ${qualityStr}.`;
  }
}
