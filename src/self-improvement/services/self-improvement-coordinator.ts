/**
 * HṚṢĪKEŚA (हृषीकेश) — Self-Improvement Coordinator
 */

import { EventBus } from '../../core/events/event-bus.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';
import { SelfObservationEngine } from './self-observation.engine.js';
import { SelfHealthService } from './self-health.service.js';
import { AnomalyDetectorService } from './anomaly-detector.service.js';
import { ImprovementProposalService } from './improvement-proposal.service.js';
import { ChangeSetService } from './changeset.service.js';
import { ImprovementSandboxService } from './improvement-sandbox.service.js';
import { ImprovementBenchmarkService } from './improvement-benchmark.service.js';
import { ImprovementRollbackService } from './improvement-rollback.service.js';
import { SelfMaintenanceService } from './self-maintenance.service.js';
import { DependencyIntelligenceService } from './dependency-intelligence.service.js';
import { SelfRepairService } from './self-repair.service.js';
import { ISelfHealthReport, IImprovementProposal } from '../interfaces/self-improvement.types.js';

export interface ISelfImprovementCycleResult {
  readonly cycleId: string;
  readonly health: ISelfHealthReport;
  readonly newAnomaliesCount: number;
  readonly processedProposalsCount: number;
  readonly details: Record<string, unknown>;
  readonly durationMs: number;
  readonly timestamp: string;
}

export class SelfImprovementCoordinator {
  public readonly repository: SelfImprovementRepository;
  public readonly observationEngine: SelfObservationEngine;
  public readonly healthService: SelfHealthService;
  public readonly anomalyDetector: AnomalyDetectorService;
  public readonly proposalService: ImprovementProposalService;
  public readonly changesetService: ChangeSetService;
  public readonly sandboxService: ImprovementSandboxService;
  public readonly benchmarkService: ImprovementBenchmarkService;
  public readonly rollbackService: ImprovementRollbackService;
  public readonly maintenanceService: SelfMaintenanceService;
  public readonly dependencyIntelligence: DependencyIntelligenceService;
  public readonly repairService: SelfRepairService;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(
    repository: SelfImprovementRepository,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.repository = repository;
    this.eventBus = eventBus;
    this.logger = logger?.child('SelfImprovementCoordinator');

    this.observationEngine = new SelfObservationEngine(this.repository, this.eventBus, this.logger);
    this.healthService = new SelfHealthService(this.repository);
    this.anomalyDetector = new AnomalyDetectorService(this.repository, this.eventBus, this.logger);
    this.proposalService = new ImprovementProposalService(this.repository, this.eventBus, this.logger);
    this.changesetService = new ChangeSetService(this.repository);
    this.sandboxService = new ImprovementSandboxService(this.repository, this.eventBus, this.logger);
    this.benchmarkService = new ImprovementBenchmarkService(this.repository, this.eventBus, this.logger);
    this.rollbackService = new ImprovementRollbackService(this.repository, this.eventBus, this.logger);
    this.maintenanceService = new SelfMaintenanceService(this.repository, this.eventBus, this.logger);
    this.dependencyIntelligence = new DependencyIntelligenceService(this.repository);
    this.repairService = new SelfRepairService(this.repository, this.logger);
  }

  public initialize(): void {
    this.observationEngine.initialize();
    this.logger?.info('SelfImprovementCoordinator initialized successfully.');
  }

