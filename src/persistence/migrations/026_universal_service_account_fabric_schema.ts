/**
 * HṚṢĪKEŚA (हृषीकेश) — Migration 026: Universal Service & Account Integration Fabric Schema
 *
 * FP-12: Service Providers, Accounts, OAuth Authorizations, Credential Metadata,
 * Account Health, Quota/Usage, Webhooks, and Audit Ledgers.
 */

import { DatabaseSync } from 'node:sqlite';
import { Migration } from './migration.types.js';

export const migration026: Migration = {
  version: 26,
  name: '026_universal_service_account_fabric_schema',
  up: (db: DatabaseSync): void => {
    // 1. Service Providers Registry
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'CUSTOM',
        auth_methods_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'REGISTERED',
        documentation_url TEXT,
        privacy_policy_url TEXT,
        icon_url TEXT,
        supported_scopes_json TEXT NOT NULL DEFAULT '[]',
        default_scopes_json TEXT NOT NULL DEFAULT '[]',
        required_config_keys_json TEXT NOT NULL DEFAULT '[]',
        capabilities_json TEXT NOT NULL DEFAULT '[]',
        rate_limit_policy_json TEXT NOT NULL DEFAULT '{}',
        webhook_support INTEGER NOT NULL DEFAULT 0,
        provenance_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sproviders_cat ON service_providers(category);
      CREATE INDEX IF NOT EXISTS idx_sproviders_status ON service_providers(status);
    `);

    // 2. Service Accounts
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_accounts (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        account_name TEXT NOT NULL,
        email TEXT,
        owner_identity TEXT NOT NULL,
        scope_type TEXT NOT NULL DEFAULT 'PERSONAL',
        company_id TEXT,
        project_id TEXT,
        status TEXT NOT NULL DEFAULT 'DISCONNECTED',
        scopes_json TEXT NOT NULL DEFAULT '[]',
        credential_ref TEXT NOT NULL,
        last_verified_at TEXT,
        last_error TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_saccounts_provider ON service_accounts(provider_id);
      CREATE INDEX IF NOT EXISTS idx_saccounts_status ON service_accounts(status);
      CREATE INDEX IF NOT EXISTS idx_saccounts_company ON service_accounts(company_id);
      CREATE INDEX IF NOT EXISTS idx_saccounts_project ON service_accounts(project_id);
      CREATE INDEX IF NOT EXISTS idx_saccounts_scope ON service_accounts(scope_type);
    `);

    // 3. OAuth Authorizations & PKCE State Machine
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_authorizations (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        account_id TEXT,
        state TEXT NOT NULL UNIQUE,
        code_verifier TEXT NOT NULL,
        code_challenge TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        scopes_json TEXT NOT NULL DEFAULT '[]',
        authorization_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CREATED',
        company_id TEXT,
        project_id TEXT,
        scope_type TEXT DEFAULT 'PERSONAL',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_oauth_state ON oauth_authorizations(state);
      CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_authorizations(provider_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_status ON oauth_authorizations(status);
    `);

    // 4. Account Health Monitoring
    db.exec(`
      CREATE TABLE IF NOT EXISTS account_health (
        account_id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'UNKNOWN',
        latency_ms INTEGER NOT NULL DEFAULT 0,
        last_successful_check TEXT,
        last_failure TEXT,
        failure_count INTEGER NOT NULL DEFAULT 0,
        details_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES service_accounts(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ahealth_status ON account_health(status);
    `);

    // 5. Account Usage & Quota Tracking
    db.exec(`
      CREATE TABLE IF NOT EXISTS account_usage (
        account_id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        requests_made INTEGER NOT NULL DEFAULT 0,
        requests_remaining_json TEXT NOT NULL DEFAULT '"UNKNOWN"',
        request_limit_json TEXT NOT NULL DEFAULT '"UNKNOWN"',
        reset_at TEXT,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        estimated_cost_usd REAL NOT NULL DEFAULT 0.0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES service_accounts(id) ON DELETE CASCADE
      );
    `);

    // 6. Account External Webhooks
    db.exec(`
      CREATE TABLE IF NOT EXISTS account_webhooks (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        endpoint_path TEXT NOT NULL UNIQUE,
        secret_ref TEXT NOT NULL,
        subscribed_events_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        last_received_at TEXT,
        failure_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES service_accounts(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_awebhooks_endpoint ON account_webhooks(endpoint_path);
      CREATE INDEX IF NOT EXISTS idx_awebhooks_account ON account_webhooks(account_id);
    `);

    // 7. Account Audit Trail
    db.exec(`
      CREATE TABLE IF NOT EXISTS account_audit (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        capability_id TEXT,
        operation TEXT NOT NULL,
        actor TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        status TEXT NOT NULL DEFAULT 'SUCCESS',
        timestamp TEXT NOT NULL,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        error_category TEXT,
        details_summary_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_aaudit_account ON account_audit(account_id);
      CREATE INDEX IF NOT EXISTS idx_aaudit_provider ON account_audit(provider_id);
      CREATE INDEX IF NOT EXISTS idx_aaudit_ts ON account_audit(timestamp);
    `);

    // 8. Credential Reference Metadata (Zero Plaintext Secrets)
    db.exec(`
      CREATE TABLE IF NOT EXISTS account_credentials_metadata (
        ref TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        key_algorithm TEXT NOT NULL,
        key_id TEXT NOT NULL,
        has_refresh_token INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        rotated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_acreds_account ON account_credentials_metadata(account_id);
    `);
  },
  down: (db: DatabaseSync): void => {
    db.exec(`
      DROP TABLE IF EXISTS account_credentials_metadata;
      DROP TABLE IF EXISTS account_audit;
      DROP TABLE IF EXISTS account_webhooks;
      DROP TABLE IF EXISTS account_usage;
      DROP TABLE IF EXISTS account_health;
      DROP TABLE IF EXISTS oauth_authorizations;
      DROP TABLE IF EXISTS service_accounts;
      DROP TABLE IF EXISTS service_providers;
    `);
  },
};
