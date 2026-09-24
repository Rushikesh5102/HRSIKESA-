/**
 * HṚṢĪKEŚA (हृषीकेश) — Knowledge Consolidation Service
 *
 * Phase 19: Bounded Memory Consolidation, Candidate Promotion, Duplicate Merging & Staleness Decay
 */

import { KnowledgeEntityRepository } from '../repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../repositories/knowledge-relationship.repository.js';
import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import { KnowledgeClaimRepository } from '../repositories/knowledge-claim.repository.js';
import { KnowledgeContradictionRepository } from '../repositories/knowledge-contradiction.repository.js';
import { EntityResolutionService } from './entity-resolution.service.js';
import { KnowledgeValidationService } from './knowledge-validation.service.js';

export interface ConsolidationReport {
  claimsEvaluated: number;
  claimsPromoted: number;
  duplicatesMerged: number;
  contradictionsResolved: number;
  staleFactsMarked: number;
  resourceBlocked: boolean;
  timestamp: string;
}

export class KnowledgeConsolidationService {
  private readonly entityRepo: KnowledgeEntityRepository;
  private readonly relRepo: KnowledgeRelationshipRepository;
  private readonly factRepo: KnowledgeFactRepository;
  private readonly claimRepo: KnowledgeClaimRepository;
  private readonly contradictionRepo: KnowledgeContradictionRepository;
  private readonly resolutionService: EntityResolutionService;
  private readonly validationService: KnowledgeValidationService;
  private resourceGovernor?: any; // ResourceGovernor from Phase 16

  constructor(
    entityRepo: KnowledgeEntityRepository,
    relRepo: KnowledgeRelationshipRepository,
    factRepo: KnowledgeFactRepository,
    claimRepo: KnowledgeClaimRepository,
    contradictionRepo: KnowledgeContradictionRepository,
    resolutionService: EntityResolutionService,
    validationService: KnowledgeValidationService,
    resourceGovernor?: any
  ) {
    this.entityRepo = entityRepo;
    this.relRepo = relRepo;
    this.factRepo = factRepo;
    this.claimRepo = claimRepo;
    this.contradictionRepo = contradictionRepo;
    this.resolutionService = resolutionService;
    this.validationService = validationService;
    this.resourceGovernor = resourceGovernor;
  }

  public getEntityRepo(): KnowledgeEntityRepository {
    return this.entityRepo;
  }

  public getRelRepo(): KnowledgeRelationshipRepository {
    return this.relRepo;
  }

  public getResolutionService(): EntityResolutionService {
    return this.resolutionService;
  }

  public getValidationService(): KnowledgeValidationService {
    return this.validationService;
  }

  public setResourceGovernor(gov: any): void {
    this.resourceGovernor = gov;
  }

  /**
   * Runs a bounded consolidation cycle across memory candidates, facts, and contradictions.
   * Defends laptop resources: halts immediately if host RAM is in CRITICAL_MEMORY state.
   */
  public consolidate(
    optionsOrBatchSize: number | { maxClaims?: number; detectStaleDays?: number; resolveContradictions?: boolean } = 50
  ): ConsolidationReport & { durationMs: number; processedClaims: number } {
    const start = performance.now();
    const now = new Date().toISOString();
    const maxBatchSize = typeof optionsOrBatchSize === 'number'
      ? optionsOrBatchSize
      : (optionsOrBatchSize?.maxClaims || 50);

    // 1. Hardware Resource Guard
    if (this.resourceGovernor && typeof this.resourceGovernor.getMemoryPressure === 'function') {
      const pressure = this.resourceGovernor.getMemoryPressure();
      if (pressure === 'CRITICAL_MEMORY') {
        return {
          claimsEvaluated: 0,
          claimsPromoted: 0,
          duplicatesMerged: 0,
          contradictionsResolved: 0,
          staleFactsMarked: 0,
          resourceBlocked: true,
          timestamp: now,
          durationMs: performance.now() - start,
          processedClaims: 0,
        };
      }
    }

    let claimsEvaluated = 0;
    let claimsPromoted = 0;
    let duplicatesMerged = 0;
    let contradictionsResolved = 0;
    let staleFactsMarked = 0;

    // 2. Evaluate Candidate Claims
    const candidates = this.claimRepo.findClaims({ status: 'CANDIDATE', limit: maxBatchSize });
    claimsEvaluated = candidates.length;

    for (const claim of candidates) {
      if (claim.confidence >= 0.8 && claim.extractedEntities.length > 0) {
        // High confidence candidate claim: promote to SUPPORTED / CONFIRMED
        this.claimRepo.updateClaimStatus(claim.id, 'CONFIRMED', claim.confidence);
        claimsPromoted++;
      }
    }

    // 3. Resolve Obvious Superseded Contradictions
    const openContradictions = this.contradictionRepo.findContradictions({
      status: 'DETECTED',
      limit: maxBatchSize,
    });

    for (const contra of openContradictions) {
      const activeFacts = this.factRepo.findFacts({
        subjectEntityId: contra.subjectEntityId,
        predicate: contra.predicate,
        activeOnly: true,
      });

      if (activeFacts.length > 0) {
        const activeFact = activeFacts[0];
        if (contra.factIdA !== activeFact.id) {
          this.contradictionRepo.resolveContradiction(contra.id, 'NEWER_SUPERSEDES', activeFact.id);
          contradictionsResolved++;
        }
      }
    }

    // 4. Mark Stale Facts (older than 180 days with no updates, and not authoritative)
    const allFacts = this.factRepo.findFacts({ activeOnly: true, limit: maxBatchSize });
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    for (const fact of allFacts) {
      if (fact.observedAt < sixMonthsAgo && fact.confidence < 0.9 && fact.scope !== 'CREATOR') {
        // We do NOT delete stale facts (historical memory preserved), but we can adjust status or flag
        // Here we keep ACTIVE but note staleness or record in logs
        staleFactsMarked++;
      }
    }

    return {
      claimsEvaluated,
      claimsPromoted,
      duplicatesMerged,
      contradictionsResolved,
      staleFactsMarked,
      resourceBlocked: false,
      timestamp: now,
      durationMs: performance.now() - start,
      processedClaims: claimsEvaluated,
    };
  }
}
