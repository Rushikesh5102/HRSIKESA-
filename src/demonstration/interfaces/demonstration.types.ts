/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-16: Demonstration Learning & Workflow Acquisition
 *
 * Domain types for demonstration sessions, semantic actions, procedure proposals,
 * and learned procedure versioning.
 *
 * Architecture: These types EXTEND (not duplicate) existing operator, skill, and
 * workflow types. They form a thin observation→inference→compilation layer.
 */

// ─── Demonstration Session ────────────────────────────────────────────────────

export type DemonstrationStatus =
  | 'RECORDING'
  | 'PAUSED'
  | 'STOPPED'
  | 'ANALYZING'
  | 'UNDERSTOOD'
  | 'PROPOSAL_READY'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'LEARNING'
  | 'LEARNED'
  | 'NEEDS_USER'
  | 'FAILED'
  | 'ARCHIVED';

export type DemonstrationScope =
  | 'GLOBAL'
  | 'COMPANY'
  | 'PROJECT'
  | 'WORKSPACE'
  | 'USER';

export type DemonstrationObservationSource =
  | 'UIA'
  | 'BROWSER_DOM'
  | 'TERMINAL'
  | 'IDE'
  | 'API'
  | 'MCP'
  | 'APPLICATION_EVENTS'
  | 'FILESYSTEM'
  | 'VISION_OCR'
  | 'VOICE'
  | 'MULTIMODAL';

export type SecurityClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

export interface DemonstrationCheckpoint {
  checkpointId: string;
  demonstrationId: string;
  stepIndex: number;
  label: string;
  annotation?: string;
  capturedAt: string;
  stateSnapshot?: Record<string, unknown>;
}

export interface DemonstrationArtifact {
  artifactId: string;
  demonstrationId: string;
  type: 'SCREENSHOT' | 'RECORDING' | 'FILE' | 'DIFF' | 'LOG' | 'API_RESPONSE';
  name: string;
  path?: string;
  uri?: string;
  sizeBytes?: number;
  mimeType?: string;
  createdAt: string;
  isRedacted: boolean;
}

export interface DemonstrationVerificationEvidence {
  type: string;
  description: string;
  isVerified: boolean;
  capturedAt: string;
  evidence: Record<string, unknown>;
}

