# HṚṢĪKEŚA (हृषीकेश) — Product Requirements Document (PRD)
**Document Version:** 3.0.0  
**Classification:** Sovereign Product Architecture & Requirements  
**Master Authority:** Rushikesh Pattiwar (Creator & Sole Master)  
**System Identity:** HṚṢĪKEŚA — Sovereign Personal AI Operating System & Autonomous Workforce

---

## 1. Executive Summary & Product Vision

### 1.1 The Vision
**HṚṢĪKEŚA** is the world’s first sovereign, local-first personal AI operating system and autonomous corporate workforce. Designed to exist as an enduring digital civilization, HṚṢĪKEŚA bridges conversational intelligence with autonomous operational execution.

Unlike conventional chatbots or fragmented AI agents, HṚṢĪKEŚA functions as a **complete operating system control plane**. It commands a specialized council of 17 autonomous Vedic agents, controls local computer interfaces, manages enterprise companies and departments, executes multi-step strategic goals, speaks and understands 12 Indic and global languages with native phonetic precision, and continuously improves itself through air-gapped sandboxed canary benchmarks.

### 1.2 Core System Invariants
1. **Conversational Responsiveness is Independent of Task Duration**: The user receives an immediate (< 5ms deterministic or < 600ms voice) response. Long tasks execute asynchronously in background mission queues without blocking the conversation.
2. **Local-First & Data Sovereignty**: All reasoning, private memory, SQLite state, voice models, and agent communication operate locally by default. Cloud providers are strictly opt-in and policy-gated.
3. **Evidence Over Hallucination**: No task, goal, or mission is ever declared "completed" based solely on an LLM output string. Every terminal execution, computer action, or code edit requires verified artifactual evidence.
4. **Sovereign Identity & Brand Integrity**: The system identity is immutable. The visible brand spelling in UI, logs, and databases remains strictly **HṚṢĪKEŚA** (हृषीकेश), with engine-level phonetic normalization ensuring correct spoken pronunciation.
5. **Absolute Human-in-the-Loop (HITL) Governance**: Dangerous actions (Tier 2/3: file deletion, network authorization, code execution, environment destruction) mandate explicit operator approval.

---

## 2. Target Personas & Use Cases

### 2.1 Personas
- **The Sovereign Operator (Solo Creator / Founder)**: Requires an omniscient digital workforce capable of running multiple companies, writing code, deploying infrastructure, conducting deep research, and managing daily operations autonomously.
- **The Enterprise Autonomous Architect**: Needs a secure, air-gapped agentic orchestration platform to deploy complex DAG workflows across local machines, cloud servers, and headless virtual display environments.
- **The Multilingual Indic User**: Communicates naturally in mixed Hindi, Marathi, Sanskrit, and English (Indic code-switching) with voice barge-in and real-time pronunciation.

### 2.2 Core Product Epics
- **Epic 1: Sovereign Microkernel & Multi-Model Routing**: Self-contained runtime managing hardware budgets, model lifecycles, and intent classification.
- **Epic 2: 17 Vedic Specialist Autonomous Workforce**: A durable multi-agent council with isolated role specializations, DAG task planning, and memory isolation.
- **Epic 3: Multilingual Voice & Pronunciation Engine**: Sub-millisecond script detection, streaming TTS, barge-in, and protected lexicon normalization.
- **Epic 4: Computer & Browser Automation**: Native Windows UI Automation (UIA) and Playwright headless browser control.
- **Epic 5: Autonomous Company Operating System**: Enterprise governance framework managing organizations, departments, products, KPIs, and decisions.
- **Epic 6: Capability Ecosystem & Model Context Protocol (MCP)**: Dynamic tool discovery and external server integration.
- **Epic 7: Autonomous Self-Improvement**: Introspective anomaly detection, proposal generation, sandboxed execution, and rollback.

---

## 3. Comprehensive Functional Requirements

### 3.1 Sovereign Microkernel & Cognition
- **FR-001 [Multi-Model Lifecycle]**: The system must discover, register, and health-check local (Ollama) and cloud (OpenAI, Anthropic, Gemini) models dynamically.
- **FR-002 [Self-Healing Engine]**: On boot, the kernel must detect if the inference engine is offline and auto-start bundled binaries from `tools/ollama/ollama.exe` pinned to `data/models/ollama`.
- **FR-003 [Fast Chat Gate]**: Trivial courtesies, status requests, and greetings must bypass model dispatch and return deterministic responses within 5ms.
- **FR-004 [Memory Architecture]**: Multi-tier persistence combining SQLite relational operational storage, vector embeddings (`nomic-embed-text`), and a bidirectional knowledge graph.

