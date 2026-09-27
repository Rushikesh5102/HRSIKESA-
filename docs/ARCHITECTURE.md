# HṚṢĪKEŚA (हृषीकेश) — System Architecture

> **International Filesystem / ASCII Alias:** `HRISEKESA`  
> **Status:** Foundation Performance & Execution Block FP-17 — Universal Digital Creation & Media Studio (COMPLETED & VERIFIED)  
> **Creator & Sole Master:** Rushikesh Pattiwar  
> **Primary Development IDE:** Antigravity  

---

## 1. System Overview

**HṚṢĪKEŚA** (हृषीकेश — *The Master of the Senses, The Orchestrator*) is a sovereign personal AI operating system and autonomous AI workforce designed exclusively for its creator, Rushikesh Pattiwar.

HṚṢĪKEŚA is **not** a new foundation model. It is an orchestration, cognition, and execution control plane that transforms raw language models into an integrated personal workforce capable of operating computer environments, software tools, and autonomous multi-agent missions.

### Core Philosophy

The design of HṚṢĪKEŚA is governed by a strict biological and computational analogy:

```
┌────────────────────────────────────────────────────────┐
│                        BRAIN                           │
│     LLMs / Reasoning Models (Local & Cloud Tier)        │
└──────────────────────────┬─────────────────────────────┘
                           │ Intent & Cognition
┌──────────────────────────▼─────────────────────────────┐
│                    NERVOUS SYSTEM                      │
│             HṚṢĪKEŚA Agent Runtime Core                │
│    (Task Routing, Event Bus, Governance, Scheduling)   │
└──────┬───────────────────┬───────────────────┬─────────┘
       │ Knowledge         │ Actions           │ Perception
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼─────────┐
│   MEMORY    │     │    HANDS    │     │     WORLD      │
│ Long-Term   │     │ Tools / MCP │     │ Operating Env  │
│ Multi-Tier  │     │ Skills / API│     │ Desktop / VDI  │
│ Persistence │     │ Automation  │     │ Browser / Shell│
└─────────────┘     └─────────────┘     └────────────────┘
```

- **LLM = Brain:** The reasoning, planning, and language comprehension engine.
- **Tools = Hands:** The actuators that execute actions (MCP servers, scripts, APIs, CLI commands).
- **Memory = Long-Term Knowledge:** The persistent, structured, auditable cognitive state across sessions and projects.
- **Agent Runtime = Nervous System:** The reactive, event-driven orchestration core coordinating thoughts and actions.
- **Computer / Environment = World:** The operational environment (Windows desktop, browsers, terminals, VDIs, filesystems).
- **HṚṢĪKEŚA = The Control Plane:** The sovereign master orchestrator binding all subsystems into a unified workforce.

---

## 2. Component Architecture

The HṚṢĪKEŚA architecture is organized into eight decoupled, modular layers:

```mermaid
graph TD
    User([Rushikesh Pattiwar - Sovereign Master]) <--> Gateway[Unified Gateway: Web UI / CLI / Voice / IPC]
    
    subgraph Control_Plane [HṚṢĪKEŚA Control Plane]
        Gateway <--> Auth[Identity & Authority Enclave]
        Auth <--> Orch[Master Orchestration Engine]
        Orch <--> Scheduler[Resource & Concurrency Scheduler]
    end

    subgraph Workforce_Engine [Multi-Agent Workforce Subsystem]
        Orch <--> TeamMgr[Project & Company Manager]
        TeamMgr <--> Agents[Agent Registry & Runtime: Arjuna, Chanakya, Arya, etc.]
    end

    subgraph Cognition_Layer [Model & Cognition Layer]
        Agents <--> ModelRouter[Model Broker & Dynamic Router]
        ModelRouter <--> LocalModels[Local AI: Ollama 0.34.2]
        ModelRouter <--> CloudModels[Authorized Cloud: Anthropic / OpenAI / Google]
    end

    subgraph Memory_Subsystem [Persistent Memory Subsystem]
        Agents <--> MemBus[Unified Memory Bus]
        MemBus <--> RelationalDB[(SQLite: Relational & Auditing)]
        MemBus <--> VectorDB[(Vector Store: Embeddings & Docs)]
        MemBus <--> KnowledgeIngest[Knowledge Ingestion & ChatGPT History]
    end

    subgraph Execution_Layer [Hands & Actuation Layer]
        Agents <--> ToolBus[Tool & Skill Bus / MCP Hub]
        ToolBus <--> MCPServers[Local & Remote MCP Servers]
        ToolBus <--> SkillsRegistry[Dynamic Skills Registry]
    end

    subgraph Environment_Layer [Environment & Computer Operator]
        ToolBus <--> EnvMgr[Environment Manager]
        EnvMgr <--> LocalDesktop[Local Windows Desktop & Shell]
        EnvMgr <--> BrowserEnv[Browser Automation Engine]
        EnvMgr <--> VDIEnv[VDI / Remote Desktop External Operator]
        EnvMgr <--> AppOperators[Software Operators: Blender, VS Code, IDEs]
    end
```

---

## 3. Module Boundaries

To ensure zero vendor lock-in, maintainability, and clear separation of concerns, all inter-module communication is mediated through strictly typed contracts:

| Module | Boundary & Responsibility | Explicit Non-Responsibilities |
| :--- | :--- | :--- |
| `core/identity` | Rushikesh authority validation, cryptographic signatures, human-in-the-loop (HITL) gates | Executing tools, prompt engineering |
| `core/orchestrator` | High-level goal decomposition, DAG generation, state machine | Direct OS calls, model API calls |
| `core/scheduler` | Memory, CPU, token budget enforcement, priority queues | Task planning, agent logic |
| `agents/` | Role execution, scratchpad management, inter-agent messaging | Direct hardware or OS interaction |
| `models/` | Normalizing prompts, completions, streaming, tool definitions | Deciding *which* task to run |
| `memory/` | Storing, indexing, and querying multi-tier state and documents | Business logic, direct tool invocation |
| `tools/` | MCP client/server management, sandboxed execution, verification | Persisting long-term agent state |
| `environments/` | Abstraction for Windows, terminal, browser, and remote VDI | Planning how applications are used |

---

## 4. Proposed Technology Choices

### Target Hardware Profile
- **Machine:** Acer Swift SFG14-73T
- **Processor:** Intel Core Ultra 5 125H (14 cores / 18 threads: 4 P-cores, 8 E-cores, 2 LP E-cores, integrated Intel AI Boost NPU)
- **RAM:** 15.7 GB (~16 GB LPDDR5X)
- **Graphics:** Intel Arc Graphics (integrated, ~2 GB allocated pool, dynamic shared system memory)
- **Host OS:** Windows 11 (64-bit)

### Language & Runtime Strategy
1. **Orchestration & Gateway Layer (Node.js 24 + TypeScript):**
   - *Rationale:* Event-driven I/O, ultra-low idle memory footprint (<80 MB), native MCP SDK support, rich asynchronous stream processing, and seamless desktop UI integration (Fastify / Vite / Electron / Tauri).
2. **Environment & Native Computation Worker (Python 3.14):**
   - *Rationale:* Automation scripting, PyAutoGUI, OpenCV, Windows UI Automation bindings, Blender Python headless scripting, and scientific data manipulation.
3. **Database & Storage (SQLite with WAL mode + sqlite-vec):**
   - *Rationale:* Embedded zero-cost, zero-maintenance storage. Consumes under 10 MB RAM, completely avoiding resource-heavy PostgreSQL or Docker daemons on a 16 GB laptop.

---

## 5. Local vs. Cloud Architecture

HṚṢĪKEŚA employs a **Local-First, Cloud-Burst** hybrid model:

```
                      [ Incoming Task / Objective ]
                                    │
                       Complexity & Privacy Triage
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
     [ Local Tier (Ollama) ]                      [ Cloud Burst Tier ]
  - 3B to 7B Quantized Models                  - Frontier Models (Claude, GPT, Gemini)
  - Zero-cost, 100% private                    - Complex reasoning & deep architecture
  - Classification, triage, quick tool calls   - Code synthesis & multi-modal inspection
  - Offline autonomous execution               - Pay-per-use, authorized API keys
             │                                             │
             └──────────────────────┬──────────────────────┘
                                    ▼
                         [ Action & Verification ]
```

### Local Tier Specification (Ollama 0.34.2)
- Target sizes: 3B to 7B parameter models (e.g., Llama 3.2 3B, Qwen 2.5 7B Q4_K_M).
- Memory footprint: ~2.5 GB to 5.0 GB RAM, leaving 10+ GB for the operating system, IDE, browser, and user tasks.
- Target use cases: Intent classification, short-horizon tool parameter generation, local status reporting, privacy-sensitive offline operations.

### Cloud Tier Specification
- Providers: Anthropic (Claude 3.7 Sonnet / 3.5 Sonnet), OpenAI (GPT-4o, o3-mini), Google (Gemini 2.5 Flash / Pro).
- Target use cases: Large-scale refactoring, complex research synthesis, strategic planning, high-accuracy document parsing.

---

## 6. Model Provider Abstraction

The Model Broker decouples agent logic from specific AI vendors:

```typescript
interface IModelProvider {
  id: string;
  name: string;
  isLocal: boolean;
  capabilities: {
    maxContextTokens: number;
    supportsVision: boolean;
    supportsTools: boolean;
    supportsStructuredOutput: boolean;
  };
  metrics: {
    costPerMillionInputTokens: number;
    costPerMillionOutputTokens: number;
    averageLatencyMs: number;
  };
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;
}
```

### Routing & Fallback Policies
- **Cost-Optimized Route:** Evaluates if a 7B local model can fulfill the task with >=95% confidence. If not, routes to high-efficiency cloud model (e.g., Gemini Flash or Claude Haiku).
- **Capability-Based Route:** Multimodal vision tasks route to vision-capable providers; deep coding missions route to verified frontier reasoning models.
- **Resilience Cascade:** If a cloud provider encounters rate-limits, network timeouts, or service degradation, the router seamlessly falls back through authorized secondary providers down to local Ollama.
- **Security Compliance:** Model switching is never used to circumvent vendor safety guardrails or access policies.

---

## 7. Memory Architecture

HṚṢĪKEŚA rejects the "single generic vector table" antipattern in favor of a **14-tier structured memory architecture** backed by an embedded SQLite relational foundation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STRUCTURED MEMORY TIERS                         │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. Core Identity         │ System sovereignty, foundational directives │
│ 2. Creator Profile       │ Rushikesh Pattiwar personal & career profile│
│ 3. Operating Principles  │ Autonomy, safety, zero-cost & VDI rules     │
│ 4. Preferences           │ Explicit communication & workflow settings  │
│ 5. Conversational/Episode│ Dialogue history & episodic milestones      │
│ 6. Project Memory        │ Per-project missions, specs, architectures  │
│ 7. Agent Memory          │ Learned agent-specific roles & heuristics   │
│ 8. Decisions             │ ADR-style log of all autonomous decisions   │
│ 9. Knowledge             │ Indexed reference materials & search index  │
│ 10. Skills               │ Discovered, verified, and configured tools  │
│ 11. Tool State           │ MCP tool connections, cache & status        │
│ 12. Task History         │ DAGs, step logs, execution statuses         │
│ 13. Documents/References │ Ingested specs, manuals, and papers         │
│ 14. Audit History        │ Provenance audit trail & security log       │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### Persistence Subsystem Implementation (Phase 3B — IMPLEMENTED)

1. **Native SQLite Engine (`src/persistence/database/database.manager.ts`):**
   - Built on Node.js 24 native `node:sqlite` (`DatabaseSync`). Zero external dependencies.
   - File storage at `data/hrisekesa.db` (strictly `.gitignored`).
   - Concurrency & Reliability PRAGMAs:
     - `PRAGMA journal_mode = WAL;` (non-blocking concurrent reads)
     - `PRAGMA foreign_keys = ON;` (cascading deletes & strict referential integrity)
     - `PRAGMA synchronous = NORMAL;` (optimal speed and durability balance)
     - `PRAGMA busy_timeout = 5000;` (5-second lock resilience)

2. **Schema & Migration Ledger (`src/persistence/migrations/`):**
   - `schema_migrations` ledger ensures atomic, ordered schema upgrades.
   - `sessions`: Durable conversation threads (`id`, `title`, `status`, `created_at`, `updated_at`, `metadata`).
   - `messages`: Chronologically ordered conversation turns with strictly sequenced `ordinal` integers and `session_id` foreign keys.
   - `memory_items`: Universal structured store backing all 14 memory tiers with provenance metadata (`id`, `tier`, `key`, `content`, `source`, `provenance`, `confidence`, `created_at`, `updated_at`, `metadata`).

3. **Repository Layer (`src/persistence/repositories/`):**
   - `SessionRepository`: Thread CRUD and status tracking.
   - `MessageRepository`: Chronological and recent turn queries.
   - `MemoryRepository`: Universal structured CRUD, tier filtering, and keyword search.

4. **Context Assembler (`src/conversation/context.assembler.ts`):**
   - Assembles prompt context dynamically:
     - Sovereign identity prompt (anchored at index 0).
     - Structured creator profile summary (Rushikesh Pattiwar).
     - Relevant active memories (from explicit preferences/principles).
     - Bounded conversation sliding window (max 12 messages / 8,000 characters).

5. **ChatGPT Ingestion Subsystem (`src/memory/import/` — IMPLEMENTED):**
   - `ChatGptImporter` parses authorized ChatGPT export JSON (`conversations.json`).
   - Normalizes conversation mapping DAGs into linear threads.
   - Assigns explicit provenance tags (`source: 'chatgpt_export'`, `provenance: 'imported'`).
   - Supports dry-run validation, session persistence, and episodic memory extraction.

### Planned Memory Capabilities (Future Phases)
- **Vector Embedding Store (Phase 3C / Future):** Dedicated semantic vector index for fuzzy recall.
- **Dynamic Episodic Summarization:** Autonomous background compression of historical dialogues into milestone episodes.

---

## 8. Agent Architecture

### Organizational Hierarchy

```
                      Rushikesh Pattiwar
                     (Sole Master & Owner)
                              │
                         HṚṢĪKEŚA
               (Personal OS / Orchestrator)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Project Director              Department Head
     (e.g., Chanakya - SAHIKARA)    (e.g., Vikram - Engineering)
               │                             │
               └──────────────┬──────────────┘
                              ▼
                       Specialist Agent
                 (e.g., Arjuna - Lead Coder)
                              │
                              ▼
                         Tool Worker
                   (MCP / Sandbox Execution)
```

