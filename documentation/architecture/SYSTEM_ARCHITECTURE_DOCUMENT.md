# HṚṢĪKEŚA (हृषीकेश) — Complete System Architecture Document (SAD)
**Document Version:** 3.0.0  
**Classification:** System Architecture Specification  
**Architecture Model:** 9-Plane Sovereign Microkernel Architecture  
**Runtime:** Node.js 20+ ESM TypeScript, SQLite WAL, ONNX Runtime, Ollama Native

---

## 1. High-Level Architectural Blueprint

HṚṢĪKEŚA is structured across **9 decoupled architectural planes**, ensuring strict separation of concerns, zero-downtime reliability, and local data sovereignty:

```text
========================================================================================
                                 RUSHIKESH PATTIWAR
                         Voice / Web UI / Mobile / Terminal
========================================================================================
                                         │
                                         ▼
 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ 1. INTERACTION PLANE                                                               │
 │    ├─ Fast Chat Gate (< 5ms)        ├─ Multilingual Voice Coordinator (Piper/SAPI) │
 │    ├─ Streaming SSE Gateway         ├─ Multimodal Vision Observer (Screen/Camera)  │
 │    └─ Conversational Barge-In Engine └─ Language & Code-Switching Detector (< 1ms)  │
 └───────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
                                         ▼
 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ 2. CONTROL PLANE (Sovereign Microkernel)                                           │
 │    ├─ Identity Manager (Immutable)  ├─ Model Router & Hardware Governor (ADR-006)  │
 │    ├─ Permission & Sandbox Manager  ├─ Event Bus & Lifecycle Manager               │
 │    ├─ Company Operating System      ├─ Autonomous Goal & Mission Orchestrator      │
 │    └─ Procedural Skill Registry     └─ MCP Protocol Server Registry                │
 └──────────────────┬────────────────────┬────────────────────┬───────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
 ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────────────────┐
 │ 3. INTELLIGENCE     │  │ 4. EXECUTION        │  │ 5. CAPABILITY                    │
 │    ├─ Local Ollama  │  │    ├─ Task DAG Exec │  │    ├─ Tool Execution Bus         │
 │    ├─ Cloud Adapters│  │    ├─ Job Queue     │  │    ├─ Windows Computer (UIA)     │
 │    ├─ Task Profiler │  │    ├─ Local Worker  │  │    ├─ Playwright Browser Agent   │
 │    └─ Model Scorer  │  │    └─ Remote Worker │  │    └─ Native Terminal/Filesystem │
 └─────────────────────┘  └─────────────────────┘  └──────────────────────────────────┘
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                                         ▼
 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ 6. PERSISTENCE PLANE                                                               │
 │    ├─ Operational SQLite DB (hrisekesa.db)  ├─ Semantic Vector Embeddings (nomic)  │
 │    ├─ Multi-Layer Knowledge Graph           ├─ Protected Pronunciation Dictionary  │
 │    └─ Durable Job & Checkpoint Store        └─ Immutable Citragupta Audit Ledger   │
 └───────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
                                         ▼
 ┌────────────────────────────────────────────────────────────────────────────────────┐
 │ 7. RELIABILITY PLANE                                                               │
 │    ├─ ResourceGovernor (16GB RAM Budget)   ├─ Anomaly Detector & Auto-Rollback     │
 │    ├─ Persistent Startup Recovery (Yama)   ├─ Sandboxed Canary Benchmarks          │
 │    └─ Dead-Letter Queue & Failover         └─ Telemetry & Tracing Engine (Garuḍa)  │
 └────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
 ┌─────────────────────────────────────┐   ┌──────────────────────────────────────────┐
 │ 8. DEVICE PLANE                     │   │ 9. UI PLANE (Temple Civilization System) │
 │    ├─ Local Windows Workstation     │   │    ├─ React 18 + Vite Control Center     │
 │    ├─ Android Companion (Track F)   │   │    ├─ Sovereign Agent Town Map           │
 │    └─ Remote Linux / VDI Workers    │   │    └─ Real-Time Voice Diagnostics Deck   │
 └─────────────────────────────────────┘   └──────────────────────────────────────────┘
```

---

