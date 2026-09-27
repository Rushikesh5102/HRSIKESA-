/**
 * HṚṢĪKEŚA (हृषीकेश) — Master Autonomous Evolution Loop Engine
 *
 * Implements the full 15-stage autonomous evolution lifecycle:
 * OBJECTIVE_ACCEPTED → BASELINE_CAPTURED → REPOSITORY_ANALYZED → HYPOTHESIS_CREATED
 * → EXPERIMENT_CREATED → WORKTREE_CREATED → CODE_MODIFIED → BUILDING → TESTING
 * → BENCHMARKING → SECURITY_VERIFYING → SUPERVISOR_REVIEW → ACCEPTED / REJECTED / ROLLED_BACK
 * → CHECKPOINTED → NEXT_EXPERIMENT → OBJECTIVE_VERIFICATION → PROMOTION_READY / COMPLETED
 *
 * Integrates anti-infinite-loop convergence, independent supervisors,
 * 16GB host ResourceGovernor, and durable crash recovery.
 */

import { DatabaseManager } from '../../../persistence/database/database.manager.js';
import { EventBus } from '../../../core/events/event-bus.js';
import { ILogger } from '../../../core/logging/logger.types.js';
import { ResourceGovernor } from '../../../core/hardware/resource.governor.js';
import { SelfDevelopmentGateway } from '../gateway/self-development.gateway.js';
import { EvolutionWorktreeManager } from '../worktree/evolution-worktree.manager.js';
import { EvolutionObjectiveEngine } from '../objectives/evolution-objective.engine.js';
import { SupervisorGateway } from '../supervisors/supervisor.gateway.js';
import { SafetyController } from '../safety/safety-controller.js';
import { TrustTierManager } from '../safety/trust-tiers.js';
import { BoundaryGuard } from '../safety/boundary-guard.js';
import { EvolutionConvergenceEngine } from './evolution-convergence.js';
import { EvolutionReportGenerator } from '../reporting/evolution-report.generator.js';
import { SupervisorEvidence } from '../supervisors/supervisor.types.js';
import {
  EvolutionObjective,
  EvolutionExperiment,
  ExperimentLifecycleState,
  EvolutionCheckpoint,
} from '../types/evolution.types.js';

export interface CodeModificationInstruction {
  relativePath: string;
  action: 'CREATE' | 'MODIFY' | 'DELETE';
  content?: string;
  targetContent?: string;
  replacementContent?: string;
  startLine?: number;
  endLine?: number;
}

export class EvolutionLoopEngine {
  private readonly db: DatabaseManager;
  public readonly gateway: SelfDevelopmentGateway;
  public readonly worktreeManager: EvolutionWorktreeManager;
  public readonly objectiveEngine: EvolutionObjectiveEngine;
  public readonly supervisorGateway: SupervisorGateway;
  public readonly safetyController: SafetyController;
  public readonly trustTiers: TrustTierManager;
  public readonly boundaryGuard: BoundaryGuard;
  public readonly convergenceEngine: EvolutionConvergenceEngine;
  public readonly reportGenerator: EvolutionReportGenerator;
  private readonly resourceGovernor?: ResourceGovernor;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(options: {
    db: DatabaseManager;
    gateway: SelfDevelopmentGateway;
    worktreeManager: EvolutionWorktreeManager;
    objectiveEngine: EvolutionObjectiveEngine;
    supervisorGateway: SupervisorGateway;
    safetyController: SafetyController;
    trustTiers: TrustTierManager;
    boundaryGuard: BoundaryGuard;
    convergenceEngine?: EvolutionConvergenceEngine;
    reportGenerator?: EvolutionReportGenerator;
    resourceGovernor?: ResourceGovernor;
    eventBus?: EventBus;
    logger?: ILogger;
  }) {
    this.db = dbManagerOrFallback(options.db);
    this.gateway = options.gateway;
    this.worktreeManager = options.worktreeManager;
    this.objectiveEngine = options.objectiveEngine;
    this.supervisorGateway = options.supervisorGateway;
    this.safetyController = options.safetyController;
    this.trustTiers = options.trustTiers;
    this.boundaryGuard = options.boundaryGuard;
    this.convergenceEngine = options.convergenceEngine || new EvolutionConvergenceEngine();
    this.reportGenerator = options.reportGenerator || new EvolutionReportGenerator();
    this.resourceGovernor = options.resourceGovernor;
    this.eventBus = options.eventBus;
    this.logger = typeof options.logger?.child === 'function' ? options.logger.child('EvolutionLoopEngine') : options.logger;
  }

