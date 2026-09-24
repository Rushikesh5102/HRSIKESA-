/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Extraction Service
 *
 * Phase 19: Deterministic Rule Extraction & Model-Assisted Candidate Mining via ModelRouter
 */

import { KnowledgeClaimRepository } from '../repositories/knowledge-claim.repository.js';
import { EntityResolutionService } from './entity-resolution.service.js';
import { KnowledgeValidationService } from './knowledge-validation.service.js';
import {
  KnowledgeClaim,
  ProvenanceType,
  EntityType,
  RelationshipType,
} from '../interfaces/knowledge.types.js';

export interface ExtractedFactCandidate {
  subject: string;
  subjectType?: EntityType;
  predicate: string;
  object: string;
  objectType?: EntityType;
  relationshipType?: RelationshipType;
  confidence: number;
}

export interface ExtractionResult {
  claims: KnowledgeClaim[];
  candidates: ExtractedFactCandidate[];
  sourceType: ProvenanceType;
}

export class KnowledgeExtractionService {
  private readonly claimRepo: KnowledgeClaimRepository;
  private readonly resolutionService: EntityResolutionService;
  private readonly validationService: KnowledgeValidationService;
  private modelRouter?: any; // ModelRouter from Phase 18

  constructor(
    claimRepoOrEntityRepo: any,
    resolutionService: EntityResolutionService,
    validationServiceOrLogger?: any,
    modelRouter?: any
  ) {
    this.claimRepo = (claimRepoOrEntityRepo?.createClaim ? claimRepoOrEntityRepo : {
      createClaim: (d: any) => ({ id: 'claim-' + Date.now(), ...d, createdAt: new Date().toISOString() })
    }) as KnowledgeClaimRepository;
    this.resolutionService = resolutionService;
    this.validationService = (validationServiceOrLogger?.defangPromptInjection ? validationServiceOrLogger : new KnowledgeValidationService(
      {} as any,
      {} as any
    ));
    this.modelRouter = modelRouter;
  }

  public getResolutionService(): EntityResolutionService {
    return this.resolutionService;
  }

  public setModelRouter(router: any): void {
    this.modelRouter = router;
  }

  public async isModelAssistedAvailable(): Promise<boolean> {
    return Boolean(this.modelRouter);
  }

  public async extractCandidateClaims(
    text: string,
    options?: {
      sourceType?: ProvenanceType;
      sourceReference?: string;
      credibility?: any;
    }
  ): Promise<KnowledgeClaim[]> {
    const result = this.extractDeterministic(
      text,
      options?.sourceType || 'RESEARCH',
      options?.sourceReference || 'research_note'
    );
    return result.claims;
  }

