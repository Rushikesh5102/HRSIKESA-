/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Capability Discovery Service
 *
 * Phase 21: Discovers and extracts tools, resources, and prompts from live MCP servers,
 * persists catalog metadata, and generates preview documents.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import {
  MCPServer,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPDiscoveryPreview,
} from '../interfaces/mcp.types.js';
import { MCPServerRepository } from '../repositories/mcp-server.repository.js';
import { MCPToolRepository } from '../repositories/mcp-tool.repository.js';
import { MCPResourceRepository } from '../repositories/mcp-resource.repository.js';
import { MCPPromptRepository } from '../repositories/mcp-prompt.repository.js';
import { MCPSecurityValidator } from './mcp-security-validator.service.js';
import { MCPProcessManager } from './mcp-process-manager.service.js';
import { MCPCapabilityAdapter } from './mcp-capability-adapter.service.js';
import { MCPSecurityRepository } from '../repositories/mcp-security.repository.js';
import { McpTransportFactory } from './mcp-transport.factory.js';
import { MCPClientService } from './mcp-client.service.js';

export class MCPCapabilityDiscovery {
  private readonly serverRepo: MCPServerRepository;
  private readonly toolRepo: MCPToolRepository;
  private readonly resRepo: MCPResourceRepository;
  private readonly promptRepo: MCPPromptRepository;
  private readonly secRepo: MCPSecurityRepository;
  private readonly validator: MCPSecurityValidator;
  private readonly processManager: MCPProcessManager;
  private readonly adapter?: MCPCapabilityAdapter;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(
    serverRepo: MCPServerRepository,
    toolRepo: MCPToolRepository,
    resRepo: MCPResourceRepository,
    promptRepo: MCPPromptRepository,
    secRepo: MCPSecurityRepository,
    validator: MCPSecurityValidator,
    processManager: MCPProcessManager,
    adapter?: MCPCapabilityAdapter,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.serverRepo = serverRepo;
    this.toolRepo = toolRepo;
    this.resRepo = resRepo;
    this.promptRepo = promptRepo;
    this.secRepo = secRepo;
    this.validator = validator;
    this.processManager = processManager;
    this.adapter = adapter;
    this.eventBus = eventBus;
    this.logger = logger?.child('MCPCapabilityDiscovery');
  }

  /**
   * Discovers and indexes all capabilities from a running or registered MCP server.
   */
  public async discover(
    serverId: string,
    inMemoryHandler?: (req: any) => Promise<any>
  ): Promise<{
    tools: MCPTool[];
    resources: MCPResource[];
    prompts: MCPPrompt[];
  }> {
    const server = this.serverRepo.findById(serverId);
    if (!server) {
      throw new Error(`MCP server '${serverId}' not found.`);
    }

    this.logger?.info(`Starting capability discovery for MCP server '${server.name}'...`);
    const { client } = await this.processManager.startServer(server, inMemoryHandler);

    // 1. Discover Tools
    const discoveredTools = await client.listTools();
    const persistedTools: MCPTool[] = [];

    for (const tool of discoveredTools) {
      const riskLevel = this.validator.classifyToolRisk(tool);
      const sanitizedDesc = this.validator.sanitizeContent(tool.description);

      const registered = this.toolRepo.registerTool({
        id: tool.id,
        serverId: server.id,
        name: tool.name,
        displayName: tool.displayName,
        description: sanitizedDesc,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        riskLevel,
        requiredPermissions: tool.requiredPermissions,
        networkRequirement: tool.networkRequirement,
        filesystemRequirement: tool.filesystemRequirement,
        credentialRequirement: tool.credentialRequirement,
        enabled: true,
        verified: true,
        isDestructive: tool.isDestructive,
      });

      persistedTools.push(registered);

      // Bind capability mapping
      const capId = `mcp.${server.name}.${tool.name}`;
      this.toolRepo.bindCapability({
        serverId: server.id,
        toolId: registered.id,
        capabilityId: capId,
        scope: 'GLOBAL',
      });

      // Register with ToolRegistry & CapabilityRegistry if adapter available
      if (this.adapter && server.authorized) {
        this.adapter.registerWithEcosystem(registered, server);
      }

      this.eventBus?.emit('capability.discovered', {
        capabilityId: capId,
        provider: `MCP Server: ${server.name}`,
        serverId: server.id,
      });
    }

    // 2. Discover Resources
    const discoveredResources = await client.listResources();
    const persistedResources: MCPResource[] = [];

    for (const res of discoveredResources) {
      const registered = this.resRepo.registerResource({
        id: res.id,
        serverId: server.id,
        uri: res.uri,
        name: res.name,
        description: res.description,
        mimeType: res.mimeType,
        sensitivity: res.sensitivity,
        accessPolicy: res.accessPolicy,
      });
      persistedResources.push(registered);
    }

    // 3. Discover Prompts
    const discoveredPrompts = await client.listPrompts();
    const persistedPrompts: MCPPrompt[] = [];

    for (const prompt of discoveredPrompts) {
      const sanitizedDesc = this.validator.sanitizeContent(prompt.description || '');
      const registered = this.promptRepo.registerPrompt({
        id: prompt.id,
        serverId: server.id,
        name: prompt.name,
        description: sanitizedDesc,
        arguments: prompt.arguments as any,
        riskLevel: prompt.riskLevel,
      });
      persistedPrompts.push(registered);
    }

    this.logger?.info(
      `Discovered capabilities for '${server.name}': ${persistedTools.length} tools, ${persistedResources.length} resources, ${persistedPrompts.length} prompts.`
    );

    return {
      tools: persistedTools,
      resources: persistedResources,
      prompts: persistedPrompts,
    };
  }

