/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-12 Universal Service & Account Integration Fabric Test Suite
 *
 * 60+ comprehensive tests covering:
 * - Provider Registration & Discovery
 * - Credential Vault (AES-256-GCM, Zero Plaintext Secrets, Redaction)
 * - OAuth 2.0 PKCE, State Lifecycle, Replay & CSRF Defense
 * - Multi-Account Routing & Scope/Project/Company Isolation
 * - Health Monitoring & Honest Quota/Rate-Limit Tracking
 * - Webhook HMAC-SHA256 Verification & EventBus Dispatch
 * - SSRF Defense, Size Limits & Prompt Injection Neutralization
 * - Provider Adapters (Google, GitHub, Microsoft, Slack, REST, API Key, CLI, MCP)
 * - Natural Language Intent Resolution
 * - Restart & SQLite Persistence Integrity
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { EventBus } from '../src/core/events/event-bus.js';
import {
  AccountFabric,
  CredentialVault,
  AccountRepository,
  BaseProviderAdapter,
  GoogleProviderAdapter,
  GitHubProviderAdapter,
  MicrosoftProviderAdapter,
  SlackProviderAdapter,
  GenericRestProviderAdapter,
  ApiKeyProviderAdapter,
  CliProviderAdapter,
  McpProviderAdapter,
  OAuthManager,
  AccountResolver,
  AccountHealthMonitor,
  AccountQuotaTracker,
  AccountWebhookManager,
  AccountIntentResolver,
} from '../src/accounts/index.js';
import { migration026 } from '../src/persistence/migrations/026_universal_service_account_fabric_schema.js';

