/**
 * HṚṢĪKEŚA (हृषीकेश) — Cognitive Context Engine Interfaces
 *
 * Track A / INT-007: Unified Context Selection, Scoping, Relevance & Intelligence
 */

import { ProvenanceType } from '../../knowledge/interfaces/knowledge.types.js';

export type ContextScope =
  | 'CREATOR'
  | 'GLOBAL'
  | 'PROJECT'
  | 'COMPANY'
  | 'SESSION'
  | 'AGENT'
  | 'GOAL'
  | 'MISSION'
  | 'TASK';

export type ContextIntent =
  | 'CASUAL_CONVERSATION'
  | 'IDENTITY'
  | 'PROJECT_QUERY'
  | 'COMPANY_QUERY'
  | 'RESEARCH_QUERY'
  | 'TECHNICAL_QUERY'
  | 'DECISION_QUERY'
  | 'GOAL_MISSION'
  | 'AGENT_TASK'
  | 'SYSTEM_STATUS'
  | 'GENERAL_KNOWLEDGE';

export type TaskComplexity = 'SIMPLE' | 'STANDARD' | 'COMPLEX' | 'RESEARCH_DEEP';

export type TemporalIntent =
  | 'CURRENT'
  | 'RECENT'
  | 'HISTORICAL'
  | 'AT_TIME'
  | 'BEFORE'
  | 'AFTER'
  | 'ALL';

export type CandidateSourceType =
  | 'CONVERSATION'
  | 'MEMORY_EPISODIC'
  | 'MEMORY_SEMANTIC'
  | 'KNOWLEDGE_GRAPH'
  | 'RESEARCH_EVIDENCE'
  | 'DECISION'
  | 'PROJECT'
  | 'COMPANY'
  | 'AGENT'
  | 'GOAL'
  | 'MISSION'
  | 'SKILL'
  | 'DOCUMENT'
  | 'TOOL_STATE'
  | 'WORKING_MEMORY';

export interface CandidateTemporalMetadata {
  validFrom?: string;
  validUntil?: string;
  observedAt?: string;
  isCurrent: boolean;
  version?: number;
  supersededBy?: string;
}

export interface CandidateContradictionMetadata {
  isContested: boolean;
  conflictReason?: string;
  conflictingCandidateId?: string;
  opposingSource?: string;
  opposingValue?: string;
}

export interface ContextCandidate {
  readonly id: string;
  readonly sourceType: CandidateSourceType;
  readonly sourceId?: string;
  readonly scope: ContextScope;
  readonly title?: string;
  readonly content: string;
  relevanceScore: number;
  rankingReasons: string[];
  readonly provenance: ProvenanceType;
  readonly confidence: number;
  readonly tokensEstimated: number;
  readonly charsCount: number;
  temporal?: CandidateTemporalMetadata;
  contradiction?: CandidateContradictionMetadata;
  metadata?: Record<string, unknown>;
}

export interface ContextBudget {
  readonly tier: number;
  readonly maxTokens: number;
  readonly maxChars: number;
  usedTokens: number;
  usedChars: number;
}

export interface ContextRequest {
  readonly requestId?: string;
  readonly userMessage?: string;
  readonly query?: string;
  readonly intent?: ContextIntent;
  readonly sessionId?: string;
  readonly projectId?: string;
  readonly targetProjectId?: string;
  readonly companyId?: string;
  readonly targetCompanyId?: string;
  readonly agentId?: string;
  readonly goalId?: string;
  readonly missionId?: string;
  readonly taskId?: string;
  readonly tier?: number;
  readonly requestedDepth?: 'SHALLOW' | 'STANDARD' | 'DEEP' | 'EXHAUSTIVE';
  readonly privacyLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  readonly temporalScope?: TemporalIntent;
  readonly temporalIntent?: TemporalIntent;
  readonly referenceTime?: string;
  readonly modelContextBudget?: {
    maxTokens?: number;
    maxChars?: number;
    tier?: number;
  };
}

export interface ContextTraceTimings {
  classification: number;
  scopeResolution: number;
  candidateCollection: number;
  ranking: number;
  temporalFiltering: number;
  conflictResolution: number;
  compression: number;
  assembly: number;
  total: number;
}

export interface ContextTrace {
  readonly requestId: string;
  readonly userMessage: string;
  readonly intent: ContextIntent;
  readonly complexity: TaskComplexity;
  readonly resolvedScope: ContextScope;
  readonly targetEntity?: string;
  readonly targetProject?: string;
  readonly targetCompany?: string;
  readonly activatedSources: CandidateSourceType[];
  readonly candidatesCollected: number;
  readonly candidatesSelected: number;
  readonly candidatesRejected: number;
  readonly sourceBreakdown: Record<string, { collected: number; selected: number }>;
  readonly selectionReasons: Record<string, string[]>;
  readonly rejectionReasons: Record<string, string>;
  readonly budget: ContextBudget;
  readonly timingsMs: ContextTraceTimings;
  readonly finalContextSizeChars: number;
  readonly timestamp: string;
}

export interface CognitiveContextResult {
  readonly requestId: string;
  readonly formattedContext: string;
  readonly selectedCandidates: ContextCandidate[];
  readonly trace: ContextTrace;
  readonly suggestedModelTier: 'FAST_LOCAL' | 'BALANCED_DEEP_LOCAL' | 'FLAGSHIP_QUALITY';
  readonly suggestedComplexity: TaskComplexity;
}
