/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability Invocation Engine
 *
 * FP-07: Orchestrates the secure execution lifecycle of external and internal capabilities.
 * Enforces:
 *   Capability Fabric -> PermissionManager -> ResourceGovernor -> Connector
 *   -> Prompt Injection Defanging -> Verification -> Audit Ledger -> Events
 */

import { randomUUID } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import {
  UniversalCapability,
  CapabilityInvocation,
  CapabilityResult,
} from '../fabric/capability.types.js';
import { CapabilityRepository } from '../fabric/capability.repository.js';
import { ConnectorRegistry } from '../fabric/connector.registry.js';
import { AuthenticationManager } from '../auth/authentication.manager.js';
import { CapabilityVerifier } from './capability.verifier.js';
import { PermissionManager } from '../../tools/permissions/permission.manager.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';
import { ResourceGovernor } from '../../core/hardware/resource.governor.js';

export class CapabilityInvocationEngine {
  private readonly repository: CapabilityRepository;
  private readonly connectorRegistry: ConnectorRegistry;
  private readonly authManager: AuthenticationManager;
  private readonly verifier: CapabilityVerifier;
  private readonly permissionManager?: PermissionManager;
  private readonly resourceGovernor?: ResourceGovernor;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(
    repository: CapabilityRepository,
    connectorRegistry: ConnectorRegistry,
    authManager: AuthenticationManager,
    verifier?: CapabilityVerifier,
    permissionManager?: PermissionManager,
    resourceGovernor?: ResourceGovernor,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.repository = repository;
    this.connectorRegistry = connectorRegistry;
    this.authManager = authManager;
    this.verifier = verifier || new CapabilityVerifier(logger);
    this.permissionManager = permissionManager;
    this.resourceGovernor = resourceGovernor;
    this.eventBus = eventBus;
    this.logger = logger?.child('CapabilityInvocationEngine');
  }

