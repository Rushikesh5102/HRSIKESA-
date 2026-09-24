# HṚṢĪKEŚA — Company Finance & Billing Architecture

## 1. Budget Categories & Allocation

The `CompanyOperationsRepository` manages 4 distinct budget categories:

1. **FINANCIAL**: Fiat / currency operational budgets (USD, EUR, INR, GBP).
2. **COMPUTE**: Local hardware vCPU, GPU, and memory utilization quotas.
3. **MODEL_TOKENS**: LLM token consumption limits across providers.
4. **API_CALLS**: External third-party API rate quotas.

---

## 2. Budget Lifecycle & Safety Rules

- **Allocated**: Total budget assigned for a given period (e.g. Q3-2026).
- **Reserved**: Committed funds for in-flight tasks and pre-authorized operations.
- **Spent**: Settled financial transactions.
- **Enforcement**: When `spentAmount + reservedAmount >= allocatedAmount`, further spending is blocked until sovereign human review.
- **Mandatory Approval**: Any expenditure above the configured threshold requires explicit sovereign HITL authorization (`PENDING != SUCCESS`).
