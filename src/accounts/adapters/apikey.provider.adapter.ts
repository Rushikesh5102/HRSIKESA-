/**
 * HṚṢĪKEŚA (हृषीकेश) — API Key Provider Adapter
 *
 * FP-12: Generic API Key integration adapter resolving credentials at execution time.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  ServiceProvider,
  ServiceAccount,
  AccountHealth,
  ProviderOperationResult,
} from '../types/account.types.js';
import { IProviderAdapter, ProviderInvokeOptions } from './provider.adapter.interface.js';

export class ApiKeyProviderAdapter implements IProviderAdapter {
  public readonly providerId = 'apikey_service';

  public readonly providerDefinition: ServiceProvider = {
    id: 'apikey_service',
    name: 'apikey_service',
    displayName: 'API Key Service',
    description: 'Connects external services using static API keys securely stored and resolved from the Credential Vault.',
    category: 'CUSTOM',
    authMethods: ['API_KEY'],
    status: 'ENABLED',
    supportedScopes: [
      {
        scope: 'api_access',
        description: 'Standard API access using key',
        riskLevel: 'MEDIUM',
        required: true,
        grantedCapabilities: ['apikey.execute'],
      },
    ],
    capabilities: [
      {
        id: 'apikey.execute',
        name: 'Execute API Key Request',
        description: 'Executes an authenticated HTTP request using an encrypted API key reference',
        action: 'READ',
        requiredScopes: ['api_access'],
        riskLevel: 'MEDIUM',
        financial: false,
        destructive: false,
        privacyClass: 'INTERNAL',
      },
    ],
    defaultScopes: ['generic.execute'],
    rateLimitSupport: true,
    webhookSupport: false,
    provenance: {
      source: 'Native HṚṢĪKEŚA API Key Adapter',
      version: '1.0.0',
      license: 'PROPRIETARY',
      providerAuthor: 'HṚṢĪKEŚA Core',
      verifiedAt: Date.now(),
    },
  };

  constructor(private readonly logger: ILogger) {
    if (this.logger) {
      // logger bound
    }
  }

  public async validateConnection(
    account: ServiceAccount,
    credentials?: { apiKey?: string }
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }> {
    const key = credentials?.apiKey;
    const now = Date.now();

    if (!key || key.trim().length === 0) {
      return {
        valid: false,
        error: 'API key is missing or empty',
        health: {
          accountId: account.id,
          providerId: this.providerId,
          status: 'UNHEALTHY',
          latencyMs: 0,
          lastCheckedAt: now,
          failureCount: 1,
          consecutiveErrors: 1,
          lastError: 'Missing API key',
          updatedAt: new Date(now).toISOString(),
        },
      };
    }

    return {
      valid: true,
      identity: account.ownerIdentity || account.accountName || 'API Key Holder',
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
  }

  public async invoke(
    capabilityId: string,
    params: Record<string, unknown>,
    options: ProviderInvokeOptions
  ): Promise<ProviderOperationResult> {
    const startTime = Date.now();
    const apiKey = options.credentials?.apiKey;

    if (!apiKey) {
      return {
        success: false,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        error: {
          category: 'AUTH_FAILED',
          message: 'No API key resolved from credential vault',
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    try {
      const url = params.url as string;
      const method = (params.method as string) || 'GET';
      const headerName = (params.headerName as string) || 'Authorization';
      const headerPrefix = params.headerPrefix !== undefined ? (params.headerPrefix as string) : 'Bearer ';

      const headers: Record<string, string> = {
        'User-Agent': 'HRSIKESA-Autonomous-Agent/1.0',
        Accept: 'application/json, text/plain, */*',
        [headerName]: `${headerPrefix}${apiKey}`,
        ...((params.headers as Record<string, string>) || {}),
      };

      const res = await fetch(url, {
        method,
        headers,
        body: params.body ? JSON.stringify(params.body) : undefined,
        signal: AbortSignal.timeout(15000),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : await res.text();

      return {
        success: res.ok,
        capabilityId,
        providerId: this.providerId,
        accountId: options.account.id,
        data,
        error: res.ok
          ? undefined
          : {
              category: 'EXECUTION_FAILED',
              message: `HTTP ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
              retryable: res.status === 429 || res.status >= 500,
            },
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
          retryable: false,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }
}
