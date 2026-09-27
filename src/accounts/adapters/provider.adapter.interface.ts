/**
 * HṚṢĪKEŚA (हृषीकेश) — Provider Adapter Interface
 *
 * FP-12: Standardized contract for third-party service providers.
 */

import {
  ServiceProvider,
  ServiceAccount,
  OAuthTokenSet,
  AccountHealth,
  ProviderOperationResult,
} from '../types/account.types.js';

export interface ProviderInvokeOptions {
  readonly account: ServiceAccount;
  readonly operation?: string;
  readonly parameters?: Record<string, any>;
  readonly credentials?: { accessToken?: string; apiKey?: string; customHeaders?: Record<string, string> } & Record<string, any>;
  readonly timeoutMs?: number;
  readonly abortSignal?: AbortSignal;
}

export interface IProviderAdapter {
  readonly providerId: string;
  readonly providerDefinition: ServiceProvider;

  /**
   * Generates the secure OAuth 2.0 authorization URL with PKCE and state.
   */
  getAuthorizationUrl?(options: {
    scopes: string[];
    state: string;
    redirectUri: string;
    codeChallenge: string;
    clientId?: string;
  }): string;

  /**
   * Exchanges authorization code for access and refresh tokens.
   */
  exchangeAuthorizationCode?(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clientId?: string
  ): Promise<OAuthTokenSet>;

  /**
   * Refreshes access token using refresh token.
   */
  refreshAccessToken?(
    refreshToken: string,
    clientId?: string
  ): Promise<OAuthTokenSet>;

  /**
   * Revokes access or refresh token at provider endpoint if supported.
   */
  revoke?(account: ServiceAccount, token: string): Promise<boolean>;

  /**
   * Performs low-impact health check and token validation against real provider API.
   */
  validateConnection(
    account: ServiceAccount,
    credentials?: { accessToken?: string; apiKey?: string; customHeaders?: Record<string, string> }
  ): Promise<{ valid: boolean; identity?: string; error?: string; health: AccountHealth }>;

  /**
   * Invokes an authenticated operation against the provider.
   */
  invoke(
    capabilityId: string,
    params: Record<string, unknown>,
    options: ProviderInvokeOptions
  ): Promise<ProviderOperationResult>;

  /**
   * Optional capability discovery dynamically reported by the account
   */
  discoverCapabilities?(account: ServiceAccount): Promise<string[]>;
}
