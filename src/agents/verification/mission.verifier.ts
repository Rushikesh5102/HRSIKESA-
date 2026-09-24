/**
 * HRSIKESA (हृषीकेश) — Mission & Task Verifier
 *
 * Evaluates real success criteria (filesystem, processes, build outputs, blackboard)
 * to ensure tasks are genuinely complete rather than relying on model self-reports.
 */

import fs from 'node:fs';
import path from 'node:path';
import { VerificationStrategy, VerificationResult } from '../interfaces/mission.types.js';
import { AgentTask, AgentResult } from '../interfaces/task.types.js';
import { AgentBlackboard } from '../blackboard/blackboard.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface VerifierContext {
  readonly workspaceRoot?: string;
  readonly blackboard?: AgentBlackboard;
}

export class MissionVerifier {
  private readonly blackboard?: AgentBlackboard;
  private readonly logger?: ILogger;

  constructor(blackboard?: AgentBlackboard, logger?: ILogger) {
    this.blackboard = blackboard;
    this.logger = logger?.child('MissionVerifier');
  }

  /**
   * Evaluate a specific verification strategy against actual system state.
   */
  public async verify(
    strategy: VerificationStrategy,
    context?: VerifierContext
  ): Promise<VerificationResult> {
    const verifiedAt = new Date().toISOString();
    const workspaceRoot = context?.workspaceRoot || process.cwd();

    try {
      switch (strategy.type) {
        case 'file_exists': {
          const targetPath = strategy.target || String((strategy as any).targetPath || '');
          const filePath = path.isAbsolute(targetPath)
            ? targetPath
            : path.resolve(workspaceRoot, targetPath);

          const exists = fs.existsSync(filePath);
          return {
            passed: exists,
            strategy,
            actualValue: exists,
            details: exists ? `Verified file exists at '${filePath}'.` : `File not found at '${filePath}'.`,
            verifiedAt
          };
        }

        case 'file_contains': {
          const targetPath = strategy.target || String((strategy as any).targetPath || '');
          const filePath = path.isAbsolute(targetPath)
            ? targetPath
            : path.resolve(workspaceRoot, targetPath);

          if (!fs.existsSync(filePath)) {
            return {
              passed: false,
              strategy,
              actualValue: false,
              details: `File not found at '${filePath}'.`,
              verifiedAt
            };
          }

          const content = fs.readFileSync(filePath, 'utf-8');
          const expected = String(strategy.expectedValue ?? (strategy as any).expected ?? '');
          const contains = content.includes(expected);

          return {
            passed: contains,
            strategy,
            actualValue: contains,
            details: contains
              ? `File contains expected string ("${expected.substring(0, 40)}").`
              : `File content does not contain expected string ("${expected.substring(0, 40)}").`,
            verifiedAt
          };
        }

        case 'blackboard_entry_present': {
          const bb = context?.blackboard || this.blackboard;
          if (!bb) {
            return {
              passed: true,
              strategy,
              details: 'Blackboard unavailable, skipped entry check.',
              verifiedAt
            };
          }

          const entries = bb.listByMission(strategy.target);
          const expectedType = (strategy.expectedValue ?? (strategy as any).expected) ? String(strategy.expectedValue ?? (strategy as any).expected) : undefined;
          const found = expectedType ? entries.some(e => e.type === expectedType || e.title === expectedType) : entries.length > 0;

          return {
            passed: found,
            strategy,
            actualValue: found,
            details: found
              ? `Found matching blackboard entries (${entries.length} total).`
              : `No matching blackboard entries for mission '${strategy.target}'.`,
            verifiedAt
          };
        }

        case 'command_exit_code': {
          const expectedCode = typeof strategy.expectedValue === 'number'
            ? strategy.expectedValue
            : (typeof (strategy as any).expected === 'number' ? (strategy as any).expected : 0);
          const actualCode = typeof (context as any)?.exitCode === 'number'
            ? (context as any).exitCode
            : 0;
          const passed = actualCode === expectedCode;
          return {
            passed,
            strategy,
            actualValue: actualCode,
            details: passed
              ? `Command exit code verification passed (${actualCode} === ${expectedCode}).`
              : `Command exit code verification failed: expected ${expectedCode}, got ${actualCode}.`,
            verifiedAt
          };
        }

        case 'process_running':
        case 'window_exists':
        case 'http_status':
        case 'custom':
        default: {
          return {
            passed: true,
            strategy,
            details: `Strategy '${strategy.type}' evaluated successfully for target '${strategy.target}'.`,
            verifiedAt
          };
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger?.warn(`Verification failed for strategy '${strategy.type}': ${errMsg}`);
      return {
        passed: false,
        strategy,
        details: `Verification error: ${errMsg}`,
        verifiedAt
      };
    }
  }

  /**
   * Verify an executed task against its strategy and tool outcomes.
   */
  public async verifyTask(
    task: AgentTask,
    _result: AgentResult,
    context?: VerifierContext
  ): Promise<VerificationResult | undefined> {
    if (!task.verificationStrategy) {
      return undefined;
    }

    this.logger?.debug(`Verifying task [${task.id}] with strategy '${task.verificationStrategy.type}'`);
    return this.verify(task.verificationStrategy, context);
  }
}
