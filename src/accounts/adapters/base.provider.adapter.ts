/**
 * HṚṢĪKEŚA (हृषीकेश) — Base Provider Adapter
 *
 * FP-12: Standard OAuth 2.0 PKCE, code exchange, token refresh, and revoke.
 */

import crypto from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  ServiceProvider,
  ServiceAccount,
  OAuthTokenSet,
  AccountHealth,
  ProviderOperationResult,
} from '../types/account.types.js';
import { IProviderAdapter, ProviderInvokeOptions } from './provider.adapter.interface.js';

export abstract class BaseProviderAdapter implements IProviderAdapter {
  public abstract readonly providerId: string;
  public abstract readonly providerDefinition: ServiceProvider;
  protected readonly logger?: ILogger;
  protected readonly authEndpoint?: string;
  protected readonly tokenEndpoint?: string;
  protected readonly revokeEndpoint?: string;

  constructor(
    logger?: ILogger,
    authEndpoint?: string,
    tokenEndpoint?: string,
    revokeEndpoint?: string
  ) {
    this.logger = logger;
    this.authEndpoint = authEndpoint;
    this.tokenEndpoint = tokenEndpoint;
    this.revokeEndpoint = revokeEndpoint;
  }

  /**
   * Generates cryptographically secure PKCE Code Verifier & S256 Challenge
   */
  public static generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = hash.toString('base64url');
    return { codeVerifier, codeChallenge };
  }

  public getAuthorizationUrl(options: {
    scopes: string[];
    state: string;
    redirectUri: string;
    codeChallenge: string;
    clientId?: string;
  }): string {
    const endpoint = this.authEndpoint || this.providerDefinition.metadata?.defaultAuthEndpoint || '';
    const url = new URL(endpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', options.clientId || 'hrisekesa-client-id');
    url.searchParams.set('redirect_uri', options.redirectUri);
    url.searchParams.set('state', options.state);
    url.searchParams.set('scope', options.scopes.join(' '));
    url.searchParams.set('code_challenge', options.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  public async exchangeAuthorizationCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clientId = 'hrisekesa-client-id'
  ): Promise<OAuthTokenSet> {
    const endpoint = this.tokenEndpoint || this.providerDefinition.metadata?.defaultTokenEndpoint || '';
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: bodyParams.toString(),
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(json.error_description || json.error || `Code exchange failed with status ${res.status}`);
    }

    const expiresIn = Number(json.expires_in) || 3600;
    return {
      accessToken: json.access_token || `token_${Date.now()}`,
      tokenType: json.token_type || 'Bearer',
      refreshToken: json.refresh_token,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scope: json.scope,
    };
  }

  public async refreshAccessToken(
    refreshToken: string,
    clientId = 'hrisekesa-client-id'
  ): Promise<OAuthTokenSet> {
    const endpoint = this.tokenEndpoint || this.providerDefinition.metadata?.defaultTokenEndpoint || '';
    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: bodyParams.toString(),
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(json.error_description || json.error || `Token refresh failed with status ${res.status}`);
    }

    const expiresIn = Number(json.expires_in) || 3600;
    return {
      accessToken: json.access_token,
      tokenType: json.token_type || 'Bearer',
      refreshToken: json.refresh_token || refreshToken,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scope: json.scope,
    };
  }

  public async revoke(_account: ServiceAccount, token: string): Promise<boolean> {
    const endpoint = this.revokeEndpoint || this.providerDefinition.metadata?.defaultRevokeEndpoint;
    if (!endpoint) return true;

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString(),
      });
      return true;
    } catch {
      return false;
    }
  }

  public abstract validateConnection(
    account: ServiceAccount,
    credentials?: { accessToken?: string; apiKey?: string; customHeaders?: Record<string, string> }
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }>;

  public abstract invoke(
    capabilityId: string,
    params: Record<string, unknown>,
    options: ProviderInvokeOptions
  ): Promise<ProviderOperationResult>;
}
