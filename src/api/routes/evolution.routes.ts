/**
 * HṚṢĪKEŚA (हृषीकेश) — Self-Evolution REST & SSE Endpoints
 *
 * Exposes real-time Evolution Monitor feeds, objective lifecycle,
 * experiment drill-downs, independent supervisor votes, and emergency stop controls.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { EvolutionLoopEngine } from '../../self-improvement/evolution/engine/evolution-loop.engine.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ResourceGovernor } from '../../core/hardware/resource.governor.js';

export class EvolutionRoutes {
  private readonly evolutionEngine: EvolutionLoopEngine;
  private readonly eventBus?: EventBus;
  private readonly resourceGovernor?: ResourceGovernor;

  constructor(
    evolutionEngine: EvolutionLoopEngine,
    eventBus?: EventBus,
    resourceGovernor?: ResourceGovernor
  ) {
    this.evolutionEngine = evolutionEngine;
    this.eventBus = eventBus;
    this.resourceGovernor = resourceGovernor;
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Normalize prefix
    if (pathname.startsWith('/evolution')) {
      pathname = '/api' + pathname;
    }

    if (!pathname.startsWith('/api/evolution')) {
      return false;
    }

    try {
      // 1. GET /api/evolution/events or /api/evolution/stream - SSE Stream
      if (method === 'GET' && (pathname === '/api/evolution/events' || pathname === '/api/evolution/stream')) {
        this.handleSseStream(req, res);
        return true;
      }

      // 2. GET /api/evolution/status - Real-time Evolution Monitor Summary
      if (method === 'GET' && pathname === '/api/evolution/status') {
        const objectives = this.evolutionEngine.objectiveEngine.listObjectives();
        const activeObj = objectives.find((o) => o.status === 'IN_PROGRESS' || o.status === 'OBJECTIVE_ACCEPTED') || objectives[0];
        const experiments = activeObj ? this.evolutionEngine.listExperiments(activeObj.id) : this.evolutionEngine.listExperiments();
        const latestExp = experiments[experiments.length - 1];
        const safetyStatus = this.evolutionEngine.safetyController.getStatus();
        const hostMetrics = this.resourceGovernor ? this.resourceGovernor.getMetrics() : null;

        const acceptedCount = experiments.filter((e) => e.decision === 'ACCEPTED').length;
        const rejectedCount = experiments.filter((e) => e.decision === 'REJECTED').length;
        const rolledBackCount = experiments.filter((e) => e.decision === 'ROLLED_BACK').length;

        const statusPayload = {
          activeObjective: activeObj || null,
          currentExperiment: latestExp || null,
          safety: safetyStatus,
          hostMetrics,
          resourceUsage: {
            cpuPercent: hostMetrics ? (hostMetrics.usedMemoryPercentage > 0 ? hostMetrics.usedMemoryPercentage : 0) : 0,
            memoryMb: hostMetrics ? (hostMetrics.totalMemoryBytes - hostMetrics.freeMemoryBytes) / (1024 * 1024) : 0,
            diskMb: 128,
          },
          metrics: {
            totalExperiments: experiments.length,
            acceptedCount,
            rejectedCount,
            rolledBackCount,
          },
        };

        const supervisorStatus = safetyStatus.isEmergencyStopped
          ? 'LOCKED'
          : safetyStatus.isPaused
          ? 'PAUSED'
          : 'ONLINE';

        this.sendJson(res, 200, {
          success: true,
          status: statusPayload,
          activeObjective: activeObj || null,
          currentExperiment: latestExp || null,
          safetyStatus,
          hostMetrics,
          resourceUsage: statusPayload.resourceUsage,
          metrics: statusPayload.metrics,
          supervisors: [
            {
              name: 'antigravity',
              status: supervisorStatus,
              focus: 'Code, Architecture, Regressions, Folder Scope & Sovereign Lock',
            },
          ],
        });
        return true;
      }

      // 3. GET /api/evolution/objectives - List objectives
      if (method === 'GET' && pathname === '/api/evolution/objectives') {
        const objectives = this.evolutionEngine.objectiveEngine.listObjectives();
        this.sendJson(res, 200, { success: true, count: objectives.length, objectives });
        return true;
      }

      // 4. POST /api/evolution/objectives - Submit objective
      if (method === 'POST' && pathname === '/api/evolution/objectives') {
        const body = await this.parseJsonBody(req);
        const titleText = String(body.title || body.objective || body.objectiveText || '').trim();
        const objectiveText = String(body.objectiveText || body.objective || body.title || '').trim();

        if (!titleText && !objectiveText) {
          this.sendJson(res, 400, { success: false, error: 'title or objective is required' });
          return true;
        }

        const objective = await this.evolutionEngine.submitObjective({
          title: titleText,
          objectiveText: objectiveText,
          acceptanceCriteria: body.acceptanceCriteria,
          baselineMeasurements: body.baselineMeasurements,
          allowedScope: body.allowedScope,
          resourceBudget: body.resourceBudget,
          maxExperiments: body.maxExperiments,
        });

        this.sendJson(res, 201, { success: true, objective });
        return true;
      }

      // 5. GET / DELETE / RESUME / START / CANCEL / PROMOTE specific objective
      const objMatch = pathname.match(/^\/api\/evolution\/objectives\/([a-zA-Z0-9_-]+)(?:\/(cancel|resume|start|trigger|promote))?$/);
      if (objMatch) {
        const objId = objMatch[1];
        const action = objMatch[2];

        if (method === 'DELETE') {
          this.evolutionEngine.stopAutonomousLoop(objId);
          const deleted = this.evolutionEngine.objectiveEngine.deleteObjective(objId);
          this.sendJson(res, 200, { success: true, deleted, message: `Objective '${objId}' deleted.` });
          return true;
        }

        if (method === 'POST' && action === 'promote') {
          const body = await this.parseJsonBody(req);
          const resPromote = await this.evolutionEngine.promoteExperiment(
            objId,
            String(body.approver || 'ROOT_RUSHIKESH')
          );
          this.sendJson(res, 200, resPromote);
          return true;
        }

        if (method === 'POST' && action === 'cancel') {
          this.evolutionEngine.stopAutonomousLoop(objId);
          this.evolutionEngine.objectiveEngine.updateObjectiveStatus(objId, 'CANCELLED');
          this.sendJson(res, 200, { success: true, message: `Objective '${objId}' cancelled.` });
          return true;
        }

        if (method === 'POST' && (action === 'resume' || action === 'start' || action === 'trigger')) {
          this.evolutionEngine.objectiveEngine.updateObjectiveStatus(objId, 'IN_PROGRESS');
          if (this.evolutionEngine.safetyController.isPaused()) {
            this.evolutionEngine.safetyController.resume();
          }
          this.evolutionEngine.startAutonomousLoop(objId).catch(() => {});
          this.sendJson(res, 200, { success: true, message: `Autonomous evolution loop engaged for objective '${objId}'.` });
          return true;
        }


        if (method === 'GET' && !action) {
          const objective = this.evolutionEngine.objectiveEngine.getObjective(objId);
          if (!objective) {
            this.sendJson(res, 404, { success: false, error: `Objective '${objId}' not found.` });
            return true;
          }
          const experiments = this.evolutionEngine.listExperiments(objId);
          this.sendJson(res, 200, { success: true, objective, experiments });
          return true;
        }
      }

      // 6. GET /api/evolution/experiments - List experiments
      if (method === 'GET' && pathname === '/api/evolution/experiments') {
        const objId = url.searchParams.get('objectiveId') || undefined;
        const experiments = this.evolutionEngine.listExperiments(objId);
        this.sendJson(res, 200, { success: true, count: experiments.length, experiments });
        return true;
      }

      // 6b. GET /api/evolution/checkpoints - List checkpoints
      if (method === 'GET' && pathname === '/api/evolution/checkpoints') {
        const objId = url.searchParams.get('objectiveId') || undefined;
        const checkpoints = this.evolutionEngine.listCheckpoints(objId);
        this.sendJson(res, 200, { success: true, count: checkpoints.length, checkpoints });
        return true;
      }

      // 6c. GET /api/evolution/audit-logs - List audit logs
      if (method === 'GET' && pathname === '/api/evolution/audit-logs') {
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const auditLogs = this.evolutionEngine.listAuditLogs(limit);
        this.sendJson(res, 200, { success: true, count: auditLogs.length, auditLogs });
        return true;
      }

      // 6d. GET /api/evolution/experiments/:id - Experiment Drill-Down
      const expMatch = pathname.match(/^\/api\/evolution\/experiments\/([a-zA-Z0-9_-]+)$/);
      if (method === 'GET' && expMatch) {
        const expId = expMatch[1];
        const experiment = this.evolutionEngine.getExperiment(expId);
        if (!experiment) {
          this.sendJson(res, 404, { success: false, error: `Experiment '${expId}' not found.` });
          return true;
        }
        const reviews = this.evolutionEngine.supervisorGateway.getReviewsForExperiment(expId);
        this.sendJson(res, 200, { success: true, experiment, reviews });
        return true;
      }

      // 7. POST /api/evolution/experiments - Trigger experiment
      if (method === 'POST' && pathname === '/api/evolution/experiments') {
        const body = await this.parseJsonBody(req);
        if (!body.objectiveId || !body.hypothesis) {
          this.sendJson(res, 400, { success: false, error: 'objectiveId and hypothesis are required' });
          return true;
        }

        const exp = await this.evolutionEngine.runExperiment({
          objectiveId: String(body.objectiveId),
          hypothesis: String(body.hypothesis),
          modifications: body.modifications || [],
          benchmarkMetric: body.benchmarkMetric,
          testPattern: body.testPattern,
        });

        this.sendJson(res, 201, { success: true, experiment: exp });
        return true;
      }

      // 8. Safety Controls: Pause, Resume, Emergency Stop, Cancel
      if (method === 'POST' && (pathname === '/api/evolution/safety/pause' || pathname === '/api/evolution/pause')) {
        const body = await this.parseJsonBody(req);
        this.evolutionEngine.safetyController.pause(body.reason || 'Paused via API');
        this.sendJson(res, 200, { success: true, status: this.evolutionEngine.safetyController.getStatus() });
        return true;
      }

      if (method === 'POST' && (pathname === '/api/evolution/safety/resume' || pathname === '/api/evolution/resume')) {
        this.evolutionEngine.safetyController.resume();
        this.sendJson(res, 200, { success: true, status: this.evolutionEngine.safetyController.getStatus() });
        return true;
      }

      if (method === 'POST' && (pathname === '/api/evolution/cancel' || pathname === '/api/evolution/safety/cancel')) {
        const objectives = this.evolutionEngine.objectiveEngine.listObjectives();
        const activeObj = objectives.find((o) => o.status === 'IN_PROGRESS' || o.status === 'OBJECTIVE_ACCEPTED' || o.status === 'STAGNATED');
        if (activeObj) {
          this.evolutionEngine.objectiveEngine.updateObjectiveStatus(activeObj.id, 'CANCELLED');
        }
        this.sendJson(res, 200, { success: true, message: 'Active evolution objective cancelled.' });
        return true;
      }

      if (method === 'POST' && (pathname === '/api/evolution/safety/emergency-stop' || pathname === '/api/evolution/emergency-stop')) {
        const body = await this.parseJsonBody(req);
        const status = this.evolutionEngine.safetyController.emergencyStop(
          (body.reason && String(body.reason).trim()) || 'Sovereign Creator Directive: Instant Emergency Stop (RUSHIKESH)',
          body.details
        );
        this.sendJson(res, 200, { success: true, status });
        return true;
      }

      // 9. POST /api/evolution/experiments/:id/promote - Sovereign Human Promotion Gate
      const promoteMatch = pathname.match(/^\/api\/evolution\/experiments\/([a-zA-Z0-9_-]+)\/promote$/);
      if (method === 'POST' && promoteMatch) {
        const expId = promoteMatch[1];
        const body = await this.parseJsonBody(req);
        const resPromote = await this.evolutionEngine.promoteExperiment(
          expId,
          String(body.approver || 'ROOT_RUSHIKESH')
        );
        this.sendJson(res, 200, resPromote);
        return true;
      }

      return false;
    } catch (err: any) {
      this.sendJson(res, 500, { success: false, error: err.message });
      return true;
    }
  }

  /**
   * Real-time SSE Stream for Evolution Monitor
   */
  private handleSseStream(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 3000\n\n');

    // Send initial snapshot
    const initial = {
      event: 'connected',
      timestamp: new Date().toISOString(),
      safety: this.evolutionEngine.safetyController.getStatus(),
    };
    res.write(`event: connected\ndata: ${JSON.stringify(initial)}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'connected', data: initial, timestamp: new Date().toISOString() })}\n\n`);

    // Listen to evolution events
    const eventHandler = (eventName: string) => (data: any) => {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
      res.write(`data: ${JSON.stringify({ type: eventName, data, timestamp: new Date().toISOString() })}\n\n`);
    };

    const listeners: Array<{ event: string; fn: (data: any) => void }> = [
      { event: 'evolution.objective.created', fn: eventHandler('evolution.objective.created') },
      { event: 'evolution.objective.progress', fn: eventHandler('evolution.objective.progress') },
      { event: 'evolution.experiment.started', fn: eventHandler('evolution.experiment.started') },
      { event: 'evolution.experiment.phase', fn: eventHandler('evolution.experiment.phase') },
      { event: 'evolution.experiment.completed', fn: eventHandler('evolution.experiment.completed') },
      { event: 'evolution.supervisor.evaluated', fn: eventHandler('evolution.supervisor.evaluated') },
      { event: 'evolution.log', fn: eventHandler('evolution.log') },
      { event: 'evolution.safety.paused', fn: eventHandler('evolution.safety.paused') },
      { event: 'evolution.safety.resumed', fn: eventHandler('evolution.safety.resumed') },
      { event: 'evolution.safety.emergency_stopped', fn: eventHandler('evolution.safety.emergency_stopped') },
    ];

    const unbinds: Array<() => void> = [];
    if (this.eventBus) {
      for (const { event, fn } of listeners) {
        unbinds.push(this.eventBus.on(event as any, fn));
      }
    }

    req.on('close', () => {
      for (const unbind of unbinds) {
        unbind();
      }
    });
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
  }

  private parseJsonBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', reject);
    });
  }
}
