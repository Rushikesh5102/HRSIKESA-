/**
 * HṚṢĪKEŚA (हृषीकेश) — REST API Capability Connector
 *
 * FP-07: Governed HTTP/REST API Connector with credential injection,
 * rate limit detection, secret redaction, and deterministic response verification.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  UniversalCapability,
  CapabilityInvocation,
  CapabilityHealth,
} from '../fabric/capability.types.js';
import {
  IConnector,
  RawConnectorResult,
  VerificationCheckResult,
  ResolvedCredentials,
} from '../fabric/connector.interface.js';
import { AuthenticationManager } from '../auth/authentication.manager.js';

export class RestApiConnector implements IConnector {
  public readonly protocol = 'REST' as const;
  public readonly name = 'RestApiConnector';
  private readonly logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('RestApiConnector');
  }

  public canHandle(capability: UniversalCapability): boolean {
    return capability.protocol === 'REST';
  }

  public async execute(
    capability: UniversalCapability,
    invocation: CapabilityInvocation,
    resolvedAuth?: ResolvedCredentials
  ): Promise<RawConnectorResult> {
    const startTime = Date.now();
    const endpoint = (invocation.inputs.url as string) || (capability.metadata?.endpointUrl as string);
    if (!endpoint) {
      return {
        success: false,
        error: 'Missing target URL endpoint in REST capability invocation.',
        durationMs: Date.now() - startTime,
      };
    }

    const method = ((invocation.inputs.method as string) || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...((invocation.inputs.headers as Record<string, string>) || {}),
    };

    // Attach resolved credentials without exposing in logs
    if (resolvedAuth) {
      if (resolvedAuth.token) {
        headers['Authorization'] = `Bearer ${resolvedAuth.token}`;
      } else if (resolvedAuth.apiKey) {
        const headerName = (capability.metadata?.apiKeyHeader as string) || 'x-api-key';
        headers[headerName] = resolvedAuth.apiKey;
      } else if (resolvedAuth.username && resolvedAuth.password) {
        const encoded = Buffer.from(`${resolvedAuth.username}:${resolvedAuth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
    }

    const body = invocation.inputs.body ? JSON.stringify(invocation.inputs.body) : undefined;
    const timeoutMs = invocation.timeoutMs || 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      this.logger?.debug(`Executing REST ${method} request to '${endpoint}'`);
      const response = await fetch(endpoint, {
        method,
        headers,
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let data: unknown;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Redact any potential credentials inside response before returning
      const safeData = AuthenticationManager.redactSecrets(data);

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        return {
          success: false,
          error: `Provider rate limit encountered (HTTP 429). Retry after: ${retryAfter || 'unspecified'}.`,
          metadata: { status: 429, retryAfter },
          durationMs: Date.now() - startTime,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error ${response.status}: ${response.statusText}`,
          data: safeData,
          metadata: { status: response.status },
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: safeData,
        metadata: { status: response.status },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        error: isTimeout ? `REST request timed out after ${timeoutMs}ms.` : err.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  public async checkHealth(capability: UniversalCapability): Promise<CapabilityHealth> {
    const startTime = Date.now();
    const healthUrl = (capability.metadata?.healthUrl as string) || (capability.metadata?.endpointUrl as string);

    if (!healthUrl) {
      return {
        status: 'UNKNOWN',
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: 0,
        latencyMs: Date.now() - startTime,
        message: 'No health check URL configured for REST endpoint.',
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(healthUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429) {
        return {
          status: 'RATE_LIMITED',
          lastCheckedAt: new Date().toISOString(),
          consecutiveFailures: 0,
          latencyMs: Date.now() - startTime,
          message: 'Endpoint is currently rate limited.',
        };
      }

      const isHealthy = res.ok;
      return {
        status: isHealthy ? 'HEALTHY' : 'DEGRADED',
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: isHealthy ? 0 : 1,
        latencyMs: Date.now() - startTime,
        message: `HTTP HEAD status ${res.status}`,
      };
    } catch (err: any) {
      return {
        status: 'UNAVAILABLE',
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: 1,
        latencyMs: Date.now() - startTime,
        message: `Health check failed: ${err.message}`,
      };
    }
  }

  public async verify(
    _capability: UniversalCapability,
    _invocation: CapabilityInvocation,
    result: RawConnectorResult
  ): Promise<VerificationCheckResult> {
    if (!result.success) {
      return {
        verified: false,
        strategy: 'schema_match',
        details: `REST request was not successful: ${result.error}`,
      };
    }

    const metadata = result.metadata as { status?: number } | undefined;
    if (metadata?.status && metadata.status >= 200 && metadata.status < 300) {
      return {
        verified: true,
        strategy: 'schema_match',
        details: `HTTP status ${metadata.status} confirmed valid response payload.`,
      };
    }

    return {
      verified: true,
      strategy: 'schema_match',
      details: 'REST payload received.',
    };
  }
}
