# HṚṢĪKEŚA (हृषीकेश) — Self-Improvement Operating Workflow

## 1. Step-by-Step Operating Workflow

1. **Continuous Telemetry Collection**:
   - `SelfObservationEngine` listens to EventBus events (`tool.execution.completed`, `agent.task_failed`, etc.) and records structured metrics.
2. **Subsystem Health & Anomaly Evaluation**:
   - `SelfHealthService` computes real-time scores (0–100) across 8 subsystems.
   - `AnomalyDetectorService` identifies threshold breaches and error clusters.
3. **Proposal Formulation & Risk Tiering**:
   - `ImprovementProposalService` creates structured proposals with problem statements, rollback strategies, and test plans.
   - Risk is automatically classified into `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
4. **Changeset Generation**:
   - `ChangeSetService` creates unified multi-file diffs and computes cryptographic hashes.
5. **Sandboxed Verification**:
   - `ImprovementSandboxService` spins up isolated workspaces to execute compilation checks, unit tests, and integration scenarios.
6. **Performance Benchmarking**:
   - `ImprovementBenchmarkService` executes before/after benchmarks and computes delta percentages.
7. **HITL Authorization**:
   - For high-risk proposals, the workflow pauses until **Rushikesh Pattiwar** authorizes or rejects the change via Control Center UI or API.
8. **Staged Canary Deployment & Post-Monitoring**:
   - `ImprovementRollbackService` deploys to canary stage while observing metrics.
   - If regressions occur, automatic rollback is triggered immediately.
   - If healthy, the proposal transitions to `ACCEPTED`.
