# HṚṢĪKEŚA (हृषीकेश) — Universal Service & Account Integration Fabric
## Architectural Specification & Operational Reference (FP-12)

### 1. Executive Summary & Purpose

The Universal Service & Account Integration Fabric (**FP-12**) provides HṚṢĪKEŚA with a sovereign, production-grade, provider-independent integration backbone to securely connect to, authenticate with, manage, monitor, and operate authorized external services and accounts.

It acts as the authoritative bridge between:
```
    HṚṢĪKEŚA / Autonomous Workflows (FP-11)
                     ↓
       Account / Service Fabric (FP-12)
                     ↓
      Universal Capability Fabric (FP-07)
                     ↓
 Providers / APIs / OAuth Services / CLI / Browser / MCP
```

---

### 2. Core Architectural Invariants

1. **Provider Independence**: Unified domain model (`ServiceProvider`, `ServiceAccount`, `AccountHealth`, `AccountUsage`) decoupled from specific vendor protocols.
2. **Zero Plaintext Secrets**: All raw credentials (access tokens, refresh tokens, client secrets, API keys) are encrypted using AES-256-GCM via the `CredentialVault` on disk (`storage/vault/`) with master keys. Only opaque `vault://` reference URIs and metadata exist in SQLite and logs.
3. **Automated PKCE S256 OAuth**: Native state machine handling cryptographic state generation, authorization code exchange, token storage, proactive token refresh, and revocation.
4. **Multi-Tenant Scope Isolation**: Strict isolation by `PERSONAL`, `COMPANY` (e.g. Aumtrix, Pragnya), `PROJECT` (e.g. Project Alpha), and `SHARED_AUTHORIZED`. Cross-project credential access is prevented at runtime.
5. **Honest Monitoring & Quota Intelligence**: Health checks run with bounded latency. Quotas not exposed by upstream APIs are represented as `'UNKNOWN'` rather than fabricated. HTTP 429 rate limits trigger exponential backoff cooldowns.
6. **Replay-Resistant Webhooks**: Inbound webhooks are cryptographically authenticated via HMAC-SHA256, deduplicated by delivery ID to eliminate replay attacks, and normalized into `EventBus` topics for FP-11 workflow triggers.
7. **SSRF & Safety Defenses**: `GenericRestProviderAdapter` enforces strict SSRF protections, blocking localhost, loopback (`127.0.0.1`), link-local (`169.254.169.254`), and private RFC 1918 IPv4 ranges. Financial operations enforce mandatory human confirmation.

---

### 3. Subsystem Architecture

```
                                HṚṢĪKEŚA Core Runtime
                                         ↓
                                    AccountFabric
      ┌──────────────────────────────────┼──────────────────────────────────┐
      ↓                                  ↓                                  ↓
CredentialVault                    OAuthManager                      AccountResolver
(AES-256-GCM, Disk Storage)     (PKCE, Code Exchange, Refresh)    (Multi-Account & Scope Isolation)
      ↓                                  ↓                                  ↓
AccountRepository               AccountHealthMonitor              AccountQuotaTracker
(SQLite: Migration 026)         (Probing, Latency, Errors)        (Requests, Tokens, 429 Backoff)
      ↓                                  ↓                                  ↓
AccountWebhookManager           AccountIntentResolver             ProviderAdapterRegistry
(HMAC-SHA256, Replay Defense)   (Deterministic NL Parser)         (Google, GitHub, MS, Slack, etc.)
```

---

### 4. Built-in Provider Adapters

