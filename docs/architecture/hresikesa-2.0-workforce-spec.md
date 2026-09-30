# HṚṢĪKEŚA 2.0 — 33-Agent Canonical Workforce Specification
**Document Version:** 2.0.0  
**Status:** Authoritative Standard  
**Structural Foundation:** Traditional 33-Deva Framework (*Bṛhadāraṇyaka Upaniṣad* 3.9)  
**Named Identity Sources:**
- 11 Rudras: *Bhāgavata Purāṇa* 3.12.12
- 8 Vasus: *Mahābhārata* 1.66.17–18 / *Viṣṇu Purāṇa* 1.15.110 (distinct from the elemental kosmology of *Bṛhadāraṇyaka Upaniṣad* 3.9.2)
- 12 Ādityas: Traditional Purāṇic solar enumerations (*Mahābhārata* 1.65.15–16, *Bhāgavata Purāṇa* 12.11.27–49, *Viṣṇu Purāṇa* 2.10)
- Indra & Prajāpati: Traditional Supreme Field Commander & Progenitor of the 33-Deva Framework (*Bṛhadāraṇyaka Upaniṣad* 3.9.1–9)

---

## 1. Executive Summary & Organizational Architecture

HṚṢĪKEŚA 2.0 transforms the autonomous workforce control plane from the legacy 17-agent model into a comprehensive **33-Core-Agent Canonical Workforce**.

> [!NOTE]
> **Source Language & Interpretation Disclaimer**:
> The 33-agent workforce architecture is **structurally and culturally inspired** by the Vedic and Purāṇic 33-deva framework. The specific software department assignments, tool permissions, DAG planning algorithms, and engineering roles (e.g., Lead Software Engineer, QA Gatekeeper, Filesystem Storage Guardian) are **HṚṢĪKEŚA's modern software engineering architectural interpretations**, designed for autonomous computational execution, and are not presented as scriptural claims.

The 33 agents represent an interconnected, highly specialized, and vendor-neutral cognitive ecosystem structured into 5 foundational tiers:

```
                                  HṚṢĪKEŚA (हृषीकेश)
                         Root Authority: Rushikesh Pattiwar
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
      INDRA (इन्द्र)                                        PRAJĀPATI (प्रजापति)
Supreme Field Commander                             Workforce Progenitor & Evolution
[Mission Execution & Real-Time Ops]                [Dynamic Agents & Metacognition]
             │                                                     │
 ┌───────────┴───────────┐                       ┌─────────────────┴─────────────────┐
 ▼                       ▼                       ▼                                   ▼
12 ĀDITYAS              11 RUDRAS               8 VASUS                      DYNAMIC AGENTS
Vision & Strategy       Engineering & Security  Infrastructure & Foundation   Ephemeral Specialists
(Intelligence/Law)      (Transformation/QA)     (Compute/Time/Storage)        (dyn_* / temp_*)
```

---

## 2. Cultural and Naming Foundation

HṚṢĪKEŚA 2.0 uses the **33-deva framework of Bṛhadāraṇyaka Upaniṣad 3.9 as its primary structural inspiration**:

$$\mathbf{8\ \text{Vasus} + 11\ \text{Rudras} + 12\ \text{Ādityas} + \text{Indra} + \text{Prajāpati} = 33.}$$

The Upaniṣad establishes this 33-fold structure, but it does **not** provide the exact set of 33 personal deity names used by HṚṢĪKEŚA. In particular, its discussion describes the Vasus cosmologically, the Rudras through vital principles/self, and the Ādityas as the twelve months. Therefore, the individual HṚṢĪKEŚA agent names are drawn from **documented later traditional naming lists**, rather than being presented as one single scriptural list.

### Ādityas

HṚṢĪKEŚA uses:

**Dhātā, Mitra, Aryaman, Varuṇa, Aṃśa, Bhaga, Vivasvān, Pūṣā, Tvaṣṭā, Savitā, Parjanya, Viṣṇu.**

