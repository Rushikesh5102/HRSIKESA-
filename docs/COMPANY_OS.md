# HṚṢĪKEŚA — Company & Project Operating System (Phase 14)

## 1. Overview & Architecture

The **Company & Project Operating System** establishes a persistent structural and operational layer between the sovereign director **HṚṢĪKEŚA** and the 17-agent specialized workforce.

```
                    ┌─────────────────────────────────────────┐
                    │          HṚṢĪKEŚA (हृषीकेश)              │
                    │      Supreme Director & Orchestrator     │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │        Company & Project OS             │
                    │   (Companies, Projects, Departments)    │
                    └────────────────────┬────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
┌───────▼───────┐                ┌───────▼───────┐                ┌───────▼───────┐
│  Departments  │                │   Products    │                │   Customers   │
│   & Teams     │                │   & Catalog   │                │   & Registry  │
└───────┬───────┘                └───────┬───────┘                └───────┬───────┘
        │                                │                                │
        └────────────────────────────────┼────────────────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │         17 Specialized Agents           │
                    │  (Rāhu, Aja, Ritvan, Spoota, Gāṇḍīva...)│
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │       Mission & Task Engine             │
                    │    (Missions, Tasks, Artifacts)         │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │     Tools, Sandbox & Desktop Bus        │
                    └─────────────────────────────────────────┘
```

---

## 2. Core Entities & Database Schema (Migration 005)

### 2.1 Companies (`companies`)
Persistent legal, commercial, or operational organizations created and governed by HṚṢĪKEŚA.
- `id` (TEXT PRIMARY KEY): Unique UUID identifier.
- `name` (TEXT NOT NULL): Organization display name.
- `slug` (TEXT NOT NULL UNIQUE): URL/CLI identifier (e.g., `acme-corp`).
- `description` (TEXT): High-level mission and domain summary.
- `status` (TEXT NOT NULL): `planning` | `active` | `paused` | `sunset` | `archived`.
- `lifecycle_stage` (TEXT NOT NULL): 1 of 15 structured lifecycle stages (e.g., `market_research`, `mvp_build`, `growth`).
- `metadata_json` (TEXT): Scoped configuration, mission statements, and domain attributes.
- `created_at` / `updated_at` (INTEGER NOT NULL).

### 2.2 Projects (`projects`)
Scoped initiatives that can belong to a parent company or exist as standalone personal/open-source projects.
- `id` (TEXT PRIMARY KEY).
- `company_id` (TEXT NULLABLE REFERENCES `companies(id)` ON DELETE SET NULL).
- `name` (TEXT NOT NULL).
- `slug` (TEXT NOT NULL).
- `description` (TEXT).
- `status` (TEXT NOT NULL): `concept` | `planning` | `in_progress` | `paused` | `completed` | `cancelled`.
- `priority` (TEXT NOT NULL): `low` | `medium` | `high` | `critical`.
- `metadata_json` (TEXT).
- `created_at` / `updated_at` (INTEGER NOT NULL).

### 2.3 Departments (`departments`)
Organizational units within a company (e.g., Engineering, Product, Strategy, Operations).
- `id` (TEXT PRIMARY KEY).
- `company_id` (TEXT NOT NULL REFERENCES `companies(id)` ON DELETE CASCADE).
- `name` (TEXT NOT NULL).
- `slug` (TEXT NOT NULL).
- `lead_agent_id` (TEXT NOT NULL): Lead agent identifier from the 17-agent workforce.
- `capabilities_json` (TEXT NOT NULL): Array of domain capabilities mapped to this department.
- `metadata_json` (TEXT).
- `created_at` / `updated_at` (INTEGER NOT NULL).

### 2.4 Company Workforce (`company_workforce`)
Assigns authoritative 17 agents to companies and departments without cloning or multiplying agent identities.
- `id` (TEXT PRIMARY KEY).
- `company_id` (TEXT NOT NULL REFERENCES `companies(id)` ON DELETE CASCADE).
- `agent_id` (TEXT NOT NULL): One of the 17 registered agents.
- `department_id` (TEXT NULLABLE REFERENCES `departments(id)` ON DELETE SET NULL).
- `role_title` (TEXT NOT NULL): Functional title (e.g., "Chief Technology Officer").
- `is_lead` (INTEGER NOT NULL DEFAULT 0): 1 if lead of department/company.
- `allocation_pct` (INTEGER NOT NULL DEFAULT 100): Resource capacity percentage.
- `created_at` / `updated_at` (INTEGER NOT NULL).

### 2.5 Products (`products`)
Software products, services, APIs, or physical/digital goods developed by a company.
- `id` (TEXT PRIMARY KEY).
- `company_id` (TEXT NOT NULL REFERENCES `companies(id)` ON DELETE CASCADE).
- `project_id` (TEXT NULLABLE REFERENCES `projects(id)` ON DELETE SET NULL).
- `name` (TEXT NOT NULL).
- `slug` (TEXT NOT NULL).
- `product_type` (TEXT NOT NULL): `software` | `service` | `content` | `api` | `internal_tool` | `other`.
- `status` (TEXT NOT NULL): `concept` | `design` | `development` | `beta` | `general_availability` | `deprecated` | `retired`.
- `description` (TEXT).
- `metadata_json` (TEXT).
- `created_at` / `updated_at` (INTEGER NOT NULL).

