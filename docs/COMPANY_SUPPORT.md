# HṚṢĪKEŚA — Company Support & SLA Tracking

## 1. Support Ticketing Lifecycle

- **Owner Agent**: Tāraka (Customer Onboarding & Success)
- **Ticket Priorities**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- **Ticket States**: `OPEN` → `IN_PROGRESS` → `WAITING_ON_CUSTOMER` → `RESOLVED` → `CLOSED`

---

## 2. SLA Deadlines & Health Impact

- Every ticket calculates an automated `slaDeadline` based on severity (e.g. 4 hours for `CRITICAL`, 24 hours for `MEDIUM`).
- Open critical tickets past SLA automatically downgrade the `SUPPORT` dimension in `CompanyHealthService`.
- Full conversation history and resolution evidence are logged to the immutable activity ledger.
