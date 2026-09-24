/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Company Operations Types
 *
 * Domain types for Phase 25:
 * Objectives, KPIs, Observations, Orders, Events, Support Tickets,
 * Incidents, Risks, Approvals, SOPs, Releases, Reviews, Budgets, Activities,
 * Health, Capacity, Governance, and Lifecycle states.
 */


// ==========================================
// 1. COMPANY OPERATING STATES
// ==========================================

export type CompanyOperatingState =
  | 'IDEATION'
  | 'RESEARCHING'
  | 'STRATEGIZING'
  | 'PLANNING'
  | 'FORMING'
  | 'VALIDATING'
  | 'BUILDING'
  | 'TESTING'
  | 'PRE_LAUNCH'
  | 'LAUNCHED'
  | 'GROWING'
  | 'OPERATING'
  | 'OPTIMIZING'
  | 'SCALING'
  | 'PAUSED'
  | 'BLOCKED'
  | 'NEEDS_USER'
  | 'AT_RISK'
  | 'WINDING_DOWN'
  | 'RETIRED';

// ==========================================
// 2. COMPANY OBJECTIVES & OKRs
// ==========================================

export type ObjectiveCategory =
  | 'STRATEGIC'
  | 'OPERATIONAL'
  | 'FINANCIAL'
  | 'PRODUCT'
  | 'CUSTOMER'
  | 'GROWTH'
  | 'TECHNICAL'
  | 'COMPLIANCE';

