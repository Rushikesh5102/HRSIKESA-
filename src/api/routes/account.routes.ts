/**
 * HṚṢĪKEŚA (हृषीकेश) — Account & Service Integration REST & SSE Routes
 *
 * FP-12: HTTP handlers for provider discovery, account lifecycle, OAuth flows,
 * verification, health checks, rate limits, webhooks, and live SSE event stream.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { AccountFabric } from '../../accounts/account.fabric.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

export class AccountRoutes {
  private readonly accountFabric: AccountFabric;
  private readonly logger?: ILogger;
  private readonly sseClients: Set<ServerResponse> = new Set();

  constructor(accountFabric: AccountFabric, logger?: ILogger, eventBus?: EventBus) {
    this.accountFabric = accountFabric;
    this.logger = logger;
    if (eventBus) {
      this.bindEvents(eventBus);
    }
  }

  private bindEvents(eventBus: EventBus): void {
    const eventTypes = [
      'account.connected',
      'account.disconnected',
      'account.expired',
      'account.reauth_required',
      'account.revoked',
      'account.health_changed',
      'account.quota_changed',
      'account.rate_limited',
      'account.capability_changed',
      'account.provider_degraded',
    ];

    for (const evtType of eventTypes) {
      eventBus.subscribe(evtType as any, (event: any) => {
        this.broadcastSse({
          event: evtType,
          data: event?.payload || event,
          timestamp: event?.timestamp || Date.now(),
        });
      });
    }
  }

  private broadcastSse(data: unknown): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    return this.handleRequest(req, res);
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Support both /api/accounts and /accounts prefixes
    if (pathname.startsWith('/accounts') || pathname.startsWith('/providers')) {
      pathname = '/api' + pathname;
    }

    if (!pathname.startsWith('/api/accounts') && !pathname.startsWith('/api/providers')) {
      return false;
    }

    try {
      // 1. SSE Stream: GET /api/accounts/events/stream or /api/accounts/events
      if (method === 'GET' && (pathname === '/api/accounts/events/stream' || pathname === '/api/accounts/events')) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        res.write('retry: 5000\n\n');
        this.sseClients.add(res);

        req.on('close', () => {
          this.sseClients.delete(res);
        });
        return true;
      }

      // 2. GET /api/providers
      if (method === 'GET' && pathname === '/api/providers') {
        const providers = this.accountFabric.listProviders();
        this.sendJson(res, 200, { success: true, count: providers.length, providers });
        return true;
      }

      // 3. GET /api/providers/:id/capabilities
      const providerCapsMatch = pathname.match(/^\/api\/providers\/([a-zA-Z0-9_-]+)\/capabilities$/);
      if (method === 'GET' && providerCapsMatch) {
        const providerId = providerCapsMatch[1];
        const provider = this.accountFabric.getProvider(providerId);
        if (!provider) {
          this.sendJson(res, 404, { success: false, error: `Provider "${providerId}" not found` });
        } else {
          this.sendJson(res, 200, { success: true, capabilities: provider.capabilities });
        }
        return true;
      }

      // 4. GET /api/providers/:id
      const providerMatch = pathname.match(/^\/api\/providers\/([a-zA-Z0-9_-]+)$/);
      if (method === 'GET' && providerMatch) {
        const providerId = providerMatch[1];
        const provider = this.accountFabric.getProvider(providerId);
        if (!provider) {
          this.sendJson(res, 404, { success: false, error: `Provider "${providerId}" not found` });
        } else {
          this.sendJson(res, 200, { success: true, provider });
        }
        return true;
      }

      // 5. POST /api/accounts/connect - Initiate OAuth
      if (method === 'POST' && pathname === '/api/accounts/connect') {
        const body = await this.parseJsonBody(req);
        if (!body.providerId) {
          this.sendJson(res, 400, { success: false, error: 'Missing required field: providerId' });
          return true;
        }
        const authReq = await this.accountFabric.oauthManager.initiateAuthorization({
          providerId: body.providerId,
          ownerIdentity: body.ownerIdentity || 'rushi',
          scopeType: body.scopeType || 'PERSONAL',
          companyId: body.companyId,
          projectId: body.projectId,
          requestedScopes: body.requestedScopes,
          redirectUri: body.redirectUri,
        });
        this.sendJson(res, 201, { success: true, authorizationRequest: authReq });
        return true;
      }

      // 6. POST /api/accounts/callback - Complete OAuth
      if (method === 'POST' && pathname === '/api/accounts/callback') {
        const body = await this.parseJsonBody(req);
        if (!body.state) {
          this.sendJson(res, 400, { success: false, error: 'Missing state parameter' });
          return true;
        }
        const result = await this.accountFabric.oauthManager.handleCallback(body.state, body.code, body.error);
        this.sendJson(res, 200, { success: true, account: result.account });
        return true;
      }

      // 7. POST /api/accounts/intent - NL intent
      if (method === 'POST' && pathname === '/api/accounts/intent') {
        const body = await this.parseJsonBody(req);
        if (!body.prompt) {
          this.sendJson(res, 400, { success: false, error: 'Missing prompt' });
          return true;
        }
        const result = await this.accountFabric.resolveIntent(body.prompt, body.ownerIdentity || 'rushi');
        this.sendJson(res, 200, { success: true, result });
        return true;
      }

      // 8. POST /api/accounts/webhooks/:provider - Webhook receiver
      const webhookMatch = pathname.match(/^\/api\/accounts\/webhooks\/([a-zA-Z0-9_-]+)$/);
      if (method === 'POST' && webhookMatch) {
        const providerId = webhookMatch[1];
        const rawBody = await this.readRawBody(req);
        const result = await this.accountFabric.processWebhook({
          providerId,
          accountId: url.searchParams.get('accountId') || undefined,
          headers: req.headers as any,
          rawBody: rawBody.toString('utf-8'),
        });
        this.sendJson(res, result.accepted ? 200 : 400, result);
        return true;
      }

      // 9. POST /api/accounts/:id/verify - Verify account
      const verifyMatch = pathname.match(/^\/api\/accounts\/([a-zA-Z0-9_-]+)\/verify$/);
      if (method === 'POST' && verifyMatch) {
        const accountId = verifyMatch[1];
        const health = await this.accountFabric.verifyAccount(accountId);
        this.sendJson(res, 200, { success: true, health });
        return true;
      }

      // 10. POST /api/accounts/:id/refresh - Refresh token
      const refreshMatch = pathname.match(/^\/api\/accounts\/([a-zA-Z0-9_-]+)\/refresh$/);
      if (method === 'POST' && refreshMatch) {
        const accountId = refreshMatch[1];
        const account = this.accountFabric.getAccount(accountId);
        if (!account) {
          this.sendJson(res, 404, { success: false, error: `Account "${accountId}" not found` });
          return true;
        }
        await this.accountFabric.oauthManager.refreshTokenIfNeeded(account);
        this.sendJson(res, 200, { success: true, message: 'Token refreshed successfully' });
        return true;
      }

      // 11. POST /api/accounts/:id/revoke - Revoke account
      const revokeMatch = pathname.match(/^\/api\/accounts\/([a-zA-Z0-9_-]+)\/revoke$/);
      if (method === 'POST' && revokeMatch) {
        const accountId = revokeMatch[1];
        await this.accountFabric.revokeAccount(accountId);
        this.sendJson(res, 200, { success: true, message: `Account "${accountId}" revoked successfully` });
        return true;
      }

      // 12. GET /api/accounts/:id/health
      const healthMatch = pathname.match(/^\/api\/accounts\/([a-zA-Z0-9_-]+)\/health$/);
      if (method === 'GET' && healthMatch) {
        const accountId = healthMatch[1];
        const health = this.accountFabric.getAccountHealth(accountId);
        if (!health) {
          this.sendJson(res, 404, { success: false, error: `Health not found for account "${accountId}"` });
        } else {
          this.sendJson(res, 200, { success: true, health });
        }
        return true;
      }

      // 13. GET /api/accounts/:id/usage
      const usageMatch = pathname.match(/^\/api\/accounts\/([a-zA-Z0-9_-]+)\/usage$/);
      if (method === 'GET' && usageMatch) {
        const accountId = usageMatch[1];
        const usage = this.accountFabric.getAccountUsage(accountId) || {
          accountId,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          quotas: [{ quotaType: 'UNKNOWN', limit: null, used: 0, remaining: null, resetsAt: null }],
        };
        this.sendJson(res, 200, { success: true, usage });
        return true;
      }

      // 14. GET /api/accounts/:id
      const accountGetMatch = pathname.match(/^\/api\/accounts\/([a-zA-Z0-9_-]+)$/);
      if (method === 'GET' && accountGetMatch) {
        const accountId = accountGetMatch[1];
        const account = this.accountFabric.getAccount(accountId);
        if (!account) {
          this.sendJson(res, 404, { success: false, error: `Account "${accountId}" not found` });
        } else {
          this.sendJson(res, 200, { success: true, account });
        }
        return true;
      }

      // 15. DELETE /api/accounts/:id
      const accountDeleteMatch = pathname.match(/^\/api\/accounts\/([a-zA-Z0-9_-]+)$/);
      if (method === 'DELETE' && accountDeleteMatch) {
        const accountId = accountDeleteMatch[1];
        await this.accountFabric.revokeAccount(accountId);
        this.accountFabric.deleteAccount(accountId);
        this.sendJson(res, 200, { success: true, message: `Account "${accountId}" deleted successfully` });
        return true;
      }

      // 16. GET /api/accounts - List accounts
      if (method === 'GET' && pathname === '/api/accounts') {
        const filter = {
          providerId: url.searchParams.get('providerId') || undefined,
          ownerIdentity: url.searchParams.get('ownerIdentity') || undefined,
          companyId: url.searchParams.get('companyId') || undefined,
          projectId: url.searchParams.get('projectId') || undefined,
          status: url.searchParams.get('status') || undefined,
        };
        const accounts = this.accountFabric.listAccounts(filter);
        this.sendJson(res, 200, { success: true, count: accounts.length, accounts });
        return true;
      }

      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error(`AccountRoutes: Error handling request: ${msg}`);
      this.sendJson(res, 500, { success: false, error: msg });
      return true;
    }
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    res.end(JSON.stringify(data));
  }

  private async parseJsonBody(req: IncomingMessage): Promise<Record<string, any>> {
    const raw = await this.readRawBody(req);
    const str = raw.toString('utf-8');
    if (!str || str.trim().length === 0) return {};
    return JSON.parse(str);
  }

  private readRawBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', err => reject(err));
    });
  }
}
