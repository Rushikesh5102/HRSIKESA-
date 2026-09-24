# HRSIKESA — Open-Source Repository Audit

> **Audit Date:** 2026-09-21
> **Purpose:** Evaluate mature, production-grade open-source projects for integration into HRSIKESA's MVP stack
> **Scope:** Identify what to REUSE (as adapters/components) vs. BUILD OURSELVES
> **Constraint Profile:** 15.7 GB usable RAM · Intel Core Ultra 5 125H · Intel Arc iGPU · Windows native · Node.js 24 kernel
> **Guiding Rule:** HRSIKESA remains the sovereign control plane. External projects plug into our Tool Execution Bus, Kernel, and Memory system — they do NOT replace them.

---

## STRATEGY DECLARATION

Before any line of Phase 5 code is written, this audit defines which open-source projects HRSIKESA will integrate, which it will wrap, and which it will decline.

**Integration tiers used in this document:**

| Tier | Meaning |
|------|---------|
| ADOPT | Integrate as a first-class HRSIKESA component or adapter. Recommended for immediate Phase 5/6 inclusion. |
| WRAP | Use via subprocess, HTTP API, or MCP adapter. HRSIKESA controls it, but does not link it natively. |
| DECLINE | Architecturally incompatible, license conflict, hardware mismatch, or HRSIKESA already covers this. |
| MONITOR | Promising but not yet mature enough; evaluate again in 6-12 months. |

---

## CATEGORY 1: AGENT RUNTIME FRAMEWORKS

*Should HRSIKESA adopt an external multi-agent orchestration runtime?*

### 1.1 OpenHands (formerly OpenDevin)

| Property | Details |
|---|---|
| **GitHub** | `OpenHands/OpenHands` |
| **License** | MIT (core) |
| **Language** | Python |
| **Stars (approx.)** | 44,000+ |
| **Activity** | Very active (daily commits) |
| **Windows** | NOT natively supported. Requires WSL 2 + Docker Desktop. |
| **RAM footprint** | High: Docker container overhead + model. Minimum 16 GB recommended for 7B. |
| **Architecture** | Event-driven. Docker-sandboxed code execution. React frontend. Agent Server + Runtime + EventStream. |
| **Ollama** | Can connect via `http://host.docker.internal:11434`. Functional but adds Docker networking complexity. |

**HRSIKESA Assessment:**

OpenHands is an excellent stand-alone coding agent. However, its architecture fundamentally conflicts with ours:
- Requires Docker, which is a heavy dependency on a 15.7 GB RAM machine already running `qwen2.5:7b` (5.1 GB).
- Not natively composable as a library — it is a full server application.
- Its "Runtime" is a self-contained container environment; integrating it under HRSIKESA's sovereign Tool Bus would require significant re-architecture of their code.
- Designed to BE the orchestrator, not to BE orchestrated.

**Verdict: DECLINE (as a runtime). MONITOR for future subprocess/MCP invocation.**

---

### 1.2 Agent Zero

| Property | Details |
|---|---|
| **GitHub** | `agent0ai/agent-zero` |
| **License** | MIT |
| **Language** | Python |
| **Stars (approx.)** | 15,000+ |
| **Activity** | Active |
| **Windows** | Supported (Docker-based; also native Python) |
| **RAM footprint** | Medium. Docker container + model. Comparable to OpenHands. |
| **Architecture** | "Virtual computer" model. Hierarchical sub-agents. Docker sandbox. MCP client + server. Plugin hub. |
| **Ollama** | Natively supported via `OLLAMA_BASE_URL=http://host.docker.internal:11434`. |
| **MCP** | Bidirectional: can be MCP client AND MCP server. |

**HRSIKESA Assessment:**

Agent Zero is more modular than OpenHands and has better Ollama/local model integration. Its MCP bidirectionality is genuinely interesting. However:
- Still Docker-centric — not native Windows out of the box.
- Python runtime; our kernel is Node.js/TypeScript.
- Designed to be self-contained, not embedded as a HRSIKESA sub-component.
- The hierarchical agent model is something we are building ourselves (Phase 5 Multi-Agent Roster).

