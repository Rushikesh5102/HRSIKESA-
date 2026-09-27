import {
  MissionOutcome,
  MissionTask,
  PlanVersion,
  FailureClass,
  TaskFailureRecord
} from '../types/index.js';
import { LoopProtectionEngine } from './loop.protection.js';

export interface ReplanRequest {
  missionId: string;
  reason: string;
  author: string;
  triggerTaskId?: string;
  failure?: TaskFailureRecord;
  newRequirement?: string;
  invalidatedAssumptions?: string[];
}

export class ReplanningEngine {
  constructor(private readonly loopProtection: LoopProtectionEngine) {}

  /**
   * Classifies an arbitrary execution error into a structured FailureClass
   */
  public classifyFailure(error: unknown): FailureClass {
    if (!error) return 'UNKNOWN';
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (message.includes('401') || message.includes('unauthorized') || message.includes('auth') || message.includes('login')) {
      return 'AUTHENTICATION';
    }
    if (message.includes('403') || message.includes('forbidden') || message.includes('permission') || message.includes('privilege')) {
      return 'AUTHORIZATION';
    }
    if (message.includes('rate limit') || message.includes('429') || message.includes('quota') || message.includes('out of memory') || message.includes('ram') || message.includes('cpu')) {
      return 'RESOURCE';
    }
    if (message.includes('enotfound') || message.includes('timeout') || message.includes('connection refused') || message.includes('econnreset') || message.includes('network')) {
      return 'NETWORK';
    }
    if (message.includes('provider') || message.includes('service unavailable') || message.includes('503') || message.includes('502') || message.includes('gateway')) {
      return 'PROVIDER';
    }
    if (message.includes('approval') || message.includes('consent') || message.includes('sign-off')) {
      return 'HUMAN_APPROVAL';
    }
    if (message.includes('injection') || message.includes('tampering') || message.includes('security') || message.includes('malicious')) {
      return 'SECURITY';
    }
    if (message.includes('assertion') || message.includes('expected') || message.includes('logic') || message.includes('invariant')) {
      return 'LOGIC';
    }
    if (message.includes('environment') || message.includes('workspace') || message.includes('vdi') || message.includes('container')) {
      return 'ENVIRONMENT';
    }
    if (message.includes('json') || message.includes('schema') || message.includes('validation') || message.includes('parse')) {
      return 'DATA';
    }

    return 'TRANSIENT';
  }

  /**
   * Perform safe replanning while strictly preserving completed verified work and artifacts
   */
  public replan(
    existingOutcomes: MissionOutcome[],
    existingTasks: MissionTask[],
    currentPlanVersions: PlanVersion[],
    request: ReplanRequest
  ): {
    updatedOutcomes: MissionOutcome[];
    updatedTasks: MissionTask[];
    newPlanVersion: PlanVersion;
  } {
    // 1. Enforce Replan Limit to prevent infinite replanning
    const loopCheck = this.loopProtection.checkReplanLimit(currentPlanVersions);
    if (!loopCheck.allowed) {
      throw new Error(loopCheck.reason || 'Replan loop limit reached.');
    }

    const versionNumber = currentPlanVersions.length + 1;
    const affectedTaskIds: string[] = [];
    const affectedOutcomeIds: string[] = [];

    // 2. Preserve completed and verified outcomes; only reset or modify affected ones
    const updatedOutcomes = existingOutcomes.map(outcome => {
      if (outcome.status === 'VERIFIED') {
        return outcome;
      }
      if (request.triggerTaskId && existingTasks.some(t => t.taskId === request.triggerTaskId && t.outcomeId === outcome.outcomeId)) {
        affectedOutcomeIds.push(outcome.outcomeId);
        return {
          ...outcome,
          status: 'PENDING' as const,
          verificationState: 'UNVERIFIED' as const,
          updatedAt: new Date().toISOString()
        };
      }
      return outcome;
    });

    // 3. Update tasks: preserve completed tasks, reset failed or dependent tasks
    const updatedTasks = existingTasks.map(task => {
      if (task.status === 'COMPLETED') {
        return task;
      }

      if (task.taskId === request.triggerTaskId) {
        affectedTaskIds.push(task.taskId);
        return {
          ...task,
          status: 'PENDING' as const,
          retryCount: task.retryCount + 1,
          updatedAt: new Date().toISOString()
        };
      }

      if (request.triggerTaskId && task.dependencies.includes(request.triggerTaskId)) {
        affectedTaskIds.push(task.taskId);
        return {
          ...task,
          status: 'PENDING' as const,
          updatedAt: new Date().toISOString()
        };
      }

      return task;
    });

    // 4. Create new immutable PlanVersion record
    const newPlanVersion: PlanVersion = {
      version: versionNumber,
      missionId: request.missionId,
      reason: request.reason,
      author: request.author,
      timestamp: new Date().toISOString(),
      affectedTasks: affectedTaskIds,
      affectedOutcomes: affectedOutcomeIds,
      tasksSnapshot: JSON.parse(JSON.stringify(updatedTasks)),
      outcomesSnapshot: JSON.parse(JSON.stringify(updatedOutcomes))
    };

    return {
      updatedOutcomes,
      updatedTasks,
      newPlanVersion
    };
  }
}
