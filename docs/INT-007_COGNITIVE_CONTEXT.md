# HṚṢĪKEŚA — INT-007: COGNITIVE CONTEXT ENGINE
## Unified Memory, Knowledge, Research & Decision Intelligence

**Project:** HṚṢĪKEŚA (हृषीकेश) — Sovereign Personal AI Operating System & Autonomous Workforce Core Runtime  
**Track:** Track A / INT-007  
**Baseline References:**
- [docs/INT-001_INSTANT_INTERACTION_BASELINE.md](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/docs/INT-001_INSTANT_INTERACTION_BASELINE.md)
- [docs/INT-002_FAST_CHAT_GATE.md](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/docs/INT-002_FAST_CHAT_GATE.md)
- [docs/INT-003_MODEL_BENCHMARK.md](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/docs/INT-003_MODEL_BENCHMARK.md)
- [docs/INT-004_CONTEXT_RESIDENCY.md](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/docs/INT-004_CONTEXT_RESIDENCY.md)  
- [docs/INT-005_RESEARCH.md](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/docs/INT-005_RESEARCH.md)  
- [docs/INT-006_KNOWLEDGE_GRAPH.md](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/docs/INT-006_KNOWLEDGE_GRAPH.md)  
**Status:** COMPLETE & EMPIRICALLY VERIFIED (100% Tests & 100% Benchmarks Passing)  
**Date:** September 2026  

---

### 1. Executive Summary & Objective

HṚṢĪKEŚA Track A / INT-007 implements the **Cognitive Context Engine** — the central context assembly and relevance coordination layer of the sovereign AI operating system.

Before INT-007, conversations, memory items, knowledge graph nodes, architectural decisions, and research evidence were retrieved via disconnected, ad-hoc assemblers. INT-007 unifies all memory and knowledge stores into a single, bounded, transparent, explainable pipeline that answers:

> *"What information is actually relevant right now?"*

```
User Query / Task
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ FastChatGate: Core Invariants Check (hello, time, identity) │
└─────────────────────────────────────────────────────────────┘
       │ [Fast-path Instant: < 20ms, 0 Model Calls, Engine Bypassed]
       │
       ▼ [Complex / Intelligence Queries]
┌─────────────────────────────────────────────────────────────┐
│               COGNITIVE CONTEXT ENGINE PIPELINE             │
├─────────────────────────────────────────────────────────────┤
│ 1. Request Classifier   ─► Intent, Complexity, TemporalScope│
│ 2. Scope Resolver       ─► CREATOR | GLOBAL | PROJECT | etc │
│ 3. Candidate Collector  ─► Memory, Graph, ADRs, Evidence    │
│ 4. Relevance Ranker     ─► Multi-Factor Explainable Scoring │
│ 5. Temporal Filter      ─► CURRENT vs HISTORICAL vs AT_TIME │
│ 6. Conflict Resolver    ─► Structured Contradiction Blocks  │
│ 7. Budget Manager       ─► T0–T4 Adaptive Hardware Caps     │
│ 8. Context Compressor   ─► Deduplication & Semantic Pruning │
│ 9. Markdown Assembler   ─► Clean Structured Context Output  │
│ 10. Trace Generator     ─► Diagnostic Trace Caching & API   │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Core Architectural Invariants & Guarantees

1. **Sub-20ms Deterministic Fast-Paths Unconditionally Bypassed:**
   - Invariant queries (`hello`, `who created you?`, `what time is it?`, `what is today's date?`, `2 + 2`) are intercepted by `FastChatGate` and answered in **< 1ms** with **0 LLM calls**. The Cognitive Context Engine is completely bypassed for these requests.
2. **Transparent, Multi-Factor, Explainable Ranking:**
   - No opaque black boxes or hidden weights. Every candidate item is ranked with deterministic factor contributions and explicit `rankingReasons` recorded in the `ContextTrace`.
3. **Fact Versioning & Structured Contradiction Preservation:**
   - Conflicting or contested facts are never silently dropped or averaged out. Unresolved contradictions are formatted into a prominent `[CONTESTED INFORMATION / UNRESOLVED]` block preserving both conflicting claims and reasons.
4. **Creator & User Preference Priority:**
   - Explicit user preferences and creator directives receive a top-tier score boost and are strictly protected against context compression pruning.
5. **Architectural Decision Record (ADR) Recall:**
   - Architectural decisions are first-class context citizens, recalled with title, decision, rationale, status, and supersedes linkage.
6. **Strict Multi-Tenant Scope Boundary Isolation:**
   - Enforces scope boundaries across `CREATOR`, `GLOBAL`, `PROJECT`, `COMPANY`, `SESSION`, `AGENT`, `GOAL`, `MISSION`. Cross-project bleeding is mathematically eliminated.
7. **Adaptive Context Budgeting & Hardware Pressure Throttling:**
   - Integrates with `ResourceGovernor`. Context sizes adaptively throttle under `LOW_MEMORY` (50% cap) and `CRITICAL_MEMORY` (25% cap), strictly preventing OOM conditions.
