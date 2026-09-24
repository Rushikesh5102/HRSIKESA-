# HṚṢĪKEŚA — Company CRM & Commercial Orders

## 1. Customer Lifecycle (9 States)

```
PROSPECT → CONTACTED → QUALIFIED → PROPOSAL_SENT → NEGOTIATING →
WON / LOST → ONBOARDING → ACTIVE → CHURNED → ARCHIVED
```

---

## 2. Commercial Order Lifecycle (13 Stages)

```
LEAD → INQUIRY → SCOPED → QUOTED → NEGOTIATING → ORDERED →
ACCEPTED → IN_FULFILLMENT → DELIVERED → ACCEPTED_BY_CUSTOMER →
INVOICED → PAID → COMPLETED (or CANCELLED / REFUNDED)
```

---

## 3. Idempotency Protection

All order creations support an optional `idempotencyKey`. If an order creation is attempted with a previously processed idempotency key, the system returns the existing order record without creating duplicate entries or charging the customer twice.
