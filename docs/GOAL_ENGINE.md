# HṚṢĪKEŚA (हृषीकेश) — Autonomous Goal Management Engine

## 1. Overview & Architecture

The **Autonomous Goal Management Engine** represents Phase 15 of HṚṢĪKEŚA. It introduces the highest-level sovereign orchestration tier, positioned directly above the Phase 13 Autonomous Mission Engine and Phase 14 Company OS.

```
┌───────────────────────────────────────────────────────────────────┐
│                 Rushikesh (Human Sovereign Operator)             │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ High-Level Objectives
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                    HṚṢĪKEŚA GOAL ENGINE (Phase 15)                │
│                                                                   │
│   GoalRepository ──► GoalPlanner ──► GoalDecomposer              │
│                           │                  │                    │
│                           ▼                  ▼                    │
│                    GoalVerification ◄── Milestone Execution      │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ Structured Missions
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                 MISSION ORCHESTRATOR (Phase 13 Engine)            │
│                                                                   │
│   DAG Tasks ──► Agent Workforce (17 Specialists) ──► Tool Bus    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Principles & Safeguards

1. **Zero Engine Duplication**: The Goal Engine never reimplements task graphs, tool dispatch, or agent delegation. It orchestrates by generating structured `CreateMissionOptions` and delegating to `MissionOrchestrator`.
2. **LLM Output Never Directly Trusted**: Every LLM plan is schema-validated against approved agent IDs, valid tool capabilities, and budget constraints before acceptance.
3. **Independent Deterministic Verification**: `GoalVerifier` verifies outcomes through file integrity, blackboard state, and artifact inspection — never relying on model self-certification.
4. **Bounded Replanning**: Failures trigger bounded retries up to `budget.maxReplans` (default 3). Completed milestones are strictly preserved.
5. **Governed HITL & Danger Tiers**: Destructive or external actions require human operator confirmation before execution begins.
6. **Persistence & Restart Recovery**: All goals, milestones, and provenance chains are stored in SQLite and automatically recovered on kernel cold restart.

---

## 3. Database Schema (Migration 006)

### `goals` Table
```sql
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  parent_goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  objective TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  deadline TEXT,
  budget TEXT NOT NULL,
  constraints TEXT,
  success_criteria TEXT,
  failure_criteria TEXT,
  verification_plan TEXT,
  plan TEXT,
  report TEXT,
  verification_result TEXT,
  blocked_reason TEXT,
  created_by TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `goal_milestones` Table
```sql
CREATE TABLE IF NOT EXISTS goal_milestones (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  mission_id TEXT REFERENCES agent_missions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,
  status TEXT NOT NULL,
  success_criteria TEXT,
  verification_criteria TEXT,
  required_agent_ids TEXT,
  required_capabilities TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 4. Subsystem Components

### GoalPlanner (`src/goal/planner/goal.planner.ts`)
- Classifies incoming goals against deterministic archetypes first (zero LLM token overhead for standard tasks).
- For novel or complex goals, prompts `ModelRouter` with available specialist rosters.
- Sanitizes and validates every returned field, ensuring valid agent IDs and milestone DAG topologies.

### GoalDecomposer (`src/goal/decomposer/goal.decomposer.ts`)
- Converts validated `GoalPlan` into `IGoalMilestone` records and `CreateMissionOptions`.
- Matches required capabilities with `AgentRegistry.findBestSpecialist()`.
- Stamps `goalId` and `milestoneId` into mission payloads for full provenance.

### GoalVerifier (`src/goal/verification/goal.verifier.ts`)
- Evaluates goal success criteria deterministically.
- Verifies artifact existence, content integrity, and completion of all milestones.
- Generates evidence chains linking Goal → Milestone → Mission → Artifact.

### GoalExecutionEngine (`src/goal/engine/goal.execution.engine.ts`)
- Coordinates the autonomous lifecycle: Draft → Analyzing → Planned → Executing → Verifying → Completed.
- Enforces strict budget caps (model calls, missions, execution time, replans).
- Handles cold restart recovery without duplicate work.

---

## 5. REST API Reference (13 Endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/goals` | Create a new autonomous goal |
| `GET` | `/goals` | List goals with optional filters |
| `GET` | `/goals/:id` | Get goal details, milestones, and progress |
| `POST` | `/goals/:id/plan` | Generate and validate structured plan |
| `POST` | `/goals/:id/start` | Start autonomous execution |
| `POST` | `/goals/:id/pause` | Pause active execution |
| `POST` | `/goals/:id/resume` | Resume paused goal |
| `POST` | `/goals/:id/cancel` | Cancel goal execution |
| `POST` | `/goals/:id/replan` | Trigger bounded replanning |
| `GET` | `/goals/:id/milestones` | List goal milestones |
| `GET` | `/goals/:id/progress` | Get progress and budget usage |
| `GET` | `/goals/:id/verification` | Get verification results |
| `GET` | `/goals/:id/report` | Get final execution report |
