/**
 * HṚṢĪKEŚA (हृषीकेश) — Improvement Proposal Service
 */

import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';
import {
  IImprovementProposal,
  IImprovementEvidence,
  ImprovementCategory,
  ImprovementLifecycleState,
  ImprovementRiskLevel,
  ApprovalStatus,
} from '../interfaces/self-improvement.types.js';

export class ImprovementProposalService {
  private readonly repository: SelfImprovementRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(repository: SelfImprovementRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repository = repository;
    this.eventBus = eventBus;
    this.logger = logger?.child('ImprovementProposalService');
  }

  public createProposal(input: {
    id?: string;
    companyId?: string;
    anomalyId?: string;
    title: string;
    category: ImprovementCategory;
    problemStatement: string;
    evidenceSummary: string;
    expectedBenefit: string;
    affectedComponents: string[];
    riskLevel?: ImprovementRiskLevel;
    confidenceScore?: number;
    proposedImplementation: string;
    rollbackStrategy: string;
    testPlan: string;
    benchmarkPlan?: string;
    requiresHumanApproval?: boolean;
    estimatedResourceCost?: string;
    createdByAgent?: string;
  }): IImprovementProposal {
    // 1. Evaluate Risk and Human Approval Requirements
    const computedRisk = input.riskLevel || this.classifyRisk(input.category, input.affectedComponents, input.proposedImplementation);
    const requiresApproval =
      input.requiresHumanApproval !== undefined
        ? input.requiresHumanApproval
        : computedRisk === 'HIGH' || computedRisk === 'CRITICAL';

    const now = new Date().toISOString();
    const proposal: IImprovementProposal = {
      id: input.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      companyId: input.companyId,
      anomalyId: input.anomalyId,
      title: input.title,
      category: input.category,
      state: 'PROPOSED',
      problemStatement: input.problemStatement,
      evidenceSummary: input.evidenceSummary,
      expectedBenefit: input.expectedBenefit,
      affectedComponents: input.affectedComponents,
      riskLevel: computedRisk,
      confidenceScore: input.confidenceScore !== undefined ? input.confidenceScore : 1.0,
      proposedImplementation: input.proposedImplementation,
      rollbackStrategy: input.rollbackStrategy,
      testPlan: input.testPlan,
      benchmarkPlan: input.benchmarkPlan,
      requiresHumanApproval: requiresApproval,
      estimatedResourceCost: input.estimatedResourceCost || 'LOW',
      version: 1,
      createdByAgent: input.createdByAgent || 'kali',
      createdAt: now,
      updatedAt: now,
    };

    this.repository.createProposal(proposal);

    this.eventBus?.emit('self.proposal_created', {
      proposalId: proposal.id,
      category: proposal.category,
      title: proposal.title,
      riskLevel: proposal.riskLevel,
      timestamp: proposal.createdAt,
    });

    this.logger?.info(`Created improvement proposal: [${proposal.id}] ${proposal.title} (Risk: ${proposal.riskLevel})`);
    return proposal;
  }

  public transitionState(id: string, newState: ImprovementLifecycleState): IImprovementProposal {
    const proposal = this.repository.getProposalById(id);
    if (!proposal) {
      throw new Error(`Improvement proposal [${id}] not found.`);
    }

    // Validate legal transitions
    this.validateTransition(proposal.state, newState, proposal.requiresHumanApproval);

    this.repository.updateProposalState(id, newState);
    const updated = this.repository.getProposalById(id)!;

    this.eventBus?.emit('self.proposal_state_changed', {
      proposalId: id,
      fromState: proposal.state,
      toState: newState,
      timestamp: new Date().toISOString(),
    });

    if (newState === 'ACCEPTED') {
      this.eventBus?.emit('self.improvement_accepted', {
        proposalId: id,
        title: updated.title,
        category: updated.category,
        timestamp: new Date().toISOString(),
      });
    }

    return updated;
  }

  public requestApproval(proposalId: string, requestedBy: string = 'kali'): void {
    const proposal = this.repository.getProposalById(proposalId);
    if (!proposal) {
      throw new Error(`Improvement proposal [${proposalId}] not found.`);
    }

    const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    this.repository.createApproval({
      id: approvalId,
      proposalId,
      requestedBy,
      requiredRole: 'RUSHIKESH',
      riskLevel: proposal.riskLevel,
      status: 'PENDING',
      requestedAt: now,
    });

    this.transitionState(proposalId, 'AWAITING_APPROVAL');

    this.eventBus?.emit('self.approval_requested', {
      approvalId,
      proposalId,
      riskLevel: proposal.riskLevel,
      requestedAt: now,
    });

    this.logger?.warn(`HITL Approval requested for proposal [${proposalId}] (Risk: ${proposal.riskLevel})`);
  }

