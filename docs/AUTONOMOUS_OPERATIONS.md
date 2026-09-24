# HṚṢĪKEŚA — Autonomous Operations & Persistent Objectives

## 1. Persistent Objective Lifecycle

HṚṢĪKEŚA manages high-level objectives that span hours, days, or weeks across application restarts.

```
                    ┌─────────────┐
                    │    DRAFT    │
                    └──────┬──────┘
                           │ Plan
                           ▼
                    ┌─────────────┐
                    │   PLANNED   │◄────────┐
                    └──────┬──────┘         │
                           │ Start / Eval   │ Replan
                           ▼                │
   ┌───────────►   ┌─────────────┐          │
   │               │  EXECUTING  ├──────────┤
   │ Resume        └──────┬──────┘          │
   │                      │                 │
┌──┴──────────┐           ├── Milestone Fail│
│   PAUSED    │◄──────────┼─────────────────┘
└─────────────┘   Pause   ├── HITL Approval Required
                          ▼
                   ┌──────────────┐
                   │  NEEDS_USER  │
                   └──────┬───────┘
                          │ Approve
                          ▼
                   ┌──────────────┐
                   │  COMPLETED   │
                   └──────────────┘
```

---

## 2. Deterministic Health vs. LLM Self-Reporting

Health states are computed strictly from verifiable runtime metrics:
- **`HEALTHY`**: Active missions making measurable milestone progress within latency bounds.
- **`WAITING`**: Objective planned or paused; waiting for start signal or schedule window.
- **`BLOCKED`**: Prerequisite resource, file, or environment dependency missing.
- **`NEEDS_USER`**: High-risk tool or milestone approval gate pending human operator consent.
- **`DEGRADED`**: Laptop memory/CPU constrained; execution concurrency throttled.
- **`FAILED`**: Milestone failure exceeding retry limits or budget exhaustion.
- **`COMPLETED`**: Independent `GoalVerifier` validates 100% of success criteria with cryptographic/file evidence.

---

## 3. Persistent Scheduling & Recovery Guarantee

1. **Persistent Scheduler**:
   - Durable scheduling engine stored in SQLite `schedules` table.
   - Survives process crashes and machine reboots.
   - Evaluates due tasks every poll interval and dispatches to goal evaluators or mission orchestrators.

2. **Restart Recovery**:
   - `ObjectiveRecoveryManager` audits state on every kernel boot.
   - Resets hung `running` tasks to `ready`.
   - Re-evaluates active goals without repeating already completed milestones.
