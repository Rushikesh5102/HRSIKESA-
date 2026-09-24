# HṚṢĪKEŚA (हृषीकेश) — Staged Deployment & Rollback Engine

## 1. Staged Rollout Stages

1. **`SANDBOX`**: Isolated test environment execution.
2. **`CANARY`**: Single-worker or synthetic non-destructive traffic activation.
3. **`LIMITED`**: Fractional rollout across non-critical operations.
4. **`FULL`**: Full sovereign runtime activation.

## 2. Rollback Mechanics

- Before any deployment, a **pre-change snapshot reference** is recorded.
- Telemetry is continuously monitored during the `MONITORING` lifecycle state.
- Upon any detected anomaly or regression:
  1. `ImprovementRollbackService.rollbackDeployment()` is triggered.
  2. The snapshot checkpoint is restored.
  3. `verifiedRestored` check validates clean reversion.
  4. An audit record is stored in SQLite and emitted across EventBus (`self.rollback_executed`).
