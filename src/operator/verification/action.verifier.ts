/**
 * FP-13 Action Verifier
 *
 * Post-action verification engine. Enforces the invariant:
 * "Never claim an action succeeded without post-action verification evidence."
 */

import { IDigitalWorkspace } from '../workspaces/digital.workspace.interface.js';
import {
  OperatorActionPayload,
  OperatorActionResult,
  ActionVerificationStrategy,
  ActionVerificationResult,
} from '../types/action.types.js';
import { WorkspaceRepository } from '../repository/workspace.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { OperatorEventTopics } from '../types/operator.events.js';

export class ActionVerifier {
  constructor(
    private readonly repository?: WorkspaceRepository,
    _logger?: ILogger,
    private readonly eventBus?: EventBus
  ) {}

  public async verify(
    action: OperatorActionPayload,
    result: OperatorActionResult,
    workspace: IDigitalWorkspace,
    strategy?: ActionVerificationStrategy
  ): Promise<ActionVerificationResult> {
    const chosenStrategy = strategy || action.verificationStrategy || 'OBSERVE_STATE_CHANGE';

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.VERIFICATION_STARTED, {
        actionId: action.actionId,
        strategy: chosenStrategy,
        workspaceId: workspace.workspaceId,
        timestamp: new Date().toISOString(),
      });
    }

    const verificationResult = await workspace.verify(action, result, chosenStrategy);

    if (this.repository) {
      this.repository.saveVerification(action.actionId, workspace.workspaceId, verificationResult);
    }

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.VERIFICATION_COMPLETED, {
        actionId: action.actionId,
        workspaceId: workspace.workspaceId,
        passed: verificationResult.isVerified,
        timestamp: verificationResult.verifiedAt,
      });
    }

    return verificationResult;
  }
}
