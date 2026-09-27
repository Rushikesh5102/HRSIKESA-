/**
 * HṚṢĪKEŚA (हृषीकेश) — Independent Supervisor Gateway
 *
 * Orchestrates independent evidence evaluations from Antigravity, Jules, and Spark.
 * Prevents HṚṢĪKEŚA from self-verifying without sovereign independent review.
 */

import { DatabaseManager } from '../../../persistence/database/database.manager.js';
import { EventBus } from '../../../core/events/event-bus.js';
import { ILogger } from '../../../core/logging/logger.types.js';
import {
  SupervisorEvidence,
  SupervisorQuorumDecision,
  ISupervisorEvaluator,
} from './supervisor.types.js';
import {
  SupervisorName,
  SupervisorVote,
  EvolutionSupervisorReview,
} from '../types/evolution.types.js';
import { AntigravitySupervisor } from './evaluators/antigravity.supervisor.js';
import { SafetyController } from '../safety/safety-controller.js';

export class SupervisorGateway {
  private readonly evaluators: Map<SupervisorName, ISupervisorEvaluator> = new Map();
  private readonly db: DatabaseManager;
  private readonly safetyController: SafetyController;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(
    db: DatabaseManager,
    safetyController: SafetyController,
    eventBus?: EventBus,
    logger?: ILogger,
    customEvaluators?: ISupervisorEvaluator[]
  ) {
    this.db = db;
    this.safetyController = safetyController;
    this.eventBus = eventBus;
    this.logger = typeof logger?.child === 'function' ? logger.child('SupervisorGateway') : logger;

    const defaultList: ISupervisorEvaluator[] = customEvaluators || [
      new AntigravitySupervisor(),
    ];

    for (const sup of defaultList) {
      this.evaluators.set(sup.name, sup);
    }
  }

  /**
   * Run all three independent supervisors against the experiment evidence.
   */
  public async evaluateExperiment(evidence: SupervisorEvidence): Promise<SupervisorQuorumDecision> {
    this.logger?.info(`Dispatching independent supervisor evaluations for experiment [${evidence.experiment.id}]...`);

    const reviews: Record<string, EvolutionSupervisorReview> = {};
    const evalPromises = Array.from(this.evaluators.values()).map(async (evaluator) => {
      try {
        const review = await evaluator.evaluate(evidence);
        reviews[evaluator.name] = review;
        this.persistReview(review);
      } catch (err: any) {
        // Fail-safe: if a supervisor fails to evaluate, treat as REJECT
        const failReview: EvolutionSupervisorReview = {
          id: `rev_fail_${Date.now()}_${evaluator.name}`,
          experimentId: evidence.experiment.id,
          supervisorName: evaluator.name,
          vote: 'REJECT',
          confidence: 0.5,
          findings: [],
          violations: [`Supervisor internal failure: ${err.message}`],
          recommendation: 'Reject experiment: Supervisor crashed during evaluation.',
          evaluatedAt: new Date().toISOString(),
        };
        reviews[evaluator.name] = failReview;
        this.persistReview(failReview);
      }
    });

    await Promise.all(evalPromises);

    // Compute Quorum Decision
    const votes = Object.values(reviews).map((r) => r.vote);
    const hasEmergencyStop = votes.includes('EMERGENCY_STOP');
    const hasPause = votes.includes('PAUSE');
    const hasReject = votes.includes('REJECT');

    let overallVote: SupervisorVote = 'APPROVE';
    let passed = false;
    let emergencyStopReason: string | undefined;

    if (hasEmergencyStop) {
      overallVote = 'EMERGENCY_STOP';
      passed = false;
      const critical = Object.values(reviews).find((r) => r.vote === 'EMERGENCY_STOP');
      emergencyStopReason = critical ? `${critical.supervisorName}: ${critical.violations.join('; ')}` : 'Critical violation detected by supervisor';

      this.logger?.error(`🚨 SUPERVISOR EMERGENCY STOP TRIGGERED: ${emergencyStopReason}`);
      this.safetyController.emergencyStop(emergencyStopReason, { reviews });
    } else if (hasPause) {
      overallVote = 'PAUSE';
      passed = false;
      const pauseReview = Object.values(reviews).find((r) => r.vote === 'PAUSE');
      const pauseReason = pauseReview ? `${pauseReview.supervisorName}: ${pauseReview.violations.join('; ')}` : 'Evolution paused by supervisor';
      this.safetyController.pause(pauseReason);
    } else if (hasReject) {
      overallVote = 'REJECT';
      passed = false;
    } else {
      overallVote = 'APPROVE';
      passed = true;
    }

    const summary = `Supervisor: Antigravity=${reviews['antigravity']?.vote || 'N/A'} -> Overall: ${overallVote}`;
    this.logger?.info(`Quorum Result: ${summary}`);

    (this.eventBus as any)?.emit('evolution.supervisor.evaluated', {
      experimentId: evidence.experiment.id,
      overallVote,
      passed,
      summary,
      reviews,
    });

    return {
      passed,
      overallVote,
      reviews: reviews as Record<SupervisorName, EvolutionSupervisorReview>,
      hasEmergencyStop,
      hasPause,
      emergencyStopReason,
      summary,
    };
  }

  /**
   * Persists a supervisor review to the database.
   */
  public persistReview(review: EvolutionSupervisorReview): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO evolution_supervisor_reviews (
          id, experiment_id, supervisor_name, vote, confidence, findings_json, violations_json, recommendation, evaluated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        review.id,
        review.experimentId,
        review.supervisorName,
        review.vote,
        review.confidence,
        JSON.stringify(review.findings),
        JSON.stringify(review.violations),
        review.recommendation,
        review.evaluatedAt
      );
    } catch (err: any) {
      this.logger?.warn(`Failed persisting supervisor review [${review.id}]: ${err.message}`);
    }
  }

  public getReviewsForExperiment(experimentId: string): EvolutionSupervisorReview[] {
    try {
      const rows = this.db.prepare(`SELECT * FROM evolution_supervisor_reviews WHERE experiment_id = ?`).all(experimentId) as any[];
      return rows.map((r) => ({
        id: r.id,
        experimentId: r.experiment_id,
        supervisorName: r.supervisor_name as SupervisorName,
        vote: r.vote as SupervisorVote,
        confidence: r.confidence,
        findings: JSON.parse(r.findings_json || '[]'),
        violations: JSON.parse(r.violations_json || '[]'),
        recommendation: r.recommendation,
        evaluatedAt: r.evaluated_at,
      }));
    } catch {
      return [];
    }
  }
}
