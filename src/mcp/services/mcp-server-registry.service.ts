/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Server Registry & Lifecycle Service
 *
 * Phase 21: Authoritative registry enforcing the MCP Trust Model, explicit state
 * transitions, HITL approvals, and Knowledge Graph synchronization.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { KnowledgeEntityRepository } from '../../knowledge/repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../../knowledge/repositories/knowledge-relationship.repository.js';
import crypto from 'node:crypto';
import {
  MCPServer,
  MCPServerStatus,
  MCPTrustLevel,
  MCPSecurityReview,
} from '../interfaces/mcp.types.js';
import { MCPServerRepository } from '../repositories/mcp-server.repository.js';
import { MCPSecurityValidator } from './mcp-security-validator.service.js';
import { MCPSecurityRepository } from '../repositories/mcp-security.repository.js';

export class MCPServerRegistry {
  private readonly serverRepo: MCPServerRepository;
  private readonly secRepo: MCPSecurityRepository;
  private readonly validator: MCPSecurityValidator;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly entityRepo?: KnowledgeEntityRepository;
  private readonly relRepo?: KnowledgeRelationshipRepository;

  constructor(
    serverRepo: MCPServerRepository,
    secRepo: MCPSecurityRepository,
    validator: MCPSecurityValidator,
    eventBus?: EventBus,
    logger?: ILogger,
    entityRepo?: KnowledgeEntityRepository,
    relRepo?: KnowledgeRelationshipRepository
  ) {
    this.serverRepo = serverRepo;
    this.secRepo = secRepo;
    this.validator = validator;
    this.eventBus = eventBus;
    this.logger = logger?.child('MCPServerRegistry');
    this.entityRepo = entityRepo;
    this.relRepo = relRepo;
  }

  /**
   * Registers a newly discovered or proposed MCP server in PENDING_APPROVAL / DISCOVERED state.
   */
  public register(serverData: {
    id?: string;
    name: string;
    displayName?: string;
    description: string;
    version?: string;
    transport?: 'stdio' | 'http' | 'in-memory';
    command?: string;
    args?: string[];
    endpoint?: string;
    envMetadata?: Record<string, string>;
    source?: string;
    repositoryUrl?: string;
    license?: string;
  }): { server: MCPServer; review: MCPSecurityReview } {
    const existing = this.serverRepo.findByName(serverData.name);
    if (existing) {
      const review = this.secRepo.getLatestReview(existing.id) || this.validator.inspectServer(existing);
      return { server: existing, review };
    }

    // 1. Static Security Inspection
    const review = this.validator.inspectServer(serverData);

    // 2. Initial state assignment based on review
    const initialStatus: MCPServerStatus = review.decision === 'REJECTED' ? 'FAILED' : 'PENDING_APPROVAL';
    const trustLevel: MCPTrustLevel = 'UNTRUSTED';

    // 3. Persist Server Record
    const server = this.serverRepo.create({
      id: serverData.id || crypto.randomUUID(),
      name: serverData.name,
      displayName: serverData.displayName || serverData.name,
      description: serverData.description,
      version: serverData.version || '1.0.0',
      transport: serverData.transport || 'stdio',
      command: serverData.command,
      args: serverData.args,
      endpoint: serverData.endpoint,
      envMetadata: serverData.envMetadata,
      status: initialStatus,
      trustLevel,
      source: serverData.source || 'LOCAL',
      repositoryUrl: serverData.repositoryUrl,
      license: serverData.license || 'UNKNOWN',
      enabled: false,
      authorized: false,
      health: 'NOT_CONFIGURED',
      errorMessage: review.decision === 'REJECTED' ? review.notes : undefined,
    });

    // 4. Persist Security Review
    this.secRepo.recordReview({
      serverId: server.id,
      reviewer: review.reviewer,
      findings: review.findings,
      riskScore: review.riskScore,
      decision: review.decision,
      notes: review.notes,
    });

    // 5. Emit Discovery & Approval events
    this.eventBus?.emit('mcp.server.discovered', { serverId: server.id, name: server.name, source: server.source });
    if (initialStatus === 'PENDING_APPROVAL') {
      this.eventBus?.emit('mcp.server.approval_required', {
        serverId: server.id,
        name: server.name,
        riskScore: review.riskScore,
        reason: 'New external MCP server registered; requires explicit operator authorization.',
      });
    }

    // 6. Sync to Knowledge Graph
    this.syncToKnowledgeGraph(server);

    this.logger?.info(`Registered MCP server '${server.name}' (${server.status})`);
    return { server, review };
  }