### Core Workforce Roster (Indian-Inspired Sovereign Identities)
Names and roles are strictly decoupled. Standard default appointments include:

| Agent Name | Historical / Philosophical Resonance | Default Specialty Domain |
| :--- | :--- | :--- |
| **Arjuna** | Peerless focus, precision execution | Lead Systems Engineer & Code Construction |
| **Chanakya** | Master strategist, political economy | Project Director, Strategy & Mission Decomposition |
| **Kautilya** | Governance, statecraft, resource allocation | Scheduler, Resource Manager & Operations |
| **Arya** | Noble, seeker of truth | Research, Architecture Review & Synthesis |
| **Vikram** | Valorous, decisive, enterprising | DevOps, Infrastructure, Tooling & Build Lead |
| **Aditi** | Boundless, cosmic guardian | Security Enclave, Compliance, Verification & Safety |
| **Karna** | Unflinching dedication, resilience | Quality Assurance, Error Recovery & Edge Testing |
| **Dhruva** | Steadfast, unshakeable | Persistent Memory, Document Ingestion & State Keeper |
| **Agastya** | Great sage, synthesizer of oceans of knowledge | Documentation, Technical Writing & Knowledge Base |
| **Varun** | Lord of oceans, cosmic order, network skies | Network, External APIs, Cloud Providers & Sync |

### Agent Lifecycle & Contract
Every agent possesses:
1. **Persistent Identifier (`uuid`):** Constant across reboots.
2. **Dynamic Role & Department:** Reconfigurable per project.
3. **Scoped Tool Permissions:** White-listed tools based on least-privilege.
4. **Working Scratchpad:** Short-term task-specific memory.
5. **Observation-Action-Verification Cycle:** No agent marks a task complete without programmatic verification.

---

## 9. Tool / Skill / MCP Architecture (Phase 4 Specification)

Tools represent the physical actuation layer ("Hands") of HṚṢĪKEŚA.

```
                    HṚṢĪKEŚA Control Plane
                              │
                         Model Router
                              │
                    Model Tool Proposal
                              │
                        Tool Registry
                              │
                     Permission Manager
                   (Workspace & Danger Tiers)
                              │
                    Human Approval Gate
                 (Required for Tiers 3 & 4)
                              │
                     Tool Execution Bus
                      /       |       \
                     /        |        \
               Built-in      MCP      Future
                 Tools      Tools     Skills
```

### 1. Vendor-Neutral Tool Contract (`src/tools/interfaces/tool.types.ts`)
Each tool implements the `ITool<TInput, TOutput>` interface:
- `id`: Unique dot-notated identifier (e.g. `filesystem.list`, `system.info`).
- `name` & `description`: Human-readable and model-consumable definitions.
- `version`: SemVer string (e.g., `1.0.0`).
- `category`: Classification (`system`, `filesystem`, `ollama`, `terminal`, `mcp`, etc.).
- `inputSchema`: Strict JSON-Schema compatible input specification.
- `outputSchema`: Optional JSON-Schema defining output structure.
- `riskLevel`: Assigned `DangerTier` (`TIER_0` through `TIER_4`).
- `requiresApproval`: Boolean indicating mandatory human confirmation.
- `capabilities`: Readonly array of capability tags (e.g. `filesystem.read`, `system.inspect`).
- `execute(input, context)`: Async execution method receiving validated input and `ToolExecutionContext`.

### 2. Tool Execution Pipeline (`src/tools/execution/tool.bus.ts`)
The `ToolExecutionBus` enforces a mandatory 7-stage pipeline:
1. **Tool Resolution:** Resolves tool from `ToolRegistry`; returns 404 error if not found.
2. **Schema Validation:** Validates arguments against `inputSchema` (ensures required fields, correct types).
3. **Permission Evaluation:** `PermissionManager` checks danger tier, user identity (`ROOT_RUSHIKESH`), environment, and workspace boundary.
4. **Approval Gate:** If decision is `REQUIRE_APPROVAL`, creates/verifies a structured, time-bounded `ApprovalRequest`.
5. **Sandboxed Execution:** Dispatches tool execution within try/catch safety wrapper.
6. **Result Validation:** Ensures execution result satisfies contract and includes execution duration.
7. **Redacted Auditing:** Dispatches `ToolAuditRecord` to `ToolAuditLogger` (redacting sensitive keys like passwords, tokens, API keys) and persists into SQLite `memory_items`.

### 3. Model Context Protocol (MCP) Foundation (`src/tools/mcp/`)
- **JSON-RPC 2.0 Engine:** Implements the official MCP protocol specifications (`initialize`, `tools/list`, `tools/call`).
- **Transport Layer (`IMcpTransport`):**
  - `InMemoryMcpTransport`: High-speed in-process transport for unit testing and local mock servers.
  - `StdioMcpTransport`: Process-isolated standard I/O transport for external MCP CLI servers.
- **`McpClientAdapter`:**
  - Connects to MCP servers, discovers capabilities, and normalizes external tool definitions into standard `ITool` contracts.
  - Dynamically maps external tools into `DangerTier`s (defaulting to `TIER_2` unless explicitly configured).
  - Routes all MCP executions through HṚṢĪKEŚA's sovereign `ToolExecutionBus`, preventing external servers from bypassing HṚṢĪKEŚA governance.

### 4. Built-in Safe Tools (`src/tools/builtin/`)
- `system.info` (Tier 0): Host CPU, RAM, OS, platform, and Node.js runtime information.
- `filesystem.list` (Tier 0): Sandboxed workspace directory listing with size and timestamp metadata.
- `filesystem.read` (Tier 0): Sandboxed UTF-8 text file reading with 1 MB safety ceiling.
- `filesystem.write` (Tier 1): Sandboxed atomic file writing with automated directory creation.
- `time.now` (Tier 0): Current local and UTC system time with ISO, Unix, and timezone data.
- `ollama.models` (Tier 0): Lists locally installed Ollama models and capacities.
- `ollama.chat` (Tier 1): Bounded secondary model invocation with token limits (prevents infinite recursive loops).
- `terminal.execute` (Tier 1): Whitelisted diagnostic commands only (`dir`, `ls`, `echo`, `node -v`, `git status`, `hostname`). Arbitrary command execution is strictly forbidden in Phase 4.

### 5. Model Tool-Calling Loop (`src/conversation/conversation.service.ts`)
- Injects registered tool schemas into the model request via `IModelProvider`.
- Detects structured tool call proposals from `qwen2.5:7b` (via native Ollama function calling).
- Executes proposed tools via `ToolExecutionBus`.
- Feeds execution results back into dialogue context as `role: 'tool'`.
- Bounded to `maxToolIterations = 2` to prevent infinite recursive tool hallucination loops.

---

## 10. Computer / Environment Architecture

The `EnvironmentManager` abstracts physical interaction environments:

```typescript
interface IEnvironmentOperator {
  id: string;
  type: 'local-desktop' | 'terminal' | 'browser' | 'vdi' | 'app-scripting';
  isAvailable(): Promise<boolean>;
  executeCommand(cmd: string, cwd?: string): Promise<ExecutionResult>;
  captureVisualState(): Promise<Buffer>;
  sendInput(event: InputEvent): Promise<void>;
  inspectWindow(titleQuery: string): Promise<WindowState | null>;
}
```

### Software Operator Pattern (e.g., Blender, Android Studio, CAD)
Instead of bespoke scripts for every application, HṚṢĪKEŚA uses a layered interaction pattern:
1. **Detection & Status:** Checks executable presence and version via Windows Registry / PATH.
2. **Application Scripting / API (Preferred):** Interacts via headless CLI flags, Python APIs (e.g., `blender --background --python script.py`), or Language Server Protocols.
3. **GUI Automation (Fallback / Visual Verification):** Uses Windows UI Automation (UIA) tree inspection and computer-vision-guided clicks/keystrokes when no programmatic API exists.

---

## 11. Security Architecture

Security is non-negotiable and foundational.

### Rushikesh Identity & Sovereign Authority
- Rushikesh Pattiwar is registered as the sole Root Administrator (`Subject ID: ROOT_RUSHIKESH`).
- All dangerous operations, financial transactions, credential modifications, and critical file deletions require cryptographic signature or direct interactive authorization from Rushikesh.

### Action Danger Tiers & Approval Gates

| Tier | Category | Examples | Execution Policy |
| :--- | :--- | :--- | :--- |
| **Tier 0** | Pure Read-Only | Read code, query DB, check system status | Autonomous execution |
| **Tier 1** | Local Reversible | Create temporary scratch file, run tests | Autonomous with audit logging |
| **Tier 2** | State-Changing | Git commit, install vetted dependency, edit project source | Autonomous if in project scope; prompt if unexpected |
| **Tier 3** | System Modification | Install desktop software, edit registry, kill process | **Mandatory Human Approval Gate** |
| **Tier 4** | Critical / Sensitive | Push to remote main, expose network port, wipe directory | **Explicit Confirmation with Diff Preview** |

### Credential Safety Rules
- Zero hardcoded tokens, passwords, or API keys in source files or git history.
- Use Windows Credential Manager and encrypted local `.env` files outside version control.

---

## 12. Project / Company Architecture

HṚṢĪKEŚA natively models multi-tenant enterprise and project structures:

```
HṚṢĪKEŚA Root
├── Workspace: SAHIKARA (Autonomous Company / Initiative)
│   ├── Charter: Mission, Objectives, Target Deliverables
│   ├── Departments: Research, Engineering, Security, QA, Docs
│   ├── Assigned Workforce: [Chanakya (Dir), Arjuna (Tech), Aditi (Sec)]
│   ├── Memory Namespace: `memory/projects/sahikara/`
│   └── Filesystem Root: `workspaces/sahikara/`
│
├── Workspace: Startup-2 (Exploratory Commercial Project)
└── Workspace: Personal-Projects (Productivity & Infrastructure)
```

Each project is an isolated sandbox with dedicated milestones, Git branches, log streams, and memory scopes.

---

## 13. Scheduler / Resource Architecture

HṚṢĪKEŚA provides an **Unlimited Mission abstraction on strictly bounded hardware**:

### Hardware Constraints (Acer Swift SFG14-73T)
- Total RAM: 15.7 GB
- Reserved for Windows OS + Antigravity IDE + Desktop: ~6.0 GB
- Max Available Budget for HṚṢĪKEŚA Runtime: ~9.5 GB
  - Local LLM allocation (when active): ~4.5 GB (e.g., 7B Q4 model)
  - Memory / Vector / Orchestration cache: ~1.5 GB
  - Working subprocesses (compilers, linters, tests): ~3.5 GB

### Scheduler Controls
- **Concurrency Limiter:** Exactly **one** active local LLM inference request at any time to prevent VRAM thrashing; cloud requests can multiplex up to configured rate limits.
- **Priority Task Queues:**
  - `P0_CRITICAL`: User direct interactions & HITL responses.
  - `P1_INTERACTIVE`: Real-time conversational responses and voice.
  - `P2_ACTIVE_TASK`: Focused foreground agent execution.
  - `P3_BACKGROUND`: Document indexing, repository evaluation, memory summarization.
- **Preemptive Pause:** Background tasks yield CPU and memory immediately when Rushikesh initiates direct interactive requests.

---

## 14. Voice Architecture

Voice is architected as a first-class continuous interface rather than a disconnected afterthought:

```
[ Microphone Input ]
         │
[ WebRTC / Local Audio Stream ]
         │
[ Voice Activity Detection (VAD) - Silero VAD ]
         │
[ Speech-to-Text (STT) - Local Faster-Whisper / Cloud Whisper ]
         │
[ HṚṢĪKEŚA Orchestrator Core ] ◄── (Barge-in / Interrupt Trigger)
         │
[ Streaming Text Output ]
         │
[ Text-to-Speech (TTS) - Local Kokoro-82M / Piper / Cloud TTS ]
         │
[ Audio Output Stream ]
```

- **Low-Latency Streaming:** Audio is chunked and streamed concurrently with LLM token generation.
- **Barge-In Support:** Microphone activity during TTS speech immediately triggers an interruption event, pausing output and listening to the user.

---

## 15. Future Portable Architecture

HṚṢĪKEŚA is designed for seamless portable execution (e.g., from an external NVMe SSD):
1. **Isolated Data Directory:** All databases, configurations, local models, and logs reside under a configurable `HRISEKESA_HOME` directory.
2. **Relative Pathing:** No hardcoded absolute paths in database records or project manifests.
3. **Self-Contained Engine:** Can be bundled as a standalone portable runtime package requiring no pre-installed dependencies on the host machine.

---

## 16. Future VDI / Remote Desktop Architecture

Operating authorized enterprise VDI sessions (e.g., Citrix, VMware Horizon, Remote Desktop):

```
┌────────────────────────────────────────────────────────┐
│               LOCAL HOST (Acer Swift Laptop)           │
│                                                        │
│  ┌──────────────────────┐    Screen Grab & OCR         │
│  │ HṚṢĪKEŚA Environment │ ◄──────────────────────┐     │
│  │       Operator       │                        │     │
│  └──────────┬───────────┘                        │     │
│             │ Injected Mouse/Keys                │     │
│             ▼                                    │     │
│  ┌─────────────────────────────────────────┐     │     │
│  │ Client Window: Authorized VDI Session   │ ────┘     │
│  │ (No HṚṢĪKEŚA software installed inside) │           │
│  └─────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────┘
```

### Ethical & Security Principles for VDI
- **Non-Invasive:** Zero installation inside the VDI environment.
- **Authorized Only:** Operates purely within sessions Rushikesh has legitimately authenticated.
- **No Evasion:** Strictly **never** designed to bypass DLP, defeat monitoring, bypass CAPTCHA, or subvert enterprise endpoint security.

---

## 17. Major Open-Source Components Worth Evaluating

