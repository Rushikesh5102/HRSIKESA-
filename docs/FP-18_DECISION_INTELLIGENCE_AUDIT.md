# FP-18: Universal Real-World Research, Knowledge & Decision Intelligence Fabric
## Comprehensive Pre-Implementation Architectural Audit

**Author:** HṚṢĪKEŚA (हृषीकेश) Autonomous System  
**Authority:** Rushikesh Pattiwar  
**Date:** September 27, 2026  
**Status:** AUDIT COMPLETE — FROZEN BASELINE VALIDATED  

---

### Executive Summary

FP-18 introduces the **Universal Real-World Research, Knowledge & Decision Intelligence Fabric**. The primary objective is to build the missing cognitive and analytical bridge between:
```
External Information (Web, Docs, Repos, Ecosystem)
           +
Existing Knowledge Graph & Memory
           +
Company / Project Context
           +
User Priorities & Criteria
           +
Available Host Capabilities & Hardware Realities
           ↓
=====================================================
EVIDENCE → CONTEXT → OPTIONS → TRADEOFFS → DECISION SUPPORT
=====================================================
           ↓
Actionable Plans (Missions, Goals, Workflows, Skills, Creation Jobs)
```

In accordance with the mandatory directive: **FIRST AUDIT. Do NOT duplicate existing systems.**
This document audits the 25 required capability domains across HṚṢĪKEŚA, classifies each, identifies extension points, and defines strict reuse boundaries.

---

### Audit Classification Taxonomy
- **`EXISTING`**: Fully built, tested, and operational. Used directly without functional modification.
- **`EXTEND`**: Existing system whose data model, interface, or logic will be extended to support decision intelligence.
- **`ADAPTER_REQUIRED`**: Bridge layer required to harmonize disparate schemas without modifying upstream logic.
- **`MISSING`**: Brand new capability layer specific to FP-18 that does not exist anywhere in the repository.
- **`DEFERRED`**: Intentionally out of scope for FP-18 (scheduled for FP-19+ or requires specialized hardware).
- **`UNSAFE`**: Disallowed behavior (e.g. silent autonomous decisions on consequential matters, fake certainty, credential harvesting).

---

### Comprehensive 25-Domain Audit Matrix

