# HṚṢĪKEŚA (हृषीकेश) — Architecture Decision Records (ADR)

This document formalizes all architectural, technical, and design decisions governing the HṚṢĪKEŚA project.

---

## ADR-001: Project Identity, Naming & Branding

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Earlier exploratory references used the temporary name "JARVIS". The project requires an enduring, culturally profound, and sovereign identity representing mastery of senses, mind, and tools.

### Decision
1. The project is officially named **HṚṢĪKEŚA** (हृषीकेश).
2. The ASCII/international filesystem safe spelling is **HRISEKESA** where Unicode filename compatibility or CLI tooling mandates.
3. The reference "JARVIS" is permanently retired across all code, documentation, prompts, and interfaces.

### Consequences
- Unambiguous identity reflecting sovereign ownership by Rushikesh Pattiwar.
- Clean separation from pop-culture tropes, establishing a serious engineering ethos.

---

## ADR-002: Custom Control Plane vs. Monolithic Agent Frameworks

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Third-party monolithic agent frameworks (such as AutoGen, CrewAI, or heavy LangChain monoliths) enforce rigid abstractions, rapid breaking changes, high memory overhead, and opaque execution loops that hinder deep OS-level integration and custom memory architectures.

### Decision
Build HṚṢĪKEŚA as a clean, custom micro-kernel orchestration control plane using modular, swappable components and open standards (such as Anthropic's Model Context Protocol).

### Consequences
- **Positive:** Total control over memory layout, resource scheduling, security gates, and VDI integration. Zero lock-in.
- **Negative:** Requires initial investment in core loop engineering and event bus scaffolding.

---

## ADR-003: Core Dual-Engine Technology Stack (TypeScript & Python)

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
The target machine possesses 15.7 GB RAM and an Intel Core Ultra 5 125H processor. We require:
1. An ultra-responsive, event-driven, low-memory orchestration and UI gateway.
2. Robust desktop automation, computer vision, and application scripting (Blender, UI Automation).

### Decision
Adopt a **Dual-Engine Architecture**:
- **Orchestration Core & Gateway:** Node.js 24 + TypeScript. Handles the event loop, state machine, MCP client/server connections, and web/desktop UI. Idle memory footprint: <80 MB.
- **Desktop & Native Worker:** Python 3.14. Invoked for UI automation, OpenCV vision checks, Windows Accessibility tree navigation, and headless application scripting.

### Consequences
- Combines the strengths of TypeScript's async I/O and strict typing with Python's unmatched desktop automation ecosystem.
- Avoids memory-heavy multi-process bloat by keeping workers on-demand.

---

## ADR-004: Embedded Zero-Cost Storage Engine (SQLite + Vector)

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
A personal operating system must be lightweight, fast, portable, and zero-cost. Traditional setups requiring Docker daemons, PostgreSQL, or Redis consume 1.5–3 GB of background RAM—unacceptable on a 16 GB laptop.

### Decision
Use **SQLite with Write-Ahead Logging (WAL)** as the primary relational and state engine, augmented with embedded vector search (`sqlite-vec` or LanceDB).

### Consequences
- **Positive:** Instant startup (<5ms), zero network overhead, sub-10 MB RAM footprint, complete ACID compliance, and trivial portability (copying a single file).
- **Negative:** Concurrency is optimized for single-machine workloads (which matches HṚṢĪKEŚA's personal OS design).

---

## ADR-005: Model Integration & MCP Protocol Standardization

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Hardcoding tool interfaces to proprietary LLM formats causes fragility whenever models are swapped.

### Decision
1. Standardize all tool and external capability integrations on the **Model Context Protocol (MCP)**.
2. Abstract LLM calls behind a unified `IModelProvider` interface supporting local Ollama (0.34.2) and authorized cloud providers (Anthropic, OpenAI, Google).

### Consequences
- Any MCP server in the open-source ecosystem can be integrated into HṚṢĪKEŚA seamlessly.
- Zero code changes required in agent logic when switching between local and cloud models.

---

## ADR-006: Hardware Resource Boundaries & Concurrency Budgets

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
The host machine has 14 cores (18 threads) and 15.7 GB RAM, with an Intel Arc iGPU (~2 GB allocated). Over-allocating local models or concurrent heavy tasks risks freezing the host OS.

### Decision
Implement hard scheduler constraints:
- Maximum active local LLM inference jobs: **1** (exclusive lock).
- Maximum background I/O tasks: **4–8**.
- Local models restricted to 3B–7B quantized formats (Q4_K_M) leaving >=10 GB free for Windows OS and user applications.
- Background tasks immediately yield resources when Rushikesh initiates interactive sessions.

### Consequences
- Host operating system remains fluid and responsive at all times.
- Eliminates out-of-memory crashes.

---

## ADR-007: Non-Invasive Computer Use & VDI Operation

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Rushikesh frequently uses authorized enterprise VDI sessions. The system must assist him in these environments without violating enterprise security policies.

### Decision
1. The VDI Operator runs strictly on the local host machine.
2. It perceives the VDI via window screen capture and acts via standard simulated input.
3. Zero software, scripts, or agents are installed into the remote VDI environment.
4. The system strictly forbids attempts to bypass enterprise security, DLP, monitoring, MFA, or CAPTCHA.

### Consequences
- Ensures complete compliance with enterprise IT policies while delivering autonomous computer-use assistance.

---

## ADR-008: Zero-External-Dependency Native HTTP Gateway

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 2 requires exposing an HTTP API gateway bound to localhost (`127.0.0.1`). Introducing heavy server frameworks (Express, Fastify, NestJS) introduces transitive dependencies, vulnerability scan overhead, and startup latency for a lightweight personal OS control plane.

### Decision
Construct the Phase 2 HTTP server utilizing pure Node.js standard library (`node:http` and `node:crypto`).

### Consequences
- **Positive:** Zero external production runtime dependencies in `package.json`. Startup takes less than 5ms. Memory usage is under 25 MB. Completely immune to npm supply-chain package vulnerabilities.
- **Negative:** Routing logic is handled manually, but given the focused API surface (`/health`, `/status`, `/identity`, `/models`, `/models/respond`), this remains clean, minimal, and fully maintainable.

---

## ADR-009: Dormant Cloud Provider Adapters without Credential Requirement

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 2 mandates supporting cloud providers (OpenAI, Anthropic, Gemini) without requiring real credentials or making unauthenticated external calls during development.

### Decision
Implement cloud provider classes implementing `IModelProvider` that inspect environment variables. If credentials are absent, they report `health.status = 'unconfigured'`, list 0 active models, and reject execution with clean diagnostic errors.

### Consequences
- Providers are plug-and-play: adding `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` instantly activates them on reboot without requiring orchestrator code changes.
- Eliminates risk of secret leaks or network errors during testing.

---

## ADR-010: In-Memory Bounded Conversational Session & Context Management

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 3A activates real local conversational inference via `qwen2.5:7b` on Ollama 0.34.2. The host machine possesses 15.7 GB total RAM and executes local inference on the CPU (Intel Core Ultra 5 125H). The model operates with a tested 4096 token context window. Requesting unconstrained 128K context or allowing unbounded session history in memory would exhaust host RAM, expand the KV cache exponentially, and severely degrade CPU token generation throughput.

### Decision
1. Implement a conversational session abstraction (`SessionManager`) that operates in-memory for Phase 3A without writing to disk yet (disk persistence is deferred to Phase 3B).
2. Enforce a conservative context policy (`DEFAULT_CONTEXT_POLICY`):
   - Maximum history messages: 12.
   - Maximum character budget: 8,000 characters.
   - System prompt anchoring: Index 0 is permanently reserved for the immutable HṚṢĪKEŚA identity prompt.
   - Sliding window: Older dialogue turns between the system prompt and the latest turns are cleanly trimmed.
3. Strict identity distinction: Inject an explicit system prompt clarifying that HṚṢĪKEŚA is the sovereign OS control plane, while Qwen 2.5 (7B) is the local cognition engine. The model is commanded to never claim that Qwen itself is HṚṢĪKEŚA.
4. Bound native Ollama requests to `num_ctx: 4096`.

### Consequences
- **Positive:** Multi-turn context retention works seamlessly with predictable CPU latency (3.4s - 9.2s observed on 7B). Host RAM stays safely within the 5.1 GB footprint for Ollama and ~71 MB for the Node.js runtime.
- **Negative:** Sessions are volatile across runtime restarts until persistent SQLite memory is integrated in Phase 3B. Long multi-day conversations will slide out of context until long-term memory tiers are active.

---

## ADR-011: Native Node.js 24 SQLite Persistent Storage & 14-Tier Memory Foundation

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 3B requires durable, restart-safe persistence for conversations, messages, creator profiles, and structured memory. The host workstation has 15.7 GB RAM and an Intel Core Ultra 5 125H running Windows 11. Introducing external database daemons (PostgreSQL, Docker, Redis) or heavy native npm modules (e.g. `better-sqlite3`, `sqlite3` requiring node-gyp compilation) creates maintenance overhead, supply-chain vulnerabilities, and startup latency.

### Decision
1. Utilize Node.js 24's built-in `node:sqlite` module (`DatabaseSync`) as the sovereign persistence engine stored locally at `data/hrisekesa.db`.
2. Configure high-concurrency PRAGMAs:
   - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging for non-blocking concurrent reads)
   - `PRAGMA foreign_keys = ON;` (Strict relational referential integrity)
   - `PRAGMA synchronous = NORMAL;` (Optimal durability vs throughput balance)
   - `PRAGMA busy_timeout = 5000;` (Resilient lock wait window)
3. Implement a clean Repository Pattern (`src/persistence/repositories/`):
   - `SessionRepository`: Durable conversation threads.
   - `MessageRepository`: Chronologically ordered conversation turns with strict ordinals.
   - `MemoryRepository`: Universal structured store supporting all 14 memory tiers with explicit source and provenance attributes.
4. Establish an automated versioned migration manager (`MigrationManager`) with an atomic `schema_migrations` ledger.
5. Back `SessionManager` with SQLite repositories so conversation threads and messages survive kernel restarts indefinitely, while maintaining an in-memory cache for sub-millisecond hot-turn reads.
6. Prepare an ingestion subsystem in `src/memory/import/` for authorized ChatGPT `conversations.json` data dumps with strict provenance tagging (`source: 'chatgpt_export'`, `provenance: 'imported'`).

### Consequences
- **Positive:** Zero external production dependencies added to `package.json`. Database file is lightweight (~52 KB initial). Sub-millisecond read/write latency. 100% restart persistence verified live with local model Qwen 2.5 (7B).
- **Negative:** Embedded SQLite is single-host local storage (by design for sovereign personal OS control). Complex full-text and vector search are deferred to future specialized extensions.



---

## ADR-012: Tool Execution Bus, Danger Tier Permissions, and MCP Foundation

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 4 gives HṚṢĪKEŚA its first standardized, safe "hands" — moving from passive dialogue to active system introspection and safe local tool invocation. To prevent catastrophic model hallucinations, security bypasses, or uncontrolled external mutations, tools must not be executed directly by the LLM or ad-hoc wrappers. The execution pipeline requires vendor-neutral abstraction, strict sandboxing, multi-tier danger classification, human approval gates for sensitive actions, and an immutable audit trail. Furthermore, the architecture must support the Model Context Protocol (MCP) to seamlessly integrate external tools under HṚṢĪKEŚA's sovereign security envelope.

### Decision
1. **Vendor-Neutral Tool Contract (`ITool`):**
   - Each tool defines: `id`, `name`, `description`, `version`, `category`, `inputSchema` (JSON-Schema compliant), `outputSchema`, `riskLevel` (Danger Tier), `requiresApproval`, `capabilities`, and an `execute(input, context)` method.
   - Independent of any specific LLM provider (Ollama, OpenAI, Anthropic, Gemini, MCP).
2. **5-Tier Danger Classification (per `docs/SECURITY.md`):**
   - `TIER_0` (Read-only / Harmless): e.g., `system.info`, `time.now`, `filesystem.list`, `filesystem.read`, `ollama.models`. Auto-allowed for authorized users within workspace boundary.
   - `TIER_1` (Local Reversible Action): e.g., `filesystem.write`, `terminal.execute` (whitelisted commands), `ollama.chat`. Auto-allowed for Creator; approval policy configurable.
   - `TIER_2` (External Side Effect): Outbound network mutations, package installations. Approval required.
   - `TIER_3` (Sensitive / Dangerous Action): Deletion, process termination. Human approval mandatory.
   - `TIER_4` (Critical / Destructive Action): Security modification, kernel reconfig, system credentials. Human approval mandatory.
3. **Permission Manager & Human Approval Gate:**
   - Evaluates: tool, action, danger tier, environment, user authority, and path boundary.
   - The LLM can never override permission decisions; if `REQUIRE_APPROVAL` or `DENY` is issued, the execution stops before calling the tool.
   - Human approvals generate structured `ApprovalRequest` with unique ID, risk level, expiration (default 15 minutes), and status (`pending`, `approved`, `rejected`, `expired`).
4. **Tool Execution Bus (`ToolExecutionBus`):**
   - Strict 7-step pipeline:
     `Request` → `Validate Tool` → `Validate Schema` → `Permission Check` → `Approval Gate` → `Execute` → `Validate Result` → `Audit` → `Return`.
   - Never executes code prior to permission evaluation.
5. **Redacted Audit Trail (`ToolAuditLogger`):**
   - All executions record: `timestamp`, `requestId`, `tool`, `input` (with sensitive keys like tokens/passwords regex-redacted), `riskLevel`, `decision`, `approvalId`, `status`, `durationMs`, and `error`.
   - Persisted into SQLite `memory_items` table under tier `system_audit` with immutable provenance.
6. **Workspace Sandboxing:**
   - Filesystem tools (`filesystem.list`, `filesystem.read`, `filesystem.write`) strictly validate normalized paths against `workspaceRoot`. Relative paths with `..` or absolute external paths outside the root immediately fail with a security violation.
7. **Model Context Protocol (MCP) Foundation:**
   - Native client adapter (`McpClientAdapter`) with JSON-RPC 2.0 transport abstraction (`InMemoryMcpTransport`, `StdioMcpTransport`).
   - Discovers MCP tools, normalizes schemas into `ITool`, maps danger tiers, and pipes invocations through HṚṢĪKEŚA's `ToolExecutionBus`. MCP tools cannot bypass HṚṢĪKEŚA security.
8. **Bounded Conversational Tool Loop:**
   - `ConversationService` allows model-proposed tools to execute via `ToolExecutionBus` and feeds the result back as `role: 'tool'`.
   - Bounded to `maxToolIterations = 2` to prevent infinite recursive tool hallucination loops.

### Consequences
- **Positive:** Standardized, provider-agnostic tool execution; zero unrestricted shell access; rigorous human-in-the-loop protection for dangerous tiers; full traceability with zero runtime npm dependencies.
- **Negative:** Phase 4 restricts `terminal.execute` to whitelisted diagnostic commands (`dir`, `echo`, `git status`, `node -v`); arbitrary terminal commands and GUI automation remain intentionally blocked until later phases.

---

## ADR-013: Agent Runtime, Persistent Tasks, and Constrained Mission Delegation

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 5 introduces a multi-agent workforce to HṚṢĪKEŚA, enabling high-level mission decomposition, specialized task assignment, and coordinated tool execution while strictly preserving HṚṢĪKEŚA's sovereign control plane. Autonomous multi-agent frameworks often introduce runaway recursion, opaque sub-agent proliferation, direct model-to-tool bypasses, and unmanaged memory growth. On an Intel Core Ultra 5 125H laptop (15.7 GB RAM), running concurrent local LLMs is unviable and risks system lockup.

### Decision
1. **Sovereign Hierarchy:**
   - Architecture: `Rushikesh (Root Authority)` → `HṚṢĪKEŚA (Sovereign OS)` → `Mission` → `Task` → `Agent` → `ModelRouter` → `ToolExecutionBus` → `Tool/MCP` → `Environment`.
   - Agents are logical workers with dedicated system personas and tool whitelists; they are NOT independent AI daemons and cannot bypass HṚṢĪKEŚA governance.
2. **Initial Specialized Agent Roster:**
   - `arjuna`: Software engineering & implementation (`TIER_1` limit).
   - `chanakya`: Planning, strategy, mission decomposition (`TIER_1` limit).
   - `arya`: Research, documentation, knowledge synthesis (`TIER_1` limit).
   - `aditi`: Testing, QA, verification (`TIER_1` limit).
   - `agastya`: Systems, infrastructure, configuration diagnostics (`TIER_1` limit).
3. **Task & Mission Persistence in SQLite:**
   - Persist all tasks (`agent_tasks`), missions (`agent_missions`), and shared blackboard findings (`blackboard_entries`) in the existing `data/hrisekesa.db` via migration 002.
   - Tasks and missions survive kernel restarts with full auditability.
4. **Constrained Delegation Guardrails:**
   - Enforce bounded delegation via `AgentDelegationManager`:
     - `maxDelegationDepth = 2`
     - `maxChildrenPerTask = 5`
     - `maxActiveAgentTasks = 3`
   - Unrestricted recursive agent spawning is strictly prevented.
5. **Shared Blackboard:**
   - Lightweight, structured shared memory in SQLite allowing agents to publish and query findings (`publish`, `get`, `listByMission`, `listByTask`, `listByAgent`) without distributed event queue overhead.
6. **Model Concurrency Invariant:**
   - All agent cognition calls flow through `ModelRouter`, honoring the single local model inference lock (`ADR-006`). Agents execute serially on `qwen2.5:7b` with zero risk of host memory exhaustion.
7. **Subordinate Permission Enforcement:**
   - Agent tool allowances are strictly subordinate to the global `PermissionManager`. Even if an agent's definition whitelists a tool, the invocation must still pass the 7-step `ToolExecutionBus` security pipeline and human approval gates.

### Consequences
- **Positive:** Reliable, observable task execution with specialized roles; zero autonomous escape; tasks survive restarts; runs comfortably within machine resource budgets.
- **Negative:** Serial execution of agent cognition turns means complex multi-agent missions take tens of seconds to complete on CPU, which is an intentional design tradeoff for stability and safety.

---

## ADR-014: Browser Automation via Playwright Core and URL Sandbox Governance

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 6 requires giving HṚṢĪKEŚA browser interaction capabilities (navigating, reading text, clicking, typing, taking screenshots) through mature open-source software without reinventing browser engines or introducing heavy Docker/VM overhead. The host machine (15.7 GB RAM, Windows 11) already contains Google Chrome and Microsoft Edge natively. Blindly downloading full multi-gigabyte browser bundles or multi-container stacks would consume excessive RAM and disk storage. Furthermore, web browsing creates security vectors (arbitrary `file://` reading, `javascript:` injection, anti-bot/CAPTCHA evasion, and cookie/credential theft) that must be rigorously contained.

### Decision
1. **Selection of Primary Backend:**
   - Adopt **`playwright-core`** (v1.63.0, Apache-2.0).
   - Leverage the host's existing Google Chrome or Microsoft Edge installations via Playwright's native `channel: 'chrome'` / `channel: 'msedge'` discovery.
   - Zero large browser bundle downloads (~500 MB disk saved); tiny npm package footprint (<10 MB).
2. **Vendor-Neutral Browser Abstraction (`IBrowserAdapter`):**
   - Isolate browser engine details behind `src/tools/browser/interfaces/browser.types.js`.
   - Manage ephemeral, incognito `BrowserContext` instances per session (`BrowserSession`) with automatic timeout and resource cleanup.
3. **URL Protocol Whitelisting & Sandboxing:**
   - Strictly whitelist `http:` and `https:`.
   - Explicitly block `file:`, `javascript:`, `data:`, `vbscript:`, `blob:`, `chrome:`, `edge:`, `about:` (except initial blank), `ws:`, `wss:`.
   - Prevent the browser from being utilized as an unrestricted local filesystem reader.
4. **Tool Execution Bus & Permission Integration:**
   - Expose 8 standard browser tools through `ToolRegistry`:
     - `browser.session.create` (Tier 0)
     - `browser.navigate` (Tier 1)
     - `browser.page.read` (Tier 0)
     - `browser.click` (Tier 1)
     - `browser.type` (Tier 1)
     - `browser.keypress` (Tier 1)
     - `browser.screenshot` (Tier 0)
     - `browser.session.close` (Tier 0)
   - All tool invocations must route through the 7-stage `ToolExecutionBus` and pass `PermissionManager` evaluations.
5. **Observation Distillation & Human Verification Gates:**
   - Extract distilled text (cloned DOM without script/style tags, max 8000 chars) to prevent context-window overflow.
   - Detect CAPTCHA, Cloudflare challenges, or bot detection walls; flag `humanInterventionRequired: true` and halt autonomous execution for human verification.
6. **Credential Masking in Audit Trail:**
   - Form inputs containing passwords or sensitive patterns are automatically masked in the SQLite audit ledger via `ToolAuditManager`.

### Consequences
- **Positive:** Fast, native Windows browser automation; zero container overhead; full sandboxing and auditability; complete credential protection.
- **Negative:** Headless browser processes add ~200–300 MB RAM during active browsing sessions; session cleanup is enforced on kernel shutdown to avoid orphaned processes.

---

## ADR-015: Windows Native Desktop GUI Automation & Application Allowlist Sandbox

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 7 requires giving HṚṢĪKEŚA the ability to interact with the Windows desktop, non-browser applications (such as Notepad, Calculator, Paint, Android Studio, Blender), mouse, keyboard, and screen capture. The runtime runs on Windows 11 with Node.js 24 and 15.7 GB RAM. Outdated native C++ packages like `robotjs` or `@nut-tree/nut-js` fail to compile on Node 24 due to V8 ABI changes and node-gyp requirements. External heavy Python automation daemons introduce unnecessary background RAM bloat. Furthermore, unrestricted desktop automation poses serious security hazards if arbitrary binaries, malicious shell scripts, or runaway keystrokes are executed.

### Decision
1. **Windows Native Desktop Subsystem (`WindowsComputerAdapter`):**
   - Implement `IComputerAdapter` utilizing native Windows Win32 APIs, `System.Drawing`, `WScript.Shell`, and .NET Windows Forms bounds via lightweight, ephemeral invocations.
   - Zero external npm C++ binary build dependencies; zero Python service overhead.
   - Screen capture generates PNG artifacts in `data/screenshots/` without polluting LLM token context.
2. **Constrained Application Launch Allowlist (`ApplicationAllowlist`):**
   - Strictly limit application execution to an explicit allowlist: `notepad` (`notepad.exe`), `calculator`/`calc` (`calc.exe`), `paint` (`mspaint.exe`), `browser` (`msedge.exe`), `android-studio` (`studio64.exe`), and `blender` (`blender.exe`).
   - Rejects all arbitrary executable paths, command shells (`cmd.exe`, `powershell.exe`), and script binaries.
3. **Desktop Input & Coordinate Bounds Validation (`ComputerSecurityValidator`):**
   - Mouse coordinates (x, y) are strictly validated against display resolution bounds (`width` x `height`).
   - Keyboard typing text is capped at 500 characters per invocation to prevent runaway loops.
   - Special keys are mapped to standard virtual key sequences (`ENTER`, `TAB`, `ESC`, `BACKSPACE`, `DELETE`, `SPACE`, arrow keys).
4. **Standard Desktop Tools Registered in `ToolRegistry`:**
   - `computer.screen.size` (Tier 0)
   - `computer.screenshot` (Tier 0)
   - `computer.window.active` (Tier 0)
   - `computer.mouse.move` (Tier 1)
   - `computer.mouse.click` (Tier 1)
   - `computer.mouse.double_click` (Tier 1)
   - `computer.keyboard.type` (Tier 1)
   - `computer.keyboard.keypress` (Tier 1)
   - `computer.app.launch` (Tier 1)
5. **Security, Audit Redaction & Lifecycle Governance:**
   - All computer actions pass through the sovereign `ToolExecutionBus` and `PermissionManager`.
   - Passwords and auth tokens typed into desktop applications are automatically masked in the SQLite audit ledger.
   - All spawned processes are tracked by PID and cleanly terminated on kernel shutdown or test teardown.

### Consequences
- **Positive:** Zero external native build dependencies; 100% reliable on Node 24 + Windows 11; negligible memory footprint (<15 MB); robust allowlist and audit controls.
- **Negative:** Advanced deep UI accessibility tree inspection (UIA control patterns) is deferred to future specialized MCP workers.

---

## ADR-016: Dual-Engine Local Speech Subsystem (Faster-Whisper / Windows STT & Piper / SAPI TTS)

### Context
Phase 8 requires giving HṚṢĪKEŚA a real local voice loop: Microphone → Local Speech-to-Text → Sovereign Conversation Service → Local Text-to-Speech → Speaker. The system operates on a 16 GB RAM Windows laptop with an active `qwen2.5:7b` model (~5.1 GB RAM footprint). We must avoid high-resource speech models, avoid external cloud dependencies, avoid fragile C++ node-gyp builds on Node 24, and guarantee 100% offline functionality.

### Decision
1. **Vendor-Neutral Voice Architecture (`src/voice/`):**
   - Abstractions: `ISpeechToTextProvider`, `ITextToSpeechProvider`, `IAudioRecorder`, `IAudioPlayer`, `VoicePipeline`, `VoiceSession`.
2. **Dual-Engine Speech-to-Text (STT):**
   - Primary: `FasterWhisperSTTProvider` utilizing `tiny.en` / `base.en` CTranslate2 model via lightweight `uv` execution (< 150 MB RAM footprint).
   - Zero-Install Fallback: `WindowsSpeechSTTProvider` utilizing native Windows `System.Speech.Recognition.SpeechRecognitionEngine` for instant out-of-the-box offline transcription.
3. **Dual-Engine Text-to-Speech (TTS):**
   - Primary: `PiperTTSProvider` using ONNX neural voice models.
   - Zero-Latency Fallback: `WindowsSapiTTSProvider` utilizing native Windows `System.Speech.Synthesis.SpeechSynthesizer` (< 20ms synthesis latency).
4. **Lightweight Windows Audio Capture & Playback:**
   - Audio Capture: `WindowsAudioRecorder` utilizing Windows native `winmm.dll` MCI waveaudio recording (`mciSendString`) with configurable sample rate (16 kHz mono).
   - Audio Playback: `WindowsAudioPlayer` utilizing Windows `System.Media.SoundPlayer`.
5. **Unified Control Plane Integration:**
   - Transcribed voice inputs route through the sovereign `ConversationService.sendMessage()` pipeline.
   - Automatically inherits multi-turn session persistence, 14-tier structured memory, model routing (`qwen2.5:7b`), multi-agent workforce delegation, computer/browser tools, permission boundaries, and audit logging.

### Consequences
- **Positive:** 100% local and offline; zero cloud API dependencies; negligible RAM overhead (< 150 MB total); dual-engine resilience guarantees immediate functionality on any Windows installation; full preservation of all security, permission, and audit controls.
- **Negative:** Full continuous wake-word detection is deferred to a future phase to conserve background CPU cycles.

---

## ADR-017: Semantic Windows UI Automation Subsystem (Native .NET UIAutomationClient)

### Context
Phase 9 upgrades HṚṢĪKEŚA's Windows desktop control from coordinate/pixel-only automation to semantic UI understanding: Window → UI Automation Tree → Semantic Element Discovery → Safe Element Action → Observe Result → State Verification. The system must operate cleanly on Windows 10/11, Node.js 24, ~16 GB RAM with zero external cloud dependencies, zero fragile C++ node-gyp builds, and no background daemon overhead.

### Decision
1. **Windows Native Accessibility Engine (`UIAutomationClient` / `UIAutomationTypes`):**
   - Utilize Microsoft Windows native UI Automation .NET assemblies via lightweight, ephemeral PowerShell executions with element caching.
   - Zero external npm C++ build dependencies; zero Python service overhead; instant startup.
2. **Vendor-Neutral Semantic Model (`src/tools/computer/uia/interfaces/uia.types.ts`):**
   - `UIElement`: id, name, controlType, role, automationId, className, value, enabled, visible, bounds, parentId, children.
   - `UIWindow`: title, processName, processId, handle, bounds, elements[].
   - `IUiaAdapter`: lifecycle interface for window observation, element lookup, focus, click, text entry, and keypress.
3. **Six Semantic UI Builtin Tools (`src/tools/builtin/computer/uia.tools.ts`):**
   - `computer.ui.observe` (Tier 0): Structured, filtered observation of the active window element tree.
   - `computer.ui.find` (Tier 0): Semantic search by name, controlType, automationId, className, or role.
   - `computer.ui.focus` (Tier 1): Focus an element by ID or search criteria.
   - `computer.ui.click` (Tier 1): Click/invoke an element by ID or search criteria via center coordinates or InvokePattern.
   - `computer.ui.type` (Tier 1): Focus and type text into an editable element with state change verification.
   - `computer.ui.keypress` (Tier 1): Send virtual keypresses to a focused element.
4. **Security & Context Budget Guardrails (`UiaSecurityValidator`):**
   - Tree depth capped to max 5 (default 3); element count capped to max 150 (default 60); text truncated to max 500 chars to avoid LLM context overflow.
   - Automatic password, PIN, token, and credential redaction (`[REDACTED]`).
   - Stale element reference protection: element IDs are cached per observation and validated against active window before action execution.
   - Coordinate/pixel tools (`computer.mouse.*`, `computer.keyboard.*`, `computer.screenshot`) preserved as fallback primitives.
5. **Agent Capabilities & Least Privilege:**
   - Arjuna (`arjuna`): Granted all `computer.ui.*` observation, search, and interaction tools.
   - Agastya (`agastya`): Granted read-only diagnostic tools `computer.ui.observe` and `computer.ui.find`.

### Consequences
- **Positive:** HṚṢĪKEŚA accurately discovers and interacts with desktop controls (buttons, menus, edit boxes, document editors) semantically; robust verification of text state changes; zero third-party framework fragility; full integration with ToolExecutionBus, PermissionManager, and Audit.
- **Negative:** Applications utilizing custom non-standard rendering engines (e.g. game canvases, remote desktop bitmaps) require falling back to coordinate/pixel tools.

---

## ADR-011: Software & Environment Manager Subsystem

### Context
Phase 10 establishes HṚṢĪKEŚA's Software & Environment Manager (`src/environment/`). HṚṢĪKEŚA requires the ability to discover, verify, launch, track, and manage software on the user's authorized Windows 11 machine without relying on arbitrary command runners or untrusted executable paths. The system must operate natively on Windows 10/11 with zero background daemons, strict process ownership, and human-in-the-loop approval for package installation.

### Decision
1. **Multi-Source Discovery Engine (`AppDiscovery`):**
   - Discovers installed desktop software through Windows Start Menu shortcuts (`.lnk` target resolution), Windows Registry App Paths (`HKLM`/`HKCU`), system `PATH` resolution via `where.exe`, and a curated `KnownAppCatalog` (Blender, VS Code, Git, Node.js, Python, Ollama, Chrome, Edge, Notepad, Calculator, Paint, Android Studio).
   - Read-only, non-recursive, cached discovery avoiding full-disk scans.
2. **Controlled Process Lifecycle & Readiness Detection (`ProcessManager`):**
   - Tracks all processes launched by HṚṢĪKEŚA with PID, start time, application ID, and ownership metadata.
   - Enforces multi-signal readiness detection (`STARTING` → `READY` | `FAILED` | `TIMEOUT` | `UNKNOWN`) using process checks and UIA window accessibility.
   - Process termination is strictly restricted to HṚṢĪKEŚA-spawned processes or explicitly authorized PIDs; critical OS processes (PID 0, 4, `csrss`, `lsass`, `explorer`, `svchost`, security software) can never be terminated.
3. **Constrained Windows Package Manager Integration (`WingetAdapter`):**
   - Subprocess wrapper around native `winget.exe` with non-interactive flags (`--accept-source-agreements --accept-package-agreements --disable-interactivity`).
   - Strict query and package ID validation (no shell injection).
   - Package installation requires Danger Tier 2/3 permissions and human approval, pausing immediately with `humanInterventionRequired: true` if a UAC elevation prompt appears.
4. **Environment Security Guardrails (`EnvironmentSecurityValidator`):**
   - All executable paths must resolve to trusted discovery roots or approved application catalogs.
   - Arbitrary shell commands, registry modifications, service installations, and security control tampering are strictly prohibited.
   - Passwords, tokens, and sensitive arguments are redacted from execution logs.
5. **Agent Capabilities & Least Privilege:**
   - Arjuna (`arjuna`): Granted all `environment.*` tools for discovery, launching, tracking, and package installation.
   - Agastya (`agastya`): Granted read-only diagnostic tools (`environment.applications.list`, `environment.application.find`, `environment.application.status`, `environment.process.list`, `environment.process.inspect`, `environment.package.search`, `environment.package.inspect`).

### Consequences
- **Positive:** Enables safe, automated application management; eliminates hard-coded paths; enforces process tracking and clean termination; ensures safety during package installations.
- **Negative:** Non-standard portable applications outside Start Menu, PATH, or Registry require explicit configuration in the known application catalog.

---

## ADR-012: HṚṢĪKEŚA Control Center & Topological Agent Town

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 11 introduces the first sovereign web-based user interface for HṚṢĪKEŚA: the Control Center and Agent Town. Rushikesh requires a local command center where he can communicate with HṚṢĪKEŚA, monitor multi-agent workforce state, track missions/tasks, inspect the 14-tier memory, review governed tools and danger tiers, manage approvals, and observe real environment/model health. The architecture must remain lightweight (~16GB RAM budget), strictly local-only (`127.0.0.1:4200`), free of heavyweight infrastructure (no Redis, Docker, Electron, PostgreSQL), and maintain backend authority without frontend security bypasses.

### Decision
1. **Lightweight Modern SPA Architecture (`ui/`):**
   - React 18 + TypeScript + Vite 6 + Lucide Icons + Custom Dark Futuristic Technical CSS.
   - Total production bundle size is ~240 kB uncompressed (~67 kB gzipped), ensuring fast initial load and sub-1% CPU idle consumption.
2. **Authoritative Backend Serving & Routing (`HttpServer`):**
   - Built-in static asset serving from `ui/dist` with SPA client-side fallback routes (`/command-center`, `/chat`, `/agent-town`, `/agents`, `/missions`, `/tasks`, `/tools`, `/approvals`, `/memory`, `/environment`, `/models`, `/audit`, `/settings`).
   - Native Server-Sent Events (SSE) stream on `GET /events` wired directly to `EventBus` for real-time reactivity without polling overhead.
3. **Topological Agent Town Visualization:**
   - Visual workforce graph representing real registered agents (Arjuna, Chanakya, Arya, Aditi, Agastya) arranged topologically around the central HṚṢĪKEŚA Core kernel.
   - Node status badges, delegation vector lines, and live profile inspector modals reflecting genuine runtime status (`IDLE`, `RUNNING`, `WAITING`, `BLOCKED`, `COMPLETED`, `FAILED`).
4. **Governed Human-in-the-Loop Security Gate:**
   - Approvals panel for Danger Tier 3 and Tier 4 operations interacting with `POST /approvals` and `PermissionManager`.
   - Frontend is explicitly not a security boundary; all state and executions remain authoritative on the backend ToolExecutionBus.
5. **Dynamic Tool Scoping for Model Latency:**
   - `ConversationService` dynamically filters candidate tools based on conversation context to keep Ollama prompt tokens concise, reducing response latency from minutes to seconds.

### Consequences
- **Positive:** High-performance, visually stunning sovereign interface; instant real-time updates via native SSE; zero external server dependencies; zero security compromises.
- **Negative:** Offline UI requires running `npm run build --prefix ui` during development builds before production serving.

---

## ADR-013: Long-Term Semantic Memory & Hybrid Associative Recall

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Rushikesh Pattiwar

### Context
HṚṢĪKEŚA required semantic associative recall across its 14-tier SQLite memory architecture. Relying solely on deterministic keyword search misses conceptually related memories expressed in different vocabularies. However, adding vector capabilities must not compromise the local-first, zero-cost, lightweight footprint (<16GB RAM budget) nor compromise security (e.g. leaking secrets into embedding models or allowing imported memories to override authoritative system directives).

### Decision
1. **Additive, Non-Blocking Architecture:**
   - SQLite (`data/hrisekesa.db`) remains the single source of truth.
   - Migration `003_semantic_memory_schema` introduces the `memory_embeddings` table storing Float32Array vector blobs (768 dimensions × 4 bytes = 3,072 bytes per memory item).
   - Embedding generation runs asynchronously through `SemanticMemoryIndexer` with an in-memory bounded queue (max 50) and single concurrency.
2. **Local Embedding Model (`nomic-embed-text` via Ollama):**
   - Uses `nomic-embed-text` (768 dimensions, ~274 MB disk footprint, ~300 MB RAM when active, automatic keep-alive unload).
   - Serialized with `HardwareDetector` inference lock to avoid GPU/CPU contention with active chat models.
   - Resource guard defers indexing when memory state is `CRITICAL_MEMORY`.
3. **In-Process Cosine Similarity Scan:**
   - Vector search computes exact cosine similarity via Float32Array dot products directly in-memory.
   - Fast and zero-dependency (<5ms for <10,000 items).
4. **Hybrid Retrieval & Strict Provenance Safety:**
   - `HybridMemoryRetriever` merges deterministic keyword matches with vector similarity results.
   - Scoring formula: `hybridScore = (semanticSimilarity × 0.50) + (explicitnessBonus × 0.25) + (confidence × 0.15) + (recencyBonus × 0.10)`.
   - Explicit high-confidence core identities and principles (`tier <= 3`, `confidence >= 0.95`) are always preserved and cannot be overridden by imported memories.
5. **Secret Redaction & Tier Exclusion (`EmbeddingRedactor`):**
   - Excludes sensitive tiers (`audit_history`, `tool_state`) from embedding.
   - Redacts API keys, JWT tokens, passwords, and private keys before text reaches the embedding provider.

### Consequences
- **Positive:** Enables semantic associative recall without external vector DB dependencies; robust fallback to deterministic search when embedding provider is offline; zero secret leakage into vector stores.
- **Negative:** For massive memory scales (N > 10,000 items), in-process linear scan will eventually need replacement with an approximate nearest neighbor index (HNSW / sqlite-vec).

---

## ADR-014: Governed Autonomous Mission Engine & Execution Loop

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 13 elevates HṚṢĪKEŚA's multi-agent workforce and task system into an autonomous execution loop capable of formulating plans, decomposing goals into Directed Acyclic Graph (DAG) task structures, assigning specialized agents, executing tool calls via the sovereign `ToolExecutionBus`, verifying outcomes programmatically without LLM self-certification, classifying failures, and managing retries and human-in-the-loop interventions within strictly bounded computational and task budgets.

On a 16 GB RAM laptop with CPU inference (`qwen2.5:7b`), unconstrained autonomous agents risk runaway loops, catastrophic context inflation, unhandled tool failures, and resource exhaustion. The engine must guarantee finite termination, strict security governance, genuine verification, and full restart durability.

### Decision
1. **DAG-Based Task Graph Execution (`TaskGraph`):**
   - Implements Kahn's algorithm for topological sorting and cycle detection.
   - Enforces execution dependencies: child tasks are only unlocked when all prerequisite dependency tasks reach `COMPLETED` state.
   - Restricts maximum task depth to 6 to prevent runaway branching.

2. **Semantic-Aware Mission Planner (`MissionPlanner`):**
   - Decomposes high-level objectives into validated `MissionPlan` structures with risk analysis and agent capability mapping.
   - Ingests semantic memory from Tier 6 (project), Tier 10 (skills), and Tier 12 (task history) to reuse proven decomposition patterns.
   - 15-second model generation timeout with deterministic archetype fallback ensures high resilience on local hardware.

3. **Genuine Programmatic Verification (`MissionVerifier`):**
   - Rejects LLM self-certification; all task completion must be backed by programmatic ground truth:
     - `file_exists`: Filesystem existence check within sandboxed workspace.
     - `file_contains`: Exact substring or regex verification.
     - `command_exit_code`: Diagnostic command exit code evaluation.
     - `process_running`: Process table / PID verification.
     - `blackboard_entry_present`: Structured blackboard observation verification.

4. **Failure Classification & Recovery (`RecoveryManager`):**
   - Classifies errors into `transient`, `permanent`, `security`, or `resource_exhaustion`.
   - Transient errors retry with exponential backoff within task retry budgets (`maxRetries = 2`).
   - Permanent errors trigger autonomous plan revision.
   - Security blocks and Tier 3/4 human approval requirements pause the mission in `BLOCKED` state, dispatching a `HumanInterventionRequest`.

5. **Finite Budget Envelope (`MissionBudget`):**
   - Strict defaults: `maxTasks = 10`, `maxRetriesPerTask = 2`, `maxTotalRetries = 5`, `timeoutMs = 600,000`, `maxModelCalls = 25`.
   - Guaranteed bounded execution with zero chance of infinite looping.

6. **SQLite Persistence & Durable Memory Integration:**
   - Migration `004_autonomous_mission_schema` introduces `mission_artifacts`, task dependencies, and verification tracking.
   - Completed mission outcomes, key findings, and artifacts are automatically summarized and stored in SQLite Memory Tier 12 (`task_history`) with provenance `learned`.

### Consequences
- **Positive:** Reliable, observable, and fully governed autonomous execution; zero LLM self-certification; strict resource bounding; seamless human-in-the-loop safety gates; full auditability.
- **Negative:** Serial execution of agent inference turns is enforced by `ADR-006` single-lock architecture, which bounds concurrency to maintain host hardware stability.

---

## ADR-015: Autonomous Execution Hardening, Deterministic Fast-Paths & Governed Approval Lifecycle

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 13 established the autonomous execution engine. Phase 13.5 hardens this substrate against latency overhead, LLM call waste on deterministic actions, uncontrolled background model inference on timeout, and improper approval state transitions.

### Decision
1. **Agent Registry Integrity:**
   - The authoritative HṚṢĪKEŚA workforce consists of 5 sovereign agents: `Arjuna` (Code/Engineering), `Chanakya` (Strategy/Architecture), `Arya` (Coordination/Execution), `Aditi` (Research/Intelligence), and `Agastya` (Security/Governance).
   - Dynamic prompt synthesis reads directly from `AgentRegistry.getAll()`; zero hardcoded agent rosters exist in planners.
   - Any external references to "Vyasa" or "Vidura" are treated as literary/archetypal descriptions, never registered workforce identities.

2. **Conservative Complexity Classification & Deterministic Fast-Paths:**
   - Missions are classified into `SIMPLE`, `STANDARD`, and `COMPLEX`.
   - `SIMPLE` deterministic operations (e.g., file existence verification, direct file writing) bypass LLM generation entirely via `generateSimplePlan()` (<1ms latency, 0 model calls).
   - In `AgentRuntime`, tasks with explicit `deterministicToolAction` execute immediately on `ToolExecutionBus` without invoking LLM reasoning turns.

3. **AbortController on Timeout Fallback:**
   - When the 15-second planning fallback timer fires, `AbortController.abort()` explicitly cancels the pending HTTP request to Ollama, preventing duplicate or orphaned local model inference and upholding the `ADR-006` single-flight lock.

4. **Mission-Wide Model Call Budgeting (`MissionBudgetTracker`):**
   - The model call budget (`maxModelCalls`) is tracked monotonically across planning, task execution, retries, recovery, and replanning. It does not reset across task or agent transitions.
   - Budget exhaustion cleanly transitions missions to `FAILED` with `REASON_BUDGET_EXHAUSTED`.

5. **Governed Human Approval State Machine:**
   - A tool execution requiring approval (Tier 3/4 risk or sensitive files) transitions the task and mission to `BLOCKED` with an `approvalId`.
   - `pending_approval` is NEVER treated as execution success.
   - The mission pauses until explicitly resumed with operator `approved` (which dispatches execution) or `rejected` (which halts or fails the task).

### Consequences
- **Positive:** Latency for simple deterministic tasks reduced from minutes to single-digit milliseconds; zero wasted LLM tokens; zero orphaned inference; strict security boundary around approval requirements.
- **Negative:** Requires continuous maintenance of deterministic pattern rules in `classifyComplexity()`.

---

## ADR-016: 17-Agent Specialized Workforce Rearchitecture

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Rushikesh Pattiwar

### Context
Phase 13.5 operated with a 5-agent workforce. To govern the entire enterprise, software engineering, customer operations, commercial, disaster recovery, and decommissioning lifecycle without generalist role dilution, HṚṢĪKEŚA requires a specialized workforce of 17 persistent autonomous agents.

### Decision
1. **Sovereign Top-Level Director:**
   - HṚṢĪKEŚA (हृषीकेश) remains the supreme personal AI orchestrator and director.
2. **17 Specialized Persistent Agents:**
   - **Market & Strategy:** `rahu` (Market Intelligence), `aja` (Strategy & Business Planning), `ritvan` (Company & Team Setup).
   - **Product & Engineering:** `tvas` (Customer & Requirements Research), `spoota` (Product / Service Design), `gandiva` (Software Engineering / Development), `vighna` (QA / Risk / Verification).
   - **Commercial & Delivery:** `raudra` (Marketing & Sales), `rutam` (Contracts / Orders / Governance / Compliance), `arvan` (Fulfillment & Delivery), `taraka` (Customer Onboarding & Support), `kalki` (Billing / Payment / Commercial Operations).
   - **Operations & Transformation:** `garuda` (Operations / Infrastructure / Monitoring), `kali` (Improvement / Transformation / Expansion).
   - **Cross-Cutting Lifecycle:** `kaala` (Time / Scheduling / Resource Coordination), `yama` (Backup / Recovery / Disaster Management), `mrtyu` (Retirement / Termination / Exit).
3. **Identifier & Display Name Standard:**
   - Internal database, routing, and persistence IDs are strict ASCII lowercase (`rahu`, `gandiva`, `mrtyu`, `kaala`).
   - Display names preserve authentic Sanskrit orthography and devanagari script (`Gāṇḍīva` / `गाण्डीव`, `Tāraka` / `तारक`, `Garuḍa` / `गरुड`, `KĀLA` / `काल`, `Mṛtyu` / `मृत्यु`).
4. **Yama vs Mṛtyu Separation:**
   - `yama` is dedicated exclusively to state recovery, rollback, and disaster containment.
   - `mrtyu` is dedicated exclusively to graceful sunsetting, product retirement, and resource decommissioning.
5. **Dynamic Capability-Based Routing:**
   - The MissionPlanner and AgentRegistry match tasks by required capabilities (`market_research`, `coding`, `verification`, `recovery`, `retirement`, `scheduling`, `invoicing`, etc.) rather than hardcoded agent IDs.
6. **Workforce Health Diagnostics:**
   - `AgentRegistryDiagnostics` aggregates real-time workforce health metrics (`totalAgents`, `idle`, `executing`, `blocked`, `verifying`, `recovering`, `retired`).

### Consequences
- **Positive:** Complete coverage of full enterprise lifecycle; zero role collision; deterministic specialist assignment; clear governance and recovery boundaries.
- **Negative:** Expanded registry requiring strict type safety and comprehensive routing tests.

---

## ADR-017: Company & Project Operating System

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Rushikesh Pattiwar

### Context
Following the establishment of the 17-agent specialized workforce, HṚṢĪKEŚA required a persistent organizational hierarchy above the agent workforce and mission engine to support multi-organization, multi-project, product, and customer lifecycle management.

### Decision
1. **Organizational Hierarchy:**
   - Implement persistent entities: `Company` -> `Project` -> `Department` -> `Workforce Assignment` -> `Product` -> `Customer` -> `Decision`.
2. **Authoritative 17-Agent Assignment (No Agent Cloning):**
   - The 17 agents are assigned to companies and departments via `company_workforce` records with designated role titles, lead flags, and capacity percentages. Agents are never duplicated or cloned.
3. **15-Stage Business Lifecycle Engine:**
   - Implement `LifecycleEngine` tracking enterprise progression across 15 distinct stages from `market_research` through `sunsetting_retirement`, mapped to designated lead agents.
4. **Scoped Contextual Memory Isolation:**
   - Enforce strict hierarchical memory scoping: Global $\neq$ Company $\neq$ Project $\neq$ Agent $\neq$ Task, preventing cross-tenant data leakage while injecting scoped context into agent reasoning.
5. **Mission & Artifact Provenance:**
   - Extend `agent_missions` and `mission_artifacts` schemas to maintain foreign key provenance (`company_id`, `project_id`, `product_id`, `department_id`).
6. **Zero Mock Persistence:**
   - Back all Company OS capabilities with SQLite migration `005_company_os_schema.ts` and runtime repositories with cold-restart persistence.

### Consequences
- **Positive:** Seamless enterprise orchestration; clean multi-project isolation; structured decision registry (ADR/PDR); complete mission and artifact traceability.
- **Negative:** Schema complexity expanded by 7 tables and 6 new foreign key relationships.

---

## ADR-019: Foundation Performance & Execution Block (FP-01)

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Rushikesh Pattiwar

### Context
Conversational chat latency was unacceptably high (~80 seconds) due to monolithic reliance on CPU inference, routing simple greetings to 7B models, serializing heavy tool schemas onto every prompt, and synchronous memory/telemetry blocking. Furthermore, the assistant was question-first instead of execution-first.

### Decision
1. **Hardware-Agnostic Inference Engine:**
   - Introduce an inference abstraction layer (`src/inference/`) supporting llama.cpp Vulkan (Intel Arc GPU), llama.cpp multi-threaded CPU (AVX2), and Ollama HTTP runner.
2. **Intel Arc GPU Acceleration via Vulkan:**
   - Detect Intel Arc GPU (Meteor Lake, 9,168 MiB shared VRAM) and offload model layers using standalone `tools/llama-vulkan/` with `-ngl 99`.
3. **Explicit Compute Tiers (T0–T4):**
   - Implement `T0` (deterministic zero-model, <25ms), `T1` (tiny model), `T2` (interactive conversational, `llama3.2:3b`), `T3` (complex reasoning, `qwen2.5:7b`), and `T4` (agentic reasoning).
4. **Execution-First Policy & Assumption Logging:**
   - Enforce `UNDERSTAND -> DECIDE -> EXECUTE -> VERIFY -> REPORT`.
   - Suppress unnecessary clarification questions; record structured assumptions in memory.
5. **English Self-Name "Rishi":**
   - Maintain canonical system identity **HṚṢĪKEŚA** (हृषीकेश / HRISHIKESHA) while using **Rishi** ("I’m Rishi") for English conversational self-reference.
6. **Asynchronous Non-Blocking Chat Naming:**
   - Generate 2–6 word titles asynchronously in the background.
7. **Real-Time Cancellation Tokens:**
   - Immediately abort active model processes, tool executions, and voice playback upon receiving STOP/CANCEL/ABORT/PAUSE.
8. **Offline-First Mode:**
   - Preserve 100% offline capability; queue external operations with `OFFLINE — QUEUED`.

### Consequences
- **Positive:** Simple queries speed up by ~13,000x–23,000x (<10ms). Interactive chat latency drops to 16–22s. Unnecessary conversational interruptions eliminated. Sovereign offline operations guaranteed.
- **Negative:** Additional binary footprint for standalone llama-vulkan runner.

---

## ADR-020: Interactive Inference Optimization (FP-02)

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Rushikesh Pattiwar

### Context
Following FP-01, deterministic fast paths (T0) achieved 3.5–20.7 ms, but normal conversational inference (T2) still exhibited 16–23 second wall-clock latency. Detailed pipeline instrumentation revealed two root causes:
1. Spawning single-shot CLI processes (`llama-cli.exe`) incurred 14.8–15.9 seconds of cold-load disk I/O and shader initialization on every turn.
2. Unconstrained generation produced 200–250 rambling tokens for simple queries (19.5s generation at 11–13 t/s).

### Decision
1. **Warm Model Residency for Interactive T2:**
   - Maintain the primary interactive model (`llama3.2:3b`, Q4_K_M) resident in local memory using `keep_alive: 15m`.
   - Deliver warm Time-To-First-Token (TTFT) of **253–314 ms** (target <= 2s met).
2. **Response Length Modes (`CONCISE`, `NORMAL`, `DETAILED`, `DEEP`):**
   - Introduce 4 response modes defaulting to `NORMAL` (256 tokens).
   - `CONCISE` (max 75 tokens) enforces high-signal answers and drops generation time from 19s to 4.8s.
   - Auto-detect concise mode for simple tips, one-liners, short summaries, or brief queries.
3. **True Token Streaming Architecture:**
   - Stream tokens immediately to the UI via Server-Sent Events (`text/event-stream`).
   - Completely decouple database persistence, asynchronous chat naming, working memory updates, and telemetry from the streaming critical path.
4. **Context Minimization for T2:**
   - Strip all tool schemas, knowledge graph lookups, working memory dumps, and heavy identity documentation for standard conversational turns (Tier 1/2 context < 100 tokens).
5. **Intel Arc Vulkan Profiling & Multi-Backend Strategy:**
   - Fully profile Intel Arc Graphics (Meteor Lake, 9168 MiB shared VRAM) with `-ngl 99`, `-c 2048`, `-b 512`, `-ub 256`, `-t 8`.
   - Maintain Ollama, llama.cpp Vulkan, and llama.cpp CPU backends with automatic tier-aware selection and graceful fallbacks.
6. **Model Role Separation & Residency Protection:**
   - T0: deterministic (<100ms)
   - T1: ultra-fast local (1.5B)
   - T2: interactive conversational (Llama 3.2 3B resident)
   - T3/T4: complex planning & autonomous workforce (Qwen 2.5 7B on-demand)
   - Under memory pressure: preserve T0 and T2; evict heavy models first.

### Consequences
- **Positive:** Warm TTFT dropped to 253–314 ms (~50x faster). Total chat latency for simple queries dropped from 22.7s to 2.42–6.15s (77–89% latency reduction). Conversational feel is immediate and streaming is continuous. 100% offline sovereign execution preserved.
- **Negative:** Resident model holds ~1.95 GB of RAM/VRAM while active.

---

## ADR-021: Distributed Resource Fabric & Execution Capacity (FP-03)

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Rushikesh Pattiwar

### Context
Following FP-01 and FP-02, HṚṢĪKEŚA achieved fast deterministic cognition (T0 ~0.8–37ms) and low-latency warm interactive inference (T2 ~253–314ms TTFT). However, complex autonomous missions, compiler builds, intensive QA evaluations, and heavier 7B/14B reasoning models are constrained by single-machine hardware envelope (14 cores, 16 GB RAM, shared Intel Arc iGPU).

The architecture required an execution capacity fabric capable of scheduling tasks across distributed execution nodes (Local Laptop, LAN Worker, future GPU/Cloud worker) while maintaining strict control plane sovereignty on the primary machine.

### Decision
1. **Control Plane vs Execution Plane Separation:**
   - **Control Plane:** Remains exclusively on the primary HṚṢĪKEŚA machine. Authoritative owner of identity, policy, permissions, goals, missions, working memory, knowledge, and corporate state.
   - **Execution Plane:** Stateless execution workers (Local, LAN, Remote, Cloud) perform authorized, scoped workloads under control plane supervision.
   - Agents are NOT workers. The 17-agent workforce remains intact: `Agent -> Task -> Resource Fabric -> Worker -> Tool/Model`.
2. **Persistent Resource Registry (SQLite Migration 020):**
   - Tables: `workers`, `worker_capabilities`, `worker_tasks`, `worker_resource_snapshots`, `worker_enrollment_tokens`.
   - In-memory caching with sub-millisecond lookups and SQLite durability across restarts. Bounded snapshot retention (latest 100 per worker).
3. **Resource-Aware Placement Engine (`ResourceScheduler`):**
   - Multi-factor evaluation: required capabilities, hardware constraints (CPU cores, RAM headroom, GPU requirement, GPU backend), model availability, privacy boundaries, priority ranking, and worker load score.
   - Explainable decisions with factors recorded for auditability.
   - Host memory pressure integration with `ResourceGovernor`: penalizes local worker under `CRITICAL_MEMORY` to offload eligible non-private workloads to LAN nodes.
4. **Non-Negotiable Security & Cryptographic Pairing:**
   - LAN enrollment uses single-use pairing tokens hashed with SHA-256 and bounded by TTL (default 10 minutes).
   - No plaintext secrets in database, logs, or network payloads.
   - Zero unrestricted remote shell execution: non-local workers are strictly restricted to whitelisted safe workloads (`compute.echo`, `compute.benchmark`, `resource.fabric.test`, `inference.generate`, `model.health`).
   - Default network bindings remain localhost-only unless explicitly paired.
5. **Privacy Levels & Isolation (`ResourcePolicyManager`):**
   - `SOVEREIGN_LOCAL`: Strictly prohibited from leaving the primary local machine.
   - `HIGHLY_PRIVATE`: Local execution by default; remote execution blocked unless sovereign policy explicitly overrides.
   - `PRIVATE`: Trusted enrolled workers only (Local or trusted LAN). Cloud workers rejected.
   - `PUBLIC`: May use configured remote/cloud workers.
6. **Cooperative Cancellation & Fault Recovery:**
   - Real-time cancellation tokens propagate from HṚṢĪKEŚA scheduler to active worker loops.
   - Automatic health sweep detects stale heartbeats, auto-transitions nodes to `DEGRADED`/`OFFLINE`, and safely requeues in-flight tasks onto alternate eligible workers with idempotency protection.
7. **Safe Artifact Transfer:**
   - Hash verification (SHA-256), strict size bounds (max 50 MB), and path traversal protection against directory escape (`..`, absolute paths outside sandbox).

### Consequences
- **Positive:** Enables boundless horizontal compute scaling across local LAN workstations and GPU rigs; preserves 100% sovereign control plane on the primary laptop; sub-50ms placement latency; zero remote backdoor risks; seamless integration with ResourceGovernor and existing 17-agent workforce.
- **Negative:** LAN worker communication introduces minor network latency (~1–3ms on local network) compared to in-process memory calls.

---

## ADR-022: Dedicated Worker Transport Layer & Distributed Inference Streaming (FP-04)

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Rushikesh Pattiwar

### Context
FP-03 established the Resource Fabric abstractions and loopback/in-process verification. However, exposing the primary HṚṢĪKEŚA control plane (Port 4200) to `0.0.0.0` would create a critical security vulnerability, exposing sovereign identity, working memory, knowledge graphs, company finances, and approval gates to the local network. Furthermore, physical execution requires real TLS encrypted socket transport, standalone physical worker runtimes, capability discovery, real-time token streaming for distributed inference, and fault-tolerant network partition handling.

### Decision
1. **Strict Port & Network Isolation:**
   - Control plane (Port 4200) remains strictly bound to `127.0.0.1` (localhost).
   - Dedicated Worker Transport listener runs on Port 4300 (`WorkerTransportServer`) exposing ONLY minimal, typed worker protocol frames (`ENROLL`, `AUTH`, `HEARTBEAT`, `CAPABILITIES`, `TELEMETRY`, `TASK_ACCEPTED`, `TASK_PROGRESS`, `TASK_COMPLETED`, `TASK_FAILED`, `TASK_CANCELLED`).
2. **Encrypted Transport (TLS 1.3 / Pure-JS X.509):**
   - Implemented zero-dependency pure JavaScript X.509 self-signed certificate generation with RSA-2048 and SHA-256 fingerprinting.
   - Worker nodes authenticate via single-use enrollment tokens (`hrsk_enroll_<random>`), receiving ephemeral session tokens (`hrsk_sess_<random>`).
3. **Framing & Defense-in-Depth:**
   - 4-byte big-endian length-prefixed protocol frames.
   - Strict 5 MB maximum payload ceiling per frame to defend against socket exhaustion and buffer attacks.
4. **Physical Worker Runtime (`src/resources/worker-runtime/`):**
   - Lightweight, standalone worker daemon executable on physical LAN nodes without running the HṚṢĪKEŚA control plane.
   - Bounded typed workloads: `compute.echo`, `compute.benchmark`, `resource.fabric.test`, `model.health`, `inference.generate`.
   - Zero unrestricted remote shell or remote filesystem access.
5. **Distributed Inference & True Token Streaming:**
   - Real-time token chunks stream over TLS frames (`TASK_PROGRESS` with `{ type: 'token', text }`) directly into HṚṢĪKEŚA SSE streams and the Chat UI.
   - Integrated with Ollama and llama.cpp runtimes on remote nodes with `AbortController` cancellation.
6. **Physical LAN Verification Discipline:**
   - Where a second physical machine is not connected to the local network in the development environment, real socket and TLS transports are verified via automated suites, and the status is explicitly reported as `PHYSICAL_LAN_VERIFICATION = NOT_AVAILABLE` (zero fabrication).

### Consequences
- **Positive:** Absolute control plane security through port isolation; true distributed execution and token streaming across LAN nodes; graceful handling of Wi-Fi disconnects and network partitions; no dependency on external OpenSSL binaries.
- **Negative:** Self-signed certificates require fingerprint pinning or disabled CA authority validation in local development environments.

---

## ADR-023: Multi-Worker Execution, Concurrent Inference & Queue-Aware Placement (FP-05)

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Rushikesh Pattiwar

### Context
FP-04 established secure TLS-encrypted transport and single-worker protocol execution. However, scaling HṚṢĪKEŚA beyond a single execution node required evolving the architecture into a true multi-worker execution fabric capable of handling simultaneous worker sessions, model-aware and residency-aware task placement, concurrent streaming inference, worker load balancing, concurrency limits, saturation handling, queue-aware priority scheduling with starvation prevention, graceful node draining, and automatic task migration upon network partitions.

### Decision
1. **Multi-Worker Registry & Simultaneous TLS Sessions:**
   - Transport server (`WorkerTransportServer`) upgraded to manage concurrent worker sessions simultaneously via `Map<string, ConnectedWorkerSession>`, tracking multiple concurrent `activeTaskIds: Set<string>` per session.
   - Resource registry tracks hardware configurations, residency states, and active workloads across all connected workers (`LOCAL`, `LAN-A`, `LAN-B`, `LAN-C`).
2. **Model-Aware Placement & Warm Model Residency Scoring:**
   - Tasks requesting specific models (`resourceRequirements.requiredModel`) route exclusively to workers advertising model availability.
   - Workers with models pre-loaded in memory/VRAM (`worker.residentModels`) receive a +40 warm residency score bonus, avoiding cold-start latency.
3. **Worker Capacity Accounting & Load Balancing:**
   - Placement engine applies active tasks penalty (`-activeCount * 15`) and tie-breaking by lowest active tasks to balance load evenly across identical nodes.
   - Enforces per-worker concurrency limits (`worker.resourceLimits.maxConcurrentTasks`), marking saturated workers ineligible for immediate placement (`isSaturated = true`).
4. **Queue-Aware Priority Scheduling with Aging Bonus:**
   - When all eligible nodes are saturated, tasks with `waitForCapacity !== false` enter a priority task queue (`taskQueue`).
   - Schedulers evaluate queue priority using effective priority: `effectivePriority = basePriority + Math.floor((now - enqueuedAt) / 5000)`, granting +1 point every 5 seconds to eliminate starvation for lower-priority background tasks.
5. **Graceful Worker Draining Lifecycle (`DRAINING` -> `DRAINED`):**
   - Admin command `resourceManager.drainWorker(workerId)` marks worker status as `DRAINING` and sends `WORKER_DRAIN` transport frame.
   - Draining workers reject all new task placements while continuing to execute in-flight workloads.
   - As soon as the active task count drops to zero, the scheduler automatically transitions the worker to `DRAINED`.
   - `resumeWorker(workerId)` transitions drained workers back to `ONLINE` and triggers `processQueue()`.
6. **Automatic Task Migration on Network Dropped:**
   - Tasks submitted with `allowMigration: true` that encounter transport socket disconnection/timeout during execution are automatically requeued (`REQUEUED`), incrementing attempt counter, clearing assigned worker, and re-evaluating placement against remaining online nodes.
7. **In-Flight Idempotency Deduplication:**
   - Schedulers maintain `inFlightByIdempotency: Map<string, Promise<TaskResult>>` to allow concurrent duplicate task submissions with identical keys to share the single in-flight execution promise, eliminating redundant compute cycles.
8. **Physical LAN Verification Standard:**
   - In environments where only one physical machine is active, all multi-worker tests execute over real TLS/TCP sockets and the physical status is reported transparently as `PHYSICAL_LAN_VERIFICATION = NOT_AVAILABLE` with zero fabricated data.

### Consequences
- **Positive:** True horizontal compute parallelism across multiple LAN nodes; zero task loss during worker draining; starvation-free fair priority queuing; sub-millisecond scheduling decisions; zero duplicate execution on concurrent requests; 100% sovereign control plane preservation.
- **Negative:** Increased in-memory state tracking for active task sets and queue entries; network latency overhead on task migration.

---

## ADR-031: Universal Capability & Connector Fabric (FP-07)

### Metadata
- **Status:** Accepted & Empirically Verified
- **Date:** 2026-09-25
- **Deciders:** Rushikesh Pattiwar

### Context
HṚṢĪKEŚA has established memory, cognitive context, model routing, a 17-agent workforce, goal/mission planners, MCP integrations, browser automation, and a multi-worker LAN compute fabric. However, invoking heterogeneous actuators (CLI commands, REST APIs, Playwright sessions, installed software, MCP servers, and local tools) previously used disparate interfaces without uniform risk tiers, strict anti-injection sandboxing, explicit trust hierarchies, or zero-secret handling. FP-07 requires unifying all capability actuation into a strongly-typed, securely governed, and verifiable fabric.

### Decision
1. **Universal Capability Contract (`src/capabilities/fabric/capability.types.ts`):**
   - Standardize all capabilities across 6 protocols (`CLI`, `REST`, `BROWSER`, `SOFTWARE`, `MCP`, `LOCAL_TOOL`).
   - Explicit trust levels: `SYSTEM`, `TRUSTED`, `VERIFIED`, `USER_APPROVED`, `UNVERIFIED`, `UNTRUSTED`, `BLOCKED`. Trust is NEVER inferred merely from discovery.
   - Standardized danger tiers: `TIER_0_READ_ONLY` through `TIER_4_IRREVERSIBLE`.
   - Privacy classes: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`, `SOVEREIGN_LOCAL`.
2. **Dual-Layer Persistent Repository & Sub-10ms Lookups:**
   - Backed by SQLite migration `021_universal_capability_fabric_schema.ts`.
   - In-memory `Map` cache guarantees sub-1.2ms deterministic lookups without LLM overhead.
3. **Anti-Injection CLI Sandbox:**
   - Strict binary allowlisting (`git`, `node`, `npm`, `ollama`) and rejection of shell metacharacters (`;`, `&`, `|`, `$`, etc.).
4. **Zero Plaintext Secrets Storage & Secret Redaction:**
   - Credentials stored exclusively by reference (`vault://...`, `env://...`); recursive secret redaction filter purges tokens, passwords, and authorization headers from logs and database records.
5. **Invariant Verification Engine (`EXECUTED != VERIFIED`):**
   - Invocations must satisfy post-condition invariant checks across 7 strategies (`schema_match`, `read_after_write`, `process_state`, `checksum`, `dom_presence`, `exit_code`, `dry_run`).
6. **Indirect Prompt Injection Defense:**
   - Untrusted external outputs are defanged into isolated data envelopes before returning to reasoning agents.
7. **Native CLI & Control Center UI:**
   - Native CLI commands (`hres capabilities list/search/inspect/health/verify/revoke/invoke`) and 7-tab Glassmorphic UI view (`CapabilityCenter.tsx`) with real-time SSE stream.

### Consequences
- **Positive:** Universal execution interface across all tool types; deterministic sub-millisecond intent matching; zero secret leakage; strong prompt injection defense; clear separation between execution and verification; zero regressions across earlier phases.
- **Negative:** Schema definitions required for all capability inputs and outputs; additional post-condition verification latency for complex operations.

---

## ADR-023: Sovereign Development Workspace & Universal IDE Fabric (FP-09)
- **Status:** Accepted & Empirically Verified
- **Date:** 2026-09-25
- **Deciders:** Rushikesh Pattiwar

### Context
To enable true sovereign autonomous engineering, HṚṢĪKEŚA required an integrated development environment (IDE) runtime providing workspace discovery, precision editing, ripgrep code search, sandboxed terminals, live preview servers, Git SCM, and baseline verification loops.

### Decision
1. **IdeFabric Architecture:** Unified orchestrator wiring 8 development subsystems (`WorkspaceManager`, `CodeSearchEngine`, `EditorEngine`, `TerminalManager`, `PreviewManager`, `GitWorkspaceManager`, `VerificationLoopEngine`, `IdeRepository`).
2. **Sandbox Containment:** Enforce `resolveSafePath` across all file operations preventing path traversal.
3. **Atomic Precision Edits:** Transactional multi-chunk replacement with atomic disk rollback if any chunk fails validation.
4. **Governed Terminal Supervision:** Bounded circular output buffer (100KB) and destructive command regex rejection.
5. **Persistence Schema (Migration 023):** Backed by SQLite tables for workspaces, changesets, terminals, preview servers, and verification runs.

### Consequences
- **Positive:** Full local IDE capability without external dependencies or cloud lock-in; sub-millisecond search and edit dispatch; safe execution.
- **Negative:** Resource overhead when supervising multiple concurrent terminal and dev preview processes.

---

## ADR-024: Governed Autonomous Software Engineering & Convergence Architecture (FP-10)
- **Status:** Accepted & Empirically Verified
- **Date:** 2026-09-26
- **Deciders:** Rushikesh Pattiwar

### Context
FP-09 provided development workspace primitives, but AI coding was architectural/simulated. Autonomous software engineering requires connecting the model router to a closed-loop repair engine with strict safety sandboxes, user conflict protections, failure normalization, and finite convergence guarantees to prevent infinite repair loops.

### Decision
1. **Model Proposes, Governed System Executes:** Models never receive arbitrary shell execution rights. Models output strictly typed `EngineeringActionPayload` validated against danger tiers and path boundaries by `EngineeringActionValidator`.
2. **User Modification Conflict Protection:** Record SHA-256 pre-read hash on `READ_FILE`. Reject `EDIT_FILE` or patches with `Concurrent modification detected: User work protected` if file content was modified externally.
3. **Normalized Failure Diagnostics & Fingerprinting:** Convert compiler/test/lint errors into `StructuredDiagnostic` with deterministic failure fingerprints (`category:file:line:hash`).
4. **Convergence Engine & Anti-Loop Safeguards:** Enforce strict attempt budgets (`maxAttempts`), timeout ceilings (`maxDurationSeconds`), and non-monotonic regression halting. Immediately halt repair loops when >= 3 consecutive identical failure fingerprints are detected (`REPEATED_FAILURE`).
5. **Surgical Precision Repairs:** Model prompts focus on defect diagnostic context and target file slices (±10 lines). Preconditions verify target content presence before disk application.
6. **Unified Persistence (Migration 024):** SQLite tables `engineering_tasks`, `engineering_plans`, `engineering_actions`, `engineering_diagnostics`, `engineering_repairs`, and `engineering_verifications`.

### Consequences

---

## ADR-019: Native Universal Workflow & Automation Engine Architecture (FP-11)

### Status
Accepted / Complete (FP-11)

### Context
Prior to FP-11, HṚṢĪKEŚA could autonomously execute individual missions, software engineering tasks (FP-10), and computer operations, but lacked a native, persistent, event-driven orchestration layer to compose, monitor, persist, recover, and verify complex multi-step workflows.

### Decision
1. **Durable Directed Executable Graph**: A workflow is modelled as an immutable versioned directed graph (`WorkflowVersion`) consisting of typed nodes and edges.
2. **Re-use of Existing Subsystems**: No duplicate orchestration, task scheduling, or coding engines were introduced. FP-10 remains 100% frozen; workflow `CODE`, `TEST`, and `VERIFY` nodes dispatch directly to `EngineeringFabric`. `ACTION` nodes route to `ToolExecutionBus`; `CAPABILITY` nodes route to `UniversalCapabilityFabric`; `AGENT` nodes route to `AgentRuntime`; `MODEL` nodes route to `ModelRouter`.
3. **Safe Deterministic Expression Evaluator**: All conditions (`{{expr}}`) and template interpolations are evaluated strictly by `SafeExpressionEvaluator`. Arbitrary JavaScript execution is forbidden.
4. **Mandatory Financial Governance**: Outgoing monetary operations or irreversible high-risk steps automatically pause in `WAITING_APPROVAL` status and require human approval.
5. **ACID-Compliant State Machine**: SQLite persistence utilizes `ON CONFLICT(id) DO UPDATE SET` on `workflow_runs` to ensure child records (approvals, checkpoints, run nodes) are preserved without triggering foreign key cascade deletions.
6. **Crash Recovery**: SHA-256 idempotency checkpoints enable resuming in-flight workflows after system restart without repeating destructive side-effects.

### Consequences
---

## ADR-020: Universal Service & Account Integration Fabric (FP-12)

### Status
Accepted / Complete (FP-12)

### Context
HṚṢĪKEŚA required unified credential management, provider protocol adapters, and account resolution for 50+ enterprise and consumer services.

### Decision
1. Implemented `AccountRepository` with Migration 026 and AES-256-GCM vault security.
2. Abstracted authenticated providers behind `AccountResolver`, eliminating model exposure to plaintext tokens.

---

## ADR-021: Universal Digital Workspace & Application Operator (FP-13)

### Status
Accepted / Complete (FP-13)

### Context
Operating applications across heterogeneous environments (Windows GUI, browser, terminal, IDE, and remote VDI) required a unified, observable, and empirically verified control plane.

### Decision
1. **Digital Workspace Abstraction (`IDigitalWorkspace`)**: Provider-independent abstraction for Local Windows, Browser, Terminal, IDE, and Remote VDI workspaces.
2. **Normalized Observation Hierarchy**: Prioritized resolution (Semantic UIA $\rightarrow$ A11y $\rightarrow$ DOM $\rightarrow$ App API $\rightarrow$ OCR $\rightarrow$ Vision $\rightarrow$ Coordinates).
3. **Target Ambiguity Guard**: Refuses execution on ambiguous targets; requires confirmation.
4. **Preconditions & Empirical Verification**: Rejects "dispatched = success"; validates post-action state via dedicated strategies.
5. **Loop Prevention & Recovery**: Halts after 3 consecutive failures to avoid infinite GUI loops.
6. **SQLite Persistence (Migration 027)**: 12 relational tables with foreign keys and secret sanitization.

### Consequences
- **Positive**: Coherent operator interface across all desktop and remote tools, robust against UI drift and loops.
- **Negative**: Verification adds 2–5ms per action.

---

## ADR-022: Universal Agentic Mission & Workforce Runtime (FP-14)

### Status
Accepted / Complete (FP-14)

### Context
Executing multi-stage sovereign engineering and operational goals required compiling unstructured intent into formal executable mission DAGs, delegating to specialized agents, coordinating real-time blackboard communication, and enforcing outcome acceptance gates.

### Decision
1. **Dynamic Mission Compiler (`MissionCompiler`)**: Compiles unstructured prompts into validated, typed DAG plans with outcome definitions and acceptance criteria without LLM hallucination risks.
2. **Workforce Allocation Engine (`WorkforcePlanner`)**: Allocates subtasks across the authoritative 17 specialized agents based on capability scoring, real-time load, and depth ceilings (max depth 3).
3. **Mission Blackboard & Artifact Graph (`MissionBlackboard`)**: Scoped pub/sub state bus recording verified facts, decisions, blockers, and artifacts.
4. **Independent Acceptance Engine (`MissionAcceptanceEngine`)**: Evaluates post-conditions with independent sign-off requirements (e.g. Vighna QA verification).
5. **Durable Persistence (Migration 028)**: 6 relational tables (`missions`, `mission_tasks`, `mission_outcomes`, `mission_checkpoints`, `mission_artifacts`, `mission_blackboard_events`).

### Consequences
- **Positive**: Autonomous multi-agent mission workflows execute predictably with explicit quality gates and persistent recovery.
- **Negative**: Compilation and verification steps introduce bounded orchestration overhead.

---

## ADR-023: Repository Hygiene, Dynamic Migration Invariants & Shutdown Lifecycle Contract

### Status
Accepted / Complete (Post-FP-14 Cleanup)

### Context
As the schema evolved from 17 migrations to 28 migrations, static test assertions broke with hardcoded counts. Furthermore, background tasks and unmanaged sockets prevented clean test teardown without `--forceExit`.

### Decision
1. **Dynamic Migration Introspection**: Tests must assert migration state dynamically via `MigrationManager.getAvailableMigrations()` rather than hardcoded integer literals.
2. **Kernel Migration Timing**: `db.open()` and `migrations.runPending()` execute immediately upon `MigrationManager` instantiation in `HrisekesaKernel` constructor before dependent subsystems access the raw database.
3. **Shutdown Contract & Socket Tracking**:
   - `HttpServer` actively registers and tracks client sockets on the `'connection'` event, forcefully destroying open sockets on `stop()`.
   - `worker.transport.server` destroys socket sessions and closes connections promptly.
   - `ResourceManager.stop()` and `resetInstance()` are fully asynchronous and awaited by `kernel.shutdown()`.
   - `MissionOrchestrator` implements `cancelMission()` and checks cancellation flags in execution loops, ensuring background missions resolve promptly during shutdown.
4. **Process Exit Invariant**: No test runner or production command may use `--forceExit`; the runtime must terminate naturally.

### Consequences
- **Positive**: Zero resource leaks, natural process exit across all suites, and future-proof migration testing.
- **Negative**: Explicit tracking of socket handles and cancellation sets in orchestrators.

---

## ADR-024: Universal Application & Service Ecosystem (FP-15)

### Status
Accepted / Complete (FP-15)

### Context
Following FP-01 through FP-14, HṚṢĪKEŚA required an ecosystem resolution layer sitting directly above capability and connection infrastructure and below mission orchestration. The objective is to make real-world software, CLI tools, provider APIs, and desktop applications deterministically discoverable and selectable without building another orchestrator or duplicating FP-13's ApplicationDescriptor or FP-12's AccountFabric.

### Decision
1. **Architectural Positioning**: Position FP-15 directly between FP-14 (Mission Runtime) and FP-07/11/12/13/20/21 (Execution & Account Fabrics).
2. **Deterministic Interface Priority Ladder**:
   - `LOCAL_API` (1) → `AUTHENTICATED_API` (2) → `MCP` (3) → `CLI` (4) → `BROWSER_DOM` (5) → `DESKTOP_UIA` (6) → `OCR_VISION` (7) → `COORDINATE_INPUT` (8).
3. **Reuse Without Duplication**:
   - Reused `ApplicationDescriptor` directly from FP-13 (`src/digital-workspace/types/index.ts`).
   - Reused `AccountFabric` credential vault and routing from FP-12 (`src/accounts/`).
   - Reused `ApplicationOperator` from FP-13 for physical desktop application interaction.
4. **Natural Language Fast-Path & Anti-Hallucination**:
   - Deterministic regex and catalog mapping resolves service, account, and capabilities with zero LLM latency (<5ms) and zero hallucination.
   - Non-connected accounts or missing applications report truthful statuses (`NOT_CONNECTED`, `NOT_INSTALLED`, `UNKNOWN` quota).
5. **Security & External Data Defanging**:
   - External service data is defanged and tagged with `_untrustedExternalData: true`.
   - Consequential operations enforce post-action verification (e.g. confirming issue number, calendar event ID).
6. **Durable Persistence (Migration 029)**:
   - 4 relational tables: `ecosystem_services`, `ecosystem_interfaces`, `ecosystem_operations`, `ecosystem_verifications`.

### Consequences
- **Positive**: Clean deterministic dispatch, zero credential leakage, robust multi-account scope isolation, and reliable offline fallback.
- **Negative**: Requires maintaining adapter mappings for new third-party providers.

---

## ADR-031: Universal Digital Creation & Media Studio (FP-17)

### Status
Accepted / Complete (FP-17)

### Context
HṚṢĪKEŚA requires a unified, local-first creation and media production orchestration layer across all major modalities (images, vector graphics, video, audio, music, voice, 3D, documents, presentations, and compound packages). The objective is to give HṚṢĪKEŚA the ability to understand creative intent, select appropriate tools/models, execute generation and transformation pipelines, deterministically verify outputs, iterate with bounded budgets, and enforce sovereign human approval boundaries.

### Decision
1. **First Audit Principle**:
   - Reused existing capability infrastructure (FP-07, FP-11, FP-12, FP-13, FP-14, FP-15, FP-16) without duplicating model routers, workflow engines, or skill engines.
2. **Creation Domain Model (Migration 031)**:
   - `CreationJob`: Complete lifecycle entity tracking ID, owner, company/project isolation, objective, prompt, inputs, outputs, provider, status, progress percentage, verification results, bounded iterations (`currentIteration`, `maxIterations`), and license provenance.
   - `CreationArtifact`: Output deliverable tracking location, format, MIME type, dimensions/duration/pages, cryptographic SHA-256 hash, and deterministic QA verification flag.
   - `DesignContext`: Multi-tenant styling tokens (brand identity, colors, typography, geometric rules, aesthetic constraints).
3. **Local-First Priority & Native Synthesizers**:
   - Native deterministic local providers (`native.image.synthesizer`, `native.video.composer`, `native.audio.synthesizer`, `native.document.compiler`) provide offline generation capabilities.
   - Host applications (Blender, FFmpeg, ImageMagick) are probed honestly; if absent, they report `NOT_CONFIGURED` without fabricating execution.
4. **Deterministic Multi-Stage Verifier**:
   - Every artifact undergoes structural inspection, file existence checks, non-zero byte checks, format syntax checks, dimension/aspect ratio validation, and SHA-256 cryptographic hashing.
5. **Bounded Iteration Loop & Convergence Guard**:
   - Iteration requests (`iterateJob`) evaluate changes against requirements, increment iteration budget, and strictly halt when `maxIterations` is exceeded (`AWAITING_INPUT`).
6. **Sovereign Approval Boundaries**:
   - Commercial publishing, paid generation, and voice cloning require human confirmation (`AWAITING_APPROVAL`).
7. **Security & Sandboxing**:
   - Prompt injection neutralized, SVG `<script>` tags sanitized, executable formats (`.exe`, `.bat`, `.sh`) rejected, and path traversal stripped.
8. **UI & CLI Integration**:
   - Control Center view `CreationStudioView.tsx` with live SSE stream (`/api/creation/events`) and CLI `hres create <type>` / `hres creation list|status|verify|cancel`.

### Consequences
- **Positive**: Complete multi-modal creation capability without vendor lock-in, fully offline-capable, bounded resource usage, and auditable artifact provenance.
- **Negative**: High-resolution photorealistic diffusion or long video rendering on this machine is constrained by 16GB RAM and integrated GPU; heavy cloud models remain optional and configurable.

---

## ADR-032: Universal Real-World Research, Knowledge & Decision Intelligence Fabric (FP-18)

### Status
Accepted / Complete (FP-18)

### Context
HṚṢĪKEŚA required an analytical and cognitive fabric turning fragmented external information (web, repositories, ecosystem) + existing knowledge/memory + company/project context + host machine constraints into auditable decision-support packages and actionable plans without silently making consequential decisions on behalf of Rushikesh.

### Decision
1. **Core Evidence -> Context -> Decision Support Pipeline**:
   - Formulate research cases through a persistent 12-state lifecycle (`DRAFT` → `SCOPING` → `RESEARCHING` → `GATHERING_EVIDENCE` → `ANALYZING` → `COMPARING` → `SYNTHESIZING` → `REVIEWING` → `AWAITING_USER` → `COMPLETED` / `FAILED` / `ARCHIVED`).
   - Decompose high-level objectives into subquestions with bounded resource budgets (`maxSources`, `maxSearches`, `maxPages`, `maxTokens`, `maxDurationMs`).
2. **Reuse Without Duplication**:
   - Reused Phase 17 ResearchEngine, WebSearchConnector, and BrowserInspectionService.
   - Reused INT-006 KnowledgeGraph and INT-008 WorkingMemory for durable contextual grounding.
   - Reused ResourceGovernor for host resource protection (reducing concurrency on `CRITICAL_MEMORY`).
3. **Traceability, Contradiction & Temporal Intelligence**:
   - Maintain traceable evidence ledger linking every claim to source, confidence, retrieval time, and polarity.
   - Analyze multi-source contradictions and extract root causes (quantization, versions, OS, workloads).
   - Flag claims >2 years old as `OUTDATED` without silently substituting stale information as current.
4. **Environment-Aware Compatibility**:
   - Evaluate candidate technologies against actual host hardware (Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc GPU, Windows 11) into 5 explicit compatibility ratings (`VERIFIED_COMPATIBLE`, `LIKELY_COMPATIBLE`, `CONDITIONALLY_COMPATIBLE`, `INCOMPATIBLE`, `UNKNOWN`).
5. **Rigorous Qualitative Tradeoff Comparisons & Decision Briefs**:
   - Matrix comparison across explicit criteria without fake numerical precision.
   - Standard 16-section Decision Brief separating Evidence, Analysis, and Recommendations.
6. **Immutable Decision Records & Structured Reviews**:
   - Store historical decisions with rationales, assumptions, and approvers.
   - Support decision reviews against newer evidence (`MAINTAIN` vs `UPDATE`).
7. **Governed Action Bridge**:
   - Compile decisions into proposed Missions, Goals, Workflows, Skills, and Environment Changes behind mandatory human approval gates (`AWAITING_USER` / `PENDING_APPROVAL`).
8. **Persistence Layer (Migration 032)**:
   - 6 relational tables: `research_cases`, `research_candidates`, `research_comparisons`, `decision_records`, `decision_reviews`, and `decision_proposed_actions`.

### Consequences
- **Positive**: Auditable decision packages, zero hallucinated certainty, preserved uncertainty, and safe bridging from research directly to authorized execution.
- **Negative**: Consequential actions are intentionally gated behind human confirmation, preventing silent autonomous modifications.

---

## ADR-033: Persistent Distributed Execution & 24/7 Operations Fabric (FP-19)

### Status
Accepted / Complete (FP-19)

### Context
HṚṢĪKEŚA required a durable, fault-tolerant execution substrate capable of running 24/7 unattended across heterogeneous compute environments (`LOCAL`, `LAN`, `REMOTE`, `CLOUD`, `HOSTED`) directly beneath existing orchestration systems (Missions, Workflows, Goals, Skills, Company OS) without risk of orphaned jobs, split-brain state corruption, or unconstrained cloud billing.

### Decision
1. **Low-Level Execution Substrate Architecture**:
   - Operates as the underlying execution fabric beneath Missions (FP-14), Workflows (FP-11), Goals (FP-15), Skills (FP-20), and Company OS (FP-18).
   - Manages placement, locks, heartbeats, checkpoints, and retries without re-implementing task decomposition or agent planning.
2. **Distributed Leases & Monotonic Fencing Tokens**:
   - Mutual exclusion distributed leases with strictly increasing 64-bit monotonic fencing tokens (`fenceToken = max(existing) + 1`).
   - Rejects stale tokens on all state updates and checkpoint commits to eliminate split-brain and zombie execution loops.
3. **Incremental Checkpointing & State Migration**:
   - Persists step snapshots, memory context, runtime variables, and verification evidence.
   - `JobMigrationPackage` transports complete state between workers across runtimes with zero loss of progress.
4. **Multi-Queue Priority Scheduling & Hardware Constraints**:
   - 5 priority queues (`CRITICAL`, `HIGH`, `NORMAL`, `LOW`, `BACKGROUND`).
   - Enforces locality affinity, minimum CPU/RAM, and GPU backend compatibility (Vulkan/DirectML vs CUDA) with anti-starvation priority aging.
5. **Autonomous Recovery & Dead-Letter Routing**:
   - Detects stale workers via heartbeat daemon (10s intervals; 3 missed heartbeats marks worker `OFFLINE`).
   - Automatically reclaims abandoned leases, re-enqueues jobs with exponential backoff and jitter, and routes exhausted jobs to `DEAD_LETTER`.
6. **Strict Human Cloud Cost Governance**:
   - Unattended 24/7 execution permitted on zero-incremental-cost runtimes (`LOCAL`, `LAN`, pre-paid `REMOTE`).
   - Any attempt to provision or dispatch to paid cloud instances strictly requires explicit human operator authorization (`DENY_PAID_WITHOUT_APPROVAL`).
7. **Zero Heavy External Orchestrators**:
   - Pure Node.js/TypeScript and WAL-mode SQLite (`data/hrisekesa.db`) without Redis, Kafka, Celery, Temporal, or Kubernetes dependencies.
8. **Persistence Layer (Migration 033)**:
   - 9 relational SQLite tables: `execution_runtimes`, `execution_workers`, `execution_jobs`, `execution_leases`, `execution_checkpoints`, `execution_queues`, `cloud_providers`, `cloud_instances`, and `execution_traces`.

### Consequences
- **Positive**: Resilient 24/7 autonomous operations, zero data corruption from stale or zombie workers, seamless cross-node migration, and guaranteed financial safety against unauthorized cloud billing.
- **Negative**: Distributed workers require network connectivity to the coordinator, and SQLite write concurrency requires careful transaction management under high job throughput.