  /**
   * Initializes and accepts a new Evolution Objective.
   */
  public async submitObjective(input: {
    title: string;
    objectiveText: string;
    acceptanceCriteria?: any[];
    baselineMeasurements?: Record<string, number | string>;
    allowedScope?: string[];
    prohibitedActions?: string[];
    resourceBudget?: Record<string, number>;
    maxExperiments?: number;
  }): Promise<EvolutionObjective> {
    const objective = this.objectiveEngine.createObjective(input);

    (this.eventBus as any)?.emit('evolution.objective.created', {
      objectiveId: objective.id,
      title: objective.title,
      status: objective.status,
      timestamp: new Date().toISOString(),
    });

    return objective;
  }

  /**
   * Executes a single controlled, isolated experiment against an active objective.
   */
  public async runExperiment(params: {
    objectiveId: string;
    hypothesis: string;
    modifications: CodeModificationInstruction[];
    benchmarkMetric?: { name: string; candidateValue: number; baselineValue: number; lowerIsBetter?: boolean };
    testPattern?: string;
  }): Promise<EvolutionExperiment> {
    const { objectiveId, hypothesis, modifications, benchmarkMetric, testPattern } = params;

    // 1. Validate Safety & Objective State
    if (this.safetyController.isEmergencyStopped()) {
      throw new Error(`Execution rejected: SafetyController is EMERGENCY_STOPPED.`);
    }

    const objective = this.objectiveEngine.getObjective(objectiveId);
    if (!objective) throw new Error(`Objective [${objectiveId}] not found.`);

    if (['COMPLETED', 'PROMOTION_READY', 'CANCELLED', 'EMERGENCY_STOPPED'].includes(objective.status)) {
      throw new Error(`Cannot run experiment on objective with status '${objective.status}'.`);
    }

    const history = this.listExperiments(objectiveId);
    const experimentNumber = history.length + 1;
    const experimentId = `exp_${objectiveId}_${experimentNumber}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    this.logger?.info(`[${experimentId}] Starting experiment #${experimentNumber}: "${hypothesis}"`);

    // 2. Baseline & Worktree Creation
    const baseCommit = await this.worktreeManager.getBaselineCommit();
    const worktreeResult = await this.gateway.evolutionWorkspaceCreate(objectiveId, experimentId);
    const worktreePath = worktreeResult.worktreePath;

    let experiment: EvolutionExperiment = {
      id: experimentId,
      objectiveId,
      experimentNumber,
      hypothesis,
      baselineCommit: baseCommit,
      worktreePath,
      status: 'WORKTREE_CREATED',
      changedFiles: [],
      diff: '',
      testResults: { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, failedTestNames: [], success: false },
      benchmarkResults: { metrics: {}, overallPassed: true },
      securityResults: { passed: true, tierViolations: [], boundaryViolations: [], credentialLeaksDetected: [], prohibitedImports: [], networkAnomalies: [] },
      supervisorResults: {},
      decision: 'PENDING',
      startedAt: now,
    };

    this.saveExperiment(experiment);
    this.emitEvent('evolution.experiment.started', experiment);

    try {
      // 3. Apply Code Modifications Strictly Inside Worktree
      this.updateState(experiment, 'CODE_MODIFIED');
      const changedFiles: string[] = [];

      for (const mod of modifications) {
        // Pre-validate Tier
        const tierCheck = this.trustTiers.validateModification(mod.relativePath);
        if (!tierCheck.allowed) {
          experiment.securityResults.passed = false;
          experiment.securityResults.tierViolations.push({
            file: mod.relativePath,
            attemptedTier: tierCheck.tier,
            reason: tierCheck.reason,
          });
          this.safetyController.emergencyStop(`Attempted modification of Tier 0 file: ${mod.relativePath}`);
          throw new Error(tierCheck.reason);
        }

        if (mod.action === 'CREATE' && mod.content) {
          await this.gateway.evolutionFileCreate(experimentId, mod.relativePath, mod.content);
          changedFiles.push(mod.relativePath);
        } else if (mod.action === 'MODIFY' && mod.targetContent && mod.replacementContent) {
          await this.gateway.evolutionFileModify(
            experimentId,
            mod.relativePath,
            mod.targetContent,
            mod.replacementContent,
            mod.startLine,
            mod.endLine
          );
          changedFiles.push(mod.relativePath);
        } else if (mod.action === 'DELETE') {
          await this.gateway.evolutionFileDelete(experimentId, mod.relativePath);
          changedFiles.push(mod.relativePath);
        }
      }

      experiment.changedFiles = changedFiles;
      experiment.diff = await this.worktreeManager.getDiff(experimentId);
      this.saveExperiment(experiment);

      // 4. Build & Typecheck Worktree
      this.updateState(experiment, 'BUILDING');
      const tcRes = await this.gateway.evolutionTypecheck(experimentId);
      if (!tcRes.success) {
        this.logger?.warn(`[${experimentId}] Typecheck failed: ${tcRes.output.slice(0, 200)}`);
      }

      // 5. Run Targeted / Regression Tests
      this.updateState(experiment, 'TESTING');
      const testRes = await this.gateway.evolutionTest(experimentId, testPattern);
      experiment.testResults = testRes;
      this.saveExperiment(experiment);

      // 6. Run Benchmarking
      this.updateState(experiment, 'BENCHMARKING');
      if (benchmarkMetric) {
        const bmRes = await this.gateway.evolutionBenchmark(
          experimentId,
          benchmarkMetric.name,
          benchmarkMetric.candidateValue,
          benchmarkMetric.baselineValue,
          benchmarkMetric.lowerIsBetter
        );
        experiment.benchmarkResults = bmRes;
      } else {
        experiment.benchmarkResults = {
          metrics: {
            regression_pass_rate: {
              baseline: 100,
              candidate: testRes.success ? 100 : 0,
              deltaPercent: testRes.success ? 0 : -100,
              unit: '%',
              improved: testRes.success,
            },
          },
          overallPassed: testRes.success,
        };
      }
      this.saveExperiment(experiment);

      // 7. Security & Boundary Verification
      this.updateState(experiment, 'SECURITY_VERIFYING');
      // Scan changed files for boundary breakouts & secrets
      for (const cf of experiment.changedFiles) {
        const fullP = `${worktreePath}/${cf}`;
        const bnd = this.boundaryGuard.validateWorktreePath(fullP, worktreePath);
        if (!bnd.allowed) {
          experiment.securityResults.passed = false;
          experiment.securityResults.boundaryViolations.push(bnd.reason);
        }
      }
      if (experiment.diff) {
        if (/api[_-]?key|secret|password|bearer\s+[a-z0-9_\-\.]{20,}/i.test(experiment.diff)) {
          experiment.securityResults.passed = false;
          experiment.securityResults.credentialLeaksDetected.push('Potential secret pattern in code diff');
        }
      }

      // 8. Independent Supervisor Review
      this.updateState(experiment, 'SUPERVISOR_REVIEW');
      const evidence: SupervisorEvidence = {
        objective,
        experiment,
        baselineCommit: baseCommit,
        diff: experiment.diff,
        changedFiles: experiment.changedFiles,
        testResults: experiment.testResults,
        benchmarkResults: experiment.benchmarkResults,
        securityResults: experiment.securityResults,
        resourceUsage: this.resourceGovernor ? (this.resourceGovernor.getMetrics() as any) : {},
        filesystemActivity: experiment.changedFiles,
        processActivity: [],
        networkActivity: [],
        experimentHistory: history.map((h) => ({
          experimentNumber: h.experimentNumber,
          decision: h.decision,
          hypothesis: h.hypothesis,
        })),
        rollbackHistory: history.filter((h) => h.decision === 'ROLLED_BACK').map((h) => h.id),
      };

      const quorum = await this.supervisorGateway.evaluateExperiment(evidence);
      experiment.supervisorResults = quorum.reviews;

      // 9. Decision Evaluation: Accept, Reject, or Rollback
      if (quorum.hasEmergencyStop) {
        experiment.decision = 'ROLLED_BACK';
        experiment.decisionReason = `Supervisor Emergency Stop: ${quorum.emergencyStopReason}`;
        await this.gateway.evolutionGitRollback(experimentId);
        this.updateState(experiment, 'ROLLED_BACK');
        this.objectiveEngine.updateObjectiveStatus(objectiveId, 'EMERGENCY_STOPPED');
      } else if (quorum.passed && testRes.success && experiment.benchmarkResults.overallPassed && experiment.securityResults.passed) {
        // ACCEPTED
        experiment.decision = 'ACCEPTED';
        experiment.decisionReason = `Accepted by unanimous supervisor review with 0 regressions.`;
        this.updateState(experiment, 'ACCEPTED');

        // Create Milestone Checkpoint
        const chk = await this.createCheckpoint(objectiveId, experimentId, `Milestone #${experimentNumber}: ${hypothesis.slice(0, 40)}`);
        experiment.checkpointId = chk.id;
        this.updateState(experiment, 'CHECKPOINTED');

        // Evaluate Objective Acceptance Criteria
        const progressRes = this.objectiveEngine.evaluateProgress(objective, {
          regression_test_pass_rate: testRes.success ? 100 : 0,
          interactive_response_latency_ms: benchmarkMetric ? benchmarkMetric.candidateValue : 0,
          security_boundary_violations: experiment.securityResults.boundaryViolations.length,
        });

        this.objectiveEngine.updateObjectiveStatus(objectiveId, progressRes.allMet ? 'PROMOTION_READY' : 'IN_PROGRESS', progressRes.progressPercentage);
      } else {
        // REJECTED & ROLLED BACK
        experiment.decision = 'REJECTED';
        experiment.decisionReason = quorum.reviews['antigravity']?.violations.join('; ') ||
          'Test or benchmark regression occurred';

        const rbInfo = await this.gateway.evolutionGitRollback(experimentId);
        experiment.rollbackInfo = rbInfo;
        this.updateState(experiment, 'ROLLED_BACK');
      }

      experiment.endedAt = new Date().toISOString();
      this.saveExperiment(experiment);

      // 10. Anti-Loop & Convergence Check
      const updatedHistory = this.listExperiments(objectiveId);
      const convergence = this.convergenceEngine.evaluateConvergence(objective, updatedHistory, experiment, this.resourceGovernor);

      if (convergence.action === 'PAUSE') {
        this.safetyController.pause(convergence.reason);
        this.objectiveEngine.updateObjectiveStatus(objectiveId, 'STAGNATED');
      } else if (convergence.action === 'STOP') {
        this.objectiveEngine.updateObjectiveStatus(objectiveId, 'COMPLETED');
      }

      // Generate Durable Reports
      this.reportGenerator.generateFinalEvolutionReport({
        objective: this.objectiveEngine.getObjective(objectiveId) || objective,
        experiments: updatedHistory,
        reviews: experiment.supervisorResults,
        security: experiment.securityResults,
        resourceUsage: this.resourceGovernor ? (this.resourceGovernor.getMetrics() as any) : {},
        finalStatus: this.objectiveEngine.getObjective(objectiveId)?.status || 'IN_PROGRESS',
        stopReason: convergence.reason,
      });

      this.emitEvent('evolution.experiment.completed', experiment);
      return experiment;
    } catch (err: any) {
      this.logger?.error(`[${experimentId}] Experiment exception:`, err);
      experiment.decision = 'ROLLED_BACK';
      experiment.decisionReason = err.message;
      experiment.endedAt = new Date().toISOString();
      await this.gateway.evolutionGitRollback(experimentId).catch(() => {});
      this.saveExperiment(experiment);
      throw err;
    }
  }

