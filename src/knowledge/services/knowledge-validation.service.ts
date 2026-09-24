/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Validation & Security Service
 *
 * Phase 19: Contradiction Detection, Resolution Strategy, Credential Redaction & Prompt Injection Defense
 */

import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import { KnowledgeContradictionRepository } from '../repositories/knowledge-contradiction.repository.js';
import { KnowledgeEvidenceRepository } from '../repositories/knowledge-evidence.repository.js';
import {
  KnowledgeContradiction,
  SourceCredibility,
  ResolutionStrategy,
} from '../interfaces/knowledge.types.js';

export interface ValidationOutcome {
  valid: boolean;
  sanitizedValue: string;
  contradictionDetected: boolean;
  contradiction?: KnowledgeContradiction;
  supersededFactId?: string;
  reason?: string;
}

export class KnowledgeValidationService {
  private readonly factRepo: KnowledgeFactRepository;
  private readonly contradictionRepo: KnowledgeContradictionRepository;
  private readonly evidenceRepo?: KnowledgeEvidenceRepository;

  // Credential detection patterns
  private static readonly SECRET_PATTERNS = [
    /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
    /AIza[0-9A-Za-z\-_]{35}/g, // Google API keys
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
    /authorization\s*[:=]\s*['"]?[^\s'"]+/gi,
  ];

  // Prompt injection patterns
  private static readonly INJECTION_PATTERNS = [
    /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/gi,
    /you\s+are\s+now\s+in\s+developer\s+mode/gi,
    /system\s*prompt\s*override/gi,
    /jailbreak/gi,
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  ];

  constructor(
    factRepo: KnowledgeFactRepository,
    contradictionRepo: KnowledgeContradictionRepository,
    evidenceRepo?: KnowledgeEvidenceRepository
  ) {
    this.factRepo = factRepo;
    this.contradictionRepo = contradictionRepo;
    this.evidenceRepo = evidenceRepo;
  }

  public getEvidenceRepo(): KnowledgeEvidenceRepository | undefined {
    return this.evidenceRepo;
  }

  /**
   * Redacts credentials, tokens, and passwords from any text.
   */
  public redactSecrets(input: string): string {
    if (!input) return input;
    let sanitized = input;
    sanitized = sanitized.replace(/sk-[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_API_KEY]');
    sanitized = sanitized.replace(/password\s*(?:is|[:=]|\s)\s*['"]?[^\s'"]+/gi, 'password=[REDACTED_SECRET]');
    for (const pattern of KnowledgeValidationService.SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED_CREDENTIAL]');
    }
    return sanitized;
  }

  public redactSensitiveData(input: string): string {
    return this.redactSecrets(input);
  }

  /**
   * Defangs prompt injection payloads from external sources.
   * Ensures external text is treated as inert DATA rather than an executable command.
   */
  public defangPromptInjection(input: string): string & { safeText: string; injectionDetected: boolean; includes(str: string): boolean } {
    if (!input) {
      const emptyStr = Object.assign('', { safeText: '', injectionDetected: false });
      return emptyStr as any;
    }
    let sanitized = input;
    let detected = false;

    for (const pattern of KnowledgeValidationService.INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        detected = true;
        sanitized = sanitized.replace(pattern, '[DEFANGED_INSTRUCTION]');
      }
    }

    const strObj = new String(sanitized);
    (strObj as any).safeText = sanitized;
    (strObj as any).injectionDetected = detected;
    return strObj as any;
  }

  /**
   * Checks for contradictions against existing active facts.
   */
  public checkContradictions(
    subjectEntityId: string,
    predicate: string,
    proposedValue: string,
    existingFactId?: string
  ): Array<{ subjectEntityId: string; predicate: string; existingFact: any; proposedValue: string }> {
    const activeFacts = this.factRepo.findFacts({
      subjectEntityId,
      predicate,
      activeOnly: true,
    });
    const conflicts = [];
    for (const f of activeFacts) {
      if (existingFactId && f.id !== existingFactId) continue;
      if (f.objectValue.trim().toLowerCase() !== proposedValue.trim().toLowerCase()) {
        conflicts.push({
          subjectEntityId,
          predicate,
          existingFact: f,
          proposedValue,
        });
      }
    }
    return conflicts;
  }

  /**
   * Validates a proposed fact against existing active facts for the subject and predicate.
   * Detects contradictions, determines if automatic superseding is justified, and records conflicts.
   */
  public validateFact(
    subjectEntityId: string,
    predicate: string,
    proposedValue: string,
    credibility: SourceCredibility = 'PRIMARY',
    isUserInstruction = false
  ): ValidationOutcome {
    // 1. Secret redaction and prompt defanging
    const secretFree = this.redactSecrets(proposedValue);
    const { safeText, injectionDetected } = this.defangPromptInjection(secretFree);

    // 2. Query existing active facts
    const activeFacts = this.factRepo.findFacts({
      subjectEntityId,
      predicate,
      activeOnly: true,
    });

    if (activeFacts.length === 0) {
      return {
        valid: true,
        sanitizedValue: safeText,
        contradictionDetected: false,
        reason: injectionDetected ? 'Prompt injection defanged' : undefined,
      };
    }

    // 3. Compare with active facts
    for (const existingFact of activeFacts) {
      const normalizedExisting = existingFact.objectValue.trim().toLowerCase();
      const normalizedProposed = safeText.trim().toLowerCase();

      // If value is identical, no contradiction
      if (normalizedExisting === normalizedProposed) {
        return {
          valid: true,
          sanitizedValue: safeText,
          contradictionDetected: false,
        };
      }

      // Conflict detected!
      const contradiction = this.contradictionRepo.createContradiction({
        factIdA: existingFact.id,
        factIdB: 'PENDING_CREATION',
        subjectEntityId,
        predicate,
        description: `Conflicting values for predicate "${predicate}": existing="${existingFact.objectValue}" vs proposed="${safeText}"`,
      });

      // Determine superseding policy
      let strategy: ResolutionStrategy = 'COEXISTENCE';
      let shouldSupersede = false;

      if (isUserInstruction || credibility === 'AUTHORITATIVE') {
        strategy = isUserInstruction ? 'USER_CONFIRMED' : 'HIGHER_CREDIBILITY';
        shouldSupersede = true;
      } else if (credibility === 'PRIMARY' && existingFact.confidence < 0.8) {
        strategy = 'HIGHER_CREDIBILITY';
        shouldSupersede = true;
      } else if (
        predicate === 'status' ||
        predicate === 'phase' ||
        predicate === 'current_model' ||
        predicate === 'state'
      ) {
        // Temporal state predicates naturally supersede with newer observations
        strategy = 'NEWER_SUPERSEDES';
        shouldSupersede = true;
      }

      return {
        valid: true,
        sanitizedValue: safeText,
        contradictionDetected: true,
        contradiction,
        supersededFactId: shouldSupersede ? existingFact.id : undefined,
        reason: `Contradiction detected with fact ${existingFact.id}. Strategy: ${strategy}`,
      };
    }

    return {
      valid: true,
      sanitizedValue: safeText,
      contradictionDetected: false,
    };
  }

  /**
   * Calculates confidence score based on source credibility and verification signals.
   */
  public calculateConfidence(credibility: SourceCredibility, corroborationCount = 1): number {
    let base = 0.5;
    switch (credibility) {
      case 'AUTHORITATIVE':
        base = 1.0;
        break;
      case 'PRIMARY':
        base = 0.85;
        break;
      case 'SECONDARY':
        base = 0.70;
        break;
      case 'COMMUNITY':
        base = 0.50;
        break;
      case 'UNVERIFIED':
        base = 0.30;
        break;
    }

    // Corroboration boost (bounded up to 0.98 if not authoritative)
    if (credibility !== 'AUTHORITATIVE') {
      const boost = Math.min((corroborationCount - 1) * 0.05, 0.15);
      return Math.min(base + boost, 0.98);
    }

    return base;
  }
}
