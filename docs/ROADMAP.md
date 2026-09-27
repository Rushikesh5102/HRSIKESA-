# HṚṢĪKEŚA (हृषीकेश) — Master Engineering Roadmap

> **Current Status:** Foundation Performance & Execution Block FP-18 — Universal Real-World Research, Knowledge & Decision Intelligence Fabric (COMPLETED & VERIFIED)  
> **Previous Block:** Foundation Performance & Execution Block FP-17 — Universal Digital Creation & Media Studio (COMPLETED & FROZEN)  
> **Previous Block:** Foundation Performance & Execution Block FP-16 — Demonstration Learning & Workflow Acquisition (COMPLETED & FROZEN)  
> **Target Machine:** Acer Swift SFG14-73T (Intel Core Ultra 5 125H, 16 GB RAM, Intel Arc GPU)  
> **Creator & Sole Master:** Rushikesh Pattiwar  
> **English Self-Name:** Rishi ("I’m Rishi")  

---

## Phase Overview & Governance

Development proceeds through sequential, gate-controlled phases. No phase begins until the exit criteria of the preceding phase are verified and approved by Rushikesh.

```mermaid
graph LR
    P0[Phase 0: Environment ✅] --> P1[Phase 1: Foundation ✅]
    P1 --> P2[Phase 2: Micro-Kernel & Models ✅]
    P2 --> P3[Phase 3: Memory & Identity ✅]
    P3 --> P4[Phase 4: Tool Bus & MCP ✅]
    P4 --> P5[Phase 5: Multi-Agent Workforce ✅]
    P5 --> P6[Phase 6: Browser Automation ✅]
    P6 --> P7[Phase 7: Windows Computer Control ✅]
    P7 --> P8[Phase 8: Local Voice Subsystem ✅]
    P8 --> P9[Phase 9: Semantic Windows UIA ✅]
    P9 --> P10[Phase 10: Environment Manager ✅]
    P10 --> P11[Phase 11: Control Center & Agent Town ✅]
    P11 --> P12[Phase 12: Semantic Memory ✅]
    P12 --> P13[Phase 13: Mission Engine ✅]
    P13 --> P135[Phase 13.5: Hardening & Registry ✅]
    P135 --> P136[Phase 13.6: 17-Agent Workforce ✅]
    P136 --> P14[Phase 14: Company & Project OS ✅]
    P14 --> P15[Phase 15: Autonomous Goal Engine ✅]
    P15 --> P16[Phase 16: Persistent Operations ✅]
    P16 --> P17[Phase 17: Research Intelligence ✅]
    P17 --> P18[Phase 18: Model Router ✅]
    P18 --> P19[Phase 19: Knowledge Graph ✅]
    P19 --> P20[Phase 20: Skills & Procedural Intelligence ✅]
    P20 --> P21[Phase 21: Dynamic MCP & Capability Ecosystem ✅]
    P21 --> P22[Phase 22: Advanced Computer Operator ✅]
    P22 --> P23[Phase 23: External Environments ✅]
    P23 --> P24[Phase 24: Multimodal Vision + Voice ✅]
    P24 --> P25[Phase 25: Full Autonomous Company Operations ✅]
```

---

## Detailed Phases

### Phase 0: Environment Verification ✅ (Completed)
- [x] Verify Git installation (`git version 2.55.0.windows.5`)
- [x] Verify Node.js and npm (`v24.21.0`, `npm 11.19.0`)
- [x] Verify Python and pip (`Python 3.14.7`, `pip 26.2.1`)
- [x] Verify Ollama local model engine (`v0.34.2`)
- [x] Verify VS Code CLI (`1.127.0`)
- [x] Audit host machine hardware specifications (14 cores / 18 threads, 15.7 GB RAM, Intel Arc iGPU)
- [x] Confirm Antigravity as primary development IDE

---

### Phase 1: Architecture & Foundation ✅ (Completed)
- [x] Inspect workspace filesystem and initialize repository structure
- [x] Author comprehensive System Architecture (`docs/ARCHITECTURE.md`)
- [x] Author Engineering Roadmap (`docs/ROADMAP.md`)
- [x] Author Security & Governance Specification (`docs/SECURITY.md`)
- [x] Establish Architecture Decision Records (`docs/DECISIONS.md`)
- [x] Author Project Status Tracker (`docs/PROJECT_STATUS.md`)
- [x] Create authoritative `README.md`

---

### Phase 2: Micro-Kernel & Model Abstraction Engine ✅ (Completed)
- [x] Standardized TypeScript contracts for `IModelProvider`, `ChatRequest`, and `ModelResponse`
- [x] Local Ollama adapter (`qwen2.5:7b`)
- [x] Cloud provider adapters (Anthropic, OpenAI, Google Gemini)
- [x] Dynamic Model Router with fallback cascade and local prioritization
- [x] Automated health-check and latency benchmarking suite

---

### Phase 3: Structured Memory & Rushikesh Authority Engine ✅ (Completed)
- [x] Embedded SQLite database with WAL mode and foreign keys
- [x] 14 structured memory tiers with provenance tracking
- [x] Rushikesh Identity & Sovereign Authority Enclave
- [x] Session durability surviving kernel restarts

---

### Phase 4: Tool Bus & MCP Integration Hub ✅ (Completed)
- [x] Core `ToolRegistry` and typed execution pipeline
- [x] Danger Tiers (Tier 0 to Tier 4) with Permission Manager
- [x] Model Context Protocol (MCP) Client manager & stdio transport
- [x] Append-only SQLite audit logging with automatic secret redaction

---

### Phase 5: Multi-Agent Workforce & Project Engine ✅ (Completed)
- [x] `AgentRegistry` with named agents (Arjuna, Chanakya, Arya, Aditi, Agastya)
- [x] Persistent task and mission repositories
- [x] Constrained delegation manager (max depth 2, max 5 children, max 3 active tasks)
- [x] Persistent shared blackboard

---

### Phase 6: Browser Automation Integration ✅ (Completed)
- [x] `playwright-core` integration with native host Chrome and Microsoft Edge channels
- [x] Vendor-neutral `IBrowserAdapter` and 8 standard browser tools
- [x] Strict URL protocol whitelisting (`http:`, `https:`)
- [x] Distilled visible text extraction and screenshot artifact generation

---

### Phase 7: Windows Computer / Desktop GUI Control ✅ (Completed)
- [x] Windows Native Desktop Subsystem (`WindowsComputerAdapter`) via Win32, System.Drawing, WScript.Shell
- [x] 9 standard computer tools (`computer.screen.size`, `computer.screenshot`, `computer.window.active`, `computer.mouse.move`, `computer.mouse.click`, `computer.mouse.double_click`, `computer.keyboard.type`, `computer.keyboard.keypress`, `computer.app.launch`)
- [x] Application launch allowlist (`notepad`, `calculator`/`calc`, `paint`, `browser`, `android-studio`, `blender`)
- [x] Coordinate boundary verification & typing length safety caps (max 500 chars)
- [x] Automatic secret redaction in desktop typing audit logs
- [x] Real live test with `qwen2.5:7b` launching Notepad and typing message in 13.97s

---

### Phase 8: Local Voice Subsystem ✅ (Completed)
- [x] Vendor-neutral voice abstraction (`ISpeechToTextProvider`, `ITextToSpeechProvider`, `IAudioRecorder`, `IAudioPlayer`)
- [x] Dual-engine STT (`FasterWhisperSTTProvider` + `WindowsSpeechSTTProvider`)
- [x] Dual-engine TTS (`PiperTTSProvider` + `WindowsSapiTTSProvider`)
- [x] Windows native waveaudio capture (`WindowsAudioRecorder` via `winmm.dll`) and playback (`WindowsAudioPlayer` via `SoundPlayer`)
- [x] Sovereign Conversation pipeline integration preserving session memory and tool permissions
- [x] Interactive CLI voice commands (`voice start`, `voice stop`, `voice status`, `voice test`)
- [x] 147 automated unit tests passing across 32 suites (0 failures)
- [x] Real live test with `qwen2.5:7b` audio utterance synthesis, transcription, model response, and speaker playback in 48.25s

---

### Phase 9: Semantic Windows UI Automation ✅ (Completed)
- [x] Vendor-neutral semantic UI model (`UIElement`, `UIWindow`, `UIActionResult`)
- [x] Native Windows UIA adapter (`WindowsUiaAdapter`) via .NET `UIAutomationClient` / `UIAutomationTypes`
- [x] 6 standard semantic UI tools (`computer.ui.observe`, `computer.ui.find`, `computer.ui.focus`, `computer.ui.click`, `computer.ui.type`, `computer.ui.keypress`)
- [x] Semantic search criteria (`name`, `controlType`, `automationId`, `className`, `role`)
- [x] Security & boundary controls (tree pruning: max depth 5, max 150 elements; text cap 500 chars)
- [x] Stale and ambiguous element validation
- [x] Sensitive element redaction (passwords, PINs masked with `[REDACTED]`)
- [x] Selector injection protection
- [x] Coordinate primitives (`computer.mouse.*`, `computer.keyboard.*`, `computer.screenshot`) preserved as fallback
- [x] 162 automated unit tests passing across 35 test suites (0 failures)
- [x] Live verification with real Notepad discovering 27 controls, semantic focus and typing, and screenshot capture

---

