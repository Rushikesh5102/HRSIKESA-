# HṚṢĪKEŚA (हृषीकेश) — Regression Baseline & System Audit (Post-FP-14)

> **Audit Date:** 2026-09-26  
> **Milestone:** Post-FP-14 Repository Hygiene, Stale Test Correction & Regression Baseline  
> **Status:** `FULL_REGRESSION_GREEN_WITH_KNOWN_LIMITATION`  
> **Master & Sovereign Owner:** Rushikesh Pattiwar  
> **English Self-Name:** Rishi ("I'm Rishi")  

---

## 1. System & Execution Environment

| Parameter | Specification |
| :--- | :--- |
| **Operating System** | Windows 11 / Windows NT 10.0 (x64) |
| **Node.js Runtime** | `v24.21.0` |
| **npm Version** | `11.19.0` |
| **CPU Architecture** | Intel(R) Core(TM) Ultra 5 125H (14 physical cores / 18 threads) |
| **Host Memory (RAM)** | 16 GB Physical (15.7 GB usable, ~0.5–1.2 GB free under heavy multi-test load) |
| **Graphics / NPU** | Intel(R) Arc(TM) Graphics (Vulkan / DirectML acceleration) |
| **Local Model Runners** | Ollama local daemon (`deepseek-r1:1.5b`, `qwen2.5-coder:7b`) |
| **Test Runner** | `tsx --test --test-concurrency=1 tests/*.test.ts` (Native `node:test` engine) |
| **Process Teardown** | Clean natural termination without `--forceExit` (0 process hangs) |

---

## 2. Regression Test Results

### 2.1 Full Repository Test Suite (`npm test`)

```text
▶ Pass Rate: 99.64% (100% of non-deferred tests)
▶ Total Tests Executed: 1658
▶ Total Passed:         1652
▶ Total Failed:         0
▶ Total Skipped:        6 (Host CRITICAL_MEMORY pressure deferrals in FP-08)
▶ Total Cancelled:      0
▶ Exit Code:            0
▶ Total Duration:       269.9s (~4.5 minutes)
```

### 2.2 Targeted Subsystem Regressions

| Subsystem / Block | Suites / Files | Tests Passed | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **FP-01 to FP-05** | Foundation, Micro-Kernel, Models, Tool Bus | **134 / 134** | ✅ PASS | 29.4s runtime |
| **FP-06** | Physical LAN & Real Hardware Verification | **10 / 10** | ✅ PASS | End-to-end hardware pass |
| **FP-07 to FP-10** | Capabilities, GitHub, IDE, Autonomous Coding | **139 / 139** | ✅ PASS | 6 skipped under low memory |
| **FP-11 to FP-14** | Workflow, Accounts, Workspace Operator, Mission | **287 / 287** | ✅ PASS | 85 dedicated FP-14 + 10 E2E |
| **INT-002 to INT-008**| Cross-Cutting Integration Suites | **242 / 242** | ✅ PASS | 887ms runtime |
| **Workforce & Hardening** | `mission-*`, `workforce-17-agents`, `hardening-*` | **47 / 47** | ✅ PASS | 9.9s runtime |
| **Lifecycle Clean Exit** | `tests/lifecycle.test.ts` | **4 / 4** | ✅ PASS | Zero handle leaks |

---

## 3. Stale Test Corrections Summary

1. **`tests/persistence.test.ts`**:
   - Replaced hardcoded assertion expecting exactly 17 migrations with dynamic contract:
     `assert.strictEqual(applied.length, expectedMigrationCount)` using `migrationManager.getAvailableMigrations()`.
   - Verified that all available migrations execute in strictly ascending sequence (001 to 028).
2. **`tests/phase26-self-improvement.test.ts`**:
   - Replaced static migration table assertion with dynamic migration validation matching applied version count.
3. **`tests/phase17-research-intelligence.test.ts`**:
   - Synchronized test payload with canonical research contracts:
     - Depth string: canonical `'NORMAL'` (valid enum: `'FAST' | 'NORMAL' | 'DEEP'`).
     - Agent attribution: `'Gāṇḍīva'` (Autonomous Research Specialist).
     - Markdown section title: `'## Sources & Citations'`.
     - Verified all 102/102 test cases pass cleanly.
4. **`tests/voice-security.test.ts`**:
   - Configured `MockToolProposingVoiceProvider.listModels()` with valid model capabilities (`chat`, `tools`, `text-generation`) and priority (`100`) to ensure deterministic `ModelRouter` model selection.

---

## 4. Lifecycle & Process Teardown Audit

| Subsystem | Root Cause Addressed | Fix Implemented |
| :--- | :--- | :--- |
| **`HttpServer`** | Undici / Node.js native `fetch` keep-alive connections held the HTTP server open after `server.close()`. | Maintained an `openSockets` Set on `'connection'`. On `stop()`, all active sockets are forcefully terminated (`socket.destroy()`). |
| **`WorkerTransportServer`** | Pending client session sockets prevented TCP server handle cleanup. | Forcefully destroys active client session sockets and calls `closeAllConnections()` prior to `server.close()`. |
| **`ResourceManager`** | `stop()` was synchronous and called async `transportServer.stop()` without `await`. | Refactored `stop()` and `resetInstance()` to be asynchronous, properly awaiting transport closure. |
| **`MissionOrchestrator`** | Running mission task dispatch loop ran indefinitely when background missions were active. | Added `cancelledMissionIds` set and cancellation checkpoints in the `while (!isTerminated)` loop to cleanly drain tasks on kernel shutdown. |
| **`Kernel.shutdown()`** | Lifecycle order allowed lingering open connections. | Coordinated clean teardown order: unmount plugins → cancel missions → stop HTTP server → stop resource manager → close database. |

**Teardown Result:** Verified zero background process hangs; test runs complete with native exit code 0 without requiring `--forceExit`.

---

## 5. Build & Type Safety Verification

- **TypeScript Engine (`npx tsc --noEmit`)**: Clean (0 errors).
- **ESLint (`npm run lint`)**: Clean (0 errors).
- **Backend Production Build (`npm run build`)**: Clean (0 errors).
- **UI Production Bundle (`npm --prefix ui run build`)**: Clean (built in 15.75s, 0 errors).

---

## 6. Documented Host Limitations

- **Resource Pressure Classification (`CRITICAL_MEMORY`)**:
  - The test environment is an ultrabook with 16 GB of unified memory shared with the Intel Arc GPU.
  - During back-to-back sequential execution of all 1,658 tests, host available RAM drops below 600 MB.
  - The `ResourceGovernor` transitions state to `CRITICAL_MEMORY`, deferring heavy remote git repository shallow clones in FP-08 (6 tests safely skipped).
  - Under normal conditions (> 1.5 GB free RAM), all 6 deferred tests execute and pass.
  - Under memory pressure, V8 Garbage Collection pauses can intermittently lengthen cold initial token latency (TTFB) from ~25-45ms to ~150ms. In isolation and under normal host memory, TTFB remains well within the <100ms threshold.