| Component | Category | Strengths | Relevance to HṚṢĪKEŚA |
| :--- | :--- | :--- | :--- |
| **Ollama** | Local LLM Serving | Native Windows support, lightweight, clean REST API | Core local engine (Installed v0.34.2) |
| **Model Context Protocol (MCP)** | Tool Standard | Open standard by Anthropic, broad adoption, typed | First-class tool communication protocol |
| **LiteLLM** | Model Proxy | 100+ model normalization, cost tracking, fallbacks | Model abstraction layer reference |
| **Playwright** | Browser Automation | Fast, headless/headed, robust selector engine | Browser interaction engine |
| **Windows UI Automation (pywinauto / UIA)** | Desktop Automation | Native Windows accessibility tree inspection | Desktop software interaction |
| **Faster-Whisper / Whisper.cpp** | STT | Fast, quantized, CPU/GPU accelerated speech recognition | Local voice input pipeline |
| **Kokoro-82M / Piper-TTS** | TTS | Ultra-fast, high naturalness, tiny memory footprint | Local voice output pipeline |
| **SQLite + sqlite-vec** | Embedded Vector DB | In-process, C-based, instant startup, zero RAM bloat | Primary structured and vector memory |

---

## 18. Explicit Reasons for Each Component Choice

- **Why SQLite over PostgreSQL / Docker?** A 16 GB laptop cannot afford 1.5–3.0 GB of memory consumed by idle Docker daemons. SQLite runs in-process with microsecond latencies.
- **Why Node.js + TypeScript for the Orchestrator?** Node 24 offers native ESM, exceptional asynchronous event handling for dozens of agents, official MCP SDKs, and tiny idle memory consumption.
- **Why Python for the Desktop Worker?** Python possesses the most mature libraries for Windows UI Automation, OpenCV computer vision, and Blender scripting.
- **Why Ollama for Local Models?** Ollama handles GGUF quantization, model swapping, and hardware detection out of the box without requiring manual CUDA/DirectX compile chains.

---

## 19. Components We Should Build Ourselves

1. **HṚṢĪKEŚA Orchestration Plane:** The central nervous system uniting agents, tasks, and environments.
2. **14-Tier Structured Memory Engine:** Specifically customized for Rushikesh's preferences, project histories, and ADR-style decisions.
3. **Rushikesh Identity & Authority Enclave:** Custom zero-trust governance recognizing Rushikesh as sovereign root.
4. **Environment / Computer Operator:** Unified cross-environment actuator (Windows Desktop, VDI, Shell, Browser).
5. **Multi-Agent Workforce Lifecycle:** Agent Town runtime managing Indian-named autonomous specialists.
6. **Resource-Aware Concurrency Scheduler:** Built specifically around the 16 GB RAM / Intel Core Ultra hardware envelope.

---

## 20. Components We Should NOT Reinvent

1. **LLM Serving & Quantization:** Do not write custom tensor runtimes; use Ollama and vendor APIs.
2. **Tool Protocol Specification:** Do not invent a proprietary tool RPC; adopt the open Model Context Protocol (MCP).
3. **Browser Automation Engine:** Do not build a custom browser driver; use Playwright.
4. **Speech Recognition / Synthesis Models:** Do not train custom models; use Whisper and Kokoro/Piper.
5. **Raw Vector Math:** Do not write custom SIMD vector indexing; use `sqlite-vec` or LanceDB.

---

## 21. Multi-Agent Workforce & Mission Execution Architecture (Phase 5)

Phase 5 establishes HṚṢĪKEŚA as the top-level sovereign control plane managing a specialized, coordinated agent workforce:

```
                  Rushikesh Pattiwar (Root Authority)
                                   ↓
                         HṚṢĪKEŚA (Control Plane)
                                   ↓
                          Mission Orchestrator
                                   ↓
                       Root Task & Child Tasks (SQLite)
                                   ↓
              Agent Workforce (Arjuna, Chanakya, Arya, Aditi, Agastya)
                                   ↓
                           Agent Runtime Loop
                                   ↓
                      Model Router (qwen2.5:7b / Cloud)
                                   ↓
                       Permission Manager (Tiers 0-4)
                                   ↓
                      Tool Execution Bus / MCP Hub
                                   ↓
                       Environment / SQLite Blackboard
```

### Core Architecture Components

1. **Agent Registry & Initial Roster (`src/agents/`):**
   - Specialized personas with designated roles, tool whitelists, and maximum danger tier boundaries (all limited to `TIER_1`).
   - `arjuna`: Software Engineering & Code Construction.
   - `chanakya`: Strategic Planning, Goal Decomposition & Orchestration.
   - `arya`: Research, Documentation & Deep Analysis.
   - `aditi`: Testing, Verification, QA & Quality Gates.
   - `agastya`: Systems Diagnostics, Infrastructure & Environment Health.
2. **Persistent Task & Mission Engine (`src/persistence/repositories/`):**
   - SQLite backed tables (`agent_tasks`, `agent_missions`, `blackboard_entries`) with status lifecycles (`queued`, `running`, `waiting`, `completed`, `failed`, `cancelled`).
   - Tasks and missions survive application restarts.
3. **Constrained Delegation (`src/agents/delegation/`):**
   - `maxDelegationDepth`: 2.
   - `maxChildrenPerTask`: 5.
   - `maxActiveAgentTasks`: 3.
4. **Persistent Shared Blackboard (`src/agents/blackboard/`):**
   - Structured inter-agent communication stored in SQLite for posting and querying research findings, plans, and verification reports.
5. **Single-Inference Hardware Lock:**
   - Serial execution over `ModelRouter` ensuring local `qwen2.5:7b` inference never exhausts host RAM or freezes the OS.

---

## 22. Browser Automation & Web Inspection Subsystem (Phase 6)

Phase 6 equips HṚṢĪKEŚA with managed web browser interaction capabilities using `playwright-core` and native host browser channels:

```
                  Rushikesh Pattiwar (Root Authority)
                                   ↓
                         HṚṢĪKEŚA (Control Plane)
                                   ↓
                           Agent (e.g. Arya)
                                   ↓
                             Browser Tool
                                   ↓
                        Permission Manager (Tiers 0-1)
                                   ↓
                         Tool Execution Bus
                                   ↓
                       Playwright Browser Adapter
                                   ↓
              Host Chrome / Edge Process (Incognito Context)
                                   ↓
                     Distilled Observation / Screenshot
                                   ↓
                          Model Synthesis & Audit
```

### Core Architecture Components

1. **Vendor-Neutral Browser Contract (`src/tools/browser/interfaces/`):**
   - `IBrowserAdapter` abstracts browser lifecycles, navigation, element interaction, and screenshot capturing.
2. **Native Host Discovery with `playwright-core`:**
   - Connects to existing installed Google Chrome or Microsoft Edge channels without requiring heavyweight multi-gigabyte browser downloads.
   - Launches on-demand with ephemeral incognito contexts.
3. **Observation Distillation Engine:**
   - Distills raw HTML into clean, token-bounded visible text (max 8,000 characters), structured headings (`h1`-`h3`), and interactive element metrics (links, inputs, buttons).
   - Detects CAPTCHA, Cloudflare challenges, or bot detection walls; halts automated flow and flags `humanInterventionRequired: true`.
4. **URL Sandbox & Protocol Governance:**
   - Whitelists `http:` and `https:`.
   - Blocks dangerous local discovery protocols (`file://`, `javascript:`, `data:`, `vbscript:`, `blob:`, `about:`, `chrome:`, `edge:`).
5. **8 Standard Browser Tools in Tool Registry (`src/tools/builtin/browser/`):**
   - `browser.session.create` (Tier 0): Session initialization.
   - `browser.navigate` (Tier 1): Validated web navigation.
   - `browser.page.read` (Tier 0): Distilled page content extraction.
   - `browser.click` (Tier 1): Element interaction.
   - `browser.type` (Tier 1): Input filling with credential masking in audit trails.
   - `browser.keypress` (Tier 1): Keyboard action dispatch.
   - `browser.screenshot` (Tier 0): Visual artifact generation.
   - `browser.session.close` (Tier 0): Resource reclamation.

---

## 23. Windows Computer & Desktop GUI Control Subsystem (Phase 7)

Phase 7 endows HṚṢĪKEŚA with controlled, safe, and auditable Windows desktop automation:

```
                  Rushikesh Pattiwar (Root Authority)
                                   ↓
                         HṚṢĪKEŚA (Control Plane)
                                   ↓
                    Agent (e.g. Arjuna / Agastya)
                                   ↓
                             Computer Tool
                                   ↓
                     Permission Manager & App Allowlist
                                   ↓
                          Tool Execution Bus
                                   ↓
                       Windows Computer Adapter
                                   ↓
        Windows Native OS (Win32, System.Drawing, WScript.Shell)
                                   ↓
             Desktop Observation / Screenshot Artifact / Status
                                   ↓
                    Model Synthesis & SQLite Audit Trail
```

### Core Architecture Components

1. **Vendor-Neutral Computer Contract (`src/tools/computer/interfaces/`):**
   - `IComputerAdapter` defines screen bounds, screenshot artifacts, active window metadata, cursor positioning, button clicks, keyboard typing, keypresses, and process management.
2. **Windows Native Desktop Subsystem (`WindowsComputerAdapter`):**
   - Implemented via Windows native Win32 APIs, `System.Drawing`, `WScript.Shell`, and .NET Windows Forms.
   - Zero external npm native C++ build dependencies (completely compatible with Node 24 on Windows 11).
   - Low memory footprint (< 15 MB ephemeral RAM per invocation).
3. **Application Launch Allowlist (`ApplicationAllowlist`):**
   - Strictly confines application launching to an explicit, configured registry: `notepad`, `calculator`/`calc`, `paint`, `browser`, `android-studio`, `blender`.
   - Arbitrary shell invocations, unlisted binaries, or malicious paths are blocked immediately.
4. **Input Boundary Validation (`ComputerSecurityValidator`):**
   - Validates coordinates (x, y) against primary screen boundaries.
   - Caps typing payloads at 500 characters per call.
   - Maps special keys cleanly (`ENTER`, `TAB`, `ESCAPE`, `BACKSPACE`, `DELETE`, `SPACE`, arrow keys).
5. **9 Standard Computer Tools in Tool Registry (`src/tools/builtin/computer/`):**
   - `computer.screen.size` (Tier 0): Screen resolution and bounds query.
   - `computer.screenshot` (Tier 0): Desktop screenshot artifact saved to `data/screenshots/`.
   - `computer.window.active` (Tier 0): Active window title and process identification.
   - `computer.mouse.move` (Tier 1): Cursor movement within display bounds.
   - `computer.mouse.click` (Tier 1): Left/right/middle click.
   - `computer.mouse.double_click` (Tier 1): Double-click execution.
   - `computer.keyboard.type` (Tier 1): Keystroke typing with secret redaction.
   - `computer.keyboard.keypress` (Tier 1): Special keypress dispatch.
   - `computer.app.launch` (Tier 1): Allowlisted application launching.

---

## 24. Local Voice Subsystem Architecture (Phase 8)

Phase 8 integrates a 100% offline, local voice input and output loop:

```
                  Rushikesh Pattiwar (Microphone)
                                   ↓
                       WindowsAudioRecorder (winmm.dll)
                                   ↓
               Local Speech-to-Text (Faster-Whisper / Windows STT)
                                   ↓
                     Sovereign Conversation Service
                                   ↓
                 Model Router (qwen2.5:7b via Ollama)
                                   ↓
              Multi-Agent Workforce / Tool Bus / Permissions
                                   ↓
               Local Text-to-Speech (Piper / Windows SAPI)
                                   ↓
                        WindowsAudioPlayer (SoundPlayer)
                                   ↓
                         System Speaker Playback
```

### Core Voice Architecture Components

1. **Vendor-Neutral Voice Abstraction (`src/voice/interfaces/voice.types.ts`):**
   - Defines `ISpeechToTextProvider`, `ITextToSpeechProvider`, `IAudioRecorder`, `IAudioPlayer`, `VoicePipeline`, and `VoiceSession`.
2. **Dual-Engine Speech-to-Text (STT) (`src/voice/stt/`):**
   - `FasterWhisperSTTProvider`: High-accuracy, quantized Whisper (`tiny.en` / `base.en`) running via CTranslate2 (< 150 MB RAM).
   - `WindowsSpeechSTTProvider`: Zero-install, offline Windows Desktop Speech Recognition engine fallback.
3. **Dual-Engine Text-to-Speech (TTS) (`src/voice/tts/`):**
   - `PiperTTSProvider`: High-naturalness ONNX neural speech models.
   - `WindowsSapiTTSProvider`: Native Windows `System.Speech.Synthesis` zero-latency fallback (< 20ms synthesis).
4. **Audio Capture & Playback (`src/voice/audio/`):**
   - `WindowsAudioRecorder`: Push-to-talk WAV recording via Windows `winmm.dll` (`mciSendString`).
   - `WindowsAudioPlayer`: Low-latency audio playback via `System.Media.SoundPlayer`.
5. **Single Sovereign Pipeline (`src/voice/pipeline/voice.pipeline.ts`):**
   - Transcribed text directly invokes `ConversationService.sendMessage()`.
   - Voice inputs inherit all persistent memory, agent delegation, browser and desktop tools, permission tiers, and audit logging.

---

## 25. Semantic Windows UI Automation Subsystem (Phase 9)

Phase 9 upgrades HṚṢĪKEŚA's desktop interaction from coordinate/pixel-only automation to semantic UI understanding:

```
                  Rushikesh Pattiwar (Root Authority)
                                   ↓
                         HṚṢĪKEŚA (Control Plane)
                                   ↓
                           Agent (e.g. Arjuna)
                                   ↓
                           Semantic UI Tool
                                   ↓
                      Permission Manager & Validation
                                   ↓
                          Tool Execution Bus
                                   ↓
                        Windows UIA Adapter
                                   ↓
        Windows UI Automation Tree (UIAutomationClient / .NET)
                                   ↓
            Structured UI Element Tree & State Verification
                                   ↓
                    Model Synthesis & SQLite Audit Trail
```

### Core Architecture Components

1. **Vendor-Neutral Semantic Model (`src/tools/computer/uia/interfaces/uia.types.ts`):**
   - `UIElement`: id, name, controlType, role, automationId, className, value, enabled, visible, bounds, parentId, children.
   - `UIWindow`: title, processName, processId, handle, bounds, elements[].
   - `IUiaAdapter`: lifecycle interface for window observation, element lookup, focus, click, text entry, and keypress.
2. **Native Windows Accessibility Engine (`src/tools/computer/uia/windows/windows.uia.adapter.ts`):**
   - Implemented via Microsoft UI Automation .NET framework (`UIAutomationClient`, `UIAutomationTypes`).
   - Zero external npm C++ build dependencies (node-gyp free, 100% stable on Node 24 + Windows 11).
   - Low memory footprint (< 25 MB ephemeral RAM per invocation).
