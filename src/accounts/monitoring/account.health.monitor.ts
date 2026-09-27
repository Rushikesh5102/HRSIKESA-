/**
 * HṚṢĪKEŚA (हृषीकेश) — Account Health Monitor
 *
 * FP-12: Proactive health monitoring and verification of connected service accounts.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { AccountHealth, ServiceAccount } from '../types/account.types.js';
import { AccountRepository } from '../repository/account.repository.js';
import { ProviderAdapterRegistry } from '../adapters/provider.adapter.registry.js';
import { CredentialVault } from '../vault/credential.vault.js';

export class AccountHealthMonitor {
  private timer: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly repository: AccountRepository,
    private readonly adapterRegistry: ProviderAdapterRegistry,
    private readonly vault: CredentialVault,
    private readonly eventBus: EventBus | undefined,
    private readonly logger: ILogger
  ) {}

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.checkAllAccounts().catch(err => {
        this.logger.error(`AccountHealthMonitor: Periodic check error: ${err}`);
      });
    }, this.checkIntervalMs);
    if (this.timer.unref) {
      this.timer.unref();
    }
    this.logger.info('AccountHealthMonitor: Started periodic health checks');
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info('AccountHealthMonitor: Stopped periodic health checks');
    }
  }

  /**
   * Verify an individual account with provider
   */
  public async verifyAccount(accountId: string): Promise<AccountHealth> {
    const account = this.repository.getAccountById(accountId);
    if (!account) {
      throw new Error(`Account "${accountId}" not found`);
    }

    const adapter = this.adapterRegistry.getAdapter(account.providerId);
    if (!adapter) {
      throw new Error(`No adapter found for provider "${account.providerId}"`);
    }

    const creds = await this.vault.resolve(account.credentialRef);
    const startMs = Date.now();

    const validation = await adapter.validateConnection(account, {
      accessToken: creds?.accessToken,
      apiKey: creds?.apiKey,
      customHeaders: creds?.customHeaders,
    });

    const latencyMs = Date.now() - startMs;
    const previousHealth = this.repository.getAccountHealth(accountId);
    const nowIso = new Date().toISOString();

    const updatedHealth: AccountHealth = {
      ...validation.health,
      latencyMs,
      updatedAt: nowIso,
    };

    // Update account status if needed
    if (validation.valid && account.status !== 'CONNECTED') {
      const updatedAccount: ServiceAccount = {
        ...account,
        status: 'CONNECTED',
        lastVerifiedAt: nowIso,
        updatedAt: nowIso,
      };
      this.repository.saveAccount(updatedAccount);
    } else if (!validation.valid && account.status === 'CONNECTED') {
      const updatedAccount: ServiceAccount = {
        ...account,
        status: validation.health.status === 'EXPIRED' ? 'EXPIRED' : 'DEGRADED',
        updatedAt: nowIso,
      };
      this.repository.saveAccount(updatedAccount);
    }

    this.repository.saveAccountHealth(updatedHealth);

    // Emit event if status changed
    if (previousHealth?.status !== updatedHealth.status && this.eventBus) {
      const evt = {
        id: `evt_health_${Date.now()}`,
        type: 'account.health_changed',
        timestamp: Date.now(),
        source: 'AccountHealthMonitor',
        payload: {
          accountId,
          providerId: account.providerId,
          previousStatus: previousHealth?.status,
          currentStatus: updatedHealth.status,
          error: updatedHealth.lastFailure,
        },
      };
      if (typeof (this.eventBus as any).emit === 'function') {
        (this.eventBus as any).emit('account.health_changed', evt);
      } else if (typeof (this.eventBus as any).publish === 'function') {
        (this.eventBus as any).publish(evt);
      }
    }

    return updatedHealth;
  }

  /**
   * Check all active accounts
   */
  public async checkAllAccounts(): Promise<void> {
    const accounts = this.repository.listAccounts({ status: 'CONNECTED' });
    this.logger.debug(`AccountHealthMonitor: Checking health of ${accounts.length} connected accounts`);

    for (const account of accounts) {
      try {
        await this.verifyAccount(account.id);
      } catch (err) {
        this.logger.warn(`AccountHealthMonitor: Failed check for account "${account.id}": ${err}`);
      }
    }
  }
}
