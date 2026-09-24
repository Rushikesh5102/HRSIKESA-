# HṚṢĪKEŚA Autonomous Workforce Architecture (Phase 13.6)

## Overview & Philosophy

In the **HṚṢĪKEŚA (हृषीकेश)** operating system, HṚṢĪKEŚA itself is the sovereign personal AI orchestrator and supreme director. Beneath HṚṢĪKEŚA operates a specialized workforce of **17 persistent autonomous agents**, each governing a distinct phase of the business, product, software, operational, and governance lifecycle.

This workforce model is neither a cosmetic renaming nor a set of independent chatbots. Every agent is an instance of the common `AgentDefinition` / `AgentRuntime` architecture with deterministic capabilities, tool whitelists, danger tier bounds, memory scoping, collaboration pathways, and deterministic verification gates.

---

## The 17 Specialized Agents

```
                        ┌──────────────────────────────────────────────┐
                        │              HṚṢĪKEŚA (हृषीकेश)              │
                        │           Personal AI Orchestrator           │
                        └──────────────────────┬───────────────────────┘
                                               │
  ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
  │                                            │                                            │
  ▼                                            ▼                                            ▼
[Market & Strategy]                   [Product & Engineering]                      [Commercial & Delivery]
• Rahu (Market Intelligence)          • Tvas (Customer & Requirements)             • Raudra (Marketing & Sales)
• Aja (Strategy & Business)           • Spoota (Product & UX Design)               • Rutam (Contracts & Compliance)
• Ritvan (Org & Team Setup)           • Gāṇḍīva (Software Engineering)             • Arvan (Fulfillment & Delivery)
                                      • Vighna (QA & Verification)                 • Tāraka (Onboarding & Support)
                                                                                   • Kalki (Billing & Payments)
                                               │
  ┌────────────────────────────────────────────┴────────────────────────────────────────────┐
  │                                                                                         │
  ▼                                                                                         ▼
[Operations & Transformation]                                                     [Cross-Cutting Infrastructure]
• Garuḍa (Operations & Monitoring)                                                • KĀLA (Time, Scheduling & Queues)
• Kali (Continuous Improvement & Scaling)                                         • Yama (Backup, Recovery & Rollback)
• Mṛtyu (Retirement & Decommissioning)
```

---

### 1. Rahu (राहु) — Market Intelligence
- **Name Rationale:** Rahu represents the expansive search for unseen opportunities and market forces beyond direct perception.
- **Role:** Market Intelligence
- **Lifecycle Position:** `market`
- **Responsibilities:** Market research, competitor analysis, identifying market gaps, industry trends, external intelligence, threat assessment.
- **Capabilities:** `market_research`, `competitor_analysis`, `trend_analysis`, `gap_detection`, `external_intelligence`, `threat_modeling`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `browser.navigate`, `browser.page.read`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit (read-only external intelligence gatherer).
- **Collaboration:** Hands off market signals and intelligence to **Aja** and **Tvas**.

---

### 2. Aja (अज) — Strategy & Business Planning
- **Name Rationale:** Aja represents the uncreated origin and foundational genesis of enterprise strategy and business logic.
- **Role:** Strategy & Business Planning
- **Lifecycle Position:** `strategy`
- **Responsibilities:** Business model formulation, strategic roadmaps, economic feasibility, business objectives, long-term strategic positioning.
- **Capabilities:** `strategy`, `business_planning`, `business_models`, `feasibility_analysis`, `strategic_roadmaps`, `objective_setting`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit.
- **Collaboration:** Receives input from **Rahu**, delegates structure to **Ritvan**, coordinates roadmap with **KĀLA**.

---

### 3. Ritvan (ऋत्वन्) — Company & Team Setup
- **Name Rationale:** Ritvan signifies order, cyclical alignment, and institutional structuring according to natural order (*ṛta*).
- **Role:** Company & Team Setup
- **Lifecycle Position:** `organization`
- **Responsibilities:** Organizational structure, department topologies, team architecture, workforce planning, agent/team formation, role definitions.
- **Capabilities:** `organization_design`, `team_architecture`, `workforce_planning`, `role_definition`, `agent_formation`, `process_structuring`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit.
- **Collaboration:** Works with **Aja** to translate strategic models into workforce topology; delegates execution requirements to **Tvas** and **Spoota**.

---

