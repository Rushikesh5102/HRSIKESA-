# HṚṢĪKEŚA Skill Execution Engine Architecture

## Overview
The `SkillExecutionEngine` is responsible for transforming a declarative `SkillDefinition` into an active execution graph, managing step progression, enforcing security and resource invariants, handling checkpoints, and capturing telemetry.

## Execution Lifecycle
```
                 ┌─────────────┐
                 │   PENDING   │
                 └──────┬──────┘
                        │ Validate Inputs & Capabilities
                        ▼
                 ┌─────────────┐
        ┌───────►│ VALIDATING  ├───────┐ (Failed Validation)
        │        └──────┬──────┘       ▼
        │               │ Passed  ┌──────────┐
        │               ▼         │  FAILED  │
        │        ┌─────────────┐  └──────────┘
        │        │  EXECUTING  │       ▲
        │        └──────┬──────┘       │
        │               ├──────────────┤ (Step Execution Error)
        │ Checkpoint    ├──────────────┤ (Memory Critical)
        │ Resume        ▼              ▼
 ┌──────┴──────┐ ┌─────────────┐ ┌───────────┐
 │   PAUSED    │ │  APPROVAL_  │ │ CANCELLED │
 └─────────────┘ │  REQUIRED   │ └───────────┘
                 └──────┬──────┘
                        │ Human Approves
                        ▼
                 ┌─────────────┐
                 │  COMPLETED  │
                 └─────────────┘
```

## Step Execution Modes
1. **TOOL**: Handled via `ToolExecutionBus` with alias resolution (`file_write` → `filesystem.write`).
2. **MODEL**: Routed via `ModelRouter` to the optimal active local or remote provider.
3. **RESEARCH**: Gathers intelligence from the Knowledge Graph or web with source citation.
4. **VERIFY**: Deterministic strategies (`file_exists`, `command_exit_code`) to objectively verify outcomes without LLM hallucination.
5. **CHECKPOINT**: Flushes current execution state to SQLite for durable restart recovery.

## Fault Tolerance & Retries
- Configurable step retries with exponential backoff.
- Transient errors are retried within budget.
- Security and human approval rejections are strictly non-retryable.
- Pause, resume, and cancel capabilities allow operators full control over active procedures.
