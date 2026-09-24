# HṚṢĪKEŚA — PHASE 20: SKILLS & PROCEDURAL INTELLIGENCE

## Executive Summary
Phase 20 transforms HṚṢĪKEŚA from a reactive query-and-execute system (`REQUEST → THINK → EXECUTE`) into a procedural intelligence platform:
`REQUEST → RECOGNIZE CAPABILITY → SELECT SKILL → LOAD PROCEDURE → ADAPT PARAMETERS → EXECUTE → VERIFY → LEARN`.

A **Skill** in HṚṢĪKEŚA is a verified, reusable procedural unit of operational knowledge encapsulating how to accomplish a specific class of multi-step tasks safely, deterministically, and repeatably.

## Core Architectural Invariants
1. **Procedural Compilation into Native DAGs**: Skills compile directly into existing Phase 13 `PlannedTask[]` / `MissionPlan` DAGs executed by the unified `ToolExecutionBus` and `ModelRouter`.
2. **Local-First & Windows-First**: Pure TypeScript + SQLite architecture (`011_skills_schema.ts`). No external process dependencies (no Python LangGraph, CrewAI, AutoGen, Redis, Docker, or Postgres).
3. **Strict Human Authority**: A skill is NOT a permission escalation mechanism. All tool invocations undergo `PermissionManager` and `ToolAudit` checks. High-risk skills (`APPROVAL_REQUIRED`) pause execution awaiting explicit human authorization.
4. **Self-Evolution without Silent Drift**: Runtime telemetry, error patterns, and step durations generate structured `SkillImprovementProposal` records for human review. Never silent runtime code modification.
5. **Knowledge Graph Synchronization**: Skills are automatically registered as `SKILL` entities in Phase 19's Knowledge Graph, linked with their required and provided capabilities.
6. **Deterministic Matching & Conflict Resolution**: Hybrid matching (exact trigger, keyword overlap, capability mapping) with semantic similarity fallback and ambiguity detection (`isAmbiguous`) when multiple skills have close scores.
7. **Production Control Center UI**: Interactive Skills Control Center (`SkillsView.tsx`) with catalog search/filtering, visual procedure graph inspect, sandbox matcher testing, execution modal, and visual Skill Builder.

## Subsystem Architecture
- **Data Persistence**:
  - `011_skills_schema.ts`: SQLite relational migration with tables: `skills`, `skill_versions`, `skill_steps`, `skill_permissions`, `skill_usage`, `skill_improvements`.
  - `SkillRepository`: Full CRUD, versioning snapshots, telemetry, step execution metrics, and improvement proposals.
- **Security & Integrity**:
  - `SkillSecurityValidator`: DAG cycle detection (DFS), bounds verification (max 50 steps), schema validation (`validateInputs`/`validateOutputs`), secret redaction, and forbidden pattern scanning.
- **Registry & Capabilities**:
  - `SkillRegistryService`: In-memory caching, version lifecycle, and bidirectional Knowledge Graph synchronization.
  - `BuiltinSkills`: 8 safe baseline operational skills pre-registered on startup.
- **Matching & Intent Recognition**:
  - `SkillMatcherService`: Capability-weighted matching, trigger heuristics, ambiguity detection, and `preview()` execution planning.
- **Execution & Orchestration**:
  - `SkillExecutionEngineService`: Lifecycle management (`PENDING`, `VALIDATING`, `EXECUTING`, `PAUSED`, `COMPLETED`, `FAILED`, `CANCELLED`), resource governor awareness (`CRITICAL_MEMORY`), human-in-the-loop approval gates, checkpointing, retries, and telemetry logging.
- **REST & SSE Gateways**:
  - Endpoints under `/skills/*` (`GET /skills`, `POST /skills`, `GET /skills/:id`, `PUT /skills/:id`, `POST /skills/:id/enable`, `POST /skills/:id/disable`, `POST /skills/match`, `POST /skills/:id/preview`, `POST /skills/:id/execute`, `GET /skills/executions/:id`, `POST /skills/executions/:id/pause`, `POST /skills/executions/:id/resume`, `POST /skills/executions/:id/cancel`, `POST /skills/executions/:id/approve`, `GET /skills/:id/analytics`, `GET /skills/improvements/proposals`, `POST /skills/improvements/:id/review`).
  - Real-time updates delivered via `/events` SSE stream.

## Verification Metrics
- **Unit & Integration Suite**: 40/40 tests passing in `tests/phase20-skills.test.ts`.
- **Full Regression**: Phase 0–19 subsystems intact and passing.
- **Live Verifier**: 34/34 end-to-end operational scenarios verified in `scripts/live-phase20-verifier.ts`.
- **UI Build**: 0 errors, built via Vite.
