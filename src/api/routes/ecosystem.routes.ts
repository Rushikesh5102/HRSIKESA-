/**
 * HṚṢĪKEŚA (हृषीकेश) — Ecosystem REST & SSE Routes
 *
 * FP-15: HTTP endpoints for service catalog, applications, capability discovery,
 * interface resolution, health monitoring, operations, and live SSE event stream.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { UniversalEcosystemFabric } from '../../ecosystem/ecosystem.fabric.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

export class EcosystemRoutes {
  private readonly sseClients: Set<ServerResponse> = new Set();

  constructor(
    private readonly ecosystemFabric: UniversalEcosystemFabric,
    private readonly logger?: ILogger,
    eventBus?: EventBus
  ) {
    if (eventBus) {
      this.bindEvents(eventBus);
    }
  }

  private bindEvents(eventBus: EventBus): void {
    const eventTypes = [
      'service.discovered',
      'service.updated',
      'service.health.changed',
      'capability.discovered',
      'capability.enabled',
      'capability.disabled',
      'account.selected',
      'interface.selected',
      'operation.started',
      'operation.completed',
      'operation.failed',
      'verification.completed',
      'approval.required',
    ];

    for (const evt of eventTypes) {
      eventBus.subscribe(evt as any, (event: any) => {
        this.broadcastSse({
          event: evt,
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

    if (pathname.startsWith('/ecosystem')) {
      pathname = '/api' + pathname;
    }

    if (!pathname.startsWith('/api/ecosystem')) {
      return false;
    }

    try {
      // 1. SSE Stream: GET /api/ecosystem/events/stream
      if (method === 'GET' && (pathname === '/api/ecosystem/events/stream' || pathname === '/api/ecosystem/events')) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write('retry: 5000\n\n');
        this.sseClients.add(res);

        req.on('close', () => {
          this.sseClients.delete(res);
        });
        return true;
      }

      // 2. GET /api/ecosystem/health
      if (method === 'GET' && pathname === '/api/ecosystem/health') {
        const health = this.ecosystemFabric.getHealth();
        this.sendJson(res, 200, { success: true, health });
        return true;
      }

      // 3. GET /api/ecosystem/services
      if (method === 'GET' && pathname === '/api/ecosystem/services') {
        const category = url.searchParams.get('category') || undefined;
        const providerId = url.searchParams.get('providerId') || undefined;
        const services = this.ecosystemFabric.listServices({ category, providerId });
        this.sendJson(res, 200, { success: true, count: services.length, services });
        return true;
      }

      // 4. GET /api/ecosystem/services/:id
      const svcMatch = pathname.match(/^\/api\/ecosystem\/services\/([a-zA-Z0-9_-]+)$/);
      if (method === 'GET' && svcMatch) {
        const serviceId = svcMatch[1];
        const service = this.ecosystemFabric.getService(serviceId);
        if (!service) {
          this.sendJson(res, 404, { success: false, error: `Service "${serviceId}" not found` });
        } else {
          this.sendJson(res, 200, { success: true, service });
        }
        return true;
      }

      // 5. GET /api/ecosystem/applications
      if (method === 'GET' && pathname === '/api/ecosystem/applications') {
        const apps = this.ecosystemFabric.listApplications();
        this.sendJson(res, 200, { success: true, count: apps.length, applications: apps });
        return true;
      }

      // 6. GET /api/ecosystem/capabilities/search
      if (method === 'GET' && pathname === '/api/ecosystem/capabilities/search') {
        const q = (url.searchParams.get('q') || '').toLowerCase().trim();
        const services = this.ecosystemFabric.listServices();
        const matches = services.flatMap(s =>
          s.capabilities
            .filter(c => c.toLowerCase().includes(q))
            .map(cap => ({
              capabilityId: cap,
              serviceId: s.serviceId,
              serviceName: s.name,
              providerId: s.providerId,
              availability: s.availability,
            }))
        );
        this.sendJson(res, 200, { success: true, query: q, count: matches.length, matches });
        return true;
      }

      // 7. GET /api/ecosystem/capabilities
      if (method === 'GET' && pathname === '/api/ecosystem/capabilities') {
        const services = this.ecosystemFabric.listServices();
        const capabilities = Array.from(new Set(services.flatMap(s => s.capabilities)));
        this.sendJson(res, 200, { success: true, count: capabilities.length, capabilities });
        return true;
      }

      // 8. GET /api/ecosystem/interfaces
      if (method === 'GET' && pathname === '/api/ecosystem/interfaces') {
        const services = this.ecosystemFabric.listServices();
        const interfaces = services.flatMap(s =>
          (s.interfaces || []).map(i => ({
            serviceId: s.serviceId,
            serviceName: s.name,
            interfaceType: i.interfaceType,
            priority: i.priority,
            reliabilityScore: i.reliabilityScore,
            isAvailable: i.isAvailable,
          }))
        );
        this.sendJson(res, 200, { success: true, count: interfaces.length, interfaces });
        return true;
      }

      // 9. GET /api/ecosystem/provenance
      if (method === 'GET' && pathname === '/api/ecosystem/provenance') {
        const services = this.ecosystemFabric.listServices();
        const provenanceLedger = services.map(s => ({
          serviceId: s.serviceId,
          name: s.name,
          provenance: s.provenance,
          license: s.license,
          version: s.version,
        }));
        this.sendJson(res, 200, { success: true, count: provenanceLedger.length, provenance: provenanceLedger });
        return true;
      }

      // 10. POST /api/ecosystem/discover or POST /api/ecosystem/refresh
      if (method === 'POST' && (pathname === '/api/ecosystem/discover' || pathname === '/api/ecosystem/refresh')) {
        const result = await this.ecosystemFabric.discoverAll();
        this.sendJson(res, 200, {
          success: true,
          discoveredServices: result.services.length,
          discoveredApplications: result.applications.length,
        });
        return true;
      }

      // 11. POST /api/ecosystem/query - Natural language capability lookup
      if (method === 'POST' && pathname === '/api/ecosystem/query') {
        const body = await this.parseJsonBody(req);
        if (!body.query) {
          this.sendJson(res, 400, { success: false, error: 'Missing required field: query' });
          return true;
        }
        const queryResult = this.ecosystemFabric.queryCapability(String(body.query));
        this.sendJson(res, 200, { success: true, result: queryResult });
        return true;
      }

      // 12. POST /api/ecosystem/resolve - Resolve execution plan
      if (method === 'POST' && pathname === '/api/ecosystem/resolve') {
        const body = await this.parseJsonBody(req);
        if (!body.capabilityId) {
          this.sendJson(res, 400, { success: false, error: 'Missing required field: capabilityId' });
          return true;
        }
        const plan = this.ecosystemFabric.resolvePlan({
          capabilityId: String(body.capabilityId),
          serviceId: body.serviceId ? String(body.serviceId) : undefined,
          providerId: body.providerId ? String(body.providerId) : undefined,
          companyId: body.companyId ? String(body.companyId) : undefined,
          projectId: body.projectId ? String(body.projectId) : undefined,
          ownerIdentity: body.ownerIdentity ? String(body.ownerIdentity) : undefined,
          preferredInterface: body.preferredInterface,
          networkAvailable: body.networkAvailable,
          allowDegradedFallback: body.allowDegradedFallback,
        });
        this.sendJson(res, 200, { success: true, plan });
        return true;
      }

      // 13. POST /api/ecosystem/execute - Execute operation
      if (method === 'POST' && pathname === '/api/ecosystem/execute') {
        const body = await this.parseJsonBody(req);
        if (!body.capabilityId) {
          this.sendJson(res, 400, { success: false, error: 'Missing required field: capabilityId' });
          return true;
        }
        const plan = this.ecosystemFabric.resolvePlan({
          capabilityId: String(body.capabilityId),
          serviceId: body.serviceId ? String(body.serviceId) : undefined,
          providerId: body.providerId ? String(body.providerId) : undefined,
          companyId: body.companyId ? String(body.companyId) : undefined,
          projectId: body.projectId ? String(body.projectId) : undefined,
          ownerIdentity: body.ownerIdentity ? String(body.ownerIdentity) : undefined,
          preferredInterface: body.preferredInterface,
          networkAvailable: body.networkAvailable,
          allowDegradedFallback: body.allowDegradedFallback,
        });
        const envelope = await this.ecosystemFabric.executeOperation(
          plan,
          body.params || {},
          {
            companyId: body.companyId,
            projectId: body.projectId,
            ownerIdentity: body.ownerIdentity,
            approved: body.approved === true,
          }
        );
        this.sendJson(res, envelope.status === 'FAILED' ? 500 : 200, { success: envelope.status !== 'FAILED', envelope });
        return true;
      }

      // 14. GET /api/ecosystem/operations
      if (method === 'GET' && pathname === '/api/ecosystem/operations') {
        const limit = Number(url.searchParams.get('limit') || '50');
        const operations = this.ecosystemFabric.getRecentOperations(limit);
        this.sendJson(res, 200, { success: true, count: operations.length, operations });
        return true;
      }

      // 15. GET /api/ecosystem/operations/:id
      const opMatch = pathname.match(/^\/api\/ecosystem\/operations\/([a-zA-Z0-9_-]+)$/);
      if (method === 'GET' && opMatch) {
        const opId = opMatch[1];
        const operation = this.ecosystemFabric.getOperation(opId);
        if (!operation) {
          this.sendJson(res, 404, { success: false, error: `Operation "${opId}" not found` });
        } else {
          this.sendJson(res, 200, { success: true, operation });
        }
        return true;
      }

      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error(`EcosystemRoutes: Handler error: ${msg}`);
      this.sendJson(res, 500, { success: false, error: msg });
      return true;
    }
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(data));
  }

  private async parseJsonBody(req: IncomingMessage): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Invalid JSON in request body'));
        }
      });
      req.on('error', reject);
    });
  }
}
