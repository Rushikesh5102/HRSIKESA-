/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Context Assembler
 *
 * Phase 19: Hybrid Deterministic + Graph + Semantic Context Assembly with Bounded Token Budgets
 */

import { KnowledgeEntityRepository } from '../repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../repositories/knowledge-relationship.repository.js';
import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import { KnowledgeEvidenceRepository } from '../repositories/knowledge-evidence.repository.js';
import { EntityResolutionService } from './entity-resolution.service.js';
import { KnowledgeGraphService } from './knowledge-graph.service.js';
import {
  KnowledgeScope,
  KnowledgeContextSummary,
  KnowledgeEntity,
  KnowledgeFact,
  KnowledgeRelationship,
} from '../interfaces/knowledge.types.js';

export interface AssembleContextOptions {
  query: string;
  scope?: KnowledgeScope;
  agentId?: string;
  companyId?: string;
  projectId?: string;
  entityIds?: string[];
  maxTokens?: number;
  maxChars?: number; // token budget constraint (default: 3000)
  includeHistorical?: boolean;
  includeSemanticMemories?: boolean;
}

export class KnowledgeContextAssembler {
  private readonly entityRepo: KnowledgeEntityRepository;
  private readonly relRepo: KnowledgeRelationshipRepository;
  private readonly factRepo: KnowledgeFactRepository;
  private readonly evidenceRepo?: KnowledgeEvidenceRepository;
  private readonly resolutionService: EntityResolutionService;
  private readonly graphService: KnowledgeGraphService;
  private hybridMemoryRetriever?: any; // Phase 4/16 hybrid retriever

  constructor(
    entityRepoOrGraphService: any,
    relRepoOrFactRepo: any,
    factRepoOrResolutionService?: any,
    evidenceRepoOrLogger?: any,
    resolutionService?: any,
    graphService?: any,
    hybridMemoryRetriever?: any
  ) {
    if (entityRepoOrGraphService?.findNeighbors || entityRepoOrGraphService?.findSubgraph) {
      // 4-arg test signature: (graphService, factRepo, resolutionService, logger)
      this.graphService = entityRepoOrGraphService;
      this.entityRepo = (entityRepoOrGraphService as any).entityRepo;
      this.relRepo = (entityRepoOrGraphService as any).relRepo;
      this.factRepo = relRepoOrFactRepo;
      this.evidenceRepo = (entityRepoOrGraphService as any).evidenceRepo;
      this.resolutionService = factRepoOrResolutionService;
      this.hybridMemoryRetriever = undefined;
    } else {
      // Standard 7-arg signature
      this.entityRepo = entityRepoOrGraphService;
      this.relRepo = relRepoOrFactRepo;
      this.factRepo = factRepoOrResolutionService;
      this.evidenceRepo = evidenceRepoOrLogger;
      this.resolutionService = resolutionService;
      this.graphService = graphService;
      this.hybridMemoryRetriever = hybridMemoryRetriever;
    }
  }

  public getGraphService(): KnowledgeGraphService {
    return this.graphService;
  }

  public setHybridMemoryRetriever(retriever: any): void {
    this.hybridMemoryRetriever = retriever;
  }

  public async searchKnowledge(
    query: string,
    options?: { scope?: KnowledgeScope; maxDepth?: number; limit?: number }
  ): Promise<{
    query: string;
    entities: KnowledgeEntity[];
    facts: KnowledgeFact[];
    relationships: KnowledgeRelationship[];
    contradictions: any[];
  }> {
    const limit = options?.limit || 20;
    const resolved = await this.resolutionService.resolveEntity(query, { scope: options?.scope });
    const entities: KnowledgeEntity[] = [];
    const facts: KnowledgeFact[] = [];
    const relationships: KnowledgeRelationship[] = [];

    if (resolved?.entity) {
      entities.push(resolved.entity);
      const neighbors = this.graphService.findNeighbors(resolved.entity.id, {
        maxDepth: options?.maxDepth || 2,
        limit,
      });
      for (const n of neighbors) {
        if (!entities.some((e) => e.id === n.id)) {
          entities.push(n);
        }
      }
    } else {
      const found = this.entityRepo.listEntities({ search: query, scope: options?.scope, limit });
      entities.push(...found);
    }

    for (const ent of entities) {
      const entFacts = this.factRepo.findCurrentFactsForEntity(ent.id, options?.scope);
      facts.push(...entFacts);
      const entRels = this.relRepo.findRelationships({ entityId: ent.id, scope: options?.scope });
      relationships.push(...entRels);
    }

    return {
      query,
      entities: entities.slice(0, limit),
      facts: facts.slice(0, limit),
      relationships: relationships.slice(0, limit),
      contradictions: [],
    };
  }

