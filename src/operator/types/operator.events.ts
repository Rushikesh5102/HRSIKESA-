/**
 * FP-13 Universal Digital Workspace & Application Operator
 * Lifecycle and Audit Event Constants & Interfaces
 */

export const OperatorEventTopics = {
  WORKSPACE_DISCOVERED: 'workspace.discovered',
  WORKSPACE_CONNECTED: 'workspace.connected',
  WORKSPACE_DISCONNECTED: 'workspace.disconnected',
  WORKSPACE_STATUS_CHANGED: 'workspace.status.changed',
  APPLICATION_LAUNCHED: 'application.launched',
  APPLICATION_READY: 'application.ready',
  APPLICATION_CLOSED: 'application.closed',
  OBSERVATION_CREATED: 'observation.created',
  TARGET_RESOLVED: 'target.resolved',
  ACTION_STARTED: 'action.started',
  ACTION_COMPLETED: 'action.completed',
  ACTION_FAILED: 'action.failed',
  VERIFICATION_STARTED: 'verification.started',
  VERIFICATION_COMPLETED: 'verification.completed',
  RECOVERY_STARTED: 'operator.recovery.started',
  RECOVERY_COMPLETED: 'operator.recovery.completed',
  LOCK_ACQUIRED: 'workspace.lock.acquired',
  LOCK_RELEASED: 'workspace.lock.released',
  SECURITY_CHALLENGE_DETECTED: 'operator.security.challenge_detected',
  ACTION_BLOCKED: 'operator.action.blocked'
} as const;

export type OperatorEventTopic = typeof OperatorEventTopics[keyof typeof OperatorEventTopics];

export interface OperatorLifecycleEvent<T = unknown> {
  eventId: string;
  topic: OperatorEventTopic;
  timestamp: string;
  workspaceId: string;
  applicationId?: string | null;
  agentId?: string | null;
  payload: T;
  provenance: string;
}
