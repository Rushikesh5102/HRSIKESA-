/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Events
 * 
 * FP-11 Event definitions for SSE streaming and internal EventBus.
 */

export type WorkflowEventType =
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.validated'
  | 'workflow.activated'
  | 'workflow.paused'
  | 'workflow.disabled'
  | 'workflow.version.created'
  | 'workflow.run.created'
  | 'workflow.run.started'
  | 'workflow.node.started'
  | 'workflow.node.completed'
  | 'workflow.node.failed'
  | 'workflow.node.retrying'
  | 'workflow.node.skipped'
  | 'workflow.approval.requested'
  | 'workflow.approval.resolved'
  | 'workflow.run.paused'
  | 'workflow.run.resumed'
  | 'workflow.run.recovered'
  | 'workflow.run.completed'
  | 'workflow.run.failed'
  | 'workflow.run.cancelled';

export interface WorkflowEventPayload {
  workflowId: string;
  runId?: string;
  nodeId?: string;
  versionNumber?: number;
  status?: string;
  phase?: string;
  details?: Record<string, any>;
  timestamp: string;
  error?: string;
}

export interface WorkflowSSEMessage {
  id: string;
  event: WorkflowEventType;
  data: WorkflowEventPayload;
  timestamp: number;
}
