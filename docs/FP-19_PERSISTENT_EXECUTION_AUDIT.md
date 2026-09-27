# FP-19: Persistent Distributed Execution & 24/7 Operations Fabric
## Comprehensive Pre-Implementation Audit & Reuse Mapping

**Author:** HṚṢĪKEŚA (हृषीकेश)  
**Sovereign Master:** Rushikesh Pattiwar  
**Timestamp:** 2026-09-27  
**Baseline Verification:** FP-18 Complete & Frozen (2,134 tests / 285 suites passing / 0 failures / 6 baseline skips)  
**Migration Sequence:** Target Migration 033 (`033_persistent_execution_schema.ts`)  

---

## 1. Executive Summary & Core Objective

The purpose of **FP-19 (Persistent Distributed Execution & 24/7 Operations Fabric)** is to transform HṚṢĪKEŚA from a primarily local execution system into an auditable, persistent, distributed, resumable execution platform capable of continuing authorized work across:
$$\text{LOCAL MACHINE} \longrightarrow \text{LAN WORKERS} \longrightarrow \text{REMOTE MACHINES} \longrightarrow \text{CLOUD WORKERS} \longrightarrow \text{AUTHORIZED HOSTED ENVIRONMENTS}$$

FP-19 is **not** another orchestration engine. It does **not** create duplicate Mission, Goal, Workflow, Skill, Memory, Knowledge Graph, or Agent frameworks. Instead, FP-19 provides the **persistent execution substrate** beneath existing orchestration layers:
```
RUSHIKESH
   │
   ▼
HṚṢĪKEŚA (Director & Control Plane)
   │
   ▼
MISSION / GOAL / WORKFLOW / COMPANY OS
   │
   ▼
WORKFORCE (17 Authorized Agents) + SKILLS + CAPABILITIES
   │
   ▼
[FP-19 PLACEMENT ENGINE] ──► (Local, LAN, Remote, Cloud, Hosted)
   │
   ▼
[FP-19 EXECUTION WORKER] ──► (Lease + Fencing + Heartbeat)
   │
   ▼
TOOLS / APPS / BROWSER / APIS / MCP
   │
   ▼
EXECUTE ──► OBSERVE ──► VERIFY ──► CHECKPOINT ──► CONTINUE / RECOVER / COMPLETE
```

---

## 2. 30-Domain Architectural Audit

Every capability domain has been audited against the existing HṚṢĪKEŚA codebase. Classification keys:
- `EXISTING`: Subsystem is already implemented and must be reused as-is.
- `EXTEND`: Subsystem exists but requires additional methods, schema, or integration for persistent distributed operations.
- `ADAPTER_REQUIRED`: A bridge or connector is needed to link existing modules to FP-19 abstractions.
- `MISSING`: Must be newly created in FP-19.
- `DEFERRED`: Non-critical functionality intentionally deferred to future specialized blocks.
- `UNSAFE`: Incompatible with sovereign control or security policies; strictly forbidden.