**Verdict: DECLINE (as a runtime). WRAP for future experimentation if we need a Python-native execution sandbox.**

---

### 1.3 HRSIKESA's Own Multi-Agent System (Internal Build)

Our Phase 5 plan is to build HRSIKESA's own named agent roster (Vyasa, Chanakya, Arjuna, etc.) that delegates through the Tool Execution Bus. This is the correct architectural decision because:
- Agents are TypeScript objects inside our kernel — zero startup overhead.
- All tool calls are enforced through our sovereign 7-stage bus.
- No Docker dependency.
- Full integration with our 14-tier memory system.
- Each agent gets its own `agent_memory` tier slot from Day 1.

**Verdict: BUILD INTERNALLY — our existing architecture is the right foundation.**

---

## CATEGORY 2: BROWSER AUTOMATION

*What should power HRSIKESA's browser access?*

### 2.1 browser-use

| Property | Details |
|---|---|
| **GitHub** | `browser-use/browser-use` |
| **License** | MIT |
| **Language** | Python 3.11+ |
| **Stars (approx.)** | 116,000+ (fastest-growing browser agent project) |
| **Activity** | Extremely active |
| **Windows** | Native Windows support |
| **RAM footprint** | Light (Playwright + Python process, ~200-400 MB) |
| **Architecture** | LLM-driven agent loop + DOM distillation + Playwright backend. MCP server mode available. |
| **Ollama** | Supported: configure `OPENAI_BASE_URL=http://localhost:11434/v1` |
| **CAPTCHA bypass** | Explicitly out of scope. Cloud tier offers CAPTCHA solving — we will NOT use that. |

**HRSIKESA Assessment:**

browser-use is the most compelling open-source browser agent available. Its key advantage for HRSIKESA:
- **MCP server mode**: HRSIKESA can connect to browser-use as an MCP server using our existing `McpClientAdapter`. No native Python linking required.
- DOM distillation is efficient — sends only interactive elements to the model, not full screenshots.
- Runs as a subprocess or persistent MCP server process — HRSIKESA controls lifecycle.
- Fully controllable from our sovereign Tool Bus via an MCP wrapper tool.

**Integration Plan:**

```
HRSIKESA Kernel
  -> ToolExecutionBus
       -> McpClientAdapter -> browser-use MCP Server (subprocess)
                                -> Playwright -> Chrome/Firefox
```

**Verdict: WRAP via MCP. Adopt in Phase 6.**

---

### 2.2 Playwright (Direct)

| Property | Details |
|---|---|
| **GitHub** | `microsoft/playwright` |
| **License** | Apache 2.0 |
| **Language** | TypeScript/Node.js (native) |
| **Stars** | 72,000+ |
| **Activity** | Microsoft-maintained, extremely active |
| **Windows** | First-class support |
| **RAM footprint** | Chromium: ~200-400 MB per instance |

**HRSIKESA Assessment:**

Playwright is more appropriate than Selenium for scripted, deterministic browser actions. The `@playwright/mcp` package makes it an instant MCP server with zero additional code.

**Integration Plan:**
- For structured, scripted automation (e.g., "open page X, click button Y, extract table Z"): use Playwright MCP directly.
- For open-ended agentic browsing ("research topic X on the web"): use browser-use above Playwright.

**Verdict: ADOPT `@playwright/mcp` as a first-party MCP server for deterministic browser automation.**

---

## CATEGORY 3: COMPUTER / DESKTOP CONTROL

*How should HṚṢĪKEŚA interact with the Windows desktop and non-browser applications?*

### 3.1 Windows Native Subsystem Adapter (`WindowsComputerAdapter`)

