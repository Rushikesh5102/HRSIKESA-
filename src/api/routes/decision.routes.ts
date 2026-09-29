/**
 * HṚṢĪKEŚA (हृषीकेश) — Decision Intelligence REST API Routes & SSE Stream
 *
 * FP-18: Endpoints for ResearchCases, Candidates, Comparisons, DecisionBriefs,
 * DecisionRecords, Reviews, and Live SSE Telemetry.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { DecisionFabric } from '../../decision/decision.fabric.js';
import { EventBus } from '../../core/events/event-bus.js';

export class DecisionRoutes {
  private sseClients: Set<{ res: ServerResponse }> = new Set();

  constructor(
    private readonly fabric: DecisionFabric,
    private readonly eventBus?: EventBus
  ) {
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.eventBus) return;
    const researchEvents = [
      'research.started',
      'research.scoping',
      'research.source_found',
      'research.evidence_added',
      'research.claim_extracted',
      'research.contradiction_detected',
      'research.candidate_added',
      'research.analysis_started',
      'research.comparison_ready',
      'research.brief_ready',
      'research.awaiting_user',
      'research.completed',
      'research.failed',
    ];

    for (const evt of researchEvents) {
      this.eventBus.on(evt as any, (data: unknown) => {
        this.broadcastSse(evt, data as Record<string, unknown>);
      });
    }
  }

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Normalize /research/cases -> /api/research/cases, /decision/... -> /api/decision/...
    if (pathname.startsWith('/research/cases') || pathname.startsWith('/research/events')) {
      pathname = '/api' + pathname;
    } else if (pathname.startsWith('/decision/')) {
      pathname = '/api' + pathname;
    }

    if (!pathname.startsWith('/api/research/cases') && !pathname.startsWith('/api/research/events') && !pathname.startsWith('/api/decision')) {
      return false;
    }

    try {
      // ─── SSE Stream ─────────────────────────────────────────────────────────
      if (method === 'GET' && pathname === '/api/research/events') {
        this.handleSse(req, res);
        return true;
      }

      // ─── Research Cases Collection ──────────────────────────────────────────
      if (method === 'POST' && pathname === '/api/research/cases') {
        const body = (await this.readBody(req)) as Record<string, any>;
        if (!body.question) {
          return this.sendError(res, 400, 'Missing required field: question');
        }
        const rCase = this.fabric.createCase({
          owner: body.owner || 'rushikesh',
          question: body.question,
          objective: body.objective,
          scope: body.scope,
          depth: body.depth,
          companyId: body.companyId,
          projectId: body.projectId,
          criteria: body.criteria,
          constraints: body.constraints,
        });
        return this.sendJson(res, 201, { case: rCase });
      }

      if (method === 'GET' && pathname === '/api/research/cases') {
        const companyId = url.searchParams.get('companyId') || undefined;
        const projectId = url.searchParams.get('projectId') || undefined;
        const status = (url.searchParams.get('status') as any) || undefined;
        const cases = this.fabric.repository.listCases({ companyId, projectId, status });
        return this.sendJson(res, 200, { success: true, cases, count: cases.length });
      }

      // ─── Individual Case Operations ─────────────────────────────────────────
      const caseMatch = pathname.match(/^\/api\/research\/cases\/([a-zA-Z0-9_-]+)(\/.*)?$/);
      if (caseMatch) {
        const id = caseMatch[1];
        const subpath = caseMatch[2] || '';

        if (method === 'GET' && subpath === '') {
          const rCase = this.fabric.repository.getCaseById(id);
          return rCase ? this.sendJson(res, 200, { case: rCase }) : this.sendError(res, 404, 'Research case not found');
        }

        if (method === 'POST' && subpath === '/start') {
          const body = (await this.readBody(req)) as Record<string, any>;
          const rCase = await this.fabric.startCase(id, Boolean(body.requestedRecommendation));
          return this.sendJson(res, 200, { case: rCase });
        }

        if (method === 'POST' && subpath === '/pause') {
          this.fabric.pauseCase(id);
          const rCase = this.fabric.repository.getCaseById(id);
          return this.sendJson(res, 200, { success: true, case: rCase, status: 'AWAITING_USER' });
        }

        if (method === 'POST' && subpath === '/resume') {
          const rCase = await this.fabric.resumeCase(id);
          return this.sendJson(res, 200, { case: rCase });
        }

        if (method === 'POST' && subpath === '/cancel') {
          this.fabric.cancelCase(id);
          const rCase = this.fabric.repository.getCaseById(id);
          return this.sendJson(res, 200, { success: true, case: rCase, status: 'CANCELLED' });
        }

        if (method === 'GET' && subpath === '/candidates') {
          const candidates = this.fabric.repository.getCandidatesByCaseId(id);
          return this.sendJson(res, 200, { candidates, count: candidates.length });
        }

        if (method === 'POST' && subpath === '/candidates') {
          const body = (await this.readBody(req)) as Record<string, any>;
          const cand = this.fabric.addCandidate(id, body as any);
          return this.sendJson(res, 201, { candidate: cand });
        }

        if (method === 'GET' && subpath === '/claims') {
          const rCase = this.fabric.repository.getCaseById(id);
          return this.sendJson(res, 200, { claims: rCase?.claims || [], count: rCase?.claims.length || 0 });
        }

        if (method === 'POST' && subpath === '/claims') {
          const body = (await this.readBody(req)) as Record<string, any>;
          const claim = this.fabric.addClaim(id, body as any);
          return this.sendJson(res, 201, { claim });
        }

        if (method === 'GET' && subpath === '/comparison') {
          const comparison = this.fabric.repository.getComparisonByCaseId(id);
          return comparison
            ? this.sendJson(res, 200, { comparison })
            : this.sendError(res, 404, 'Comparison not found or not yet generated');
        }

        if (method === 'GET' && subpath === '/decision-brief') {
          const rCase = this.fabric.repository.getCaseById(id);
          return rCase?.decisionBrief
            ? this.sendJson(res, 200, { brief: rCase.decisionBrief })
            : this.sendError(res, 404, 'Decision Brief not found or not yet synthesized');
        }

        if (method === 'POST' && subpath === '/decision-brief/export') {
          const markdown = this.fabric.exportDecisionBriefArtifact(id);
          return this.sendJson(res, 200, { success: true, markdown });
        }

        if (method === 'POST' && subpath === '/propose-action') {
          const body = (await this.readBody(req)) as Record<string, any>;
          const plan = this.fabric.compileImplementationPlan(id, body.candidateId);
          return this.sendJson(res, 200, plan);
        }
      }

      // ─── Decision Records ───────────────────────────────────────────────────
      if (method === 'POST' && pathname === '/api/decision/records') {
        const body = (await this.readBody(req)) as Record<string, any>;
        if (!body.caseId || !body.objective || !body.approver || !body.selectedOption) {
          return this.sendError(res, 400, 'Missing required fields: caseId, objective, approver, selectedOption');
        }
        const record = this.fabric.recordDecision(body as any);
        return this.sendJson(res, 201, { record });
      }

      if (method === 'GET' && pathname === '/api/decision/records') {
        const companyId = url.searchParams.get('companyId') || undefined;
        const projectId = url.searchParams.get('projectId') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const records = this.fabric.repository.listDecisionRecords({ companyId, projectId, status });
        return this.sendJson(res, 200, { success: true, records, count: records.length });
      }

      const decMatch = pathname.match(/^\/api\/decision\/records\/([a-zA-Z0-9_-]+)(\/.*)?$/);
      if (decMatch) {
        const id = decMatch[1];
        const subpath = decMatch[2] || '';

        if (method === 'GET' && subpath === '') {
          const record = this.fabric.repository.getDecisionRecordById(id);
          return record ? this.sendJson(res, 200, { record }) : this.sendError(res, 404, 'Decision Record not found');
        }

        if (method === 'GET' && subpath === '/review') {
          const newCaseId = url.searchParams.get('newCaseId');
          if (!newCaseId) {
            return this.sendError(res, 400, 'Missing query parameter: newCaseId');
          }
          const review = this.fabric.reviewDecision(id, newCaseId);
          return this.sendJson(res, 200, { review });
        }

        if (method === 'POST' && subpath === '/review') {
          const body = (await this.readBody(req)) as Record<string, any>;
          if (!body.newCaseId) {
            return this.sendError(res, 400, 'newCaseId is required for review');
          }
          const review = this.fabric.reviewDecision(id, body.newCaseId);
          return this.sendJson(res, 200, { review });
        }
      }

      return false;
    } catch (err: any) {
      return this.sendError(res, 500, err?.message || 'Decision routes internal error');
    }
  }

  private handleSse(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
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

  private readBody(req: IncomingMessage): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  private sendJson(res: ServerResponse, status: number, payload: unknown): boolean {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
    return true;
  }

  private sendError(res: ServerResponse, status: number, message: string): boolean {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message, success: false }));
    return true;
  }
}
