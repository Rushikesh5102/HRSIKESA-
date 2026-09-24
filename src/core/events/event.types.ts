/**
 * HṚṢĪKEŚA (हृषीकेश) — Typed Event System Definitions
 */

export interface SystemStartedPayload {
  readonly timestamp: string;
  readonly version: string;
  readonly host: string;
  readonly port: number;
}

export interface SystemReadyPayload {
  readonly timestamp: string;
  readonly activeProvidersCount: number;
  readonly activeModelsCount: number;
}

export interface SystemShutdownPayload {
  readonly timestamp: string;
  readonly reason: string;
  readonly uptimeSeconds: number;
}

export interface ModelRegisteredPayload {
  readonly providerId: string;
  readonly modelId: string;
  readonly displayName: string;
  readonly isLocal: boolean;
}

export interface ModelRequestStartedPayload {
  readonly requestId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly promptPreview: string;
}

export interface ModelRequestCompletedPayload {
  readonly requestId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly durationMs: number;
  readonly totalTokens?: number;
}

export interface ModelRequestFailedPayload {
  readonly requestId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly error: string;
  readonly durationMs: number;
}

export interface ToolRegisteredPayload {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly riskLevel: number;
}

export interface ToolUnregisteredPayload {
  readonly id: string;
}

export interface ToolApprovalRequestedPayload {
  readonly approvalId: string;
  readonly toolId: string;
  readonly riskLevel: number;
  readonly expiresAt: string;
}

export interface ToolApprovalResolvedPayload {
  readonly approvalId: string;
  readonly status: string;
  readonly resolvedBy: string;
  readonly reason?: string;
}

export interface ToolExecutionStartedPayload {
  readonly requestId: string;
  readonly toolId: string;
  readonly userId: string;
}

export interface ToolExecutionCompletedPayload {
  readonly requestId: string;
  readonly toolId: string;
  readonly success: boolean;
  readonly durationMs: number;
}

export interface ToolExecutedAuditedPayload {
  readonly id: string;
  readonly toolId: string;
  readonly status: string;
  readonly durationMs: number;
}

export interface AgentRegisteredPayload {
  readonly agentId: string;
  readonly role: string;
}

export interface AgentUnregisteredPayload {
  readonly agentId: string;
}

export interface AgentStatusChangedPayload {
  readonly agentId: string;
  readonly status: string;
}

export interface AgentTaskStartedPayload {
  readonly taskId: string;
  readonly agentId: string;
}

export interface AgentTaskCompletedPayload {
  readonly taskId: string;
  readonly agentId: string;
}

export interface AgentTaskFailedPayload {
  readonly taskId: string;
  readonly agentId: string;
  readonly error?: string;
}

export interface AgentTaskDelegatedPayload {
  readonly parentTaskId: string;
  readonly childTaskId: string;
  readonly toAgentId: string;
  readonly depth: number;
}

export interface AgentTaskResolvedPayload {
  readonly taskId: string;
  readonly status: string;
}

export interface MissionCreatedPayload {
  readonly missionId: string;
  readonly rootAgentId: string;
}

export interface MissionPlanningPayload {
  readonly missionId: string;
  readonly objective: string;
}

export interface MissionStartedPayload {
  readonly missionId: string;
}

export interface MissionTaskReadyPayload {
  readonly missionId: string;
  readonly taskId: string;
  readonly agentId: string;
}

export interface MissionTaskStartedPayload {
  readonly missionId: string;
  readonly taskId: string;
  readonly agentId: string;
}

export interface MissionTaskCompletedPayload {
  readonly missionId: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly resultSummary?: string;
}

export interface MissionTaskFailedPayload {
  readonly missionId: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly error: string;
  readonly retrying?: boolean;
}

export interface MissionTaskRetryingPayload {
  readonly missionId: string;
  readonly taskId: string;
  readonly retryCount: number;
  readonly maxRetries: number;
}

export interface MissionVerificationStartedPayload {
  readonly missionId: string;
  readonly taskId: string;
  readonly strategyType: string;
}

export interface MissionVerificationCompletedPayload {
  readonly missionId: string;
  readonly taskId: string;
  readonly passed: boolean;
  readonly details?: string;
}

