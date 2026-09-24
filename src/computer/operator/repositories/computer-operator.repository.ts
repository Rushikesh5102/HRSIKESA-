/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Operator Repository
 *
 * Phase 22: SQLite persistence for operator tasks, action histories,
 * structured observations, and learned UI element patterns.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { DatabaseManager } from '../../../persistence/database/database.manager.js';
import {
  ComputerTask,
  ComputerTaskStatus,
  ComputerAction,
  ActionResult,
  DesktopObservation,
  LearnedUIPattern,
  ComputerScope,
  ComputerSafetyTier,
} from '../interfaces/operator.types.js';

export class ComputerOperatorRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseManager | DatabaseSync) {
    this.db = (db instanceof DatabaseManager || 'getRawDb' in db) ? (db as any).getRawDb() : db;
  }

  // =========================================================================
  // Tasks
  // =========================================================================

  public createTask(task: Partial<ComputerTask> & { intent?: string; objective?: string; goal?: string }): ComputerTask {
    const now = new Date().toISOString();
    const id = task.id || crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO computer_tasks (
        id, intent, objective, scope, status, target_application, target_window,
        max_actions, actions_executed, retries_count, error_message, requires_approval,
        approval_id, agent_id, mission_id, goal_id, metadata, created_at, updated_at, completed_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const intent = task.intent || (task as any).goal || 'Execute task';
    const objective = task.objective || (task as any).goal || intent;

    stmt.run(
      id,
      intent,
      objective,
      task.scope || 'DESKTOP',
      task.status || 'PENDING',
      task.targetApplication || null,
      task.targetWindow || null,
      task.maxActions || 50,
      0,
      0,
      task.errorMessage || null,
      task.requiresApproval ? 1 : 0,
      task.approvalId || null,
      task.agentId || null,
      task.missionId || null,
      task.goalId || null,
      task.metadata ? JSON.stringify(task.metadata) : null,
      now,
      now,
      task.completedAt || null
    );

    return this.findTaskById(id)!;
  }

  public updateTask(id: string, updates: Partial<ComputerTask>): ComputerTask | null {
    const existing = this.findTaskById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.actionsExecuted !== undefined) {
      sets.push('actions_executed = ?');
      params.push(updates.actionsExecuted);
    }
    if (updates.retriesCount !== undefined) {
      sets.push('retries_count = ?');
      params.push(updates.retriesCount);
    }
    if (updates.errorMessage !== undefined) {
      sets.push('error_message = ?');
      params.push(updates.errorMessage);
    }
    if (updates.requiresApproval !== undefined) {
      sets.push('requires_approval = ?');
      params.push(updates.requiresApproval ? 1 : 0);
    }
    if (updates.approvalId !== undefined) {
      sets.push('approval_id = ?');
      params.push(updates.approvalId);
    }
    if (updates.completedAt !== undefined) {
      sets.push('completed_at = ?');
      params.push(updates.completedAt);
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    params.push(id);
    const sql = `UPDATE computer_tasks SET ${sets.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params);

    return this.findTaskById(id);
  }

  public findTaskById(id: string): ComputerTask | null {
    const stmt = this.db.prepare(`SELECT * FROM computer_tasks WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapTask(row);
  }

  public listTasks(filter?: { status?: ComputerTaskStatus; agentId?: string; limit?: number }): ComputerTask[] {
    let sql = `SELECT * FROM computer_tasks WHERE 1=1`;
    const params: any[] = [];

    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }
    if (filter?.agentId) {
      sql += ` AND agent_id = ?`;
      params.push(filter.agentId);
    }

    sql += ` ORDER BY created_at DESC`;
    if (filter?.limit) {
      sql += ` LIMIT ?`;
      params.push(filter.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapTask(r));
  }

  // =========================================================================
  // Action History
  // =========================================================================

  public recordAction(taskId: string, seq: number, action: ComputerAction, result: ActionResult, riskTier: ComputerSafetyTier = 'SAFE'): void {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO computer_action_history (
        id, task_id, sequence_number, action_type, target_description, resolved_target,
        target_confidence, resolution_method, action_params, precondition_status,
        execution_status, verification_strategy, verification_status, verification_evidence,
        duration_ms, screenshot_path, error_message, risk_tier, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      id,
      taskId,
      seq,
      action.type,
      action.target ? (typeof action.target === 'object' && 'query' in action.target ? action.target.query : (action.target as any).name) : null,
      result.resolvedTarget ? JSON.stringify(result.resolvedTarget) : null,
      result.resolvedTarget?.confidence ?? null,
      result.resolvedTarget?.method ?? null,
      action.params ? JSON.stringify(action.params) : null,
      result.preconditionPassed ? 'VERIFIED' : 'FAILED',
      result.success ? 'SUCCESS' : 'FAILED',
      result.verification?.strategy ?? null,
      result.verification?.verified ? 'VERIFIED' : 'FAILED',
      result.verification?.evidence ?? null,
      result.durationMs || 0,
      result.screenshotPath || null,
      result.error || null,
      riskTier,
      now
    );
  }

  public listActionHistory(taskId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM computer_action_history WHERE task_id = ? ORDER BY sequence_number ASC
    `);
    return stmt.all(taskId) as any[];
  }

  // =========================================================================
  // Observation History
  // =========================================================================

  public recordObservation(observation: DesktopObservation, taskId?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO computer_observation_history (
        id, task_id, active_window_title, active_process_name, active_process_id,
        screen_width, screen_height, node_count, observation_summary, dom_hash,
        screenshot_path, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    stmt.run(
      observation.id,
      taskId || null,
      observation.activeWindow?.title || null,
      observation.activeWindow?.processName || null,
      observation.activeWindow?.processId || null,
      observation.screenMetrics.width,
      observation.screenMetrics.height,
      observation.nodeCount,
      observation.summary,
      observation.domHash,
      observation.screenshotArtifactPath || null,
      observation.timestamp
    );
  }

  public getLatestObservation(taskId?: string): any | null {
    let sql = `SELECT * FROM computer_observation_history`;
    const params: any[] = [];
    if (taskId) {
      sql += ` WHERE task_id = ?`;
      params.push(taskId);
    }
    sql += ` ORDER BY created_at DESC LIMIT 1`;
    return (this.db.prepare(sql).get(...params) as any) || null;
  }

  // =========================================================================
  // Learned UI Patterns
  // =========================================================================

  public savePattern(pattern: Omit<LearnedUIPattern, 'id' | 'createdAt' | 'updatedAt' | 'lastVerifiedAt'>): LearnedUIPattern {
    const now = new Date().toISOString();
    const existing = this.findPattern(pattern.applicationName, pattern.elementDescriptor);

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE computer_ui_patterns SET
          automation_id = ?,
          control_type = ?,
          accessible_name = ?,
          class_name = ?,
          confidence = ?,
          success_count = ?,
          failure_count = ?,
          last_verified_at = ?,
          updated_at = ?
        WHERE id = ?
      `);
      stmt.run(
        pattern.automationId || existing.automationId || null,
        pattern.controlType || existing.controlType || null,
        pattern.accessibleName || existing.accessibleName || null,
        pattern.className || existing.className || null,
        pattern.confidence,
        pattern.successCount,
        pattern.failureCount,
        now,
        now,
        existing.id
      );
      return this.findPatternById(existing.id)!;
    }

    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO computer_ui_patterns (
        id, application_name, window_title_pattern, element_descriptor, automation_id,
        control_type, accessible_name, class_name, confidence, success_count, failure_count,
        last_verified_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    stmt.run(
      id,
      pattern.applicationName,
      pattern.windowTitlePattern || null,
      pattern.elementDescriptor,
      pattern.automationId || null,
      pattern.controlType || null,
      pattern.accessibleName || null,
      pattern.className || null,
      pattern.confidence,
      pattern.successCount,
      pattern.failureCount,
      now,
      now,
      now
    );

    return this.findPatternById(id)!;
  }

  public findPattern(applicationName: string, elementDescriptor: string): LearnedUIPattern | null {
    const stmt = this.db.prepare(`
      SELECT * FROM computer_ui_patterns WHERE application_name = ? AND element_descriptor = ?
    `);
    const row = stmt.get(applicationName, elementDescriptor) as any;
    if (!row) return null;
    return this.mapPattern(row);
  }

  public findPatternById(id: string): LearnedUIPattern | null {
    const stmt = this.db.prepare(`SELECT * FROM computer_ui_patterns WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapPattern(row);
  }

  public listPatterns(applicationName?: string): LearnedUIPattern[] {
    let sql = `SELECT * FROM computer_ui_patterns`;
    const params: any[] = [];
    if (applicationName) {
      sql += ` WHERE application_name = ?`;
      params.push(applicationName);
    }
    sql += ` ORDER BY confidence DESC, success_count DESC`;
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapPattern(r));
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  // Aliases for unified calling conventions
  public getTask(id: string): ComputerTask | null {
    return this.findTaskById(id);
  }

  public updateTaskStatus(id: string, status: ComputerTaskStatus, error?: string): ComputerTask | null {
    return this.updateTask(id, { status, errorMessage: error });
  }

  public logAction(data: any): any {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO computer_action_history (
        id, task_id, sequence_number, action_type, target_description,
        target_confidence, execution_status, verification_strategy,
        verification_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.task_id || data.taskId,
      data.sequence_num || data.sequenceNumber || 1,
      data.action_type || data.actionType || 'CLICK',
      data.target_query || data.targetDescription || null,
      data.target_confidence ?? data.targetConfidence ?? 1.0,
      data.status || 'VERIFIED',
      data.verification_strategy || data.verificationStrategy || 'ELEMENT_PRESENT',
      data.verification_status || 'SUCCESS',
      now
    );
    return { id, ...data };
  }

  public getActionsForTask(taskId: string): any[] {
    return this.listActionHistory(taskId);
  }

  public saveObservation(data: any): any {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO computer_observation_history (
        id, task_id, active_window_title, active_process_name,
        node_count, observation_summary, dom_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.task_id || null,
      data.active_window_title || 'Active Window',
      data.active_process_name || 'notepad.exe',
      data.node_count || 1,
      data.observation_summary || 'Desktop observation',
      data.tree_hash || data.dom_hash || 'hash-default',
      now
    );
    return { id, ...data };
  }

  public saveUIPattern(data: any): any {
    return this.savePattern({
      applicationName: data.application || data.applicationName,
      elementDescriptor: data.target_label || data.elementDescriptor,
      automationId: data.automation_id || data.automationId,
      controlType: data.control_type || data.controlType,
      confidence: data.confidence ?? 0.95,
      successCount: data.success_count || 1,
      failureCount: data.failure_count || 0
    });
  }

  public getUIPatterns(application: string, targetLabel?: string): any[] {
    if (targetLabel) {
      const found = this.findPattern(application, targetLabel);
      return found ? [found] : [];
    }
    return this.listPatterns(application);
  }

  private mapTask(row: any): ComputerTask & { goal?: string } {
    return {
      id: row.id,
      intent: row.intent,
      objective: row.objective,
      goal: row.objective || row.intent,
      scope: row.scope as ComputerScope,
      status: row.status as ComputerTaskStatus,
      targetApplication: row.target_application || undefined,
      targetWindow: row.target_window || undefined,
      maxActions: row.max_actions,
      actionsExecuted: row.actions_executed,
      retriesCount: row.retries_count,
      errorMessage: row.error_message || undefined,
      requiresApproval: Boolean(row.requires_approval),
      approvalId: row.approval_id || undefined,
      agentId: row.agent_id || undefined,
      missionId: row.mission_id || undefined,
      goalId: row.goal_id || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
    };
  }

  private mapPattern(row: any): LearnedUIPattern {
    return {
      id: row.id,
      applicationName: row.application_name,
      windowTitlePattern: row.window_title_pattern || undefined,
      elementDescriptor: row.element_descriptor,
      automationId: row.automation_id || undefined,
      controlType: row.control_type || undefined,
      accessibleName: row.accessible_name || undefined,
      className: row.class_name || undefined,
      confidence: row.confidence,
      successCount: row.success_count,
      failureCount: row.failure_count,
      lastVerifiedAt: row.last_verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
