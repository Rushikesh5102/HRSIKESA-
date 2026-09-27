# ADR-024: FP-15 Universal Application & Service Ecosystem

## Status
Accepted

## Date
2026-09-26

## Context
Following the completion and freezing of FP-01 through FP-14, HṚṢĪKEŚA has robust capability infrastructure (FP-07), account authentication & credential vaults (FP-12), desktop application operation (FP-13), mission orchestration (FP-14), workflows (FP-11), and intelligent tool integration (FP-08, FP-21). However, bridging human natural language intent (e.g. "Use my Google account and find the latest project emails" or "Open Blender and render the scene") to the optimal execution interface required a cohesive Ecosystem Resolution layer.

Building another orchestrator or duplicating FP-13's ApplicationDescriptor, FP-12's AccountFabric, or FP-07's Capability Registry would violate architectural purity and create fragmentation.

## Decision
1. **Architectural Position**: FP-15 is positioned directly **ABOVE** the capability/connection infrastructure (FP-07, FP-11, FP-12, FP-13, FP-20, FP-21) and **BELOW** mission orchestration (FP-14). It serves as the deterministic interface and ecosystem resolution layer.
2. **Deterministic Interface Priority Ladder**:
   - `LOCAL_API` (fastest, most deterministic)
   - `AUTHENTICATED_API` (reliable REST/OAuth with provider quotas)
   - `MCP` (protocol-based structured tool calling)
   - `CLI` (authenticated, verified local command line binaries)
   - `BROWSER_DOM` (DOM/accessibility tree automation)
   - `DESKTOP_UIA` (UI Automation via OS accessibility tree)
   - `OCR_VISION` (visual grounding & screen observation)
   - `COORDINATE_INPUT` (absolute mouse/keyboard interaction as last resort)
3. **Reuse Without Duplication**:
   - Reused `ApplicationDescriptor` directly from FP-13 (`src/digital-workspace/types/index.ts`).
   - Reused `AccountFabric` and credential vault from FP-12 (`src/account-fabric/`).
   - Reused `EventBus` and `ResourceGovernor` from core runtime.
   - Reused `ApplicationOperator` from FP-13 for launching and inspecting local desktop processes.
4. **Natural Language Fast-Path & Anti-Hallucination**:
   - Deterministic regex & keyword extraction identifies service, account reference, operation, and target application with zero LLM latency and zero model hallucination.
   - Real-world readiness checks: If an account is not connected, the status is explicitly reported as `NOT_CONNECTED`. If an application is not installed on PATH or in catalog, it reports `NOT_INSTALLED`. Quota is never fabricated (`UNKNOWN` if unsupported by provider).
5. **Security & Data Defanging**:
   - Untrusted external service data (emails, issue comments, Slack messages) is defanged and tagged with `_untrustedExternalData: true`.
   - Outgoing consequential actions (money, external communications, irreversible deletions) require explicit human approval.
   - Consequential action verification validates state post-execution (e.g. retrieving issue ID, confirming event insertion) before reporting success.

## Consequences
- Clean separation between *what* can be done (FP-07/FP-15) and *how* missions are broken down into subtasks (FP-14).
- High-performance, deterministic dispatch for daily tasks without invoking heavy foundation models for simple capability queries.
- Zero credential leakage to LLM prompts.
