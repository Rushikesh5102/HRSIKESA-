export interface HealthResponse {
  status: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface SystemStatusResponse {
  name: string;
  version: string;
  mode: string;
  status: string;
  subsystems: {
    memory: string;
    modelRouter: string;
    toolBus: string;
    agentRegistry: string;
    audit: string;
    eventBus: string;
    browser?: string;
    computer?: string;
    voice?: string;
    environment?: string;
  };
  hardware?: {
    os: {
      platform: string;
      release: string;
      arch: string;
      hostname: string;
    };
    cpu: {
      model: string;
      physicalCores: number;
      logicalProcessors: number;
      speedMhz: number;
    };
    memory: {
      totalBytes: number;
      freeBytes: number;
      totalGb: number;
      freeGb: number;
      usedPercentage: number;
      state: 'NORMAL' | 'LOW_MEMORY' | 'CRITICAL_MEMORY';
    };
    processMemory?: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
  metrics?: {
    cpuPercent?: number;
    freeMemMB?: number;
    totalMemMB?: number;
  };
}

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  description: string;
  status: 'IDLE' | 'RUNNING' | 'WAITING' | 'BLOCKED' | 'COMPLETED' | 'FAILED';
  capabilities: string[];
  currentTaskId?: string;
  currentMissionId?: string;
  taskCount?: number;
  lastActive?: string;
}

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'READY' | 'RUNNING' | 'WAITING' | 'BLOCKED' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRYING';
  assignedAgent?: string;
  missionId?: string;
  parentId?: string;
  dangerTier?: number;
  toolUsage?: string[];
  dependencies?: string[];
  retryCount?: number;
  maxRetries?: number;
  verificationStrategy?: {
    type: string;
    target?: string;
    expected?: string | number | boolean;
  };
  verificationResult?: {
    passed: boolean;
    details: string;
    verifiedAt: string;
  };
  result?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PlannedTaskInfo {
  id: string;
  title: string;
  objective: string;
  assignedAgentId: string;
  dependencies: string[];
  estimatedDangerTier: number;
}

export interface MissionPlanInfo {
  objective: string;
  tasks: PlannedTaskInfo[];
  constraints?: string[];
  successCriteria?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface MissionArtifactInfo {
  id: string;
  missionId: string;
  taskId?: string;
  name: string;
  type: string;
  location: string;
  verified: boolean;
  createdAt: string;
}

export interface MissionReportInfo {
  missionId: string;
  objective: string;
  status: string;
  summary: string;
  tasksCompleted: number;
  tasksFailed: number;
  tasksSkipped: number;
  tasksBlocked: number;
  agentsUsed: string[];
  toolsUsed: string[];
  artifacts: Array<{ name: string; type: string; location: string; verified: boolean }>;
  verificationsPassed: number;
  verificationsTotal: number;
  retriesTotal: number;
  approvalsTotal: number;
  executionTimeMs: number;
  completedAt: string;
}

export interface MissionInfo {
  id: string;
  title?: string;
  objective?: string;
  description?: string;
  status: 'PLANNING' | 'READY' | 'RUNNING' | 'WAITING' | 'BLOCKED' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PENDING' | string;
  currentAgent?: string;
  rootAgentId?: string;
  companyId?: string;
  projectId?: string;
  productId?: string;
  departmentId?: string;
  childTaskIds?: string[];
  progress?: number;
  plan?: MissionPlanInfo;
  report?: MissionReportInfo;
  blockedReason?: string;
  interventionRequest?: {
    type: string;
    description: string;
    requiresManualAction: boolean;
  };
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ToolInfo {
  name: string;
  description: string;
  dangerTier: number;
  parameters: Record<string, unknown>;
  category?: string;
  requiredPermissions?: string[];
  requiresApproval?: boolean;
}

export interface ApprovalRequest {
  id: string;
  toolName: string;
  dangerTier: number;
  agentId?: string;
  reason: string;
  params: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  timestamp: string;
}

export interface MemoryTierItem {
  id?: string;
  tier: number;
  tierName: string;
  key: string;
  content: string;
  source?: string;
  provenance?: 'explicit' | 'learned' | 'inferred';
  confidence?: number;
  updatedAt?: string;
}

export interface AppInfo {
  name: string;
  version?: string;
  path?: string;
  publisher?: string;
  isRegistered?: boolean;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent?: number;
  memoryMB?: number;
  isOwnedByHrisekesa?: boolean;
}

export interface EnvironmentStatusResponse {
  platform: string;
  arch: string;
  hostname: string;
  user: string;
  appsCount: number;
  processesCount: number;
  browserActive: boolean;
  activeBrowserTabs?: number;
}

export interface VoiceStatusResponse {
  available: boolean;
  stt: {
    active: boolean;
    model: string;
  };
  tts: {
    active: boolean;
    engine: string;
  };
  isListening: boolean;
  isSpeaking: boolean;
}

export interface ModelProviderInfo {
  provider: string;
  type: 'local' | 'cloud';
  configured: boolean;
  activeModel?: string;
  availableModels: string[];
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  dangerTier?: number;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'DENIED';
  details?: Record<string, unknown>;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  durationMs?: number;
  toolsUsed?: string[];
  error?: boolean;
  streaming?: boolean;
  metrics?: {
    ttfbMs?: number;
    ttftMs?: number;
    totalDurationMs?: number;
    spans?: Record<string, number>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 12: Semantic Memory Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MemoryIndexStatus {
  available: boolean;
  provider: string;
  modelId: string;
  dimensions: number;
  health: 'healthy' | 'degraded' | 'unavailable';
  indexed: number;
  failed: number;
  pending: number;
  unindexed: number;
  scalingNote: string;
  timestamp: string;
}

export interface SemanticSearchResult {
  item: MemoryTierItem;
  semanticSimilarity: number | null;
  hybridScore?: number;
  source: 'deterministic' | 'semantic' | 'both' | 'authoritative';
  scoreBreakdown?: {
    semantic: number;
    explicitness: number;
    confidence: number;
    recency: number;
  };
  rank?: number;
}

export interface MemorySearchResponse {
  success: boolean;
  mode: 'hybrid' | 'semantic' | 'deterministic';
  query: string;
  results: SemanticSearchResult[];
  totalResults: number;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Company & Project Operating System Types
// ─────────────────────────────────────────────────────────────────────────────

export type CompanyStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'SCALING'
  | 'RESTRUCTURING'
  | 'RETIRING'
  | 'RETIRED';

export interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  mission?: string;
  vision?: string;
  status: CompanyStatus;
  industry?: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ProjectInfo {
  id: string;
  companyId?: string | null;
  name: string;
  slug: string;
  description?: string;
  objective: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentInfo {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  leadAgentId?: string;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceAssignmentInfo {
  id: string;
  companyId: string;
  agentId: string;
  departmentId?: string | null;
  roleTitle?: string;
  status: 'active' | 'standby' | 'reassigned';
  joinedAt: string;
}

export type ProductType = 'product' | 'service';
export type ProductStatus =
  | 'IDEA'
  | 'RESEARCH'
  | 'DESIGN'
  | 'DEVELOPMENT'
  | 'QA'
  | 'LAUNCH_READY'
  | 'ACTIVE'
  | 'IMPROVING'
  | 'SUNSETTING'
  | 'RETIRED';

export interface ProductInfo {
  id: string;
  companyId: string;
  projectId?: string | null;
  name: string;
  description?: string;
  type: ProductType;
  status: ProductStatus;
  version: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type CustomerType = 'individual' | 'enterprise' | 'smb';
export type CustomerStatus =
  | 'PROSPECT'
  | 'LEAD'
  | 'QUALIFIED'
  | 'CONTRACTED'
  | 'ONBOARDING'
  | 'ACTIVE'
  | 'SUPPORT'
  | 'SUSPENDED'
  | 'CHURNED'
  | 'ARCHIVED';

export interface CustomerInfo {
  id: string;
  companyId: string;
  name: string;
  type: CustomerType;
  status: CustomerStatus;
  contactReference?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type DecisionStatus =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'RETIRED';

export interface DecisionInfo {
  id: string;
  companyId: string;
  projectId?: string | null;
  title: string;
  description?: string;
  decision: string;
  reasoning?: string;
  madeBy: string;
  status: DecisionStatus;
  supersedes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CompanyLifecycleStage =
  | 'market_need'
  | 'strategy_planning'
  | 'organization_setup'
  | 'customer_research'
  | 'product_design'
  | 'development'
  | 'quality_assurance'
  | 'marketing_sales'
  | 'contract_order'
  | 'fulfillment_delivery'
  | 'customer_onboarding'
  | 'billing_payment'
  | 'operations_monitoring'
  | 'continuous_improvement'
  | 'business_exit';

export interface LifecycleStageInfo {
  stage: CompanyLifecycleStage;
  displayName: string;
  description: string;
  responsibleAgentIds: string[];
  defaultNextStage?: CompanyLifecycleStage;
}

export interface CompanyOverviewInfo {
  company: CompanyInfo;
  activeProjectsCount: number;
  productsCount: number;
  customersCount: number;
  assignedAgentsCount: number;
  activeMissionsCount: number;
  recentDecisions: DecisionInfo[];
  departments: DepartmentInfo[];
  workforce: WorkforceAssignmentInfo[];
}

export interface ProjectOverviewInfo {
  project: ProjectInfo;
  company?: CompanyInfo;
  products: ProductInfo[];
  activeMissionsCount: number;
  recentDecisions: DecisionInfo[];
}

// =========================================================================
// Phase 15: Goal Engine Types
// =========================================================================

export type GoalStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'PLANNED'
  | 'AWAITING_APPROVAL'
  | 'EXECUTING'
  | 'BLOCKED'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PAUSED';

export type MilestoneStatus =
  | 'PENDING'
  | 'READY'
  | 'EXECUTING'
  | 'BLOCKED'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type GoalPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface GoalBudgetInfo {
  maxMissions: number;
  maxTasks: number;
  maxModelCalls: number;
  maxReplans: number;
  maxExecutionTimeMs: number;
  maxConcurrentTasks: number;
}

export interface GoalPlanMilestoneSpecInfo {
  id: string;
  title: string;
  description: string;
  sequence: number;
  requiredAgentIds: string[];
  requiredCapabilities: string[];
  successCriteria: string[];
  verificationCriteria: string[];
  missionObjective: string;
  requiresApproval: boolean;
  approvalReason?: string | null;
}

export interface GoalPlanInfo {
  interpretation: string;
  assumptions: string[];
  constraints: string[];
  requiredDepartments: string[];
  milestones: GoalPlanMilestoneSpecInfo[];
  approvalPoints: string[];
  stoppingConditions: string[];
  estimatedModelCalls: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  source: 'deterministic' | 'llm_validated';
}

export interface GoalCriterionResultInfo {
  criterion: string;
  passed: boolean;
  evidence: string;
  checkedAt: string;
}

export interface GoalVerificationInfo {
  goalId: string;
  verified: boolean;
  criteria: GoalCriterionResultInfo[];
  passedCriteria: string[];
  failedCriteria: string[];
  blockingIssues: string[];
  evidence: string[];
  verifiedAt: string;
}

export interface GoalReportInfo {
  goalId: string;
  title: string;
  objective: string;
  companyId?: string | null;
  projectId?: string | null;
  status: GoalStatus;
  startedAt: string;
  completedAt?: string;
  totalDurationMs: number;
  milestonesTotal: number;
  milestonesCompleted: number;
  milestonesFailed: number;
  missionsExecuted: number;
  modelCallsUsed: number;
  replansUsed: number;
  verified: boolean;
  verificationSummary?: string;
  keyArtifacts: string[];
  evidenceChain: Array<{
    milestoneId: string;
    milestoneTitle: string;
    missionId?: string;
    status: string;
    artifacts: string[];
  }>;
  lessonsLearned?: string[];
  summary: string;
}

export interface MilestoneInfo {
  id: string;
  goalId: string;
  sequence: number;
  title: string;
  description?: string;
  status: MilestoneStatus;
  missionId?: string | null;
  requiredAgentIds?: string[];
  requiredCapabilities?: string[];
  successCriteria?: string[];
  verificationCriteria?: string[];
  requiresApproval?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInfo {
  id: string;
  companyId?: string | null;
  projectId?: string | null;
  productId?: string | null;
  parentGoalId?: string | null;
  title: string;
  description?: string;
  objective: string;
  status: GoalStatus;
  priority: GoalPriority;
  deadline?: string | null;
  budget: GoalBudgetInfo;
  constraints?: string[];
  successCriteria?: string[];
  failureCriteria?: string[];
  verificationPlan?: string;
  plan?: GoalPlanInfo;
  report?: GoalReportInfo;
  verificationResult?: GoalVerificationInfo;
  blockedReason?: string | null;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgressInfo {
  goalId: string;
  status: GoalStatus;
  priority: GoalPriority;
  milestonesTotal: number;
  milestonesCompleted: number;
  milestonesFailed: number;
  currentMilestoneId?: string;
  currentMilestoneTitle?: string;
  currentMissionId?: string;
  blockers: string[];
  pendingApprovals: number;
  elapsedMs: number;
  budgetUsage: {
    missionsUsed: number;
    missionsMax: number;
    modelCallsUsed: number;
    modelCallsMax: number;
    replansUsed: number;
    replansMax: number;
  };
}

export interface CreateGoalPayload {
  title: string;
  description?: string;
  objective: string;
  companyId?: string;
  projectId?: string;
  productId?: string;
  priority?: GoalPriority;
  deadline?: string;
  budget?: Partial<GoalBudgetInfo>;
  constraints?: string[];
  successCriteria?: string[];
  failureCriteria?: string[];
  verificationPlan?: string;
}

export interface KnowledgeEntityInfo {
  id: string;
  type: string;
  canonicalName: string;
  displayName: string;
  description?: string;
  aliases: string[];
  scope: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeRelationshipInfo {
  id: string;
  sourceEntityId: string;
  relationshipType: string;
  targetEntityId: string;
  direction: 'DIRECTED' | 'UNDIRECTED';
  confidence: number;
  status: string;
  scope: string;
  validFrom?: string;
  validUntil?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeFactInfo {
  id: string;
  subjectEntityId: string;
  predicate: string;
  objectEntityId?: string;
  objectValue?: string;
  valueType: string;
  confidence: number;
  status: string;
  scope: string;
  validFrom?: string;
  validUntil?: string;
  observedAt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEvidenceInfo {
  id: string;
  factId: string;
  sourceType: string;
  sourceReference: string;
  quote?: string;
  location?: string;
  sourceDate?: string;
  retrievedAt: string;
  credibility: string;
  confidence: number;
  provenance: string;
}

export interface KnowledgeContradictionInfo {
  id: string;
  existingFactId: string;
  conflictingFactId: string;
  subjectEntityId: string;
  predicate: string;
  explanation: string;
  status: string;
  resolutionStrategy?: string;
  resolvedFactId?: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  scope: string;
  status: string;
  confidence?: number;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  confidence: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  depth?: number;
}

export interface KnowledgeTimelineItem {
  id: string;
  timestamp: string;
  type: 'FACT' | 'RELATIONSHIP' | 'FACT_SUPERSEDED' | 'CONTRADICTION';
  title: string;
  description: string;
  entityId?: string;
  scope: string;
  confidence?: number;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeSearchResult {
  query: string;
  entities: KnowledgeEntityInfo[];
  facts: KnowledgeFactInfo[];
  relationships: KnowledgeRelationshipInfo[];
  contradictions: KnowledgeContradictionInfo[];
  contextSummary?: string;
}

// Phase 20: Skills & Procedural Intelligence
export interface SkillStepInfo {
  stepId: string;
  name: string;
  description: string;
  stepType: string;
  stepIndex: number;
  dependencies: string[];
  capability?: string;
  tool?: string;
  agentId?: string;
  inputs?: Record<string, unknown>;
  outputs?: string[];
  verification?: {
    type: string;
    target: string;
    expectedValue?: any;
    deterministicRule?: string;
  };
  timeoutMs?: number;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
    retryableErrors?: string[];
  };
}

export interface SkillPermissionsInfo {
  maxDangerTier: number;
  requiredCapabilities: string[];
  requiredTools: string[];
  requiresHumanApproval: boolean;
  allowedScopes: string[];
}

export interface SkillInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'DEPRECATED' | 'ARCHIVED';
  category: string;
  riskLevel: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
  owner: string;
  scope: string;
  companyId?: string;
  projectId?: string;
  triggerPhrases?: string[];
  requiredCapabilities: string[];
  requiredTools: string[];
  inputsSchema: Record<string, unknown>;
  outputsSchema: Record<string, unknown>;
  steps: SkillStepInfo[];
  permissions: SkillPermissionsInfo;
  composedSkills?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillUsageInfo {
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

export interface SkillStatisticsInfo {
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

export interface SkillImprovementInfo {
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

export interface SkillPreviewInfo {
  skillName: string;
  version: string;
  stepCount: number;
  requiredCapabilities: string[];
  requiredTools: string[];
  riskLevel: string;
  requiresHumanApproval: boolean;
  inputs: Record<string, unknown>;
  expectedOutputs: string[];
  procedureSteps: Array<{
    stepId: string;
    name: string;
    stepType: string;
    tool?: string;
    capability?: string;
  }>;
}

export interface SkillMatchCandidate {
  skill: SkillInfo;
  confidence: number;
  reason: string;
  matchedCapabilities: string[];
  missingCapabilities: string[];
  isAmbiguous?: boolean;
}
