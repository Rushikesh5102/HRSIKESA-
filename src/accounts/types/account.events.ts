/**
 * HṚṢĪKEŚA (हृषीकेश) — Account & Service Fabric Typed Events
 *
 * FP-12: Standardized events emitted across EventBus for accounts, providers,
 * webhooks, quotas, and health transitions.
 */

export type AccountEventTopic =
  | 'account.connected'
  | 'account.disconnected'
  | 'account.expired'
  | 'account.reauth_required'
  | 'account.revoked'
  | 'account.health_changed'
  | 'account.quota_changed'
  | 'account.rate_limited'
  | 'account.capability_changed'
  | 'account.provider_degraded'
  | 'account.webhook.received'
  | 'account.webhook.verified'
  | 'account.webhook.rejected';

export interface AccountEventPayload {
  readonly accountId: string;
  readonly providerId: string;
  readonly timestamp: string;
  readonly companyId?: string;
  readonly projectId?: string;
  readonly details?: Record<string, any>;
}