### Phase 10: Software & Environment Manager Subsystem ✅ (Completed)
- [x] Vendor-neutral interfaces (`IApplicationRegistry`, `IApplicationDiscovery`, `IProcessManager`, `IPackageManagerAdapter`, `IEnvironmentManager`)
- [x] Multi-source safe application discovery (Known App Catalog, Start Menu Shortcuts, Registry App Paths, PATH resolution)
- [x] Application verification (path validation, existence verification, catalog matching, trusted source enforcement)
- [x] Controlled process management (PID tracking, HṚṢĪKEŚA ownership tracking, safe launch, readiness detection)
- [x] Readiness status machine (`STARTING`, `READY`, `FAILED`, `TIMEOUT`, `UNKNOWN`) integrating with UIA active window detection
- [x] System process protection (zero termination of PID 0, 4, `csrss`, `lsass`, `winlogon`, `explorer`, `svchost`, etc.)
- [x] Constrained package management adapter via `winget` (search, inspect, install with human approval)
- [x] UAC elevation pause detection and human intervention flagging
- [x] 10 new environment tools (`environment.applications.list`, `environment.application.find`, `environment.application.status`, `environment.application.launch`, `environment.process.list`, `environment.process.inspect`, `environment.process.terminate`, `environment.package.search`, `environment.package.inspect`, `environment.package.install`)
- [x] Role-scoped agent access (Arjuna for full engineering environment tools; Agastya for diagnostic inspection)
- [x] 182 automated unit tests passing across 39 test suites (0 failures)
- [x] Live verifier (`scripts/live-environment-verifier.ts`) discovering 189 apps, launching Notepad, verifying PID ownership, terminating with Tier 2 approval gate, and validating audit records

---

### Phase 11: Visual UI, Control Center & Agent Town ✅ (Completed)
- [x] Build modern, responsive Web UI (React 18 + Vite + Custom Futuristic Dark CSS)
- [x] Central HṚṢĪKEŚA status display: active tasks, resource monitor, model usage
- [x] Interactive Chat console with dynamic tool scoping
- [x] "Agent Town" topological workforce visualization reflecting genuine agent runtime state transitions
- [x] Governed Human-in-the-Loop approval modal for Danger Tier 3 and 4 actions
- [x] 14-Tier Memory & Decisions inspection explorer
- [x] Real-time Server-Sent Events (SSE) stream via `GET /events`

---

### Phase 12: Long-Term Semantic Memory & Associative Recall ✅ (Completed)
- [x] Additive SQLite `memory_embeddings` vector schema (Migration 003)
- [x] Local `nomic-embed-text` embedding provider via Ollama
- [x] Asynchronous background semantic indexer with single-flight resource guarding
- [x] Secret redaction and sensitive tier exclusion (`EmbeddingRedactor`)
- [x] In-process exact cosine similarity search
- [x] Hybrid retrieval combining keyword matching and vector similarity
- [x] 206 automated unit tests passing across 46 test suites (0 failures)
- [x] 12/12 live verification steps verified in `scripts/live-semantic-verifier.ts`

---

