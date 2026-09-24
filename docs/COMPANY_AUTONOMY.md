# HṚṢĪKEŚA — Company Autonomy Architecture

## Autonomous Company Operating Engine

The HṚṢĪKEŚA Company Autonomy Engine (`CompanyAutomationEngine`) powers the self-driving enterprise loop, managing bounded execution, workforce routing, health evaluations, and policy enforcement without continuous human intervention for safe routine tasks.

---

## 1. The Autonomous Operating Cycle

Each operating cycle executes in strict phases:

```
1. HEALTH & STATE INSPECTION
   Evaluates 11 health dimensions and checks operating state. Halts if PAUSED.

2. PENDING APPROVAL AUDIT
   Identifies approvals awaiting sovereign human action. Bypasses execution of gated actions.

3. INCIDENT & RISK ASSESSMENT
   Checks active SRE incidents and unmitigated high risks. Adjusts dispatch priority.

4. OBJECTIVE & OKR DISPATCH
   Identifies ACTIVE objectives, decomposes tasks, and assigns to specialist agents based on capacity.

5. EXECUTION & EVIDENCE GATHERING
   Executes task procedures, logs structured activity to the append-only ledger.

6. METRIC OBSERVATION & ADAPTATION
   Records time-series KPI observations, recomputes deltas, and updates company health.

7. BUDGET & LOOP TERMINATION
   Enforces loop budgets (maxTasks, maxMissions, maxRuntimeMs) to prevent runaway execution.
```

---

## 2. Bounded Execution & Resource Budgets

Every cycle runs within bounded constraints defined by `CompanyLoopBudget`:

```typescript
export interface CompanyLoopBudget {
  readonly maxTasks: number;       // Default: 10
  readonly maxMissions: number;    // Default: 5
  readonly maxModelCalls: number;  // Default: 20
  readonly maxRuntimeMs: number;   // Default: 30000 (30s)
  readonly maxRetries: number;     // Default: 3
}
```

If budget limits are reached, the cycle terminates safely with status `COMPLETED_BUDGET_BOUNDED` and logs all actions taken.

---

## 3. Emergency Pause & Resume

- **Emergency Pause (`pauseCompany`)**: Immediately stops autonomous task dispatch, updates company operating state to `PAUSED`, and halts all automated executions while preserving all in-flight state and database records.
- **Resume (`resumeCompany`)**: Restores operating state to `OPERATING` and safely restarts cycle evaluation from the last verified checkpoint.

---

## 4. Multi-Company Isolation

The autonomy engine guarantees zero cross-tenant contamination:
- Every entity (objectives, KPIs, orders, incidents, approvals, SOPs, reviews) is scoped to a specific `companyId`.
- Foreign key cascading deletes clean up company assets upon authorized decommissioning.
- Memory registries and cached state enforce enterprise boundary isolation.
