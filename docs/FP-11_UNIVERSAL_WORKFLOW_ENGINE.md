# HṚṢĪKEŚA (हृषीकेश) — Native Universal Workflow & Automation Engine
## Architectural Specification & Operational Reference (FP-11)

### 1. Executive Summary & Purpose

The Native Universal Workflow & Automation Engine (**FP-11**) elevates HṚṢĪKEŚA from a system capable of autonomously executing isolated missions, software engineering tasks, and computer operator goals into a sovereign, continuous, event-driven orchestration layer. 

A workflow in HṚṢĪKEŚA is not a mere sequential list of shell commands or scripts; it is a **durable executable directed graph**:

```
TRIGGER (Manual / Event / Cron / Interval / Webhook / Completed Task)
   ↓
WORKFLOW RUN (Durable state, Variables, Artifacts, Checkpoint)
   ↓
NODE (Action, Agent, Skill, Capability, Model, Mission, Goal, Engineering, Condition, Loop, Parallel, Join, Wait, Approval)
   ↓
CAPABILITY / SKILL / AGENT / MODEL / FP-10 ENGINEERING
   ↓
OBSERVE & VERIFY RESULT
   ↓
SAFE DETERMINISTIC EXPRESSION CONDITION
   ↓
NEXT NODE(S) / LOOP ITERATION / RECOVERY
   ↓
COMPLETED / RETRIED / RECOVERED / ESCALATED
```

The workflow engine orchestrates; existing sovereign subsystems perform the actual work without duplication.

---

### 2. Architectural Position in HṚṢĪKEŚA

FP-11 operates strictly above existing subsystems, reusing all frozen components:

```
                         RUSHIKESH (Human Sovereign)
                                     ↓
                                  HṚṢĪKEŚA
                                     ↓
                          WORKFLOW INTERFACE
                     (Chat · Voice · UI · REST · CLI)
                                     ↓
                              WORKFLOW ENGINE
                           /         |         \
                   TriggerMgr    Planner    RecoveryMgr
                           \         |         /
                                 Compiler
                                     ↓
                             Execution Engine
                                     ↓
       ┌─────────────────────────────┼─────────────────────────────┐
       ↓                             ↓                             ↓
    Workforce                     Skills                      Capabilities
  (Gandiva, etc.)         (SkillExecutionEngine)         (Universal Capability Fabric)
       ↓                             ↓                             ↓
   Missions                       ToolBus                      MCP / APIs
       ↓                             ↓                             ↓
Autonomous Engineering (FP-10)   Code Search                   Terminals
       └─────────────────────────────┼─────────────────────────────┘
                                     ↓
                             Observe & Verify
                                     ↓
                         Checkpointing & Memory
                                     ↓
                            Next Nodes / Escalate
```

---

### 3. Core Architectural Principles & Invariants

1. **FP-10 Frozen Integrity**: The Autonomous Software Engineering and Agentic Coding Engine (**FP-10**) remains 100% frozen. Workflow `CODE`, `TEST`, and `VERIFY` nodes route through `EngineeringFabric` rather than recreating software engineering logic.
2. **Deterministic Expression Safety**: Evaluated exclusively via `SafeExpressionEvaluator`. Arbitrary JavaScript `eval()`, `Function()`, `child_process`, or prototype manipulation is physically impossible.
3. **Strict Financial Governance**: Outgoing monetary transactions or high-risk actions can **never** execute automatically. An `APPROVAL` gate halts the workflow run in `WAITING_APPROVAL` status until an authorized human decision is signed and recorded.
4. **Idempotency & Checkpointing**: Every node transition generates a SHA-256 state fingerprint and checkpoint. On unexpected host shutdown or restart, `WorkflowRecoveryManager` scans in-flight runs and resumes them without repeating destructive side-effects.
5. **Anti-Loop & Cycle Bounds**: Loops are strictly bounded by `maxIterations` (default: 10). Cyclic graphs without an explicit bounded `LOOP` node are rejected at validation time. Consecutive identical state fingerprints without progress trigger automatic failure escalation.
6. **Resource-Aware Parallelism**: Parallel branches and heavy model inference respect `ResourceGovernor`. Under `CRITICAL_MEMORY` pressure, heavyweight local inference nodes are deferred to `WAITING` status rather than crashing the user's 16GB host laptop.
7. **Complete Tenancy & Secret Isolation**: Workflow definitions, runs, and artifacts respect `companyId` and `projectId` boundaries. Plaintext credentials are redacted from all execution logs and event payloads.

---

### 4. Workflow Domain Model & SQLite Persistence

Persistent schema implemented in Migration 025 (`src/persistence/migrations/025_workflow_engine_schema.ts`):

