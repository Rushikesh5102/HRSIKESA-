/**
 * HṚṢĪKEŚA (हृषीकेश) — Checkpoint Manager Service
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 *
 * Captures and restores resumable conversational checkpoints across restarts.
 */

import { ConversationCheckpointRepository } from '../repositories/conversation-checkpoint.repository.js';
import { ConversationThreadRepository } from '../repositories/conversation-thread.repository.js';
import { WorkingMemoryItemRepository } from '../repositories/working-memory-item.repository.js';
import {
  ConversationCheckpoint,
  CheckpointState,
  ContinuityState,
} from '../interfaces/working-memory.types.js';

export class CheckpointManagerService {
  private readonly checkpointRepo: ConversationCheckpointRepository;
  private readonly threadRepo: ConversationThreadRepository;
  private readonly itemRepo: WorkingMemoryItemRepository;

  constructor(
    checkpointRepo: ConversationCheckpointRepository,
    threadRepo: ConversationThreadRepository,
    itemRepo: WorkingMemoryItemRepository
  ) {
    this.checkpointRepo = checkpointRepo;
    this.threadRepo = threadRepo;
    this.itemRepo = itemRepo;
  }

  /**
   * Captures a durable checkpoint from the current continuity state.
   */
  public createCheckpoint(
    arg1:
      | string
      | {
          sessionId: string;
          threadId: string;
          title: string;
          state?: ContinuityState;
          lastResult?: string;
          nextRecommendedContinuationPoint?: string;
          assumptions?: string[];
        },
    arg2?: string,
    arg3?: string,
    arg4?: ContinuityState,
    options?: {
      lastResult?: string;
      nextRecommendedContinuationPoint?: string;
      assumptions?: string[];
    }
  ): ConversationCheckpoint {
    let sessionId: string;
    let threadId: string;
    let title: string;
    let state: ContinuityState | undefined;
    let opts = options;

    if (typeof arg1 === 'object') {
      sessionId = arg1.sessionId;
      threadId = arg1.threadId;
      title = arg1.title;
      state = arg1.state;
      opts = {
        lastResult: arg1.lastResult,
        nextRecommendedContinuationPoint: arg1.nextRecommendedContinuationPoint,
        assumptions: arg1.assumptions,
      };
    } else {
      sessionId = arg1;
      threadId = arg2 || '';
      title = arg3 || '';
      state = arg4;
    }

    const activeItems = this.itemRepo.listActiveBySession(sessionId, 50);
    const taskItem = activeItems.find(i => i.type === 'CURRENT_TASK');
    const projItem = activeItems.find(i => i.type === 'CURRENT_PROJECT');
    const compItem = activeItems.find(i => i.type === 'CURRENT_COMPANY');
    const goalItem = activeItems.find(i => i.type === 'CURRENT_GOAL');
    const missionItem = activeItems.find(i => i.type === 'CURRENT_MISSION');
    const blockers = activeItems.filter(i => i.type === 'BLOCKER' || i.type === 'ERROR_STATE');
    const nextSteps = activeItems.filter(i => i.type === 'NEXT_STEP');
    const recentDecisions = activeItems.filter(i => i.type === 'RECENT_DECISION');
    const assumptions = activeItems.filter(i => i.type === 'TEMPORARY_ASSUMPTION');

    const thread = state?.activeThread || (threadId ? this.threadRepo.getById(threadId) : null);
    const activeProject = state?.activeProject || thread?.targetProjectId || projItem?.content;
    const activeCompany = state?.activeCompany || thread?.targetCompanyId || compItem?.content;
    const activeGoal = state?.activeGoal || thread?.targetGoalId || goalItem?.content;
    const activeMission = state?.activeMission || thread?.targetMissionId || missionItem?.content;
    const activeTask = state?.activeTask || thread?.activeTaskId || taskItem?.content;

    const checkpointState: CheckpointState = {
      threadTitle: thread?.title,
      activeThreadId: threadId,
      targetProjectId: activeProject,
      targetCompanyId: activeCompany,
      targetGoalId: activeGoal,
      targetMissionId: activeMission,
      activeTaskId: activeTask,
      taskDescription: activeTask,
      assumptions: opts?.assumptions || (state?.assumptions ? state.assumptions.map(a => a.content) : assumptions.map(a => a.content)),
      recentDecisions: state?.recentDecisions ? state.recentDecisions.map((d) => d.content) : recentDecisions.map(d => d.content),
      pendingItems: state?.pendingItems ? state.pendingItems.map((p) => p.description) : [],
      blockers: state?.blockers ? state.blockers.map((b) => b.content) : blockers.map(b => b.content),
      nextSteps: state?.nextSteps ? state.nextSteps.map((n) => n.content) : nextSteps.map(n => n.content),
      lastResult: opts?.lastResult,
      nextRecommendedContinuationPoint: opts?.nextRecommendedContinuationPoint,
      timestamp: new Date().toISOString(),
    };

    return this.checkpointRepo.createCheckpoint({
      sessionId,
      threadId,
      title,
      projectId: checkpointState.targetProjectId,
      companyId: checkpointState.targetCompanyId,
      goalId: checkpointState.targetGoalId,
      missionId: checkpointState.targetMissionId,
      taskId: checkpointState.activeTaskId,
      status: 'ACTIVE',
      state: checkpointState,
    });
  }