export interface MissionBlockedPayload {
  readonly missionId: string;
  readonly taskId?: string;
  readonly approvalId?: string;
  readonly reason: string;
}

export interface MissionResumedPayload {
  readonly missionId: string;
  readonly resolution?: string;
}

export interface MissionReplannedPayload {
  readonly missionId: string;
  readonly newTasksCount: number;
}

export interface MissionCompletedPayload {
  readonly missionId: string;
  readonly status: string;
}

export interface MissionFailedPayload {
  readonly missionId: string;
  readonly error: string;
}

export interface MissionCancelledPayload {
  readonly missionId: string;
  readonly reason?: string;
}

export interface MissionArtifactCreatedPayload {
  readonly missionId: string;
  readonly taskId: string;
  readonly artifactId: string;
  readonly name: string;
  readonly type: string;
}

export interface GoalCreatedPayload {
  readonly goalId: string;
  readonly title: string;
  readonly priority: string;
}

export interface GoalPlannedPayload {
  readonly goalId: string;
  readonly milestonesCount: number;
  readonly verificationStrategy?: string;
}

export interface GoalStartedPayload {
  readonly goalId: string;
}

export interface GoalVerifyingPayload {
  readonly goalId: string;
}

export interface GoalCompletedPayload {
  readonly goalId: string;
  readonly executionTimeMs: number;
}

export interface GoalFailedPayload {
  readonly goalId: string;
  readonly reason: string;
}

export interface GoalAwaitingApprovalPayload {
  readonly goalId: string;
  readonly count?: number;
  readonly reason?: string;
}

export interface GoalPausedPayload {
  readonly goalId: string;
}

export interface GoalReplannedPayload {
  readonly goalId: string;
  readonly milestoneId?: string;
  readonly newMilestonesCount: number;
}

export interface GoalCancelledPayload {
  readonly goalId: string;
}

export interface MilestoneStartedPayload {
  readonly goalId: string;
  readonly milestoneId: string;
  readonly title: string;
}

export interface MilestoneCompletedPayload {
  readonly goalId: string;
  readonly milestoneId: string;
  readonly title: string;
  readonly missionId?: string;
}

export interface MilestoneBlockedPayload {
  readonly goalId: string;
  readonly milestoneId: string;
  readonly title: string;
  readonly reason?: string;
}

// Phase 16 Payloads
export interface ObjectiveEvaluatedPayload {
  readonly goalId: string;
  readonly healthState: string;
  readonly decision: string;
  readonly timestamp: string;
}

export interface ScheduleEventPayload {
  readonly scheduleId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
}

export interface CapabilityEventPayload {
  readonly capabilityId: string;
  readonly action?: string;
  readonly success?: boolean;
  readonly timestamp: string;
}

export interface ResourcePressurePayload {
  readonly state: string;
  readonly freeMemoryGb: number;
  readonly timestamp: string;
}

export interface RecoveryEventPayload {
  readonly recoveredTasks: number;
  readonly recoveredMissions: number;
  readonly timestamp: string;
}

