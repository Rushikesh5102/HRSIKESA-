/**
 * HṚṢĪKEŚA (हृषीकेश) — Slack Provider Adapter
 *
 * FP-12: Adapter for Slack (Channels, Messages, Search, Webhooks).
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  ServiceProvider,
  ServiceAccount,
  AccountHealth,
  ProviderOperationResult,
} from '../types/account.types.js';
import { BaseProviderAdapter } from './base.provider.adapter.js';
import { ProviderInvokeOptions } from './provider.adapter.interface.js';

export class SlackProviderAdapter extends BaseProviderAdapter {
  public readonly providerId = 'slack';

  public readonly providerDefinition: ServiceProvider = {
    id: 'slack',
    name: 'slack',
    displayName: 'Slack',
    description: 'Connects Slack workspace for channel discovery, reading messages, posting notifications, and search.',
    category: 'COMMUNICATION',
    authMethods: ['OAUTH2', 'API_KEY'],
    status: 'ENABLED',
    documentationUrl: 'https://api.slack.com/web',
    privacyPolicyUrl: 'https://slack.com/trust/privacy/privacy-policy',
    iconUrl: '/icons/slack.svg',
    supportedScopes: [
      {
        scope: 'users:read',
        description: 'View people in your workspace',
        riskLevel: 'LOW',
        required: true,
        grantedCapabilities: ['slack.auth.test'],
      },
      {
        scope: 'channels:read',
        description: 'View basic information about public channels in a workspace',
        riskLevel: 'LOW',
        required: true,
        grantedCapabilities: ['slack.channels.list'],
      },
      {
        scope: 'channels:history',
        description: 'View messages and other content in public channels that HṚṢĪKEŚA has been added to',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['slack.messages.read'],
      },
      {
        scope: 'chat:write',
        description: 'Send messages as HṚṢĪKEŚA',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['slack.messages.send'],
      },
      {
        scope: 'search:read',
        description: 'Search workspace content and messages',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['slack.search.messages'],
      },
    ],
    capabilities: [
      {
        id: 'slack.auth.test',
        name: 'Test Authentication',
        description: 'Checks authentication & identity with Slack',
        action: 'READ',
        requiredScopes: ['users:read'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'slack.channels.list',
        name: 'List Channels',
        description: 'Lists public conversations/channels in the Slack workspace',
        action: 'READ',
        requiredScopes: ['channels:read'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'slack.messages.read',
        name: 'Read Channel Messages',
        description: 'Fetches recent message history from a channel',
        action: 'READ',
        requiredScopes: ['channels:history'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'slack.messages.send',
        name: 'Post Message',
        description: 'Sends a message to a Slack channel',
        action: 'CREATE',
        requiredScopes: ['chat:write'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'slack.search.messages',
        name: 'Search Messages',
        description: 'Searches messages across authorized channels in Slack',
        action: 'READ',
        requiredScopes: ['search:read'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
    ],
    rateLimitSupport: true,
    usageSupport: true,
    webhookSupport: true,
    provenance: {
      source: 'Slack Web API',
      officialApi: 'https://api.slack.com/web',
      officialDocsUrl: 'https://api.slack.com/web',
      version: 'v2',
      license: 'MIT',
      implementationProvenance: 'HṚṢĪKEŚA native Slack adapter',
      providerAuthor: 'Slack Technologies / Salesforce',
      verifiedAt: Date.now(),
    },
    metadata: {
      defaultAuthEndpoint: 'https://slack.com/oauth/v2/authorize',
      defaultTokenEndpoint: 'https://slack.com/api/oauth.v2.access',
      apiBaseUrl: 'https://slack.com/api',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  constructor(logger: ILogger) {
    super(
      logger,
      'https://slack.com/oauth/v2/authorize',
      'https://slack.com/api/oauth.v2.access',
      'https://slack.com/api/auth.revoke'
    );
  }

  public async validateConnection(
    account: ServiceAccount,
    credentials?: { accessToken?: string; apiKey?: string }
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }> {
    const token = credentials?.accessToken || credentials?.apiKey;
    const nowIso = new Date().toISOString();

    if (!token) {
      return {
        valid: false,
        error: 'Missing access token or Bot token for Slack validation',
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'DEGRADED',
          latencyMs: 0,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: 'Missing access token',
          updatedAt: nowIso,
        },
      };
    }

    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = (await response.json()) as {
        ok: boolean;
        user?: string;
        user_id?: string;
        team?: string;
        error?: string;
      };

      if (!data.ok) {
        return {
          valid: false,
          error: `Slack auth.test failed: ${data.error || 'Unknown error'}`,
          health: {
            accountId: account.id,
            providerId: this.providerId,
            status: data.error === 'invalid_auth' || data.error === 'token_revoked' ? 'EXPIRED' : 'DEGRADED',
            latencyMs: 0,
            failureCount: 1,
            consecutiveErrors: 1,
            lastError: data.error,
            updatedAt: nowIso,
          },
        };
      }

      const identity = `${data.user || data.user_id} (${data.team || 'Slack Workspace'})`;

      return {
        valid: true,
        identity,
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'HEALTHY',
          latencyMs: 0,
          lastSuccessfulCheck: nowIso,
          failureCount: 0,
          consecutiveErrors: 0,
          updatedAt: nowIso,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `Network error during Slack validation: ${msg}`,
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'DEGRADED',
          latencyMs: 0,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: msg,
          updatedAt: nowIso,
        },
      };
    }
  }

  public async invoke(
    capabilityId: string,
    params: Record<string, unknown>,
    options: ProviderInvokeOptions
  ): Promise<ProviderOperationResult> {
    const token = options.credentials?.accessToken || options.credentials?.apiKey;
    const startTime = Date.now();

    if (!token) {
      return {
        success: false,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        error: {
          category: 'AUTH_FAILED',
          message: 'No access token or API key available for Slack invocation',
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    try {
      let resultData: unknown;

      switch (capabilityId) {
        case 'slack.auth.test': {
          resultData = await this.callSlackMethod('auth.test', token, {});
          break;
        }

        case 'slack.channels.list': {
          const limit = (params.limit as number) || 100;
          resultData = await this.callSlackMethod('conversations.list', token, {
            types: 'public_channel,private_channel',
            limit,
          });
          break;
        }

        case 'slack.messages.read': {
          const channel = params.channel as string;
          const limit = (params.limit as number) || 20;
          if (!channel) throw new Error('Missing required param: channel');
          resultData = await this.callSlackMethod('conversations.history', token, {
            channel,
            limit,
          });
          break;
        }

        case 'slack.messages.send': {
          const channel = params.channel as string;
          const text = params.text as string;
          if (!channel || !text) throw new Error('Missing required params: channel, text');
          resultData = await this.callSlackMethod('chat.postMessage', token, {
            channel,
            text,
          });
          break;
        }

        case 'slack.search.messages': {
          const query = params.query as string;
          if (!query) throw new Error('Missing required param: query');
          resultData = await this.callSlackMethod('search.messages', token, {
            query,
          });
          break;
        }

        default:
          throw new Error(`Capability ${capabilityId} not implemented by Slack provider`);
      }

      return {
        success: true,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        data: resultData,
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        error: {
          category: 'EXECUTION_FAILED',
          message: msg,
          retryable: msg.includes('ratelimited') || msg.includes('429'),
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  private async callSlackMethod(method: string, token: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Slack API HTTP error (${res.status}): ${txt}`);
    }

    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      throw new Error(`Slack API error on ${method}: ${data.error || 'Unknown error'}`);
    }
    return data;
  }
}
