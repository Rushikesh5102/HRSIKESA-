/**
 * HṚṢĪKEŚA (हृषीकेश) — Account & Service Integration Repository
 *
 * FP-12: Full SQLite repository for providers, accounts, OAuth authorizations,
 * credentials metadata, health monitoring, usage/quotas, webhooks, and audits.
 */

import { DatabaseSync } from 'node:sqlite';
import {
  ServiceProvider,
  ServiceAccount,
  OAuthAuthorizationRequest,
  AccountHealth,
  AccountUsage,
  AccountWebhook,
  AccountAuditEntry,
  AccountCredentialMetadata,
} from '../types/account.types.js';

export class AccountRepository {
  constructor(private readonly db: DatabaseSync) {}

  // ================= Service Providers =================

  public saveProvider(provider: ServiceProvider): void {
    const stmt = this.db.prepare(
      `INSERT INTO service_providers (
        id, name, display_name, description, category, auth_methods_json,
        status, documentation_url, privacy_policy_url, icon_url, supported_scopes_json,
        default_scopes_json, required_config_keys_json, capabilities_json,
        rate_limit_policy_json, webhook_support, provenance_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        display_name = excluded.display_name,
        description = excluded.description,
        category = excluded.category,
        auth_methods_json = excluded.auth_methods_json,
        status = excluded.status,
        documentation_url = excluded.documentation_url,
        privacy_policy_url = excluded.privacy_policy_url,
        icon_url = excluded.icon_url,
        supported_scopes_json = excluded.supported_scopes_json,
        default_scopes_json = excluded.default_scopes_json,
        required_config_keys_json = excluded.required_config_keys_json,
        capabilities_json = excluded.capabilities_json,
        rate_limit_policy_json = excluded.rate_limit_policy_json,
        webhook_support = excluded.webhook_support,
        provenance_json = excluded.provenance_json,
        updated_at = excluded.updated_at`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      provider.id,
      provider.name,
      provider.displayName,
      provider.description,
      provider.category,
      JSON.stringify(provider.authMethods || []),
      provider.status || 'ENABLED',
      provider.documentationUrl ?? null,
      provider.privacyPolicyUrl ?? null,
      provider.iconUrl ?? null,
      JSON.stringify(provider.supportedScopes || []),
      JSON.stringify(provider.defaultScopes || []),
      JSON.stringify(provider.requiredConfigKeys || []),
      JSON.stringify(provider.capabilities || []),
      JSON.stringify(provider.rateLimitPolicy || {}),
      provider.webhookSupport ? 1 : 0,
      JSON.stringify(provider.provenance || {}),
      provider.createdAt ? String(provider.createdAt) : nowIso,
      provider.updatedAt ? String(provider.updatedAt) : nowIso
    );
  }

