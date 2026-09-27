/**
 * HṚṢĪKEŚA (हृषीकेश) — Native Universal Workflow & Automation Engine
 * 
 * FP-11 Domain Model Types:
 * Workflows, Versions, Nodes, Edges, Triggers, Runs, Approvals, Checkpoints, Variables, Artifacts.
 */

export type WorkflowStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'DISABLED'
  | 'ARCHIVED'
  | 'DEPRECATED';

export type WorkflowRunStatus =
  | 'QUEUED'
  | 'STARTING'
  | 'RUNNING'
  | 'WAITING'
  | 'WAITING_APPROVAL'
  | 'PAUSED'
  | 'RETRYING'
  | 'RECOVERING'
  | 'BLOCKED'
  | 'NEEDS_USER'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';

export type WorkflowNodeStatus =
  | 'PENDING'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RETRYING'
  | 'SKIPPED'
  | 'BLOCKED'
  | 'CANCELLED';

export type WorkflowNodeType =
  | 'TRIGGER'
  | 'ACTION'
  | 'AGENT'
  | 'SKILL'
  | 'CAPABILITY'
  | 'MODEL'
  | 'MISSION'
  | 'GOAL'
  | 'SUBWORKFLOW'
  | 'CONDITION'
  | 'SWITCH'
  | 'PARALLEL'
  | 'JOIN'
  | 'LOOP'
  | 'WAIT'
  | 'APPROVAL'
  | 'TRANSFORM'
  | 'RESEARCH'
  | 'CODE'
  | 'TEST'
  | 'VERIFY'
  | 'NOTIFY'
  | 'REPORT'
  | 'END';

export type WorkflowTriggerType =
  | 'MANUAL'
  | 'SCHEDULE'
  | 'INTERVAL'
  | 'CRON'
  | 'EVENT'
  | 'WEBHOOK'
  | 'FILE_EVENT'
  | 'TASK_COMPLETED'
  | 'GOAL_COMPLETED'
  | 'MISSION_COMPLETED'
  | 'AGENT_EVENT'
  | 'RESEARCH_COMPLETED'
  | 'GITHUB_EVENT'
  | 'PROJECT_EVENT'
  | 'COMPANY_EVENT'
  | 'RESOURCE_EVENT'
  | 'SYSTEM_EVENT';

export type WorkflowScope = 'GLOBAL' | 'COMPANY' | 'PROJECT' | 'PERSONAL';

export type JoinStrategy = 'ALL' | 'ANY' | 'QUORUM';

export interface WorkflowRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export interface WorkflowResourceLimits {
  maxDurationSeconds?: number;
  maxMemoryMb?: number;
  maxModelCalls?: number;
  maxToolCalls?: number;
  requiresLocalInference?: boolean;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: WorkflowNodeType;
  description?: string;
  config: Record<string, any>;
  retryPolicy?: WorkflowRetryPolicy;
  resourceLimits?: WorkflowResourceLimits;
  compensationNodeId?: string;
  isTerminal?: boolean;
}

export interface WorkflowEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  condition?: string; // Safe deterministic expression, e.g. "{{test.passed == true}}"
  label?: string;
  isDefault?: boolean;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'datetime' | 'artifact_ref' | 'entity_ref' | 'task_ref' | 'workflow_ref';
  value: any;
  description?: string;
  isSecret?: boolean;
}

export interface WorkflowTrigger {
  id: string;
  workflowId: string;
  type: WorkflowTriggerType;
  config: {
    eventPattern?: string;
    cronExpression?: string;
    intervalSeconds?: number;
    webhookPath?: string;
    webhookSecret?: string;
    signatureHeader?: string;
    filterCondition?: string;
    filePaths?: string[];
    [key: string]: any;
  };
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  scope: WorkflowScope;
  companyId?: string;
  projectId?: string;
  status: WorkflowStatus;
  activeVersion: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  description: string;
  graph: WorkflowGraph;
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  requiredCapabilities?: string[];
  requiredSkills?: string[];
  requiredAgents?: string[];
  requiredPermissions?: string[];
  timeoutSeconds: number;
  maxRetries: number;
  financialApprovalRequired?: boolean;
  createdAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  versionId: string;
  versionNumber: number;
  status: WorkflowRunStatus;
  triggerType: WorkflowTriggerType;
  triggerPayload: Record<string, any>;
  inputVariables: Record<string, any>;
  currentVariables: Record<string, any>;
  activeNodeIds: string[];
  completedNodeIds: string[];
  failedNodeIds: string[];
  iterationCounts: Record<string, number>; // For LOOP nodes
  startedAt: string;
  completedAt?: string;
  pausedAt?: string;
  errorMessage?: string;
  failureReason?: string;
  resourceUsage: {
    cpuPercent?: number;
    memoryMb?: number;
    modelCalls: number;
    toolCalls: number;
    durationMs: number;
  };
  checkpointId?: string;
  companyId?: string;
  projectId?: string;
}

export interface WorkflowRunNode {
  id: string;
  runId: string;
  nodeId: string;
  nodeName: string;
  nodeType: WorkflowNodeType;
  attemptNumber: number;
  status: WorkflowNodeStatus;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  agentId?: string;
  modelId?: string;
  capabilityId?: string;
  toolCalls: number;
  artifacts: string[]; // references
}

export interface WorkflowApproval {
  id: string;
  runId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  prompt: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  payloadSummary: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  respondedAt?: string;
  decidedBy?: string;
  comments?: string;
}

export interface WorkflowCheckpoint {
  id: string;
  runId: string;
  nodeId: string;
  idempotencyKey: string;
  stateSnapshot: {
    status: WorkflowRunStatus;
    variables: Record<string, any>;
    activeNodeIds: string[];
    completedNodeIds: string[];
    iterationCounts: Record<string, number>;
    resourceUsage: WorkflowRun['resourceUsage'];
  };
  createdAt: string;
}

export interface WorkflowArtifact {
  id: string;
  runId: string;
  nodeId: string;
  name: string;
  type: string;
  path?: string;
  uri?: string;
  sizeBytes: number;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface WorkflowSchedule {
  id: string;
  workflowId: string;
  triggerId: string;
  scheduleType: string;
  cronExpression?: string;
  intervalSeconds?: number;
  enabled: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredApprovals: string[];
  requiredCapabilities: string[];
  requiredSkills: string[];
  requiredAgents: string[];
}

export interface CompiledWorkflow {
  version: WorkflowVersion;
  adjacencyList: Map<string, Array<{ toNodeId: string; condition?: string; isDefault?: boolean }>>;
  reverseAdjacencyList: Map<string, string[]>;
  nodeMap: Map<string, WorkflowNode>;
  entryNodeIds: string[];
  terminalNodeIds: string[];
  validation: WorkflowValidationResult;
}
