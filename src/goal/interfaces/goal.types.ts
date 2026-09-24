/**
 * HṚṢĪKEŚA (हृषीकेश) — Goal Engine Domain Types
 *
 * Phase 15: Autonomous Goal → Milestone → Mission → Execution → Verification
 *
 * The Goal layer sits above the existing Mission Engine. Goals are decomposed
 * into Milestones, which map to existing Phase 13 Missions, which route through
 * the existing 17-agent workforce and governed ToolExecutionBus.
 */

// ---------------------------------------------------------------------------
// Goal Status Lifecycle
// ---------------------------------------------------------------------------

export type GoalStatus =
  | 'DRAFT'             // Created, not yet analyzed or planned
  | 'ANALYZING'         // GoalPlanner is generating the plan
  | 'PLANNED'           // Plan validated and milestones defined; awaiting approval or start
  | 'AWAITING_APPROVAL' // One or more approval gates block execution
  | 'EXECUTING'         // Active execution loop running
  | 'BLOCKED'           // Execution paused due to unresolvable blocker
  | 'VERIFYING'         // GoalVerifier running independent verification
  | 'COMPLETED'         // Verified complete — all success criteria passed
  | 'FAILED'            // Goal failed; failure criteria met or budget exhausted
  | 'CANCELLED'         // Explicitly cancelled by operator
  | 'PAUSED';           // Temporarily paused; resumable

// ---------------------------------------------------------------------------
// Milestone Status Lifecycle
// ---------------------------------------------------------------------------

export type MilestoneStatus =
  | 'PENDING'    // Not yet started; waiting for predecessors
  | 'READY'      // Dependencies complete; eligible to execute
  | 'EXECUTING'  // Mission executing for this milestone
  | 'BLOCKED'    // Blocked on approval or resource
  | 'VERIFYING'  // Mission complete; verifying success criteria
  | 'COMPLETED'  // Verified complete
  | 'FAILED'     // Mission failed; recovery exhausted
  | 'CANCELLED'; // Cancelled with parent goal

// ---------------------------------------------------------------------------
// Goal Priority
// ---------------------------------------------------------------------------

export type GoalPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

// ---------------------------------------------------------------------------
// Goal Budget — bounds all child missions
// ---------------------------------------------------------------------------

export interface GoalBudget {
  readonly maxMissions: number;
  readonly maxTasks: number;
  readonly maxModelCalls: number;
  readonly maxReplans: number;
  readonly maxExecutionTimeMs: number;
  readonly maxConcurrentTasks: number;
}

export const DEFAULT_GOAL_BUDGET: GoalBudget = {
  maxMissions: 10,
  maxTasks: 50,
  maxModelCalls: 40,
  maxReplans: 3,
  maxExecutionTimeMs: 30 * 60 * 1000, // 30 minutes
  maxConcurrentTasks: 3
};

// ---------------------------------------------------------------------------
// Goal Budget Tracker (in-memory, ephemeral — state persisted via GoalRepo)
// ---------------------------------------------------------------------------

export class GoalBudgetTracker {
  private modelCalls = 0;
  private missionCount = 0;
  private replanCount = 0;
  private readonly budget: GoalBudget;

  constructor(budget: GoalBudget) {
    this.budget = budget;
  }

  public recordModelCall(): void {
    if (this.modelCalls >= this.budget.maxModelCalls) {
      throw new Error(`Goal model call budget exhausted (${this.modelCalls}/${this.budget.maxModelCalls}).`);
    }
    this.modelCalls++;
  }

  public recordMissionCreated(): void {
    if (this.missionCount >= this.budget.maxMissions) {
      throw new Error(`Goal mission budget exhausted (${this.missionCount}/${this.budget.maxMissions}).`);
    }
    this.missionCount++;
  }

  public recordReplan(): void {
    if (this.replanCount >= this.budget.maxReplans) {
      throw new Error(`Goal replan budget exhausted (${this.replanCount}/${this.budget.maxReplans}). Marking goal FAILED.`);
    }
    this.replanCount++;
  }

  public getModelCalls(): number { return this.modelCalls; }
  public getMissionCount(): number { return this.missionCount; }
  public getReplanCount(): number { return this.replanCount; }
  public getRemainingMissions(): number { return this.budget.maxMissions - this.missionCount; }
  public getRemainingReplans(): number { return this.budget.maxReplans - this.replanCount; }
  public isModelBudgetExhausted(): boolean { return this.modelCalls >= this.budget.maxModelCalls; }
}