| # | Subsystem / Capability | Existing Status in Repository | FP-19 Classification | Action Plan & Architectural Decision |
| :- | :--- | :--- | :--- | :--- |
| **1** | **FP-03 Distributed Resource Fabric** | `src/resources/resource.manager.ts`, `resource.registry.ts` | `EXTEND` | Contains core `Worker`, `WorkerTask`, and telemetry snapshots. Extend with durable runtime abstractions, lease management, fencing tokens, and drain lifecycles. |
| **2** | **FP-04 Worker Transport & Security** | `src/resources/transport/`, TLS 1.3 socket protocol | `EXISTING` | Reused directly. Dedicated port 4300 TLS 1.3 transport, X.509 cert generation, and session tokens provide the wire protocol for physical workers. |
| **3** | **FP-05 Multi-Worker Sessions** | `WorkerTransportServer`, concurrency limits, queueing | `EXISTING` | Reused directly for simultaneous TCP/TLS connections and demultiplexed session tracking. |
| **4** | **FP-06 LAN Worker Verification** | `tests/fp06-lan-validation.ts` | `EXISTING` | Reused for physical LAN discovery verification and honest `NOT_AVAILABLE` reporting on single-node setups. |
| **5** | **Phase 16 Scheduler** | `src/scheduling/persistent.scheduler.ts`, `ScheduleRepository` | `ADAPTER_REQUIRED` | Reused to schedule one-time, interval, and recurring triggers. Bridge into FP-19 persistent execution jobs (`ExecutionJob`). |
| **6** | **Persistent Objectives & Goals** | `src/goal/goal.execution.engine.ts`, `goal.repository.ts` | `ADAPTER_REQUIRED` | Goals persist in `goals` table (Migration 006). FP-19 binds goal steps to persistent execution jobs with durable checkpoints. |
| **7** | **ResourceGovernor** | `src/core/governor/resource-governor.ts` | `EXISTING` | Reused directly. Real-time CPU, RAM, and GPU monitoring. PlacementEngine checks Governor pressure before placing jobs locally. |
| **8** | **MissionOrchestrator (Phase 13 / FP-14)** | `src/mission/services/mission.orchestrator.ts` | `ADAPTER_REQUIRED` | Reused for multi-agent DAG planning and dispatch. Missions dispatch execution tasks through FP-19 rather than local-only promises. |
| **9** | **GoalExecutionEngine** | `src/goal/goal.execution.engine.ts` | `ADAPTER_REQUIRED` | Adapter triggers goal evaluation cycles via FP-19 jobs without rewriting goal state machine. |
| **10** | **Workflow Engine (FP-11)** | `src/workflows/workflow.engine.ts` | `ADAPTER_REQUIRED` | FP-11 manages step DAGs; individual workflow steps (HTTP, Script, CLI, Agent) delegate execution to FP-19 workers. |
| **11** | **SkillExecutionEngine (Phase 20)** | `src/skills/` | `ADAPTER_REQUIRED` | Procedural skill trees dispatch node invocations through FP-19 PlacementEngine. |
| **12** | **AgentRegistry (Phase 13.6)** | `src/agents/agent-registry.ts` | `EXISTING` | Authoritative 17-agent roster. Retained without modification. Agents remain logical personas, not physical workers. |
| **13** | **Workforce Runtime (FP-14)** | `src/mission/workforce.runtime.ts` | `ADAPTER_REQUIRED` | Connects logical agent assignments to physical worker placement via FP-19 ExecutionRuntime. |
| **14** | **Account/Service Fabric (FP-12)** | `src/accounts/account.fabric.ts`, `credential.vault.ts` | `EXISTING` | Reused for OAuth2 and cloud API credentials. Raw secrets are never stored in job payloads or logs (`vault://` only). |
| **15** | **Digital Workspace (FP-13)** | `src/digital-workspace/` | `EXTEND` | Reused for local window/application management. Extended to correlate remote machine environments with workspace topology. |
| **16** | **Mission/Workforce Runtime (FP-14)** | `src/mission/` | `EXTEND` | Reused for blackboard state and consensus verification across long-running distributed steps. |
| **17** | **Ecosystem Fabric (FP-15)** | `src/ecosystem/universal.ecosystem.fabric.ts` | `EXISTING` | Reused for interface resolution ladder (`LOCAL_API` > `AUTHENTICATED_API` > `MCP` > `CLI` > `BROWSER` > `DESKTOP`). |
| **18** | **Demonstration Learning (FP-16)** | `src/demonstration/` | `EXISTING` | Frozen. Learned skills can be dispatched across FP-19 workers without modifying FP-16. |
| **19** | **Creation Studio (FP-17)** | `src/creation/creation.fabric.ts` | `EXISTING` | Frozen. Creation jobs (video render, image diffusion) can be placed onto GPU-capable LAN/Cloud workers. |
| **20** | **Decision Intelligence (FP-18)** | `src/decision/decision.fabric.ts` | `EXISTING` | Frozen. Decisions feed into FP-19 Action Bridge proposals (Missions, Goals, Workflows, Skills, Environment Changes). |
| **21** | **Phase 23 External Environments** | `src/environment/` (SSH, WinRM, Docker, Cloud) | `ADAPTER_REQUIRED` | FP-19 wraps Phase 23 environment connectors as `ExecutionRuntime` instances (`REMOTE_MACHINE`, `CLOUD_VM`, `CLOUD_CONTAINER`). |
| **22** | **Phase 24 Voice / Multimodal** | `src/multimodal/`, `src/voice/` | `ADAPTER_REQUIRED` | Natural language and voice commands ("keep this running", "pause everything", "move to another worker") map to FP-19 APIs. |
| **23** | **Phase 25 Company Operations** | `src/company/` | `ADAPTER_REQUIRED` | Company OS schedules recurring objectives (monitoring, backups, research). FP-19 executes them headlessly 24/7. |
| **24** | **Phase 26 Self-Improvement** | `src/self-improvement/` | `ADAPTER_REQUIRED` | Governed self-maintenance tasks (nightly tests, dependency audits) run on FP-19 workers without bypassing HITL boundaries. |
| **25** | **Startup / Shutdown Lifecycle** | `src/index.ts`, `src/core/lifecycle/` | `EXTEND` | Add startup recovery hook to scan SQLite for in-flight/interrupted jobs and resume/requeue them safely with fencing tokens. |
| **26** | **Audit & Event System** | `src/core/events/event-bus.ts`, audit tables | `EXISTING` | Reused directly. Emit typed `execution.*` and `worker.*` events across the central EventBus. |
| **27** | **Recovery System** | `src/core/recovery/recovery-manager.ts` | `EXTEND` | Add distributed failure classifications (worker disconnect, lease expiration, fence rejection, network timeout). |
| **28** | **Server-Sent Events (SSE)** | `src/api/http.server.ts` | `EXTEND` | Mount `/api/execution/events` for real-time live streaming of job progress, checkpoints, and worker health. |
| **29** | **REST API Gateway** | `src/api/` | `EXTEND` | Mount `/api/workers/*`, `/api/runtimes/*`, and `/api/execution/*` endpoints following existing Express/HTTP conventions. |
| **30** | **Control Center UI** | `ui/src/views/` | `MISSING` | Create `ui/src/views/PersistentOperationsView.tsx` with worker map, job queue, inspector panels, and real telemetry. |

