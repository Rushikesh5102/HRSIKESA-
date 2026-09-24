# HṚṢĪKEŚA (हृषीकेश) — Human-in-the-Loop (HITL) Governance & Safety Charter
**Document Version:** 3.0.0  
**Classification:** Operational Safety & Cryptographic Permission Protocol  
**Enforcement Authority:** Dharma (Policy) & Raudra (Security)

---

## 1. The Core Constitutional Invariant

> **"NO AUTONOMOUS ACTION MAY DESTROY OPERATOR ASSETS, EXECUTE PRIVILEGED SHELL COMMANDS, COMPROMISE PRIVATE CREDENTIALS, OR PUBLISH IRREVERSIBLE CHANGES WITHOUT EXPLICIT OPERATOR AUTHORIZATION."**

HṚṢĪKEŚA strictly rejects the dangerous paradigm of "unfettered autonomous agent loops". All actions are classified into **Danger Tiers**, and high-risk operations mandate explicit human approval through the **Attention Queue** in the Control Center.

---

## 2. Danger Tier Classification Matrix

```text
┌────────┬──────────────┬───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Tier   │ Level Name   │ Description                   │ Example Actions               │ Authorization Required        │
├────────┼──────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Tier 0 │ Safe / Read  │ Pure observation, read-only   │ Read file, check system info, │ None (Fully Autonomous)       │
│        │              │ queries, internal reasoning   │ search memory, inspect DOM    │                               │
├────────┼──────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Tier 1 │ Sandboxed    │ Local workspace edits,        │ Create test file, format code,│ Autonomous within Sandboxed   │
│        │ Write        │ drafting tasks, staging data  │ run verified unit test        │ Directory Boundaries          │
├────────┼──────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Tier 2 │ System / Net │ Environmental configuration,  │ Install npm/pip package, run  │ Spoken / UI Click Approval    │
│        │ Operations   │ local server management       │ background terminal command   │ ("Proceed" / "Approve")       │
├────────┼──────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Tier 3 │ Critical /   │ Irreversible changes, shell   │ Delete database table, rotate │ Explicit Cryptographic Token  │
│        │ Privileged   │ sudo, financial execution     │ credentials, format disk      │ / Strict Operator Affirmation │
└────────┴──────────────┴───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

## 3. Human-in-the-Loop State Machine

When a task triggers a **Tier 2** or **Tier 3** requirement, the agent runtime halts and transitions the workflow into a suspended approval state:

```text
[Task Planned by Aja]
         │
         ▼
[Raudra Risk Classification]
         │
         ├─── Tier 0 / 1 ───> [Execute Directly via ToolBus]
         │
         └─── Tier 2 / 3
                   │
                   ▼
         [State: AWAITING_APPROVAL]
                   │
                   ├─── Generated Approval Proposal Object:
                   │    - Requesting Agent ID
                   │    - Target Tool & Exact Arguments
                   │    - Risk Explanation & Expected Side-Effects
                   │    - Reversible Rollback Plan
                   │
                   ▼
         [Control Center Approval Modal & Voice Prompt]
         "Action requires authorization: Install dependencies for Project Aumtrix. Approve?"
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    [APPROVED]           [REJECTED]
         │                   │
         ▼                   ▼
  [Execute Tool]       [Cancel Task & Inform Director]
         │                   │
         ▼                   ▼
  [Record Audit]       [Log Rejection Audit]
```

---

## 4. Anti-Hallucination & Evidence Standards

To eradicate synthetic hallucinations and fake progress reports, HṚṢĪKEŚA enforces the **Tripartite Evidence Rule**:

1. **State Delta Evidence**: A file edit must produce a Git diff or changed MD5 checksum verified by Spooṭa.
2. **Execution Exit Code**: A terminal command must yield an exit code of `0` captured directly by Node.js child process streams.
3. **Verification Assertion**: Vighna must independently execute a test assertion or compile verification (`tsc --noEmit`).

If any of the three elements fails or is missing, **the task is marked as FAILED**, and the agent is penalized in its execution history.

---

## 5. Citragupta Immutable Audit Ledger

Every single tool execution, model inference token count, approval decision, and file modification is permanently recorded in the SQLite audit ledger table: `tool_executions` and `model_usage_audits`.

- **Audit Properties**:
  - `timestamp`: ISO-8601 millisecond precision.
  - `agent_id`: The originating specialist agent.
  - `tool_name`: Exact tool identifier executed.
  - `danger_tier`: Tier 0 through 3.
  - `approval_token`: Null if Tier 0/1; cryptographic operator signature if Tier 2/3.
  - `duration_ms`: Total execution latency.
  - `success`: Boolean result flag.
- **Tamper Resistance**: Audit records are insert-only; no agent possesses permissions to update or delete rows from the audit tables.