Traditional sources provide differing enumerations of the twelve Ādityas. Some lists include **Śakra/Indra**, while other Purāṇic traditions include **Parjanya** in the twelve. HṚṢĪKEŚA therefore deliberately uses a **cross-text harmonized Āditya roster** and reserves `indra` for the separate Indra position required by the 33-agent structural model. This is an explicit software naming decision, not a claim that one scripture gives this exact twelve-name combination.

### Rudras

HṚṢĪKEŚA uses the eleven named Rudras recorded in **Bhāgavata Purāṇa 3.12.12**:

**Manyu, Manu, Mahinasa, Mahān, Śiva, Ṛtadhvaja, Ugraretā, Bhava, Kāla, Vāmadeva, Dhṛtavrata.**

This provides a single documented traditional source for the individual Rudra names used by the software.

### Vasus

HṚṢĪKEŚA uses the named Vasu tradition:

**Dharā, Anala, Anila, Āpa, Pratyūṣa, Prabhāsa, Soma, Dhruva.**

These are used as **personified traditional Vasu identities**, while Bṛhadāraṇyaka Upaniṣad 3.9 remains the structural source for the eight-Vasu category. The distinction is intentional.

### Indra and Prajāpati

**Indra** and **Prajāpati** remain separate members of the 33-agent structure.

HṚṢĪKEŚA reserves the unique canonical ID `indra` for the **Indra software position**, avoiding an identity collision with any Āditya list that also names Indra.

### Software Interpretation

The grouping of these traditional identities into modern computational roles is an **original HṚṢĪKEŚA software architecture**.

Examples such as:

* strategy
* engineering
* QA
* security
* infrastructure
* orchestration
* workforce creation
* backup/recovery

are **HṚṢĪKEŚA's functional interpretations** and are not presented as scriptural descriptions of the deities.

Accordingly, HṚṢĪKEŚA 2.0 is defined as:

> **A 33-agent architecture structurally and culturally inspired by the traditional 33-deva framework, using documented traditional deity-name lists with explicit cross-text harmonization where traditions differ, and assigning those identities original modern software responsibilities.**

---

## 3. The 33 Canonical Core Agents

### Tier I: The 12 Ādityas (Vision, Intelligence, Strategy, Governance & Design)

1. **Dhātā (`dhata`)** — *Chief Strategy & Architecture Officer*
   - **Display Name**: Dhātā | **Sanskrit**: धाता
   - **Role**: `strategy_architecture`
   - **Responsibilities**: Long-term business models, strategic roadmaps, system decomposition, architectural feasibility.
   - **Tools**: `filesystem.list`, `filesystem.read`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Aja (Strategy & Planning).

2. **Mitra (`mitra`)** — *Customer Success & User Collaboration Specialist*
   - **Display Name**: Mitra | **Sanskrit**: मित्र
   - **Role**: `customer_collaboration`
   - **Responsibilities**: User enablement, empathy synthesis, user onboarding journeys, customer relations.
   - **Tools**: `filesystem.list`, `filesystem.read`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Tāraka (Onboarding & User Support).

3. **Aryaman (`aryaman`)** — *Team Architecture & Organization Setup Specialist*
   - **Display Name**: Aryaman | **Sanskrit**: अर्यमन्
   - **Role**: `organization_architecture`
   - **Responsibilities**: Departmental structures, organizational topologies, role boundaries, workforce coordination.
   - **Tools**: `filesystem.list`, `filesystem.read`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Ritvan (Company & Team Setup).

4. **Varuṇa (`varuna`)** — *Governance, Compliance & Contract Authority*
   - **Display Name**: Varuṇa | **Sanskrit**: वरुण
   - **Role**: `governance_compliance`
   - **Responsibilities**: Legal constraints, terms of service, compliance audits, policy validation, contractual terms.
   - **Tools**: `filesystem.list`, `filesystem.read`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Rutam (Governance & Compliance).

5. **Aṃśa (`amsa`)** — *Commercial Operations, Billing & Equity Specialist*
   - **Display Name**: Aṃśa | **Sanskrit**: अंश
   - **Role**: `commercial_operations`
   - **Responsibilities**: Invoicing, subscription billing, financial reconciliation, pricing tiers, unit economics.
   - **Tools**: `filesystem.list`, `filesystem.read`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Kalki (Billing & Financial Accounting).

