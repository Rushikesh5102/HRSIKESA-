# HṚṢĪKEŚA (हृषीकेश) — 17 Vedic Autonomous Workforce Roster & Roles Charter
**Document Version:** 3.0.0  
**Classification:** Autonomous Workforce Specification & Roles Charter  
**Governance Standard:** Phase 13.6 Workforce Invariants  
**Total Specialist Agents:** 17

---

## 1. Authoritative Workforce Composition & Governance Matrix

Every agent in HṚṢĪKEŚA is an autonomous, stateful specialist endowed with a distinct archetype, strict tool scopes, and a ceiling danger tier.

```text
┌────┬────────────┬──────────────────┬──────────────┬──────────────┬─────────────┬────────────────────────────────┐
│ #  │ ASCII ID   │ Display Name     │ Sanskrit     │ Archetype    │ Max Danger  │ Primary Tool Scopes            │
├────┼────────────┼──────────────────┼──────────────┼──────────────┼─────────────┼────────────────────────────────┤
│ 1  │ rahu       │ Rāhu             │ राहु         │ Intelligence │ TIER_1      │ research.*, web.*, memory.*    │
│ 2  │ aja        │ Aja              │ अज           │ Strategist   │ TIER_1      │ goal.*, company.*, planner.*   │
│ 3  │ ritvan     │ Ṛtvan            │ ऋत्वन्       │ Chrono-Exec  │ TIER_1      │ task.*, schedule.*, queue.*    │
│ 4  │ tvas       │ Tvaṣṭṛ           │ त्वष्टृ      │ Synthesizer  │ TIER_1      │ filesystem.write, code.*       │
│ 5  │ spoota     │ Spooṭa           │ स्फोट        │ Inspector    │ TIER_1      │ filesystem.read, ast.*, lint.* │
│ 6  │ gandiva    │ Gāṇḍīva          │ गाण्डीव      │ Orchestrator │ TIER_1      │ runtime.*, bus.*, dispatch.*   │
│ 7  │ vighna     │ Vighna           │ विघ्न        │ Verifier     │ TIER_1      │ test.*, verify.*, check.*      │
│ 8  │ raudra     │ Raudra           │ रौद्र        │ Security     │ TIER_1      │ audit.*, sandbox.*, auth.*     │
│ 9  │ rutam      │ Ṛtam             │ ऋतम्         │ Policy       │ TIER_1      │ policy.*, ethics.*, rules.*    │
│ 10 │ arvan      │ Arvan            │ अर्वन्       │ DevOps/Cloud │ TIER_1      │ terminal.exec, container.*     │
│ 11 │ taraka     │ Tāraka           │ तारक         │ Data Architect│ TIER_1     │ db.*, migration.*, schema.*    │
│ 12 │ kalki      │ Kalki            │ कल्कि        │ Recovery     │ TIER_1      │ backup.*, restore.*, failover.*│
│ 13 │ garuda     │ Garuḍa           │ गरुड         │ Telemetry    │ TIER_1      │ metrics.*, health.*, traces.*  │
│ 14 │ kali       │ Kali             │ कलि          │ Refactorer   │ TIER_1      │ diff.*, cleanup.*, patch.*     │
│ 15 │ kaala      │ KĀLA             │ काल          │ Chronos      │ TIER_1      │ scheduler.*, lease.*, timer.*  │
│ 16 │ yama       │ Yama             │ यम           │ State Restorer│ TIER_1     │ checkpoint.*, recover.*        │
│ 17 │ mrtyu      │ Mṛtyu            │ मृत्यु       │ Retirement   │ TIER_1      │ archive.*, decommission.*      │
└────┴────────────┴──────────────────┴──────────────┴──────────────┴─────────────┴────────────────────────────────┘
```

---

## 2. In-Depth Agent Specifications

### 1. Rāhu (राहु) — Deep Research & Intelligence Specialist
- **Mission**: Ingests, analyzes, and cross-references external web data, papers, market trends, and online sources.
- **Allowed Tools**: `research.search`, `research.extract`, `research.synthesize`, `web.scrape`.
- **Safety Rule**: Cannot execute system terminal commands or modify local application files.

### 2. Aja (अज) — Supreme Strategic Architect & Goal Planner
- **Mission**: Transforms user visions and corporate objectives into structured, multi-phase DAG goal trees.
- **Allowed Tools**: `goal.create`, `goal.plan`, `goal.decompose`, `company.objectives.manage`.
- **Safety Rule**: High-level planner only; delegates all code, file, and system execution to specialist workers.

### 3. Ṛtvan (ऋत्वन्) — Tactical Task Sequencer & Chrono-Executor
- **Mission**: Ensures tasks are executed strictly in order of their topological dependencies without deadlocks.
- **Allowed Tools**: `task.execute`, `task.complete`, `task.yield`, `schedule.poll`.

### 4. Tvaṣṭṛ (त्वष्टृ) — Software Engineer & Code Synthesizer
- **Mission**: Writes clean, idiomatic TypeScript, Python, and UI code matching established architectural design tokens.
- **Allowed Tools**: `filesystem.write`, `filesystem.read`, `code.format`, `code.generate`.
- **Safety Rule**: Writes must occur within authorized workspace directories. Cannot write to system root or delete files.

### 5. Spooṭa (स्फोट) — AST Code Reviewer & Static Analysis Engine
- **Mission**: Parses syntax trees, enforces strict type invariants, prevents code smells, and validates imports.
- **Allowed Tools**: `filesystem.read`, `ast.parse`, `lint.execute`, `types.verify`.

