/**
 * HṚṢĪKEŚA (हृषीकेश) — Persistent Execution REST API Routes & SSE Stream
 *
 * FP-19: Endpoints for Workers, Runtimes, Jobs, Checkpoints, Traces,
 * Cloud Providers, Persistent Operations Summary, and Live SSE Telemetry.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { ExecutionFabric } from '../../execution/execution.fabric.js';
import { EventBus } from '../../core/events/event-bus.js';

export class ExecutionRoutes {
  private sseClients: Set<{ res: ServerResponse }> = new Set();

  constructor(
    private readonly fabric: ExecutionFabric,
    private readonly eventBus?: EventBus
  ) {
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.eventBus) return;
    const executionEvents = [
      'worker.registered',
      'worker.authorized',
      'worker.online',
      'worker.offline',
      'worker.heartbeat',
      'worker.degraded',
      'worker.draining',
      'execution.queued',
      'execution.assigned',
      'execution.started',
      'execution.checkpoint',
      'execution.paused',
      'execution.waiting',
      'execution.migrating',
      'execution.recovered',
      'execution.verifying',
      'execution.completed',
      'execution.failed',
      'execution.cancelled',
    ];

    for (const evt of executionEvents) {
      this.eventBus.on(evt as any, (data: unknown) => {
        this.broadcastSse(evt, data as Record<string, unknown>);
      });
    }
  }

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    return this.handleRequest(req, res);
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Route normalization
    if (pathname.startsWith('/workers') || pathname.startsWith('/runtimes') || pathname.startsWith('/execution')) {
      pathname = '/api' + pathname;
    }

    if (
      !pathname.startsWith('/api/workers') &&
      !pathname.startsWith('/api/runtimes') &&
      !pathname.startsWith('/api/execution')
    ) {
      return false;
    }

    try {
      // 1. SSE Events: GET /api/execution/events
      if (pathname === '/api/execution/events' && method === 'GET') {
        this.handleSse(req, res);
        return true;
      }

      // 2. Persistent Operations Summary: GET /api/execution/summary
      if (pathname === '/api/execution/summary' && method === 'GET') {
        const summary = this.fabric.getOperationsSummary();
        this.sendJson(res, 200, { success: true, summary });
        return true;
      }

      // 3. Workers Endpoints
      if ((pathname === '/api/workers' || pathname === '/api/execution/workers') && method === 'GET') {
        const workers = this.fabric.workerRegistry.listWorkers();
        this.sendJson(res, 200, { success: true, workers, count: workers.length });
        return true;
      }

      if ((pathname === '/api/workers/register' || pathname === '/api/execution/workers/register') && method === 'POST') {
        const body = await this.readJsonBody(req);
        const enrolled = this.fabric.workerRegistry.enrollWorker(body as any);
        this.sendJson(res, 201, { success: true, ...enrolled });
        return true;
      }

      if (pathname.startsWith('/api/workers/') && pathname.endsWith('/authorize') && method === 'POST') {
        const parts = pathname.split('/');
        const id = parts[3];
        const body = await this.readJsonBody(req);
        const authorized = this.fabric.workerRegistry.authorizeWorker(id, (body.trustLevel as any) || 'AUTHORIZED');
        this.sendJson(res, 200, { success: true, worker: authorized });
        return true;
      }

      if (pathname.startsWith('/api/workers/') && pathname.endsWith('/drain') && method === 'POST') {
        const parts = pathname.split('/');
        const id = parts[3];
        const drained = this.fabric.workerRegistry.drainWorker(id);
        this.sendJson(res, 200, { success: true, worker: drained });
        return true;
      }

      if (pathname.startsWith('/api/workers/') && pathname.endsWith('/heartbeat') && method === 'POST') {
        const parts = pathname.split('/');
        const id = parts[3];
        const body = await this.readJsonBody(req);
        const worker = this.fabric.recordHeartbeat({ ...(body as any), workerId: id });
        this.sendJson(res, 200, { success: true, worker });
        return true;
      }

      if (pathname.startsWith('/api/workers/') && method === 'GET') {
        const id = pathname.replace('/api/workers/', '');
        const worker = this.fabric.workerRegistry.getWorker(id);
        if (!worker) {
          this.sendJson(res, 404, { success: false, error: 'Worker not found' });
          return true;
        }
        this.sendJson(res, 200, { success: true, worker });
        return true;
      }

      // 4. Runtimes Endpoints
      if (pathname === '/api/runtimes' && method === 'GET') {
        const runtimes = this.fabric.workerRegistry.listRuntimes();
        this.sendJson(res, 200, { success: true, runtimes, count: runtimes.length });
        return true;
      }

      if (pathname.startsWith('/api/runtimes/') && method === 'GET') {
        const id = pathname.replace('/api/runtimes/', '');
        const runtime = this.fabric.workerRegistry.getRuntime(id);
        if (!runtime) {
          this.sendJson(res, 404, { success: false, error: 'Runtime not found' });
          return true;
        }
        this.sendJson(res, 200, { success: true, runtime });
        return true;
      }

      // 5. Cloud Providers Endpoints
      if (pathname === '/api/execution/cloud-providers' && method === 'GET') {
        const providers = this.fabric.cloudRuntime.listProviders();
        this.sendJson(res, 200, { success: true, providers });
        return true;
      }

      // 6. Execution Jobs Endpoints
      if (pathname === '/api/execution/jobs' && method === 'GET') {
        const state = url.searchParams.get('state') as any;
        const scope = url.searchParams.get('scope') || undefined;
        const companyId = url.searchParams.get('companyId') || undefined;
        const projectId = url.searchParams.get('projectId') || undefined;

        const jobs = this.fabric.repository.listJobs({ state, scope, companyId, projectId });
        this.sendJson(res, 200, { success: true, jobs, count: jobs.length });
        return true;
      }

      if (pathname === '/api/execution/jobs' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const job = this.fabric.submitJob(body as any);
        this.sendJson(res, 201, { success: true, job });
        return true;
      }

      if (pathname.startsWith('/api/execution/jobs/') && pathname.endsWith('/pause') && method === 'POST') {
        const parts = pathname.split('/');
        const id = parts[4];
        const paused = this.fabric.pauseJob(id);
        this.sendJson(res, 200, { success: true, job: paused });
        return true;
      }

      if (pathname.startsWith('/api/execution/jobs/') && pathname.endsWith('/resume') && method === 'POST') {
        const parts = pathname.split('/');
        const id = parts[4];
        const resumed = this.fabric.resumeJob(id);
        this.sendJson(res, 200, { success: true, job: resumed });
        return true;
      }

      if (pathname.startsWith('/api/execution/jobs/') && pathname.endsWith('/cancel') && method === 'POST') {
        const parts = pathname.split('/');
        const id = parts[4];
        const body: any = await this.readJsonBody(req).catch(() => ({}));
        const cancelled = this.fabric.cancelJob(id, (body.reason as string) || 'OPERATOR_CANCELLED');
        this.sendJson(res, 200, { success: true, job: cancelled });
        return true;
      }

      if (pathname.startsWith('/api/execution/jobs/') && pathname.endsWith('/migrate') && method === 'POST') {
        const parts = pathname.split('/');
        const id = parts[4];
        const body: any = await this.readJsonBody(req);
        const migrated = this.fabric.migrateJob(id, body.targetWorkerId as string);
        this.sendJson(res, 200, { success: true, job: migrated });
        return true;
      }

      if (pathname.startsWith('/api/execution/jobs/') && (pathname.endsWith('/traces') || pathname.endsWith('/trace')) && method === 'GET') {
        const parts = pathname.split('/');
        const id = parts[4];
        const traces = this.fabric.repository.listTracesForJob(id);
        this.sendJson(res, 200, { success: true, traces });
        return true;
      }

      if (pathname.startsWith('/api/execution/jobs/') && pathname.endsWith('/artifacts') && method === 'GET') {
        const parts = pathname.split('/');
        const id = parts[4];
        const artifacts = this.fabric.repository.listArtifactsForJob(id);
        this.sendJson(res, 200, { success: true, artifacts });
        return true;
      }

      if (pathname.startsWith('/api/execution/jobs/') && method === 'GET') {
        const id = pathname.replace('/api/execution/jobs/', '');
        const job = this.fabric.repository.getJobById(id);
        if (!job) {
          this.sendJson(res, 404, { success: false, error: 'Job not found' });
          return true;
        }
        const checkpoint = job.checkpointId ? this.fabric.checkpointService.getLatestCheckpoint(job.id) : null;
        this.sendJson(res, 200, { success: true, job, checkpoint });
        return true;
      }

      return false;
    } catch (err) {
      this.sendJson(res, 500, { success: false, error: String(err) });
      return true;
    }
  }

  // ==========================================
  // HELPERS & SSE STREAMING
  // ==========================================

  private handleSse(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 5000\n\n');

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

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(data));
  }

  private async readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        if (!body.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Invalid JSON body: ${e}`));
        }
      });
      req.on('error', reject);
    });
  }
}