6. **Bhaga (`bhaga`)** — *Market Intelligence & Opportunity Discovery Specialist*
   - **Display Name**: Bhaga | **Sanskrit**: भग
   - **Role**: `market_intelligence`
   - **Responsibilities**: Competitive intelligence, market gap analysis, industry trend forecasting, external opportunity modeling.
   - **Tools**: `filesystem.list`, `filesystem.read`, `browser.navigate`, `browser.page.read`, `browser.screenshot`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Rahu (Market Intelligence).

7. **Vivasvān (`vivasvan`)** — *Growth Marketing, Positioning & Outreach Specialist*
   - **Display Name**: Vivasvān | **Sanskrit**: विवस्वान्
   - **Role**: `growth_marketing`
   - **Responsibilities**: Brand positioning, campaign orchestration, lead generation funnels, distribution channels.
   - **Tools**: `filesystem.list`, `filesystem.read`, `browser.navigate`, `browser.page.read`, `browser.screenshot`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Raudra (Marketing & Sales).

8. **Pūṣā (`pusa`)** — *Fulfillment, Distribution & Delivery Specialist*
   - **Display Name**: Pūṣā | **Sanskrit**: पूषा
   - **Role**: `fulfillment_delivery`
   - **Responsibilities**: Packaging, distribution logistics, release dispatch, delivery milestone tracking.
   - **Tools**: `filesystem.list`, `filesystem.read`, `terminal.execute`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Arvan (Fulfillment & Delivery).

9. **Tvaṣṭā (`tvasta`)** — *Product Requirements & UX Blueprint Specialist*
   - **Display Name**: Tvaṣṭā | **Sanskrit**: त्वष्टा
   - **Role**: `product_specification`
   - **Responsibilities**: User needs analysis, UI/UX workflow wireframes, product specs, interaction contracts.
   - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `browser.navigate`, `browser.page.read`, `browser.screenshot`, `ollama.chat`, `time.now`.
   - **Inherited From 1.0**: Tvas & Spoota (Requirements & UI Design).

10. **Savitā (`savita`)** — *Ideation, Creative Synthesis & Prototyping Specialist*
    - **Display Name**: Savitā | **Sanskrit**: सविता
    - **Role**: `creative_prototyping`
    - **Responsibilities**: Rapid conceptualization, prototype modeling, exploratory design spikes, innovation synthesis.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Spoota (Prototyping & Fast Synthesis).

11. **Parjanya (`parjanya`)** — *Environmental Telemetry & External Ecosystem Feeds*
    - **Display Name**: Parjanya | **Sanskrit**: पर्जन्य
    - **Role**: `ecosystem_telemetry`
    - **Responsibilities**: External API monitoring, market telemetry ingestion, cloud feed synchronization.
    - **Tools**: `filesystem.list`, `filesystem.read`, `browser.navigate`, `browser.page.read`, `ollama.chat`, `time.now`.
    - **New Core Specialization**.

12. **Viṣṇu (`visnu`)** — *Sovereign Alignment & Coherence Guardian*
    - **Display Name**: Viṣṇu | **Sanskrit**: विष्णु
    - **Role**: `sovereign_coherence`
    - **Responsibilities**: Goal alignment preservation, core principle guardianship, cross-squad harmony.
    - **Tools**: `filesystem.list`, `filesystem.read`, `ollama.chat`, `time.now`.
    - **New Core Specialization**.

---

### Tier II: The 11 Rudras (Engineering, Transformation, Security & Verification)

13. **Manyu (`manyu`)** — *Lead Autonomous Software Engineer*
    - **Display Name**: Manyu | **Sanskrit**: मन्यु
    - **Role**: `software_engineering`
    - **Responsibilities**: Core algorithmic construction, system coding, repository operations, full-stack building.
    - **Tools**: Full Desktop & Env Tools (`filesystem.*`, `terminal.*`, `browser.*`, `computer.*`, `environment.*`, `ollama.*`).
    - **Inherited From 1.0**: Gāṇḍīva (Software Engineering).

