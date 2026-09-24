# HṚṢĪKEŚA — Company Security & Policy Engine

## 1. 9-Tier Policy Hierarchy

The `CompanyPolicyEngine` enforces strict precedence where lower tiers cannot override higher tiers:

```
TIER 1: SOVEREIGN_HUMAN (Rushikesh supreme authority)
TIER 2: SYSTEM_SECURITY (Core sandbox, credential redacting, anti-bypass)
TIER 3: LEGAL_COMPLIANCE (Contract rules, regulatory mandates)
TIER 4: FINANCIAL_BOUNDS (Budget caps, max expenditures)
TIER 5: COMPANY_POLICY (Organizational operating rules)
TIER 6: PROJECT_POLICY (Repository & project bounds)
TIER 7: AGENT_ROLE (Specialist authorization boundaries)
TIER 8: TASK_POLICY (Individual task constraints)
TIER 9: DEFAULT_FALLBACK (Least privilege by default)
```

---

## 2. Immutable Activity Ledger

All operations write structured audit records to `company_activities` in SQLite WAL mode. Records cannot be overwritten or deleted.
