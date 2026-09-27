/**
 * HṚṢĪKEŚA (हृषीकेश) — Research-to-Knowledge-Graph Bridge
 *
 * INT-006: Connects Research Studies, Findings, Evidence, and Citations into
 * the sovereign Knowledge Graph preserving provenance, confidence, and contradiction tracking.
 */

import { KnowledgeEntityRepository } from '../repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../repositories/knowledge-relationship.repository.js';
import { KnowledgeFactRepository } from '../repositories/knowledge-fact.repository.js';
import { KnowledgeEvidenceRepository } from '../repositories/knowledge-evidence.repository.js';
import { KnowledgeContradictionRepository } from '../repositories/knowledge-contradiction.repository.js';
import { EntityResolutionService } from './entity-resolution.service.js';
import { KnowledgeValidationService } from './knowledge-validation.service.js';
import {
  KnowledgeEntity,
  KnowledgeFact,
  KnowledgeScope,
} from '../interfaces/knowledge.types.js';
import {
  ResearchArtifactBundle,
  IResearchFinding,
  IResearchEvidence,
  IResearchSource,
} from '../../research/interfaces/research.types.js';

export interface IngestionReport {
  studyId: string;
  studyEntityId: string;
  entitiesResolved: number;
  factsCreated: number;
  evidenceLinked: number;
  contradictionsCreated: number;
}

export class ResearchKnowledgeBridgeService {
  private readonly entityRepo: KnowledgeEntityRepository;
  private readonly relRepo: KnowledgeRelationshipRepository;
  private readonly factRepo: KnowledgeFactRepository;
  private readonly evidenceRepo: KnowledgeEvidenceRepository;
  private readonly contradictionRepo: KnowledgeContradictionRepository;
  private readonly resolutionService: EntityResolutionService;
  protected readonly validationService: KnowledgeValidationService;

  constructor(
    entityRepo: KnowledgeEntityRepository,
    relRepo: KnowledgeRelationshipRepository,
    factRepo: KnowledgeFactRepository,
    evidenceRepo: KnowledgeEvidenceRepository,
    contradictionRepo: KnowledgeContradictionRepository,
    resolutionService: EntityResolutionService,
    validationService?: KnowledgeValidationService
  ) {
    this.entityRepo = entityRepo;
    this.relRepo = relRepo;
    this.factRepo = factRepo;
    this.evidenceRepo = evidenceRepo;
    this.contradictionRepo = contradictionRepo;
    this.resolutionService = resolutionService;
    this.validationService = validationService || new KnowledgeValidationService({} as any, {} as any);
  }

