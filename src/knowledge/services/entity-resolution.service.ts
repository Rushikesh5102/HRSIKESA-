/**
 * HṚṢĪKEŚA (हृषीकेश) — Entity Resolution Service
 *
 * Phase 19: Canonical Normalization, Alias Resolution, Disambiguation & Safe Deduplication
 */

import { KnowledgeEntityRepository } from '../repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../repositories/knowledge-relationship.repository.js';
import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import {
  KnowledgeEntity,
  EntityType,
  KnowledgeScope,
} from '../interfaces/knowledge.types.js';

export interface ResolutionResult {
  entity: KnowledgeEntity | null;
  matchType: 'CANONICAL_EXACT' | 'ALIAS_EXACT' | 'FUZZY_CONFIDENT' | 'NONE';
  confidence: number;
  ambiguousCandidates?: KnowledgeEntity[];
}

export class EntityResolutionService {
  private readonly entityRepo: KnowledgeEntityRepository;
  private readonly relRepo?: KnowledgeRelationshipRepository;
  private readonly factRepo?: KnowledgeFactRepository;

  constructor(
    entityRepo: KnowledgeEntityRepository,
    relRepo?: KnowledgeRelationshipRepository,
    factRepo?: KnowledgeFactRepository
  ) {
    this.entityRepo = entityRepo;
    this.relRepo = relRepo;
    this.factRepo = factRepo;
  }

  public async resolveEntity(
    name: string,
    options?: {
      typeHint?: EntityType;
      expectedType?: EntityType;
      scope?: KnowledgeScope;
      allowFuzzy?: boolean;
    }
  ): Promise<ResolutionResult> {
    return this.resolve(name, {
      expectedType: options?.typeHint || options?.expectedType,
      scope: options?.scope,
      allowFuzzy: options?.allowFuzzy,
    });
  }

  public async getOrCreateEntity(
    name: string,
    options?: {
      type?: EntityType;
      expectedType?: EntityType;
      scope?: KnowledgeScope;
      description?: string;
      aliases?: string[];
    }
  ): Promise<KnowledgeEntity> {
    const resolved = await this.resolveEntity(name, {
      expectedType: options?.type || options?.expectedType,
      scope: options?.scope,
    });
    if (resolved.entity) {
      return resolved.entity;
    }
    return this.entityRepo.createEntity({
      canonicalName: name,
      displayName: name,
      entityType: options?.type || options?.expectedType || 'CONCEPT',
      scope: options?.scope || 'GLOBAL',
      description: options?.description,
      aliases: options?.aliases || [],
      status: 'CONFIRMED',
    });
  }

  /**
   * Resolves a raw string name to an authoritative KnowledgeEntity.
   * Deterministic first: exact canonical match -> exact alias match -> scope filter.
   * Never merges entities with conflicting types or ambiguous meanings.
   */
  public resolve(
    name: string,
    options?: {
      expectedType?: EntityType;
      scope?: KnowledgeScope;
      allowFuzzy?: boolean;
    }
  ): ResolutionResult {
    const raw = name.trim();
    if (!raw) {
      return { entity: null, matchType: 'NONE', confidence: 0 };
    }

    const normalized = this.entityRepo.normalizeName(raw);

    // 1. Direct canonical name match
    const canonicalMatch = this.entityRepo.findByCanonicalName(normalized, options?.scope);
    if (canonicalMatch) {
      // Type conflict check: if expectedType specified and different, do NOT merge
      if (options?.expectedType && canonicalMatch.entityType !== options.expectedType) {
        return {
          entity: null,
          matchType: 'NONE',
          confidence: 0.3,
          ambiguousCandidates: [canonicalMatch],
        };
      }
      return {
        entity: canonicalMatch,
        matchType: 'CANONICAL_EXACT',
        confidence: 1.0,
      };
    }

    // 2. Alias match
    const aliasMatch = this.entityRepo.findByAlias(normalized, options?.scope);
    if (aliasMatch) {
      if (options?.expectedType && aliasMatch.entityType !== options.expectedType) {
        return {
          entity: null,
          matchType: 'NONE',
          confidence: 0.3,
          ambiguousCandidates: [aliasMatch],
        };
      }
      return {
        entity: aliasMatch,
        matchType: 'ALIAS_EXACT',
        confidence: 0.95,
      };
    }

    // 2b. Exact display name match
    const displayMatches = this.entityRepo.listEntities({
      search: raw,
      scope: options?.scope,
      entityType: options?.expectedType,
      limit: 10,
    });
    const exactDisplays = displayMatches.filter(
      (c) => c.displayName.trim().toLowerCase() === raw.toLowerCase() &&
             (!options?.expectedType || c.entityType === options.expectedType)
    );
    if (exactDisplays.length === 1) {
      return {
        entity: exactDisplays[0],
        matchType: 'CANONICAL_EXACT',
        confidence: 0.95,
      };
    } else if (exactDisplays.length > 1 && !options?.expectedType) {
      return {
        entity: null,
        matchType: 'NONE',
        confidence: 0.4,
        ambiguousCandidates: exactDisplays,
      };
    }

    // 3. Search / Safe fuzzy candidate retrieval
    if (options?.allowFuzzy) {
      const candidates = this.entityRepo.listEntities({
        search: raw,
        scope: options?.scope,
        entityType: options?.expectedType,
        limit: 5,
      });

      if (candidates.length === 1) {
        return {
          entity: candidates[0],
          matchType: 'FUZZY_CONFIDENT',
          confidence: 0.8,
        };
      } else if (candidates.length > 1) {
        // Ambiguous! Never auto-merge ambiguous entities
        return {
          entity: null,
          matchType: 'NONE',
          confidence: 0.4,
          ambiguousCandidates: candidates,
        };
      }
    }

    return { entity: null, matchType: 'NONE', confidence: 0 };
  }

