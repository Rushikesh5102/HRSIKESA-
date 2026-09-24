# HṚṢĪKEŚA (हृषीकेश) — Product Roadmap & Strategic Release Plan
**Document Version:** 3.0.0  
**Current Baseline:** Frozen Phase 26 + Voice Hardening (v0.2.0)  
**Next Program Horizon:** Tracks A through G (v0.3.0 – v1.0.0)

---

## 1. Roadmap Architecture & Execution Philosophy

HṚṢĪKEŚA follows a strict **vertical-slice milestone progression**. Rather than initiating broad, superficial features, each release track delivers a fully tested, verified, and hardened slice of sovereign capability before the baseline is frozen.

```text
========================================================================================
                          HṚṢĪKEŚA RELEASE MATRIX
========================================================================================

 [v0.2.0 - CURRENT FROZEN BASELINE]
  ├─ Phase 0-26 Complete Systems (Microkernel, 17 Agents, Company OS, Self-Improvement)
  ├─ Multilingual Voice & Pronunciation Engine (HṚṢĪKEŚA hṛ-ṣī-ke-śa, Indic scripts)
  └─ 100% Self-Contained Local Runtime (All models, tools & runtimes in single folder)
         │
         ▼
 [v0.3.0 - TRACK A: INSTANT INTERACTION CORE]
  ├─ Sub-5ms Fast Chat Gate for greetings, courtesies, and status queries
  ├─ Token-level LLM streaming across UI and voice synthesis
  ├─ Asynchronous background task detachment (chat never blocks on goal execution)
  └─ Global latency telemetry dashboard
         │
         ├───────────────────────────────────┐
         ▼                                   ▼
 [v0.4.0 - TRACK B & D: EXECUTION & CONNECTORS]  [v0.5.0 - TRACK C: DEMONSTRATION LEARNING]
  ├─ Track B: Distributed Remote Workers         ├─ UI & Browser Action Recorder
  │   ├─ Durable job queues & worker leases      ├─ Workflow normalization & parameterization
  │   └─ Cloud Linux & headless VDI execution    ├─ Verifiable Skill synthesis & sandboxing
  └─ Track D: Enterprise Service Connectors      └─ Vighna verification & operator approval
      ├─ Google Workspace, GitHub & Microsoft 365
      └─ Secure credential vaults & scopes
         │                                   │
         └─────────────────┬─────────────────┘
                           ▼
 [v0.6.0 - TRACK E & F: INTELLIGENCE & MULTI-DEVICE]
  ├─ Track E: Model Intelligence Expansion (Task profiling, capability benchmarking)
  └─ Track F: Sovereign Device Mesh (Windows Laptop + Android Companion, Task Handoff)
                           │
                           ▼
 [v1.0.0 - TRACK G: ENTERPRISE DISTRIBUTED HARDENING]
  ├─ Multi-node event durability, distributed tracing & reconciliation
  ├─ Comprehensive disaster recovery drills & cold-reboot state integrity
  └─ Sovereign Enterprise Air-Gapped Production Certification
========================================================================================
```

---

## 2. Milestone Details & Delivery Horizons

### 2.1 Release v0.2.0 (Current Baseline — Accomplished)
- **Scope**: Core Microkernel, 17 Vedic Agents, Company OS, Multimodal Vision, Computer Operator, MCP Integration, Self-Improvement, Advanced Multilingual Voice Engine, Self-Contained Packaging.
- **Key Metrics**:
  - 840+ unit/integration tests passing.
  - Zero letter-by-letter spelling of `HṚṢĪKEŚA`.
  - 100% of LLM weights (`qwen2.5:7b`, `llama3.2:3b`, `deepseek-r1:1.5b`, `nomic-embed-text`) stored in project root.

---

### 2.2 Release v0.3.0 — Track A: Instant Interaction Core (Priority: P0)
**Core Objective**: Decouple conversational responsiveness from autonomous task execution latency.
- **Deliverables**:
  - `INT-001`: Request-path latency profiling across 10 canonical benchmark prompts.
  - `INT-002`: Production Fast Chat Gate for instantaneous deterministic triage.
  - `INT-003`: Streaming token delivery from local Ollama to React frontend via SSE.
  - `INT-004`: Immediate conversational acknowledgements with non-blocking background queue dispatch.
  - `INT-005`: Asynchronous memory consolidation and knowledge graph enrichment.
  - `INT-006`: Real-time latency telemetry recording Time-To-First-Token (TTFT) and First-Audio-Latency.
  - `INT-007`: Automated end-to-end latency test suite.
