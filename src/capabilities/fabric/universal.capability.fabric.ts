/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Capability Fabric
 *
 * FP-07: Master facade unifying Capability Registry, Connectors, Discovery,
 * Authentication, Matching, Invocation, Health, Verification, and Audit.
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import {
  UniversalCapability,
  CapabilityInvocation,
  CapabilityResult,
  CapabilityHealth,
  CapabilityDependency,
} from './capability.types.js';
import { CapabilityRepository, CapabilityFilter, InvocationRecordRow } from './capability.repository.js';
import { ConnectorRegistry } from './connector.registry.js';
import { AuthenticationManager } from '../auth/authentication.manager.js';
import { CapabilityDiscoveryEngine } from '../discovery/capability.discovery.js';
import { CapabilityMatcher, MatchResult, MatchContext } from '../execution/capability.matcher.js';
import { CapabilityVerifier } from '../execution/capability.verifier.js';
import { CapabilityInvocationEngine } from '../execution/capability.invocation.engine.js';
import { CliConnector } from '../connectors/cli.connector.js';
import { BrowserConnector } from '../connectors/browser.connector.js';
import { SoftwareConnector } from '../connectors/software.connector.js';
import { McpConnector } from '../connectors/mcp.connector.js';
import { LocalToolConnector } from '../connectors/local_tool.connector.js';
import { RestApiConnector } from '../connectors/rest_api.connector.js';
import { PermissionManager } from '../../tools/permissions/permission.manager.js';
import { ResourceGovernor } from '../../core/hardware/resource.governor.js';
import { ToolRegistry } from '../../tools/registry/tool.registry.js';
import { MCPToolRepository } from '../../mcp/repositories/mcp-tool.repository.js';
import { MCPServerRepository } from '../../mcp/repositories/mcp-server.repository.js';
import { AppDiscovery } from '../../environment/discovery/app.discovery.js';

export interface UniversalCapabilityFabricOptions {
  readonly dbManager: DatabaseManager;
  readonly eventBus?: EventBus;
  readonly logger?: ILogger;
  readonly permissionManager?: PermissionManager;
  readonly resourceGovernor?: ResourceGovernor;
  readonly toolRegistry?: ToolRegistry;
  readonly mcpToolRepo?: MCPToolRepository;
  readonly mcpServerRepo?: MCPServerRepository;
  readonly appDiscovery?: AppDiscovery;
}

export class UniversalCapabilityFabric {
  private readonly repository: CapabilityRepository;
  private readonly connectorRegistry: ConnectorRegistry;
  private readonly authManager: AuthenticationManager;
  private readonly discoveryEngine: CapabilityDiscoveryEngine;
  private readonly matcher: CapabilityMatcher;
  private readonly verifier: CapabilityVerifier;
  private readonly invocationEngine: CapabilityInvocationEngine;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private initialized = false;

  constructor(options: UniversalCapabilityFabricOptions) {
    this.logger = options.logger?.child('UniversalCapabilityFabric');
    this.eventBus = options.eventBus;
    this.repository = new CapabilityRepository(options.dbManager);
    this.connectorRegistry = new ConnectorRegistry(options.logger);
    this.authManager = new AuthenticationManager(this.repository, options.logger);
    this.matcher = new CapabilityMatcher(options.logger);
    this.verifier = new CapabilityVerifier(options.logger);

    // Register Default Connectors
    this.connectorRegistry.register(new CliConnector(options.logger));
    this.connectorRegistry.register(new BrowserConnector(undefined, options.logger));
    this.connectorRegistry.register(new SoftwareConnector(undefined, options.logger));
    this.connectorRegistry.register(new McpConnector(undefined, options.mcpToolRepo, options.mcpServerRepo, options.logger));
    this.connectorRegistry.register(new LocalToolConnector(undefined, options.toolRegistry, options.logger));
    this.connectorRegistry.register(new RestApiConnector(options.logger));

    this.discoveryEngine = new CapabilityDiscoveryEngine(
      this.repository,
      options.toolRegistry,
      options.mcpToolRepo,
      options.mcpServerRepo,
      options.appDiscovery,
      options.logger
    );

    this.invocationEngine = new CapabilityInvocationEngine(
      this.repository,
      this.connectorRegistry,
      this.authManager,
      this.verifier,
      options.permissionManager,
      options.resourceGovernor,
      options.eventBus,
      options.logger
    );
  }

