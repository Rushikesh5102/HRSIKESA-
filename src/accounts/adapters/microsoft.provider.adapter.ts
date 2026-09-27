/**
 * HṚṢĪKEŚA (हृषीकेश) — Microsoft 365 Provider Adapter
 *
 * FP-12: Adapter for Microsoft 365 (Outlook, Calendar, OneDrive, Teams via Microsoft Graph).
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

export class MicrosoftProviderAdapter extends BaseProviderAdapter {
  public readonly providerId = 'microsoft';

  public readonly providerDefinition: ServiceProvider = {
    id: 'microsoft',
    name: 'microsoft',
    displayName: 'Microsoft 365',
    description: 'Connects Microsoft account for Outlook Mail, Microsoft Calendar, OneDrive, and Microsoft Teams.',
    category: 'PRODUCTIVITY',
    authMethods: ['OAUTH2'],
    status: 'ENABLED',
    documentationUrl: 'https://learn.microsoft.com/en-us/graph/overview',
    privacyPolicyUrl: 'https://privacy.microsoft.com/en-us/privacystatement',
    iconUrl: '/icons/microsoft.svg',
    supportedScopes: [
      {
        scope: 'User.Read',
        description: 'Sign in and read user profile',
        riskLevel: 'LOW',
        required: true,
        grantedCapabilities: ['microsoft.user.profile'],
      },
      {
        scope: 'offline_access',
        description: 'Maintain access to data you have given it access to',
        riskLevel: 'LOW',
        required: true,
        grantedCapabilities: [],
      },
      {
        scope: 'Mail.Read',
        description: 'Read user mail in Outlook',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['microsoft.outlook.read', 'microsoft.outlook.search'],
      },
      {
        scope: 'Mail.Send',
        description: 'Send mail as the user',
        riskLevel: 'HIGH',
        required: false,
        grantedCapabilities: ['microsoft.outlook.send'],
      },
      {
        scope: 'Calendars.ReadWrite',
        description: 'Read and write user calendars',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['microsoft.calendar.list', 'microsoft.calendar.create'],
      },
      {
        scope: 'Files.ReadWrite',
        description: 'Read and write user OneDrive files',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['microsoft.onedrive.search', 'microsoft.onedrive.read', 'microsoft.onedrive.write'],
      },
    ],
    capabilities: [
      {
        id: 'microsoft.user.profile',
        name: 'Get User Profile',
        description: 'Get authenticated Microsoft user profile',
        action: 'READ',
        requiredScopes: ['User.Read'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'microsoft.outlook.read',
        name: 'Read Outlook Messages',
        description: 'Fetch messages from Outlook Inbox',
        action: 'READ',
        requiredScopes: ['Mail.Read'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'SECRET',
      },
      {
        id: 'microsoft.outlook.send',
        name: 'Send Outlook Email',
        description: 'Send an email through Microsoft Outlook',
        action: 'CREATE',
        requiredScopes: ['Mail.Send'],
        riskLevel: 'HIGH',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'microsoft.calendar.list',
        name: 'List Calendar Events',
        description: 'List upcoming events from Microsoft Calendar',
        action: 'READ',
        requiredScopes: ['Calendars.ReadWrite'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'microsoft.calendar.create',
        name: 'Create Calendar Event',
        description: 'Create a calendar meeting/event in Microsoft Calendar',
        action: 'CREATE',
        requiredScopes: ['Calendars.ReadWrite'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'microsoft.onedrive.search',
        name: 'Search OneDrive',
        description: 'Search files and folders in Microsoft OneDrive',
        action: 'READ',
        requiredScopes: ['Files.ReadWrite'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'microsoft.onedrive.read',
        name: 'Read OneDrive File',
        description: 'Read file metadata and content from Microsoft OneDrive',
        action: 'READ',
        requiredScopes: ['Files.ReadWrite'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
    ],
    defaultScopes: ['User.Read', 'offline_access'],
    webhookSupport: true,
    provenance: {
      source: 'Microsoft Graph REST API',
      officialApi: 'https://learn.microsoft.com/en-us/graph/api/overview',
      officialDocsUrl: 'https://learn.microsoft.com/en-us/graph/api/overview',
      version: 'v1.0',
      license: 'MIT',
      implementationProvenance: 'HṚṢĪKEŚA native Microsoft adapter',
      providerAuthor: 'Microsoft Corporation',
      verifiedAt: Date.now(),
    },
    metadata: {
      defaultAuthEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      defaultTokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  constructor(logger: ILogger) {
    super(
      logger,
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    );
  }

  public async validateConnection(
    account: ServiceAccount,
    credentials?: { accessToken?: string }
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }> {
    const token = credentials?.accessToken;
    const nowIso = new Date().toISOString();

    if (!token) {
      return {
        valid: false,
        error: 'Missing access token for Microsoft validation',
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
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          valid: false,
          error: `Microsoft Graph user check failed (${response.status}): ${errText}`,
          health: {
            accountId: account.id,
            providerId: this.providerId,
            status: response.status === 401 ? 'EXPIRED' : 'DEGRADED',
            latencyMs: 0,
            failureCount: 1,
            consecutiveErrors: 1,
            lastError: `HTTP ${response.status}: ${errText}`,
            updatedAt: nowIso,
          },
        };
      }

      const userData = (await response.json()) as { userPrincipalName?: string; mail?: string; displayName?: string };
      const identity = userData.mail || userData.userPrincipalName || userData.displayName || 'Microsoft User';

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
        error: `Network error during Microsoft validation: ${msg}`,
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
    const token = options.credentials?.accessToken;
    const startTime = Date.now();

    if (!token) {
      return {
        success: false,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        error: {
          category: 'AUTH_FAILED',
          message: 'No access token available for Microsoft invocation',
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    try {
      let resultData: unknown;

      switch (capabilityId) {
        case 'microsoft.user.profile': {
          resultData = await this.fetchJson('https://graph.microsoft.com/v1.0/me', token);
          break;
        }

        case 'microsoft.outlook.read': {
          const top = (params.top as number) || 10;
          resultData = await this.fetchJson(
            `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$select=subject,sender,bodyPreview,receivedDateTime`,
            token
          );
          break;
        }

        case 'microsoft.outlook.send': {
          const to = params.to as string;
          const subject = params.subject as string;
          const body = params.body as string;
          if (!to || !subject || !body) throw new Error('Missing params: to, subject, body');
          resultData = await this.postJson(
            'https://graph.microsoft.com/v1.0/me/sendMail',
            token,
            {
              message: {
                subject,
                body: {
                  contentType: 'Text',
                  content: body,
                },
                toRecipients: [
                  {
                    emailAddress: {
                      address: to,
                    },
                  },
                ],
              },
              saveToSentItems: 'true',
            }
          );
          break;
        }

        case 'microsoft.calendar.list': {
          const top = (params.top as number) || 10;
          resultData = await this.fetchJson(
            `https://graph.microsoft.com/v1.0/me/events?$top=${top}&$select=subject,start,end,location`,
            token
          );
          break;
        }

        case 'microsoft.calendar.create': {
          const subject = params.subject as string;
          const start = params.start as string;
          const end = params.end as string;
          if (!subject || !start || !end) throw new Error('Missing params: subject, start, end');
          resultData = await this.postJson(
            'https://graph.microsoft.com/v1.0/me/events',
            token,
            {
              subject,
              start: { dateTime: start, timeZone: 'UTC' },
              end: { dateTime: end, timeZone: 'UTC' },
            }
          );
          break;
        }

        case 'microsoft.onedrive.search': {
          const query = (params.query as string) || '';
          resultData = await this.fetchJson(
            `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(query)}')`,
            token
          );
          break;
        }

        case 'microsoft.onedrive.read': {
          const itemId = params.item_id as string;
          if (!itemId) throw new Error('Missing required param: item_id');
          resultData = await this.fetchJson(
            `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(itemId)}`,
            token
          );
          break;
        }

        default:
          throw new Error(`Capability ${capabilityId} not implemented by Microsoft provider`);
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
          retryable: msg.includes('429') || msg.includes('503'),
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  private async fetchJson(url: string, token: string): Promise<unknown> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Microsoft Graph request failed (${res.status}): ${txt}`);
    }
    return res.json();
  }

  private async postJson(url: string, token: string, body: unknown): Promise<unknown> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status !== 202 && res.status !== 204) {
      const txt = await res.text();
      throw new Error(`Microsoft Graph POST failed (${res.status}): ${txt}`);
    }
    if (res.status === 204 || res.status === 202) {
      return { status: 'accepted' };
    }
    return res.json();
  }
}