- **Exit Gate**: User never experiences conversational dead-air when launching long-running missions.

---

### 2.3 Release v0.4.0 — Tracks B & D: Remote Workers & Enterprise Connectors (Priority: P1)
**Core Objective**: Enable HṚṢĪKEŚA to dispatch tasks to remote compute environments while maintaining a local-first control plane.
- **Track B (Remote Workers)**:
  - `REM-001`: Durable job abstraction with stateful checkpoints (`data/jobs/`).
  - `REM-002`: Worker Registry tracking Local, Cloud Linux VM, and Remote VDI execution nodes.
  - `REM-003`: Mutual TLS / WireGuard secure control channel between core and remote nodes.
  - `REM-004`: Distributed file and artifact synchronization.
  - `REM-005`: Laptop-sleep recovery test: tasks running on cloud workers continue uninterrupted when the local laptop closes.
- **Track D (Connectors)**:
  - `CON-001`: Standardized Connector SDK building upon MCP primitives.
  - `CON-002`: OAuth2 credential lifecycle and granular permission scopes.
  - `CON-003`: Native reference connectors for GitHub, Google Workspace (Gmail/Drive/Docs), and Microsoft Graph.

---

### 2.4 Release v0.5.0 — Track C: Visual Demonstration Learning (Priority: P1)
**Core Objective**: Teach HṚṢĪKEŚA new computer and browser skills through visual demonstration rather than writing code manually.
- **Deliverables**:
  - `DEM-001`: Interactive demonstration recording session (keystrokes, clicks, UIA tree deltas, DOM snapshots).
  - `DEM-002`: Workflow normalizer stripping user-specific transients (passwords, usernames, timestamps).
  - `DEM-003`: Parameter extractor converting static values into dynamic input arguments.
  - `DEM-004`: Skill code synthesizer generating standard TypeScript Skill definitions.
  - `DEM-005`: Sandboxed verification drill run by Vighna before human operator approval.

---

### 2.5 Release v0.6.0 — Tracks E & F: Intelligence Expansion & Mobile Mesh (Priority: P2)
**Core Objective**: Multi-device sovereign continuity across personal devices.
- **Track E (Model Intelligence)**:
  - Dynamic capability scoring: evaluate models on coding benchmarks, computer-use accuracy, and latency.
  - Modality-aware routing: automatically send image inputs to vision models and code tasks to reasoning models.
- **Track F (Multi-Device Mesh)**:
  - Companion mobile client for Android (Voice I/O, push notifications, task status, screen capture).
  - Device session handoff: begin a task on laptop, monitor and approve from phone.

---

### 2.6 Release v1.0.0 — Track G: Enterprise Distributed Hardening (Priority: P2)
**Core Objective**: Unattended 24/7 reliability for enterprise mission-critical workloads.
- **Deliverables**:
  - Idempotent event bus with replay capability.
  - Distributed transaction recovery and dead-letter queues.
  - Automated disaster recovery drills and snapshot rollbacks.
  - Hardened multi-tenant access control for organizational deployments.

---

## 3. Product Release Milestones Summary

| Version | Milestone Name | Primary Focus | Timeline / Target |
| :--- | :--- | :--- | :--- |
| **v0.2.0** | Sovereign Foundation | Core OS + 17 Agents + Multilingual Voice | **Completed & Frozen** |
| **v0.3.0** | Instant Core | Track A: Fast Gate & Streaming | Milestone Next |
| **v0.4.0** | Distributed Execution | Tracks B & D: Remote Workers & MCP Connectors | Milestone Next + 1 |
| **v0.5.0** | Demonstration Learning | Track C: Record-and-Replay Skill Engine | Milestone Next + 2 |
| **v0.6.0** | Sovereign Mesh | Tracks E & F: Model Scoring & Android Client | Milestone Next + 3 |
| **v1.0.0** | Enterprise Sovereignty | Track G: Distributed Hardening & Full Scale | Production Target |
