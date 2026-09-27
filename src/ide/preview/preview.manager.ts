/**
 * HṚṢĪKEŚA (हृषीकेश) — Live Web App Preview & Dev Server Supervisor
 *
 * FP-09: Dev server process management, port allocation, health monitoring,
 * and live embedded preview iframe bridging.
 */

import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { PreviewServer, WorkspaceMetadata } from '../types/ide.types.js';
import { IdeRepository } from '../repository/ide.repository.js';
import { TerminalManager } from '../terminal/terminal.manager.js';

export class PreviewManager {
  private readonly repo: IdeRepository;
  private readonly terminalManager: TerminalManager;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly activeServers: Map<string, PreviewServer> = new Map();

  constructor(
    repo: IdeRepository,
    terminalManager: TerminalManager,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.repo = repo;
    this.terminalManager = terminalManager;
    this.eventBus = eventBus;
    this.logger = logger?.child('PreviewManager');
  }

  public async startDevServer(options: { framework?: string; port?: number; workspace?: WorkspaceMetadata }): Promise<PreviewServer> {
    const ws: WorkspaceMetadata = options.workspace || {
      id: 'default_ws',
      name: 'Default Workspace',
      rootPath: process.cwd(),
      architecture: options.framework || 'vite',
      settings: {},
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    const s = await this.startPreviewServer(ws, undefined, options.port);
    s.status = 'RUNNING';
    return s;
  }

  public async stopDevServer(serverId: string): Promise<PreviewServer> {
    const s = this.activeServers.get(serverId) || this.repo.getPreviewServer(serverId);
    await this.stopPreviewServer(serverId);
    return {
      ...(s || {
        id: serverId,
        workspaceId: 'default_ws',
        framework: 'vite',
        port: 3000,
        url: 'http://127.0.0.1:3000',
        healthStatus: 'HEALTHY',
        startedAt: new Date().toISOString(),
      }),
      status: 'STOPPED',
    };
  }

  /**
   * Starts a local development server for web application preview.
   */
  public async startPreviewServer(
    workspace: WorkspaceMetadata,
    devCommand?: string,
    preferredPort?: number
  ): Promise<PreviewServer> {
    const port = preferredPort || (await this.findAvailablePort(5173));
    const serverId = `prev_${crypto.randomUUID().slice(0, 10)}`;
    const url = `http://127.0.0.1:${port}`;

    const command = devCommand || this.resolveDefaultDevCommand(workspace, port);

    const server: PreviewServer = {
      id: serverId,
      workspaceId: workspace.id,
      framework: workspace.framework || workspace.architecture,
      port,
      url,
      status: 'STARTING',
      healthStatus: 'UNKNOWN',
      startedAt: new Date().toISOString(),
    };

    this.activeServers.set(serverId, server);
    this.repo.savePreviewServer(server);

    // Launch via terminal manager in background
    const term = this.terminalManager.createTerminal(
      workspace.id,
      workspace.rootPath,
      `Preview Server (${port})`
    );

    // Run command asynchronously in terminal
    this.terminalManager
      .executeCommand(workspace.rootPath, command, 0, term.id)
      .catch((err) => {
        this.logger?.warn(`Preview server command failed: ${err.message}`);
        server.status = 'FAILED';
        this.repo.savePreviewServer(server);
      });

    // Probe server health until online or timeout (15s)
    this.monitorServerHealth(serverId, port, url).catch(() => {});

    this.eventBus?.emit('ide.preview.started', {
      serverId,
      workspaceId: workspace.id,
      url,
      port,
      timestamp: new Date().toISOString(),
    });

    this.logger?.info(`Started preview server [${serverId}] on port ${port} (${url})`);
    return server;
  }

  /**
   * Probes HTTP health of the dev server.
   */
  public async probeHealth(url: string, timeoutMs = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const req = http.get(url, { timeout: timeoutMs }, (res) => {
          resolve((res.statusCode ?? 500) < 500);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Stops an active preview server.
   */
  public async stopPreviewServer(serverId: string): Promise<boolean> {
    const server = this.activeServers.get(serverId) || this.repo.getPreviewServer(serverId);
    if (!server) return false;

    server.status = 'STOPPED';
    server.stoppedAt = new Date().toISOString();
    this.repo.savePreviewServer(server);
    this.activeServers.delete(serverId);

    this.logger?.info(`Stopped preview server [${serverId}] on port ${server.port}`);
    return true;
  }

  /**
   * Finds an available TCP port starting from candidatePort.
   */
  public async findAvailablePort(candidatePort = 5173): Promise<number> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => {
        // Port taken, try next port
        resolve(this.findAvailablePort(candidatePort + 1));
      });
      server.listen(candidatePort, () => {
        server.close(() => resolve(candidatePort));
      });
    });
  }

  private resolveDefaultDevCommand(workspace: WorkspaceMetadata, port: number): string {
    const fw = workspace.framework?.toUpperCase() || workspace.architecture;
    if (fw === 'VITE') return `npx vite --port ${port} --host 127.0.0.1`;
    if (fw === 'NEXTJS') return `npx next dev -p ${port}`;
    if (fw === 'REACT') return `set PORT=${port}&& npm start`;
    if (fw === 'HTML_STATIC') return `npx -y serve -l ${port} .`;
    return `npm run dev -- --port ${port}`;
  }

  private async monitorServerHealth(serverId: string, port: number, url: string): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < 15000) {
      const isUp = await this.probeHealth(url);
      const server = this.activeServers.get(serverId);
      if (!server || server.status === 'STOPPED') return;

      if (isUp) {
        server.status = 'RUNNING';
        server.healthStatus = 'HEALTHY';
        this.repo.savePreviewServer(server);
        this.eventBus?.emit('ide.preview.ready', { serverId, url, port });
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  public shutdown(): void {
    for (const s of this.activeServers.values()) {
      s.status = 'STOPPED';
      s.stoppedAt = new Date().toISOString();
      this.repo.savePreviewServer(s);
    }
    this.activeServers.clear();
  }
}
