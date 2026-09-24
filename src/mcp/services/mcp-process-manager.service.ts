/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Process & Connection Manager Service
 *
 * Phase 21: STDIO Process management, health monitoring, bounded auto-restart,
 * and ResourceGovernor memory pressure integration.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ResourceGovernor } from '../../core/hardware/resource.governor.js';
import { MCPServer } from '../interfaces/mcp.types.js';
import { MCPServerRepository } from '../repositories/mcp-server.repository.js';
import { IMcpTransport, McpTransportFactory } from './mcp-transport.factory.js';
import { MCPClientService } from './mcp-client.service.js';

interface ManagedProcess {
  server: MCPServer;
  transport: IMcpTransport;
  client: MCPClientService;
  startedAt: number;
  pid?: number;
  restartCount: number;
}

export class MCPProcessManager {
  private readonly activeProcesses = new Map<string, ManagedProcess>();
  private readonly serverRepo: MCPServerRepository;
  private readonly governor?: ResourceGovernor;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly MAX_RESTARTS = 3;

  constructor(
    serverRepo: MCPServerRepository,
    governor?: ResourceGovernor,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.serverRepo = serverRepo;
    this.governor = governor;
    this.eventBus = eventBus;
    this.logger = logger?.child('MCPProcessManager');
  }

  /**
   * Starts or attaches to an authorized MCP server process.
   */
  public async startServer(
    server: MCPServer,
    inMemoryHandler?: (req: any) => Promise<any>
  ): Promise<{ client: MCPClientService; pid?: number }> {
    if (this.activeProcesses.has(server.id)) {
      const existing = this.activeProcesses.get(server.id)!;
      if (existing.transport.isConnected() && !inMemoryHandler) {
        return { client: existing.client, pid: existing.pid };
      }
      if (inMemoryHandler) {
        await this.stopServer(server.id, 'Switching in-memory handler');
      }
    }

    // Check resource governor pressure for external child processes
    if (this.governor && server.transport === 'stdio') {
      const metrics = this.governor.getMetrics();
      if (metrics.pressureLevel === 'CRITICAL_MEMORY') {
        this.logger?.warn(`Cannot start MCP server '${server.name}': System is under CRITICAL_MEMORY pressure (${metrics.freeMemoryGb} GB free).`);
        throw new Error(`MCP process launch deferred: Host system under CRITICAL_MEMORY pressure.`);
      }
    }

    const transport = McpTransportFactory.create(server, inMemoryHandler);
    const client = new MCPClientService(server, transport, this.logger);

    try {
      await client.connect();
      const pid = transport.getPid ? transport.getPid() : undefined;

      const managed: ManagedProcess = {
        server,
        transport,
        client,
        startedAt: Date.now(),
        pid,
        restartCount: server.restartCount || 0,
      };

      this.activeProcesses.set(server.id, managed);
      this.serverRepo.update(server.id, {
        pid,
        health: 'HEALTHY',
        lastCheckedAt: new Date().toISOString(),
      });

      this.eventBus?.emit('mcp.server.started', { serverId: server.id, name: server.name, pid });
      this.logger?.info(`Started MCP server '${server.name}' (PID: ${pid || 'N/A'})`);

      return { client, pid };
    } catch (err: any) {
      this.logger?.error(`Failed to start MCP server '${server.name}': ${err.message}`);
      this.serverRepo.updateStatus(server.id, 'FAILED', 'CRASHED', err.message);
      this.eventBus?.emit('mcp.server.crashed', { serverId: server.id, name: server.name, error: err.message });
      throw err;
    }
  }

  /**
   * Handles server crash events and enforces bounded restart policy.
   */
  public async handleCrash(serverId: string, reason: string, _customTransport?: IMcpTransport): Promise<void> {
    const server = this.serverRepo.findById(serverId);
    if (!server) return;

    const currentRestarts = (server.restartCount || 0) + 1;
    this.serverRepo.update(serverId, { restartCount: currentRestarts });

    if (currentRestarts >= this.MAX_RESTARTS) {
      this.logger?.error(`Server '${server.name}' crashed ${currentRestarts} times. Marking DEGRADED.`);
      this.serverRepo.updateStatus(serverId, 'DEGRADED', 'DEGRADED', reason);
      this.eventBus?.emit('mcp.server.crashed', { serverId, name: server.name, error: reason });
      return;
    }

    this.serverRepo.updateStatus(serverId, 'ACTIVE', 'DEGRADED', reason);
    this.eventBus?.emit('mcp.server.crashed', { serverId, name: server.name, error: reason });
  }

  /**
   * Stops a running MCP server process gracefully.
   */
  public async stopServer(serverId: string, reason?: string): Promise<boolean> {
    const managed = this.activeProcesses.get(serverId);
    if (!managed) return false;

    try {
      await managed.client.disconnect();
    } catch (err: any) {
      this.logger?.warn(`Error during disconnect of MCP server '${managed.server.name}': ${err.message}`);
    }

    this.activeProcesses.delete(serverId);
    this.serverRepo.update(serverId, {
      pid: undefined,
      health: 'DISABLED',
      lastCheckedAt: new Date().toISOString(),
    });

    this.eventBus?.emit('mcp.server.stopped', { serverId, name: managed.server.name, reason });
    this.logger?.info(`Stopped MCP server '${managed.server.name}'`);
    return true;
  }

  /**
   * Restarts an active MCP server with bounded retry policy.
   */
  public async restartServer(serverId: string): Promise<{ client: MCPClientService; pid?: number }> {
    const server = this.serverRepo.findById(serverId);
    if (!server) {
      throw new Error(`MCP server '${serverId}' not found.`);
    }

    if (server.restartCount >= this.MAX_RESTARTS) {
      this.logger?.error(`Max restart limit (${this.MAX_RESTARTS}) reached for MCP server '${server.name}'. Marking DEGRADED.`);
      this.serverRepo.updateStatus(serverId, 'DEGRADED', 'DEGRADED', `Exceeded maximum restart limit (${this.MAX_RESTARTS}).`);
      throw new Error(`MCP server '${server.name}' exceeded maximum restart threshold.`);
    }

    await this.stopServer(serverId, 'Restart requested');
    const newCount = (server.restartCount || 0) + 1;
    this.serverRepo.update(serverId, { restartCount: newCount });

    const updatedServer = this.serverRepo.findById(serverId)!;
    return this.startServer(updatedServer);
  }

  /**
   * Retrieves the active client for a running server.
   */
  public getClient(serverId: string): MCPClientService | undefined {
    return this.activeProcesses.get(serverId)?.client;
  }

  public isRunning(serverId: string): boolean {
    const managed = this.activeProcesses.get(serverId);
    return Boolean(managed && managed.transport.isConnected());
  }

  public isServerRunning(serverId: string): boolean {
    return this.isRunning(serverId);
  }

  public listActiveProcesses(): Array<{ serverId: string; pid?: number; startedAt: number }> {
    const list: Array<{ serverId: string; pid?: number; startedAt: number }> = [];
    for (const [serverId, proc] of this.activeProcesses) {
      list.push({ serverId, pid: proc.pid, startedAt: proc.startedAt });
    }
    return list;
  }

  /**
   * Shuts down all active MCP processes cleanly.
   */
  public async shutdownAll(): Promise<void> {
    this.logger?.info(`Shutting down all active MCP processes (${this.activeProcesses.size})...`);
    for (const [id] of this.activeProcesses) {
      await this.stopServer(id, 'System shutdown');
    }
  }

  public getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }
}
