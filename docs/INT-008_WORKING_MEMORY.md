# HṚṢĪKEŚA (हृषीकेश) — TRACK A / INT-008 SPECIFICATION REPORT
## Persistent Working Memory & Conversational Continuity Engine

> **Document Version:** 1.0.0  
> **Status:** COMPLETED & VERIFIED  
> **Baseline Dependencies:** INT-001 through INT-007 (FROZEN & VERIFIED)  
> **Target Machine:** Acer Swift SFG14-73T (Intel Core Ultra 5 125H, 16 GB RAM, Intel Arc GPU)  
> **Sovereign Master & Creator:** Rushikesh Pattiwar  

---

## 1. Executive Summary & Mission

The **INT-008 Persistent Working Memory & Conversational Continuity Engine** provides HṚṢĪKEŚA with an active cognitive workspace answering the fundamental operational questions:
- *What was HṚṢĪKEŚA and Rushikesh actually working on across previous turns?*
- *What task is currently in progress, what blockers exist, and what remains unresolved?*
- *What should persist as active working context across turns and restarts, and what must expire?*
- *How do natural conversational references ("it", "this", "that", "continue", "now fix it") resolve deterministically without blind guessing or expensive model calls?*

### Invariant Preservation
- **INT-001 through INT-007 are strictly frozen.** Fast paths (`hello`, `who created you?`, `what time is it?`, `what is today's date?`, `2 + 2`) completely bypass working memory lookups (< 20ms, 0 database scans, 0 model calls).
- **Native SQLite & Pure TypeScript only.** Zero Redis, Postgres, LangChain, LangGraph, CrewAI, AutoGen, Neo4j, or external vector/graph databases.
- **Strict Working Memory vs Permanent Memory Separation.** Working memory items are task-oriented, short/medium-lived, session-aware, and resumable. They are **never** auto-promoted to permanent knowledge graph facts or episodic memories without explicit user direction.

---

## 2. Relational Database Schema (Migration 019)

Migration 019 (`src/persistence/migrations/019_working_memory_schema.ts`) establishes four dedicated tables with proper primary keys, foreign keys, cascade deletes, and indexing:

```
┌──────────────────────────┐             ┌───────────────────────────┐
│   conversation_threads   │ 1         * │    working_memory_items   │
├──────────────────────────┤────────────<├───────────────────────────┤
│ id (TEXT PRIMARY KEY)    │             │ id (TEXT PRIMARY KEY)     │
│ session_id (TEXT)        │             │ session_id (TEXT)         │
│ title (TEXT)             │             │ thread_id (TEXT FK)       │
│ status (TEXT)            │             │ type (TEXT)               │
│ target_project_id (TEXT) │             │ content (TEXT)            │
│ target_company_id (TEXT) │             │ scope (TEXT)              │
│ target_goal_id (TEXT)    │             │ source (TEXT)             │
│ target_mission_id (TEXT) │             │ status (TEXT)             │
│ active_task_id (TEXT)    │             │ priority (INTEGER)        │
│ turn_count (INTEGER)     │             │ expires_at (TEXT)         │
│ created_at (TEXT)        │             │ metadata_json (TEXT)      │
│ last_active_at (TEXT)    │             └───────────────────────────┘
└────────────┬─────────────┘
             │ 1
             │
             │ *
┌────────────▼─────────────┐             ┌───────────────────────────┐
│ conversation_checkpoints │             │       pending_items       │
├──────────────────────────┤             ├───────────────────────────┤
│ id (TEXT PRIMARY KEY)    │             │ id (TEXT PRIMARY KEY)     │
│ session_id (TEXT)        │             │ session_id (TEXT)         │
│ thread_id (TEXT FK)      │             │ thread_id (TEXT FK)       │
│ summary (TEXT)           │             │ type (TEXT)               │
│ state_snapshot_json(TEXT)│             │ question_or_action (TEXT) │
│ turn_number (INTEGER)    │             │ status (TEXT)             │
│ trigger_reason (TEXT)    │             │ priority (INTEGER)        │
│ is_restored (INTEGER)    │             │ metadata_json (TEXT)      │
│ created_at (TEXT)        │             │ created_at (TEXT)         │
└──────────────────────────┘             └───────────────────────────┘
```