### 2.6 Customers (`customers`)
Commercial leads, clients, subscribers, and enterprise partners.
- `id` (TEXT PRIMARY KEY).
- `company_id` (TEXT NOT NULL REFERENCES `companies(id)` ON DELETE CASCADE).
- `name` (TEXT NOT NULL).
- `type` (TEXT NOT NULL): `individual` | `sme` | `enterprise` | `internal`.
- `status` (TEXT NOT NULL): `lead` | `prospect` | `active` | `churned` | `archived`.
- `contact_email` (TEXT NULLABLE): Redacted contact details.
- `metadata_json` (TEXT): Industry, notes, tier info (NO plaintext secrets/credentials).
- `created_at` / `updated_at` (INTEGER NOT NULL).

### 2.7 Decisions (`decisions`)
Persistent register of Architectural Decision Records (ADRs) and Product Decision Records (PDRs).
- `id` (TEXT PRIMARY KEY).
- `company_id` (TEXT NULLABLE REFERENCES `companies(id)` ON DELETE CASCADE).
- `project_id` (TEXT NULLABLE REFERENCES `projects(id)` ON DELETE SET NULL).
- `title` (TEXT NOT NULL).
- `context` (TEXT NOT NULL).
- `decision` (TEXT NOT NULL).
- `consequences` (TEXT NOT NULL).
- `status` (TEXT NOT NULL): `proposed` | `accepted` | `rejected` | `superseded` | `deprecated`.
- `decider_agent_id` (TEXT NOT NULL).
- `metadata_json` (TEXT).
- `created_at` / `updated_at` (INTEGER NOT NULL).

---

## 3. The 17-Agent Workforce & Enterprise Mapping

All organizational actions route through the authoritative 17-agent roster:

| Agent ID | Display Name | Enterprise Department | Primary Role |
|---|---|---|---|
| `rahu` | Rāhu (राहु) | Market Intelligence | Market research, competitor analysis, trend discovery |
| `aja` | Aja (अज) | Executive / Strategy | Business planning, capital allocation, OKRs |
| `ritvan` | Ritvan (ऋत्वन्) | Operations & HR | Company formation, team topology, workflow blueprints |
| `tvas` | Tvas (त्वस्) | Product Management | Customer research, requirements gathering, PRDs |
| `spoota` | Spoota (स्फुट) | UX & Design | Product architecture, UX flows, system design |
| `gandiva` | Gāṇḍīva (गाण्डीव) | Engineering | Software development, code execution, computer automation |
| `vighna` | Vighna (विघ्न) | Quality Assurance | QA testing, risk assessment, verification, security review |
| `raudra` | Raudra (रौद्र) | Sales & Marketing | Go-to-market, campaigns, lead generation, sales copy |
| `rutam` | Rutam (ऋतं) | Legal & Governance | Contracts, terms, regulatory compliance, ADR governance |
| `arvan` | Arvan (अर्वन्) | Fulfillment & Delivery | Release management, delivery pipelines, packaging |
| `taraka` | Tāraka (तारक) | Customer Success | Onboarding, customer support, user documentation |
| `kalki` | Kalki (कल्कि) | Finance & Commerce | Invoicing, pricing models, payment operations |
| `garuda` | Garuḍa (गरुड) | Infrastructure & Ops | Server ops, observability, telemetry, health monitors |
| `kali` | Kali (कलि) | Transformation | Continuous improvement, process optimization, expansion |
| `kaala` | KĀLA (काल) | Program Management | Scheduling, capacity planning, timeline estimation |
| `yama` | Yama (यम) | Disaster Recovery | Backups, state rollback, disaster mitigation |
| `mrtyu` | Mṛtyu (मृत्यु) | Sunset & Decommissioning| Product sunset, resource cleanup, graceful retirement |

---

## 4. 15-Stage Business Lifecycle Engine

Companies progress through 15 sequential lifecycle stages governed by `LifecycleEngine`:

1. `market_research` (Lead: `rahu`)
2. `strategy_formulation` (Lead: `aja`)
3. `company_setup` (Lead: `ritvan`)
4. `requirements_analysis` (Lead: `tvas`)
5. `product_design` (Lead: `spoota`)
6. `mvp_build` (Lead: `gandiva`)
7. `qa_verification` (Lead: `vighna`)
8. `marketing_launch` (Lead: `raudra`)
9. `legal_compliance` (Lead: `rutam`)
10. `fulfillment_delivery` (Lead: `arvan`)
11. `customer_onboarding` (Lead: `taraka`)
12. `commercial_operations` (Lead: `kalki`)
13. `infrastructure_scaling` (Lead: `garuda`)
14. `process_improvement` (Lead: `kali`)
15. `sunsetting_retirement` (Lead: `mrtyu`)