export type ObjectivePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type ObjectiveStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'NEEDS_APPROVAL'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ICompanyObjective {
  readonly id: string;
  readonly companyId: string;
  readonly ownerAgentId: string;
  readonly title: string;
  readonly description?: string;
  readonly category: ObjectiveCategory;
  readonly priority: ObjectivePriority;
  status: ObjectiveStatus;
  readonly deadline?: string;
  budgetAllocated: number;
  budgetSpent: number;
  readonly dependencies: readonly string[];
  readonly metrics: readonly string[];
  evidence?: string;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly approvalRequired: boolean;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. COMPANY KPIs & TIME-SERIES METRICS
// ==========================================

export type KpiCategory =
  | 'STRATEGY'
  | 'PRODUCT'
  | 'CUSTOMERS'
  | 'SALES'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'TECHNOLOGY'
  | 'SECURITY'
  | 'COMPLIANCE'
  | 'SUPPORT'
  | 'RESOURCES';

export type MetricSource =
  | 'MANUAL'
  | 'SYSTEM'
  | 'RESEARCH'
  | 'CUSTOMER'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'PRODUCT'
  | 'INFRASTRUCTURE';

export type MetricTrend = 'UP' | 'DOWN' | 'STABLE';

export interface ICompanyKpi {
  readonly id: string;
  readonly companyId: string;
  readonly name: string;
  readonly category: KpiCategory;
  readonly source: MetricSource;
  readonly unit: string;
  readonly targetValue: number;
  currentValue: number;
  delta: number;
  trend: MetricTrend;
  confidence: number;
  readonly ownerAgentId: string;
  readonly deadline?: string;
  evidence?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

export interface ICompanyMetricObservation {
  readonly id: string;
  readonly kpiId: string;
  readonly companyId: string;
  readonly observedValue: number;
  readonly source: MetricSource;
  readonly notes?: string;
  readonly evidence?: string;
  readonly timestamp: string;
}

// ==========================================
// 4. ORDER & CONTRACT LIFECYCLE
// ==========================================

export type OrderLifecycleStage =
  | 'LEAD'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'APPROVAL'
  | 'CONTRACTED'
  | 'ORDERED'
  | 'IN_FULFILLMENT'
  | 'DELIVERED'
  | 'ONBOARDED'
  | 'SUPPORTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface IOrderItem {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly subtotal: number;
}

export interface ICompanyOrder {
  readonly id: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly productId?: string | null;
  readonly orderNumber: string;
  status: OrderLifecycleStage;
  readonly totalAmount: number;
  readonly currency: string;
  readonly items: readonly IOrderItem[];
  readonly contractReference?: string;
  readonly approvalId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

export interface ICompanyOrderEvent {
  readonly id: string;
  readonly orderId: string;
  readonly companyId: string;
  readonly eventType: string;
  readonly fromStatus?: OrderLifecycleStage;
  readonly toStatus: OrderLifecycleStage;
  readonly actor: string;
  readonly reason?: string;
  readonly evidence?: string;
  readonly timestamp: string;
}

// ==========================================
// 5. CUSTOMER SUPPORT & TICKETS
// ==========================================

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketStatus =
  | 'OPEN'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'WAITING_INTERNAL'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ESCALATED';

export interface ITicketMessage {
  readonly sender: string;
  readonly message: string;
  readonly timestamp: string;
}

export interface ICompanySupportTicket {
  readonly id: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly title: string;
  readonly issue: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAgentId: string;
  readonly slaDeadline?: string;
  resolution?: string;
  evidence?: string;
  readonly messages: readonly ITicketMessage[];
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. SRE INCIDENTS & OPERATIONS
// ==========================================

export type IncidentSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'DETECTED'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'INVESTIGATING'
  | 'MITIGATING'
  | 'VERIFYING'
  | 'RESOLVED'
  | 'POSTMORTEM';

export interface ICompanyIncident {
  readonly id: string;
  readonly companyId: string;
  readonly title: string;
  severity: IncidentSeverity;
  readonly source: string;
  readonly affectedSystem: string;
  readonly detectedTime: string;
  ownerAgentId: string;
  status: IncidentStatus;
  actions: readonly string[];
  evidence?: string;
  resolution?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 7. RISK MANAGEMENT
// ==========================================

export type RiskLikelihood = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskImpact = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskStatus =
  | 'IDENTIFIED'
  | 'MONITORING'
  | 'MITIGATING'
  | 'ACCEPTED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export interface ICompanyRisk {
  readonly id: string;
  readonly companyId: string;
  readonly title: string;
  readonly description?: string;
  probability: RiskLikelihood;
  impact: RiskImpact;
  severity: RiskSeverity;
  ownerAgentId: string;
  mitigation?: string;
  contingency?: string;
  status: RiskStatus;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 8. APPROVAL ENGINE & GOVERNANCE
// ==========================================

export type ApprovalCategory =
  | 'FINANCIAL'
  | 'LEGAL'
  | 'EXTERNAL_COMMUNICATION'
  | 'PRODUCTION_DEPLOYMENT'
  | 'CUSTOMER_COMMITMENT'
  | 'DATA_ACCESS'
  | 'CREDENTIAL_USE'
  | 'DESTRUCTIVE_OPERATION'
  | 'COMPANY_CLOSURE';

export type ApprovalStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface ICompanyApproval {
  readonly id: string;
  readonly companyId: string;
  readonly category: ApprovalCategory;
  readonly title: string;
  readonly description?: string;
  readonly requesterAgentId: string;
  status: ApprovalStatus;
  resolvedBy?: string;
  resolutionReason?: string;
  readonly payload?: Record<string, unknown>;
  readonly expiresAt?: string;
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 9. STANDARD OPERATING PROCEDURES (SOP)
// ==========================================

export interface ISopStep {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiredSkills?: readonly string[];
  readonly requiredTools?: readonly string[];
  readonly approvalRequired?: boolean;
}

export interface ICompanySop {
  readonly id: string;
  readonly companyId: string;
  readonly name: string;
  readonly purpose: string;
  readonly scope: string;
  readonly ownerAgentId: string;
  readonly steps: readonly ISopStep[];
  readonly requiredSkills: readonly string[];
  readonly requiredTools: readonly string[];
  readonly approvalRequirements: readonly string[];
  readonly verification: string;
  readonly version: string;
  status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 10. PRODUCT RELEASES & DEPLOYMENT
// ==========================================

export type ReleaseStatus =
  | 'PLANNING'
  | 'BUILDING'
  | 'TESTING'
  | 'READY'
  | 'DEPLOYED'
  | 'VERIFIED'
  | 'FAILED'
  | 'ROLLED_BACK';

export interface ICompanyRelease {
  readonly id: string;
  readonly companyId: string;
  readonly productId: string;
  readonly version: string;
  readonly scope?: string;
  readonly changes: readonly string[];
  readonly tests: readonly string[];
  readonly approvals: readonly string[];
  readonly deploymentTarget: string;
  readonly rollbackPlan?: string;
  status: ReleaseStatus;
  evidence?: string;
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 11. COMPANY REVIEWS & CONTINUOUS IMPROVEMENT
// ==========================================

export type ReviewType = 'OPERATIONAL' | 'STRATEGIC' | 'FINANCIAL' | 'SECURITY';

export interface ICompanyReview {
  readonly id: string;
  readonly companyId: string;
  readonly reviewerAgentId: string;
  readonly reviewType: ReviewType;
  readonly findings: readonly string[];
  readonly actions: readonly string[];
  readonly proposals: readonly string[];
  status: 'COMPLETED' | 'IN_PROGRESS';
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 12. BUDGETS & FINANCIAL BOUNDS
// ==========================================

export type BudgetCategory = 'FINANCIAL' | 'COMPUTE' | 'MODEL_TOKENS' | 'API_CALLS';

export interface ICompanyBudget {
  readonly id: string;
  readonly companyId: string;
  readonly departmentId?: string | null;
  readonly projectId?: string | null;
  readonly category: BudgetCategory;
  allocatedAmount: number;
  reservedAmount: number;
  spentAmount: number;
  remainingAmount?: number;
  readonly currency: string;
  forecast?: number;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly createdAt: string;
  updatedAt: string;
}

// ==========================================
// 13. AUDIT & ACTIVITY
// ==========================================

export interface ICompanyActivity {
  readonly id: string;
  readonly companyId: string;
  readonly actor: string;
  readonly action: string;
  readonly target: string;
  readonly result?: string;
  readonly evidence?: string;
  readonly timestamp: string;
}

// ==========================================
// 14. HEALTH & CAPACITY
// ==========================================

export type CompanyHealthStatus =
  | 'HEALTHY'
  | 'WATCH'
  | 'AT_RISK'
  | 'BLOCKED'
  | 'CRITICAL'
  | 'PAUSED';

export interface ICompanyHealthReport {
  readonly companyId: string;
  readonly overallStatus: CompanyHealthStatus;
  readonly overallScore?: number;
  readonly dimensions: Record<KpiCategory, {
    readonly score: number;
    readonly status: CompanyHealthStatus;
    readonly issues: readonly string[];
  }>;
  readonly timestamp: string;
}

export type AgentCapacityStatus =
  | 'AVAILABLE'
  | 'BUSY'
  | 'WAITING'
  | 'BLOCKED'
  | 'PAUSED'
  | 'OFFLINE'
  | 'RECOVERING';

export interface IAgentWorkforceCapacity {
  readonly agentId: string;
  companyId: string;
  status: AgentCapacityStatus;
  currentTaskId?: string;
  activeTaskCount: number;
  maxCapacity: number;
  readonly specializations: readonly string[];
  updatedAt: string;
}

// ==========================================
// 15. AUTOMATION LOOP & BUDGET
// ==========================================

export interface CompanyLoopBudget {
  readonly maxTasks: number;
  readonly maxMissions: number;
  readonly maxModelCalls: number;
  readonly maxRuntimeMs: number;
  readonly maxRetries: number;
}

export interface CompanyOperatingCycleResult {
  readonly cycleId?: string;
  readonly companyId: string;
  readonly state: CompanyOperatingState;
  readonly status?: string;
  readonly tasksDispatched?: number;
  readonly executedTasks: number;
  readonly missionsCreated?: number;
  readonly completedObjectives: number;
  readonly pendingApprovals: number;
  readonly activeIncidents: number;
  readonly healthEvaluated?: any;
  readonly actionsTaken?: readonly string[];
  readonly durationMs: number;
  readonly details: readonly string[];
}