  /**
   * Safely merges duplicate entity A into target entity B.
   * Transfers aliases, relationships, and facts, then marks entity A as ARCHIVED or deletes it.
   */
  public mergeEntities(
    sourceEntityId: string,
    targetEntityId: string
  ): { targetEntity: KnowledgeEntity; transferredAliases: number } {
    if (sourceEntityId === targetEntityId) {
      throw new Error('Cannot merge an entity into itself.');
    }

    const source = this.entityRepo.getEntity(sourceEntityId);
    const target = this.entityRepo.getEntity(targetEntityId);

    if (!source || !target) {
      throw new Error('Both source and target entities must exist to perform merge.');
    }

    // Transfer aliases
    const sourceAliases = this.entityRepo.getAliases(sourceEntityId);
    let transferredAliases = 0;

    // Add source's canonical name and display name as aliases on target
    this.entityRepo.addAlias(targetEntityId, source.displayName);
    if (source.canonicalName !== target.canonicalName) {
      this.entityRepo.addAlias(targetEntityId, source.canonicalName);
    }

    for (const a of sourceAliases) {
      this.entityRepo.addAlias(targetEntityId, a);
      transferredAliases++;
    }

    // Update relationships pointing to/from source
    if (this.relRepo) {
      const outgoing = this.relRepo.findOutgoing(sourceEntityId, undefined, false);
      for (const rel of outgoing) {
        this.relRepo.createRelationship({
          sourceEntityId: targetEntityId,
          relationshipType: rel.relationshipType,
          targetEntityId: rel.targetEntityId,
          direction: rel.direction,
          confidence: rel.confidence,
          scope: rel.scope,
          validFrom: rel.validFrom,
          validUntil: rel.validUntil,
        });
        this.relRepo.deleteRelationship(rel.id);
      }

      const incoming = this.relRepo.findIncoming(sourceEntityId, undefined, false);
      for (const rel of incoming) {
        this.relRepo.createRelationship({
          sourceEntityId: rel.sourceEntityId,
          relationshipType: rel.relationshipType,
          targetEntityId: targetEntityId,
          direction: rel.direction,
          confidence: rel.confidence,
          scope: rel.scope,
          validFrom: rel.validFrom,
          validUntil: rel.validUntil,
        });
        this.relRepo.deleteRelationship(rel.id);
      }
    }

    // Update facts on source
    if (this.factRepo) {
      const facts = this.factRepo.findFacts({ subjectEntityId: sourceEntityId, limit: 1000 });
      for (const fact of facts) {
        this.factRepo.createFact({
          subjectEntityId: targetEntityId,
          predicate: fact.predicate,
          objectEntityId: fact.objectEntityId,
          objectValue: fact.objectValue,
          valueType: fact.valueType,
          confidence: fact.confidence,
          status: fact.status,
          scope: fact.scope,
          validFrom: fact.validFrom,
          validUntil: fact.validUntil,
          observedAt: fact.observedAt,
        });
      }
    }

    // Mark source as ARCHIVED
    this.entityRepo.updateEntity(sourceEntityId, { status: 'ARCHIVED' });

    const updatedTarget = this.entityRepo.getEntity(targetEntityId)!;
    return { targetEntity: updatedTarget, transferredAliases };
  }
}
