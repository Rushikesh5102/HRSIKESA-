import { IncomingMessage, ServerResponse } from 'node:http';
import { UniversalAgenticMissionRuntime } from '../../mission/mission.runtime.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { MissionRuntimeEventTopics } from '../../mission/types/index.js';

export class MissionRoutes {
  private readonly runtime: UniversalAgenticMissionRuntime;
  private readonly logger?: ILogger;
  private readonly sseClients: Set<ServerResponse> = new Set();

  constructor(runtime: UniversalAgenticMissionRuntime, logger?: ILogger, eventBus?: EventBus) {
    this.runtime = runtime;
    this.logger = logger?.child('MissionRoutes');
    if (eventBus) {
      this.bindEvents(eventBus);
    }
  }

  private bindEvents(eventBus: EventBus): void {
    const topics = Object.values(MissionRuntimeEventTopics);
    for (const topic of topics) {
      eventBus.subscribe(topic as any, (event: any) => {
        this.broadcastSse({
          event: topic,
          data: event?.payload || event,
          timestamp: event?.timestamp || new Date().toISOString()
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

  private async parseBody<T>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : ({} as T));
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method?.toUpperCase() || 'GET';

    if (!pathname.startsWith('/api/missions')) {
      return false;
    }

    try {
      // 1. SSE Stream
      if (pathname === '/api/missions/events/stream' && method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        });
        this.sseClients.add(res);
        req.on('close', () => this.sseClients.delete(res));
        return true;
      }

      // 2. Workforce capacities
      if (pathname === '/api/missions/workforce/capacities' && method === 'GET') {
        const capacities = this.runtime.getWorkforceCapacities();
        this.sendJson(res, 200, { success: true, data: capacities });
        return true;
      }

      // 3. List missions
      if (pathname === '/api/missions' && method === 'GET') {
        const missions = this.runtime.listMissions();
        this.sendJson(res, 200, { success: true, data: missions });
        return true;
      }

      // 4. Submit objective (natural language mission compilation & execution)
      if (pathname === '/api/missions' && method === 'POST') {
        const body = await this.parseBody<{
          objective: string;
          owner?: string;
          companyId?: string;
          projectId?: string;
          priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          autoStart?: boolean;
        }>(req);

        if (!body.objective) {
          this.sendJson(res, 400, { success: false, error: 'objective is required' });
          return true;
        }

        const result = await this.runtime.submitObjective(body.objective, body);
        this.sendJson(res, 201, { success: true, data: result });
        return true;
      }

      // Sub-resource routing: /api/missions/:id/*
      const missionIdMatch = pathname.match(/^\/api\/missions\/([^/]+)(?:\/([^/]+))?$/);
      if (missionIdMatch) {
        const missionId = missionIdMatch[1];
        const action = missionIdMatch[2];

        if (!action) {
          if (method === 'GET') {
            const mission = this.runtime.getMission(missionId);
            if (!mission) {
              this.sendJson(res, 404, { success: false, error: 'Mission not found' });
              return true;
            }
            this.sendJson(res, 200, { success: true, data: mission });
            return true;
          }
        }

        if (action === 'start' && method === 'POST') {
          const mission = await this.runtime.startMission(missionId);
          this.sendJson(res, 200, { success: true, data: mission });
          return true;
        }

        if (action === 'pause' && method === 'POST') {
          const body = await this.parseBody<{ reason?: string }>(req);
          const mission = this.runtime.pauseMission(missionId, body.reason);
          this.sendJson(res, 200, { success: true, data: mission });
          return true;
        }

        if (action === 'resume' && method === 'POST') {
          const mission = await this.runtime.resumeMission(missionId);
          this.sendJson(res, 200, { success: true, data: mission });
          return true;
        }

        if (action === 'cancel' && method === 'POST') {
          const body = await this.parseBody<{ reason?: string }>(req);
          const mission = this.runtime.cancelMission(missionId, body.reason);
          this.sendJson(res, 200, { success: true, data: mission });
          return true;
        }

        if (action === 'replan' && method === 'POST') {
          const body = await this.parseBody<{ reason: string; author?: string }>(req);
          if (!body.reason) {
            this.sendJson(res, 400, { success: false, error: 'reason is required for replan' });
            return true;
          }
          const result = this.runtime.replanMission(missionId, body.reason, body.author);
          this.sendJson(res, 200, { success: true, data: result });
          return true;
        }

        if (action === 'approve' && method === 'POST') {
          const body = await this.parseBody<{ taskId: string; approvedBy?: string }>(req);
          if (!body.taskId) {
            this.sendJson(res, 400, { success: false, error: 'taskId is required for approval' });
            return true;
          }
          await this.runtime.approveTask(missionId, body.taskId, body.approvedBy);
          this.sendJson(res, 200, { success: true, message: 'Task approved and resumed' });
          return true;
        }

        if (action === 'outcomes' && method === 'GET') {
          const outcomes = this.runtime.getOutcomes(missionId);
          this.sendJson(res, 200, { success: true, data: outcomes });
          return true;
        }

        if (action === 'tasks' && method === 'GET') {
          const tasks = this.runtime.getTasks(missionId);
          this.sendJson(res, 200, { success: true, data: tasks });
          return true;
        }

        if (action === 'artifacts' && method === 'GET') {
          const artifacts = this.runtime.getArtifacts(missionId);
          this.sendJson(res, 200, { success: true, data: artifacts });
          return true;
        }

        if (action === 'blackboard' && method === 'GET') {
          const entries = this.runtime.getBlackboard(missionId);
          this.sendJson(res, 200, { success: true, data: entries });
          return true;
        }

        if (action === 'report' && method === 'GET') {
          const report = this.runtime.getMissionReport(missionId);
          this.sendJson(res, 200, { success: true, data: report });
          return true;
        }
      }

      this.sendJson(res, 404, { success: false, error: 'Endpoint not found' });
      return true;
    } catch (err) {
      this.logger?.error('Error handling mission route', { error: String(err) });
      this.sendJson(res, 500, { success: false, error: err instanceof Error ? err.message : String(err) });
      return true;
    }
  }
}