3. **6 Standard Semantic UI Tools in Tool Registry (`src/tools/builtin/computer/uia.tools.ts`):**
   - `computer.ui.observe` (Tier 0): Structured, filtered observation of the active window element tree.
   - `computer.ui.find` (Tier 0): Semantic search by name, controlType, automationId, className, or role.
   - `computer.ui.focus` (Tier 1): Focus an element by ID or search criteria.
4. **Security & Context Budget Guardrails (`src/tools/computer/uia/security/uia.security.ts`):**
   - Tree depth capped to max 5 (default 3); element count capped to max 150 (default 60); text truncated to max 500 chars.
   - Sensitive password, PIN, token, and credential fields automatically redacted (`[REDACTED]`).
   - Stale element reference protection rejects IDs when the active window changes.
   - Coordinate/pixel tools (`computer.mouse.*`, `computer.keyboard.*`, `computer.screenshot`) preserved as fallback primitives.

---

## 26. Software & Environment Manager Subsystem (Phase 10)

Phase 10 establishes HṚṢĪKEŚA's authoritative software discovery, executable verification, process lifecycle tracking, and controlled package management architecture:

```
                  Rushikesh Pattiwar (Root Authority)
                                   ↓
                         HṚṢĪKEŚA (Control Plane)
                                   ↓
                       Agent (e.g. Arjuna / Agastya)
                                   ↓
                           Environment Tool
                                   ↓
                Permission Manager & Security Validator
                                   ↓
                          Tool Execution Bus
                                   ↓
                         Environment Manager
                   ┌───────────────┼───────────────┐
                   ↓               ↓               ↓
            App Discovery   Process Manager   winget Adapter
                   ↓               ↓               ↓
            Start Menu /     PID Tracking /   Constrained
            App Paths /      Readiness Polling Package Mgmt /
            Known Catalog    Safe Terminate   UAC Handling
```

### Core Architecture Components

1. **Vendor-Neutral Environment Contracts (`src/environment/interfaces/environment.types.ts`):**
   - `ApplicationInfo`: id, name, publisher, version, executablePath, installPath, source, installed, running, processIds, capabilities, lastVerifiedAt.
   - `ProcessInfo`: pid, processName, executablePath, startTime, status, isHrisekesaSpawned, applicationId.
   - `ApplicationLaunchResult`: success, applicationId, applicationName, processId, status (`STARTING`, `READY`, `FAILED`, `TIMEOUT`, `UNKNOWN`), windowTitle, durationMs, error.
   - `PackageInfo`: id, name, version, publisher, source, description, installed, isAvailable.
2. **Multi-Source Application Discovery (`src/environment/discovery/app.discovery.ts`):**
   - Discovers installed Windows software across 4 complementary non-recursive vectors:
     - Known Application Catalog (`src/environment/discovery/known.apps.ts`): Blender, VS Code, Git, Node.js, Python, Ollama, Chrome, Edge, Notepad, Calculator, Paint, Android Studio.
     - Windows Start Menu shortcuts (User & All Users Start Menu `.lnk` shortcut targets).
     - Windows Registry App Paths (`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths` & `HKCU`).
     - System PATH resolution via `where.exe`.
3. **Authoritative Process Lifecycle & Readiness Polling (`src/environment/process/process.manager.ts`):**
   - Spawns validated executables using detached Windows processes with safe argument arrays.
   - Tracks every launched process (`isHrisekesaSpawned: true`, PID, launch timestamp).
   - Dynamically polls application readiness signals:
     - Verifies spawned process existence via `tasklist`.
     - Inspects active window title and process ID via UIA integration (`observeActiveWindow()`).
     - Emits structured readiness statuses (`READY`, `STARTING`, `FAILED`, `TIMEOUT`).
   - Safe process termination: rejects termination of protected system processes (PID 0, 4, `csrss`, `lsass`, `winlogon`, `explorer`, `svchost`, etc.) and permits termination only for HṚṢĪKEŚA-spawned processes or explicitly authorized targets.
4. **Constrained Package Manager Adapter (`src/environment/installers/winget.adapter.ts`):**
   - Encapsulates Windows Package Manager (`winget.exe`) without exposing arbitrary shell execution.
   - Strictly validates package IDs (`/^[a-zA-Z0-9\-_.]+$/`) and search queries.
   - Detects UAC elevation requirements and returns `humanInterventionRequired: true` without attempting bypass.
5. **10 Standard Environment Tools in Tool Registry (`src/tools/builtin/environment/`):**
   - `environment.applications.list` (Tier 0): Lists discovered applications.
   - `environment.application.find` (Tier 0): Searches applications by name or query.
   - `environment.application.status` (Tier 0): Returns installation, version, and running status.
   - `environment.application.launch` (Tier 1): Launches a verified application and awaits readiness.
   - `environment.process.list` (Tier 0): Lists active desktop processes with HṚṢĪKEŚA ownership tags.
   - `environment.process.inspect` (Tier 0): Detailed PID inspection.
   - `environment.process.terminate` (Tier 2): Terminates a process with mandatory human authorization.
   - `environment.package.search` (Tier 0): Searches legitimate packages via `winget`.
   - `environment.package.inspect` (Tier 0): Inspects package metadata.
   - `environment.package.install` (Tier 2): Installs packages subject to human approval and UAC gates.

---

## 27. Control Center & Agent Town Subsystem (Phase 11)

Phase 11 introduces the sovereign web-based user interface and topological workforce visualization for HṚṢĪKEŚA:

```
                            Rushikesh Pattiwar (Master)
                                         ↓
                       Web Browser (http://127.0.0.1:4200)
                                         ↓
                     ┌───────────────────────────────────────┐
                     │     Control Center SPA (React/Vite)   │
                     ├───────────────────┬───────────────────┤
                     │ Command Center    │ Chat Interface    │
                     │ Agent Town (SVG)  │ Governed Tools    │
                     │ Human Approvals   │ 14-Tier Memory    │
                     │ Environment & OS  │ Models & Routing  │
                     │ Immutable Audit   │ Sovereign Settings│
                     └───────────────────┴───────────────────┘
                                         ↓  HTTP & SSE (/events)
                     ┌───────────────────────────────────────┐
                     │      HṚṢĪKEŚA Native HTTP Server       │
                     ├───────────────────┬───────────────────┤
                     │ EventBus SSE      │ API Gateways      │
                     │ Static SPA Serve  │ Security Boundary │
                     └───────────────────┴───────────────────┘
                                         ↓
                     ┌───────────────────────────────────────┐
                     │        HṚṢĪKEŚA Kernel Engine         │
                     │ (ToolExecutionBus • PermissionManager) │
                     └───────────────────────────────────────┘
```

### Core Architecture Components

1. **Lightweight Frontend Architecture (`ui/`):**
   - Built with React 18, TypeScript, Vite 6, and Lucide icons.
   - Tailored custom CSS design system implementing a dark futuristic aesthetic with cyan, indigo, and emerald accents, glassmorphism cards, and zero heavy UI runtime dependencies.
   - Compiles to a static distribution bundle in `ui/dist` with a total gzipped size of ~67 kB.
2. **Authoritative Backend Serving & Routing (`src/api/http.server.ts`):**
   - Native HTTP server serves static assets from `ui/dist` with single-page application (SPA) client-side route fallback for all top-level views.
   - EventBus is wired directly to an SSE stream on `GET /events` to broadcast live audit records, agent state changes, and approval notifications to the browser without polling loops.
3. **Topological Agent Town Visualization (`ui/src/views/AgentTown.tsx`):**
   - Renders the 5 real workforce agents (Arjuna, Chanakya, Arya, Aditi, Agastya) arranged topologically around the central HṚṢĪKEŚA Core kernel.
   - Displays real runtime state (`IDLE`, `RUNNING`, `WAITING`, `BLOCKED`, `COMPLETED`, `FAILED`), active task assignments, delegation paths, and live inspection modal profiles.
4. **Governed Human-in-the-Loop Approval Panel (`ui/src/views/ApprovalsView.tsx`):**
   - Dedicated interface for Master Rushikesh to authorize or deny Danger Tier 3 and Tier 4 operations.
   - Integrates with `POST /approvals` and `PermissionManager`, ensuring every authorization action is immutably audited.
5. **Real Conversational Chat Interface (`ui/src/views/ChatView.tsx`):**
   - Real ChatGPT-style dialogue interface connecting directly to `POST /chat` and `ConversationService`.
   - Incorporates dynamic candidate tool filtering in `ConversationService` to keep LLM context concise and ensure fast sub-3-second responses on local hardware.

---

## 28. Long-Term Semantic Memory & Associative Recall Subsystem (Phase 12)

Phase 12 enriches HṚṢĪKEŚA's 14-tier SQLite memory architecture with local vector embeddings and hybrid retrieval:

```
USER QUERY / CONVERSATION TURN
               ↓
ConversationService.sendMessage(sessionId, message)
               ↓
ContextAssembler.assembleContext(sessionId, { query })
               ↓
      HybridMemoryRetriever
        ↙               ↘
Deterministic (Keyword)   Semantic (Vector Cosine)
MemoryRepository.search   SemanticMemorySearch
        ↘               ↙
     Deduplication & Weighted Ranking Formula
               ↓
Bounded Context Injection into System Prompt (Max 1,000 chars)
               ↓
   Local LLM Inference (Qwen 2.5 7B)
```

### Core Architecture Components

1. **Additive SQLite Vector Storage (`src/persistence/migrations/003_semantic_memory_schema.ts`):**
   - SQLite `memory_embeddings` table stores `Float32Array` vectors as raw binary blobs (`BLOB`).
   - For `nomic-embed-text` (768 dimensions), each embedding is 3,072 bytes. Total storage for entire lifetime memory remains under 2 MB.
2. **Local Embedding Provider (`src/memory/semantic/ollama.embedding.provider.ts`):**
   - Interfaces directly with Ollama's `POST /api/embed` using `nomic-embed-text`.
   - Zero cloud API dependency, zero external SaaS costs, zero remote vector exposure.
   - Synchronized with `HardwareDetector`'s inference lock to prevent GPU/RAM contention with concurrent chat generations.
3. **In-Process Cosine Similarity & Bounded Scaling (`src/memory/semantic/semantic.search.ts`):**
   - Computes exact cosine similarity via Float32Array dot products directly in-process (<5ms for <10,000 items).
   - Scaling envelope: In-process scan is safe and optimal for $N < 10,000$ items. Beyond 10k items, an approximate nearest neighbor index (HNSW / sqlite-vec) can be plugged in without changing higher-level abstractions.
4. **Asynchronous Non-Blocking Indexer (`src/memory/semantic/semantic.indexer.ts`):**
   - Bounded in-memory queue (max 50 items) drains sequentially in the background when memories are created or updated via `POST /memory`.
   - Resource guard defers embedding if system memory enters `CRITICAL_MEMORY` state.
5. **Secret Redaction & Safe Hybrid Ranking (`src/memory/semantic/embedding.redactor.ts` & `hybrid.retriever.ts`):**
   - Sensitive tiers (`audit_history`, `tool_state`) and detected credentials (API keys, JWTs, passwords) are blocked from embedding.
   - Hybrid scoring formula:
     $$\text{score} = 0.50 \cdot \text{sim} + 0.25 \cdot \text{explicitness} + 0.15 \cdot \text{confidence} + 0.10 \cdot \text{recency}$$
   - Directives and creator identity in Tier 1–3 with high confidence ($\ge 0.95$) are always preserved and cannot be overridden by lower-tier or imported memories.

---

## 29. Autonomous Mission Engine & Governed Execution Loop (Phase 13)

Phase 13 transforms HṚṢĪKEŚA's multi-agent workforce and task system into a finite, governed, observable autonomous execution engine:

```
RUSHIKESH / CHAT / INTENT CLASSIFIER
                ↓
    POST /missions (autoPlan / executeImmediately)
                ↓
      MissionPlanner (Qwen 2.5 / Archetypes + Semantic Memory)
                ↓
     DAG TaskGraph (Kahn's Topological Sort, Cycle Detection)
                ↓
┌─────────────────────────────────────────────────────────────┐
│                 AUTONOMOUS EXECUTION LOOP                   │
│                                                             │
│   Ready Task Selection (Dependencies Resolved)              │
│                ↓                                            │
│   Budget Check (Tasks, Retries, Model Calls, Timeouts)      │
│                ↓                                            │
│   Agent Runtime Execution (Tool Calls via Governed Bus)     │
│                ↓                                            │
│   Blackboard Observation & Artifact Extraction              │
│                ↓                                            │
│   Mission Verifier (Genuine Filesystem / Exit / Process)    │
│                ↓                                            │
│   Recovery Manager (Transient Retry / Replan / HITL Pause)  │
└─────────────────────────────────────────────────────────────┘
                ↓
       MissionReport & Durable Outcome Memory (Tier 12)
                ↓
     Real-Time SSE Broadcast to Control Center / Agent Town
```

### Core Architecture Components

1. **DAG Task Graph Engine (`src/agents/tasks/task.graph.ts`):**
   - Validates multi-task mission execution plans using Kahn's algorithm for topological sorting and cycle detection.
   - Computes ready tasks dynamically as dependency tasks reach `COMPLETED` state.
   - Restricts DAG depth to `maxDepth = 6` to prevent runaway recursive task branching.

2. **Semantic-Aware Mission Planner (`src/agents/planner/mission.planner.ts`):**
   - Synthesizes user goals into structured `MissionPlan` with risk analysis, task dependencies, assigned workforce specialists (Arjuna, Chanakya, Arya, Aditi, Agastya), and explicit verification strategies.
   - Ingests semantic memory from Tier 6 (project), Tier 10 (skills), and Tier 12 (task history) to reuse proven execution archetypes.
   - Fallback resilience: If model generation exceeds 15 seconds, seamlessly decomposes objectives using verified deterministic archetypes.

3. **Genuine Programmatic Verifier (`src/agents/verification/mission.verifier.ts`):**
   - Rejects LLM self-certification in favor of programmatic ground truth.
   - Verification strategies:
     - `file_exists`: Verifies physical file presence on disk within the sovereign workspace.
     - `file_contains`: Verifies exact substring/regex patterns in generated artifacts.
     - `command_exit_code`: Executes bounded diagnostic checks and asserts exit code 0.
     - `process_running`: Asserts verified process existence via PID/tasklist.
     - `blackboard_entry_present`: Asserts structured observation key presence.

