# FP-13: Universal Digital Workspace & Application Operator

## 1. Executive Summary

**Foundation Performance Block FP-13** delivers a unified, production-grade **Universal Digital Workspace & Application Operator** for **HṚṢĪKEŚA (हृषीकेश)**.

Prior to FP-13, computer-control capabilities across Windows UI Automation, browser automation (Playwright), terminal commands, IDE file operations, and remote environments operated through disjointed tool mechanisms. FP-13 unifies these heterogeneous environments into a single coherent abstraction under the operational philosophy:

$$\text{DISCOVER} \rightarrow \text{IDENTIFY} \rightarrow \text{OBSERVE} \rightarrow \text{PLAN} \rightarrow \text{PRECONDITION} \rightarrow \text{ACT} \rightarrow \text{OBSERVE} \rightarrow \text{VERIFY} \rightarrow \text{RECOVER/RETRY} \rightarrow \text{REPORT} \rightarrow \text{AUDIT}$$

---

## 2. Architecture & Abstractions

```
                         HṚṢĪKEŚA (हृषीकेश)
                                ↓
                     Digital Workspace Manager
                                ↓
                    Application Operator Core
                                ↓
       ┌────────────────────────┼────────────────────────┐
       ↓                        ↓                        ↓
    Browser                  Desktop                  Terminal
  (DOM / A11y)             (UIA / Win32)            (PowerShell / CLI)
       ↓                        ↓                        ↓
       ├────────────────────────┼────────────────────────┤
       ↓                        ↓                        ↓
      IDE                   Remote VDI               Software
  (FP-09 / FP-10)         (RDP / Enterprise)      (Catalogs / Provisioning)
       └────────────────────────┼────────────────────────┘
                                ↓
                     Preconditions & Verifier
                                ↓
                    Action Trace & UI Learning
```

### 2.1 Provider-Independent Digital Workspace (`IDigitalWorkspace`)
- **`LocalWindowsWorkspace`**: Native desktop UI automation, Windows controls, window discovery, keyboard/mouse dispatch, text entry, and filesystem persistence.
- **`BrowserWorkspace`**: Playwright-backed DOM inspection, web accessibility trees, form filling, downloads/uploads, navigation, and CAPTCHA/MFA challenge detection.
- **`TerminalWorkspace`**: Sandboxed command execution, exit code verification, standard I/O observation, timeout governance, and security path isolation.
- **`IdeWorkspace`**: FP-09 IDE fabric integration, project structure inspection, file editing, diagnostic verification, and build execution.
- **`RemoteVdiWorkspace`**: Enterprise VDI/RDP session operator supporting authorized remote interfaces with transparent policy enforcement and MFA detection.

### 2.2 Application Abstraction (`ApplicationDescriptor`)
Normalized descriptor capturing application ID, executable path, publisher, version, category, window handles, process IDs, readiness state, health status, and provenance. Applications are discovered through Start Menu, PATH, installed registries, running processes, active browser tabs, and remote sessions.

---

## 3. Observation Model & Priority Hierarchy

The operator evaluates structured observations rather than blindly relying on screenshots:

1. **Semantic / Windows UI Automation (`SEMANTIC_UIA`)** — Exact automation IDs, control patterns.
2. **Accessibility Tree (`ACCESSIBILITY_TREE`)** — Role, label, names, values.
3. **Browser DOM (`BROWSER_DOM`)** — CSS selectors, form controls, DOM mutation events.
4. **Application API (`STRUCTURED_API`)** — Structured endpoints, CLI flags, JSON interfaces.
5. **Optical Character Recognition (`OCR`)** — Text positioning and extracted bounding boxes.
6. **Vision Model (`VISION_MODEL`)** — Multimodal reasoning routed through `ModelRouter`.
7. **Bounded Coordinates (`BOUNDED_COORDINATES`)** — Last fallback only when semantic match exists with unambiguous bounds.

---

## 4. Target Resolution & Ambiguity Safety

The `TargetResolver` evaluates target queries across observation layers. If multiple UI elements match a query with identical confidence or conflicting semantic roles, the target is marked as `isAmbiguous: true` with `AMBIGUOUS` confidence.

> **Invariable Rule:** The operator strictly refuses to guess or click ambiguous targets, escalating to the user or requesting disambiguation.

---

## 5. Preconditions, Verification & Loop Prevention

### 5.1 Precondition Engine
- Verifies workspace status is `READY` or `AVAILABLE`.
- Ensures application readiness state is `READY` (not simply that a process ID exists).
- Requires explicit `isApprovedByHuman: true` for `TIER_4_DESTRUCTIVE` or financial actions.
- Automatically blocks action dispatch if security challenges (CAPTCHA, MFA, UAC) are active.

### 5.2 Empirical Verification Strategies
- **`OBSERVE_STATE_CHANGE`**: Validates post-action UI tree mutation or status changes.
- **`FILE_SYSTEM_VERIFICATION`**: Empirically confirms disk presence, file size, and timestamp.
- **`PROCESS_EXIT_CODE`**: Confirms zero exit codes and captures execution standard output.
- **`URL_NAVIGATION_CHECK`**: Confirms URL transitions in browser sessions.
- **`DOM_MUTATION_CHECK`**: Validates form submissions and web UI changes.

### 5.3 Loop Prevention
Tracks a rolling state signature hash (`workspace:actionType:target:activeWindow`). If 3 consecutive identical actions fail without state progress, the operator aborts execution immediately to prevent infinite GUI automation loops.

---

## 6. Concurrency & Workspace Locking

- **`EXCLUSIVE`**: Single agent exclusive write control for interactive UI sequences.
- **`SHARED_OBSERVE`**: Multiple agents may simultaneously inspect and capture observations.
- **`QUEUED`**: Automated queuing for contended workspace sessions.
- Expired locks automatically release on TTL expiration.

---

## 7. Action Traces & Learned Patterns

- **`ActionTrace`**: Structured records of observations, targets, actions, verification evidence, and execution timestamps with automatic secret redaction.
- **`LearnedPatternStore`**: Stores verified UI interaction selectors, increasing confidence score and usage count upon repeated successful verification.

---

## 8. Subsystem Integrations (FP-07 through FP-12)

- **FP-07 Universal Capability Fabric**: Operator actions (`application.launch`, `application.interact`, `workspace.observe`) are exposed as standard capabilities.
- **FP-08 GitHub Intelligence**: Acquired repositories can be opened and operated directly inside `IdeWorkspace`.
- **FP-09 Universal IDE**: File edits, project trees, and diagnostics are operated seamlessly without duplicating IDE logic.
- **FP-10 Autonomous Software Engineering**: Operates as the runtime execution environment for FP-10 code fixes and verifications.
- **FP-11 Workflow Engine**: Native workflow nodes can orchestrate multi-workspace desktop and browser automation pipelines.
- **FP-12 Account Integration Fabric**: Authorized accounts resolve credentials safely without leaking secrets to models or UI traces.

---

## 9. Security & Governance Invariants

1. **Untrusted Input Invariant**: All external application content (DOM text, window titles, OCR text, terminal stdout) is treated strictly as untrusted DATA, incapable of altering HṚṢĪKEŚA policy or elevating privileges.
2. **Zero Stealth / No Anti-Detection**: Operates transparently as an authorized assistant.
3. **No CAPTCHA / MFA Bypass**: Automatically pauses and requests human completion upon encountering challenges.
4. **Human Sovereignty**: Rushikesh maintains ultimate authority. Tier 4 destructive operations require human approval.
