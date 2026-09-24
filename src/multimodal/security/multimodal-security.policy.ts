/**
 * HṚṢĪKEŚA (हृषीकेश) — Multimodal Security & Privacy Policy Engine
 *
 * Phase 24: Enforces visual and auditory privacy classifications, prompt injection defenses,
 * secret redaction in OCR and transcripts, and sovereign approval pause for security challenges.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  PrivacyTier,
  ChallengeType,
  MultimodalTaskBudget,
  DEFAULT_MULTIMODAL_BUDGET,
} from '../interfaces/multimodal.types.js';

export interface PromptInjectionDefenseResult {
  readonly isSafe: boolean;
  readonly injectionDetected: boolean;
  readonly sanitizedText: string;
  readonly matchedPatterns: string[];
}

export interface SecretRedactionResult {
  readonly redactedText: string;
  readonly secretsFoundCount: number;
  readonly secretTypes: string[];
}

export class MultimodalSecurityPolicy {
  private readonly logger?: ILogger;

  // Patterns for secret detection
  private static readonly SECRET_PATTERNS: Array<{ type: string; regex: RegExp }> = [
    { type: 'API_KEY_GENERIC', regex: /(?:api[_-]?key|apikey|secret|token)[\s:=]+(['"])?([a-zA-Z0-9_\-]{16,64})\1?/gi },
    { type: 'BEARER_TOKEN', regex: /bearer\s+([a-zA-Z0-9_\-\.]{20,})/gi },
    { type: 'GITHUB_TOKEN', regex: /(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}/g },
    { type: 'OPENAI_KEY', regex: /sk-[a-zA-Z0-9]{20,48}/g },
    { type: 'AWS_ACCESS_KEY', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
    { type: 'PASSWORD_FIELD', regex: /(?:password|passwd|pwd)[\s:=]+(['"])?([^\s'"]{6,32})\1?/gi },
    { type: 'PRIVATE_KEY_HEADER', regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g },
  ];

  // Patterns for prompt injection defense on observed text
  private static readonly INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
    /system\s+prompt\s+override/i,
    /you\s+are\s+now\s+(in\s+developer\s+mode|dan|jailbreak)/i,
    /reveal\s+(the\s+)?(system\s+prompt|master\s+password|api\s+key)/i,
    /bypass\s+(all\s+)?(security|permission|policy)\s+checks/i,
    /send\s+(credentials|tokens|passwords)\s+to/i,
  ];

  constructor(logger?: ILogger) {
    this.logger = logger?.child('MultimodalSecurityPolicy');
  }

  /**
   * Evaluates text extracted from screenshots, OCR, or transcripts for prompt injection attacks.
   * Observed content is strictly DATA and must never be treated as system instructions.
   */
  public evaluatePromptInjection(observedText: string): PromptInjectionDefenseResult {
    if (!observedText || typeof observedText !== 'string') {
      return { isSafe: true, injectionDetected: false, sanitizedText: '', matchedPatterns: [] };
    }

    const matchedPatterns: string[] = [];
    for (const pattern of MultimodalSecurityPolicy.INJECTION_PATTERNS) {
      if (pattern.test(observedText)) {
        matchedPatterns.push(pattern.source);
      }
    }

    if (matchedPatterns.length > 0) {
      this.logger?.warn(`[PromptInjectionDefense] Intercepted suspicious prompt injection pattern in observed content`, {
        matchedCount: matchedPatterns.length,
      });
      return {
        isSafe: false,
        injectionDetected: true,
        sanitizedText: `[OBSERVED_DATA_SANITIZED: Suspicious prompt injection pattern neutralized]`,
        matchedPatterns,
      };
    }

    return {
      isSafe: true,
      injectionDetected: false,
      sanitizedText: observedText,
      matchedPatterns: [],
    };
  }

  /**
   * Redacts sensitive keys, tokens, and passwords from logs, transcripts, or OCR summaries.
   */
  public redactSecrets(text: string): SecretRedactionResult {
    if (!text || typeof text !== 'string') {
      return { redactedText: '', secretsFoundCount: 0, secretTypes: [] };
    }

    let redacted = text;
    let foundCount = 0;
    const foundTypes: Set<string> = new Set();

    for (const { type, regex } of MultimodalSecurityPolicy.SECRET_PATTERNS) {
      if (regex.test(redacted)) {
        foundTypes.add(type);
        foundCount++;
        redacted = redacted.replace(regex, (match) => {
          if (type === 'PASSWORD_FIELD' || type === 'API_KEY_GENERIC') {
            return match.replace(/([^\s:=]+[\s:=]+)(.+)/, '$1[REDACTED_SECRET]');
          }
          return '[REDACTED_SECRET]';
        });
      }
    }

    return {
      redactedText: redacted,
      secretsFoundCount: foundCount,
      secretTypes: Array.from(foundTypes),
    };
  }

  /**
   * Classifies security challenges present in UI tree or OCR text (CAPTCHA, MFA, Login).
   */
  public detectChallenges(textOrSummary: string): ChallengeType[] {
    if (!textOrSummary) return ['NONE'];

    const lower = textOrSummary.toLowerCase();
    const challenges: Set<ChallengeType> = new Set();

    if (lower.includes('captcha') || lower.includes('recaptcha') || lower.includes('hcaptcha') || lower.includes('cloudflare verification')) {
      challenges.add('CAPTCHA');
    }
    if (lower.includes('mfa') || lower.includes('2fa') || lower.includes('two-factor') || lower.includes('authenticator code') || lower.includes('security key')) {
      challenges.add('MFA');
    }
    if (lower.includes('sign in') || lower.includes('log in') || lower.includes('enter password') || lower.includes('enter your credentials')) {
      challenges.add('LOGIN_PROMPT');
    }
    if (lower.includes('security warning') || lower.includes('threat detected') || lower.includes('untrusted certificate')) {
      challenges.add('SECURITY_WARNING');
    }
    if (lower.includes('not responding') || lower.includes('application error') || lower.includes('crashed unexpectedly') || lower.includes('fatal error') || lower.includes('crash')) {
      challenges.add('CRASH');
    }

    return challenges.size > 0 ? Array.from(challenges) : ['NONE'];
  }

  /**
   * Enforces privacy tier rules: HIGHLY_PRIVATE and RESTRICTED data must remain local.
   */
  public isCloudProcessingAllowed(tier: PrivacyTier, userAuthorizedCloud = false): boolean {
    if (tier === 'RESTRICTED' || tier === 'HIGHLY_PRIVATE') {
      return false;
    }
    if (tier === 'PRIVATE') {
      return userAuthorizedCloud;
    }
    return true;
  }

  public isCloudAllowed(tier: PrivacyTier, userAuthorizedCloud = false): boolean {
    return this.isCloudProcessingAllowed(tier, userAuthorizedCloud);
  }

  /**
   * Enforces privacy tier rules: HIGHLY_PRIVATE and RESTRICTED data must remain local.
   */
  public assertCloudPrivacyAllowance(tier: PrivacyTier, providerType: string): void {
    if ((tier === 'HIGHLY_PRIVATE' || tier === 'RESTRICTED') && providerType !== 'local' && providerType !== 'ollama') {
      throw new Error(`[PrivacyPolicy] Cannot route ${tier} multimodal data to external cloud provider '${providerType}'. Local processing required.`);
    }
  }

  /**
   * Validates image dimensions and payload byte limits.
   */
  public validateImageBounds(
    byteLengthOrObj: number | { bytes: number; width?: number; height?: number },
    width?: number,
    height?: number,
    budget: MultimodalTaskBudget = DEFAULT_MULTIMODAL_BUDGET
  ): { valid: boolean; reason?: string } {
    let bytes = typeof byteLengthOrObj === 'number' ? byteLengthOrObj : byteLengthOrObj.bytes;
    let w = typeof byteLengthOrObj === 'object' ? byteLengthOrObj.width : width;
    let h = typeof byteLengthOrObj === 'object' ? byteLengthOrObj.height : height;

    if (bytes > budget.maxImageBytes) {
      return { valid: false, reason: 'IMAGE_EXCEEDS_MAX_BYTES' };
    }
    if (w && w > 4096) {
      return { valid: false, reason: 'IMAGE_WIDTH_EXCEEDS_LIMIT' };
    }
    if (h && h > 4096) {
      return { valid: false, reason: 'IMAGE_HEIGHT_EXCEEDS_LIMIT' };
    }
    return { valid: true };
  }

  public validateImagePayload(byteLength: number, budget: MultimodalTaskBudget = DEFAULT_MULTIMODAL_BUDGET): void {
    const res = this.validateImageBounds(byteLength, undefined, undefined, budget);
    if (!res.valid) {
      throw new Error(`[MultimodalSecurityPolicy] Image payload size (${byteLength} bytes) exceeds budget limit (${budget.maxImageBytes} bytes).`);
    }
  }
}

