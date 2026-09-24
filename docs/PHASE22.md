# HṚṢĪKEŚA — Phase 22: Advanced Computer Operator

## Executive Summary
Phase 22 implements the Sovereign Personal AI Operating System's **Advanced Computer Operator**, empowering HṚṢĪKEŚA to understand, observe, navigate, and operate graphical desktop environments, applications, controls, file dialogs, and workflows on Windows as a true computer-use agent.

The operator operates through a deterministic closed-loop cycle:
$$\text{OBSERVE} \longrightarrow \text{UNDERSTAND} \longrightarrow \text{PLAN} \longrightarrow \text{ACT} \longrightarrow \text{OBSERVE AGAIN} \longrightarrow \text{VERIFY} \longrightarrow \text{RECOVER} \longrightarrow \text{REPORT}$$

---

## Architectural Highlights

### 1. Multi-Stage Perception & Bounded Tree Traversal
- **Observation Engine**: Extracts multi-window topologies, active process metadata, UI Automation (UIA) control subtrees, and bounding coordinates.
- **Resource & Privacy Bounding**: Limits traversal depth (`maxDepth: 3`), node counts (`maxNodes: 100`), and truncates long text (`maxTextLength: 200`). Screenshots have ephemeral lifecycles and are not retained indefinitely.
- **Deterministic UI State Hashes**: Generates MD5 tree hashes to detect subtle layout shifts and detect state cycling loops.

### 2. Semantic Target Resolution
- Multi-tier target resolution:
  1. **Learned UI Patterns**: Resolves frequently targeted elements from prior interactions cached in SQLite (`computer_ui_patterns`).
  2. **Exact UIA AutomationId & Name**: Matches native Windows accessibility identifiers with high confidence ($\ge 0.95$).
  3. **Fuzzy & Substring Normalization**: Handles case-insensitive and partial label matching.
  4. **Hierarchical Relative Search**: Traverses container/child relationships.
  5. **Coordinate Fallback**: Constrained to bounded confidence ($0.35$) with mandatory post-action verification.

### 3. Governed Action Execution (21 Structured Action Types)
- Supported Action Types: `MOVE`, `CLICK`, `DOUBLE_CLICK`, `RIGHT_CLICK`, `TYPE`, `KEYPRESS`, `HOTKEY`, `SCROLL`, `DRAG`, `SELECT`, `FOCUS`, `OPEN`, `CLOSE`, `MINIMIZE`, `MAXIMIZE`, `RESTORE`, `WAIT`, `LAUNCH`, `TERMINATE`, `COPY`, `PASTE`.
- Precondition Validation: Verifies window presence, element existence, visibility, and enabled state before firing inputs.

### 4. Deterministic Verification Strategies (13 Strategies)
- Implements strict, observable verification without fabrication:
  - `WINDOW_PRESENT`, `WINDOW_ABSENT`, `ELEMENT_PRESENT`, `ELEMENT_ABSENT`, `ELEMENT_VALUE`, `FOCUS_CHANGED`, `TITLE_MATCH`, `TEXT_PRESENT`, `TEXT_ABSENT`, `PROCESS_RUNNING`, `PROCESS_EXITED`, `UI_TREE_CHANGED`, `SCREEN_REGION_CHANGED`.
- Strict Non-Fabrication: If post-observation does not match expected state, the operator returns `FAILED` with detailed observable evidence.

### 5. Fault-Tolerant Recovery Engine
- Recovery sequence: `STOP -> OBSERVE -> CLASSIFY -> SAFE RECOVERY -> REPLAN -> VERIFY`.
- Classifications handled:
  - `STALE_ELEMENT`: Re-observes desktop and recalculates element bounds.
  - `WRONG_FOCUS`: Restores focus to target window.
  - `APPLICATION_BUSY`: Executes bounded backoff wait.
  - `UNEXPECTED_DIALOG`: Classifies and safely dismisses dialogs.
  - `AUTH_REQUIRED` / `CAPTCHA_DETECTED`: Pauses execution for authorized human intervention.

### 6. Security, Privacy & Safety Policies
- **Danger Tiers**: `SAFE`, `LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK`, `CRITICAL`.
- **Destructive Operation Gating**: Destructive actions (format, delete, terminate) require explicit human-in-the-loop (HITL) approval.
- **Authentication & CAPTCHA Pause**: Automatically detects passwords, PINs, MFA, and CAPTCHAs; pauses operator and alerts master.
- **Secret Redaction**: Redacts passwords, API keys (`ghp_`, `sk-`, `bearer`), and PINs from SQLite transaction logs and audit streams.
- **Protected System Processes**: Blocks control of Windows security processes (`csrss.exe`, `lsass.exe`, `services.exe`, `winlogon.exe`, `msmpeng.exe`).

### 7. SQLite Durability & Audit Ledger (Migration 013)
- `computer_tasks`: Records goals, scopes, status, timestamps, and metadata.
- `computer_action_history`: Transactional ledger recording sequence numbers, action types, targets, preconditions, results, and verification evidence.
- `computer_observation_history`: Ephemeral observation summaries, tree hashes, and node metrics.
- `computer_ui_patterns`: Long-term learned UI element selectors with versioning and confidence weighting.

---

## Verification & Test Results
- **Unit & Integration Test Suite**: 50/50 test cases passing (`tests/phase22-computer-operator.test.ts`).
- **Live Verifier Scenarios**: 35/35 operational scenarios passing (`scripts/live-phase22-verifier.ts`).
- **Full Repository Regressions**: 524 passing tests across Phases 0–22 with zero regressions.
- **TypeScript Compilation**: `npx tsc --noEmit` clean with 0 errors.
- **Frontend Production Build**: `npm --prefix ui run build` clean Vite build in 7.02s.
