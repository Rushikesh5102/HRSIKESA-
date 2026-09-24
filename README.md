# HṚṢĪKEŚA (हृषीकेश)
### Sovereign Personal AI Operating System & Autonomous Workforce

```
  _   _   ___   ____    ___   _  __  _____   ____     _    
 | | | | |  _ \ / ___|  |_ _| | |/ / | ____| / ___|   / \   
 | |_| | | |_) |\___ \   | |  | ' /  |  _|   \___ \  / _ \  
 |  _  | |  _ <  ___) |  | |  | . \  | |___   ___) |/ ___ \ 
 |_| |_| |_| \_\|____/  |___| |_|\_\ |_____| |____//_/   \_\
```

> **Official Name:** HṚṢĪKEŚA (हृषीकेश)  
> **International Filesystem / ASCII Alias:** `HRISEKESA`  
> **Sole Creator & Master:** Rushikesh Pattiwar  
> **Current Status:** PHASE 25 — Full Autonomous Company Operations (COMPLETED & VERIFIED)  
> **Primary Local Model:** Qwen 2.5 (7B) via Ollama 0.34.2 (CPU Mode)  
> **Primary Development IDE:** Antigravity  

---

## 🌟 Vision & Mission

**HṚṢĪKEŚA** is an autonomous personal AI operating system and enterprise-grade workforce designed specifically for its creator, **Rushikesh Pattiwar**.

HṚṢĪKEŚA is **not** a new foundation model. It is an orchestration, cognition, and execution control plane designed to unify:
- Multi-tier AI models (local zero-cost inference via Ollama + frontier cloud providers)
- Long-term structured memory & personal identity governance
- Full Autonomous Company Operations (Phase 25) coordinating the authoritative 17-agent workforce across the complete business operating loop (`MARKET NEED -> STRATEGY -> ORG -> PRODUCT -> QA -> MARKETING -> SALES -> ORDERS -> FULFILLMENT -> SUPPORT -> BILLING -> OPS -> IMPROVEMENT -> EXPANSION -> RETIREMENT`)
- Multimodal Vision + Advanced Voice (Phase 24) unifying auditory, visual, textual, and desktop environmental perceptions (`HEAR -> UNDERSTAND -> SEE -> REASON -> ACT -> OBSERVE -> SPEAK -> VERIFY -> REMEMBER`)
- External / Enterprise Environments (Phase 23) for cross-environment execution fabric (SSH, WinRM, Linux, RDP/VDI, Cloud, Containers, CI/CD, Remote Browser) with zero credential harvesting
- Advanced Computer Operator (Phase 22) for semantic UI automation, coordinate-free accessibility control, and multi-app desktop workflows
- Dynamic Model Context Protocol (MCP) & Capability Ecosystem (Phase 21) for zero-trust sandboxing, static inspection, drift detection, and immediate capability revocation
- Skills & Procedural Intelligence (Phase 20) for compiling reusable operational knowledge into native DAGs with deterministic verification, human authority governance, and safe self-evolution
- Advanced Memory & Knowledge Graph (Phase 19) for structured, temporal, provenance-aware graph intelligence and 3D visualization
- Advanced Model Router & Intelligence Gateway (Phase 18) for provider- and model-agnostic intelligent routing
- Advanced Research & Web Intelligence Subsystem (Phase 17) for evidence-grounded research, cross-source verification, contradiction detection, and citation generation
- Persistent Autonomous Operations & Reusable Open-Source Capabilities (Phase 16) for continuous multi-day goals
- Autonomous Goal Management & Independent Verification Engine (Phase 15) for sovereign objective-driven execution
- Company & Project Operating System (Phase 14) for persistent enterprise entities, departments, and products
- Multi-agent autonomous workforces organized into specialized departmental hierarchies (17 specialized agents)
- Browser automation and web inspection via `playwright-core`
- Windows desktop & GUI automation via `WindowsComputerAdapter`
- Semantic Windows UI Automation via .NET `UIAutomationClient` (`WindowsUiaAdapter`)
- Local voice input & output pipeline (Faster-Whisper / Windows STT + Piper / SAPI TTS)
- Software & Environment Manager for safe software discovery, executable verification, process tracking, and `winget` integration
- Push-to-talk interactive voice and shell execution environments

---

## 🏛️ Core Philosophy

```
  LLM                    = Brain
  Tools / MCP            = Hands
  Structured Memory      = Long-Term Knowledge
  Agent Runtime          = Nervous System
  Multi-Agent Workforce  = Specialized Departments
  Computer / Environment = World
  Voice & Audio Pipeline = Ears & Voice
  HṚṢĪKEŚA               = The Sovereign Control & Orchestration Layer
```

---

## 👥 Specialized Agent Workforce (Phase 5-10 Roster)

HṚṢĪKEŚA commands a specialized internal workforce governed by strict role definitions, capability tags, and tool whitelists:

| Agent | Name | Role | Primary Domain | Max Danger Tier | Key Allowed Tools |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`arjuna`** | Arjuna | Software Engineering | Code construction, refactoring, semantic UI automation, environment | `TIER_1` | `filesystem.*`, `terminal.execute`, `browser.*`, `computer.*`, `environment.*`, `ollama.*` |
| **`chanakya`** | Chanakya | Strategy & Planning | Mission decomposition, task delegation, coordination | `TIER_1` | `filesystem.*`, `browser.*`, `ollama.chat`, `time.now` |
| **`arya`** | Arya | Research & Analysis | Knowledge synthesis, architectural evaluation, web browsing | `TIER_1` | `filesystem.*`, `browser.*`, `ollama.chat`, `time.now` |
| **`aditi`** | Aditi | Testing & Verification | Test execution, QA gates, validation | `TIER_1` | `filesystem.*`, `terminal.execute`, `ollama.chat` |
| **`agastya`** | Agastya | Systems & Infrastructure | Environment diagnostics, performance, UI inspection, process discovery | `TIER_1` | `system.info`, `filesystem.*`, `computer.*`, `environment.applications.*`, `environment.process.*`, `terminal.execute`, `ollama.models` |

