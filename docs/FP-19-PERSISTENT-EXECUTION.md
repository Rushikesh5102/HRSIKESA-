# FP-19: Persistent Distributed Execution & 24/7 Operations Fabric

## Overview
**FP-19** establishes the sovereign, durable, distributed execution substrate for HṚṢĪKEŚA (हृषीकेश). It provides a fault-tolerant 24/7 runtime fabric that powers long-running, multi-step, unattended workflows, missions, goals, and background tasks across diverse runtime environments: `LOCAL` (Acer Swift laptop), `LAN` (secondary home/office machines), `REMOTE` (self-hosted servers/SSH), `CLOUD` (provisioned on-demand instances), and `HOSTED` (authorized serverless workers).

```
                     ORCHESTRATION LAYERS
  (Company OS / Mission Engine / Workflow Engine / Goal Engine / Skills)
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │       FP-19 PERSISTENT EXECUTION FABRIC      │
        │                                              │
        │  [ExecutionScheduler]  ──► Priority Queues   │
        │  [WorkerRegistry]      ──► Heartbeats/Health │
        │  [LeaseFencingManager] ──► Fencing Tokens    │
        │  [CheckpointEngine]    ──► Resumption State  │
        │  [RecoveryManager]     ──► Auto-Failover     │
        │  [CloudRuntimeBridge]  ──► Cost & Approvals  │
        └──────────────────────┬───────────────────────┘
                               │
       ┌───────────────┬───────┴───────┬───────────────┐
       ▼               ▼               ▼               ▼
     LOCAL            LAN           REMOTE           CLOUD
 (Intel Ultra 5)  (Home Node)     (VPS / SSH)   (AWS/GCP/RunPod)
```

---

## 1. Architectural Invariants

1. **Substrate, Not Duplication:**
   FP-19 does not re-implement high-level task planning, agent deliberation, or business logic. It operates as the underlying execution fabric beneath the Mission Engine (FP-14), Universal Workflow Engine (FP-11), Goal Engine, Skill Engine, and Company OS (FP-18).
2. **Deterministic Resumability & Checkpointing:**
   Every execution job periodically snapshots its internal memory, execution step, tool state, and verified artifacts. Upon worker crash, machine reboot, or network partition, jobs resume from their last verified checkpoint without re-executing completed idempotent steps.
3. **Monotonic Fencing Tokens & Split-Brain Prevention:**
   Lease acquisitions increment a strictly monotonic 64-bit fencing token. Any write, state transition, or checkpoint commit originating from a worker with an expired or superseded lease token is rejected, preventing zombie workers from corrupting state.
4. **Autonomous Resilience with Sovereign Authority:**
   The fabric operates 24/7 unattended for local and pre-authorized LAN/remote resources. However, initiating paid cloud compute strictly enforces the `DENY_PAID_WITHOUT_APPROVAL` policy, ensuring zero unexpected financial liability for Rushikesh Pattiwar.
5. **Zero External Orchestrator Dependencies:**
   No external Redis, Kafka, Celery, Temporal, or Kubernetes clusters. The entire fabric runs reliably on Node.js/TypeScript backed by WAL-mode SQLite (`data/hrisekesa.db`).
6. **Graceful Degradation & Migration:**
   When local hardware experiences critical memory or thermal pressure, non-critical background jobs are throttled, paused, or transparently migrated to available LAN or remote worker nodes.

---

## 2. Relational Schema Architecture (Migration 033)

Persisted through SQLite with WAL mode, foreign key enforcement, and indexed queries:

| Table | Purpose | Key Indexes |
| :--- | :--- | :--- |
| `execution_runtimes` | Physical/virtual compute node descriptors (locality, hardware profile, OS, status) | `idx_exec_runtimes_locality` |
| `execution_workers` | Active worker daemon instances registered to runtimes with heartbeat tracking | `idx_exec_workers_runtime`, `idx_exec_workers_status` |
| `execution_jobs` | Durable execution job definitions, states, priority, attempts, and lease tracking | `idx_exec_jobs_state_prio`, `idx_exec_jobs_worker` |
| `execution_leases` | Mutual exclusion distributed locks with monotonic fencing tokens and TTL expiration | `idx_exec_leases_job`, `idx_exec_leases_active` |
| `execution_checkpoints` | Incremental job state snapshots, step indices, memory dumps, and verification data | `idx_exec_checkpoints_job` |
| `execution_queues` | Priority-stratified job queuing with concurrency constraints and throughput limits | `idx_exec_queues_name` |
| `cloud_providers` | Configured cloud infrastructure providers, API endpoints, regions, and quotas | Primary Key (`id`) |
| `cloud_instances` | Provisioned virtual instances with IP addresses, cost trackers, and lifecycle state | `idx_cloud_instances_provider` |
| `execution_traces` | Append-only execution audit ledger recording all state transitions, leases, and events | `idx_exec_traces_job`, `idx_exec_traces_timestamp` |

