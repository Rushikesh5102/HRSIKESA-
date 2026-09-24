/**
 * HṚṢĪKEŚA (हृषीकेश) — Prompt Injection Defense & Web Security Sanitizer
 *
 * Phase 17: Research Security & Untrusted Web Content Isolation
 *
 * Absolute Rule: WEB CONTENT IS DATA, NOT AUTHORITY.
 *
 * Defends against indirect prompt injection embedded within web pages,
 * PDF documents, forum posts, and external repositories.
 */

export interface PromptInjectionScanResult {
  readonly isSuspicious: boolean;
  readonly riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  readonly detectedPatterns: string[];
  readonly detectedKeywords: string[];
  readonly sanitizedText: string;
  readonly isolatedEnvelope: string;
}

// Patterns commonly used in prompt injection attacks
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /forget\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+are\s+now\s+(in\s+)?(developer|jailbreak|unrestricted|god)\s+mode/i,
  /system\s+prompt\s+override/i,
  /new\s+system\s+instruction/i,
  /system\s+instruction/i,
  /open\s+(powershell|cmd|terminal|bash)/i,
  /run\s+(command|script|shell|powershell)/i,
  /read\s+(credentials|passwords?|tokens?|\.env)/i,
  /upload\s+(credentials|passwords?|tokens?|secrets?)/i,
  /send\s+(credentials|passwords?|tokens?)\s+to/i,
  /curl\s+-X\s+POST/i,
  /fetch\(['"]https?:\/\//i,
  /bypass\s+security\s+controls?/i,
  /grant\s+(all\s+)?(admin\s+)?permissions/i,
];

export class PromptInjectionDefense {
  /**
   * Scan text for indirect prompt injection attempts.
   */
  public static scan(text: string): PromptInjectionScanResult {
    if (!text || typeof text !== 'string') {
      return {
        isSuspicious: false,
        riskLevel: 'NONE',
        detectedPatterns: [],
        detectedKeywords: [],
        sanitizedText: '',
        isolatedEnvelope: '<untrusted_web_content integrity="sanitized">\n\n</untrusted_web_content>',
      };
    }

    const detectedPatterns: string[] = [];

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        detectedPatterns.push(pattern.source);
      }
    }

    let riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' = 'NONE';
    if (detectedPatterns.length >= 3) {
      riskLevel = 'HIGH';
    } else if (detectedPatterns.length >= 1) {
      riskLevel = 'MEDIUM';
    }

    const sanitized = this.encapsulateUntrustedData(text, detectedPatterns);

    return {
      isSuspicious: detectedPatterns.length > 0,
      riskLevel,
      detectedPatterns,
      detectedKeywords: detectedPatterns,
      sanitizedText: sanitized,
      isolatedEnvelope: sanitized,
    };
  }

  /**
   * Alias for encapsulateUntrustedData
   */
  public static encapsulate(rawText: string, sourceUrl?: string): string {
    const attr = sourceUrl ? ` source="${sourceUrl}"` : '';
    let clean = rawText
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/process\.env(\.[A-Z0-9_]+|\[['"][A-Z0-9_]+['"]\])?/gi, '[DEFANGED_ENV_ACCESS]')
      .trim();
    if (clean.startsWith('<untrusted_web_content')) {
      return clean;
    }
    return `<untrusted_web_content integrity="sanitized"${attr}>\n${clean}\n</untrusted_web_content>`;
  }

  /**
   * Strictly encapsulate untrusted web text inside an isolated data envelope.
   */
  public static encapsulateUntrustedData(rawText: string, detectedPatterns: string[] = []): string {
    // 1. Remove dangerous shell escape sequences
    let clean = rawText
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // remove ASCII control codes
      .trim();

    // 2. Defang explicit command injections
    if (detectedPatterns.length > 0) {
      clean = clean
        .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, '[DEFANGED_PROMPT_INJECTION]')
        .replace(/open\s+(powershell|cmd|terminal|bash)/gi, '[DEFANGED_COMMAND_INJECTION]')
        .replace(/read\s+(credentials|passwords?|tokens?|\.env)/gi, '[DEFANGED_CREDENTIAL_ACCESS]')
        .replace(/process\.env(\.[A-Z0-9_]+|\[['"][A-Z0-9_]+['"]\])?/gi, '[DEFANGED_ENV_ACCESS]')
        .replace(/run\s+(command|script|shell|powershell)/gi, '[DEFANGED_COMMAND_EXEC]');
    }

    // 3. Wrap in sovereign data tag so model treats it strictly as passive quote
    return `<untrusted_web_content integrity="sanitized">\n${clean}\n</untrusted_web_content>`;
  }
}
