/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Service & Account Integration Fabric (FP-12)
 *
 * Master facade bridging HṚṢĪKEŚA, FP-11 Workflow Engine, FP-07 Capability Fabric,
 * and external authenticated providers & services.
 */

import { DatabaseSync } from 'node:sqlite';
import { ILogger } from '../core/logging/logger.types.js';
import { EventBus } from '../core/events/event-bus.js';
import {
  ServiceProvider,
  ServiceAccount,
  AccountHealth,
  AccountUsage,
  ProviderOperationResult,
} from './types/account.types.js';
import { AccountRepository } from './repository/account.repository.js';
import { CredentialVault } from './vault/credential.vault.js';
import { ProviderAdapterRegistry } from './adapters/provider.adapter.registry.js';
import { OAuthManager } from './oauth/oauth.manager.js';
import { AccountResolver, AccountResolutionContext } from './routing/account.resolver.js';
import { AccountHealthMonitor } from './monitoring/account.health.monitor.js';
import { AccountQuotaTracker } from './monitoring/account.quota.tracker.js';
import { AccountWebhookManager, WebhookIncomingRequest, WebhookProcessingResult } from './webhooks/account.webhook.manager.js';
import { AccountIntentResolver, AccountIntentResult } from './intent/account.intent.resolver.js';

// Adapters
import { GoogleProviderAdapter } from './adapters/google.provider.adapter.js';
import { GitHubProviderAdapter } from './adapters/github.provider.adapter.js';
import { MicrosoftProviderAdapter } from './adapters/microsoft.provider.adapter.js';
import { SlackProviderAdapter } from './adapters/slack.provider.adapter.js';
import { GenericRestProviderAdapter } from './adapters/generic_rest.provider.adapter.js';
import { ApiKeyProviderAdapter } from './adapters/apikey.provider.adapter.js';
import { CliProviderAdapter } from './adapters/cli.provider.adapter.js';
import { McpProviderAdapter } from './adapters/mcp.provider.adapter.js';

export interface AccountFabricOptions {
  storageDir?: string;
  vaultKeyPath?: string;
}

export class AccountFabric {
  public readonly repository: AccountRepository;
  public readonly vault: CredentialVault;
  public readonly adapterRegistry: ProviderAdapterRegistry;
  public readonly oauthManager: OAuthManager;
  public readonly resolver: AccountResolver;
  public readonly healthMonitor: AccountHealthMonitor;
  public readonly quotaTracker: AccountQuotaTracker;
  public readonly webhookManager: AccountWebhookManager;
  public readonly intentResolver: AccountIntentResolver;

  constructor(
    db: DatabaseSync,
    private readonly logger: ILogger,
    private readonly eventBus?: EventBus,
    options?: AccountFabricOptions
  ) {
    this.repository = new AccountRepository(db);
    this.vault = new CredentialVault(this.repository, this.logger, {
      storageDir: options?.storageDir,
      keyPath: options?.vaultKeyPath,
    });
    this.adapterRegistry = new ProviderAdapterRegistry(this.logger);
    this.oauthManager = new OAuthManager(
      this.repository,
      this.vault,
      this.adapterRegistry,
      this.eventBus,
      this.logger
    );
    this.resolver = new AccountResolver(this.repository, this.adapterRegistry, this.logger);
    this.healthMonitor = new AccountHealthMonitor(
      this.repository,
      this.adapterRegistry,
      this.vault,
      this.eventBus,
      this.logger
    );
    this.quotaTracker = new AccountQuotaTracker(this.repository, this.eventBus, this.logger);
    this.webhookManager = new AccountWebhookManager(
      this.repository,
      this.vault,
      this.eventBus,
      this.logger
    );
    this.intentResolver = new AccountIntentResolver(
      this.repository,
      this.adapterRegistry,
      this.oauthManager,
      this.healthMonitor,
      this.logger
    );

    // Register default built-in providers
    this.registerDefaultAdapters();
  }

  /**
   * Register default provider adapters & persist their definitions in DB
   */
  private registerDefaultAdapters(): void {
    const adapters = [
      new GoogleProviderAdapter(this.logger),
      new GitHubProviderAdapter(this.logger),
      new MicrosoftProviderAdapter(this.logger),
      new SlackProviderAdapter(this.logger),
      new GenericRestProviderAdapter(this.logger),
      new ApiKeyProviderAdapter(this.logger),
      new CliProviderAdapter(this.logger),
      new McpProviderAdapter(this.logger),
    ];

    for (const adapter of adapters) {
      this.adapterRegistry.registerAdapter(adapter);
      this.repository.saveProvider(adapter.providerDefinition);
    }
  }

  /**
   * Initialize Account Fabric, start health monitor
   */
  public async initialize(): Promise<void> {
    this.logger.info('AccountFabric: Initializing Universal Service & Account Integration Fabric (FP-12)');
    this.healthMonitor.start();
  }

  /**
   * Shutdown Account Fabric
   */
  public async shutdown(): Promise<void> {
    this.logger.info('AccountFabric: Shutting down');
    this.healthMonitor.stop();
  }

