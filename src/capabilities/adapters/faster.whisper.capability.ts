/**
 * HṚṢĪKEŚA (हृषीकेश) — Faster-Whisper & Piper Voice Capability Adapter
 *
 * Phase 16J: Open-Source Speech Recognition and Synthesis Capability
 */

import { ICapabilityAdapter } from './capability.adapter.js';
import {
  CapabilityMetadata,
  CapabilityHealthCheckResult,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
} from '../interfaces/capability.types.js';
import { ISpeechToTextProvider, ITextToSpeechProvider } from '../../voice/interfaces/voice.types.js';

export class FasterWhisperCapabilityAdapter implements ICapabilityAdapter {
  private readonly stt?: ISpeechToTextProvider;
  private readonly tts?: ITextToSpeechProvider;

  constructor(stt?: ISpeechToTextProvider, tts?: ITextToSpeechProvider) {
    this.stt = stt;
    this.tts = tts;
  }

  public getMetadata(): CapabilityMetadata {
    return {
      id: 'voice.stt_tts',
      name: 'faster-whisper & Piper Voice Engine',
      description: 'Ultra-fast local transformer STT (faster-whisper) and low-latency neural TTS (Piper).',
      category: 'voice',
      provider: 'SYSTRAN faster-whisper / Piper',
      source: 'open_source',
      version: '1.0.3',
      license: 'MIT',
      runtimeType: 'subprocess',
      supportedPlatforms: ['win32', 'linux'],
      requiredPermissions: ['voice:listen', 'voice:synthesize'],
      riskLevel: 'LOW',
      dependencies: ['ctranslate2', 'piper'],
      enabled: true,
      securityStatus: 'COMMUNITY_AUDITED',
    };
  }

  public async checkHealth(): Promise<CapabilityHealthCheckResult> {
    const start = Date.now();
    const sttOk = this.stt !== undefined;
    const ttsOk = this.tts !== undefined;
    const isHealthy = sttOk || ttsOk;

    return {
      status: isHealthy ? 'HEALTHY' : 'DEGRADED',
      message: `STT: ${sttOk ? 'Ready' : 'Fallback/Offline'}, TTS: ${ttsOk ? 'Ready' : 'Fallback/Offline'}`,
      latencyMs: Date.now() - start,
      lastCheckedAt: new Date().toISOString(),
      details: { sttAvailable: sttOk, ttsAvailable: ttsOk },
    };
  }

  public async execute(req: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const start = Date.now();
    try {
      let output: unknown;
      if (req.action === 'synthesize' && this.tts) {
        output = await this.tts.synthesize(String(req.parameters.text));
      } else if (req.action === 'transcribe' && this.stt) {
        output = await this.stt.transcribe(String(req.parameters.audioPath));
      } else {
        throw new Error(`Unsupported voice action: ${req.action}`);
      }

      return {
        success: true,
        output,
        executionTimeMs: Date.now() - start,
        capabilityId: 'voice.stt_tts',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        executionTimeMs: Date.now() - start,
        capabilityId: 'voice.stt_tts',
      };
    }
  }
}