---

## 💻 Host Environment & Target Hardware

HṚṢĪKEŚA is engineered to operate fluidly within the physical envelope of Rushikesh's primary machine:

| Component | Specification |
| :--- | :--- |
| **Model** | Acer Swift SFG14-73T |
| **Processor** | Intel Core Ultra 5 125H (14 physical cores / 18 logical threads, integrated NPU) |
| **Memory** | 15.7 GB Physical RAM (~5.1 GB active for Ollama + Qwen 7B, ~76 MB Node.js runtime) |
| **Graphics** | Intel Arc Graphics (~2 GB dedicated pool) |
| **Operating System** | Windows 11 (64-bit) |
| **Local Runtimes** | Node.js v24.21.0, npm 11.19.0, Python 3.14.7, pip 26.2.1, Git 2.55.0, Ollama 0.34.2 |
| **Local Model** | `qwen2.5:7b` (Q4_K_M, 4.7 GB on disk, 4096 context tokens tested) |
| **Voice Subsystem**| Dual-Engine STT (Faster-Whisper / Windows Speech) + Dual-Engine TTS (Piper / Windows SAPI) |
| **UI Automation**  | Native .NET `UIAutomationClient` (`WindowsUiaAdapter`) with coordinate fallback |
| **Environment Mgmt**| Multi-source discovery (Catalog, Start Menu, App Paths, PATH) + PID lifecycle tracking + `winget` |
| **Persistence** | Embedded SQLite (`node:sqlite` in WAL mode, `data/hrisekesa.db`) |

---

## 🚀 Quick Start & Development

### 1. Run Automated Test Suite
```bash
npm test
```
*Executes 724 tests across 99 test suites covering Identity, Config, Lifecycle, Event Bus, Logger, Hardware, Registry, Router, Sessions, Conversation, Ollama (with live inference), Cloud Adapters, HTTP Gateway, SQLite Persistence, Creator Profile, Context Assembly, Tool Registry, Danger Tiers & Permissions, Built-in Tools, Security Sandboxing & Redaction, MCP Client Adapter, Tool Execution Bus, Agent Registry & Runtime, Task & Mission Persistence, Delegation Guardrails, Shared Blackboard, Mission Orchestrator, Browser Automation & URL Sandboxing, Windows Computer / Desktop Control, Local Voice Subsystem (STT, TTS, Pipeline, Security), Semantic Windows UI Automation, Software & Environment Management, Control Center & Agent Town, Long-Term Semantic Memory & Hybrid Retrieval, Autonomous Goal Management & Verification Engine, Persistent Autonomous Operations, Research Intelligence, Model Router & Intelligence Gateway, Advanced Memory & Knowledge Graph, Skills & Procedural Intelligence, Dynamic MCP & Capability Ecosystem, Advanced Computer Operator, External / Enterprise Environments, Multimodal Vision + Voice, and Full Autonomous Company Operations.*

### 2. Build for Production
```bash
npm run build
```

### 3. Launch the Runtime Gateway
```bash
npm start
```
*Binds securely to `http://127.0.0.1:4200` with 47 registered tools across 8 categories [system, filesystem, ollama, terminal, browser, computer, environment, company].*

---

## 🔌 Verified HTTP API Endpoints

All endpoints are bound strictly to `127.0.0.1`:

| Method | Endpoint | Description | Sample Output |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health, lifecycle status, uptime | `{"status": "ok", "lifecycleState": "READY", "uptimeSeconds": 13}` |
| `GET` | `/identity` | Sovereign system & Rushikesh Pattiwar identity | `{"authorityContext": {"system": {"name": "HṚṢĪKEŚA"}, "owner": {"fullName": "Rushikesh Pattiwar"}}}` |
| `GET` | `/status` | Complete hardware specs, RAM utilization, providers | Returns CPU, RAM, GPU, active locks, and provider records |
| `GET` | `/models` | Real-time registry of local and cloud models | Real-time status for Ollama, OpenAI, Anthropic, Gemini |
| `POST` | `/chat` | Conversational turn with tool calling & memory | `{ "success": true, "response": "...", "toolCallsExecuted": [...], "model": "qwen2.5:7b" }` |
| `GET` | `/tools` | List 41 registered tools across 7 categories | `{"success": true, "count": 41, "tools": [...]}` |
| `POST` | `/tools/:id/execute` | Execute tool through validation, permissions & audit | `{"success": true, "result": {"output": {...}, "durationMs": 4}}` |
| `GET` | `/tools/audit` | Query append-only execution audit trail with secret masking | `{"success": true, "count": 12, "audit": [...]}` |
| `GET` | `/agents` | List all registered workforce agents, roles & tier limits | `{"success": true, "count": 5, "agents": [...]}` |
| `POST` | `/missions` | Create and orchestrate an autonomous multi-agent mission | `{"success": true, "mission": {"id": "msn_789", ...}, "result": {...}}` |

---

## 🔒 Governance & Security Notice

HṚṢĪKEŚA recognizes **Rushikesh Pattiwar** as its sole authorized master. No autonomous actions in higher danger tiers (system modifications, package installations, process terminations) execute without explicit interactive confirmation. The system is designed for authorized computer-use and never includes mechanisms to bypass enterprise security, DLP, or MFA.

