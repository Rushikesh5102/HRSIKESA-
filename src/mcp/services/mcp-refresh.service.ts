/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Refresh & Schema Drift Service
 *
 * Phase 21: Compares server metadata, detects schema drift, and re-triggers
 * authorization reviews when permission escalation is detected.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { MCPTool } from '../interfaces/mcp.types.js';
import { MCPServerRepository } from '../repositories/mcp-server.repository.js';
import { MCPToolRepository } from '../repositories/mcp-tool.repository.js';
import { MCPCapabilityDiscovery } from './mcp-capability-discovery.service.js';
import { MCPSecurityValidator } from './mcp-security-validator.service.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';

export interface MCPRefreshDiff {
  readonly serverId: string;
  readonly addedTools: string[];
  readonly removedTools: string[];
  readonly schemaChangedTools: string[];
  readonly permissionEscalations: Array<{
    readonly toolName: string;
    readonly previousRisk: DangerTier;
    readonly newRisk: DangerTier;
    readonly reason: string;
  }>;
  readonly requiresReauthorization: boolean;
}

export class MCPRefreshService {
  private readonly serverRepo: MCPServerRepository;
  private readonly toolRepo: MCPToolRepository;
  private readonly discovery: MCPCapabilityDiscovery;
  private readonly validator: MCPSecurityValidator;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(
    serverRepo: MCPServerRepository,
    toolRepo: MCPToolRepository,
    discovery: MCPCapabilityDiscovery,
    validator: MCPSecurityValidator,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.serverRepo = serverRepo;
    this.toolRepo = toolRepo;
    this.discovery = discovery;
    this.validator = validator;
    this.eventBus = eventBus;
    this.logger = logger?.child('MCPRefreshService');
  }

  /**
   * Refreshes server capabilities and calculates diff against stored metadata.
   */
  public async refresh(serverId: string, inMemoryHandler?: (req: any) => Promise<any>): Promise<MCPRefreshDiff> {
    const server = this.serverRepo.findById(serverId);
    if (!server) {
      throw new Error(`MCP server '${serverId}' not found.`);
    }

    // Security validation on current configuration
    this.validator.inspectServer(server);

    const previousTools = this.toolRepo.listTools(serverId);
    const prevMap = new Map<string, MCPTool>(previousTools.map((t) => [t.name, t]));

    // Run discovery
    const { tools: newTools } = await this.discovery.discover(serverId, inMemoryHandler);
    const newMap = new Map<string, MCPTool>(newTools.map((t) => [t.name, t]));

    const addedTools: string[] = [];
    const removedTools: string[] = [];
    const schemaChangedTools: string[] = [];
    const permissionEscalations: Array<{
      toolName: string;
      previousRisk: DangerTier;
      newRisk: DangerTier;
      reason: string;
    }> = [];

    // Check added and modified tools
    for (const [name, newTool] of newMap) {
      if (!prevMap.has(name)) {
        addedTools.push(name);
      } else {
        const prevTool = prevMap.get(name)!;

        // Compare input schemas
        if (JSON.stringify(prevTool.inputSchema) !== JSON.stringify(newTool.inputSchema)) {
          schemaChangedTools.push(name);
        }

        // Compare danger tiers
        if (newTool.riskLevel > prevTool.riskLevel) {
          permissionEscalations.push({
            toolName: name,
            previousRisk: prevTool.riskLevel,
            newRisk: newTool.riskLevel,
            reason: `Risk level increased from Tier ${prevTool.riskLevel} to Tier ${newTool.riskLevel}`,
          });
        }
      }
    }

    // Check removed tools
    for (const [name] of prevMap) {
      if (!newMap.has(name)) {
        removedTools.push(name);
      }
    }

    const requiresReauthorization = permissionEscalations.length > 0 || addedTools.length > 0;

    if (requiresReauthorization && server.authorized) {
      this.serverRepo.update(serverId, {
        status: 'PENDING_APPROVAL',
        authorized: false,
        errorMessage: `Re-authorization required: ${permissionEscalations.length} permission escalation(s), ${addedTools.length} new tool(s).`,
      });

      this.eventBus?.emit('mcp.server.approval_required', {
        serverId: server.id,
        name: server.name,
        riskScore: 5.0,
        reason: `Server refresh detected permission escalation or added tools.`,
      });

      this.logger?.warn(
        `MCP server '${server.name}' shifted to PENDING_APPROVAL due to detected capability escalation.`
      );
    }

    return {
      serverId,
      addedTools,
      removedTools,
      schemaChangedTools,
      permissionEscalations,
      requiresReauthorization,
    };
  }
}