### Table Definitions & Constraints
1. **`conversation_threads`**:
   - `id`: UUID primary key.
   - `session_id`: Unique identifier of the user interaction session.
   - `status`: `ACTIVE`, `PAUSED`, `RESUMABLE`, `COMPLETED`, `ARCHIVED`.
   - `target_project_id`, `target_company_id`, `target_goal_id`, `target_mission_id`, `active_task_id`: Structured context links.
   - Indexes: `idx_conv_threads_session`, `idx_conv_threads_status`, `idx_conv_threads_last_active`.
2. **`working_memory_items`**:
   - `id`: UUID primary key.
   - `thread_id`: Foreign key referencing `conversation_threads(id)` with `ON DELETE SET NULL`.
   - `type`: `ACTIVE_TOPIC`, `CURRENT_TASK`, `CURRENT_PROJECT`, `CURRENT_COMPANY`, `CURRENT_GOAL`, `CURRENT_MISSION`, `CURRENT_AGENT`, `RECENT_DECISION`, `USER_CORRECTION`, `TEMPORARY_ASSUMPTION`, `PENDING_QUESTION`, `UNFINISHED_ACTION`, `RECENT_RESULT`, `ERROR_STATE`, `BLOCKER`, `NEXT_STEP`, `USER_INTENT`.
   - `scope`: `GLOBAL`, `PROJECT`, `COMPANY`, `SESSION`, `AGENT`, `GOAL`, `MISSION`.
   - `source`: `EXPLICIT`, `DERIVED`, `SYSTEM`, `INFERRED`.
   - `status`: `ACTIVE`, `RESOLVED`, `SUPERSEDED`, `EXPIRED`.
   - `priority`: 0 to 100 integer.
   - `expires_at`: ISO timestamp for automatic TTL eviction.
   - Indexes: `idx_wm_items_session`, `idx_wm_items_thread`, `idx_wm_items_type`, `idx_wm_items_status`, `idx_wm_items_expires`.
3. **`conversation_checkpoints`**:
   - `id`: UUID primary key.
   - `state_snapshot_json`: Full JSON serialized `ContinuityState` including active project, company, goal, mission, tasks, blockers, and working items.
   - `trigger_reason`: `MANUAL`, `PERIODIC_TURN`, `TASK_SWITCH`, `PROJECT_SWITCH`, `SHUTDOWN`, `ERROR_RECOVERY`.
   - Indexes: `idx_checkpoints_session`, `idx_checkpoints_thread`, `idx_checkpoints_created`.
4. **`pending_items`**:
   - `id`: UUID primary key.
   - `type`: `OPEN_QUESTION`, `APPROVAL_REQUEST`, `UNFINISHED_ACTION`, `NEXT_STEP`.
   - `status`: `PENDING`, `ANSWERED`, `APPROVED`, `REJECTED`, `DISCARDED`.
   - Indexes: `idx_pending_items_session`, `idx_pending_items_status`.

---

## 3. Subsystem Architecture & Services

The engine consists of six dedicated services coordinated by `WorkingMemoryEngine`:

