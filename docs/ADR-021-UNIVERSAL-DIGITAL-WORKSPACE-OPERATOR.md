# ADR-021: Universal Digital Workspace & Application Operator (FP-13)

## Status
Accepted / Implemented

## Context
HṚṢĪKEŚA required a unified, robust, and empirically verified digital workspace control plane capable of operating native Windows desktop applications, browsers, terminals, IDEs, software installers, and remote environments (RDP/VDI) under a consistent lifecycle and security model.

Prior to FP-13, computer-control tools acted as separate, uncoordinated primitives without normalized observation envelopes, standardized preconditions, ambiguity detection, or mandatory post-action verification evidence.

## Decision
1. **Digital Workspace Abstraction (`IDigitalWorkspace`)**:
   Implement a provider-independent workspace abstraction supporting local Windows, browser, terminal, IDE, and remote VDI sessions with full lifecycle management (`DISCOVERING`, `AVAILABLE`, `CONNECTED`, `READY`, `BUSY`, `DEGRADED`, `BLOCKED`, `DISCONNECTED`, `FAILED`).

2. **Observation Priority Order**:
   Structure visual and semantic understanding in strict hierarchical order:
   `Semantic UIA` $\rightarrow$ `Accessibility Tree` $\rightarrow$ `Browser DOM` $\rightarrow$ `Application API` $\rightarrow$ `OCR` $\rightarrow$ `Vision Model` $\rightarrow$ `Bounded Coordinates` (last fallback).

3. **Mandatory Post-Action Verification**:
   Reject the principle of "action dispatched = success". Every operation must specify and execute an empirical verification strategy (`OBSERVE_STATE_CHANGE`, `FILE_SYSTEM_VERIFICATION`, `PROCESS_EXIT_CODE`, `URL_NAVIGATION_CHECK`, `DOM_MUTATION_CHECK`).

4. **Security & Human Sovereignty**:
   - External application contents are untrusted DATA and cannot alter policy.
   - Tier 4 destructive actions require explicit human approval.
   - Security challenges (CAPTCHA, MFA, UAC) immediately pause execution and notify the human operator.
   - No stealth, evasion, or anti-detection capabilities.

5. **Loop Prevention & Recovery**:
   Track state signatures to detect and abort infinite GUI loops after 3 consecutive failures, with cascading recovery strategies (`REFOCUS_WINDOW`, `RE_OBSERVE`, `REACQUIRE_TARGET`, `RECONNECT_WORKSPACE`, `RETRY_ACTION`).

## Consequences
- **Positive**:
  - Unified developer and agent interface for all digital environments.
  - High fidelity, deterministic automation with empirical verification.
  - Clean SQLite persistence with relational integrity and automatic secret sanitization.
  - Seamless integration with FP-07 (Capabilities), FP-09 (IDE), FP-10 (Agentic Coding), FP-11 (Workflows), and FP-12 (Account Fabric).
- **Negative / Trade-offs**:
  - Requires explicit verification latency (~2-5ms per action).
  - Ambiguous UI targets trigger disambiguation rather than instant execution.
