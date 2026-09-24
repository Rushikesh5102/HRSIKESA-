/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability Registry
 *
 * Phase 16I, 16K, 16L: Central Capability Management & Security Audit
 *
 * Central registry that indexes all native and open-source capabilities,
 * checks health, evaluates security compliance, and ensures authorized routing.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { ICapabilityAdapter } from '../adapters/capability.adapter.js';
import {
  CapabilityMetadata,
  CapabilityHealthCheckResult,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
  CapabilityCategory,
} from '../interfaces/capability.types.js';

export class CapabilityRegistry {
  private readonly adapters = new Map<string, ICapabilityAdapter>();
  private readonly healthCache = new Map<string, CapabilityHealthCheckResult>();
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(eventBus?: EventBus, logger?: ILogger) {
    this.eventBus = eventBus;
    this.logger = logger?.child('CapabilityRegistry');
  }

  /**
   * Register a capability adapter.
   */
  public register(adapter: ICapabilityAdapter): void {
    const meta = adapter.getMetadata();
    this.adapters.set(meta.id, adapter);
    this.logger?.info(`Registered capability '${meta.name}' [${meta.id}] (Provider: ${meta.provider}, License: ${meta.license})`);

    if (this.eventBus) {
      this.eventBus.emit('capability.registered', {
        capabilityId: meta.id,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public get(id: string): ICapabilityAdapter | undefined {
    return this.adapters.get(id);
  }

  public listMetadata(): CapabilityMetadata[] {
    return Array.from(this.adapters.values()).map((a) => a.getMetadata());
  }

  public getAll(): CapabilityMetadata[] {
    return this.listMetadata();
  }

  public listByCategory(category: CapabilityCategory): CapabilityMetadata[] {
    return this.listMetadata().filter((m) => m.category === category);
  }

  /**
   * Run health check on a specific capability.
   */
  public async checkHealth(id: string): Promise<CapabilityHealthCheckResult> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return {
        status: 'UNAVAILABLE',
        message: `Capability '${id}' is not registered.`,
        lastCheckedAt: new Date().toISOString(),
      };
    }

    try {
      const result = await adapter.checkHealth();
      this.healthCache.set(id, result);
      return result;
    } catch (err: any) {
      const failedResult: CapabilityHealthCheckResult = {
        status: 'UNAVAILABLE',
        message: `Health check threw an error: ${err.message}`,
        lastCheckedAt: new Date().toISOString(),
      };
      this.healthCache.set(id, failedResult);
      return failedResult;
    }
  }

  /**
   * Run health checks across all registered capabilities.
   */
  public async checkAllHealth(): Promise<Record<string, CapabilityHealthCheckResult>> {
    const results: Record<string, CapabilityHealthCheckResult> = {};
    for (const [id] of this.adapters) {
      results[id] = await this.checkHealth(id);
    }
    return results;
  }

  /**
   * Execute an action on a capability adapter.
   */
  public async execute(req: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const adapter = this.adapters.get(req.capabilityId);
    if (!adapter) {
      return {
        success: false,
        error: `Capability '${req.capabilityId}' not found in registry.`,
        executionTimeMs: 0,
        capabilityId: req.capabilityId,
      };
    }

    const meta = adapter.getMetadata();
    if (!meta.enabled) {
      return {
        success: false,
        error: `Capability '${req.capabilityId}' is currently disabled.`,
        executionTimeMs: 0,
        capabilityId: req.capabilityId,
      };
    }

    this.logger?.debug(`Executing action '${req.action}' on capability '${req.capabilityId}'`);
    const result = await adapter.execute(req);

    if (this.eventBus) {
      this.eventBus.emit('capability.executed', {
        capabilityId: req.capabilityId,
        action: req.action,
        success: result.success,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }
}