```
                                  Incoming User Turn (non-fast path)
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │  WorkingMemoryEngine  │
                                      └───────────┬───────────┘
                                                  │
                ┌───────────────────┬─────────────┼─────────────────────┬──────────────────┐
                │                   │             │                     │                  │
                ▼                   ▼             ▼                     ▼                  ▼
      ┌──────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
      │  ThreadManager   │ │ReferenceResolve│ │CorrectionDetect│ │ContinuityTrack │ │CheckpointManage│
      ├──────────────────┤ ├────────────────┤ ├────────────────┤ ├────────────────┤ ├────────────────┤
      │• Candidate rank  │ │• Pronouns      │ │• "No, I meant" │ │• Project/Comp  │ │• Snapshot state│
      │• Explicit match  │ │• "continue"    │ │• Override assm │ │• Goal/Mission  │ │• Auto-restore  │
      │• Session isolate │ │• Ambiguity det │ │• Explicit facts│ │• Blocker/Tasks │ │• DB recovery   │
      └──────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

### 3.1 ThreadManagerService
- Maintains thread lifecycle (`ACTIVE`, `PAUSED`, `RESUMABLE`, `COMPLETED`).
- Ranks candidate threads using multi-factor evaluation:
  - Explicit title match: +0.50
  - Title token matches: up to +0.30
  - Project overlap: +0.25 to +0.35
  - Status weight (`ACTIVE` +0.25, `RESUMABLE` +0.20, `PAUSED` +0.15)
  - Recency factor: up to +0.20 decaying over 24 hours
  - Continuation boost: +0.30 for "continue", "resume", "carry on"
- **Cross-Session Isolation Guard:** Threads from other sessions are never matched for casual prompts without explicit relevance or continuation directives.

### 3.2 ReferenceResolverService
Deterministically resolves deictic references and anaphora without model calls:
- `"continue"`: Resolves to active task, active thread, or active project.
- `"now fix it"` / `"fix the error"`: Resolves directly to active blocker or error state.
- `"that"` / `"verify that"`: Prioritizes concrete `RECENT_RESULT` (weight 0.90) over general conversational topics (`ACTIVE_TOPIC` weight 0.70).
- `"this"` / `"is this completed?"`: Resolves to the current active task or topic.
- `"the previous one"`: Resolves to superseded working memory items or preceding threads.
- **Ambiguity Detection:** When multiple candidate antecedents have similar confidence (difference < 0.15), the system marks the reference as ambiguous with candidate options rather than blindly hallucinating.

### 3.3 CorrectionDetectorService
Identifies explicit user corrections and adjustments:
- Patterns: `"No, I meant X"`, `"Use Y instead"`, `"Forget the previous assumption"`, `"Actually, this is for SAHIKARA"`, `"Correction:"`.
- Automatically supersedes prior assumptions or overrides the active project/company context.

### 3.4 ContinuityTrackerService
Tracks ongoing work units across turns:
- Project intent detection: identifies canonical projects (`HṚṢĪKEŚA`, `SAHIKARA`, `AUMTRIX`, `PRAGNYA`, etc.) with case and Unicode accent resilience.
- Company intent detection: identifies target companies (`Aumtrix`, `Pragnya`).
- Task state progression: `OPEN` -> `IN_PROGRESS` -> `RESOLVED` / `SUPERSEDED`.
- Active blocker tracking and resolution.
- Pending items management (approvals, open questions).

### 3.5 CheckpointManagerService
- Captures full structured snapshots of `ContinuityState`.
- Automatic checkpoint trigger after every 10 turns.
- Restores previous conversational state across application restarts and new sessions.

---

## 4. Integration with INT-007 Cognitive Context Engine

Working memory candidates are integrated into the INT-007 Cognitive Context Engine pipeline:
1. **CandidateCollector**:
   - `CandidateSourceType`: Added `'WORKING_MEMORY'`.
   - Collects active project, active company, active goal, active task, blockers, user corrections, recent results, and next steps.
2. **RelevanceRanker**:
   - Assigns priority bonuses: User corrections (+0.40), Active tasks/blockers (+0.35), Active project/goal (+0.30).
3. **ContextCompressor**:
   - Protects working memory user corrections and active tasks from budget pruning under memory pressure.
4. **ContextAssembler**:
   - Injects a compact Markdown section `## Active Working Context` at the top of the prompt for non-fast paths:
   ```markdown
   ## Active Working Context
   - **Active Project:** HṚṢĪKEŚA
   - **Active Task:** Unit test development
   - **Blockers:** None
   - **Recent Decisions:** Migrated to SQLite schema 019
   - **Next Steps:** Run benchmark scenario suite
   ```

---

## 5. Builtin Diagnostic Tools & Procedural Skills

### Builtin Tools (`src/tools/builtin/working-memory.tool.ts`)
All tools are configured as `TIER_0` (safe, instant, non-destructive):
- `working_memory.inspect`: Inspect active continuity state, active project, task, blockers, and recent working memory items.
- `working_memory.threads`: List or switch conversation threads for a session.
- `working_memory.pending`: List or resolve pending questions, approval actions, and next steps.
- `working_memory.checkpoint`: Create or restore structured conversational checkpoints.

### Builtin Procedural Skills (`src/skills/services/builtin-skills.ts`)
- `working-context`: Inspect active working memory, current task, blockers, and next steps.
- `resume-task`: Resume previous unfinished task or conversation thread across restarts.
- `conversation-checkpoint`: Create or restore a structured conversation checkpoint.
- `resolve-reference`: Resolve deictic pronouns or continuation directives in context.

---

