# FP-10: HṚṢĪKEŚA AUTONOMOUS SOFTWARE ENGINEERING & AGENTIC CODING ENGINE
## Sovereign Autonomous Software Engineering Architecture & Specification

> **Phase:** Foundation Performance & Execution Block FP-10  
> **Status:** COMPLETED — PRODUCTION READY  
> **Target Machine:** Acer Swift SFG14-73T (Intel Core Ultra 5 125H, 16 GB RAM, Windows 11)  
> **Sovereign Master:** Rushikesh Pattiwar  
> **Core Principle:** `MODEL PROPOSES → GOVERNED SYSTEM EXECUTES`  
> **Anti-Loop Invariant:** Bounded attempts, failure fingerprinting, non-monotonic progress regression halting, human-in-the-loop escalation.

---

## 1. Executive Summary & Mission Realization

FP-09 established a functioning development workspace (workspace management, file operations, code search, precision editing, terminal execution, Git SCM, live preview, and baseline verification loops). However, AI coding workflow was previously architectural and simulated.

**FP-10 delivers the true autonomous software engineering engine** for HṚṢĪKEŚA:
- Bound to the **Universal ModelRouter** (`qwen2.5-coder:7b`, `deepseek-r1:1.5b`, Claude 3.5 Sonnet / Haiku, GPT-4o).
- Model outputs strictly **structured intent** (`EngineeringActionPayload`) rather than raw unbounded shell scripts.
- Every model action is validated against strict path traversal, danger tiers, and workspace boundaries via `EngineeringActionValidator`.
- Concurrent human changes are protected via SHA-256 pre-read baselines (`fileBaselineHashes`). Stale patches are aborted cleanly.
- Normalizes raw test, linter, runtime, and compiler failures into `StructuredDiagnostic` with failure fingerprints.
- Closes the autonomous repair loop using `ModelDrivenRepairEngine` with precision surgical edits.
- Enforces multi-dimensional convergence guarantees via `ConvergenceEngine`, halting infinite loops, repeated failure cycles, and budget exhaustion.
- Exposes 9 autonomous engineering skills, REST & SSE live streaming APIs, `hres engineering` CLI commands, and a dedicated Glassmorphic Control Center UI view.

