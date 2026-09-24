/**
 * HṚṢĪKEŚA (हृषीकेश) — Configuration Manager
 */

import {
  AppConfig,
  SanitizedAppConfig,
  EnvironmentMode,
  LogLevel
} from './config.types.js';

export class ConfigManager {
  private readonly config: AppConfig;

  constructor(overrides: Partial<Record<string, string>> = {}) {
    const env = { ...process.env, ...overrides };

    const parsedPort = parseInt(env.HRISEKESA_PORT || env.PORT || env.SERVER_PORT || '4200', 10);
    const port = isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535 ? 4200 : parsedPort;

    const rawEnv = (env.HRISEKESA_ENV || 'development').toLowerCase();
    const environmentMode: EnvironmentMode =
      rawEnv === 'production' || rawEnv === 'test' ? rawEnv : 'development';

    const rawLogLevel = (env.HRISEKESA_LOG_LEVEL || 'info').toLowerCase();
    const logLevel: LogLevel =
      rawLogLevel === 'debug' || rawLogLevel === 'warn' || rawLogLevel === 'error'
        ? rawLogLevel
        : 'info';

    this.config = Object.freeze({
      server: Object.freeze({
        port,
        host: env.HRISEKESA_HOST || '127.0.0.1',
        env: environmentMode,
        logLevel
      }),
      ollama: Object.freeze({
        host: env.OLLAMA_HOST || 'http://127.0.0.1:11434',
        defaultModel: env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:7b',
        timeoutMs: parseInt(env.OLLAMA_TIMEOUT_MS || '120000', 10)
      }),
      cloud: Object.freeze({
        openaiApiKey: env.OPENAI_API_KEY?.trim() || undefined,
        anthropicApiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
        geminiApiKey: env.GEMINI_API_KEY?.trim() || undefined
      }),
      hardwareLimits: Object.freeze({
        maxConcurrentLocalInference: 1, // Strict ADR-006 budget
        maxBackgroundTasks: 4,
        localModelLockEnabled: true
      }),
      voice: Object.freeze({
        sttProvider: (env.HRISEKESA_STT_PROVIDER === 'windows' || env.HRISEKESA_STT_PROVIDER === 'mock')
          ? env.HRISEKESA_STT_PROVIDER
          : 'whisper',
        ttsProvider: (env.HRISEKESA_TTS_PROVIDER === 'sapi' || env.HRISEKESA_TTS_PROVIDER === 'mock')
          ? env.HRISEKESA_TTS_PROVIDER
          : 'piper',
        language: env.HRISEKESA_VOICE_LANGUAGE || 'en',
        ttsVoice: env.HRISEKESA_TTS_VOICE?.trim() || undefined,
        sampleRate: parseInt(env.HRISEKESA_AUDIO_SAMPLE_RATE || '16000', 10),
        artifactDir: env.HRISEKESA_VOICE_ARTIFACT_DIR || 'data/audio',
        pushToTalk: env.HRISEKESA_PUSH_TO_TALK !== 'false'
      })
    });
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getSanitizedConfig(): SanitizedAppConfig {
    return {
      server: this.config.server,
      ollama: this.config.ollama,
      cloud: {
        hasOpenAI: Boolean(this.config.cloud.openaiApiKey),
        hasAnthropic: Boolean(this.config.cloud.anthropicApiKey),
        hasGemini: Boolean(this.config.cloud.geminiApiKey)
      },
      hardwareLimits: this.config.hardwareLimits,
      voice: this.config.voice
    };
  }
}
