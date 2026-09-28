/**
 * HṚṢĪKEŚA (हृषीकेश) — Creation REST API Routes & SSE Stream
 *
 * FP-17: Endpoints for CreationJobs, Artifacts, Iterations, Verification,
 * Capabilities, Providers, and Live SSE Events.
 *
 * REST:
 *   POST   /api/creation/jobs
 *   GET    /api/creation/jobs
 *   GET    /api/creation/jobs/:id
 *   POST   /api/creation/jobs/:id/start
 *   POST   /api/creation/jobs/:id/pause
 *   POST   /api/creation/jobs/:id/resume
 *   POST   /api/creation/jobs/:id/cancel
 *   POST   /api/creation/jobs/:id/iterate
 *   POST   /api/creation/jobs/:id/approve
 *   POST   /api/creation/jobs/:id/reject
 *   GET    /api/creation/jobs/:id/artifacts
 *   GET    /api/creation/capabilities
 *   GET    /api/creation/providers
 *   GET    /api/creation/events (SSE)
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { CreationFabric } from '../../creation/creation.fabric.js';
import { EventBus } from '../../core/events/event-bus.js';

export class CreationRoutes {
  private sseClients: Set<{ res: ServerResponse }> = new Set();

  constructor(
    private readonly fabric: CreationFabric,
    private readonly eventBus?: EventBus
  ) {
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.eventBus) return;
    const creationEvents = [
      'creation.started',
      'creation.planned',
      'creation.capability_resolved',
      'creation.queued',
      'creation.running',
      'creation.progress',
      'creation.output_created',
      'creation.verification_started',
      'creation.verification_completed',
      'creation.iteration_started',
      'creation.iteration_completed',
      'creation.awaiting_approval',
      'creation.approved',
      'creation.rejected',
      'creation.completed',
      'creation.failed',
      'creation.cancelled',
      'creation.paused',
      'creation.resumed',
    ];

    for (const evt of creationEvents) {
      this.eventBus.on(evt as any, (data: unknown) => {
        this.broadcastSse(evt, data as Record<string, unknown>);
      });
    }
  }

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    const method = req.method?.toUpperCase();

    if (pathname.startsWith('/creation/')) {
      pathname = '/api' + pathname;
    }

    if (!pathname.startsWith('/api/creation')) {
      return false;
    }

    try {
      // ─── SSE Stream ─────────────────────────────────────────────────────────
      if (method === 'GET' && pathname === '/api/creation/events') {
        this.handleSse(req, res);
        return true;
      }

      // ─── Capabilities & Providers ───────────────────────────────────────────
      if (method === 'GET' && pathname === '/api/creation/capabilities') {
        const caps = this.fabric.getCapabilities();
        return this.sendJson(res, 200, { success: true, capabilities: caps, count: caps.length });
      }

      if (method === 'GET' && pathname === '/api/creation/providers') {
        const provs = this.fabric.getProviders();
        return this.sendJson(res, 200, { success: true, providers: provs, count: provs.length });
      }

      // ─── Jobs Collection ────────────────────────────────────────────────────
      if (method === 'POST' && (pathname === '/api/creation/jobs' || pathname === '/api/creation/jobs/create')) {
        const body = (await this.readBody(req)) as Record<string, any>;
        if (!body.type || !body.objective || !body.prompt) {
          return this.sendError(res, 400, 'type, objective, and prompt are required');
        }
        const job = this.fabric.createJob(body as any);
        return this.sendJson(res, 201, { success: true, job });
      }

      if (method === 'GET' && pathname === '/api/creation/jobs') {
        const owner = url.searchParams.get('owner') || undefined;
        const type = url.searchParams.get('type') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const jobs = this.fabric.listJobs({ owner, type, status });
        return this.sendJson(res, 200, { success: true, jobs, count: jobs.length });
      }

      // ─── Individual Job Operations ──────────────────────────────────────────
      const jobMatch = pathname.match(/^\/api\/creation\/jobs\/([a-zA-Z0-9_-]+)(\/.*)?$/);
      if (jobMatch) {
        const id = jobMatch[1];
        const subpath = jobMatch[2] || '';

        if (method === 'GET' && subpath === '') {
          const job = this.fabric.getJob(id);
          return job ? this.sendJson(res, 200, { job }) : this.sendError(res, 404, 'Job not found');
        }

        if (method === 'GET' && subpath === '/artifacts') {
          const artifacts = this.fabric.getArtifacts(id);
          return this.sendJson(res, 200, { artifacts, count: artifacts.length });
        }

        if (method === 'POST' && subpath === '/start') {
          const job = await this.fabric.executeJob(id);
          return this.sendJson(res, 200, { job });
        }

        if (method === 'POST' && subpath === '/pause') {
          const job = this.fabric.pauseJob(id);
          return this.sendJson(res, 200, { job });
        }

        if (method === 'POST' && subpath === '/resume') {
          const job = await this.fabric.resumeJob(id);
          return this.sendJson(res, 200, { job });
        }

        if (method === 'POST' && subpath === '/cancel') {
          const job = this.fabric.cancelJob(id);
          return this.sendJson(res, 200, { job });
        }

        if (method === 'POST' && subpath === '/iterate') {
          const body = await this.readBody(req);
          if (!body.modifications) {
            return this.sendError(res, 400, 'modifications string is required for iteration');
          }
          const job = await this.fabric.iterateJob(id, body.modifications);
          return this.sendJson(res, 200, { job });
        }

        if (method === 'POST' && subpath === '/approve') {
          const body = await this.readBody(req);
          const job = this.fabric.approveJob(id, body.approvedBy || 'sovereign_user');
          return this.sendJson(res, 200, { job });
        }

        if (method === 'POST' && subpath === '/reject') {
          const body = await this.readBody(req);
          const job = this.fabric.rejectJob(id, body.reason || 'Sovereign rejection');
          return this.sendJson(res, 200, { job });
        }
      }

      return false;
    } catch (err: any) {
      return this.sendError(res, 500, `Creation API error: ${err.message}`);
    }
  }

  private handleSse(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 3000\n\n');

    const client = { res };
    this.sseClients.add(client);

    req.on('close', () => {
      this.sseClients.delete(client);
    });
  }

  private broadcastSse(event: string, data: Record<string, unknown>): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.res.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): boolean {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
    return true;
  }

  private sendError(res: ServerResponse, status: number, message: string): boolean {
    return this.sendJson(res, status, { error: message });
  }

  private readBody(req: IncomingMessage): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        if (!data.trim()) return resolve({});
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }
}
