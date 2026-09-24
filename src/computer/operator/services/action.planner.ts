/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Action Planner
 *
 * Phase 22: Translates high-level user intents into bounded structured action sequences
 * with loop detection and execution bounds limits.
 */

import crypto from 'node:crypto';
import { ILogger } from '../../../core/logging/logger.types.js';
import {
  ComputerAction,
  ComputerTask,
  DesktopObservation,
} from '../interfaces/operator.types.js';

export interface PlanResult {
  readonly actions: ComputerAction[];
  readonly estimatedDurationMs: number;
  readonly rationale: string;
}

export class ComputerActionPlanner {
  private readonly logger?: ILogger;
  private readonly maxPlanActions = 25;
  private stateHistory: string[] = [];

  constructor(logger?: ILogger) {
    this.logger = logger?.child('ComputerActionPlanner');
  }

  /**
   * Plans structured action steps given a task objective and initial observation.
   */
  public planActions(task: ComputerTask, _observation?: DesktopObservation): PlanResult {
    this.logger?.info(`Planning computer actions for task: '${task.objective}'`);
    const objective = task.objective.toLowerCase();
    const actions: ComputerAction[] = [];

    // 1. App Launch & File Workflows (e.g. Notepad, Calculator, Explorer)
    if (objective.includes('notepad') || (task.targetApplication && task.targetApplication.toLowerCase().includes('notepad'))) {
      actions.push({
        id: crypto.randomUUID(),
        type: 'LAUNCH',
        params: { appName: 'notepad.exe' },
        preconditions: undefined,
        expectedVerification: { strategy: 'WINDOW_PRESENT', expectedProcessName: 'notepad.exe' },
        riskTier: 'LOW_RISK',
      });

      actions.push({
        id: crypto.randomUUID(),
        type: 'WAIT',
        params: { waitMs: 600 },
        riskTier: 'SAFE',
      });

      if (objective.includes('type') || objective.includes('write') || objective.includes('enter')) {
        const textMatch = task.objective.match(/["']([^"']+)["']/);
        const textToType = textMatch ? textMatch[1] : 'HṚṢĪKEŚA Computer Operator Verification';

        actions.push({
          id: crypto.randomUUID(),
          type: 'TYPE',
          target: { query: 'Text Editor', expectedControlType: 'Edit' },
          params: { text: textToType },
          preconditions: { expectedWindow: 'Notepad' },
          expectedVerification: { strategy: 'ELEMENT_VALUE', expectedValue: textToType },
          riskTier: 'LOW_RISK',
        });
      }

      if (objective.includes('save') || objective.includes('create')) {
        actions.push({
          id: crypto.randomUUID(),
          type: 'HOTKEY',
          params: { hotkeyModifiers: ['Ctrl'], key: 's' },
          preconditions: { expectedWindow: 'Notepad' },
          expectedVerification: { strategy: 'UI_TREE_CHANGED' },
          riskTier: 'LOW_RISK',
        });
      }

      if (objective.includes('close')) {
        actions.push({
          id: crypto.randomUUID(),
          type: 'HOTKEY',
          params: { hotkeyModifiers: ['Alt'], key: 'F4' },
          expectedVerification: { strategy: 'WINDOW_ABSENT', expectedProcessName: 'notepad.exe' },
          riskTier: 'LOW_RISK',
        });
      }
    } else if (objective.includes('calculator') || (task.targetApplication && task.targetApplication.toLowerCase().includes('calc'))) {
      actions.push({
        id: crypto.randomUUID(),
        type: 'LAUNCH',
        params: { appName: 'calc.exe' },
        expectedVerification: { strategy: 'WINDOW_PRESENT', expectedProcessName: 'CalculatorApp' },
        riskTier: 'LOW_RISK',
      });
    } else {
      // Generic fallback: Single target click / open step
      actions.push({
        id: crypto.randomUUID(),
        type: 'CLICK',
        target: { query: task.objective },
        riskTier: 'LOW_RISK',
        expectedVerification: { strategy: 'UI_TREE_CHANGED' },
      });
    }

    const trimmed = actions.slice(0, Math.min(task.maxActions, this.maxPlanActions));
    return {
      actions: trimmed,
      estimatedDurationMs: trimmed.length * 800,
      rationale: `Planned ${trimmed.length} structured computer actions for objective: '${task.objective}'`,
    };
  }

  /**
   * Evaluates whether a state transition loop is occurring (e.g. repeated identical dom hashes).
   */
  public detectLoop(domHash: string): boolean {
    this.stateHistory.push(domHash);
    if (this.stateHistory.length > 10) {
      this.stateHistory.shift();
    }

    // Check if the last 4 states are identical
    if (this.stateHistory.length >= 4) {
      const last4 = this.stateHistory.slice(-4);
      if (last4.every((h) => h === domHash)) {
        this.logger?.warn(`Loop detected: State hash '${domHash}' repeated 4 consecutive times.`);
        return true;
      }
    }
    return false;
  }

  public clearHistory(): void {
    this.stateHistory = [];
  }
}