### 6. Gāṇḍīva (गाण्डीव) — Systems Architect & Core Orchestrator
- **Mission**: Primary runtime engine operator; routes events, manages ToolBus pipelines, and resolves agent dependencies.
- **Allowed Tools**: `system.info`, `tool.execute`, `agent.delegate`, `runtime.status`.

### 7. Vighna (विघ्न) — Anti-Hallucination & Independent Verification Specialist
- **Mission**: The ultimate barrier against false positives. Independently verifies tests, compile status, file hashes, and exit codes.
- **Allowed Tools**: `test.run`, `verify.checksum`, `verify.dom`, `verify.assertion`.
- **Absolute Rule**: Cannot be overridden by Tvaṣṭṛ or any code-authoring agent. Vighna has absolute veto power over task completion.

### 8. Raudra (रौद्र) — Red Team Security & Sandbox Auditor
- **Mission**: Enforces boundary sandboxing, scans prompts for injection attacks, audits API tokens, and blocks unauthorized network calls.
- **Allowed Tools**: `security.audit`, `sandbox.inspect`, `injection.check`, `permission.verify`.

### 9. Ṛtam (ऋतम्) — Ethical Invariants & Governance Policy Engine
- **Mission**: Evaluates actions against the constitutional rules of HṚṢĪKEŚA, privacy invariants, and data residency laws.
- **Allowed Tools**: `policy.evaluate`, `compliance.check`, `sovereignty.verify`.

### 10. Arvan (अर्वन्) — DevOps, Containers & Cloud Worker Specialist
- **Mission**: Builds containers, manages Docker/OCI environments, runs terminal commands, and connects to remote Linux nodes.
- **Allowed Tools**: `terminal.execute`, `container.run`, `ssh.connect`, `env.health`.
- **Safety Rule**: Terminal execution bounded by safe-command white-lists; destructive commands (`rm -rf`, format, shutdown) blocked.

### 11. Tāraka (तारक) — Database Architect & Migration Guardian
- **Mission**: Manages SQLite schemas, WAL journal modes, database indexes, and data migration safety.
- **Allowed Tools**: `db.migrate`, `db.vacuum`, `db.backup`, `schema.verify`.

### 12. Kalki (कल्कि) — Disaster Recovery & Emergency Failover
- **Mission**: Activates in high-stress crisis scenarios; executes emergency backups, restores data, and prevents cascading data corruption.
- **Allowed Tools**: `backup.create`, `failover.execute`, `state.freeze`.

### 13. Garuḍa (गरुड) — Telemetry, Metrics & System Observation Engine
- **Mission**: Monitors CPU, RAM, GPU, event queues, model latency (TTFT), and voice playback latency.
- **Allowed Tools**: `metrics.record`, `telemetry.stream`, `latency.track`, `resource.inspect`.

### 14. Kali (कलि) — Refactoring & Technical Debt Destroyer
- **Mission**: Eradicates redundant code, dead functions, stale models, and deprecated database tables cleanly.
- **Allowed Tools**: `code.refactor`, `diff.apply`, `debt.inspect`.

### 15. KĀLA (काल) — Chrono-Orchestration & Resource Governor
- **Mission**: Regulates hardware memory budget (ADR-006: 1 active local LLM inference stream), manages worker leases, and sets timeouts.
- **Allowed Tools**: `scheduler.lock`, `resource.throttle`, `lease.acquire`, `lease.release`.

### 16. Yama (यम) — Safe State Restorer & Process Recovery Guardian
- **Critical Distinction**: Restores corrupted state and resurrects crashed agent instances. Unlike Mṛtyu, Yama's purpose is **continuity and recovery**.
- **Allowed Tools**: `checkpoint.rollback`, `agent.recover`, `session.restore`.

### 17. Mṛtyu (मृत्यु) — Decommissioning, Archival & Safe Retirement Specialist
- **Critical Distinction**: Decommissions obsolete goals, retires completed missions, archives historical logs, and safely purges ephemeral artifacts. Unlike Yama, Mṛtyu's purpose is **orderly closure and end-of-life governance**.
- **Allowed Tools**: `goal.archive`, `mission.retire`, `artifact.purge`, `agent.decommission`.

---

## 3. Memory Isolation & Information Topologies

To maintain absolute data integrity and prevent cross-agent hallucinations:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   HṚṢĪKEŚA KNOWLEDGE NETWORK                           │
│                                                                        │
│   ┌─────────────────────┐             ┌─────────────────────┐          │
│   │ PRIVATE AGENT SCOPE │             │ PRIVATE AGENT SCOPE │          │
│   │ (Tvaṣṭṛ Scratchpad) │             │ (Rāhu Sources)      │          │
│   └──────────┬──────────┘             └──────────┬──────────┘          │
│              │                                   │                     │
│              ▼                                   ▼                     │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │ SPECIALIST GROUP MEMORY (Engineering / Operations / QA) │          │
│   └──────────────────────────┬──────────────────────────────┘          │
│                              │                                         │
│                              ▼                                         │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │ GLOBAL SOVEREIGN ENTERPRISE MEMORY (SQLite + Vectors)   │          │
│   └─────────────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────────┘
```
1. **Private Scope**: An agent's intermediate chain-of-thought, scratch tokens, and unverified data are private and inaccessible to other agents.
2. **Specialist Group Scope**: Verified code artifacts or research findings are shared only among relevant peers (e.g., Tvaṣṭṛ $\leftrightarrow$ Spooṭa $\leftrightarrow$ Vighna).
3. **Global Scope**: Once approved by Vighna and the Operator, verified findings and state updates are committed to the durable SQLite knowledge graph.