4. **Failure Classification & Recovery Engine (`src/agents/recovery/recovery.manager.ts`):**
   - Categorizes failures into `transient`, `permanent`, `security`, or `resource_exhaustion`.
   - Transient errors trigger exponential backoff retries within strict task budgets (`maxRetries = 2`).
   - Permanent errors trigger autonomous dynamic replanning if remaining mission budget allows.
   - Security denials and Tier 3/4 approval blocks immediately pause the mission in `BLOCKED` state, dispatching a `HumanInterventionRequest` for Rushikesh.

5. **Finite Budget Envelope (`MissionBudget`):**
   - Strict defaults: `maxTasks = 10`, `maxRetriesPerTask = 2`, `maxTotalRetries = 5`, `timeoutMs = 600,000`, `maxModelCalls = 25`.
   - Missions cannot loop infinitely or consume unconstrained local compute.

6. **Durable Persistence & Memory Integration (`src/persistence/migrations/004_autonomous_mission_schema.ts`):**
   - Schema Migration 004 adds `mission_artifacts`, task dependencies, verification strategies, and failure classification columns.
   - On completion, structured mission outcomes and key findings are automatically persisted into SQLite Memory Tier 12 (`task_history`) with provenance `learned`.

---

## 30. Autonomous Execution Hardening & Agent Registry Integrity (Phase 13.5)

Phase 13.5 introduces mission engine optimizations, zero-model-call fast paths, timeout cancellation guards, and agent registry integrity enforcement:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MISSION INVOCATION & ROUTING                           │
│                                                                             │
│   Objective Ingestion → classifyComplexity(objective)                       │
│      ├── SIMPLE    → generateSimplePlan() [<1ms, 0 Model Calls]             │
│      └── STANDARD/ → LLM Decomposition with 15s AbortController             │
│          COMPLEX       └── Timeout → Abort HTTP Request → Deterministic DAG  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                  GOVERNED EXECUTION & BUDGET TRACKING                       │
│                                                                             │
│   MissionBudgetTracker (Mission-Wide Monotonic Model Call Count)            │
│      ├── Fast-Path: deterministicToolAction → Direct Tool Bus (0 Calls)    │
│      └── LLM Reasoning Turn: Recorded & Bounded by maxModelCalls            │
│                                                                             │
│   Tool Execution Bus → REQUIRE_APPROVAL (Tier 3/4 Risk)                     │
│      ├── Task & Mission State → BLOCKED (pendingApprovalId stored)          │
│      ├── HumanInterventionRequest Dispatched to SSE & Control Center        │
│      └── Resume Mission on Operator Decision (approved/rejected)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Safeguards

1. **Authoritative Workforce Registry:**
   - Authoritative 5-agent workforce (`Arjuna`, `Chanakya`, `Arya`, `Aditi`, `Agastya`) registered in `AgentRegistry`.
   - Dynamic prompt generation interrogates `AgentRegistry.getAll()`; zero hardcoded agent names exist in the planner.
   - Agent Town reflects authentic runtime states without mock activity.

2. **Deterministic Fast-Paths & Model Call Elimination:**
   - Conservative complexity classification routes deterministic checks (file existence, direct file writes) directly to structured task definitions.
   - Tasks with `deterministicToolAction` execute immediately via `ToolExecutionBus`, avoiding unnecessary LLM token generation.

3. **Inference Lock & Abort Safeguard:**
   - The 15-second planning fallback aborts the in-flight Ollama HTTP connection via `AbortController`, preventing orphaned CPU inference from blocking subsequent turns.

4. **Governed Human Approval Flow:**
   - `pending_approval` is strictly forbidden from being marked as successful completion.
   - The engine halts the task in `BLOCKED` until explicit human resolution.

---

## 31. Advanced Research & Web Intelligence Architecture (Track A / INT-005)

Track A / INT-005 formalizes the sovereign Research Subsystem into an isolated, bounded multi-source intelligence pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FAST CHAT GATE ROUTER                              │
│                                                                             │
│   Input Query ──► FastChatGate.evaluate()                                   │
│      ├── Greetings / Identity / Time / Date / Math ──► FAST_PATH (0 Calls)  │
│      └── Research Directive ──► Immediate System Ack (<10ms)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Async Background Dispatch
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    RESEARCH PIPELINE DECOMPOSITION                          │
│                                                                             │
│   1. Planning: Multi-angle search queries, depth & 10 budget dimensions     │
│   2. Search & Harvest: Multi-provider search, rate-limited crawling         │
│   3. Source Extractor:                                                      │
│      - Untrusted Envelope (<untrusted_web_content>)                         │
│      - Prompt Injection Defense (Jailbreak / System Override Neutralization)│
│      - Bot / Access Wall Classifier (CAPTCHA, MFA, Cloudflare, Paywall)     │
│      - Credential Redactor (API keys, Tokens, Secrets)                      │
│      - Deterministic Credibility & Temporal Freshness Evaluator             │
│   4. Claim Extraction: Statements, polarities, support types, provenance    │
│   5. Cross-Source Analyzer: Contradiction detection (Dates, Numbers,        │
│      Versions, Facts, Compatibility) & Corroboration clustering             │
│   6. Synthesis: Structured Markdown, verified citations, durable facts      │
│   7. Sovereign Memory: Ingestion into Semantic Vector Index & KG           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles:
1. **External Web Data is Untrusted:** Web text is strictly treated as passive data, never active instructions. Content is wrapped in isolated XML envelopes and sanitized.
2. **Deterministic Fast-Path Sovereign Isolation:** Web crawling and multi-query research will never be triggered by simple conversational intents (greetings, identity, time, date, simple math).
3. **Zero-Hallucination Citations:** Every synthesized claim and finding maps directly to a verified source URL with an immutable SHA-256 content hash.

---

## 32. Sovereign Personal Knowledge Graph Architecture (Track A / INT-006)

Track A / INT-006 establishes the persistent, provenance-preserving Knowledge Graph connecting conversations, episodic memory, research evidence, companies, projects, decisions, and goals:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 SOVEREIGN KNOWLEDGE GRAPH ENGINE (SQLite Native)             │
│                                                                             │
│   ┌───────────────────────────┐       ┌─────────────────────────────────┐   │
│   │ Entity Resolution Service │       │ Proposal-Based Merge Manager    │   │
│   │ Canonical clusters        │       │ Non-destructive disambiguation  │   │
│   │ Multi-tier alias matching │       │ Zero silent merges              │   │
│   │ Cross-type conflict check │       │ Human approval workflow         │   │
│   └─────────────┬─────────────┘       └────────────────┬────────────────┘   │
│                 │                                      │                     │
│                 ▼                                      ▼                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                 Knowledge Entities & Relationships                  │   │
│   │   - Scopes: CREATOR | GLOBAL | PROJECT | COMPANY | SESSION          │   │
│   │   - Provenance: EXPLICIT | DERIVED | INFERRED | IMPORTED | RESEARCH │   │
│   └─────────────────────────────────────┬───────────────────────────────┘   │
│                                         │                                    │
│                                         ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                  Temporal Fact Versioning Subsystem                 │   │
│   │   - validFrom, validUntil, version, supersededBy                    │   │
│   │   - Non-destructive history: past evidence never erased             │   │
│   │   - Time-travel queries: "What did I use?" vs "What do I use now?"  │   │
│   └─────────────────────────────────────┬───────────────────────────────┘   │
│                                         │                                    │
│                 ┌───────────────────────┴───────────────────────┐            │
│                 ▼                                               ▼            │
│   ┌───────────────────────────┐                   ┌───────────────────────┐ │
│   │ Evidence Provenance Engine│                   │ Contradiction Registry│ │
│   │ - Cites studyId & URL     │                   │ - sourceA vs sourceB  │ │
│   │ - SHA-256 contentHash     │                   │ - Dispute explanation │ │
│   │ - Zero inference as facts │                   │ - UNRESOLVED tracking │ │
│   └───────────────────────────┘                   └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Invariants:
1. **Never Merge Ambiguous Entities Silently:** Discovered merge candidates generate `knowledge_merge_proposals` requiring explicit review.
2. **Temporal Non-Destructive Versioning:** Updates increment version and mark `validUntil` without deleting historical facts or evidence.
3. **Research-Knowledge Invariant:** Research study findings of type `INFERENCE` or `OPINION` are never persisted as durable source-backed facts.
4. **Scope Isolation:** Strict multi-tenant boundaries (`CREATOR`, `GLOBAL`, `PROJECT`, `COMPANY`). Zero cross-project fact leakage.
5. **Bounded Context Assembly:** Graph traversal bounded to 5 hops and 150 nodes max; context assembler limits output to < 800 chars / 100ms.

---

## 33. Cognitive Context Engine Architecture (Track A / INT-007)

Track A / INT-007 establishes the unified **Cognitive Context Engine** — the central context assembly, ranking, and budget enforcement orchestrator that unifies structured episodic memory, persistent knowledge graph, live research findings, company/project context, explicit user preferences, and architectural decision records into a coherent, highly compressed context window for language model inference.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COGNITIVE CONTEXT ENGINE PIPELINE                         │
│                                                                             │
│   Incoming Request (User Prompt + Scope + Budget + Tier)                    │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 1. Request Classifier                                               │   │
│   │    - Intent Detection: CHAT | TASK | DECISION_LOOKUP | RESEARCH...  │   │
│   │    - Task Complexity: SIMPLE | MODERATE | COMPLEX | CRITICAL        │   │
│   │    - Entity Extraction & Temporal Intent (CURRENT, HISTORICAL, ALL) │   │
│   │    - Fast-Path Bypass Detector (Deterministic intents: < 20ms)      │   │
│   └───────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 2. Scope Resolver                                                   │   │
│   │    - Hierarchical: CREATOR | GLOBAL | PROJECT | COMPANY | SESSION   │   │
│   │    - Target Project / Company resolution                            │   │
│   └───────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 3. Multi-Source Candidate Collector                                 │   │
│   │    - Source Activation Matrix based on Intent & Scope               │   │
│   │    - Memory, Entities, Facts, Decisions, Research, Preferences      │   │
│   │    - Resilient token fallback & Canonical entity mapping            │   │
│   └───────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 4. Temporal Filter & Fact Versioning                                │   │
│   │    - Enforces validFrom, validUntil, status, observedAt             │   │
│   │    - Distinguishes current vs historical state                      │   │
│   └───────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 5. Transparent Multi-Factor Relevance Ranker                        │   │
│   │    - Explicit User Preference bonus (+0.40)                         │   │
│   │    - Intent Alignment (+0.35), Scope Match (+0.30)                  │   │
│   │    - Entity Match (+0.25), Provenance Weight (+0.20)                │   │
│   │    - Temporal Recency (+0.15), Contradiction Preservation (+0.10)   │   │
│   │    - 100% Explainable Scoring (reasons array in trace)              │   │
│   └───────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 6. Conflict & Contradiction Resolver                                │   │
│   │    - Structured [CONTESTED INFORMATION / UNRESOLVED] blocks         │   │
│   │    - Prevents model hallucination on disputed facts                 │   │
│   └───────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 7. Adaptive Context Budget Manager & Governor                       │   │
│   │    - Tiered token/char budgets (T0: 0, T1: 150, T2: 500,            │   │
│   │      T3: 1500, T4: 3000 tokens)                                     │   │
│   │    - Throttles under LOW_MEMORY (-30%) and CRITICAL_MEMORY (-60%)   │   │
│   └───────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 8. Lossless-Priority Context Compressor                             │   │
│   │    - Deduplication, exact phrase pruning                            │   │
│   │    - Non-droppable protection: Explicit preferences & Contradictions│   │
│   └───────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│   Final Formatted Context String + Complete Explainable ContextTrace        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles & Invariants:
1. **Deterministic Fast-Path Zero-Overhead Invariant:** Fast-path intents (`hello`, `who created you?`, `what time is it?`, `what is today's date?`, `2 + 2`) strictly bypass context engine retrieval (0 LLM calls, 0 database overhead).
2. **Transparent Multi-Factor Explainability:** No black-box embedding thresholding without explanation; every included candidate carries a score breakdown and human-auditable reason array.
3. **Structured Contradiction Preservation:** Contested claims from disparate sources are never discarded or merged into hallucinations; they are surfaced as structured `[CONTESTED INFORMATION / UNRESOLVED]` blocks.
4. **Explicit Preference Non-Negotiability:** High-priority explicit user preferences are assigned the highest weighting and are immune to context compression budget pruning.
5. **Strict Scope Isolation:** Project- and company-specific context is strictly quarantined; queries scoped to a target project never leak data from adjacent or parent entities unless globally scoped.

---

