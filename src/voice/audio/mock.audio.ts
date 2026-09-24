/**
 * HṚṢĪKEŚA (हृषीकेश) — Mock Audio Recorder and Player
 */

import path from 'node:path';
import fs from 'node:fs';
import { IAudioRecorder, IAudioPlayer, AudioRecordingResult } from '../interfaces/voice.types.js';

export class MockAudioRecorder implements IAudioRecorder {
  public recordingCount = 0;
  public mockAudioFileToReturn = '';
  private _isRecording = false;
  private readonly artifactDir: string;

  constructor(artifactDir = 'data/audio') {
    this.artifactDir = artifactDir;
  }

  public get isRecording(): boolean {
    return this._isRecording;
  }

  public async startRecording(outputPath?: string): Promise<void> {
    this._isRecording = true;
    this.recordingCount++;
    if (!fs.existsSync(this.artifactDir)) {
      fs.mkdirSync(this.artifactDir, { recursive: true });
    }
    const target = outputPath || path.join(this.artifactDir, `mock_record_${Date.now()}.wav`);
    this.mockAudioFileToReturn = path.resolve(target);
    fs.writeFileSync(this.mockAudioFileToReturn, Buffer.from('RIFF_MOCK_RECORD_WAV'));
  }

  public async stopRecording(): Promise<AudioRecordingResult> {
    if (!this._isRecording) {
      throw new Error('No audio recording is currently active.');
    }
    this._isRecording = false;
    return {
      audioFilePath: this.mockAudioFileToReturn,
      durationMs: 1500,
      sampleRate: 16000
    };
  }
}

export class MockAudioPlayer implements IAudioPlayer {
  public playCount = 0;
  public lastPlayedFile = '';
  private _isPlaying = false;

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public async play(audioFilePath: string): Promise<void> {
    this._isPlaying = true;
    this.playCount++;
    this.lastPlayedFile = audioFilePath;
    this._isPlaying = false;
  }

  public async stop(): Promise<void> {
    this._isPlaying = false;
  }
}