  /**
   * Creates a durable milestone checkpoint for an experiment.
   */
  public async createCheckpoint(objectiveId: string, experimentId: string, milestoneName: string): Promise<EvolutionCheckpoint> {
    const chkRes = await this.gateway.evolutionGitCheckpoint(experimentId, milestoneName);
    const checkpoint: EvolutionCheckpoint = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      objectiveId,
      experimentId,
      milestoneName,
      gitCommitSha: chkRes.commitSha,
      stateSnapshot: { milestoneName, timestamp: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO evolution_checkpoints (
        id, objective_id, experiment_id, milestone_name, git_commit_sha, worktree_snapshot_path, state_snapshot_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      checkpoint.id,
      checkpoint.objectiveId,
      checkpoint.experimentId || null,
      checkpoint.milestoneName,
      checkpoint.gitCommitSha,
      checkpoint.worktreeSnapshotPath || null,
      JSON.stringify(checkpoint.stateSnapshot),
      checkpoint.createdAt
    );

    this.logger?.info(`Created durable milestone checkpoint [${checkpoint.id}] (${milestoneName}) commit: ${checkpoint.gitCommitSha}`);
    return checkpoint;
  }

  /**
   * Sovereign Human Promotion Gate:
   * Only experiments that achieved PROMOTION_READY can be promoted to production with human sign-off.
   */
  public async promoteExperiment(experimentId: string, humanApprover: string): Promise<{ success: boolean; promotedAt: string; commitSha: string }> {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) throw new Error(`Experiment [${experimentId}] not found.`);
    if (experiment.decision !== 'ACCEPTED') {
      throw new Error(`Cannot promote experiment with decision '${experiment.decision}'. Only ACCEPTED experiments may be promoted.`);
    }

    const objective = this.objectiveEngine.getObjective(experiment.objectiveId);
    if (objective?.status !== 'PROMOTION_READY' && objective?.status !== 'COMPLETED') {
      throw new Error(`Cannot promote: Objective status is '${objective?.status}'. Must be PROMOTION_READY.`);
    }

    this.logger?.info(`Sovereign Human Promotion granted by [${humanApprover}] for experiment [${experimentId}]`);
    const now = new Date().toISOString();

    if (objective) {
      this.objectiveEngine.updateObjectiveStatus(objective.id, 'COMPLETED', 100);
    }

    return {
      success: true,
      promotedAt: now,
      commitSha: experiment.checkpointId || 'promoted_' + Date.now(),
    };
  }

