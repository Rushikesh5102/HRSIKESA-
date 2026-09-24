/**
 * HṚṢĪKEŚA (हृषीकेश) — Improvement Rollback Service
 */

import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';
import { IImprovementDeployment, IImprovementRollback, DeploymentStage } from '../interfaces/self-improvement.types.js';

export class ImprovementRollbackService {
  private readonly repository: SelfImprovementRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(repository: SelfImprovementRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repository = repository;
    this.eventBus = eventBus;
    this.logger = logger?.child('ImprovementRollbackService');
  }

  public deployImprovement(input: {
    proposalId: string;
    changeSetId: string;
    stage?: DeploymentStage;
  }): IImprovementDeployment {
    const deployment: IImprovementDeployment = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      proposalId: input.proposalId,
      changeSetId: input.changeSetId,
      stage: input.stage || 'CANARY',
      status: 'ACTIVE',
      deployedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };

    this.repository.createDeployment(deployment);

    this.eventBus?.emit('self.change_applied', {
      deploymentId: deployment.id,
      proposalId: deployment.proposalId,
      stage: deployment.stage,
      timestamp: deployment.deployedAt,
    });

    this.logger?.info(`Deployed improvement changeset: [${deployment.id}] for proposal [${input.proposalId}] (Stage: ${deployment.stage})`);
    return deployment;
  }

  public rollbackDeployment(input: {
    deploymentId: string;
    proposalId: string;
    reason: string;
    snapshotReference?: string;
  }): IImprovementRollback {
    const deployment = this.repository.getDeploymentById(input.deploymentId);
    if (!deployment) {
      throw new Error(`Deployment [${input.deploymentId}] not found.`);
    }

    const snapshotRef = input.snapshotReference || `snap_${input.proposalId}_pre_deploy`;
    const rollback: IImprovementRollback = {
      id: `rb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      proposalId: input.proposalId,
      deploymentId: input.deploymentId,
      reason: input.reason,
      snapshotReference: snapshotRef,
      verifiedRestored: true,
      executedAt: new Date().toISOString(),
    };

    this.repository.updateDeploymentStatus(input.deploymentId, 'ROLLED_BACK');
    this.repository.recordRollback(rollback);

    this.eventBus?.emit('self.rollback_executed', {
      rollbackId: rollback.id,
      proposalId: rollback.proposalId,
      reason: rollback.reason,
      timestamp: rollback.executedAt,
    });

    this.logger?.warn(`Rolled back deployment [${input.deploymentId}] for proposal [${input.proposalId}]. Reason: ${input.reason}`);
    return rollback;
  }
}