  public resolveApproval(
    proposalId: string,
    status: ApprovalStatus,
    resolvedBy: string,
    rationale: string
  ): IImprovementProposal {
    const approval = this.repository.getApprovalByProposal(proposalId);
    if (!approval) {
      throw new Error(`No approval request found for proposal [${proposalId}].`);
    }

    this.repository.resolveApproval(approval.id, status, resolvedBy, rationale);

    this.eventBus?.emit('self.approval_resolved', {
      approvalId: approval.id,
      proposalId,
      status,
      resolvedBy,
      resolvedAt: new Date().toISOString(),
    });

    if (status === 'APPROVED') {
      return this.transitionState(proposalId, 'APPROVED');
    } else {
      return this.transitionState(proposalId, 'REJECTED');
    }
  }

  public addEvidence(
    proposalId: string,
    evidenceType: IImprovementEvidence['evidenceType'],
    title: string,
    data: Record<string, unknown>
  ): IImprovementEvidence {
    const hash = Buffer.from(JSON.stringify(data)).toString('base64');
    const evid: IImprovementEvidence = {
      id: `evid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      proposalId,
      evidenceType,
      title,
      data,
      hash,
      capturedAt: new Date().toISOString(),
    };

    this.repository.addEvidence(evid);
    return evid;
  }

  public attachEvidence(input: {
    proposalId: string;
    evidenceType: IImprovementEvidence['evidenceType'];
    title: string;
    data: Record<string, unknown>;
  }): IImprovementEvidence {
    return this.addEvidence(input.proposalId, input.evidenceType, input.title, input.data);
  }

  public getEvidenceForProposal(proposalId: string): IImprovementEvidence[] {
    return this.repository.listEvidenceByProposal(proposalId);
  }

  public classifyRisk(
    category: ImprovementCategory,
    affectedComponents: string[],
    implementation: string
  ): ImprovementRiskLevel {
    const lowerCategory = category.toLowerCase();
    const joinedComps = affectedComponents.join(' ').toLowerCase();
    const lowerImpl = implementation.toLowerCase();

    // Critical safety keywords
    const criticalKeywords = [
      'security',
      'authorization',
      'permission',
      'credential',
      'auth',
      'sovereign',
      'human_in_the_loop',
      'hitl',
      'financial',
      'payment',
      'production',
      'destruction',
      'closure',
      'decommission',
      'governance',
      'identity',
    ];

    if (
      criticalKeywords.some(
        (k) => lowerCategory.includes(k) || joinedComps.includes(k) || lowerImpl.includes(k)
      )
    ) {
      return 'HIGH';
    }

    if (
      category === 'DOCUMENTATION' ||
      category === 'TEST_COVERAGE' ||
      category === 'MAINTENANCE'
    ) {
      return 'LOW';
    }

    return 'MEDIUM';
  }

  private validateTransition(
    from: ImprovementLifecycleState,
    to: ImprovementLifecycleState,
    requiresApproval: boolean
  ): void {
    // Failure / terminal states can be reached from almost any active state
    const terminalStates: ImprovementLifecycleState[] = ['REJECTED', 'BLOCKED', 'FAILED', 'ROLLED_BACK', 'EXPIRED', 'CANCELLED'];
    if (terminalStates.includes(to)) {
      return;
    }

    // Cannot jump to APPROVED without AWAITING_APPROVAL if approval is required
    if (requiresApproval && to === 'APPROVED' && from !== 'AWAITING_APPROVAL') {
      throw new Error(`Cannot approve proposal without prior AWAITING_APPROVAL state.`);
    }

    // Standard forward progression flow
    const validForwardMap: Record<ImprovementLifecycleState, ImprovementLifecycleState[]> = {
      OBSERVED: ['DETECTED', 'ANALYZING', 'PROPOSED'],
      DETECTED: ['ANALYZING', 'PROPOSED'],
      ANALYZING: ['PROPOSED'],
      PROPOSED: ['PLANNED', 'AWAITING_APPROVAL', 'APPROVED', 'IMPLEMENTING'],
      PLANNED: ['AWAITING_APPROVAL', 'APPROVED', 'IMPLEMENTING'],
      AWAITING_APPROVAL: ['APPROVED', 'REJECTED'],
      APPROVED: ['IMPLEMENTING', 'TESTING'],
      IMPLEMENTING: ['TESTING', 'BENCHMARKING'],
      TESTING: ['BENCHMARKING', 'VERIFYING'],
      BENCHMARKING: ['VERIFYING', 'DEPLOYED'],
      VERIFYING: ['DEPLOYED', 'MONITORING', 'ACCEPTED'],
      DEPLOYED: ['MONITORING', 'ACCEPTED', 'ROLLED_BACK'],
      MONITORING: ['ACCEPTED', 'ROLLED_BACK'],
      ACCEPTED: [],
      REJECTED: [],
      BLOCKED: ['PROPOSED', 'PLANNED'],
      FAILED: ['PROPOSED', 'PLANNED'],
      ROLLED_BACK: ['PROPOSED', 'PLANNED'],
      EXPIRED: [],
      CANCELLED: [],
    };

    const allowed = validForwardMap[from] || [];
    if (!allowed.includes(to)) {
      throw new Error(`Invalid lifecycle transition from [${from}] to [${to}].`);
    }
  }
}
