/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Extraction Service
 *
 * Phase 19: Deterministic Rule Extraction & Model-Assisted Candidate Mining via ModelRouter
 */

import { KnowledgeClaimRepository } from '../repositories/knowledge-claim.repository.js';
import { EntityResolutionService } from './entity-resolution.service.js';
import { KnowledgeValidationService } from './knowledge-validation.service.js';
import { KnowledgeEntityRepository } from '../repositories/knowledge-entity.repository.js';
import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import { KnowledgeRelationshipRepository } from '../repositories/knowledge-relationship.repository.js';
import {
  KnowledgeClaim,
  KnowledgeFact,
  KnowledgeEntity,
  KnowledgeRelationship,
  KnowledgeScope,
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
  private entityRepo?: KnowledgeEntityRepository;
  private factRepo?: KnowledgeFactRepository;
  private relRepo?: KnowledgeRelationshipRepository;

  constructor(
    claimRepoOrEntityRepo: any,
    resolutionService: EntityResolutionService,
    validationServiceOrLogger?: any,
    modelRouter?: any,
    entityRepo?: KnowledgeEntityRepository,
    factRepo?: KnowledgeFactRepository,
    relRepo?: KnowledgeRelationshipRepository
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
    this.entityRepo = entityRepo;
    this.factRepo = factRepo;
    this.relRepo = relRepo;
  }

  public setGraphRepositories(
    entityRepo: KnowledgeEntityRepository,
    factRepo: KnowledgeFactRepository,
    relRepo: KnowledgeRelationshipRepository
  ): void {
    this.entityRepo = entityRepo;
    this.factRepo = factRepo;
    this.relRepo = relRepo;
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
    const usesRegex = /([\p{L}][\p{L}0-9_\-\s]{1,30}?)\s+uses\s+([\p{L}][\p{L}0-9_\-\s]{1,30}?)(?:[\s,.;]|$)/gu;
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
    const depRegex = /([\p{L}][\p{L}0-9_\-\s]{1,30}?)\s+depends\s+on\s+([\p{L}][\p{L}0-9_\-\s]{1,30}?)(?:[\s,.;]|$)/gu;
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
    const createdRegex = /([\p{L}][\p{L}0-9_\-\s]{1,30}?)\s+(?:created|developed|built)\s+([\p{L}][\p{L}0-9_\-\s]{1,30}?)(?:[\s,.;]|$)/gu;
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

  /**
   * Controlled Extraction Pipeline:
   * Conversation/Text -> Candidate facts -> Entity resolution -> Relationship detection ->
   * Confidence assessment -> Provenance classification -> Validation -> Graph persistence.
   */
  public async extractAndPersist(
    textOrInput: string | {
      content?: string;
      text?: string;
      scope?: KnowledgeScope;
      provenance?: ProvenanceType;
      sourceReference?: string;
    },
    options?: {
      scope?: KnowledgeScope;
      provenance?: ProvenanceType;
      sourceReference?: string;
    }
  ): Promise<{
    facts: KnowledgeFact[];
    entities: KnowledgeEntity[];
    relationships: KnowledgeRelationship[];
    factsCreated: number;
  }> {
    const rawText = typeof textOrInput === 'string'
      ? textOrInput
      : (textOrInput?.content || textOrInput?.text || '');
    const scope = (typeof textOrInput === 'object' && textOrInput?.scope) || options?.scope || 'GLOBAL';
    const defaultProvenance = (typeof textOrInput === 'object' && textOrInput?.provenance) || options?.provenance || 'EXPLICIT';
    const sourceReference = (typeof textOrInput === 'object' && textOrInput?.sourceReference) || options?.sourceReference || 'conversation';

    // 1. Extract candidates (deterministic + model-assisted if available)
    const extractionResult = await this.extractWithModel(rawText, defaultProvenance, sourceReference);

    const createdFacts: KnowledgeFact[] = [];
    const resolvedEntities: KnowledgeEntity[] = [];
    const createdRelationships: KnowledgeRelationship[] = [];

    if (!this.factRepo || !this.entityRepo) {
      return { facts: createdFacts, entities: resolvedEntities, relationships: createdRelationships, factsCreated: 0 };
    }

    for (const cand of extractionResult.candidates) {
      if (cand.confidence < 0.7) continue;

      // Entity resolution for subject
      const subRes = await this.resolutionService.resolveEntity(cand.subject, {
        scope,
        entityType: cand.subjectType || 'CONCEPT',
        confidenceThreshold: 0.8,
      });

      let subEntity: KnowledgeEntity;
      if (subRes.resolved && subRes.entity) {
        subEntity = subRes.entity;
      } else {
        subEntity = this.entityRepo.createEntity({
          canonicalName: cand.subject,
          displayName: cand.subject,
          entityType: cand.subjectType || (cand.subject.toLowerCase() === 'rushikesh' ? 'PERSON' : 'CONCEPT'),
          scope: cand.subject.toLowerCase() === 'rushikesh' ? 'CREATOR' : scope,
        });
      }
      resolvedEntities.push(subEntity);

      // Entity resolution for object if relationship
      let objEntity: KnowledgeEntity | undefined;
      if (cand.relationshipType && this.relRepo) {
        const objRes = await this.resolutionService.resolveEntity(cand.object, {
          scope,
          entityType: cand.objectType || 'CONCEPT',
          confidenceThreshold: 0.8,
        });
        if (objRes.resolved && objRes.entity) {
          objEntity = objRes.entity;
        } else {
          objEntity = this.entityRepo.createEntity({
            canonicalName: cand.object,
            displayName: cand.object,
            entityType: cand.objectType || 'CONCEPT',
            scope,
          });
        }
        resolvedEntities.push(objEntity);

        // Create relationship
        const rel = this.relRepo.createRelationship({
          sourceEntityId: subEntity.id,
          relationshipType: cand.relationshipType,
          targetEntityId: objEntity.id,
          scope,
          confidence: cand.confidence,
        });
        createdRelationships.push(rel);
      }

      // Classify provenance: EXPLICIT, DERIVED, INFERRED
      let provenance: ProvenanceType = defaultProvenance;
      if (cand.predicate === 'preference') {
        provenance = 'EXPLICIT';
      } else if (cand.relationshipType) {
        provenance = 'DERIVED';
      }

      // Create fact
      const fact = this.factRepo.createFact({
        subjectEntityId: subEntity.id,
        predicate: cand.predicate,
        objectEntityId: objEntity?.id,
        objectValue: cand.object,
        confidence: cand.confidence,
        status: 'ACTIVE',
        scope: subEntity.scope,
        provenance,
      });
      createdFacts.push(fact);
    }

    return {
      facts: createdFacts,
      entities: resolvedEntities,
      relationships: createdRelationships,
      factsCreated: createdFacts.length,
    };
  }
}