  /**
   * Generates a preview document for a discovered or prospective server.
   */
  public async generatePreview(
    target: string | Partial<MCPServer>,
    inMemoryHandler?: (req: any) => Promise<any>
  ): Promise<MCPDiscoveryPreview> {
    if (typeof target === 'string') {
      const server = this.serverRepo.findById(target);
      if (!server) {
        throw new Error(`MCP server '${target}' not found.`);
      }

      const tools = this.toolRepo.listTools(target);
      const resources = this.resRepo.listResources(target);
      const prompts = this.promptRepo.listPrompts(target);
      const securityReview = this.secRepo.getLatestReview(target) || this.validator.inspectServer(server);

      return {
        serverId: server.id,
        serverName: server.name,
        server: {
          name: server.name,
          displayName: server.displayName,
          description: server.description,
          version: server.version,
          transport: server.transport,
          source: server.source,
          repositoryUrl: server.repositoryUrl,
          license: server.license,
        },
        tools,
        resources,
        prompts,
        securityReview,
        requiredCapabilities: Array.from(new Set(tools.flatMap((t) => t.requiredPermissions))),
      };
    } else {
      const securityReview = this.validator.inspectServer(target);
      let tools: MCPTool[] = [];
      let resources: MCPResource[] = [];
      let prompts: MCPPrompt[] = [];

      if (inMemoryHandler) {
        const dummyServer: MCPServer = {
          id: 'preview-temp-id',
          name: target.name || 'preview-server',
          displayName: target.displayName || target.name || 'Preview Server',
          description: target.description || '',
          version: target.version || '1.0.0',
          transport: target.transport || 'in-memory',
          status: 'DISCOVERED',
          trustLevel: 'UNKNOWN',
          source: target.source || 'LOCAL',
          license: target.license || 'UNKNOWN',
          enabled: false,
          authorized: false,
          health: 'NOT_CONFIGURED',
          restartCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const transport = McpTransportFactory.create(dummyServer, inMemoryHandler);
        const client = new MCPClientService(dummyServer, transport, this.logger);
        await client.connect();
        tools = await client.listTools();
        resources = await client.listResources();
        prompts = await client.listPrompts();
        await client.disconnect();
      }

      return {
        serverId: 'preview',
        serverName: target.name || 'preview-server',
        server: {
          name: target.name || 'preview-server',
          displayName: target.displayName || target.name || 'Preview Server',
          description: target.description || '',
          version: target.version || '1.0.0',
          transport: target.transport || 'in-memory',
          source: target.source || 'LOCAL',
          repositoryUrl: target.repositoryUrl,
          license: target.license || 'UNKNOWN',
        },
        tools,
        resources,
        prompts,
        securityReview,
        requiredCapabilities: Array.from(new Set(tools.flatMap((t) => t.requiredPermissions))),
      };
    }
  }
}
