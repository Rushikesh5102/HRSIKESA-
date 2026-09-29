/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-16: Demonstration REST API Routes & SSE
 *
 * REST:
 *   POST   /api/demonstrations/start
 *   POST   /api/demonstrations/:id/pause
 *   POST   /api/demonstrations/:id/resume
 *   POST   /api/demonstrations/:id/stop
 *   POST   /api/demonstrations/:id/discard
 *   GET    /api/demonstrations
 *   GET    /api/demonstrations/:id
 *   GET    /api/demonstrations/:id/trace
 *   POST   /api/demonstrations/:id/action
 *   POST   /api/demonstrations/:id/checkpoint
 *   POST   /api/demonstrations/:id/annotate
 *   POST   /api/demonstrations/:id/correct
 *   POST   /api/demonstrations/:id/analyze
 *   GET    /api/demonstrations/:id/proposal
 *   POST   /api/demonstrations/:id/validate
 *   POST   /api/demonstrations/:id/approve
 *   POST   /api/demonstrations/:id/reject
 *   POST   /api/demonstrations/:id/save
 *   GET    /api/learned-procedures
 *   GET    /api/learned-procedures/:id
 *   GET    /api/learned-procedures/:id/versions
 *   GET    /api/demonstrations/events  (SSE)
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { DemonstrationFabric } from '../../demonstration/demonstration.fabric.js';
import { EventBus } from '../../core/events/event-bus.js';

export class DemonstrationRoutes {
  private sseClients: Set<{ res: ServerResponse }> = new Set();