export interface EventMap {
  'system.started': SystemStartedPayload;
  'system.ready': SystemReadyPayload;
  'system.shutdown': SystemShutdownPayload;
  'model.registered': ModelRegisteredPayload;
  'model.request.started': ModelRequestStartedPayload;
  'model.request.completed': ModelRequestCompletedPayload;
  'model.request.failed': ModelRequestFailedPayload;
  'tool.registered': ToolRegisteredPayload;
  'tool.unregistered': ToolUnregisteredPayload;
  'tool.approval.requested': ToolApprovalRequestedPayload;
  'tool.approval.resolved': ToolApprovalResolvedPayload;
  'tool.execution.started': ToolExecutionStartedPayload;
  'tool.execution.completed': ToolExecutionCompletedPayload;
  'tool.executed.audited': ToolExecutedAuditedPayload;
  'agent.registered': AgentRegisteredPayload;
  'agent.unregistered': AgentUnregisteredPayload;
  'agent.status_changed': AgentStatusChangedPayload;
  'agent.task_started': AgentTaskStartedPayload;
  'agent.task_completed': AgentTaskCompletedPayload;
  'agent.task_failed': AgentTaskFailedPayload;
  'agent.task_delegated': AgentTaskDelegatedPayload;
  'agent.task_resolved': AgentTaskResolvedPayload;
  'mission.created': MissionCreatedPayload;
  'mission.planning': MissionPlanningPayload;
  'mission.started': MissionStartedPayload;
  'mission.task.ready': MissionTaskReadyPayload;
  'mission.task.started': MissionTaskStartedPayload;
  'mission.task.completed': MissionTaskCompletedPayload;
  'mission.task.failed': MissionTaskFailedPayload;
  'mission.task.retrying': MissionTaskRetryingPayload;
  'mission.verification.started': MissionVerificationStartedPayload;
  'mission.verification.completed': MissionVerificationCompletedPayload;
  'mission.blocked': MissionBlockedPayload;
  'mission.resumed': MissionResumedPayload;
  'mission.replanned': MissionReplannedPayload;
  'mission.completed': MissionCompletedPayload;
  'mission.failed': MissionFailedPayload;
  'mission.cancelled': MissionCancelledPayload;
  'mission.artifact.created': MissionArtifactCreatedPayload;
  'goal.created': GoalCreatedPayload;
  'goal.planned': GoalPlannedPayload;
  'goal.started': GoalStartedPayload;
  'goal.verifying': GoalVerifyingPayload;
  'goal.completed': GoalCompletedPayload;
  'goal.failed': GoalFailedPayload;
  'goal.awaiting_approval': GoalAwaitingApprovalPayload;
  'goal.paused': GoalPausedPayload;
  'goal.replanned': GoalReplannedPayload;
  'goal.cancelled': GoalCancelledPayload;
  'milestone.started': MilestoneStartedPayload;
  'milestone.completed': MilestoneCompletedPayload;
  'milestone.blocked': MilestoneBlockedPayload;
  // Phase 16 Lifecycle events
  'objective.created': GoalCreatedPayload;
  'objective.started': GoalStartedPayload;
  'objective.evaluated': ObjectiveEvaluatedPayload;
  'objective.waiting': ObjectiveEvaluatedPayload;
  'objective.blocked': MilestoneBlockedPayload;
  'objective.needs_approval': GoalAwaitingApprovalPayload;
  'objective.resumed': GoalStartedPayload;
  'objective.replanned': GoalReplannedPayload;
  'objective.progress': ObjectiveEvaluatedPayload;
  'objective.completed': GoalCompletedPayload;
  'objective.failed': GoalFailedPayload;
  'objective.cancelled': GoalCancelledPayload;
  'schedule.created': ScheduleEventPayload;
  'schedule.triggered': ScheduleEventPayload;
  'schedule.paused': ScheduleEventPayload;
  'schedule.resumed': ScheduleEventPayload;
  'schedule.cancelled': ScheduleEventPayload;
  'capability.registered': CapabilityEventPayload;
  'capability.executed': CapabilityEventPayload;
  'resource.governance.pressure': ResourcePressurePayload;
  'recovery.started': RecoveryEventPayload;
  'recovery.completed': RecoveryEventPayload;
  // Phase 19 Knowledge Graph events
  'entity.created': { entityId: string; canonicalName: string; entityType: string };
  'relationship.created': { id: string; type: string };
  'fact.created': { id: string; predicate: string };
  'fact.updated': { id: string; status: string };
  'contradiction.detected': { contradiction: unknown };
  'knowledge.consolidated': { report: unknown };
  // Phase 20 Skills & Procedural Intelligence events
  'skill.created': { skillId: string; name: string; version: string };
  'skill.updated': { skillId: string; name: string; version: string };
  'skill.enabled': { skillId: string };
  'skill.disabled': { skillId: string };
  'skill.execution.started': { executionId: string; skillId: string; version: string };
  'skill.execution.step': { executionId: string; skillId: string; stepId: string; stepName: string };
  'skill.execution.paused': { executionId: string; skillId: string; reason?: string };
  'skill.execution.completed': { executionId: string; skillId: string; durationMs: number };
  'skill.execution.failed': { executionId: string; skillId: string; error: string };
  'skill.approval.required': { executionId: string; skillId: string; reason: string; riskLevel: string };
  'skill.improvement.proposed': { proposalId: string; skillId: string; reason: string };
  // Phase 21 Dynamic MCP & Capability Ecosystem events
  'mcp.server.discovered': { serverId: string; name: string; source: string };
  'mcp.server.validating': { serverId: string; name: string };
  'mcp.server.approval_required': { serverId: string; name: string; riskScore: number; reason: string };
  'mcp.server.authorized': { serverId: string; name: string; authorizedBy: string };
  'mcp.server.started': { serverId: string; name: string; pid?: number };
  'mcp.server.stopped': { serverId: string; name: string; reason?: string };
  'mcp.server.crashed': { serverId: string; name: string; exitCode?: number; error?: string };
  'mcp.server.updated': { serverId: string; name: string; version: string };
  'mcp.server.revoked': { serverId: string; name: string; reason: string };
  'capability.discovered': { capabilityId: string; provider: string; serverId?: string };
  'capability.enabled': { capabilityId: string; provider?: string };
  'capability.disabled': { capabilityId: string; reason?: string };
  'capability.health_changed': { capabilityId: string; previousStatus: string; currentStatus: string };
  // Phase 22 Advanced Computer Operator events
  'computer.observation': { taskId?: string; activeWindow?: string; nodeCount: number; timestamp: string };
  'computer.action.planned': { taskId: string; actionCount: number; intent: string };
  'computer.action.started': { taskId: string; actionId: string; actionType: string; target?: string };
  'computer.action.completed': { taskId: string; actionId: string; actionType: string; durationMs: number };
  'computer.action.failed': { taskId: string; actionId: string; error: string; classification?: string };
  'computer.verification': { taskId: string; actionId: string; strategy: string; verified: boolean; evidence: string };
  'computer.recovery': { taskId: string; failure: string; strategy: string; success: boolean };
  'computer.approval_required': { taskId: string; actionId: string; reason: string; riskTier: string };
  'computer.window_changed': { previousWindow?: string; currentWindow: string; processId: number };
  'computer.application_changed': { previousApp?: string; currentApp: string };
  'computer.task.paused': { taskId: string; reason: string };
  'computer.task.resumed': { taskId: string };
  // Phase 23 External / Enterprise Environments events
  'environment.discovered': { environmentId: string; name?: string; type?: string; hostname?: string };
  'environment.validating': { environmentId: string; name?: string };
  'environment.authorization_required': { environmentId: string; name?: string; reason?: string };
  'environment.authorized': { environmentId: string; name?: string; trustLevel?: string; authorizedBy?: string };
  'environment.connecting': { environmentId: string; name?: string };
  'environment.connected': { environmentId: string; name?: string; sessionId?: string };
  'environment.disconnected': { environmentId: string; name?: string; reason?: string };
  'environment.failed': { environmentId: string; name?: string; error?: string; health?: any };
  'environment.degraded': { environmentId: string; name?: string; reason?: string; health?: any };
  'environment.revoked': { environmentId: string; name?: string; reason?: string };
  'session.created': { sessionId: string; environmentId: string; sessionType?: string };
  'session.closed': { sessionId: string; environmentId: string; reason?: string };
  'session.failed': { sessionId: string; environmentId: string; error?: string };
  // Phase 24 Multimodal Vision + Advanced Voice events
  'voice.listening': { sessionId?: string; timestamp: string };
  'voice.transcription_started': { sessionId?: string; timestamp: string };
  'voice.transcription_partial': { sessionId?: string; partialText: string; confidence: number };
  'voice.transcription_final': { sessionId?: string; finalText: string; confidence: number; language: string };
  'voice.playback_started': { sessionId?: string; text: string; timestamp: string };
  'voice.playback_stopped': { sessionId?: string; timestamp: string };
  'voice.interrupted': { sessionId?: string; reason: string; timestamp: string };
  'vision.started': { sessionId?: string; target?: string; timestamp: string };
  'vision.observation': { sessionId?: string; observationId: string; sourceType: string; challenges: string[]; confidence: number };
  'vision.completed': { sessionId?: string; observationId: string; durationMs: number };
  'vision.failed': { sessionId?: string; error: string };
  'multimodal.started': { sessionId: string; activeModalities: string[] };
  'multimodal.completed': { sessionId: string; durationMs: number };
  'multimodal.cancelled': { sessionId: string; reason?: string };
  'multimodal.resource_limited': { sessionId: string; reason: string };
  'multimodal.privacy_blocked': { sessionId: string; privacyTier: string; reason: string };
  'camera.started': { cameraId?: string; timestamp: string };
  'camera.stopped': { cameraId?: string; timestamp: string };
  // Phase 25 Autonomous Company Operations events
  'company.created': { companyId: string; name: string; slug: string; timestamp: string };
  'company.state_changed': { companyId: string; fromState: string; toState: string; timestamp: string };
  'company.objective_created': { companyId: string; objectiveId: string; title: string; ownerAgentId: string; timestamp: string };
  'company.objective_completed': { companyId: string; objectiveId: string; title: string; ownerAgentId: string; timestamp: string };
  'company.project_started': { companyId: string; projectId: string; name: string; timestamp: string };
  'company.project_completed': { companyId: string; projectId: string; name: string; timestamp: string };
  'company.customer_created': { companyId: string; customerId: string; name: string; timestamp: string };
  'company.order_created': { companyId: string; orderId: string; orderNumber: string; totalAmount: number; timestamp: string };
  'company.order_updated': { companyId: string; orderId: string; status: string; timestamp: string };
  'company.release_started': { companyId: string; releaseId: string; version: string; timestamp: string };
  'company.release_completed': { companyId: string; releaseId: string; version: string; status: string; timestamp: string };
  'company.incident_created': { companyId: string; incidentId: string; severity: string; title: string; timestamp: string };
  'company.incident_resolved': { companyId: string; incidentId: string; resolution?: string; timestamp: string };
  'company.approval_requested': { companyId: string; approvalId: string; category: string; title: string; timestamp: string };
  'company.approval_completed': { companyId: string; approvalId: string; status: string; resolvedBy: string; timestamp: string };
  'company.kpi_changed': { companyId: string; kpiId: string; currentValue: number; delta: number; trend: string; timestamp: string };
  'company.risk_changed': { companyId: string; riskId: string; status: string; severity: string; timestamp: string };
  // Phase 26 Safe Self-Improvement & Self-Maintenance events
  'self.observation_recorded': { observationId: string; source: string; category: string; level: string; timestamp: string };
  'self.anomaly_detected': { anomalyId: string; component: string; severity: string; title: string; timestamp: string };
  'self.anomaly_resolved': { anomalyId: string; component: string; resolvedAt: string };
  'self.proposal_created': { proposalId: string; category: string; title: string; riskLevel: string; timestamp: string };
  'self.proposal_state_changed': { proposalId: string; fromState: string; toState: string; timestamp: string };
  'self.approval_requested': { approvalId: string; proposalId: string; riskLevel: string; requestedAt: string };
  'self.approval_resolved': { approvalId: string; proposalId: string; status: string; resolvedBy: string; resolvedAt: string };
  'self.sandbox_started': { changeSetId: string; proposalId: string; sandboxPath: string; timestamp: string };
  'self.sandbox_completed': { changeSetId: string; proposalId: string; success: boolean; durationMs: number };
  'self.test_completed': { testId: string; proposalId: string; passed: boolean; totalTests: number; passedTests: number; failedTests: number };
  'self.benchmark_completed': { benchmarkId: string; proposalId: string; metricName: string; outcome: string; delta: number };
  'self.change_applied': { deploymentId: string; proposalId: string; stage: string; timestamp: string };
  'self.rollback_executed': { rollbackId: string; proposalId: string; reason: string; timestamp: string };
  'self.maintenance_completed': { jobId: string; type: string; reclaimedBytes?: number; durationMs?: number; timestamp: string };
  'self.improvement_accepted': { proposalId: string; title: string; category: string; timestamp: string };
}

export type EventKey = keyof EventMap;
export type EventListener<K extends EventKey> = (payload: EventMap[K]) => void | Promise<void>;