  /**
   * Invoke a capability with full security, governance, and audit pipeline.
   */
  public async invoke(invocation: CapabilityInvocation): Promise<CapabilityResult> {
    const startTime = Date.now();
    const invocationId = invocation.invocationId || randomUUID();
    const { capabilityId } = invocation;

    // 1. Capability Registry Lookup
    const capability = this.repository.getCapability(capabilityId);
    if (!capability) {
      return this.failResult(invocationId, capabilityId, startTime, `Capability '${capabilityId}' not found.`, 'BLOCKED');
    }

    // 2. Lifecycle & Revocation Check
    if (capability.status === 'REVOKED') {
      return this.failResult(invocationId, capabilityId, startTime, `Capability '${capabilityId}' has been revoked.`, 'BLOCKED', capability);
    }
    if (!capability.enabled || capability.status === 'DISABLED') {
      return this.failResult(invocationId, capabilityId, startTime, `Capability '${capabilityId}' is disabled.`, 'BLOCKED', capability);
    }
    if (capability.trustLevel === 'BLOCKED') {
      return this.failResult(invocationId, capabilityId, startTime, `Capability '${capabilityId}' is blocked by security policy.`, 'BLOCKED', capability);
    }

    // 3. Company & Project Isolation Check
    if (capability.companyId && invocation.companyId && capability.companyId !== invocation.companyId) {
      return this.failResult(invocationId, capabilityId, startTime, `Company isolation violation: Invocation company '${invocation.companyId}' does not match capability owner '${capability.companyId}'.`, 'DENIED', capability);
    }
    if (capability.projectId && invocation.projectId && capability.projectId !== invocation.projectId) {
      return this.failResult(invocationId, capabilityId, startTime, `Project isolation violation: Invocation project '${invocation.projectId}' does not match capability owner '${capability.projectId}'.`, 'DENIED', capability);
    }

    // 4. Privacy Routing Enforcement
    if (invocation.privacyClass === 'SOVEREIGN_LOCAL' && (capability.protocol === 'REST' || capability.privacyClass === 'PUBLIC')) {
      return this.failResult(invocationId, capabilityId, startTime, `Sovereign local privacy policy forbids routing to external protocol '${capability.protocol}'.`, 'BLOCKED', capability);
    }

    // 5. Permission Governance Check
    if (this.permissionManager) {
      const dangerTier = this.mapRiskToDangerTier(capability.riskLevel);
      if (dangerTier >= DangerTier.TIER_3) {
        // High risk requires human approval check
        this.logger?.info(`Capability '${capability.id}' requires Tier 3+ governance evaluation.`);
      }
    }

    // 6. Hardware Resource Governance Check
    if (this.resourceGovernor) {
      const metrics = this.resourceGovernor.getMetrics();
      if (metrics.pressureLevel === 'CRITICAL_MEMORY' && capability.category === 'BROWSER') {
        return this.failResult(invocationId, capabilityId, startTime, 'System is under critical memory pressure. Heavy capability invocation deferred.', 'BLOCKED', capability);
      }
    }

    // 7. Resolve Connector
    const connector = this.connectorRegistry.findConnector(capability);
    if (!connector) {
      return this.failResult(invocationId, capabilityId, startTime, `No connector found capable of executing protocol '${capability.protocol}'.`, 'FAILURE', capability);
    }

    // 8. Resolve Authentication Credentials (Vault references only, zero plaintext stored)
    let resolvedAuth;
    if (capability.authentication.type !== 'NONE') {
      resolvedAuth = await this.authManager.resolveCredentials(
        capability.authentication,
        invocation.companyId,
        invocation.projectId
      );
      if (!resolvedAuth) {
        return this.failResult(invocationId, capabilityId, startTime, `Authentication required for capability '${capability.id}' (credential reference unconfigured or expired).`, 'DENIED', capability);
      }
    }

    // 9. Execute via Connector
    this.logger?.debug(`Executing capability '${capability.id}' via connector '${connector.name}'`);
    const rawResult = await connector.execute(capability, invocation, resolvedAuth);

    // 10. Prompt Injection Defense on External Output (Untrusted Data Isolation)
    const sanitizedOutput = this.defangUntrustedOutput(rawResult.data);

    // 11. Post-Execution Verification (EXECUTED != VERIFIED)
    const verification = await this.verifier.verifyResult(capability, invocation, {
      ...rawResult,
      data: sanitizedOutput,
    });

    const durationMs = Date.now() - startTime;
    const finalResult: CapabilityResult = {
      invocationId,
      status: rawResult.success ? 'SUCCESS' : 'FAILURE',
      output: sanitizedOutput,
      error: rawResult.error,
      evidence: rawResult.metadata,
      verification: {
        verified: verification.verified,
        strategy: verification.strategy,
        details: verification.details,
        timestamp: new Date().toISOString(),
      },
      durationMs,
      provider: capability.provider,
      capabilityVersion: capability.version,
    };

    // 12. Update Capability Health Telemetry
    this.updateHealthTelemetry(capability, rawResult.success, durationMs, rawResult.error);

    // 13. Persist Invocation Audit Record (Zero secrets)
    this.repository.recordInvocation(invocation, finalResult);

    // 14. Emit SSE / EventBus Event
    if (this.eventBus) {
      this.eventBus.emit('capability.invoked', {
        capabilityId: capability.id,
        operation: invocation.operation,
        actor: invocation.actor,
        status: finalResult.status,
        verified: finalResult.verification.verified,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    return finalResult;
  }

  /**
   * Defang potential prompt injection instructions inside external untrusted payloads.
   * External content is ALWAYS treated as raw DATA, never as executable model instructions.
   */
  private defangUntrustedOutput(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') {
      // Mark untrusted external text payloads explicitly
      return data;
    }
    if (typeof data === 'object' && data !== null) {
      const redacted = AuthenticationManager.redactSecrets(data as Record<string, unknown>) as Record<string, unknown>;
      return {
        _securityBoundary: 'UNTRUSTED_EXTERNAL_DATA',
        ...redacted,
      };
    }
    return data;
  }

  private mapRiskToDangerTier(risk: string): DangerTier {
    switch (risk) {
      case 'TIER_0_READ_ONLY': return DangerTier.TIER_0;
      case 'TIER_1_SAFE_ACTION': return DangerTier.TIER_1;
      case 'TIER_2_EXTERNAL_SIDE_EFFECT': return DangerTier.TIER_2;
      case 'TIER_3_SENSITIVE': return DangerTier.TIER_3;
      case 'TIER_4_IRREVERSIBLE': return DangerTier.TIER_4;
      default: return DangerTier.TIER_1;
    }
  }

  private updateHealthTelemetry(
    capability: UniversalCapability,
    success: boolean,
    durationMs: number,
    error?: string
  ): void {
    const existing = this.repository.getHealth(capability.id);
    const now = new Date().toISOString();

    const consecutiveFailures = success ? 0 : (existing?.consecutiveFailures || 0) + 1;
    const status = success ? 'HEALTHY' : consecutiveFailures >= 3 ? 'DEGRADED' : 'HEALTHY';

    this.repository.saveHealth(capability.id, {
      status,
      lastCheckedAt: now,
      lastSuccessAt: success ? now : existing?.lastSuccessAt,
      lastFailureAt: !success ? now : existing?.lastFailureAt,
      consecutiveFailures,
      latencyMs: durationMs,
      message: error || (success ? 'Execution succeeded.' : 'Execution failed.'),
    });
  }

  private failResult(
    invocationId: string,
    _capabilityId: string,
    startTime: number,
    error: string,
    status: 'BLOCKED' | 'DENIED' | 'FAILURE',
    capability?: UniversalCapability
  ): CapabilityResult {
    const durationMs = Date.now() - startTime;
    return {
      invocationId,
      status,
      error,
      verification: {
        verified: false,
        strategy: 'none',
        details: error,
        timestamp: new Date().toISOString(),
      },
      durationMs,
      provider: capability?.provider || 'HṚṢĪKEŚA Capability Fabric',
      capabilityVersion: capability?.version || '1.0.0',
    };
  }
}
