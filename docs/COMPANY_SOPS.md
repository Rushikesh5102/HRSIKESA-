# HṚṢĪKEŚA — Standard Operating Procedures (SOP) Engine

## 1. Executable SOP Structure

```typescript
export interface ICompanySop {
  readonly id: string;
  readonly companyId: string;
  readonly name: string;
  readonly purpose: string;
  readonly scope: string;
  readonly ownerAgentId: string;
  readonly steps: readonly ISopStep[];
  readonly requiredSkills?: readonly string[];
  readonly requiredTools?: readonly string[];
  readonly approvalRequirements?: readonly string[];
  readonly verification: string;
  readonly version: string;
  readonly status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

---

## 2. Step Execution & Verification Evidence

- The `CompanySopEngine` executes steps in sequence, verifies agent skill requirements, checks tool permissions, and logs execution output and duration to the activity ledger.
- Kali periodically reviews SOP efficiency during operational reviews and proposes versioned optimizations.