| Property | Details |
|---|---|
| **Technology** | Windows Win32 API + System.Drawing + WScript.Shell + Process Management |
| **License** | Built-in Windows Native APIs (Zero External Licensing Constraints) |
| **Language** | TypeScript Kernel + Ephemeral Subprocess Win32 Invocations |
| **Activity** | Core Windows OS APIs, 100% stable |
| **Windows** | Native Windows 10/11 first-class support |
| **RAM footprint** | Negligible (< 15 MB ephemeral memory per invocation) |
| **Capabilities** | Primary screen bounds, desktop screenshots to PNG artifacts, mouse move & click, SendKeys typing, special keypresses, active window inspection, and allowlisted application launching |
| **Advantages** | Zero npm native C++ build tool dependencies (which break on Node 24 V8 ABI), zero heavy Python runtime dependencies, instant execution, and zero chance of native addon crashes. |

**HṚṢĪKEŚA Assessment:**

`WindowsComputerAdapter` provides the leanest, most reliable, and safest foundation for Windows desktop control on this machine:
- No reliance on outdated Node C++ addons (`robotjs` or `@nut-tree/nut-js` node-gyp issues).
- Full audit integration and automatic secret redaction.
- Sandbox security strictly gates application launches to a configured allowlist (`notepad`, `calculator`, `paint`, `browser`, `android-studio`, `blender`).

**Verdict: ADOPT as primary Windows Computer / GUI Automation backend in Phase 7.**

---

### 3.2 @nut-tree/nut-js / RobotJS

| Property | Details |
|---|---|
| **License** | Apache 2.0 / MIT |
| **Language** | C++ Native Addon + TypeScript wrapper |
| **Node.js** | Problematic on Node.js 24 due to V8 ABI changes and native compilation toolchain requirements on Windows. |

**Verdict: DECLINE. Native build complexity and Node 24 V8 ABI incompatibilities introduce runtime fragility.**

---

### 3.4 Windows UI Automation Framework (`UIAutomationClient` / `UIAutomationTypes`) [Phase 9]

| Property | Details |
|---|---|
| **Technology** | Microsoft Windows UI Automation COM / .NET assemblies (`UIAutomationClient.dll`, `UIAutomationTypes.dll`) |
| **License** | Built-in Windows OS Framework Component (100% stable, zero license risk) |
| **Integration** | Ephemeral PowerShell/.NET execution layer with tree caching |
| **Capabilities** | Semantic UI tree inspection, ControlType/AutomationId/ClassName matching, InvokePattern, ValuePattern, Focus & Text interaction |
| **RAM footprint** | < 25 MB ephemeral overhead |
| **Advantages** | Native Windows accessibility engine; discovers rich control hierarchies across Win32, WPF, WinForms, and WinUI 3 without heavy external daemon or fragile C++ node addons. |

**HṚṢĪKEŚA Assessment:**
Native `UIAutomationClient` provides direct access to the Windows accessibility element tree without requiring third-party Python daemons or fragile node-gyp bindings. Combined with depth bounds (max 5) and element caps (max 150), it delivers fast, compact semantic trees directly suitable for LLM reasoning.

**Verdict: ADOPT as primary semantic Windows UI automation layer in Phase 9.**

---

## CATEGORY 4: CODING / SOFTWARE ENGINEERING AGENTS

*Should HRSIKESA integrate a specialized coding agent?*

### 4.1 Aider

| Property | Details |
|---|---|
| **GitHub** | `Aider-AI/aider` |
| **License** | Apache 2.0 |
| **Language** | Python |
| **Stars (approx.)** | 30,000+ |
| **Activity** | Highly active |
| **Windows** | Full native support (PowerShell, CMD, WSL) |
| **Ollama** | `aider --model ollama_chat/qwen2.5:7b` — tested and documented |
| **RAM footprint** | ~200 MB (Python process only; model is in Ollama) |
| **Key features** | Git-native (auto-commits), repo-map via tree-sitter, Architect+Editor split-model mode, diff-style edits |

**HRSIKESA Assessment:**