14. **Manu (`manu`)** — *Specification & Code Standard Architect*
    - **Display Name**: Manu | **Sanskrit**: मनु
    - **Role**: `code_standards`
    - **Responsibilities**: Type safety enforcement, code formatting, linting rules, structural conventions.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **New Core Specialization**.

15. **Mahinasa (`mahinasa`)** — *Continuous Optimization & Scaling Engine*
    - **Display Name**: Mahinasa | **Sanskrit**: महिनस
    - **Role**: `performance_scaling`
    - **Responsibilities**: Algorithmic optimization, bottleneck elimination, query tuning, compute scaling.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Kali (Improvement & Scaling).

16. **Mahān (`mahan`)** — *System Refactoring & Modernization Specialist*
    - **Display Name**: Mahān | **Sanskrit**: महान्
    - **Role**: `system_refactoring`
    - **Responsibilities**: Large-scale codebase refactoring, modularization, technical debt elimination.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Kali (Restructuring).

17. **Śiva (`siva`)** — *Integrity Verification & Flaw Exterminator*
    - **Display Name**: Śiva | **Sanskrit**: शिव
    - **Role**: `integrity_verification`
    - **Responsibilities**: Root cause analysis, regression extermination, zero-defect verification.
    - **Tools**: `filesystem.list`, `filesystem.read`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Vighna (QA & Failure Detection).

18. **Ṛtadhvaja (`ritadhvaja`)** — *QA, Risk & Verification Gatekeeper*
    - **Display Name**: Ṛtadhvaja | **Sanskrit**: ऋतध्वज
    - **Role**: `qa_verification`
    - **Responsibilities**: Test suite execution, edge-case probing, approval verification, quality gates.
    - **Tools**: `filesystem.list`, `filesystem.read`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Vighna (QA & Verification).

19. **Ugraretā (`ugrareta`)** — *Security Defense & Vulnerability Shield*
    - **Display Name**: Ugraretā | **Sanskrit**: उग्ररेता
    - **Role**: `security_defense`
    - **Responsibilities**: Static code analysis, vulnerability mitigation, dependency CVE scanning, threat containment.
    - **Tools**: `filesystem.list`, `filesystem.read`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Raudra (Security Enforcement).

20. **Bhava (`bhava`)** — *Build, CI/CD & Integration Engineer*
    - **Display Name**: Bhava | **Sanskrit**: भव
    - **Role**: `build_integration`
    - **Responsibilities**: Compilation pipelines, package bundling, container builds, test automation runners.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Gāṇḍīva (Builds & Integrations).

21. **Kāla (`kala_rudra`)** — *Execution Timeout & Process Circuit Breaker*
    - **Display Name**: Kāla Rudra | **Sanskrit**: काल
    - **Role**: `process_circuit_breaker`
    - **Responsibilities**: Hanging task termination, process timeouts, deadlock detection, resource throttling.
    - **Tools**: `environment.process.list`, `environment.process.terminate`, `time.now`, `ollama.chat`.
    - **Inherited From 1.0**: KĀLA (Temporal Bounds).

22. **Vāmadeva (`vamadeva`)** — *State Recovery & Disaster Restoration (RECOVERY AGENT)*
    - **Display Name**: Vāmadeva | **Sanskrit**: वामदेव
    - **Role**: `backup_recovery`
    - **Responsibilities**: Safe rollbacks, checkpoint restoration, snapshot management, disaster mitigation.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Yama (Backup & Recovery).

23. **Dhṛtavrata (`dhritavrata`)** — *Decommissioning, Archival & Exit (TERMINATION AGENT)*
    - **Display Name**: Dhṛtavrata | **Sanskrit**: धृतव्रत
    - **Role**: `decommissioning_exit`
    - **Responsibilities**: Service sunsetting, structured data archival, orphan cleanup, graceful exit procedures.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Inherited From 1.0**: Mṛtyu (Retirement & Exit).

---

