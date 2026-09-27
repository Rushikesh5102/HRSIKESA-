# FP-09: HṚṢĪKEŚA UNIVERSAL IDE & DEVELOPMENT WORKSPACE
## Sovereign Autonomous Development Environment Specification

> **Phase:** Foundation Performance & Execution Block FP-09  
> **Status:** IMPLEMENTATION IN PROGRESS  
> **Target Machine:** Acer Swift SFG14-73T (Intel Core Ultra 5 125H, 16 GB RAM, Windows 11)  
> **Sovereign Master:** Rushikesh Pattiwar  
> **Core Principle:** `UNDERSTAND → PLAN → MODIFY → EXECUTE → OBSERVE → TEST → VERIFY → FIX → REVERIFY → REPORT`

---

## 1. Executive Vision

FP-09 transforms HṚṢĪKEŚA from an agentic runtime into a **fully integrated, sovereign development environment (IDE)** comparable in capability to modern AI-assisted IDEs (VS Code, Cursor, Antigravity) while remaining 100% native to HṚṢĪKEŚA's architecture, security governance, and multi-agent workforce.

This is **not merely a code editor**; it is an end-to-end autonomous engineering environment.

```
                    ┌────────────────────────────────────────────────────────┐
                    │      HṚṢĪKEŚA UNIVERSAL IDE CONTROL PLANE              │
                    └────────────────────────────────────────────────────────┘
                                                 │
         ┌───────────────────────────────────────┼───────────────────────────────────────┐
         ▼                                       ▼                                       ▼
┌──────────────────┐                   ┌──────────────────┐                   ┌──────────────────┐
│ WORKSPACE ENGINE │                   │ CODE INTEL & DIFF│                   │ TERMINAL & SVR   │
│ - Multi-Root     │                   │ - Ripgrep Search │                   │ - PTY / Shells   │
│ - Architecture   │                   │ - Precision Edit │                   │ - Background     │
│ - File Watcher   │                   │ - Staged Diffs   │                   │ - Port Supervisor│
│ - Git SCM        │                   │ - Undo / Redo    │                   │ - Live Preview   │
└──────────────────┘                   └──────────────────┘                   └──────────────────┘
         │                                       │                                       │
         └───────────────────────────────────────┼───────────────────────────────────────┘
                                                 │
                                                 ▼
                    ┌────────────────────────────────────────────────────────┐
                    │       AUTONOMOUS 10-STAGE VERIFICATION LOOP            │
                    │                                                        │
                    │  1. UNDERSTAND  ──►  2. PLAN       ──►  3. MODIFY      │
                    │  4. EXECUTE     ──►  5. OBSERVE    ──►  6. TEST        │
                    │  7. VERIFY      ──►  8. FIX        ──►  9. REVERIFY    │
                    │  10. REPORT                                            │
                    └────────────────────────────────────────────────────────┘
                                                 │
         ┌───────────────────────────────────────┴───────────────────────────────────────┐
         ▼                                                                               ▼
┌─────────────────────────────────┐                             ┌─────────────────────────────────┐
│       WORKFORCE PAIRING         │                             │     GLASSMORPHIC IDE UI         │
│ - Gāṇḍīva (Software Eng)        │                             │ - File Tree Explorer            │
│ - Vighna (QA & Verification)    │                             │ - Syntax Editor & Tabs          │
│ - Garuḍa (DevOps / Terminal)    │                             │ - Side-by-Side Diff Viewer      │
│ - Rahu (Research & Web Docs)    │                             │ - Terminal & Live Preview       │
└─────────────────────────────────┘                             └─────────────────────────────────┘
```

---

## 2. Core Architectural Subsystems

### 2.1 Workspace Manager (`src/ide/workspace/workspace.manager.ts`)
- Manages workspace roots, project directories, and active file contexts.
- Analyzes project architecture: framework detection (Vite, React, Next.js, Node, Python, Rust, Go), dependency graph, entrypoints, package manifests, and script commands.
- File system watcher with debounced change notification and `.gitignore`/`.hrisignore` filtering.

### 2.2 Code Intelligence & Fast Search (`src/ide/search/code.search.ts`)
- High-performance ripgrep-style text and regex search with line-numbered match snippets.
- Fast file path search with fuzzy matching and ignore-list pruning.
- Symbol outline extraction (classes, interfaces, functions, methods, types, exports).