  // ==========================================
  // PERSISTENCE & HELPERS
  // ==========================================

  private updateState(experiment: EvolutionExperiment, state: ExperimentLifecycleState): void {
    experiment.status = state;
    this.saveExperiment(experiment);
    this.emitEvent('evolution.experiment.phase', { experimentId: experiment.id, phase: state });
  }

  public saveExperiment(exp: EvolutionExperiment): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO evolution_experiments (
        id, objective_id, experiment_number, hypothesis, baseline_commit, worktree_path,
        status, changed_files_json, diff, test_results_json, benchmark_results_json,
        security_results_json, supervisor_results_json, decision, decision_reason,
        checkpoint_id, rollback_info_json, started_at, ended_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      exp.id,
      exp.objectiveId,
      exp.experimentNumber,
      exp.hypothesis,
      exp.baselineCommit,
      exp.worktreePath,
      exp.status,
      JSON.stringify(exp.changedFiles),
      exp.diff || null,
      JSON.stringify(exp.testResults),
      JSON.stringify(exp.benchmarkResults),
      JSON.stringify(exp.securityResults),
      JSON.stringify(exp.supervisorResults),
      exp.decision,
      exp.decisionReason || null,
      exp.checkpointId || null,
      exp.rollbackInfo ? JSON.stringify(exp.rollbackInfo) : null,
      exp.startedAt,
      exp.endedAt || null
    );
  }

  public getExperiment(id: string): EvolutionExperiment | undefined {
    const row = this.db.prepare(`SELECT * FROM evolution_experiments WHERE id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapExperimentRow(row);
  }

  public listExperiments(objectiveId?: string): EvolutionExperiment[] {
    const sql = objectiveId
      ? `SELECT * FROM evolution_experiments WHERE objective_id = ? ORDER BY experiment_number ASC`
      : `SELECT * FROM evolution_experiments ORDER BY started_at DESC`;
    const rows = (objectiveId ? this.db.prepare(sql).all(objectiveId) : this.db.prepare(sql).all()) as any[];
    return rows.map((r) => this.mapExperimentRow(r));
  }

  public listCheckpoints(objectiveId?: string): EvolutionCheckpoint[] {
    const sql = objectiveId
      ? `SELECT * FROM evolution_checkpoints WHERE objective_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM evolution_checkpoints ORDER BY created_at DESC`;
    const rows = (objectiveId ? this.db.prepare(sql).all(objectiveId) : this.db.prepare(sql).all()) as any[];
    return rows.map((r) => ({
      id: r.id,
      objectiveId: r.objective_id,
      experimentId: r.experiment_id || undefined,
      milestoneName: r.milestone_name,
      gitCommitSha: r.git_commit_sha,
      worktreeSnapshotPath: r.worktree_snapshot_path || undefined,
      stateSnapshot: r.state_snapshot_json ? JSON.parse(r.state_snapshot_json) : {},
      createdAt: r.created_at,
    }));
  }

  public listAuditLogs(limit: number = 50): any[] {
    const sql = `SELECT * FROM evolution_audit_logs ORDER BY timestamp DESC LIMIT ?`;
    try {
      return this.db.prepare(sql).all(limit) as any[];
    } catch {
      return [];
    }
  }

  private mapExperimentRow(row: any): EvolutionExperiment {
    return {
      id: row.id,
      objectiveId: row.objective_id,
      experimentNumber: row.experiment_number,
      hypothesis: row.hypothesis,
      baselineCommit: row.baseline_commit,
      worktreePath: row.worktree_path,
      status: row.status as ExperimentLifecycleState,
      changedFiles: JSON.parse(row.changed_files_json || '[]'),
      diff: row.diff || '',
      testResults: JSON.parse(row.test_results_json || '{}'),
      benchmarkResults: JSON.parse(row.benchmark_results_json || '{}'),
      securityResults: JSON.parse(row.security_results_json || '{}'),
      supervisorResults: JSON.parse(row.supervisor_results_json || '{}'),
      decision: row.decision,
      decisionReason: row.decision_reason,
      checkpointId: row.checkpoint_id,
      rollbackInfo: row.rollback_info_json ? JSON.parse(row.rollback_info_json) : undefined,
      startedAt: row.started_at,
      endedAt: row.ended_at,
    };
  }

  private emitEvent(eventName: string, payload: any): void {
    (this.eventBus as any)?.emit(eventName, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }
}

function dbManagerOrFallback(db: DatabaseManager): DatabaseManager {
  return db;
}
