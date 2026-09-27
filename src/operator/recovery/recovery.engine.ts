/**
 * FP-13 Recovery Engine & Loop Prevention
 *
 * Provides progressive recovery strategies when actions or verifications fail,
 * and detects state loops to prevent infinite GUI automation cycles.
 */

import { IDigitalWorkspace } from '../workspaces/digital.workspace.interface.js';
import {
  OperatorActionPayload,
  RecoveryStrategy,
  RecoveryAttemptResult,
} from '../types/action.types.js';
import { WorkspaceObservation } from '../types/observation.types.js';
import { WorkspaceRepository } from '../repository/workspace.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { OperatorEventTopics } from '../types/operator.events.js';

export class RecoveryEngine {
  // Key: workspaceId:actionType:targetHash -> count of consecutive identical failures
  private stateFailureCounts: Map<string, number> = new Map();

  constructor(
    private readonly repository?: WorkspaceRepository,
    private readonly logger?: ILogger,
    private readonly eventBus?: EventBus
  ) {}

  public computeStateSignature(obs: WorkspaceObservation, action: OperatorActionPayload): string {
    const targetKey = action.target?.semanticSelector || action.target?.textLabel || 'notarget';
    return `${obs.workspaceId}:${action.actionType}:${targetKey}:${obs.activeWindowTitle || 'none'}`;
  }

  public detectLoop(obs: WorkspaceObservation, action: OperatorActionPayload): boolean {
    const sig = this.computeStateSignature(obs, action);
    const count = (this.stateFailureCounts.get(sig) || 0) + 1;
    this.stateFailureCounts.set(sig, count);

    if (count >= 3) {
      this.logger?.error(`Loop prevention triggered: repeated identical state/failure detected (count: ${count}) on ${sig}`);
      return true;
    }
    return false;
  }

  public clearLoopCounter(obs: WorkspaceObservation, action: OperatorActionPayload): void {
    const sig = this.computeStateSignature(obs, action);
    this.stateFailureCounts.delete(sig);
  }

  public async attemptRecovery(
    action: OperatorActionPayload,
    error: Error,
    workspace: IDigitalWorkspace,
    preferredStrategy?: RecoveryStrategy
  ): Promise<RecoveryAttemptResult> {
    const strategy = preferredStrategy || 'RE_OBSERVE';

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.RECOVERY_STARTED, {
        actionId: action.actionId,
        workspaceId: workspace.workspaceId,
        strategy,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await workspace.recover(action, error, strategy);

    if (this.repository) {
      this.repository.saveRecovery(action.actionId, workspace.workspaceId, result);
    }

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.RECOVERY_COMPLETED, {
        actionId: action.actionId,
        workspaceId: workspace.workspaceId,
        success: result.success,
        strategy: result.strategy,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }
}