  /**
   * Core capability execution pipeline with account resolution, credential injection, and safety checks
   */
  public async invokeCapability(
    capabilityId: string,
    params: Record<string, unknown>,
    context?: Partial<AccountResolutionContext>
  ): Promise<ProviderOperationResult> {
    const startTime = Date.now();

    try {
      // 1. Resolve authorized account
      const account = this.resolver.resolveAccount({
        capabilityId,
        ...context,
      });

      // 2. Check rate limit cooldown
      if (this.quotaTracker.isRateLimited(account.id)) {
        const rateLimit = this.quotaTracker.getRateLimitState(account.id);
        return {
          success: false,
          capabilityId,
          providerId: account.providerId,
          accountId: account.id,
          error: {
            category: 'RATE_LIMITED',
            message: `Account "${account.id}" is rate limited. Backoff active until ${new Date(rateLimit?.resetAt || 0).toISOString()}`,
            retryable: true,
          },
          executionTimeMs: Date.now() - startTime,
          timestamp: Date.now(),
        };
      }

      // 3. Resolve adapter
      const adapter = this.adapterRegistry.getAdapter(account.providerId);
      if (!adapter) {
        throw new Error(`No provider adapter registered for "${account.providerId}"`);
      }

      // 4. Resolve credentials from vault
      const creds = await this.vault.resolve(account.credentialRef);

      // 5. Handle token refresh if OAuth
      let accessToken = creds?.accessToken;
      if (accessToken && adapter.providerDefinition.authMethods.includes('OAUTH2')) {
        accessToken = await this.oauthManager.refreshTokenIfNeeded(account);
      }

      // 6. Execute operation
      const result = await adapter.invoke(capabilityId, params, {
        account,
        credentials: {
          accessToken,
          apiKey: creds?.apiKey,
          customHeaders: creds?.customHeaders,
        },
      });

      // 7. Track usage & rate limits
      const errorMsg = typeof result.error === 'string' ? result.error : result.error?.message;
      const errorCat = typeof result.error === 'object' ? result.error?.category : undefined;
      const isRateLimited = (errorMsg?.includes('429') || errorCat === 'RATE_LIMITED') ?? false;

      if (result.success) {
        this.quotaTracker.recordInvocation(account.id, account.providerId, true);
      } else {
        this.quotaTracker.recordInvocation(account.id, account.providerId, false);
        if (isRateLimited) {
          this.quotaTracker.recordRateLimit(account.id, account.providerId, 60);
        }
      }

      // 8. Audit log
      this.repository.saveAccountAudit({
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        accountId: account.id,
        providerId: account.providerId,
        actor: context?.ownerIdentity || account.ownerIdentity,
        capabilityId,
        operation: 'INVOKE',
        status: result.success ? 'SUCCESS' : isRateLimited ? 'RATE_LIMITED' : 'FAILED',
        riskLevel: 'LOW',
        latencyMs: result.executionTimeMs || result.latencyMs || 0,
        errorCategory: errorCat,
        timestamp: new Date().toISOString(),
      });

      // 9. Redact any secrets and apply prompt injection safety marker to result
      const sanitizedData = CredentialVault.redactSecrets(result.data);

      return {
        ...result,
        data: sanitizedData,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AccountFabric: Invocations failed for "${capabilityId}": ${msg}`);

      return {
        success: false,
        capabilityId,
        providerId: context?.providerId || 'unknown',
        error: {
          category: 'EXECUTION_FAILED',
          message: msg,
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  // Pass-through helpers
  public listProviders(): ServiceProvider[] {
    return this.adapterRegistry.listProviderDefinitions();
  }

  public getProvider(id: string): ServiceProvider | undefined {
    return this.adapterRegistry.getProviderDefinition(id);
  }

  public listAccounts(filter?: { providerId?: string; ownerIdentity?: string; companyId?: string; projectId?: string; status?: string }): ServiceAccount[] {
    return this.repository.listAccounts(filter as any);
  }

  public getAccount(id: string): ServiceAccount | null {
    return this.repository.getAccountById(id);
  }

  public async verifyAccount(id: string): Promise<AccountHealth> {
    return this.healthMonitor.verifyAccount(id);
  }

  public async revokeAccount(id: string): Promise<void> {
    return this.oauthManager.revokeAccount(id);
  }

  public deleteAccount(id: string): void {
    this.repository.deleteAccount(id);
  }

  public getAccountHealth(id: string): AccountHealth | undefined {
    return this.repository.getAccountHealth(id) ?? undefined;
  }

  public getAccountUsage(id: string): AccountUsage | undefined {
    return this.quotaTracker.getUsage(id);
  }

  public async processWebhook(req: WebhookIncomingRequest): Promise<WebhookProcessingResult> {
    return this.webhookManager.processWebhook(req);
  }

  public async resolveIntent(prompt: string, ownerIdentity = 'rushi'): Promise<AccountIntentResult> {
    return this.intentResolver.resolveIntent(prompt, ownerIdentity);
  }
}
