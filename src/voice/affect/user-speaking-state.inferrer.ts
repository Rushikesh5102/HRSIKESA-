/**
 * HṚṢĪKEŚA (हृषीकेश) — User Speaking-State & Conversational Context Inferrer
 *
 * Infers probable conversational affect and interaction mode from transcript,
 * prosody/audio features, and context without claiming psychiatric diagnosis.
 */

import { UserAffect, InteractionMode, UserSpeakingState } from './affect.types.js';
import { SpeechTranscriptionResult } from '../interfaces/voice.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface AudioProsodyFeatures {
  readonly durationMs?: number;
  readonly wordsPerMinute?: number;
  readonly pauseCount?: number;
  readonly highEnergyRMS?: boolean;
}

export interface ConversationHistoryContext {
  readonly lastTurnAffect?: UserAffect;
  readonly recentFailure?: boolean;
  readonly recentSuccess?: boolean;
  readonly currentTaskType?: string;
}

export class UserSpeakingStateInferrer {
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('UserSpeakingStateInferrer');
  }

  public infer(
    transcript: string | SpeechTranscriptionResult,
    prosody?: AudioProsodyFeatures,
    context?: ConversationHistoryContext
  ): UserSpeakingState {
    const text = typeof transcript === 'string' ? transcript : transcript.text;
    const cleanText = (text || '').trim();
    const lower = cleanText.toLowerCase();
    const evidence: string[] = [];

    let arousal = 0.4;
    let urgency = 0.2;
    let affect: UserAffect = 'neutral';
    let interactionMode: InteractionMode = 'casual';
    let confidence = 0.75;

    // 1. Analyze Prosodic Clues (if available)
    if (prosody) {
      if (prosody.wordsPerMinute && prosody.wordsPerMinute > 175) {
        arousal += 0.2;
        urgency += 0.2;
        evidence.push(`Rapid speaking rate (${prosody.wordsPerMinute.toFixed(0)} wpm)`);
      } else if (prosody.wordsPerMinute && prosody.wordsPerMinute < 95) {
        arousal -= 0.15;
        evidence.push('Slow, deliberate speaking pace');
      }

      if (prosody.highEnergyRMS) {
        arousal += 0.25;
        evidence.push('Elevated voice amplitude/energy');
      }
    }

    // 2. Transcript & Keyword Signals
    const frustrationMarkers = [
      'why the hell', 'why did it fail', 'failed again', 'broken', 'dammit',
      'not working', 'error again', 'ugh', 'stupid', 'what is wrong', 'hate this'
    ];
    const excitementMarkers = [
      'great!', 'finally worked', 'awesome', 'amazing', 'brilliant', 'it works',
      'huge success', 'congratulations', 'woohoo', 'fantastic', 'yes!'
    ];
    const urgentCommandMarkers = [
      'stop', 'halt', 'immediately', 'now', 'abort', 'cancel everything', 'emergency',
      'quick', 'urgent', 'shut down', 'freeze'
    ];
    const technicalMarkers = [
      'architecture', 'pipeline', 'deployment', 'latency', 'mutex', 'cpu', 'memory',
      'docker', 'kernel', 'database', 'endpoint', 'benchmark', 'runtime', 'interface'
    ];
    const teachingMarkers = [
      'explain', 'how does', 'teach me', 'what does it mean', 'can you clarify',
      'understand', 'walk me through', 'tell me about'
    ];

    // Check Urgent Command / Emergency Indicators
    for (const marker of urgentCommandMarkers) {
      if (lower.includes(marker)) {
        affect = 'urgent';
        interactionMode = 'command';
        urgency = 0.95;
        arousal = Math.max(arousal, 0.85);
        confidence = 0.92;
        evidence.push(`Urgent marker: "${marker}"`);
        break;
      }
    }

    // Check Frustration
    if (affect === 'neutral') {
      for (const marker of frustrationMarkers) {
        if (lower.includes(marker)) {
          affect = 'frustrated';
          interactionMode = 'troubleshooting';
          arousal = Math.max(arousal, 0.7);
          urgency = Math.max(urgency, 0.6);
          confidence = 0.88;
          evidence.push(`Frustration indicator detected: "${marker}"`);
          break;
        }
      }
    }

    // Check Excitement
    if (affect === 'neutral') {
      for (const marker of excitementMarkers) {
        if (lower.includes(marker)) {
          affect = 'excited';
          interactionMode = 'casual';
          arousal = Math.max(arousal, 0.75);
          confidence = 0.85;
          evidence.push(`Positive/excited marker: "${marker}"`);
          break;
        }
      }
    }

    // Check Teaching / Learning
    if (affect === 'neutral') {
      for (const marker of teachingMarkers) {
        if (lower.includes(marker)) {
          affect = 'calm';
          interactionMode = 'teaching';
          urgency = 0.15;
          confidence = 0.80;
          evidence.push(`Pedagogical request: "${marker}"`);
          break;
        }
      }
    }

    // Check Technical Context
    if (interactionMode === 'casual' || interactionMode === 'teaching') {
      let techCount = 0;
      for (const marker of technicalMarkers) {
        if (lower.includes(marker)) techCount++;
      }
      if (techCount >= 2) {
        interactionMode = 'technical';
        if (affect === 'neutral') affect = 'serious';
        evidence.push(`Multiple technical terms present (${techCount})`);
      }
    }

    // 3. Conversation Context Bias
    if (context) {
      if (context.recentFailure && (affect === 'neutral' || affect === 'frustrated')) {
        affect = 'concerned';
        interactionMode = 'troubleshooting';
        evidence.push('Recent failure reported in previous context');
      } else if (context.recentSuccess && affect === 'neutral') {
        affect = 'happy';
        evidence.push('Recent operation completed successfully');
      }
    }

    // Bound values
    arousal = Math.max(0.0, Math.min(1.0, arousal));
    urgency = Math.max(0.0, Math.min(1.0, urgency));

    const state: UserSpeakingState = {
      affect,
      confidence,
      arousal: +arousal.toFixed(2),
      urgency: +urgency.toFixed(2),
      interactionMode,
      evidence: evidence.length > 0 ? evidence : ['Standard conversational prosody and syntax'],
    };

    this.logger?.debug('User conversational state inferred', state as unknown as Record<string, unknown>);
    return state;
  }
}
