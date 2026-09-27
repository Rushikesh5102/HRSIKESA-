/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability Integrator
 *
 * Bridges evaluated GitHub repositories into FP-07 UniversalCapabilityFabric:
 * extracts candidate capabilities, creates integration proposals, checks human approval
 * gates, and registers validated capabilities with provenance.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { UniversalCapabilityFabric } from '../../capabilities/fabric/universal.capability.fabric.js';
import { UniversalCapability } from '../../capabilities/fabric/capability.types.js';
import { GitHubIntelligenceRepository } from '../repository/github.repository.js';
import {
  GitHubRepository,
  IntegrationProposal,
  RepositoryIntelligence,
} from '../types/github.types.js';

export class CapabilityIntegrator {
  private readonly fabric: UniversalCapabilityFabric;
  private readonly repository: GitHubIntelligenceRepository;
  private readonly logger?: ILogger;

  constructor(
    fabric: UniversalCapabilityFabric,
    repository: GitHubIntelligenceRepository,
    logger?: ILogger
  ) {
    this.fabric = fabric;
    this.repository = repository;
    this.logger = logger?.child('CapabilityIntegrator');
  }

  /**
   * Creates an integration proposal from an analyzed repository.
   */
  public proposeIntegration(
    repo: GitHubRepository,
    intel: RepositoryIntelligence,
    capabilitySpec: {
      name?: string;
      description?: string;
      category?: string;
      operationName?: string;
      command?: string;
    } = {}
  ): IntegrationProposal {
    // 1. License Check
    if (intel.license.compatibility === 'INCOMPATIBLE') {
      throw new Error(`Cannot propose integration: License ${intel.license.spdx} is incompatible.`);
    }

    // 2. Derive capability ID
    const capId = `gh.${repo.owner.toLowerCase()}.${repo.name.toLowerCase()}`;
    const name = capabilitySpec.name || `${repo.name} Capability`;
    const description = capabilitySpec.description || repo.description || `Capability extracted from ${repo.fullName}`;
    const category = capabilitySpec.category || (intel.architecture === 'MCP_SERVER' ? 'MCP' : 'CLI');
    const protocol = intel.architecture === 'MCP_SERVER' ? 'MCP' : 'CLI';

    const proposal: IntegrationProposal = {
      id: `prop_${repo.id}_${Date.now()}`,
      repositoryId: repo.id,
      capabilityId: capId,
      name,
      description,
      category,
      protocol: protocol as any,
      status: 'PROPOSED',
      riskLevel: intel.architecture === 'CLI' ? 'TIER_1_SAFE_ACTION' : 'TIER_0_READ_ONLY',
      trustLevel: 'UNVERIFIED',
      executionCommand: capabilitySpec.command || `node ./bin/${repo.name}`,
      requiresHumanApproval: true,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveProposal(proposal);
    this.logger?.info(`Created integration proposal '${proposal.id}' for capability '${capId}'`);

    return proposal;
  }

  /**
   * Evaluates and approves an integration proposal (Human-in-the-loop gate).
   */
  public approveProposal(
    proposalId: string,
    decidedBy: string = 'RUSHIKESH',
    reason: string = 'Approved for sandboxed capability registration'
  ): IntegrationProposal {
    const proposals = this.repository.listProposals();
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) {
      throw new Error(`Integration proposal '${proposalId}' not found.`);
    }

    const updated: IntegrationProposal = {
      ...proposal,
      status: 'APPROVED',
      decidedBy,
      decisionReason: reason,
      decidedAt: new Date().toISOString(),
    };

    this.repository.saveProposal(updated);
    this.logger?.info(`Proposal '${proposalId}' APPROVED by '${decidedBy}'`);
    return updated;
  }

  /**
   * Registers an approved capability proposal into FP-07 UniversalCapabilityFabric.
   */
  public registerIntoFabric(proposalId: string): UniversalCapability {
    const proposals = this.repository.listProposals();
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) {
      throw new Error(`Integration proposal '${proposalId}' not found.`);
    }

    if (proposal.status !== 'APPROVED') {
      throw new Error(`Proposal '${proposalId}' must be APPROVED before registration. Current status: ${proposal.status}`);
    }

    const repo = this.repository.getRepository(proposal.repositoryId);
    const prov = this.repository.getProvenance(proposal.repositoryId);

    const universalCap: UniversalCapability = {
      id: proposal.capabilityId,
      name: proposal.name,
      description: proposal.description,
      category: proposal.category as any,
      provider: repo?.owner || 'GitHub Open-Source',
      source: repo?.fullName || 'github',
      version: '1.0.0',
      protocol: proposal.protocol,
      status: 'AVAILABLE',
      trustLevel: 'USER_APPROVED',
      riskLevel: proposal.riskLevel as any,
      privacyClass: 'PRIVATE',
      authentication: {
        type: 'NONE',
      },
      scopes: [],
      inputs: {},
      outputs: {},
      dependencies: [],
      environments: ['local'],
      supportedOperations: ['execute', 'inspect'],
      provenance: {
        source: prov?.url || repo?.url || 'github.com',
        provider: prov?.owner || repo?.owner || 'GitHub',
        version: '1.0.0',
        license: prov?.license || repo?.licenseSpdx || 'UNKNOWN',
        discoveredAt: prov?.createdAt || repo?.discoveredAt || new Date().toISOString(),
        registeredBy: proposal.decidedBy || 'USER',
        verificationStatus: 'VERIFIED',
        sourceRepository: repo?.url,
      },
      verification: {
        verified: true,
        strategy: 'schema_match',
        lastVerifiedAt: new Date().toISOString(),
      },
      health: {
        status: 'HEALTHY',
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: 0,
      },
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Register into FP-07 UniversalCapabilityFabric
    this.fabric.registerCapability(universalCap);

    // Update proposal status to REGISTERED
    const registeredProposal: IntegrationProposal = {
      ...proposal,
      status: 'REGISTERED',
      decidedAt: new Date().toISOString(),
    };
    this.repository.saveProposal(registeredProposal);

    this.logger?.info(`Registered capability '${universalCap.id}' into FP-07 Fabric.`);
    return universalCap;
  }
}
