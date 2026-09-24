/**
 * HṚṢĪKEŚA (हृषीकेश) — Mock Text-to-Speech Provider
 */

import path from 'node:path';
import fs from 'node:fs';
import { ITextToSpeechProvider, SpeechSynthesisResult } from '../interfaces/voice.types.js';

export class MockTextToSpeechProvider implements ITextToSpeechProvider {
  public readonly id = 'mock';
  public readonly name = 'Mock TTS Provider';
  public initialized = false;
  public speakCallCount = 0;
  public synthesizeCallCount = 0;
  public lastSpokenText = '';
  private readonly artifactDir: string;

  constructor(artifactDir = 'data/audio') {
    this.artifactDir = artifactDir;
  }

  public async initialize(): Promise<void> {
    this.initialized = true;
    if (!fs.existsSync(this.artifactDir)) {
      fs.mkdirSync(this.artifactDir, { recursive: true });
    }
  }

  public async synthesize(text: string, outputPath?: string): Promise<SpeechSynthesisResult> {
    this.synthesizeCallCount++;
    this.lastSpokenText = text;

    const targetPath = outputPath || path.join(
      this.artifactDir,
      `mock_tts_${Date.now()}.wav`
    );

    // Create a dummy mock wav buffer if needed
    if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, Buffer.from('RIFF_DUMMY_MOCK_WAV'));
    }

    return {
      audioFilePath: path.resolve(targetPath),
      durationMs: 250,
      characterCount: text.length
    };
  }

  public async speak(text: string): Promise<void> {
    this.speakCallCount++;
    this.lastSpokenText = text;
  }

  public async stop(): Promise<void> {
    // No-op
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
  }
}
