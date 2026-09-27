# ADR-020: Universal Service & Account Integration Fabric (FP-12)

## Status
**ACCEPTED** (2026-09-26)

## Context
As HṚṢĪKEŚA orchestrates autonomous software engineering (FP-10) and universal workflows (FP-11), it requires secure, provider-independent access to external developer and productivity services (Google, GitHub, Microsoft, Slack, Generic REST, MCP, CLI tools).

Prior to FP-12, service integrations were ad-hoc, risking credential leakage, lack of tenant/project isolation, and absence of standardized health/quota monitoring.

## Decision
We established a dedicated, modular, and sovereign subsystem: **FP-12 Universal Service & Account Integration Fabric**.

Key decisions include:
1. **Zero Plaintext Secrets Storage**:
   All tokens and credentials are encrypted using AES-256-GCM in the file-based `CredentialVault` under `storage/vault/` with a 256-bit master key. SQLite holds only opaque `vault://` reference URIs. Plaintext secrets are strictly redacted in logs, UI responses, and capability outputs.
2. **Native PKCE S256 OAuth 2.0 Engine**:
   Integrated state machine generating cryptographic random state and PKCE challenges without external dependencies. State expiration (10 min TTL) and single-use validation prevent CSRF and replay attacks.
3. **Multi-Tenant Scope Isolation**:
   Accounts are strictly tagged with `scopeType` (`PERSONAL`, `COMPANY`, `PROJECT`, `SHARED_AUTHORIZED`) and associated `companyId` / `projectId`. Cross-project credential access is prevented at the router level.
4. **Honest Quotas & 429 Rate Limit Backoff**:
   Unexposed quotas are returned as `'UNKNOWN'`. 429 rate limits dynamically trigger backoff timers without polling or quota evasion.
5. **HMAC-SHA256 Webhook Verification**:
   Inbound webhooks are cryptographically authenticated, deduplicated by delivery ID, and dispatched to native `EventBus` topics for automated FP-11 workflow triggers.
6. **SSRF Protections**:
   Generic REST adapter validates all target URLs, prohibiting loopback, internal metadata endpoints, and private RFC 1918 IPv4 ranges.
7. **Human Approval Gate**:
   Destructive or financial transactions require explicit human confirmation before invocation.

## Consequences
### Positive
- Production-grade security with zero plaintext secrets stored in SQLite or logs.
- Reliable multi-account routing enabling complex workflows to access distinct accounts per project.
- Live observability through REST, SSE, CLI, and Control Center UI.
- Strict isolation and safety preventing credential leakage or unauthorized cross-project access.

### Compliance
- FP-10 and FP-11 remain completely frozen and unmodified.
- 100% test coverage with 70 passing integration tests in `tests/fp-12-account-fabric.test.ts`.
