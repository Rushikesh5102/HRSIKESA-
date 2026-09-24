# HṚṢĪKEŚA — Company Human-In-The-Loop (HITL) Approvals

## 1. Governance Categories Requiring Approval

1. **FINANCIAL**: Payments, wires, expenditures above configured threshold.
2. **LEGAL_CONTRACT**: External legal binding agreements, contract sign-offs.
3. **PRODUCTION_DEPLOYMENT**: Deployments to live environments.
4. **CREDENTIAL_USE**: Use of elevated API keys or infrastructure credentials.
5. **DESTRUCTIVE_OPERATION**: Table drops, data wipeouts, infrastructure teardowns.
6. **COMPANY_CLOSURE**: Decommissioning, winding down, or retiring a company.

---

## 2. Invariant: `PENDING != SUCCESS`

Autonomous agents cannot assume success on pending requests. Every gated action remains blocked until Rushikesh provides explicit authorization with decision reasoning.
