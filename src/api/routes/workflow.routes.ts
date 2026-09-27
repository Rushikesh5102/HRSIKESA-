/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow REST API & SSE Endpoints
 *
 * FP-11: Exposes complete workflow lifecycle, execution runs, versioning,
 * natural-language planning, human approvals, webhooks, and live SSE event stream.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { WorkflowFabric } from '../../workflows/workflow.fabric.js';
import { WorkflowEventPayload } from '../../workflows/types/events.types.js';

export class WorkflowRoutes {
  private readonly workflowFabric: WorkflowFabric;
  private readonly sseClients: Set<{ res: ServerResponse; runIdFilter?: string }> = new Set();

  constructor(workflowFabric: WorkflowFabric) {
    this.workflowFabric = workflowFabric;
    this.bindEvents();
  }

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    return this.handleRequest(req, res);
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Support both /api/workflows and /workflows prefixes
    if (pathname.startsWith('/workflows') || pathname.startsWith('/workflow-runs') || pathname.startsWith('/workflow-approvals')) {
      pathname = '/api' + pathname;
    }

    if (!pathname.startsWith('/api/workflows') && !pathname.startsWith('/api/workflow-runs') && !pathname.startsWith('/api/workflow-approvals')) {
      return false;
    }

    try {
      // 1. GET /api/workflows/events - SSE Stream for all workflow events
      if (method === 'GET' && pathname === '/api/workflows/events') {
        this.handleSseStream(req, res);
        return true;
      }

      // 2. GET /api/workflow-runs/:id/events - SSE Stream for specific run
      const runSseMatch = pathname.match(/^\/api\/workflow-runs\/([a-zA-Z0-9_-]+)\/events$/);
      if (method === 'GET' && runSseMatch) {
        this.handleSseStream(req, res, runSseMatch[1]);
        return true;
      }

      // 3. Webhook endpoint: POST /api/workflows/webhook/:webhookId
      const webhookMatch = pathname.match(/^\/api\/workflows\/webhook\/([a-zA-Z0-9_-]+)$/);
      if (method === 'POST' && webhookMatch) {
        const webhookPath = webhookMatch[1];
        const bodyBuffer = await this.readRawBody(req);
        const result = await this.workflowFabric.getTriggerManager().handleWebhook(
          webhookPath,
          bodyBuffer,
          req.headers as any
        );
        this.sendJson(res, result.success ? 200 : 400, result);
        return true;
      }

      // 4. GET /api/workflows/templates - Built-in templates
      if (method === 'GET' && pathname === '/api/workflows/templates') {
        const templates = this.workflowFabric.listTemplates();
        this.sendJson(res, 200, { success: true, count: templates.length, templates });
        return true;
      }

      // 5. POST /api/workflows/templates/instantiate
      if (method === 'POST' && pathname === '/api/workflows/templates/instantiate') {
        const body = await this.parseJsonBody(req);
        const instantiated = this.workflowFabric.instantiateTemplate(body.templateName || body.templateIndex || 0, {
          scope: body.scope,
          companyId: body.companyId,
          projectId: body.projectId,
        });
        this.sendJson(res, 201, { success: true, ...instantiated });
        return true;
      }

      // 6. POST /api/workflows/plan-nl - Natural Language Planner
      if (method === 'POST' && pathname === '/api/workflows/plan-nl') {
        const body = await this.parseJsonBody(req);
        if (!body.prompt) {
          this.sendJson(res, 400, { success: false, error: 'prompt is required' });
          return true;
        }
        const planned = await this.workflowFabric.getPlanner().planFromNaturalLanguage({
          prompt: String(body.prompt),
          scope: body.scope,
          companyId: body.companyId,
          projectId: body.projectId,
        });
        this.sendJson(res, 201, { success: true, ...planned });
        return true;
      }

      // 7. GET /api/workflows - List workflows
      if (method === 'GET' && pathname === '/api/workflows') {
        const repo = this.workflowFabric.getRepository();
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const scope = url.searchParams.get('scope') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const workflows = repo.listWorkflows({ limit, scope, status });
        this.sendJson(res, 200, { success: true, count: workflows.length, workflows });
        return true;
      }

      // 8. POST /api/workflows - Create workflow
      if (method === 'POST' && pathname === '/api/workflows') {
        const body = await this.parseJsonBody(req);
        if (!body.name || !body.graph) {
          this.sendJson(res, 400, { success: false, error: 'name and graph are required' });
          return true;
        }
        const created = this.workflowFabric.createWorkflow(body as any);
        this.sendJson(res, 201, { success: true, ...created });
        return true;
      }

      // Specific workflow endpoints: /api/workflows/:id/...
      const wfMatch = pathname.match(/^\/api\/workflows\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/);
      if (wfMatch && !pathname.includes('/webhook/')) {
        const wfId = wfMatch[1];
        const action = wfMatch[2];
        const repo = this.workflowFabric.getRepository();
        const workflow = repo.getWorkflow(wfId);

        if (!workflow && action !== 'runs' && action !== 'versions') {
          this.sendJson(res, 404, { success: false, error: `Workflow '${wfId}' not found` });
          return true;
        }

        // GET /api/workflows/:id
        if (method === 'GET' && !action) {
          const version = repo.getVersion(wfId, workflow!.activeVersion);
          this.sendJson(res, 200, { success: true, workflow, version });
          return true;
        }

        // GET /api/workflows/:id/versions
        if (method === 'GET' && action === 'versions') {
          const versions = repo.listVersions(wfId);
          this.sendJson(res, 200, { success: true, count: versions.length, versions });
          return true;
        }

        // GET /api/workflows/:id/runs
        if (method === 'GET' && action === 'runs') {
          const runs = repo.listRuns({ workflowId: wfId });
          this.sendJson(res, 200, { success: true, count: runs.length, runs });
          return true;
        }

        // GET /api/workflows/:id/explain
        if (method === 'GET' && action === 'explain') {
          const runId = url.searchParams.get('runId') || undefined;
          const explanation = this.workflowFabric.getPlanner().explainWorkflow(wfId, runId);
          this.sendJson(res, 200, { success: true, explanation });
          return true;
        }

        // POST /api/workflows/:id/validate
        if (method === 'POST' && action === 'validate') {
          const validation = this.workflowFabric.validateWorkflow(wfId);
          this.sendJson(res, 200, { success: true, validation });
          return true;
        }

        // POST /api/workflows/:id/activate
        if (method === 'POST' && action === 'activate') {
          const updated = this.workflowFabric.activateWorkflow(wfId);
          this.sendJson(res, 200, { success: true, workflow: updated });
          return true;
        }

        // POST /api/workflows/:id/pause
        if (method === 'POST' && action === 'pause') {
          const updated = this.workflowFabric.pauseWorkflow(wfId);
          this.sendJson(res, 200, { success: true, workflow: updated });
          return true;
        }

        // POST /api/workflows/:id/resume
        if (method === 'POST' && action === 'resume') {
          const updated = this.workflowFabric.resumeWorkflow(wfId);
          this.sendJson(res, 200, { success: true, workflow: updated });
          return true;
        }

        // POST /api/workflows/:id/disable
        if (method === 'POST' && action === 'disable') {
          const updated = this.workflowFabric.disableWorkflow(wfId);
          this.sendJson(res, 200, { success: true, workflow: updated });
          return true;
        }

        // POST /api/workflows/:id/modify-nl
        if (method === 'POST' && action === 'modify-nl') {
          const body = await this.parseJsonBody(req);
          if (!body.prompt) {
            this.sendJson(res, 400, { success: false, error: 'prompt is required' });
            return true;
          }
          const newVersion = await this.workflowFabric.getPlanner().modifyWithNaturalLanguage(wfId, String(body.prompt));
          this.sendJson(res, 201, { success: true, version: newVersion });
          return true;
        }

        // POST /api/workflows/:id/run
        if (method === 'POST' && action === 'run') {
          const body = await this.parseJsonBody(req);
          const run = await this.workflowFabric.runWorkflow(wfId, {
            versionNumber: body.versionNumber,
            triggerType: body.triggerType || 'MANUAL',
            triggerPayload: body.triggerPayload || {},
            inputVariables: body.inputVariables || {},
          });
          this.sendJson(res, 202, { success: true, run });
          return true;
        }
      }

      // Workflow Runs endpoints: /api/workflow-runs/:runId/...
      const runMatch = pathname.match(/^\/api\/workflow-runs\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/);
      if (runMatch) {
        const runId = runMatch[1];
        const action = runMatch[2];
        const repo = this.workflowFabric.getRepository();
        const run = repo.getRun(runId);

        if (!run) {
          this.sendJson(res, 404, { success: false, error: `Run '${runId}' not found` });
          return true;
        }

        // GET /api/workflow-runs/:runId
        if (method === 'GET' && !action) {
          const nodes = repo.listRunNodes(runId);
          const artifacts = repo.listArtifacts(runId);
          const approvals = repo.listApprovals({ runId });
          this.sendJson(res, 200, { success: true, run, nodes, artifacts, approvals });
          return true;
        }

        // GET /api/workflow-runs/:runId/timeline
        if (method === 'GET' && action === 'timeline') {
          const nodes = repo.listRunNodes(runId);
          this.sendJson(res, 200, { success: true, runId, timeline: nodes });
          return true;
        }

        // GET /api/workflow-runs/:runId/approvals
        if (method === 'GET' && action === 'approvals') {
          const approvals = repo.listApprovals({ runId });
          this.sendJson(res, 200, { success: true, count: approvals.length, approvals });
          return true;
        }

        // POST /api/workflow-runs/:runId/pause
        if (method === 'POST' && action === 'pause') {
          this.workflowFabric.getExecutionEngine().pauseRun(runId);
          this.sendJson(res, 200, { success: true, status: 'PAUSED' });
          return true;
        }

        // POST /api/workflow-runs/:runId/resume
        if (method === 'POST' && action === 'resume') {
          const resumed = await this.workflowFabric.getExecutionEngine().resumeRun(runId);
          this.sendJson(res, 200, { success: true, run: resumed });
          return true;
        }

        // POST /api/workflow-runs/:runId/cancel
        if (method === 'POST' && action === 'cancel') {
          const body = await this.parseJsonBody(req);
          this.workflowFabric.getExecutionEngine().cancelRun(runId, body.reason);
          this.sendJson(res, 200, { success: true, status: 'CANCELLED' });
          return true;
        }

        // POST /api/workflow-runs/:runId/retry
        if (method === 'POST' && action === 'retry') {
          const resumed = await this.workflowFabric.getExecutionEngine().resumeRun(runId);
          this.sendJson(res, 200, { success: true, run: resumed });
          return true;
        }
      }

      // Approvals endpoints: POST /api/workflow-approvals/:id/decide
      const apprMatch = pathname.match(/^\/api\/workflow-approvals\/([a-zA-Z0-9_-]+)\/decide$/);
      if (method === 'POST' && apprMatch) {
        const approvalId = apprMatch[1];
        const body = await this.parseJsonBody(req);
        if (!body.decision || (body.decision !== 'APPROVED' && body.decision !== 'REJECTED')) {
          this.sendJson(res, 400, { success: false, error: "decision must be 'APPROVED' or 'REJECTED'" });
          return true;
        }
        await this.workflowFabric.resolveApproval(approvalId, body.decision, body.decidedBy || 'operator', body.comments);
        this.sendJson(res, 200, { success: true, approvalId, decision: body.decision });
        return true;
      }

      return false;
    } catch (err: any) {
      this.sendJson(res, 500, { success: false, error: String(err?.message || err) });
      return true;
    }
  }

  // SSE Stream Handler
  private handleSseStream(req: IncomingMessage, res: ServerResponse, runIdFilter?: string): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.flushHeaders?.();

    const client = { res, runIdFilter };
    this.sseClients.add(client);

    // Initial keepalive
    res.write(`: ping\n\n`);

    req.on('close', () => {
      this.sseClients.delete(client);
    });
  }

  private bindEvents(): void {
    const events = [
      'workflow.created', 'workflow.updated', 'workflow.validated', 'workflow.activated',
      'workflow.paused', 'workflow.disabled', 'workflow.version.created',
      'workflow.run.created', 'workflow.run.started', 'workflow.node.started',
      'workflow.node.completed', 'workflow.node.failed', 'workflow.node.retrying',
      'workflow.node.skipped', 'workflow.approval.requested', 'workflow.approval.resolved',
      'workflow.run.paused', 'workflow.run.resumed', 'workflow.run.recovered',
      'workflow.run.completed', 'workflow.run.failed', 'workflow.run.cancelled'
    ];

    for (const evt of events) {
      this.workflowFabric.on(evt, (payload: WorkflowEventPayload) => {
        this.broadcastSse(evt, payload);
      });
    }
  }

  private broadcastSse(event: string, payload: WorkflowEventPayload): void {
    const dataStr = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.sseClients) {
      if (client.runIdFilter && payload.runId && client.runIdFilter !== payload.runId) {
        continue;
      }
      try {
        client.res.write(dataStr);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private async parseJsonBody(req: IncomingMessage): Promise<Record<string, any>> {
    const raw = await this.readRawBody(req);
    if (!raw || raw.length === 0) return {};
    try {
      return JSON.parse(raw.toString('utf8'));
    } catch {
      return {};
    }
  }

  private readRawBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  private sendJson(res: ServerResponse, status: number, data: any): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }
}