  public getLatestActiveCheckpoint(sessionId?: string): ConversationCheckpoint | null {
    return this.checkpointRepo.getLatestActive(sessionId);
  }

  public getLatestCheckpointAcrossSessions(): ConversationCheckpoint | null {
    return this.checkpointRepo.getLatestAnySession();
  }

  public listCheckpoints(sessionId: string): ConversationCheckpoint[] {
    return this.checkpointRepo.listBySession(sessionId);
  }

  /**
   * Restores working memory items and thread status from a checkpoint.
   */
  public restoreCheckpoint(checkpointId: string, targetSessionId?: string): {
    success: boolean;
    checkpoint?: ConversationCheckpoint;
    restoredThreadId?: string;
    restoredProject?: string;
    restoredTask?: string;
  } {
    const cp = this.checkpointRepo.getById(checkpointId);
    if (!cp) {
      return { success: false };
    }

    const sessionId = targetSessionId || cp.sessionId;
    const threadId = cp.threadId;

    // Reactivate thread if existing and bind to new session
    const thread = this.threadRepo.getById(threadId);
    if (thread) {
      this.threadRepo.update(thread.id, {
        sessionId,
        status: 'ACTIVE',
        lastActiveAt: new Date().toISOString(),
      });
    }

    // Restore Project if set
    if (cp.state.targetProjectId) {
      this.itemRepo.supersedeType(sessionId, 'CURRENT_PROJECT');
      this.itemRepo.createItem({
        sessionId,
        threadId,
        type: 'CURRENT_PROJECT',
        content: cp.state.targetProjectId,
        scope: 'PROJECT',
        source: 'SYSTEM',
        priority: 95,
        relatedProjectId: cp.state.targetProjectId,
      });
    }

    // Restore Task if set
    if (cp.state.taskDescription) {
      this.itemRepo.supersedeType(sessionId, 'CURRENT_TASK');
      this.itemRepo.createItem({
        sessionId,
        threadId,
        type: 'CURRENT_TASK',
        content: cp.state.taskDescription,
        scope: cp.state.targetProjectId ? 'PROJECT' : 'SESSION',
        source: 'SYSTEM',
        priority: 90,
        relatedProjectId: cp.state.targetProjectId,
      });
    }

    // Restore Blockers if any
    for (const blocker of cp.state.blockers) {
      this.itemRepo.createItem({
        sessionId,
        threadId,
        type: 'BLOCKER',
        content: blocker,
        scope: cp.state.targetProjectId ? 'PROJECT' : 'SESSION',
        source: 'SYSTEM',
        priority: 95,
      });
    }

    // Restore Next Steps if any
    for (const step of cp.state.nextSteps) {
      this.itemRepo.createItem({
        sessionId,
        threadId,
        type: 'NEXT_STEP',
        content: step,
        scope: cp.state.targetProjectId ? 'PROJECT' : 'SESSION',
        source: 'SYSTEM',
        priority: 85,
      });
    }

    this.checkpointRepo.markRestored(checkpointId);
    const updatedCp = this.checkpointRepo.getById(checkpointId) || cp;

    return {
      success: true,
      checkpoint: updatedCp,
      restoredThreadId: threadId,
      restoredProject: cp.state.targetProjectId,
      restoredTask: cp.state.taskDescription,
    };
  }
}
