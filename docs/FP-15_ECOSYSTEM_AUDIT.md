# HṚṢĪKEŚA (हृषीकेश) — FP-15 Universal Application & Service Ecosystem Audit

> **Audit Date:** 2026-09-26  
> **Milestone:** FP-15 Universal Application & Service Ecosystem  
> **Status:** AUDITED & CLASSIFIED  
> **Master & Sovereign Owner:** Rushikesh Pattiwar  
> **English Self-Name:** Rishi ("I'm Rishi")  

---

## 1. Executive Summary

This audit rigorously inspects the current HṚṢĪKEŚA codebase across FP-01 through FP-14, Phase 6 (Browser), Phase 8/24 (Voice & Multimodal), Phase 10 (Software & Environment Manager), Phase 20 (Skills), Phase 21 (MCP), and Phase 23 (Enterprise Remote Environments).

The objective of **FP-15** is **NOT** to construct another mission coordinator or duplicate capability execution engines. Rather, FP-15 sits:
- **ABOVE** the connection & execution infrastructure (FP-07 Capability Fabric, FP-12 Account Fabric, FP-13 Digital Workspace Operator, FP-11 Workflow Engine, FP-20 Skills, FP-21 MCP).
- **BELOW** mission orchestration (FP-14 Universal Agentic Mission & Workforce Runtime).

FP-15 provides **Universal Ecosystem Resolution**: taking high-level intents or mission objectives and deterministically selecting the authorized service, account, capability, and execution interface (API vs. CLI vs. MCP vs. Browser vs. Desktop UIA vs. Workspace Operator).

---

## 2. Classification Schema

Every requested capability and ecosystem dimension is classified as follows:
- **`EXISTING`**: Already fully implemented, verified, and operational in the codebase.
- **`EXTEND`**: Core implementation exists; requires normalization or bridge into the unified FP-15 ecosystem resolution layer.
- **`ADAPTER`**: Provider-specific adapter or specialized connector required.
- **`MISSING`**: Genuinely new functionality required in FP-15.
- **`DEFERRED`**: External authorization, paid cloud subscription, or external physical service currently unavailable.
- **`UNSAFE`**: Prohibited by sovereign safety policy (e.g. bypass of MFA/CAPTCHA, evasion of rate limits, destructive untrusted execution).

---

## 3. Subsystem-by-Subsystem Audit

### 3.1 Accounts & Credential Vault (FP-12)
- **Location:** `src/accounts/`
- **Supported Providers:**
  - Google Workspace (`google.provider.adapter.ts`): OAuth2, Gmail search/read/send, Calendar list/create, Drive search/read. -> **`EXISTING`**
  - GitHub (`github.provider.adapter.ts`): OAuth2, API Key, Repos, Issues, Pull Requests, Actions, Workflows. -> **`EXISTING`**
  - Microsoft 365 (`microsoft.provider.adapter.ts`): OAuth2, Outlook mail search/read/send, Calendar list/create, OneDrive search/read, Teams messages. -> **`EXISTING`**
  - Slack (`slack.provider.adapter.ts`): OAuth2, API Key, Channels list, Messages read/send. -> **`EXISTING`**
  - Generic REST (`generic_rest.provider.adapter.ts`): GET, POST, PUT, PATCH, DELETE with SSRF protection, private IP filtering, domain allowlists, and payload limits. -> **`EXISTING`**
  - Local CLI Tools (`cli.provider.adapter.ts`): `gh`, `gcloud`, `aws`, `az` state and execution. -> **`EXISTING`**
  - MCP Servers (`mcp.provider.adapter.ts`): Tools and resources invocation over MCP. -> **`EXISTING`**
  - API Key Services (`apikey.provider.adapter.ts`): Encrypted credentials resolution from vault. -> **`EXISTING`**
- **Multi-Account & Scope Isolation:**
  - `AccountResolver`: Personal vs. Company vs. Project scope isolation; enforces tenant boundary. -> **`EXISTING`**
- **Credential Security:**
  - `CredentialVault`: AES-256-GCM encryption, secret redaction filter (`redactSecrets`), zero leakage to LLM prompts. -> **`EXISTING`**
- **Classification:** **`EXISTING`** (Reuse directly via FP-12 facade).

### 3.2 Capabilities Fabric (FP-07)
- **Location:** `src/capabilities/`
- **State:** `UniversalCapabilityFabric` maintains `CapabilityRegistry` with invariant verification strategies, untrusted data defanging, risk tiering, and connector interfaces.
- **Registered Capabilities:** Over 60 core capabilities spanning filesystem, system, network, model, memory, search, git, code.
- **Classification:** **`EXISTING`** (FP-15 resolves into these capabilities).