Aider is the most mature, battle-tested open-source coding agent. It has two critical advantages over building our own:
1. **Repo map**: Uses tree-sitter to build a compressed map of the codebase, providing the model with structural context without loading every file.
2. **Git-native commits**: Every model-proposed change is committed to Git with a sensible message — this is a built-in audit trail for code changes.

**Integration Plan:**

```
User: "Fix the bug in tool.bus.ts"
HRSIKESA Kernel (Arjuna agent)
  -> AiderTool (Tier 2)
       -> subprocess: aider --model ollama_chat/qwen2.5:7b [file]
                        -> qwen2.5:7b (via Ollama) -> git commit
```

Critical caveat: Auto-confirm flags must never be used for destructive operations without human approval. The HRSIKESA Tier system handles this gate.

**Verdict: WRAP as a Tier-2 subprocess tool. Assign to Arjuna (coding agent) in Phase 5.**

---

### 4.2 Continue (IDE Integration)

| Property | Details |
|---|---|
| **GitHub** | `continuedev/continue` |
| **License** | Apache 2.0 |
| **Language** | TypeScript/VS Code extension |
| **Stars** | 22,000+ |
| **Activity** | Very active |
| **Windows** | Full VS Code extension |
| **Ollama** | First-class support |

**HRSIKESA Assessment:**

Continue is a VS Code extension for assisted coding, not a programmatic agent. It is useful for Rushikesh's personal IDE workflow but cannot be controlled by HRSIKESA programmatically. Out of scope for kernel integration.

**Verdict: DECLINE (not programmable from our kernel). Recommended for personal use by Rushikesh.**

---

## CATEGORY 5: VOICE — SPEECH-TO-TEXT (STT)

*How should HṚṢĪKEŚA transcribe spoken input?*

### 5.1 Faster-Whisper / whisper.cpp (Local Quantized Inference)

| Property | Details |
|---|---|
| **Engines** | `faster-whisper` (CTranslate2) / `whisper.cpp` |
| **License** | MIT |
| **Language** | C++ / Python via `uv` execution |
| **Models** | `tiny.en` (~75 MB, ~150 MB RAM), `base.en` (~140 MB) |
| **Hardware** | Optimized CPU quantization (`int8`) and Intel GPU acceleration |
| **Capabilities** | High accuracy multilingual transcription, punctuation, timestamps |

**HṚṢĪKEŚA Assessment:**
Faster-Whisper provides high accuracy transcription with low RAM usage (< 150 MB for `tiny.en`).

### 5.2 Windows Speech Recognition (`System.Speech.Recognition`)

| Property | Details |
|---|---|
| **Engine** | Microsoft Windows Desktop Speech Recognition Engine |
| **License** | Windows Native OS Built-in |
| **RAM footprint** | 0 MB overhead |
| **Latency** | Sub-100ms offline recognition |
| **Advantages** | Zero external downloads, zero configuration, works instantly out-of-the-box on every Windows PC. |

**Verdict: ADOPT Dual-Engine STT Architecture (Faster-Whisper primary with Windows Speech Recognition zero-install fallback). Phase 8.**

---

## CATEGORY 6: VOICE — TEXT-TO-SPEECH (TTS)

*How should HṚṢĪKEŚA speak?*

### 6.1 Piper Neural TTS

| Property | Details |
|---|---|
| **GitHub** | `rhasspy/piper` |
| **License** | MIT |
| **Language** | C++ / ONNX Runtime |
| **RAM footprint** | ~50-100 MB |
| **Quality** | Natural neural speech synthesis across diverse speaker models |

### 6.2 Windows SAPI TTS (`System.Speech.Synthesis`)

| Property | Details |
|---|---|
| **Engine** | Windows SAPI 5.4 / OneCore Synthesizer |
| **License** | Windows Native OS Built-in |
| **RAM footprint** | 0 MB overhead |
| **Latency** | < 20ms instant speech generation |
| **Advantages** | 100% reliable, zero external dependencies, native WAV artifact generation. |

**Verdict: ADOPT Dual-Engine TTS Architecture (Piper Neural TTS primary with Windows SAPI instant zero-latency fallback). Phase 8.**