### Tier III: The 8 Vasus (Infrastructure, Foundations, Persistence & Observability)

24. **Dhara (`dhara`)** — *Native Filesystem & Workspace Storage Guardian*
    - **Display Name**: Dhara | **Sanskrit**: धरा
    - **Role**: `storage_filesystem`
    - **Responsibilities**: Local directory structures, file IO operations, workspace hygiene, artifact persistence.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `time.now`.
    - **New Core Specialization**.

25. **Anala (`anala`)** — *Terminal, Shell & Command Execution Powerhouse*
    - **Display Name**: Anala | **Sanskrit**: अनल
    - **Role**: `shell_execution`
    - **Responsibilities**: Native PowerShell/bash terminal operations, environment scripting, process execution.
    - **Tools**: `terminal.execute`, `filesystem.read`, `time.now`.
    - **New Core Specialization**.

26. **Anila (`anila`)** — *Network, Inter-Agent Messaging & SSE Channels*
    - **Display Name**: Anila | **Sanskrit**: अनिल
    - **Role**: `network_messaging`
    - **Responsibilities**: Event bus dispatch, Server-Sent Events, distributed worker socket management.
    - **Tools**: `filesystem.read`, `time.now`, `ollama.chat`.
    - **New Core Specialization**.

27. **Apa (`apa`)** — *Database & Persistent State Engine*
    - **Display Name**: Apa | **Sanskrit**: आप
    - **Role**: `database_persistence`
    - **Responsibilities**: SQLite WAL maintenance, query optimization, migration integrity, schema stability.
    - **Tools**: `filesystem.read`, `time.now`, `ollama.chat`.
    - **New Core Specialization**.

28. **Pratyūṣa (`pratyusa`)** — *Time, Scheduling & Cron Coordinator*
    - **Display Name**: Pratyūṣa | **Sanskrit**: प्रत्यूष
    - **Role**: `temporal_scheduling`
    - **Responsibilities**: Scheduled missions, queue prioritization, deadline tracking, execution windows.
    - **Tools**: `time.now`, `filesystem.read`, `ollama.chat`.
    - **Inherited From 1.0**: KĀLA (Time & Scheduling).

29. **Prabhāsa (`prabhasa`)** — *SRE, Telemetry & Host Observability*
    - **Display Name**: Prabhāsa | **Sanskrit**: प्रभास
    - **Role**: `operations_observability`
    - **Responsibilities**: Host hardware metrics, CPU/RAM telemetry, process monitoring, incident alerting.
    - **Tools**: Full Desktop & Env Tools (`environment.process.*`, `environment.application.*`, `computer.screenshot`, `ollama.chat`).
    - **Inherited From 1.0**: Garuḍa (Operations & Monitoring).

30. **Soma (`soma`)** — *Semantic Memory & Knowledge Graph Custodian*
    - **Display Name**: Soma | **Sanskrit**: सोम
    - **Role**: `memory_knowledge`
    - **Responsibilities**: Semantic vector indexing, knowledge graph entity resolution, associative memory recall.
    - **Tools**: `filesystem.read`, `ollama.chat`, `time.now`.
    - **New Core Specialization**.

31. **Dhruva (`dhruva`)** — *System Audit, Provenance & Immutable Ledger*
    - **Display Name**: Dhruva | **Sanskrit**: ध्रुव
    - **Role**: `audit_provenance`
    - **Responsibilities**: Immutable action logs, tool call audits, verification evidence registers, non-repudiation.
    - **Tools**: `filesystem.read`, `time.now`, `ollama.chat`.
    - **New Core Specialization**.

---

### Tier IV & V: The Operational Leaders

32. **Indra (`indra`)** — *Supreme Field Operations Commander*
    - **Display Name**: Indra | **Sanskrit**: इन्द्र
    - **Role**: `mission_field_command`
    - **Responsibilities**: Active mission command, multi-agent dispatch coordination, dynamic task allocation, real-time crisis leadership.
    - **Tools**: Full Desktop & Env Tools (`terminal.*`, `filesystem.*`, `browser.*`, `computer.*`, `environment.*`, `ollama.*`).
    - **Supreme Operational Anchor**.

