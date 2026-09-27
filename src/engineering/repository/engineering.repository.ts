/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Software Engineering Repository
 *
 * FP-10: Persistent SQLite CRUD operations for engineering tasks, plans,
 * actions, diagnostics, repairs, and verification stages.
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  SoftwareEngineeringTask,
  EngineeringTaskStatus,
  EngineeringPlan,
  EngineeringAction,
  StructuredDiagnostic,
  RepairAttempt,
  EngineeringTaskFilter,
} from '../types/engineering.types.js';

export class EngineeringRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  // ==========================================
  // 1. Engineering Tasks
  // ==========================================

  public saveTask(task: SoftwareEngineeringTask): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO engineering_tasks (
        id, workspace_id, project_id, company_id, objective, status, priority, complexity,
        current_phase, attempt_count, max_attempts, budget_json, model_calls, tool_calls,
        changed_files_json, tests_run, verification_state, failure_reason, final_summary,
        created_at, started_at, completed_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    stmt.run(
      task.id,
      task.workspaceId,
      task.projectId || null,
      task.companyId || null,
      task.objective,
      task.status,
      task.priority,
      task.complexity,
      task.currentPhase,
      task.attemptCount,
      task.maxAttempts,
      JSON.stringify(task.budget),
      task.modelCalls,
      task.toolCalls,
      JSON.stringify(task.changedFiles),
      task.testsRun,
      task.verificationState,
      task.failureReason || null,
      task.finalSummary || null,
      task.createdAt,
      task.startedAt || null,
      task.completedAt || null
    );
  }

  public updateTaskStatus(id: string, status: EngineeringTaskStatus, phase?: string): void {
    const task = this.getTask(id);
    if (task) {
      task.status = status;
      if (phase) task.currentPhase = phase;
      this.saveTask(task);
    }
  }

  public getTask(id: string): SoftwareEngineeringTask | undefined {
    const row = this.db.prepare(`SELECT * FROM engineering_tasks WHERE id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapTaskRow(row);
  }

  public listTasks(filter: EngineeringTaskFilter | number = {}): SoftwareEngineeringTask[] {
    const f: EngineeringTaskFilter = typeof filter === 'number' ? { limit: filter } : filter;
    let sql = `SELECT * FROM engineering_tasks WHERE 1=1`;
    const params: any[] = [];

    if (f.workspaceId) {
      sql += ` AND workspace_id = ?`;
      params.push(f.workspaceId);
    }
    if (f.projectId) {
      sql += ` AND project_id = ?`;
      params.push(f.projectId);
    }
    if (f.companyId) {
      sql += ` AND company_id = ?`;
      params.push(f.companyId);
    }
    if (f.status) {
      sql += ` AND status = ?`;
      params.push(f.status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(f.limit || 50, f.offset || 0);

    const rows = (this.db.prepare(sql).all as any)(...params) as any[];
    return rows.map((r) => this.mapTaskRow(r));
  }

  public deleteTask(id: string): void {
    this.db.prepare(`DELETE FROM engineering_tasks WHERE id = ?`).run(id);
  }

  private mapTaskRow(row: any): SoftwareEngineeringTask {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      projectId: row.project_id || undefined,
      companyId: row.company_id || undefined,
      objective: row.objective,
      status: row.status,
      priority: row.priority,
      complexity: row.complexity,
      currentPhase: row.current_phase,
      attemptCount: Number(row.attempt_count),
      maxAttempts: Number(row.max_attempts),
      budget: JSON.parse(row.budget_json || '{}'),
      modelCalls: Number(row.model_calls),
      toolCalls: Number(row.tool_calls),
      changedFiles: JSON.parse(row.changed_files_json || '[]'),
      testsRun: Number(row.tests_run),
      verificationState: row.verification_state,
      failureReason: row.failure_reason || undefined,
      finalSummary: row.final_summary || undefined,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
    };
  }

  private ensureTaskExists(taskId: string): void {
    if (!taskId) return;
    const exists = this.db.prepare(`SELECT 1 FROM engineering_tasks WHERE id = ?`).get(taskId);
    if (!exists) {
      this.db.prepare(`
        INSERT INTO engineering_tasks (
          id, workspace_id, objective, status, priority, complexity,
          current_phase, attempt_count, max_attempts, budget_json, created_at
        ) VALUES (?, 'ws_default', 'Auto-created container task', 'QUEUED', 'NORMAL', 'STANDARD', 'QUEUED', 0, 5, '{}', ?)
      `).run(taskId, new Date().toISOString());
    }
  }

  // ==========================================
  // 2. Engineering Plans
  // ==========================================

  public savePlan(plan: EngineeringPlan): void {
    this.ensureTaskExists(plan.taskId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO engineering_plans (
        id, task_id, architecture_summary, target_files_json, steps_json,
        verification_plan_json, risk_level, requires_approval, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      plan.id,
      plan.taskId,
      plan.architectureSummary,
      JSON.stringify(plan.targetFiles),
      JSON.stringify(plan.steps),
      JSON.stringify(plan.verificationPlan),
      plan.riskLevel,
      plan.requiresApproval ? 1 : 0,
      plan.createdAt
    );
  }

  public getPlan(taskId: string): EngineeringPlan | undefined {
    const row = this.db.prepare(`SELECT * FROM engineering_plans WHERE task_id = ? ORDER BY created_at DESC LIMIT 1`).get(taskId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      taskId: row.task_id,
      architectureSummary: row.architecture_summary || '',
      targetFiles: JSON.parse(row.target_files_json || '[]'),
      steps: JSON.parse(row.steps_json || '[]'),
      verificationPlan: JSON.parse(row.verification_plan_json || '[]'),
      riskLevel: row.risk_level,
      requiresApproval: row.requires_approval === 1,
      createdAt: row.created_at,
    };
  }

  // ==========================================
  // 3. Actions
  // ==========================================

  public saveAction(action: EngineeringAction): void {
    this.ensureTaskExists(action.taskId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO engineering_actions (
        id, task_id, action_type, payload_json, status,
        validation_result_json, execution_result_json, executed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      action.id,
      action.taskId,
      action.actionType,
      JSON.stringify(action.payload),
      action.status,
      action.validationResult ? JSON.stringify(action.validationResult) : null,
      action.executionResult ? JSON.stringify(action.executionResult) : null,
      action.executedAt || null,
      action.createdAt
    );
  }

  public getActions(taskId: string): EngineeringAction[] {
    const rows = this.db.prepare(`SELECT * FROM engineering_actions WHERE task_id = ? ORDER BY created_at ASC`).all(taskId) as any[];
    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      actionType: r.action_type,
      payload: JSON.parse(r.payload_json || '{}'),
      status: r.status,
      validationResult: r.validation_result_json ? JSON.parse(r.validation_result_json) : undefined,
      executionResult: r.execution_result_json ? JSON.parse(r.execution_result_json) : undefined,
      executedAt: r.executed_at || undefined,
      createdAt: r.created_at,
    }));
  }

  // ==========================================
  // 4. Diagnostics
  // ==========================================

  public saveDiagnostic(diag: StructuredDiagnostic): void {
    this.ensureTaskExists(diag.taskId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO engineering_diagnostics (
        id, task_id, category, confidence, fingerprint, raw_output,
        normalized_json, hypotheses_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      diag.id,
      diag.taskId,
      diag.category,
      diag.confidence,
      diag.fingerprint,
      diag.rawOutput,
      JSON.stringify({
        file: diag.file,
        line: diag.line,
        column: diag.column,
        code: diag.code,
        expected: diag.expected,
        received: diag.received,
        message: diag.message,
        proposedFix: diag.proposedFix,
      }),
      JSON.stringify(diag.hypotheses),
      diag.createdAt
    );
  }

  public getDiagnostics(taskId: string): StructuredDiagnostic[] {
    const rows = this.db.prepare(`SELECT * FROM engineering_diagnostics WHERE task_id = ? ORDER BY created_at ASC`).all(taskId) as any[];
    return rows.map((r) => {
      const norm = JSON.parse(r.normalized_json || '{}');
      return {
        id: r.id,
        taskId: r.task_id,
        category: r.category,
        confidence: r.confidence,
        fingerprint: r.fingerprint,
        rawOutput: r.raw_output,
        hypotheses: JSON.parse(r.hypotheses_json || '[]'),
        file: norm.file,
        line: norm.line,
        column: norm.column,
        code: norm.code,
        expected: norm.expected,
        received: norm.received,
        message: norm.message || '',
        proposedFix: norm.proposedFix,
        createdAt: r.created_at,
      };
    });
  }

  // ==========================================
  // 5. Repairs
  // ==========================================

  public saveRepair(repair: RepairAttempt): void {
    this.ensureTaskExists(repair.taskId);
    if (repair.diagnosticId) {
      const diagExists = this.db.prepare(`SELECT 1 FROM engineering_diagnostics WHERE id = ?`).get(repair.diagnosticId);
      if (!diagExists) {
        this.saveDiagnostic({
          id: repair.diagnosticId,
          taskId: repair.taskId,
          category: 'TEST_FAILURE',
          confidence: 'MEDIUM',
          fingerprint: `fp_${repair.diagnosticId}`,
          rawOutput: 'Auto-created diagnostic stub',
          hypotheses: [],
          message: 'Auto-created diagnostic',
          createdAt: new Date().toISOString(),
        });
      }
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO engineering_repairs (
        id, task_id, diagnostic_id, attempt_number, model_id,
        proposed_patch_json, changeset_id, outcome, duration_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      repair.id,
      repair.taskId,
      repair.diagnosticId || null,
      repair.attemptNumber,
      repair.modelId,
      JSON.stringify(repair.proposedPatch),
      repair.changesetId || null,
      repair.outcome,
      repair.durationMs,
      repair.createdAt
    );
  }

  public getRepairs(taskId: string): RepairAttempt[] {
    const rows = this.db.prepare(`SELECT * FROM engineering_repairs WHERE task_id = ? ORDER BY attempt_number ASC`).all(taskId) as any[];
    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      diagnosticId: r.diagnostic_id || undefined,
      attemptNumber: Number(r.attempt_number),
      modelId: r.model_id,
      proposedPatch: JSON.parse(r.proposed_patch_json || '{}'),
      changesetId: r.changeset_id || undefined,
      outcome: r.outcome,
      durationMs: Number(r.duration_ms),
      createdAt: r.created_at,
    }));
  }

  // ==========================================
  // 6. Verifications Ledger
  // ==========================================

  public recordVerificationStage(taskId: string, stage: string, passed: boolean, details: Record<string, unknown> = {}): void {
    this.ensureTaskExists(taskId);
    const id = `verif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.db.prepare(`
      INSERT INTO engineering_verifications (id, task_id, stage, passed, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, taskId, stage, passed ? 1 : 0, JSON.stringify(details), new Date().toISOString());
  }

  public getVerifications(taskId: string): Array<{ id: string; stage: string; passed: boolean; details: Record<string, unknown>; createdAt: string }> {
    const rows = this.db.prepare(`SELECT * FROM engineering_verifications WHERE task_id = ? ORDER BY created_at ASC`).all(taskId) as any[];
    return rows.map((r) => ({
      id: r.id,
      stage: r.stage,
      passed: r.passed === 1,
      details: JSON.parse(r.details_json || '{}'),
      createdAt: r.created_at,
    }));
  }

  public getPlanByTask(taskId: string): EngineeringPlan | undefined {
    return this.getPlan(taskId);
  }

  public listActionsByTask(taskId: string): EngineeringAction[] {
    return this.getActions(taskId);
  }

  public listDiagnosticsByTask(taskId: string): StructuredDiagnostic[] {
    return this.getDiagnostics(taskId);
  }

  public listRepairsByTask(taskId: string): RepairAttempt[] {
    return this.getRepairs(taskId);
  }

  public listVerificationsByTask(taskId: string): Array<{ id: string; stage: string; passed: boolean; details: Record<string, unknown>; createdAt: string }> {
    return this.getVerifications(taskId);
  }
}

