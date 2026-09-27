/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Application & Service Ecosystem Fabric (FP-15)
 *
 * Master facade bridging HṚṢĪKEŚA, FP-14 Mission Runtime, FP-12 Account Fabric,
 * FP-13 Digital Workspace Operator, and real services, applications, and APIs.
 */

import { DatabaseSync } from 'node:sqlite';
import { ILogger } from '../core/logging/logger.types.js';
import { EventBus } from '../core/events/event-bus.js';
import {
  ServiceDescriptor,
  ApplicationDescriptor,
  InterfaceResolutionContext,
  InterfaceResolutionResult,
  EcosystemOperationEnvelope,
  NaturalLanguageCapabilityResult,
  EcosystemHealthSummary,
} from './types/index.js';
import { EcosystemRepository } from './repository/ecosystem.repository.js';
import { ServiceDiscoveryEngine } from './discovery/service.discovery.engine.js';
import { InterfaceResolver } from './resolution/interface.resolver.js';
import { NaturalLanguageResolver } from './resolution/natural.language.resolver.js';
import { ConsequentialVerificationEngine } from './execution/consequential.verification.js';
import { EcosystemExecutionEngine, ExecuteOperationOptions } from './execution/ecosystem.execution.engine.js';
import { AccountFabric } from '../accounts/account.fabric.js';
import { ApplicationOperator } from '../operator/application.operator.js';

export class UniversalEcosystemFabric {
  public readonly repository: EcosystemRepository;
  public readonly discoveryEngine: ServiceDiscoveryEngine;
  public readonly interfaceResolver: InterfaceResolver;
  public readonly naturalLanguageResolver: NaturalLanguageResolver;
  public readonly verificationEngine: ConsequentialVerificationEngine;
  public readonly executionEngine: EcosystemExecutionEngine;

  constructor(
    db: DatabaseSync,
    private readonly logger: ILogger,
    private readonly accountFabric?: AccountFabric,
    private readonly applicationOperator?: ApplicationOperator,
    private readonly eventBus?: EventBus
  ) {
    this.repository = new EcosystemRepository(db);
    this.discoveryEngine = new ServiceDiscoveryEngine(
      this.repository,
      this.logger,
      this.accountFabric,
      this.eventBus
    );
    this.interfaceResolver = new InterfaceResolver(
      this.repository,
      this.logger,
      this.accountFabric?.resolver
    );
    this.naturalLanguageResolver = new NaturalLanguageResolver(
      this.repository,
      this.accountFabric?.repository,
      this.logger
    );
    this.verificationEngine = new ConsequentialVerificationEngine(
      this.repository,
      this.logger,
      this.accountFabric
    );
    this.executionEngine = new EcosystemExecutionEngine(
      this.repository,
      this.verificationEngine,
      this.logger,
      this.accountFabric,
      this.applicationOperator,
      this.eventBus
    );
  }

  /**
   * Initialize ecosystem fabric and run initial discovery
   */
  public async initialize(): Promise<void> {
    this.logger.info('UniversalEcosystemFabric: Initializing Universal Application & Service Ecosystem (FP-15)');
    await this.discoveryEngine.discoverAll();
  }

  /**
   * Run full discovery across accounts, apps, CLI, and MCP
   */
  public async discoverAll(): Promise<{
    services: ServiceDescriptor[];
    applications: ApplicationDescriptor[];
  }> {
    return this.discoveryEngine.discoverAll();
  }

  /**
   * Fast-path natural language capability inquiry
   */
  public queryCapability(query: string): NaturalLanguageCapabilityResult {
    return this.naturalLanguageResolver.resolveQuery(query);
  }

  /**
   * Resolves execution plan for a capability objective
   */
  public resolvePlan(context: InterfaceResolutionContext): InterfaceResolutionResult {
    return this.interfaceResolver.resolveInterface(context);
  }

  /**
   * Execute an operation via resolved interface
   */
  public async executeOperation(
    resolution: InterfaceResolutionResult,
    params: Record<string, unknown>,
    options?: ExecuteOperationOptions
  ): Promise<EcosystemOperationEnvelope> {
    return this.executionEngine.execute(resolution, params, options);
  }

  /**
   * Get service by ID
   */
  public getService(serviceId: string): ServiceDescriptor | null {
    return this.repository.getService(serviceId);
  }

  /**
   * List all registered services
   */
  public listServices(filter?: { category?: string; providerId?: string }): ServiceDescriptor[] {
    return this.repository.listServices(filter);
  }

  /**
   * List all discovered applications
   */
  public listApplications(): ApplicationDescriptor[] {
    return this.discoveryEngine.listDiscoveredApplications();
  }

  /**
   * Retrieve aggregate health telemetry
   */
  public getHealth(): EcosystemHealthSummary {
    const services = this.repository.listServices();
    const available = services.filter(s => s.availability === 'AVAILABLE');
    const apps = this.discoveryEngine.listDiscoveredApplications();
    const accounts = this.accountFabric ? this.accountFabric.repository.listAccounts({ status: 'CONNECTED' }) : [];

    const isOffline = services.length > 0 && available.length === 0;

    return {
      status: isOffline ? 'OFFLINE' : 'HEALTHY',
      totalServices: services.length,
      availableServices: available.length,
      totalApplications: apps.length,
      connectedAccounts: accounts.length,
      activeMcpServers: 0,
      rateLimitedServices: services.filter(s => s.rateLimit?.isLimited).map(s => s.name),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * List recent operations
   */
  public getRecentOperations(limit = 50): EcosystemOperationEnvelope[] {
    return this.repository.listRecentOperations(limit);
  }

  /**
   * Get single operation by ID
   */
  public getOperation(operationId: string): EcosystemOperationEnvelope | null {
    return this.repository.getOperation(operationId);
  }
}
