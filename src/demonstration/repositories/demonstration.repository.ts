/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-16: Demonstration Repository
 *
 * SQLite-backed persistence for demonstration sessions, semantic actions,
 * procedure proposals, and learned procedures.
 */

import { DatabaseSync } from 'node:sqlite';
import {
  DemonstrationSession,
  DemonstrationStatus,
  SemanticAction,
  DemonstrationCheckpoint,
  DemonstrationArtifact,
  ProcedureProposal,
  ProcedureProposalStatus,
  LearnedProcedure,
  LearnedProcedureVersion,
  LearnedProcedureExecutionRecord,
} from '../interfaces/demonstration.types.js';

export class DemonstrationRepository {
  constructor(private readonly db: DatabaseSync) {}

  // ─── Sessions ──────────────────────────────────────────────────────────────

  public createSession(data: Omit<DemonstrationSession, 'actionCount' | 'checkpointCount' | 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }): DemonstrationSession {
    const now = new Date().toISOString();
    const session: DemonstrationSession = {
      ...data,
      actionCount: 0,
      checkpointCount: 0,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };

    this.db.prepare(`
      INSERT INTO demonstration_sessions (
        id, owner, company_id, project_id, workspace_id, title, objective, status, scope,
        started_at, ended_at, paused_at, resumed_at, environment,
        observation_sources_json, action_count, checkpoint_count,
        teaching_mode, voice_annotations_enabled, inferred_intent_summary,
        proposed_procedure_id, compiled_skill_id, compiled_workflow_id,
        approval_status, approved_by, approved_at, rejected_at, rejection_reason,
        confidence, security_classification, provenance, metadata_json,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `).run(
      session.id, session.owner, session.companyId ?? null, session.projectId ?? null,
      session.workspaceId ?? null, session.title, session.objective, session.status, session.scope,
      session.startedAt, session.endedAt ?? null, session.pausedAt ?? null, session.resumedAt ?? null,
      session.environment ?? null,
      JSON.stringify(session.observationSources), session.actionCount, session.checkpointCount,
      session.teachingMode ? 1 : 0, session.voiceAnnotationsEnabled ? 1 : 0,
      session.inferredIntentSummary ?? null,
      session.proposedProcedureId ?? null, session.compiledSkillId ?? null,
      session.compiledWorkflowId ?? null,
      session.approvalStatus ?? null, session.approvedBy ?? null, session.approvedAt ?? null,
      session.rejectedAt ?? null, session.rejectionReason ?? null,
      session.confidence ?? null, session.securityClassification, session.provenance,
      JSON.stringify(session.metadata),
      session.createdAt, session.updatedAt
    );

    return session;
  }

  public getSession(id: string): DemonstrationSession | null {
    const row = this.db.prepare(`SELECT * FROM demonstration_sessions WHERE id = ?`).get(id) as Record<string, unknown> | null;
    return row ? this.rowToSession(row) : null;
  }

  public updateSession(id: string, updates: Partial<DemonstrationSession>): DemonstrationSession | null {
    const existing = this.getSession(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.db.prepare(`
      UPDATE demonstration_sessions SET
        status = ?, ended_at = ?, paused_at = ?, resumed_at = ?,
        observation_sources_json = ?, action_count = ?, checkpoint_count = ?,
        teaching_mode = ?, voice_annotations_enabled = ?,
        inferred_intent_summary = ?, proposed_procedure_id = ?,
        compiled_skill_id = ?, compiled_workflow_id = ?,
        approval_status = ?, approved_by = ?, approved_at = ?,
        rejected_at = ?, rejection_reason = ?,
        confidence = ?, metadata_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.status, updated.endedAt ?? null, updated.pausedAt ?? null, updated.resumedAt ?? null,
      JSON.stringify(updated.observationSources), updated.actionCount, updated.checkpointCount,
      updated.teachingMode ? 1 : 0, updated.voiceAnnotationsEnabled ? 1 : 0,
      updated.inferredIntentSummary ?? null, updated.proposedProcedureId ?? null,
      updated.compiledSkillId ?? null, updated.compiledWorkflowId ?? null,
      updated.approvalStatus ?? null, updated.approvedBy ?? null, updated.approvedAt ?? null,
      updated.rejectedAt ?? null, updated.rejectionReason ?? null,
      updated.confidence ?? null, JSON.stringify(updated.metadata), updated.updatedAt,
      id
    );

    return updated;
  }

  public listSessions(filter?: {
    owner?: string;
    companyId?: string;
    projectId?: string;
    status?: DemonstrationStatus;
    limit?: number;
    offset?: number;
  }): DemonstrationSession[] {
    let sql = `SELECT * FROM demonstration_sessions WHERE 1=1`;
    const params: any[] = [];

    if (filter?.owner) { sql += ` AND owner = ?`; params.push(filter.owner); }
    if (filter?.companyId) { sql += ` AND company_id = ?`; params.push(filter.companyId); }
    if (filter?.projectId) { sql += ` AND project_id = ?`; params.push(filter.projectId); }
    if (filter?.status) { sql += ` AND status = ?`; params.push(filter.status); }

    sql += ` ORDER BY created_at DESC`;
    if (filter?.limit) { sql += ` LIMIT ?`; params.push(filter.limit); }
    if (filter?.offset) { sql += ` OFFSET ?`; params.push(filter.offset); }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToSession(r));
  }

  // ─── Semantic Actions ──────────────────────────────────────────────────────

  public saveAction(action: SemanticAction): SemanticAction {
    this.db.prepare(`
      INSERT OR REPLACE INTO demonstration_semantic_actions (
        id, demonstration_id, step_index, action_type, semantic_intent,
        target_json, application, environment, precondition,
        parameters_json, resulting_state, timestamp, source, confidence,
        verification_evidence_json, is_verified, is_reversible, danger_level,
        teaching_annotation, is_ignored, is_important, is_optional,
        raw_operator_action_id, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      action.id, action.demonstrationId, action.stepIndex,
      action.actionType, action.semanticIntent,
      action.target ? JSON.stringify(action.target) : null,
      action.application ?? null, action.environment ?? null, action.precondition ?? null,
      JSON.stringify(action.parameters), action.resultingState ?? null,
      action.timestamp, action.source, action.confidence,
      action.verificationEvidence ? JSON.stringify(action.verificationEvidence) : null,
      action.isVerified ? 1 : 0, action.isReversible ? 1 : 0, action.dangerLevel,
      action.teachingAnnotation ?? null,
      action.isIgnored ? 1 : 0, action.isImportant ? 1 : 0, action.isOptional ? 1 : 0,
      action.rawOperatorActionId ?? null, JSON.stringify(action.metadata)
    );

    // Increment session action count
    this.db.prepare(`UPDATE demonstration_sessions SET action_count = action_count + 1, updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), action.demonstrationId);

    return action;
  }

  public getActions(demonstrationId: string): SemanticAction[] {
    const rows = this.db.prepare(
      `SELECT * FROM demonstration_semantic_actions WHERE demonstration_id = ? ORDER BY step_index ASC`
    ).all(demonstrationId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToAction(r));
  }

  public updateAction(id: string, updates: Partial<SemanticAction>): void {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.isIgnored !== undefined) { fields.push('is_ignored = ?'); params.push(updates.isIgnored ? 1 : 0); }
    if (updates.isImportant !== undefined) { fields.push('is_important = ?'); params.push(updates.isImportant ? 1 : 0); }
    if (updates.isOptional !== undefined) { fields.push('is_optional = ?'); params.push(updates.isOptional ? 1 : 0); }
    if (updates.teachingAnnotation !== undefined) { fields.push('teaching_annotation = ?'); params.push(updates.teachingAnnotation); }
    if (updates.isVerified !== undefined) { fields.push('is_verified = ?'); params.push(updates.isVerified ? 1 : 0); }

    if (fields.length === 0) return;
    params.push(id);
    this.db.prepare(`UPDATE demonstration_semantic_actions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  // ─── Checkpoints ───────────────────────────────────────────────────────────

  public saveCheckpoint(cp: DemonstrationCheckpoint): DemonstrationCheckpoint {
    this.db.prepare(`
      INSERT OR REPLACE INTO demonstration_checkpoints (id, demonstration_id, step_index, label, annotation, state_snapshot_json, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cp.checkpointId, cp.demonstrationId, cp.stepIndex, cp.label,
      cp.annotation ?? null, cp.stateSnapshot ? JSON.stringify(cp.stateSnapshot) : null,
      cp.capturedAt
    );

    this.db.prepare(`UPDATE demonstration_sessions SET checkpoint_count = checkpoint_count + 1, updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), cp.demonstrationId);

    return cp;
  }

  public getCheckpoints(demonstrationId: string): DemonstrationCheckpoint[] {
    const rows = this.db.prepare(
      `SELECT * FROM demonstration_checkpoints WHERE demonstration_id = ? ORDER BY step_index ASC`
    ).all(demonstrationId) as Record<string, unknown>[];
    return rows.map((r) => ({
      checkpointId: r.id as string,
      demonstrationId: r.demonstration_id as string,
      stepIndex: r.step_index as number,
      label: r.label as string,
      annotation: r.annotation as string | undefined,
      stateSnapshot: r.state_snapshot_json ? JSON.parse(r.state_snapshot_json as string) : undefined,
      capturedAt: r.captured_at as string,
    }));
  }

  // ─── Artifacts ─────────────────────────────────────────────────────────────

  public saveArtifact(artifact: DemonstrationArtifact): DemonstrationArtifact {
    this.db.prepare(`
      INSERT OR REPLACE INTO demonstration_artifacts (id, demonstration_id, type, name, path, uri, size_bytes, mime_type, is_redacted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifact.artifactId, artifact.demonstrationId, artifact.type, artifact.name,
      artifact.path ?? null, artifact.uri ?? null, artifact.sizeBytes ?? null,
      artifact.mimeType ?? null, artifact.isRedacted ? 1 : 0, artifact.createdAt
    );
    return artifact;
  }

  public getArtifacts(demonstrationId: string): DemonstrationArtifact[] {
    const rows = this.db.prepare(
      `SELECT * FROM demonstration_artifacts WHERE demonstration_id = ?`
    ).all(demonstrationId) as Record<string, unknown>[];
    return rows.map((r) => ({
      artifactId: r.id as string,
      demonstrationId: r.demonstration_id as string,
      type: r.type as DemonstrationArtifact['type'],
      name: r.name as string,
      path: r.path as string | undefined,
      uri: r.uri as string | undefined,
      sizeBytes: r.size_bytes as number | undefined,
      mimeType: r.mime_type as string | undefined,
      isRedacted: (r.is_redacted as number) === 1,
      createdAt: r.created_at as string,
    }));
  }

  // ─── Proposals ─────────────────────────────────────────────────────────────

  public saveProposal(proposal: ProcedureProposal): ProcedureProposal {
    this.db.prepare(`
      INSERT OR REPLACE INTO procedure_proposals (
        id, demonstration_id, name, display_name, purpose,
        trigger_phrases_json, required_capabilities_json, required_services_json,
        required_applications_json, required_permissions_json,
        inputs_json, outputs_json, assumptions_json, steps_json,
        checkpoints_json, verification_conditions_json, recovery_strategies_json,
        rollback_strategy, expected_artifacts_json,
        risk_level, confidence, confidence_factors_json,
        is_generalizable, generalization_caveats_json,
        compilation_target, scope, company_id, project_id,
        status, validation_result_json, rejection_reason, rejection_explanation,
        provenance, source_demonstration_id, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      proposal.id, proposal.demonstrationId, proposal.name, proposal.displayName, proposal.purpose,
      JSON.stringify(proposal.triggerPhrases), JSON.stringify(proposal.requiredCapabilities),
      JSON.stringify(proposal.requiredServices), JSON.stringify(proposal.requiredApplications),
      JSON.stringify(proposal.requiredPermissions),
      JSON.stringify(proposal.inputs), JSON.stringify(proposal.outputs),
      JSON.stringify(proposal.assumptions), JSON.stringify(proposal.steps),
      JSON.stringify(proposal.checkpoints), JSON.stringify(proposal.verificationConditions),
      JSON.stringify(proposal.recoveryStrategies),
      proposal.rollbackStrategy ?? null, JSON.stringify(proposal.expectedArtifacts),
      proposal.riskLevel, proposal.confidence, JSON.stringify(proposal.confidenceFactors),
      proposal.isGeneralizable ? 1 : 0, JSON.stringify(proposal.generalizationCaveats),
      proposal.compilationTarget, proposal.scope, proposal.companyId ?? null, proposal.projectId ?? null,
      proposal.status,
      proposal.validationResult ? JSON.stringify(proposal.validationResult) : null,
      null, null, // rejection fields
      proposal.provenance, proposal.sourceDemonstrationId, proposal.createdAt, proposal.updatedAt
    );
    return proposal;
  }

  public getProposal(id: string): ProcedureProposal | null {
    const row = this.db.prepare(`SELECT * FROM procedure_proposals WHERE id = ?`).get(id) as Record<string, unknown> | null;
    return row ? this.rowToProposal(row) : null;
  }

  public getProposalByDemonstration(demonstrationId: string): ProcedureProposal | null {
    const row = this.db.prepare(
      `SELECT * FROM procedure_proposals WHERE demonstration_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(demonstrationId) as Record<string, unknown> | null;
    return row ? this.rowToProposal(row) : null;
  }

  public updateProposalStatus(id: string, status: ProcedureProposalStatus, validationResult?: unknown): void {
    this.db.prepare(`
      UPDATE procedure_proposals SET status = ?, validation_result_json = ?, updated_at = ? WHERE id = ?
    `).run(status, validationResult ? JSON.stringify(validationResult) : null, new Date().toISOString(), id);
  }

  public listProposals(filter?: { scope?: string; companyId?: string; status?: ProcedureProposalStatus }): ProcedureProposal[] {
    let sql = `SELECT * FROM procedure_proposals WHERE 1=1`;
    const params: any[] = [];
    if (filter?.scope) { sql += ` AND scope = ?`; params.push(filter.scope); }
    if (filter?.companyId) { sql += ` AND company_id = ?`; params.push(filter.companyId); }
    if (filter?.status) { sql += ` AND status = ?`; params.push(filter.status); }
    sql += ` ORDER BY created_at DESC`;
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToProposal(r));
  }

  // ─── Learned Procedures ────────────────────────────────────────────────────

  public saveLearned(proc: LearnedProcedure): LearnedProcedure {
    const exists = this.db.prepare(`SELECT id FROM learned_procedures WHERE id = ?`).get(proc.id);
    if (!exists) {
      // New learned procedure — INSERT
      this.db.prepare(`
        INSERT INTO learned_procedures (
          id, name, display_name, description, scope, company_id, project_id,
          current_version, active_version_id, source_demonstration_ids_json,
          trigger_phrases_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        proc.id, proc.name, proc.displayName, proc.description, proc.scope,
        proc.companyId ?? null, proc.projectId ?? null,
        proc.currentVersion, proc.activeVersionId ?? null,
        JSON.stringify(proc.sourceDemonstrationIds),
        JSON.stringify(proc.triggerPhrases),
        proc.createdAt, proc.updatedAt
      );
    } else {
      // Existing — UPDATE only (never DELETE+INSERT to avoid CASCADE deleting versions)
      this.db.prepare(`
        UPDATE learned_procedures SET
          name = ?, display_name = ?, description = ?, scope = ?,
          company_id = ?, project_id = ?, current_version = ?, active_version_id = ?,
          source_demonstration_ids_json = ?, trigger_phrases_json = ?, updated_at = ?
        WHERE id = ?
      `).run(
        proc.name, proc.displayName, proc.description, proc.scope,
        proc.companyId ?? null, proc.projectId ?? null,
        proc.currentVersion, proc.activeVersionId ?? null,
        JSON.stringify(proc.sourceDemonstrationIds),
        JSON.stringify(proc.triggerPhrases),
        proc.updatedAt, proc.id
      );
    }
    return proc;
  }

  public getLearned(id: string): LearnedProcedure | null {
    const row = this.db.prepare(`SELECT * FROM learned_procedures WHERE id = ?`).get(id) as Record<string, unknown> | null;
    return row ? this.rowToLearned(row) : null;
  }

  public findLearnedByName(name: string): LearnedProcedure | null {
    const row = this.db.prepare(`SELECT * FROM learned_procedures WHERE name = ?`).get(name) as Record<string, unknown> | null;
    return row ? this.rowToLearned(row) : null;
  }

  public listLearned(filter?: { scope?: string; companyId?: string; projectId?: string }): LearnedProcedure[] {
    let sql = `SELECT * FROM learned_procedures WHERE 1=1`;
    const params: any[] = [];
    if (filter?.scope) { sql += ` AND scope = ?`; params.push(filter.scope); }
    if (filter?.companyId) { sql += ` AND company_id = ?`; params.push(filter.companyId); }
    if (filter?.projectId) { sql += ` AND project_id = ?`; params.push(filter.projectId); }
    sql += ` ORDER BY updated_at DESC`;
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToLearned(r));
  }

  public saveLearnedVersion(version: LearnedProcedureVersion): LearnedProcedureVersion {
    this.db.prepare(`
      INSERT OR REPLACE INTO learned_procedure_versions (
        id, learned_procedure_id, version, display_name, description,
        proposal_id, demonstration_id, compiled_skill_id, compiled_workflow_id,
        compilation_target, status, risk_level, confidence,
        validation_result_json, approval_history_json, execution_history_json,
        rollback_from_version, scope, company_id, project_id,
        provenance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      version.id, version.learnedProcedureId, version.version,
      version.displayName, version.description,
      version.proposalId, version.demonstrationId,
      version.compiledSkillId ?? null, version.compiledWorkflowId ?? null,
      version.compilationTarget, version.status, version.riskLevel, version.confidence,
      JSON.stringify(version.validationResult ?? {}),
      JSON.stringify(version.approvalHistory),
      JSON.stringify(version.executionHistory),
      version.rollbackFromVersion ?? null,
      version.scope, version.companyId ?? null, version.projectId ?? null,
      version.provenance, version.createdAt, version.updatedAt
    );
    return version;
  }

  public getLearnedVersion(id: string): LearnedProcedureVersion | null {
    const row = this.db.prepare(`SELECT * FROM learned_procedure_versions WHERE id = ?`).get(id) as Record<string, unknown> | null;
    return row ? this.rowToLearnedVersion(row) : null;
  }

  public getLearnedVersions(learnedProcedureId: string): LearnedProcedureVersion[] {
    const rows = this.db.prepare(
      `SELECT * FROM learned_procedure_versions WHERE learned_procedure_id = ? ORDER BY version DESC`
    ).all(learnedProcedureId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToLearnedVersion(r));
  }

  public saveExecution(exec: LearnedProcedureExecutionRecord): LearnedProcedureExecutionRecord {
    this.db.prepare(`
      INSERT INTO learned_procedure_executions (
        id, learned_procedure_id, version_id, version, status, duration_ms,
        deviations_json, recovery_events_json, user_corrections_json,
        confidence_delta, verification_results_json, executed_at, executed_by, mission_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exec.executionId, exec.learnedProcedureId, exec.learnedProcedureId, // version_id placeholder
      exec.version, exec.status, exec.durationMs,
      JSON.stringify(exec.deviations), JSON.stringify(exec.recoveryEvents),
      JSON.stringify(exec.userCorrections), exec.confidenceDelta,
      JSON.stringify(exec.verificationResults),
      exec.executedAt, exec.executedBy ?? null, exec.missionId ?? null
    );
    return exec;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private rowToSession(r: Record<string, unknown>): DemonstrationSession {
    return {
      id: r.id as string,
      owner: r.owner as string,
      companyId: r.company_id as string | undefined,
      projectId: r.project_id as string | undefined,
      workspaceId: r.workspace_id as string | undefined,
      title: r.title as string,
      objective: r.objective as string,
      status: r.status as DemonstrationSession['status'],
      scope: r.scope as DemonstrationSession['scope'],
      startedAt: r.started_at as string,
      endedAt: r.ended_at as string | undefined,
      pausedAt: r.paused_at as string | undefined,
      resumedAt: r.resumed_at as string | undefined,
      environment: r.environment as string | undefined,
      observationSources: JSON.parse(r.observation_sources_json as string || '[]'),
      actionCount: r.action_count as number,
      checkpointCount: r.checkpoint_count as number,
      teachingMode: (r.teaching_mode as number) === 1,
      voiceAnnotationsEnabled: (r.voice_annotations_enabled as number) === 1,
      inferredIntentSummary: r.inferred_intent_summary as string | undefined,
      proposedProcedureId: r.proposed_procedure_id as string | undefined,
      compiledSkillId: r.compiled_skill_id as string | undefined,
      compiledWorkflowId: r.compiled_workflow_id as string | undefined,
      approvalStatus: r.approval_status as DemonstrationSession['approvalStatus'],
      approvedBy: r.approved_by as string | undefined,
      approvedAt: r.approved_at as string | undefined,
      rejectedAt: r.rejected_at as string | undefined,
      rejectionReason: r.rejection_reason as string | undefined,
      confidence: r.confidence as number | undefined,
      securityClassification: r.security_classification as DemonstrationSession['securityClassification'],
      provenance: r.provenance as string,
      metadata: JSON.parse(r.metadata_json as string || '{}'),
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  private rowToAction(r: Record<string, unknown>): SemanticAction {
    return {
      id: r.id as string,
      demonstrationId: r.demonstration_id as string,
      stepIndex: r.step_index as number,
      actionType: r.action_type as SemanticAction['actionType'],
      semanticIntent: r.semantic_intent as string,
      target: r.target_json ? JSON.parse(r.target_json as string) : undefined,
      application: r.application as string | undefined,
      environment: r.environment as string | undefined,
      precondition: r.precondition as string | undefined,
      parameters: JSON.parse(r.parameters_json as string || '[]'),
      resultingState: r.resulting_state as string | undefined,
      timestamp: r.timestamp as string,
      source: r.source as SemanticAction['source'],
      confidence: r.confidence as number,
      verificationEvidence: r.verification_evidence_json ? JSON.parse(r.verification_evidence_json as string) : undefined,
      isVerified: (r.is_verified as number) === 1,
      isReversible: (r.is_reversible as number) === 1,
      dangerLevel: r.danger_level as SemanticAction['dangerLevel'],
      teachingAnnotation: r.teaching_annotation as string | undefined,
      isIgnored: (r.is_ignored as number) === 1,
      isImportant: (r.is_important as number) === 1,
      isOptional: (r.is_optional as number) === 1,
      rawOperatorActionId: r.raw_operator_action_id as string | undefined,
      metadata: JSON.parse(r.metadata_json as string || '{}'),
    };
  }

  private rowToProposal(r: Record<string, unknown>): ProcedureProposal {
    return {
      id: r.id as string,
      demonstrationId: r.demonstration_id as string,
      name: r.name as string,
      displayName: r.display_name as string,
      purpose: r.purpose as string,
      triggerPhrases: JSON.parse(r.trigger_phrases_json as string || '[]'),
      requiredCapabilities: JSON.parse(r.required_capabilities_json as string || '[]'),
      requiredServices: JSON.parse(r.required_services_json as string || '[]'),
      requiredApplications: JSON.parse(r.required_applications_json as string || '[]'),
      requiredPermissions: JSON.parse(r.required_permissions_json as string || '[]'),
      inputs: JSON.parse(r.inputs_json as string || '[]'),
      outputs: JSON.parse(r.outputs_json as string || '[]'),
      assumptions: JSON.parse(r.assumptions_json as string || '[]'),
      steps: JSON.parse(r.steps_json as string || '[]'),
      checkpoints: JSON.parse(r.checkpoints_json as string || '[]'),
      verificationConditions: JSON.parse(r.verification_conditions_json as string || '[]'),
      recoveryStrategies: JSON.parse(r.recovery_strategies_json as string || '[]'),
      rollbackStrategy: r.rollback_strategy as string | undefined,
      expectedArtifacts: JSON.parse(r.expected_artifacts_json as string || '[]'),
      riskLevel: r.risk_level as ProcedureProposal['riskLevel'],
      confidence: r.confidence as number,
      confidenceFactors: JSON.parse(r.confidence_factors_json as string || '{}'),
      isGeneralizable: (r.is_generalizable as number) === 1,
      generalizationCaveats: JSON.parse(r.generalization_caveats_json as string || '[]'),
      compilationTarget: r.compilation_target as ProcedureProposal['compilationTarget'],
      scope: r.scope as ProcedureProposal['scope'],
      companyId: r.company_id as string | undefined,
      projectId: r.project_id as string | undefined,
      status: r.status as ProcedureProposal['status'],
      validationResult: r.validation_result_json ? JSON.parse(r.validation_result_json as string) : undefined,
      provenance: r.provenance as string,
      sourceDemonstrationId: r.source_demonstration_id as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  private rowToLearned(r: Record<string, unknown>): LearnedProcedure {
    return {
      id: r.id as string,
      name: r.name as string,
      displayName: r.display_name as string,
      description: r.description as string,
      scope: r.scope as LearnedProcedure['scope'],
      companyId: r.company_id as string | undefined,
      projectId: r.project_id as string | undefined,
      currentVersion: r.current_version as number,
      activeVersionId: r.active_version_id as string | undefined,
      sourceDemonstrationIds: JSON.parse(r.source_demonstration_ids_json as string || '[]'),
      triggerPhrases: JSON.parse(r.trigger_phrases_json as string || '[]'),
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  private rowToLearnedVersion(r: Record<string, unknown>): LearnedProcedureVersion {
    return {
      id: r.id as string,
      learnedProcedureId: r.learned_procedure_id as string,
      version: r.version as number,
      displayName: r.display_name as string,
      description: r.description as string,
      proposalId: r.proposal_id as string,
      demonstrationId: r.demonstration_id as string,
      compiledSkillId: r.compiled_skill_id as string | undefined,
      compiledWorkflowId: r.compiled_workflow_id as string | undefined,
      compilationTarget: r.compilation_target as LearnedProcedureVersion['compilationTarget'],
      status: r.status as LearnedProcedureVersion['status'],
      riskLevel: r.risk_level as LearnedProcedureVersion['riskLevel'],
      confidence: r.confidence as number,
      validationResult: JSON.parse(r.validation_result_json as string || '{}'),
      approvalHistory: JSON.parse(r.approval_history_json as string || '[]'),
      executionHistory: JSON.parse(r.execution_history_json as string || '[]'),
      rollbackFromVersion: r.rollback_from_version as number | undefined,
      scope: r.scope as LearnedProcedureVersion['scope'],
      companyId: r.company_id as string | undefined,
      projectId: r.project_id as string | undefined,
      provenance: r.provenance as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }
}