---

## CATEGORY 7: MEMORY AND VECTOR SEARCH

*Should HRSIKESA add an external memory or RAG system?*

### 7.1 sqlite-vec (Vector Extension for SQLite)

| Property | Details |
|---|---|
| **GitHub** | `asg017/sqlite-vec` |
| **License** | Apache 2.0 / MIT |
| **Language** | C (SQLite extension) |
| **Node.js** | `npm install sqlite-vec` — zero infrastructure, in-process |
| **Integration** | Works directly with `node:sqlite` (our existing native SQLite driver) |
| **Performance** | SIMD-accelerated C, handles hundreds of thousands of vectors with brute-force k-NN |
| **RAM footprint** | Negligible (extension loads into existing SQLite process) |

**HRSIKESA Assessment:**

This is the most architecturally coherent choice for HRSIKESA. Our database is already SQLite with WAL mode. Adding vector search means loading one extension — no new server, no new process, no new dependency runtime.

**Integration Plan:**
1. `npm install sqlite-vec` and `sqliteVec.load(db)` in our `DatabaseManager`.
2. Add `embedding BLOB` column to `memory_items` table via migration `002_vector_search`.
3. Use Ollama's embedding API (`/api/embed`) or a local `nomic-embed-text` model to generate vectors for stored memories.
4. Replace current substring `LIKE` search with `vec_distance_cosine()` ranked k-NN retrieval.

**Verdict: ADOPT. Enables semantic memory retrieval with zero infrastructure change. Phase 5 or early Phase 6.**

---

### 7.2 Mem0

| Property | Details |
|---|---|
| **GitHub** | `mem0ai/mem0` |
| **License** | Apache 2.0 |
| **Language** | Python (primary) + `mem0ai` npm package |
| **Node.js** | Official npm package: `npm install mem0ai` |
| **SQLite** | Uses SQLite for history store by default |
| **Architecture** | Memory manager with LLM extraction, entity deduplication, and vector search |

**HRSIKESA Assessment:**

Mem0 is an excellent memory abstraction with good Node.js support. However:
- Our 14-tier memory system already provides a richer classification than Mem0's flat memory model.
- Adding Mem0 would create a competing memory abstraction that could conflict with our existing `MemoryRepository`.
- The correct approach is to enhance our existing memory system with `sqlite-vec` rather than adding an external layer.
- Mem0 could be revisited if we need its LLM-based entity extraction capabilities in the future.

**Verdict: MONITOR. Our existing memory system is superior in classification; add sqlite-vec instead.**

---

### 7.3 LanceDB

| Property | Details |
|---|---|
| **License** | Apache 2.0 |
| **Node.js** | First-class native SDK |
| **Architecture** | Embedded (like SQLite) — no server required |
| **Windows** | Excellent |

**HRSIKESA Assessment:**

LanceDB is an excellent embedded vector database and would be the second choice if sqlite-vec proves insufficient. Its columnar format is more efficient than SQLite for very large vector collections (1M+ embeddings). At MVP scale, sqlite-vec is the simpler path.

**Verdict: MONITOR as fallback if sqlite-vec performance degrades at scale.**

---

## CATEGORY 8: USER INTERFACE

*What should HRSIKESA's front-end look like at MVP?*

### 8.1 LibreChat

| Property | Details |
|---|---|
| **GitHub** | `danny-avila/LibreChat` |
| **License** | MIT |
| **Language** | Node.js + React |
| **Stars** | 24,000+ |
| **Activity** | Very active |
| **Windows** | Docker or direct Node.js |
| **RAM footprint** | ~300-500 MB (Node.js server + React) |
| **API** | Connects to any OpenAI-compatible API — works with HRSIKESA's HTTP API |
| **Features** | Multi-provider chat, agents, MCP support, file upload, conversation management |

**HRSIKESA Assessment:**

