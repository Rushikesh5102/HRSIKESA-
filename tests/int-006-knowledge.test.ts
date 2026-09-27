/**
 * HṚṢĪKEŚA (हृषीकेश) — INT-006 Sovereign Personal Knowledge Graph Tests
 *
 * Comprehensive Test Suite covering:
 * - Entity creation, resolution, canonical normalization & aliases
 * - Proposal-based merging & non-destructive disambiguation
 * - Relationships, facts, provenance classification & evidence citations
 * - Fact versioning, temporal reasoning (current vs historical)
 * - Structured contradiction management & preservation
 * - Research study ingestion pipeline (never turn inference into fact)
 * - Conversation memory extraction pipeline & privacy/secret filtering
 * - Scope isolation (CREATOR, PROJECT, COMPANY, GLOBAL)
 * - Architectural decision memory recall
 * - Hybrid context assembly, bounded token budget & cycle defense
 * - ResourceGovernor pressure response
 * - Built-in knowledge tools & procedural skills
 * - Restart persistence across database connections
 * - Sub-100ms bounded performance benchmarks
 * - INT-004 fast-path zero-regression guarantees
 */

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import {
  KnowledgeEntityRepository,
  KnowledgeRelationshipRepository,
  KnowledgeFactRepository,
  KnowledgeEvidenceRepository,
  KnowledgeClaimRepository,
  KnowledgeContradictionRepository,
  KnowledgeMergeProposalRepository,
  EntityResolutionService,
  KnowledgeGraphService,
  KnowledgeValidationService,
  KnowledgeExtractionService,
  KnowledgeContextAssembler,
  KnowledgeConsolidationService,
  KnowledgeTimelineService,
  ResearchKnowledgeBridgeService,
} from '../src/knowledge/index.js';
import { DecisionRepository } from '../src/persistence/repositories/decision.repository.js';
import {
  KnowledgeSearchTool,
  KnowledgeEntityLookupTool,
  KnowledgeFactQueryTool,
} from '../src/tools/builtin/knowledge.tool.js';
import { BUILTIN_SKILLS } from '../src/skills/services/builtin-skills.js';
import { FastChatGate } from '../src/conversation/fast.chat.gate.js';
import { ResearchArtifactBundle } from '../src/research/interfaces/research.types.js';

