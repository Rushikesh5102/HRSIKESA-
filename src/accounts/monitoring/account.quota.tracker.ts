import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import {
  AccountUsage,
  AccountRateLimitState,
} from '../types/account.types.js';
import { AccountRepository } from '../repository/account.repository.js';

export class AccountQuotaTracker {
  // In-memory active rate-limit cooldowns
  private readonly rateLimits = new Map<string, AccountRateLimitState>();
  // In-memory detailed stats
  private readonly stats = new Map<string, { success: number; failed: number }>();

  constructor(
    private readonly repository: AccountRepository,
    private readonly eventBus: EventBus | undefined,
    private readonly logger: ILogger
  ) {}

  /**
   * Record an invocation execution and update metrics
   */
  public recordInvocation(accountId: string, providerId: string, success: boolean, tokensUsed?: number): void {
    const nowIso = new Date().toISOString();
    const existing = this.repository.getAccountUsage(accountId);
    const requestsMade = (existing?.requestsMade || 0) + 1;
    const totalTokens = (existing?.tokensUsed || 0) + (tokensUsed || 0);

    const stat = this.stats.get(accountId) || { success: 0, failed: 0 };
    if (success) {
      stat.success += 1;
    } else {
      stat.failed += 1;
    }
    this.stats.set(accountId, stat);

    const usage: AccountUsage = {
      accountId,
      providerId,
      periodStart: existing?.periodStart || nowIso,
      periodEnd: nowIso,
      requestsMade,
      totalRequests: requestsMade,
      successfulRequests: stat.success,
      failedRequests: stat.failed,
      requestsRemaining: existing?.requestsRemaining ?? 'UNKNOWN',
      requestLimit: existing?.requestLimit ?? 'UNKNOWN',
      resetAt: existing?.resetAt,
      tokensUsed: totalTokens,
      totalTokens,
      quotas: [{ quotaType: 'UNKNOWN', remaining: null }],
      estimatedCostUsd: existing?.estimatedCostUsd ?? 0.0,
      updatedAt: nowIso,
    };

    this.repository.saveAccountUsage(usage);
  }

  /**
   * Record a rate limit hit (e.g., HTTP 429) and set backoff
   */
  public recordRateLimit(accountId: string, providerId: string, retryAfterSeconds?: number): void {
    const cooldownMs = (retryAfterSeconds ? retryAfterSeconds * 1000 : 60000);
    const resetAtMs = Date.now() + cooldownMs;

    const rateLimitState: AccountRateLimitState = {
      accountId,
      isRateLimited: true,
      retryAfterSeconds: retryAfterSeconds || 60,
      resetAt: resetAtMs,
      lastRateLimitedAt: Date.now(),
    };

    this.rateLimits.set(accountId, rateLimitState);
    this.logger.warn(`AccountQuotaTracker: Account "${accountId}" hit rate limit. Backoff for ${retryAfterSeconds || 60}s`);

    if (this.eventBus) {
      const evt = {
        id: `evt_ratelimit_${Date.now()}`,
        type: 'account.rate_limited',
        timestamp: Date.now(),
        source: 'AccountQuotaTracker',
        payload: {
          accountId,
          providerId,
          retryAfterSeconds: rateLimitState.retryAfterSeconds,
          resetAt: resetAtMs,
        },
      };
      if (typeof (this.eventBus as any).emit === 'function') {
        (this.eventBus as any).emit('account.rate_limited', evt);
      } else if (typeof (this.eventBus as any).publish === 'function') {
        (this.eventBus as any).publish(evt);
      }
    }
  }

  /**
   * Check if an account is currently rate limited
   */
  public isRateLimited(accountId: string): boolean {
    const state = this.rateLimits.get(accountId);
    if (!state || !state.isRateLimited) return false;

    const resetTime = typeof state.resetAt === 'number' ? state.resetAt : new Date(state.resetAt || 0).getTime();
    if (resetTime && Date.now() > resetTime) {
      this.rateLimits.delete(accountId);
      return false;
    }

    return true;
  }

  /**
   * Get rate limit state for an account
   */
  public getRateLimitState(accountId: string): AccountRateLimitState | undefined {
    return this.rateLimits.get(accountId);
  }

  /**
   * Get quota and usage for account. If provider does not expose quota, quota is UNKNOWN.
   */
  public getUsage(accountId: string): AccountUsage | undefined {
    const usage = this.repository.getAccountUsage(accountId);
    if (!usage) return undefined;
    const stat = this.stats.get(accountId) || { success: usage.requestsMade, failed: 0 };
    return {
      ...usage,
      totalRequests: usage.requestsMade,
      successfulRequests: stat.success,
      failedRequests: stat.failed,
      totalTokens: usage.tokensUsed || 0,
      quotas: [{ quotaType: 'UNKNOWN', remaining: null }],
    };
  }

  /**
   * Update real quota numbers from provider API headers/responses
   */
  public updateQuota(
    accountId: string,
    requestsRemaining: number | 'UNKNOWN',
    requestLimit: number | 'UNKNOWN',
    resetAt?: string
  ): void {
    const usage = this.repository.getAccountUsage(accountId);
    if (usage) {
      const updated: AccountUsage = {
        ...usage,
        requestsRemaining,
        requestLimit,
        resetAt: resetAt || usage.resetAt,
        updatedAt: new Date().toISOString(),
      };
      this.repository.saveAccountUsage(updated);
    }
  }
}
