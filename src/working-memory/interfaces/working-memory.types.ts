/**
 * HṚṢĪKEŚA (हृषीकेश) — Working Memory & Conversational Continuity Types
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 */

export type ThreadStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'BLOCKED'
  | 'RESUMABLE';

export interface ConversationThread {
  readonly id: string;
  readonly sessionId: string;
  readonly title: string;
  readonly status: ThreadStatus;
  readonly targetProjectId?: string;
  readonly targetCompanyId?: string;
  readonly targetGoalId?: string;
  readonly targetMissionId?: string;
  readonly activeTaskId?: string;
  readonly priority: number;
  readonly summary?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastActiveAt: string;
}

export type WorkingMemoryItemType =
  | 'ACTIVE_TOPIC'
  | 'CURRENT_TASK'
  | 'CURRENT_PROJECT'
  | 'CURRENT_COMPANY'
  | 'CURRENT_GOAL'
  | 'CURRENT_MISSION'
  | 'CURRENT_AGENT'
  | 'RECENT_DECISION'
  | 'USER_CORRECTION'
  | 'TEMPORARY_ASSUMPTION'
  | 'PENDING_QUESTION'
  | 'UNFINISHED_ACTION'
  | 'RECENT_RESULT'
  | 'ERROR_STATE'
  | 'BLOCKER'
  | 'NEXT_STEP'
  | 'USER_INTENT';

export type WorkingMemoryScope =
  | 'GLOBAL'
  | 'PROJECT'
  | 'COMPANY'
  | 'SESSION'
  | 'AGENT'
  | 'GOAL'
  | 'MISSION';

export type WorkingMemorySource =
  | 'EXPLICIT'
  | 'DERIVED'
  | 'SYSTEM'
  | 'INFERRED';

export type WorkingMemoryItemStatus =
  | 'ACTIVE'
  | 'RESOLVED'
  | 'SUPERSEDED'
  | 'EXPIRED';

export interface WorkingMemoryItem {
  readonly id: string;
  readonly sessionId: string;
  readonly threadId?: string;
  readonly type: WorkingMemoryItemType;
  readonly content: string;
  readonly scope: WorkingMemoryScope;
  readonly source: WorkingMemorySource;
  readonly confidence: number;
  readonly status: WorkingMemoryItemStatus;
  readonly priority: number;
  readonly relatedEntityId?: string;
  readonly relatedProjectId?: string;
  readonly relatedCompanyId?: string;
  readonly relatedGoalId?: string;
  readonly relatedMissionId?: string;
  readonly relatedTaskId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastReferencedAt: string;
  readonly expiresAt?: string;
}

export type PendingItemType =
  | 'QUESTION'
  | 'ACTION'
  | 'APPROVAL'
  | 'INPUT_REQUIRED'
  | 'VERIFICATION';

export type PendingItemStatus =
  | 'OPEN'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'EXPIRED';

export interface PendingItem {
  readonly id: string;
  readonly sessionId: string;
  readonly threadId?: string;
  readonly type: PendingItemType;
  readonly description: string;
  readonly status: PendingItemStatus;
  readonly priority: number;
  readonly assignedAgentId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
}

export interface CheckpointState {
  readonly threadTitle?: string;
  readonly activeThreadId?: string;
  readonly targetProjectId?: string;
  readonly targetCompanyId?: string;
  readonly targetGoalId?: string;
  readonly targetMissionId?: string;
  readonly activeTaskId?: string;
  readonly taskDescription?: string;
  readonly assumptions: string[];
  readonly recentDecisions: string[];
  readonly pendingItems: string[];
  readonly blockers: string[];
  readonly nextSteps: string[];
  readonly lastResult?: string;
  readonly nextRecommendedContinuationPoint?: string;
  readonly timestamp: string;
}

export interface ConversationCheckpoint {
  readonly id: string;
  readonly sessionId: string;
  readonly threadId: string;
  readonly title: string;
  readonly projectId?: string;
  readonly companyId?: string;
  readonly goalId?: string;
  readonly missionId?: string;
  readonly taskId?: string;
  readonly status: 'ACTIVE' | 'SUPERSEDED' | 'RESTORED';
  readonly state: CheckpointState;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ReferenceTargetType =
  | 'PROJECT'
  | 'THREAD'
  | 'TASK'
  | 'FILE'
  | 'DECISION'
  | 'ERROR'
  | 'GOAL'
  | 'MISSION'
  | 'GENERAL';

export interface ConversationReference {
  readonly rawText: string;
  readonly resolvedEntityOrConcept: string;
  readonly targetType: ReferenceTargetType;
  readonly targetId?: string;
  readonly confidence: number;
  readonly isAmbiguous: boolean;
  readonly candidateMatches: string[];
  readonly explanation: string;
}

export interface ReferenceResolutionResult {
  readonly resolved: boolean;
  readonly reference?: ConversationReference;
  readonly ambiguity?: {
    readonly isAmbiguous: boolean;
    readonly message?: string;
    readonly candidates: string[];
  };
}

export interface ContinuityState {
  readonly activeThread?: ConversationThread;
  readonly activeProject?: string;
  readonly activeCompany?: string;
  readonly activeGoal?: string;
  readonly activeMission?: string;
  readonly activeTask?: string;
  readonly workingItems: WorkingMemoryItem[];
  readonly pendingItems: PendingItem[];
  readonly blockers: WorkingMemoryItem[];
  readonly nextSteps: WorkingMemoryItem[];
  readonly recentDecisions: WorkingMemoryItem[];
  readonly userCorrections: WorkingMemoryItem[];
  readonly assumptions: WorkingMemoryItem[];
  readonly recentResults: WorkingMemoryItem[];
  readonly checkpoint?: ConversationCheckpoint;
  readonly lastUpdated: string;
}

export interface WorkingMemoryTTLConfig {
  readonly temporaryAssumptionMs: number; // default 15 min
  readonly activeTopicMs: number;          // default 2 hours
  readonly recentResultMs: number;         // default 1 hour
  readonly userIntentMs: number;           // default 30 min
  readonly defaultItemMs: number;          // default 4 hours
}

export interface WorkingMemoryConfig {
  readonly ttl: WorkingMemoryTTLConfig;
  readonly maxActiveThreads: number;
  readonly maxWorkingItemsPerSession: number;
  readonly enableAutoCheckpoint: boolean;
  readonly autoCheckpointIntervalTurns: number;
}