  /**
   * Ingests a completed Research Artifact Bundle into the Knowledge Graph.
   * Enforces:
   * 1. Provenance preservation: Every fact records provenance: 'RESEARCH' and sourceStudyId.
   * 2. Evidence validation: Never turn model inferences or opinions into source-backed facts.
   * 3. Contradiction preservation: Records structured conflicts with sourceA, sourceB, reason.
   */
  public async ingestResearchStudy(bundle: ResearchArtifactBundle): Promise<IngestionReport> {
    const studyId = bundle.studyId;
    const studyTitle = bundle.study?.title || `Research Study ${studyId}`;
    const scope: KnowledgeScope = bundle.study?.projectId
      ? 'PROJECT'
      : bundle.study?.companyId
      ? 'COMPANY'
      : 'GLOBAL';

    // 1. Resolve or create Study Entity
    let studyEntity = this.entityRepo.findByCanonicalName(studyTitle);
    if (!studyEntity) {
      studyEntity = this.entityRepo.createEntity({
        canonicalName: studyTitle,
        displayName: studyTitle,
        entityType: 'DOCUMENT',
        scope,
        description: bundle.study?.objective || `Research study on ${bundle.study?.question || studyTitle}`,
      });
    }

    let entitiesResolved = 1;
    let factsCreated = 0;
    let evidenceLinked = 0;
    let contradictionsCreated = 0;

    const sourceMap = new Map<string, IResearchSource>();
    for (const src of bundle.sources || bundle.sourcesJson || []) {
      sourceMap.set(src.id, src);
    }

    const evidenceMap = new Map<string, IResearchEvidence>();
    for (const ev of bundle.evidence || bundle.evidenceJson || []) {
      evidenceMap.set(ev.id, ev);
    }

    const createdFacts: KnowledgeFact[] = [];

    // 2. Process Findings
    const findings: IResearchFinding[] = bundle.findings || bundle.findingsJson || [];

    for (const finding of findings) {
      // Invariant: Never turn pure model inference or unsupported opinion into durable source-backed fact
      if (finding.findingType === 'INFERENCE' || finding.findingType === 'OPINION') {
        continue;
      }

      // Check if finding is supported by evidence
      const findingEvidenceIds = finding.evidenceIds || [];
      const findingSourceIds = finding.sourceIds || [];
      const hasBacking = findingEvidenceIds.length > 0 || findingSourceIds.length > 0;
      if (!hasBacking && finding.confidence < 0.8) {
        continue; // Unbacked low-confidence finding
      }

      const statement = finding.statement || finding.title || finding.description || '';
      const parsedCandidate = this.parseFindingStatement(statement, finding.title);

      // Resolve subject entity
      const subjectMatch = await this.resolutionService.resolveEntity(parsedCandidate.subject, {
        scope,
        entityType: 'CONCEPT',
        confidenceThreshold: 0.8,
      });

      let subjectEntity: KnowledgeEntity;
      if (subjectMatch.resolved && subjectMatch.entity) {
        subjectEntity = subjectMatch.entity;
      } else {
        subjectEntity = this.entityRepo.createEntity({
          canonicalName: parsedCandidate.subject,
          displayName: parsedCandidate.subject,
          entityType: 'CONCEPT',
          scope,
          description: `Entity extracted from research study: ${studyTitle}`,
        });
        entitiesResolved++;
      }

      // Create durable Knowledge Fact
      const fact = this.factRepo.createFact({
        subjectEntityId: subjectEntity.id,
        predicate: parsedCandidate.predicate,
        objectValue: parsedCandidate.objectValue,
        confidence: Math.min(1.0, Math.max(0.1, finding.confidence || 0.85)),
        status: 'ACTIVE',
        scope,
        provenance: 'RESEARCH',
        sourceStudyId: studyId,
        observedAt: bundle.generatedAt || new Date().toISOString(),
      });
      factsCreated++;
      createdFacts.push(fact);

      // Link Study Entity to Subject Entity (STUDY -> DISCOVERED -> SUBJECT)
      this.relRepo.createRelationship({
        sourceEntityId: studyEntity.id,
        relationshipType: 'DISCOVERED',
        targetEntityId: subjectEntity.id,
        scope,
        confidence: finding.confidence || 0.9,
      });

      // Link evidence
      for (const evId of findingEvidenceIds) {
        const ev = evidenceMap.get(evId);
        if (ev) {
          const src = sourceMap.get(ev.sourceId);
          this.evidenceRepo.createEvidence({
            factId: fact.id,
            sourceType: 'RESEARCH',
            sourceReference: src?.title || src?.url || ev.sourceId,
            quote: ev.quoteText || ev.supportingText,
            location: ev.location,
            retrievedAt: ev.retrievedAt || bundle.generatedAt || new Date().toISOString(),
            credibility: src?.credibilityTier === 'AUTHORITATIVE' ? 'AUTHORITATIVE' : 'PRIMARY',
            confidence: ev.confidence,
            provenance: 'RESEARCH',
            claimId: ev.id,
            studyId,
            url: src?.url,
            contentHash: src?.contentHash,
          });
          evidenceLinked++;
        }
      }

      // If no explicit evidence ID but sources exist, link primary source
      if (findingEvidenceIds.length === 0 && findingSourceIds.length > 0) {
        for (const sId of findingSourceIds) {
          const src = sourceMap.get(sId);
          if (src) {
            this.evidenceRepo.createEvidence({
              factId: fact.id,
              sourceType: 'RESEARCH',
              sourceReference: src.title || src.url,
              retrievedAt: src.retrievedAt || new Date().toISOString(),
              credibility: src.credibilityTier === 'AUTHORITATIVE' ? 'AUTHORITATIVE' : 'PRIMARY',
              confidence: finding.confidence,
              provenance: 'RESEARCH',
              studyId,
              url: src.url,
              contentHash: src.contentHash,
            });
            evidenceLinked++;
          }
        }
      }

      // 3. Handle Contradictions in findings
      if (
        finding.status === 'CONFLICTING' ||
        (finding.conflictingSourceIds && finding.conflictingSourceIds.length > 0) ||
        finding.contradictionNotes
      ) {
        const conflictingSources = (finding.conflictingSourceIds || [])
          .map((id) => sourceMap.get(id)?.title || sourceMap.get(id)?.url || id)
          .join(', ');
        const primarySources = (finding.corroboratingSourceIds || finding.sourceIds || [])
          .map((id) => sourceMap.get(id)?.title || sourceMap.get(id)?.url || id)
          .join(', ');

        this.contradictionRepo.createContradiction({
          subjectEntityId: subjectEntity.id,
          predicate: parsedCandidate.predicate,
          factIdA: fact.id,
          factIdB: fact.id, // self-conflicted or conflicting across sources
          sourceA: primarySources || 'Primary Source',
          sourceB: conflictingSources || 'Conflicting Sources',
          reason: finding.contradictionNotes || `Contradicting sources detected in study ${studyTitle}`,
          status: 'UNRESOLVED',
          detectedAt: new Date().toISOString(),
        });
        contradictionsCreated++;
      }
    }

    return {
      studyId,
      studyEntityId: studyEntity.id,
      entitiesResolved,
      factsCreated,
      evidenceLinked,
      contradictionsCreated,
    };
  }

  /**
   * Parses finding statement or title into subject, predicate, and objectValue.
   */
  private parseFindingStatement(
    statement: string,
    title: string
  ): { subject: string; predicate: string; objectValue: string } {
    const text = statement || title;
    
    // Pattern: Subject is/uses/provides Object
    const match = text.match(/^([^:–—\-]+?)\s+(is|uses|provides|supports|contains|features|requires|enables|implements)\s+(.+)$/i);
    if (match) {
      return {
        subject: match[1].trim(),
        predicate: match[2].trim().toLowerCase(),
        objectValue: match[3].trim(),
      };
    }

    // Pattern with colon: "Subject: Value"
    const colonMatch = text.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch) {
      return {
        subject: colonMatch[1].trim(),
        predicate: 'property',
        objectValue: colonMatch[2].trim(),
      };
    }

    return {
      subject: title.length > 3 && title.length < 50 ? title.trim() : 'Research Finding',
      predicate: 'statement',
      objectValue: text.trim(),
    };
  }
}