| # | Subsystem / Capability Domain | Status in Repo | Classification | FP-18 Strategy & Integration Boundary |
|---|---|---|---|---|
| **1** | **Phase 17 Research & Web Intelligence** | `src/research/` (`ResearchEngine`, `IResearchStudy`, `IResearchSource`, `IResearchEvidence`, `IResearchFinding`, `ResearchSynthesizer`) | **EXTEND** | **Do NOT build another web search engine.** Extend existing `IResearchStudy` / research primitives into the structured `ResearchCase`, integrating question decomposition, candidate discovery, and multi-criteria comparison. |
| **2** | **INT-006 Knowledge Graph** | `src/knowledge/` (`KnowledgeGraphRepository`, `ResearchKnowledgeBridgeService`, 3D visual graph) | **EXTEND** | Reuse existing graph. Add edge types: `RESEARCH_CASE -> INVESTIGATES -> CONCEPT`, `CONSIDERS -> CANDIDATE`, `CLAIM -> SUPPORTED_BY -> EVIDENCE`, `DECISION -> BASED_ON -> RESEARCH_CASE`, `SELECTS -> CANDIDATE`. |
| **3** | **INT-007 Cognitive Context Engine** | `src/context/services/cognitive-context-engine.ts` | **EXISTING** | Query context engine for company, project, active goals, and session context to frame research queries with zero redundant gathering. |
| **4** | **INT-008 Working Memory** | `src/context/services/working-memory.service.ts` | **EXISTING** | Capture in-flight decision deliberations, user preferences, and transient research hypotheses across turns. |
| **5** | **FP-08 GitHub Intelligence** | `src/github/github.fabric.ts` | **EXISTING** | Reuse repository inspection, license detection, release tracking, star/activity telemetry, and security signals when researching candidate software. No blind cloning. |
| **6** | **FP-15 Ecosystem Intelligence** | `src/ecosystem/ecosystem.fabric.ts` | **EXISTING** | Query application catalog and tool ecosystem to check if candidate technologies or CLI tools are already known or integrated. |
| **7** | **FP-16 Demonstration Learning** | `src/demonstration/` | **EXISTING** | Learned workflows can invoke decision intelligence (`hres research ...`), and research outcomes can suggest demonstration acquisition for unknown tasks. |
| **8** | **FP-17 Creation Studio** | `src/creation/creation.fabric.ts` | **EXISTING** | Use FP-17 creation pipelines (`document.generate`, `presentation.generate`) to render Decision Briefs, technical comparison matrices, and executive slide decks. **Do NOT build a second document generator.** |
| **9** | **ModelRouter** | `src/routing/model.router.ts`, `src/models/` | **EXISTING** | Route summarization, claim extraction, and contradiction reasoning across local models (`qwen2.5:7b`) and authorized cloud fallbacks. Honor cost/quota rules. |
| **10** | **Memory System** | `src/memory/`, `HybridMemoryRetriever` | **EXTEND** | Persist verified durable conclusions, technology decisions, and architectural constraints into long-term semantic memory with provenance and confidence scores. |
| **11** | **Knowledge Graph** | `src/knowledge/` | **EXTEND** | (See item 2 above) Link research cases, claims, evidence, candidates, and decision records into the single unified SQLite-backed graph. |
| **12** | **Company OS** | `src/company/` (`company.repository.ts`, `company.types.ts`) | **EXISTING** | Bind research cases and decision briefs to specific `companyId` (e.g. Annapurna) and `projectId`, enforcing multi-tenant isolation. |
| **13** | **Goal Engine** | `src/goals/` (`goal.execution.engine.ts`, `goal.types.ts`) | **EXISTING** | Completed decision briefs can emit proposed high-level Goals (`GOAL_REQUEST`) for multi-day sovereign execution when approved. |
| **14** | **Mission Engine** | `src/mission/` (`mission.orchestrator.ts`, `task.graph.ts`) | **EXISTING** | Actionable implementation plans convert directly into Mission DAGs. **Do NOT build a second task execution engine.** |
| **15** | **Workflow Engine** | `src/workflows/` (`workflow.fabric.ts`, `workflow.types.ts`) | **EXISTING** | Repetitive research or decision review routines can be automated via existing workflow triggers and node executors. |
| **16** | **Skill Engine** | `src/skills/` (`skill-execution-engine.service.ts`) | **EXISTING** | Specialized research procedures (e.g. library compatibility check) compile into reusable operational skills. |
| **17** | **Verification System** | `src/mission/verification/`, `src/creation/services/creation-verifier.service.ts` | **EXISTING** | Enforce core invariant: `CLAIM != VERIFIED_FACT`. Evidence must be traceable to concrete sources, quotes, and timestamps. |
| **18** | **Provenance & License System** | `src/creation/interfaces/creation.types.ts`, `src/github/` | **EXTEND** | Track source URL, author, retrieval time, license terms (MIT, Apache-2.0, GPL, Commercial, Proprietary), and separate legal facts from legal interpretation. |
| **19** | **Agent Workforce (17 Agents)** | Authoritative 17-agent registry (`src/agents/`, `src/mission/workforce/`) | **EXISTING** | Route research roles to existing agents: Rahu (Research/Intelligence), Tvas (Requirements), Spoota (Product), Aja (Strategy), Vighna (Verification/Risk), Gāṇḍīva (Tech Impl), Rutam (Governance/License), Garuḍa (Infrastructure), KĀLA (Resource/Time). **No new permanent agents.** |
| **20** | **ResourceGovernor** | `src/resources/resource.governor.ts`, `HardwareDetector` | **EXISTING** | Respect host 16 GB RAM and Intel Core Ultra 5 envelope. On `CRITICAL_MEMORY` (<0.6 GB free), throttle concurrent search, extraction, and context tokens. |
| **21** | **External Environment Registry** | `src/environments/` | **EXISTING** | Check remote target environments (SSH, WinRM, Containers, Cloud) when researching deployment or infrastructure feasibility. |
| **22** | **Account / Service Fabric** | `src/accounts/account.fabric.ts` | **EXISTING** | Track provider API quotas, rate limits, and token expenses for external research APIs. If unconfigured, report `NOT_CONFIGURED`. |
| **23** | **MCP Ecosystem** | `src/mcp/` (`mcp.client.adapter.ts`, `mcp.types.ts`) | **EXISTING** | Allow external MCP research tools (e.g., academic search, specialized doc search) to be invoked as sources via standard MCP tool bus. |
| **24** | **Existing Research APIs / UI** | `src/api/http.server.ts` (`/research`), `ui/src/views/ResearchView.tsx` | **EXTEND** | Extend `/research` endpoints to support `/research/cases`, `/candidates`, `/comparison`, `/decision-brief`, `/decisions`, `/review`, and upgrade `ResearchView.tsx` with dedicated Decision Intelligence tabs. |
| **25** | **Report / Document Generation** | FP-17 `CreationFabric` (`document.generate`, `presentation.generate`) | **EXISTING** | Delegate formatting of Decision Briefs (Markdown, HTML, Presentations) directly to FP-17 creation pipelines. |

