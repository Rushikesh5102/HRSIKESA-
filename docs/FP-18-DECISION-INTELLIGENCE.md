# FP-18: Universal Real-World Research, Knowledge & Decision Intelligence Fabric

## Overview
**FP-18** delivers an auditable, evidence-backed decision intelligence layer for HṚṢĪKEŚA (हृषीकेश). It bridges external digital world discovery (web sources, repositories, hardware benchmarks, software catalogs) with internal context (personal knowledge graph, working memory, host hardware realities, and company boundaries) to produce transparent, auditable decision packages that feed into existing execution systems without silently deciding consequential matters on behalf of Rushikesh Pattiwar.

```
REAL-WORLD INFORMATION (Web, GitHub, Ecosystem)
         ↓
  RESEARCH CASE & QUESTION DECOMPOSITION
         ↓
  EVIDENCE LEDGER & CLAIM EXTRACTION
         ↓
  HARDWARE COMPATIBILITY & CONTRADICTION ANALYSIS
         ↓
  QUALITATIVE MULTI-CRITERIA COMPARISON MATRIX
         ↓
  16-SECTION DECISION BRIEF & IMMUTABLE DECISION RECORD
         ↓
  ACTION BRIDGE (Missions / Workflows / Goals / Skills)
         ↓
  EXPLICIT OPERATOR APPROVAL GATE (Awaiting Rushikesh)
         ↓
  VERIFIED EXECUTION & DECISION REVIEW
```

---

## 1. Core Principles & Governance
1. **Evidence Over Assertion:** Claims must trace back to sources, retrieval timestamps, provenance tiers (`PRIMARY`, `SECONDARY`, `COMMUNITY`, `UNVERIFIED`), and confidence levels.
2. **Never Fabricate Certainty:** When information is missing, it is recorded as `UNKNOWN`, `UNVERIFIED`, or `NOT_CONFIGURED`.
3. **No Fake Numerical Precision:** Multi-candidate comparisons emphasize qualitative capability trade-offs, limitations, and operational complexity rather than synthetic mathematical scores.
4. **Human Authority by Default:** Consequential actions and environmental modifications are proposed with `requiresApproval: true` and `status: 'PENDING_APPROVAL'`. Autonomous execution of high-risk actions is forbidden.
5. **Immutable Decision History:** Past decisions are never deleted or rewritten. Emerging contradictory evidence triggers a formal `DecisionReview` and transitions the record to `UNDER_REVIEW`.
6. **Host Envelope Alignment:** Software requirements are tested against the host machine (Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc GPU, Windows 11). CUDA dependencies are flagged `INCOMPATIBLE`. High-VRAM models requiring quantization are flagged `CONDITIONALLY_COMPATIBLE`.

---

## 2. Research Case Lifecycle
Each research objective is modeled as a persistent entity progressing through defined stages:
1. `DRAFT`: Initial specification of question, objective, scope, constraints, and depth.
2. `SCOPING`: Decomposition into targeted subquestions, candidate evaluation criteria, and bounded resource budgets.
3. `RESEARCHING`: Discovery of candidate repositories, technical documents, and benchmarks.
4. `GATHERING_EVIDENCE`: Extraction of factual quotes and assertions into structured claims.
5. `ANALYZING`: Hardware compatibility analysis against Intel Arc / Windows host and contradiction detection across conflicting claims.
6. `COMPARING`: Compilation of qualitative comparison matrices across candidates and criteria.
7. `SYNTHESIZING`: Generation of the comprehensive 16-section Decision Brief.
8. `AWAITING_USER`: Paused for operator interaction, criteria prioritization, or review.
9. `COMPLETED`: Research synthesis finished, artifacts exported, and proposed actions compiled.
10. `CANCELLED`: Terminal state upon operator abort.

---

## 3. Database Schema (Migration 032)
Persisted via SQLite in `DatabaseManager`:
- `research_cases`: Master case entity, question, objective, scope, status, depth, plan JSON, claims JSON, contradictions JSON, unknowns JSON, and artifacts JSON.
- `research_candidates`: Candidate tools/models, licenses, compatibility status, hardware details, capabilities, limitations, and cost summaries.
- `research_comparisons`: Evaluation criteria, matrix cells, tradeoff summaries, confidence scores, and recommendation rationales.
- `decision_records`: Immutable decision audit trail, selected options, rationale, approver, assumptions, and links to superseded decisions.
- `decision_reviews`: Review trigger events (`NEW_EVIDENCE`, `SCHEDULED`, `MANUAL_REQUEST`), identified contradictions, and recommendation (`MAINTAIN` vs `UPDATE`).
- `decision_proposed_actions`: Proposed Missions, Goals, Workflows, Skills, and Environment Changes with approval flags.

---

