/**
 * HṚṢĪKEŚA (हृषीकेश) — Configuration Types
 */

export type EnvironmentMode = 'development' | 'production' | 'test';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly env: EnvironmentMode;
  readonly logLevel: LogLevel;
}

export interface OllamaConfig {
  readonly host: string;
  readonly defaultModel: string;
  readonly timeoutMs: number;
}

export interface CloudCredentialsConfig {
  readonly openaiApiKey?: string;
  readonly anthropicApiKey?: string;
  readonly geminiApiKey?: string;
}

export interface HardwareLimitsConfig {
  readonly maxConcurrentLocalInference: number;
  readonly maxBackgroundTasks: number;
  readonly localModelLockEnabled: boolean;
}

export interface VoiceConfig {
  readonly sttProvider: 'whisper' | 'windows' | 'mock';
  readonly ttsProvider: 'piper' | 'sapi' | 'mock';
  readonly language: string;
  readonly ttsVoice?: string;
  readonly sampleRate: number;
  readonly artifactDir: string;
  readonly pushToTalk: boolean;
}

export interface AppConfig {
  readonly server: ServerConfig;
  readonly ollama: OllamaConfig;
  readonly cloud: CloudCredentialsConfig;
  readonly hardwareLimits: HardwareLimitsConfig;
  readonly voice: VoiceConfig;
}

export interface SanitizedAppConfig {
  readonly server: ServerConfig;
  readonly ollama: OllamaConfig;
  readonly cloud: {
    readonly hasOpenAI: boolean;
    readonly hasAnthropic: boolean;
    readonly hasGemini: boolean;
  };
  readonly hardwareLimits: HardwareLimitsConfig;
  readonly voice: VoiceConfig;
}
