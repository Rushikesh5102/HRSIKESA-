# HṚṢĪKEŚA — FP-01 Execution-First Policy & Autonomous Decision Engine

## 1. Core Principle: Execution-First Over Question-First

HṚṢĪKEŚA operates under a sovereign, execution-first design invariant:

> **If a request is actionable and sufficiently specified, EXECUTE immediately.**
> **Do not ask unnecessary clarification questions.**

Traditional conversational assistants default to asking clarification questions ("What color scheme would you like?", "Which language should I use?", "Should this be responsive?"), generating unnecessary conversational overhead and interrupting user flow.

HṚṢĪKEŚA eliminates unnecessary conversational barriers through the five-phase execution loop:

$$\text{UNDERSTAND} \longrightarrow \text{DECIDE} \longrightarrow \text{EXECUTE} \longrightarrow \text{VERIFY} \longrightarrow \text{REPORT}$$

instead of:

$$\text{UNDERSTAND} \longrightarrow \text{ASK} \longrightarrow \text{ASK} \longrightarrow \text{ASK}$$

---

## 2. When to Ask Clarification Questions

Clarification or confirmation questions are strictly restricted to the following 5 boundary conditions:

1. **Information Genuinely Unobtainable**: When a vital parameter cannot be inferred from project files, memory, knowledge graph, or reasonable technical defaults.
2. **Irreversible / High-Risk System Actions**: High-risk operations (Tier 2 or Tier 3 actions, e.g., dropping database tables, deleting entire directories, formatting drives, terminating essential services).
3. **Financial, Legal, or Identity Modification**: Any action involving financial transactions, legal agreements, or modifying sovereign identity permissions.
4. **Explicit Human Approval Policy**: Tools or agent missions explicitly flagged with `requiresHumanApproval = true`.
5. **Materially Divergent Outcomes Without Safe Defaults**: Cases where choosing one interpretation over another creates incompatible outcomes and no sensible convention exists.

---

## 3. Structured Assumption System

Whenever non-critical details are omitted by the user, HṚṢĪKEŚA applies established sovereign defaults and logs them into the structured assumption registry:

```typescript
export interface AssumptionRecord {
  id: string;
  assumption: string;
  context: string;
  category: 'STYLING' | 'DEFAULTS' | 'LANGUAGE' | 'ENVIRONMENT' | 'GENERAL';
  timestamp: string;
}
```

### Established Safe Defaults
| Category | User Input | Safe Default Applied | Structured Assumption Recorded |
|---|---|---|---|
| **Styling** | "Build a web dashboard" | HṚṢĪKEŚA Temple Theme + Vanilla CSS + Mobile/Desktop responsiveness | `"Adopted HṚṢĪKEŚA Temple Civilization theme tokens and vanilla CSS for styling."` |
| **Language** | "Write a script to compute factorials" | TypeScript / Node.js or Python 3 | `"Used modern TypeScript / Python as safe default programming language."` |
| **Persistence**| "Store user events" | SQLite (`data/hrisekesa.db`) with WAL mode | `"Defaulted persistence to project-local SQLite storage (data/hrisekesa.db)."` |
| **Viewport** | "Design an interface component" | Responsive flex/grid (desktop + mobile) | `"Assumed fully responsive mobile & desktop viewport compatibility."` |

---

## 4. Verification in Test Suite

The execution policy is verified under `tests/fp-01-performance.test.ts`:
- Actionable requests execute immediately without blocking questions.
- Modern defaults are automatically attached for styling and coding queries.
- High-risk / destructive actions properly trigger an approval escalation.
- Structured assumptions are tracked and persisted throughout the session.
