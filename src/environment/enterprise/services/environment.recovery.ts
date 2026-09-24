/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Recovery Engine
 *
 * Phase 23: Governs bounded recovery from connection failures, network drops,
 * session timeouts, and remote process disruptions.
 * Strictly evaluates idempotency before authorizing retries.
 */

import { EventBus } from '../../../core/events/event-bus.js';
import { IEnvironmentAdapter, RemoteCommandOptions, RemoteCommandResult } from '../interfaces/environment.types.js';

export interface RecoveryOptions {
  readonly maxRetries?: number;
  readonly baseBackoffMs?: number;
  readonly maxBackoffMs?: number;
}

export class EnvironmentRecoveryEngine {
  public readonly eventBus?: EventBus;
  private readonly defaultMaxRetries = 3;
  private readonly defaultBaseBackoffMs = 500;
  private readonly defaultMaxBackoffMs = 5000;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Evaluates if a command or action is safe to retry automatically based on idempotency.
   */
  isIdempotent(commandOrAction: string, explicitFlag?: boolean): boolean {
    if (explicitFlag !== undefined) return explicitFlag;
    const lower = commandOrAction.toLowerCase().trim();

    // Known safe read-only operations
    const safePrefixes = ['get', 'list', 'describe', 'cat', 'ls', 'dir', 'pwd', 'whoami', 'echo', 'grep', 'find', 'stat', 'ps', 'uname', 'uptime'];
    const words = lower.split(/\s+/);
    if (words.length > 0 && safePrefixes.includes(words[0])) {
      return true;
    }

    // Mutating prefixes are non-idempotent by default
    const dangerousPrefixes = ['create', 'delete', 'rm', 'rmdir', 'format', 'mkfs', 'drop', 'pay', 'send', 'deploy', 'terminate', 'kill'];
    if (words.length > 0 && dangerousPrefixes.includes(words[0])) {
      return false;
    }

    return false;
  }

  /**
   * Executes an operation with bounded retry and backoff, strictly enforcing idempotency.
   */
  async executeWithRecovery(
    adapter: IEnvironmentAdapter,
    command: string,
    options?: RemoteCommandOptions,
    recoveryOpts?: RecoveryOptions,
  ): Promise<RemoteCommandResult> {
    const maxRetries = recoveryOpts?.maxRetries ?? this.defaultMaxRetries;
    const baseBackoffMs = recoveryOpts?.baseBackoffMs ?? this.defaultBaseBackoffMs;
    const maxBackoffMs = recoveryOpts?.maxBackoffMs ?? this.defaultMaxBackoffMs;
    const isIdempotent = this.isIdempotent(command, options?.isIdempotent);

    let attempts = 0;
    let lastResult: RemoteCommandResult | undefined;

    while (attempts < maxRetries) {
      attempts++;
      try {
        if (!adapter.isConnected()) {
          await adapter.connect();
        }

        const result = await adapter.executeCommand(command, options);
        if (result.success || !isIdempotent) {
          // If non-idempotent, return immediately after first attempt (success or failure)
          return result;
        }

        lastResult = result;
      } catch (err) {
        if (!isIdempotent) {
          throw err;
        }
      }

      if (attempts < maxRetries && isIdempotent) {
        const delay = Math.min(baseBackoffMs * Math.pow(2, attempts - 1), maxBackoffMs);
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    if (lastResult) return lastResult;
    throw new Error(`[EnvironmentRecoveryEngine] Operation failed after ${maxRetries} attempts on environment ${adapter.environmentId}`);
  }
}
