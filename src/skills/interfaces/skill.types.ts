/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 20: Skills & Procedural Intelligence Domain Types
 */

import { VerificationStrategy } from '../../agents/interfaces/mission.types.js';

export type SkillCategory =
  | 'RESEARCH'
  | 'SOFTWARE'
  | 'WEB'
  | 'COMPUTER'
  | 'DOCUMENT'
  | 'BUSINESS'
  | 'OPERATIONS'
  | 'COMMUNICATION'
  | 'DATA'
  | 'DEVOPS'
  | 'SECURITY'
  | 'ADMINISTRATION'
  | 'CUSTOM'
  | string;

export type SkillStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'DISABLED'
  | 'DEPRECATED'
  | 'ARCHIVED';

export type SkillRiskLevel =
  | 'TIER_0'
  | 'TIER_1'
  | 'TIER_2'
  | 'TIER_3'
  | 'TIER_4';

export type StepType =
  | 'DETERMINISTIC'
  | 'TOOL'
  | 'MODEL'
  | 'RESEARCH'
  | 'TRANSFORM'
  | 'CONDITION'
  | 'DELEGATE'
  | 'VERIFY'
  | 'WAIT'
  | 'HUMAN_APPROVAL';

export interface SkillRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  retryableErrors?: string[];
}

export interface SkillStep {
  id?: string;
  stepIndex: number;
  stepId: string;
  name: string;
  description?: string;
  stepType: StepType;
  dependencies: string[];
  capability?: string;
  tool?: string;
  agentId?: string;
  inputs?: Record<string, unknown>;
  verification?: VerificationStrategy;
  timeoutMs?: number;
  retryPolicy?: SkillRetryPolicy;
}

export interface SkillPermissions {
  maxDangerTier: number;
  requiredCapabilities: string[];
  requiredTools: string[];
  requiresHumanApproval: boolean;
  allowedScopes: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  owner: string;
  scope: string;
  status: SkillStatus;
  version: string;
  riskLevel: SkillRiskLevel;
  triggerPhrases?: string[];
  requiredCapabilities: string[];
  requiredTools: string[];
  inputsSchema: Record<string, unknown>;
  outputsSchema: Record<string, unknown>;
  steps: SkillStep[];
  permissions: SkillPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface SkillVersionSnapshot {
  id: string;
  skillId: string;
  version: string;
  definition: SkillDefinition;
  status: SkillStatus;
  createdAt: string;
}

export interface SkillUsageRecord {
  id: string;
  skillId: string;
  version: string;
  missionId?: string;
  goalId?: string;
  agentId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'PAUSED';
  durationMs: number;
  stepCount: number;
  error?: string;
  createdAt: string;
}

export interface SkillImprovementProposal {
  id: string;
  skillId: string;
  currentVersion: string;
  reason: string;
  evidence: string;
  proposedChanges: Record<string, unknown>;
  confidence: number;
  status: 'PROPOSED' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  createdAt: string;
  reviewedAt?: string;
}

export interface SkillMatchResult {
  skill: SkillDefinition;
  confidence: number;
  reason: string;
  matchedCapabilities: string[];
  missingCapabilities: string[];
  isAmbiguous?: boolean;
  alternativeSkills?: Array<{
    skillId: string;
    name: string;
    confidence: number;
  }>;
}

export interface SkillExecutionPreview {
  skillName: string;
  displayName: string;
  version: string;
  stepCount: number;
  requiredCapabilities: string[];
  requiredTools: string[];
  riskLevel: SkillRiskLevel;
  requiresHumanApproval: boolean;
  inputs: Record<string, unknown>;
  expectedOutputs: string[];
  procedureSteps: Array<{
    stepId: string;
    name: string;
    stepType: StepType;
    tool?: string;
    capability?: string;
  }>;
}

export interface SkillExecutionOptions {
  inputs: Record<string, unknown>;
  context?: string;
  companyId?: string;
  projectId?: string;
  departmentId?: string;
  goalId?: string;
  missionId?: string;
  agentId?: string;
  assignedAgentId?: string;
  sessionId?: string;
  dryRun?: boolean;
  bypassApproval?: boolean;
  approvedBy?: string;
  version?: string;
  checkpointStepId?: string;
}

export interface SkillExecutionResult {
  executionId: string;
  skillId: string;
  version: string;
  missionId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'PAUSED' | 'APPROVAL_REQUIRED';
  success: boolean;
  durationMs: number;
  outputs: Record<string, unknown>;
  artifacts: Array<{ name: string; type: string; location: string }>;
  error?: string;
  checkpointStepId?: string;
}

export interface SkillStatistics {
  skillId: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  pausedCount?: number;
  cancelledCount?: number;
  successRate: number;
  averageDurationMs: number;
  lastExecutedAt?: string;
}
