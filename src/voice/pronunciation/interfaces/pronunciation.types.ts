/**
 * HṚṢĪKEŚA (हृषीकेश) — Multilingual Pronunciation Engine Interfaces
 *
 * Provider-independent pronunciation abstraction for sacred Sanskrit,
 * Indian names, brand tokens, and technical terminology.
 */

export type PronunciationPriority = 'PROTECTED' | 'STANDARD' | 'USER_OVERRIDE';
export type PronunciationCategory = 'BRAND' | 'AGENT' | 'SANSKRIT' | 'INDIAN_NAME' | 'TECHNICAL' | 'USER_DEFINED';
export type TargetEngineFormat = 'piper-phonetic' | 'sapi-ssml' | 'plain-phonetic' | 'sanskrit-phonetic' | 'ipa';

export interface PhoneticVariants {
  /** Approximate canonical Sanskrit representation */
  readonly sanskrit?: string;
  /** Hindi pronunciation respelling */
  readonly hindi?: string;
  /** Marathi pronunciation respelling */
  readonly marathi?: string;
  /** English respelling for English voices */
  readonly english?: string;
  /** International Phonetic Alphabet (IPA) representation */
  readonly ipa?: string;
  /** SAPI phoneme string or sub-alias */
  readonly sapiPhoneme?: string;
  /** Piper-optimized phoneme/phonetic string for espeak-ng */
  readonly piperPhonetic?: string;
  /** Plain human-readable phonetic respelling */
  readonly plainPhonetic?: string;
}

export interface PronunciationEntry {
  /** Canonical display token (e.g. "HṚṢĪKEŚA") — VISIBLE SPELLING NEVER ALTERED IN UI */
  readonly canonical: string;
  /** Case-insensitive aliases and variations (e.g. ["Hrisikesa", "Hrishikesha", "हृषीकेश"]) */
  readonly aliases: readonly string[];
  /** Default language tag (e.g. "sa", "hi", "mr", "en") */
  readonly language?: string;
  /** Multi-engine phonetic representations */
  readonly phoneticVariants: PhoneticVariants;
  /** Priority level — PROTECTED entries cannot be overwritten by generic text filters */
  readonly priority: PronunciationPriority;
  /** Classification category */
  readonly category: PronunciationCategory;
  /** Explanatory description of phonetic structure and syllable breakdown */
  readonly syllableBreakdown?: string;
  /** Description or notes */
  readonly description?: string;
  /** Timestamp when added or updated */
  readonly updatedAt?: string;
}

export interface PronunciationFormatOptions {
  /** Target TTS engine format */
  readonly targetFormat: TargetEngineFormat;
  /** Current active language of the utterance */
  readonly language?: string;
  /** Whether to wrap in SSML sub tags if supported */
  readonly useSsml?: boolean;
}

export interface IPronunciationProvider {
  /** Resolves and normalizes text for a given TTS engine */
  normalize(text: string, options: TargetEngineFormat | PronunciationFormatOptions): string;
  /** Retrieves a pronunciation entry by canonical token or alias */
  getEntry(tokenOrAlias: string): PronunciationEntry | undefined;
  /** Lists all registered entries */
  listEntries(): readonly PronunciationEntry[];
  /** Adds or updates an entry */
  registerEntry(entry: PronunciationEntry): void;
  /** Teaches HṚṢĪKEŚA a user-defined custom pronunciation */
  teach(canonical: string, phoneticRespelling: string, language?: string): Promise<PronunciationEntry>;
  /** Removes a user-defined entry */
  removeEntry(canonical: string): boolean;
}