- **`workflows`**: Master definition entity with ID, name, description, category, scope (`GLOBAL`, `COMPANY`, `PROJECT`, `PERSONAL`), company/project bindings, status (`DRAFT`, `VALIDATING`, `ACTIVE`, `PAUSED`, `DISABLED`, `ARCHIVED`, `DEPRECATED`), active version number, and tags.
- **`workflow_versions`**: Immutable version snapshots containing the directed graph topology, triggers, variables, required capabilities/skills/agents, timeout constraints, retry policies, and financial approval gates.
- **`workflow_runs`**: Execution state tracking with `status` (`QUEUED`, `STARTING`, `RUNNING`, `WAITING`, `WAITING_APPROVAL`, `PAUSED`, `RETRYING`, `RECOVERING`, `BLOCKED`, `NEEDS_USER`, `COMPLETED`, `FAILED`, `CANCELLED`, `TIMED_OUT`), current variable mappings, active/completed/failed node arrays, and duration/tool/model resource counters.
- **`workflow_run_nodes`**: Execution audit log for individual nodes capturing inputs, outputs, errors, duration, tool call counts, agent attribution, and generated artifacts.
- **`workflow_approvals`**: Human decision gates tracking prompts, risk levels, payload summaries, pending/approved/rejected decisions, responder identities, and resolution timestamps.
- **`workflow_checkpoints`**: State snapshots keyed by SHA-256 idempotency hashes for crash-resilient restart recovery.
- **`workflow_schedules`**: Persistent trigger registrations with Cron/Interval timers wired to `PersistentScheduler`.
- **`workflow_artifacts`**: Output references (diffs, reports, logs, binaries) produced during execution.
- **`workflow_webhooks`**: Inbound webhook endpoints with HMAC-SHA256 signature verification, replay protection, and rate limiting.

---

### 5. Supported Node Types & Semantics

| Node Type | Purpose | Subsystem Integration |
| :--- | :--- | :--- |
| `TRIGGER` | Workflow entry point receiving trigger payload | `WorkflowTriggerManager` |
| `ACTION` | Generic tool or command execution | `ToolExecutionBus` |
| `AGENT` | Autonomous delegation to a named specialist | `AgentRegistry` & `AgentRuntime` |
| `SKILL` | Reusable procedural capability execution | `SkillExecutionEngine` |
| `CAPABILITY` | Universal connector invocation (CLI, REST, MCP) | `UniversalCapabilityFabric` |
| `MODEL` | Semantic reasoning, classification, extraction | `ModelRouter` |
| `MISSION` | High-level autonomous mission execution | `MissionOrchestrator` |
| `GOAL` | Autonomous goal breakdown & achievement | `GoalEngine` |
| `CODE` / `TEST` / `VERIFY` | Autonomous software engineering | `EngineeringFabric` (FP-10 Frozen) |
| `RESEARCH` | Deep intelligence gathering & source verification | `ResearchEngine` |
| `CONDITION` | Deterministic binary branching (`{{expr}}`) | `SafeExpressionEvaluator` |
| `SWITCH` | Deterministic multi-way branching | `SafeExpressionEvaluator` |
| `PARALLEL` | Concurrent execution fork for independent paths | `ResourceGovernor` |
| `JOIN` | Synchronization barrier (`ALL`, `ANY`, `QUORUM`) | `WorkflowExecutionEngine` |
| `LOOP` | Explicitly bounded cyclic execution | `WorkflowExecutionEngine` |
| `WAIT` | Timed delay or scheduled resumption | In-memory / Persistent resume |
| `APPROVAL` | Mandatory human decision checkpoint | `WorkflowApprovalManager` |
| `TRANSFORM` | Data extraction and variable interpolation | Safe JSON Mapping |
| `NOTIFY` | Event notification dispatch | `EventBus` |
| `REPORT` | Structured output summarization & artifact capture | Markdown / Artifact System |
| `END` | Terminal workflow node | Graph Validator / Engine |

---

### 6. Built-in Production Templates

Ten pre-configured, validated workflow templates are seeded out of the box:
1. **Daily Project Health**: Inspects active projects, runs verification tests, and generates executive health status.
2. **Build / Test / Verify Pipeline**: Clones workspace state, executes test suites, and flags build regressions.
3. **GitHub Issue Investigation**: Researches issue context, queries repo AST, reproduces defect, and drafts diagnosis.
4. **Research → Report Synthesis**: Conducts structured multi-source research and compiles Markdown report with citations.
5. **Autonomous Bug Fix**: Investigates defect, delegates to FP-10 engineering task, verifies patch, and stages diff.
6. **Website Quality Check**: Validates endpoints, audits performance, and verifies responsive layouts.
7. **Dependency Health Audit**: Scans package manifests for CVE vulnerabilities and outdated dependencies.
8. **Backup & Verification**: Checkpoints persistent SQLite databases and verifies backup archive integrity.
9. **Company Daily Operations**: Audits unassigned CRM tickets, reviews scheduled tasks, and compiles operational overview.
10. **Customer Support Response Drafting**: Classifies incoming query, pulls knowledge context, and drafts response for human approval.

---

### 7. User Interfaces & Observability

- **REST API**: Mounted at `/api/workflows/*` and `/api/workflow-runs/*` for CRUD, versioning, execution, stepping, approvals, and metrics.
- **Server-Sent Events (SSE)**: Live streaming event bus at `/api/workflows/events/stream` broadcasting real-time node transitions, approvals, and completion.
- **CLI (`hres workflow`)**: Sovereign CLI commands for listing, creating, validating, activating, pausing, running, and inspecting logs.
- **Visual Canvas UI**: Integrated in HṚṢĪKEŚA Control Center (`WorkflowEngineView.tsx`) featuring:
  - Vedic manuscript parchment & dark observatory temple aesthetics.
  - Interactive SVG topology canvas visualizing real-time node states (`PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `WAITING`, `WAITING_APPROVAL`).
  - Live approval gate modals with one-click approval/rejection.
  - Natural language workflow synthesizer dialog.
  - Granular execution timeline with memory, tool, and model telemetry.
