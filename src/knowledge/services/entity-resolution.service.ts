/**
 * HṚṢĪKEŚA (हृषीकेश) — Entity Resolution Service
 *
 * Phase 19: Canonical Normalization, Alias Resolution, Disambiguation & Safe Deduplication
 */

import { KnowledgeEntityRepository } from '../repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../repositories/knowledge-relationship.repository.js';
import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import { KnowledgeMergeProposalRepository } from '../repositories/knowledge-merge-proposal.repository.js';
import {
  KnowledgeEntity,
  EntityType,
  KnowledgeScope,
  EntityMergeProposal,
  MergeProposalStatus,
} from '../interfaces/knowledge.types.js';

export interface ResolutionResult {
  entity: KnowledgeEntity | null;
  matchType: 'CANONICAL_EXACT' | 'ALIAS_EXACT' | 'FUZZY_CONFIDENT' | 'NONE';
  confidence: number;
  ambiguousCandidates?: KnowledgeEntity[];
  resolved: boolean;
  candidates: Array<{ entity: KnowledgeEntity; confidence: number; reason?: string }>;
}

export class EntityResolutionService {
  private readonly entityRepo: KnowledgeEntityRepository;
  private readonly relRepo?: KnowledgeRelationshipRepository;
  private readonly factRepo?: KnowledgeFactRepository;
  private readonly mergeProposalRepo?: KnowledgeMergeProposalRepository;

  // Known canonical alias clusters for core system entities
  private static readonly KNOWN_CANONICAL_CLUSTERS: Record<string, string[]> = {
    'hrisekesa': ['hṛṣīkeśa', 'hrishikesha', 'हृषीकेश', 'hrisekesa', 'sovereign os'],
    'llama3.2:3b': ['llama 3.2', 'llama 3.2 3b', 'llama 3b', 'llama3.2', 'llama-3.2-3b'],
    'qwen2.5:7b': ['qwen 2.5', 'qwen 2.5 7b', 'qwen 7b', 'qwen2.5', 'qwen-2.5-7b'],
    'rushikesh': ['rushikesh pattiwar', 'creator', 'sole master', 'master'],
  };

  constructor(
    entityRepo: KnowledgeEntityRepository,
    relRepo?: KnowledgeRelationshipRepository,
    factRepo?: KnowledgeFactRepository,
    mergeProposalRepo?: KnowledgeMergeProposalRepository
  ) {
    this.entityRepo = entityRepo;
    this.relRepo = relRepo;
    this.factRepo = factRepo;
    this.mergeProposalRepo = mergeProposalRepo;
  }

  public getMergeProposalRepo(): KnowledgeMergeProposalRepository | undefined {
    return this.mergeProposalRepo;
  }