### 4. Tvas (त्वस्) — Customer & Requirements Research
- **Name Rationale:** Tvas represents precision shaping, deep discovery, and the extraction of essential user needs.
- **Role:** Customer & Requirements Research
- **Lifecycle Position:** `customer_research`
- **Responsibilities:** Customer research, user interviews, requirement discovery, persona mapping, problem analysis, requirement synthesis.
- **Capabilities:** `customer_research`, `requirements_discovery`, `user_needs_analysis`, `problem_analysis`, `requirement_synthesis`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `browser.navigate`, `browser.page.read`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit.
- **Collaboration:** Synthesizes user requirements from **Rahu**'s market context and supplies structured specs to **Spoota**.

---

### 5. Spoota (स्फूट) — Product / Service Design
- **Name Rationale:** Spoota denotes manifest clarity, sudden structural insight (*sphoṭa*), and elegant product architecture.
- **Role:** Product / Service Design
- **Lifecycle Position:** `design`
- **Responsibilities:** Product definition, service blueprints, UX workflows, architecture specifications, rapid prototyping, feature definition.
- **Capabilities:** `product_design`, `service_definition`, `ux_workflows`, `specifications`, `architecture_planning`, `prototyping`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit.
- **Collaboration:** Transforms **Tvas**'s user requirements into technical blueprints for **Gāṇḍīva** and test criteria for **Vighna**.

---

### 6. Gāṇḍīva (गाण्डीव) — Software Engineering / Development
- **Name Rationale:** Gāṇḍīva is the legendary bow of Arjuna, signifying infallible implementation power, precision coding, and flawless execution.
- **Role:** Software Engineering / Development
- **Lifecycle Position:** `development`
- **Responsibilities:** Code implementation, repository management, refactoring, debugging, build pipelines, integration, software testing support, Git workflows.
- **Capabilities:** `software_engineering`, `coding`, `implementation`, `debugging`, `integration`, `builds`, `git_workflows`
- **Allowed Tools:** `filesystem.read`, `filesystem.write`, `filesystem.list`, `terminal.execute`, `computer.app.launch`, `computer.keyboard.type`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit. Cannot self-approve production deployment or bypass verification gates.
- **Collaboration:** Takes blueprints from **Spoota**, delivers code to **Vighna** for verification and **Garuḍa** for deployment.

---

### 7. Vighna (विघ्न) — QA / Risk / Verification
- **Name Rationale:** Vighna represents the active search for obstacles, failures, anomalies, and risks before they affect production.
- **Role:** QA / Risk / Verification
- **Lifecycle Position:** `verification`
- **Responsibilities:** Quality assurance, automated verification, failure detection, risk modeling, blocker identification, regression testing, approval gating.
- **Capabilities:** `quality_assurance`, `testing`, `verification`, `risk_analysis`, `failure_detection`, `blocker_detection`, `regression_testing`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `terminal.execute`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit. Authoritative verification gatekeeper; non-negotiable verification criteria.
- **Collaboration:** Validates artifacts produced by **Gāṇḍīva**; provides release clearance to **Rutam** and **Arvan**.

---

### 8. Raudra (रौद्र) — Marketing & Sales
- **Name Rationale:** Raudra conveys dynamic outreach energy, compelling communication, and market penetration momentum.
- **Role:** Marketing & Sales
- **Lifecycle Position:** `marketing`
- **Responsibilities:** Positioning, campaigns, lead generation, sales workflows, outreach strategy, commercial copy, sales analytics.
- **Capabilities:** `marketing`, `positioning`, `campaigns`, `lead_generation`, `sales_workflows`, `outreach`, `sales_analysis`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `browser.navigate`, `browser.page.read`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit. Cannot send external broadcast emails or financial commitments without explicit human authorization.
- **Collaboration:** Receives product positioning from **Spoota**; feeds prospective clients to **Rutam** and **Tāraka**.

---

### 9. Rutam (ऋतम्) — Contracts / Orders / Governance / Compliance
- **Name Rationale:** Rutam embodies cosmic and legal truth, contractual sanctity, and unyielding compliance to regulatory policy.
- **Role:** Contracts / Orders / Governance / Compliance
- **Lifecycle Position:** `compliance`
- **Responsibilities:** Contract analysis, order workflows, policy compliance, regulatory validation, governance checks, approval auditing.
- **Capabilities:** `contract_analysis`, `order_processing`, `compliance`, `policy_validation`, `governance`, `approval_verification`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit. Strictly enforces policy and human intervention gates for Tier 3/4 operations.
- **Collaboration:** Audits **Raudra** deals and **Gāṇḍīva** releases before triggering **Arvan** and **Kalki**.

