/**
 * HṚṢĪKEŚA (हृषीकेश) — Voice Session Manager
 */

import { VoiceSessionState } from '../interfaces/voice.types.js';

export class VoiceSession {
  public readonly sessionId: string;
  private _interactionCount = 0;
  private _totalAudioDurationMs = 0;
  private _lastTranscription?: string;
  private _lastResponse?: string;
  private _active = true;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  public recordInteraction(
    transcription: string,
    response: string,
    audioDurationMs: number
  ): void {
    this._interactionCount++;
    this._totalAudioDurationMs += audioDurationMs;
    this._lastTranscription = transcription;
    this._lastResponse = response;
  }

  public close(): void {
    this._active = false;
  }

  public getState(): VoiceSessionState {
    return {
      sessionId: this.sessionId,
      active: this._active,
      interactionCount: this._interactionCount,
      totalAudioDurationMs: this._totalAudioDurationMs,
      lastTranscription: this._lastTranscription,
      lastResponse: this._lastResponse
    };
  }
}
