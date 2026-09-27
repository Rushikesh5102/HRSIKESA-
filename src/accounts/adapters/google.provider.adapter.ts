/**
 * HṚṢĪKEŚA (हृषीकेश) — Google Provider Adapter
 *
 * FP-12: Adapter for Google Workspace (Gmail, Calendar, Drive, Docs, Sheets).
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

export class GoogleProviderAdapter extends BaseProviderAdapter {
  public readonly providerId = 'google';

  public readonly providerDefinition: ServiceProvider = {
    id: 'google',
    name: 'google',
    displayName: 'Google Workspace',
    description: 'Connects Google account for Gmail, Google Calendar, Google Drive, Docs, and Sheets.',
    category: 'PRODUCTIVITY',
    authMethods: ['OAUTH2'],
    status: 'ENABLED',
    documentationUrl: 'https://developers.google.com/identity/protocols/oauth2',
    privacyPolicyUrl: 'https://policies.google.com/privacy',
    iconUrl: '/icons/google.svg',
    supportedScopes: [
      {
        scope: 'https://www.googleapis.com/auth/userinfo.email',
        description: 'View your primary email address',
        riskLevel: 'LOW',
        required: true,
        grantedCapabilities: ['google.user.email'],
      },
      {
        scope: 'https://www.googleapis.com/auth/userinfo.profile',
        description: 'View your basic profile info',
        riskLevel: 'LOW',
        required: true,
        grantedCapabilities: ['google.user.profile'],
      },
      {
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        description: 'Read and search emails',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['google.gmail.read', 'google.gmail.search'],
      },
      {
        scope: 'https://www.googleapis.com/auth/gmail.send',
        description: 'Send emails on your behalf',
        riskLevel: 'HIGH',
        required: false,
        grantedCapabilities: ['google.gmail.send'],
      },
      {
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        description: 'View calendar events',
        riskLevel: 'LOW',
        required: false,
        grantedCapabilities: ['google.calendar.list'],
      },
      {
        scope: 'https://www.googleapis.com/auth/calendar.events',
        description: 'Create and modify calendar events',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['google.calendar.create', 'google.calendar.update'],
      },
      {
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        description: 'Search and read Google Drive files and documents',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: ['google.drive.search', 'google.drive.read', 'google.docs.read', 'google.sheets.read'],
      },
    ],
    capabilities: [
      {
        id: 'google.user.profile',
        name: 'Get User Profile',
        description: 'Fetch basic user profile and verified email address',
        action: 'READ',
        requiredScopes: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'google.gmail.search',
        name: 'Search Gmail Messages',
        description: 'Search messages in Gmail inbox with queries',
        action: 'READ',
        requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'SECRET',
      },
      {
        id: 'google.gmail.read',
        name: 'Read Gmail Message',
        description: 'Read full content and headers of an individual Gmail message',
        action: 'READ',
        requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'SECRET',
      },
      {
        id: 'google.gmail.send',
        name: 'Send Gmail Email',
        description: 'Send an email message via Gmail',
        action: 'CREATE',
        requiredScopes: ['https://www.googleapis.com/auth/gmail.send'],
        riskLevel: 'HIGH',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'google.calendar.list',
        name: 'List Calendar Events',
        description: 'List upcoming events and appointments from Google Calendar',
        action: 'READ',
        requiredScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'google.calendar.create',
        name: 'Create Calendar Event',
        description: 'Schedule a new meeting/event in Google Calendar',
        action: 'CREATE',
        requiredScopes: ['https://www.googleapis.com/auth/calendar.events'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'google.drive.search',
        name: 'Search Google Drive',
        description: 'Search for files, docs, and sheets in Google Drive',
        action: 'READ',
        requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'google.drive.read',
        name: 'Read Drive File',
        description: 'Get file metadata and download stream from Google Drive',
        action: 'READ',
        requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
    ],
    rateLimitSupport: true,
    usageSupport: true,
    webhookSupport: true,
    provenance: {
      source: 'Google Workspace REST APIs',
      officialDocsUrl: 'https://developers.google.com',
      version: 'v1/v2/v3',
      license: 'MIT',
      providerAuthor: 'Google LLC',
      verifiedAt: Date.now(),
    },
    metadata: {
      defaultAuthEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      defaultTokenEndpoint: 'https://oauth2.googleapis.com/token',
      apiBaseUrl: 'https://www.googleapis.com',
    },
  };

  constructor(logger: ILogger) {
    super(
      logger,
      'https://accounts.google.com/o/oauth2/v2/auth',
      'https://oauth2.googleapis.com/token',
      'https://oauth2.googleapis.com/revoke'
    );
  }

  public async validateConnection(
    account: ServiceAccount,
    credentials?: { accessToken?: string }
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }> {
    const token = credentials?.accessToken;
    const now = Date.now();

    if (!token) {
      return {
        valid: false,
        error: 'Missing access token for Google validation',
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'UNHEALTHY',
          latencyMs: 0,
          lastCheckedAt: now,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: 'Missing access token',
          updatedAt: new Date(now).toISOString(),
        },
      };
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          valid: false,
          error: `Google userinfo check failed (${response.status}): ${errText}`,
          health: {
            accountId: account.id,
            providerId: this.providerId,
            status: response.status === 401 ? 'EXPIRED' : 'DEGRADED',
            latencyMs: 0,
            lastCheckedAt: now,
            failureCount: 1,
            consecutiveErrors: 1,
            lastError: `HTTP ${response.status}: ${errText}`,
            updatedAt: new Date(now).toISOString(),
          },
        };
      }

      const userData = (await response.json()) as { email?: string; name?: string; id?: string };
      const identity = userData.email || userData.name || userData.id || 'Google User';

      return {
        valid: true,
        identity,
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'HEALTHY',
          latencyMs: 0,
          lastCheckedAt: now,
          lastSuccessfulCheckAt: now,
          failureCount: 0,
          consecutiveErrors: 0,
          updatedAt: new Date(now).toISOString(),
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `Network error during Google validation: ${msg}`,
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'DEGRADED',
          latencyMs: 0,
          lastCheckedAt: now,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: msg,
          updatedAt: new Date(now).toISOString(),
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
          message: 'No access token available for Google invocation',
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    try {
      let resultData: unknown;

      switch (capabilityId) {
        case 'google.user.profile': {
          resultData = await this.fetchJson('https://www.googleapis.com/oauth2/v2/userinfo', token);
          break;
        }

        case 'google.gmail.search': {
          const query = (params.query as string) || '';
          const maxResults = (params.maxResults as number) || 10;
          resultData = await this.fetchJson(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
            token
          );
          break;
        }

        case 'google.gmail.read': {
          const messageId = params.messageId as string;
          if (!messageId) throw new Error('Missing required parameter: messageId');
          resultData = await this.fetchJson(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
            token
          );
          break;
        }

        case 'google.gmail.send': {
          const raw = params.raw as string;
          if (!raw) throw new Error('Missing required parameter: raw');
          resultData = await this.postJson(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            token,
            { raw }
          );
          break;
        }

        case 'google.calendar.list': {
          const maxResults = (params.maxResults as number) || 10;
          resultData = await this.fetchJson(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${encodeURIComponent(new Date().toISOString())}`,
            token
          );
          break;
        }

        case 'google.calendar.create': {
          const summary = params.summary as string;
          const start = params.start as { dateTime: string };
          const end = params.end as { dateTime: string };
          if (!summary || !start || !end) throw new Error('Missing required calendar params: summary, start, end');
          resultData = await this.postJson(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            token,
            { summary, start, end }
          );
          break;
        }

        case 'google.drive.search': {
          const query = (params.query as string) || '';
          resultData = await this.fetchJson(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=20`,
            token
          );
          break;
        }

        case 'google.drive.read': {
          const fileId = params.fileId as string;
          if (!fileId) throw new Error('Missing required parameter: fileId');
          resultData = await this.fetchJson(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
            token
          );
          break;
        }

        default:
          throw new Error(`Capability ${capabilityId} not implemented by Google provider`);
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
      throw new Error(`Google API request failed (${res.status}): ${txt}`);
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
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Google API POST failed (${res.status}): ${txt}`);
    }
    return res.json();
  }
}
