/**
 * HṚṢĪKEŚA (हृषीकेश) — Authentication & Credential Reference Manager
 *
 * FP-07: Credential Reference Resolution, Secret Redaction, and OAuth State Machine.
 * Enforces zero plaintext credentials in logs, audits, or database storage.
 */

import crypto from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  AuthenticationRequirement,
} from '../fabric/capability.types.js';
import { ResolvedCredentials } from '../fabric/connector.interface.js';
import { CapabilityRepository } from '../fabric/capability.repository.js';

export interface OAuthStateRecord {
  readonly state: string;
  readonly capabilityId: string;
  readonly codeVerifier?: string;
  readonly redirectUri: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly scopes: string[];
}

export class AuthenticationManager {
  private readonly repository?: CapabilityRepository;
  private readonly logger?: ILogger;
  private readonly pendingOAuthStates = new Map<string, OAuthStateRecord>();
  private readonly memoryVault = new Map<string, Record<string, string>>();

  constructor(repository?: CapabilityRepository, logger?: ILogger) {
    this.repository = repository;
    this.logger = logger?.child('AuthenticationManager');
  }

  public getRepository(): CapabilityRepository | undefined {
    return this.repository;
  }

  /**
   * Register an in-memory secret in the local vault by reference (e.g. vault://...).
   * Plaintext is never saved to the database.
   */
  public registerLocalSecret(credentialRef: string, secrets: Record<string, string>): void {
    this.memoryVault.set(credentialRef, { ...secrets });
    this.logger?.debug(`Registered credential reference '${credentialRef}' in secure memory vault`);
  }

  /**
   * Resolve credentials for invocation from reference.
   * If not configured or missing, returns undefined (never fabricates).
   */
  public async resolveCredentials(
    authReq: AuthenticationRequirement,
    _companyId?: string,
    _projectId?: string
  ): Promise<ResolvedCredentials | undefined> {
    if (authReq.type === 'NONE') {
      return {
        authType: 'NONE',
        credentialRef: 'none://',
      };
    }

    const ref = authReq.credentialRef;
    if (!ref) {
      this.logger?.warn(`Capability requires ${authReq.type} authentication but no credentialRef is configured`);
      return undefined;
    }

    // 1. Vault reference: vault://provider/account/key
    if (ref.startsWith('vault://')) {
      const stored = this.memoryVault.get(ref);
      if (!stored) {
        this.logger?.warn(`Credential reference '${ref}' not found in local memory vault`);
        return undefined;
      }
      return {
        authType: authReq.type,
        credentialRef: ref,
        apiKey: stored.apiKey,
        token: stored.token || stored.accessToken,
        username: stored.username,
        password: stored.password,
        headers: stored.headers ? JSON.parse(stored.headers) : undefined,
      };
    }

    // 2. Environment variable reference: env://VAR_NAME
    if (ref.startsWith('env://')) {
      const envVarName = ref.replace('env://', '');
      const val = process.env[envVarName]?.trim();
      if (!val) {
        this.logger?.warn(`Environment variable '${envVarName}' for credentialRef '${ref}' is unset`);
        return undefined;
      }
      return {
        authType: authReq.type,
        credentialRef: ref,
        apiKey: authReq.type === 'API_KEY' ? val : undefined,
        token: authReq.type === 'BEARER_TOKEN' || authReq.type === 'OAUTH2' ? val : undefined,
      };
    }

    this.logger?.warn(`Unsupported credential reference scheme: '${ref}'`);
    return undefined;
  }

  /**
   * Initialize an OAuth authorization flow with PKCE state.
   */
  public createOAuthAuthorizationRequest(
    capabilityId: string,
    redirectUri: string,
    scopes: string[] = [],
    ttlMs: number = 600000 // 10 minutes
  ): { authUrl: string; state: string; codeChallenge?: string } {
    const state = crypto.randomBytes(24).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const now = Date.now();
    this.pendingOAuthStates.set(state, {
      state,
      capabilityId,
      codeVerifier,
      redirectUri,
      createdAt: now,
      expiresAt: now + ttlMs,
      scopes,
    });

    return {
      authUrl: `https://auth.example.com/oauth/authorize?response_type=code&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`,
      state,
      codeChallenge,
    };
  }

  /**
   * Verify an OAuth callback state parameter.
   */
  public verifyOAuthCallback(state: string): OAuthStateRecord | null {
    const record = this.pendingOAuthStates.get(state);
    if (!record) {
      this.logger?.warn(`OAuth state '${state}' not found or already consumed`);
      return null;
    }

    if (Date.now() > record.expiresAt) {
      this.pendingOAuthStates.delete(state);
      this.logger?.warn(`OAuth state '${state}' expired`);
      return null;
    }

    this.pendingOAuthStates.delete(state);
    return record;
  }

  /**
   * Redact sensitive tokens, passwords, cookies, and keys from any object or string.
   */
  public static redactSecrets(target: unknown): unknown {
    if (target === null || target === undefined) return target;

    if (typeof target === 'string') {
      return target
        .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]')
        .replace(/(api[_-]?key[:=]\s*)[A-Za-z0-9\-._~+/]+/gi, '$1[REDACTED]')
        .replace(/(password[:=]\s*)[^\s&]+/gi, '$1[REDACTED]');
    }

    if (Array.isArray(target)) {
      return target.map((item) => AuthenticationManager.redactSecrets(item));
    }

    if (typeof target === 'object') {
      const redacted: Record<string, unknown> = {};
      const sensitiveKeyPattern = /^(password|token|secret|apiKey|api_key|authorization|cookie|session|credential)/i;

      for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
        if (sensitiveKeyPattern.test(key)) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = AuthenticationManager.redactSecrets(value);
        }
      }
      return redacted;
    }

    return target;
  }
}
