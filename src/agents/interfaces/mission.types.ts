/**
 * HRSIKESA (हृषीकेश) — Mission and Autonomous Execution Types
 */

export type MissionStatus =
  | 'planning'
  | 'ready'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'pending'; // backward compatibility

export interface MissionBudget {
  readonly maxTasks: number;
  readonly maxRetries: number;
  readonly maxExecutionTimeMs: number;
  readonly maxAgentDepth: number;
  readonly maxConcurrentTasks: number;
  readonly maxModelCalls: number;
}

export const DEFAULT_MISSION_BUDGET: MissionBudget = {
  maxTasks: 20,
  maxRetries: 3,
  maxExecutionTimeMs: 10 * 60 * 1000, // 10 minutes
  maxAgentDepth: 3,
  maxConcurrentTasks: 2,
  maxModelCalls: 15
};

export type VerificationType =
  | 'file_exists'
  | 'file_contains'
  | 'command_exit_code'
  | 'process_running'
  | 'window_exists'
  | 'http_status'
  | 'blackboard_entry_present'
  | 'custom';

export interface VerificationStrategy {
  readonly type: VerificationType;
  readonly target: string;
  readonly expectedValue?: string | number | boolean;
  readonly details?: Record<string, unknown>;
}

export interface VerificationResult {
  readonly passed: boolean;
  readonly strategy: VerificationStrategy;
  readonly actualValue?: unknown;
  readonly details?: string;
  readonly verifiedAt: string;
}

export class MissionBudgetTracker {
  private modelCalls: number = 0;
  private readonly maxModelCalls: number;

  constructor(maxModelCalls: number = 20) {
    this.maxModelCalls = maxModelCalls;
  }

  public getModelCallsCount(): number {
    return this.modelCalls;
  }

  public recordModelCall(): void {
    if (this.isExhausted()) {
      throw new Error(`Mission-wide model call budget exhausted (${this.modelCalls}/${this.maxModelCalls} calls used).`);
    }
    this.modelCalls++;
  }

  public isExhausted(): boolean {
    return this.modelCalls >= this.maxModelCalls;
  }
}

export interface PlannedTask {
  readonly id: string;
  readonly title: string;
  readonly objective: string;
  readonly agentId: string;
  readonly dependencies: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly expectedOutputs: readonly string[];
  readonly deterministicToolAction?: {
    readonly tool: string;
    readonly input: Record<string, unknown>;
  };
  readonly verificationStrategy?: VerificationStrategy;
  readonly dangerLevel?: number;
  readonly timeoutMs?: number;
}

export interface MissionPlan {
  readonly objective: string;
  readonly constraints: readonly string[];
  readonly successCriteria: readonly string[];
  readonly tasks: readonly PlannedTask[];
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly estimatedModelCalls: number;
  readonly createdAt: string;
}

export type ArtifactType =
  | 'file'
  | 'url'
  | 'screenshot'
  | 'process'
  | 'report'
  | 'document'
  | 'code'
  | 'data';

export interface MissionArtifact {
  readonly id: string;
  readonly missionId: string;
  readonly taskId: string;
  readonly companyId?: string | null;
  readonly projectId?: string | null;
  readonly type: ArtifactType;
  readonly location: string;
  readonly name: string;
  readonly metadata?: Record<string, unknown>;
  readonly verified: boolean;
  readonly createdAt: string;
}

export interface HumanInterventionRequest {
  readonly id: string;
  readonly missionId: string;
  readonly taskId: string;
  readonly reason: string;
  readonly dangerTier?: number;
  readonly options?: readonly string[];
  readonly resolved: boolean;
  readonly resolution?: string;
  readonly requestedAt: string;
  readonly resolvedAt?: string;
}

export interface MissionReport {
  readonly missionId: string;
  readonly objective: string;
  readonly status: MissionStatus;
  readonly summary: string;
  readonly tasks: {
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly blocked: number;
    readonly retried: number;
  };
  readonly agentsUsed: readonly string[];
  readonly toolsUsed: readonly string[];
  readonly artifacts: readonly MissionArtifact[];
  readonly verifications: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
  };
  readonly retriesCount: number;
  readonly approvalsCount: number;
  readonly warnings: readonly string[];
  readonly executionTimeMs: number;
  readonly modelCallsCount: number;
  readonly finalResult?: unknown;
  readonly completedAt: string;
}

export interface IMission {
  readonly id: string;
  readonly companyId?: string | null;
  readonly projectId?: string | null;
  readonly productId?: string | null;
  readonly departmentId?: string | null;
  readonly objective: string;
  readonly rootAgentId: string;
  readonly rootTaskId: string;
  status: MissionStatus;
  result?: string;
  plan?: MissionPlan;
  budget?: MissionBudget;
  report?: MissionReport;
  blockedReason?: string;
  interventionRequest?: HumanInterventionRequest;
  readonly createdAt: string;
  updatedAt: string;
}

export interface BlackboardEntry {
  readonly id: string;
  readonly missionId: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly type: string;
  readonly title: string;
  readonly content: string;
  readonly evidence?: string[];
  readonly createdAt: string;
}

export interface MissionResult {
  readonly missionId: string;
  readonly status: MissionStatus;
  readonly objective: string;
  readonly summary: string;
  readonly output?: unknown;
  readonly taskCount: number;
  readonly report?: MissionReport;
  readonly artifacts?: readonly MissionArtifact[];
  readonly completedAt: string;
}