## 14. Track A: INT-008 — Persistent Working Memory & Conversational Continuity Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WORKING MEMORY ENGINE (INT-008)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Incoming User Turn (non-fast path)                                         │
│         │                                                                   │
│         ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Expiration & Maintenance (TTL sweep, status update)                │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2. Thread Selection & Ranking (ThreadManagerService)                  │  │
│  │    - Exact title match (+0.50), token match (+0.30), overlap (+0.35)  │  │
│  │    - Status weight (+0.25), recency decay (+0.20), continuation (+0.30│  │
│  │    - Cross-session candidate isolation (no thread leak on greetings)  │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 3. Explicit User Correction Detector (CorrectionDetectorService)      │  │
│  │    - Detects "No, I meant X", "Use Y instead", "Forget assumption"   │  │
│  │    - Overrides active project/company and supersedes assumptions      │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 4. Continuity Tracking (ContinuityTrackerService)                     │  │
│  │    - Project intent (canonical check, regex, Unicode resilience)      │  │
│  │    - Company intent (Aumtrix vs Pragnya)                              │  │
│  │    - Goal, mission, and task lifecycle (OPEN -> IN_PROGRESS -> RESOLVED)│
│  │    - Blocker recording & resolution, pending questions/approvals      │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 5. Deictic Reference Resolver (ReferenceResolverService)              │  │
│  │    - "it" -> active blocker / error / task                            │  │
│  │    - "that" -> recent result / decision                               │  │
│  │    - "this" -> current task / active topic                            │  │
│  │    - "the previous one" -> superseded items / preceding thread        │  │
│  │    - "continue" -> active task / project                              │  │
│  │    - Ambiguity detection (score delta < 0.15)                         │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 6. Checkpoint Manager (CheckpointManagerService)                      │  │
│  │    - Structured state snapshot every 10 turns or manual trigger       │  │
│  │    - Instant cross-session restore across application restarts        │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  Injected into INT-007 CandidateCollector & Prompt Assembly (T4+ prompts)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Working Memory Invariants:
1. **Zero Fast-Path Interference:** Deterministic fast-paths (`hello`, `who created you?`, `what time is it?`, `what is today's date?`, `2 + 2`) bypass working memory lookup entirely (< 20ms, 0 database overhead).
2. **Deterministic & Model-Free:** Reference resolution, thread ranking, and continuity tracking use deterministic heuristics and SQLite lookups without making LLM calls (0 unnecessary LLM calls).
3. **Cross-Session Isolation:** Unrelated sessions never inherit active thread or project context from foreign sessions unless explicitly requested.
4. **Non-Durable Working Boundary:** Working items are short/medium-lived and session-bounded; they never auto-promote to permanent knowledge graph facts or episodic memories without explicit user direction.

---

## 27. Foundation Performance & Execution Block (FP-01)

### 27.1 Architectural Motivation
Corrective architectural block designed to eliminate chat latency bottlenecks, decouple local inference from CPU-only constraints, test Intel Arc GPU acceleration via llama.cpp Vulkan runtime, enforce execution-first behavior, establish English self-name identity "Rishi", and provide real-time token cancellation.

### 27.2 Subsystems Added
1. **Inference Abstraction Engine (`src/inference/`)**:
   - `InferenceBackendDetector`: Automatic hardware and driver inspection (`AVX2`, `Intel Arc Graphics`, `Vulkan 1.3`, `Level Zero`, `SYCL`).
   - `LlamaCppBackend`: Multi-threaded CPU and Intel Arc GPU acceleration via Vulkan runtime (`tools/llama-vulkan/`).
   - `OllamaBackend`: Resilient local fallback runner on `localhost:11434`.
   - `InferenceRegistry`: Residency tracking, active request counting, eviction candidate ranking.
   - `InferenceScheduler`: Tier-aware execution scheduler (`T0`–`T4`).
2. **Compute Tiers**:
   - `T0`: Deterministic Zero-Model (<25ms, greetings, courtesy, identity, time, date, 2+2, interrupts)
   - `T1`: Fast / Tiny Local Model (`deepseek-r1:1.5b`)
   - `T2`: Interactive Chat (`llama3.2:3b` resident preferred)
   - `T3`: Complex Local Reasoning (`qwen2.5:7b`)
   - `T4`: Heavy Research & Coding
3. **Execution-First Policy (`src/conversation/execution.policy.ts`)**:
   - `UNDERSTAND -> DECIDE -> EXECUTE -> VERIFY -> REPORT`
   - Structured assumption logging (`category`, `context`, `timestamp`).
   - Suppression of unnecessary clarification questions.
4. **Identity Enrichment**:
   - Canonical system name remains **HṚṢĪKEŚA** (हृषीकेश / HRISHIKESHA).
   - English self-reference name established as **Rishi** ("I’m Rishi").
5. **Asynchronous Chat Naming (`src/conversation/chat.namer.ts`)**:
   - ChatGPT-style 2–6 word descriptive conversation titles generated non-blockingly.
6. **Cancellation Tokens (`src/conversation/cancellation.manager.ts`)**:
   - Instant abort for STOP/CANCEL/ABORT/PAUSE across model generation, tool bus, and voice output.
7. **Offline-First Mode (`src/core/offline/offline.manager.ts`)**:
   - 100% offline local operation; external network calls report `OFFLINE — QUEUED`.

---

## 28. Interactive Inference Optimization (FP-02)

### 28.1 Architectural Motivation
In FP-01, deterministic fast paths (T0) achieved sub-25ms latency, but standard conversational turns (T2) suffered from cold-start process overhead and unconstrained token outputs. FP-02 introduces warm residency and Server-Sent Events (SSE) token streaming.

### 28.2 Subsystems Added
1. **Warm Model Residency**:
   - Keeps interactive model (`llama3.2:3b`) resident in memory with `keep_alive: 15m`.
   - Lowers Time-To-First-Token (TTFT) to 253–314ms.
2. **True Token Streaming Architecture**:
   - Token-by-token streaming via SSE to client interface (`/chat/conversations/:id/messages/stream`).
   - Decoupled asynchronous tasks (persistence, working memory, title generation) off the critical path.
3. **Response Modes (`CONCISE`, `NORMAL`, `DETAILED`, `DEEP`)**:
   - Strict token budgets: `CONCISE` (75 tokens), `NORMAL` (256 tokens), `DETAILED` (512 tokens), `DEEP` (1024 tokens).
4. **Context Minimization**:
   - Tier 1/2 prompts stripped of unnecessary tool schemas and heavy memory structures (< 100 tokens).

---

## 29. Distributed Local/LAN Resource Fabric & Execution Capacity (FP-03)

### 29.1 Architectural Motivation
HṚṢĪKEŚA's execution bottleneck on a single laptop is hardware capacity (14 CPU cores, 16 GB RAM, shared Intel Arc iGPU). FP-03 separates the sovereign **Control Plane** from the **Execution Plane**, enabling horizontal task distribution across local and LAN nodes without altering agent or cognitive architectures.

```
RUSHIKESH PATTIWAR (Root Sovereign Master)
             ↓
HṚṢĪKEŚA CONTROL PLANE (Primary Laptop)
  - Identity, Policy, Governance, Working Memory, Missions
             ↓
ResourceManager / ResourceScheduler
             ↓
     ResourceRegistry (SQLite Migration 020)
             │
 ┌───────────┴───────────┬──────────────────────┐
 ▼                       ▼                      ▼
Local Worker         LAN Worker           Future Cloud
Intel Arc / Vulkan   NVIDIA / AMD / Intel (Authorized Only)
Ollama / llama.cpp   Whitelisted Workloads
Host Automation      Cryptographic Pairing
```

### 29.2 Subsystems Implemented
1. **Resource Registry & Persistence (`src/resources/resource.registry.ts`)**:
   - Migration 020: `workers`, `worker_capabilities`, `worker_tasks`, `worker_resource_snapshots`, `worker_enrollment_tokens`.
   - In-memory caching for sub-millisecond dispatch lookups; durable SQLite backing; bounded snapshot retention (100 per worker).
2. **Security & Enrollment Policy (`src/resources/resource.policy.ts`)**:
   - Cryptographic pairing: Single-use pairing tokens hashed with SHA-256 and bounded by TTL (default 10 minutes).
   - Zero unrestricted remote shell: Non-local workers are strictly confined to whitelisted safe workloads (`compute.echo`, `compute.benchmark`, `resource.fabric.test`, `inference.generate`, `model.health`).
   - Privacy boundaries: `SOVEREIGN_LOCAL` (never leaves host), `HIGHLY_PRIVATE` (local default), `PRIVATE` (trusted enrolled workers), `PUBLIC` (all authorized workers).
   - Artifact transfer safety: SHA-256 integrity verification, 50 MB file size limit, and path traversal rejection.
3. **Resource-Aware Placement Engine (`src/resources/resource.scheduler.ts`)**:
   - Multi-factor evaluation: Required capabilities, hardware metrics, model availability, privacy, priority, and load scores.
   - Explainable decisions with structured factor scoring.
   - ResourceGovernor integration: Under `CRITICAL_MEMORY`, local affinity bonus drops to -30 to offload non-private workloads to LAN nodes.
4. **Health Tracking & Automated Fault Recovery (`src/resources/resource.health.ts`)**:
   - Periodic heartbeat sweep detecting stale workers; transitions to `DEGRADED` and `OFFLINE`.
   - Automatic task requeueing and retry on worker failure with idempotency keys.
5. **Worker Implementations (`src/resources/workers/`)**:
   - `LocalWorker`: First-class host worker detecting CPU, RAM, Intel Arc GPU, Vulkan, Ollama, and host tools.
   - `LanWorkerClient`: Prototype LAN node client handling pairing, heartbeat emission, telemetry snapshots, and bounded task execution.
6. **API & UI Layer**:
   - REST API endpoints under `/resources/*` (`GET /resources/overview`, `GET /resources/workers`, `POST /resources/workers/pair`, `POST /resources/workers/enroll`, etc.).
   - Control Center Workers dashboard (`WorkersView.tsx`) with real-time telemetry, node state management (drain/revoke/resume), and pairing dialog.

---

## 30. Physical LAN Execution & Distributed Inference Architecture (FP-04)

### 30.1 Architectural Overview
FP-04 transitions the distributed resource fabric from in-process loopback simulation to physical LAN network transport with encrypted TLS 1.3 socket streams, dedicated port isolation, standalone worker runtimes, and real-time distributed inference token streaming.

```
HṚṢĪKEŚA PRIMARY LAPTOP (Machine A)
├── Control Plane (Port 4200 - localhost ONLY)
│   ├── Sovereign Identity & Goals
│   ├── Context & Memory (14 Tiers)
│   ├── 17-Agent Workforce
│   └── ResourceScheduler
└── Dedicated Worker Transport Listener (Port 4300)
    └── TLS 1.3 (Pure-JS X.509 RSA-2048)
            │
            ▼ Real Physical Network (LAN Ethernet / Wi-Fi)
            │
PHYSICAL LAN WORKER (Machine B)
└── Worker Runtime Daemon (`worker.runtime.ts`)
    ├── TLS Client (`WorkerTransportClient`)
    ├── Capabilities & Model Scanner (Ollama, llama.cpp, GPUs)
    ├── Bounded Typed Executor (`worker.executor.ts`)
    │   ├── `compute.echo`
    │   ├── `compute.benchmark`
    │   ├── `resource.fabric.test`
    │   ├── `model.health`
    │   └── `inference.generate` (with Real-time Token Streaming)
    └── Cooperative Cancellation (`AbortController`)
```

### 30.2 Subsystems & Components

1. **Dedicated Worker Transport Layer (`src/resources/transport/`)**:
   - `worker.transport.types.ts`: Strongly typed protocol frames (`ENROLL`, `AUTH`, `HEARTBEAT`, `CAPABILITIES`, `TELEMETRY`, `TASK_ACCEPTED`, `TASK_PROGRESS`, `TASK_COMPLETED`, `TASK_FAILED`, `TASK_CANCELLED`).
   - `worker.transport.server.ts`: Runs on Port 4300 with TLS 1.3. Validates single-use enrollment tokens, manages session tokens, coordinates heartbeats, handles task dispatching, and propagates streaming token chunks.
   - `worker.transport.client.ts`: Standalone client connecting to Port 4300 over TLS. Supports exponential backoff reconnection, heartbeat emission, telemetry reporting, and streaming task execution.
   - `worker.transport.protocol.ts`: 4-byte big-endian length-prefixed framing with 5 MB frame ceiling defense against DoS.
   - `worker.transport.tls.ts`: Pure JavaScript X.509 self-signed certificate generation with RSA-2048 and SHA-256 fingerprinting. Zero dependency on system `openssl.exe`.
   - `worker.transport.discovery.ts`: UDP broadcast beacon announcer and listener (`WorkerDiscovery`) for automatic candidate node discovery with strict zero-trust boundaries.

2. **Standalone Physical Worker Runtime (`src/resources/worker-runtime/`)**:
   - `worker.runtime.ts`: CLI daemon executable on Machine B (`node dist/resources/worker-runtime/worker.runtime.js --connect <host>:4300 --token <token>`).
   - `worker.capabilities.ts`: Probes installed models (Ollama, llama.cpp), CPU cores, RAM, and GPU accelerators.
   - `worker.gpu.ts`: Telemetry abstraction querying `nvidia-smi`, `rocm-smi`, Level-Zero, or OS diagnostics without data fabrication (`gpuUtilization = 'UNKNOWN'` when not detectable).
   - `worker.executor.ts`: Strictly bounds execution to whitelisted workloads. For `inference.generate`, streams token chunks in real time over `TASK_PROGRESS` frames.

3. **Remote Distributed Inference & Token Streaming Pipeline**:
   - Conversation / Chat Turn $\rightarrow$ `ResourceScheduler` $\rightarrow$ Worker Transport $\rightarrow$ Physical Worker Node $\rightarrow$ Worker Inference Runtime $\rightarrow$ Ollama / llama.cpp.
   - Streaming path: Worker token chunk $\rightarrow$ TLS transport frame $\rightarrow$ Control plane dispatch handler $\rightarrow$ Server-Sent Events (SSE) $\rightarrow$ Chat UI.
   - Preserves FP-01 / FP-02 deterministic fast gates: T0 queries (`hello`, `who created you?`, `time`, `date`, `2 + 2`) strictly bypass LAN transport and execute locally in < 38ms.

4. **Cooperative Cancellation & Partition Resilience**:
   - In-flight distributed tasks cancel cooperatively via `TASK_CANCEL` frames, aborting underlying processes and HTTP connections.
   - Network partition recovery: Worker disconnections immediately mark tasks for requeueing onto eligible workers with idempotency deduplication.

---

## 31. Multi-Worker Execution Fabric & Concurrent Inference Architecture (FP-05)

### 31.1 Architectural Overview
FP-05 elevates the distributed transport into a true Multi-Worker Execution Fabric. The authoritative HṚṢĪKEŚA control plane coordinates multiple simultaneous worker nodes (`LOCAL`, `LAN-A`, `LAN-B`, `LAN-C`) with capability/model awareness, warm VRAM residency scoring, load balancing, per-worker concurrency limits, saturation queueing, graceful draining, and automatic task migration.

```text
                         RUSHIKESH (Master Authority)
                                     │
                                     ▼
                              HṚṢĪKEŚA (हृषीकेश)
                                     │
                      ┌──────────────┴──────────────┐
                      │                             │
            Authoritative Control Plane       Resource Fabric
            (Port 4200: localhost-only)       (Port 4300: TLS)
                      │                             │
                      └──────────────┬──────────────┘
                                     ▼
                             ResourceScheduler
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
         LOCAL WORKER           LAN WORKER A           LAN WORKER B
           (Primary)              (Alpha)                (Beta)
              │                      │                      │
         Intel Arc iGPU        NVIDIA RTX 4090        NVIDIA RTX 4080
          llama3.2:3b         qwen2.5:7b, llama      mistral:7b, llama
```

### 31.2 Subsystems & Core Mechanisms

1. **Multi-Worker Registry & Simultaneous TLS Sessions**:
   - `WorkerTransportServer` manages concurrent worker sessions simultaneously via `Map<string, ConnectedWorkerSession>`, tracking multiple concurrent `activeTaskIds: Set<string>` per session.
   - Demultiplexes incoming frames from all connected workers without crosstalk.

2. **Model-Aware Placement & Warm Model Residency**:
   - Tasks requesting specific models (`resourceRequirements.requiredModel`) route exclusively to workers advertising that model.
   - Workers with the requested model resident in VRAM/memory (`worker.residentModels`) receive a **+40 warm residency score bonus**, eliminating cold-start disk loads.

3. **Capacity Accounting, Load Balancing & Concurrency Limits**:
   - Scheduler tracks real-time active tasks in-memory (`activeTasksByWorker`) and in SQLite registry.
   - Applies an active tasks penalty (`-activeCount * 15`) and tie-breaks by lowest active tasks across identical nodes.
   - Enforces per-worker concurrency limits (`worker.resourceLimits.maxConcurrentTasks`), marking saturated workers ineligible for immediate placement (`isSaturated = true`).

4. **Queue-Aware Priority Scheduling with Aging Bonus**:
   - When all eligible workers are saturated, tasks with `waitForCapacity !== false` enqueue in priority `taskQueue`.
   - Starvation prevention via aging bonus:
     $$\text{effectivePriority} = \text{basePriority} + \left\lfloor \frac{\text{now} - \text{enqueuedAt}}{5000} \right\rfloor$$
   - Each 5 seconds of wait time awards +1 point to ensure low-priority background tasks are processed fairly.
   - Pumping the queue (`processQueue()`) occurs automatically whenever any task completes or a worker resumes.

5. **Graceful Worker Draining Lifecycle**:
   - `resourceManager.drainWorker(workerId)` transitions node to `DRAINING` and sends `WORKER_DRAIN` frame.
   - Draining nodes reject new tasks while in-flight workloads finish uninterrupted.
   - Automatically transitions to `DRAINED` when active count reaches 0.
   - `resumeWorker(workerId)` transitions node back to `ONLINE` and pumps the queue.

6. **Automatic Task Migration on Network Failure**:
   - Tasks submitted with `allowMigration: true` automatically requeue (`REQUEUED`), increment the attempt counter, and reschedule onto alternate eligible nodes if the active worker disconnects mid-execution.

7. **In-Flight Idempotency Deduplication**:
   - Schedulers maintain `inFlightByIdempotency: Map<string, Promise<TaskResult>>` to allow concurrent duplicate task submissions with identical keys to share the single in-flight execution promise, eliminating redundant compute cycles.

8. **Physical LAN Verification Standard**:
   - Where only one physical machine is active in the development environment, multi-worker testing executes over real TLS/TCP sockets and the physical status is reported transparently as `PHYSICAL_LAN_VERIFICATION = NOT_AVAILABLE` (zero fabricated data).

---

## 15. Universal Capability & Connector Fabric (FP-07)

FP-07 introduces the **Universal Capability & Connector Fabric**, establishing a strongly-typed, securely governed pipeline through which HṚṢĪKEŚA invokes CLI binaries, REST APIs, headless browser sessions, desktop software, and Model Context Protocol (MCP) servers:

```
User / Agent Intent
        │
        ▼
Capability Matcher (Deterministic Sub-10ms Token Overlap Scoring)
        │
        ▼
Multi-Tenancy & Sovereign Privacy (Company / Project Boundaries & SOVEREIGN_LOCAL Gate)
        │
        ▼
Permission Governance (Risk Tiers TIER_0 to TIER_4 & Human-in-the-Loop)
        │
        ▼
Resource Governor (Hardware Pressure Interception)
        │
        ▼
Authentication Manager (vault:// and env:// Resolution with Zero Plaintext Secrets)
        │
        ▼
Connector Registry (CLI, REST, BROWSER, SOFTWARE, MCP, LOCAL_TOOL)
        │
        ▼
Execution & Untrusted Data Defanging (Prompt Injection Defense)
        │
        ▼
Capability Verifier (EXECUTED != VERIFIED Post-Condition Invariant Check)
        │
        ▼
Telemetry, Health & Audit Logging (SQLite WAL Persistence, Zero Plaintext Secrets)
```

### Key Architectural Tenets
1. **Explicit Trust & Risk Tiers**: Capabilities are never automatically trusted simply because they were discovered. Trust levels (`SYSTEM`, `TRUSTED`, `VERIFIED`, `USER_APPROVED`, `UNVERIFIED`, `UNTRUSTED`, `BLOCKED`) and danger risk tiers (`TIER_0` to `TIER_4`) govern execution.
2. **Anti-Injection CLI Sandbox**: Native CLI execution requires binary allowlisting and metacharacter filtering (`;`, `&`, `|`, `$`, etc.) to prevent shell injection.
3. **Zero Plaintext Secrets**: Plaintext keys are never stored in SQLite, emitted over EventBus, or logged. Only URI references (`vault://...`, `env://...`) are stored, and recursive secret redaction purges all sensitive keys and tokens.
4. **Untrusted Data Isolation**: All external outputs from external APIs, web pages, or sub-processes are defanged into isolated data blocks to thwart indirect prompt injection against reasoning agents.
5. **Post-Condition Verification (EXECUTED != VERIFIED)**: Invocation completion triggers invariant verification across 7 strategies (`schema_match`, `read_after_write`, `process_state`, `checksum`, `dom_presence`, `exit_code`, `dry_run`).
6. **Sub-10ms Deterministic Performance**: Dual-layer caching (in-memory `Map` + SQLite WAL) achieves sub-1.2ms deterministic lookups without LLM overhead.

---

## 16. Autonomous Software Engineering & Agentic Coding Engine (FP-10)

FP-10 introduces the **Autonomous Software Engineering & Agentic Coding Engine**, bridging LLM reasoning directly to deterministic IDE subsystems, workspace modification, precision code repair, and continuous verification loops under strict security boundaries:

```
                      ┌─────────────────────────────────────────┐
                      │              USER / AGENT               │
                      │       Engineering Task Intent           │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │        ENGINEERING CONTEXT ENGINE       │
                      │  Tiers T0-T4 Context Assembly & Tokens  │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │          MODEL REPAIR ENGINE            │
                      │    Proposes Patch / Structured Intent   │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │            ACTION VALIDATOR             │
                      │  Path Traversal, Syntax, Danger Tiers   │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │       ENGINEERING EXECUTION ENGINE      │
                      │  Conflict Hash Gate, Editor / Terminal  │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │           VERIFICATION LOOP             │
                      │   TypeCheck, Lint, Build, Test Suites   │
                      └────────────────────┬────────────────────┘
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     │                                           │
            [Verification Fails]                        [Verification Passes]
                     │                                           │
                     ▼                                           ▼
         ┌───────────────────────┐                   ┌───────────────────────┐
         │  CONVERGENCE ENGINE   │                   │  TASK COMPLETED &     │
         │  Fingerprint Dedupe   │                   │  CHANGES COMMITTED    │
         │  Budget & Loop Guard  │                   └───────────────────────┘
         └───────────┬───────────┘
                     │
         [<= 2 Identical & In-Budget]
                     │
                     ▼
         [Re-enter Model Repair]
```

### Core Architecture Components

1. **Governed Execution Pipeline**:
   - The LLM *never* interacts directly with OS filesystems or child processes.
   - Flow: `MODEL` $\rightarrow$ `STRUCTURED INTENT` $\rightarrow$ `VALIDATION` $\rightarrow$ `CAPABILITY FABRIC` $\rightarrow$ `EXECUTION` $\rightarrow$ `OBSERVATION`.

2. **10-Stage Autonomous Lifecycle**:
   - `INIT` $\rightarrow$ `CONTEXT_ASSEMBLED` $\rightarrow$ `PLAN_GENERATED` $\rightarrow$ `ACTION_DISPATCHED` $\rightarrow$ `ACTION_EXECUTED` $\rightarrow$ `DIAGNOSTIC_CAPTURED` $\rightarrow$ `REPAIR_PROPOSED` $\rightarrow$ `VERIFICATION_PASSED` $\rightarrow$ `SUCCESS` (or `HALTED` / `FAILED`).

3. **Convergence & Anti-Infinite Loop Guard**:
   - Computes deterministic failure fingerprints (`hash(file + ":" + line + ":" + normalizedMessage)`).
   - Halts execution with `HALTED_CONVERGENCE_FAILURE` when 3 consecutive identical failures are detected, preventing infinite model repair loops and token exhaustion.
   - Enforces configurable budget constraints (`maxAttempts`, `maxDurationMs`, `maxCostUsd`).

4. **User-Conflict Baseline Protection**:
   - Caches SHA-256 hashes of on-disk file content on initial read.
   - Verifies before any mutation that the current on-disk hash matches the baseline hash. If human modifications or external edits occurred concurrently, the mutation is aborted cleanly.

5. **Precision Model Repair**:
   - Generates exact diff-based replacement chunks with verified line numbers and unambiguous target strings.
   - Automatically resolves test failures back to corresponding source files.
   - Falls back to deterministic syntax/semantic repair rules when model responses are unavailable.

6. **Full-Stack Tooling**:
   - **CLI**: `hres engineering <start|list|status|plan|pause|resume|cancel>`
   - **REST & SSE**: Dedicated HTTP router (`/api/engineering/*`) and real-time Server-Sent Events (`/api/engineering/tasks/:taskId/events`).
   - **UI**: Full-featured React dashboard (`AutonomousEngineeringView`) featuring real-time telemetry, stage indicators, diff viewer, and manual interventions.













---

## 32. Foundation Performance Block FP-11 — Native Universal Workflow & Automation Engine

FP-11 transforms HṚṢĪKEŚA from an individual task-runner into a sovereign, continuous, event-driven orchestration layer.

### 1. Directed Execution Graph Runtime
- **WorkflowExecutionEngine**: Authoritative state machine executing pre-compiled directed graphs with deterministic join barriers, branch conditions, and bounded loop cycles.
- **Node Executors**: Specialized execution dispatchers for 20 node types (`TRIGGER`, `ACTION`, `AGENT`, `SKILL`, `CAPABILITY`, `MODEL`, `MISSION`, `GOAL`, `CODE`, `TEST`, `VERIFY`, `RESEARCH`, `CONDITION`, `SWITCH`, `PARALLEL`, `JOIN`, `LOOP`, `WAIT`, `APPROVAL`, `TRANSFORM`, `NOTIFY`, `REPORT`, `END`).
- **Frozen FP-10 Delegation**: Workflow code generation, test execution, and verification tasks delegate strictly to FP-10 `EngineeringFabric` without duplicating logic.

### 2. Expression Engine & Security
- **SafeExpressionEvaluator**: Zero-eval sandboxed expression evaluator supporting arithmetic, comparison, logic, and path resolution with recursion depth limits and strict keyword blocking.
- **Mandatory Financial Governance**: Outgoing monetary actions automatically pause in `WAITING_APPROVAL` and require explicit human sign-off.
- **Secret Redaction**: Recursively strips API keys, tokens, and passwords from logs and approval summaries.

### 3. Checkpointing & Crash Resumption
- **SHA-256 Idempotency Checkpoints**: Checkpoints state snapshots after significant transitions.
- **WorkflowRecoveryManager**: Interrupted in-flight runs resume from the last safe checkpoint upon system restart.

### 4. Trigger & Scheduling Subsystems
- **Event-Driven**: Wildcard pattern subscription over `EventBus`.
- **Schedule-Driven**: Persistent Cron/Interval timers wired to `PersistentScheduler`.
- **Webhooks**: Inbound HTTP routes with HMAC-SHA256 signature verification and replay defense.

### 5. Multi-Interface Observability
- **REST & SSE**: Full lifecycle endpoints (`/api/workflows/*`, `/api/workflow-runs/*`) and live event stream (`/api/workflows/events/stream`).
- **CLI**: Native `hres workflow` suite.
- **Control Center UI**: Interactive SVG canvas visualizer with Vedic manuscript / dark observatory aesthetics, live SSE updates, and human approval gates.

---

## 33. Foundation Performance Block FP-15 — Universal Application & Service Ecosystem

FP-15 positions HṚṢĪKEŚA directly above the capability and account infrastructure and below mission orchestration, enabling deterministic execution of real-world software, CLI tools, provider APIs, and desktop applications.

### 1. Deterministic Interface Priority Ladder
1. `LOCAL_API`: High-speed in-process or local daemon execution (highest determinism, sub-millisecond).
2. `AUTHENTICATED_API`: Structured OAuth2/REST APIs with rate limits and quota monitoring.
3. `MCP`: Protocol-standardized tool invocation via external or local Model Context Protocol servers.
4. `CLI`: System binaries installed on PATH with verified execution paths and arguments.
5. `BROWSER_DOM`: Authenticated browser interaction via DOM tree and accessibility nodes.
6. `DESKTOP_UIA`: Native operating system UI Automation via FP-13 Digital Workspace Operator.
7. `OCR_VISION`: Visual grounding and screen region analysis.
8. `COORDINATE_INPUT`: Absolute mouse/keyboard interaction (fallback only).

### 2. Service & Application Normalization
- **ServiceDescriptor**: Normalizes provider IDs, interface bindings, quota tracking, health, authentication scopes, and licenses.
- **ApplicationDescriptor**: Directly reuses FP-13's `ApplicationDescriptor` without duplication or drift. Discovers desktop applications (e.g. Blender, Android Studio, VS Code) and CLI executables on the operating system.

### 3. Natural Language Fast-Path (<5ms, Zero LLM Hallucination)
Conversational inquiries regarding ecosystem connectivity are parsed deterministically via regular expressions and catalog mapping. Responses reflect ground-truth connectivity without invoking large language models.

### 4. Security Governance & Consequential Verification
- **External Data Defanging**: External service payloads (emails, issue comments, Slack messages) are defanged and tagged with `_untrustedExternalData: true`.
- **Approval Gating**: Mutating, financial, external messaging, and destructive operations require explicit human approval.
- **Consequential Verification**: Post-condition verification ensures operations succeeded in reality (e.g. fetching issue by ID, confirming calendar event insertion).
- **Durable Persistence (Migration 029)**: `ecosystem_services`, `ecosystem_interfaces`, `ecosystem_operations`, `ecosystem_verifications`.

---

## 34. Foundation Performance Block FP-16 — Demonstration Learning & Workflow Acquisition

FP-16 enables HṚṢĪKEŚA to observe user demonstrations, infer reusable procedural steps, validate proposals against 17 deterministic safety checks, and compile them into executable skills or workflows.

1. **Demonstration Lifecycle**:
   `RECORDING` → `PAUSED` → `STOPPED` → `ANALYZING` → `PROPOSAL_READY` → `VALIDATING` → `AWAITING_APPROVAL` → `COMPILED` (or `REJECTED`).
2. **17-Gate Validator**:
   Evaluates schema, credential safety, parameter validation, danger levels, scope isolation, prompt injection defense, and provenance.
3. **Compilation Pipeline**:
   Compiles approved proposals into FP-20 Skills (`skills/<name>/SKILL.md`) or FP-11 Workflows.
4. **Durable Persistence (Migration 030)**:
   `demonstration_sessions`, `demonstration_semantic_actions`, `demonstration_checkpoints`, `procedure_proposals`, `learned_procedures`, `learned_procedure_versions`.

---

## 35. Foundation Performance Block FP-17 — Universal Digital Creation & Media Studio

FP-17 provides HṚṢĪKEŚA with a sovereign, local-first multimodal creation and production orchestration layer across images, vector graphics, video, audio, music, voice, 3D assets, documents, presentations, and compound media packages.

### 1. Creation Domain Model & Lifecycle
- **CreationJob**: Tracks owner, scope, creation type, objective, instructions, inputs, outputs, model provider, progress percentage, iteration counters, and verification state.
- **CreationArtifact**: Deliverable entity with format, location, byte size, dimensions/duration/pages, cryptographic SHA-256 hash, and deterministic QA verification flag.
- **DesignContext**: Multi-tenant styling tokens (brand identity, colors, typography, geometric rules, aesthetic constraints).
- **Creation Lifecycle**: `DRAFT` → `PLANNING` → `QUEUED` → `RUNNING` → `PAUSED` → `AWAITING_INPUT` → `AWAITING_APPROVAL` → `VERIFYING` → `COMPLETED` / `FAILED` / `CANCELLED` / `ARCHIVED`.

### 2. Media Capability Fabric & Honest Local-First Providers
- **Standardized Capabilities**: Operations for `image.*`, `video.*`, `audio.*`, `music.*`, `voice.*`, `3d.*`, `document.*`, `presentation.*`, `design.*`.
- **Native Deterministic Local Synthesizers**:
  - `native.document.compiler`: Structured technical specifications, reports, presentations, and briefs.
  - `native.audio.synthesizer`: Synthesizes rhythmic soundscapes, voice prompts, and audio tones.
  - `native.image.synthesizer`: Vector SVGs, geometric emblems, Vedic astronomical layouts, and icons.
  - `native.video.composer`: Multi-scene video scripts, storyboards, and video media manifests.
- **Host Discovery**: Probes host system for Blender, FFmpeg, ImageMagick. Reports `NOT_CONFIGURED` honestly when uninstalled without fabricating execution.

### 3. Deterministic Verification & Quality Assurance Gate
- **Multi-Stage Checks**: Physical file existence, non-zero byte check, syntax validation, dimension/aspect ratio checking, and SHA-256 cryptographic hashing.
- **Separation of Generation & Completion**: Artifacts are never marked `COMPLETED` unless they pass verification.

### 4. Bounded Iteration & Convergence Safeguards
- **Iteration Tracking**: `iterateJob` evaluates modifications, updates iteration budget, and strictly stops when `maxIterations` is exceeded (`AWAITING_INPUT`), preventing infinite loops and token depletion.

### 5. Sovereign Human Approval & Security Boundaries
- **Approval Boundaries**: Commercial publishing, paid generation, and voice cloning require human confirmation (`AWAITING_APPROVAL`).
- **Security Sandboxing**: Prompt injection neutralized, SVG `<script>` tags sanitized, executable formats (`.exe`, `.bat`, `.sh`) rejected, and path traversal stripped.
- **Resource Governance**: Integrated with `ResourceGovernor`; under `CRITICAL_MEMORY`, heavy creation jobs are automatically queued to prevent host crashes.

### 6. Persistence & Interfaces
- **Durable Persistence (Migration 031)**: `creation_jobs`, `creation_artifacts`, `creation_iterations`, `design_contexts`, `creation_reference_assets`.
- **Control Center UI**: `CreationStudioView.tsx` with live SSE stream (`/api/creation/events`), progress tracking, artifact inspector, and creation wizard.
- **CLI Subsystem**: `hres create <type>` and `hres creation list|status|verify|cancel`.

---

## 36. Foundation Performance Block FP-18 — Universal Real-World Research, Knowledge & Decision Intelligence Fabric

FP-18 provides HṚṢĪKEŚA with an auditable analytical and cognitive fabric bridging external information (web, repositories, ecosystem) + existing knowledge/memory + company/project context + user preferences + host constraints into decision-support packages and actionable plans without silently making consequential decisions on behalf of Rushikesh.

```
EXTERNAL INFORMATION + KNOWLEDGE GRAPH + WORKING MEMORY + HOST CONSTRAINTS
                                │
                                ▼
                       RESEARCH CASE LIFECYCLE
                 (Decomposition & Bounded Budget)
                                │
                                ▼
                     EVIDENCE LEDGER & CLAIMS
               (Traceable Credibility & Normalization)
                                │
                                ▼
                 CONTRADICTION & TEMPORAL ENGINE
             (Quantization, Version, OS, Outdated >2y)
                                │
                                ▼
                   ENVIRONMENT-AWARE EVALUATOR
            (Intel Core Ultra 5 125H, 15.7 GB RAM, Arc GPU)
                                │
                                ▼
                   CANDIDATE COMPARISON MATRIX
               (Qualitative Tradeoffs, No Fake Precision)
                                │
                                ▼
                     16-SECTION DECISION BRIEF
             (Evidence vs Analysis vs Recommendation)
                                │
                                ▼
                  IMMUTABLE HISTORY & REVIEW
                    (MAINTAIN vs UPDATE)
                                │
                                ▼
                      GOVERNED ACTION BRIDGE
          (Proposed Missions, Goals, Workflows, Skills, Env)
                                │
                                ▼
                   HUMAN APPROVAL GATEWAY
                     (Rushikesh Authority)
```

### 36.1 ResearchCase Lifecycle & Bounded Planning
- **12 Lifecycle States**: `DRAFT` → `SCOPING` → `RESEARCHING` → `GATHERING_EVIDENCE` → `ANALYZING` → `COMPARING` → `SYNTHESIZING` → `REVIEWING` → `AWAITING_USER` → `COMPLETED` / `FAILED` / `ARCHIVED`.
- **Question Decomposition**: Converts broad inquiries into structured subquestions across relevant technical dimensions (hardware, licensing, maintenance, quantization, installation).
- **Bounded Research Plans**: Explicit stopping budgets (`maxSources: 10`, `maxSearches: 5`, `maxPages: 10`, `maxTokens: 32000`, `maxDurationMs: 60000`) preventing recursive research loops.

### 36.2 Evidence Ledger & Claim Normalization
- **4-Tier Source Hierarchy**: `PRIMARY` (official docs, repos, specs), `SECONDARY` (reputable technical analysis), `COMMUNITY` (forums, discussions), `UNVERIFIED` (unsubstantiated claims).
- **Traceable Ledger**: Every factual claim records subject, predicate, object, source ID, retrieval timestamp, polarity (`SUPPORTING`, `CONTRADICTING`, `PARTIAL`, `UNKNOWN`), and confidence level.

### 36.3 Contradiction Analysis & Temporal Intelligence
- **Contradiction Classification**: Detects conflicting claims across sources and identifies root causes:
  - `QUANTIZATION_DIFFERENCE` (e.g. 12GB FP16 vs 8GB Q4_K_M)
  - `VERSION_MISMATCH` (v1.0 vs v2.0 requirement changes)
  - `OS_MISMATCH` (Linux vs Windows driver support)
  - `WORKLOAD_DIFFERENCE` (inference vs fine-tuning)
  - `OUTDATED_DATA` (findings >2 years old)
- **Temporal Verification**: Evaluates freshness against retrieval date; explicitly marks older data as `OUTDATED` rather than presenting it as current.

### 36.4 Environment-Aware Hardware Evaluation
- **Host Grounding**: Evaluates software against the physical machine (Acer Swift SFG14-73T, Intel Core Ultra 5 125H, 15.7 GB RAM, Intel Arc GPU, Windows 11).
- **5 Compatibility Ratings**: `VERIFIED_COMPATIBLE`, `LIKELY_COMPATIBLE`, `CONDITIONALLY_COMPATIBLE`, `INCOMPATIBLE`, `UNKNOWN`. Never claims verified compatibility without sufficient empirical evidence.

### 36.5 Qualitative Candidate Comparison & 16-Section Decision Brief
- **Matrix Comparison**: Structured evaluation across explicit criteria preserving uncertainty without fake numerical precision.
- **Decision Brief**: 16 standard sections:
  1. Objective | 2. Scope | 3. Key Findings | 4. Evidence Summary | 5. Evaluated Options | 6. Tradeoff Analysis | 7. Key Risks & Caveats | 8. Unknowns & Gaps | 9. Constraints | 10. Dependencies | 11. Cost Considerations | 12. Implementation Implications | 13. Open Questions | 14. Decisions Required | 15. Recommendation (Clearly segregated) | 16. Sources & Citations.

### 36.6 Immutable Decision History & Review
- **Decision Records**: Persistent append-only records with objective, chosen candidate, rationales, assumptions, approver (`Rushikesh Pattiwar`), and timestamp.
- **Decision Reviews**: Re-evaluates historical decisions against new evidence without rewriting historical records, recommending `MAINTAIN` or `UPDATE`.

### 36.7 Governed Action Bridge
- **Proposed Action Artifacts**: Translates decisions into proposed Missions, Goals, Workflows, Skills, and Environment Changes.
- **Sovereign Human Authority**: All consequential actions are generated in `PENDING_APPROVAL` status with `requiresApproval = true`. Consequential actions are never dispatched autonomously without Rushikesh's explicit confirmation.

### 36.8 Persistence Layer (Migration 032)
- Relational schema in SQLite:
  - `research_cases`: Persistent research investigations and lifecycles.
  - `research_candidates`: Evaluated options, hardware specs, licenses, and compatibility.
  - `research_comparisons`: Evaluation criteria, candidate scores, and qualitative matrices.
  - `decision_records`: Immutable historical decisions with rationales and assumptions.
  - `decision_reviews`: Post-decision review audits and recommendations.
  - `decision_proposed_actions`: Bridge connecting decisions to execution engines behind approval gates.

---

## 37. Persistent Distributed Execution & 24/7 Operations Fabric (FP-19)

### 37.1 Distributed Execution Substrate Architecture
- **Underlying Substrate**: Acts as the low-level execution fabric underneath Missions (FP-14), Workflows (FP-11), Goals (FP-15), Skills (FP-20), and Company OS (FP-18).
- **Five Locality Tiers**: `LOCAL` (Acer Swift laptop), `LAN` (secondary home/office machines), `REMOTE` (VPS/SSH servers), `CLOUD` (on-demand compute instances), and `HOSTED` (serverless worker runtimes).

### 37.2 Distributed Leases & Monotonic Fencing Tokens
- **Mutual Exclusion Locking**: Exactly-one-active-worker per job via distributed leases.
- **Monotonic Fencing Engine**: Every lease grant or takeover increments a 64-bit monotonic fencing token (`fencingToken = max(existingToken) + 1`).
- **Split-Brain & Zombie Prevention**: Writes and checkpoint commits must present a matching, active fencing token. Outdated tokens from partitioned or slow workers are rejected.

### 37.3 Incremental Checkpointing & State Migration
- **Step-Level Snapshots**: Serializable execution state (step indices, memory context, variables, completed step results).
- **Verification Evidence**: Checkpoints store hashes, output verification digests, and environment telemetry.
- **Cross-Runtime Migration**: `JobMigrationPackage` transports complete state between workers (e.g. from local to LAN/cloud) with zero loss of progress.

### 37.4 Multi-Queue Priority Scheduling & Fairness
- **5 Priority Queues**: `CRITICAL` (P0), `HIGH` (P1), `NORMAL` (P2), `LOW` (P3), `BACKGROUND` (P4).
- **Constraint Matching**: Enforces minimum CPU, RAM, GPU backends (Vulkan/DirectML vs CUDA), and tool availability.
- **Fair-Share & Anti-Starvation**: Aging escalates starved lower-priority jobs.

### 37.5 Autonomous Recovery & Dead-Letter Routing
- **Heartbeat Daemon**: Workers emit heartbeats every 10s; 3 missed heartbeats marks worker `OFFLINE`.
- **Orphan Job Takeover**: Expired leases and abandoned jobs are reclaimed and re-queued.
- **Exponential Backoff & Jitter**: Failed jobs retry up to `maxRetries` with backoff; exhausted jobs route to `DEAD_LETTER` for operator triage.

### 37.6 Sovereign Cloud Cost Governance
- **Strict Human Approval Gate**: Autonomous 24/7 operations are permitted on zero-incremental-cost runtimes (`LOCAL`, `LAN`, pre-paid `REMOTE`). Provisioning or dispatching to paid cloud instances strictly requires operator approval (`DENY_PAID_WITHOUT_APPROVAL`).
- **Budget Caps**: Hard limits on hourly and total spend per job.

### 37.7 Relational Schema (Migration 033)
- 9 relational tables in SQLite (`data/hrisekesa.db`):
  - `execution_runtimes`: Compute node definitions and hardware profiles.
  - `execution_workers`: Active daemons with dynamic inventories.
  - `execution_jobs`: Durable job definitions, priorities, states, and retry counters.
  - `execution_leases`: Leases with monotonic fencing tokens and TTL expiration.
  - `execution_checkpoints`: Serialized step snapshots and verification evidence.
  - `execution_queues`: Stratified priority queues with concurrency limits.
  - `cloud_providers`: Cloud endpoints, regions, credentials metadata, and quotas.
  - `cloud_instances`: Provisioned virtual instances with cost classes.
  - `execution_traces`: Immutable append-only audit log of all execution events.



