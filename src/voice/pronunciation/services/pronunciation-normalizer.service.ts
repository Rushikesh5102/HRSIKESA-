/**
 * HṚṢĪKEŚA (हृषीकेश) — Pronunciation Normalizer Service
 *
 * Scans text streams and converts protected tokens into provider-specific
 * phonetic, SSML, or phonemic syntax while ensuring that UI displays
 * retain the canonical representation (HṚṢĪKEŚA).
 */

import {
  IPronunciationProvider,
  PronunciationEntry,
  PronunciationFormatOptions,
  TargetEngineFormat,
} from '../interfaces/pronunciation.types.js';
import { PronunciationRepository } from '../repositories/pronunciation.repository.js';
import { ILogger } from '../../../core/logging/logger.types.js';

export class PronunciationNormalizer implements IPronunciationProvider {
  private readonly repo: PronunciationRepository;
  private readonly logger?: ILogger;

  constructor(repo?: PronunciationRepository, logger?: ILogger) {
    this.repo = repo || new PronunciationRepository();
    this.logger = logger?.child('PronunciationNormalizer');
  }

  public getEntry(tokenOrAlias: string): PronunciationEntry | undefined {
    return this.repo.get(tokenOrAlias);
  }

  public listEntries(): readonly PronunciationEntry[] {
    return this.repo.getAll();
  }

  public registerEntry(entry: PronunciationEntry): void {
    this.repo.set(entry);
    this.logger?.info(`Registered pronunciation entry: ${entry.canonical}`);
  }

  public async teach(
    canonical: string,
    phoneticRespelling: string,
    language = 'en'
  ): Promise<PronunciationEntry> {
    const existing = this.repo.get(canonical);
    const entry: PronunciationEntry = {
      canonical: existing ? existing.canonical : canonical.trim(),
      aliases: existing ? existing.aliases : [canonical.trim().toLowerCase()],
      language: language || existing?.language || 'en',
      priority: existing?.priority === 'PROTECTED' ? 'PROTECTED' : 'USER_OVERRIDE',
      category: 'USER_DEFINED',
      phoneticVariants: {
        ...(existing?.phoneticVariants || {}),
        plainPhonetic: phoneticRespelling,
        piperPhonetic: phoneticRespelling,
        english: phoneticRespelling,
      },
      updatedAt: new Date().toISOString(),
    };

    this.repo.set(entry);
    this.logger?.info(`Learned pronunciation for "${canonical}" -> "${phoneticRespelling}"`);
    return entry;
  }

  public removeEntry(canonical: string): boolean {
    return this.repo.remove(canonical);
  }

  /**
   * Normalizes incoming text into the format required by the target speech engine.
   * NEVER alters the text presented to the user on screen.
   */
  public normalize(text: string, options: TargetEngineFormat | PronunciationFormatOptions): string {
    if (!text || typeof text !== 'string') return '';

    const opts: PronunciationFormatOptions = typeof options === 'string'
      ? { targetFormat: options }
      : options;

    const entries = this.repo.getAll();
    let normalized = text;

    for (const entry of entries) {
      // Collect all search forms: canonical + aliases
      const searchTerms = [entry.canonical, ...entry.aliases];

      for (const term of searchTerms) {
        if (!term) continue;

        // Escape regex special characters while preserving diacritics
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Unicode-aware word boundary pattern
        // Matches the term preceded and followed by non-word boundary or punctuation/whitespace
        const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escaped})([^\\p{L}\\p{N}_]|$)`, 'gu');

        normalized = normalized.replace(pattern, (_match, before, matchedToken, after) => {
          const replacement = this.formatReplacement(entry, matchedToken, opts);
          return `${before}${replacement}${after}`;
        });
      }
    }

    return normalized;
  }

  /**
   * Selects and formats the appropriate phonetic syntax for the target engine.
   */
  private formatReplacement(
    entry: PronunciationEntry,
    originalToken: string,
    options: PronunciationFormatOptions
  ): string {
    const format = options.targetFormat;
    const variants = entry.phoneticVariants;

    switch (format) {
      case 'sapi-ssml': {
        // Windows SAPI SSML substitution tag
        // If an alias or phonetic is available, wrap in <sub alias="...">token</sub>
        const subAlias = variants.sapiPhoneme || variants.piperPhonetic || variants.english || variants.plainPhonetic;
        if (subAlias && subAlias !== originalToken) {
          return `<sub alias="${subAlias}">${originalToken}</sub>`;
        }
        return originalToken;
      }

      case 'piper-phonetic': {
        // Piper uses espeak-ng / phonemizer.
        // Direct ASCII phonetic respellings flow naturally through espeak.
        return variants.piperPhonetic || variants.english || variants.plainPhonetic || originalToken;
      }

      case 'sanskrit-phonetic': {
        return variants.sanskrit || variants.plainPhonetic || originalToken;
      }

      case 'plain-phonetic': {
        return variants.plainPhonetic || variants.english || originalToken;
      }

      case 'ipa': {
        return variants.ipa || variants.plainPhonetic || originalToken;
      }

      default:
        return variants.plainPhonetic || originalToken;
    }
  }
}
