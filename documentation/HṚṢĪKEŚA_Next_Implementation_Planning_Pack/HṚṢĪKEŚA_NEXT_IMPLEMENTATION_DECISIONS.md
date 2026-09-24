# HṚṢĪKEŚA — Proposed Architecture Decisions for Next Work

## Decision 1 — Keep the control plane local-first
HṚṢĪKEŚA identity, policy, memory, knowledge, company state and audit remain under the control plane. Execution can move to workers.

## Decision 2 — Separate conversation from execution
A conversation request must not wait for autonomous execution unless the user explicitly requests synchronous behavior.

## Decision 3 — Workers are replaceable
Local, cloud and remote workers implement a common worker contract.

## Decision 4 — Use existing subsystems before adding new frameworks
Prefer the existing Goal/Mission/Scheduler/Skill/MCP/ToolBus/ResourceGovernor/ModelRouter systems. Add infrastructure only where a measured gap exists.

## Decision 5 — No premature distributed database
Start with SQLite and durable files/artifacts. Introduce a server database only when workload or multi-device concurrency demonstrates the need.

## Decision 6 — Demonstration learning publishes Skills, not arbitrary code
Recorded workflows become versioned skills subject to security validation and approval. No automatic self-modification of the core.

## Decision 7 — Cloud execution is policy-controlled
Every job has an execution-placement policy based on privacy, capability, cost, latency, availability and user/company policy.

## Decision 8 — Model independence is a core invariant
Models are adapters/resources. Memory, identity, skills, tool contracts and policies must not be coupled to one model provider.

## Decision 9 — Evidence is required for completion
Background tasks report state transitions and evidence. "Completed" is never inferred merely from a model message.

## Decision 10 — Build in thin vertical slices
Each workstream should produce one end-to-end usable capability before broadening the framework.