Transitions can proceed sequentially or allow explicit validated stage-skipping with full audit records in the database.

---

## 5. Scoped Contextual Memory Hierarchy

To prevent cross-company data bleeding while providing deep contextual coherence, memories are isolated across 5 scopes:

$$\text{Global (HṚṢĪKEŚA)} \neq \text{Company} \neq \text{Project} \neq \text{Agent} \neq \text{Task}$$

- **Global Context:** HṚṢĪKEŚA sovereign identity, operator preferences, global memory items.
- **Company Context:** Organization name, mission statement, active stage, departments, workforce assignments, customer summary, product catalog.
- **Project Context:** Project priorities, linked product, repository path, active sprint/tasks.
- **Agent Context:** Specific specialist skills, prompt preamble, execution tools.
- **Task Context:** Input payload, blackboard findings, scratchpad notes, target artifacts.

When `CompanyService.getScopedContext(companyId, projectId)` is called, the formatted context is automatically injected into agent reasoning preambles.

---

## 6. Mission & Artifact Provenance

Missions and Artifacts are explicitly scoped:
- `IMission` records `companyId`, `projectId`, `productId`, `departmentId`.
- `MissionArtifact` records `companyId`, `projectId`.
- Operators can filter all missions, blackboard findings, and artifacts by company and project across both HTTP API and Control Center UI.

---

## 7. Security Boundaries & Zero-Mock Guarantee

1. **No Plaintext Secrets:** Customer records and company metadata store configuration attributes only. API keys and passwords use existing encrypted credential storage.
2. **Deterministic Persistence:** All views and endpoints read/write to SQLite database (`hrisekesa.db`).
3. **Restart Resilience:** Data persists across complete kernel shutdowns and cold restarts.
4. **Human-in-the-Loop (HITL):** High-risk operations (deployment, contract approvals, financial actions) enforce existing approval gates.

---

## 8. HTTP REST API Reference (29 Distinct Company OS Routes)

All routes are served by `src/api/http.server.ts`. Routes return JSON. `503` is returned if the Company OS subsystem is not enabled.

### Companies

| Method | Path | Description |
|---|---|---|
| `GET` | `/companies/lifecycle/stages` | List all 15 lifecycle stage definitions with specialist assignments |
| `GET` | `/companies` | List all companies (paginated: `?limit=&offset=`) |
| `POST` | `/companies` | Create a new company |
| `GET` | `/companies/:id` | Get company by UUID or slug |
| `PATCH` | `/companies/:id` | Update company fields |
| `GET` | `/companies/:id/overview` | Aggregated company overview (projects, departments, workforce, products, customers) |
| `GET` | `/companies/:id/projects` | List all projects scoped to this company |
| `POST` | `/companies/:id/projects` | Create a project scoped to this company |
| `GET` | `/companies/:id/departments` | List departments for this company |
| `POST` | `/companies/:id/departments` | Create a department in this company |
| `GET` | `/companies/:id/workforce` | List workforce assignments for this company |
| `POST` | `/companies/:id/workforce` | Assign an agent to this company's workforce |
| `GET` | `/companies/:id/products` | List products for this company |
| `POST` | `/companies/:id/products` | Create a product for this company |
| `GET` | `/companies/:id/customers` | List customers for this company |
| `POST` | `/companies/:id/customers` | Create a customer for this company |
| `GET` | `/companies/:id/decisions` | List decision records (ADR/PDR) for this company |
| `POST` | `/companies/:id/decisions` | Create a decision record for this company |
| `GET` | `/companies/:id/missions` | List missions scoped to this company |
| `GET` | `/companies/:id/artifacts` | List mission artifacts scoped to this company |

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/projects` | List all projects (paginated: `?companyId=&limit=&offset=`) |
| `POST` | `/projects` | Create a standalone project (no company parent) |
| `GET` | `/projects/:id` | Get project by UUID or slug |
| `PATCH` | `/projects/:id` | Update project fields |
| `GET` | `/projects/:id/overview` | Aggregated project overview (missions, artifacts, decisions, products) |
| `GET` | `/projects/:id/missions` | List missions scoped to this project |
| `GET` | `/projects/:id/artifacts` | List artifacts scoped to this project |
| `GET` | `/projects/:id/decisions` | List decision records for this project |
| `GET` | `/projects/:id/products` | List products linked to this project |

> **Note:** The live verifier (`scripts/live-company-os-verifier.ts`) probes **14 GET endpoints** in STEP 12 as an integration smoke test against a live isolated database. This is a subset of the full 29-route API surface, restricted to endpoints reachable with a test-fixture-seeded GET. The remaining routes (POST mutations, PATCH updates, and deeper fixture-dependent GETs) are exercised in the dedicated `tests/company-os.test.ts` regression suite and in earlier verifier steps (STEP 1–10).