### Phase 13: Autonomous Mission Engine & Governed Execution Loop ✅ (Completed)
- [x] DAG TaskGraph engine with topological sort and cycle detection (Kahn's algorithm)
- [x] Semantic-aware structured MissionPlanner with 15s model timeout & archetype fallback
- [x] Genuine programmatic MissionVerifier (`file_exists`, `file_contains`, `command_exit_code`, `process_running`, `blackboard_entry_present`)
- [x] Failure classification & RecoveryManager (transient retry, replanning, HITL pause)
- [x] Finite budget enforcement (`maxTasks`, `maxRetries`, `timeoutMs`, `maxModelCalls`)
- [x] Human-in-the-loop pause and resume on Tier 3/4 permissions & security blocks
- [x] SQLite persistence for mission artifacts and task dependencies (Migration 004)
- [x] Automatic durable outcome storage in Memory Tier 12 (`task_history`)
- [x] Conservative MissionIntentClassifier distinguishing simple chat from executable goals
- [x] Control Center Missions View with live DAG visualization, HITL approval card, and artifact explorer
- [x] 237 automated unit tests passing across 46 test suites (0 failures)
- [x] End-to-end live verification of Safe Live Mission #1 and Safe Live Mission #2

---

### Phase 13.6: HṚṢĪKEŚA Workforce Rearchitecture ✅ (Completed)
- [x] Rearchitected workforce into **17 persistent specialized autonomous agents** covering the full enterprise lifecycle:
  - **Market & Strategy:** Rahu (Market Intelligence), Aja (Strategy & Business Planning), Ritvan (Company & Team Setup)
  - **Product & Engineering:** Tvas (Customer & Requirements), Spoota (Product & UX Design), Gāṇḍīva (Software Engineering), Vighna (QA & Verification)
  - **Commercial & Delivery:** Raudra (Marketing & Sales), Rutam (Contracts & Compliance), Arvan (Fulfillment & Delivery), Tāraka (Customer Support), Kalki (Billing & Payments)
  - **Operations & Transformation:** Garuḍa (Operations & Monitoring), Kali (Improvement & Expansion)
  - **Cross-Cutting Lifecycle:** KĀLA (Time & Scheduling), Yama (Recovery & Backup), Mṛtyu (Retirement & Decommissioning)
- [x] Clean separation of Yama (Recovery/Rollback) and Mṛtyu (Termination/Exit)
- [x] Strict ASCII-safe database identifiers (`rahu`, `gandiva`, `mrtyu`, `kaala`) and authentic Sanskrit Unicode orthography (`Gāṇḍīva` / `गाण्डीव`, `Tāraka` / `तारक`, `Garuḍa` / `गरुड`, `KĀLA` / `काल`, `Mṛtyu` / `मृत्यु`)
- [x] Dynamic capability-based specialist discovery in `AgentRegistry` and `MissionPlanner`
- [x] Agent Town UI topological layout rendering all 17 agents with real runtime states and enclave clustering
- [x] Real-time `WorkforceHealth` aggregation diagnostics (`total`, `active`, `idle`, `blocked`, `awaitingApproval`, `failed`, `recovering`, `retired`)
- [x] Comprehensive documentation in `docs/WORKFORCE.md` and `docs/DECISIONS.md` (ADR-016)
- [x] Automated deterministic tests in `tests/workforce-17-agents.test.ts`
- [x] Live verification script in `scripts/live-workforce-verifier.ts`

---

### Phase 14: Company & Project Operating System ✅ (Completed)
- [x] Schema migration `005_company_os_schema.ts` for Companies, Projects, Departments, Products, Customers, Decisions
- [x] 15-Stage Business Lifecycle Engine (`LifecycleEngine`)
- [x] Automated organization topology deployment (Ritvan) & capacity coordination (KĀLA)
- [x] Scoped memory isolation and hierarchical preambles
- [x] 29 HTTP REST endpoints under `/companies` and `/projects`
- [x] CompaniesView UI with 7 dedicated tabs
- [x] 289 automated tests passing across 47 suites
- [x] 15/15 live integration verifier steps in `scripts/live-company-os-verifier.ts`

---

### Phase 15: Autonomous Goal Management & Verification Engine ✅ (Completed)
- [x] Schema migration `006_goal_engine_schema.ts` for Goals and Milestones with full provenance links
- [x] Sovereign Goal Execution Engine (`GoalExecutionEngine`) with deterministic archetypes & LLM-validated planning
- [x] Milestone decomposition into Phase 13 `CreateMissionOptions` (`GoalDecomposer`)
- [x] Independent deterministic verification without LLM self-certification (`GoalVerifier`)
- [x] Strict Human-in-the-Loop (HITL) approval gates for destructive/production operations
- [x] Bounded replanning (`maxReplans`) preserving verified completed milestones
- [x] Cold restart recovery from SQLite WAL (`recoverGoalsOnRestart`)
- [x] 13 HTTP REST endpoints under `/goals`
- [x] GoalsView UI with metrics cards, filterable cards, creation modal, DAG detail drawer, and live SSE reactivity
- [x] 304 automated tests passing across 55 suites (0 failures, 0 skipped)
- [x] 17/17 live integration verifier steps in `scripts/live-goal-engine-verifier.ts`

---

### Phase 16: Persistent Autonomous Operations + Open-Source Capability Foundation ✅ (Completed)
- [x] Schema migration `007_persistent_operations_schema.ts` for Schedules and Objective Evaluation audit records
- [x] Persistent Objective Lifecycle (`DRAFT`, `ACTIVE`, `HEALTHY`, `WAITING`, `BLOCKED`, `NEEDS_USER`, `PAUSED`, `DEGRADED`, `COMPLETED`, `FAILED`, `CANCELLED`)
- [x] Deterministic Objective Health Evaluator (`ObjectiveHealthEvaluator`) from runtime evidence
- [x] Continuous Objective Evaluation Loop (`ObjectiveEvaluator`) with bounded budgets per cycle
- [x] Persistent Scheduling Engine (`PersistentScheduler`) with SQLite durability across restarts
- [x] Restart & Interruption Recovery (`ObjectiveRecoveryManager`) with idempotent state recovery
- [x] Host Resource Governance (`ResourceGovernor`) monitoring RAM/CPU pressure levels (`NORMAL`, `LOW_MEMORY`, `CRITICAL_MEMORY`)
- [x] Open-Source Capability Foundation & Registry (`CapabilityRegistry`) with standardized `ICapabilityAdapter`
- [x] Adapters for Playwright, Windows Computer/UIA, faster-whisper, Piper TTS, Semantic Memory, Native FS, PowerShell
- [x] Agent Semantic Capability Routing (`AgentCapabilityRouter`) translating abstract requests with danger tier gating
- [x] Open-Source Inventory & Evaluation Record (`docs/OPEN_SOURCE_INVENTORY.md`)
- [x] 20/20 live verifier scenarios passing in `scripts/live-phase16-verifier.ts`
- [x] Comprehensive test suites passing across all subsystems

---

## Future Roadmap (Authoritative Sequence)

### Phase 17: Advanced Research & Web Intelligence ✅ (Completed)
- [x] Persistent research study schema migration 008 (`research_studies`, `research_sources`, `research_evidence`, `research_findings`)
- [x] Natural language research intent formulation (`ResearchEngine.parseResearchIntent`)
- [x] DuckDuckGo & official open-source search adapters
- [x] Playwright/HTTP acquisition pipeline with structured headings, paragraphs, and metadata extraction
- [x] SHA-256 content deduplication across mirrors and distinct URLs
- [x] Observable credibility tiering (`AUTHORITATIVE`, `PRIMARY`, `SECONDARY`, `COMMUNITY`, `UNVERIFIED`) and freshness evaluation (`CURRENT`, `RECENT`, `DATED`, `HISTORICAL`)
- [x] Strict indirect prompt injection defense (`PromptInjectionDefense`, `<untrusted_web_content>`)
- [x] Claim and evidence typing (`FACT`, `CLAIM`, `INFERENCE`, `OPINION`, `UNKNOWN`)
- [x] Cross-source corroboration and discrepancy/contradiction detection (`CrossSourceAnalyzer`)
- [x] Traceable 1-indexed citations (`[1]`, `[2]`) linked to verified sources
- [x] Markdown report (`research.md`) and JSON artifact bundling (`sources.json`, `evidence.json`)
- [x] Durable verified facts persistence to Tier 9 Semantic Memory (`knowledge`, `learned`)
- [x] Indian Traditional 3D Control Center UI Research View (`ResearchView.tsx`)
- [x] Periodic research monitoring via `PersistentScheduler`
- [x] 20/20 live verifier scenarios passing in `scripts/live-phase17-verifier.ts`
- [x] Comprehensive test suites passing across all subsystems

---

### Phase 18: Advanced Model Router & Intelligence Gateway ✅ (Completed)
- [x] Schema migration `009_model_routing_schema.ts` (`model_usage_audits`, `model_preferences`)
- [x] Persistent Model & Provider Registry with dynamic health and capability discovery
- [x] Multi-dimensional `TaskProfiler` (17 task types, 4 complexity tiers, 4 privacy levels)
- [x] Deterministic hard constraint validation (privacy, tools, structured JSON, vision, context window)
- [x] Explainable multi-factor model scoring across 6 policies (`BALANCED`, `LOCAL_FIRST`, `QUALITY_FIRST`, `SPEED_FIRST`, `COST_FIRST`, `PRIVACY_FIRST`)
- [x] Resource-aware routing integrated with Phase 16 `ResourceGovernor`
- [x] Safe fallback execution chains with explicit failure logging
- [x] Auditable usage tracking, token accounting, and cost estimation
- [x] Zero secret storage & automated credential redaction
- [x] Zero quota evasion or account rotation
- [x] Agent, Goal, Mission, and Research engine integrations
- [x] Indian Traditional 3D Control Center Models View (`ModelsView.tsx`)
- [x] 35/35 automated unit & integration tests passing
- [x] 20/20 live verifier scenarios passing in `scripts/live-phase18-verifier.ts`

---

## Phase 19: Advanced Memory & Knowledge Graph ✅ (Completed)
- [x] Local-first SQLite graph schema (`010_knowledge_graph_schema.ts`)
- [x] Formal Entity, Relationship, Fact, Evidence, Claim, and Contradiction domain models
- [x] Canonical entity resolution, alias mapping, and Sanskrit diacritic/phonetic folding
- [x] Bounded graph traversal (1-hop, 2-hop, max 5-hop) with cycle detection
- [x] Temporal fact versioning, historical retention, and superseding workflows
- [x] Contradiction detection, resolution strategies, and staleness/decay evaluation
- [x] Multi-tier scope isolation (GLOBAL, CREATOR, COMPANY, PROJECT, AGENT)
- [x] Provenance attribution and calibrated confidence scoring [0.0, 1.0]
- [x] Security: Credential redaction (`sk-...`, Bearer, passwords) & prompt injection defanging
- [x] Intelligent context assembly with token budgets and hybrid search
- [x] Memory consolidation service with ResourceGovernor pressure protection
- [x] Control Center Knowledge View (`KnowledgeView.tsx`) with real-time SSE updates
- [x] Interactive 3D knowledge network (`KnowledgeNetwork3D.tsx`)
- [x] 40/40 Phase 19 unit & integration tests passing
- [x] 27/27 scenarios passing in `scripts/live-phase19-verifier.ts`

---

## Phase 20: Skills & Procedural Intelligence ✅ (Completed)
- [x] Schema Migration 011 for skills, steps, versions, and execution records
- [x] SkillRegistry, SkillVersionManager, SkillExecutionEngine
- [x] Skill-to-Tool adapter and CapabilityRegistry integration
- [x] Dynamic composition and multi-step procedural trees
- [x] HITL approval gating and permission validation

---

## Phase 21: Dynamic MCP & Capability Ecosystem ✅ (Completed)
- [x] Local-first SQLite schema Migration 012 (`012_mcp_capability_ecosystem_schema.ts`)
- [x] Vendor-neutral MCP domain types, JSON-RPC 2.0 transport factory (`in-memory`, `stdio`, `http`)
- [x] Static security inspector (`MCPSecurityValidator`) detecting command injection, secret leakage, prompt injection
- [x] MCPClientService with 1MB output ceiling, 30s deadline timeout, handshake initialization
- [x] MCPProcessManager with PID tracking, crash recovery (bounded 3 max restarts), ResourceGovernor throttling
- [x] MCPServerRegistry with lifecycle states (DISCOVERED, PENDING_APPROVAL, AUTHORIZED, HEALTHY, DEGRADED, DISABLED, REVOKED, REMOVED)
- [x] MCPCapabilityAdapter adapting MCP tools to `ITool` and `ICapabilityAdapter`
- [x] MCPRefreshService with schema drift detection, tool addition discovery, permission escalation defense
- [x] AgentCapabilityRouter with provider hierarchy (Native > Local MCP > Remote MCP)
- [x] Knowledge Graph synchronization (entity type `TOOL`/`SYSTEM_CAPABILITY`)
- [x] 14 REST HTTP endpoints under `/mcp/*`
- [x] Full-featured Control Center UI view (`MCPView.tsx`) with server cards, tool runner, and inspector modal
- [x] 35/35 unit/integration tests passing in `tests/phase21-mcp.test.ts`
- [x] 35/35 live verification scenarios passing in `scripts/live-phase21-verifier.ts`
- [x] 506/506 total tests passing across all 77 suites

---

## Phase 22: Advanced Computer Operator ✅ (Completed)
- [x] Local-first SQLite schema Migration 013 (`013_computer_operator_schema.ts`)
- [x] Coordinate-free semantic UI automation with UIA & Accessibility Tree integration
- [x] Multi-strategy fallback (UIA -> Win32 -> OCR -> Heuristic coordinate fallback)
- [x] Multi-application workflow orchestration with visual verification and state reconciliation
- [x] 18/18 tests passing in `tests/phase22-computer-operator.test.ts`
- [x] 524/524 repository baseline tests passing

---

## Phase 23: External / Enterprise Environments ✅ (Completed)
- [x] Local SQLite schema Migration 014 (`014_external_environments_schema.ts`)
- [x] 14 environment types, 12 lifecycle statuses, 5 trust tiers, 8 session statuses
- [x] Protocol adapters: SSH, Windows Remote (WinRM/PS), Linux, RDP/VDI, Cloud, Containers, CI/CD, Remote Browser CDP
- [x] Zero plaintext credential harvesting with OS credential manager pointer references
- [x] Command injection defense, path traversal sanitization, protected process shielding
- [x] 13-stage lifecycle state machine with connection pool management
- [x] 12 REST HTTP endpoints under `/environments/*`
- [x] Frontend Control Center `EnvironmentView.tsx` with live telemetry, executor, and registry
- [x] 60/60 tests passing in `tests/phase23-environments.test.ts`
- [x] 35/35 live verification scenarios passing in `scripts/live-phase23-verifier.ts`
- [x] 616/616 total tests passing across all 79 test suites with zero regressions

---

## Phase 24: Multimodal Vision + Advanced Voice ✅ (Completed)
- [x] Local SQLite schema Migration 015 (`015_multimodal_vision_voice_schema.ts`)
- [x] 8 unified input types: `TEXT`, `AUDIO`, `IMAGE`, `SCREENSHOT`, `CAMERA_FRAME`, `DOCUMENT_IMAGE`, `UI_TREE`, `VIDEO_FRAME`
- [x] MultimodalContext & Assembler bounding multi-sensory contexts and transcripts
- [x] Real-time Voice Activity Detection (VAD) with RMS amplitude and silence duration bounds
- [x] Streaming STT lifecycle (`LISTENING` -> `TRANSCRIBING` -> `PARTIAL` -> `FINAL`)
- [x] Streaming sentence-chunked TTS with instant voice interruption and barge-in coordination
- [x] VisionEngine for screenshot and region inspection with local OCR bounding box extraction
- [x] Deterministic UIA-First Perception: `UI Automation -> Learned Pattern -> OCR -> Vision Reasoning -> Coordinate Fallback`
- [x] Visual target grounding and verification before physical action execution
- [x] Multimodal security policies: secret redaction, prompt injection neutralization, challenge detection (`CAPTCHA`/`MFA`/`CRASH` -> `NEEDS_USER`)
- [x] Bounded camera manager with explicit opt-in lifecycle (`OFF` -> `READY` -> `ACTIVE` -> `OFF`)
- [x] Hardware-aware Resource Governor integration adapting workloads to laptop constraints
- [x] 12 REST HTTP endpoints under `/multimodal/*` and 18 SSE domain events
- [x] Frontend Control Center `MultimodalView.tsx` with live telemetry, OCR viewer, and audio controls
- [x] 60/60 tests passing in `tests/phase24-multimodal.test.ts`
- [x] 35/35 live verification scenarios passing in `scripts/live-phase24-verifier.ts`
- [x] 676/676 total tests passing across all 80 test suites with zero regressions

---

## Phase 25: Full Autonomous Company Operations ✅ (Completed)
- [x] Local SQLite schema Migration 016 (`016_autonomous_company_operations_schema.ts`) with 14 tables
- [x] 20-State Autonomous Company Lifecycle Engine (`CompanyAutomationEngine`)
- [x] 11-Dimensional Health Evaluator (`CompanyHealthService`)
- [x] Time-series KPI Engine (`CompanyKpiEngine`)
- [x] 17-Agent Dynamic Capacity and Work Routing Matrix (`CompanyWorkforceManager`)
- [x] 9-Tier Policy Hierarchy (`CompanyPolicyEngine`) and HITL Gatekeeper (`CompanyApprovalService`)
- [x] CRM & Order Management (`CompanyCrmOrderService`) across 9 customer states & 13 order stages
- [x] 48/48 unit/integration tests passing in `tests/phase25-company-operations.test.ts`
- [x] 38/38 live verification scenarios passing in `scripts/live-phase25-verifier.ts`

---

## Phase 26: Safe Self-Improvement & Self-Maintenance ✅ (Completed)
- [x] Local SQLite schema Migration 017 (`017_safe_self_improvement_schema.ts`) with 12 relational tables:
  - `self_observations`, `self_anomalies`, `improvement_proposals`, `improvement_evidence`, `improvement_changesets`, `improvement_tests`, `improvement_benchmarks`, `improvement_approvals`, `improvement_deployments`, `improvement_rollbacks`, `maintenance_jobs`, `dependency_findings`
- [x] 14-Stage Deterministic Self-Evolution Lifecycle: `OBSERVE -> DIAGNOSE -> IDENTIFY -> PROPOSE -> PLAN -> ISOLATED CHANGESET -> TEST -> BENCHMARK -> VERIFY -> APPROVAL -> APPLY -> VERIFY -> RECORD -> LEARN`
- [x] 20 Improvement Categories & Automatic 4-Tier Risk Classifier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- [x] Non-negotiable Human-in-the-Loop (`HITL`) gatekeeper enforcing Rushikesh Pattiwar as final human authority
- [x] Isolated Changeset and unified patch generator (`ChangeSetService`)
- [x] Sandboxed Workspace Execution & Deterministic Test Gating (`ImprovementSandboxService`)
- [x] Performance Benchmarking & Outcome Classifier (`ImprovementBenchmarkService`)
- [x] Staged Canary Deployment & Automated Pre-Change Snapshot Rollback Engine (`ImprovementRollbackService`)
- [x] 8 Automated Self-Maintenance Routines & Bounded Self-Repair with strict max 3 retry budget
- [x] Dependency Intelligence with package version drift scanning and security advisories
- [x] Exact 17-Agent Workforce roster preservation and sovereign orchestrator (HṚṢĪKEŚA) governance
- [x] 6 Self-Improvement Tools registered with `ToolRegistry` (`self.health.inspect`, `self.anomalies.list`, `self.proposals.manage`, `self.changeset.sandbox`, `self.benchmark.run`, `self.maintenance.execute`)
- [x] 18+ HTTP REST endpoints under `/self/*` and 15 EventBus domain events
- [x] Frontend Control Center `SelfImprovementView.tsx` with live health scorecard, proposals board, anomalies, and maintenance triggers
- [x] 80/80 dedicated tests passing in `tests/phase26-self-improvement.test.ts`
- [x] 42/42 live verification scenarios passing in `scripts/live-phase26-verifier.ts`
- [x] 804/804 total tests passing across all 112 test suites with zero regressions

---

## Track A: INT-005: Advanced Research & Web Intelligence ✅ (Completed)
- [x] Multi-source research intelligence pipeline with 12 research types and 5 depth tiers (`QUICK`, `STANDARD`, `DEEP`, `COMPREHENSIVE`, `EXHAUSTIVE`).
- [x] 10-dimensional research budget governance (`maxSources`, `maxDepth`, `maxSearchQueries`, `maxFetchQueries`, `maxTokensPerSource`, `maxTotalTokens`, `timeoutMs`, `maxCostUsd`, `maxModelCalls`, `allowPaywalled`).
- [x] 17-state lifecycle state machine with cancellation and safe snippet fallback.
- [x] Strict security containment: external web content treated as untrusted data (`<untrusted_web_content>` envelope).
- [x] Prompt injection detector: regex and adversarial pattern defense neutralizing jailbreaks and prompt overrides.
- [x] Access control and bot detection: CAPTCHA, reCAPTCHA, Cloudflare challenges, login/paywall detection without illegal bypass.
- [x] Automated sensitive credential and secret redaction (`[REDACTED_CREDENTIAL]`).
- [x] Deterministic credibility (`AUTHORITATIVE`, `PRIMARY`, `SECONDARY`, `COMMUNITY_OPINION`) and freshness classification.
- [x] Claim extraction, evidence polarity, and provenance mapping.
- [x] Cross-source discrepancy detector identifying 5 conflict types (`DATE_MISMATCH`, `NUMERICAL_DISCREPANCY`, `VERSION_MISMATCH`, `FACTUAL_DISAGREEMENT`, `COMPATIBILITY_CONFLICT`).
- [x] Multi-source report synthesis with zero-hallucination citation graphs and durable facts extraction for sovereign memory.
- [x] Builtin tools `research.execute` (TIER_1) and `research.query` (TIER_0).
- [x] 6 procedural research skills added to `BUILTIN_SKILLS`.
- [x] FastChatGate preservation: greetings (< 10ms), identity (< 5ms), time (< 10ms), date (< 5ms), and simple arithmetic remain isolated from research engine (0 LLM calls).
- [x] 55/55 tests passing in `tests/int-005-research.test.ts`.
- [x] 6/6 live benchmark scenarios passing in `scripts/benchmark_int005_live.js`.
- [x] 119/119 regression tests passing with zero failures. Clean build and lint.

---

## Track A: INT-006: Sovereign Personal Knowledge Graph & Memory Deepening ✅ (Completed)
- [x] Native SQLite schema extension (Migration 018) for `knowledge_merge_proposals`, temporal fact extensions, evidence citations, and structured contradictions.
- [x] Sovereign entity resolution with multi-tier deterministic matching (exact canonical, alias lookup, canonical clusters, fuzzy candidates) and cross-type conflict protection.
- [x] Proposal-based merging & non-destructive disambiguation: zero silent merges, human approval workflow via `knowledge_merge_proposals`.
- [x] Temporal non-destructive fact versioning with `validFrom`, `validUntil`, `observedAt`, `version`, and `supersededBy`. Complete historical auditability without deleting historical evidence.
- [x] Strict provenance tracking across all facts and entities (`EXPLICIT`, `DERIVED`, `INFERRED`, `IMPORTED`, `RESEARCH`, `SYSTEM`).
- [x] Research-Knowledge Bridge ingesting `ResearchArtifactBundle` into graph with invariant protection: model inferences/opinions are never persisted as durable facts.
- [x] Privacy and secret redaction pipeline neutralizing adversarial prompt injection and stripping API keys/credentials (`sk-...`) before persistence.
- [x] Multi-tenant scope isolation (`CREATOR`, `GLOBAL`, `PROJECT`, `COMPANY`, `SESSION`) and Architectural Decision Register (ADR/PDR) memory recall.
- [x] Bounded context assembly (< 800 chars / max 100ms) with cycle protection and max 5-hop / 150-node traversal bounds.
- [x] Builtin tools `knowledge.search`, `knowledge.entity.lookup`, `knowledge.fact.query` and 6 procedural skills registered in `BUILTIN_SKILLS`.
- [x] 6 HTTP REST endpoints under `/knowledge/*` and EventBus domain integration.
- [x] Deterministic fast-paths (< 20ms, 0 LLM calls) strictly preserved.
- [x] 44/44 dedicated tests passing in `tests/int-006-knowledge.test.ts`.
- [x] 11/11 live benchmark tests passing in `scripts/benchmark_int006_live.js` (average latency: 3.187ms, 0 model calls).
- [x] Full regression suite passing cleanly (163/163 tests, 0 errors).
- [x] Clean TypeScript check (`tsc --noEmit`), clean build (`npm run build`), clean lint (`npm run lint`).

---

## Track A: INT-007: Cognitive Context Engine (Unified Memory, Research & Decision Intelligence) ✅ (Completed)
- [x] Multi-source candidate collection across `FACTS`, `ENTITIES`, `DECISIONS`, `RESEARCH`, `PREFERENCES`, `EPISODIC`, `WORKING_MEMORY`, and `CONTRADICTIONS`.
- [x] Intent and task complexity classification (`CHAT`, `TASK`, `DECISION_LOOKUP`, `RESEARCH`, `CODE`, `CREATIVE`, `SYSTEM`).
- [x] Scope resolution with strict tenant isolation (`CREATOR`, `GLOBAL`, `PROJECT`, `COMPANY`, `SESSION`, `AGENT`, `GOAL`, `MISSION`).
- [x] Transparent multi-factor relevance ranking with explainable scoring (+0.40 user preference, +0.35 intent, +0.30 scope, +0.25 entity, +0.20 provenance, +0.15 recency, +0.10 contradiction/evidence).
- [x] Temporal filtering and fact versioning (`CURRENT`, `HISTORICAL`, `BEFORE`, `AFTER`, `AT_TIME`, `ALL`).
- [x] Structured contradiction preservation: formatting disputed claims into `[CONTESTED INFORMATION / UNRESOLVED]` blocks rather than hallucinating or dropping facts.
- [x] Adaptive context token/character budgeting (T0-T4) governed by `ResourceGovernor` memory pressure (`LOW_MEMORY` / `CRITICAL_MEMORY`).
- [x] Lossless-priority context compressor protecting explicit preferences and unresolved contradictions from truncation.
- [x] Sub-20ms deterministic fast-paths frozen and completely isolated from context retrieval pipeline (0 LLM calls, 0 database overhead).
- [x] Builtin tools `context.inspect`, `context.search`, `context.trace` (TIER_0) and 6 procedural skills registered in `BUILTIN_SKILLS`.
- [x] Diagnostic HTTP REST endpoints (`GET /context/trace/:requestId`, `GET /context/traces`, `POST /context/assemble`).
- [x] 42/42 dedicated tests passing in `tests/int-007-context-engine.test.ts`.
- [x] 15/15 live benchmark scenarios passing in `scripts/benchmark_int007_live.js` (average latency: 2.774ms, 0 model calls).
- [x] 197/197 regression tests passing across all INT suites (0 failures).
- [x] Clean TypeScript check (`tsc --noEmit`), clean build (`npm run build`), clean lint (`npm run lint`).

---

## Track A: INT-008: Persistent Working Memory & Conversational Continuity Engine ✅ (Completed)
- [x] Native SQLite schema extension (Migration 019) creating `conversation_threads`, `working_memory_items`, `conversation_checkpoints`, and `pending_items` with proper foreign keys and indexes.
- [x] Working memory repositories: `ConversationThreadRepository`, `WorkingMemoryItemRepository`, `ConversationCheckpointRepository`, `PendingItemRepository`.
- [x] Multi-factor candidate thread ranking: explicit title matches, token matches, project overlap, status priority, recency decay, and continuation boost. Cross-session candidate isolation.
- [x] Deterministic deictic reference and anaphora resolution: "it" -> blocker/error/task, "that" -> recent result/decision, "this" -> active topic/task, "the previous one" -> superseded state, "continue" -> active task/project.
- [x] Ambiguity detection when multiple candidates have equal confidence (< 0.15 margin) without blind guessing.
- [x] Explicit user correction detection: "No, I meant X", "Use Y instead", "Forget previous assumption" automatically superseding prior assumptions or overriding active project/company.
- [x] Continuity tracking: project/company intent detection, active goal/mission tracking, blocker management, and pending item tracking.
- [x] Checkpoint capture & cross-session restoration: full structured state snapshot and automatic recovery across restarts.
- [x] Scope isolation (`GLOBAL`, `PROJECT`, `COMPANY`, `SESSION`, `AGENT`, `GOAL`, `MISSION`) and secret redaction (`sk-...`, tokens).
- [x] INT-007 integration: `CandidateSourceType.WORKING_MEMORY`, relevance ranker priority bonuses (+0.40 user correction, +0.35 task/blocker, +0.30 project), and compressor budget protection.
- [x] 4 builtin diagnostic tools: `working_memory.inspect`, `working_memory.threads`, `working_memory.pending`, `working_memory.checkpoint` (TIER_0).
- [x] 4 procedural skills registered in `BUILTIN_SKILLS`: `working-context`, `resume-task`, `conversation-checkpoint`, `resolve-reference`.
- [x] 7 HTTP REST endpoints under `/working-memory/*`.
- [x] Deterministic fast-path preservation: sub-20ms instant responses completely bypass working memory lookups.
- [x] 45/45 dedicated tests passing in `tests/int-008-working-memory.test.ts` (104ms).
- [x] 20/20 live benchmark scenarios passing in `scripts/benchmark_int008_live.js` (average latency: 1.80ms, 0 model calls).
- [x] Full regression suite passing cleanly (175/175 tests, 0 failures).
- [x] Clean TypeScript check (`tsc --noEmit`), clean build (`npm run build`), clean lint (`npm run lint`).

---

## Foundation Performance & Execution Block (FP-01) ✅ (Completed)
- [x] Hardware-agnostic local inference abstraction (`src/inference/`) supporting Ollama, llama.cpp CPU, and llama.cpp Vulkan (Intel Arc GPU).
- [x] Deterministic zero-model T0 fast paths (< 25ms): greetings, identity ("Rishi"), time, date, simple math (0 LLM calls).
- [x] Execution-First Policy: suppression of unnecessary clarification; assumption logging in working memory.
- [x] Canonical identity **HṚṢĪKEŚA** with English self-reference **Rishi**.
- [x] Asynchronous non-blocking chat title generation.
- [x] Cooperative cancellation tokens immediately stopping model processes on STOP/CANCEL commands.
- [x] 100% sovereign offline-first operation.
- [x] 21/21 tests passing in `tests/fp-01-performance.test.ts`.

---

## Interactive Inference Optimization (FP-02) ✅ (Completed)
- [x] Warm model residency (`keep_alive: 15m`) delivering Time-To-First-Token (TTFT) of 253–314ms.
- [x] True Server-Sent Events (SSE) token streaming to the frontend.
- [x] 4 response modes: `CONCISE` (max 75 tokens), `NORMAL` (default 256 tokens), `DETAILED`, `DEEP`.
- [x] T1/T2 context minimization (< 100 tokens, tool schemas stripped for conversational turns).
- [x] Hardware-aware backend selection with multi-threaded Intel Arc Vulkan offload (`-ngl 99`).
- [x] Model role separation: T0 deterministic, T1 fast (1.5B), T2 interactive (Llama 3.2 3B resident), T3/T4 reasoning (Qwen 2.5 7B on-demand).
- [x] 14/14 tests passing in `tests/fp-02-streaming.test.ts`.

---

## Distributed Local/LAN Resource Fabric & Execution Capacity (FP-03) ✅ (Completed)
- [x] Control Plane vs Execution Plane separation: Control plane remains exclusively on the primary laptop; workers execute authorized workloads.
- [x] SQLite schema Migration 020 (`020_resource_fabric_schema.ts`): `workers`, `worker_capabilities`, `worker_tasks`, `worker_resource_snapshots`, `worker_enrollment_tokens`.
- [x] Core resource fabric subsystem in `src/resources/`: `ResourceRegistry`, `ResourcePolicyManager`, `ResourceHealthTracker`, `ResourceScheduler`, `ResourceManager`, `LocalWorker`, `LanWorkerClient`, `ResourceTelemetryTracker`.
- [x] First-class Local Worker descriptor with automatic CPU, RAM, Intel Arc GPU, Vulkan, Ollama, and tool capability detection.
- [x] Secure LAN worker client prototype with single-use cryptographic pairing tokens (SHA-256 hashed with TTL).
- [x] Resource-aware placement engine with multi-factor scoring (priority + local affinity + GPU acceleration + RAM headroom - load score penalty) and explainable decision records.
- [x] Privacy boundaries enforced: `SOVEREIGN_LOCAL` strictly prohibited from leaving host; `HIGHLY_PRIVATE`, `PRIVATE`, `PUBLIC`.
- [x] Safe bounded execution whitelist for non-local workers (`compute.echo`, `compute.benchmark`, `resource.fabric.test`, `inference.generate`, `model.health`). Zero unrestricted remote shell.
- [x] Cooperative cancellation propagation: scheduler -> worker -> running loop.
- [x] Worker heartbeat tracking with auto-transition to `DEGRADED`/`OFFLINE` and automated task requeueing/recovery with idempotency protection.
- [x] Safe artifact transfer with SHA-256 hash verification, 50 MB size bounds, and path traversal defense.
- [x] Integration with `ResourceGovernor`: under `CRITICAL_MEMORY`, local affinity bonus drops to -30 to offload non-private workloads to LAN nodes.
- [x] REST API endpoints (`/resources/workers`, `/resources/workers/pair`, `/resources/workers/enroll`, `/resources/workers/:id`, `/resources/tasks`, `/resources/overview`) and typed SSE events.
- [x] Control Center Workers dashboard (`WorkersView.tsx`) with real-time hardware telemetry, live compute benchmark, pairing modal, and node controls (drain/revoke/resume).
- [x] 39/39 tests passing in `tests/fp-03-resource-fabric.test.ts` (including 4 Live Verification Flows).
- [x] Exact 17-agent workforce preserved intact (Agent -> Task -> Resource Fabric -> Worker -> Tool/Model).

---

## Physical LAN Execution & Distributed Inference (FP-04) ✅ (Completed)
- [x] Pre-existing Phase 14 test fix: Resolved `no such table: workers` in `tests/company-os.test.ts` cleanly via DB instance awareness in `ResourceManager.initialize()` and `resetInstance()`. All 17/17 tests pass.
- [x] Sovereign Port Isolation: Primary HṚṢĪKEŚA control plane (Port 4200) strictly bound to `127.0.0.1` (localhost). No enterprise/identity APIs exposed to LAN.
- [x] Dedicated Worker Transport Layer (`src/resources/transport/`): Runs on dedicated port 4300 (`WorkerTransportServer`) exposing ONLY typed worker protocol frames.
- [x] TLS 1.3 Encryption & Pure-JS X.509: Implemented zero-dependency pure JavaScript self-signed RSA-2048 certificate generation with SHA-256 fingerprinting.
- [x] Framing & Buffer Defense: 4-byte big-endian length-prefixed framing with strict 5 MB frame payload ceiling defense against socket exhaustion.
- [x] Standalone Physical Worker Runtime (`src/resources/worker-runtime/`): Standalone daemon CLI executable on Machine B without running the HṚṢĪKEŚA control plane.
- [x] Cryptographic Pairing & Reconnection: Single-use enrollment tokens (`hrsk_enroll_<random>`) exchange for scoped session tokens (`hrsk_sess_<random>`). Safe reconnects with token reuse protection.
- [x] Discovery Layer: Optional UDP beacon discovery (`WorkerDiscovery`) with strict zero-trust boundary (discovery $\neq$ authorization).
- [x] Bounded Remote Workloads: `compute.echo`, `compute.benchmark`, `resource.fabric.test`, `model.health`, `inference.generate`. Absolute prohibition of arbitrary remote shell (`terminal.execute`) or arbitrary filesystem commands.
- [x] Distributed Inference with True Token Streaming: Remote execution of `inference.generate` streams tokens in real-time over TLS transport chunks into HṚṢĪKEŚA SSE streams and the Chat UI.
- [x] Cooperative Remote Cancellation: `TASK_CANCEL` propagates to worker runtime with `AbortController` cancellation stopping model generation immediately.
- [x] Real-Time Telemetry & GPU Probing: Non-fabricating GPU telemetry (`nvidia-smi`, `rocm-smi`, Level-Zero) returning real metrics or `'UNKNOWN'`.
- [x] 40/40 dedicated tests passing in `tests/fp-04-lan-execution.test.ts`.
- [x] Physical LAN Verification Status: Accurately reported as `PHYSICAL_LAN_VERIFICATION = NOT_AVAILABLE` in single-machine development environment (zero fabrication).

---

## Multi-Worker Execution, Concurrent Inference & Physical LAN Validation (FP-05) ✅ (Completed)
- [x] Multi-Worker Registry & Simultaneous TLS Connections: Transport server upgraded to manage concurrent worker sessions simultaneously via `Map<string, ConnectedWorkerSession>`, tracking multiple concurrent `activeTaskIds: Set<string>` per session without crosstalk.
- [x] Model-Aware Placement & Warm Model Residency: Route tasks to workers advertising requested models; award +40 score bonus to workers with models pre-loaded in memory/VRAM (`worker.residentModels`).
- [x] Worker Capacity Accounting & Load Balancing: Placement engine accounts for active tasks, applies active task penalty (`-15/task`), and tie-breaks by lowest active tasks across identical nodes.
- [x] Per-Worker Concurrency Limits: Enforces `worker.resourceLimits.maxConcurrentTasks`, marking saturated workers ineligible for immediate placement (`isSaturated = true`).
- [x] Queue-Aware Scheduling with Aging Bonus: When all eligible workers are saturated, tasks enqueue in priority `taskQueue`; aging bonus (+1 point per 5s) prevents starvation for lower-priority background tasks.
- [x] Graceful Worker Draining Lifecycle (`DRAINING` -> `DRAINED`): Draining workers reject new tasks, complete active tasks, and automatically transition to `DRAINED` when active count reaches 0. Resuming restores `ONLINE` and pumps queue.
- [x] Automatic Task Migration on Network Dropped: Tasks with `allowMigration: true` automatically requeue and migrate to alternate eligible workers upon transport network drop.
- [x] In-Flight Idempotency Deduplication: Schedulers maintain `inFlightByIdempotency` to allow concurrent duplicate submissions with identical keys to share the single in-flight execution promise.
- [x] 20/20 dedicated tests passing in `tests/fp-05-multi-worker.test.ts`.
- [x] Zero regressions across FP-04 (40/40), FP-03 (39/39), FP-01/02 (35/35), Company OS (17/17), clean TypeScript check (`tsc --noEmit`), clean lint, clean backend build, and clean UI build.
- [x] Physical LAN Verification Status: Accurately reported as `PHYSICAL_LAN_VERIFICATION = NOT_AVAILABLE` in single-machine development environment (zero fabrication).

---

## Universal Capability & Connector Fabric (FP-07) ✅ (Completed)
- [x] Universal Capability Contract: Unified domain types and interfaces (`UniversalCapability`, `CapabilityCategory`, `CapabilityProtocol`, `CapabilityLifecycleStatus`, `CapabilityTrustLevel`, `CapabilityRiskLevel`, `PrivacyClass`).
- [x] SQLite Schema & Dual-Layer Caching: Migration 021 with in-memory `Map` caching ensuring deterministic lookups under 1.2ms.
- [x] 6 Protocol Connectors: `CLI`, `REST`, `BROWSER`, `SOFTWARE`, `MCP`, and `LOCAL_TOOL` adhering to common `IConnector` interface.
- [x] Safe Subprocess Execution: CLI connector with strict binary allowlisting (`git`, `node`, `npm`, `ollama`) and shell metacharacter rejection.
- [x] Zero Plaintext Secrets: Handled exclusively by reference (`vault://...`, `env://...`); recursive secret redaction filter for logs and audit records.
- [x] OAuth 2.0 PKCE State Machine: Pure-JS SHA-256 PKCE challenge generation, state token validation, and TTL expiration.
- [x] Deterministic Sub-10ms Intent Matcher: Keyword and token scoring without LLM overhead or prompt latency.
- [x] Invariant Verification Engine: Post-condition verification across 7 strategies (`schema_match`, `read_after_write`, `process_state`, `checksum`, `dom_presence`, `exit_code`, `dry_run`).
- [x] Untrusted Output Defanging: Wraps untrusted external outputs into isolated non-instruction envelopes to prevent prompt injection.
- [x] Multi-Tenancy & Sovereign Local Privacy: Company/Project boundary enforcement; strict rejection of external HTTP/network egress for `SOVEREIGN_LOCAL` tasks.
- [x] REST & SSE Endpoints: 12 REST endpoints and real-time SSE stream at `/capabilities/events`.
- [x] Terminal CLI Integration: Subsystem commands `hres capabilities list`, `search`, `inspect`, `health`, `verify`, `revoke`, `invoke`.
- [x] Glassmorphic Control Center UI: 7-tab view (`CapabilityCenter.tsx`) with real-time SSE telemetry updates.
- [x] Comprehensive Verification Gate: 38/38 dedicated tests passing covering all 40 requirements, 99/99 regression tests passing, 0 TypeScript errors, clean UI build.

## GitHub & Open-Source Intelligence / Acquisition Fabric (FP-08) ✅ (Completed)
- [x] GitHubFabric: Master orchestrator wiring all GitHub subsystems and integrating with FP-07 CapabilityRegistry, PermissionManager, and EventBus.
- [x] Rate-Limited GitHub Client: Authenticated REST client with vault:// / env:// credential resolution, rate-limit tracking, and RateLimitExceededError with retryAfterMs.
- [x] License Analyzer: SPDX-aware classification (PERMISSIVE, WEAK_COPYLEFT, STRONG_COPYLEFT, PROPRIETARY, UNKNOWN), OSI/FSF flag mapping, compatibility matrix.
- [x] Dependency Analyzer: Multi-ecosystem manifest parsing (npm, Python, Rust/Cargo, Go/go.mod), VCS dependency detection, install-script flagging, and risk scoring.
- [x] Security Analyzer: Heuristic scanning for reverse shells, CI secret exfiltration, obfuscated payloads, typosquatting, Log4Shell/Spring4Shell/Shellshock patterns.
- [x] Repository Store (SQLite): Provenance-tracked persistence with 4 tables (repositories, repository_scans, acquisitions, build_artifacts), SHA-256 artifact integrity.
- [x] Sandbox Manager: Isolated directory workspaces, staged shallow acquisition (no blind dependency installation), command-injection prevention, process timeouts (SIGKILL), ResourceGovernor gating.
- [x] Untrusted Data First (ADR-FP08-001): All repository content in UntrustedDataEnvelope<T>; never interpolated into model prompts.
- [x] REST API & SSE Events: 6 REST endpoints (/api/github/*) and 7 typed EventBus events.
- [x] CLI Interface: hres github analyze, hres github search, hres github acquire.
- [x] Knowledge Graph Integration: Intelligence results written as typed edges (HAS_LICENSE, DEPENDS_ON, HAS_FINDING).
- [x] Real Public Repository Verification: Live tests against octocat/Hello-World, torvalds/linux, microsoft/vscode with zero mocking.
- [x] Comprehensive Verification Gate: 44/44 dedicated tests passing under NORMAL memory (38 PASS / 4 SKIP / 2 FAIL under CRITICAL_MEMORY due to deferred acquisition), 174/174 targeted regression passing (218/218 combined targeted under NORMAL memory), full repository test (npm test) 1296/1308 passing with 8 pre-existing legacy test failures and 4 memory skips, 0 TypeScript errors, clean backend build, clean UI build.

## Universal IDE & Development Workspace (FP-09) ✅ (Completed)
- [x] IdeFabric: Sovereign Master Development Workspace Orchestrator wiring all 8 IDE subsystems: WorkspaceManager, CodeSearchEngine, EditorEngine, TerminalManager, PreviewManager, GitWorkspaceManager, VerificationLoopEngine, and IdeRepository.
- [x] Workspace Manager: Multi-project discovery, path traversal defenses (`resolveSafePath`), framework detection (Node, Vite, React, Next.js, Express, TypeScript, Python, Rust, Go), and pruned recursive file navigation tree.
- [x] Code Search & Intelligence Engine: Multi-language regex & literal search, filename search, and structural code symbol extraction (classes, interfaces, methods, constants, functions).
- [x] Precision Editor Engine: Safe bounded file viewing (`viewFile`), contiguous single-block replacement with diff calculation (`replaceContent`), bottom-up transactional multi-chunk editing with atomic disk rollback on validation failure (`multiReplace`), and staged changeset history tracking.
- [x] Terminal Supervisor & Safety Governance: Governed process lifecycle execution (`executeSync`), circular output buffering bounded to 100KB with zero memory leaks, and hard rejection of destructive command patterns (`rm -rf /`, `format c:`, fork bombs).
- [x] Dev Preview Supervisor: Dynamic ephemeral port allocation (3000-3999), child process daemon management, and HTTP health check polling until ready.
- [x] Git Workspace Manager: Non-throwing git working-tree status inspection, staged/modified/untracked diff reporting, and git-less fallback capability.
- [x] Complete 10-Stage Autonomous Verification Loop: Self-correcting autonomous development cycle: `UNDERSTAND → PLAN → MODIFY → EXECUTE → OBSERVE → TEST → VERIFY → FIX → REVERIFY → REPORT`.
- [x] Universal Capability Fabric Integration: Registers sovereign `ide.workspace.open`, `ide.workspace.inspect`, `ide.terminal.execute`, `ide.code.search`, `ide.file.edit`, and `ide.verification.run` capabilities into FP-07 fabric.
- [x] Persistence Layer (Migration 023): SQLite tables `ide_workspaces`, `ide_changesets`, `ide_terminals`, `ide_preview_servers`, and `ide_verification_runs`.
- [x] REST API & CLI Interfaces: Complete HTTP REST endpoints under `/api/ide/*`, single-page routing for `/ide` and `/workspace`, and CLI commands via `hres ide status|search|run|git-status|verify|workspaces`.
- [x] Glassmorphic Control Center UI (`UniversalIDEView.tsx`): 5-tab integrated workspace view (Editor, Terminal, Search, Previews, Verification) registered in Control Center sidebar and router.
- [x] Comprehensive Verification Gate: 24/24 dedicated tests passing in `tests/fp-09-universal-ide.test.ts`, 82/82 regression tests passing across FP-07 and FP-08, 0 TypeScript errors (`tsc --noEmit`), clean backend build (`npm run build`), and clean UI bundle build (`npm --prefix ui run build`).

## Autonomous Software Engineering & Agentic Coding Engine (FP-10) ✅ (Completed)
- [x] AutonomousEngineeringFabric: Sovereign master orchestrator connecting Universal ModelRouter to closed repair loops across 10 autonomous lifecycle stages (`UNDERSTAND → PLAN → MODIFY → EXECUTE → OBSERVE → TEST → VERIFY → FIX → REVERIFY → REPORT`).
- [x] Governed Execution Invariant: Model proposes strictly structured intent (`EngineeringActionPayload`) rather than arbitrary shell execution. Governed system validates, sandboxes, and executes.
- [x] Action Validator & Sandboxing: Rigorous path traversal containment within workspace root, rejection of dangerous command patterns (`rm -rf`, `chmod -R 777`, `mkfs`, `curl | bash`), and danger tier categorization (Tier 0 to Tier 4) requiring operator approval for destructive operations.
- [x] User Conflict Protection: SHA-256 pre-read baseline hash recording on `READ_FILE` and pre-patch verification on `EDIT_FILE`, rejecting stale agent patches with `Concurrent modification detected: User work protected` when files are modified externally.
- [x] Diagnostic Normalizer & Failure Fingerprinting: Structured failure classification (`TEST_FAILURE`, `TYPE_ERROR`, `LINT_ERROR`, `BUILD_FAILURE`, `DEPENDENCY_ERROR`, `PERMISSION_ERROR`, `RUNTIME_ERROR`) with line/column/expected/received extraction and deterministic failure fingerprints.
- [x] Convergence Engine & Anti-Loop Safeguards: Multi-dimensional convergence monitoring classifying repair outcomes (`IMPROVED`, `REGRESSED`, `RESOLVED`, `FAILED`), halting repeated failure states (>= 3 consecutive identical failure cycles), and enforcing strict attempt and time budget ceilings.
- [x] Model-Driven Repair Engine: Precision surgical prompt synthesis with diagnostic error reports and target file slices, model routing to code specialists (`qwen2.5-coder:7b`, `deepseek-r1:1.5b`), and deterministic fallback repair heuristics.
- [x] 9 Autonomous Engineering Skills: Registered in capability fabric (`fix-build`, `fix-test`, `add-test`, `refactor-code`, `review-code`, `security-review`, `performance-analysis`, `dependency-upgrade`, `implement-feature`).
- [x] Persistence Layer (Migration 024): SQLite tables `engineering_tasks`, `engineering_plans`, `engineering_actions`, `engineering_diagnostics`, `engineering_repairs`, and `engineering_verifications`.
- [x] REST API & SSE Streaming: Endpoints under `/api/engineering/*` and real-time Server-Sent Events at `/api/engineering/events`.
- [x] CLI Interface: Native commands `hres engineering start|list|status|plan|pause|resume|cancel`.
- [x] Glassmorphic Control Center UI (`AutonomousEngineeringView.tsx`): Real-time task creation form, progress tracking, live SSE stream feed, and verification audit ledger inspector.
- [x] Real E2E & Negative E2E Empirical Verification: Deterministic bug repair in isolated project (`calc.js`) verified passing, and impossible test failure bounded and halted cleanly without infinite loops.
- [x] Comprehensive Verification Gate: 39/39 dedicated tests passing in `tests/fp-10-autonomous-engineering.test.ts`, 0 TypeScript errors (`tsc --noEmit`), clean backend build (`npm run build`), and clean UI bundle build (`npm --prefix ui run build`).
 
+## Native Universal Workflow & Automation Engine (FP-11) ✅ (Completed)
+- [x] NativeWorkflowEngine: Sovereign orchestrator supporting 8 step execution types (HTTP, Script, CLI, Agent Prompt, Approval, Transform, Condition, Parallel Fork/Join).
+- [x] DAG Topo-Sort & Dependency Resolution: Cycle detection via Kahn's algorithm; dependency branch tracking.
+- [x] Safety & Sandbox Execution: Bounded timeouts, isolated execution contexts, strict command verification.
+- [x] Persistence Layer (Migration 025): Workflow templates, execution states, step journals, human-in-the-loop approval requests.
+- [x] Glassmorphic Control Center UI (`WorkflowEngineView.tsx`): Real-time DAG visualization, execution logs, run-now triggers.
+- [x] Verification Gate: 45/45 dedicated tests passing in `tests/fp-11-workflow-engine.test.ts`, 0 TypeScript errors.
+
+## Universal Service & Account Integration Fabric (FP-12) ✅ (Completed)
+- [x] UniversalAccountFabric: Secure unified credential and session management across multi-cloud and local SaaS providers.
+- [x] Vault Security & Safe Resolution: AES-256-GCM encrypted secret storage, token rotation, and zero plain-text leaks.
+- [x] Multi-Service Support: GitHub, GitLab, Google, AWS, Slack, Linear, OpenAI, Anthropic, Custom OAuth2/Tokens.
+- [x] Persistence Layer (Migration 026): Account configurations, session caches, audit access journals.
+- [x] Glassmorphic Control Center UI (`AccountsView.tsx`): Account status badges, connection wizards, health checks.
+- [x] Verification Gate: 45/45 dedicated tests passing in `tests/fp-12-account-fabric.test.ts`, 0 TypeScript errors.
+
+## Universal Digital Workspace & Application Operator (FP-13) ✅ (Completed)
+- [x] DigitalWorkspaceOperator: Cross-platform workspace manager coordinating apps, windows, virtual desktops, and local dev environments.
+- [x] Semantic Window & Process Supervision: Real-time window inspection, workspace layouts, process telemetry, and graceful termination.
+- [x] Persistence Layer (Migration 027): Saved workspace layouts, running application profiles, window topologies.
+- [x] Glassmorphic Control Center UI (`DigitalWorkspaceView.tsx`): Visual workspace layout canvas, process management controls.
+- [x] Verification Gate: 45/45 dedicated tests passing in `tests/fp-13-digital-workspace-operator.test.ts`, 0 TypeScript errors.
+
+## Universal Agentic Mission & Workforce Runtime (FP-14) ✅ (Completed)
+- [x] UniversalMissionRuntime: Fully sovereign, autonomous goal-to-completion mission orchestrator managing the 17-agent workforce.
+- [x] Workforce Planner & Mission Compiler: Automated dependency graph generation, archetypal plan fallback, parallel agent dispatch.
+- [x] Dynamic Blackboard & Artifact Exchange: Inter-agent state passing, conflict resolution, consensus verification.
+- [x] Acceptance Engine & Multi-Tier Verification: Automatic deterministic verification against mission criteria.
+- [x] Persistence Layer (Migration 028): SQLite tables for mission state, step tracking, workforce assignments, and blackboard entries.
+- [x] Glassmorphic Control Center UI (`MissionControlView.tsx`): Interactive mission dashboard, live Gantt chart, agent assignment matrix.
+- [x] Comprehensive Verification Gate: 85/85 dedicated unit tests and 10/10 E2E scenarios passing in `tests/fp-14-agentic-mission-workforce-runtime.test.ts`.
+
## Post-FP-14 Repository Hygiene & Regression Baseline ✅ (Completed)
- [x] Dynamic Migration Invariant: Eliminated hardcoded migration counts; dynamically assertions verifying all available migrations run in ascending order.
- [x] Lifecycle & Socket Drainage: Zero process hangs; forceful Undici/HTTP socket cleanup and async resource teardown ensuring natural exit without `--forceExit`.
- [x] ModelRouter Hardening: Mock tool providers properly declare capabilities and priority to avoid fallback planning timeouts.
- [x] Full Repository Test Verification: 1658 total tests (1652 PASSED, 0 FAILED, 6 SKIPPED due to host CRITICAL_MEMORY pressure, 0 CANCELLED, Exit Code 0 in 269.9s).

## Universal Application & Service Ecosystem (FP-15) ✅ (Completed)
- [x] UniversalEcosystemFabric: Unified interface resolution layer across Authenticated APIs, CLI tools, Native Desktop apps, and Browser services.
- [x] Interface Priority Ladder: Deterministic resolution ladder prioritizing authenticated APIs > CLI > Desktop > Browser.
- [x] Consequential Action Verification Engine: Post-execution verification for mutating operations (issues, events, messages).
- [x] Persistence Layer (Migration 029): SQLite tables for discovered services, applications, operational envelopes, and interface registries.
- [x] Control Center UI (`EcosystemView.tsx`): Ecosystem dashboard, service health, interface priorities, rate limits.
- [x] Verification Gate: 103/103 dedicated tests and 10/10 real E2E scenarios passing in `tests/fp-15-ecosystem.test.ts`.

## Demonstration Learning & Workflow Acquisition (FP-16) ✅ (Completed & Frozen)
- [x] DemonstrationFabric: Observes user demonstrations, infers semantic intent and action state transitions, compiles reusable skills/workflows.
- [x] 17-Check Deterministic Verification Gate: Strict security checks rejecting secrets, prompt injection, and unauthorized elevation.
- [x] Persistence Layer (Migration 030): Demonstration sessions, semantic actions, checkpoints, proposals, and learned procedures.
- [x] Natural Language & Intent Detection: "watch me", "learn this workflow", "save as skill" intent mapping.
- [x] Verification Gate: 122/122 dedicated tests passing in `tests/fp-16-demonstration-learning.test.ts`.

## Universal Digital Creation & Media Studio (FP-17) ✅ (Completed)
- [x] CreationFabric & Domain Model: Unified creation orchestrator for images, video, audio, music, voice, 3D, documents, presentations, and compound packages.
- [x] MediaCapabilityService: Provider-agnostic capability fabric discovering local tools (Blender, FFmpeg, ImageMagick) with honest `NOT_CONFIGURED` status and native local synthesizers.
- [x] Deterministic CreationVerifierService: Multi-stage QA checks verifying existence, non-zero bytes, syntax, dimensions, and SHA-256 hashes.
- [x] Bounded Iteration & Convergence: Bounded iteration budgets preventing runaway regeneration loops.
- [x] Sovereign Approval Boundaries: Mandatory approval gate for commercial publishing, paid generation, and voice cloning.
- [x] Persistence Layer (Migration 031): `creation_jobs`, `creation_artifacts`, `creation_iterations`, `design_contexts`, `creation_reference_assets`.
- [x] Control Center UI (`CreationStudioView.tsx`): Live creation dashboard, active progress bars, artifact inspector, creation wizard, and SSE stream.
- [x] CLI Subsystem: `hres create <type> ...` and `hres creation list|status|verify|cancel`.
- [x] Verification Gate: 126/126 dedicated tests passing in `tests/fp-17-creation-media.test.ts`, 0 TypeScript errors.

## Universal Real-World Research, Knowledge & Decision Intelligence Fabric (FP-18) ✅ (Completed)
- [x] DecisionFabric & Domain Model: Core orchestrator bridging external research, evidence, local context, and governed decision making.
- [x] Persistent ResearchCase Lifecycle: 12 lifecycle stages (`DRAFT` → `SCOPING` → `RESEARCHING` → `GATHERING_EVIDENCE` → `ANALYZING` → `COMPARING` → `SYNTHESIZING` → `REVIEWING` → `AWAITING_USER` → `COMPLETED` / `FAILED` / `ARCHIVED`).
- [x] Question Decomposition & Bounded Research Plans: Structured subquestion extraction with domain-specific priority budgets (`maxSources`, `maxSearches`, `maxPages`, `maxTokens`, `maxDurationMs`).
- [x] Credibility-Ranked Source Strategy: 4-tier hierarchy (`PRIMARY`, `SECONDARY`, `COMMUNITY`, `UNVERIFIED`) with transparent source attribution.
- [x] Traceable Evidence Ledger & Normalized Claims: Every factual claim linked to source, confidence, retrieval timestamp, and polarity (`SUPPORTING`, `CONTRADICTING`, `PARTIAL`, `UNKNOWN`).
- [x] Multi-Source Contradiction Resolution: Detects factual disputes and categorizes root causes (`QUANTIZATION_DIFFERENCE`, `VERSION_MISMATCH`, `OS_MISMATCH`, `WORKLOAD_DIFFERENCE`, `OUTDATED_DATA`).
- [x] Temporal Intelligence & Outdated Data Detection: Identifies findings >2 years old as `OUTDATED` without silently substituting stale information.
- [x] Environment-Aware Research: Evaluates candidates against actual host hardware (Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc GPU, Windows 11) into 5 compatibility classes.
- [x] Qualitative Candidate Comparison Matrix: Rigorous qualitative tradeoff evaluations without fake numerical scores or collapsed uncertainty.
- [x] Standard 16-Section Decision Brief: Generates auditable decision briefs and Markdown reports with clear distinction between Evidence, Analysis, and Recommendations.
- [x] Immutable Decision History & Decision Reviews: Append-only decision records with structured reviews recommending `MAINTAIN` vs `UPDATE` based on new evidence.
- [x] Governed Action Bridge: Compiles decisions into proposed Missions, Goals, Workflows, Skills, and Environment Changes with mandatory human approval gates (`AWAITING_USER` / `PENDING_APPROVAL`).
- [x] Persistence Layer (Migration 032): SQLite tables `research_cases`, `research_candidates`, `research_comparisons`, `decision_records`, `decision_reviews`, and `decision_proposed_actions`.
- [x] Control Center UI (`ResearchView.tsx`): Integrated view with Research and Decisions tabs, real-time metrics, decision records, and proposed action inspection.
- [x] CLI Subsystem: Native commands `hres research <start|status|evidence|compare|report|cancel>` and `hres decision <list|show|review>`.
- [x] REST API & SSE Events: Dedicated `/api/research/*` and `/api/decisions/*` routes and real-time Server-Sent Events at `/api/research/events`.
- [x] Verification Gate: 125/125 dedicated tests passing in `tests/fp-18-decision-intelligence.test.ts`, 0 TypeScript errors.

## Persistent Distributed Execution & 24/7 Operations Fabric (FP-19) ✅ (Completed & Frozen)
- [x] ExecutionFabric & Substrate Model: Core runtime substrate operating directly underneath Missions (FP-14), Workflows (FP-11), Goals (FP-15), Skills (FP-20), and Company OS (FP-18).
- [x] Multi-Tier Locality Model: Unified support for `LOCAL`, `LAN`, `REMOTE`, `CLOUD`, and `HOSTED` compute runtimes.
- [x] WorkerRegistryService: Dynamic worker registration, heartbeat tracking (10s intervals), status lifecycle, and capability matching.
- [x] LeaseFencingService: Distributed mutual exclusion locks with 64-bit monotonic fencing tokens preventing split-brain and zombie execution loops.
- [x] CheckpointEngineService: Incremental step-level snapshots, verification evidence, and `JobMigrationPackage` serialization for cross-worker migration.
- [x] ExecutionSchedulerService: 5 priority queues (`CRITICAL`, `HIGH`, `NORMAL`, `LOW`, `BACKGROUND`), concurrency controls, hardware/GPU constraint matching, and anti-starvation aging.
- [x] RecoveryManagerService: Stale worker detection, abandoned lease reaping, exponential backoff retries with jitter, and dead-letter routing (`DEAD_LETTER`).
- [x] CloudRuntimeBridgeService: Abstraction for AWS, GCP, Azure, Hetzner, Lambda Labs, RunPod with strict human approval gates (`DENY_PAID_WITHOUT_APPROVAL`) and cost caps.
- [x] Persistence Layer (Migration 033): 9 relational tables: `execution_runtimes`, `execution_workers`, `execution_jobs`, `execution_leases`, `execution_checkpoints`, `execution_queues`, `cloud_providers`, `cloud_instances`, `execution_traces`.
- [x] CLI Subsystem: Native commands `hres runtime <list|status>` and `hres execution <list|status|pause|resume|cancel|migrate|trace|summary>`.
- [x] Verification Gate: 193/193 dedicated tests passing in `tests/fp-19-persistent-execution.test.ts`, 0 TypeScript errors.

