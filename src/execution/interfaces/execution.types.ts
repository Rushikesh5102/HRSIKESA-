/**
 * HṚṢĪKEŚA (हृषीकेश) — Persistent Distributed Execution & 24/7 Operations Fabric Types
 *
 * FP-19: Foundation Performance & Execution Block
 * Persistent, Distributed, Resumable Execution Platform
 */

export type RuntimeType =
  | 'LOCAL'
  | 'LAN_WORKER'
  | 'REMOTE_MACHINE'
  | 'REMOTE_BROWSER'
  | 'CLOUD_VM'
  | 'CLOUD_CONTAINER'
  | 'CLOUD_FUNCTION'
  | 'HOSTED_AGENT'
  | 'EXTERNAL_ENVIRONMENT';

export type WorkerStatus =
  | 'REGISTERING'
  | 'ONLINE'
  | 'BUSY'
  | 'IDLE'
  | 'DEGRADED'
  | 'DRAINING'
  | 'OFFLINE'
  | 'UNREACHABLE'
  | 'QUARANTINED'
  | 'RETIRED';

export type TrustLevel =
  | 'UNTRUSTED'
  | 'DISCOVERED'
  | 'REGISTERED'
  | 'AUTHORIZED'
  | 'TRUSTED'
  | 'QUARANTINED'
  | 'REVOKED';

export type JobState =
  | 'QUEUED'
  | 'ASSIGNED'
  | 'STARTING'
  | 'RUNNING'
  | 'CHECKPOINTING'
  | 'PAUSED'
  | 'WAITING'
  | 'BLOCKED'
  | 'MIGRATING'
  | 'RECOVERING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ORPHANED';

export type ExecutionScope =
  | 'GLOBAL'
  | 'PERSONAL'
  | 'COMPANY'
  | 'PROJECT'
  | 'CLIENT'
  | 'TASK';

export type ExecutionPolicyType =
  | 'LOCAL_ONLY'
  | 'LOCAL_PREFERRED'
  | 'LAN_PREFERRED'
  | 'REMOTE_ALLOWED'
  | 'CLOUD_ALLOWED'
  | 'CLOUD_ONLY'
  | 'CHEAPEST_AUTHORIZED'
  | 'FASTEST_AUTHORIZED'
  | 'PRIVATE_ONLY'
  | 'USER_APPROVAL_REQUIRED';

export type ArtifactStorageClass =
  | 'LOCAL_ONLY'
  | 'WORKER_LOCAL'
  | 'LAN_REPLICATED'
  | 'REMOTE_REPLICATED'
  | 'CLOUD_REPLICATED';

export type CloudProviderState =
  | 'CONFIGURED'
  | 'NOT_CONFIGURED'
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'QUOTA_UNKNOWN'
  | 'QUOTA_EXCEEDED'
  | 'POLICY_BLOCKED';

export type RecoveryStrategy =
  | 'RETRY'
  | 'RESUME'
  | 'REQUEUE'
  | 'MIGRATE'
  | 'ROLLBACK'
  | 'WAIT'
  | 'ESCALATE'
  | 'CANCEL';

export interface RuntimeGpuInfo {
  name: string;
  vendor?: string;
  vramMb?: number;
  vulkan?: boolean;
  cuda?: boolean;
  rocm?: boolean;
}