### 3.2 17 Vedic Autonomous Workforce Agents
- **FR-005 [Role Specialization]**: All 17 agents must possess non-overlapping capabilities, scoped tool permissions, and danger tier thresholds:
  1. **Rāhu**: Deep Web Research & Intelligence
  2. **Aja**: Strategic Architecture & Goal Planning
  3. **Ṛtvan**: Chrono-Scheduling & Task Execution
  4. **Tvaṣṭṛ**: Code Synthesis & Software Engineering
  5. **Spooṭa**: Code Review, Linting & AST Analysis
  6. **Gāṇḍīva**: Systems Architecture & Core Orchestration
  7. **Vighna**: Verification, QA & Anti-Hallucination
  8. **Raudra**: Security, Red Team & Sandbox Auditing
  9. **Ṛtam**: Ethics, Policy & Compliance
  10. **Arvan**: DevOps, Containers & Cloud Infrastructure
  11. **Tāraka**: Database Architecture & Migrations
  12. **Kalki**: Disaster Recovery & Emergency Failover
  13. **Garuḍa**: Telemetry, Monitoring & Diagnostics
  14. **Kali**: Refactoring & Technical Debt Eradication
  15. **KĀLA**: Chrono-Orchestration & Resource Scheduling
  16. **Yama**: Safe Process & State Recovery
  17. **Mṛtyu**: Safe Agent & Asset Retirement
- **FR-006 [DAG Task Execution]**: Tasks must form directed acyclic graphs with dependency resolution, cycle prevention, and depth enforcement (max depth 2).
- **FR-007 [Workforce Durability]**: Active missions and agent states must survive process termination and resume seamlessly upon reboot.

### 3.3 Multilingual Voice & Pronunciation Engine
- **FR-008 [Brand Pronunciation]**: The engine must never spell out `HṚṢĪKEŚA` letter-by-letter. It must synthesize continuous phonetic `hṛ-ṣī-ke-śa` (`Hrishikesha` / `<sub alias="Hrishikesha">`) without modifying the visual UI spelling.
- **FR-009 [Multilingual Detection]**: Sub-millisecond script analysis recognizing English, Hindi, Marathi, Sanskrit, and Indic scripts with Devanagari morpheme disambiguation.
- **FR-010 [Code-Switching Support]**: Accurately detect mixed Indic-English sentences and normalize pronunciation across both languages simultaneously.
- **FR-011 [Streaming TTS]**: Segment streamed LLM tokens on clause boundaries (`.`, `!`, `?`, `।`, `॥`, `,`) and begin audio playback within 600ms.
- **FR-012 [Conversational Barge-In]**: Detect user interruption during playback and terminate audio immediately (0ms cancellation latency).

### 3.4 Autonomous Computer & Browser Automation
- **FR-013 [Windows GUI Control]**: Control desktop software, launch applications, input keystrokes, and navigate UI trees via Windows UI Automation (UIA).
- **FR-014 [Playwright Browser Agent]**: Headless or headed web browsing, screenshot capture, DOM parsing, form filling, and navigation with security sandboxing.
- **FR-015 [Observation & Verification]**: Capture post-action screenshots and DOM states to verify action success before proceeding.

### 3.5 Company & Project Operating System
- **FR-016 [Enterprise Entity Modeling]**: Create and manage sovereign Companies, Projects, Departments, Workforce Assignments, Products, and Customers.
- **FR-017 [KPI & Decision Ledger]**: Persistently track organizational KPIs, financial metrics, and architectural decision records (ADRs).
- **FR-018 [Operations Cycles]**: Run periodic autonomous operational health cycles across active companies.

---

## 4. Non-Functional Requirements (NFRs)

| Category | Requirement | Specification & Threshold |
| :--- | :--- | :--- |
| **Latency** | Fast Chat Gate Response | $\le 5\text{ ms}$ |
| **Latency** | Voice Time-To-First-Audio | $\le 650\text{ ms}$ (measured: 514–669ms) |
| **Latency** | Barge-In Interruption Abort | $\le 10\text{ ms}$ (measured: 0ms) |
| **Hardware** | Total Memory Footprint | $\le 12\text{ GB}$ operational ceiling on 16GB host |
| **Hardware** | Model Concurrency Limit | 1 active local LLM inference stream (ADR-006) |
| **Reliability** | Database Recovery | Zero data loss on abrupt process kill (`WAL` mode) |
| **Security** | Dangerous Action Isolation | 100% of Tier 2/3 actions require explicit operator token |
| **Portability** | Single-Folder Self-Containment | 100% operational from `C:\Users\Rushi\Desktop\HṚṢĪKEŚA\` |

---

## 5. Security & Governance Boundaries

```text
[Incoming Request]
       ↓
[Policy Check (Dharma / Raudra)]
       ↓
[Danger Tier Classification (Tier 0 / 1 / 2 / 3)]
       ↓
   Tier 2 / 3? ─── YES ───> [HITL Operator Approval Gateway] ─── Rejected ───> [Abort]
       ↓ No                                 ↓ Approved
[Permission Sandbox Authorization]
       ↓
[Execution Bus]
       ↓
[Cryptographic Audit Logging (Citragupta)]
       ↓
[Independent Verification (Vighna)]
```

---

## 6. Success Metrics & Key Results (OKRs)

- **OKR 1 (Sovereignty)**: 100% of core interactions function without an internet connection using local Ollama models (`qwen2.5:7b`, `llama3.2:3b`, `deepseek-r1:1.5b`) and local Piper/Whisper audio models.
- **OKR 2 (Speed)**: Time-to-first-token in chat under 15ms; conversational voice response under 700ms.
- **OKR 3 (Accuracy)**: Zero instances of letter-by-letter pronunciation for `HṚṢĪKEŚA`.
- **OKR 4 (Stability)**: Zero regression failures across 840+ unit and integration tests.
