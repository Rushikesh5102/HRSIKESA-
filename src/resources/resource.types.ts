/**
 * HṚṢĪKEŚA (हृषीकेश) — Distributed Resource Fabric & Execution Capacity Types
 *
 * FP-03: Foundation Performance & Execution Block
 * Distributed Local/LAN Resource Fabric & Execution Capacity
 */

export type WorkerType = 'LOCAL' | 'LAN' | 'REMOTE' | 'CLOUD';

export type WorkerStatus =
  | 'REGISTERING'
  | 'ONLINE'
  | 'BUSY'
  | 'DEGRADED'
  | 'DRAINING'
  | 'DRAINED'
  | 'OFFLINE'
  | 'UNHEALTHY'
  | 'BLOCKED'
  | 'REVOKED';

export type TrustLevel = 'TRUSTED' | 'ENROLLED' | 'PROVISIONAL' | 'BLOCKED' | 'REVOKED';

export type WorkerPrivacyLevel = 'PUBLIC' | 'PRIVATE' | 'HIGHLY_PRIVATE' | 'SOVEREIGN_LOCAL';

export type TaskQueueStatus =
  | 'QUEUED'
  | 'PLACED'
  | 'DISPATCHING'
  | 'RUNNING'
  | 'PAUSED'
  | 'CANCELLING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'REQUEUED';

export interface WorkerCpuInfo {
  readonly model: string;
  readonly physicalCores: number;
  readonly logicalProcessors: number;
  readonly speedMhz?: number;
}

export interface WorkerMemoryInfo {
  readonly totalBytes: number;
  readonly freeBytes: number;
  readonly availableBytes?: number;
}

export interface WorkerGpuInfo {
  readonly name: string;
  readonly vendor: string;
  readonly vramBytes?: number;
  readonly vulkanSupported?: boolean;
  readonly cudaSupported?: boolean;
  readonly rocmSupported?: boolean;
}

export interface WorkerResourceLimits {
  readonly maxConcurrentTasks: number;
  readonly maxRamBytes?: number;
  readonly maxCpuPercent?: number;
  readonly allowGpu?: boolean;
  readonly allowedWorkloads?: readonly string[];
}

export interface WorkerCapability {
  readonly capabilityId: string;
  readonly version: string;
  readonly available: boolean;
  readonly metadata?: Record<string, unknown>;
  readonly securityLevel?: 'SAFE' | 'CONTROLLED' | 'RESTRICTED';
}

export interface Worker {
  readonly id: string;
  name: string;
  readonly type: WorkerType;
  status: WorkerStatus;
  host: string;
  port?: number;
  readonly platform: string;
  readonly architecture: string;
  cpu: WorkerCpuInfo;
  memory: WorkerMemoryInfo;
  gpu: WorkerGpuInfo;
  gpuBackend?: string;
  models: string[];
  residentModels?: string[];
  capabilities: WorkerCapability[];
  environmentIds?: string[];
  priority: number;
  trustLevel: TrustLevel;
  registeredAt: string;
  lastHeartbeat: string;
  lastSeen: string;
  loadScore: number;
  resourceLimits?: WorkerResourceLimits;
  readonly protocolVersion: string;
  readonly version: string;
  authTokenHash?: string;
  metadata?: Record<string, unknown>;
}

export interface ResourceSnapshot {
  readonly id: string;
  readonly workerId: string;
  readonly cpuUsage: number; // 0.0 - 100.0%
  readonly ramUsedBytes: number;
  readonly ramTotalBytes: number;
  readonly gpuUtilization?: number; // 0.0 - 100.0% or undefined if unavailable
  readonly gpuMemoryUsedBytes?: number;
  readonly activeTasks: number;
  readonly queueDepth: number;
  readonly timestamp: string;
}

export interface ResourceRequirements {
  readonly minRamBytes?: number;
  readonly minCores?: number;
  readonly requireGpu?: boolean;
  readonly gpuBackend?: string;
  readonly requiredModel?: string;
  readonly preferResidentModel?: boolean;
  readonly estimatedDurationMs?: number;
}

export interface WorkerTask {
  readonly id: string;
  readonly taskType: string;
  readonly priority: number; // Higher number = higher priority (e.g. 100=Interactive, 50=Normal, 10=Background)
  status: TaskQueueStatus;
  readonly privacyLevel: WorkerPrivacyLevel;
  readonly requiredCapabilities: readonly string[];
  readonly resourceRequirements?: ResourceRequirements;
  preferredWorkerId?: string;
  assignedWorkerId?: string;
  attempt: number;
  progress: number; // 0.0 - 1.0
  readonly idempotencyKey?: string;
  readonly inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
  placementReason?: string;
  readonly createdAt: string;
  startedAt?: string;
  completedAt?: string;
  deadline?: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface PlacementCandidate {
  readonly worker: Worker;
  readonly eligible: boolean;
  readonly rejectionReason?: string;
  readonly score: number;
  readonly factors: Record<string, number>;
  readonly isSaturated?: boolean;
  readonly activeTasks?: number;
  readonly maxConcurrentTasks?: number;
}

export interface PlacementDecision {
  readonly taskId: string;
  readonly selectedWorkerId: string;
  readonly selectedWorkerName: string;
  readonly score: number;
  readonly reason: string;
  readonly candidates: readonly PlacementCandidate[];
  readonly allEligibleSaturated?: boolean;
  readonly timestamp: string;
}

export type ProtocolMessageType =
  | 'REGISTER'
  | 'REGISTER_ACK'
  | 'HEARTBEAT'
  | 'RESOURCE_UPDATE'
  | 'TASK_SUBMIT'
  | 'TASK_ACCEPTED'
  | 'TASK_STARTED'
  | 'TASK_PROGRESS'
  | 'TASK_OUTPUT'
  | 'TASK_ARTIFACT'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_CANCEL'
  | 'TASK_CANCELLED'
  | 'WORKER_DRAIN'
  | 'WORKER_SHUTDOWN';

export interface WorkerProtocolMessage<T = unknown> {
  readonly messageId: string;
  readonly protocolVersion: string;
  readonly type: ProtocolMessageType;
  readonly timestamp: string;
  readonly workerId: string;
  readonly taskId?: string;
  readonly correlationId?: string;
  readonly payload: T;
}

export interface EnrollmentToken {
  readonly token?: string; // Only present upon immediate creation
  readonly tokenHash: string;
  readonly name: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  usedAt?: string;
  revoked: boolean;
  metadata?: Record<string, unknown>;
}

export interface ArtifactRecord {
  readonly artifactId: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly sha256Hash: string;
  readonly mimeType: string;
  readonly sourceWorkerId: string;
  readonly destinationPath: string;
  readonly createdAt: string;
}

export interface ResourceFabricOverview {
  readonly totalWorkers: number;
  readonly onlineWorkers: number;
  readonly busyWorkers: number;
  readonly offlineWorkers: number;
  readonly totalCores: number;
  readonly totalRamBytes: number;
  readonly usedRamBytes: number;
  readonly activeTasksCount: number;
  readonly queueDepth: number;
  readonly localWorkerId: string;
  readonly timestamp: string;
  readonly modelInventory?: Record<string, number>;
  readonly activeTasksPerWorker?: Record<string, number>;
}
