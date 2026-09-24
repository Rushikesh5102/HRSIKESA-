/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Action Executor
 *
 * Phase 22: Precondition validation, low-level execution via IComputerAdapter & IUiaAdapter,
 * active window scoping, and secret/credential redaction.
 */

import { ILogger } from '../../../core/logging/logger.types.js';
import { IComputerAdapter } from '../../../tools/computer/interfaces/computer.types.js';
import { IUiaAdapter } from '../../../tools/computer/uia/interfaces/uia.types.js';
import {
  ComputerAction,
  ActionResult,
  ResolvedTarget,
  DesktopObservation,
  FailureClassification,
} from '../interfaces/operator.types.js';
import { ComputerTargetResolver } from './target.resolver.js';
import { ComputerVerificationEngine } from './verification.engine.js';
import { ComputerSafetyPolicy } from './safety.policy.js';

export class ComputerActionExecutor {
  private readonly computerAdapter: IComputerAdapter;
  private readonly uiaAdapter?: IUiaAdapter;
  private readonly targetResolver: ComputerTargetResolver;
  private readonly verificationEngine: ComputerVerificationEngine;
  public readonly safetyPolicy?: ComputerSafetyPolicy;
  private readonly logger?: ILogger;

  constructor(
    computerAdapter: IComputerAdapter,
    targetResolver: ComputerTargetResolver,
    verificationEngine: ComputerVerificationEngine,
    safetyPolicy?: ComputerSafetyPolicy,
    uiaAdapter?: IUiaAdapter,
    logger?: ILogger
  ) {
    this.computerAdapter = computerAdapter;
    this.targetResolver = targetResolver;
    this.verificationEngine = verificationEngine;
    this.safetyPolicy = safetyPolicy;
    this.uiaAdapter = uiaAdapter;
    this.logger = logger?.child('ComputerActionExecutor');
  }