8. **Pure Sovereign Native Architecture:**
   - Native SQLite + TypeScript only. Zero LangChain, LangGraph, CrewAI, AutoGen, Neo4j, or external vector servers.

---

### 3. Pipeline Stages & Services

| Service | File | Purpose |
|---------|------|---------|
| `RequestClassifierService` | [`src/context/services/request-classifier.service.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/request-classifier.service.ts) | Analyzes intent (`DECISION_QUERY`, `RESEARCH_QUERY`, etc.), task complexity (`SIMPLE` to `RESEARCH_DEEP`), temporal scope (`CURRENT`, `HISTORICAL`, `ALL`), and extracts entities. |
| `ScopeResolverService` | [`src/context/services/scope-resolver.service.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/scope-resolver.service.ts) | Resolves primary scope (`CREATOR`, `GLOBAL`, `PROJECT`, `COMPANY`, `AGENT`, `GOAL`) and enforces allowed scope boundaries. |
| `CandidateCollectorService` | [`src/context/services/candidate-collector.service.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/candidate-collector.service.ts) | Uses Source Activation Matrix to gather candidates across memory, graph, decisions, evidence, and skills with resilient fallback. |
| `RelevanceRankerService` | [`src/context/services/relevance-ranker.service.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/relevance-ranker.service.ts) | Multi-factor scoring (+user preference priority, +intent match, +scope match, +entity match, +provenance credibility, +graph proximity). |
| `TemporalFilterService` | [`src/context/services/temporal-filter.service.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/temporal-filter.service.ts) | Applies temporal logic: filters `CURRENT` (active facts), `HISTORICAL` (includes superseded), or `AT_TIME` (valid at reference timestamp). |
| `ConflictResolverService` | [`src/context/services/conflict-resolver.service.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/conflict-resolver.service.ts) | Detects active graph contradictions and synthesizes `[CONTESTED INFORMATION / UNRESOLVED]` blocks. |
| `ContextBudgetManagerService` | [`src/context/services/context-budget-manager.service.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/context-budget-manager.service.ts) | Enforces INT-004 token/character limits (T0: 0, T1: 50, T2: 300, T3: 800, T4: 2000 tokens) with `ResourceGovernor` throttling. |
| `ContextCompressorService` | [`src/context/services/context-compressor.service.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/context-compressor.service.ts) | Eliminates duplicates, prunes low-relevance items, and strictly enforces budget ceilings while protecting critical candidates. |
| `CognitiveContextEngine` | [`src/context/services/cognitive-context-engine.ts`](file:///c:/Users/Rushi/Desktop/HṚṢĪKEŚA/src/context/services/cognitive-context-engine.ts) | Main orchestrator assembling Markdown context, caching traces, and suggesting model tiers (`FAST_LOCAL`, `BALANCED_DEEP_LOCAL`, `FLAGSHIP_QUALITY`). |

---

### 4. Diagnostic Tools & Procedural Skills

#### Diagnostic Built-in Tools (Registered in `src/tools/builtin/context.tool.ts`):
1. **`context.inspect` (Tier 0 Safe Read):**
   - Returns classification, resolved scope, activated sources, candidate counts, and budget for a query without executing LLM inference.
2. **`context.search` (Tier 0 Safe Read):**
   - Retrieves ranked candidates matching query, scope, and minConfidence with explainable scores and selection reasons.
3. **`context.trace` (Tier 0 Safe Read):**
   - Retrieves the full execution trace for a recent context request by `requestId`.

#### Procedural Skills (Registered in `src/skills/services/builtin-skills.ts`):
1. `context-search` — Semantic and structured context lookup across memory, graph, and decisions.
2. `decision-context` — Recall architectural decisions, trade-offs, and historical rationale.
3. `project-context` — Retrieve project-scoped facts, architecture, and milestones.
4. `company-context` — Query commercial operations, department roles, and KPI goals.
5. `evidence-context` — Search research evidence, studies, citations, and benchmarks.
6. `knowledge-context` — Search and traverse the sovereign personal knowledge graph.

---

### 5. HTTP Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/context/assemble` | Assemble unified context for a request payload with full trace and suggested model tier. |
| `GET` | `/context/trace/:requestId` | Inspect execution trace and candidate scoring reasons for a specific request. |
| `GET` | `/context/traces` | List the most recent context execution traces (supports `?limit=N`). |

---

### 6. Empirical Verification & Test Results

#### Unit Test Suite (`tests/int-007-context-engine.test.ts`):
- **42 / 42 Tests Passed (100%)**
- Execution Duration: ~567ms total suite runtime (individual pipeline tests < 3ms)
- Verified coverage: Request classification, scope isolation, candidate collection, explainable ranking, temporal filtering, contradiction preservation, ADR recall, budget throttling, compression, diagnostic tools, skills, and regression protection.

#### Full INT Regression Suite:
- `tests/int-002-fast-gate.test.ts`: **PASS**
- `tests/int-003-tiered-routing.test.ts`: **PASS**
- `tests/int-004-context-residency.test.ts`: **20/20 PASS**
- `tests/int-005-research.test.ts`: **55/55 PASS**
- `tests/int-006-knowledge.test.ts`: **44/44 PASS**
- `tests/int-007-context-engine.test.ts`: **42/42 PASS**
- **Total Combined Regression Tests: 197 / 197 Passing (0 Failures)**

#### TypeScript Compilation & Lint:
- `npm run lint` (`tsc --noEmit`): **0 Errors**
- `npm run build` (`tsc`): **0 Errors**

---

### 7. Live Benchmark Suite (`scripts/benchmark_int007_live.js`)

Empirically verified against cold disk SQLite database (`data/benchmark_int007.db`):

| ID | Benchmark Scenario Name | Scope | Latency (ms) | Sources | Cand | Sel | Cntx Chars | Nodes | Model Calls | Memory (MB) | Status |
|----|-------------------------|-------|--------------|---------|------|-----|------------|-------|-------------|-------------|--------|
| 1  | Simple Greeting ('hello') | GLOBAL | 0.044 | FAST_GATE | 0 | 0 | 0 | 0 | 0 | 11.72 | **PASS** |
| 2  | Identity Query ('who created you?') | CREATOR | 0.021 | FAST_GATE | 0 | 0 | 0 | 0 | 0 | 11.73 | **PASS** |
| 3  | Live Time Query ('what time is it?') | GLOBAL | 0.155 | FAST_GATE | 0 | 0 | 0 | 0 | 0 | 11.73 | **PASS** |
| 4  | Project Architecture ('What is the architecture of HṚṢĪKEŚA?') | PROJECT | 4.211 | DECISION,KNOWLE | 12 | 12 | 1535 | 3 | 0 | 12.05 | **PASS** |
| 5  | Decision Rationale ('Why did we choose SQLite for HṚṢĪKEŚA persistence?') | PROJECT | 1.831 | DECISION,KNOWLE | 12 | 12 | 1535 | 3 | 0 | 12.21 | **PASS** |
| 6  | Creator Preference Priority ('What are Rushikesh\'s coding preferences?') | CREATOR | 1.519 | MEMORY_EPISODIC | 11 | 8 | 711 | 1 | 0 | 12.38 | **PASS** |
| 7  | Knowledge Graph Traversal ('What default model does HṚṢĪKEŚA Core use?') | PROJECT | 1.711 | DECISION,KNOWLE | 14 | 14 | 1700 | 5 | 0 | 12.57 | **PASS** |
| 8  | Research Evidence Recall ('What research evidence do we have on local LLM residency?') | PROJECT | 1.151 | DECISION,RESEAR | 8 | 8 | 1376 | 5 | 0 | 12.92 | **PASS** |
| 9  | Temporal Fact Versioning ('What is the active model vs historical model?') | PROJECT | 1.156 | DECISION,KNOWLE | 15 | 15 | 1777 | 6 | 0 | 12.90 | **PASS** |
| 10 | Company Scope Isolation ('Show KPI goals for Pragnya AI') | COMPANY | 2.195 | KNOWLEDGE_GRAPH | 11 | 8 | 544 | 2 | 0 | 13.05 | **PASS** |
| 11 | Project Scope Isolation ('Show HṚṢĪKEŚA decisions' vs 'SAHIKARA DEX') | PROJECT | 2.545 | DECISION | 20 | 20 | 2428 | 0 | 0 | 13.56 | **PASS** |
| 12 | Contradiction Preservation ('DEX gas fee baseline query') | PROJECT | 1.621 | DECISION,KNOWLE | 11 | 10 | 1820 | 2 | 0 | 13.45 | **PASS** |
| 13 | Complex Technical Multi-Source Architecture Query | PROJECT | 1.691 | DECISION,KNOWLE | 14 | 14 | 1700 | 5 | 0 | 13.63 | **PASS** |
| 14 | Normal Chat Isolation ('casual turn with minimal memory') | GLOBAL | 1.215 | MEMORY_EPISODIC | 10 | 5 | 185 | 0 | 0 | 13.76 | **PASS** |
| 15 | Restart Persistence Across SQLite Re-instantiation | SYSTEM | 20.540 | DECISION,KNOWLE | 12 | 12 | 1535 | 3 | 0 | 13.92 | **PASS** |

#### Benchmark Highlights:
- **Total Scenarios:** 15 / 15 Passed (100%)
- **Average Latency:** **2.774 ms** (Sub-100ms budget strictly satisfied)
- **Fast-path Latency:** **0.021 ms – 0.155 ms** (Strictly < 20ms invariant satisfied)
- **Model Calls:** **0** (Zero token waste for deterministic retrieval)
- **Disk Persistence:** Verified cold re-instantiation across database connection restarts.