---

### 10. Arvan (अर्वन्) — Fulfillment & Delivery
- **Name Rationale:** Arvan symbolizes swift coursing, reliable transit, and rapid distribution to the final destination.
- **Role:** Fulfillment & Delivery
- **Lifecycle Position:** `fulfillment`
- **Responsibilities:** Fulfillment workflows, release distribution, deployment execution, distribution logistics, delivery tracking.
- **Capabilities:** `fulfillment`, `deployment`, `distribution`, `logistics`, `delivery_tracking`, `release_delivery`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `terminal.execute`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit.
- **Collaboration:** Dispatches verified builds from **Vighna** and approved contracts from **Rutam** to **Tāraka** and **Garuḍa**.

---

### 11. Tāraka (तारक) — Customer Onboarding & Support
- **Name Rationale:** Tāraka signifies a guiding star and savior who shepherds users safely through onboarding and troubleshooting.
- **Role:** Customer Onboarding & Support
- **Lifecycle Position:** `support`
- **Responsibilities:** User onboarding, product documentation, customer troubleshooting, support ticket workflows, client communications.
- **Capabilities:** `customer_onboarding`, `documentation`, `customer_support`, `troubleshooting`, `support_workflows`, `client_communication`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit.
- **Collaboration:** Onboards users receiving delivery from **Arvan**; reports bugs to **Gāṇḍīva** and satisfaction metrics to **Kali**.

---

### 12. Kalki (कल्कि) — Billing / Payment / Commercial Operations
- **Name Rationale:** Kalki represents the definitive arbiter of accounts, settlement of obligations, and clean commercial reconciliation.
- **Role:** Billing / Payment / Commercial Operations
- **Lifecycle Position:** `billing`
- **Responsibilities:** Invoicing, subscription management, payment workflow tracking, commercial reconciliation, payment status validation.
- **Capabilities:** `invoicing`, `billing`, `subscription_management`, `payment_workflows`, `commercial_reconciliation`, `payment_verification`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit. Cannot execute real money disbursement without human authorization.
- **Collaboration:** Reconciles transactions generated by **Raudra** and **Rutam**; feeds revenue data into **Aja** and **Kali**.

---

### 13. Garuḍa (गरुड) — Operations / Infrastructure / Monitoring
- **Name Rationale:** Garuḍa represents soaring high-altitude vigilance, infrastructure oversight, and rapid emergency intervention.
- **Role:** Operations / Infrastructure / Monitoring
- **Lifecycle Position:** `operations`
- **Responsibilities:** Infrastructure management, system operations, monitoring, observability, service health, incident response.
- **Capabilities:** `infrastructure`, `system_operations`, `monitoring`, `observability`, `deployments`, `incident_response`, `service_health`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `terminal.execute`, `system.info`, `environment.status`, `time.now`
- **Governance:** Danger Tier 1 limit.
- **Collaboration:** Maintains uptime for systems built by **Gāṇḍīva**; alerts **Yama** upon system degradation.

---

### 14. Kali (कलि) — Improvement / Transformation / Expansion
- **Name Rationale:** Kali represents the unstoppable engine of creative transformation, discarding obsolete patterns and driving evolutionary leaps.
- **Role:** Improvement / Transformation / Expansion
- **Lifecycle Position:** `improvement`
- **Responsibilities:** Continuous optimization, architecture restructuring, scale expansion, experimentation, identifying obsolete processes.
- **Capabilities:** `continuous_improvement`, `optimization`, `scaling`, `restructuring`, `expansion`, `experimentation`, `process_evolution`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `system.info`, `time.now`
- **Governance:** Danger Tier 1 limit.
- **Collaboration:** Analyzes telemetry across all agents; feeds optimization proposals to **Aja**, **Spoota**, and **Gāṇḍīva**.

---

### 15. KĀLA (काल) — Time / Scheduling / Resource Coordination
- **Name Rationale:** KĀLA is cosmic Time itself, governing sequence, duration, execution windows, deadlines, and rhythm.
- **Role:** Time / Scheduling / Resource Coordination
- **Lifecycle Position:** `scheduling`
- **Responsibilities:** Task scheduling, deadline tracking, execution windows, queue orchestration, resource coordination, workload balancing.
- **Capabilities:** `scheduling`, `deadline_tracking`, `task_queues`, `execution_windows`, `resource_coordination`, `workload_balancing`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `time.now`, `system.info`
- **Governance:** Cross-cutting coordinator. Cannot override safety or approval gates.
- **Collaboration:** Schedules mission execution across all 17 agents; balances concurrency with system hardware constraints.

