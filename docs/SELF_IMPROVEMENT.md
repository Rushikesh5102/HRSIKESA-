# HṚṢĪKEŚA (हृषीकेश) — Self-Improvement Engine Architecture

## 1. Principles of Self-Improvement

Self-improvement within HṚṢĪKEŚA is structured as an **auditable, deterministic, and sandboxed lifecycle**. The system does not self-modify dynamically in memory or overwrite live source files without formal gating.

### Core Lifecycle States (14 Sequential Stages):
1. **`OBSERVED`**: Operational telemetry is captured from subsystems.
2. **`DETECTED`**: Anomaly detection engines identify a deviation or opportunity.
3. **`ANALYZING`**: The opportunity is evaluated against system health metrics.
4. **`PROPOSED`**: A formal `IImprovementProposal` is recorded in SQLite.
5. **`PLANNED`**: Implementation steps, rollback strategies, and test plans are structured.
6. **`AWAITING_APPROVAL`**: High/Critical risk proposals pause for human authorization.
7. **`APPROVED`**: Explicit human authorization recorded with approver attribution.
8. **`IMPLEMENTING`**: Changeset generated containing multi-file unified diffs.
9. **`TESTING`**: Sandboxed test execution validates type checks, unit, and integration tests.
10. **`BENCHMARKING`**: Performance metrics are evaluated against pre-change baselines.
11. **`VERIFYING`**: Verification scenarios confirm target behavior.
12. **`DEPLOYED`**: Staged canary deployment is activated.
13. **`MONITORING`**: Post-deployment telemetry is monitored for regressions.
14. **`ACCEPTED`**: The improvement is marked permanent and indexed into memory.

### Terminal & Failure States:
- **`REJECTED`**: Proposal declined by human operator or policy engine.
- **`BLOCKED`**: Prerequisites or dependencies not met.
- **`FAILED`**: Sandboxed tests or verification failed.
- **`ROLLED_BACK`**: Post-deployment regression triggered snapshot reversion.
- **`EXPIRED`**: Proposal timed out past its TTL.
- **`CANCELLED`**: Superseded or manually aborted.

---

## 2. Proposal Categories

HṚṢĪKEŚA supports 20 discrete categories of self-improvement:
1. `BUG_FIX`: Automated patch for recurring errors.
2. `PERFORMANCE`: Latency and execution throughput optimizations.
3. `MEMORY_EFFICIENCY`: Buffer allocation and garbage collection tuning.
4. `RESOURCE_EFFICIENCY`: CPU and thread pool optimization.
5. `RELIABILITY`: Transient retry and failure handling enhancements.
6. `TEST_COVERAGE`: Automated generation of unit and integration tests.
7. `SECURITY_HARDENING`: Tightening boundaries and sanitizing inputs.
8. `TOOL_IMPROVEMENT`: Enhancing ToolBus schemas and error recovery.
9. `SKILL_IMPROVEMENT`: Optimizing multi-step procedural skill definitions.
10. `MODEL_ROUTING`: Optimizing provider routing and fallback paths.
11. `RESEARCH_QUALITY`: Fine-tuning web extraction and citation synthesis.
12. `KNOWLEDGE_QUALITY`: Entity deduplication and contradiction resolution.
13. `UI_IMPROVEMENT`: Enhancing Control Center view components.
14. `VOICE_IMPROVEMENT`: Audio buffer and latency tuning.
15. `COMPUTER_OPERATOR`: UIA and desktop automation speed enhancements.
16. `COMPANY_OPERATIONS`: SOP execution and CRM batching optimizations.
17. `DOCUMENTATION`: Keeping architectural specs synchronized.
18. `MAINTENANCE`: Scheduled system hygiene and cleanup routines.
19. `DEPENDENCY_UPDATE`: Safe patch upgrades for third-party packages.
20. `CONFIGURATION_IMPROVEMENT`: Tuning scheduler and timeout parameters.