```
                    ┌────────────────────────────────────────────────────────┐
                    │      HṚṢĪKEŚA AUTONOMOUS ENGINEERING ENGINE (FP-10)     │
                    └────────────────────────────────────────────────────────┘
                                                 │
                                                 ▼
                    ┌────────────────────────────────────────────────────────┐
                    │             10-STAGE AUTONOMOUS LIFECYCLE              │
                    │                                                        │
                    │  1. UNDERSTAND  ──►  2. PLAN       ──►  3. MODIFY      │
                    │  4. EXECUTE     ──►  5. OBSERVE    ──►  6. TEST        │
                    │  7. VERIFY      ──►  8. FIX        ──►  9. REVERIFY    │
                    │  10. REPORT                                            │
                    └────────────────────────────────────────────────────────┘
                                                 │
         ┌───────────────────────────────────────┼───────────────────────────────────────┐
         ▼                                       ▼                                       ▼
┌──────────────────┐                   ┌──────────────────┐                   ┌──────────────────┐
│ MODEL ROUTER     │                   │ ACTION VALIDATOR │                   │ CONVERGENCE &    │
│ - Task Routing   │                   │ - Path Sandbox   │                   │ ANTI-LOOP GUARD  │
│ - System Prompts │                   │ - Forbidden RegEx│                   │ - Fingerprints   │
│ - Surgical Patch │                   │ - Danger Tiers   │                   │ - Attempt Budget │
│ - Token Telemetry│                   │ - User Protection│                   │ - Regression Halt│
└──────────────────┘                   └──────────────────┘                   └──────────────────┘
         │                                       │                                       │
         └───────────────────────────────────────┼───────────────────────────────────────┘
                                                 │
                                                 ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               UNIVERSAL CAPABILITY FABRIC              │
                    │       & TRANSACTIONAL PERSISTENCE (MIGRATION 024)      │
                    └────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Subsystems

### 2.1 Persistence Layer & Schema (`Migration 024`)
Located at `src/persistence/migrations/024_autonomous_engineering_schema.ts`:
- `engineering_tasks`: Durable master table storing objectives, 16-phase state machine, budget constraints, tokens, tool calls, and completion metrics.
- `engineering_plans`: Synthesized multi-step plans with danger tiers, target files, and approval flags.
- `engineering_actions`: Structured model and tool actions with pre-validation and execution results.
- `engineering_diagnostics`: Normalized failure records, category classification, stack trace locations, and deterministic failure fingerprints.
- `engineering_repairs`: Historical repair attempts, model attribution, duration, changeset linkages, and outcome evaluation (`IMPROVED`, `REGRESSED`, `RESOLVED`, `FAILED`).
- `engineering_verifications`: Audit ledger recording verified stages (`TYPECHECK`, `UNIT_TESTS`, `LINT`, `E2E`).

### 2.2 Action Validator (`EngineeringActionValidator`)
Located at `src/engineering/actions/action.validator.ts`:
- Enforces strict path traversal prevention: all file access must resolve within the active workspace root.
- Rejects dangerous commands matching forbidden regex patterns (`rm -rf`, `mkfs`, `format`, `dd`, `chmod -R 777`, `git push --force`, `curl | bash`).
- Evaluates risk tiers (Tier 0 to Tier 4) and flags high-impact operations (e.g. `DELETE_FILE`, database drops) for human approval.
- Validates payload completeness (target lines, string content, replacement chunks).

### 2.3 User Conflict Protection (`SoftwareEngineeringExecutionEngine`)
Located at `src/engineering/execution/engineering.execution.engine.ts`:
- On `READ_FILE`, records a baseline SHA-256 hash of the target file.
- Before `EDIT_FILE` or patch application, recalculates the current file hash.
- If the file was modified externally by the human operator, the patch is rejected immediately with `Concurrent modification detected: User work protected`, ensuring the agent never clobbers human edits.

### 2.4 Diagnostic Normalizer (`DiagnosisEngine`)
Located at `src/engineering/diagnosis/diagnosis.engine.ts`:
- Categorizes raw terminal and compiler streams into structured categories: `TEST_FAILURE`, `TYPE_ERROR`, `LINT_ERROR`, `BUILD_FAILURE`, `DEPENDENCY_ERROR`, `PERMISSION_ERROR`, `NETWORK_ERROR`, `TIMEOUT`, `RUNTIME_ERROR`.
- Extracts file paths, line numbers, columns, expected values, and received values from Mocha/Jest/Node.js assert diffs and TypeScript compiler diagnostics.
- Computes deterministic failure fingerprints (`category:file:line:message_hash`) to track repeated failure states across iterations.

### 2.5 Convergence Engine & Anti-Loop Safeguards (`ConvergenceEngine`)
Located at `src/engineering/convergence/convergence.engine.ts`:
- Evaluates test delta progression across consecutive repair attempts.
- Classifies repair outcomes:
  - `RESOLVED`: 0 remaining diagnostics, all tests pass.
  - `IMPROVED`: Failure count strictly decreased.
  - `UNCHANGED`: Failure count and fingerprint remain identical.
  - `REGRESSED`: Failure count increased or new errors introduced.
- Anti-Loop Invariants:
  - Halts with `REPEATED_FAILURE` when >= 3 consecutive identical failure fingerprints are observed.
  - Halts with `BUDGET_EXHAUSTED` when attempt count exceeds `maxAttempts` or duration exceeds `maxDurationSeconds`.
  - Halts and escalates to `NEEDS_USER` when regression persists or operator intervention is required.

### 2.6 Model-Driven Repair Engine (`ModelDrivenRepairEngine`)
Located at `src/engineering/repair/model.repair.engine.ts`:
- Integrates directly with `ModelRouter.routeAndExecute()`.
- Provides surgical prompt context including: failure diagnostic, target file slice (±10 lines around defect), error message, and previous failed repair history.
- Enforces strict structured output parsing (`EDIT_FILE` JSON schema).
- Employs deterministic surgical repair heuristics for common inverted logic and typos when local model router is unconfigured or offline.
- Stages changes in `EditorEngine` changesets with unified diff computation and atomic rollback support.

### 2.7 10-Stage Autonomous Lifecycle (`EngineeringFabric`)
Located at `src/engineering/engineering.fabric.ts`:
1. **UNDERSTAND**: Resolves active workspace, inspects package manager, scripts, and conventions.
2. **PLAN**: Synthesizes structured `EngineeringPlan` with step dependencies and risk ratings.
3. **MODIFY / EXECUTE**: Applies validated precision edits or commands.
4. **TEST**: Discovers package test runner (`npm`, `pytest`, `cargo`, `go`) and executes tests safely.
5. **OBSERVE & DIAGNOSE**: Captures terminal stdout/stderr and normalizes into `StructuredDiagnostic`.
6. **CONVERGE**: Evaluates progress and enforces anti-loop guards.
7. **REPAIR**: Queries model router for surgical patch.
8. **VERIFY / REVERIFY**: Re-executes test suite to verify defect resolution.
9. **AUDIT**: Persists verified stages into SQLite ledger.
10. **REPORT**: Emits real-time SSE events and records final task completion summary.

---

## 3. Registered Engineering Skills

9 autonomous skills registered in the Universal Capability Fabric:
1. `fix-build`: Diagnoses compiler/bundler errors, resolves missing dependencies or syntax defects.
2. `fix-test`: Runs failing test suites, normalizes assertion failures, and applies surgical repairs.
3. `add-test`: Scans uncovered source code and generates automated unit tests.
4. `refactor-code`: Improves code readability, complexity, and modularity without breaking tests.
5. `review-code`: Analyzes security vulnerabilities, performance bottlenecks, and style compliance.
6. `security-review`: Detects credential leaks, path traversals, and dangerous command executions.
7. `performance-analysis`: Identifies algorithmic bottlenecks and slow I/O operations.
8. `dependency-upgrade`: Analyzes package dependencies for security advisories and updates safely.
9. `implement-feature`: Translates natural language requirements into planned, verified code changes.

---

## 4. Interfaces & Control Surfaces

### 4.1 CLI Commands (`hres engineering`)
- `hres engineering start <objective>`: Starts an autonomous engineering session.
- `hres engineering list`: Lists recent engineering tasks with status, attempts, and phase.
- `hres engineering status <taskId>`: Displays full details, budget, and diagnostic history.
- `hres engineering plan <taskId>`: Displays synthesized multi-step plan.
- `hres engineering pause <taskId>`: Pauses active autonomous execution.
- `hres engineering resume <taskId>`: Resumes paused execution.
- `hres engineering cancel <taskId>`: Cancels task cleanly.

### 4.2 REST & SSE Endpoints
- `GET /api/engineering/tasks`: Lists engineering tasks with filtering.
- `POST /api/engineering/tasks`: Creates and queues a new engineering task.
- `GET /api/engineering/tasks/:id`: Retrieves task details and audit trail.
- `POST /api/engineering/tasks/:id/run`: Starts or resumes execution.
- `POST /api/engineering/tasks/:id/pause`: Pauses execution.
- `POST /api/engineering/tasks/:id/cancel`: Cancels execution.
- `GET /api/engineering/events`: Real-time Server-Sent Events (SSE) streaming of task lifecycle events.

### 4.3 Control Center UI (`AutonomousEngineeringView.tsx`)
Mounted in `ui/src/views/AutonomousEngineeringView.tsx`:
- Real-time task creation form with complexity, priority, and budget sliders.
- Task status card grid with attempt progress bars and phase badges.
- Live SSE event feed showing diagnosis, repairs, and verification stages.
- Interactive plan and verification audit ledger inspector.

---

## 5. Verification & Acceptance Testing

The dedicated test suite `tests/fp-10-autonomous-engineering.test.ts` executes 39 rigorous tests covering:
- Database schema and migration 024 integrity.
- Workspace binding and architecture detection.
- Context extraction across T0-T4 tiers.
- Action validator security against path traversal and dangerous commands.
- EditorEngine precision edits, diff generation, and atomic rollback.
- Terminal manager safe command execution and output capture.
- Automated test discovery across `npm`, `pytest`, `cargo`, `go`.
- Diagnostic normalization and deterministic failure fingerprinting.
- ModelDrivenRepairEngine patch generation and precondition verification.
- Re-testing and progress classification (`IMPROVED`, `REGRESSED`, `RESOLVED`).
- User modification conflict protection via SHA-256 baselines.
- Capability fabric integration and 9 registered engineering skills.
- Verifications ledger and diagnostic hypotheses persistence.
- Risk tier evaluation and human approval gating.
- Budget constraints and attempt limits.
- Task pause, resume, cancel, and reboot recovery from SQLite.
- REST API endpoints and SSE event streaming.
- CLI commands via `runHresCli`.
- **Real E2E Autonomous Repair**: Deterministic bug in `calc.js` autonomously resolved and verified clean.
- **Negative E2E Termination**: Unsolvable defect detected, attempts bounded, loop halted cleanly without hanging.
- Malformed model output rejection and tool failure error handling.

**Test Results:** `39 / 39 PASS (100%)`. Duration: `~4.3s`.