  constructor(
    private readonly fabric: DemonstrationFabric,
    private readonly eventBus?: EventBus
  ) {
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.eventBus) return;
    const demonstrationEvents = [
      'demonstration.started', 'demonstration.paused', 'demonstration.resumed',
      'demonstration.stopped', 'demonstration.action_observed', 'demonstration.state_changed',
      'demonstration.checkpoint_added', 'demonstration.annotation_added',
      'demonstration.analyzing', 'demonstration.proposal_ready',
      'demonstration.validation_started', 'demonstration.validation_completed',
      'demonstration.awaiting_approval', 'demonstration.approved', 'demonstration.rejected',
      'demonstration.compiled', 'demonstration.execution_started',
      'demonstration.execution_completed', 'demonstration.execution_failed',
      'demonstration.archived', 'demonstration.correction_applied',
      'demonstration.sensitive_data_redacted',
    ];
    for (const eventType of demonstrationEvents) {
      (this.eventBus as any).on(eventType, (data: unknown) => {
        this.broadcastSse(eventType, data as Record<string, unknown>);
      });
    }
  }

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Normalize prefix
    if (pathname.startsWith('/demonstrations') || pathname.startsWith('/learned-procedures')) {
      pathname = '/api' + pathname;
    }

    if (!pathname.startsWith('/api/demonstrations') && !pathname.startsWith('/api/learned-procedures')) {
      return false;
    }

    try {
      // ─── SSE Stream ─────────────────────────────────────────────────────────
      if (method === 'GET' && pathname === '/api/demonstrations/events') {
        this.handleSse(req, res);
        return true;
      }

      // ─── POST /api/demonstrations/start ─────────────────────────────────────
      if (method === 'POST' && pathname === '/api/demonstrations/start') {
        const body = await this.readBody(req);
        if (!body.title || !body.objective) {
          return this.sendError(res, 400, 'title and objective are required');
        }
        const session = this.fabric.startSession({
          owner: body.owner || 'system',
          title: body.title,
          objective: body.objective,
          companyId: body.companyId,
          projectId: body.projectId,
          workspaceId: body.workspaceId,
          scope: body.scope,
          teachingMode: body.teachingMode,
          voiceAnnotationsEnabled: body.voiceAnnotationsEnabled,
          environment: body.environment,
        });
        return this.sendJson(res, 201, { session });
      }

      // ─── Individual session endpoints ────────────────────────────────────────
      const sessionMatch = pathname.match(/^\/api\/demonstrations\/([a-zA-Z0-9_-]+)(\/.*)?$/);
      if (sessionMatch) {
        const id = sessionMatch[1];
        const subpath = sessionMatch[2] || '';

        // POST /pause
        if (method === 'POST' && subpath === '/pause') {
          const session = this.fabric.pauseSession(id);
          return session ? this.sendJson(res, 200, { session }) : this.sendError(res, 404, 'Session not found or not recording');
        }
        // POST /resume
        if (method === 'POST' && subpath === '/resume') {
          const session = this.fabric.resumeSession(id);
          return session ? this.sendJson(res, 200, { session }) : this.sendError(res, 404, 'Session not found or not paused');
        }
        // POST /stop
        if (method === 'POST' && subpath === '/stop') {
          const session = this.fabric.stopSession(id);
          return session ? this.sendJson(res, 200, { session }) : this.sendError(res, 404, 'Session not found');
        }
        // POST /discard
        if (method === 'POST' && subpath === '/discard') {
          const ok = this.fabric.discardSession(id);
          return this.sendJson(res, 200, { discarded: ok });
        }
        // GET /trace
        if (method === 'GET' && subpath === '/trace') {
          const trace = this.fabric.getTrace(id);
          return this.sendJson(res, 200, { actions: trace, count: trace.length });
        }
        // POST /action
        if (method === 'POST' && subpath === '/action') {
          const body = await this.readBody(req);
          const action = this.fabric.recordAction(id, {
            actionType: body.actionType,
            semanticIntent: body.semanticIntent,
            source: body.source,
            confidence: body.confidence,
            application: body.application,
            environment: body.environment,
            target: body.target,
            parameters: body.parameters,
            resultingState: body.resultingState,
            dangerLevel: body.dangerLevel,
            isReversible: body.isReversible,
            precondition: body.precondition,
            verificationEvidence: body.verificationEvidence,
            teachingAnnotation: body.teachingAnnotation,
          });
          return action ? this.sendJson(res, 201, { action }) : this.sendError(res, 400, 'Cannot record action — session not recording');
        }
        // POST /checkpoint
        if (method === 'POST' && subpath === '/checkpoint') {
          const body = await this.readBody(req);
          const cp = this.fabric.addCheckpoint(id, body.label || 'Checkpoint', body.annotation);
          return cp ? this.sendJson(res, 201, { checkpoint: cp }) : this.sendError(res, 404, 'Session not found');
        }
        // POST /annotate
        if (method === 'POST' && subpath === '/annotate') {
          const body = await this.readBody(req);
          const action = this.fabric.addTeachingAnnotation(id, body.annotation, body.relatedActionId);
          return action ? this.sendJson(res, 201, { action }) : this.sendError(res, 400, 'Cannot annotate');
        }
        // POST /correct
        if (method === 'POST' && subpath === '/correct') {
          const body = await this.readBody(req);
          this.fabric.applyCorrection(id, body.actionId, {
            ignore: body.ignore,
            markImportant: body.markImportant,
            markOptional: body.markOptional,
            annotation: body.annotation,
          });
          return this.sendJson(res, 200, { ok: true });
        }
        // POST /analyze
        if (method === 'POST' && subpath === '/analyze') {
          const result = await this.fabric.analyze(id);
          if (result.rejection) return this.sendJson(res, 200, { status: 'REJECTED', rejection: result.rejection });
          return this.sendJson(res, 200, { status: 'PROPOSAL_READY', proposal: result.proposal });
        }
        // GET /proposal
        if (method === 'GET' && subpath === '/proposal') {
          const proposal = this.fabric.getProposal(id);
          return proposal ? this.sendJson(res, 200, { proposal }) : this.sendError(res, 404, 'No proposal found');
        }
        // POST /validate
        if (method === 'POST' && subpath === '/validate') {
          const proposal = this.fabric.getProposal(id);
          if (!proposal) return this.sendError(res, 404, 'No proposal found');
          const validation = this.fabric.validateProposal(proposal.id);
          return validation ? this.sendJson(res, 200, validation) : this.sendError(res, 404, 'Proposal not found');
        }
        // POST /approve
        if (method === 'POST' && subpath === '/approve') {
          const body = await this.readBody(req);
          const proposal = this.fabric.getProposal(id);
          if (!proposal) return this.sendError(res, 404, 'No proposal found');

          // Auto-validate if not validated yet
          if (proposal.status === 'DRAFT') {
            const validation = this.fabric.validateProposal(proposal.id);
            if (!validation?.isValid) return this.sendError(res, 400, 'Validation failed — cannot approve');
          }

          const result = this.fabric.approveProposal(proposal.id, { approvedBy: body.approvedBy, comment: body.comment });
          return result ? this.sendJson(res, 200, { result }) : this.sendError(res, 400, 'Cannot approve proposal in current status');
        }
        // POST /reject
        if (method === 'POST' && subpath === '/reject') {
          const body = await this.readBody(req);
          const proposal = this.fabric.getProposal(id);
          if (!proposal) return this.sendError(res, 404, 'No proposal found');
          const ok = this.fabric.rejectProposal(proposal.id, body.reason || 'Rejected by user', body.rejectedBy);
          return this.sendJson(res, 200, { rejected: ok });
        }
        // POST /save (alias for approve → compile)
        if (method === 'POST' && subpath === '/save') {
          const body = await this.readBody(req);
          const proposal = this.fabric.getProposal(id);
          if (!proposal) return this.sendError(res, 404, 'No proposal found');

          if (proposal.status === 'DRAFT') {
            const validation = this.fabric.validateProposal(proposal.id);
            if (!validation?.isValid) return this.sendError(res, 400, 'Validation failed');
          }

          const result = this.fabric.approveProposal(proposal.id, { approvedBy: body.approvedBy });
          return result ? this.sendJson(res, 200, { result }) : this.sendError(res, 400, 'Save failed');
        }

        // GET /api/demonstrations/:id
        if (method === 'GET' && subpath === '') {
          const session = this.fabric.getSession(id);
          return session ? this.sendJson(res, 200, { session }) : this.sendError(res, 404, 'Session not found');
        }
      }

      // ─── GET /api/demonstrations ─────────────────────────────────────────────
      if (method === 'GET' && pathname === '/api/demonstrations') {
        const url2 = new URL(req.url || '/', `http://localhost`);
        const sessions = this.fabric.listSessions({
          owner: url2.searchParams.get('owner') ?? undefined,
          companyId: url2.searchParams.get('companyId') ?? undefined,
          projectId: url2.searchParams.get('projectId') ?? undefined,
          status: url2.searchParams.get('status') as DemonstrationSession['status'] ?? undefined,
        });
        return this.sendJson(res, 200, { sessions, count: sessions.length });
      }

      // ─── Learned Procedures ───────────────────────────────────────────────────
      if (method === 'GET' && pathname === '/api/learned-procedures') {
        const url2 = new URL(req.url || '/', `http://localhost`);
        const procedures = this.fabric.listLearnedProcedures({
          scope: url2.searchParams.get('scope') ?? undefined,
          companyId: url2.searchParams.get('companyId') ?? undefined,
          projectId: url2.searchParams.get('projectId') ?? undefined,
        });
        return this.sendJson(res, 200, { procedures, count: procedures.length });
      }

      const lpMatch = pathname.match(/^\/api\/learned-procedures\/([a-zA-Z0-9_-]+)(\/.*)?$/);
      if (lpMatch) {
        const id = lpMatch[1];
        const subpath = lpMatch[2] || '';
        if (method === 'GET' && subpath === '/versions') {
          const versions = this.fabric.getLearnedProcedureVersions(id);
          return this.sendJson(res, 200, { versions, count: versions.length });
        }
        if (method === 'GET' && subpath === '') {
          const proc = this.fabric.getLearnedProcedure(id);
          return proc ? this.sendJson(res, 200, { procedure: proc }) : this.sendError(res, 404, 'Learned procedure not found');
        }
      }

      return false;
    } catch (err) {
      return this.sendError(res, 500, (err as Error).message);
    }
  }

  // ─── SSE ─────────────────────────────────────────────────────────────────────

  private handleSse(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': demonstration SSE connected\n\n');

    const client = { res };
    this.sseClients.add(client);

    req.on('close', () => { this.sseClients.delete(client); });
    req.on('error', () => { this.sseClients.delete(client); });
  }

  private broadcastSse(event: string, data: Record<string, unknown>): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try { client.res.write(message); } catch { this.sseClients.delete(client); }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async readBody(req: IncomingMessage): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}); }
        catch { resolve({}); }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): true {
    const json = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
    res.end(json);
    return true;
  }

  private sendError(res: ServerResponse, status: number, message: string): true {
    return this.sendJson(res, status, { error: message });
  }
}

import type { DemonstrationSession } from '../../demonstration/interfaces/demonstration.types.js';
