/**
 * HṚṢĪKEŚA (हृषीकेश) — Account Webhook Manager
 *
 * FP-12: Secure webhook receiver, HMAC-SHA256 signature verification,
 * replay protection, event normalization, and EventBus dispatch.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { AccountWebhook } from '../types/account.types.js';
import { AccountRepository } from '../repository/account.repository.js';
import { CredentialVault } from '../vault/credential.vault.js';

export interface WebhookIncomingRequest {
  providerId: string;
  accountId?: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
  parsedBody?: unknown;
}

export interface WebhookProcessingResult {
  accepted: boolean;
  eventId?: string;
  normalizedEventType?: string;
  error?: string;
}

export class AccountWebhookManager {
  // Processed delivery IDs to prevent replay attacks
  private readonly processedDeliveryIds = new Set<string>();
  private readonly maxDeliveryHistory = 5000;

  constructor(
    private readonly repository: AccountRepository,
    private readonly vault: CredentialVault,
    private readonly eventBus: EventBus | undefined,
    private readonly logger: ILogger
  ) {}

  /**
   * Process an incoming webhook request with cryptographic verification
   */
  public async processWebhook(req: WebhookIncomingRequest): Promise<WebhookProcessingResult> {
    const { providerId, headers, rawBody } = req;

    // 1. Check payload size (max 5MB)
    if (rawBody.length > 5 * 1024 * 1024) {
      return { accepted: false, error: 'Payload size exceeded 5MB limit' };
    }

    // 2. Provider-specific signature & replay validation
    let isValid = false;
    let deliveryId = '';
    let eventType = 'unknown';

    const getHeader = (name: string): string => {
      const lower = name.toLowerCase();
      for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === lower) return Array.isArray(v) ? v[0] : (v || '');
      }
      return '';
    };

    try {
      if (providerId === 'github') {
        const sigHeader = getHeader('x-hub-signature-256');
        deliveryId = getHeader('x-github-delivery') || `gh_${Date.now()}`;
        eventType = getHeader('x-github-event') || 'generic';

        // Replay defense
        if (this.processedDeliveryIds.has(deliveryId)) {
          return { accepted: false, error: 'Duplicate webhook delivery ID (replay rejected)' };
        }

        // Verify HMAC if secret configured
        const webhookConfig = this.getWebhookConfig(providerId, req.accountId);
        if (webhookConfig?.secretRef) {
          const secretPayload = await this.vault.resolve(webhookConfig.secretRef);
          const secret = secretPayload?.secret || webhookConfig.secretRef;
          isValid = this.verifyHmacSha256(rawBody, secret, sigHeader.replace('sha256=', ''));
        } else {
          isValid = true;
        }
      } else if (providerId === 'slack') {
        const slackSig = getHeader('x-slack-signature');
        const slackTimestamp = parseInt(getHeader('x-slack-request-timestamp') || '0', 10);
        deliveryId = `slack_${slackTimestamp}_${rawBody.slice(0, 32)}`;

        // Verify timestamp within 5 minutes
        const nowSec = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSec - slackTimestamp) > 300) {
          return { accepted: false, error: 'Slack webhook timestamp out of valid window (replay rejected)' };
        }

        const webhookConfig = this.getWebhookConfig(providerId, req.accountId);
        if (webhookConfig?.secretRef) {
          const sigBasestring = `v0:${slackTimestamp}:${rawBody}`;
          const secretPayload = await this.vault.resolve(webhookConfig.secretRef);
          const secret = secretPayload?.secret || webhookConfig.secretRef;
          isValid = this.verifyHmacSha256(sigBasestring, secret, slackSig.replace('v0=', ''));
        } else {
          isValid = true;
        }
        eventType = 'event';
      } else {
        // Generic webhook provider
        deliveryId = getHeader('x-delivery-id') || `generic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        eventType = getHeader('x-event-type') || 'external_event';
        isValid = true;
      }

      if (!isValid) {
        this.logger.warn(`AccountWebhookManager: Invalid HMAC signature for provider "${providerId}"`);
        return { accepted: false, error: 'Invalid webhook signature' };
      }

      // Record delivery ID for replay protection
      this.rememberDeliveryId(deliveryId);

      // Parse body if not parsed
      let payloadData: unknown = req.parsedBody;
      if (!payloadData && rawBody) {
        try {
          payloadData = JSON.parse(rawBody);
        } catch {
          payloadData = { raw: rawBody };
        }
      }

      // Normalize event name e.g. "github.issues.opened"
      const normalizedType = `${providerId}.${eventType}`;

      // Dispatch to native EventBus for FP-11 trigger consumption
      if (this.eventBus) {
        const evt = {
          id: deliveryId,
          type: normalizedType,
          timestamp: Date.now(),
          source: `webhook.${providerId}`,
          payload: {
            providerId,
            accountId: req.accountId,
            data: payloadData,
            headers: CredentialVault.redactSecrets(headers),
          },
        };
        if (typeof (this.eventBus as any).emit === 'function') {
          (this.eventBus as any).emit(normalizedType, evt);
        } else if (typeof (this.eventBus as any).publish === 'function') {
          (this.eventBus as any).publish(evt);
        }
      }

      this.logger.info(`AccountWebhookManager: Successfully received & dispatched webhook "${normalizedType}" [ID: ${deliveryId}]`);

      return {
        accepted: true,
        eventId: deliveryId,
        normalizedEventType: normalizedType,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AccountWebhookManager: Error processing webhook: ${msg}`);
      return { accepted: false, error: msg };
    }
  }

  private verifyHmacSha256(body: string, secret: string, signatureHex: string): boolean {
    try {
      const hmac = createHmac('sha256', secret);
      hmac.update(body);
      const expected = hmac.digest('hex');

      const expectedBuffer = Buffer.from(expected, 'utf-8');
      const signatureBuffer = Buffer.from(signatureHex, 'utf-8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }
      return timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch {
      return false;
    }
  }

  private rememberDeliveryId(deliveryId: string): void {
    if (this.processedDeliveryIds.size >= this.maxDeliveryHistory) {
      const first = this.processedDeliveryIds.values().next().value;
      if (first) this.processedDeliveryIds.delete(first);
    }
    this.processedDeliveryIds.add(deliveryId);
  }

  private getWebhookConfig(providerId: string, accountId?: string): AccountWebhook | undefined {
    if (accountId) {
      const hooks = this.repository.listAccountWebhooks(accountId);
      const match = hooks.find((h) => h.providerId === providerId);
      if (match) return match;
      if (hooks.length > 0) return hooks[0];
    }
    return undefined;
  }
}
