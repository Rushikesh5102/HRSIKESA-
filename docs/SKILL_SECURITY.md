# HṚṢĪKEŚA Skill Security Architecture

## Principles of Procedural Security
1. **Zero Permission Escalation**: Skills are not execution bypasses. Every underlying tool executed by a skill step must independently pass through `PermissionManager` and `ToolAudit`. If a skill invokes `filesystem:write`, the agent must hold `filesystem:write` permission.
2. **Deterministic DAG Validation**: All skills are scanned before registration by `SkillSecurityValidator`. Cyclic dependencies, dangling `dependsOn` references, and step counts exceeding limits (default 50) are rejected immediately.
3. **Forbidden Pattern Detection**: Skill parameters, steps, and prompt templates are scanned for prompt injection vectors, shell escapings, and dangerous patterns.
4. **Human Authority Gate**: Skills marked with `riskLevel: 'HIGH'` or `'CRITICAL'`, or `requiresApproval: true`, automatically pause in `SkillExecutionEngine` emitting `skill.approval.required`. No sensitive step can execute without explicit human authorization.
5. **Secret Redaction**: Parameter values, tool arguments, and model prompts are scrubbed by `SkillSecurityValidator.redactSecrets()` ensuring API keys, passwords, and tokens never leak into execution logs or telemetry.
6. **Resource Governor Backpressure**: When system resources enter `CRITICAL_MEMORY`, the `SkillExecutionEngine` throttles or rejects execution requests to prevent node process crashes or memory thrashing.
7. **Evolution Sandboxing**: Self-improvement mechanisms only produce structured proposals (`SkillImprovementProposal`). There is no unsupervised runtime hot-patching of skill code.