  public async resolveEntity(
    name: string,
    options?: {
      typeHint?: EntityType;
      expectedType?: EntityType;
      entityType?: EntityType;
      scope?: KnowledgeScope;
      allowFuzzy?: boolean;
      confidenceThreshold?: number;
    }
  ): Promise<ResolutionResult> {
    return this.resolve(name, {
      expectedType: options?.typeHint || options?.expectedType || options?.entityType,
      scope: options?.scope,
      allowFuzzy: options?.allowFuzzy,
      confidenceThreshold: options?.confidenceThreshold,
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
  private makeResult(
    entity: KnowledgeEntity | null,
    matchType: 'CANONICAL_EXACT' | 'ALIAS_EXACT' | 'FUZZY_CONFIDENT' | 'NONE',
    confidence: number,
    ambiguousCandidates?: KnowledgeEntity[]
  ): ResolutionResult {
    return {
      entity,
      matchType,
      confidence,
      ambiguousCandidates,
      resolved: Boolean(entity),
      candidates: ambiguousCandidates
        ? ambiguousCandidates.map((c) => ({ entity: c, confidence: 0.5, reason: 'Ambiguous candidate' }))
        : (entity ? [{ entity, confidence, reason: matchType }] : []),
    };
  }

  public resolve(
    name: string,
    options?: {
      expectedType?: EntityType;
      scope?: KnowledgeScope;
      allowFuzzy?: boolean;
      confidenceThreshold?: number;
    }
  ): ResolutionResult {
    const raw = name.trim();
    if (!raw) {
      return this.makeResult(null, 'NONE', 0);
    }

    const normalized = this.entityRepo.normalizeName(raw);

    // 1. Direct canonical name match
    const canonicalMatch = this.entityRepo.findByCanonicalName(normalized, options?.scope);
    if (canonicalMatch) {
      // Type conflict check: if expectedType specified and different, do NOT merge
      if (options?.expectedType && canonicalMatch.entityType !== options.expectedType) {
        return this.makeResult(null, 'NONE', 0.3, [canonicalMatch]);
      }
      return this.makeResult(canonicalMatch, 'CANONICAL_EXACT', 1.0);
    }

    // 2. Alias match
    const aliasMatch = this.entityRepo.findByAlias(normalized, options?.scope);
    if (aliasMatch) {
      if (options?.expectedType && aliasMatch.entityType !== options.expectedType) {
        return this.makeResult(null, 'NONE', 0.3, [aliasMatch]);
      }
      return this.makeResult(aliasMatch, 'ALIAS_EXACT', 0.95);
    }

    // 2b. Known canonical cluster check
    const rawLower = raw.toLowerCase();
    for (const [canonicalKey, cluster] of Object.entries(EntityResolutionService.KNOWN_CANONICAL_CLUSTERS)) {
      if (cluster.some((alias) => alias.toLowerCase() === rawLower || alias.toLowerCase() === normalized)) {
        const canonical = this.entityRepo.findByCanonicalName(canonicalKey, options?.scope)
          || this.entityRepo.findByAlias(canonicalKey, options?.scope);
        if (canonical && (!options?.expectedType || canonical.entityType === options.expectedType)) {
          return this.makeResult(canonical, 'ALIAS_EXACT', 0.95);
        }
      }
    }

    // 2c. Exact display name match
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
      return this.makeResult(exactDisplays[0], 'CANONICAL_EXACT', 0.95);
    } else if (exactDisplays.length > 1 && !options?.expectedType) {
      return this.makeResult(null, 'NONE', 0.4, exactDisplays);
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
        return this.makeResult(candidates[0], 'FUZZY_CONFIDENT', 0.8);
      } else if (candidates.length > 1) {
        // Ambiguous! Never auto-merge ambiguous entities
        return this.makeResult(null, 'NONE', 0.4, candidates);
      }
    }

    return this.makeResult(null, 'NONE', 0);
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

  /**
   * Proposal-Based Merging:
   * Prevents silent destructive merging of ambiguous entities.
   * Creates a formal ENTITY_MERGE_PROPOSAL. Auto-approves only if exact canonical names and types match.
   */
  public createMergeProposal(
    entityAIdOrData: string | {
      entityAId: string;
      entityBId: string;
      reason: string;
      confidence?: number;
      evidence?: string;
    },
    entityBId?: string,
    reason?: string,
    confidence?: number,
    evidence?: string
  ): EntityMergeProposal {
    if (!this.mergeProposalRepo) {
      throw new Error('Merge proposal repository is not configured on EntityResolutionService.');
    }
    const data = typeof entityAIdOrData === 'string'
      ? { entityAId: entityAIdOrData, entityBId: entityBId!, reason: reason || 'Merge candidate', confidence, evidence }
      : entityAIdOrData;
    const entA = this.entityRepo.getEntity(data.entityAId);
    const entB = this.entityRepo.getEntity(data.entityBId);
    if (!entA || !entB) {
      throw new Error('Both entities must exist to create a merge proposal.');
    }

    const autoApprove = (entA.canonicalName.toLowerCase() === entB.canonicalName.toLowerCase() ||
      entA.displayName.toLowerCase() === entB.displayName.toLowerCase()) &&
      entA.entityType === entB.entityType;

    const status: MergeProposalStatus = autoApprove ? 'AUTO_APPROVED' : 'PENDING';

    const proposal = this.mergeProposalRepo.createProposal({
      entityAId: data.entityAId,
      entityBId: data.entityBId,
      reason: data.reason,
      confidence: data.confidence !== undefined ? data.confidence : (autoApprove ? 0.99 : 0.65),
      evidence: data.evidence,
      status,
    });

    if (autoApprove) {
      try {
        this.mergeEntities(data.entityAId, data.entityBId);
      } catch {
        // non-blocking auto-merge failure
      }
    }

    return proposal;
  }

  public listMergeProposals(status?: MergeProposalStatus): EntityMergeProposal[] {
    if (!this.mergeProposalRepo) return [];
    return this.mergeProposalRepo.listProposals({ status });
  }

  public resolveMergeProposal(
    proposalId: string,
    decision: 'APPROVED' | 'REJECTED',
    resolvedBy = 'ROOT_RUSHIKESH'
  ): { success: boolean; proposal: EntityMergeProposal | null } {
    if (!this.mergeProposalRepo) {
      throw new Error('Merge proposal repository is not configured.');
    }
    const prop = this.mergeProposalRepo.getProposal(proposalId);
    if (!prop) {
      return { success: false, proposal: null };
    }

    if (decision === 'APPROVED') {
      this.mergeEntities(prop.entityAId, prop.entityBId);
      this.mergeProposalRepo.updateStatus(proposalId, 'APPROVED', resolvedBy);
    } else {
      this.mergeProposalRepo.updateStatus(proposalId, 'REJECTED', resolvedBy);
    }

    const updated = this.mergeProposalRepo.getProposal(proposalId);
    return { success: true, proposal: updated };
  }
}