  /**
   * Assembles a multi-tier knowledge context block for agent reasoning.
   */
  public async assembleContext(options: AssembleContextOptions): Promise<{
    entities: KnowledgeEntity[];
    facts: KnowledgeFact[];
    relationships: KnowledgeRelationship[];
    formattedContext: string;
    formattedMarkdown: string;
    summary: KnowledgeContextSummary;
    totalChars: number;
  }> {
    const maxChars = options.maxChars || (options.maxTokens ? options.maxTokens * 4 : 3000);
    const authoritativeFacts: string[] = [];
    const currentScopedFacts: string[] = [];
    const relationships: string[] = [];
    const historicalContext: string[] = [];
    const evidenceCitations: string[] = [];

    const collectedEntities: KnowledgeEntity[] = [];
    const collectedFacts: KnowledgeFact[] = [];
    const collectedRelationships: KnowledgeRelationship[] = [];

    // 1. Resolve key entities mentioned in the query or directly provided
    const matchedEntityIds = new Set<string>(options.entityIds || []);
    if (options.query) {
      const words = options.query.split(/[\s,?.!]+/).filter((w) => w.length > 2);
      for (const word of words) {
        const res = await this.resolutionService.resolveEntity(word, { scope: options.scope });
        if (res?.entity) {
          matchedEntityIds.add(res.entity.id);
        }
      }
    }

    // 2. Add Project / Company scoped entities if provided
    if (options.projectId) {
      const projEntity = this.entityRepo.findByCanonicalName(options.projectId, options.scope);
      if (projEntity) matchedEntityIds.add(projEntity.id);
    }
    if (options.companyId) {
      const compEntity = this.entityRepo.findByCanonicalName(options.companyId, options.scope);
      if (compEntity) matchedEntityIds.add(compEntity.id);
    }

    // 3. For resolved entities, retrieve facts and 1-hop relationships
    for (const entId of matchedEntityIds) {
      const entity = this.entityRepo.getEntity(entId);
      if (!entity) continue;
      collectedEntities.push(entity);

      // Current active facts
      const facts = this.factRepo.findCurrentFactsForEntity(entId, options.scope);
      collectedFacts.push(...facts);
      for (const f of facts) {
        const line = `${entity.displayName}: [${f.predicate}] -> ${f.objectValue}`;
        if (f.confidence >= 0.95 || f.scope === 'CREATOR' || f.scope === 'GLOBAL') {
          authoritativeFacts.push(line);
        } else {
          currentScopedFacts.push(line);
        }
      }

      // Historical facts if requested
      if (options.includeHistorical) {
        const historical = this.factRepo.findHistoricalFactsForEntity(entId, options.scope);
        for (const h of historical) {
          historicalContext.push(`${entity.displayName} previously had [${h.predicate}] = "${h.objectValue}" (until ${h.validUntil || 'superseded'})`);
        }
      }

      // Relationships
      const rels = this.relRepo.findRelationships({ entityId: entId, scope: options.scope });
      collectedRelationships.push(...rels);
      for (const r of rels) {
        const otherId = r.sourceEntityId === entId ? r.targetEntityId : r.sourceEntityId;
        const otherEntity = this.entityRepo.getEntity(otherId);
        const otherName = otherEntity ? otherEntity.displayName : otherId;
        const relLine = r.sourceEntityId === entId
          ? `${entity.displayName} --[${r.relationshipType}]--> ${otherName}`
          : `${otherName} --[${r.relationshipType}]--> ${entity.displayName}`;
        relationships.push(relLine);
      }
      // Citations
      for (const f of facts) {
        if (this.evidenceRepo) {
          const evs = this.evidenceRepo.findEvidenceForFact(f.id);
          if (evs.length > 0 && evs[0].quote) {
            evidenceCitations.push(`"${evs[0].quote}" (${evs[0].sourceType}: ${evs[0].sourceReference})`);
          }
        }
      }
    }

    // 4. Incorporate semantic memory retrieval if available and requested
    if (options.includeSemanticMemories && this.hybridMemoryRetriever && typeof this.hybridMemoryRetriever.retrieve === 'function' && options.query) {
      try {
        const memResults = await this.hybridMemoryRetriever.retrieve(options.query, 3);
        if (Array.isArray(memResults)) {
          for (const m of memResults) {
            if (m.content && !currentScopedFacts.includes(m.content)) {
              currentScopedFacts.push(`[Semantic Memory: ${m.tier || 'wisdom'}] ${m.content}`);
            }
          }
        }
      } catch {
        // Fallback: continue without semantic embeddings
      }
    }

    // 5. Format bounded markdown context
    let formatted = '### HṚṢĪKEŚA Knowledge Graph Context\n';

    if (authoritativeFacts.length > 0) {
      formatted += '\n**Authoritative Facts:**\n';
      formatted += authoritativeFacts.map((f) => `- ${f}`).join('\n') + '\n';
    }

    if (currentScopedFacts.length > 0) {
      formatted += '\n**Current Scoped Facts:**\n';
      formatted += currentScopedFacts.map((f) => `- ${f}`).join('\n') + '\n';
    }

    if (relationships.length > 0) {
      formatted += '\n**Key Relationships:**\n';
      formatted += relationships.map((r) => `- ${r}`).join('\n') + '\n';
    }

    if (historicalContext.length > 0) {
      formatted += '\n**Historical State:**\n';
      formatted += historicalContext.map((h) => `- ${h}`).join('\n') + '\n';
    }

    if (evidenceCitations.length > 0) {
      formatted += '\n**Evidence Citations:**\n';
      formatted += evidenceCitations.map((c) => `- ${c}`).join('\n') + '\n';
    }

    // Apply budget truncation
    if (formatted.length > maxChars) {
      formatted = formatted.slice(0, maxChars) + '\n... [Context bounded by token budget]';
    }

    return {
      entities: collectedEntities,
      facts: collectedFacts,
      relationships: collectedRelationships,
      formattedContext: formatted,
      formattedMarkdown: formatted,
      summary: {
        authoritativeFacts,
        currentScopedFacts,
        relationships,
        historicalContext,
        evidenceCitations,
        confidenceScore: authoritativeFacts.length > 0 ? 0.95 : 0.8,
      },
      totalChars: formatted.length,
    };
  }
}