  /**
   * Authorizes and activates an MCP server following human approval.
   */
  public authorize(serverId: string, authorizedBy = 'ROOT_RUSHIKESH'): MCPServer {
    const server = this.serverRepo.findById(serverId);
    if (!server) {
      throw new Error(`MCP server '${serverId}' not found.`);
    }

    if (server.status === 'REVOKED') {
      throw new Error(`Cannot authorize revoked MCP server '${server.name}'. Must be re-registered.`);
    }

    const updated = this.serverRepo.update(serverId, {
      status: 'AUTHORIZED',
      trustLevel: 'USER_APPROVED',
      authorized: true,
      enabled: true,
      health: 'HEALTHY',
    });

    this.eventBus?.emit('mcp.server.authorized', { serverId, name: server.name, authorizedBy });
    this.logger?.info(`Authorized MCP server '${server.name}' by ${authorizedBy}`);

    if (updated) {
      this.syncToKnowledgeGraph(updated);
      return updated;
    }
    return server;
  }

  /**
   * Temporarily disables an authorized MCP server.
   */
  public disable(serverId: string, reason = 'Operator disabled'): MCPServer {
    const server = this.serverRepo.findById(serverId);
    if (!server) {
      throw new Error(`MCP server '${serverId}' not found.`);
    }

    const updated = this.serverRepo.update(serverId, {
      status: 'DISABLED',
      enabled: false,
      health: 'DISABLED',
      errorMessage: reason,
    });

    this.eventBus?.emit('mcp.server.stopped', { serverId, name: server.name, reason });
    this.logger?.info(`Disabled MCP server '${server.name}': ${reason}`);
    return updated || server;
  }

  /**
   * Permanently revokes authorization for an MCP server.
   */
  public revoke(serverId: string, reason: string): MCPServer {
    const server = this.serverRepo.findById(serverId);
    if (!server) {
      throw new Error(`MCP server '${serverId}' not found.`);
    }

    const updated = this.serverRepo.update(serverId, {
      status: 'REVOKED',
      trustLevel: 'UNTRUSTED',
      authorized: false,
      enabled: false,
      health: 'REVOKED',
      errorMessage: `REVOKED: ${reason}`,
    });

    this.eventBus?.emit('mcp.server.revoked', { serverId, name: server.name, reason });
    this.logger?.warn(`REVOKED MCP server '${server.name}': ${reason}`);
    return updated || server;
  }

  /**
   * Approves and authorizes an MCP server (alias for authorize).
   */
  public approve(serverId: string, notes?: string): MCPServer {
    return this.authorize(serverId, notes || 'ROOT_RUSHIKESH');
  }

  /**
   * Soft-removes an MCP server from active views while preserving all audit/telemetry records.
   */
  public remove(serverId: string): MCPServer {
    const server = this.serverRepo.findById(serverId);
    if (!server) {
      throw new Error(`MCP server '${serverId}' not found.`);
    }

    const updated = this.serverRepo.update(serverId, {
      status: 'REMOVED',
      enabled: false,
      authorized: false,
      health: 'UNAVAILABLE',
    });

    this.logger?.info(`Marked MCP server '${server.name}' as REMOVED (audit history preserved).`);
    return updated || server;
  }

  public get(idOrName: string): MCPServer | null {
    return this.serverRepo.findById(idOrName) || this.serverRepo.findByName(idOrName);
  }

  public list(filter?: { status?: MCPServerStatus; trustLevel?: MCPTrustLevel; enabled?: boolean; authorized?: boolean }): MCPServer[] {
    return this.serverRepo.list(filter);
  }

  /**
   * Synchronizes MCP server identity and relationships with Phase 19 Knowledge Graph.
   */
  private syncToKnowledgeGraph(server: MCPServer): void {
    if (!this.entityRepo) return;
    try {
      let entity = this.entityRepo.findByCanonicalName(server.name);
      if (!entity) {
        entity = this.entityRepo.createEntity({
          canonicalName: server.name,
          displayName: server.displayName || server.name,
          entityType: 'TOOL' as any,
          scope: 'GLOBAL' as any,
          description: server.description,
        });
      }

      if (this.relRepo && entity) {
        const rootEntity = this.entityRepo.findByCanonicalName('hrisekesa');
        if (rootEntity) {
          this.relRepo.createRelationship({
            sourceEntityId: rootEntity.id,
            relationshipType: 'USES' as any,
            targetEntityId: entity.id,
            confidence: 1.0,
          });
        }
      }
    } catch (err: any) {
      this.logger?.debug(`Knowledge Graph sync notice for MCP server '${server.name}': ${err.message}`);
    }
  }
}
