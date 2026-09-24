/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Timeline Service
 *
 * Phase 19: Chronological Temporal Event Reconstruction for Entities & Systems
 */

import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import { KnowledgeRelationshipRepository } from '../repositories/knowledge-relationship.repository.js';
import { KnowledgeEvidenceRepository } from '../repositories/knowledge-evidence.repository.js';
import { KnowledgeContradictionRepository } from '../repositories/knowledge-contradiction.repository.js';
import {
  KnowledgeTimelineEvent,
  KnowledgeScope,
} from '../interfaces/knowledge.types.js';

export class KnowledgeTimelineService {
  private readonly factRepo: KnowledgeFactRepository;
  private readonly relRepo: KnowledgeRelationshipRepository;
  private readonly evidenceRepo: KnowledgeEvidenceRepository;
  private readonly contradictionRepo: KnowledgeContradictionRepository;

  constructor(
    factRepo: KnowledgeFactRepository,
    relRepo: KnowledgeRelationshipRepository,
    evidenceRepo: KnowledgeEvidenceRepository,
    contradictionRepo: KnowledgeContradictionRepository
  ) {
    this.factRepo = factRepo;
    this.relRepo = relRepo;
    this.evidenceRepo = evidenceRepo;
    this.contradictionRepo = contradictionRepo;
  }

  public getEvidenceRepo(): KnowledgeEvidenceRepository {
    return this.evidenceRepo;
  }

  /**
   * Reconstructs the complete temporal timeline for an entity.
   */
  public getTimeline(
    entityIdOrOptions: string | { entityId?: string; scope?: KnowledgeScope; limit?: number },
    scope?: KnowledgeScope
  ): KnowledgeTimelineEvent[] {
    const entityId = typeof entityIdOrOptions === 'string' ? entityIdOrOptions : (entityIdOrOptions?.entityId || '');
    const actualScope = typeof entityIdOrOptions === 'string' ? scope : (entityIdOrOptions?.scope || scope);
    const events: KnowledgeTimelineEvent[] = [];

    // 1. Facts & Fact Versions
    const facts = this.factRepo.findFacts({ subjectEntityId: entityId, scope: actualScope, limit: 100 });
    for (const fact of facts) {
      const evidences = this.evidenceRepo.findEvidenceForFact(fact.id);
      const evDesc = evidences.length > 0 && evidences[0].quote ? ` (Evidence: "${evidences[0].quote}")` : '';

      events.push({
        id: `fact-obs-${fact.id}`,
        entityId,
        timestamp: fact.observedAt || fact.createdAt,
        eventType: 'FACT_OBSERVED',
        title: `Fact Asserted: ${fact.predicate}`,
        description: `Set "${fact.predicate}" to "${fact.objectValue}" (confidence: ${fact.confidence})${evDesc}`,
        status: fact.status,
        provenance: 'SYSTEM',
      });

      // Versions
      const versions = this.factRepo.getFactVersions(fact.id);
      for (const v of versions) {
        if (v.status === 'SUPERSEDED') {
          events.push({
            id: `fact-sup-${v.id}`,
            entityId,
            timestamp: v.validUntil || v.createdAt,
            eventType: 'FACT_SUPERSEDED',
            title: `Fact Superseded: ${v.predicate}`,
            description: `Previous value "${v.objectValue}" superseded by newer state`,
            status: 'SUPERSEDED',
            provenance: 'SYSTEM',
          });
        }
      }
    }

    // 2. Relationships
    const rels = this.relRepo.findRelationships({ entityId, limit: 100 });
    for (const rel of rels) {
      events.push({
        id: `rel-${rel.id}`,
        entityId,
        timestamp: rel.createdAt,
        eventType: 'RELATIONSHIP_CREATED',
        title: `Relationship Established: ${rel.relationshipType}`,
        description: `Linked with entity ${rel.sourceEntityId === entityId ? rel.targetEntityId : rel.sourceEntityId}`,
        status: rel.status,
        provenance: 'SYSTEM',
      });
    }

    // 3. Contradictions
    const contradictions = this.contradictionRepo.findContradictions({
      subjectEntityId: entityId,
      limit: 50,
    });
    for (const c of contradictions) {
      events.push({
        id: `contra-${c.id}`,
        entityId,
        timestamp: c.detectedAt,
        eventType: 'CONTRADICTION_DETECTED',
        title: `Contradiction Detected: ${c.predicate}`,
        description: c.description || `Conflicting data for predicate ${c.predicate}`,
        status: c.status,
        provenance: 'SYSTEM',
      });
    }

    // Sort descending by timestamp by default (newest first)
    const isAsc = typeof entityIdOrOptions === 'object' && (entityIdOrOptions as any)?.order === 'asc';
    events.sort((a, b) => {
      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return isAsc ? -diff : diff;
    });

    return events;
  }
}