  public getProvider(id: string): ServiceProvider | null {
    const stmt = this.db.prepare(`SELECT * FROM service_providers WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapProvider(row);
  }

  public listProviders(filter?: { category?: string; status?: string }): ServiceProvider[] {
    let sql = `SELECT * FROM service_providers WHERE 1=1`;
    const params: any[] = [];
    if (filter?.category) {
      sql += ` AND category = ?`;
      params.push(filter.category);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }
    sql += ` ORDER BY display_name ASC`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r) => this.mapProvider(r));
  }

  // ================= Service Accounts =================

  public saveAccount(account: ServiceAccount): void {
    const stmt = this.db.prepare(
      `INSERT INTO service_accounts (
        id, provider_id, account_name, email, owner_identity, scope_type,
        company_id, project_id, status, scopes_json, credential_ref,
        last_verified_at, last_error, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider_id = excluded.provider_id,
        account_name = excluded.account_name,
        email = excluded.email,
        owner_identity = excluded.owner_identity,
        scope_type = excluded.scope_type,
        company_id = excluded.company_id,
        project_id = excluded.project_id,
        status = excluded.status,
        scopes_json = excluded.scopes_json,
        credential_ref = excluded.credential_ref,
        last_verified_at = excluded.last_verified_at,
        last_error = excluded.last_error,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at`
    );

    const nowIso = new Date().toISOString();
    const accountName = account.accountName || account.id;
    const scopesJson = JSON.stringify(account.scopes || []);
    const metadataJson = JSON.stringify(account.metadata || {});

    stmt.run(
      account.id,
      account.providerId,
      accountName,
      account.email ?? null,
      account.ownerIdentity,
      account.scopeType || 'PERSONAL',
      account.companyId ?? null,
      account.projectId ?? null,
      account.status,
      scopesJson,
      account.credentialRef || `vault://providers/${account.providerId}/${account.id}`,
      account.lastVerifiedAt ? String(account.lastVerifiedAt) : null,
      account.lastError ?? null,
      metadataJson,
      account.createdAt ? String(account.createdAt) : nowIso,
      account.updatedAt ? String(account.updatedAt) : nowIso
    );
  }

  public getAccountById(id: string): ServiceAccount | null {
    const stmt = this.db.prepare(`SELECT * FROM service_accounts WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapAccount(row);
  }

  public listAccounts(filter?: {
    providerId?: string;
    ownerIdentity?: string;
    companyId?: string;
    projectId?: string;
    status?: string;
  }): ServiceAccount[] {
    let sql = `SELECT * FROM service_accounts WHERE 1=1`;
    const params: any[] = [];

    if (filter?.providerId) {
      sql += ` AND provider_id = ?`;
      params.push(filter.providerId);
    }
    if (filter?.ownerIdentity) {
      sql += ` AND owner_identity = ?`;
      params.push(filter.ownerIdentity);
    }
    if (filter?.companyId) {
      sql += ` AND company_id = ?`;
      params.push(filter.companyId);
    }
    if (filter?.projectId) {
      sql += ` AND project_id = ?`;
      params.push(filter.projectId);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }
    sql += ` ORDER BY created_at DESC`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r) => this.mapAccount(r));
  }

  public deleteAccount(id: string): void {
    this.db.prepare(`DELETE FROM account_health WHERE account_id = ?`).run(id);
    this.db.prepare(`DELETE FROM account_usage WHERE account_id = ?`).run(id);
    this.db.prepare(`DELETE FROM account_webhooks WHERE account_id = ?`).run(id);
    this.db.prepare(`DELETE FROM service_accounts WHERE id = ?`).run(id);
  }

  // ================= OAuth Authorizations =================

  // ================= OAuth Authorizations =================

  public saveOAuthAuthorization(auth: OAuthAuthorizationRequest): void {
    const stmt = this.db.prepare(
      `INSERT INTO oauth_authorizations (
        id, provider_id, account_id, state, code_verifier, code_challenge,
        redirect_uri, scopes_json, authorization_url, status, company_id,
        project_id, scope_type, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        account_id = excluded.account_id`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      auth.id,
      auth.providerId,
      auth.accountId ?? null,
      auth.state,
      auth.codeVerifier,
      auth.codeChallenge,
      auth.redirectUri,
      JSON.stringify(auth.scopes || []),
      auth.authorizationUrl || '',
      auth.status,
      auth.companyId ?? null,
      auth.projectId ?? null,
      auth.scopeType || 'PERSONAL',
      auth.createdAt ? String(auth.createdAt) : nowIso,
      auth.expiresAt ? String(auth.expiresAt) : nowIso
    );
  }

  public getOAuthAuthorizationByState(state: string): OAuthAuthorizationRequest | null {
    const stmt = this.db.prepare(`SELECT * FROM oauth_authorizations WHERE state = ?`);
    const row = stmt.get(state) as any;
    if (!row) return null;
    return this.mapOAuth(row);
  }

  public getOAuthAuthorizationById(id: string): OAuthAuthorizationRequest | null {
    const stmt = this.db.prepare(`SELECT * FROM oauth_authorizations WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapOAuth(row);
  }

  // ================= Health =================

  public saveAccountHealth(health: AccountHealth): void {
    const stmt = this.db.prepare(
      `INSERT INTO account_health (
        account_id, provider_id, status, latency_ms,
        last_successful_check, last_failure, failure_count, details_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        status = excluded.status,
        latency_ms = excluded.latency_ms,
        last_successful_check = excluded.last_successful_check,
        last_failure = excluded.last_failure,
        failure_count = excluded.failure_count,
        details_json = excluded.details_json,
        updated_at = excluded.updated_at`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      health.accountId,
      health.providerId || 'unknown',
      health.status,
      health.latencyMs ?? 0,
      health.lastSuccessfulCheck ?? null,
      health.lastFailure ?? null,
      health.failureCount ?? 0,
      JSON.stringify(health.details || {}),
      health.updatedAt || nowIso
    );
  }

  public getAccountHealth(accountId: string): AccountHealth | null {
    const stmt = this.db.prepare(`SELECT * FROM account_health WHERE account_id = ?`);
    const row = stmt.get(accountId) as any;
    if (!row) return null;

    let details: any = {};
    try {
      details = JSON.parse(row.details_json || '{}');
    } catch {}

    return {
      accountId: row.account_id,
      providerId: row.provider_id,
      status: row.status,
      latencyMs: row.latency_ms,
      lastSuccessfulCheck: row.last_successful_check ?? undefined,
      lastFailure: row.last_failure ?? undefined,
      failureCount: row.failure_count,
      details,
      updatedAt: row.updated_at,
    };
  }

  // ================= Usage / Quota =================

  // ================= Usage & Quotas =================

  public saveAccountUsage(usage: AccountUsage): void {
    const stmt = this.db.prepare(
      `INSERT INTO account_usage (
        account_id, provider_id, period_start, period_end, requests_made,
        requests_remaining_json, request_limit_json, reset_at, tokens_used,
        estimated_cost_usd, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        period_start = excluded.period_start,
        period_end = excluded.period_end,
        requests_made = excluded.requests_made,
        requests_remaining_json = excluded.requests_remaining_json,
        request_limit_json = excluded.request_limit_json,
        reset_at = excluded.reset_at,
        tokens_used = excluded.tokens_used,
        estimated_cost_usd = excluded.estimated_cost_usd,
        updated_at = excluded.updated_at`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      usage.accountId,
      usage.providerId,
      usage.periodStart || nowIso,
      usage.periodEnd || nowIso,
      usage.requestsMade ?? 0,
      JSON.stringify(usage.requestsRemaining ?? 'UNKNOWN'),
      JSON.stringify(usage.requestLimit ?? 'UNKNOWN'),
      usage.resetAt ?? null,
      usage.tokensUsed ?? 0,
      usage.estimatedCostUsd ?? 0.0,
      usage.updatedAt || nowIso
    );
  }

  public getAccountUsage(accountId: string): AccountUsage | null {
    const stmt = this.db.prepare(`SELECT * FROM account_usage WHERE account_id = ?`);
    const row = stmt.get(accountId) as any;
    if (!row) return null;

    let requestsRemaining: number | 'UNKNOWN' = 'UNKNOWN';
    let requestLimit: number | 'UNKNOWN' = 'UNKNOWN';
    try {
      requestsRemaining = JSON.parse(row.requests_remaining_json ?? '"UNKNOWN"');
    } catch {}
    try {
      requestLimit = JSON.parse(row.request_limit_json ?? '"UNKNOWN"');
    } catch {}

    return {
      accountId: row.account_id,
      providerId: row.provider_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      requestsMade: row.requests_made,
      requestsRemaining,
      requestLimit,
      resetAt: row.reset_at ?? undefined,
      tokensUsed: row.tokens_used,
      estimatedCostUsd: row.estimated_cost_usd,
      updatedAt: row.updated_at,
    };
  }

  // ================= Webhooks =================

  public saveAccountWebhook(webhook: any): void {
    const stmt = this.db.prepare(
      `INSERT INTO account_webhooks (
        id, provider_id, account_id, endpoint_path, secret_ref,
        subscribed_events_json, status, last_received_at, failure_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        subscribed_events_json = excluded.subscribed_events_json,
        secret_ref = excluded.secret_ref,
        status = excluded.status,
        last_received_at = excluded.last_received_at,
        failure_count = excluded.failure_count`
    );

    const nowIso = new Date().toISOString();
    const endpointPath = webhook.endpointPath || webhook.webhookUrl || `/api/webhooks/${webhook.providerId}/${webhook.accountId}`;
    const secretRef = webhook.secretRef || webhook.secret || 'wh_secret';
    const subscribedEvents = webhook.subscribedEvents || webhook.events || [];

    stmt.run(
      webhook.id,
      webhook.providerId,
      webhook.accountId,
      endpointPath,
      secretRef,
      JSON.stringify(subscribedEvents),
      webhook.status || 'ACTIVE',
      webhook.lastReceivedAt ?? null,
      webhook.failureCount ?? 0,
      webhook.createdAt ? String(webhook.createdAt) : nowIso
    );
  }

  public listAccountWebhooks(accountId: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM account_webhooks WHERE account_id = ?`);
    const rows = stmt.all(accountId) as any[];
    return rows.map((r) => ({
      id: r.id,
      accountId: r.account_id,
      providerId: r.provider_id,
      endpointPath: r.endpoint_path,
      webhookUrl: r.endpoint_path,
      secretRef: r.secret_ref,
      secret: r.secret_ref,
      subscribedEvents: JSON.parse(r.subscribed_events_json || '[]'),
      events: JSON.parse(r.subscribed_events_json || '[]'),
      status: r.status,
      lastReceivedAt: r.last_received_at ?? undefined,
      failureCount: r.failure_count,
      createdAt: r.created_at,
    }));
  }

  public getAccountWebhook(id: string): AccountWebhook | null {
    const stmt = this.db.prepare(`SELECT * FROM account_webhooks WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      accountId: row.account_id,
      providerId: row.provider_id,
      endpointPath: row.endpoint_path,
      secretRef: row.secret_ref,
      subscribedEvents: JSON.parse(row.subscribed_events_json || '[]'),
      status: row.status,
      lastReceivedAt: row.last_received_at ?? undefined,
      failureCount: row.failure_count,
      createdAt: row.created_at,
    };
  }

  // ================= Audit Ledger =================

  public saveAuditEntry(entry: AccountAuditEntry): void {
    const stmt = this.db.prepare(
      `INSERT INTO account_audit (
        id, account_id, provider_id, capability_id, operation, actor,
        company_id, project_id, risk_level, status, timestamp, latency_ms,
        error_category, details_summary_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      entry.id,
      entry.accountId,
      entry.providerId,
      entry.capabilityId ?? null,
      entry.operation,
      entry.actor,
      entry.companyId ?? null,
      entry.projectId ?? null,
      entry.riskLevel || 'LOW',
      entry.status || 'SUCCESS',
      entry.timestamp || nowIso,
      entry.latencyMs ?? 0,
      entry.errorCategory ?? null,
      JSON.stringify(entry.detailsSummary || {})
    );
  }

  public listAuditEntries(accountId: string, limit: number = 50): AccountAuditEntry[] {
    const stmt = this.db.prepare(`SELECT * FROM account_audit WHERE account_id = ? ORDER BY timestamp DESC LIMIT ?`);
    const rows = stmt.all(accountId, limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      accountId: r.account_id,
      providerId: r.provider_id,
      capabilityId: r.capability_id ?? undefined,
      operation: r.operation,
      actor: r.actor,
      companyId: r.company_id ?? undefined,
      projectId: r.project_id ?? undefined,
      riskLevel: r.risk_level,
      status: r.status,
      timestamp: r.timestamp,
      latencyMs: r.latency_ms,
      errorCategory: r.error_category ?? undefined,
      detailsSummary: JSON.parse(r.details_summary_json || '{}'),
    }));
  }

  // ================= Credential Metadata =================

  public saveCredentialMetadata(meta: AccountCredentialMetadata): void {
    const stmt = this.db.prepare(
      `INSERT INTO account_credentials_metadata (
        ref, provider_id, account_id, key_algorithm, key_id,
        has_refresh_token, expires_at, created_at, rotated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ref) DO UPDATE SET
        key_algorithm = excluded.key_algorithm,
        key_id = excluded.key_id,
        has_refresh_token = excluded.has_refresh_token,
        expires_at = excluded.expires_at,
        rotated_at = excluded.rotated_at`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      meta.ref,
      meta.providerId,
      meta.accountId,
      meta.keyAlgorithm || 'aes-256-gcm',
      meta.keyId || 'hris-vault-k1',
      meta.hasRefreshToken ? 1 : 0,
      meta.expiresAt ?? null,
      meta.createdAt ? String(meta.createdAt) : nowIso,
      meta.rotatedAt ?? null
    );
  }

  public getCredentialMetadata(ref: string): AccountCredentialMetadata | null {
    const stmt = this.db.prepare(`SELECT * FROM account_credentials_metadata WHERE ref = ?`);
    const row = stmt.get(ref) as any;
    if (!row) return null;
    return {
      ref: row.ref,
      providerId: row.provider_id,
      accountId: row.account_id,
      keyAlgorithm: row.key_algorithm,
      keyId: row.key_id,
      hasRefreshToken: row.has_refresh_token === 1,
      expiresAt: row.expires_at ?? undefined,
      createdAt: row.created_at,
      rotatedAt: row.rotated_at ?? undefined,
    };
  }

  public deleteCredentialMetadata(ref: string): void {
    this.db.prepare(`DELETE FROM account_credentials_metadata WHERE ref = ?`).run(ref);
  }

  // ================= Audit Trail =================

  public saveAccountAudit(audit: any): void {
    const stmt = this.db.prepare(
      `INSERT INTO account_audit (
        id, account_id, provider_id, capability_id, operation, actor,
        company_id, project_id, risk_level, status, timestamp, latency_ms,
        error_category, details_summary_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const actor = audit.actor || audit.actorIdentity || 'system';
    const operation = audit.operation || audit.action || 'INVOKE';
    const latencyMs = audit.latencyMs || audit.executionTimeMs || 0;
    const nowIso = new Date().toISOString();
    const ts = typeof audit.timestamp === 'number' ? String(audit.timestamp) : (audit.timestamp || nowIso);

    stmt.run(
      audit.id,
      audit.accountId,
      audit.providerId,
      audit.capabilityId ?? null,
      operation,
      actor,
      audit.companyId ?? null,
      audit.projectId ?? null,
      audit.riskLevel || 'LOW',
      audit.status || 'SUCCESS',
      ts,
      latencyMs,
      audit.errorCategory ?? null,
      JSON.stringify(audit.detailsSummary || {})
    );
  }

  public listAccountAudits(filter?: { accountId?: string; providerId?: string; limit?: number }): any[] {
    let sql = `SELECT * FROM account_audit WHERE 1=1`;
    const params: any[] = [];
    if (filter?.accountId) {
      sql += ` AND account_id = ?`;
      params.push(filter.accountId);
    }
    if (filter?.providerId) {
      sql += ` AND provider_id = ?`;
      params.push(filter.providerId);
    }
    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(filter?.limit || 100);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      accountId: r.account_id,
      providerId: r.provider_id,
      capabilityId: r.capability_id ?? undefined,
      operation: r.operation,
      action: r.operation,
      actor: r.actor,
      actorIdentity: r.actor,
      companyId: r.company_id ?? undefined,
      projectId: r.project_id ?? undefined,
      riskLevel: r.risk_level,
      status: r.status,
      timestamp: isNaN(Number(r.timestamp)) ? r.timestamp : Number(r.timestamp),
      latencyMs: r.latency_ms,
      executionTimeMs: r.latency_ms,
      errorCategory: r.error_category ?? undefined,
      detailsSummary: JSON.parse(r.details_summary_json || '{}'),
    }));
  }

  public listAccountAudit(accountId: string): any[] {
    return this.listAccountAudits({ accountId });
  }

  // ================= Helper Mappers =================

  private mapProvider(row: any): ServiceProvider {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      authMethods: JSON.parse(row.auth_methods_json || '[]'),
      status: row.status,
      documentationUrl: row.documentation_url,
      privacyPolicyUrl: row.privacy_policy_url,
      iconUrl: row.icon_url,
      supportedScopes: JSON.parse(row.supported_scopes_json || '[]'),
      defaultScopes: JSON.parse(row.default_scopes_json || '[]'),
      requiredConfigKeys: JSON.parse(row.required_config_keys_json || '[]'),
      capabilities: JSON.parse(row.capabilities_json || '[]'),
      rateLimitPolicy: JSON.parse(row.rate_limit_policy_json || '{}'),
      webhookSupport: Boolean(row.webhook_support),
      provenance: JSON.parse(row.provenance_json || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAccount(row: any): ServiceAccount {
    let metadata: any = {};
    try {
      metadata = JSON.parse(row.metadata_json || '{}');
    } catch {}

    return {
      id: row.id,
      providerId: row.provider_id,
      accountName: row.account_name,
      email: row.email ?? undefined,
      ownerIdentity: row.owner_identity,
      scopeType: row.scope_type,
      companyId: row.company_id ?? undefined,
      projectId: row.project_id ?? undefined,
      status: row.status,
      scopes: JSON.parse(row.scopes_json || '[]'),
      credentialRef: row.credential_ref,
      credentialReference: row.credential_ref,
      lastVerifiedAt: row.last_verified_at ?? undefined,
      lastError: row.last_error ?? undefined,
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapOAuth(row: any): OAuthAuthorizationRequest {
    return {
      id: row.id,
      providerId: row.provider_id,
      accountId: row.account_id ?? undefined,
      state: row.state,
      codeVerifier: row.code_verifier,
      codeChallenge: row.code_challenge,
      redirectUri: row.redirect_uri,
      scopes: JSON.parse(row.scopes_json || '[]'),
      authorizationUrl: row.authorization_url,
      authUrl: row.authorization_url,
      status: row.status,
      companyId: row.company_id ?? undefined,
      projectId: row.project_id ?? undefined,
      scopeType: row.scope_type ?? undefined,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }
}
