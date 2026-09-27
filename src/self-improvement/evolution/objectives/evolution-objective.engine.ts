/**
 * HṚṢĪKEŚA (हृषीकेश) — Evolution Objective Engine
 *
 * Validates, transforms, and tracks measurable self-evolution objectives.
 * Prohibits vague, unmeasurable objectives like "make yourself better".
 */

import { DatabaseManager } from '../../../persistence/database/database.manager.js';
import { ILogger } from '../../../core/logging/logger.types.js';
import {
  EvolutionObjective,
  EvolutionAcceptanceCriterion,
  EvolutionObjectiveStatus,
} from '../types/evolution.types.js';

export class EvolutionObjectiveEngine {
  private readonly db: DatabaseManager;
  private readonly logger?: ILogger;

  constructor(db: DatabaseManager, logger?: ILogger) {
    this.db = db;
    this.logger = typeof logger?.child === 'function' ? logger.child('EvolutionObjectiveEngine') : logger;
  }

  /**
   * Transforms and validates an evolution objective before execution.
   */
  public createObjective(input: {
    id?: string;
    title: string;
    objectiveText: string;
    acceptanceCriteria?: EvolutionAcceptanceCriterion[];
    baselineMeasurements?: Record<string, number | string>;
    allowedScope?: string[];
    prohibitedActions?: string[];
    resourceBudget?: Record<string, number>;
    timeBudgetMs?: number;
    maxExperiments?: number;
    maxConsecutiveFailures?: number;
    stagnationThreshold?: number;
    requiredRegressionSuites?: string[];
    requiredSecurityChecks?: string[];
    supervisorQuorum?: 'UNANIMOUS_SAFETY' | 'MAJORITY' | 'UNANIMOUS_ALL';
  }): EvolutionObjective {
    const rawText = (input.objectiveText || (input as any).objective || input.title || '').trim();
    if (!rawText || rawText.length < 10) {
      throw new Error('Evolution objective is too brief or empty.');
    }

    // Prohibit unmeasurable, vague objectives
    const vaguePhrases = [
      'make yourself better',
      'improve yourself',
      'be faster',
      'fix everything',
      'optimize code',
    ];
    for (const phrase of vaguePhrases) {
      if (rawText.toLowerCase().includes(phrase) && (!input.acceptanceCriteria || input.acceptanceCriteria.length === 0)) {
        throw new Error(
          `Vague objective rejected: "${rawText}". Objectives must contain measurable acceptance criteria (e.g. "Reduce median latency by 20% while passing regression tests").`
        );
      }
    }

    // Extract or transform acceptance criteria
    let criteria: EvolutionAcceptanceCriterion[] = input.acceptanceCriteria || [];
    if (criteria.length === 0) {
      criteria = this.inferAcceptanceCriteria(rawText);
    }

    if (criteria.length === 0) {
      throw new Error(
        `Unable to derive measurable acceptance criteria from objective "${rawText}". Please provide explicit measurable criteria (metric, target, operator, unit).`
      );
    }

    const id = input.id || `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const objective: EvolutionObjective = {
      id,
      title: input.title || `Objective: ${rawText.slice(0, 50)}...`,
      description: rawText,
      acceptanceCriteria: criteria,
      baselineMeasurements: input.baselineMeasurements || { regression_tests_passed: 100 },
      allowedScope: input.allowedScope && input.allowedScope.length > 0 ? input.allowedScope : ['src/'],
      prohibitedActions: input.prohibitedActions || [
        'modify_tier_0_safety_core',
        'disable_emergency_stop',
        'bypass_permission_manager',
        'access_host_user_credentials',
      ],
      resourceBudget: input.resourceBudget || {
        maxCpuPercent: 80,
        maxRamMb: 4096,
        maxDiskMb: 2048,
        maxProcesses: 4,
        maxModelCalls: 50,
        maxToolCalls: 200,
      },
      timeBudgetMs: input.timeBudgetMs || 3600000, // 1 hour default
      maxExperiments: input.maxExperiments || 10,
      maxConsecutiveFailures: input.maxConsecutiveFailures || 3,
      stagnationThreshold: input.stagnationThreshold || 3,
      requiredRegressionSuites: input.requiredRegressionSuites || ['full_test_suite'],
      requiredSecurityChecks: input.requiredSecurityChecks || ['tier_0_boundary_scan', 'credential_leak_scan'],
      supervisorQuorum: input.supervisorQuorum || 'UNANIMOUS_SAFETY',
      terminationConditions: ['objective_achieved', 'max_experiments_reached', 'stagnation_detected', 'emergency_stop'],
      status: 'OBJECTIVE_ACCEPTED',
      progressPercentage: 0.0,
      createdAt: now,
    };

    this.saveObjective(objective);
    this.logger?.info(`Created Evolution Objective [${id}]: "${objective.title}" with ${criteria.length} acceptance criteria.`);
    return objective;
  }

  /**
   * Automatically parses human statements to infer measurable criteria.
   */
  private inferAcceptanceCriteria(text: string): EvolutionAcceptanceCriterion[] {
    const criteria: EvolutionAcceptanceCriterion[] = [];
    const lower = text.toLowerCase();

    // Check for percentage reduction in latency
    const latencyMatch = lower.match(/(?:reduce|decrease|cut)\s+(?:average|median)?\s*(?:response|execution)?\s*latency\s+by\s+(\d+(?:\.\d+)?)\s*%/i);
    if (latencyMatch) {
      criteria.push({
        metric: 'interactive_response_latency_ms',
        targetValue: parseFloat(latencyMatch[1]),
        operator: '<=',
        unit: '% reduction',
        description: `Reduce interactive response latency by at least ${latencyMatch[1]}%`,
      });
    }

    // Check for regression test preservation
    if (lower.includes('without breaking') || lower.includes('preserving') || lower.includes('regression')) {
      criteria.push({
        metric: 'regression_test_pass_rate',
        targetValue: 100,
        operator: '==',
        unit: '%',
        description: 'All regression tests must pass without any failure',
      });
    }

    // Default safety criterion
    criteria.push({
      metric: 'security_boundary_violations',
      targetValue: 0,
      operator: '==',
      unit: 'count',
      description: 'Zero security tier or filesystem boundary violations',
    });

    return criteria;
  }

  /**
   * Evaluates current measurements against the objective's acceptance criteria.
   */
  public evaluateProgress(
    objective: EvolutionObjective,
    measurements: Record<string, number | string>
  ): { progressPercentage: number; allMet: boolean; criteriaResults: Array<{ criterion: EvolutionAcceptanceCriterion; met: boolean; currentValue: any }> } {
    let metCount = 0;
    const criteriaResults = objective.acceptanceCriteria.map((c) => {
      const val = measurements[c.metric];
      let met = false;
      if (val !== undefined) {
        switch (c.operator) {
          case '<':
            met = Number(val) < Number(c.targetValue);
            break;
          case '<=':
            met = Number(val) <= Number(c.targetValue);
            break;
          case '>':
            met = Number(val) > Number(c.targetValue);
            break;
          case '>=':
            met = Number(val) >= Number(c.targetValue);
            break;
          case '==':
            met = String(val) === String(c.targetValue);
            break;
          case '!=':
            met = String(val) !== String(c.targetValue);
            break;
        }
      }
      if (met) metCount++;
      return { criterion: c, met, currentValue: val };
    });

    const progressPercentage = (metCount / objective.acceptanceCriteria.length) * 100;
    const allMet = metCount === objective.acceptanceCriteria.length;

    return { progressPercentage, allMet, criteriaResults };
  }

  public evaluateCriteria(
    objective: EvolutionObjective,
    measurements: Record<string, number | string>
  ) {
    return this.evaluateProgress(objective, measurements);
  }

  public saveObjective(objective: EvolutionObjective): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO evolution_objectives (
        id, title, description, acceptance_criteria_json, baseline_measurements_json,
        allowed_scope_json, prohibited_actions_json, resource_budget_json, time_budget_ms,
        max_experiments, max_consecutive_failures, stagnation_threshold,
        required_regression_suites_json, required_security_checks_json, supervisor_quorum,
        termination_conditions_json, status, progress_percentage, created_at, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      objective.id,
      objective.title,
      objective.description,
      JSON.stringify(objective.acceptanceCriteria),
      JSON.stringify(objective.baselineMeasurements),
      JSON.stringify(objective.allowedScope),
      JSON.stringify(objective.prohibitedActions),
      JSON.stringify(objective.resourceBudget),
      objective.timeBudgetMs,
      objective.maxExperiments,
      objective.maxConsecutiveFailures,
      objective.stagnationThreshold,
      JSON.stringify(objective.requiredRegressionSuites),
      JSON.stringify(objective.requiredSecurityChecks),
      objective.supervisorQuorum,
      JSON.stringify(objective.terminationConditions),
      objective.status,
      objective.progressPercentage,
      objective.createdAt,
      objective.startedAt || null,
      objective.completedAt || null
    );
  }

  public getObjective(id: string): EvolutionObjective | undefined {
    const row = this.db.prepare(`SELECT * FROM evolution_objectives WHERE id = ?`).get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      acceptanceCriteria: JSON.parse(row.acceptance_criteria_json || '[]'),
      baselineMeasurements: JSON.parse(row.baseline_measurements_json || '{}'),
      allowedScope: JSON.parse(row.allowed_scope_json || '[]'),
      prohibitedActions: JSON.parse(row.prohibited_actions_json || '[]'),
      resourceBudget: JSON.parse(row.resource_budget_json || '{}'),
      timeBudgetMs: row.time_budget_ms,
      maxExperiments: row.max_experiments,
      maxConsecutiveFailures: row.max_consecutive_failures,
      stagnationThreshold: row.stagnation_threshold,
      requiredRegressionSuites: JSON.parse(row.required_regression_suites_json || '[]'),
      requiredSecurityChecks: JSON.parse(row.required_security_checks_json || '[]'),
      supervisorQuorum: row.supervisor_quorum,
      terminationConditions: JSON.parse(row.termination_conditions_json || '[]'),
      status: row.status as EvolutionObjectiveStatus,
      progressPercentage: row.progress_percentage,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  public listObjectives(): EvolutionObjective[] {
    const rows = this.db.prepare(`SELECT * FROM evolution_objectives ORDER BY created_at DESC`).all() as any[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      acceptanceCriteria: JSON.parse(row.acceptance_criteria_json || '[]'),
      baselineMeasurements: JSON.parse(row.baseline_measurements_json || '{}'),
      allowedScope: JSON.parse(row.allowed_scope_json || '[]'),
      prohibitedActions: JSON.parse(row.prohibited_actions_json || '[]'),
      resourceBudget: JSON.parse(row.resource_budget_json || '{}'),
      timeBudgetMs: row.time_budget_ms,
      maxExperiments: row.max_experiments,
      maxConsecutiveFailures: row.max_consecutive_failures,
      stagnationThreshold: row.stagnation_threshold,
      requiredRegressionSuites: JSON.parse(row.required_regression_suites_json || '[]'),
      requiredSecurityChecks: JSON.parse(row.required_security_checks_json || '[]'),
      supervisorQuorum: row.supervisor_quorum,
      terminationConditions: JSON.parse(row.termination_conditions_json || '[]'),
      status: row.status as EvolutionObjectiveStatus,
      progressPercentage: row.progress_percentage,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  }

  public updateObjectiveStatus(id: string, status: EvolutionObjectiveStatus, progress?: number): void {
    const obj = this.getObjective(id);
    if (!obj) return;
    obj.status = status;
    if (progress !== undefined) obj.progressPercentage = progress;
    if (status === 'IN_PROGRESS' && !obj.startedAt) obj.startedAt = new Date().toISOString();
    if (['OBJECTIVE_ACCEPTED', 'IN_PROGRESS'].includes(status)) {
      obj.completedAt = undefined;
    } else if (['COMPLETED', 'PROMOTION_READY', 'FAILED', 'CANCELLED', 'EMERGENCY_STOPPED'].includes(status)) {
      obj.completedAt = new Date().toISOString();
    }
    this.saveObjective(obj);
  }

  public deleteObjective(id: string): boolean {
    const res = this.db.prepare(`DELETE FROM evolution_objectives WHERE id = ?`).run(id);
    this.logger?.info(`Deleted Evolution Objective [${id}]`);
    return Number(res.changes) > 0;
  }
}