### 2.3 Precision File Modification Engine (`src/ide/editor/editor.engine.ts`)
- `viewFile(path, startLine?, endLine?, offset?)`: bounded inspection with byte limits.
- `writeFile(path, content, overwrite)`: atomic file creation.
- `replaceContent(path, targetContent, replacementContent, startLine, endLine)`: single-chunk contiguous replacement.
- `multiReplace(path, chunks)`: transactional non-contiguous replacement with atomic commit and rollback.
- Changeset staging and review: creates structured unified diffs before disk mutation.

### 2.4 Terminal & Process Supervisor (`src/ide/terminal/terminal.manager.ts`)
- Spawns and manages interactive and background terminal processes (PowerShell on Windows).
- Circular output buffers (max 100KB per terminal) preventing memory bloating.
- Long-running dev server management with PID tracking and graceful SIGTERM/SIGKILL termination.

### 2.5 Web Application Live Preview (`src/ide/preview/preview.manager.ts`)
- Port discovery for web dev servers (Vite, Next, Express, etc.).
- Embedded responsive preview frame support with URL navigation, screenshot capture, and HTTP health probes.

### 2.6 Git Workspace & SCM Subsystem (`src/ide/git/git.workspace.ts`)
- Working tree status (staged, unstaged, untracked).
- Branch operations, diff generation against HEAD, commit creation with audit provenance.

### 2.7 Autonomous 10-Stage Verification Loop (`src/ide/verification/verification.loop.ts`)
Implements the central engineering discipline:
1. **UNDERSTAND:** Scan workspace, inspect relevant files, extract architecture and context.
2. **PLAN:** Formulate bounded changeset plan, list modified files, define success criteria.
3. **MODIFY:** Apply precision edits via `EditorEngine` into a staged changeset.
4. **EXECUTE:** Run build, dev server, or setup commands via `TerminalManager`.
5. **OBSERVE:** Capture command output, process status, and preview responses.
6. **TEST:** Run project test suite or targeted tests.
7. **VERIFY:** Evaluate against success criteria and safety invariants.
8. **FIX:** If tests fail or syntax errors occur, diagnose exact error location and plan fix.
9. **REVERIFY:** Re-run build and tests until clean or retry budget (max 3) is exhausted.
10. **REPORT:** Synthesize explainable summary with diffs, test counts, and provenance.

---

## 3. Database Schema (Migration 023)

SQLite tables registered in `023_universal_ide_workspace_schema.ts`:
- `ide_workspaces`: Workspace root metadata, project name, framework type.
- `ide_changesets`: Staged edits, diffs, author agent, review state (`PENDING`, `APPLIED`, `REVERTED`).
- `ide_terminals`: Terminal sessions, working directory, process ID, status.
- `ide_preview_servers`: Active dev servers, assigned port, URL, health state.
- `ide_verification_runs`: History of 10-stage autonomous runs, steps, results, duration.

---

## 4. REST Endpoints & Real-Time SSE

Base URL: `/api/ide`
- `GET /api/ide/workspace`: Current workspace status, architecture, and files.
- `GET /api/ide/files`: File tree navigation with directory expand.
- `POST /api/ide/file/read`: Read file slice or full content.
- `POST /api/ide/file/write`: Create or overwrite file.
- `POST /api/ide/file/edit`: Precision replacement or multi-replacement.
- `POST /api/ide/search`: Ripgrep text/regex search across workspace.
- `POST /api/ide/terminal/create`: Start terminal session.
- `POST /api/ide/terminal/execute`: Send command to terminal.
- `GET /api/ide/terminal/:id/output`: Read terminal buffer.
- `POST /api/ide/terminal/:id/kill`: Terminate process.
- `POST /api/ide/preview/start`: Launch and supervise dev preview server.
- `GET /api/ide/preview/status`: Probe dev server health.
- `POST /api/ide/verify/run`: Execute autonomous 10-stage verification run.
- `GET /api/ide/events`: Real-time Server-Sent Events (file changes, terminal output, verification progression).

---

## 5. Security & Governance Invariants

1. **Path Traversal Protection:** All filesystem operations strictly validated within authorized workspace boundaries.
2. **Binary Allowlisting:** Terminal commands validated against safety policies; dangerous commands blocked.
3. **Hardware-Governed Execution:** Terminal process concurrency throttled under `ResourceGovernor` memory pressure.
4. **HITL Review Boundaries:** Changesets touching critical files require human operator approval.
5. **Immutable Provenance:** All edits recorded with timestamp, author agent, and SHA-256 diff checksum.
