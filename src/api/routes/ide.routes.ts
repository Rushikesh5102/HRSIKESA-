/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal IDE & Development Workspace REST API Endpoints
 *
 * FP-09: Exposes complete IDE control plane over HTTP REST.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { IdeFabric } from '../../ide/ide.fabric.js';

export class IdeRoutes {
  private readonly ideFabric: IdeFabric;

  constructor(ideFabric: IdeFabric) {
    this.ideFabric = ideFabric;
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase();

    if (!pathname.startsWith('/api/ide')) {
      return false;
    }

    try {
      // 1. GET /api/ide/workspaces
      if (method === 'GET' && pathname === '/api/ide/workspaces') {
        const list = this.ideFabric.getRepository().listWorkspaces();
        this.sendJson(res, 200, { success: true, workspaces: list });
        return true;
      }

      // 2. POST /api/ide/workspace/open
      if (method === 'POST' && pathname === '/api/ide/workspace/open') {
        const body = await this.parseJsonBody(req);
        if (!body.rootPath) {
          this.sendJson(res, 400, { success: false, error: 'rootPath is required' });
          return true;
        }
        const ws = await this.ideFabric.openWorkspace(body.rootPath, {
          name: body.name,
          companyId: body.companyId,
          projectId: body.projectId,
        });
        this.sendJson(res, 200, { success: true, workspace: ws });
        return true;
      }

      // 3. GET /api/ide/workspace/current
      if (method === 'GET' && pathname === '/api/ide/workspace/current') {
        const current = this.ideFabric.getWorkspaceManager().getActiveWorkspace();
        this.sendJson(res, 200, { success: true, workspace: current || null });
        return true;
      }

      const activeWs = this.ideFabric.getWorkspaceManager().getActiveWorkspace();

      // 4. GET /api/ide/files
      if (method === 'GET' && pathname === '/api/ide/files') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const subDir = url.searchParams.get('subDir') || '';
        const depth = parseInt(url.searchParams.get('depth') || '4', 10);
        const files = this.ideFabric.getWorkspaceManager().getFileTree(activeWs, subDir, depth);
        this.sendJson(res, 200, { success: true, files });
        return true;
      }

      // 5. POST /api/ide/file/view
      if (method === 'POST' && pathname === '/api/ide/file/view') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, body.filePath);
        const slice = this.ideFabric.getEditorEngine().viewFile(
          safePath,
          body.startLine,
          body.endLine,
          body.offsetBytes
        );
        this.sendJson(res, 200, { success: true, slice });
        return true;
      }

      // 6. POST /api/ide/file/write
      if (method === 'POST' && pathname === '/api/ide/file/write') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, body.filePath);
        this.ideFabric.getEditorEngine().writeFile(safePath, body.content ?? '', body.overwrite ?? false);
        this.sendJson(res, 200, { success: true, path: safePath });
        return true;
      }

      // 7. POST /api/ide/file/replace
      if (method === 'POST' && pathname === '/api/ide/file/replace') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, body.filePath);
        const resEdit = this.ideFabric.getEditorEngine().replaceContent(
          safePath,
          body.targetContent,
          body.replacementContent,
          body.startLine,
          body.endLine,
          body.allowMultiple ?? false
        );
        this.sendJson(res, 200, { success: true, diff: resEdit.diff });
        return true;
      }

      // 8. POST /api/ide/search
      if (method === 'POST' && pathname === '/api/ide/search') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const matches = this.ideFabric.getCodeSearchEngine().searchWorkspace(activeWs, {
          query: body.query || '',
          isRegex: body.isRegex,
          caseSensitive: body.caseSensitive,
          maxResults: body.maxResults,
        });
        this.sendJson(res, 200, { success: true, matches });
        return true;
      }

      // 9. GET /api/ide/symbols
      if (method === 'GET' && pathname === '/api/ide/symbols') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const targetPath = url.searchParams.get('path');
        if (!targetPath) {
          this.sendJson(res, 400, { success: false, error: 'path parameter is required' });
          return true;
        }
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, targetPath);
        const symbols = this.ideFabric.getCodeSearchEngine().extractSymbols(safePath);
        this.sendJson(res, 200, { success: true, symbols });
        return true;
      }

      // 10. GET /api/ide/git/status
      if (method === 'GET' && pathname === '/api/ide/git/status') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const gitStatus = await this.ideFabric.getGitWorkspaceManager().getStatus(activeWs);
        this.sendJson(res, 200, { success: true, git: gitStatus });
        return true;
      }

      // 11. POST /api/ide/terminal/execute
      if (method === 'POST' && pathname === '/api/ide/terminal/execute') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const result = await this.ideFabric.getTerminalManager().executeCommand(
          activeWs.rootPath,
          body.commandLine,
          body.timeoutMs || 30000,
          body.terminalId
        );
        this.sendJson(res, 200, { success: true, result });
        return true;
      }

      // 12. POST /api/ide/preview/start
      if (method === 'POST' && pathname === '/api/ide/preview/start') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const server = await this.ideFabric.getPreviewManager().startPreviewServer(
          activeWs,
          body.devCommand,
          body.preferredPort
        );
        this.sendJson(res, 200, { success: true, preview: server });
        return true;
      }

      // 13. POST /api/ide/verify/run
      if (method === 'POST' && pathname === '/api/ide/verify/run') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const run = await this.ideFabric.getVerificationLoopEngine().executeLoop({
          workspace: activeWs,
          objective: body.objective || 'Autonomous verification pass',
          buildCommand: body.buildCommand,
          testCommand: body.testCommand,
          maxIterations: body.maxIterations || 2,
        });
        this.sendJson(res, 200, { success: true, run });
        return true;
      }

      return false;
    } catch (err: any) {
      this.sendJson(res, 500, { success: false, error: err.message });
      return true;
    }
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.statusCode = status;
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(data));
  }

  private async parseJsonBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Invalid JSON request body'));
        }
      });
      req.on('error', reject);
    });
  }
}
