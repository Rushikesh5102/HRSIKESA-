/**
 * FP-13 Precondition Engine
 *
 * Enforces pre-action invariants across workspace status, application readiness,
 * target confidence, risk tiers, and authorization before action dispatch.
 */

import { IDigitalWorkspace } from '../workspaces/digital.workspace.interface.js';
import {
  OperatorActionPayload,
  TargetResolutionResult,
} from '../types/action.types.js';
import { WorkspaceObservation } from '../types/observation.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface PreconditionCheckResult {
  isSatisfied: boolean;
  violations: string[];
  requiresApproval: boolean;
  targetResolution?: TargetResolutionResult;
}

export class PreconditionEngine {
  constructor(_logger?: ILogger) {}

  public async evaluate(
    action: OperatorActionPayload,
    workspace: IDigitalWorkspace,
    observation: WorkspaceObservation,
    targetResolution?: TargetResolutionResult
  ): Promise<PreconditionCheckResult> {
    const violations: string[] = [];
    let requiresApproval = false;

    // 1. Workspace State Check
    if (workspace.status === 'BLOCKED' || workspace.status === 'FAILED' || workspace.status === 'DISCONNECTED') {
      violations.push(`Workspace ${workspace.workspaceId} is not in an operable state (${workspace.status})`);
    }

    // 2. Security Challenge Check
    if (observation.hasSecurityChallenge || observation.hasModal) {
      if (observation.metadata?.hasCaptcha || observation.metadata?.hasMfa || observation.metadata?.hasMfaChallenge) {
        violations.push('Security challenge (CAPTCHA / MFA) active. Automation cannot proceed without human resolution.');
      }
    }

    // 3. Target Ambiguity & Confidence Check
    if (targetResolution) {
      if (targetResolution.isAmbiguous) {
        violations.push(`Action target is materially ambiguous (${targetResolution.candidateCount} matching candidates). Cannot blindly select.`);
      } else if (targetResolution.confidence === 'LOW' && action.riskLevel !== 'TIER_0_OBSERVE') {
        violations.push(`Target confidence is LOW (${targetResolution.confidence}). Action requires stronger resolution or user confirmation.`);
      }
    }

    // 4. Risk Level and Human Approval Gate Check
    if (action.riskLevel === 'TIER_4_DESTRUCTIVE') {
      requiresApproval = true;
      if (!action.parameters?.isApprovedByHuman) {
        violations.push('Action is classified as TIER_4_DESTRUCTIVE and requires explicit human approval.');
      }
    }

    // 5. Custom Precondition rules
    if (action.preconditions && action.preconditions.length > 0) {
      for (const cond of action.preconditions) {
        if (cond.rule === 'APPLICATION_FOCUSED' && !observation.focusedElement && !observation.activeWindowTitle) {
          violations.push('Required precondition failed: Application is not focused.');
        }
        if (cond.rule === 'AUTHENTICATED' && !workspace.descriptor.isAuthenticated) {
          violations.push('Required precondition failed: Workspace is unauthenticated.');
        }
      }
    }

    return {
      isSatisfied: violations.length === 0,
      violations,
      requiresApproval,
      targetResolution,
    };
  }
}
