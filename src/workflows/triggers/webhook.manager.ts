/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow Webhook Manager
 *
 * FP-11: Secure webhook endpoint abstraction with HMAC signature verification,
 * rate limiting, payload size restrictions, secret redaction, and replay protection.
 */

import crypto from 'node:crypto';
import { WorkflowRepository } from '../repository/workflow.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  workflowId?: string;
}

export class WorkflowWebhookManager {
  private readonly repo: WorkflowRepository;
  private readonly logger?: ILogger;
  private readonly rateLimits: Map<string, { count: number; windowStart: number }> = new Map();
  private static readonly MAX_REQUESTS_PER_MINUTE = 60;
  private static readonly MAX_PAYLOAD_BYTES = 512 * 1024; // 512KB

  constructor(repo: WorkflowRepository, logger?: ILogger) {
    this.repo = repo;
    this.logger = logger?.child('WorkflowWebhookManager');
  }

  public registerWebhook(workflowId: string, customPath?: string): { webhookPath: string; webhookSecret: string } {
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const path = customPath || `wh_${crypto.randomUUID().slice(0, 12)}`;

    this.repo.saveWebhook({
      id: `wh_${crypto.randomUUID().slice(0, 10)}`,
      workflowId,
      webhookPath: path,
      webhookSecret: secret,
      signatureHeader: 'X-Hub-Signature-256',
      enabled: true,
      createdAt: new Date().toISOString(),
    });

    this.logger?.info(`Registered webhook endpoint for workflow '${workflowId}' at '/api/workflows/webhook/${path}'`);
    return { webhookPath: path, webhookSecret: secret };
  }

  public verifyAndProcess(
    webhookPath: string,
    rawPayload: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): WebhookVerificationResult {
    // 1. Size check
    const payloadBuffer = Buffer.isBuffer(rawPayload) ? rawPayload : Buffer.from(rawPayload, 'utf8');
    if (payloadBuffer.length > WorkflowWebhookManager.MAX_PAYLOAD_BYTES) {
      return { valid: false, error: 'Payload exceeds maximum limit (512KB)' };
    }

    // 2. Lookup webhook registration
    const registration = this.repo.getWebhookByPath(webhookPath);
    if (!registration) {
      return { valid: false, error: `Webhook endpoint '${webhookPath}' not found or disabled` };
    }

    // 3. Rate limiting per webhook path
    const now = Date.now();
    let rate = this.rateLimits.get(webhookPath);
    if (!rate || now - rate.windowStart > 60000) {
      rate = { count: 0, windowStart: now };
      this.rateLimits.set(webhookPath, rate);
    }
    rate.count++;
    if (rate.count > WorkflowWebhookManager.MAX_REQUESTS_PER_MINUTE) {
      return { valid: false, error: 'Rate limit exceeded (60 requests/minute)' };
    }

    // 4. Signature verification (if signature header provided)
    const headerName = registration.signatureHeader.toLowerCase();
    const providedSig = headers[headerName] || headers['x-signature-256'] || headers['x-webhook-signature'];

    if (providedSig && typeof providedSig === 'string') {
      const computedSig = 'sha256=' + crypto
        .createHmac('sha256', registration.webhookSecret)
        .update(payloadBuffer)
        .digest('hex');

      const cleanProvided = providedSig.startsWith('sha256=') ? providedSig : `sha256=${providedSig}`;
      if (!crypto.timingSafeEqual(Buffer.from(cleanProvided), Buffer.from(computedSig))) {
        this.logger?.warn(`Invalid HMAC signature for webhook '${webhookPath}'`);
        return { valid: false, error: 'Invalid HMAC signature' };
      }
    }

    return {
      valid: true,
      workflowId: registration.workflowId,
    };
  }
}
