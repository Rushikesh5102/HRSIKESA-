/**
 * HṚṢĪKEŚA (हृषीकेश) — Deterministic Interface Resolver
 *
 * FP-15: Selects the most reliable, secure, low-latency execution interface
 * given an operation objective, account readiness, service health, and network state.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import {
  ServiceDescriptor,
  InterfaceResolutionContext,
  InterfaceResolutionResult,
  EcosystemInterfaceType,
  ServiceInterfaceBinding,
} from '../types/index.js';
import { EcosystemRepository } from '../repository/ecosystem.repository.js';
import { AccountResolver } from '../../accounts/routing/account.resolver.js';

export class InterfaceResolver {
  // Conceptual priority order as defined in FP-15 spec
  private static readonly INTERFACE_PRIORITY_ORDER: Record<EcosystemInterfaceType, number> = {
    LOCAL_API: 1,
    AUTHENTICATED_API: 2,
    MCP: 3,
    CLI: 4,
    BROWSER_DOM: 5,
    DESKTOP_UIA: 6,
    OCR_VISION: 7,
    COORDINATE_INPUT: 8,
  };

  constructor(
    private readonly repository: EcosystemRepository,
    private readonly logger: ILogger,
    private readonly accountResolver?: AccountResolver
  ) {}

  /**
   * Deterministically resolves the best interface to execute an operation.
   */
  public resolveInterface(
    context: InterfaceResolutionContext,
    candidateService?: ServiceDescriptor
  ): InterfaceResolutionResult {
    // 1. Identify service
    let service = candidateService;
    if (!service && context.serviceId) {
      service = this.repository.getService(context.serviceId) || undefined;
    }
    if (!service && context.providerId) {
      const services = this.repository.listServices({ providerId: context.providerId });
      if (services.length > 0) service = services[0];
    }
    if (!service && context.capabilityId) {
      const parts = context.capabilityId.split('.');
      if (parts.length > 0) {
        const provider = parts[0];
        const services = this.repository.listServices({ providerId: provider });
        if (services.length > 0) service = services[0];
      }
    }

    if (!service) {
      throw new Error(`InterfaceResolver: No service found matching context: ${JSON.stringify(context)}`);
    }

    // 2. Fetch available interfaces for service
    const interfaces = service.interfaces && service.interfaces.length > 0
      ? service.interfaces
      : this.repository.getInterfacesForService(service.serviceId);

    if (interfaces.length === 0) {
      throw new Error(`InterfaceResolver: Service "${service.serviceId}" has no registered interfaces`);
    }

    // 3. Resolve authorized account if accountResolver is present
    let accountId: string | undefined;
    let accountConnected = true;

    if (this.accountResolver && service.accountRequirements?.required) {
      try {
        const resolvedAccount = this.accountResolver.resolveAccount({
          capabilityId: context.capabilityId,
          providerId: service.providerId,
          companyId: context.companyId,
          projectId: context.projectId,
          ownerIdentity: context.ownerIdentity,
        });
        accountId = resolvedAccount.id;
      } catch (err: unknown) {
        accountConnected = false;
        this.logger.debug(
          `InterfaceResolver: Account not resolved for capability "${context.capabilityId}": ${(err as Error).message}`
        );
      }
    }

    // 4. Filter interfaces based on availability, network, and account status
    const networkAvailable = context.networkAvailable ?? true;
    const candidates = interfaces.filter(iface => {
      // Authenticated API requires network and connected account
      if (iface.interfaceType === 'AUTHENTICATED_API') {
        if (!networkAvailable) return false;
        if (!accountConnected && service.accountRequirements?.required) return false;
        return true;
      }

      // Must be marked available for other interfaces (e.g. CLI installed on system, etc.)
      if (!iface.isAvailable) return false;

      // Browser DOM requires network if external service
      if (iface.interfaceType === 'BROWSER_DOM' && !networkAvailable) {
        return false;
      }

      return true;
    });

    // 5. If no candidate passed strict check, evaluate fallback
    let selectedBinding: ServiceInterfaceBinding;
    let reason = '';
    let isFallback = false;

    if (candidates.length === 0) {
      if (context.allowDegradedFallback) {
        // Fallback to whatever interface is registered (e.g. desktop UI or CLI offline)
        selectedBinding = interfaces[0];
        isFallback = true;
        reason = `Selected degraded fallback interface "${selectedBinding.interfaceType}" due to missing primary candidates`;
      } else {
        throw new Error(
          `InterfaceResolver: No viable execution interface for service "${service.name}". Connected account: ${accountConnected}, Network: ${networkAvailable}`
        );
      }
    } else {
      // If user preferred a specific interface, honor it if available
      if (context.preferredInterface) {
        const preferred = candidates.find(c => c.interfaceType === context.preferredInterface);
        if (preferred) {
          selectedBinding = preferred;
          reason = `Selected explicitly preferred interface: ${preferred.interfaceType}`;
        } else {
          selectedBinding = this.sortInterfaces(candidates)[0];
          reason = `Preferred interface "${context.preferredInterface}" unavailable; selected highest priority candidate: ${selectedBinding.interfaceType}`;
        }
      } else {
        // Sort by canonical priority order and reliability
        const sorted = this.sortInterfaces(candidates);
        selectedBinding = sorted[0];
        reason = `Selected highest priority available interface: ${selectedBinding.interfaceType} (reliability: ${selectedBinding.reliabilityScore})`;
      }
    }

    // 6. Determine if consequential operation requires approval
    const requiresApproval =
      selectedBinding.requiresApproval ||
      service.risk === 'HIGH' ||
      service.risk === 'CRITICAL' ||
      context.capabilityId.includes('.send') ||
      context.capabilityId.includes('.delete') ||
      context.capabilityId.includes('.destroy');

    const alternateInterfaces = interfaces
      .filter(i => i.interfaceType !== selectedBinding.interfaceType)
      .map(i => i.interfaceType);

    return {
      selectedInterface: selectedBinding.interfaceType,
      serviceId: service.serviceId,
      providerId: service.providerId,
      capabilityId: context.capabilityId,
      accountId,
      reliabilityScore: selectedBinding.reliabilityScore,
      expectedLatencyMs: selectedBinding.averageLatencyMs,
      requiresApproval,
      reason,
      fallbackAvailable: isFallback || alternateInterfaces.length > 0,
      alternateInterfaces,
    };
  }

  /**
   * Sort interfaces by conceptual priority (lower = higher priority) and reliability score
   */
  private sortInterfaces(bindings: ServiceInterfaceBinding[]): ServiceInterfaceBinding[] {
    return [...bindings].sort((a, b) => {
      const priorityA = InterfaceResolver.INTERFACE_PRIORITY_ORDER[a.interfaceType] ?? a.priority;
      const priorityB = InterfaceResolver.INTERFACE_PRIORITY_ORDER[b.interfaceType] ?? b.priority;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return b.reliabilityScore - a.reliabilityScore;
    });
  }
}
