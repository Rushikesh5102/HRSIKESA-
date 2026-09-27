/**
 * HṚṢĪKEŚA (हृषीकेश) — Chat Input Normalizer
 *
 * Lightweight deterministic input normalization stage for intent classification.
 * Normalizes classification input WITHOUT modifying the user's displayed message
 * or stored session content.
 *
 * Handles:
 * - Whitespace normalization (trimming, collapsing multi-spaces/newlines)
 * - Punctuation stripping for intent matching
 * - Case normalization (lowercase)
 * - Stripping language preference suffixes (e.g., [Language Preference: ...])
 * - Stripping language preference prefixes (e.g., [Language: ...])
 * - Stripping client metadata tags (e.g., [Client: ...], [Mode: ...])
 */

export interface NormalizedChatInput {
  /** The untouched original raw message from the user */
  readonly originalMessage: string;
  /** Cleaned text for deterministic intent classification (lowercase, punctuation-stripped, tags removed) */
  readonly classificationText: string;
  /** Cleaned text with original casing and punctuation preserved, but metadata tags removed */
  readonly cleanedPrompt: string;
  /** Extracted language guidance if present */
  readonly languagePreference?: string;
  /** Extracted client metadata tags if present */
  readonly metadata: Record<string, string>;
}

export class ChatNormalizer {
  private static readonly LANG_TAG_REGEX =
    /\[(?:Language Preference|Language|Lang):\s*([^\]]+)\]/gi;

  private static readonly METADATA_TAG_REGEX =
    /\[([a-zA-Z0-9_\-\s]+):\s*([^\]]+)\]/g;

  // Natural language clauses for language preference:
  // e.g. "please reply in English", "respond in Indian English", "speak in Hindi", "in English please"
  private static readonly NATURAL_LANG_SUFFIX_REGEX =
    /(?:,\s*|\s+)(?:please\s+)?(?:respond|reply|answer|speak|write)\s+in\s+([a-zA-Z\s]+?)(?:\s+please)?\.?$/i;

  private static readonly PAREN_LANG_REGEX =
    /\((?:please\s+)?(?:respond|reply|answer|speak|write)?\s*in\s+([a-zA-Z\s]+?)\)/i;

  private static readonly IN_LANG_PLEASE_REGEX =
    /(?:,\s*|\s+)in\s+([a-zA-Z\s]+?)\s+please\.?$/i;

  /**
   * Normalizes an incoming chat input for deterministic routing and intent detection.
   * Preserves the original message completely.
   */
  public static normalize(rawMessage: string): NormalizedChatInput {
    const originalMessage = rawMessage || '';
    let text = originalMessage.trim();

    const metadata: Record<string, string> = {};
    let languagePreference: string | undefined;

    // 1. Extract and strip language preference tag if present
    text = text.replace(this.LANG_TAG_REGEX, (_fullMatch, langVal) => {
      languagePreference = langVal.trim();
      return '';
    });

    // 2. Extract and strip all remaining metadata tags: [Key: Value]
    text = text.replace(this.METADATA_TAG_REGEX, (_fullMatch, key, value) => {
      const cleanKey = key.trim();
      const lowerKey = cleanKey.toLowerCase();
      if (lowerKey === 'language preference' || lowerKey === 'language' || lowerKey === 'lang') {
        languagePreference = value.trim();
      } else {
        metadata[cleanKey] = value.trim();
      }
      return '';
    });

    // 3. Extract and strip parenthesized language instructions: (reply in English)
    text = text.replace(this.PAREN_LANG_REGEX, (_fullMatch, langVal) => {
      if (!languagePreference) {
        languagePreference = langVal.trim();
      }
      return '';
    });

    // 4. Extract and strip natural language suffix clauses: ", please reply in English"
    text = text.replace(this.NATURAL_LANG_SUFFIX_REGEX, (_fullMatch, langVal) => {
      if (!languagePreference) {
        languagePreference = langVal.trim();
      }
      return '';
    });

    // 5. Extract and strip "in English please"
    text = text.replace(this.IN_LANG_PLEASE_REGEX, (_fullMatch, langVal) => {
      if (!languagePreference) {
        languagePreference = langVal.trim();
      }
      return '';
    });

    // 6. Clean prompt: whitespace normalized, tags removed, but casing and punctuation preserved
    const cleanedPrompt = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 7. Classification text: lowercase, punctuation removed, multi-whitespace collapsed
    let classificationText = cleanedPrompt
      .toLowerCase()
      .replace(/[,.!?:;'"“”‘’`~@#$%^&*()_+=/\\|<>{}[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Additional safeguard: If classification text ends with "please reply in ..." or similar
    classificationText = classificationText
      .replace(/\s+(?:please\s+)?(?:reply|respond|answer|speak|write)\s+in\s+[a-z\s]+$/i, '')
      .replace(/\s+in\s+[a-z\s]+\s+please$/i, '')
      .trim();

    return {
      originalMessage,
      classificationText,
      cleanedPrompt,
      languagePreference,
      metadata
    };
  }
}
