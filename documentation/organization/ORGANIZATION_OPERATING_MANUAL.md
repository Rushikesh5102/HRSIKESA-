# HṚṢĪKEŚA (हृषीकेश) — Autonomous Organization Operating Manual
**Document Version:** 3.0.0  
**Classification:** Enterprise Operational Governance & Workforce Architecture  
**Supreme Authority:** Rushikesh Pattiwar (Creator & Sole Master)  
**System Role:** Supreme Autonomous Orchestrator & Corporate Control Plane

---

## 1. Organizational Hierarchy & Authority Matrix

HṚṢĪKEŚA operates as a unified sovereign organism governed by an unbending chain of authority:

```text
                       RUSHIKESH PATTIWAR
                 (Creator, Sole Master & Supreme Ruler)
                             │
                             ▼
                    HṚṢĪKEŚA SOVEREIGN CORE
               (Microkernel & Autonomous Director)
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
  COUNCIL OF ARCHITECTS                   AUTONOMOUS WORKFORCE
  ├─ Aja (Strategy & Goals)               ├─ Engineering & Code
  ├─ Gāṇḍīva (Core Systems)               ├─ Research & Intelligence
  ├─ KĀLA (Chrono-Scheduling)             ├─ Operations & Recovery
  └─ Dharma (Ethics & Policy)             └─ Verification & Audit
```

### 1.1 Command Invariants
1. **Unilateral Creator Authority**: Only Rushikesh Pattiwar holds the root private key and authority to approve Tier 3 operations, modify sovereign identity, or alter constitutional policies.
2. **HṚṢĪKEŚA as Director**: HṚṢĪKEŚA is not a task executioner; it is the **Supreme Director**. Individual work items are delegated to the 17 specialized agents based on capability matching and danger limits.
3. **No Phantom Progress**: No agent may report task completion without attaching verified evidence (exit codes, DOM deltas, file checksums, test results).

---

## 2. Departmental Topologies & Functional Units

Within the Company Operating System, HṚṢĪKEŚA dynamically structures autonomous departments:

```text
┌─────────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Department                      │ Lead Agent                    │ Secondary Specialists         │
├─────────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Executive Strategy & Governance │ Aja (Strategy)                │ Dharma (Policy), Citragupta   │
│ Software Engineering & Dev      │ Tvaṣṭṛ (Synthesis)            │ Spooṭa (AST), Kali (Refactor) │
│ Quality Assurance & Verification│ Vighna (Anti-Hallucination)   │ Raudra (Security Audit)       │
│ Infrastructure & Cloud Ops      │ Arvan (DevOps & Containers)   │ Tāraka (Databases), Kalki     │
│ Research & Market Intelligence  │ Rāhu (Intelligence Engine)    │ Budha (Analytics), Citragupta │
│ Corporate Operations & Finance  │ Śukra (Commercial Ops)        │ Ṛtvan (Scheduling), Dharma    │
│ System Reliability & Recovery   │ Yama (Safe Recovery)          │ Mṛtyu (Retirement), Garuḍa    │
└─────────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

## 3. Standard Operating Procedures (SOPs) Framework

Every autonomous workflow must adhere to strict, deterministic SOP stages:

```text
[1. INGESTION]  ──> [2. TRIAGE]  ──> [3. PLANNING] ──> [4. VERIFICATION] ──> [5. EXECUTION] ──> [6. AUDIT]
User Intent         Fast Gate        DAG Decompose      Vighna Check        Worker Run        Citragupta
```

### 3.1 SOP-001: Autonomous Goal Decomposition & Planning
1. **Trigger**: User inputs a high-level strategic goal (e.g., *"Build an automated market research reporting pipeline"*).
2. **Triage**: Fast Chat Gate recognizes `GOAL_REQUEST` and returns an immediate spoken acknowledgment within 5ms.
3. **Decomposition**: Aja (Strategic Planner) decomposes the goal into bounded Milestones and Tasks forming a Directed Acyclic Graph (DAG).
4. **Safety Analysis**: Dharma and Raudra inspect every proposed task against the Danger Tier limits.
5. **Execution**: KĀLA schedules tasks; specialized agents execute in background queues.
6. **Verification**: Vighna validates all generated artifacts before marking milestones complete.

### 3.2 SOP-002: Autonomous Software Synthesis & Patching
1. **Requirement Analysis**: Spooṭa reviews existing AST and codebase dependencies.
2. **Drafting**: Tvaṣṭṛ generates isolated code changes in a temporary branch or sandbox.
3. **Automated Verification**: Vighna runs unit tests, linting, and type checking (`tsc --noEmit`).
4. **Security Scan**: Raudra verifies zero credential leaks, injection vectors, or sandbox escapes.
5. **Approval & Commit**: If changes touch critical paths, an HITL approval card is presented in the Control Center. Upon approval, changes are committed with cryptographic audit logs.

### 3.3 SOP-003: Anomaly Recovery & Emergency Failover
1. **Detection**: Garuḍa (Telemetry) or ResourceGovernor flags anomalous memory pressure, infinite loops, or worker disconnections.
2. **Safe Isolation**: KĀLA pauses the affected task queue immediately.
3. **State Rollback**: Yama inspects the latest SQLite checkpoint and restores uncorrupted state.
4. **Workforce Rebalancing**: If an agent process crashes, Yama reinitializes the agent runtime with zero loss of session history.

---

## 4. Multi-Agent Delegation & Escalation Rules

- **Maximum Delegation Depth**: Capped at **Level 2** (Director $\to$ Lead Specialist $\to$ Sub-Worker). Deep recursive agent chains are prohibited to prevent execution loops and memory exhaustion.
- **Cross-Agent Blackboard**: Agents communicate exclusively through the structured, shared Blackboard and typed event bus. Unmonitored direct socket-to-socket agent chat is forbidden.
- **Escalation Trigger**: If a task fails verification twice, it is automatically escalated to HṚṢĪKEŚA Director and flagged on the operator's Attention Queue.
