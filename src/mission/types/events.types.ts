/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Runtime Events
 *
 * FP-14: Structured lifecycle event topics and event types.
 */

export const MissionRuntimeEventTopics = {
  MISSION_CREATED: 'mission.created',
  MISSION_UNDERSTANDING: 'mission.understanding',
  MISSION_PLANNED: 'mission.planned',
  MISSION_READY: 'mission.ready',
  MISSION_STARTED: 'mission.started',
  MISSION_PAUSED: 'mission.paused',
  MISSION_RESUMED: 'mission.resumed',
  MISSION_BLOCKED: 'mission.blocked',
  MISSION_REPLANNING: 'mission.replanning',
  MISSION_RECOVERED: 'mission.recovered',
  MISSION_VERIFYING: 'mission.verifying',
  MISSION_COMPLETED: 'mission.completed',
  MISSION_FAILED: 'mission.failed',
  MISSION_CANCELLED: 'mission.cancelled',

  OUTCOME_STARTED: 'mission.outcome.started',
  OUTCOME_VERIFIED: 'mission.outcome.verified',
  OUTCOME_FAILED: 'mission.outcome.failed',

  TASK_ASSIGNED: 'mission.task.assigned',
  TASK_STARTED: 'mission.task.started',
  TASK_COMPLETED: 'mission.task.completed',
  TASK_FAILED: 'mission.task.failed',

  AGENT_ASSIGNED: 'mission.agent.assigned',
  AGENT_RELEASED: 'mission.agent.released',
  AGENT_OVERLOADED: 'mission.agent.overloaded',
  AGENT_RECOVERED: 'mission.agent.recovered',

  BLACKBOARD_ENTRY_ADDED: 'mission.blackboard.added',
  CHECKPOINT_SAVED: 'mission.checkpoint.saved',
  APPROVAL_REQUESTED: 'mission.approval.requested',
  APPROVAL_RESOLVED: 'mission.approval.resolved',
} as const;

export type MissionRuntimeEventTopic =
  typeof MissionRuntimeEventTopics[keyof typeof MissionRuntimeEventTopics];

export interface MissionRuntimeLifecycleEvent<T = unknown> {
  eventId: string;
  topic: MissionRuntimeEventTopic;
  missionId: string;
  outcomeId?: string;
  taskId?: string;
  agentId?: string;
  timestamp: string;
  payload: T;
  provenance: string;
}
