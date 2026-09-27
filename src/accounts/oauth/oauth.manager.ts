/**
 * HṚṢĪKEŚA (हृषीकेश) — OAuth Manager
 *
 * FP-12: Provider-independent OAuth 2.0 PKCE state machine, callback validation,
 * token lifecycle, refresh, and revocation.
 */

import { randomBytes } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import {
  OAuthAuthorizationRequest,
  OAuthTokenSet,
  ServiceAccount,
  AccountHealth,
} from '../types/account.types.js';
import { AccountRepository } from '../repository/account.repository.js';
import { CredentialVault } from '../vault/credential.vault.js';
import { ProviderAdapterRegistry } from '../adapters/provider.adapter.registry.js';
import { BaseProviderAdapter } from '../adapters/base.provider.adapter.js';

export interface OAuthInitParams {
  providerId: string;
  ownerIdentity?: string;
  scopeType?: 'PERSONAL' | 'COMPANY' | 'PROJECT' | 'SHARED_AUTHORIZED';
  companyId?: string;
  projectId?: string;
  requestedScopes?: string[];
  redirectUri?: string;
}

export class OAuthManager {
  // In-memory short-lived states for fast replay prevention & verification
  private readonly pendingStates = new Map<string, OAuthAuthorizationRequest>();
  private readonly stateTtlMs = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly repository: AccountRepository,
    private readonly vault: CredentialVault,
    private readonly adapterRegistry: ProviderAdapterRegistry,
    private readonly eventBus: EventBus | undefined,
    private readonly logger: ILogger
  ) {}

  /**
   * Initiate an OAuth 2.0 PKCE Authorization flow
   */
  public async initiateAuthorization(params: OAuthInitParams): Promise<OAuthAuthorizationRequest> {
    const adapter = this.adapterRegistry.getAdapter(params.providerId);
    if (!adapter) {
      throw new Error(`No provider adapter registered for "${params.providerId}"`);
    }

    const providerDef = adapter.providerDefinition;
    if (!providerDef.authMethods.includes('OAUTH2')) {
      throw new Error(`Provider "${params.providerId}" does not support OAuth 2.0`);
    }

    // Determine scopes (defaults to all required + supported if not specified)
    const scopesToRequest = params.requestedScopes && params.requestedScopes.length > 0
      ? params.requestedScopes
      : providerDef.supportedScopes.map(s => s.scope);

    // Generate cryptographic state & PKCE
    const state = randomBytes(32).toString('hex');
    const { codeVerifier, codeChallenge } = BaseProviderAdapter.generatePkcePair();

    const redirectUri = params.redirectUri || 'http://localhost:4000/api/accounts/callback';
    const nowIso = new Date().toISOString();
    const expiresAtMs = Date.now() + this.stateTtlMs;

    // Get authorization URL from adapter
    const authUrl = adapter.getAuthorizationUrl
      ? adapter.getAuthorizationUrl({
          scopes: scopesToRequest,
          state,
          redirectUri,
          codeChallenge,
        })
      : `https://auth.example.com/oauth/authorize?response_type=code&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopesToRequest.join(' '))}`;

    const authRequest: OAuthAuthorizationRequest = {
      id: `oauth_req_${randomBytes(12).toString('hex')}`,
      providerId: params.providerId,
      ownerIdentity: params.ownerIdentity || 'rushi',
      scopeType: params.scopeType || 'PERSONAL',
      companyId: params.companyId,
      projectId: params.projectId,
      state,
      codeVerifier,
      codeChallenge,
      redirectUri,
      scopes: scopesToRequest,
      authorizationUrl: authUrl,
      authUrl,
      status: 'WAITING_USER',
      createdAt: nowIso,
      expiresAt: expiresAtMs,
    };

    // Save state in memory & DB
    this.pendingStates.set(state, authRequest);
    this.repository.saveOAuthAuthorization(authRequest);

    this.logger.info(`OAuthManager: Initiated OAuth flow for provider "${params.providerId}", req ID: ${authRequest.id}`);

    return authRequest;
  }

  /**
   * Handle incoming OAuth callback from authorization server
   */
  public async handleCallback(
    state: string,
    code: string,
    error?: string
  ): Promise<{ account: ServiceAccount; tokenSet: OAuthTokenSet }> {
    if (!state) {
      throw new Error('Missing state parameter in OAuth callback');
    }

    // Retrieve pending request (memory or DB)
    let authReq = this.pendingStates.get(state) || this.repository.getOAuthAuthorizationByState(state);
    if (!authReq) {
      throw new Error('Invalid or unknown OAuth state (possible CSRF attack or replay)');
    }

    // One-time usage: immediately invalidate state
    this.pendingStates.delete(state);

    if (authReq.status !== 'WAITING_USER' && authReq.status !== 'CREATED') {
      throw new Error(`OAuth state already used or expired (status: ${authReq.status})`);
    }

    if (Date.now() > new Date(authReq.expiresAt).getTime()) {
      const expiredReq: OAuthAuthorizationRequest = { ...authReq, status: 'EXPIRED' };
      this.repository.saveOAuthAuthorization(expiredReq);
      throw new Error('OAuth authorization request has expired');
    }

    if (error) {
      const deniedReq: OAuthAuthorizationRequest = { ...authReq, status: 'DENIED' };
      this.repository.saveOAuthAuthorization(deniedReq);
      throw new Error(`OAuth authorization was denied or failed: ${error}`);
    }

    if (!code) {
      const failedReq: OAuthAuthorizationRequest = { ...authReq, status: 'FAILED' };
      this.repository.saveOAuthAuthorization(failedReq);
      throw new Error('Missing authorization code in OAuth callback');
    }

    const adapter = this.adapterRegistry.getAdapter(authReq.providerId);
    if (!adapter) {
      throw new Error(`No adapter found for provider "${authReq.providerId}"`);
    }

    if (!adapter.exchangeAuthorizationCode) {
      throw new Error(`Adapter for "${authReq.providerId}" does not support code exchange`);
    }

    this.logger.info(`OAuthManager: Exchanging code for provider "${authReq.providerId}" with PKCE`);

    // Exchange code for tokens
    const tokenSet = await adapter.exchangeAuthorizationCode(
      code,
      authReq.codeVerifier,
      authReq.redirectUri
    );

    // Construct or update ServiceAccount
    const accountId = `acc_${authReq.providerId}_${randomBytes(8).toString('hex')}`;
    const credentialRef = `vault://providers/${authReq.providerId}/${accountId}`;

    // Store tokens securely in vault
    await this.vault.store(
      credentialRef,
      {
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken,
        tokenType: tokenSet.tokenType,
        expiresAt: tokenSet.expiresAt,
      },
      {
        providerId: authReq.providerId,
        accountId,
        hasRefreshToken: Boolean(tokenSet.refreshToken),
        expiresAt: tokenSet.expiresAt,
      }
    );

    const nowIso = new Date().toISOString();
    const accountScopes = tokenSet.scope ? tokenSet.scope.split(' ') : authReq.scopes;

    const account: ServiceAccount = {
      id: accountId,
      providerId: authReq.providerId,
      accountName: `${authReq.providerId}_account`,
      email: undefined,
      ownerIdentity: (authReq as any).ownerIdentity || 'rushi',
      scopeType: (authReq.scopeType as any) || 'PERSONAL',
      companyId: authReq.companyId,
      projectId: authReq.projectId,
      status: 'CONNECTED',
      scopes: accountScopes,
      credentialRef,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastVerifiedAt: nowIso,
    };

    // Validate connection against provider API
    const validation = await adapter.validateConnection(account);

    const health: AccountHealth = {
      accountId: account.id,
      providerId: account.providerId,
      status: validation.valid ? 'HEALTHY' : 'DEGRADED',
      latencyMs: validation.health?.latencyMs || 0,
      lastSuccessfulCheck: validation.valid ? nowIso : undefined,
      lastFailure: validation.error,
      failureCount: validation.valid ? 0 : 1,
      updatedAt: nowIso,
    };

    // Persist account and health record
    this.repository.saveAccount(account);
    this.repository.saveAccountHealth(health);

    // Update auth request state
    const completedReq: OAuthAuthorizationRequest = { ...authReq, status: 'COMPLETED' };
    this.repository.saveOAuthAuthorization(completedReq);

    // Emit event
    if (this.eventBus) {
      const evt = {
        id: `evt_${randomBytes(8).toString('hex')}`,
        type: 'account.connected',
        timestamp: Date.now(),
        source: 'OAuthManager',
        payload: {
          accountId: account.id,
          providerId: account.providerId,
          ownerIdentity: account.ownerIdentity,
        },
      };
      if (typeof (this.eventBus as any).emit === 'function') {
        (this.eventBus as any).emit('account.connected', evt);
      } else if (typeof (this.eventBus as any).publish === 'function') {
        (this.eventBus as any).publish(evt);
      }
    }

    this.logger.info(`OAuthManager: Successfully connected account "${account.id}" for "${authReq.providerId}"`);

    return { account, tokenSet };
  }

  /**
   * Refresh OAuth token if expired or close to expiry
   */
  public async refreshTokenIfNeeded(account: ServiceAccount): Promise<string> {
    const creds = await this.vault.resolve(account.credentialRef);
    if (!creds || !creds.accessToken) {
      throw new Error(`No credentials found in vault for account "${account.id}"`);
    }

    const now = Date.now();
    const isExpiringSoon = creds.expiresAt && (new Date(creds.expiresAt).getTime() - now < 5 * 60 * 1000); // 5 min buffer

    if (!isExpiringSoon) {
      return creds.accessToken;
    }

    if (!creds.refreshToken) {
      this.logger.warn(`OAuthManager: Account "${account.id}" token is expiring but has no refresh token`);
      return creds.accessToken;
    }

    const adapter = this.adapterRegistry.getAdapter(account.providerId);
    if (!adapter || !adapter.refreshAccessToken) {
      throw new Error(`Provider adapter for "${account.providerId}" does not support token refresh`);
    }

    try {
      this.logger.info(`OAuthManager: Refreshing access token for account "${account.id}"`);
      const refreshedTokenSet = await adapter.refreshAccessToken(creds.refreshToken);

      await this.vault.store(account.credentialRef, {
        accessToken: refreshedTokenSet.accessToken,
        refreshToken: refreshedTokenSet.refreshToken || creds.refreshToken,
        tokenType: refreshedTokenSet.tokenType || creds.tokenType,
        expiresAt: refreshedTokenSet.expiresAt,
      });

      return refreshedTokenSet.accessToken;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`OAuthManager: Token refresh failed for account "${account.id}": ${msg}`);

      // Mark account as REAUTH_REQUIRED
      const reauthAccount: ServiceAccount = {
        ...account,
        status: 'REAUTH_REQUIRED',
        updatedAt: new Date().toISOString(),
      };
      this.repository.saveAccount(reauthAccount);

      if (this.eventBus) {
        const evt = {
          id: `evt_${randomBytes(8).toString('hex')}`,
          type: 'account.reauth_required',
          timestamp: Date.now(),
          source: 'OAuthManager',
          payload: {
            accountId: account.id,
            providerId: account.providerId,
            error: msg,
          },
        };
        if (typeof (this.eventBus as any).emit === 'function') {
          (this.eventBus as any).emit('account.reauth_required', evt);
        } else if (typeof (this.eventBus as any).publish === 'function') {
          (this.eventBus as any).publish(evt);
        }
      }

      throw new Error(`Token refresh failed; account requires re-authorization: ${msg}`);
    }
  }

  /**
   * Revoke account credentials and disconnect
   */
  public async revokeAccount(accountId: string): Promise<void> {
    const account = this.repository.getAccountById(accountId);
    if (!account) {
      throw new Error(`Account "${accountId}" not found`);
    }

    const creds = await this.vault.resolve(account.credentialRef);
    const adapter = this.adapterRegistry.getAdapter(account.providerId);

    if (adapter && (adapter as any).revoke && creds?.accessToken) {
      try {
        await (adapter as any).revoke(account, creds.accessToken);
      } catch (err: unknown) {
        this.logger.warn(`OAuthManager: Provider revocation API error for "${accountId}": ${err}`);
      }
    }

    // Delete secrets from vault
    await this.vault.delete(account.credentialRef);

    // Update account status in DB
    const revokedAccount: ServiceAccount = {
      ...account,
      status: 'REVOKED',
      updatedAt: new Date().toISOString(),
    };
    this.repository.saveAccount(revokedAccount);

    if (this.eventBus) {
      const evt = {
        id: `evt_${randomBytes(8).toString('hex')}`,
        type: 'account.revoked',
        timestamp: Date.now(),
        source: 'OAuthManager',
        payload: {
          accountId: account.id,
          providerId: account.providerId,
        },
      };
      if (typeof (this.eventBus as any).emit === 'function') {
        (this.eventBus as any).emit('account.revoked', evt);
      } else if (typeof (this.eventBus as any).publish === 'function') {
        (this.eventBus as any).publish(evt);
      }
    }

    this.logger.info(`OAuthManager: Revoked and deleted credentials for account "${accountId}"`);
  }
}
