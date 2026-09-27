import { MissionTask, StructuredHandoff, MissionArtifact } from '../types/index.js';
import { WorkforceCapacityTracker } from './workforce.capacity.tracker.js';
import { WorkforcePlanner } from './workforce.planner.js';

export interface DelegationRequest {
  parentTaskId: string;
  fromAgent: string;
  toAgent?: string;
  reason: string;
  subtaskTitle: string;
  subtaskDescription: string;
  requiredCapabilities?: string[];
  scope?: string;
}

export class AgentCollaborationManager {
  private static readonly MAX_DELEGATION_DEPTH = 3;
  private handoffLog: StructuredHandoff[] = [];

  constructor(
    private readonly capacityTracker: WorkforceCapacityTracker,
    private readonly workforcePlanner: WorkforcePlanner
  ) {}

  public getCapacityTracker(): WorkforceCapacityTracker {
    return this.capacityTracker;
  }

  /**
   * Create a structured, auditable handoff when ownership of a task or subtask transfers
   */
  public createStructuredHandoff(
    missionId: string,
    outcomeId: string,
    taskId: string,
    fromAgent: string,
    toAgent: string,
    reason: string,
    completedWork: string[],
    evidence: string[],
    artifacts: MissionArtifact[],
    nextAction: string,
    verificationRequirement: string,
    assumptions: string[] = []
  ): StructuredHandoff {
    const handoff: StructuredHandoff = {
      handoffId: `handoff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      missionId,
      outcomeId,
      taskId,
      fromAgent,
      toAgent,
      timestamp: new Date().toISOString(),
      reason,
      completedWork,
      evidence,
      artifacts,
      constraints: [],
      assumptions,
      nextAction,
      verificationRequirement
    };

    this.handoffLog.push(handoff);
    return handoff;
  }

  /**
   * Bounded task delegation with depth limits (prevent infinite delegation loops)
   */
  public delegateTask(
    missionId: string,
    outcomeId: string,
    parentTask: MissionTask,
    request: DelegationRequest
  ): { subtask: MissionTask; handoff: StructuredHandoff } {
    const currentDepth = parentTask.delegationDepth || 0;
    if (currentDepth >= AgentCollaborationManager.MAX_DELEGATION_DEPTH) {
      throw new Error(`Max delegation depth (${AgentCollaborationManager.MAX_DELEGATION_DEPTH}) exceeded for task ${parentTask.taskId}. Infinite delegation prohibited.`);
    }

    // Determine target agent
    let targetAgent = request.toAgent;
    if (!targetAgent) {
      const candidates = this.workforcePlanner.rankAgentsForTask({
        title: request.subtaskTitle,
        description: request.subtaskDescription,
        requiredCapabilities: request.requiredCapabilities || []
      });
      // Pick best available candidate other than fromAgent if possible
      const altCandidate = candidates.find((c: any) => c.agentName !== request.fromAgent && c.availabilityState === 'AVAILABLE') || candidates[0];
      targetAgent = altCandidate.agentName;
    }

    const subtaskId = `${parentTask.taskId}_sub_${Date.now().toString(36)}`;
    const subtask: MissionTask = {
      taskId: subtaskId,
      missionId,
      outcomeId,
      title: request.subtaskTitle,
      description: request.subtaskDescription,
      assignedAgent: targetAgent,
      executionKind: 'AGENT_DIRECT',
      status: 'PENDING',
      dependencies: [parentTask.taskId],
      evidence: [],
      artifacts: [],
      retryCount: 0,
      maxRetries: 2,
      delegationDepth: currentDepth + 1,
      parentTaskId: parentTask.taskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const handoff = this.createStructuredHandoff(
      missionId,
      outcomeId,
      subtaskId,
      request.fromAgent,
      targetAgent,
      request.reason,
      [`Delegated subtask created: ${request.subtaskTitle}`],
      [],
      [],
      `Execute subtask: ${request.subtaskTitle}`,
      'Verify subtask artifact and evidence independently'
    );

    return { subtask, handoff };
  }

  /**
   * Dynamically splits a heavy task into safe parallel subtasks when dependencies allow
   */
  public splitTaskForAssistance(
    missionId: string,
    outcomeId: string,
    heavyTask: MissionTask,
    subtaskSplits: Array<{ title: string; description: string; capabilities: string[] }>
  ): MissionTask[] {
    if (subtaskSplits.length === 0) return [];
    const createdSubtasks: MissionTask[] = [];

    for (const split of subtaskSplits) {
      const { subtask } = this.delegateTask(missionId, outcomeId, heavyTask, {
        parentTaskId: heavyTask.taskId,
        fromAgent: heavyTask.assignedAgent || 'HṚṢĪKEŚA',
        reason: `Dynamic task splitting for parallel assistance`,
        subtaskTitle: split.title,
        subtaskDescription: split.description,
        requiredCapabilities: split.capabilities
      });
      createdSubtasks.push(subtask);
    }

    return createdSubtasks;
  }

  public getHandoffLog(missionId?: string): StructuredHandoff[] {
    if (missionId) {
      return this.handoffLog.filter(h => h.missionId === missionId);
    }
    return [...this.handoffLog];
  }
}
