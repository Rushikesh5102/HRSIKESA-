# FP-15: Universal Application & Service Ecosystem Specification & Architecture

## 1. Architectural Mission
HṚṢĪKEŚA has established foundational cognitive, autonomous engineering, workflow, and application operator layers (FP-01 through FP-14). The goal of FP-15 is **NOT** to construct another mission orchestrator or duplicate existing capability registries. Rather, FP-15 serves as the deterministic ecosystem resolution fabric connecting user intentions directly to the real software and services world.

### System Layering
```
                      RUSHIKESH (User / Voice / Chat)
                                   ↓
                                HṚṢĪKEŚA
                                   ↓
                     FP-14 Agentic Mission Runtime
                                   ↓
               FP-15 Universal Application & Service Ecosystem
              (Service Discovery • Interface Ladder • Multi-Account)
                                   ↓
  ┌────────────────────────────────────────────────────────────────────────┐
  │ FP-07 Universal Capability Fabric  │ FP-12 Account & Auth Fabric       │
  │ FP-13 Digital Workspace Operator   │ FP-11 Workflow Engine             │
  │ FP-08 GitHub Intelligence          │ FP-21 Model Context Protocol      │
  └────────────────────────────────────────────────────────────────────────┘
                                   ↓
       Real Operating System, CLI Binaries, Provider APIs & Applications
```

---

## 2. Core Subsystems

### 2.1 Universal Service & Application Descriptors
- **ServiceDescriptor**: Normalizes provider IDs, interface bindings, quota tracking, health, authentication scopes, and licenses.
- **ApplicationDescriptor**: Directly reuses FP-13's `ApplicationDescriptor` without duplication or drift. Discovers desktop applications (e.g. Blender, Android Studio, VS Code) and CLI executables on the operating system.

### 2.2 Deterministic Interface Priority Ladder
When an action is initiated, FP-15 evaluates the optimal execution route according to deterministic criteria:
1. `LOCAL_API`: High-speed in-process or local daemon execution (highest determinism, sub-millisecond).
2. `AUTHENTICATED_API`: Structured OAuth2/REST APIs with rate limits and quota monitoring.
3. `MCP`: Protocol-standardized tool invocation via external or local Model Context Protocol servers.
4. `CLI`: System binaries installed on PATH with verified execution paths and arguments.
5. `BROWSER_DOM`: Authenticated browser interaction via DOM tree and accessibility nodes.
6. `DESKTOP_UIA`: Native operating system UI Automation via FP-13 Digital Workspace Operator.
7. `OCR_VISION`: Visual grounding and screen region analysis.
8. `COORDINATE_INPUT`: Absolute mouse/keyboard interaction (fallback only).

### 2.3 Multi-Account Isolation & Routing
Reusing FP-12's AccountFabric:
- Resolves accounts by scope: `PERSONAL`, `COMPANY`, `PROJECT`.
- Strictly prevents cross-company and cross-project credential access.
- Validates health states (`CONNECTED`, `EXPIRED`, `DEGRADED`, `REAUTH_REQUIRED`).
- Never fabricates quota: reports exact numeric values when exposed by providers, else `UNKNOWN`.

### 2.4 Natural Language Fast Path (Sub-5ms, Zero LLM Hallucination)
Conversational queries regarding service accessibility ("Can you access my Gmail?", "Use GitHub", "Open Blender", "What's available?") are parsed deterministically via regular expressions and catalog mapping. Responses reflect ground-truth runtime connectivity without invoking large language models.

### 2.5 Security, External Defanging & Consequential Verification
- **External Data Defanging**: Data ingested from external services (emails, issue comments, Slack messages) is defanged and tagged with `_untrustedExternalData: true`, preventing prompt injection or permission elevation.
- **Approval Gating**: Mutating, financial, external messaging, and destructive operations require explicit human approval.
- **Consequential Verification**: Post-condition verification ensures operations succeeded in reality (e.g. fetching issue by ID, confirming calendar event insertion).
