# ADR-019: Native Universal Workflow & Automation Engine Architecture

## Status
Accepted / Complete (FP-11)

## Context
Prior to FP-11, HṚṢĪKEŚA could autonomously execute individual missions, software engineering tasks (FP-10), and computer operations, but lacked a native, persistent, event-driven orchestration layer to compose, monitor, persist, recover, and verify complex multi-step workflows.

## Decision
1. **Durable Directed Executable Graph**: A workflow is modelled as an immutable versioned directed graph (`WorkflowVersion`) consisting of typed nodes and edges.
2. **Re-use of Existing Subsystems**: No duplicate orchestration, task scheduling, or coding engines were introduced. FP-10 remains 100% frozen; workflow `CODE`, `TEST`, and `VERIFY` nodes dispatch directly to `EngineeringFabric`. `ACTION` nodes route to `ToolExecutionBus`; `CAPABILITY` nodes route to `UniversalCapabilityFabric`; `AGENT` nodes route to `AgentRuntime`; `MODEL` nodes route to `ModelRouter`.
3. **Safe Deterministic Expression Evaluator**: All conditions (`{{expr}}`) and template interpolations are evaluated strictly by `SafeExpressionEvaluator`. Arbitrary JavaScript execution is forbidden.
4. **Mandatory Financial Governance**: Outgoing monetary operations or irreversible high-risk steps automatically pause in `WAITING_APPROVAL` status and require human approval.
5. **ACID-Compliant State Machine**: SQLite persistence utilizes `ON CONFLICT(id) DO UPDATE SET` on `workflow_runs` to ensure child records (approvals, checkpoints, run nodes) are preserved without triggering foreign key cascade deletions.
6. **Crash Recovery**: SHA-256 idempotency checkpoints enable resuming in-flight workflows after system restart without repeating destructive side-effects.

## Consequences
- Workflows are persistent, observable, recoverable, and auditable across UI, CLI, REST, and SSE.
- Resource governor memory pressure defers heavy local inference rather than crashing host hardware.
- Complete scope and tenant isolation across personal, project, and company boundaries.