---

### FP-18 Core Domain Extensions & Architectural Additions

To fulfill the requirements without duplicating any existing module, FP-18 adds the **Decision Intelligence Subsystem** (`src/decision/`):

1. **`ResearchCase` Abstraction & State Machine (`FP-18A`)**:
   - `id`, `owner`, `companyId`, `projectId`, `objective`, `question`, `scope`, `status`, `researchType`, `depth`, `criteria`, `constraints`, `sources`, `claims`, `evidence`, `contradictions`, `unknowns`, `candidates`, `comparisons`, `decisions`, `recommendations`, `artifacts`, `createdAt`, `updatedAt`.
   - Lifecycle: `DRAFT` → `SCOPING` → `RESEARCHING` → `GATHERING_EVIDENCE` → `ANALYZING` → `COMPARING` → `SYNTHESIZING` → `REVIEWING` → `AWAITING_USER` → `COMPLETED` (`FAILED`, `ARCHIVED`).
2. **Question Decomposer & Research Planner (`FP-18B`, `FP-18C`)**:
   - Decomposes high-level questions into bounded subquestions across architectural, hardware, license, dependency, and performance dimensions.
3. **Credibility & Source Hierarchy (`FP-18D`)**:
   - Classifies sources into `PRIMARY`, `SECONDARY`, `COMMUNITY`, and `UNVERIFIED`.
4. **Structured Claim Normalization & Evidence Ledger (`FP-18E`, `FP-18F`)**:
   - Distinguishes `FACT`, `CLAIM`, `INFERENCE`, `OPINION`, and `UNKNOWN`. Traceable to exact source URL, retrieval timestamp, and quote.
5. **Contradiction & Temporal Intelligence Engine (`FP-18G`, `FP-18H`)**:
   - Detects conflicts between sources; analyzes conditional differences (quantization, hardware, version, date); marks stale data as `OUTDATED`.
6. **Candidate Discovery & Multi-Criteria Comparison Engine (`FP-18I`, `FP-18J`, `FP-18K`)**:
   - Extracts candidates with compatibility, license, RAM/VRAM requirements; builds multi-criteria qualitative comparison matrix without fake numerical precision.
7. **Decision Brief & History Ledger (`FP-18L`, `FP-18AA`, `FP-18AB`)**:
   - Generates 16-section Decision Briefs; records immutable decision history in SQLite; supports decision review against new evidence.
8. **Environment-Aware Compatibility Evaluator (`FP-18N`, `FP-18P`)**:
   - Cross-references model/tool requirements with actual host hardware (Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc GPU) and installed apps. Classifies as `VERIFIED_COMPATIBLE`, `LIKELY_COMPATIBLE`, `CONDITIONALLY_COMPATIBLE`, `INCOMPATIBLE`, or `UNKNOWN`.
9. **Research-to-Action Bridge (`FP-18Q`)**:
   - Compiles approved decision outcomes into structured Mission DAGs, Goals, or FP-17 Creation jobs.
10. **Prompt Injection & Authority Defense (`FP-18V`)**:
    - Treats all external text as untrusted content; blocks any instruction attempting to alter authority, reveal secrets, or bypass security.

---

### Database Schema Evolution (Migration 032)

Migration 032 (`032_decision_intelligence_schema.ts`) will create:
- `research_cases`: Durable storage of research cases, questions, scopes, criteria, and status.
- `research_candidates`: Evaluated candidate options (tools, models, libraries, architectures).
- `research_comparisons`: Multi-criteria evaluation matrices and tradeoff summaries.
- `decision_records`: Immutable decision history, context, rationale, approver, and superseded links.
- `decision_reviews`: Periodic or triggered review audits against newer evidence.

---

### Non-Negotiable Governance Rules for FP-18

1. **FIRST AUDIT:** This audit document governs all FP-18 implementation decisions.
2. **NEVER FABRICATE CERTAINTY OR DATA:** If evidence is missing, state `UNKNOWN`. If a provider is missing, state `NOT_CONFIGURED`.
3. **HUMAN AUTHORITY:** Consequential technical, financial, or environment changes require explicit human approval (`AWAITING_USER`).
4. **NO DUPLICATE ENGINES:** Extend Phase 17 Research, FP-17 Creation, FP-08 GitHub, FP-15 Ecosystem, and INT-006/007/008.
5. **DO NOT START FP-19.**
