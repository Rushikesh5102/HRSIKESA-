/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Engineering REST & SSE Endpoints
 *
 * FP-10: Exposes autonomous software engineering lifecycle, actions, plans,
 * diagnostics, repairs, verifications, and real-time SSE event stream.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { EngineeringFabric } from '../../engineering/engineering.fabric.js';
import { EngineeringTaskEvent } from '../../engineering/types/engineering.types.js';

export class EngineeringRoutes {
  private readonly engineeringFabric: EngineeringFabric;

  constructor(engineeringFabric: EngineeringFabric) {
    this.engineeringFabric = engineeringFabric;
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Support both /api/engineering and /engineering prefixes
    if (pathname.startsWith('/engineering')) {
      pathname = '/api' + pathname;
    }

    if (!pathname.startsWith('/api/engineering')) {
      return false;
    }

    try {
      // 1. GET /api/engineering/events - SSE Stream for all tasks
      if (method === 'GET' && pathname === '/api/engineering/events') {
        this.handleSseStream(req, res);
        return true;
      }

      // 2. GET /api/engineering/tasks/:id/events - SSE Stream for specific task
      const sseMatch = pathname.match(/^\/api\/engineering\/tasks\/([a-zA-Z0-9_-]+)\/events$/);
      if (method === 'GET' && sseMatch) {
        const taskId = sseMatch[1];
        this.handleSseStream(req, res, taskId);
        return true;
      }

      // 3. GET /api/engineering/tasks - List all tasks
      if (method === 'GET' && pathname === '/api/engineering/tasks') {
        const repo = this.engineeringFabric.getRepository();
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const tasks = repo.listTasks({ limit });
        this.sendJson(res, 200, { success: true, count: tasks.length, tasks });
        return true;
      }

      // 4. POST /api/engineering/tasks - Create a new task
      if (method === 'POST' && pathname === '/api/engineering/tasks') {
        const body = await this.parseJsonBody(req);
        if (!body.objective) {
          this.sendJson(res, 400, { success: false, error: 'objective is required' });
          return true;
        }

        const task = this.engineeringFabric.createTask({
          objective: String(body.objective),
          workspaceId: body.workspaceId ? String(body.workspaceId) : undefined,
          projectId: body.projectId ? String(body.projectId) : undefined,
          companyId: body.companyId ? String(body.companyId) : undefined,
          priority: body.priority as any,
          budget: body.budget as any,
          autoApprove: body.autoApprove !== false,
        });

        // Optionally start immediately if requested
        if (body.startImmediately) {
          void this.engineeringFabric.runTask(task.id).catch((err: unknown) => {
            console.error(`Autonomous task ${task.id} failed in background:`, err);
          });
        }

        this.sendJson(res, 201, { success: true, task });
        return true;
      }

      // Specific task endpoints: /api/engineering/tasks/:id/...
      const taskRouteMatch = pathname.match(/^\/api\/engineering\/tasks\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/);
      if (taskRouteMatch) {
        const taskId = taskRouteMatch[1];
        const subAction = taskRouteMatch[2];
        const repo = this.engineeringFabric.getRepository();
        const task = repo.getTask(taskId);

        if (!task) {
          this.sendJson(res, 404, { success: false, error: `Engineering task '${taskId}' not found` });
          return true;
        }

        // GET /api/engineering/tasks/:id
        if (method === 'GET' && !subAction) {
          this.sendJson(res, 200, { success: true, task });
          return true;
        }

        // POST /api/engineering/tasks/:id/start
        if (method === 'POST' && subAction === 'start') {
          // Run asynchronously in background and return immediate 202
          void this.engineeringFabric.runTask(taskId).catch((err: unknown) => {
            console.error(`Task execution error on ${taskId}:`, err);
          });
          this.sendJson(res, 202, { success: true, message: `Task ${taskId} execution initiated`, taskId });
          return true;
        }

        // POST /api/engineering/tasks/:id/pause
        if (method === 'POST' && subAction === 'pause') {
          const paused = await this.engineeringFabric.pauseTask(taskId);
          this.sendJson(res, 200, { success: paused, taskId, status: 'PAUSED' });
          return true;
        }

        // POST /api/engineering/tasks/:id/resume
        if (method === 'POST' && subAction === 'resume') {
          const resumed = await this.engineeringFabric.resumeTask(taskId);
          this.sendJson(res, 200, { success: resumed, taskId, status: 'RESUMED' });
          return true;
        }

        // POST /api/engineering/tasks/:id/cancel
        if (method === 'POST' && subAction === 'cancel') {
          const cancelled = await this.engineeringFabric.cancelTask(taskId);
          this.sendJson(res, 200, { success: cancelled, taskId, status: 'CANCELLED' });
          return true;
        }

        // GET /api/engineering/tasks/:id/plan
        if (method === 'GET' && subAction === 'plan') {
          const plan = repo.getPlanByTask(taskId);
          this.sendJson(res, 200, { success: true, plan: plan || null });
          return true;
        }

        // GET /api/engineering/tasks/:id/actions
        if (method === 'GET' && subAction === 'actions') {
          const actions = repo.listActionsByTask(taskId);
          this.sendJson(res, 200, { success: true, count: actions.length, actions });
          return true;
        }

        // GET /api/engineering/tasks/:id/diagnostics
        if (method === 'GET' && subAction === 'diagnostics') {
          const diagnostics = repo.listDiagnosticsByTask(taskId);
          this.sendJson(res, 200, { success: true, count: diagnostics.length, diagnostics });
          return true;
        }

        // GET /api/engineering/tasks/:id/repairs
        if (method === 'GET' && subAction === 'repairs') {
          const repairs = repo.listRepairsByTask(taskId);
          this.sendJson(res, 200, { success: true, count: repairs.length, repairs });
          return true;
        }

        // GET /api/engineering/tasks/:id/changes
        if (method === 'GET' && subAction === 'changes') {
          const actions = repo.listActionsByTask(taskId);
          const changedFiles = task.changedFiles;
          const diffs = actions
            .filter((a: any) => a.actionType === 'EDIT_FILE' && a.diff)
            .map((a: any) => ({
              path: a.targetPath,
              diff: a.diff,
              actionId: a.id,
              timestamp: a.completedAt,
            }));
          this.sendJson(res, 200, { success: true, changedFiles, diffs });
          return true;
        }

        // GET /api/engineering/tasks/:id/tests
        if (method === 'GET' && subAction === 'tests') {
          const verifications = repo.listVerificationsByTask(taskId);
          this.sendJson(res, 200, {
            success: true,
            testsRun: task.testsRun,
            verificationCount: verifications.length,
            verifications,
          });
          return true;
        }

        // GET /api/engineering/tasks/:id/verification
        if (method === 'GET' && subAction === 'verification') {
          const verifications = repo.listVerificationsByTask(taskId);
          const latest = verifications.length > 0 ? verifications[verifications.length - 1] : null;
          this.sendJson(res, 200, {
            success: true,
            state: task.verificationState,
            latestVerification: latest,
            allVerifications: verifications,
          });
          return true;
        }

        // GET /api/engineering/tasks/:id/timeline
        if (method === 'GET' && subAction === 'timeline') {
          const plan = repo.getPlanByTask(taskId);
          const actions = repo.listActionsByTask(taskId);
          const diagnostics = repo.listDiagnosticsByTask(taskId);
          const repairs = repo.listRepairsByTask(taskId);
          const verifications = repo.listVerificationsByTask(taskId);

          const events: Array<{ type: string; timestamp: string; details: any }> = [];

          events.push({
            type: 'TASK_CREATED',
            timestamp: task.createdAt,
            details: { objective: task.objective, priority: task.priority },
          });

          if (task.startedAt) {
            events.push({
              type: 'TASK_STARTED',
              timestamp: task.startedAt,
              details: { status: task.status },
            });
          }

          if (plan) {
            events.push({
              type: 'PLAN_CREATED',
              timestamp: plan.createdAt,
              details: { summary: plan.summary || plan.architectureSummary, stepsCount: plan.steps.length },
            });
          }

          for (const a of actions) {
            events.push({
              type: `ACTION_${a.status}`,
              timestamp: a.executedAt || a.createdAt,
              details: {
                actionType: a.actionType,
                targetPath: a.payload.path || a.payload.filePath || a.payload.file,
                reason: a.payload.reason,
              },
            });
          }

          for (const d of diagnostics) {
            events.push({
              type: 'FAILURE_DIAGNOSED',
              timestamp: d.createdAt,
              details: { category: d.category, message: d.message, confidence: d.confidence },
            });
          }

          for (const r of repairs) {
            events.push({
              type: `REPAIR_${r.outcome}`,
              timestamp: r.createdAt,
              details: { attempt: r.attemptNumber, model: r.modelId, file: r.proposedPatch.path || r.proposedPatch.file },
            });
          }

          for (const v of verifications) {
            events.push({
              type: `VERIFICATION_${v.passed ? 'PASSED' : 'FAILED'}`,
              timestamp: v.createdAt,
              details: { stage: v.stage, passed: v.passed, ...v.details },
            });
          }

          if (task.completedAt) {
            events.push({
              type: `TASK_${task.status}`,
              timestamp: task.completedAt,
              details: { finalSummary: task.finalSummary, failureReason: task.failureReason },
            });
          }

          events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          this.sendJson(res, 200, {
            success: true,
            taskId,
            status: task.status,
            currentPhase: task.currentPhase,
            timeline: events,
          });
          return true;
        }
      }

      return false;
    } catch (err: any) {
      this.sendJson(res, 500, { success: false, error: err.message || 'Internal engineering route error' });
      return true;
    }
  }

  private handleSseStream(req: IncomingMessage, res: ServerResponse, filterTaskId?: string): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const listener = (event: EngineeringTaskEvent) => {
      if (filterTaskId && event.taskId !== filterTaskId) {
        return;
      }
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    this.engineeringFabric.on('engineering_event', listener);

    req.on('close', () => {
      this.engineeringFabric.off('engineering_event', listener);
      res.end();
    });
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    const payload = JSON.stringify(data, null, 2);
    res.writeHead(statusCode, {
      'Content-Length': Buffer.byteLength(payload),
      'Content-Type': 'application/json',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(payload);
  }

  private async parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 2 * 1024 * 1024) {
          req.destroy(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        if (!body.trim()) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }
}
