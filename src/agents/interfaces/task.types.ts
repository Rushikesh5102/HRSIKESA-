/**
 * HRSIKESA (हृषीकेश) — Agent Task and Result Types
 */

import { VerificationStrategy, VerificationResult, MissionArtifact } from './mission.types.js';

export type TaskStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying'
  | 'queued'; // backward compatibility

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface StructuredObservation {
  readonly success: boolean;
  readonly output?: unknown;
  readonly artifacts?: readonly string[];
  readonly changedResources?: readonly string[];
  readonly warnings?: readonly string[];
  readonly timestamp: string;
}

export interface AgentTask {
  readonly id: string;
  readonly agentId: string;
  readonly missionId?: string;
  readonly parentTaskId?: string;
  readonly objective: string;
  readonly title?: string;
  readonly context?: string;
  readonly inputs?: Record<string, unknown>;
  readonly deterministicToolAction?: {
    readonly tool: string;
    readonly input: Record<string, unknown>;
  };
  readonly approvalId?: string;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly depth: number;
  readonly dependencies?: readonly string[];
  readonly retryCount?: number;
  readonly maxRetries?: number;
  readonly verificationStrategy?: VerificationStrategy;
  readonly verificationResult?: VerificationResult;
  readonly observation?: StructuredObservation;
  readonly artifacts?: readonly MissionArtifact[];
  readonly sessionId?: string;
  readonly result?: string;
  readonly error?: string;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
}

export interface AgentToolCallRecord {
  readonly tool: string;
  readonly input: Record<string, unknown>;
  readonly output?: unknown;
  readonly success: boolean;
  readonly durationMs: number;
  readonly error?: string;
}

export interface AgentResult {
  readonly taskId: string;
  readonly agentId: string;
  readonly status: TaskStatus;
  readonly summary: string;
  readonly output?: unknown;
  readonly evidence?: string[];
  readonly toolCalls: AgentToolCallRecord[];
  readonly childTaskIds: string[];
  readonly artifacts?: readonly MissionArtifact[];
  readonly verificationResult?: VerificationResult;
  readonly observation?: StructuredObservation;
  readonly pendingApprovalId?: string;
  readonly requiresApproval?: boolean;
  readonly errors: string[];
  readonly startedAt: string;
  readonly completedAt: string;
}