LibreChat is the correct choice for HRSIKESA's chat interface because:
- MIT license — no branding restrictions (unlike Open WebUI which changed to custom license in April 2025 with commercial restrictions for >50 users).
- Connects to any OpenAI-compatible API, meaning we point it at `http://localhost:3000` with minimal configuration.
- The Node.js stack matches our existing runtime.
- MCP support means LibreChat agents could eventually be routed through HRSIKESA's MCP server capability.

**Integration Plan:**
- Run LibreChat against our existing HRSIKESA HTTP API.
- Configure `OPENAI_BASE_URL=http://localhost:3000`.
- Custom branding: HRSIKESA as system name.
- This replaces our simple terminal chat interface with a proper web UI.

**Verdict: WRAP as UI frontend. Phase 8.**

---

### 8.2 Open WebUI

| Property | Details |
|---|---|
| **License** | Custom "Open WebUI License" (since April 2025) — branding restrictions apply |
| **Best for** | Ollama-native setups |

**Verdict: DECLINE. License change introduces risk. LibreChat (MIT) is superior choice.**

---

## CATEGORY 9: MCP ECOSYSTEM

*Which MCP servers should HRSIKESA connect to immediately?*

Our existing `McpClientAdapter` is already built. The following are the highest-value MCP servers to connect to in Phase 5:

### Priority MCP Servers

| Server | Package | Danger Tier | Purpose |
|---|---|---|---|
| **Filesystem** | `@modelcontextprotocol/server-filesystem` | 0-1 | Read/write workspace files. Extends our existing built-in scope. |
| **Playwright** | `@playwright/mcp` | 1 | Deterministic browser automation. Accessibility tree based, not vision. |
| **GitHub** | `@modelcontextprotocol/server-github` | 1-2 | PR/issue management, code review, Actions. |
| **Git** | `@modelcontextprotocol/server-git` | 1 | Local git repository operations (log, diff, blame). |
| **Fetch/Web** | `@modelcontextprotocol/server-fetch` | 0 | Read web pages as Markdown. Zero browser overhead. |
| **SQLite** | `@modelcontextprotocol/server-sqlite` | 1 | Natural language SQL queries over HRSIKESA's own database. |

### MCP Security Policy (HRSIKESA Rule)

All external MCP servers connect via our `McpClientAdapter`. External server tool calls are ALWAYS routed through our `ToolExecutionBus` 7-stage pipeline. No external MCP server can bypass our permission and approval gates. This is non-negotiable.

**Verdict: ADOPT all six servers above. Immediate Phase 5 priority.**

---

## CATEGORY 10: SANDBOXING / ISOLATION

*How should HRSIKESA isolate risky tool execution?*

### 10.1 Current State

HRSIKESA Phase 4 already implements logical sandboxing:
- Filesystem tools are path-sandboxed to `workspaceRoot`.
- Terminal tools run only whitelisted read-only commands.
- Tier 3+ operations require explicit human approval.

### 10.2 Docker (Process-Level Sandbox)

| Property | Details |
|---|---|
| **RAM overhead** | ~400-600 MB per container (Docker for Windows). |
| **Windows** | Docker Desktop with WSL 2 backend. |
| **Use case** | Isolated code execution (compiling untrusted code, running agent-generated scripts). |

**HRSIKESA Assessment:**

Docker is the appropriate sandbox for Tier 3+ code execution (agent-generated scripts, untrusted code). However, at 15.7 GB RAM with qwen2.5:7b (5.1 GB), running a Docker container simultaneously is tight. Reserved for future phases when Rushikesh decides to enable unrestricted code execution.

**Verdict: MONITOR. Do not install until Phase 6 explicitly requires it. Our Tier system gates this anyway.**

---

### 10.3 Node.js vm module (In-Process Sandbox)

Node.js's built-in `vm` module provides isolated JavaScript execution contexts. This is appropriate for running LLM-generated JavaScript snippets at Tier 2.

**Verdict: ADOPT for in-process JS sandboxing when needed. Zero new dependencies.**

---

## MASTER ADOPTION MATRIX