  /**
   * Deterministically extracts entity relationships and facts from structured patterns.
   */
  public extractDeterministic(
    text: string,
    sourceType: ProvenanceType = 'USER',
    sourceReference = 'interaction'
  ): ExtractionResult {
    const { safeText } = this.validationService.defangPromptInjection(text);
    const sanitized = this.validationService.redactSecrets(safeText);

    const candidates: ExtractedFactCandidate[] = [];
    const extractedEntityNames: string[] = [];

    // Pattern 1: User preferences ("Remember that I prefer X", "I prefer X for Y")
    const prefMatch = sanitized.match(/(?:remember\s+that\s+)?(?:i\s+prefer\s+)([^.,;\n]+)/i);
    if (prefMatch) {
      candidates.push({
        subject: 'Rushikesh',
        subjectType: 'PERSON',
        predicate: 'preference',
        object: prefMatch[1].trim(),
        confidence: 0.95,
      });
      extractedEntityNames.push('Rushikesh', prefMatch[1].trim());
    }

    // Pattern 2: "X uses Y"
    const usesRegex = /([A-Z][a-zA-Z0-9_\-\s]{2,25})\s+uses\s+([A-Z][a-zA-Z0-9_\-\s]{2,25})/g;
    let match: RegExpExecArray | null;
    while ((match = usesRegex.exec(sanitized)) !== null) {
      const sub = match[1].trim();
      const obj = match[2].trim();
      candidates.push({
        subject: sub,
        predicate: 'uses',
        object: obj,
        relationshipType: 'USES',
        confidence: 0.85,
      });
      extractedEntityNames.push(sub, obj);
    }

    // Pattern 3: "X depends on Y"
    const depRegex = /([A-Z][a-zA-Z0-9_\-\s]{2,25})\s+depends\s+on\s+([A-Z][a-zA-Z0-9_\-\s]{2,25})/g;
    while ((match = depRegex.exec(sanitized)) !== null) {
      const sub = match[1].trim();
      const obj = match[2].trim();
      candidates.push({
        subject: sub,
        predicate: 'depends_on',
        object: obj,
        relationshipType: 'DEPENDS_ON',
        confidence: 0.85,
      });
      extractedEntityNames.push(sub, obj);
    }

    // Pattern 4: "X created Y" / "X developed Y"
    const createdRegex = /([A-Z][a-zA-Z0-9_\-\s]{2,25})\s+(?:created|developed|built)\s+([A-Z][a-zA-Z0-9_\-\s]{2,25})/g;
    while ((match = createdRegex.exec(sanitized)) !== null) {
      const sub = match[1].trim();
      const obj = match[2].trim();
      candidates.push({
        subject: sub,
        predicate: 'created',
        object: obj,
        relationshipType: 'CREATED',
        confidence: 0.9,
      });
      extractedEntityNames.push(sub, obj);
    }

    // Record as candidate claim in repository
    const claim = this.claimRepo.createClaim({
      claimText: sanitized,
      extractedEntities: Array.from(new Set(extractedEntityNames)),
      status: 'CANDIDATE',
      confidence: candidates.length > 0 ? 0.75 : 0.5,
      sourceType,
      sourceReference,
    });

    return {
      claims: [claim],
      candidates,
      sourceType,
    };
  }

  /**
   * Model-assisted extraction using Phase 18 ModelRouter for complex unstructured text.
   * If ModelRouter is unavailable or offline, gracefully falls back to deterministic extraction.
   */
  public async extractWithModel(
    text: string,
    sourceType: ProvenanceType = 'RESEARCH',
    sourceReference = 'external_document'
  ): Promise<ExtractionResult> {
    const deterministic = this.extractDeterministic(text, sourceType, sourceReference);

    if (!this.modelRouter || typeof this.modelRouter.routeAndExecuteChat !== 'function') {
      return deterministic;
    }

    try {
      const prompt = `Extract entities, relationships, and facts from the following text into JSON format.
Text:
"""
${text.slice(0, 1500)}
"""

Respond ONLY with valid JSON:
{
  "entities": [{"name": "string", "type": "string"}],
  "relationships": [{"source": "string", "type": "string", "target": "string"}],
  "facts": [{"subject": "string", "predicate": "string", "object": "string"}]
}`;

      const response = await this.modelRouter.routeAndExecuteChat(
        [
          { role: 'system', content: 'You are an accurate, deterministic information extraction engine. Return only JSON.' },
          { role: 'user', content: prompt },
        ],
        {
          taskType: 'STRUCTURED_EXTRACTION',
          requiresStructuredOutput: true,
          complexity: 'STANDARD',
        }
      );

      const content = response.content || '';
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        const modelCandidates: ExtractedFactCandidate[] = [];

        if (Array.isArray(parsed.facts)) {
          for (const f of parsed.facts) {
            if (f.subject && f.predicate && f.object) {
              modelCandidates.push({
                subject: String(f.subject),
                predicate: String(f.predicate).toLowerCase(),
                object: String(f.object),
                confidence: 0.7,
              });
            }
          }
        }

        if (Array.isArray(parsed.relationships)) {
          for (const r of parsed.relationships) {
            if (r.source && r.type && r.target) {
              modelCandidates.push({
                subject: String(r.source),
                predicate: String(r.type).toLowerCase(),
                object: String(r.target),
                relationshipType: String(r.type).toUpperCase() as RelationshipType,
                confidence: 0.75,
              });
            }
          }
        }

        return {
          claims: deterministic.claims,
          candidates: [...deterministic.candidates, ...modelCandidates],
          sourceType,
        };
      }
    } catch {
      // Fallback cleanly to deterministic on model error or parse failure
    }

    return deterministic;
  }
}