---

## 3. Core Subsystems & Components

### 3.1 Worker Registry & Heartbeat Daemon (`WorkerRegistryService`)
- Maintains real-time catalog of active worker agents across all runtimes.
- Tracks worker states: `ONLINE`, `BUSY`, `DEGRADED`, `DRAINING`, `OFFLINE`, and `REVOKED`.
- Enforces heartbeat intervals (default 10s). Workers failing to report within the timeout window (30s) are marked `DEGRADED` and then `OFFLINE`.
- Supports dynamic inventory updates (installed tools, available LLM models, RAM/CPU metrics).

### 3.2 Lease & Fencing Engine (`LeaseFencingService`)
- Distributed mutual exclusion lock ensuring exactly-one-active-worker per job.
- Generates monotonic fencing tokens (`fenceToken = current + 1`) on every lease grant or takeover.
- Validates lease holder identity and token freshness on every state mutation:
  ```typescript
  verifyFencingToken(jobId: string, token: number): boolean
  ```
- Rejecting stale tokens protects the system against delayed network packets and zombie execution loops.

### 3.3 Checkpoint & State Migration Engine (`CheckpointEngineService`)
- Persists serializable step snapshots: completed steps, pending steps, runtime variables, and verification evidence.
- Formats transportable `JobMigrationPackage` bundles containing checkpoints, specifications, and execution history.
- Allows migrating running jobs from an overheating or shutting-down local node to a LAN node or cloud worker with zero progress loss.

### 3.4 Multi-Queue Priority Scheduler (`ExecutionSchedulerService`)
- 5 priority tiers: `CRITICAL` (P0), `HIGH` (P1), `NORMAL` (P2), `LOW` (P3), `BACKGROUND` (P4).
- Matches job requirements (locality, minimum RAM, required tools, GPU accelerators) against worker capabilities.
- Enforces per-queue max concurrency and fair-share scheduling to prevent low-priority job starvation.

### 3.5 Auto-Recovery & Failover Manager (`RecoveryManagerService`)
- Scans for abandoned jobs belonging to dead or non-responsive workers.
- Reclaims expired leases, marks failed attempts, and schedules retries with exponential backoff and jitter.
- Exhausted jobs exceeding `maxAttempts` are automatically transitioned to `DEAD_LETTER` for operator triage.

### 3.6 Cloud Runtime Bridge (`CloudRuntimeBridgeService`)
- Abstraction layer for cloud compute providers: AWS, GCP, Azure, Hetzner, Lambda Labs, RunPod.
- Cost tracking and budget cap enforcement.
- Strict human-in-the-loop gate: attempts to spawn paid instances without explicit operator authorization immediately fail with `DENY_PAID_WITHOUT_APPROVAL`.

### 3.7 Unified Execution Fabric (`ExecutionFabric`)
- Master coordinator unifying repository, registries, lease fencing, checkpoints, scheduling, recovery, and cloud bridge.
- Provides high-level operational APIs: `submitJob()`, `pauseJob()`, `resumeJob()`, `cancelJob()`, `migrateJob()`, and `getOperationsSummary()`.
- Emits real-time SSE events via `EventBus` for live dashboard visualization in the UI.

---

## 4. CLI Interface (`hres execution` / `hres runtime`)

The operator controls the 24/7 operations fabric directly via the sovereign CLI:

```bash
# View all registered runtimes and hardware specs
hres runtime list

# Inspect detailed status of a specific runtime
hres runtime status <runtimeId>

# List all active and scheduled persistent execution jobs
hres execution list

# Inspect job state, lease token, fence token, and progress
hres execution status <jobId>

# Pause a running job
hres execution pause <jobId>

# Resume a paused or failed job from its last checkpoint
hres execution resume <jobId>

# Migrate a job to another worker node
hres execution migrate <jobId> <targetWorkerId>

# Audit state transitions and execution history
hres execution trace <jobId>

# View 24/7 operations summary and resource loads
hres execution summary
```

---

## 5. Security & Governance Invariants

1. **Operator Primacy:** Rushikesh Pattiwar holds exclusive authority over resource permissions, paid cloud provisioning, and job cancellation.
2. **Worker Isolation:** Workers run with isolated working directories and bounded memory limits.
3. **No Unfenced Writes:** All database mutations on job states verify the presenting worker's active lease and fencing token.
4. **Audit Immutability:** Execution traces in `execution_traces` are append-only and cannot be modified or truncated by workers.
