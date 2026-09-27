/**
 * HṚṢĪKEŚA (हृषीकेश) — Digital Workspace & Operator REST & SSE Routes
 *
 * FP-13: HTTP handlers for workspace lifecycle, application control, multi-layer
 * observation, target resolution, structured action execution, verification, and SSE stream.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { ApplicationOperator } from '../../operator/application.operator.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { OperatorEventTopics } from '../../operator/types/operator.events.js';

export class OperatorRoutes {
  private readonly operator: ApplicationOperator;
  private readonly logger?: ILogger;
  private readonly sseClients: Set<ServerResponse> = new Set();

  constructor(operator: ApplicationOperator, logger?: ILogger, eventBus?: EventBus) {
    this.operator = operator;
    this.logger = logger?.child('OperatorRoutes');
    if (eventBus) {
      this.bindEvents(eventBus);
    }
  }

  private bindEvents(eventBus: EventBus): void {
    const topics = Object.values(OperatorEventTopics);
    for (const topic of topics) {
      eventBus.subscribe(topic as any, (event: any) => {
        this.broadcastSse({
          event: topic,
          data: event?.payload || event,
          timestamp: event?.timestamp || new Date().toISOString(),
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
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method?.toUpperCase() || 'GET';

    try {
      // 1. SSE Stream
      if (pathname === '/api/operator/events/stream' && method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write(': connected\n\n');
        this.sseClients.add(res);
        req.on('close', () => this.sseClients.delete(res));
        return true;
      }

      // 2. GET /api/workspaces
      if (pathname === '/api/workspaces' && method === 'GET') {
        const workspaces = this.operator.listWorkspaces();
        this.sendJson(res, 200, { success: true, count: workspaces.length, workspaces });
        return true;
      }

      // 3. POST /api/workspaces/connect
      if (pathname === '/api/workspaces/connect' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const workspaceId = body.workspaceId || 'local_windows_main';
        const agentId = body.agentId || 'agent_default';
        const success = await this.operator.connectWorkspace(workspaceId, agentId);
        this.sendJson(res, success ? 200 : 400, { success, workspaceId, agentId });
        return true;
      }

      // 4. Workspace Parameter Routes: /api/workspaces/:id/*
      const wsMatch = pathname.match(/^\/api\/workspaces\/([a-zA-Z0-9_-]+)(?:\/(.*))?$/);
      if (wsMatch) {
        const workspaceId = wsMatch[1];
        const subPath = wsMatch[2] || '';

        if (!subPath && method === 'GET') {
          const ws = this.operator.getWorkspace(workspaceId);
          this.sendJson(res, 200, { success: true, workspace: ws.descriptor });
          return true;
        }

        if (subPath === 'disconnect' && method === 'POST') {
          const success = await this.operator.disconnectWorkspace(workspaceId);
          this.sendJson(res, 200, { success, workspaceId });
          return true;
        }

        if (subPath === 'observe' && method === 'POST') {
          const obs = await this.operator.observe(workspaceId);
          this.sendJson(res, 200, { success: true, observation: obs });
          return true;
        }

        if (subPath === 'applications' && method === 'GET') {
          const apps = await this.operator.discoverApplications(workspaceId);
          this.sendJson(res, 200, { success: true, count: apps.length, applications: apps });
          return true;
        }
      }

      // 5. Application Routes: /api/applications or /api/applications/:id/*
      if (pathname === '/api/applications' && method === 'GET') {
        const defaultWs = this.operator.listWorkspaces()[0]?.workspaceId || 'local_windows_main';
        const apps = await this.operator.discoverApplications(defaultWs);
        this.sendJson(res, 200, { success: true, count: apps.length, applications: apps });
        return true;
      }

      const appMatch = pathname.match(/^\/api\/applications\/([a-zA-Z0-9_-]+)(?:\/(.*))?$/);
      if (appMatch) {
        const appId = appMatch[1];
        const subPath = appMatch[2] || '';
        const defaultWs = 'local_windows_main';

        if (subPath === 'launch' && method === 'POST') {
          const body = await this.readJsonBody(req);
          const session = await this.operator.launchApplication(body.workspaceId || defaultWs, appId, body.options);
          this.sendJson(res, 200, { success: true, session });
          return true;
        }

        if (subPath === 'focus' && method === 'POST') {
          const body = await this.readJsonBody(req);
          const success = await this.operator.focusApplication(body.workspaceId || defaultWs, appId);
          this.sendJson(res, 200, { success, applicationId: appId });
          return true;
        }

        if (subPath === 'close' && method === 'POST') {
          const body = await this.readJsonBody(req);
          const success = await this.operator.closeApplication(body.workspaceId || defaultWs, appId);
          this.sendJson(res, 200, { success, applicationId: appId });
          return true;
        }

        if (subPath === 'observe' && method === 'POST') {
          const obs = await this.operator.observe(defaultWs);
          this.sendJson(res, 200, { success: true, observation: obs });
          return true;
        }
      }

      // 6. Operator Action & Resolution Routes
      if (pathname === '/api/operator/resolve-target' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const result = await this.operator.resolveTarget(body.workspaceId || 'local_windows_main', body.request);
        this.sendJson(res, 200, { success: true, result });
        return true;
      }

      if (pathname === '/api/operator/action' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const actionResult = await this.operator.performAction(body);
        this.sendJson(res, 200, { success: actionResult.status === 'COMPLETED', result: actionResult });
        return true;
      }

      if (pathname === '/api/operator/verify' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const ws = this.operator.getWorkspace(body.workspaceId || 'local_windows_main');
        const verification = await this.operator.verifier.verify(body.action, body.result, ws, body.strategy);
        this.sendJson(res, 200, { success: verification.isVerified, verification });
        return true;
      }

      return false;
    } catch (err: any) {
      this.logger?.error(`Error processing operator API request ${method} ${pathname}: ${err.message}`);
      this.sendJson(res, 500, { success: false, error: err.message });
      return true;
    }
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private readJsonBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  }
}
