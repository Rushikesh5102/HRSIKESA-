# HṚṢĪKEŚA — Company Operations & Workforce Management

## 1. Operating State Machine

Companies transition through 20 formalized operating states:

```
PROSPECTIVE → RESEARCHING → STRATEGIZING → INCORPORATING → STRUCTURING →
DISCOVERING → DESIGNING → DEVELOPING → VERIFYING → LAUNCHING → MARKETING →
SELLING → FULFILLING → SERVICING → EXPANDING → OPTIMIZING → RESTRUCTURING →
RECOVERING → WINDING_DOWN → RETIRED
```

---

## 2. Workforce Capacity & Intelligent Routing

The `CompanyWorkforceManager` maintains real-time capacity and specialization profiles for the authoritative 17-agent workforce:

```typescript
export interface IAgentWorkforceCapacity {
  readonly agentId: string;
  companyId: string;
  status: 'AVAILABLE' | 'BUSY' | 'WAITING' | 'BLOCKED' | 'PAUSED' | 'OFFLINE' | 'RECOVERING';
  currentTaskId?: string;
  activeTaskCount: number;
  maxCapacity: number; // default: 3 concurrent tasks
  readonly specializations: readonly string[];
  updatedAt: string;
}
```

### Intelligent Routing Table

| Skill Category | Primary Agent | Fallback Agent |
| :--- | :--- | :--- |
| Coding & Implementation | Gāṇḍīva | Spoota |
| Strategy & OKR Planning | Aja | Ritvan |
| Research & Competitor Analysis | Rahu | Tvas |
| QA & Risk Verification | Vighna | Garuḍa |
| Marketing & Lead Generation | Raudra | Aja |
| Legal, Compliance & Governance | Rutam | Aja |
| Release Delivery & Deployment | Arvan | Garuḍa |
| Support & Onboarding | Tāraka | Spoota |
| Billing & Financial Tracking | Kalki | Rutam |
| SRE & Infrastructure Telemetry | Garuḍa | Vighna |
| Process & SOP Optimization | Kali | Ritvan |
| Temporal Scheduling & Deadlines | KĀLA | Aja |
| Disaster Recovery & Checkpoints | Yama | Garuḍa |
| Decommissioning & Retirement | Mṛtyu | Rutam |
