/**
 * HṚṢĪKEŚA (हृषीकेश) — Voice Subsystem Interfaces & Types
 */

export interface SpeechTranscriptionResult {
  readonly text: string;
  readonly language?: string;
  readonly durationMs: number;
  readonly confidence?: number;
  readonly segments?: readonly {
    readonly startMs: number;
    readonly endMs: number;
    readonly text: string;
  }[];
}

export interface ISpeechToTextProvider {
  readonly id: string;
  readonly name: string;
  initialize(): Promise<void>;
  transcribe(audioFilePath: string): Promise<SpeechTranscriptionResult>;
  shutdown(): Promise<void>;
}

export interface SpeechSynthesisResult {
  readonly audioFilePath: string;
  readonly durationMs: number;
  readonly characterCount: number;
}

export interface ITextToSpeechProvider {
  readonly id: string;
  readonly name: string;
  initialize(): Promise<void>;
  synthesize(text: string, outputPath?: string): Promise<SpeechSynthesisResult>;
  speak(text: string): Promise<void>;
  stop(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface AudioRecordingResult {
  readonly audioFilePath: string;
  readonly durationMs: number;
  readonly sampleRate: number;
}

export interface IAudioRecorder {
  readonly isRecording: boolean;
  startRecording(outputPath?: string): Promise<void>;
  stopRecording(): Promise<AudioRecordingResult>;
}

export interface IAudioPlayer {
  readonly isPlaying: boolean;
  play(audioFilePath: string): Promise<void>;
  stop(): Promise<void>;
}

export interface VoiceSessionState {
  readonly sessionId: string;
  readonly active: boolean;
  readonly interactionCount: number;
  readonly totalAudioDurationMs: number;
  readonly lastTranscription?: string;
  readonly lastResponse?: string;
}

export interface VoiceInteractionResult {
  readonly success: boolean;
  readonly sessionId: string;
  readonly transcription: SpeechTranscriptionResult;
  readonly responseText: string;
  readonly synthesisResult?: SpeechSynthesisResult;
  readonly totalDurationMs: number;
  readonly latencies: {
    readonly sttMs: number;
    readonly conversationMs: number;
    readonly ttsMs: number;
  };
}
