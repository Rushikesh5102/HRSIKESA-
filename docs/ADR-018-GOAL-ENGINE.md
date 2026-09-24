# ADR-018: Autonomous Goal Management & Verification Architecture

## Status
**ACCEPTED** (Phase 15 Implementation Complete)

## Context
Prior to Phase 15, HṚṢĪKEŚA could execute structured missions with DAG tasks (Phase 13) and model multi-company organizations (Phase 14). However, it lacked a sovereign top-level Goal Management layer capable of taking high-level human objectives ("Build and launch my SaaS product"), breaking them down into ordered milestones, delegating each milestone to existing mission orchestrators, recovering from partial failures, and independently verifying the outcome with cryptographic/file-backed evidence.

## Decision
1. **Layering Above Mission Engine**: We implement `GoalExecutionEngine` strictly above `MissionOrchestrator`. It consumes the existing 17-agent workforce, ToolBus, and Danger Tiers without duplication.
2. **Deterministic & LLM-Validated Planning**: Standard goal archetypes are resolved deterministically; complex goals invoke `ModelRouter` and undergo strict structural validation against known agent IDs, tool IDs, and budget limits.
3. **Independent Deterministic Verification**: `GoalVerifier` verifies physical artifacts, exit codes, and milestone completion deterministically, avoiding LLM hallucination or self-certification.
4. **Bounded Recovery & Replan**: Re-planning preserves all `COMPLETED` milestones and is bounded by `maxReplans` (default: 3).

## Consequences
- **Positive**: Complete sovereign autonomy from high-level objectives down to tool execution.
- **Positive**: Full auditability and evidence chains for every completed goal.
- **Positive**: Safe local execution with zero vendor lock-in.