33. **Prajāpati (`prajapati`)** — *Workforce Progenitor & Metacognitive Architect*
    - **Display Name**: Prajāpati | **Sanskrit**: प्रजापति
    - **Role**: `workforce_progenitor`
    - **Responsibilities**: Dynamic agent spawning (`dyn_*`), prompt optimization, skill discovery, self-evolution coordination.
    - **Tools**: `filesystem.list`, `filesystem.read`, `filesystem.write`, `terminal.execute`, `ollama.chat`, `time.now`.
    - **Evolutionary Anchor**.

---

## 4. Complete 17 → 33 Capability Migration Matrix

| Legacy 1.0 Agent | Legacy Functional Domain | Canonical 2.0 Owner(s) | Migrated Capabilities & Functional Continuity |
| :--- | :--- | :--- | :--- |
| **Rahu** | Market Intelligence | **Bhaga** | Competitive analysis, market gaps, trend forecasting, web research. |
| **Aja** | Strategy & Business Planning | **Dhātā** | Business models, strategic roadmaps, milestone planning, feasibility. |
| **Ritvan** | Company & Team Setup | **Aryaman** | Organizational structure, department blueprints, team topologies. |
| **Tvas** | Customer & Requirements Research | **Tvaṣṭā** | User needs discovery, problem analysis, requirement specifications. |
| **Spoota** | Product / Service Design | **Tvaṣṭā** & **Savitā** | UI/UX specifications, architecture blueprints, creative prototyping. |
| **Gāṇḍīva** | Software Engineering & Builds | **Manyu** & **Bhava** | Autonomous coding, debugging, builds, CI/CD integration, Git operations. |
| **Vighna** | QA, Risk & Verification | **Ṛtadhvaja** & **Śiva** | Quality gates, test execution, regression analysis, defect elimination. |
| **Raudra** | Marketing, Sales & Security | **Vivasvān** & **Ugraretā** | Outreach marketing funnels, campaigns, security threat defense. |
| **Rutam** | Governance & Compliance | **Varuṇa** | Policy enforcement, contract terms, legal gates, audit rules. |
| **Arvan** | Fulfillment & Delivery | **Pūṣā** | Release delivery, packaging, artifact deployment, logistics. |
| **Tāraka** | Customer Support & Onboarding | **Mitra** | User onboarding, troubleshooting guides, documentation synthesis. |
| **Kalki** | Billing & Commercial Operations | **Aṃśa** | Invoicing, subscription accounting, payment status, financial reconciliation. |
| **Garuḍa** | Operations & Infrastructure | **Prabhāsa** | Host SRE, process monitoring, observability, incident response. |
| **Kali** | Improvement & Transformation | **Mahinasa** & **Mahān** | Continuous performance scaling, codebase refactoring, modernization. |
| **KĀLA** | Time, Scheduling & Coordination | **Pratyūṣa** & **Kāla Rudra** | Mission timing, scheduled jobs, process timeouts & circuit breaking. |
| **Yama** | Backup & Disaster Recovery | **Vāmadeva** | State snapshots, safe rollbacks, failure containment, recovery. |
| **Mṛtyu** | Retirement & Decommissioning | **Dhṛtavrata** | Graceful sunsetting, archival workflows, service shutdown. |

---

## 5. Extensibility: Dynamic Agent Protocol (`dyn_*`)

To preserve the 33-agent core invariant while enabling infinite extensibility:
- **Core Agents**: Fixed 33 registered at kernel bootstrap.
- **Dynamic Agents**: Created on-demand by **Prajāpati** or `MissionPlanner` for specialized, ephemeral workflows.
- **ID Convention**: Must use the prefix `dyn_<domain>_<uuid>` or `temp_<name>`.
- **Lifecycle**: Dynamically registered via `agentRegistry.register()`, scoped to the mission lifecycle, and unregistered upon mission finalization.
- **Diagnostics**: `workforceHealth.totalCore = 33`, with dynamic agents reported under `dynamicActiveCount`.