## 2. Detailed Plane Specifications

### 2.1 Interaction Plane
- **Fast Chat Gate**: Intercepts inbound prompts. Trivial greetings, identity checks, and courtesies are answered immediately using deterministic rules ($< 5\text{ms}$).
- **Streaming Pipeline**: Server-Sent Events (SSE) stream model output tokens directly to the UI while simultaneously feeding clause-chunked text to the TTS engine.
- **Multilingual Voice Coordinator**: Performs real-time script identification across 12 Indic languages, normalizes protected words (`HṚṢĪKEŚA` $\to$ `hṛ-ṣī-ke-śa`), and handles zero-latency barge-in playback termination.

### 2.2 Control Plane
- **Kernel (`HrisekesaKernel`)**: Instantiates all repositories, event buses, and registries. Enforces strict hardware concurrency: only 1 local LLM inference stream executes at any given moment.
- **Agent Registry**: Enforces unique capabilities, danger tier ceilings, and scoped tools across all 17 agents.
- **Company OS**: Manages organizations, departments, products, KPIs, and decisions through dedicated repositories.

### 2.3 Execution Plane
- **Task Graph & DAG Planner**: Resolves task dependencies, prevents circular execution paths, and dispatches ready tasks to available worker queues.
- **Worker Placement**: Automatically places tasks on local or remote workers based on privacy policies, compute requirements, and device availability.

### 2.4 Capability Plane
- **ToolBus**: The centralized execution gateway. Every tool call undergoes input schema validation, permission checks, danger tier verification, sandbox isolation, and post-execution audit logging.
- **Computer Operator**: Automates desktop software via native Windows UI Automation (UIA) and headless/headed Playwright browser sessions.

### 2.5 Intelligence Plane
- **Model Router**: Intelligently routes tasks to local Ollama models (`qwen2.5:7b`, `llama3.2:3b`, `deepseek-r1:1.5b`) or configured cloud providers based on modality, context length, and latency cost.

### 2.6 Persistence Plane
- **SQLite Engine**: Running in `WAL` (Write-Ahead Logging) mode with foreign keys enabled, ensuring non-blocking reads and zero data loss on abnormal termination.
- **Knowledge Graph**: 6-table relational graph storing entities, relations, facts, claims, contradictions, and evidence.

### 2.7 Reliability Plane
- **Resource Governor**: Actively observes available host RAM and CPU threads. If free memory drops below 1GB, non-essential background tasks are throttled to prevent Out-Of-Memory (OOM) crashes.
- **Self-Improvement Coordinator**: Observes runtime health, detects recurring anomalies, synthesizes improvement proposals, tests them in isolated sandboxes, and commits verified patches.

### 2.8 Device Plane
- Supports local workstation execution, cloud container workers, remote SSH bastions, and mobile device companion clients.

### 2.9 UI Plane
- Implements the **Temple Civilization Design System v3.0** (Cinzel Decorative, Lora, JetBrains Mono, Imperial Gold, Deep Amber Stone) in a responsive React control deck.

---

## 3. Strict Security Boundary Flow

```text
[Incoming Command]
       │
       ▼
 ┌──────────┐
 │  POLICY  │ ──> Evaluated by Ṛtam (Ethics) against system invariants
 └────┬─────┘
      ▼
 ┌──────────┐
 │PERMISSION│ ──> Checked by Raudra against Agent Danger Tier & Workspace limits
 └────┬─────┘
      ▼
 ┌──────────┐
 │CAPABILITY│ ──> Matched against registered Tool and MCP schemas
 └────┬─────┘
      ▼
 ┌──────────┐
 │EXECUTION │ ──> Dispatched through isolated ToolExecutionBus
 └────┬─────┘
      ▼
 ┌──────────┐
 │OBSERVE   │ ──> Captures stdout, exit codes, UI state deltas, and screenshots
 └────┬─────┘
      ▼
 ┌──────────┐
 │  VERIFY  │ ──> Independently verified by Vighna (Anti-Hallucination)
 └────┬─────┘
      ▼
 ┌──────────┐
 │  AUDIT   │ ──> Permanently committed to Citragupta immutable SQLite ledger
 └──────────┘
```