### 3.3 GitHub & Open-Source Intelligence (FP-08)
- **Location:** `src/github/`
- **State:** Complete `GitHubFabric` wiring rate-limited client, SPDX license analyzer, dependency graph scanner, security heuristics, SQLite repository store, and isolated directory sandboxing.
- **Classification:** **`EXISTING`** (Do not duplicate; reuse FP-08 operations).

### 3.4 Universal IDE & Development Workspace (FP-09)
- **Location:** `src/ide/`
- **State:** `IdeFabric` wiring WorkspaceManager, CodeSearchEngine, Precision EditorEngine (single replace & bottom-up multi-chunk transaction), TerminalManager, Dev PreviewManager, and 10-Stage Verification Loop.
- **Classification:** **`EXISTING`** (Do not duplicate; invoke via FP-09).

### 3.5 Autonomous Software Engineering (FP-10)
- **Location:** `src/engineering/`
- **State:** `AutonomousEngineeringFabric` executing closed-loop repair with conflict detection (SHA-256 baseline hashing), diagnostic normalization, convergence monitoring, and 9 engineering skills.
- **Classification:** **`EXISTING`** (Reuse directly).

### 3.6 Universal Workflow Engine (FP-11)
- **Location:** `src/workflows/`
- **State:** `NativeWorkflowEngine` supporting 8 step types (HTTP, Script, CLI, Agent Prompt, Approval, Transform, Condition, Fork/Join) with Kahn's DAG topo-sort and checkpoint recovery.
- **Classification:** **`EXISTING`** (FP-15 bridges ecosystem capability references to workflow steps).

### 3.7 Digital Workspace Operator & Applications (FP-13)
- **Location:** `src/operator/`
- **Application Model:** `ApplicationDescriptor` in `src/operator/types/application.types.ts` models Windows binaries, web apps, IDEs, terminals, and remote services with readiness states and health statuses.
- **Workspace Operator:** `DigitalWorkspaceOperator` controls application lifecycle (discover, launch, focus, observe, UIA interaction, graceful terminate).
- **Classification:** **`EXISTING`** (Reuse `ApplicationDescriptor` directly without duplication).

### 3.8 Universal Agentic Mission & Workforce Runtime (FP-14)
- **Location:** `src/mission/`
- **State:** 17-agent workforce runtime, workforce planner, compiler, blackboard, and acceptance engine.
- **Classification:** **`EXISTING`** (FP-15 sits below FP-14 to supply resolved capability plans).

### 3.9 Model Context Protocol (MCP) Ecosystem (FP-21)
- **Location:** `src/mcp/`
- **State:** Complete MCP client service, transport factory (stdio, SSE), server registry, security validator, process manager, capability discovery and adapter service.
- **Classification:** **`EXISTING`** (FP-15 integrates MCP discovery and trust rating into unified ecosystem catalog).

### 3.10 Browser Automation (Phase 6)
- **Location:** `src/tools/browser/`
- **State:** `PlaywrightAdapter` supporting chromium, chrome, edge, webkit with DOM inspection, accessibility trees, clicking, typing, and full screenshots.
- **Classification:** **`EXISTING`** (Browser DOM interface available as fallback interface).

### 3.11 Software & Environment Manager (Phase 10)
- **Location:** `src/environment/`
- **State:** `KnownAppCatalog` covers Notepad, Calc, Paint, Blender, VS Code, Git, Node.js, Python, Ollama, Chrome, Edge, Android Studio. `AppDiscovery` inspects Windows Registry and Start Menu. `WingetAdapter` provides verified package management.
- **Classification:** **`EXISTING`** (Leverage for local application and CLI discovery).

### 3.12 Enterprise Remote Environments (Phase 23)
- **Location:** `src/environment/enterprise/`
- **State:** Adapters for SSH, Linux, Windows Remote, RDP/VDI, Cloud (AWS/Azure/GCP), Containers (Docker), Remote Browser, and CI/CD.
- **Classification:** **`EXISTING`** (Available for remote execution environments).

### 3.13 Procedural Skills (Phase 20)
- **Location:** `src/skills/`
- **State:** Built-in skill library with `SkillRegistry`, `SkillMatcher`, `SkillExecutionEngine`, and security validation.
- **Classification:** **`EXISTING`** (Skills resolve dependencies through FP-15).

