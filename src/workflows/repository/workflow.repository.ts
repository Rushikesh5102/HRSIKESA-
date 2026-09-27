/**
 * HṚṢĪKEŚA (हृषीकेश) — Workflow SQLite Repository
 *
 * FP-11: Data persistence layer for workflows, versions, runs, run-nodes, approvals,
 * checkpoints, schedules, artifacts, and webhooks using Node 24 native node:sqlite.
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  Workflow,
  WorkflowVersion,
  WorkflowRun,
  WorkflowRunNode,
  WorkflowApproval,
  WorkflowCheckpoint,
  WorkflowArtifact,
  WorkflowSchedule,
} from '../types/workflow.types.js';

export class WorkflowRepository {
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  // ================= Workflows =================
  public saveWorkflow(workflow: Workflow): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO workflows (
        id, name, description, category, scope, company_id, project_id,
        status, active_version, tags_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      workflow.id,
      workflow.name,
      workflow.description,
      workflow.category,
      workflow.scope,
      workflow.companyId || null,
      workflow.projectId || null,
      workflow.status,
      workflow.activeVersion,
      JSON.stringify(workflow.tags || []),
      workflow.createdAt,
      workflow.updatedAt
    );
  }

  public getWorkflow(id: string): Workflow | null {
    const stmt = this.db.prepare(`SELECT * FROM workflows WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapWorkflow(row);
  }

  public listWorkflows(filter?: {
    scope?: string;
    companyId?: string;
    projectId?: string;
    status?: string;
    limit?: number;
  }): Workflow[] {
    let sql = `SELECT * FROM workflows WHERE 1=1`;
    const params: any[] = [];

    if (filter?.scope) {
      sql += ` AND scope = ?`;
      params.push(filter.scope);
    }
    if (filter?.companyId) {
      sql += ` AND company_id = ?`;
      params.push(filter.companyId);
    }
    if (filter?.projectId) {
      sql += ` AND project_id = ?`;
      params.push(filter.projectId);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }
    sql += ` ORDER BY updated_at DESC LIMIT ?`;
    params.push(filter?.limit || 100);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r: any) => this.mapWorkflow(r));
  }

  public updateWorkflowStatus(id: string, status: Workflow['status']): void {
    const stmt = this.db.prepare(
      `UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?`
    );
    stmt.run(status, new Date().toISOString(), id);
  }

  public updateWorkflowActiveVersion(id: string, activeVersion: number): void {
    const stmt = this.db.prepare(
      `UPDATE workflows SET active_version = ?, updated_at = ? WHERE id = ?`
    );
    stmt.run(activeVersion, new Date().toISOString(), id);
  }

  public deleteWorkflow(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM workflows WHERE id = ?`);
    stmt.run(id);
  }

  // ================= Workflow Versions =================
  public saveVersion(version: WorkflowVersion): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO workflow_versions (
        id, workflow_id, version_number, description, graph_json,
        triggers_json, variables_json, required_capabilities_json,
        required_skills_json, required_agents_json, required_permissions_json,
        timeout_seconds, max_retries, financial_approval_required, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      version.id,
      version.workflowId,
      version.versionNumber,
      version.description,
      JSON.stringify(version.graph),
      JSON.stringify(version.triggers || []),
      JSON.stringify(version.variables || []),
      JSON.stringify(version.requiredCapabilities || []),
      JSON.stringify(version.requiredSkills || []),
      JSON.stringify(version.requiredAgents || []),
      JSON.stringify(version.requiredPermissions || []),
      version.timeoutSeconds,
      version.maxRetries,
      version.financialApprovalRequired ? 1 : 0,
      version.createdAt
    );
  }

  public getVersion(workflowId: string, versionNumber: number): WorkflowVersion | null {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_versions WHERE workflow_id = ? AND version_number = ?`
    );
    const row = stmt.get(workflowId, versionNumber) as any;
    if (!row) return null;
    return this.mapVersion(row);
  }

  public getVersionById(id: string): WorkflowVersion | null {
    const stmt = this.db.prepare(`SELECT * FROM workflow_versions WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapVersion(row);
  }

  public getLatestVersion(workflowId: string): WorkflowVersion | null {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version_number DESC LIMIT 1`
    );
    const row = stmt.get(workflowId) as any;
    if (!row) return null;
    return this.mapVersion(row);
  }

  public listVersions(workflowId: string): WorkflowVersion[] {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version_number ASC`
    );
    const rows = stmt.all(workflowId) as any[];
    return rows.map((r: any) => this.mapVersion(r));
  }

  // ================= Workflow Runs =================
  public saveRun(run: WorkflowRun): void {
    const stmt = this.db.prepare(
      `INSERT INTO workflow_runs (
        id, workflow_id, version_id, version_number, status, trigger_type,
        trigger_payload_json, input_variables_json, current_variables_json,
        active_node_ids_json, completed_node_ids_json, failed_node_ids_json,
        iteration_counts_json, error_message, failure_reason, resource_usage_json,
        checkpoint_id, company_id, project_id, started_at, completed_at, paused_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        version_id = excluded.version_id,
        version_number = excluded.version_number,
        status = excluded.status,
        trigger_type = excluded.trigger_type,
        trigger_payload_json = excluded.trigger_payload_json,
        input_variables_json = excluded.input_variables_json,
        current_variables_json = excluded.current_variables_json,
        active_node_ids_json = excluded.active_node_ids_json,
        completed_node_ids_json = excluded.completed_node_ids_json,
        failed_node_ids_json = excluded.failed_node_ids_json,
        iteration_counts_json = excluded.iteration_counts_json,
        error_message = excluded.error_message,
        failure_reason = excluded.failure_reason,
        resource_usage_json = excluded.resource_usage_json,
        checkpoint_id = excluded.checkpoint_id,
        company_id = excluded.company_id,
        project_id = excluded.project_id,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        paused_at = excluded.paused_at`
    );
    stmt.run(
      run.id,
      run.workflowId,
      run.versionId,
      run.versionNumber,
      run.status,
      run.triggerType,
      JSON.stringify(run.triggerPayload || {}),
      JSON.stringify(run.inputVariables || {}),
      JSON.stringify(run.currentVariables || {}),
      JSON.stringify(run.activeNodeIds || []),
      JSON.stringify(run.completedNodeIds || []),
      JSON.stringify(run.failedNodeIds || []),
      JSON.stringify(run.iterationCounts || {}),
      run.errorMessage || null,
      run.failureReason || null,
      JSON.stringify(run.resourceUsage || {}),
      run.checkpointId || null,
      run.companyId || null,
      run.projectId || null,
      run.startedAt,
      run.completedAt || null,
      run.pausedAt || null
    );
  }

  public getRun(id: string): WorkflowRun | null {
    const stmt = this.db.prepare(`SELECT * FROM workflow_runs WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapRun(row);
  }

  public listRuns(filterOrWorkflowId?: string | {
    workflowId?: string;
    status?: string;
    limit?: number;
  }): WorkflowRun[] {
    const filter = typeof filterOrWorkflowId === 'string'
      ? { workflowId: filterOrWorkflowId }
      : filterOrWorkflowId;

    let sql = `SELECT * FROM workflow_runs WHERE 1=1`;
    const params: any[] = [];

    if (filter?.workflowId) {
      sql += ` AND workflow_id = ?`;
      params.push(filter.workflowId);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }
    sql += ` ORDER BY started_at DESC LIMIT ?`;
    params.push(filter?.limit || 100);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r: any) => this.mapRun(r));
  }

  public listIncompleteRuns(): WorkflowRun[] {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_runs WHERE status IN ('RUNNING', 'WAITING', 'WAITING_APPROVAL', 'RETRYING', 'RECOVERING', 'QUEUED')`
    );
    const rows = stmt.all() as any[];
    return rows.map((r: any) => this.mapRun(r));
  }

  // ================= Workflow Run Nodes =================
  public saveRunNode(node: WorkflowRunNode): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO workflow_run_nodes (
        id, run_id, node_id, node_name, node_type, attempt_number, status,
        input_data_json, output_data_json, error, started_at, completed_at,
        duration_ms, agent_id, model_id, capability_id, tool_calls, artifacts_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      node.id,
      node.runId,
      node.nodeId,
      node.nodeName,
      node.nodeType,
      node.attemptNumber,
      node.status,
      JSON.stringify(node.inputData || {}),
      JSON.stringify(node.outputData || {}),
      node.error || null,
      node.startedAt,
      node.completedAt || null,
      node.durationMs,
      node.agentId || null,
      node.modelId || null,
      node.capabilityId || null,
      node.toolCalls,
      JSON.stringify(node.artifacts || [])
    );
  }

  public getRunNode(runId: string, nodeId: string): WorkflowRunNode | null {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_run_nodes WHERE run_id = ? AND node_id = ? ORDER BY attempt_number DESC LIMIT 1`
    );
    const row = stmt.get(runId, nodeId) as any;
    if (!row) return null;
    return this.mapRunNode(row);
  }

  public listRunNodes(runId: string): WorkflowRunNode[] {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_run_nodes WHERE run_id = ? ORDER BY started_at ASC`
    );
    const rows = stmt.all(runId) as any[];
    return rows.map((r: any) => this.mapRunNode(r));
  }

  public saveApproval(approval: WorkflowApproval): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO workflow_approvals (
        id, run_id, workflow_id, node_id, node_name, prompt, risk_level,
        payload_summary_json, status, requested_at, responded_at, decided_by, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      approval.id,
      approval.runId,
      approval.workflowId,
      approval.nodeId,
      approval.nodeName,
      approval.prompt,
      approval.riskLevel,
      JSON.stringify(approval.payloadSummary || {}),
      approval.status,
      approval.requestedAt,
      approval.respondedAt || null,
      approval.decidedBy || null,
      approval.comments || null
    );
  }

  public getApproval(id: string): WorkflowApproval | null {
    const stmt = this.db.prepare(`SELECT * FROM workflow_approvals WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapApproval(row);
  }

  public getPendingApprovalForRun(runId: string): WorkflowApproval | null {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_approvals WHERE run_id = ? AND status = 'PENDING' LIMIT 1`
    );
    const row = stmt.get(runId) as any;
    if (!row) return null;
    return this.mapApproval(row);
  }

  public listApprovals(filterOrRunId?: string | { runId?: string; status?: string; limit?: number }): WorkflowApproval[] {
    const filter = typeof filterOrRunId === 'string' ? { runId: filterOrRunId } : filterOrRunId;
    let sql = `SELECT * FROM workflow_approvals WHERE 1=1`;
    const params: any[] = [];
    if (filter?.runId) {
      sql += ` AND run_id = ?`;
      params.push(filter.runId);
    }
    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }
    const limit = Math.max(1, Math.min(1000, Number(filter?.limit) || 100));
    sql += ` ORDER BY requested_at DESC LIMIT ${limit}`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r: any) => this.mapApproval(r));
  }

  // ================= Workflow Checkpoints =================
  public saveCheckpoint(checkpoint: WorkflowCheckpoint): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO workflow_checkpoints (
        id, run_id, node_id, idempotency_key, state_snapshot_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      checkpoint.id,
      checkpoint.runId,
      checkpoint.nodeId,
      checkpoint.idempotencyKey,
      JSON.stringify(checkpoint.stateSnapshot),
      checkpoint.createdAt
    );
  }

  public getLatestCheckpoint(runId: string): WorkflowCheckpoint | null {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_checkpoints WHERE run_id = ? ORDER BY created_at DESC LIMIT 1`
    );
    const row = stmt.get(runId) as any;
    if (!row) return null;
    return this.mapCheckpoint(row);
  }

  public getCheckpointByKey(idempotencyKey: string): WorkflowCheckpoint | null {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_checkpoints WHERE idempotency_key = ? LIMIT 1`
    );
    const row = stmt.get(idempotencyKey) as any;
    if (!row) return null;
    return this.mapCheckpoint(row);
  }

  // ================= Workflow Artifacts =================
  public saveArtifact(artifact: WorkflowArtifact): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO workflow_artifacts (
        id, run_id, node_id, name, type, path, uri, size_bytes, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      artifact.id,
      artifact.runId,
      artifact.nodeId,
      artifact.name,
      artifact.type,
      artifact.path || null,
      artifact.uri || null,
      artifact.sizeBytes,
      JSON.stringify(artifact.metadata || {}),
      artifact.createdAt
    );
  }

  public listArtifacts(runId: string): WorkflowArtifact[] {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_artifacts WHERE run_id = ? ORDER BY created_at ASC`
    );
    const rows = stmt.all(runId) as any[];
    return rows.map((r: any) => this.mapArtifact(r));
  }

  // ================= Workflow Schedules =================
  public saveSchedule(schedule: WorkflowSchedule): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO workflow_schedules (
        id, workflow_id, trigger_id, schedule_type, cron_expression,
        interval_seconds, next_run_at, last_run_at, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      schedule.id,
      schedule.workflowId,
      schedule.triggerId,
      schedule.scheduleType,
      schedule.cronExpression || null,
      schedule.intervalSeconds || null,
      schedule.nextRunAt || null,
      schedule.lastRunAt || null,
      schedule.enabled ? 1 : 0
    );
  }

  public listSchedules(enabledOnly = true): WorkflowSchedule[] {
    const sql = enabledOnly
      ? `SELECT * FROM workflow_schedules WHERE enabled = 1`
      : `SELECT * FROM workflow_schedules`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as any[];
    return rows.map((r: any) => ({
      id: r.id,
      workflowId: r.workflow_id,
      triggerId: r.trigger_id,
      scheduleType: r.schedule_type,
      cronExpression: r.cron_expression || undefined,
      intervalSeconds: r.interval_seconds || undefined,
      nextRunAt: r.next_run_at || undefined,
      lastRunAt: r.last_run_at || undefined,
      enabled: r.enabled === 1,
    }));
  }

  public updateScheduleNextRun(id: string, nextRunAt: string, lastRunAt?: string): void {
    const stmt = this.db.prepare(
      `UPDATE workflow_schedules SET next_run_at = ?, last_run_at = coalesce(?, last_run_at) WHERE id = ?`
    );
    stmt.run(nextRunAt, lastRunAt || null, id);
  }

  // ================= Webhooks =================
  public saveWebhook(webhook: {
    id: string;
    workflowId: string;
    webhookPath: string;
    webhookSecret: string;
    signatureHeader?: string;
    enabled?: boolean;
    createdAt: string;
  }): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO workflow_webhooks (
        id, workflow_id, webhook_path, webhook_secret, signature_header, enabled, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      webhook.id,
      webhook.workflowId,
      webhook.webhookPath,
      webhook.webhookSecret,
      webhook.signatureHeader || 'X-Hub-Signature-256',
      webhook.enabled !== false ? 1 : 0,
      webhook.createdAt
    );
  }

  public getWebhookByPath(webhookPath: string): any | null {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_webhooks WHERE webhook_path = ? AND enabled = 1`
    );
    const row = stmt.get(webhookPath) as any;
    if (!row) return null;
    return {
      id: row.id,
      workflowId: row.workflow_id,
      webhookPath: row.webhook_path,
      webhookSecret: row.webhook_secret,
      signatureHeader: row.signature_header,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
    };
  }
  public getSchedule(workflowId: string): WorkflowSchedule | null {
    const stmt = this.db.prepare(
      `SELECT * FROM workflow_schedules WHERE workflow_id = ? ORDER BY id DESC LIMIT 1`
    );
    const row = stmt.get(workflowId) as any;
    if (!row) return null;
    return this.mapSchedule(row);
  }

  public getArtifactsForRun(runId: string): WorkflowArtifact[] {
    return this.listArtifacts(runId);
  }
  // ================= Helper Mappers =================
  private safeParse<T>(jsonStr: string | null | undefined, defaultValue: T): T {
    if (!jsonStr) return defaultValue;
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      return defaultValue;
    }
  }

  private mapWorkflow(r: any): Workflow {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      scope: r.scope,
      companyId: r.company_id || undefined,
      projectId: r.project_id || undefined,
      status: r.status,
      activeVersion: r.active_version,
      tags: this.safeParse(r.tags_json, []),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapVersion(r: any): WorkflowVersion {
    return {
      id: r.id,
      workflowId: r.workflow_id,
      versionNumber: r.version_number,
      description: r.description,
      graph: this.safeParse(r.graph_json, { nodes: [], edges: [] }),
      triggers: this.safeParse(r.triggers_json, []),
      variables: this.safeParse(r.variables_json, []),
      requiredCapabilities: this.safeParse(r.required_capabilities_json, []),
      requiredSkills: this.safeParse(r.required_skills_json, []),
      requiredAgents: this.safeParse(r.required_agents_json, []),
      requiredPermissions: this.safeParse(r.required_permissions_json, []),
      timeoutSeconds: r.timeout_seconds,
      maxRetries: r.max_retries,
      financialApprovalRequired: r.financial_approval_required === 1,
      createdAt: r.created_at,
    };
  }

  private mapRun(r: any): WorkflowRun {
    return {
      id: r.id,
      workflowId: r.workflow_id,
      versionId: r.version_id,
      versionNumber: r.version_number,
      status: r.status,
      triggerType: r.trigger_type,
      triggerPayload: this.safeParse(r.trigger_payload_json, {}),
      inputVariables: this.safeParse(r.input_variables_json, {}),
      currentVariables: this.safeParse(r.current_variables_json, {}),
      activeNodeIds: this.safeParse(r.active_node_ids_json, []),
      completedNodeIds: this.safeParse(r.completed_node_ids_json, []),
      failedNodeIds: this.safeParse(r.failed_node_ids_json, []),
      iterationCounts: this.safeParse(r.iteration_counts_json, {}),
      errorMessage: r.error_message || undefined,
      failureReason: r.failure_reason || undefined,
      resourceUsage: this.safeParse(r.resource_usage_json, {
        modelCalls: 0,
        toolCalls: 0,
        durationMs: 0,
      }),
      checkpointId: r.checkpoint_id || undefined,
      companyId: r.company_id || undefined,
      projectId: r.project_id || undefined,
      startedAt: r.started_at,
      completedAt: r.completed_at || undefined,
      pausedAt: r.paused_at || undefined,
    };
  }

  private mapRunNode(r: any): WorkflowRunNode {
    return {
      id: r.id,
      runId: r.run_id,
      nodeId: r.node_id,
      nodeName: r.node_name,
      nodeType: r.node_type,
      attemptNumber: r.attempt_number,
      status: r.status,
      inputData: this.safeParse(r.input_data_json, {}),
      outputData: this.safeParse(r.output_data_json, {}),
      error: r.error || undefined,
      startedAt: r.started_at,
      completedAt: r.completed_at || undefined,
      durationMs: r.duration_ms,
      agentId: r.agent_id || undefined,
      modelId: r.model_id || undefined,
      capabilityId: r.capability_id || undefined,
      toolCalls: r.tool_calls,
      artifacts: this.safeParse(r.artifacts_json, []),
    };
  }

  private mapApproval(r: any): WorkflowApproval {
    return {
      id: r.id,
      runId: r.run_id,
      workflowId: r.workflow_id,
      nodeId: r.node_id,
      nodeName: r.node_name,
      prompt: r.prompt,
      riskLevel: r.risk_level,
      payloadSummary: this.safeParse(r.payload_summary_json, {}),
      status: r.status,
      requestedAt: r.requested_at,
      respondedAt: r.responded_at || undefined,
      decidedBy: r.decided_by || undefined,
      comments: r.comments || undefined,
    };
  }

  private mapCheckpoint(r: any): WorkflowCheckpoint {
    return {
      id: r.id,
      runId: r.run_id,
      nodeId: r.node_id,
      idempotencyKey: r.idempotency_key,
      stateSnapshot: this.safeParse(r.state_snapshot_json, {
        status: 'RUNNING',
        variables: {},
        activeNodeIds: [],
        completedNodeIds: [],
        iterationCounts: {},
        resourceUsage: { modelCalls: 0, toolCalls: 0, durationMs: 0 },
      }),
      createdAt: r.created_at,
    };
  }

  private mapSchedule(r: any): WorkflowSchedule {
    return {
      id: r.id,
      workflowId: r.workflow_id,
      triggerId: r.trigger_id,
      scheduleType: r.schedule_type as any,
      cronExpression: r.cron_expression || undefined,
      intervalSeconds: r.interval_seconds || undefined,
      nextRunAt: r.next_run_at || undefined,
      lastRunAt: r.last_run_at || undefined,
      enabled: r.enabled === 1,
    };
  }

  private mapArtifact(r: any): WorkflowArtifact {
    return {
      id: r.id,
      runId: r.run_id,
      nodeId: r.node_id,
      name: r.name,
      type: r.type,
      path: r.path || undefined,
      uri: r.uri || undefined,
      sizeBytes: r.size_bytes,
      metadata: this.safeParse(r.metadata_json, {}),
      createdAt: r.created_at,
    };
  }
}
