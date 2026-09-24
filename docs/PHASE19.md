# HṚṢĪKEŚA — PHASE 19: ADVANCED MEMORY & KNOWLEDGE GRAPH

## Executive Summary
Phase 19 transforms HṚṢĪKEŚA's persistent and semantic memory architecture into a structured, temporal, provenance-aware knowledge graph. Rather than simply storing flat text snippets or relying on hallucination-prone LLM memories, HṚṢĪKEŚA maintains an authoritative, deterministic graph of real-world entities, relationships, facts, evidence citations, and temporal histories backed by native SQLite tables and recursive graph traversal.

## Core Architectural Invariants
1. **Deterministic Structure + Semantic Retrieval**: Exact canonical matching, aliases, and directional relationships form the backbone; vector embeddings provide discovery entrypoints.
2. **Local-First & Windows-First**: Native SQLite relational graph schema (`010_knowledge_graph_schema.ts`) using recursive CTEs; zero heavy external database processes (Neo4j, Postgres, Redis, Docker avoided).
3. **Strict Non-Authoritative LLM Extraction**: LLMs generate *candidate claims* only. Claims must pass deterministic schema validation, credential redaction, and contradiction detection before becoming confirmed facts.
4. **Temporal Fact Versioning**: Non-destructive history; historical beliefs are preserved under `SUPERSEDED` / `EXPIRED` status with explicit `validFrom` and `validUntil` timestamps.
5. **Multi-Tier Scope Isolation**: Strict boundaries between `GLOBAL`, `CREATOR`, `COMPANY`, `PROJECT`, `DEPARTMENT`, `AGENT`, `MISSION`, and `TASK` scopes.
6. **Provenance & Confidence Calibration**: Every assertion records origin (`USER`, `SYSTEM`, `AGENT`, `RESEARCH`, `DOCUMENT`, `WEB`, `TOOL`, `MODEL`, `IMPORTED`, `DERIVED`) and calibrated confidence [0.0, 1.0].
7. **Control Center UI & 3D Network**: Real persistent graph visualization through `KnowledgeNetwork3D.tsx` and interactive `KnowledgeView.tsx`.

## Subsystem Architecture
- **Repositories**: `KnowledgeEntityRepository`, `KnowledgeRelationshipRepository`, `KnowledgeFactRepository`, `KnowledgeEvidenceRepository`, `KnowledgeClaimRepository`, `KnowledgeContradictionRepository`.
- **Services**: `EntityResolutionService`, `KnowledgeGraphService`, `KnowledgeValidationService`, `KnowledgeExtractionService`, `KnowledgeContextAssembler`, `KnowledgeConsolidationService`, `KnowledgeTimelineService`.
- **Database Schema**: Migration `010_knowledge_graph_schema.ts` defining 8 relational tables with composite indexes.
- **REST & SSE Gateways**: Full suite of endpoints at `/knowledge/*` and real-time event distribution via `/events`.

## Verification Metrics
- **Unit & Regression Tests**: 40/40 Phase 19 tests passing (`tests/phase19-knowledge-graph.test.ts`), 431/431 total repository tests passing.
- **Live Verifier**: 27/27 scenarios passed in `scripts/live-phase19-verifier.ts`.
- **Builds**: Clean TypeScript builds for both backend (`tsc`) and frontend (`vite build`).