---

## 3. Strict Boundary Rules & Invariants

1. **Infrastructure, Not Brain:** FP-19 provides persistence, leases, fencing, checkpointing, placement, and recovery. It does not replace ModelRouter, KnowledgeGraph, Memory, or Workforce.
2. **Separation of Agent & Execution Worker:**
   - **Agent:** Logical persona (e.g. `gandiva` for coding, `rahu` for research, `chanakya` for strategy).
   - **Execution Worker:** Physical or virtual compute node (e.g. `worker-local`, `worker-lan-alpha`, `worker-cloud-gpu`).
   - An agent's assigned task is executed on a worker determined by the PlacementEngine.
3. **Lease & Fencing Token Guarantee:**
   - Every worker execution requires an active time-bounded lease.
   - Every state update must present a monotonically increasing `fencingToken`.
   - If a lease expires and another worker acquires the job, any subsequent update from the stale worker is rejected with `FENCE_TOKEN_STALE`.
4. **Zero Silent Cloud Spending:**
   - Cloud providers default to `DENY_PAID_WITHOUT_APPROVAL`.
   - Missing or unconfigured credentials report `NOT_CONFIGURED`, not `FAILED` or `AVAILABLE`.
   - Quotas not exposed by provider APIs report `QUOTA_UNKNOWN`.
5. **Honest 24/7 Operations:**
   - The system only reports 24/7 operational capability when an active persistent worker (LAN, Remote, Cloud) is reachable.
   - If only the local laptop is registered and it powers off, jobs enter `WAITING_FOR_WORKER`, never falsely claiming to be running.
6. **Multi-Tenant Scope Isolation:**
   - Every persistent job enforces `scope` (`GLOBAL`, `PERSONAL`, `COMPANY`, `PROJECT`, `CLIENT`, `TASK`).
   - Cross-company or cross-client worker assignment is strictly prohibited.
7. **Verification Precedes Retries (Recovery Safety):**
   - Before replaying any failed or interrupted step, the system verifies whether side effects already succeeded to prevent duplicate external actions.