| Capability | Chosen Solution | Integration Mode | Phase | License | Approx. RAM |
|---|---|---|---|---|---|
| Agent Runtime | Built internally (HRSIKESA agents) | Native kernel | Phase 5 | N/A | 0 MB |
| Browser (agentic) | browser-use | MCP server subprocess | Phase 6 | MIT | ~300 MB |
| Browser (scripted) | `@playwright/mcp` | MCP server | Phase 6 | Apache 2.0 | ~300 MB |
| Desktop control | pywinauto | MCP server subprocess (Python) | Phase 6 | BSD-3-Clause | ~50 MB |
| Desktop (pixel) | PyAutoGUI (secondary) | Tool subprocess | Phase 6 | BSD-3-Clause | ~20 MB |
| Coding agent | Aider | Subprocess tool | Phase 5 | Apache 2.0 | ~200 MB |
| STT | whisper.cpp (Vulkan) | npm binding | Phase 7 | MIT | ~250 MB |
| TTS | Kokoro (kokoro-js) | npm package | Phase 7 | Apache 2.0 | ~400 MB |
| Vector search | sqlite-vec | SQLite extension | Phase 5-6 | Apache 2.0/MIT | ~0 MB |
| Memory system | Built internally (14-tier) | Native kernel | Done | N/A | 0 MB |
| MCP servers (6) | Official servers | McpClientAdapter | Phase 5 | MIT/Apache | ~50 MB ea. |
| Chat UI | LibreChat | External web server | Phase 8 | MIT | ~400 MB |
| Code sandbox | Node.js vm | In-process | Phase 6 | Built-in | 0 MB |

### Estimated RAM Budget (Phase 5-8 Fully Loaded)

| Component | RAM |
|---|---|
| qwen2.5:7b (Ollama) | ~5,100 MB |
| HRSIKESA kernel | ~150 MB |
| LibreChat | ~400 MB |
| Aider subprocess | ~200 MB |
| whisper.cpp | ~250 MB |
| Kokoro TTS | ~400 MB |
| browser-use + Playwright | ~600 MB |
| pywinauto + Python | ~100 MB |
| OS overhead | ~2,000 MB |
| **TOTAL** | **~9,200 MB of 15,700 MB = 59% utilization** |

This leaves approximately 6.5 GB of headroom. The system is viable on this hardware.

---

## DECLINED TECHNOLOGIES — SUMMARY

| Technology | Reason for Decline |
|---|---|
| OpenHands | Requires Docker; designed to BE the orchestrator, not to be orchestrated |
| Agent Zero | Docker-centric; Python runtime mismatches Node.js kernel |
| Open WebUI | Custom license since Apr 2025 with commercial branding restrictions |
| faster-whisper | Intel Arc incompatible (CUDA-only GPU acceleration) |
| Piper TTS | GPL-3.0 copyleft license; Kokoro is higher quality with Apache 2.0 |
| Mem0 | Conflicts with our superior 14-tier memory system |
| Qdrant / Chroma | Server-based vector DBs; sqlite-vec is simpler and zero-infrastructure |
| Continue (IDE) | VS Code extension — not programmable from kernel |
| Direct WinAPI (Node.js FFI) | Unacceptable build complexity; pywinauto covers same need |
| Docker (sandbox now) | RAM budget tight at MVP stage; our Tier system provides logical isolation |

---

## REVISED PHASE ROADMAP

Based on this audit, the recommended revised sequence is:

### Phase 5: Multi-Agent Workforce + MCP Ecosystem
1. Build HRSIKESA's named agent roster (Vyasa, Chanakya, Arjuna, Lakshmi, Saraswati)
2. Agent-to-agent delegation via Tool Execution Bus
3. Connect the 6 priority MCP servers via existing `McpClientAdapter`
4. Add `sqlite-vec` for semantic memory search
5. Wrap Aider as a Tier-2 coding agent subprocess tool (assigned to Arjuna)