export interface DemonstrationSession {
  id: string;
  owner: string;
  companyId?: string;
  projectId?: string;
  workspaceId?: string;
  title: string;
  objective: string;
  status: DemonstrationStatus;
  scope: DemonstrationScope;
  startedAt: string;
  endedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  environment?: string;
  observationSources: DemonstrationObservationSource[];
  actionCount: number;
  checkpointCount: number;
  teachingMode: boolean;
  voiceAnnotationsEnabled: boolean;
  inferredIntentSummary?: string;
  proposedProcedureId?: string;
  compiledSkillId?: string;
  compiledWorkflowId?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  confidence?: number;
  securityClassification: SecurityClassification;
  provenance: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── Semantic Action Trace ────────────────────────────────────────────────────

export type SemanticActionType =
  | 'OPEN_APPLICATION'
  | 'FOCUS_WINDOW'
  | 'NAVIGATE'
  | 'CLICK_TARGET'
  | 'TYPE_TEXT'
  | 'SELECT_OPTION'
  | 'PRESS_KEY'
  | 'CREATE_FILE'
  | 'EDIT_FILE'
  | 'DELETE_FILE'
  | 'RUN_COMMAND'
  | 'CALL_API'
  | 'USE_BROWSER'
  | 'USE_SERVICE'
  | 'AUTHENTICATE'
  | 'AUTHENTICATION_REQUIRED'
  | 'WAIT_FOR_STATE'
  | 'VERIFY_STATE'
  | 'CREATE_ARTIFACT'
  | 'DEPLOY'
  | 'PUBLISH'
  | 'SEND_MESSAGE'
  | 'CREATE_WORKFLOW'
  | 'CREATE_SKILL'
  | 'COPY_TEXT'
  | 'PASTE_TEXT'
  | 'SCROLL'
  | 'DRAG_DROP'
  | 'MENU_SELECT'
  | 'TAB_SELECT'
  | 'SWITCH_APPLICATION'
  | 'TAKE_SCREENSHOT'
  | 'CHECK_STATE'
  | 'TEACHING_ANNOTATION'
  | 'CORRECTION'
  | 'CHECKPOINT'
  | 'UNKNOWN';

export type SemanticActionDangerLevel =
  | 'SAFE'
  | 'READ_ONLY'
  | 'WRITE'
  | 'EXTERNAL'
  | 'DESTRUCTIVE'
  | 'IRREVERSIBLE';

export type SemanticActionSource =
  | 'UIA'
  | 'BROWSER_DOM'
  | 'TERMINAL'
  | 'IDE'
  | 'API'
  | 'MCP'
  | 'APPLICATION_EVENTS'
  | 'FILESYSTEM'
  | 'VISION_OCR'
  | 'VOICE'
  | 'MULTIMODAL'
  | 'INFERRED';

export interface SemanticActionParameter {
  name: string;
  value: unknown;
  isRedacted: boolean;
  isSensitive: boolean;
  isVariable: boolean; // true = parameter, false = fixed value
  parameterName?: string; // extracted parameter name if isVariable
}

export interface SemanticActionTarget {
  description: string;
  identifier?: string;
  role?: string;
  semanticSelector?: string;
  applicationId?: string;
  applicationName?: string;
  url?: string;
  filePath?: string;
}

export interface SemanticAction {
  id: string;
  demonstrationId: string;
  stepIndex: number;
  actionType: SemanticActionType;
  semanticIntent: string;
  target?: SemanticActionTarget;
  application?: string;
  environment?: string;
  precondition?: string;
  parameters: SemanticActionParameter[];
  resultingState?: string;
  timestamp: string;
  source: SemanticActionSource;
  confidence: number;
  verificationEvidence?: Record<string, unknown>;
  isVerified: boolean;
  isReversible: boolean;
  dangerLevel: SemanticActionDangerLevel;
  teachingAnnotation?: string;
  isIgnored: boolean; // user said "ignore that"
  isImportant: boolean; // user said "remember this"
  isOptional: boolean; // user said "that step is optional"
  rawOperatorActionId?: string; // link back to ActionTraceStep if available
  metadata: Record<string, unknown>;
}

// ─── Procedure Proposal ───────────────────────────────────────────────────────

export type ProcedureProposalStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'VALID'
  | 'INVALID'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPILING'
  | 'COMPILED'
  | 'FAILED';

export type ProcedureCompilationTarget = 'SKILL' | 'WORKFLOW' | 'UNDETERMINED';

export type ProcedureRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProcedureParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: unknown;
  exampleValue?: unknown;
  validationPattern?: string;
}

export interface ProcedureStep {
  stepIndex: number;
  name: string;
  description: string;
  actionType: SemanticActionType;
  semanticIntent: string;
  target?: SemanticActionTarget;
  parameters: ProcedureParameter[];
  precondition?: string;
  postcondition?: string;
  verificationStrategy?: string;
  isOptional: boolean;
  isBranch: boolean;
  branchCondition?: string;
  isLoop: boolean;
  loopCondition?: string;
  recoveryStrategy?: string;
  dangerLevel: SemanticActionDangerLevel;
  requiredCapability?: string;
  requiredTool?: string;
  requiresApproval: boolean;
}

export interface ProcedureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    schemaCorrect: boolean;
    capabilityAvailable: boolean;
    accountAvailable: boolean;
    workspaceAvailable: boolean;
    permissionRequirements: boolean;
    secretSafety: boolean;
    parameterSafety: boolean;
    dangerousActions: boolean;
    dependencyAvailability: boolean;
    preconditionsCovered: boolean;
    postconditionsCovered: boolean;
    verificationCoverage: boolean;
    recoveryCoverage: boolean;
    scopeIsolation: boolean;
    promptInjectionResistance: boolean;
    resourceRequirements: boolean;
    licenseProvenance: boolean;
  };
  riskLevel: ProcedureRiskLevel;
  requiresHumanApproval: boolean;
  validatedAt: string;
}

