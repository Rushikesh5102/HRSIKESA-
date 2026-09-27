# ADR-032: Universal Real-World Research, Knowledge & Decision Intelligence Fabric

## Status
ACCEPTED

## Date
2026-09-27

## Context
Prior to FP-18, HṚṢĪKEŚA possessed strong foundational intelligence systems:
- Untrusted web search & extraction (Phase 17)
- Sovereign personal knowledge graph & memory deepening (INT-006)
- Cognitive Context Engine (INT-007)
- Persistent working memory & conversational continuity (INT-008)
- GitHub & open-source intelligence (FP-08)
- External ecosystem & connector registry (FP-15)
- Demonstration learning & workflow acquisition (FP-16)
- Universal digital creation & media studio (FP-17)

However, a fundamental gap remained: there was no auditable, evidence-backed analytical layer capable of decomposing high-level research questions ("Find the best open-source image generation stack we can realistically run on this laptop"), identifying contradictions across sources, verifying compatibility against actual host hardware (Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc integrated GPU), producing qualitative multi-criteria tradeoff comparisons without fake mathematical precision, synthesizing standardized 16-section Decision Briefs, maintaining immutable decision records, supporting structured reviews when new evidence surfaces, and compiling actionable implementation plans behind explicit operator approval gates.

## Decision
We implemented **FP-18: Universal Real-World Research, Knowledge & Decision Intelligence Fabric** as an `EVIDENCE → CONTEXT → OPTIONS → TRADEOFFS → DECISION SUPPORT` layer.

### Key Architectural Invariants:
1. **Zero Duplication:** Reuses Phase 17 search & scraping, INT-006 Knowledge Graph, INT-007 Context Engine, FP-08 GitHub Intelligence, FP-15 Ecosystems, and FP-17 Media Studio rather than spawning new search engines or vector stores.
2. **Persistent Research Case Lifecycle:**
   `DRAFT` → `SCOPING` → `RESEARCHING` → `GATHERING_EVIDENCE` → `ANALYZING` → `COMPARING` → `SYNTHESIZING` → `REVIEWING` → `AWAITING_USER` → `COMPLETED`.
3. **Environment-Aware Compatibility:**
   Technical requirements are evaluated against host hardware realities (Intel Arc Graphics, 15.7 GB RAM, Windows 11). CUDA-dependent software is classified `INCOMPATIBLE`. High-VRAM models requiring quantization are classified `CONDITIONALLY_COMPATIBLE`. Lightweight Vulkan/DirectML engines are classified `VERIFIED_COMPATIBLE`. Undocumented requirements are marked `UNKNOWN`.
4. **Contradiction & Temporal Reasoning:**
   Detects discrepancies between reported numbers (RAM/VRAM requirements), categorizes root causes (quantization differences, software version drift, OS variances), and flags claims older than 2 years as `OUTDATED`.
5. **No Fake Precision:**
   Candidate matrices emphasize qualitative trade-offs, capabilities, limitations, and explicit unknowns rather than arbitrary synthetic numerical scores. Recommendations are generated only when the operator explicitly requests evaluation.
6. **Standard 16-Section Decision Brief:**
   Objective, Scope, Key Findings, Evidence Summary, Evaluated Options, Tradeoffs, Risks & Mitigations, Explicit Unknowns, Constraints, Dependencies, Cost, Implementation Implications, Open Questions, Decision Required, Recommendation, and Next Steps & Sources. Markdown export is available.
7. **Action Bridge with Human Authority Gate:**
   Compiles research outcomes into structured `ProposedAction` proposals (Missions, Goals, Workflows, Skills, Environment Changes). Consequential actions default to `requiresApproval: true` and `PENDING_APPROVAL`. Autonomous execution of consequential changes is strictly prohibited.
8. **Immutable Decision History & Review:**
   Decision records are immutable. When new evidence or contradictions emerge, an automated structured `DecisionReview` is created recommending `MAINTAIN` or `UPDATE`, transitioning the decision to `UNDER_REVIEW` without silently mutating history.
9. **Prompt Injection Defense & Provenance:**
   Input questions and scraped web content are filtered through `PromptInjectionDefense` to prevent instruction overrides, credential harvesting, or unauthorized privilege escalation. Every claim traces to its primary source tier, URL, retrieval timestamp, and confidence.
10. **Storage Architecture (Migration 032):**
    Relational SQLite tables: `research_cases`, `research_candidates`, `research_comparisons`, `decision_records`, `decision_reviews`, and `decision_proposed_actions`.

## Consequences
- **Positive:**
  - HṚṢĪKEŚA can now research any digital question, evaluate local machine feasibility, detect conflicting benchmarks, and produce executive briefs.
  - Operator retains total sovereign authority over consequential decisions and deployments.
  - Zero fabricated evidence, zero fabricated compatibility, zero fabricated recency.
- **Negative / Constraints:**
  - Research depth is bounded by host memory (16 GB) and resource governance budgets.
  - High memory pressure causes research tasks to throttle or shed non-essential concurrent extractions.
