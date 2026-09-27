/**
 * HṚṢĪKEŚA (हृषीकेश) — GitHub Provider Adapter
 *
 * FP-12: Adapter for GitHub (Repos, Issues, Pull Requests, Actions, Webhooks).
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

export class GitHubProviderAdapter extends BaseProviderAdapter {
  public readonly providerId = 'github';

  public readonly providerDefinition: ServiceProvider = {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    description: 'Connects GitHub account for repository inspection, issue management, pull requests, actions, and workflow webhooks.',
    category: 'CODE',
    authMethods: ['OAUTH2', 'API_KEY'],
    status: 'ENABLED',
    documentationUrl: 'https://docs.github.com/en/rest',
    privacyPolicyUrl: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
    iconUrl: '/icons/github.svg',
    supportedScopes: [
      {
        scope: 'read:user',
        description: 'Read user profile info',
        riskLevel: 'LOW',
        required: true,
        grantedCapabilities: ['github.user.profile'],
      },
      {
        scope: 'user:email',
        description: 'Read user email addresses',
        riskLevel: 'LOW',
        required: true,
        grantedCapabilities: ['github.user.email'],
      },
      {
        scope: 'repo',
        description: 'Full control of private and public repositories',
        riskLevel: 'HIGH',
        required: false,
        grantedCapabilities: [
          'github.repo.read',
          'github.repo.list',
          'github.issue.list',
          'github.issue.read',
          'github.issue.create',
          'github.issue.comment',
          'github.pull_request.read',
          'github.pull_request.create',
          'github.actions.status',
          'github.workflow.watch',
        ],
      },
      {
        scope: 'public_repo',
        description: 'Access public repositories only',
        riskLevel: 'MEDIUM',
        required: false,
        grantedCapabilities: [
          'github.repo.read',
          'github.repo.list',
          'github.issue.list',
          'github.issue.read',
          'github.pull_request.read',
        ],
      },
      {
        scope: 'workflow',
        description: 'Update GitHub Action workflows',
        riskLevel: 'HIGH',
        required: false,
        grantedCapabilities: ['github.workflow.manage'],
      },
    ],
    capabilities: [
      {
        id: 'github.user.profile',
        name: 'Get User Profile',
        description: 'Get authenticated GitHub user profile information',
        action: 'READ',
        requiredScopes: ['read:user'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'CONFIDENTIAL',
      },
      {
        id: 'github.repo.read',
        name: 'Read Repository',
        description: 'Get repository details, files, and tree structures',
        action: 'READ',
        requiredScopes: ['repo', 'public_repo'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'github.repo.list',
        name: 'List Repositories',
        description: 'List repositories accessible to the authorized account',
        action: 'READ',
        requiredScopes: ['repo', 'public_repo'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'github.issue.list',
        name: 'List Issues',
        description: 'List issues in a repository',
        action: 'READ',
        requiredScopes: ['repo', 'public_repo'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'github.issue.read',
        name: 'Read Issue',
        description: 'Read an issue description and comments',
        action: 'READ',
        requiredScopes: ['repo', 'public_repo'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'github.issue.create',
        name: 'Create Issue',
        description: 'Create a new issue in a repository',
        action: 'CREATE',
        requiredScopes: ['repo'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'github.issue.comment',
        name: 'Comment on Issue',
        description: 'Post a comment to an existing issue or pull request',
        action: 'CREATE',
        requiredScopes: ['repo'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'github.pull_request.read',
        name: 'Read Pull Request',
        description: 'Read PR details, files changed, and reviews',
        action: 'READ',
        requiredScopes: ['repo', 'public_repo'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'github.pull_request.create',
        name: 'Create Pull Request',
        description: 'Open a new pull request across branches',
        action: 'CREATE',
        requiredScopes: ['repo'],
        riskLevel: 'HIGH',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
      {
        id: 'github.actions.status',
        name: 'Workflow & Actions Status',
        description: 'Check GitHub Actions run status and logs',
        action: 'READ',
        requiredScopes: ['repo'],
        riskLevel: 'LOW',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
    ],
    rateLimitSupport: true,
    usageSupport: true,
    webhookSupport: true,
    provenance: {
      source: 'GitHub REST API v3',
      officialDocsUrl: 'https://docs.github.com/en/rest',
      version: '2022-11-28',
      license: 'MIT',
      providerAuthor: 'GitHub, Inc. / Microsoft Corporation',
      verifiedAt: Date.now(),
    },
    metadata: {
      defaultAuthEndpoint: 'https://github.com/login/oauth/authorize',
      defaultTokenEndpoint: 'https://github.com/login/oauth/access_token',
      apiBaseUrl: 'https://api.github.com',
    },
  };

  constructor(logger: ILogger) {
    super(
      logger,
      'https://github.com/login/oauth/authorize',
      'https://github.com/login/oauth/access_token',
      undefined // GitHub does not support standard revoke endpoint for user tokens directly
    );
  }

  public async validateConnection(
    account: ServiceAccount,
    credentials?: { accessToken?: string; apiKey?: string }
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }> {
    const token = credentials?.accessToken || credentials?.apiKey;
    const now = Date.now();

    if (!token) {
      return {
        valid: false,
        error: 'Missing access token or API key for validation',
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'UNHEALTHY',
          latencyMs: 0,
          lastCheckedAt: now,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: 'Missing access token or API key',
          updatedAt: new Date(now).toISOString(),
        },
      };
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'HRSIKESA-Autonomous-Agent/1.0',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          valid: false,
          error: `GitHub API user check failed (${response.status}): ${errText}`,
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

      const userData = (await response.json()) as { login?: string; email?: string; id?: number };
      const identity = userData.login || userData.email || String(userData.id);

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
        error: `Network error during GitHub validation: ${msg}`,
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
          message: 'No access token or API key available',
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    try {
      let resultData: unknown;

      switch (capabilityId) {
        case 'github.user.profile': {
          resultData = await this.fetchJson('https://api.github.com/user', token);
          break;
        }

        case 'github.repo.list': {
          const type = (params.type as string) || 'all';
          const perPage = (params.per_page as number) || 30;
          resultData = await this.fetchJson(
            `https://api.github.com/user/repos?type=${encodeURIComponent(type)}&per_page=${perPage}`,
            token
          );
          break;
        }

        case 'github.repo.read': {
          const owner = params.owner as string;
          const repo = params.repo as string;
          if (!owner || !repo) throw new Error('Missing required params: owner, repo');
          resultData = await this.fetchJson(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
            token
          );
          break;
        }

        case 'github.issue.list': {
          const owner = params.owner as string;
          const repo = params.repo as string;
          const state = (params.state as string) || 'open';
          if (!owner || !repo) throw new Error('Missing required params: owner, repo');
          resultData = await this.fetchJson(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${encodeURIComponent(state)}`,
            token
          );
          break;
        }

        case 'github.issue.read': {
          const owner = params.owner as string;
          const repo = params.repo as string;
          const issueNumber = params.issue_number as number | string;
          if (!owner || !repo || !issueNumber) throw new Error('Missing params: owner, repo, issue_number');
          resultData = await this.fetchJson(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
            token
          );
          break;
        }

        case 'github.issue.create': {
          const owner = params.owner as string;
          const repo = params.repo as string;
          const title = params.title as string;
          const body = params.body as string;
          if (!owner || !repo || !title) throw new Error('Missing params: owner, repo, title');
          resultData = await this.postJson(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
            token,
            { title, body }
          );
          break;
        }

        case 'github.issue.comment': {
          const owner = params.owner as string;
          const repo = params.repo as string;
          const issueNumber = params.issue_number as number | string;
          const body = params.body as string;
          if (!owner || !repo || !issueNumber || !body) throw new Error('Missing params: owner, repo, issue_number, body');
          resultData = await this.postJson(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
            token,
            { body }
          );
          break;
        }

        case 'github.pull_request.read': {
          const owner = params.owner as string;
          const repo = params.repo as string;
          const pullNumber = params.pull_number as number | string;
          if (!owner || !repo || !pullNumber) throw new Error('Missing params: owner, repo, pull_number');
          resultData = await this.fetchJson(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`,
            token
          );
          break;
        }

        case 'github.actions.status': {
          const owner = params.owner as string;
          const repo = params.repo as string;
          if (!owner || !repo) throw new Error('Missing params: owner, repo');
          resultData = await this.fetchJson(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs`,
            token
          );
          break;
        }

        default:
          throw new Error(`Capability ${capabilityId} not implemented by GitHub provider`);
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
        Accept: 'application/vnd.github+json',
        'User-Agent': 'HRSIKESA-Autonomous-Agent/1.0',
      },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GitHub request failed (${res.status}): ${txt}`);
    }
    return res.json();
  }

  private async postJson(url: string, token: string, body: unknown): Promise<unknown> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'User-Agent': 'HRSIKESA-Autonomous-Agent/1.0',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GitHub POST failed (${res.status}): ${txt}`);
    }
    return res.json();
  }
}
