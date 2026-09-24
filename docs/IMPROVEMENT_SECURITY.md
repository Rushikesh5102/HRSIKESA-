# HṚṢĪKEŚA (हृषीकेश) — Self-Improvement Security Architecture & Invariants

## 1. Absolute Safety Invariants

HṚṢĪKEŚA enforces strict, immutable architectural invariants:

1. **Human Authority**: **Rushikesh Pattiwar** is the supreme human authority. No autonomous proposal or model judgment may override or bypass human approval.
2. **Sovereign Orchestration**: **HṚṢĪKEŚA** orchestrates the 17-agent workforce.
3. **No Silent Security Mutations**: Proposals affecting `PermissionManager`, authentication, danger tiers, or audit logging automatically receive `HIGH` or `CRITICAL` risk classification and require explicit human sign-off.
4. **Model Approval is NOT Human Approval**: Model-generated responses cannot satisfy Human-in-the-Loop (`HITL`) gates.
5. **No Production Direct Mutation**: All changes are formulated into structured changesets, verified in isolated sandboxes, and benchmarked before deployment.
6. **Automatic Rollback Guarantee**: Any post-deployment regression detected during the `MONITORING` stage immediately triggers automated rollback to the pre-change snapshot.
7. **Secret Redaction**: Telemetry observations scrub API keys, passwords, and sensitive JWT tokens prior to persistence (`[REDACTED_SECRET]`).
8. **Multi-Company Isolation**: Improvement proposals and changesets are strictly scoped to their originating tenant. Cross-tenant mutation is denied by default.