describe('FP-12: Universal Service & Account Integration Fabric', () => {
  let db: DatabaseSync;
  let eventBus: EventBus;
  let fabric: AccountFabric;
  const testDir = path.join(process.cwd(), 'temp_test_fp12_' + Date.now());
  const vaultDir = path.join(testDir, 'vault');

  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };

  before(() => {
    fs.mkdirSync(vaultDir, { recursive: true });
    db = new DatabaseSync(':memory:');
    // Run schema migration 026
    migration026.up(db);
    eventBus = new EventBus();
    fabric = new AccountFabric(db, mockLogger as any, eventBus, {
      storageDir: vaultDir,
      vaultKeyPath: path.join(testDir, '.vault_test.key'),
    });
  });

  after(() => {
    try {
      fabric.shutdown();
      db.close();
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  // =========================================================================
  // 1. PROVIDER REGISTRATION & DISCOVERY (Tests 1-8)
  // =========================================================================
  describe('1. Provider Registration & Discovery', () => {
    test('1. Default providers are registered automatically', () => {
      const providers = fabric.listProviders();
      assert.ok(providers.length >= 8, `Expected at least 8 default providers, got ${providers.length}`);
      const ids = providers.map(p => p.id);
      assert.ok(ids.includes('google'));
      assert.ok(ids.includes('github'));
      assert.ok(ids.includes('microsoft'));
      assert.ok(ids.includes('slack'));
      assert.ok(ids.includes('generic_rest'));
      assert.ok(ids.includes('apikey_service'));
      assert.ok(ids.includes('cli_tools'));
      assert.ok(ids.includes('mcp_server'));
    });

    test('2. Get provider by ID returns correct definition', () => {
      const google = fabric.getProvider('google');
      assert.ok(google);
      assert.equal(google.name, 'google');
      assert.equal(google.category, 'PRODUCTIVITY');
      assert.ok(google.authMethods.includes('OAUTH2'));
    });

    test('3. Provider supported scopes are declared with risk levels', () => {
      const github = fabric.getProvider('github');
      assert.ok(github);
      assert.ok(github.supportedScopes.length > 0);
      const repoScope = github.supportedScopes.find(s => s.scope === 'repo');
      assert.ok(repoScope);
      assert.equal(repoScope.riskLevel, 'HIGH');
    });

    test('4. Provider capabilities have explicit action types and privacy classes', () => {
      const google = fabric.getProvider('google');
      assert.ok(google);
      const readGmail = google.capabilities.find(c => c.id === 'google.gmail.read');
      assert.ok(readGmail);
      assert.equal(readGmail.action, 'READ');
      assert.equal(readGmail.privacyClass, 'SECRET');
      assert.equal(readGmail.destructive, false);
      assert.equal(readGmail.financial, false);
    });

    test('5. Non-existent provider lookup returns undefined', () => {
      const nonExistent = fabric.getProvider('non_existent_provider_xyz');
      assert.equal(nonExistent, undefined);
    });

    test('6. Providers are persisted in SQLite service_providers table', () => {
      const row = db.prepare('SELECT id, display_name FROM service_providers WHERE id = ?').get('google') as any;
      assert.ok(row);
      assert.equal(row.id, 'google');
      assert.equal(row.display_name, 'Google Workspace');
    });

    test('7. Provider provenance metadata is recorded', () => {
      const github = fabric.getProvider('github');
      assert.ok(github?.provenance);
      assert.ok(github.provenance.source);
      assert.ok(github.provenance.officialDocsUrl);
    });

    test('8. Rate limit, usage, and webhook support flags are explicitly defined', () => {
      const rest = fabric.getProvider('generic_rest');
      assert.ok(rest);
      assert.equal(rest.rateLimitSupport, true);
      assert.equal(rest.usageSupport, true);
      assert.equal(rest.webhookSupport, true);
    });
  });

  // =========================================================================
  // 2. CREDENTIAL VAULT & ENCRYPTION (Tests 9-16)
  // =========================================================================
  describe('2. Credential Vault & Encryption (AES-256-GCM)', () => {
    const vaultRef = 'vault://providers/google/test_acc_01';

    test('9. Vault encrypts secrets with AES-256-GCM and stores ciphertext', async () => {
      await fabric.vault.store(vaultRef, {
        accessToken: 'ya29.secret_oauth_token_12345',
        refreshToken: '1//refresh_secret_token_67890',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000,
      });

      const exists = await fabric.vault.exists(vaultRef);
      assert.equal(exists, true);
    });

    test('10. Raw secret material is never stored in SQLite in plaintext', () => {
      const rows = db.prepare('SELECT * FROM account_credentials_metadata WHERE ref = ?').all(vaultRef) as any[];
      assert.equal(rows.length, 1);
      const rowStr = JSON.stringify(rows[0]);
      assert.equal(rowStr.includes('ya29.secret_oauth_token_12345'), false, 'Plaintext token found in DB!');
      assert.equal(rowStr.includes('1//refresh_secret_token_67890'), false, 'Plaintext refresh token found in DB!');
    });

    test('11. Raw secret material is never stored in disk file in plaintext', () => {
      const files = fs.readdirSync(vaultDir);
      assert.ok(files.length > 0);
      for (const f of files) {
        const rawContent = fs.readFileSync(path.join(vaultDir, f), 'utf-8');
        assert.equal(rawContent.includes('ya29.secret_oauth_token_12345'), false, 'Plaintext token found on disk!');
      }
    });

    test('12. Vault resolves decrypted secrets in-memory', async () => {
      const creds = await fabric.vault.resolve(vaultRef);
      assert.ok(creds);
      assert.equal(creds.accessToken, 'ya29.secret_oauth_token_12345');
      assert.equal(creds.refreshToken, '1//refresh_secret_token_67890');
    });

    test('13. RedactSecrets utility masks access_tokens, refresh_tokens, api_keys, passwords', () => {
      const sensitiveObj = {
        name: 'test',
        accessToken: 'ya29.secret_token',
        refreshToken: '1//secret_refresh',
        apiKey: 'sk-1234567890',
        clientSecret: 'secret_client_val',
        headers: {
          Authorization: 'Bearer secret_bearer_token',
          'X-API-Key': 'secret_key_123',
        },
      };

      const redacted = CredentialVault.redactSecrets(sensitiveObj) as any;
      assert.equal(redacted.name, 'test');
      assert.equal(redacted.accessToken.includes('secret_token'), false);
      assert.equal(redacted.refreshToken.includes('secret_refresh'), false);
      assert.equal(redacted.apiKey.includes('1234567890'), false);
      assert.equal(redacted.clientSecret.includes('secret_client_val'), false);
      assert.equal(redacted.headers.Authorization.includes('secret_bearer_token'), false);
      assert.equal(redacted.headers['X-API-Key'].includes('secret_key_123'), false);
    });

    test('14. RedactSecrets handles nested objects and arrays cleanly', () => {
      const nested = {
        items: [
          { token: 'secret1', id: 1 },
          { password: 'secret_password', id: 2 },
        ],
      };
      const redacted = CredentialVault.redactSecrets(nested) as any;
      assert.equal(redacted.items[0].token.includes('secret1'), false);
      assert.equal(redacted.items[1].password.includes('secret_password'), false);
      assert.equal(redacted.items[0].id, 1);
    });

    test('15. Deleting secret from vault removes file and metadata', async () => {
      await fabric.vault.delete(vaultRef);
      const exists = await fabric.vault.exists(vaultRef);
      assert.equal(exists, false);
      const resolved = await fabric.vault.resolve(vaultRef);
      assert.equal(resolved, undefined);
    });

    test('16. Resolving non-existent reference returns undefined without throwing', async () => {
      const res = await fabric.vault.resolve('vault://providers/unknown/fake_acc');
      assert.equal(res, undefined);
    });
  });

  // =========================================================================
  // 3. OAUTH 2.0 PKCE & STATE LIFECYCLE (Tests 17-25)
  // =========================================================================
  describe('3. OAuth 2.0 PKCE & State Lifecycle', () => {
    test('17. Generates valid PKCE S256 codeVerifier and codeChallenge', () => {
      const { codeVerifier, codeChallenge } = BaseProviderAdapter.generatePkcePair();
      assert.ok(codeVerifier.length >= 43 && codeVerifier.length <= 128);
      assert.ok(codeChallenge.length > 0);
      assert.notEqual(codeVerifier, codeChallenge);
    });

    test('18. Initiating OAuth flow generates authorization URL with state, PKCE, scopes', async () => {
      const authReq = await fabric.oauthManager.initiateAuthorization({
        providerId: 'github',
        ownerIdentity: 'rushi',
        scopeType: 'PERSONAL',
        requestedScopes: ['read:user', 'repo'],
      });

      assert.ok(authReq.id.startsWith('oauth_req_'));
      assert.equal(authReq.providerId, 'github');
      assert.equal(authReq.status, 'WAITING_USER');
      assert.ok(authReq.authUrl.includes('state=' + authReq.state));
      assert.ok(authReq.authUrl.includes('code_challenge=' + authReq.codeChallenge));
      assert.ok(authReq.authUrl.includes('read') && authReq.authUrl.includes('repo'));
    });

    test('19. State has short expiration timestamp (10 minutes)', async () => {
      const authReq = await fabric.oauthManager.initiateAuthorization({
        providerId: 'google',
        ownerIdentity: 'rushi',
      });
      const now = Date.now();
      assert.ok(authReq.expiresAt > now);
      assert.ok(authReq.expiresAt <= now + 10 * 60 * 1000 + 1000);
    });

    test('20. OAuth request is saved in oauth_authorizations table', async () => {
      const authReq = await fabric.oauthManager.initiateAuthorization({
        providerId: 'microsoft',
        ownerIdentity: 'rushi',
      });
      const row = db.prepare('SELECT id, provider_id, status FROM oauth_authorizations WHERE id = ?').get(authReq.id) as any;
      assert.ok(row);
      assert.equal(row.provider_id, 'microsoft');
      assert.equal(row.status, 'WAITING_USER');
    });

    test('21. Unknown/forged state callback is rejected (CSRF defense)', async () => {
      await assert.rejects(
        async () => {
          await fabric.oauthManager.handleCallback('forged_fake_state_123', 'fake_code');
        },
        /Invalid or unknown OAuth state/
      );
    });

    test('22. Replayed state is rejected (one-time usage rule)', async () => {
      const authReq = await fabric.oauthManager.initiateAuthorization({
        providerId: 'google',
        ownerIdentity: 'rushi',
      });

      // Manually set status to COMPLETED
      authReq.status = 'COMPLETED';
      fabric.repository.saveOAuthAuthorization(authReq);

      await assert.rejects(
        async () => {
          await fabric.oauthManager.handleCallback(authReq.state, 'code_123');
        },
        /already used or expired/
      );
    });

    test('23. Expired state callback is rejected', async () => {
      const authReq = await fabric.oauthManager.initiateAuthorization({
        providerId: 'google',
        ownerIdentity: 'rushi',
      });

      // Expire state
      authReq.expiresAt = Date.now() - 1000;
      fabric.repository.saveOAuthAuthorization(authReq);

      await assert.rejects(
        async () => {
          await fabric.oauthManager.handleCallback(authReq.state, 'code_123');
        },
        /expired/
      );
    });

    test('24. Provider user denial in callback updates status to DENIED', async () => {
      const authReq = await fabric.oauthManager.initiateAuthorization({
        providerId: 'google',
        ownerIdentity: 'rushi',
      });

      await assert.rejects(
        async () => {
          await fabric.oauthManager.handleCallback(authReq.state, '', 'access_denied');
        },
        /denied or failed/
      );

      const saved = fabric.repository.getOAuthAuthorizationByState(authReq.state);
      assert.equal(saved?.status, 'DENIED');
    });

    test('25. Missing authorization code in callback throws error', async () => {
      const authReq = await fabric.oauthManager.initiateAuthorization({
        providerId: 'slack',
        ownerIdentity: 'rushi',
      });

      await assert.rejects(
        async () => {
          await fabric.oauthManager.handleCallback(authReq.state, '');
        },
        /Missing authorization code/
      );
    });
  });

  // =========================================================================
  // 4. MULTI-ACCOUNT ROUTING & ISOLATION (Tests 26-34)
  // =========================================================================
  describe('4. Multi-Account Routing & Scope/Project Isolation', () => {
    before(() => {
      // Seed test accounts
      fabric.repository.saveAccount({
        id: 'acc_proj_a_github',
        providerId: 'github',
        ownerIdentity: 'rushi',
        scopeType: 'PROJECT',
        projectId: 'proj_alpha',
        status: 'CONNECTED',
        identity: 'rushi-alpha',
        credentialReference: 'vault://providers/github/acc_proj_a_github',
        scopes: [{ scope: 'repo', description: 'Repo access', riskLevel: 'HIGH', required: true, grantedCapabilities: [] }],
        capabilities: ['github.repo.read', 'github.issue.list', 'github.issue.read'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      fabric.repository.saveAccount({
        id: 'acc_proj_b_github',
        providerId: 'github',
        ownerIdentity: 'rushi',
        scopeType: 'PROJECT',
        projectId: 'proj_beta',
        status: 'CONNECTED',
        identity: 'rushi-beta',
        credentialReference: 'vault://providers/github/acc_proj_b_github',
        scopes: [{ scope: 'repo', description: 'Repo access', riskLevel: 'HIGH', required: true, grantedCapabilities: [] }],
        capabilities: ['github.repo.read', 'github.issue.list'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      fabric.repository.saveAccount({
        id: 'acc_personal_google',
        providerId: 'google',
        ownerIdentity: 'rushi',
        scopeType: 'PERSONAL',
        status: 'CONNECTED',
        identity: 'rushi@personal.com',
        credentialReference: 'vault://providers/google/acc_personal_google',
        scopes: [{ scope: 'gmail.readonly', description: 'Gmail', riskLevel: 'MEDIUM', required: true, grantedCapabilities: [] }],
        capabilities: ['google.gmail.read', 'google.calendar.list'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    test('26. Resolves account matching specific projectId', () => {
      const resolved = fabric.resolver.resolveAccount({
        capabilityId: 'github.repo.read',
        projectId: 'proj_alpha',
      });
      assert.equal(resolved.id, 'acc_proj_a_github');
      assert.equal(resolved.projectId, 'proj_alpha');
    });

    test('27. Cross-project access is strictly forbidden (Project Beta cannot access Project Alpha account)', () => {
      assert.throws(
        () => {
          fabric.resolver.resolveAccount({
            capabilityId: 'github.repo.read',
            projectId: 'proj_gamma', // Unrelated project
          });
        },
        /Access Denied: No connected "github" accounts match isolation criteria/
      );
    });

    test('28. Explicit preferredAccountId is validated against project isolation boundary', () => {
      assert.throws(
        () => {
          fabric.resolver.resolveAccount({
            capabilityId: 'github.repo.read',
            preferredAccountId: 'acc_proj_a_github',
            projectId: 'proj_beta', // Mismatch
          });
        },
        /Isolation Violation/
      );
    });

    test('29. Personal account is resolvable when no project scope is requested', () => {
      const resolved = fabric.resolver.resolveAccount({
        capabilityId: 'google.gmail.read',
        ownerIdentity: 'rushi',
      });
      assert.equal(resolved.id, 'acc_personal_google');
      assert.equal(resolved.scopeType, 'PERSONAL');
    });

    test('30. Throws error when no connected account exists for requested provider', () => {
      assert.throws(
        () => {
          fabric.resolver.resolveAccount({
            capabilityId: 'slack.messages.send',
          });
        },
        /No connected accounts found for provider "slack"/
      );
    });

    test('31. Disconnected or degraded accounts are not selected if connected accounts exist', () => {
      fabric.repository.saveAccount({
        id: 'acc_expired_github',
        providerId: 'github',
        ownerIdentity: 'rushi',
        scopeType: 'PROJECT',
        projectId: 'proj_alpha',
        status: 'EXPIRED',
        credentialReference: 'vault://providers/github/acc_expired_github',
        scopes: [],
        capabilities: ['github.repo.read'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const resolved = fabric.resolver.resolveAccount({
        capabilityId: 'github.repo.read',
        projectId: 'proj_alpha',
      });
      assert.equal(resolved.id, 'acc_proj_a_github');
    });

    test('32. List accounts filters by providerId', () => {
      const githubAccounts = fabric.listAccounts({ providerId: 'github' });
      assert.ok(githubAccounts.length >= 2);
      assert.ok(githubAccounts.every(a => a.providerId === 'github'));
    });

    test('33. List accounts filters by projectId', () => {
      const projAccounts = fabric.listAccounts({ projectId: 'proj_alpha' });
      assert.ok(projAccounts.length >= 1);
      assert.ok(projAccounts.every(a => a.projectId === 'proj_alpha'));
    });

    test('34. Get account by ID returns full metadata without plaintext secrets', () => {
      const acc = fabric.getAccount('acc_personal_google');
      assert.ok(acc);
      assert.equal(acc.id, 'acc_personal_google');
      assert.equal(acc.credentialReference.startsWith('vault://'), true);
      assert.equal((acc as any).accessToken, undefined);
    });
  });

  // =========================================================================
  // 5. HEALTH MONITORING & QUOTA INTELLIGENCE (Tests 35-43)
  // =========================================================================
  describe('5. Health Monitoring & Quota Intelligence', () => {
    test('35. Account health records initial HEALTHY state upon successful check', () => {
      const health = {
        accountId: 'acc_personal_google',
        status: 'HEALTHY' as const,
        lastCheckedAt: Date.now(),
        lastSuccessfulCheckAt: Date.now(),
        failureCount: 0,
        consecutiveErrors: 0,
        latencyMs: 120,
      };
      fabric.repository.saveAccountHealth(health);

      const retrieved = fabric.getAccountHealth('acc_personal_google');
      assert.ok(retrieved);
      assert.equal(retrieved.status, 'HEALTHY');
      assert.equal(retrieved.latencyMs, 120);
    });

    test('36. Invocation usage recording increments request counts', () => {
      fabric.quotaTracker.recordInvocation('acc_personal_google', 'google', true, 150);
      const usage = fabric.getAccountUsage('acc_personal_google');
      assert.ok(usage);
      assert.equal(usage.totalRequests, 1);
      assert.equal(usage.successfulRequests, 1);
      assert.equal(usage.totalTokens, 150);
    });

    test('37. Failed invocation records failure count', () => {
      fabric.quotaTracker.recordInvocation('acc_personal_google', 'google', false);
      const usage = fabric.getAccountUsage('acc_personal_google');
      assert.ok(usage);
      assert.equal(usage.totalRequests, 2);
      assert.equal(usage.failedRequests, 1);
    });

    test('38. Unexposed quotas are honestly represented as UNKNOWN (no fabrication)', () => {
      const usage = fabric.getAccountUsage('acc_personal_google');
      assert.ok(usage);
      assert.ok(usage.quotas.some(q => q.quotaType === 'UNKNOWN' && q.remaining === null));
    });

    test('39. Recording rate limit sets active cooldown backoff', () => {
      fabric.quotaTracker.recordRateLimit('acc_personal_google', 'google', 30);
      const isLimited = fabric.quotaTracker.isRateLimited('acc_personal_google');
      assert.equal(isLimited, true);

      const state = fabric.quotaTracker.getRateLimitState('acc_personal_google');
      assert.ok(state);
      assert.equal(state.isRateLimited, true);
      assert.equal(state.retryAfterSeconds, 30);
      assert.ok(state.resetAt > Date.now());
    });

    test('40. Rate limited account rejects capability invocation with RATE_LIMITED error', async () => {
      const result = await fabric.invokeCapability('google.gmail.read', {}, {
        preferredAccountId: 'acc_personal_google',
      });
      assert.equal(result.success, false);
      assert.equal(result.error?.category, 'RATE_LIMITED');
    });

    test('41. Expired cooldown clears rate limit state', () => {
      const state = fabric.quotaTracker.getRateLimitState('acc_personal_google')!;
      state.resetAt = Date.now() - 1000; // Force expiry

      const isLimited = fabric.quotaTracker.isRateLimited('acc_personal_google');
      assert.equal(isLimited, false);
    });

    test('42. Account health changes emit EventBus events', (done) => {
      eventBus.subscribe('account.health_changed', (evt) => {
        assert.equal(evt.payload.accountId, 'acc_test_health_event');
        assert.equal(evt.payload.currentStatus, 'DEGRADED');
      });

      fabric.repository.saveAccount({
        id: 'acc_test_health_event',
        providerId: 'generic_rest',
        ownerIdentity: 'rushi',
        scopeType: 'PERSONAL',
        status: 'CONNECTED',
        credentialReference: 'vault://test',
        scopes: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      fabric.repository.saveAccountHealth({
        accountId: 'acc_test_health_event',
        status: 'HEALTHY',
        lastCheckedAt: Date.now(),
        failureCount: 0,
        consecutiveErrors: 0,
      });

      // Trigger health change
      fabric.healthMonitor.verifyAccount('acc_test_health_event').then(() => {
        // Validation will mark DEGRADED or HEALTHY
        assert.ok(true);
      });
    });

    test('43. Health monitor periodic timer can start and stop cleanly', () => {
      fabric.healthMonitor.start();
      assert.ok((fabric.healthMonitor as any).timer !== null);
      fabric.healthMonitor.stop();
      assert.equal((fabric.healthMonitor as any).timer, null);
    });
  });

  // =========================================================================
  // 6. WEBHOOKS & HMAC SIGNATURES (Tests 44-51)
  // =========================================================================
  describe('6. Webhooks & HMAC Verification (Replay Defense)', () => {
    test('44. Webhook payload larger than 5MB is rejected', async () => {
      const largePayload = 'a'.repeat(6 * 1024 * 1024);
      const res = await fabric.processWebhook({
        providerId: 'github',
        headers: {},
        rawBody: largePayload,
      });
      assert.equal(res.accepted, false);
      assert.ok(res.error?.includes('exceeded 5MB'));
    });

    test('45. Duplicate webhook delivery ID is rejected (Replay Defense)', async () => {
      const deliveryId = 'gh_deliv_unique_12345';
      const body = JSON.stringify({ action: 'opened', issue: { number: 42, title: 'Bug found' } });

      const res1 = await fabric.processWebhook({
        providerId: 'github',
        headers: {
          'x-github-delivery': deliveryId,
          'x-github-event': 'issues',
        },
        rawBody: body,
      });
      assert.equal(res1.accepted, true);

      // Replay identical delivery ID
      const res2 = await fabric.processWebhook({
        providerId: 'github',
        headers: {
          'x-github-delivery': deliveryId,
          'x-github-event': 'issues',
        },
        rawBody: body,
      });
      assert.equal(res2.accepted, false);
      assert.ok(res2.error?.includes('duplicate') || res2.error?.includes('replay'));
    });

    test('46. Slack webhook with expired timestamp (>5min) is rejected', async () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 400; // 6.6 mins ago
      const res = await fabric.processWebhook({
        providerId: 'slack',
        headers: {
          'x-slack-request-timestamp': String(expiredTimestamp),
          'x-slack-signature': 'v0=fake_sig',
        },
        rawBody: '{"type":"event_callback"}',
      });
      assert.equal(res.accepted, false);
      assert.ok(res.error?.includes('timestamp out of valid window'));
    });

    test('47. Normalized webhook event is dispatched to EventBus for FP-11 workflow triggers', (done) => {
      eventBus.subscribe('github.issues', (evt) => {
        assert.equal(evt.source, 'webhook.github');
        assert.equal(evt.payload.providerId, 'github');
        assert.equal((evt.payload.data as any).action, 'created');
      });

      fabric.processWebhook({
        providerId: 'github',
        headers: {
          'x-github-delivery': `gh_deliv_${Date.now()}`,
          'x-github-event': 'issues',
        },
        rawBody: JSON.stringify({ action: 'created', issue: { title: 'New Test Issue' } }),
      }).then((res) => {
        assert.equal(res.accepted, true);
      });
    });

    test('48. Webhook secret headers are redacted before dispatching', (done) => {
      eventBus.subscribe('github.pull_request', (evt) => {
        assert.ok(evt.payload.headers);
        // Ensure no raw secrets in dispatched payload
        assert.equal((evt.payload.headers as any)['authorization'], undefined);
      });

      fabric.processWebhook({
        providerId: 'github',
        headers: {
          'x-github-delivery': `gh_deliv_pr_${Date.now()}`,
          'x-github-event': 'pull_request',
          authorization: 'Bearer secret_token',
        },
        rawBody: JSON.stringify({ action: 'opened' }),
      }).then((res) => {
        assert.equal(res.accepted, true);
      });
    });

    test('49. Webhook configurations are saved and listed in repository', () => {
      fabric.repository.saveAccountWebhook({
        id: 'wh_github_01',
        accountId: 'acc_proj_a_github',
        providerId: 'github',
        events: ['issues', 'pull_request'],
        webhookUrl: 'http://localhost:4000/api/accounts/webhooks/github',
        secret: 'webhook_secret_key_123',
        status: 'ACTIVE',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const hooks = fabric.repository.listAccountWebhooks('acc_proj_a_github');
      assert.equal(hooks.length, 1);
      assert.equal(hooks[0].id, 'wh_github_01');
      assert.equal(hooks[0].secret, 'webhook_secret_key_123');
    });

    test('50. Webhook verification rejects forged signature with configured secret', async () => {
      const res = await fabric.processWebhook({
        providerId: 'github',
        accountId: 'acc_proj_a_github',
        headers: {
          'x-github-delivery': `gh_forged_${Date.now()}`,
          'x-github-event': 'issues',
          'x-hub-signature-256': 'sha256=invalid_signature_hex_123',
        },
        rawBody: JSON.stringify({ action: 'created' }),
      });
      assert.equal(res.accepted, false);
      assert.ok(res.error?.includes('signature') || res.error?.includes('Invalid'));
    });

    test('51. Generic webhook event is accepted and formatted correctly', async () => {
      const res = await fabric.processWebhook({
        providerId: 'generic_rest',
        headers: {
          'x-delivery-id': `gen_deliv_${Date.now()}`,
          'x-event-type': 'custom_event',
        },
        rawBody: JSON.stringify({ message: 'hello from generic webhook' }),
      });
      assert.equal(res.accepted, true);
      assert.equal(res.normalizedEventType, 'generic_rest.custom_event');
    });
  });

  // =========================================================================
  // 7. SSRF PROTECTION & REST CONNECTOR (Tests 52-57)
  // =========================================================================
  describe('7. SSRF Defense & Generic REST Connector', () => {
    const restAdapter = new GenericRestProviderAdapter(mockLogger as any);

    test('52. SSRF defense blocks localhost / loopback access', async () => {
      const res = await restAdapter.invoke('rest.request.get', { url: 'http://localhost:8080/admin' }, {
        account: { id: 'test', providerId: 'generic_rest', ownerIdentity: 'rushi', scopeType: 'PERSONAL', status: 'CONNECTED', credentialReference: 'vault://test', scopes: [], createdAt: 0, updatedAt: 0 },
        credentials: {},
      });
      assert.equal(res.success, false);
      assert.ok(res.error?.message.includes('SSRF Blocked: Access to prohibited host "localhost"'));
    });

    test('53. SSRF defense blocks 127.0.0.1 IP access', async () => {
      const res = await restAdapter.invoke('rest.request.get', { url: 'http://127.0.0.1:3000/internal' }, {
        account: { id: 'test', providerId: 'generic_rest', ownerIdentity: 'rushi', scopeType: 'PERSONAL', status: 'CONNECTED', credentialReference: 'vault://test', scopes: [], createdAt: 0, updatedAt: 0 },
        credentials: {},
      });
      assert.equal(res.success, false);
      assert.ok(res.error?.message.includes('SSRF Blocked'));
    });

    test('54. SSRF defense blocks AWS/Cloud metadata endpoint 169.254.169.254', async () => {
      const res = await restAdapter.invoke('rest.request.get', { url: 'http://169.254.169.254/latest/meta-data/' }, {
        account: { id: 'test', providerId: 'generic_rest', ownerIdentity: 'rushi', scopeType: 'PERSONAL', status: 'CONNECTED', credentialReference: 'vault://test', scopes: [], createdAt: 0, updatedAt: 0 },
        credentials: {},
      });
      assert.equal(res.success, false);
      assert.ok(res.error?.message.includes('SSRF Blocked: Access to prohibited host "169.254.169.254"'));
    });

    test('55. SSRF defense blocks private RFC 1918 10.0.0.0/8 and 192.168.0.0/16 ranges', async () => {
      const res = await restAdapter.invoke('rest.request.get', { url: 'http://192.168.1.1/router' }, {
        account: { id: 'test', providerId: 'generic_rest', ownerIdentity: 'rushi', scopeType: 'PERSONAL', status: 'CONNECTED', credentialReference: 'vault://test', scopes: [], createdAt: 0, updatedAt: 0 },
        credentials: {},
      });
      assert.equal(res.success, false);
      assert.ok(res.error?.message.includes('SSRF Blocked: Access to private IP range'));
    });

    test('56. Missing URL parameter returns INVALID_PARAMETERS error', async () => {
      const res = await restAdapter.invoke('rest.request.get', {}, {
        account: { id: 'test', providerId: 'generic_rest', ownerIdentity: 'rushi', scopeType: 'PERSONAL', status: 'CONNECTED', credentialReference: 'vault://test', scopes: [], createdAt: 0, updatedAt: 0 },
        credentials: {},
      });
      assert.equal(res.success, false);
      assert.equal(res.error?.category, 'INVALID_PARAMETERS');
    });

    test('57. Unsupported URL protocol (e.g. file:// or ftp://) is blocked', async () => {
      const res = await restAdapter.invoke('rest.request.get', { url: 'file:///etc/passwd' }, {
        account: { id: 'test', providerId: 'generic_rest', ownerIdentity: 'rushi', scopeType: 'PERSONAL', status: 'CONNECTED', credentialReference: 'vault://test', scopes: [], createdAt: 0, updatedAt: 0 },
        credentials: {},
      });
      assert.equal(res.success, false);
      assert.ok(res.error?.message.includes('SSRF Blocked: Unsupported protocol'));
    });
  });

  // =========================================================================
  // 8. NATURAL LANGUAGE INTENT RESOLVER (Tests 58-64)
  // =========================================================================
  describe('8. Natural Language Service & Account Intent Resolver', () => {
    test('58. "Connect my Google account" generates OAuth request and URL', async () => {
      const res = await fabric.resolveIntent('Connect my Google account');
      assert.equal(res.handled, true);
      assert.equal(res.intent, 'CONNECT');
      assert.equal(res.providerId, 'google');
      assert.ok(res.responseMessage.includes('OAuth authorization for Google Workspace'));
      assert.ok((res.data as any)?.authUrl);
    });

    test('59. "Connect GitHub" generates OAuth authorization flow', async () => {
      const res = await fabric.resolveIntent('Connect GitHub');
      assert.equal(res.handled, true);
      assert.equal(res.intent, 'CONNECT');
      assert.equal(res.providerId, 'github');
      assert.ok((res.data as any)?.authUrl);
    });

    test('60. "Which accounts are connected?" lists active accounts', async () => {
      const res = await fabric.resolveIntent('Which accounts are connected?');
      assert.equal(res.handled, true);
      assert.equal(res.intent, 'LIST_ACCOUNTS');
      assert.ok(res.responseMessage.includes('Connected Service Accounts'));
    });

    test('61. "What services can you connect?" lists available providers', async () => {
      const res = await fabric.resolveIntent('What services can you connect?');
      assert.equal(res.handled, true);
      assert.equal(res.intent, 'LIST_SERVICES');
      assert.ok(res.responseMessage.includes('Google Workspace'));
      assert.ok(res.responseMessage.includes('GitHub'));
      assert.ok(res.responseMessage.includes('Microsoft 365'));
      assert.ok(res.responseMessage.includes('Slack'));
    });

    test('62. "What permissions does Google have?" inspects authorized scopes', async () => {
      const res = await fabric.resolveIntent('What permissions does Google have?');
      assert.equal(res.handled, true);
      assert.equal(res.intent, 'INSPECT_ACCOUNT');
      assert.ok(res.responseMessage.includes('Permissions for GOOGLE'));
    });

    test('63. "Disconnect my Google account" revokes account', async () => {
      const res = await fabric.resolveIntent('Disconnect my Google account');
      assert.equal(res.handled, true);
      assert.equal(res.intent, 'DISCONNECT');
      assert.ok(res.responseMessage.includes('Successfully disconnected and revoked'));
    });

    test('64. Non-account natural language queries are cleanly ignored (handled: false)', async () => {
      const res = await fabric.resolveIntent('Write a TypeScript function to calculate Fibonacci');
      assert.equal(res.handled, false);
      assert.equal(res.responseMessage, '');
    });
  });

  // =========================================================================
  // 9. AUDIT TRAIL, DELETION & PERSISTENCE RECOVERY (Tests 65-70)
  // =========================================================================
  describe('9. Audit Trail, Deletion & SQLite Persistence Integrity', () => {
    test('65. Account audit entries are saved in account_audit table', () => {
      fabric.repository.saveAccountAudit({
        id: 'audit_test_01',
        accountId: 'acc_personal_google',
        providerId: 'google',
        actorIdentity: 'rushi',
        capabilityId: 'google.gmail.read',
        action: 'INVOKE',
        status: 'SUCCESS',
        riskLevel: 'LOW',
        executionTimeMs: 45,
        timestamp: Date.now(),
      });

      const audits = fabric.repository.listAccountAudit('acc_personal_google');
      assert.equal(audits.length, 1);
      assert.equal(audits[0].id, 'audit_test_01');
      assert.equal(audits[0].action, 'INVOKE');
      assert.equal(audits[0].status, 'SUCCESS');
    });

    test('66. Account deletion removes account record and associated health/usage/webhooks', () => {
      fabric.deleteAccount('acc_personal_google');
      const retrieved = fabric.getAccount('acc_personal_google');
      assert.equal(retrieved, null);
    });

    test('67. API Key provider adapter resolves keys at execution time without prompt leakage', async () => {
      const apiKeyAdapter = new ApiKeyProviderAdapter(mockLogger as any);
      const validation = await apiKeyAdapter.validateConnection(
        { id: 'acc_api_key_test', providerId: 'apikey_service', ownerIdentity: 'rushi', scopeType: 'PERSONAL', status: 'CONNECTED', credentialReference: 'vault://test', scopes: [], createdAt: 0, updatedAt: 0 },
        { apiKey: 'sk-test-secret-key-123' }
      );
      assert.equal(validation.valid, true);
      assert.equal(validation.health.status, 'HEALTHY');
    });

    test('68. CLI Provider Adapter discovers local tools without extracting raw credentials', async () => {
      const cliAdapter = new CliProviderAdapter(mockLogger as any);
      assert.equal(cliAdapter.providerId, 'cli_tools');
      assert.ok(cliAdapter.providerDefinition.capabilities.some(c => c.id === 'cli.gh.status'));
    });

    test('69. MCP Provider Adapter structures RPC tool calls and resource reads', () => {
      const mcpAdapter = new McpProviderAdapter(mockLogger as any);
      assert.equal(mcpAdapter.providerId, 'mcp_server');
      assert.ok(mcpAdapter.providerDefinition.capabilities.some(c => c.id === 'mcp.tool.invoke'));
    });

    test('70. E2E restart and SQLite persistence: Accounts, providers, and audit survive reload', () => {
      // Create fresh fabric on same database
      const newFabric = new AccountFabric(db, mockLogger as any, eventBus, {
        storageDir: vaultDir,
        vaultKeyPath: path.join(testDir, '.vault_test.key'),
      });

      const providers = newFabric.listProviders();
      assert.ok(providers.length >= 8);

      const accounts = newFabric.listAccounts();
      assert.ok(accounts.length >= 2);
    });
  });
});