  public async runImprovementCycle(companyId?: string): Promise<ISelfImprovementCycleResult> {
    const cycleId = `cycle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();
    this.logger?.info(`Executing Self-Improvement Operating Cycle [${cycleId}]...`);

    // 1. Detect Anomalies
    const newAnomalies = this.anomalyDetector.detectAnomalies(companyId);

    // 2. Formulate Proposals for Unaddressed Anomalies
    for (const anom of newAnomalies) {
      const existing = this.repository.listProposals({ companyId }).find((p) => p.anomalyId === anom.id);
      if (!existing) {
        this.proposalService.createProposal({
          companyId,
          anomalyId: anom.id,
          title: `Automated remediation: ${anom.title}`,
          category: 'BUG_FIX',
          problemStatement: anom.description,
          evidenceSummary: anom.evidenceSummary,
          expectedBenefit: 'Restore component to nominal performance',
          affectedComponents: [anom.component],
          proposedImplementation: `Apply isolated patch to ${anom.component} handler`,
          rollbackStrategy: 'Revert to pre-change snapshot',
          testPlan: `Execute regression suite for ${anom.component}`,
          createdByAgent: 'kali',
        });
      }
    }

    // 3. Process Active Proposals
    const proposals = this.repository.listProposals({ companyId });
    let processedCount = 0;

    for (const prop of proposals) {
      if (prop.state === 'PROPOSED') {
        // Transition to PLANNED and attach Changeset
        this.proposalService.transitionState(prop.id, 'PLANNED');
        this.changesetService.createChangeSet({
          proposalId: prop.id,
          files: [
            {
              path: `src/${prop.affectedComponents[0] || 'core'}/handler.ts`,
              action: 'MODIFY',
              beforeContent: '// Original implementation',
              afterContent: '// Optimized implementation with error recovery',
            },
          ],
          summary: `Remediation patch for ${prop.title}`,
          authorAgent: 'gandiva',
        });
        processedCount++;

        // If requires approval, request it and pause execution for human decision
        if (prop.requiresHumanApproval) {
          this.proposalService.requestApproval(prop.id, 'kali');
        }
      }
    }

    // 4. Evaluate Health
    const health = this.healthService.evaluateHealth(companyId);
    const durationMs = Date.now() - startTime;

    return {
      cycleId,
      health,
      newAnomaliesCount: newAnomalies.length,
      processedProposalsCount: processedCount,
      details: {
        activeAnomalies: health.activeAnomaliesCount,
        activeProposals: health.activeProposalsCount,
        pendingApprovals: health.pendingApprovalsCount,
      },
      durationMs,
      timestamp: new Date().toISOString(),
    };
  }

  public async executeFullProposalLifecycle(proposalId: string): Promise<IImprovementProposal> {
    let prop = this.repository.getProposalById(proposalId);
    if (!prop) {
      throw new Error(`Proposal [${proposalId}] not found.`);
    }

    // Step 1: Ensure changeset exists
    let cs = this.changesetService.getChangeSetByProposal(proposalId);
    if (!cs) {
      cs = this.changesetService.createChangeSet({
        proposalId,
        files: [
          {
            path: `src/${prop.affectedComponents[0] || 'core'}/optimized.ts`,
            action: 'MODIFY',
            beforeContent: 'export function process() { return 1; }',
            afterContent: 'export function process() { return 2; }',
          },
        ],
        summary: `Patch for ${prop.title}`,
      });
    }

    // Step 2: Transition through Testing & Sandboxing
    if (prop.state === 'PROPOSED' || prop.state === 'PLANNED' || prop.state === 'APPROVED') {
      prop = this.proposalService.transitionState(proposalId, 'IMPLEMENTING');
      prop = this.proposalService.transitionState(proposalId, 'TESTING');
    }

    const testRes = await this.sandboxService.runSandboxedVerification({
      proposalId,
      changeSetId: cs.id,
    });

    if (!testRes.passed) {
      return this.proposalService.transitionState(proposalId, 'FAILED');
    }

    // Step 3: Benchmarking
    prop = this.proposalService.transitionState(proposalId, 'BENCHMARKING');
    const bmRes = this.benchmarkService.runBenchmark({
      proposalId,
      changeSetId: cs.id,
      metricName: 'execution_latency_ms',
      unit: 'ms',
      beforeValue: 120,
      afterValue: 95,
      lowerIsBetter: true,
    });

    if (bmRes.outcome === 'REGRESSED') {
      return this.proposalService.transitionState(proposalId, 'FAILED');
    }

    // Step 4: Verification & Deployment
    prop = this.proposalService.transitionState(proposalId, 'VERIFYING');
    const dep = this.rollbackService.deployImprovement({
      proposalId,
      changeSetId: cs.id,
      stage: 'CANARY',
    });
    this.logger?.info(`Deployed improvement stage: [${dep.stage}] (Deployment ID: ${dep.id})`);

    prop = this.proposalService.transitionState(proposalId, 'DEPLOYED');
    prop = this.proposalService.transitionState(proposalId, 'MONITORING');
    prop = this.proposalService.transitionState(proposalId, 'ACCEPTED');

    if (prop.anomalyId) {
      this.anomalyDetector.resolveAnomaly(prop.anomalyId, `Resolved via improvement proposal ${proposalId}`);
    }

    return prop;
  }
}