## 6. HTTP REST API Endpoints

The HTTP server exposes 7 dedicated REST endpoints under `/working-memory/*`:
- `GET /working-memory/state`: Retrieve active continuity state for a session.
- `GET /working-memory/threads`: List threads for a session.
- `POST /working-memory/threads`: Create a new conversation thread.
- `POST /working-memory/threads/switch`: Switch active thread.
- `GET /working-memory/pending`: List open pending questions and actions.
- `POST /working-memory/checkpoint`: Create a manual checkpoint snapshot.
- `POST /working-memory/restore`: Restore state from a checkpoint.

---

## 7. Verification & Benchmark Results

### Unit Test Suite
- Test file: `tests/int-008-working-memory.test.ts`
- Total tests: **45 / 45 PASSED (100%)**
- Execution duration: **104.1 ms**

### Regression Test Suite
- `tests/int-002-fast-gate.test.ts`: PASSED
- `tests/int-004-context-residency.test.ts`: PASSED
- `tests/int-006-knowledge.test.ts`: PASSED (44/44)
- `tests/int-007-context-engine.test.ts`: PASSED (42/42)
- Total regression tests: **130 / 130 PASSED (100%)**

### Live Benchmark Results (`scripts/benchmark_int008_live.js`)
All 20 live scenarios executed with deterministic precision:

| # | Scenario | Latency | Thread / Context | Items | DB Ops | LLM | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Start a project thread | 3.20 ms | Let us work on HṚṢĪKEŚA | 2 | 4 | 0 | ✓ PASS |
| 2 | Continue without repeating project | 2.56 ms | Let us work on HṚṢĪKEŚA | 3 | 7 | 0 | ✓ PASS |
| 3 | "continue" directive | 1.56 ms | Let us work on HṚṢĪKEŚA | 5 | 10 | 0 | ✓ PASS |
| 4 | "continue the previous task" | 0.79 ms | Let us work on HṚṢĪKEŚA | 6 | 13 | 0 | ✓ PASS |
| 5 | Pronoun "it" resolution | 0.70 ms | Let us work on HṚṢĪKEŚA | 8 | 16 | 0 | ✓ PASS |
| 6 | Pronoun "that" resolution | 0.79 ms | Let us work on HṚṢĪKEŚA | 8 | 19 | 0 | ✓ PASS |
| 7 | Explicit project switch | 1.01 ms | Let us work on HṚṢĪKEŚA | 9 | 23 | 0 | ✓ PASS |
| 8 | Restore previous project | 1.17 ms | Let us work on HṚṢĪKEŚA | 10 | 27 | 0 | ✓ PASS |
| 9 | Unfinished task recovery | 0.19 ms | - | 11 | 29 | 0 | ✓ PASS |
| 10 | Blocker recovery | 1.42 ms | - | 12 | 31 | 0 | ✓ PASS |
| 11 | Checkpoint creation | 1.29 ms | Let us work on HṚṢĪKEŚA | 11 | 34 | 0 | ✓ PASS |
| 12 | Checkpoint restoration | 0.75 ms | - | 2 | 39 | 0 | ✓ PASS |
| 13 | Restart persistence | 13.86 ms | Let us work on HṚṢĪKEŚA | 1 | 44 | 0 | ✓ PASS |
| 14 | Ambiguous reference detection | 0.49 ms | - | 2 | 44 | 0 | ✓ PASS |
| 15 | Explicit user correction | 3.20 ms | Let us work on HṚṢĪKEŚA | 1 | 48 | 0 | ✓ PASS |
| 16 | Goal continuity | 0.38 ms | - | 12 | 50 | 0 | ✓ PASS |
| 17 | Mission continuity | 0.42 ms | - | 13 | 52 | 0 | ✓ PASS |
| 18 | Agent task continuity | 1.01 ms | - | 14 | 54 | 0 | ✓ PASS |
| 19 | Deterministic fast-path preservation | 0.01 ms | - | 0 | 0 | 0 | ✓ PASS |
| 20 | Normal chat isolation | 1.14 ms | - | 1 | 56 | 0 | ✓ PASS |

- **Total Scenarios:** 20
- **Passed:** 20 (100%)
- **Failed:** 0
- **Average Latency:** 1.80 ms
- **Unnecessary LLM Calls:** 0 (100% deterministic local logic)
