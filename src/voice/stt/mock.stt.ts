/**
 * HṚṢĪKEŚA (हृषीकेश) — Mock Speech-to-Text Provider
 */

import { ISpeechToTextProvider, SpeechTranscriptionResult } from '../interfaces/voice.types.js';

export class MockSpeechToTextProvider implements ISpeechToTextProvider {
  public readonly id = 'mock';
  public readonly name = 'Mock STT Provider';
  public initialized = false;
  public transcribeCallCount = 0;
  public mockTextToReturn = 'Hello HṚṢĪKEŚA';
  public mockLanguage = 'en';
  public mockConfidence = 0.98;

  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async transcribe(_audioFilePath: string): Promise<SpeechTranscriptionResult> {
    this.transcribeCallCount++;
    return {
      text: this.mockTextToReturn,
      language: this.mockLanguage,
      confidence: this.mockConfidence,
      durationMs: 120
    };
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
  }
}