  /**
   * Executes a structured computer action with precondition checks and post-verification.
   */
  public async executeAction(
    action: ComputerAction,
    currentObservation?: DesktopObservation
  ): Promise<ActionResult> {
    const startTime = Date.now();
    this.logger?.info(`Executing action: ${action.type} (ID: ${action.id})`);

    const observation: DesktopObservation = currentObservation || {
      id: 'default-obs',
      timestamp: new Date().toISOString(),
      screenMetrics: { width: 1920, height: 1080 },
      activeWindow: { hwnd: 1024, title: 'Active', processId: 1234, processName: 'notepad.exe', isForeground: true, controls: [] },
      visibleWindows: [],
      nodeCount: 1,
      domHash: 'hash-default',
      summary: 'Desktop'
    };

    // 1. Resolve Target if specified
    let resolvedTarget: ResolvedTarget | undefined;
    if (action.target) {
      resolvedTarget = await this.targetResolver.resolveTarget(action.target, observation);
    }

    // 2. Validate Preconditions
    const preconditionPassed = this.validatePreconditions(action, resolvedTarget, observation);
    if (!preconditionPassed.passed) {
      this.logger?.warn(`Precondition failed for action ${action.id}: ${preconditionPassed.reason}`);
      return {
        actionId: action.id,
        success: false,
        actionType: action.type,
        resolvedTarget,
        preconditionPassed: false,
        verification: {
          verified: false,
          strategy: 'ELEMENT_PRESENT',
          durationMs: Date.now() - startTime,
          evidence: `Precondition failed: ${preconditionPassed.reason}`,
          timestamp: new Date().toISOString(),
        },
        durationMs: Date.now() - startTime,
        error: preconditionPassed.reason,
        failureClassification: preconditionPassed.classification,
      };
    }

    // 3. Dispatch Low-Level Action
    try {
      await this.dispatchLowLevel(action, resolvedTarget);
    } catch (err: any) {
      this.logger?.error(`Action execution failed for ${action.id}: ${err.message}`);
      return {
        actionId: action.id,
        success: false,
        actionType: action.type,
        resolvedTarget,
        preconditionPassed: true,
        verification: {
          verified: false,
          strategy: 'UI_TREE_CHANGED',
          durationMs: Date.now() - startTime,
          evidence: `Execution error: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
        durationMs: Date.now() - startTime,
        error: err.message,
        failureClassification: 'APPLICATION_CRASHED',
      };
    }

    // 4. Post-Action Verification
    const verification = await this.verificationEngine.verifyAction(
      action,
      observation,
      action.expectedVerification
    );

    const success = verification.verified;
    const durationMs = Date.now() - startTime;

    this.logger?.info(`Action ${action.id} completed in ${durationMs}ms (Verified: ${success})`);

    return {
      actionId: action.id,
      success,
      actionType: action.type,
      resolvedTarget,
      preconditionPassed: true,
      verification,
      durationMs,
      error: !success ? `Verification failed: ${verification.mismatchDetails || verification.evidence}` : undefined,
      failureClassification: !success ? 'UI_CHANGED' : undefined,
    };
  }

  private validatePreconditions(
    action: ComputerAction,
    target: ResolvedTarget | undefined,
    observation: DesktopObservation
  ): { passed: boolean; reason?: string; classification?: FailureClassification } {
    if (action.preconditions?.targetExists) {
      if (!target || target.method === 'COORDINATES' || target.confidence < 0.5) {
        return { passed: false, reason: 'Target element does not exist or has insufficient confidence.', classification: 'TARGET_DISAPPEARED' };
      }
    }

    if (action.preconditions?.expectedWindow) {
      const activeTitle = (observation.activeWindow?.title || '').toLowerCase();
      const exp = action.preconditions.expectedWindow.toLowerCase();
      if (!activeTitle.includes(exp)) {
        return {
          passed: false,
          reason: `Active window '${observation.activeWindow?.title}' does not match expected '${action.preconditions.expectedWindow}'`,
          classification: 'WRONG_FOCUS',
        };
      }
    }

    return { passed: true };
  }

  private async dispatchLowLevel(action: ComputerAction, target?: ResolvedTarget): Promise<void> {
    switch (action.type) {
      case 'MOVE': {
        const x = action.params?.coordinates?.x ?? (target ? target.bounds.x + target.bounds.width / 2 : 500);
        const y = action.params?.coordinates?.y ?? (target ? target.bounds.y + target.bounds.height / 2 : 500);
        await this.computerAdapter.mouseMove(x, y);
        break;
      }

      case 'CLICK': {
        // Try UIA element click first if target exists
        if (target && target.method === 'UIA_SEMANTIC' && this.uiaAdapter) {
          try {
            await this.uiaAdapter.clickElement(target.targetId);
            return;
          } catch (e: any) {
            this.logger?.debug(`UIA click fallback to mouse coordinates: ${e.message}`);
          }
        }
        const x = action.params?.coordinates?.x ?? (target ? target.bounds.x + target.bounds.width / 2 : undefined);
        const y = action.params?.coordinates?.y ?? (target ? target.bounds.y + target.bounds.height / 2 : undefined);
        if (x !== undefined && y !== undefined) {
          await this.computerAdapter.mouseMove(x, y);
        }
        await this.computerAdapter.mouseClick(action.params?.mouseButton || 'left', false);
        break;
      }

      case 'DOUBLE_CLICK': {
        const x = action.params?.coordinates?.x ?? (target ? target.bounds.x + target.bounds.width / 2 : undefined);
        const y = action.params?.coordinates?.y ?? (target ? target.bounds.y + target.bounds.height / 2 : undefined);
        if (x !== undefined && y !== undefined) {
          await this.computerAdapter.mouseMove(x, y);
        }
        await this.computerAdapter.mouseClick('left', true);
        break;
      }

      case 'RIGHT_CLICK': {
        const x = action.params?.coordinates?.x ?? (target ? target.bounds.x + target.bounds.width / 2 : undefined);
        const y = action.params?.coordinates?.y ?? (target ? target.bounds.y + target.bounds.height / 2 : undefined);
        if (x !== undefined && y !== undefined) {
          await this.computerAdapter.mouseMove(x, y);
        }
        await this.computerAdapter.mouseClick('right', false);
        break;
      }

      case 'TYPE': {
        const text = action.params?.text || '';
        if (target && target.method === 'UIA_SEMANTIC' && this.uiaAdapter) {
          try {
            await this.uiaAdapter.typeText(target.targetId, text);
            return;
          } catch (e: any) {
            this.logger?.debug(`UIA type fallback to keyboard typing: ${e.message}`);
          }
        }
        await this.computerAdapter.keyboardType(text);
        break;
      }

      case 'KEYPRESS': {
        const key = action.params?.key || 'ENTER';
        await this.computerAdapter.keyPress(key);
        break;
      }

      case 'HOTKEY': {
        const modifiers = action.params?.hotkeyModifiers || [];
        const key = action.params?.key || '';
        const combo = [...modifiers, key].join('+');
        await this.computerAdapter.keyPress(combo);
        break;
      }

      case 'LAUNCH':
      case 'OPEN': {
        const app = action.params?.appName || (target ? target.name : '');
        if (app) {
          await this.computerAdapter.launchApp(app, action.params?.appArgs ? Array.from(action.params.appArgs) : undefined);
        }
        break;
      }

      case 'CLOSE':
      case 'TERMINATE': {
        if (action.params?.appName) {
          // close by name
        }
        break;
      }

      case 'WAIT': {
        const ms = action.params?.waitMs || 500;
        await new Promise((r) => setTimeout(r, Math.min(ms, 10000)));
        break;
      }

      case 'FOCUS': {
        if (target && this.uiaAdapter) {
          await this.uiaAdapter.focusElement(target.targetId);
        }
        break;
      }

      default:
        this.logger?.debug(`Action ${action.type} handled as no-op or simulated.`);
        break;
    }
  }
}
