/**
 * HṚṢĪKEŚA (हृषीकेश) — Natural Language Account & Service Intent Resolver
 *
 * FP-12: Deterministic intent parser for account management & service discovery.
 * Fast, robust, and operates with zero LLM overhead for standard operations.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { AccountRepository } from '../repository/account.repository.js';
import { ProviderAdapterRegistry } from '../adapters/provider.adapter.registry.js';
import { OAuthManager } from '../oauth/oauth.manager.js';
import { AccountHealthMonitor } from '../monitoring/account.health.monitor.js';

export interface AccountIntentResult {
  handled: boolean;
  intent?: 'CONNECT' | 'LIST_ACCOUNTS' | 'LIST_SERVICES' | 'INSPECT_ACCOUNT' | 'TEST_CONNECTION' | 'DISCONNECT';
  providerId?: string;
  accountId?: string;
  responseMessage: string;
  data?: unknown;
}

export class AccountIntentResolver {
  constructor(
    private readonly repository: AccountRepository,
    private readonly adapterRegistry: ProviderAdapterRegistry,
    private readonly oauthManager: OAuthManager,
    private readonly healthMonitor: AccountHealthMonitor,
    logger?: ILogger
  ) {
    if (logger) {
      // logger reference
    }
  }

  /**
   * Deterministically analyze user prompt and execute account actions if recognized
   */
  public async resolveIntent(prompt: string, ownerIdentity = 'rushi'): Promise<AccountIntentResult> {
    const text = prompt.trim().toLowerCase();

    // 1. "Connect [provider]" e.g., "connect my google account", "connect github"
    const connectMatch = text.match(/\bconnect(?:\s+my)?\s+([a-z0-9_-]+)(?:\s+account)?/i);
    if (connectMatch && !text.includes('which') && !text.includes('what') && !text.includes('disconnect')) {
      const candidateProvider = this.normalizeProviderName(connectMatch[1]);
      if (candidateProvider) {
        return this.handleConnectIntent(candidateProvider, ownerIdentity);
      }
    }

    // 2. "Which accounts are connected?" / "List connected accounts" / "Show my accounts"
    if (
      text.includes('which accounts') ||
      text.includes('connected accounts') ||
      text.includes('list accounts') ||
      text.includes('my accounts') ||
      text.includes('what accounts')
    ) {
      return this.handleListAccountsIntent();
    }

    // 3. "What services can you connect?" / "What can you access?" / "List providers"
    if (
      text.includes('what services') ||
      text.includes('what can you connect') ||
      text.includes('what can i connect') ||
      text.includes('list providers') ||
      text.includes('available services')
    ) {
      return this.handleListServicesIntent();
    }

    // 4. "Test [provider] connection" / "Verify [provider]"
    const testMatch = text.match(/(?:test|verify|check)(?:\s+my)?\s+([a-z0-9_-]+)(?:\s+connection|\s+account)?/i);
    if (testMatch) {
      const candidateProvider = this.normalizeProviderName(testMatch[1]);
      if (candidateProvider) {
        return this.handleTestConnectionIntent(candidateProvider);
      }
    }

    // 5. "Disconnect [provider]" / "Revoke [provider]"
    const disconnectMatch = text.match(/(?:disconnect|revoke|remove)(?:\s+my)?\s+([a-z0-9_-]+)(?:\s+account)?/i);
    if (disconnectMatch) {
      const candidateProvider = this.normalizeProviderName(disconnectMatch[1]);
      if (candidateProvider) {
        return this.handleDisconnectIntent(candidateProvider);
      }
    }

    // 6. "What permissions does [provider] have?"
    const permMatch = text.match(/what permissions does\s+([a-z0-9_-]+)/i);
    if (permMatch) {
      const candidateProvider = this.normalizeProviderName(permMatch[1]);
      if (candidateProvider) {
        return this.handlePermissionsIntent(candidateProvider);
      }
    }

    return {
      handled: false,
      responseMessage: '',
    };
  }

  private normalizeProviderName(raw: string): string | undefined {
    const cleaned = raw.toLowerCase().trim();
    if (cleaned.includes('google') || cleaned.includes('gmail') || cleaned.includes('drive')) return 'google';
    if (cleaned.includes('github') || cleaned.includes('git')) return 'github';
    if (cleaned.includes('microsoft') || cleaned.includes('outlook') || cleaned.includes('365')) return 'microsoft';
    if (cleaned.includes('slack')) return 'slack';
    if (cleaned.includes('rest') || cleaned.includes('api')) return 'generic_rest';
    if (cleaned.includes('cli')) return 'cli_tools';
    if (cleaned.includes('mcp')) return 'mcp_server';
    return undefined;
  }

  private async handleConnectIntent(providerId: string, ownerIdentity: string): Promise<AccountIntentResult> {
    const adapter = this.adapterRegistry.getAdapter(providerId);
    if (!adapter) {
      return {
        handled: true,
        intent: 'CONNECT',
        providerId,
        responseMessage: `Provider "${providerId}" is not currently recognized or supported.`,
      };
    }

    const providerDef = adapter.providerDefinition;
    if (providerDef.authMethods.includes('OAUTH2')) {
      const authReq = await this.oauthManager.initiateAuthorization({
        providerId,
        ownerIdentity,
        scopeType: 'PERSONAL',
      });

      return {
        handled: true,
        intent: 'CONNECT',
        providerId,
        responseMessage: `Initiated OAuth authorization for ${providerDef.displayName}.\n\nPlease open this URL in your browser to authorize HṚṢĪKEŚA:\n\n${authReq.authorizationUrl}\n\nRequested scopes: ${authReq.scopes.join(', ')}`,
        data: {
          requestId: authReq.id,
          authUrl: authReq.authorizationUrl,
          expiresAt: authReq.expiresAt,
        },
      };
    }

    return {
      handled: true,
      intent: 'CONNECT',
      providerId,
      responseMessage: `Provider ${providerDef.displayName} connects using static API key or configuration. Please configure via Control Center UI or CLI ("hres account connect ${providerId}").`,
    };
  }

  private handleListAccountsIntent(): AccountIntentResult {
    const accounts = this.repository.listAccounts();
    if (accounts.length === 0) {
      return {
        handled: true,
        intent: 'LIST_ACCOUNTS',
        responseMessage: 'No external service accounts are currently connected to HṚṢĪKEŚA. You can connect services such as Google, GitHub, Microsoft, or Slack using "Connect <service>".',
        data: [],
      };
    }

    const lines = ['### Connected Service Accounts:'];
    for (const acc of accounts) {
      const health = this.repository.getAccountHealth(acc.id);
      const healthStr = health?.status || 'UNKNOWN';
      const capCount = (acc.metadata?.capabilities as string[] | undefined)?.length || 0;
      const identity = acc.accountName || acc.email || acc.ownerIdentity || acc.id;
      lines.push(`- **${acc.providerId.toUpperCase()}** (${identity}) — Status: \`${acc.status}\` | Health: \`${healthStr}\` | Capabilities: ${capCount} active`);
    }

    return {
      handled: true,
      intent: 'LIST_ACCOUNTS',
      responseMessage: lines.join('\n'),
      data: accounts,
    };
  }

  private handleListServicesIntent(): AccountIntentResult {
    const providers = this.adapterRegistry.listProviderDefinitions();
    const lines = ['### Available External Services & Providers:'];

    for (const p of providers) {
      lines.push(`- **${p.displayName}** (\`${p.id}\`): ${p.description} [Auth: ${p.authMethods.join(', ')}]`);
    }

    return {
      handled: true,
      intent: 'LIST_SERVICES',
      responseMessage: lines.join('\n'),
      data: providers,
    };
  }

  private async handleTestConnectionIntent(providerId: string): Promise<AccountIntentResult> {
    const accounts = this.repository.listAccounts({ providerId });
    if (accounts.length === 0) {
      return {
        handled: true,
        intent: 'TEST_CONNECTION',
        providerId,
        responseMessage: `No connected accounts found for provider "${providerId}".`,
      };
    }

    const account = accounts[0];
    const health = await this.healthMonitor.verifyAccount(account.id);
    const identity = account.accountName || account.email || account.ownerIdentity || account.id;

    return {
      handled: true,
      intent: 'TEST_CONNECTION',
      providerId,
      accountId: account.id,
      responseMessage: `Connection test for ${providerId} (${identity}): Status \`${health.status}\`${health.latencyMs ? ` (Latency: ${health.latencyMs}ms)` : ''}${health.lastFailure ? ` - Error: ${health.lastFailure}` : ''}.`,
      data: health,
    };
  }

  private async handleDisconnectIntent(providerId: string): Promise<AccountIntentResult> {
    const accounts = this.repository.listAccounts({ providerId });
    if (accounts.length === 0) {
      return {
        handled: true,
        intent: 'DISCONNECT',
        providerId,
        responseMessage: `No connected accounts found for provider "${providerId}".`,
      };
    }

    for (const acc of accounts) {
      await this.oauthManager.revokeAccount(acc.id);
    }

    return {
      handled: true,
      intent: 'DISCONNECT',
      providerId,
      responseMessage: `Successfully disconnected and revoked all accounts for "${providerId}".`,
    };
  }

  private handlePermissionsIntent(providerId: string): AccountIntentResult {
    const accounts = this.repository.listAccounts({ providerId });
    if (accounts.length === 0) {
      return {
        handled: true,
        intent: 'INSPECT_ACCOUNT',
        providerId,
        responseMessage: `No connected accounts found for provider "${providerId}".`,
      };
    }

    const acc = accounts[0];
    const scopes = acc.scopes.map(s => `- \`${s}\``);
    const identity = acc.accountName || acc.email || acc.ownerIdentity || acc.id;

    return {
      handled: true,
      intent: 'INSPECT_ACCOUNT',
      providerId,
      accountId: acc.id,
      responseMessage: `### Permissions for ${providerId.toUpperCase()} (${identity}):\n${scopes.join('\n')}`,
      data: acc.scopes,
    };
  }
}