### Phase 6: Computer Control + Browser Automation
1. Build pywinauto MCP server wrapper for Windows desktop control
2. Connect `@playwright/mcp` for scripted browser automation
3. Connect browser-use as MCP server for agentic browsing
4. Implement Tier 2-3 approval gates for all desktop/browser actions

### Phase 7: Voice Pipeline
1. Integrate whisper.cpp (Vulkan bindings) for real-time STT
2. Integrate kokoro-js for TTS output
3. Build voice loop: mic -> whisper -> HRSIKESA kernel -> kokoro -> speaker

### Phase 8: Visual Control Center
1. Deploy LibreChat against HRSIKESA HTTP API
2. Custom HRSIKESA branding
3. Agent roster visualization
4. Memory and audit dashboard

---

---

## CATEGORY 8: SOFTWARE DISCOVERY & ENVIRONMENT MANAGEMENT

*How should HṚṢĪKEŚA discover, verify, launch, and manage installed Windows software and package dependencies?*

### 8.1 Windows Native Start Menu & App Paths Registry

| Property | Details |
|---|---|
| **Technology** | Windows Shell API (`.lnk` shortcuts in `%ProgramData%` & `%AppData%`), Registry `HKLM/HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths` |
| **License** | Built into Windows 10/11 OS |
| **Language** | Native Win32 / WScript.Shell / Registry |
| **RAM footprint** | Negligible (< 1 MB ephemeral) |
| **Offline** | 100% Offline |

**HṚṢĪKEŚA Assessment:**
- Fast, reliable, read-only discovery of user-installed desktop applications (Notepad, Blender, VS Code, Chrome, Edge, Paint, etc.).
- Bounded search: inspects specific shortcut directories and App Paths registry keys without recursive full-drive scans.
- **Verdict: ADOPT (Primary native desktop discovery engine).**

---

### 8.2 Windows Package Manager CLI (`winget`)

| Property | Details |
|---|---|
| **Technology** | Microsoft Windows Package Manager CLI (`winget.exe`) |
| **License** | MIT License (Microsoft) |
| **Language** | Native C++ CLI |
| **RAM footprint** | 0 MB background, ~15 MB transient execution |
| **Integration** | Subprocess invocation with non-interactive flags (`--accept-source-agreements --accept-package-agreements --disable-interactivity`) |

**HṚṢĪKEŚA Assessment:**
- Official, signed Windows package repository supporting 10,000+ developer and desktop applications (Blender, Git, Node.js, Python, VS Code, Android Studio, etc.).
- Avoids random scraping of web download mirrors.
- Provides cryptographic SHA-256 hash verification of downloaded packages.
- Must be wrapped in a constrained adapter with strict query validation and human approval gates for installations.
- **Verdict: ADOPT (Primary package search and controlled installer).**

---

### 8.3 Chocolatey / Scoop

| Property | Details |
|---|---|
| **Technology** | Community Windows package managers |
| **Assessment** | Require additional separate installs and community repositories. `winget` is preinstalled natively on Windows 11. |
| **Verdict: DECLINE in favor of native `winget`.**

---

## ARCHITECTURAL SOVEREIGNTY GUARANTEE

All external components in this audit — whether browser agents, coding tools, desktop automation, or MCP servers — operate as subordinates to HRSIKESA's sovereign kernel.

The architectural chain is immutable:

```
Rushikesh (Sovereign Owner)
  -> HRSIKESA Kernel (Orchestrator)
       -> Multi-Agent Roster (Specialized Agents)
            -> Tool Execution Bus (7-Stage Pipeline)
                 -> External Components (Aider, browser-use, pywinauto, Playwright, MCP servers, winget)
                      -> Operating System / Hardware
```

No external component has direct access to hardware, the filesystem, the network, or the database. Every action passes through our pipeline. Every action is logged.

---

*Audit compiled by HRSIKESA founding engineering agent.*
*All tool recommendations must be re-evaluated against hardware budget before Phase execution.*
*This document is a living record — update when new candidates emerge or hardware changes.*