// ---------------------------------------------------------------------------
// Goal Plan — validated output from GoalPlanner
// ---------------------------------------------------------------------------

export interface GoalPlanMilestoneSpec {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly sequence: number;
  readonly requiredAgentIds: readonly string[];   // validated against AgentRegistry
  readonly requiredCapabilities: readonly string[];
  readonly successCriteria: readonly string[];
  readonly verificationCriteria: readonly string[];
  readonly missionObjective: string;
  readonly requiresApproval: boolean;
  readonly approvalReason?: string;
}

export interface GoalPlan {
  readonly interpretation: string;
  readonly assumptions: readonly string[];
  readonly constraints: readonly string[];
  readonly requiredDepartments: readonly string[];
  readonly milestones: readonly GoalPlanMilestoneSpec[];
  readonly approvalPoints: readonly string[];
  readonly stoppingConditions: readonly string[];
  readonly estimatedModelCalls: number;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly createdAt: string;
  // Source: 'deterministic' = no LLM used; 'llm_validated' = LLM + schema validation
  readonly source: 'deterministic' | 'llm_validated';
}

// ---------------------------------------------------------------------------
// Goal Verification Result
// ---------------------------------------------------------------------------

export interface GoalCriterionResult {
  readonly criterion: string;
  readonly passed: boolean;
  readonly evidence: string;
  readonly checkedAt: string;
}

export interface GoalVerificationResult {
  readonly verified: boolean;
  readonly criteria: readonly GoalCriterionResult[];
  readonly passedCriteria: readonly string[];
  readonly failedCriteria: readonly string[];
  readonly blockingIssues: readonly string[];
  readonly evidence: readonly string[];
  readonly verifiedAt: string;
}

// ---------------------------------------------------------------------------
// Goal Report — final evidence-backed outcome
// ---------------------------------------------------------------------------

export interface GoalReport {
  readonly goalId: string;
  readonly title: string;
  readonly status: GoalStatus;
  readonly summary: string;
  readonly milestones: {
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
    readonly skipped: number;
  };
  readonly missions: {
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
  };
  readonly agentsUsed: readonly string[];
  readonly toolsUsed: readonly string[];
  readonly artifactsCreated: number;
  readonly verification: GoalVerificationResult | null;
  readonly modelCallsUsed: number;
  readonly replansUsed: number;
  readonly executionTimeMs: number;
  readonly completedAt: string;
}

// ---------------------------------------------------------------------------
// IGoal — persistent goal record
// ---------------------------------------------------------------------------

export interface IGoal {
  readonly id: string;
  readonly companyId?: string | null;
  readonly projectId?: string | null;
  readonly productId?: string | null;
  readonly parentGoalId?: string | null;
  readonly title: string;
  readonly description?: string;
  readonly objective: string;
  status: GoalStatus;
  readonly priority: GoalPriority;
  readonly deadline?: string | null;
  readonly budget: GoalBudget;
  readonly constraints?: readonly string[];
  readonly successCriteria?: readonly string[];
  readonly failureCriteria?: readonly string[];
  readonly verificationPlan?: string;
  plan?: GoalPlan;
  report?: GoalReport;
  verificationResult?: GoalVerificationResult;
  blockedReason?: string;
  readonly createdBy: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// IGoalMilestone — persistent milestone record
// ---------------------------------------------------------------------------

export interface IGoalMilestone {
  readonly id: string;
  readonly goalId: string;
  missionId?: string | null;
  readonly title: string;
  readonly description?: string;
  readonly sequence: number;
  status: MilestoneStatus;
  readonly successCriteria?: readonly string[];
  readonly verificationCriteria?: readonly string[];
  readonly requiredAgentIds?: readonly string[];
  readonly requiredCapabilities?: readonly string[];
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Goal Progress — live summary
// ---------------------------------------------------------------------------

export interface GoalProgress {
  readonly goalId: string;
  readonly status: GoalStatus;
  readonly priority: GoalPriority;
  readonly milestonesTotal: number;
  readonly milestonesCompleted: number;
  readonly milestonesFailed: number;
  readonly currentMilestoneId?: string;
  readonly currentMilestoneTitle?: string;
  readonly currentMissionId?: string;
  readonly blockers: readonly string[];
  readonly pendingApprovals: number;
  readonly elapsedMs: number;
  readonly budgetUsage: {
    readonly missionsUsed: number;
    readonly missionsMax: number;
    readonly modelCallsUsed: number;
    readonly modelCallsMax: number;
    readonly replansUsed: number;
    readonly replansMax: number;
  };
}