| Provider ID | Name | Category | Authentication | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| `google` | Google Workspace | `PRODUCTIVITY` | OAuth 2.0 (PKCE) | Gmail (`read`, `send`, `search`), Calendar (`list`, `create`), Drive (`search`, `read`) |
| `github` | GitHub | `DEVELOPMENT` | OAuth 2.0 / API Key | Repos (`get`, `list`), Issues (`list`, `create`), PRs (`list`, `create`), Workflows (`dispatch`) |
| `microsoft` | Microsoft 365 | `PRODUCTIVITY` | OAuth 2.0 (PKCE) | Profile, Outlook (`read`, `send`), Calendar (`list`, `create`), OneDrive (`search`, `read`) |
| `slack` | Slack | `COMMUNICATION`| OAuth 2.0 / Bot Token| Channels (`list`), Messages (`post`, `history`), User profile |
| `generic_rest` | Generic REST Connector | `CUSTOM` | Bearer / API Key / Basic | Safe HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) with SSRF protection |
| `apikey_service` | Generic API Key Provider | `CUSTOM` | API Key Header | Arbitrary key-authenticated service execution |
| `cli_tools` | Local CLI Tool Bridge | `DEVELOPMENT` | Local Auth Session | CLI execution bridge (`gh`, `gcloud`, `aws`, `az`) |
| `mcp_server` | Model Context Protocol | `CUSTOM` | API Key / Headers | Dynamic MCP tool invocation and resource inspection |

---

### 5. Persistence Schema (Migration 026)

Migration 026 establishes 8 relational tables:
1. `service_providers`: Provider registry and capability metadata.
2. `service_accounts`: Connected accounts with owner identities, scopes, and `credential_ref`.
3. `oauth_authorizations`: PKCE verifiers, challenges, states, and TTL expiration.
4. `account_health`: Latency, health state (`HEALTHY`, `DEGRADED`, `UNHEALTHY`), and failure metrics.
5. `account_usage`: Requests made, token usage, rate limits, and quota records.
6. `account_webhooks`: Webhook endpoints, subscribed events, secret refs, and replay logs.
7. `account_audit`: Immutable audit trail for all capability invocations and credential operations.
8. `account_credentials_metadata`: Cryptographic metadata (algorithm, key ID, expiration, rotation).

---

### 6. Control Center UI & Real-Time Telemetry

The Control Center provides an **Accounts & Services** view (`AccountsView.tsx`):
- **Connected Accounts Tab**: Account card grid with live health badges (`HEALTHY`, `DEGRADED`, `EXPIRED`, `UNHEALTHY`), latency ms, scope badges, quota usage bars, and quick actions (Verify, Refresh, Disconnect).
- **Available Providers Tab**: Catalog of discoverable providers with connect triggers, documentation links, and categorized tags.
- **Webhooks & Inbound Tab**: Configured external webhooks, delivery events, and security statuses.
- **Audit & Security Log Tab**: Chronological audit trail showing actor, operation, provider, timestamp, status, and execution latency.
- **Live SSE Event Stream**: Real-time reactive updates from `/api/accounts/events` reflecting account connection, revocation, health changes, and rate limits without manual polling.

---

### 7. CLI Interface (`hres`)

```bash
# List all discovered providers
hres provider list

# Inspect provider capabilities and scopes
hres provider inspect google

# List connected accounts
hres account list --provider google

# Connect new account via OAuth PKCE
hres account connect google --project proj_alpha

# Check account health and latency
hres account health acc_123456

# Verify account connection against upstream API
hres account verify acc_123456

# Disconnect/revoke account
hres account disconnect acc_123456
```

---

### 8. Verification & Test Suite

The comprehensive test suite in `tests/fp-12-account-fabric.test.ts` validates 70 test cases across 10 functional suites:
1. Provider Registration & Discovery (Tests 1–8)
2. Credential Vault & Encryption AES-256-GCM (Tests 9–16)
3. OAuth 2.0 PKCE & State Lifecycle (Tests 17–25)
4. Multi-Account Routing & Scope/Project Isolation (Tests 26–34)
5. Health Monitoring & Quota Intelligence (Tests 35–43)
6. Webhooks & HMAC Verification (Tests 44–51)
7. SSRF Defense & Generic REST Connector (Tests 52–57)
8. Natural Language Service & Account Intent Resolver (Tests 58–64)
9. Audit Trail, Deletion & SQLite Persistence Integrity (Tests 65–70)

All 70 tests pass with zero failures and zero skipped tests.
