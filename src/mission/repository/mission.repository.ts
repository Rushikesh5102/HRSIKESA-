/**
 * HṚṢĪKEŚA (हृषीकेश) — Mission Repository
 *
 * FP-14: SQLite persistence layer for Missions, Outcomes, Tasks,
 * Blackboard, Artifacts, Checkpoints, Plan Versions, and Agent Capacities.
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  MissionDescriptor,
  MissionOutcome,
  MissionTask,
  BlackboardEntry,
  MissionArtifact,
  MissionCheckpoint,
  PlanVersion,
  AgentWorkforceCapacity,
} from '../types/index.js';

export class MissionRepository {
  constructor(private readonly dbManager: DatabaseManager) {}

  // ================= Missions =================

  public saveMission(mission: MissionDescriptor): void {
    const stmt = this.dbManager.prepare(`
      INSERT INTO runtime_missions (
        id, title, objective, description, owner, company_id, project_id, status,
        priority, urgency, importance, privacy_level, constraints_json, assumptions_json,
        risks_json, desired_outcome, acceptance_criteria_json, budget_limit_usd,
        deadline, parent_mission_id, current_phase, health, progress_percentage,
        confidence_score, evidence_summary, plan_version, resource_usage_json,
        metadata_json, created_at, updated_at, started_at, completed_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        objective = excluded.objective,
        description = excluded.description,
        owner = excluded.owner,
        company_id = excluded.company_id,
        project_id = excluded.project_id,
        status = excluded.status,
        priority = excluded.priority,
        urgency = excluded.urgency,
        importance = excluded.importance,
        privacy_level = excluded.privacy_level,
        constraints_json = excluded.constraints_json,
        assumptions_json = excluded.assumptions_json,
        risks_json = excluded.risks_json,
        desired_outcome = excluded.desired_outcome,
        acceptance_criteria_json = excluded.acceptance_criteria_json,
        budget_limit_usd = excluded.budget_limit_usd,
        deadline = excluded.deadline,
        parent_mission_id = excluded.parent_mission_id,
        current_phase = excluded.current_phase,
        health = excluded.health,
        progress_percentage = excluded.progress_percentage,
        confidence_score = excluded.confidence_score,
        evidence_summary = excluded.evidence_summary,
        plan_version = excluded.plan_version,
        resource_usage_json = excluded.resource_usage_json,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at;
    `);

    stmt.run(
      mission.missionId,
      mission.title,
      mission.objective,
      mission.description || mission.objective,
      mission.owner || 'Rushikesh',
      mission.companyId || null,
      mission.projectId || null,
      mission.status,
      mission.priority,
      mission.urgency || 5,
      mission.importance || 5,
      mission.privacyLevel || 'PRIVATE',
      JSON.stringify(mission.constraints || []),
      JSON.stringify(mission.assumptions || []),
      JSON.stringify(mission.risks || []),
      mission.desiredOutcome || '',
      JSON.stringify(mission.acceptanceCriteria || []),
      mission.budgetLimitUsd || null,
      mission.deadline || null,
      mission.parentMissionId || null,
      mission.currentPhase || 'PLANNING',
      mission.health || 'HEALTHY',
      mission.progress ?? mission.progressPercentage ?? 0,
      mission.confidenceScore || 1.0,
      mission.evidenceSummary || (mission.evidence ? mission.evidence.join('; ') : null),
      mission.planVersion || 1,
      JSON.stringify(mission.resourceUsage || {}),
      JSON.stringify(mission.metadata || {}),
      mission.createdAt || new Date().toISOString(),
      mission.updatedAt || new Date().toISOString(),
      mission.startedAt || null,
      mission.completedAt || null
    );
  }

  public getMission(id: string): MissionDescriptor | null {
    const stmt = this.dbManager.prepare(`SELECT * FROM runtime_missions WHERE id = ?;`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapMissionRow(row);
  }

  public listMissions(filter?: {
    status?: string;
    companyId?: string;
    projectId?: string;
    owner?: string;
  }): MissionDescriptor[] {
    let sql = 'SELECT * FROM runtime_missions WHERE 1=1';
    const params: any[] = [];

    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.companyId) {
      sql += ' AND company_id = ?';
      params.push(filter.companyId);
    }
    if (filter?.projectId) {
      sql += ' AND project_id = ?';
      params.push(filter.projectId);
    }
    if (filter?.owner) {
      sql += ' AND owner = ?';
      params.push(filter.owner);
    }

    sql += ' ORDER BY created_at DESC;';
    const stmt = this.dbManager.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapMissionRow(r));
  }

  public deleteMission(id: string): void {
    const stmt = this.dbManager.prepare(`DELETE FROM runtime_missions WHERE id = ?;`);
    stmt.run(id);
  }

  /**
   * Convenience method to update mission status, progress and phase atomically.
   * Used by execution coordinator and CLI without requiring full object reload.
   */
  public updateMissionStatus(
    id: string,
    status: string,
    progress: number,
    currentPhase: string
  ): void {
    const stmt = this.dbManager.prepare(`
      UPDATE runtime_missions
      SET status = ?, progress_percentage = ?, current_phase = ?, updated_at = ?
      WHERE id = ?;
    `);
    stmt.run(status, progress, currentPhase, new Date().toISOString(), id);
  }

  // ================= Outcomes =================

  public saveOutcome(outcome: MissionOutcome): void {
    const parent = this.getMission(outcome.missionId);
    if (!parent) {
      this.saveMission({
        missionId: outcome.missionId,
        title: `Auto Mission ${outcome.missionId}`,
        objective: 'Implicit parent mission for outcome',
        owner: 'Rushikesh',
        status: 'READY',
        priority: 'NORMAL',
        urgency: 5,
        importance: 5,
        privacyLevel: 'PRIVATE',
        constraints: [],
        assumptions: [],
        risks: [],
        desiredOutcome: outcome.description,
        acceptanceCriteria: outcome.acceptanceCriteria || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentPhase: 'EXECUTION',
        health: 'HEALTHY',
        progress: 0,
        progressPercentage: 0,
        confidenceScore: 1.0,
        planVersion: 1,
        resourceUsage: {},
      });
    }

    const stmt = this.dbManager.prepare(`
      INSERT INTO runtime_mission_outcomes (
        id, mission_id, title, description, priority, status,
        assigned_milestone_id, dependencies_json, acceptance_criteria_json,
        evidence_json, verification_state, confidence_score, weight,
        is_critical_path, requires_human_approval, is_approved_by_human,
        verified_at, verified_by_agent_id, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        priority = excluded.priority,
        status = excluded.status,
        assigned_milestone_id = excluded.assigned_milestone_id,
        dependencies_json = excluded.dependencies_json,
        acceptance_criteria_json = excluded.acceptance_criteria_json,
        evidence_json = excluded.evidence_json,
        verification_state = excluded.verification_state,
        confidence_score = excluded.confidence_score,
        weight = excluded.weight,
        is_critical_path = excluded.is_critical_path,
        requires_human_approval = excluded.requires_human_approval,
        is_approved_by_human = excluded.is_approved_by_human,
        verified_at = excluded.verified_at,
        verified_by_agent_id = excluded.verified_by_agent_id,
        updated_at = excluded.updated_at;
    `);

    stmt.run(
      outcome.outcomeId,
      outcome.missionId,
      outcome.description,
      outcome.description,
      outcome.priority || 'NORMAL',
      outcome.status,
      null,
      JSON.stringify(outcome.dependencies || []),
      JSON.stringify(outcome.acceptanceCriteria || []),
      JSON.stringify(outcome.evidence || []),
      outcome.verificationState || 'UNVERIFIED',
      outcome.confidence ?? 1.0,
      outcome.weight || 10,
      0,
      0,
      0,
      outcome.verifiedAt || null,
      outcome.verifiedByAgentId || null,
      outcome.createdAt || new Date().toISOString(),
      outcome.updatedAt || new Date().toISOString()
    );
  }

  public getOutcome(id: string): MissionOutcome | null {
    const stmt = this.dbManager.prepare(`SELECT * FROM runtime_mission_outcomes WHERE id = ?;`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapOutcomeRow(row);
  }

  public listOutcomes(missionId: string): MissionOutcome[] {
    const stmt = this.dbManager.prepare(`
      SELECT * FROM runtime_mission_outcomes WHERE mission_id = ? ORDER BY weight DESC, created_at ASC;
    `);
    const rows = stmt.all(missionId) as Record<string, unknown>[];
    return rows.map((r) => this.mapOutcomeRow(r));
  }

  public getOutcomes(missionId: string): MissionOutcome[] {
    return this.listOutcomes(missionId);
  }

  // ================= Tasks =================

  public saveTask(task: MissionTask): void {
    const parentOutcome = this.getOutcome(task.outcomeId);
    if (!parentOutcome) {
      this.saveOutcome({
        outcomeId: task.outcomeId,
        missionId: task.missionId,
        description: `Implicit outcome for ${task.title}`,
        acceptanceCriteria: [],
        priority: 'NORMAL',
        status: 'PENDING',
        verificationState: 'UNVERIFIED',
        confidence: 1.0,
        weight: 10,
        dependencies: [],
      });
    }

    const stmt = this.dbManager.prepare(`
      INSERT INTO runtime_mission_tasks (
        id, mission_id, outcome_id, title, description, kind, status,
        primary_agent_id, assisting_agent_ids_json, required_capabilities_json,
        required_skills_json, workflow_id, workspace_id, account_id,
        dependencies_json, priority, risk_tier, requires_human_approval,
        is_approved_by_human, approval_reason, input_payload_json,
        output_result_json, evidence_json, failure_history_json,
        retry_count, max_retries, timeout_ms, claimed_at, started_at,
        completed_at, estimated_duration_ms, actual_duration_ms, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        kind = excluded.kind,
        status = excluded.status,
        primary_agent_id = excluded.primary_agent_id,
        assisting_agent_ids_json = excluded.assisting_agent_ids_json,
        required_capabilities_json = excluded.required_capabilities_json,
        required_skills_json = excluded.required_skills_json,
        workflow_id = excluded.workflow_id,
        workspace_id = excluded.workspace_id,
        account_id = excluded.account_id,
        dependencies_json = excluded.dependencies_json,
        priority = excluded.priority,
        risk_tier = excluded.risk_tier,
        requires_human_approval = excluded.requires_human_approval,
        is_approved_by_human = excluded.is_approved_by_human,
        approval_reason = excluded.approval_reason,
        input_payload_json = excluded.input_payload_json,
        output_result_json = excluded.output_result_json,
        evidence_json = excluded.evidence_json,
        failure_history_json = excluded.failure_history_json,
        retry_count = excluded.retry_count,
        max_retries = excluded.max_retries,
        timeout_ms = excluded.timeout_ms,
        claimed_at = excluded.claimed_at,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        estimated_duration_ms = excluded.estimated_duration_ms,
        actual_duration_ms = excluded.actual_duration_ms,
        updated_at = excluded.updated_at;
    `);

    stmt.run(
      task.taskId,
      task.missionId,
      task.outcomeId,
      task.title,
      task.description || task.title,
      task.executionKind || task.kind || 'AGENT_DIRECT',
      task.status,
      task.assignedAgent || task.primaryAgentId || 'Gāṇḍīva',
      JSON.stringify(task.assistingAgentIds || []),
      JSON.stringify(task.requiredCapabilities || []),
      JSON.stringify(task.requiredSkills || []),
      task.workflowId || null,
      task.workspaceId || null,
      task.accountId || null,
      JSON.stringify(task.dependencies || []),
      task.priority || 1,
      task.riskTier || (task.riskLevel === 'HIGH' ? 3 : 0),
      task.approvalRequired || task.requiresHumanApproval ? 1 : 0,
      task.approvedAt || task.isApprovedByHuman ? 1 : 0,
      task.approvalReason || null,
      JSON.stringify(task.inputPayload || {}),
      JSON.stringify(task.outputResult || {}),
      JSON.stringify(task.evidence || []),
      JSON.stringify(task.failureHistory || (task.failure ? [task.failure] : [])),
      task.retryCount || 0,
      task.maxRetries || 3,
      task.timeoutMs || 60000,
      task.claimedAt || null,
      task.startedAt || null,
      task.completedAt || null,
      task.estimatedDurationMs || 0,
      task.actualDurationMs || 0,
      task.createdAt || new Date().toISOString(),
      task.updatedAt || new Date().toISOString()
    );
  }

  public getTask(id: string): MissionTask | null {
    const stmt = this.dbManager.prepare(`SELECT * FROM runtime_mission_tasks WHERE id = ?;`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapTaskRow(row);
  }

  public listTasks(missionId: string, outcomeId?: string): MissionTask[] {
    let sql = 'SELECT * FROM runtime_mission_tasks WHERE mission_id = ?';
    const params: any[] = [missionId];
    if (outcomeId) {
      sql += ' AND outcome_id = ?';
      params.push(outcomeId);
    }
    sql += ' ORDER BY priority ASC, created_at ASC;';
    const stmt = this.dbManager.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapTaskRow(r));
  }

  public getTasks(missionId: string): MissionTask[] {
    return this.listTasks(missionId);
  }

  // ================= Blackboard =================

  public addBlackboardEntry(entry: BlackboardEntry): void {
    const stmt = this.dbManager.prepare(`
      INSERT INTO runtime_mission_blackboard (
        id, mission_id, outcome_id, author_agent_id, type, title, content,
        confidence, provenance, is_resolved, resolved_by, resolution_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        is_resolved = excluded.is_resolved,
        resolved_by = excluded.resolved_by,
        resolution_notes = excluded.resolution_notes;
    `);

    stmt.run(
      entry.entryId,
      entry.missionId,
      entry.outcomeId || null,
      entry.author || entry.authorAgentId || 'system',
      entry.type,
      entry.title,
      entry.content,
      entry.confidence ?? 1.0,
      entry.provenance || 'runtime',
      entry.isResolved ? 1 : 0,
      entry.resolvedBy || null,
      entry.resolutionNotes || null,
      entry.createdAt || entry.timestamp || new Date().toISOString()
    );
  }

  public getBlackboardEntries(missionId: string): BlackboardEntry[] {
    const stmt = this.dbManager.prepare(`
      SELECT * FROM runtime_mission_blackboard WHERE mission_id = ? ORDER BY created_at ASC;
    `);
    const rows = stmt.all(missionId) as Record<string, unknown>[];
    return rows.map((r) => this.mapBlackboardRow(r));
  }

  // ================= Artifacts =================

  public saveArtifact(artifact: MissionArtifact): void {
    const stmt = this.dbManager.prepare(`
      INSERT INTO runtime_mission_artifacts (
        id, mission_id, outcome_id, task_id, owner_agent_id, type, name,
        location, checksum, version, verification_state, provenance, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        verification_state = excluded.verification_state,
        version = excluded.version,
        checksum = excluded.checksum;
    `);

    stmt.run(
      artifact.artifactId,
      artifact.missionId,
      artifact.outcomeId || null,
      artifact.taskId || null,
      artifact.ownerAgent || artifact.ownerAgentId || 'Gāṇḍīva',
      artifact.type,
      artifact.name,
      artifact.location,
      artifact.checksum || null,
      typeof artifact.version === 'number' ? artifact.version : 1,
      artifact.verificationState || 'VERIFIED',
      artifact.provenance || 'runtime',
      JSON.stringify({}),
      artifact.createdAt || new Date().toISOString()
    );
  }

  public listArtifacts(missionId: string): MissionArtifact[] {
    const stmt = this.dbManager.prepare(`
      SELECT * FROM runtime_mission_artifacts WHERE mission_id = ? ORDER BY created_at ASC;
    `);
    const rows = stmt.all(missionId) as Record<string, unknown>[];
    return rows.map((r) => this.mapArtifactRow(r));
  }

  public getArtifacts(missionId: string): MissionArtifact[] {
    return this.listArtifacts(missionId);
  }

  // ================= Checkpoints =================

  public saveCheckpoint(checkpoint: MissionCheckpoint): void {
    const stmt = this.dbManager.prepare(`
      INSERT INTO runtime_mission_checkpoints (
        id, mission_id, plan_version, mission_descriptor_json, outcomes_json,
        tasks_json, blackboard_json, artifacts_json, active_agent_assignments_json,
        active_workspace_ids_json, sha256_checksum, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING;
    `);

    stmt.run(
      checkpoint.checkpointId,
      checkpoint.missionId,
      checkpoint.planVersion,
      JSON.stringify(checkpoint.stateSnapshot || {}),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify({}),
      JSON.stringify([]),
      checkpoint.checksum,
      checkpoint.createdAt || new Date().toISOString()
    );
  }

  public listCheckpoints(missionId: string): MissionCheckpoint[] {
    const stmt = this.dbManager.prepare(`
      SELECT * FROM runtime_mission_checkpoints WHERE mission_id = ? ORDER BY plan_version ASC;
    `);
    const rows = stmt.all(missionId) as Record<string, unknown>[];
    return rows.map((r) => ({
      checkpointId: r.id as string,
      missionId: r.mission_id as string,
      planVersion: Number(r.plan_version),
      stateSnapshot: JSON.parse((r.mission_descriptor_json as string) || '{}'),
      checksum: r.sha256_checksum as string,
      createdAt: r.created_at as string,
      reason: 'State sync',
    }));
  }

  public getCheckpoints(missionId: string): MissionCheckpoint[] {
    return this.listCheckpoints(missionId);
  }

  // ================= Plan Versions =================

  public savePlanVersion(version: PlanVersion): void {
    const stmt = this.dbManager.prepare(`
      INSERT INTO runtime_mission_plan_versions (
        id, mission_id, version_number, reason_for_change, author_agent_id,
        previous_plan_version_number, outcomes_snapshot_json, tasks_snapshot_json,
        plan_diff_summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING;
    `);

    stmt.run(
      version.versionId || `pv_${version.missionId}_${version.version || 1}`,
      version.missionId,
      version.version || version.planVersionNumber || 1,
      version.reason || 'Plan revision',
      version.author || 'system',
      (version.version && version.version > 1 ? version.version - 1 : null),
      JSON.stringify(version.outcomesSnapshot || []),
      JSON.stringify(version.tasksSnapshot || []),
      version.planDiffSummary || null,
      version.timestamp || new Date().toISOString()
    );
  }

  public listPlanVersions(missionId: string): PlanVersion[] {
    const stmt = this.dbManager.prepare(`
      SELECT * FROM runtime_mission_plan_versions WHERE mission_id = ? ORDER BY version_number ASC;
    `);
    const rows = stmt.all(missionId) as Record<string, unknown>[];
    return rows.map((r) => ({
      versionId: r.id as string,
      version: Number(r.version_number),
      missionId: r.mission_id as string,
      planVersionNumber: Number(r.version_number),
      reason: r.reason_for_change as string,
      author: r.author_agent_id as string,
      outcomesSnapshot: JSON.parse((r.outcomes_snapshot_json as string) || '[]'),
      tasksSnapshot: JSON.parse((r.tasks_snapshot_json as string) || '[]'),
      timestamp: r.created_at as string,
    }));
  }

  public getPlanVersions(missionId: string): PlanVersion[] {
    return this.listPlanVersions(missionId);
  }

  // ================= Workforce Capacity =================

  public saveCapacity(capacity: AgentWorkforceCapacity): void {
    const stmt = this.dbManager.prepare(`
      INSERT INTO runtime_workforce_capacity (
        agent_id, status, active_tasks_count, queued_tasks_count,
        max_concurrent_tasks, current_mission_ids_json, current_workload_score,
        historical_success_rate, active_workspace_id, last_active_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET
        status = excluded.status,
        active_tasks_count = excluded.active_tasks_count,
        queued_tasks_count = excluded.queued_tasks_count,
        current_mission_ids_json = excluded.current_mission_ids_json,
        current_workload_score = excluded.current_workload_score,
        historical_success_rate = excluded.historical_success_rate,
        active_workspace_id = excluded.active_workspace_id,
        last_active_timestamp = excluded.last_active_timestamp;
    `);

    stmt.run(
      capacity.agentId,
      capacity.status,
      capacity.activeTaskIds.length,
      capacity.queuedTaskIds.length,
      capacity.maxConcurrentTasks,
      JSON.stringify(capacity.currentMissionIds || []),
      capacity.currentWorkloadScore,
      capacity.historicalSuccessRate,
      capacity.activeWorkspaceId || null,
      capacity.lastActiveTimestamp || new Date().toISOString()
    );
  }

  // ================= Mappers =================

  private mapMissionRow(row: Record<string, unknown>): MissionDescriptor {
    return {
      missionId: row.id as string,
      title: row.title as string,
      objective: row.objective as string,
      description: (row.description as string) || undefined,
      owner: row.owner as string,
      companyId: (row.company_id as string) || undefined,
      projectId: (row.project_id as string) || undefined,
      status: row.status as any,
      priority: row.priority as any,
      urgency: Number(row.urgency || 5),
      importance: Number(row.importance || 5),
      privacyLevel: row.privacy_level as any,
      constraints: JSON.parse((row.constraints_json as string) || '[]'),
      assumptions: JSON.parse((row.assumptions_json as string) || '[]'),
      risks: JSON.parse((row.risks_json as string) || '[]'),
      desiredOutcome: row.desired_outcome as string,
      acceptanceCriteria: JSON.parse((row.acceptance_criteria_json as string) || '[]'),
      budgetLimitUsd: row.budget_limit_usd ? Number(row.budget_limit_usd) : undefined,
      deadline: (row.deadline as string) || undefined,
      parentMissionId: (row.parent_mission_id as string) || undefined,
      currentPhase: row.current_phase as string,
      health: row.health as any,
      progress: Number(row.progress_percentage || 0),
      progressPercentage: Number(row.progress_percentage || 0),
      confidenceScore: Number(row.confidence_score || 1.0),
      evidenceSummary: (row.evidence_summary as string) || undefined,
      planVersion: Number(row.plan_version || 1),
      resourceUsage: JSON.parse((row.resource_usage_json as string) || '{}'),
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      startedAt: (row.started_at as string) || undefined,
      completedAt: (row.completed_at as string) || undefined,
    };
  }

  private mapOutcomeRow(row: Record<string, unknown>): MissionOutcome {
    return {
      outcomeId: row.id as string,
      missionId: row.mission_id as string,
      description: row.description as string,
      priority: row.priority as any,
      status: row.status as any,
      dependencies: JSON.parse((row.dependencies_json as string) || '[]'),
      acceptanceCriteria: JSON.parse((row.acceptance_criteria_json as string) || '[]'),
      evidence: JSON.parse((row.evidence_json as string) || '[]'),
      verificationState: row.verification_state as any,
      confidence: Number(row.confidence_score || 1.0),
      weight: Number(row.weight || 10),
      verifiedAt: (row.verified_at as string) || undefined,
      verifiedByAgentId: (row.verified_by_agent_id as string) || undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapTaskRow(row: Record<string, unknown>): MissionTask {
    const rawFailureHistory = JSON.parse((row.failure_history_json as string) || '[]');
    return {
      taskId: row.id as string,
      missionId: row.mission_id as string,
      outcomeId: row.outcome_id as string,
      title: row.title as string,
      description: row.description as string,
      kind: row.kind as any,
      executionKind: row.kind as any,
      status: row.status as any,
      primaryAgentId: row.primary_agent_id as string,
      assignedAgent: row.primary_agent_id as string,
      assistingAgentIds: JSON.parse((row.assisting_agent_ids_json as string) || '[]'),
      requiredCapabilities: JSON.parse((row.required_capabilities_json as string) || '[]'),
      requiredSkills: JSON.parse((row.required_skills_json as string) || '[]'),
      workflowId: (row.workflow_id as string) || undefined,
      workspaceId: (row.workspace_id as string) || undefined,
      accountId: (row.account_id as string) || undefined,
      dependencies: JSON.parse((row.dependencies_json as string) || '[]'),
      priority: Number(row.priority || 1),
      riskTier: Number(row.risk_tier || 0),
      requiresHumanApproval: Number(row.requires_human_approval) === 1,
      approvalRequired: Number(row.requires_human_approval) === 1,
      isApprovedByHuman: Number(row.is_approved_by_human) === 1,
      approvalReason: (row.approval_reason as string) || undefined,
      inputPayload: JSON.parse((row.input_payload_json as string) || '{}'),
      outputResult: JSON.parse((row.output_result_json as string) || '{}'),
      evidence: JSON.parse((row.evidence_json as string) || '[]'),
      failureHistory: rawFailureHistory,
      failure: rawFailureHistory.length > 0 ? rawFailureHistory[rawFailureHistory.length - 1] : undefined,
      retryCount: Number(row.retry_count || 0),
      maxRetries: Number(row.max_retries || 3),
      timeoutMs: Number(row.timeout_ms || 60000),
      claimedAt: (row.claimed_at as string) || undefined,
      startedAt: (row.started_at as string) || undefined,
      completedAt: (row.completed_at as string) || undefined,
      estimatedDurationMs: Number(row.estimated_duration_ms || 0),
      actualDurationMs: Number(row.actual_duration_ms || 0),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapBlackboardRow(row: Record<string, unknown>): BlackboardEntry {
    return {
      entryId: row.id as string,
      missionId: row.mission_id as string,
      outcomeId: (row.outcome_id as string) || undefined,
      authorAgentId: row.author_agent_id as string,
      author: row.author_agent_id as string,
      type: row.type as any,
      title: row.title as string,
      content: row.content as string,
      confidence: Number(row.confidence || 1.0),
      provenance: row.provenance as string,
      isResolved: Number(row.is_resolved) === 1,
      resolvedBy: (row.resolved_by as string) || undefined,
      resolutionNotes: (row.resolution_notes as string) || undefined,
      timestamp: row.created_at as string,
      createdAt: row.created_at as string,
    };
  }

  private mapArtifactRow(row: Record<string, unknown>): MissionArtifact {
    return {
      artifactId: row.id as string,
      missionId: row.mission_id as string,
      outcomeId: (row.outcome_id as string) || undefined,
      taskId: (row.task_id as string) || undefined,
      ownerAgentId: row.owner_agent_id as string,
      ownerAgent: row.owner_agent_id as string,
      type: row.type as any,
      name: row.name as string,
      location: row.location as string,
      checksum: (row.checksum as string) || undefined,
      version: Number(row.version || 1),
      verificationState: row.verification_state as any,
      provenance: row.provenance as string,
      createdAt: row.created_at as string,
    };
  }

  public getDbManager(): DatabaseManager {
    return this.dbManager;
  }

  public close(): void {
    this.dbManager.close();
  }
}
