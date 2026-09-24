/**
 * HṚṢĪKEŚA (हृषीकेश) — Natural Speech Text Segmenter
 *
 * Segments streaming token sequences into natural, speech-sized chunks
 * (sentence -> clause -> phrase) without cutting words in half or
 * triggering premature splits on numbers and abbreviations.
 */

export interface SegmenterOptions {
  /** Maximum character length before seeking a clause break */
  readonly maxClauseLength?: number;
  /** Minimum character length to emit a chunk */
  readonly minChunkLength?: number;
}

const COMMON_ABBREVIATIONS = new Set([
  'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'jr.', 'vs.', 'etc.',
  'i.e.', 'e.g.', 'approx.', 'est.', 'no.', 'fig.', 'al.', 'dept.',
  'inc.', 'ltd.', 'co.', 'corp.'
]);

export class NaturalTextSegmenter {
  private buffer = '';
  private readonly maxClauseLength: number;
  private readonly minChunkLength: number;

  constructor(options: SegmenterOptions = {}) {
    this.maxClauseLength = options.maxClauseLength ?? 75;
    this.minChunkLength = options.minChunkLength ?? 15;
  }

  /**
   * Ingests incoming text chunk (or LLM token) and yields ready speech segments.
   */
  public push(token: string): string[] {
    this.buffer += token;
    const readySegments: string[] = [];

    while (this.buffer.length > 0) {
      const boundaryIndex = this.findBoundary(this.buffer);
      if (boundaryIndex === -1) {
        // No safe boundary yet; wait for more tokens unless buffer is extremely large
        if (this.buffer.length > this.maxClauseLength * 2) {
          // Fallback: split at last space to prevent indefinite buffering
          const lastSpace = this.buffer.lastIndexOf(' ');
          if (lastSpace > this.minChunkLength) {
            const segment = this.buffer.slice(0, lastSpace).trim();
            this.buffer = this.buffer.slice(lastSpace).trimStart();
            if (segment) readySegments.push(segment);
            continue;
          }
        }
        break;
      }

      const segment = this.buffer.slice(0, boundaryIndex).trim();
      this.buffer = this.buffer.slice(boundaryIndex).trimStart();

      if (segment.length >= this.minChunkLength || readySegments.length === 0) {
        if (segment) readySegments.push(segment);
      } else {
        // Very short piece, re-attach to buffer if possible
        this.buffer = segment + ' ' + this.buffer;
        break;
      }
    }

    return readySegments;
  }

  /**
   * Flushes any remaining text in the buffer when the stream concludes.
   */
  public flush(): string[] {
    const remaining = this.buffer.trim();
    this.buffer = '';
    return remaining ? [remaining] : [];
  }

  public reset(): void {
    this.buffer = '';
  }

  /**
   * Identifies the earliest safe boundary in the current text buffer.
   */
  private findBoundary(text: string): number {
    // 1. Check for sentence terminators: (. ! ? । ॥ \n)
    for (let i = 0; i < text.length - 1; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      // Devanagari Danda (।) or Double Danda (॥)
      if (char === '।' || char === '॥') {
        return i + 1;
      }

      // Latin punctuation: . ! ? or newline
      if (char === '\n') {
        return i + 1;
      }

      if ((char === '.' || char === '!' || char === '?') && (nextChar === ' ' || nextChar === '\n' || nextChar === '"' || nextChar === "'")) {
        // Validate it's not a common abbreviation or decimal number
        if (char === '.') {
          // Check preceding word
          const preceding = text.slice(Math.max(0, i - 10), i + 1).toLowerCase().trim();
          const lastWord = preceding.split(/\s+/).pop() || '';
          if (COMMON_ABBREVIATIONS.has(lastWord)) {
            continue; // Skip abbreviation
          }

          // Check if it's a version or number e.g. "0.2.0" or "3.14" or "7b"
          const prevChar = i > 0 ? text[i - 1] : '';
          if (/\d/.test(prevChar) && /\d/.test(nextChar)) {
            continue; // Skip decimal
          }
        }

        return i + 1;
      }
    }

    // 2. If buffer exceeds maxClauseLength, seek a natural clause boundary (, ; : - —)
    if (text.length >= this.maxClauseLength) {
      for (let i = this.minChunkLength; i < text.length; i++) {
        const char = text[i];
        if (char === ',' || char === ';' || char === ':' || char === '—' || char === '-') {
          const nextChar = text[i + 1] || ' ';
          if (nextChar === ' ' || nextChar === '\n') {
            return i + 1;
          }
        }
      }
    }

    return -1;
  }
}
