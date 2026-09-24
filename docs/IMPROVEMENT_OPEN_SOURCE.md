# HṚṢĪKEŚA (हृषीकेश) — Open-Source Self-Improvement Evaluation

## 1. Evaluation Matrix

| Framework / Tool | Decision | Rationale |
| :--- | :--- | :--- |
| **OpenHands** | `EVALUATED / REJECTED` | Monolithic sandbox container requirements; incompatible with HṚṢĪKEŚA lightweight native in-process Node/TypeScript orchestrator. |
| **SWE-agent** | `EVALUATED / REJECTED` | Focused on single-turn benchmark benchmarks rather than live production bounded self-maintenance. |
| **Aider** | `EVALUATED / REUSED (CONCEPTS)` | Unified diff patch formatting and git-style change representations adopted natively in `ChangeSetService`. |
| **Continue** | `EVALUATED / REJECTED` | IDE-specific plugin model; HṚṢĪKEŚA operates as a sovereign standalone runtime. |
| **Patchwork** | `EVALUATED / REJECTED` | Heavy external Python dependencies. |
| **OpenTelemetry** | `EVALUATED / REUSED (PATTERNS)` | Standard structured telemetry observation model adopted in `SelfObservationEngine`. |
| **Renovate / Dependabot** | `EVALUATED / WRAPPED (CONCEPTS)` | Version drift scanning and advisory recommendations implemented in native TypeScript via `DependencyIntelligenceService`. |
