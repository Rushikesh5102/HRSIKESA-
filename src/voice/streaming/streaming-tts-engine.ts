/**
 * HṚṢĪKEŚA (हृषीकेश) — Streaming TTS Engine & Queue Coordinator
 *
 * Streams LLM token generation directly through sentence segmentation,
 * protected pronunciation normalization, and pipelined audio playback.
 * Minimizes voice response latency to the first synthesized clause.
 */

import { EventEmitter } from 'node:events';
import { ITextToSpeechProvider, IAudioPlayer, SpeechSynthesisResult } from '../interfaces/voice.types.js';
import { IPronunciationProvider, TargetEngineFormat } from '../pronunciation/interfaces/pronunciation.types.js';
import { NaturalTextSegmenter } from './text-segmenter.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface StreamingTtsMetrics {
  readonly firstTokenLatencyMs: number;
  readonly firstSegmentLatencyMs: number;
  readonly firstAudioLatencyMs: number;
  readonly totalSynthesisTimeMs: number;
  readonly totalAudioDurationMs: number;
  readonly totalSegments: number;
  readonly totalCharacters: number;
}

export interface StreamingTtsOptions {
  readonly targetFormat?: TargetEngineFormat;
  readonly language?: string;
  readonly speakingRate?: number;
  readonly onFirstAudio?: () => void;
  readonly onSegmentSpoken?: (segment: string) => void;
}

export class StreamingTtsEngine extends EventEmitter {
  private readonly tts: ITextToSpeechProvider;
  private readonly player: IAudioPlayer;
  private readonly normalizer: IPronunciationProvider;
  private readonly logger?: ILogger;

  private isAborted = false;
  private isSpeaking = false;

  constructor(
    tts: ITextToSpeechProvider,
    player: IAudioPlayer,
    normalizer: IPronunciationProvider,
    logger?: ILogger
  ) {
    super();
    this.tts = tts;
    this.player = player;
    this.normalizer = normalizer;
    this.logger = logger?.child('StreamingTtsEngine');
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Immediately aborts any ongoing synthesis and terminates active audio playback.
   */
  public async abort(reason = 'Interrupted'): Promise<void> {
    this.isAborted = true;
    this.isSpeaking = false;

    try {
      await this.player.stop();
      await this.tts.stop();
    } catch (err) {
      this.logger?.debug(`Error while aborting TTS player/provider`, { err });
    }

    this.emit('aborted', reason);
    this.logger?.info(`Streaming TTS aborted: ${reason}`);
  }

  /**
   * Consumes an async stream of tokens and speaks them clause by clause.
   */
  public async speakTokenStream(
    tokenStream: AsyncIterable<string>,
    options: StreamingTtsOptions = {}
  ): Promise<StreamingTtsMetrics> {
    this.isAborted = false;
    this.isSpeaking = true;
    const startTime = Date.now();

    const segmenter = new NaturalTextSegmenter();
    const targetFormat = options.targetFormat || (this.tts.id === 'sapi' ? 'sapi-ssml' : 'piper-phonetic');
    const language = options.language || 'en';

    let firstTokenAt: number | null = null;
    let firstSegmentAt: number | null = null;
    let firstAudioReadyAt: number | null = null;
    let totalSegments = 0;
    let totalCharacters = 0;
    let totalAudioDurationMs = 0;

    const playQueue: Promise<void>[] = [];
    let queueTail = Promise.resolve();

    const enqueueSegment = (rawSegment: string) => {
      if (this.isAborted) return;

      if (!firstSegmentAt) {
        firstSegmentAt = Date.now();
      }

      totalSegments++;
      totalCharacters += rawSegment.length;

      // 1. Normalize pronunciation without altering displayed UI text
      const normalizedSpeechText = this.normalizer.normalize(rawSegment, {
        targetFormat,
        language,
        useSsml: targetFormat === 'sapi-ssml',
      });

      // Chain sequential synthesis and playback
      queueTail = queueTail.then(async () => {
        if (this.isAborted) return;

        try {
          const synthResult: SpeechSynthesisResult = await this.tts.synthesize(normalizedSpeechText);

          if (this.isAborted) return;

          if (!firstAudioReadyAt) {
            firstAudioReadyAt = Date.now();
            options.onFirstAudio?.();
            this.emit('firstAudio', {
              latencyMs: firstAudioReadyAt - startTime,
              segment: rawSegment,
            });
          }

          totalAudioDurationMs += synthResult.durationMs;
          options.onSegmentSpoken?.(rawSegment);
          this.emit('segmentSpoken', rawSegment);

          // Play the synthesized audio
          await this.player.play(synthResult.audioFilePath);
        } catch (err: any) {
          if (!this.isAborted) {
            this.logger?.warn(`Error synthesizing or playing segment "${rawSegment}"`, { err: err.message });
          }
        }
      });

      playQueue.push(queueTail);
    };

    try {
      // Ingest tokens from stream
      for await (const token of tokenStream) {
        if (this.isAborted) break;

        if (!firstTokenAt) {
          firstTokenAt = Date.now();
        }

        const segments = segmenter.push(token);
        for (const segment of segments) {
          enqueueSegment(segment);
        }
      }

      // Flush remaining buffer
      if (!this.isAborted) {
        const remainingSegments = segmenter.flush();
        for (const segment of remainingSegments) {
          enqueueSegment(segment);
        }
      }

      // Await all queued segments to complete playback
      await queueTail;
    } finally {
      this.isSpeaking = false;
    }

    const endTime = Date.now();
    const metrics: StreamingTtsMetrics = {
      firstTokenLatencyMs: firstTokenAt ? firstTokenAt - startTime : 0,
      firstSegmentLatencyMs: firstSegmentAt ? firstSegmentAt - startTime : 0,
      firstAudioLatencyMs: firstAudioReadyAt ? firstAudioReadyAt - startTime : 0,
      totalSynthesisTimeMs: endTime - startTime,
      totalAudioDurationMs,
      totalSegments,
      totalCharacters,
    };

    this.emit('completed', metrics);
    return metrics;
  }
}
