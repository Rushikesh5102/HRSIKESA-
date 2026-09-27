/**
 * HṚṢĪKEŚA (हृषीकेश) — Correction Detector Service
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 *
 * Identifies explicit user corrections ("No, I meant X", "That's wrong",
 * "Use Y instead", "Forget the previous assumption", "Actually, this is for SAHIKARA")
 * and applies immediate high-priority overrides to working context.
 */

export interface CorrectionResult {
  readonly isCorrection: boolean;
  readonly correctedValue?: string;
  readonly previousValue?: string;
  readonly correctionType?: 'PROJECT' | 'COMPANY' | 'TASK' | 'ASSUMPTION' | 'GENERAL';
  readonly explanation?: string;
}

export class CorrectionDetectorService {
  /**
   * Evaluates if the incoming turn is an explicit user correction.
   */
  public detectCorrection(userMessage: string): CorrectionResult {
    const raw = userMessage.trim();
    const lower = raw.toLowerCase();

    // Pattern 1: "Actually, this is for [Project/Company]"
    const actuallyProjectMatch = raw.match(/actually,?\s+(?:this\s+is\s+for|we\s+are\s+working\s+on)\s+([A-Za-z0-9_\-\u0900-\u097F]+)/i);
    if (actuallyProjectMatch) {
      return {
        isCorrection: true,
        correctedValue: actuallyProjectMatch[1].trim(),
        correctionType: 'PROJECT',
        explanation: `Explicit project correction to "${actuallyProjectMatch[1].trim()}"`,
      };
    }

    // Pattern 2: "No, I meant [X]" / "No I meant [X]"
    const meantMatch = raw.match(/^no,?\s+(?:i\s+meant|i\s+mean)\s+(.+)$/i);
    if (meantMatch) {
      const val = meantMatch[1].trim();
      const valLower = val.toLowerCase();
      let cType: 'PROJECT' | 'COMPANY' | 'TASK' | 'ASSUMPTION' | 'GENERAL' = 'GENERAL';
      if (valLower.includes('hrisekesa') || valLower.includes('hṛṣīkeśa') || valLower.includes('sahikara')) {
        cType = 'PROJECT';
      } else if (valLower.includes('aumtrix') || valLower.includes('pragnya') || valLower.includes('svara')) {
        cType = 'COMPANY';
      }
      return {
        isCorrection: true,
        correctedValue: val,
        correctionType: cType,
        explanation: `User clarified intended meaning: "${val}"`,
      };
    }

    // Pattern 3: "Use [X] instead" / "Instead of [Y], use [X]"
    const insteadMatch = raw.match(/(?:instead\s+of\s+([^,]+),?\s+)?use\s+([^,.]+)\s+instead/i);
    if (insteadMatch) {
      const val = insteadMatch[2]?.trim() || '';
      const valLower = val.toLowerCase();
      let cType: 'PROJECT' | 'COMPANY' | 'TASK' | 'ASSUMPTION' | 'GENERAL' = 'GENERAL';
      if (valLower.includes('hrisekesa') || valLower.includes('hṛṣīkeśa') || valLower.includes('sahikara')) {
        cType = 'PROJECT';
      } else if (valLower.includes('aumtrix') || valLower.includes('pragnya') || valLower.includes('svara')) {
        cType = 'COMPANY';
      }
      return {
        isCorrection: true,
        previousValue: insteadMatch[1]?.trim(),
        correctedValue: val,
        correctionType: cType,
        explanation: `User instructed replacement with "${val}"`,
      };
    }

    // Pattern 4: "Forget the previous assumption" / "Drop the assumption"
    if (
      lower.includes('forget the previous assumption') ||
      lower.includes('drop the assumption') ||
      lower.includes('ignore the assumption')
    ) {
      return {
        isCorrection: true,
        correctionType: 'ASSUMPTION',
        explanation: 'User requested invalidation of previous working assumptions.',
      };
    }

    // Pattern 5: "That's wrong" / "That is wrong" / "That is incorrect"
    if (
      lower === "that's wrong" ||
      lower === 'that is wrong' ||
      lower === 'that is incorrect' ||
      lower.startsWith("that's wrong, ") ||
      lower.startsWith('that is wrong, ')
    ) {
      const rest = raw.replace(/^that(?:'s|\s+is)\s+(?:wrong|incorrect)[,.:\s]*/i, '').trim();
      return {
        isCorrection: true,
        correctedValue: rest.length > 0 ? rest : undefined,
        correctionType: 'GENERAL',
        explanation: rest.length > 0 ? `User refuted previous statement and provided: "${rest}"` : 'User refuted previous statement.',
      };
    }

    // Pattern 6: "Not [X], use/do [Y]"
    const notXMatch = raw.match(/^not\s+([^,]+),\s*(?:use|do|it's|it\s+is)\s+(.+)$/i);
    if (notXMatch) {
      return {
        isCorrection: true,
        previousValue: notXMatch[1].trim(),
        correctedValue: notXMatch[2].trim(),
        correctionType: 'GENERAL',
        explanation: `User corrected from "${notXMatch[1].trim()}" to "${notXMatch[2].trim()}"`,
      };
    }

    return { isCorrection: false };
  }
}
