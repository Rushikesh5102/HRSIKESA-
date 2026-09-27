/**
 * HṚṢĪKEŚA (हृषीकेश) — Cloud Runtime Service
 *
 * FP-19: Provider-Agnostic Cloud Abstraction, Honest Quota & Status Reporting,
 * Free-First Principles, and Paid Execution Governance.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { ExecutionRepository } from '../repositories/execution.repository.js';
import {
  CloudProviderDescriptor,
  CloudProviderState,
} from '../interfaces/execution.types.js';

export class CloudRuntimeService {
  private readonly repository: ExecutionRepository;
  private readonly logger?: ILogger;
  private recordedCosts: Array<{ jobId: string; costUsd: number; provider: string }> = [];

  constructor(repository: ExecutionRepository, logger?: ILogger) {
    this.repository = repository;
    this.logger = logger?.child('CloudRuntimeService');
    this.initializeDefaultProviders();
  }

  // ==========================================
  // 1. DEFAULT PROVIDER INITIALIZATION
  // ==========================================

  private initializeDefaultProviders(): void {
    const existing = this.repository.listCloudProviders();
    if (existing.length > 0) return;

    const defaults: CloudProviderDescriptor[] = [
      {
        id: 'cloud_aws',
        name: 'Amazon Web Services (AWS)',
        providerType: 'AWS',
        state: 'NOT_CONFIGURED',
        supportedRuntimes: ['CLOUD_VM', 'CLOUD_CONTAINER', 'CLOUD_FUNCTION'],
        isPaid: true,
        costPerHourUsd: 0.10,
        metadata: { provider: 'AWS', quotaStatus: 'UNKNOWN', configuredRegions: [] },
      },
      {
        id: 'cloud_gcp',
        name: 'Google Cloud Platform (GCP)',
        providerType: 'GCP',
        state: 'NOT_CONFIGURED',
        supportedRuntimes: ['CLOUD_VM', 'CLOUD_CONTAINER', 'CLOUD_FUNCTION'],
        isPaid: true,
        costPerHourUsd: 0.09,
        metadata: { provider: 'GCP', quotaStatus: 'UNKNOWN', configuredRegions: [] },
      },
      {
        id: 'cloud_azure',
        name: 'Microsoft Azure',
        providerType: 'AZURE',
        state: 'NOT_CONFIGURED',
        supportedRuntimes: ['CLOUD_VM', 'CLOUD_CONTAINER'],
        isPaid: true,
        costPerHourUsd: 0.11,
        metadata: { provider: 'Azure', quotaStatus: 'UNKNOWN', configuredRegions: [] },
      },
      {
        id: 'cloud_vps',
        name: 'Private Registered VPS / Server',
        providerType: 'VPS',
        state: 'NOT_CONFIGURED',
        supportedRuntimes: ['CLOUD_VM', 'REMOTE_MACHINE', 'EXTERNAL_ENVIRONMENT'],
        isPaid: false,
        costPerHourUsd: 0.0,
        metadata: { provider: 'VPS', quotaStatus: 'UNKNOWN', configuredRegions: [] },
      },
    ];

    for (const d of defaults) {
      this.repository.createCloudProvider(d);
    }
  }

  // ==========================================
  // 2. PROVIDER MANAGEMENT
  // ==========================================

  public getProvider(idOrType: string): (CloudProviderDescriptor & { provider: string; quotaStatus: string; configuredRegions: string[] }) | null {
    const all = this.repository.listCloudProviders();
    let match = all.find(
      p =>
        p.id.toLowerCase() === idOrType.toLowerCase() ||
        p.providerType.toLowerCase() === idOrType.toLowerCase() ||
        p.name.toLowerCase().includes(idOrType.toLowerCase()) ||
        p.id.toLowerCase() === `cloud_${idOrType.toLowerCase()}`
    );

    if (!match) {
      // Auto-register unknown provider (e.g. OCI) as NOT_CONFIGURED
      const upper = idOrType.toUpperCase();
      match = this.repository.createCloudProvider({
        id: `cloud_${idOrType.toLowerCase()}`,
        name: `${upper} Cloud`,
        providerType: upper as any,
        state: 'NOT_CONFIGURED',
        supportedRuntimes: ['CLOUD_VM', 'CLOUD_CONTAINER'],
        isPaid: true,
        costPerHourUsd: 0.10,
        metadata: { provider: upper, quotaStatus: 'UNKNOWN', configuredRegions: [] },
      });
    }

    const quotaStatus = (match.metadata as any)?.quotaStatus || (match.remainingQuota !== undefined ? String(match.remainingQuota) : 'UNKNOWN');
    const configuredRegions = (match.metadata as any)?.configuredRegions || (match.region ? [match.region] : []);

    return {
      ...match,
      provider: match.providerType || match.id,
      quotaStatus,
      configuredRegions,
    };
  }

  public listProviders(): Array<CloudProviderDescriptor & { provider: string; quotaStatus: string; configuredRegions: string[] }> {
    const list = this.repository.listCloudProviders();
    return list.map(p => {
      const quotaStatus = (p.metadata as any)?.quotaStatus || (p.remainingQuota !== undefined ? String(p.remainingQuota) : 'UNKNOWN');
      const configuredRegions = (p.metadata as any)?.configuredRegions || (p.region ? [p.region] : []);
      return {
        ...p,
        provider: p.providerType || p.id,
        quotaStatus,
        configuredRegions,
      };
    });
  }

  public configureProvider(
    id: string,
    regionsOrAuth: any,
    metadataOrRegion?: any
  ): CloudProviderDescriptor {
    let existing = this.getProvider(id);
    if (!existing) {
      throw new Error(`Cloud provider not found: ${id}`);
    }

    let configuredRegions: string[] = [];
    let region = 'us-east-1';
    let authAccountId = existing.authAccountId;
    let meta: Record<string, any> = { ...(existing.metadata || {}) };

    if (Array.isArray(regionsOrAuth)) {
      configuredRegions = regionsOrAuth;
      region = regionsOrAuth[0] || 'us-east-1';
      if (typeof metadataOrRegion === 'object' && metadataOrRegion !== null) {
        meta = { ...meta, ...metadataOrRegion };
      }
    } else if (typeof regionsOrAuth === 'string') {
      authAccountId = regionsOrAuth;
      if (typeof metadataOrRegion === 'string') {
        region = metadataOrRegion;
        configuredRegions = [region];
      }
    }

    meta.configuredRegions = configuredRegions;
    if (!meta.provider) meta.provider = existing.providerType || existing.name;

    const state: CloudProviderState = 'AVAILABLE';
    const updated = this.repository.updateCloudProvider(existing.id, {
      authAccountId,
      region,
      state,
      metadata: meta,
    });

    this.logger?.info(`Cloud provider [${existing.id}] configured state: ${state}`);
    return {
      ...updated!,
      provider: updated!.providerType,
      configuredRegions,
      quotaStatus: (updated!.metadata as any)?.quotaStatus || 'UNKNOWN',
    } as any;
  }

  public updateQuotaStatus(idOrType: string, quotaStatus: string, metadata?: any): CloudProviderDescriptor {
    const existing = this.getProvider(idOrType);
    if (!existing) throw new Error(`Provider not found: ${idOrType}`);

    const meta = {
      ...(existing.metadata || {}),
      ...(metadata || {}),
      quotaStatus,
    };

    const remainingQuota = metadata?.remainingComputeHours ?? metadata?.remainingQuota ?? existing.remainingQuota;

    const updated = this.repository.updateCloudProvider(existing.id, {
      remainingQuota,
      metadata: meta,
    });

    return {
      ...updated!,
      provider: updated!.providerType,
      quotaStatus,
      metadata: meta,
    } as any;
  }

  public setProviderState(id: string, state: CloudProviderState): CloudProviderDescriptor {
    const existing = this.getProvider(id);
    const targetId = existing?.id || id;
    const updated = this.repository.updateCloudProvider(targetId, { state });
    if (!updated) throw new Error(`Failed to update provider state: ${targetId}`);
    return updated;
  }

  public resetProvider(providerName: string): CloudProviderDescriptor {
    const provider = this.getProvider(providerName);
    if (!provider) throw new Error(`Provider ${providerName} not found`);

    const meta = {
      ...(provider.metadata || {}),
      quotaStatus: 'UNKNOWN',
      configuredRegions: [],
    };

    const updated = this.repository.updateCloudProvider(provider.id, {
      state: 'NOT_CONFIGURED',
      metadata: meta,
    });

    return {
      ...updated!,
      provider: updated!.providerType,
      state: 'NOT_CONFIGURED',
      quotaStatus: 'UNKNOWN',
      configuredRegions: [],
    } as any;
  }

  // ==========================================
  // 3. QUOTA & COST SAFETY
  // ==========================================

  public checkPaidExecutionApproval(
    job: any,
    costTier: string,
    estimatedCostUsd: number
  ): { approved: boolean; reason: string } {
    if (costTier !== 'PAID' && estimatedCostUsd === 0) {
      return {
        approved: true,
        reason: 'FREE_EXECUTION',
      };
    }

    // Check policy
    const policy = this.repository.getPolicyByScope(job?.scope || 'GLOBAL', job?.companyId, job?.projectId);
    if (policy) {
      const allowsPaid = policy.allowCloudPaid || !policy.requireApprovalForPaid;
      if (allowsPaid) {
        const maxCost = policy.maxCostUsd ?? policy.maxCostPerJob;
        if (maxCost != null && estimatedCostUsd > maxCost) {
          return {
            approved: false,
            reason: `Estimated cost ($${estimatedCostUsd}) exceeds approved policy budget ($${maxCost})`,
          };
        }
        return {
          approved: true,
          reason: 'POLICY_APPROVED',
        };
      }
    }

    return {
      approved: false,
      reason: 'DENY_PAID_WITHOUT_APPROVAL',
    };
  }

  public recordJobCost(jobId: string, costUsd: number, provider = 'UNKNOWN'): void {
    this.recordedCosts.push({ jobId, costUsd, provider });
  }

  public getCostSummary(): {
    totalEstimatedUsd: number;
    jobCount: number;
    currency: string;
    breakdownByProvider: Record<string, number>;
  } {
    const total = this.recordedCosts.reduce((sum, c) => sum + c.costUsd, 0);
    const breakdown = this.recordedCosts.reduce((acc, c) => {
      acc[c.provider] = (acc[c.provider] || 0) + c.costUsd;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEstimatedUsd: Math.round(total * 100) / 100,
      jobCount: this.recordedCosts.length,
      currency: 'USD',
      breakdownByProvider: breakdown,
    };
  }

  public dispatchToProvider(providerName: string, job: any): any {
    const provider = this.getProvider(providerName);
    if (!provider || provider.state === 'NOT_CONFIGURED') {
      throw new Error(`Provider ${providerName} is not configured`);
    }
    return { dispatched: true, provider: provider.providerType, jobId: job.id };
  }

  public evaluateCloudDispatch(
    providerId: string,
    estimatedCostUsd?: number
  ): { allowed: boolean; requiresApproval: boolean; reason: string } {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return { allowed: false, requiresApproval: false, reason: `Provider [${providerId}] not found` };
    }

    if (provider.state === 'NOT_CONFIGURED') {
      return { allowed: false, requiresApproval: false, reason: `Provider [${providerId}] is NOT_CONFIGURED` };
    }

    if (provider.state !== 'AVAILABLE') {
      return { allowed: false, requiresApproval: false, reason: `Provider [${providerId}] is ${provider.state}` };
    }

    if (provider.remainingQuota !== undefined && provider.remainingQuota <= 0) {
      return { allowed: false, requiresApproval: false, reason: `Provider [${providerId}] quota exceeded` };
    }

    // Free runtimes are allowed directly
    if (!provider.isPaid) {
      return { allowed: true, requiresApproval: false, reason: 'Free cloud provider authorized' };
    }

    // Paid execution requires human approval gate
    return {
      allowed: true,
      requiresApproval: true,
      reason: `Paid provider [${providerId}] (approx $${estimatedCostUsd ?? provider.costPerHourUsd}/hr) requires operator approval`,
    };
  }
}