---

### 16. Yama (यम) — Backup / Recovery / Disaster Management
- **Name Rationale:** Yama represents the guardian of preservation, state persistence, safe rollback, and restorative containment.
- **Role:** Backup / Recovery / Disaster Management
- **Lifecycle Position:** `recovery`
- **Responsibilities:** System backups, database snapshots, safe rollback, disaster recovery, failure containment, safe state restoration.
- **Capabilities:** `backup`, `recovery`, `rollback`, `disaster_recovery`, `recovery_planning`, `failure_containment`, `safe_restoration`
- **Allowed Tools:** `filesystem.read`, `filesystem.write`, `filesystem.list`, `terminal.execute`, `system.info`, `time.now`
- **Governance:** Recovery guardian. Ensures zero data loss during rollbacks.
- **Collaboration:** Works across the entire lifecycle to restore crashed services or failed deployments.

---

### 17. Mṛtyu (मृत्यु) — Retirement / Termination / Exit
- **Name Rationale:** Mṛtyu represents graceful finality, end-of-life decommission, and the clean dissolution of sunsetted resources.
- **Role:** Retirement / Termination / Exit
- **Lifecycle Position:** `retirement`
- **Responsibilities:** Product retirement, service decommissioning, resource archival, end-of-life governance, business exit procedures.
- **Capabilities:** `retirement`, `service_shutdown`, `decommissioning`, `archival`, `end_of_life`, `exit_procedures`
- **Allowed Tools:** `filesystem.read`, `filesystem.list`, `filesystem.write`, `terminal.execute`, `system.info`, `time.now`
- **Governance:** Cannot execute destructive permanent deletion of production infrastructure without verified human approval.
- **Collaboration:** Executes final shutdown workflows with **Yama** (for archival) and **Rutam** (for legal exit compliance).

---

## Critical Role Distinctions

### Yama vs Mṛtyu
- **Yama** is the **RECOVERY** agent: restores broken systems, manages snapshots, rolls back bad migrations, and returns the OS to healthy operational status.
- **Mṛtyu** is the **TERMINATION** agent: gracefully decommissions products, sunsets legacy endpoints, archives dead records, and concludes end-of-life lifecycles.

---

## Dynamic Capability-Based Routing Matrix

| Intent / Request Example | Primary Lifecycle Agent | Collaborating Specialists |
| :--- | :--- | :--- |
| "Research whether there is market demand for X" | **Rahu** (Market Intelligence) | **Tvas** (Requirements) |
| "Create a business model and strategy roadmap" | **Aja** (Strategy) | **Ritvan** (Org Design) |
| "Design the UX and technical specifications" | **Spoota** (Product Design) | **Tvas**, **Gāṇḍīva** |
| "Implement the feature in TypeScript" | **Gāṇḍīva** (Development) | **Vighna** (QA) |
| "Validate test suite and check security risks" | **Vighna** (QA / Risk) | **Gāṇḍīva**, **Rutam** |
| "Launch marketing campaign and outreach" | **Raudra** (Marketing & Sales) | **Rutam**, **Arvan** |
| "Process contract and check regulatory policy" | **Rutam** (Compliance) | **Kalki**, **Aja** |
| "Ship release and track distribution" | **Arvan** (Fulfillment) | **Tāraka**, **Garuḍa** |
| "Onboard new customer and assist setup" | **Tāraka** (Support) | **Gāṇḍīva**, **Arvan** |
| "Reconcile invoices and check payment status" | **Kalki** (Billing) | **Rutam**, **Aja** |
| "Monitor server health and system telemetry" | **Garuḍa** (Operations) | **KĀLA**, **Yama** |
| "Optimize pipeline performance and scale" | **Kali** (Improvement) | **Gāṇḍīva**, **Garuḍa** |
| "Schedule batch job across execution windows" | **KĀLA** (Scheduling) | All Agents |
| "Database failed, initiate restore and rollback" | **Yama** (Recovery) | **Garuḍa**, **Gāṇḍīva** |
| "Decommission legacy v1 API and archive logs" | **Mṛtyu** (Retirement) | **Yama**, **Rutam** |