## 4. Hardware Compatibility Engine
Cross-references model requirements with the actual host profile:
- **CPU:** Intel Core Ultra 5 125H (14 cores / 18 threads, x64)
- **RAM:** 15.7 GB Total (~8.5 GB Available)
- **GPU:** Intel Arc Graphics (Integrated, 2.0 GB dedicated VRAM, Shared System Memory)
- **Supported Accelerators:** Vulkan, OpenCL, DirectML, CPU fallback
- **Unsupported Accelerators:** Discrete NVIDIA CUDA, AMD ROCm

Classification outcomes:
- `VERIFIED_COMPATIBLE`: Matches CPU, RAM, OS, and Vulkan/DirectML backends cleanly.
- `CONDITIONALLY_COMPATIBLE`: Exceeds dedicated VRAM or high RAM, but runnable via GGUF/INT4 quantization or CPU execution.
- `INCOMPATIBLE`: Requires NVIDIA CUDA, unsupported OS, or RAM exceeding host physical limit (>16 GB).
- `UNKNOWN`: Requirements undocumented or unverified.

---

## 5. Contradiction & Temporal Reasoning Engine
- **Conflict Identification:** Scans extracted claims sharing subject and predicate (e.g., RAM footprint, platform support, license).
- **Factor Attribution:** Determines whether discrepancy stems from model quantization (unquantized FP16 vs INT4), software version difference (v1.0 vs v2.0), or operating system variances.
- **Temporal Staleness:** Flags claims older than 2 years as `OUTDATED` and prevents obsolete benchmarks from being presented as current.

---

## 6. Standard 16-Section Decision Brief
The Decision Brief synthesizes findings into an executive briefing document:
1. **Objective:** Clear statement of user goal.
2. **Scope:** Environmental boundaries and constraints.
3. **Key Findings:** Core verified facts.
4. **Evidence Summary:** Direct quotes from primary/secondary sources.
5. **Evaluated Options:** Pros, cons, and capability summaries for each candidate.
6. **Tradeoff Analysis:** Qualitative comparison across criteria.
7. **Risks & Mitigations:** Technical, licensing, and operational hazards.
8. **Explicit Unknowns & Uncertainty:** Explicit documentation of missing data.
9. **Constraints:** Bounded host and policy limitations.
10. **Technical Dependencies:** Required runtimes, compilers, and libraries.
11. **Cost Considerations:** Licensing, infrastructure, or bandwidth fees.
12. **Implementation Implications:** Required developer effort and maintenance.
13. **Open Questions:** Decisions requiring human judgment.
14. **Decision Required:** Specific sign-off needed from operator.
15. **Recommendation (Requested Evaluation):** Clear recommendation only when requested by user.
16. **Proposed Next Steps & Sources:** Step-by-step next actions and source attribution list.

---

## 7. Action Bridge & Execution Governance
When research completes, `ActionBridgeService` compiles actionable next steps into `ProposedAction` entities:
- Target engines: `MISSION_ENGINE`, `WORKFLOW_ENGINE`, `GOAL_ENGINE`, `SKILL_ENGINE`, `CREATION_FABRIC`, or `ENVIRONMENT_FABRIC`.
- All proposed actions require explicit operator confirmation (`requiresApproval: true`).
- `DecisionFabric.approveAction(actionId, approver)` marks the action as `APPROVED`, assigns an audit timestamp, and dispatches it to the appropriate subsystem.

---

## 8. CLI & REST API Endpoints
### REST Endpoints
- `POST /api/research/cases` — Create a research case
- `GET /api/research/cases` — List research cases (filterable by company, project, status)
- `GET /api/research/cases/:id` — Get case details
- `POST /api/research/cases/:id/start` — Execute research pipeline
- `POST /api/research/cases/:id/pause` — Pause case (`AWAITING_USER`)
- `POST /api/research/cases/:id/resume` — Resume case execution
- `POST /api/research/cases/:id/cancel` — Cancel case
- `GET /api/research/cases/:id/candidates` — Get candidates
- `GET /api/research/cases/:id/claims` — Get structured claims
- `GET /api/research/cases/:id/comparison` — Get comparison matrix
- `GET /api/research/cases/:id/decision-brief` — Get synthesized Decision Brief
- `POST /api/research/cases/:id/decision-brief/export` — Export brief to local Markdown artifact
- `POST /api/research/cases/:id/propose-action` — Compile proposed actions
- `POST /api/decision/records` — Record formal decision
- `GET /api/decision/records` — List decisions
- `GET /api/decision/records/:id/review` — Review decision against new research case
- `GET /api/research/events` — Server-Sent Events (SSE) live telemetry

### CLI Commands (`hres`)
```bash
# Research Operations
hres research start "Find best open-source image generation stack for this laptop"
hres research status <case-id>
hres research export <case-id>
hres research cancel <case-id>

# Decision Operations
hres decision list
hres decision show <decision-id>
hres decision review <decision-id> <new-case-id>
```
