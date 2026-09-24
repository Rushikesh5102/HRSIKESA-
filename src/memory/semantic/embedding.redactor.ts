/**
 * HṚṢĪKEŚA (हृषीकेश) — Embedding Redactor
 *
 * SECURITY: Ensures secrets, credentials, and sensitive material
 * are never sent to the embedding model.
 *
 * Rules:
 * 1. Tiers excluded entirely: audit_history (14), tool_state (11)
 * 2. Content containing secret patterns → excluded
 * 3. Returns null if content should NOT be embedded
 * 4. Returns sanitized text safe for embedding otherwise
 */

import { MemoryTier } from '../../memory/memory.types.js';

/** Tiers that must NEVER be embedded — security-sensitive or implementation noise */
const EXCLUDED_TIERS = new Set<MemoryTier>(['audit_history', 'tool_state']);

/** Patterns that indicate secret content — matched against content */
const SECRET_PATTERNS: RegExp[] = [
  /api[_\-\s]?key\s*[:=]\s*\S+/i,
  /password\s*[:=]\s*\S+/i,
  /secret\s*[:=]\s*\S+/i,
  /token\s*[:=]\s*\S+/i,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/i,
  /private[_\-\s]?key/i,
  /Authorization:\s*\S+/i,
  /sk-[a-zA-Z0-9]{32,}/,              // OpenAI-style API keys
  /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/, // JWT format
];

/** Maximum content length to embed. Long content is truncated for efficiency. */
const MAX_EMBED_CHARS = 2000;

export interface RedactionResult {
  readonly text: string | null;  // null = do not embed this item
  readonly wasRedacted: boolean;
  readonly reason?: string;
}

export class EmbeddingRedactor {
  /**
   * Determines whether a memory item's content is safe to embed,
   * and returns the sanitized text to embed (or null to skip).
   */
  public prepare(tier: MemoryTier, content: string): RedactionResult {
    // Rule 1: Excluded tiers
    if (EXCLUDED_TIERS.has(tier)) {
      return { text: null, wasRedacted: true, reason: `Tier '${tier}' is excluded from semantic indexing` };
    }

    if (!content || content.trim().length === 0) {
      return { text: null, wasRedacted: false, reason: 'Empty content' };
    }

    // Rule 2: Secret pattern detection
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        return {
          text: null,
          wasRedacted: true,
          reason: `Content matches secret pattern (${pattern.source.slice(0, 40)}…)`
        };
      }
    }

    // Safe: truncate if needed
    const text = content.length > MAX_EMBED_CHARS
      ? content.slice(0, MAX_EMBED_CHARS)
      : content;

    return { text: text.trim(), wasRedacted: false };
  }
}