  /**
   * Initialize the fabric and run discovery.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.logger?.info('Initializing Universal Capability Fabric...');
    await this.discoveryEngine.discoverAll();
    this.initialized = true;
    this.logger?.info('Universal Capability Fabric initialization complete.');
  }

  public getCapability(id: string): UniversalCapability | undefined {
    return this.repository.getCapability(id);
  }

  public listCapabilities(filter?: CapabilityFilter): UniversalCapability[] {
    return this.repository.listCapabilities(filter);
  }

  public searchCapabilities(query: string): UniversalCapability[] {
    return this.repository.listCapabilities({ searchQuery: query });
  }

  public match(intent: string, context?: MatchContext): MatchResult {
    const all = this.repository.listCapabilities();
    return this.matcher.match(intent, all, context);
  }

  public async invoke(invocation: CapabilityInvocation): Promise<CapabilityResult> {
    return this.invocationEngine.invoke(invocation);
  }

  public async checkHealth(id: string): Promise<CapabilityHealth> {
    const cap = this.repository.getCapability(id);
    if (!cap) {
      return {
        status: 'UNAVAILABLE',
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: 1,
        message: `Capability '${id}' does not exist.`,
      };
    }

    const connector = this.connectorRegistry.findConnector(cap);
    if (!connector) {
      return {
        status: 'UNAVAILABLE',
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: 1,
        message: `No connector available for protocol '${cap.protocol}'.`,
      };
    }

    const health = await connector.checkHealth(cap);
    this.repository.saveHealth(id, health);

    if (this.eventBus) {
      this.eventBus.emit('capability.health_changed', {
        capabilityId: id,
        status: health.status,
        timestamp: new Date().toISOString(),
      });
    }

    return health;
  }

  public async verify(id: string): Promise<{ verified: boolean; details?: string }> {
    const cap = this.repository.getCapability(id);
    if (!cap) {
      return { verified: false, details: `Capability '${id}' not found.` };
    }

    // Run verification check against health or status
    const health = await this.checkHealth(id);
    const verified = health.status === 'HEALTHY';
    return {
      verified,
      details: health.message || (verified ? 'Capability verified healthy and operational.' : 'Capability health is degraded/unavailable.'),
    };
  }

  public enableCapability(id: string): void {
    this.repository.updateCapabilityStatus(id, 'AVAILABLE', true);
    this.logger?.info(`Enabled capability '${id}'`);
    if (this.eventBus) {
      this.eventBus.emit('capability.registered', { capabilityId: id, status: 'AVAILABLE', timestamp: new Date().toISOString() });
    }
  }

  public disableCapability(id: string): void {
    this.repository.updateCapabilityStatus(id, 'DISABLED', false);
    this.logger?.info(`Disabled capability '${id}'`);
    if (this.eventBus) {
      this.eventBus.emit('capability.health_changed', { capabilityId: id, status: 'DISABLED' });
    }
  }

  public revokeCapability(id: string): void {
    this.repository.updateCapabilityStatus(id, 'REVOKED', false);
    this.logger?.warn(`REVOKED capability '${id}'`);
    if (this.eventBus) {
      this.eventBus.emit('capability.revoked', { capabilityId: id, timestamp: new Date().toISOString() });
    }
  }

  public getDependencies(id: string): CapabilityDependency[] {
    return this.repository.getDependencies(id);
  }

  public getInvocations(id?: string, limit?: number): InvocationRecordRow[] {
    return this.repository.listInvocations(id, limit);
  }

  public registerCapability(capability: UniversalCapability): void {
    this.repository.saveCapability(capability);
    this.logger?.info(`Registered capability '${capability.id}'`);
    if (this.eventBus) {
      this.eventBus.emit('capability.registered', { capabilityId: capability.id, timestamp: new Date().toISOString() });
    }
  }

  public getAuthManager(): AuthenticationManager {
    return this.authManager;
  }

  public getConnectorRegistry(): ConnectorRegistry {
    return this.connectorRegistry;
  }
}