### 3.14 Multimodal & Media Ecosystem
- **Observation & Vision:** `VisionEngine` and `multimodal.observe` tool provide OCR, screen hierarchy inspection, and visual verification. -> **`EXISTING`**
- **Voice Synthesis & Streaming:** `StreamingVoiceCoordinator` provides local TTS/STT. -> **`EXISTING`**
- **Media Generation (Text-to-Image / Video / 3D Diffusions):** **`ABSENT`**. Generative media pipelines are not implemented in the repository and are documented as candidates for a dedicated future block. -> **`DEFERRED`**

---

## 4. Capability Matrix

| Ecosystem / Domain | Interface Type | Existing Status | Authentication | Scope Boundaries | Key Operations | FP-15 Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Workspace** | REST / OAuth2 | `EXISTING` | OAuth2 (PKCE) | User, Mail, Calendar, Drive | `gmail.search`, `gmail.read`, `gmail.send`, `calendar.list`, `calendar.create`, `drive.search`, `drive.read` | Normalize in ServiceCatalog |
| **GitHub** | REST / GraphQL | `EXISTING` | OAuth2 / API Key | Read/Write Repos, Issues, PRs | `repo.read`, `issue.list`, `issue.create`, `pr.create`, `actions.status`, `workflow.manage` | Normalize in ServiceCatalog |
| **Microsoft 365** | REST (Graph API) | `EXISTING` | OAuth2 (PKCE) | Mail, Calendar, Files, Teams | `outlook.read`, `outlook.send`, `calendar.list`, `calendar.create`, `onedrive.read`, `teams.messages` | Normalize in ServiceCatalog |
| **Slack** | REST API | `EXISTING` | OAuth2 / Bot Token | Channels, Messages | `channels.list`, `messages.read`, `messages.send` (HITL gated) | Normalize in ServiceCatalog |
| **Generic REST** | HTTP (JSON) | `EXISTING` | Key / Basic / OAuth | Domain Allowlist, SSRF Block | `rest.request.get`, `post`, `put`, `patch`, `delete` | Expose to Ecosystem |
| **Local CLI Tools** | Process / Stdout | `EXISTING` | Process env / PATH | Strict command allowlist | `gh`, `gcloud`, `aws`, `az`, `git`, `npm`, `node`, `python`, `docker` | Dynamic CLI Discovery |
| **Local Applications** | Desktop GUI / UIA | `EXISTING` | OS User / UAC Gate | Workspace isolation | Blender, VS Code, Chrome, Edge, Paint, Calc, Android Studio | Dynamic App Discovery |
| **MCP Servers** | stdio / SSE | `EXISTING` | Local / Key | Trust level, Sandboxed tools | `tools.call`, `resources.read` | Dynamic MCP Discovery |
| **Web / Browser** | Playwright / DOM | `EXISTING` | Session cookies / local | Sandbox / origin isolation | Navigate, click, type, screenshot, extract text | Secondary Fallback Interface |
| **Media Generation** | Generative Models | `ABSENT` | N/A | N/A | Text-to-Image, Generative Video | **`DEFERRED`** to future block |

---

## 5. Architectural Gap Analysis: What FP-15 Must Add

While the underlying adapters and components exist across FP-07 to FP-14, the missing layer is the **unified ecosystem resolution and discovery brain**:

1. **`ServiceDescriptor` Normalization:** A canonical, universal data contract describing all services across providers, their supported interfaces, authentication methods, account requirements, risk profiles, and operational bindings.
2. **Deterministic Interface Resolution Engine (`InterfaceResolver`):** Given an operation (e.g. "create issue" or "edit 3D model"), deterministically select the optimal interface (`API` -> `MCP` -> `CLI` -> `Browser` -> `Desktop UIA` -> `Coordinate Vision`) based on reliability, latency, privacy, and account health.
3. **Unified Service Discovery Engine (`ServiceDiscoveryEngine`):** Scans and synthesizes registered adapters, MCP servers, installed applications, PATH CLI tools, and active accounts into a unified catalog with provenance.
4. **Natural Language Fast-Path Capability Resolution:** Enables queries like *"Can you access Gmail?"*, *"Can you use GitHub?"*, *"Can you open Blender?"* to resolve immediately with zero large-model latency and zero hallucination.
5. **Consequential Action Verification Engine:** Verifies that external mutating actions (issue creation, calendar scheduling, file upload, message dispatch) actually succeeded by retrieving independent state proof before reporting success.
6. **Ecosystem UI (`EcosystemView.tsx`):** A glassmorphic observatory view displaying services, applications, accounts, capabilities, MCP servers, interfaces, and health telemetry.
7. **Ecosystem REST & CLI Endpoints:** Unified REST endpoints (`/api/ecosystem/*`) and CLI subcommands (`hres ecosystem ...`).
8. **Persistence Migration 029:** SQLite persistence for ecosystem service descriptors, interface bindings, and consequential verification logs.
