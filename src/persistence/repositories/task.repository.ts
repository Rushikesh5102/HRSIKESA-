/**
 * HRSIKESA (हृषीकेश) — Task Repository
 *
 * Durable persistence for AgentTask and AgentResult records.
 */

import { DatabaseManager } from '../database/database.manager.js';
import { AgentTask, AgentResult, TaskStatus, TaskPriority } from '../../agents/interfaces/task.types.js';

interface RawTaskRow {
  id: string;
  agent_id: string;
  mission_id: string | null;
  parent_task_id: string | null;
  objective: string;
  title: string | null;
  context: string | null;
  inputs: string | null;
  priority: string;
  status: string;
  depth: number;
  dependencies: string | null;
  retry_count: number | null;
  max_retries: number | null;
  verification_strategy: string | null;
  verification_result: string | null;
  observation: string | null;
  session_id: string | null;
  result_summary: string | null;
  result_output: string | null;
  result_tool_calls: string | null;
  result_errors: string | null;
  result_child_task_ids: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export class TaskRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(task: AgentTask): AgentTask {
    const inputs = {
      ...(task.inputs || {}),
      ...(task.deterministicToolAction ? { deterministicToolAction: task.deterministicToolAction } : {}),
      ...(task.approvalId ? { approvalId: task.approvalId } : {})
    };
    const hasInputs = Object.keys(inputs).length > 0;

    const stmt = this.db.prepare(`
      INSERT INTO agent_tasks (
        id, agent_id, mission_id, parent_task_id, objective, title, context, inputs,
        priority, status, depth, dependencies, retry_count, max_retries,
        verification_strategy, verification_result, observation,
        session_id, created_at, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id,
      task.agentId,
      task.missionId || null,
      task.parentTaskId || null,
      task.objective,
      task.title || null,
      task.context || null,
      hasInputs ? JSON.stringify(inputs) : null,
      task.priority,
      task.status || 'pending',
      task.depth,
      task.dependencies ? JSON.stringify(task.dependencies) : null,
      task.retryCount || 0,
      task.maxRetries || 3,
      task.verificationStrategy ? JSON.stringify(task.verificationStrategy) : null,
      task.verificationResult ? JSON.stringify(task.verificationResult) : null,
      task.observation ? JSON.stringify(task.observation) : null,
      task.sessionId || null,
      task.createdAt,
      task.startedAt || null,
      task.completedAt || null
    );
    return task;
  }

  public get(id: string): AgentTask | undefined {
    const row = this.db.prepare(
      'SELECT * FROM agent_tasks WHERE id = ?'
    ).get(id) as unknown as RawTaskRow | undefined;
    if (!row) return undefined;
    return this.rowToTask(row);
  }

  public update(id: string, updates: Partial<AgentTask>): void {
    const current = this.get(id);
    if (!current) throw new Error(`Task '${id}' not found for update.`);

    const mergedInputs = updates.inputs !== undefined || updates.deterministicToolAction !== undefined || updates.approvalId !== undefined
      ? {
          ...(current.inputs || {}),
          ...(updates.inputs || {}),
          ...(updates.deterministicToolAction ? { deterministicToolAction: updates.deterministicToolAction } : {}),
          ...(updates.approvalId ? { approvalId: updates.approvalId } : {})
        }
      : null;

    const stmt = this.db.prepare(`
      UPDATE agent_tasks SET
        status = COALESCE(?, status),
        title = COALESCE(?, title),
        inputs = COALESCE(?, inputs),
        dependencies = COALESCE(?, dependencies),
        retry_count = COALESCE(?, retry_count),
        max_retries = COALESCE(?, max_retries),
        verification_strategy = COALESCE(?, verification_strategy),
        verification_result = COALESCE(?, verification_result),
        observation = COALESCE(?, observation),
        result_summary = COALESCE(?, result_summary),
        result_errors = COALESCE(?, result_errors),
        started_at = COALESCE(?, started_at),
        completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `);
    stmt.run(
      updates.status || null,
      updates.title || null,
      mergedInputs ? JSON.stringify(mergedInputs) : null,
      updates.dependencies ? JSON.stringify(updates.dependencies) : null,
      updates.retryCount !== undefined ? updates.retryCount : null,
      updates.maxRetries !== undefined ? updates.maxRetries : null,
      updates.verificationStrategy ? JSON.stringify(updates.verificationStrategy) : null,
      updates.verificationResult ? JSON.stringify(updates.verificationResult) : null,
      updates.observation ? JSON.stringify(updates.observation) : null,
      updates.result || null,
      updates.error ? JSON.stringify([updates.error]) : null,
      updates.startedAt || null,
      updates.completedAt || null,
      id
    );
  }

  public updateStatus(id: string, status: TaskStatus, startedAt?: string, completedAt?: string): void {
    const stmt = this.db.prepare(`
      UPDATE agent_tasks SET status = ?, started_at = COALESCE(?, started_at), completed_at = ? WHERE id = ?
    `);
    stmt.run(status, startedAt || null, completedAt || null, id);
  }

  public saveResult(taskId: string, result: AgentResult): void {
    const stmt = this.db.prepare(`
      UPDATE agent_tasks SET
        status = ?,
        result_summary = ?,
        result_output = ?,
        result_tool_calls = ?,
        result_errors = ?,
        result_child_task_ids = ?,
        verification_result = COALESCE(?, verification_result),
        observation = COALESCE(?, observation),
        started_at = COALESCE(started_at, ?),
        completed_at = ?
      WHERE id = ?
    `);
    stmt.run(
      result.status,
      result.summary,
      result.output !== undefined ? JSON.stringify(result.output) : null,
      JSON.stringify(result.toolCalls),
      JSON.stringify(result.errors),
      JSON.stringify(result.childTaskIds),
      result.verificationResult ? JSON.stringify(result.verificationResult) : null,
      result.observation ? JSON.stringify(result.observation) : null,
      result.startedAt,
      result.completedAt,
      taskId
    );
  }

  public listByMission(missionId: string): AgentTask[] {
    const rows = this.db.prepare(
      'SELECT * FROM agent_tasks WHERE mission_id = ? ORDER BY created_at ASC'
    ).all(missionId) as unknown as RawTaskRow[];
    return rows.map(r => this.rowToTask(r));
  }

  public listByAgent(agentId: string, limit = 50): AgentTask[] {
    const rows = this.db.prepare(
      'SELECT * FROM agent_tasks WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(agentId, limit) as unknown as RawTaskRow[];
    return rows.map(r => this.rowToTask(r));
  }

  public listChildren(parentTaskId: string): AgentTask[] {
    const rows = this.db.prepare(
      'SELECT * FROM agent_tasks WHERE parent_task_id = ? ORDER BY created_at ASC'
    ).all(parentTaskId) as unknown as RawTaskRow[];
    return rows.map(r => this.rowToTask(r));
  }

  public listActive(): AgentTask[] {
    const rows = this.db.prepare(
      "SELECT * FROM agent_tasks WHERE status IN ('pending', 'ready', 'queued', 'running', 'waiting', 'verifying', 'retrying') ORDER BY created_at ASC"
    ).all() as unknown as RawTaskRow[];
    return rows.map(r => this.rowToTask(r));
  }

  public listByStatus(status: TaskStatus, limit = 50): AgentTask[] {
    const rows = this.db.prepare(
      'SELECT * FROM agent_tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?'
    ).all(status, limit) as unknown as RawTaskRow[];
    return rows.map(r => this.rowToTask(r));
  }

  public list(limit = 50, offset = 0): AgentTask[] {
    const rows = this.db.prepare(
      'SELECT * FROM agent_tasks ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as unknown as RawTaskRow[];
    return rows.map(r => this.rowToTask(r));
  }

  public countByStatus(): Record<TaskStatus, number> {
    const rows = this.db.prepare(
      'SELECT status, COUNT(*) as cnt FROM agent_tasks GROUP BY status'
    ).all() as { status: string; cnt: number }[];
    const result: Record<string, number> = {
      pending: 0,
      ready: 0,
      queued: 0,
      running: 0,
      waiting: 0,
      blocked: 0,
      verifying: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      retrying: 0
    };
    for (const row of rows) {
      result[row.status] = Number(row.cnt);
    }
    return result as Record<TaskStatus, number>;
  }

  private rowToTask(row: RawTaskRow): AgentTask {
    const parsedInputs = row.inputs ? JSON.parse(row.inputs) : {};
    return {
      id: row.id,
      agentId: row.agent_id,
      missionId: row.mission_id || undefined,
      parentTaskId: row.parent_task_id || undefined,
      objective: row.objective,
      title: row.title || undefined,
      context: row.context || undefined,
      inputs: parsedInputs,
      deterministicToolAction: parsedInputs.deterministicToolAction || undefined,
      approvalId: parsedInputs.approvalId || undefined,
      priority: row.priority as TaskPriority,
      status: (row.status as TaskStatus) || 'pending',
      depth: Number(row.depth),
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : undefined,
      retryCount: row.retry_count !== null ? Number(row.retry_count) : 0,
      maxRetries: row.max_retries !== null ? Number(row.max_retries) : 3,
      verificationStrategy: row.verification_strategy ? JSON.parse(row.verification_strategy) : undefined,
      verificationResult: row.verification_result ? JSON.parse(row.verification_result) : undefined,
      observation: row.observation ? JSON.parse(row.observation) : undefined,
      sessionId: row.session_id || undefined,
      result: row.result_summary || undefined,
      error: row.result_errors ? (JSON.parse(row.result_errors).join('; ') || undefined) : undefined,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined
    };
  }
}