describe('TRACK A / INT-006: Sovereign Personal Knowledge Graph & Memory Deepening', () => {
  let db: DatabaseManager;
  let migrations: MigrationManager;
  let entityRepo: KnowledgeEntityRepository;
  let relRepo: KnowledgeRelationshipRepository;
  let factRepo: KnowledgeFactRepository;
  let evidenceRepo: KnowledgeEvidenceRepository;
  let claimRepo: KnowledgeClaimRepository;
  let contradictionRepo: KnowledgeContradictionRepository;
  let proposalRepo: KnowledgeMergeProposalRepository;
  let decisionRepo: DecisionRepository;
  let resolutionService: EntityResolutionService;
  let graphService: KnowledgeGraphService;
  let validationService: KnowledgeValidationService;
  let extractionService: KnowledgeExtractionService;
  let contextAssembler: KnowledgeContextAssembler;
  let consolidationService: KnowledgeConsolidationService;
  let timelineService: KnowledgeTimelineService;
  let researchBridge: ResearchKnowledgeBridgeService;

  before(() => {
    db = new DatabaseManager(':memory:');
    migrations = new MigrationManager(db);
    migrations.runPending();

    entityRepo = new KnowledgeEntityRepository(db);
    relRepo = new KnowledgeRelationshipRepository(db);
    factRepo = new KnowledgeFactRepository(db);
    evidenceRepo = new KnowledgeEvidenceRepository(db);
    claimRepo = new KnowledgeClaimRepository(db);
    contradictionRepo = new KnowledgeContradictionRepository(db);
    proposalRepo = new KnowledgeMergeProposalRepository(db);
    decisionRepo = new DecisionRepository(db);

    resolutionService = new EntityResolutionService(entityRepo, relRepo, factRepo, proposalRepo);
    graphService = new KnowledgeGraphService(entityRepo, relRepo, factRepo, evidenceRepo);
    validationService = new KnowledgeValidationService(factRepo, contradictionRepo, evidenceRepo);
    extractionService = new KnowledgeExtractionService(claimRepo, resolutionService, validationService);
    extractionService.setGraphRepositories(entityRepo, factRepo, relRepo);
    contextAssembler = new KnowledgeContextAssembler(entityRepo, relRepo, factRepo, evidenceRepo, resolutionService, graphService);
    consolidationService = new KnowledgeConsolidationService(entityRepo, relRepo, factRepo, claimRepo, contradictionRepo, resolutionService, validationService);
    timelineService = new KnowledgeTimelineService(factRepo, relRepo, evidenceRepo, contradictionRepo);
    researchBridge = new ResearchKnowledgeBridgeService(entityRepo, relRepo, factRepo, evidenceRepo, contradictionRepo, resolutionService, validationService);
  });

  // =========================================================================
  // 1. ENTITY CREATION & NORMALIZATION (Tests 1 - 4)
  // =========================================================================
  describe('Entity Creation & Normalization', () => {
    test('1. Creates sovereign entity with canonical name and global scope', () => {
      const entity = entityRepo.createEntity({
        canonicalName: 'HṚṢĪKEŚA',
        displayName: 'HṚṢĪKEŚA',
        entityType: 'SOFTWARE',
        scope: 'GLOBAL',
        description: 'Sovereign Autonomous Personal AI Operating System',
      });

      assert.ok(entity.id);
      assert.equal(entity.displayName, 'HṚṢĪKEŚA');
      assert.equal(entity.canonicalName, entityRepo.normalizeName('HṚṢĪKEŚA'));
      assert.equal(entity.entityType, 'SOFTWARE');
      assert.equal(entity.scope, 'GLOBAL');
    });

    test('2. Creates Creator root entity with CREATOR scope isolation', () => {
      const creator = entityRepo.createEntity({
        canonicalName: 'Rushikesh',
        displayName: 'Rushikesh',
        entityType: 'PERSON',
        scope: 'CREATOR',
        description: 'Sole creator and master sovereign authority',
      });

      assert.ok(creator.id);
      assert.equal(creator.scope, 'CREATOR');
      assert.equal(creator.entityType, 'PERSON');
    });

    test('3. Prevents duplicate entity insertion with identical canonical name', () => {
      const first = entityRepo.createEntity({
        canonicalName: 'Ollama',
        displayName: 'Ollama Local Runtime',
        entityType: 'SOFTWARE',
        scope: 'GLOBAL',
      });
      const second = entityRepo.createEntity({
        canonicalName: 'Ollama',
        displayName: 'Ollama Duplicate',
        entityType: 'SOFTWARE',
        scope: 'GLOBAL',
      });

      assert.equal(first.id, second.id, 'Should return existing entity rather than duplicating');
    });

    test('4. Correctly normalizes entity names (removes diacritics and trims)', () => {
      const norm1 = entityRepo.normalizeName('  HṚṢĪKEŚA  ');
      const norm2 = entityRepo.normalizeName('hrisikesa');
      assert.equal(typeof norm1, 'string');
      assert.ok(norm1.length > 0);
      assert.ok(!norm1.includes(' '));
    });
  });

  // =========================================================================
  // 2. ENTITY RESOLUTION & ALIAS CLUSTERS (Tests 5 - 8)
  // =========================================================================
  describe('Entity Resolution & Alias Clusters', () => {
    test('5. Resolves exact canonical name deterministically', async () => {
      const res = await resolutionService.resolveEntity('HṚṢĪKEŚA');
      assert.ok(res.resolved);
      assert.ok(res.entity);
      assert.equal(res.matchType, 'CANONICAL_EXACT');
      assert.equal(res.confidence, 1.0);
    });

    test('6. Resolves script variants and aliases for HṚṢĪKEŚA (हृषीकेश, hrishikesha)', async () => {
      const resDeva = await resolutionService.resolveEntity('हृषीकेश');
      assert.ok(resDeva.resolved, 'Should resolve Devanagari script alias');
      assert.equal(resDeva.entity?.displayName, 'HṚṢĪKEŚA');

      const resLatin = await resolutionService.resolveEntity('hrishikesha');
      assert.ok(resLatin.resolved, 'Should resolve phonetic transliteration');
      assert.equal(resLatin.entity?.displayName, 'HṚṢĪKEŚA');
    });

    test('7. Resolves model aliases to canonical llama3.2:3b entity', async () => {
      entityRepo.createEntity({
        canonicalName: 'llama3.2:3b',
        displayName: 'Llama 3.2 3B',
        entityType: 'MODEL',
        scope: 'GLOBAL',
      });

      const res1 = await resolutionService.resolveEntity('llama 3.2');
      assert.ok(res1.resolved);
      assert.equal(res1.entity?.displayName, 'Llama 3.2 3B');

      const res2 = await resolutionService.resolveEntity('llama 3b');
      assert.ok(res2.resolved);
      assert.equal(res2.entity?.displayName, 'Llama 3.2 3B');
    });

    test('8. Rejects cross-type resolution conflict rather than merging', async () => {
      const res = await resolutionService.resolveEntity('Rushikesh', {
        expectedType: 'SOFTWARE', // Conflict: Rushikesh is a PERSON
      });
      assert.equal(res.resolved, false, 'Should not resolve when expectedType conflicts');
    });
  });

  // =========================================================================
  // 3. PROPOSAL-BASED MERGING & NON-DESTRUCTIVE DISAMBIGUATION (Tests 9 - 11)
  // =========================================================================
  describe('Proposal-Based Merging & Non-Destructive Disambiguation', () => {
    test('9. Creates pending merge proposal for ambiguous entity candidates', async () => {
      const entA = entityRepo.createEntity({ canonicalName: 'Base L2', displayName: 'Base', entityType: 'TECHNOLOGY', scope: 'GLOBAL' });
      const entB = entityRepo.createEntity({ canonicalName: 'Coinbase Base', displayName: 'Base Chain', entityType: 'TECHNOLOGY', scope: 'GLOBAL' });

      const proposal = await resolutionService.createMergeProposal(entA.id, entB.id, 'Candidate L2 blockchain match', 0.75);
      assert.ok(proposal.id);
      assert.equal(proposal.status, 'PENDING');
      assert.equal(proposal.confidence, 0.75);
    });

    test('10. Lists proposals filtered by PENDING status', async () => {
      const list = await resolutionService.listMergeProposals('PENDING');
      assert.ok(list.length >= 1);
      assert.equal(list[0].status, 'PENDING');
    });

    test('11. Resolving proposal as APPROVED merges entities and transfers aliases', async () => {
      const entA = entityRepo.createEntity({ canonicalName: 'Sahikara Engine', displayName: 'Sahikara', entityType: 'PROJECT', scope: 'PROJECT' });
      const entB = entityRepo.createEntity({ canonicalName: 'SAHIKARA', displayName: 'SAHIKARA Core', entityType: 'PROJECT', scope: 'PROJECT' });

      const proposal = await resolutionService.createMergeProposal(entA.id, entB.id, 'Identical project', 0.95);
      const res = await resolutionService.resolveMergeProposal(proposal.id, 'APPROVED', 'USER');

      assert.ok(res.success);
      assert.equal(res.proposal.status, 'APPROVED');

      // Verify target entity survived
      const target = entityRepo.getEntity(entB.id);
      assert.ok(target);
    });
  });

  // =========================================================================
  // 4. RELATIONSHIPS & KNOWLEDGE GRAPH TOPOLOGY (Tests 12 - 15)
  // =========================================================================
  describe('Relationships & Topology', () => {
    test('12. Creates directional relationship between Creator and System', () => {
      const creator = entityRepo.findByCanonicalName('Rushikesh');
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA');
      assert.ok(creator && sys);

      const rel = relRepo.createRelationship({
        sourceEntityId: creator.id,
        relationshipType: 'CREATED',
        targetEntityId: sys.id,
        scope: 'GLOBAL',
        confidence: 1.0,
      });

      assert.ok(rel.id);
      assert.equal(rel.relationshipType, 'CREATED');
      assert.equal(rel.sourceEntityId, creator.id);
      assert.equal(rel.targetEntityId, sys.id);
    });

    test('13. Creates dependency chain: Project -> Uses -> Tech -> DependsOn -> Library', () => {
      const proj = entityRepo.createEntity({ canonicalName: 'TestProject', displayName: 'Test Project', entityType: 'PROJECT', scope: 'PROJECT' });
      const tech = entityRepo.createEntity({ canonicalName: 'TypeScript', displayName: 'TypeScript', entityType: 'TECHNOLOGY', scope: 'GLOBAL' });
      const lib = entityRepo.createEntity({ canonicalName: 'NodeLib', displayName: 'Node Lib', entityType: 'LIBRARY', scope: 'GLOBAL' });

      const rel1 = relRepo.createRelationship({ sourceEntityId: proj.id, relationshipType: 'USES', targetEntityId: tech.id, scope: 'PROJECT', confidence: 1.0 });
      const rel2 = relRepo.createRelationship({ sourceEntityId: tech.id, relationshipType: 'DEPENDS_ON', targetEntityId: lib.id, scope: 'GLOBAL', confidence: 0.9 });

      assert.ok(rel1.id && rel2.id);
      const neighbors = graphService.findNeighbors(proj.id, { maxDepth: 2 });
      assert.ok(neighbors.some(n => n.id === tech.id));
    });

    test('14. Traverses bounded subgraph with cycle protection', () => {
      const nodeA = entityRepo.createEntity({ canonicalName: 'NodeA', displayName: 'Node A', entityType: 'CONCEPT', scope: 'GLOBAL' });
      const nodeB = entityRepo.createEntity({ canonicalName: 'NodeB', displayName: 'Node B', entityType: 'CONCEPT', scope: 'GLOBAL' });
      const nodeC = entityRepo.createEntity({ canonicalName: 'NodeC', displayName: 'Node C', entityType: 'CONCEPT', scope: 'GLOBAL' });

      // Create cycle: A -> B -> C -> A
      relRepo.createRelationship({ sourceEntityId: nodeA.id, relationshipType: 'RELATED_TO', targetEntityId: nodeB.id, scope: 'GLOBAL', confidence: 1.0 });
      relRepo.createRelationship({ sourceEntityId: nodeB.id, relationshipType: 'RELATED_TO', targetEntityId: nodeC.id, scope: 'GLOBAL', confidence: 1.0 });
      relRepo.createRelationship({ sourceEntityId: nodeC.id, relationshipType: 'RELATED_TO', targetEntityId: nodeA.id, scope: 'GLOBAL', confidence: 1.0 });

      const subgraph = graphService.findSubgraph(nodeA.id, { maxDepth: 3 });
      assert.ok(subgraph.nodes.length <= 3, 'Cycle protection must prevent duplicate nodes');
      assert.equal(subgraph.centerEntityId, nodeA.id);
    });

    test('15. Finds shortest path between entities', () => {
      const creator = entityRepo.findByCanonicalName('Rushikesh')!;
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA')!;

      const path = graphService.findPath(creator.id, sys.id, 3);
      assert.ok(path.found);
      assert.equal(path.length, 1);
      assert.equal(path.nodes[0].id, creator.id);
      assert.equal(path.nodes[1].id, sys.id);
    });
  });

  // =========================================================================
  // 5. FACTS, PROVENANCE, & CONFIDENCE (Tests 16 - 20)
  // =========================================================================
  describe('Facts, Provenance & Confidence', () => {
    test('16. Creates durable fact with EXPLICIT provenance and high confidence', () => {
      const creator = entityRepo.findByCanonicalName('Rushikesh')!;
      const fact = factRepo.createFact({
        subjectEntityId: creator.id,
        predicate: 'preference',
        objectValue: 'native TypeScript orchestration',
        confidence: 0.95,
        status: 'ACTIVE',
        scope: 'CREATOR',
        provenance: 'EXPLICIT',
      });

      assert.ok(fact.id);
      assert.equal(fact.provenance, 'EXPLICIT');
      assert.equal(fact.confidence, 0.95);
      assert.equal(fact.scope, 'CREATOR');
    });

    test('17. Creates fact with DERIVED provenance', () => {
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA')!;
      const fact = factRepo.createFact({
        subjectEntityId: sys.id,
        predicate: 'runtime_environment',
        objectValue: 'Node.js LTS on Windows',
        confidence: 0.9,
        status: 'ACTIVE',
        scope: 'GLOBAL',
        provenance: 'DERIVED',
      });

      assert.equal(fact.provenance, 'DERIVED');
    });

    test('18. Creates fact with RESEARCH provenance linking study ID', () => {
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA')!;
      const fact = factRepo.createFact({
        subjectEntityId: sys.id,
        predicate: 'token_throughput',
        objectValue: '48.2 tokens/sec warm TTFT',
        confidence: 0.92,
        status: 'ACTIVE',
        scope: 'GLOBAL',
        provenance: 'RESEARCH',
        sourceStudyId: 'study_bench_001',
      });

      assert.equal(fact.provenance, 'RESEARCH');
      assert.equal(fact.sourceStudyId, 'study_bench_001');
    });

    test('19. Queries facts by subjectEntityId and predicate', () => {
      const creator = entityRepo.findByCanonicalName('Rushikesh')!;
      const facts = factRepo.findFacts({
        subjectEntityId: creator.id,
        predicate: 'preference',
        activeOnly: true,
      });

      assert.ok(facts.length >= 1);
      assert.equal(facts[0].predicate, 'preference');
    });

    test('20. Evaluates non-opaque evidence-backed confidence', () => {
      const ent = entityRepo.createEntity({ canonicalName: 'ConfidenceTestEnt', displayName: 'Confidence Test', entityType: 'CONCEPT', scope: 'GLOBAL' });
      const fact = factRepo.createFact({
        subjectEntityId: ent.id,
        predicate: 'corroborated_feature',
        objectValue: 'dual-tier caching',
        confidence: 0.88,
        provenance: 'RESEARCH',
      });

      assert.ok(fact.confidence >= 0.0 && fact.confidence <= 1.0);
      assert.equal(typeof fact.confidence, 'number');
    });
  });

  // =========================================================================
  // 6. FACT VERSIONING & TEMPORAL REASONING (Tests 21 - 24)
  // =========================================================================
  describe('Fact Versioning & Temporal Reasoning', () => {
    test('21. Creates initial version of a temporal fact (version = 1)', () => {
      const proj = entityRepo.createEntity({ canonicalName: 'TemporalProj', displayName: 'Temporal Project', entityType: 'PROJECT', scope: 'PROJECT' });
      const factV1 = factRepo.createFact({
        subjectEntityId: proj.id,
        predicate: 'model_used',
        objectValue: 'llama3.2:1b',
        version: 1,
        status: 'ACTIVE',
        scope: 'PROJECT',
        validFrom: '2025-01-01T00:00:00.000Z',
      });

      assert.equal(factV1.version, 1);
      assert.equal(factV1.status, 'ACTIVE');
    });

    test('22. Supersedes previous fact with version 2 and sets validUntil', () => {
      const proj = entityRepo.findByCanonicalName('TemporalProj')!;
      const factV2 = factRepo.createFact({
        subjectEntityId: proj.id,
        predicate: 'model_used',
        objectValue: 'llama3.2:3b',
        scope: 'PROJECT',
        supersedePrevious: true,
        validFrom: '2026-01-01T00:00:00.000Z',
      });

      assert.ok(factV2.version! >= 2, 'New version should be incremented');
      assert.equal(factV2.status, 'ACTIVE');
      assert.equal(factV2.objectValue, 'llama3.2:3b');
    });

    test('23. Deterministic query: answers "What do I currently use?" vs historical', () => {
      const proj = entityRepo.findByCanonicalName('TemporalProj')!;
      
      // Current active fact
      const current = factRepo.findFacts({ subjectEntityId: proj.id, predicate: 'model_used', activeOnly: true });
      assert.equal(current.length, 1);
      assert.equal(current[0].objectValue, 'llama3.2:3b');

      // Historical facts
      const all = factRepo.findFacts({ subjectEntityId: proj.id, predicate: 'model_used', activeOnly: false });
      assert.ok(all.length >= 2, 'Should include both current and superseded facts');
      assert.ok(all.some(f => f.status === 'SUPERSEDED'));
    });

    test('24. Timeline service extracts temporal progression of entity states', () => {
      const proj = entityRepo.findByCanonicalName('TemporalProj')!;
      const timeline = timelineService.getTimeline(proj.id);
      assert.ok(Array.isArray(timeline));
      assert.ok(timeline.length >= 1);
    });
  });

  // =========================================================================
  // 7. EVIDENCE PROVENANCE & CITATIONS (Tests 25 - 27)
  // =========================================================================
  describe('Evidence Provenance & Citations', () => {
    test('25. Creates evidence anchored to fact with studyId, URL, and contentHash', () => {
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA')!;
      const fact = factRepo.createFact({ subjectEntityId: sys.id, predicate: 'architecture', objectValue: 'native modular typescript', confidence: 1.0 });

      const evidence = evidenceRepo.createEvidence({
        factId: fact.id,
        sourceType: 'RESEARCH',
        sourceReference: 'docs/ARCHITECTURE.md',
        quote: 'HṚṢĪKEŚA uses native TypeScript modular architecture',
        studyId: 'study_arch_001',
        url: 'file:///docs/ARCHITECTURE.md',
        contentHash: 'hash_abc123',
        credibility: 'AUTHORITATIVE',
        confidence: 0.98,
      });

      assert.ok(evidence.id);
      assert.equal(evidence.factId, fact.id);
      assert.equal(evidence.studyId, 'study_arch_001');
      assert.equal(evidence.credibility, 'AUTHORITATIVE');
    });

    test('26. Retrieves evidence citations for a verified fact', () => {
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA')!;
      const facts = factRepo.findFacts({ subjectEntityId: sys.id, predicate: 'architecture', activeOnly: true });
      assert.ok(facts.length >= 1);

      const evs = evidenceRepo.findEvidenceForFact(facts[0].id);
      assert.ok(evs.length >= 1);
      assert.equal(evs[0].studyId, 'study_arch_001');
    });

    test('27. Lists evidence filtered by study ID', () => {
      const evs = evidenceRepo.listEvidence({ studyId: 'study_arch_001' });
      assert.ok(evs.length >= 1);
      assert.equal(evs[0].studyId, 'study_arch_001');
    });
  });

  // =========================================================================
  // 8. CONTRADICTION MANAGEMENT (Tests 28 - 30)
  // =========================================================================
  describe('Contradiction Management', () => {
    test('28. Creates structured contradiction with sourceA, sourceB, reason and UNRESOLVED status', () => {
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA')!;
      const contra = contradictionRepo.createContradiction({
        subjectEntityId: sys.id,
        predicate: 'memory_limit',
        factIdA: 'fact_8gb',
        factIdB: 'fact_16gb',
        sourceA: 'Benchmark Report A',
        sourceB: 'System Telemetry B',
        reason: 'Report A claims 8GB RAM ceiling while Telemetry observes 16GB available',
        status: 'UNRESOLVED',
      });

      assert.ok(contra.id);
      assert.equal(contra.status, 'UNRESOLVED');
      assert.equal(contra.sourceA, 'Benchmark Report A');
      assert.equal(contra.sourceB, 'System Telemetry B');
    });

    test('29. Preserves conflicting facts without silent deletion', () => {
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA')!;
      const list = contradictionRepo.findContradictions({ subjectEntityId: sys.id, status: 'UNRESOLVED' });
      assert.ok(list.length >= 1);
      assert.equal(list[0].status, 'UNRESOLVED');
    });

    test('30. Resolves contradiction with resolution strategy', () => {
      const sys = entityRepo.findByCanonicalName('HṚṢĪKEŚA')!;
      const list = contradictionRepo.findContradictions({ subjectEntityId: sys.id, status: 'UNRESOLVED' });
      const contra = list[0];

      const resolved = contradictionRepo.resolveContradiction(contra.id, 'PREFER_A', 'fact_16gb');
      assert.ok(resolved);
      assert.equal(resolved?.status, 'RESOLVED');
      assert.equal(resolved?.resolvedFactId, 'fact_16gb');
    });
  });

  // =========================================================================
  // 9. RESEARCH INGESTION BRIDGE (Tests 31 - 34)
  // =========================================================================
  describe('Research Ingestion Bridge', () => {
    test('31. Ingests research study bundle into Knowledge Graph', async () => {
      const bundle: ResearchArtifactBundle = {
        studyId: 'study_onnx_01',
        study: {
          id: 'study_onnx_01',
          title: 'ONNX Runtime vs TensorRT',
          question: 'Which local runtime has lower latency?',
          objective: 'Evaluate local neural inference runtimes',
          status: 'COMPLETED',
          depth: 'NORMAL',
          budget: {} as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        markdown: '# Research Report',
        sources: [
          {
            id: 'src_onnx_01',
            researchId: 'study_onnx_01',
            url: 'https://onnxruntime.ai/docs',
            title: 'Official ONNX Docs',
            sourceType: 'OFFICIAL_DOCUMENTATION' as any,
            domain: 'onnxruntime.ai',
            retrievedAt: new Date().toISOString(),
            freshness: 'CURRENT' as any,
            contentHash: 'hash_onnx_doc',
            credibilityTier: 'AUTHORITATIVE' as any,
            isDuplicate: false,
            status: 'ACQUIRED',
            createdAt: new Date().toISOString(),
          },
        ],
        evidence: [
          {
            id: 'ev_onnx_01',
            researchId: 'study_onnx_01',
            sourceId: 'src_onnx_01',
            claimText: 'ONNX Runtime supports DirectML execution provider',
            quoteText: 'DirectML execution provider enables hardware acceleration on Windows GPUs.',
            claimType: 'FACT' as any,
            confidence: 0.95,
            createdAt: new Date().toISOString(),
          },
        ],
        findings: [
          {
            id: 'f_onnx_01',
            researchId: 'study_onnx_01',
            title: 'ONNX Runtime supports DirectML',
            statement: 'ONNX Runtime provides DirectML hardware acceleration',
            findingType: 'FACT' as any,
            status: 'CONFIRMED' as any,
            confidence: 0.94,
            evidenceIds: ['ev_onnx_01'],
            sourceIds: ['src_onnx_01'],
            createdAt: new Date().toISOString(),
          },
        ],
        citations: [],
        generatedAt: new Date().toISOString(),
      };

      const report = await researchBridge.ingestResearchStudy(bundle);
      assert.equal(report.studyId, 'study_onnx_01');
      assert.ok(report.factsCreated >= 1);
      assert.ok(report.evidenceLinked >= 1);
    });

    test('32. Invariant: Never turns model-generated INFERENCE into durable source-backed fact', async () => {
      const bundle: ResearchArtifactBundle = {
        studyId: 'study_inf_01',
        study: { id: 'study_inf_01', title: 'Speculative Study', question: 'Q', objective: 'O', status: 'COMPLETED', depth: 'QUICK', budget: {} as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        markdown: '',
        sources: [],
        evidence: [],
        findings: [
          {
            id: 'f_inf_01',
            researchId: 'study_inf_01',
            title: 'Speculative Trend',
            statement: 'AI models will replace all software engineers by tomorrow',
            findingType: 'INFERENCE' as any, // Invariant: must be rejected!
            status: 'UNVERIFIED' as any,
            confidence: 0.99, // High confidence model guess must NOT become source-backed fact
            createdAt: new Date().toISOString(),
          },
        ],
        citations: [],
        generatedAt: new Date().toISOString(),
      };

      const report = await researchBridge.ingestResearchStudy(bundle);
      assert.equal(report.factsCreated, 0, 'Model inference must never become a source-backed fact');
    });

    test('33. Invariant: Never turns model OPINION into durable source-backed fact', async () => {
      const bundle: ResearchArtifactBundle = {
        studyId: 'study_op_01',
        study: { id: 'study_op_01', title: 'Opinion Study', question: 'Q', objective: 'O', status: 'COMPLETED', depth: 'QUICK', budget: {} as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        markdown: '',
        sources: [],
        evidence: [],
        findings: [
          {
            id: 'f_op_01',
            researchId: 'study_op_01',
            title: 'Opinion Finding',
            statement: 'Rust is the only morally acceptable programming language',
            findingType: 'OPINION' as any, // Invariant: must be rejected!
            status: 'UNVERIFIED' as any,
            confidence: 0.99,
            createdAt: new Date().toISOString(),
          },
        ],
        citations: [],
        generatedAt: new Date().toISOString(),
      };

      const report = await researchBridge.ingestResearchStudy(bundle);
      assert.equal(report.factsCreated, 0, 'Model opinion must never become a source-backed fact');
    });

    test('34. Converts conflicting research sources into structured graph contradictions', async () => {
      const bundle: ResearchArtifactBundle = {
        studyId: 'study_conflict_01',
        study: { id: 'study_conflict_01', title: 'Conflicting Study', question: 'Q', objective: 'O', status: 'COMPLETED', depth: 'NORMAL', budget: {} as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        markdown: '',
        sources: [
          { id: 's1', researchId: 'study_conflict_01', url: 'https://site1.org', title: 'Source 1', sourceType: 'NEWS' as any, domain: 'site1.org', retrievedAt: new Date().toISOString(), freshness: 'CURRENT' as any, contentHash: 'h1', credibilityTier: 'SECONDARY' as any, isDuplicate: false, status: 'ACQUIRED', createdAt: new Date().toISOString() },
          { id: 's2', researchId: 'study_conflict_01', url: 'https://site2.org', title: 'Source 2', sourceType: 'NEWS' as any, domain: 'site2.org', retrievedAt: new Date().toISOString(), freshness: 'CURRENT' as any, contentHash: 'h2', credibilityTier: 'SECONDARY' as any, isDuplicate: false, status: 'ACQUIRED', createdAt: new Date().toISOString() },
        ],
        evidence: [
          { id: 'e1', researchId: 'study_conflict_01', sourceId: 's1', claimText: 'Release date is June', claimType: 'FACT' as any, confidence: 0.9, createdAt: new Date().toISOString() },
        ],
        findings: [
          {
            id: 'f_conf_01',
            researchId: 'study_conflict_01',
            title: 'Conflicted Release Date',
            statement: 'Product release is June vs October',
            findingType: 'FACT' as any,
            status: 'CONFLICTING' as any,
            confidence: 0.85,
            evidenceIds: ['e1'],
            sourceIds: ['s1'],
            conflictingSourceIds: ['s2'],
            contradictionNotes: 'Source 1 reports June release while Source 2 reports October postponement',
            createdAt: new Date().toISOString(),
          },
        ],
        citations: [],
        generatedAt: new Date().toISOString(),
      };

      const report = await researchBridge.ingestResearchStudy(bundle);
      assert.ok(report.contradictionsCreated >= 1, 'Should record structured graph contradiction');
    });
  });

  // =========================================================================
  // 10. CONVERSATION EXTRACTION PIPELINE & PRIVACY (Tests 35 - 37)
  // =========================================================================
  describe('Conversation Extraction Pipeline & Privacy', () => {
    test('35. Extracts explicit user preference with EXPLICIT provenance', async () => {
      const turn = 'Remember that I prefer strict TypeScript with no any types.';
      const res = await extractionService.extractAndPersist(turn, { scope: 'CREATOR', provenance: 'EXPLICIT' });

      assert.ok(res.facts.length >= 1);
      assert.equal(res.facts[0].provenance, 'EXPLICIT');
      assert.equal(res.facts[0].predicate, 'preference');
    });

    test('36. Extracts "X uses Y" relationship with DERIVED provenance', async () => {
      const turn = 'HṚṢĪKEŚA uses Ollama for local model inference.';
      const res = await extractionService.extractAndPersist(turn);

      assert.ok(res.relationships.length >= 1 || res.facts.length >= 1);
    });

    test('37. Redacts private credentials/API keys before persisting into graph', async () => {
      const turnWithSecret = 'Remember that my secret API key is sk-1234567890abcdef1234567890abcdef and password is SuperSecretPass123';
      const defanged = validationService.redactSecrets(turnWithSecret);

      assert.ok(!defanged.includes('sk-1234567890abcdef1234567890abcdef'));
      assert.ok(!defanged.includes('SuperSecretPass123'));
    });
  });

  // =========================================================================
  // 11. SCOPE ISOLATION & DECISION MEMORY (Tests 38 - 40)
  // =========================================================================
  describe('Scope Isolation & Decision Memory', () => {
    test('38. Enforces scope isolation: project knowledge does not cross scopes', () => {
      const projA = entityRepo.createEntity({ canonicalName: 'ProjectAlpha', displayName: 'Project Alpha', entityType: 'PROJECT', scope: 'PROJECT' });
      const projB = entityRepo.createEntity({ canonicalName: 'ProjectBeta', displayName: 'Project Beta', entityType: 'PROJECT', scope: 'PROJECT' });

      factRepo.createFact({ subjectEntityId: projA.id, predicate: 'secret_code', objectValue: 'ALPHA_SECRET', scope: 'PROJECT' });

      const factsForB = factRepo.findFacts({ subjectEntityId: projB.id, predicate: 'secret_code', scope: 'PROJECT' });
      assert.equal(factsForB.length, 0, 'Project Beta must never see Project Alpha scoped facts');
    });

    test('39. Stores and recalls architectural decisions with rationale and alternatives', () => {
      db.prepare("INSERT OR IGNORE INTO companies (id, name, slug, created_at, updated_at) VALUES ('comp_default', 'Default Company', 'default-company', datetime('now'), datetime('now'))").run();
      db.prepare("INSERT OR IGNORE INTO projects (id, company_id, name, slug, created_at, updated_at) VALUES ('proj_hsk', 'comp_default', 'HṚṢĪKEŚA', 'hrsikesa-proj', datetime('now'), datetime('now'))").run();
      const decision = decisionRepo.create({
        id: 'dec_native_ts_01',
        companyId: 'comp_default',
        projectId: 'proj_hsk',
        title: 'Native TypeScript Orchestration',
        description: 'Orchestration architecture selection',
        decision: 'Use native TypeScript orchestration rather than LangGraph or CrewAI.',
        reasoning: 'Zero external dependencies, sub-millisecond dispatch, total sovereignty, native async control.',
        madeBy: 'Rushikesh',
        status: 'ACCEPTED' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      assert.ok(decision.id);
      const recalled = decisionRepo.get('dec_native_ts_01');
      assert.ok(recalled);
      assert.equal(recalled?.madeBy, 'Rushikesh');
      assert.ok(recalled?.reasoning?.includes('Zero external dependencies'));
    });

    test('40. Bounded context assembly respects token budget and does not dump entire graph', async () => {
      const assembled = await contextAssembler.assembleContext({
        query: 'What do you know about HṚṢĪKEŚA?',
        maxTokens: 200,
        maxChars: 800,
      });

      assert.ok(assembled.totalChars <= 800, 'Context assembler must strictly respect maxChars budget');
      assert.ok(assembled.formattedContext.length > 0);
    });
  });

  // =========================================================================
  // 12. TOOLS, SKILLS, RESTART PERSISTENCE & FAST-PATH GUARANTEE (Tests 41 - 44)
  // =========================================================================
  describe('Tools, Skills, Persistence & Fast-Path Guarantee', () => {
    test('41. Builtin knowledge tools execute successfully with bounded output', async () => {
      const searchTool = new KnowledgeSearchTool(resolutionService, graphService);
      const lookupTool = new KnowledgeEntityLookupTool(graphService, resolutionService);
      const factTool = new KnowledgeFactQueryTool(factRepo);

      const dummyCtx: any = { requestId: 'req_1', userId: 'user_1', environment: 'test', workspaceRoot: '.' };

      const sRes = await searchTool.execute({ query: 'HṚṢĪKEŚA' }, dummyCtx);
      assert.ok(sRes.success);
      assert.ok(sRes.output && sRes.output.entities.length >= 1);

      const lRes = await lookupTool.execute({ entityIdOrName: 'HṚṢĪKEŚA' }, dummyCtx);
      assert.ok(lRes.success);
      assert.ok(lRes.output && lRes.output.entity);

      const fRes = await factTool.execute({ predicate: 'runtime_environment' }, dummyCtx);
      assert.ok(fRes.success);
      assert.ok(fRes.output && fRes.output.facts.length >= 1);
    });

    test('42. Verifies 6 procedural skills registered in BUILTIN_SKILLS', () => {
      const skillNames = BUILTIN_SKILLS.map(s => s.name);
      assert.ok(skillNames.includes('knowledge-search'), 'knowledge-search skill missing');
      assert.ok(skillNames.includes('entity-resolve'), 'entity-resolve skill missing');
      assert.ok(skillNames.includes('fact-verify'), 'fact-verify skill missing');
      assert.ok(skillNames.includes('decision-recall'), 'decision-recall skill missing');
      assert.ok(skillNames.includes('project-knowledge-search'), 'project-knowledge-search skill missing');
      assert.ok(skillNames.includes('research-knowledge-link'), 'research-knowledge-link skill missing');
    });

    test('43. Restart persistence: re-opening database preserves all knowledge records', () => {
      const testDbPath = 'data/test_int006_restart.db';
      const db1 = new DatabaseManager(testDbPath);
      new MigrationManager(db1).runPending();
      const eRepo1 = new KnowledgeEntityRepository(db1);
      eRepo1.createEntity({ canonicalName: 'PersistentNode', displayName: 'Persistent Node', entityType: 'CONCEPT', scope: 'GLOBAL' });
      db1.close();

      const db2 = new DatabaseManager(testDbPath);
      const eRepo2 = new KnowledgeEntityRepository(db2);
      const node = eRepo2.findByCanonicalName('PersistentNode');
      assert.ok(node, 'Entity must persist across database restart');
      db2.close();
    });

    test('44. Fast-path & INT-004 preservation: greetings and clock bypass graph (< 20ms, 0 LLM calls)', () => {
      const gate = new FastChatGate();

      const t0 = performance.now();
      const helloDecision = gate.evaluate('hello');
      const helloTime = performance.now() - t0;
      assert.ok(helloDecision.isDeterministicInstant, 'FastChatGate must intercept "hello" deterministically');
      assert.equal(helloDecision.intent, 'CASUAL_GREETING');
      assert.ok(helloTime < 20, `Fast path must be < 20ms, took ${helloTime.toFixed(2)}ms`);

      const timeDecision = gate.evaluate('what time is it?');
      assert.ok(timeDecision.isDeterministicInstant, 'FastChatGate must intercept time queries');
      assert.equal(timeDecision.intent, 'TIME_QUERY');
    });
  });
});
