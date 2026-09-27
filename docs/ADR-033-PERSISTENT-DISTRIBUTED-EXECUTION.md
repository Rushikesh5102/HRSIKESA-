# ADR-033: Persistent Distributed Execution & 24/7 Operations Fabric

## Status
ACCEPTED

## Date
2026-09-27

## Context
Prior to FP-19, HṚṢĪKEŚA possessed sophisticated higher-level autonomous orchestration layers:
- Universal Workflow Engine (FP-11)
- Autonomous Engineering & Mission Architecture (FP-10, FP-14)
- Digital Workspace Operator (FP-13)
- Real-World Research & Decision Intelligence Fabric (FP-18)
- Sovereign Company OS & Autonomous Workforce (FP-18)

However, these systems lacked a unified, resilient, low-level execution substrate capable of running 24/7 across diverse physical and virtual compute environments (`LOCAL`, `LAN`, `REMOTE`, `CLOUD`, `HOSTED`). Tasks could be interrupted by machine reboots, transient network dropouts, or worker crashes, risking duplicate execution or orphaned state. Furthermore, expanding execution beyond the local machine risked split-brain writes, zombie worker conflicts, and unconstrained cloud billing.

## Decision
We implemented **FP-19: Persistent Distributed Execution & 24/7 Operations Fabric** as the foundational runtime substrate underpinning all higher orchestration layers.

### Key Architectural Invariants:
1. **Substrate Separation of Concerns:**
   FP-19 acts strictly as the execution substrate. It manages queues, leases, fencing, checkpoints, health, and failover, while deferring planning and deliberation to Missions, Workflows, Goals, and Skills.
2. **Monotonic Lease Fencing:**
   Every distributed lease acquisition increments a monotonic 64-bit fencing token. State changes and checkpoint writes must present a valid, active fencing token. Outdated tokens from zombie workers are rejected immediately.
3. **Deterministic Resumption via Checkpoints:**
   Jobs commit incremental snapshots of internal state, execution progress, and verified artifacts. Interrupted jobs resume cleanly from the last verified checkpoint rather than starting over.
4. **Autonomous Recovery & Dead-Letter Routing:**
   The `RecoveryManagerService` audits stale workers (3 missed heartbeats) and expired leases. Abandoned jobs are re-queued with exponential backoff and jitter up to `maxAttempts`, after which they transition safely to `DEAD_LETTER`.
5. **Sovereign Cloud Governance (`DENY_PAID_WITHOUT_APPROVAL`):**
   Unattended 24/7 execution is permitted on local, LAN, and pre-configured remote hardware. However, provisioning or dispatching work to paid cloud instances strictly requires explicit operator approval from Rushikesh Pattiwar.
6. **Zero Heavy Orchestrators:**
   No external Redis, Kafka, Celery, Temporal, or Kubernetes dependencies. All state, locks, and queues are maintained in transactional SQLite (`data/hrisekesa.db`) via Migration 033.
7. **Storage Architecture (Migration 033):**
   Persists 9 dedicated relational tables: `execution_runtimes`, `execution_workers`, `execution_jobs`, `execution_leases`, `execution_checkpoints`, `execution_queues`, `cloud_providers`, `cloud_instances`, and `execution_traces`.

## Consequences
- **Positive:**
  - True 24/7 unattended autonomous capability with self-healing failover.
  - Safe distributed execution without risk of duplicate execution or split-brain state corruption.
  - Seamless migration of running workloads across local, LAN, and remote workers.
  - Total protection against accidental cloud billing.
- **Negative / Constraints:**
  - SQLite write concurrency requires careful transaction handling and WAL mode configuration.
  - Distributed workers must have network reachability to the central runtime coordinator.