export interface ExecutionRuntime {
  id: string;
  name: string;
  type: RuntimeType;
  environmentId?: string;
  architecture: string;
  operatingSystem: string;
  cpuCores: number;
  memoryMb: number;
  gpu?: RuntimeGpuInfo;
  storageAvailableMb?: number;
  networkLocality: 'LOCAL' | 'LAN' | 'REMOTE' | 'CLOUD';
  installedSoftware: string[];
  availableModels: string[];
  supportedTools: string[];
  supportedEnvironments: string[];
  trustLevel: TrustLevel;
  costClass: 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH';
  availability: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'CONFIGURED' | 'NOT_CONFIGURED';
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastHeartbeat: string;
  currentLoad: number; // 0.0 - 1.0
  concurrency: number;
  maxConcurrency: number;
  authorizationScope: ExecutionScope;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionWorker {
  id: string;
  runtimeId: string;
  name: string;
  status: WorkerStatus;
  host: string;
  port?: number;
  capabilities: string[];
  resources: {
    cpuCores: number;
    memoryTotalMb: number;
    memoryFreeMb: number;
    memoryAvailableMb?: number;
    cpuUsagePercent?: number;
    gpu?: RuntimeGpuInfo;
    diskFreeMb?: number;
    diskAvailableGb?: number;
  };
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastHeartbeat: string;
  lastSeen: string;
  version: string;
  protocolVersion: string;
  softwareInventory: string[];
  modelInventory: string[];
  environmentAssociations: string[];
  trustLevel: TrustLevel;
  authorizationScope: ExecutionScope;
  currentWorkload: number;
  queuedWorkload: number;
  drainState: boolean;
  activeJobIds: string[];
  consecutiveMissedHeartbeats: number;
  missedHeartbeats?: number;
  metadata?: Record<string, unknown>;
  registeredAt: string;
  updatedAt: string;
}

export interface ResourceRequirements {
  minRamMb?: number;
  minCores?: number;
  requireGpu?: boolean;
  gpuBackend?: string;
  requiredModel?: string;
  maxDurationMs?: number;
}

export interface ExecutionJob {
  id: string;
  objective: string;
  taskType: string;
  priority: number; // 100=Interactive, 50=Normal, 10=Background
  state: JobState;
  scope: ExecutionScope;
  companyId?: string;
  projectId?: string;
  clientId?: string;
  missionId?: string;
  goalId?: string;
  workflowId?: string;
  stepIndex?: number;
  agentId?: string;
  assignedWorkerId?: string;
  assignedRuntimeId?: string;
  leaseToken?: string;
  fencingToken: number;
  idempotencyKey?: string;
  requiredCapabilities: string[];
  resourceRequirements?: ResourceRequirements;
  policy: ExecutionPolicyType;
  attempt?: number;
  retryCount?: number;
  maxAttempts?: number;
  maxRetries?: number;
  progress?: number; // 0.0 - 1.0
  inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  checkpointId?: string;
  errorMessage?: string;
  requiresApproval?: boolean;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  deadline?: string;
}

export interface JobLease {
  id: string;
  jobId: string;
  workerId: string;
  leaseToken: string;
  fencingToken: number;
  acquiredAt: string;
  expiresAt: string;
  renewedAt: string;
  releasedAt?: string;
  revoked: boolean;
}

export interface JobCheckpoint {
  id: string;
  jobId: string;
  stepNumber: number;
  stepName: string;
  stateSnapshot: Record<string, unknown>;
  completedActions: string[];
  pendingActions: string[];
  artifactIds: string[];
  memoryReferences: string[];
  toolState?: Record<string, unknown>;
  environmentState?: Record<string, unknown>;
  retryCount: number;
  verificationEvidence?: Record<string, unknown>;
  createdAt: string;
}

export interface ExecutionTrace {
  id: string;
  jobId: string;
  timestamp: string;
  eventType: string;
  fromState?: JobState;
  toState?: JobState;
  workerId?: string;
  fencingToken?: number;
  details?: Record<string, unknown>;
}

export interface ExecutionArtifact {
  id: string;
  jobId: string;
  name: string;
  filePath: string;
  checksumSha256: string;
  sizeBytes: number;
  mimeType: string;
  storageClass: ArtifactStorageClass;
  verified: boolean;
  replicationStatus: 'LOCAL' | 'PENDING' | 'REPLICATED' | 'FAILED';
  companyId?: string;
  scope?: ExecutionScope;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ExecutionPolicy {
  id: string;
  scope: ExecutionScope;
  companyId?: string;
  projectId?: string;
  policyType: ExecutionPolicyType;
  policy?: ExecutionPolicyType;
  maxCostPerJob?: number;
  maxCostUsd?: number;
  allowCloudPaid?: boolean;
  maxConcurrency: number;
  requireApprovalForPaid: boolean;
  allowedWorkerTypes: RuntimeType[];
  allowedRuntimeTypes?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerHeartbeatPayload {
  workerId: string;
  timestamp: string;
  status: WorkerStatus;
  cpuPercent: number;
  ramUsedMb: number;
  ramTotalMb: number;
  activeJobIds: string[];
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  loadScore: number;
}

export interface PlacementCandidateScore {
  worker: ExecutionWorker;
  runtime: ExecutionRuntime;
  score: number;
  localityBonus: number;
  capabilityMatch: boolean;
  resourceMatch: boolean;
  modelMatch: boolean;
  costScore: number;
  reason: string;
}

export interface CloudProviderDescriptor {
  id: string;
  name: string;
  providerType: 'AWS' | 'AZURE' | 'GCP' | 'OCI' | 'VPS' | 'CUSTOM';
  provider?: string;
  state: CloudProviderState;
  region?: string;
  configuredRegions?: string[];
  remainingQuota?: number; // undefined = unknown
  quotaStatus?: string;
  quotaResetTime?: string;
  supportedRuntimes: RuntimeType[];
  isPaid: boolean;
  costPerHourUsd?: number;
  costClass?: string;
  authAccountId?: string;
  metadata?: Record<string, unknown>;
  updatedAt?: string;
}

export interface PersistentOperationsSummary {
  timestamp: string;
  totalWorkers?: number;
  activeWorkersCount: number;
  onlineWorkersCount: number;
  onlineWorkers?: number;
  activeWorkers?: number;
  drainingWorkers?: number;
  degradedWorkers?: number;
  totalJobs?: number;
  activeJobsCount: number;
  activeJobs?: number;
  queuedJobsCount: number;
  queuedJobs?: number;
  recoveringJobsCount: number;
  failedJobsCount: number;
  failedJobs?: number;
  completedJobsCount: number;
  completedJobs?: number;
  localLoad: number; // 0.0 - 1.0
  remoteLoad: number; // 0.0 - 1.0
  cloudLoad: number; // 0.0 - 1.0
  estimatedCostTotalUsd: number;
  hasPersistentWorker24x7: boolean;
  cloudProviders: Array<{
    provider: string;
    state: string;
    quotaStatus?: string;
    configuredRegions?: string[];
    costClass?: string;
  }>;
  pools: {
    local: { total: number; online: number; busy: number; workers?: number; capacity?: number; activeJobs?: number };
    lan: { total: number; online: number; busy: number; workers?: number; capacity?: number; activeJobs?: number };
    remote: { total: number; online: number; busy: number; workers?: number; capacity?: number; activeJobs?: number };
    cloud: { total: number; online: number; busy: number; workers?: number; capacity?: number; activeJobs?: number };
  };
}