export interface ProcedureProposal {
  id: string;
  demonstrationId: string;
  name: string;
  displayName: string;
  purpose: string;
  triggerPhrases: string[];
  requiredCapabilities: string[];
  requiredServices: string[];
  requiredApplications: string[];
  requiredPermissions: string[];
  inputs: ProcedureParameter[];
  outputs: ProcedureParameter[];
  assumptions: string[];
  steps: ProcedureStep[];
  checkpoints: string[];
  verificationConditions: string[];
  recoveryStrategies: string[];
  rollbackStrategy?: string;
  expectedArtifacts: string[];
  riskLevel: ProcedureRiskLevel;
  confidence: number;
  confidenceFactors: {
    observationQuality: number;
    structuredSourceCoverage: number;
    semanticConsistency: number;
    verificationCoverage: number;
    generalizationCertainty: number;
    ambiguity: number;
  };
  isGeneralizable: boolean;
  generalizationCaveats: string[];
  compilationTarget: ProcedureCompilationTarget;
  scope: DemonstrationScope;
  companyId?: string;
  projectId?: string;
  status: ProcedureProposalStatus;
  validationResult?: ProcedureValidationResult;
  provenance: string;
  sourceDemonstrationId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Learned Procedure Version ────────────────────────────────────────────────

export type LearnedProcedureStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'DEPRECATED'
  | 'ARCHIVED'
  | 'FAILED';

export interface LearnedProcedureExecutionRecord {
  executionId: string;
  learnedProcedureId: string;
  version: number;
  status: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'PAUSED';
  durationMs: number;
  deviations: string[];
  recoveryEvents: string[];
  userCorrections: string[];
  confidenceDelta: number;
  verificationResults: DemonstrationVerificationEvidence[];
  executedAt: string;
  executedBy?: string;
  missionId?: string;
}

export interface LearnedProcedureVersion {
  id: string;
  learnedProcedureId: string;
  version: number;
  displayName: string;
  description: string;
  proposalId: string;
  demonstrationId: string;
  compiledSkillId?: string;
  compiledWorkflowId?: string;
  compilationTarget: ProcedureCompilationTarget;
  status: LearnedProcedureStatus;
  riskLevel: ProcedureRiskLevel;
  confidence: number;
  validationResult: ProcedureValidationResult;
  approvalHistory: Array<{
    status: 'APPROVED' | 'REJECTED';
    by?: string;
    at: string;
    comment?: string;
  }>;
  executionHistory: LearnedProcedureExecutionRecord[];
  rollbackFromVersion?: number;
  scope: DemonstrationScope;
  companyId?: string;
  projectId?: string;
  provenance: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearnedProcedure {
  id: string;
  name: string;
  displayName: string;
  description: string;
  scope: DemonstrationScope;
  companyId?: string;
  projectId?: string;
  currentVersion: number;
  activeVersionId?: string;
  sourceDemonstrationIds: string[];
  triggerPhrases: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── SSE Events ───────────────────────────────────────────────────────────────

export type DemonstrationEventType =
  | 'demonstration.started'
  | 'demonstration.paused'
  | 'demonstration.resumed'
  | 'demonstration.stopped'
  | 'demonstration.action_observed'
  | 'demonstration.state_changed'
  | 'demonstration.checkpoint_added'
  | 'demonstration.annotation_added'
  | 'demonstration.analyzing'
  | 'demonstration.proposal_ready'
  | 'demonstration.validation_started'
  | 'demonstration.validation_completed'
  | 'demonstration.awaiting_approval'
  | 'demonstration.approved'
  | 'demonstration.rejected'
  | 'demonstration.compiled'
  | 'demonstration.execution_started'
  | 'demonstration.execution_completed'
  | 'demonstration.execution_failed'
  | 'demonstration.archived'
  | 'demonstration.correction_applied'
  | 'demonstration.sensitive_data_redacted';

export interface DemonstrationEvent {
  eventType: DemonstrationEventType;
  demonstrationId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ─── Rejection Reasons for Procedure Inference ────────────────────────────────

export type ProcedureRejectionReason =
  | 'ONE_OFF'
  | 'AMBIGUOUS'
  | 'UNSAFE'
  | 'INCOMPLETE'
  | 'CONTRADICTORY'
  | 'INSUFFICIENT_VERIFICATION'
  | 'SECRET_DEPENDENT'
  | 'UNAVAILABLE_RESOURCES'
  | 'TOO_FRAGILE'
  | 'NOT_GENERALIZABLE'
  | 'VALIDATION_FAILED'
  | 'USER_REJECTED';

export interface ProcedureRejection {
  reason: ProcedureRejectionReason;
  explanation: string;
  canRetryAfterCorrection: boolean;
}
