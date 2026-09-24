/**
 * HRSIKESA (हृषीकेश) — Failure Recovery & Retry Classifier
 *
 * Classifies task and tool failures, determines safe retry viability,
 * prevents blind retry of destructive operations, and coordinates replanning.
 */

import { AgentTask } from '../interfaces/task.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export type FailureCategory =
  | 'transient'
  | 'permanent'
  | 'security_blocked'
  | 'resource_exhausted'
  | 'verification_failed'
  | 'unknown';

export interface ErrorClassification {
  readonly category: FailureCategory;
  readonly isRetryable: boolean;
  readonly reason: string;
  readonly suggestedAction: 'retry' | 'replan' | 'block_human' | 'fail';
  readonly suggestedBackoffMs?: number;
}

export class RecoveryManager {
  private readonly defaultMaxRetries: number;
  private readonly logger?: ILogger;

  constructor(defaultMaxRetries = 3, logger?: ILogger) {
    this.defaultMaxRetries = defaultMaxRetries;
    this.logger = logger?.child('RecoveryManager');
  }

  /**
   * Classify an error message and danger context.
   */
  public classifyError(
    errorMsg: string,
    dangerTier = 0,
    currentRetryCount = 0,
    maxRetries = this.defaultMaxRetries
  ): ErrorClassification {
    this.logger?.debug(`Classifying error: "${errorMsg.substring(0, 80)}" (dangerTier=${dangerTier}, retry=${currentRetryCount}/${maxRetries})`);
    const lower = errorMsg.toLowerCase();

    // 1. Security / Human approval blocks
    if (
      lower.includes('approval') ||
      lower.includes('permission denied') ||
      lower.includes('security violation') ||
      lower.includes('blocked by policy') ||
      lower.includes('tier 3') ||
      lower.includes('tier 4')
    ) {
      return {
        category: 'security_blocked',
        isRetryable: false,
        reason: 'Operation is blocked by security governance or requires human approval.',
        suggestedAction: 'block_human'
      };
    }

    // 2. Resource exhaustion
    if (
      lower.includes('critical_memory') ||
      lower.includes('out of memory') ||
      lower.includes('budget exceeded') ||
      lower.includes('max model calls')
    ) {
      return {
        category: 'resource_exhausted',
        isRetryable: false,
        reason: 'Execution stopped due to resource budget exhaustion.',
        suggestedAction: 'fail'
      };
    }

    // 3. Destructive action protection (never blindly retry Tier 2+ without care)
    if (dangerTier >= 2) {
      return {
        category: 'permanent',
        isRetryable: false,
        reason: `Destructive / Tier ${dangerTier} operation failed. Automatic blind retry is prohibited.`,
        suggestedAction: 'replan'
      };
    }

    // 4. Verification failure
    if (lower.includes('verification failed') || lower.includes('file not found') || lower.includes('content mismatch')) {
      if (currentRetryCount < maxRetries) {
        return {
          category: 'verification_failed',
          isRetryable: true,
          reason: `Verification failed (${errorMsg}). Safe to retry (${currentRetryCount + 1}/${maxRetries}).`,
          suggestedAction: 'retry'
        };
      }
      return {
        category: 'verification_failed',
        isRetryable: false,
        reason: `Verification failed after ${maxRetries} attempts. Re-planning required.`,
        suggestedAction: 'replan'
      };
    }

    // 5. Transient failures (timeouts, network, lock contention)
    if (
      lower.includes('timeout') ||
      lower.includes('econnrefused') ||
      lower.includes('fetch failed') ||
      lower.includes('lock') ||
      lower.includes('busy')
    ) {
      if (currentRetryCount < maxRetries) {
        return {
          category: 'transient',
          isRetryable: true,
          reason: `Transient failure detected (${errorMsg}). Safe to retry (${currentRetryCount + 1}/${maxRetries}).`,
          suggestedAction: 'retry'
        };
      }
      return {
        category: 'transient',
        isRetryable: false,
        reason: `Transient failure exceeded max retries (${maxRetries}).`,
        suggestedAction: 'fail'
      };
    }

    // 6. Default fallback
    if (currentRetryCount < maxRetries) {
      return {
        category: 'unknown',
        isRetryable: true,
        reason: `Unclassified failure. Attempting retry (${currentRetryCount + 1}/${maxRetries}).`,
        suggestedAction: 'retry'
      };
    }

    return {
      category: 'permanent',
      isRetryable: false,
      reason: `Task failed permanently: ${errorMsg}`,
      suggestedAction: 'replan'
    };
  }

  /**
   * Check if a task is eligible for retry.
   */
  public canRetry(task: AgentTask, classification: ErrorClassification): boolean {
    const currentRetries = task.retryCount || 0;
    const maxRetries = task.maxRetries ?? this.defaultMaxRetries;
    return classification.isRetryable && currentRetries < maxRetries;
  }
}
