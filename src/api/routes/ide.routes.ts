import { IncomingMessage, ServerResponse } from 'node:http';
import * as fs from 'node:fs';
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

      // Ensure active workspace exists (defaulting to current project root)
      let activeWs = this.ideFabric.getWorkspaceManager().getActiveWorkspace();
      if (!activeWs) {
        try {
          activeWs = await this.ideFabric.openWorkspace(process.cwd(), {
            name: 'HṚṢĪKEŚA Sovereign Workspace',
          });
        } catch {}
      }

      // 3. GET /api/ide/workspace/current
      if (method === 'GET' && pathname === '/api/ide/workspace/current') {
        this.sendJson(res, 200, { success: true, workspace: activeWs || null });
        return true;
      }

      // 4. GET /api/ide/files
      if (method === 'GET' && pathname === '/api/ide/files') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const subDir = url.searchParams.get('subDir') || '';
        const depth = parseInt(url.searchParams.get('depth') || url.searchParams.get('maxDepth') || '4', 10);
        const files = this.ideFabric.getWorkspaceManager().getFileTree(activeWs, subDir, depth);
        this.sendJson(res, 200, { success: true, files });
        return true;
      }

      // 5. GET /api/ide/file - Direct file read
      if (method === 'GET' && pathname === '/api/ide/file') {
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
        if (!fs.existsSync(safePath)) {
          this.sendJson(res, 404, { success: false, error: `File '${targetPath}' not found` });
          return true;
        }
        const content = fs.readFileSync(safePath, 'utf-8');
        this.sendJson(res, 200, { success: true, path: targetPath, content });
        return true;
      }

      // 5b. POST /api/ide/file - Direct file save
      if (method === 'POST' && pathname === '/api/ide/file') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        if (!body.path) {
          this.sendJson(res, 400, { success: false, error: 'path parameter is required' });
          return true;
        }
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, body.path);
        this.ideFabric.getEditorEngine().writeFile(safePath, body.content ?? '', true);
        this.sendJson(res, 200, { success: true, path: body.path });
        return true;
      }

      // 5c. POST /api/ide/file/view
      if (method === 'POST' && pathname === '/api/ide/file/view') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, body.filePath || body.path);
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
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, body.filePath || body.path);
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
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, body.filePath || body.path);
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
        this.sendJson(res, 200, { success: true, status: gitStatus, git: gitStatus });
        return true;
      }

      // 10a. GET /api/ide/git/diff
      if (method === 'GET' && pathname === '/api/ide/git/diff') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const filePath = url.searchParams.get('path');
        const diff = await this.ideFabric.getGitWorkspaceManager().getDiff(activeWs, filePath || undefined);
        this.sendJson(res, 200, { success: true, diff });
        return true;
      }

      // 10b. POST /api/ide/git/commit
      if (method === 'POST' && pathname === '/api/ide/git/commit') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        // Stage all files first
        await this.ideFabric.getTerminalManager().executeCommand(activeWs.rootPath, 'git add -A', 10000);
        const commitResult = await this.ideFabric.getGitWorkspaceManager().commit(
          activeWs,
          body.message || 'feat(ide): update files from sovereign IDE'
        );
        this.sendJson(res, 200, { success: true, commit: commitResult });
        return true;
      }

      // 10c. POST /api/ide/files/create
      if (method === 'POST' && pathname === '/api/ide/files/create') {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        if (!body.path) {
          this.sendJson(res, 400, { success: false, error: 'path is required' });
          return true;
        }
        const safePath = this.ideFabric.getWorkspaceManager().resolveSafePath(activeWs, body.path);
        if (body.type === 'directory') {
          fs.mkdirSync(safePath, { recursive: true });
        } else {
          const parent = safePath.substring(0, Math.max(safePath.lastIndexOf('/'), safePath.lastIndexOf('\\')));
          if (parent) fs.mkdirSync(parent, { recursive: true });
          fs.writeFileSync(safePath, body.content || '', 'utf-8');
        }
        this.sendJson(res, 200, { success: true, path: body.path });
        return true;
      }

      // 11. POST /api/ide/terminal/execute & /api/ide/execute
      if (method === 'POST' && (pathname === '/api/ide/terminal/execute' || pathname === '/api/ide/execute')) {
        if (!activeWs) {
          this.sendJson(res, 400, { success: false, error: 'No active workspace open' });
          return true;
        }
        const body = await this.parseJsonBody(req);
        const cmd = body.commandLine || body.command;
        const result = await this.ideFabric.getTerminalManager().executeCommand(
          activeWs.rootPath,
          cmd,
          body.timeoutMs || 60000,
          body.terminalId
        );
        this.sendJson(res, 200, {
          success: true,
          result,
          output: result.output,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
        });
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
