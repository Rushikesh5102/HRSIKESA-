/**
 * HṚṢĪKEŚA (हृषीकेश) — Digital Workspace & Operator Repository
 *
 * FP-13: Full SQLite persistence for workspaces, applications, observations,
 * actions, verifications, recoveries, traces, learned UI patterns, and locks.
 */

import { DatabaseSync } from 'node:sqlite';
import {
  DigitalWorkspaceDescriptor,
  WorkspaceSession,
  ApplicationDescriptor,
  ApplicationSession,
  WorkspaceObservation,
  OperatorActionPayload,
  OperatorActionResult,
  ActionVerificationResult,
  RecoveryAttemptResult,
  ActionTrace,
  ActionTraceStep,
  LearnedUIPattern,
  WorkspaceLock,
} from '../types/index.js';

export class WorkspaceRepository {
  constructor(private readonly db: DatabaseSync) {}

  // ================= Digital Workspaces =================

  public saveWorkspace(ws: DigitalWorkspaceDescriptor): void {
    const stmt = this.db.prepare(
      `INSERT INTO digital_workspaces (
        id, name, workspace_type, status, target_uri, capabilities_json,
        resource_usage_json, active_application_id, is_authenticated,
        provenance_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        workspace_type = excluded.workspace_type,
        status = excluded.status,
        target_uri = excluded.target_uri,
        capabilities_json = excluded.capabilities_json,
        resource_usage_json = excluded.resource_usage_json,
        active_application_id = excluded.active_application_id,
        is_authenticated = excluded.is_authenticated,
        provenance_json = excluded.provenance_json,
        updated_at = excluded.updated_at`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      ws.workspaceId,
      ws.name,
      ws.workspaceType,
      ws.status,
      ws.targetUri ?? null,
      JSON.stringify(ws.capabilities || {}),
      JSON.stringify(ws.resourceUsage || {}),
      ws.activeApplicationId ?? null,
      ws.isAuthenticated ? 1 : 0,
      JSON.stringify(ws.provenance || {}),
      ws.createdAt || nowIso,
      ws.updatedAt || nowIso
    );
  }

  public getWorkspace(id: string): DigitalWorkspaceDescriptor | null {
    const stmt = this.db.prepare(`SELECT * FROM digital_workspaces WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      workspaceId: row.id as string,
      name: row.name as string,
      workspaceType: row.workspace_type as any,
      status: row.status as any,
      targetUri: (row.target_uri as string) || undefined,
      capabilities: JSON.parse((row.capabilities_json as string) || '{}'),
      resourceUsage: JSON.parse((row.resource_usage_json as string) || '{}'),
      activeApplicationId: (row.active_application_id as string) || null,
      isAuthenticated: Boolean(row.is_authenticated),
      provenance: JSON.parse((row.provenance_json as string) || '{}'),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  public listWorkspaces(type?: string): DigitalWorkspaceDescriptor[] {
    let stmt;
    let rows: Record<string, unknown>[];
    if (type) {
      stmt = this.db.prepare(`SELECT * FROM digital_workspaces WHERE workspace_type = ? ORDER BY created_at DESC`);
      rows = stmt.all(type) as Record<string, unknown>[];
    } else {
      stmt = this.db.prepare(`SELECT * FROM digital_workspaces ORDER BY created_at DESC`);
      rows = stmt.all() as Record<string, unknown>[];
    }

    return rows.map((row) => ({
      workspaceId: row.id as string,
      name: row.name as string,
      workspaceType: row.workspace_type as any,
      status: row.status as any,
      targetUri: (row.target_uri as string) || undefined,
      capabilities: JSON.parse((row.capabilities_json as string) || '{}'),
      resourceUsage: JSON.parse((row.resource_usage_json as string) || '{}'),
      activeApplicationId: (row.active_application_id as string) || null,
      isAuthenticated: Boolean(row.is_authenticated),
      provenance: JSON.parse((row.provenance_json as string) || '{}'),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));
  }

  public deleteWorkspace(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM digital_workspaces WHERE id = ?`);
    stmt.run(id);
  }

  // ================= Workspace Sessions =================

  public saveSession(session: WorkspaceSession): void {
    const stmt = this.db.prepare(
      `INSERT INTO workspace_sessions (
        id, workspace_id, owner_agent_id, status, connected_at, disconnected_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        disconnected_at = excluded.disconnected_at,
        metadata_json = excluded.metadata_json`
    );

    stmt.run(
      session.sessionId,
      session.workspaceId,
      session.ownerAgentId,
      session.status,
      session.connectedAt,
      session.disconnectedAt ?? null,
      JSON.stringify(session.metadata || {})
    );
  }

  public getSession(id: string): WorkspaceSession | null {
    const stmt = this.db.prepare(`SELECT * FROM workspace_sessions WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      sessionId: row.id as string,
      workspaceId: row.workspace_id as string,
      ownerAgentId: row.owner_agent_id as string,
      status: row.status as any,
      connectedAt: row.connected_at as string,
      disconnectedAt: (row.disconnected_at as string) || undefined,
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
    };
  }

  public listSessionsByWorkspace(workspaceId: string): WorkspaceSession[] {
    const stmt = this.db.prepare(`SELECT * FROM workspace_sessions WHERE workspace_id = ? ORDER BY connected_at DESC`);
    const rows = stmt.all(workspaceId) as Record<string, unknown>[];
    return rows.map((row) => ({
      sessionId: row.id as string,
      workspaceId: row.workspace_id as string,
      ownerAgentId: row.owner_agent_id as string,
      status: row.status as any,
      connectedAt: row.connected_at as string,
      disconnectedAt: (row.disconnected_at as string) || undefined,
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
    }));
  }

  // ================= Applications =================

  public saveApplication(app: ApplicationDescriptor): void {
    const stmt = this.db.prepare(
      `INSERT INTO applications (
        id, name, display_name, executable_path, version, publisher, category,
        workspace_id, capabilities_json, readiness_state, health_status,
        installation_source, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        display_name = excluded.display_name,
        executable_path = excluded.executable_path,
        version = excluded.version,
        publisher = excluded.publisher,
        category = excluded.category,
        workspace_id = excluded.workspace_id,
        capabilities_json = excluded.capabilities_json,
        readiness_state = excluded.readiness_state,
        health_status = excluded.health_status,
        installation_source = excluded.installation_source,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      app.applicationId,
      app.name,
      app.displayName,
      app.executablePath,
      app.version ?? null,
      app.publisher ?? null,
      app.category,
      app.workspaceId,
      JSON.stringify(app.capabilities || []),
      app.readinessState,
      app.healthStatus,
      app.installationSource,
      JSON.stringify(app.metadata || {}),
      app.createdAt || nowIso,
      app.updatedAt || nowIso
    );
  }

  public getApplication(id: string): ApplicationDescriptor | null {
    const stmt = this.db.prepare(`SELECT * FROM applications WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      applicationId: row.id as string,
      name: row.name as string,
      displayName: row.display_name as string,
      executablePath: row.executable_path as string,
      version: (row.version as string) || undefined,
      publisher: (row.publisher as string) || undefined,
      category: row.category as any,
      workspaceId: row.workspace_id as string,
      capabilities: JSON.parse((row.capabilities_json as string) || '[]'),
      readinessState: row.readiness_state as any,
      healthStatus: row.health_status as any,
      installationSource: row.installation_source as any,
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  public findApplicationByName(name: string, workspaceId?: string): ApplicationDescriptor | null {
    let stmt;
    let row: Record<string, unknown> | undefined;
    if (workspaceId) {
      stmt = this.db.prepare(`SELECT * FROM applications WHERE (LOWER(name) = LOWER(?) OR LOWER(display_name) = LOWER(?)) AND workspace_id = ? LIMIT 1`);
      row = stmt.get(name, name, workspaceId) as Record<string, unknown> | undefined;
    } else {
      stmt = this.db.prepare(`SELECT * FROM applications WHERE LOWER(name) = LOWER(?) OR LOWER(display_name) = LOWER(?) LIMIT 1`);
      row = stmt.get(name, name) as Record<string, unknown> | undefined;
    }

    if (!row) return null;
    return this.getApplication(row.id as string);
  }

  public listApplications(workspaceId?: string): ApplicationDescriptor[] {
    let stmt;
    let rows: Record<string, unknown>[];
    if (workspaceId) {
      stmt = this.db.prepare(`SELECT * FROM applications WHERE workspace_id = ? ORDER BY name ASC`);
      rows = stmt.all(workspaceId) as Record<string, unknown>[];
    } else {
      stmt = this.db.prepare(`SELECT * FROM applications ORDER BY name ASC`);
      rows = stmt.all() as Record<string, unknown>[];
    }

    return rows.map((row) => ({
      applicationId: row.id as string,
      name: row.name as string,
      displayName: row.display_name as string,
      executablePath: row.executable_path as string,
      version: (row.version as string) || undefined,
      publisher: (row.publisher as string) || undefined,
      category: row.category as any,
      workspaceId: row.workspace_id as string,
      capabilities: JSON.parse((row.capabilities_json as string) || '[]'),
      readinessState: row.readiness_state as any,
      healthStatus: row.health_status as any,
      installationSource: row.installation_source as any,
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));
  }

  // ================= Application Sessions =================

  public saveAppSession(session: ApplicationSession): void {
    const stmt = this.db.prepare(
      `INSERT INTO application_sessions (
        id, application_id, workspace_id, process_id, main_window_id,
        is_focused, started_at, closed_at, health_status, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        is_focused = excluded.is_focused,
        closed_at = excluded.closed_at,
        health_status = excluded.health_status,
        metadata_json = excluded.metadata_json`
    );

    stmt.run(
      session.sessionId,
      session.applicationId,
      session.workspaceId,
      session.processId ?? null,
      session.mainWindowId ?? null,
      session.isFocused ? 1 : 0,
      session.startedAt,
      session.closedAt ?? null,
      session.healthStatus,
      JSON.stringify(session.metadata || {})
    );
  }

  public getAppSession(id: string): ApplicationSession | null {
    const stmt = this.db.prepare(`SELECT * FROM application_sessions WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      sessionId: row.id as string,
      applicationId: row.application_id as string,
      workspaceId: row.workspace_id as string,
      processId: (row.process_id as number) || undefined,
      mainWindowId: (row.main_window_id as string) || undefined,
      isFocused: Boolean(row.is_focused),
      startedAt: row.started_at as string,
      closedAt: (row.closed_at as string) || undefined,
      healthStatus: row.health_status as any,
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
    };
  }

  // ================= Workspace Observations =================

  public saveObservation(obs: WorkspaceObservation): void {
    const stmt = this.db.prepare(
      `INSERT INTO workspace_observations (
        id, workspace_id, active_application_id, active_window_title, active_window_handle,
        windows_json, ui_tree_json, ocr_text, screenshot_ref, focused_element_json,
        dialogs_json, is_loading, is_error, has_modal, has_security_challenge,
        confidence, observed_layers_json, captured_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      obs.observationId,
      obs.workspaceId,
      obs.activeApplicationId ?? null,
      obs.activeWindowTitle ?? null,
      obs.activeWindowHandle ?? null,
      JSON.stringify(obs.windows || []),
      JSON.stringify(obs.uiTree || []),
      obs.ocrText ?? null,
      obs.screenshotRef ?? null,
      obs.focusedElement ? JSON.stringify(obs.focusedElement) : null,
      JSON.stringify(obs.dialogs || []),
      obs.isLoading ? 1 : 0,
      obs.isError ? 1 : 0,
      obs.hasModal ? 1 : 0,
      obs.hasSecurityChallenge ? 1 : 0,
      obs.confidence,
      JSON.stringify(obs.observedLayers || []),
      obs.capturedAt,
      JSON.stringify(obs.metadata || {})
    );
  }

  public getLatestObservation(workspaceId: string): WorkspaceObservation | null {
    const stmt = this.db.prepare(`SELECT * FROM workspace_observations WHERE workspace_id = ? ORDER BY captured_at DESC LIMIT 1`);
    const row = stmt.get(workspaceId) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      observationId: row.id as string,
      workspaceId: row.workspace_id as string,
      activeApplicationId: (row.active_application_id as string) || undefined,
      activeWindowTitle: (row.active_window_title as string) || undefined,
      activeWindowHandle: (row.active_window_handle as string) || undefined,
      windows: JSON.parse((row.windows_json as string) || '[]'),
      uiTree: JSON.parse((row.ui_tree_json as string) || '[]'),
      ocrText: (row.ocr_text as string) || undefined,
      screenshotRef: (row.screenshot_ref as string) || undefined,
      focusedElement: row.focused_element_json ? JSON.parse(row.focused_element_json as string) : undefined,
      dialogs: JSON.parse((row.dialogs_json as string) || '[]'),
      isLoading: Boolean(row.is_loading),
      isError: Boolean(row.is_error),
      hasModal: Boolean(row.has_modal),
      hasSecurityChallenge: Boolean(row.has_security_challenge),
      confidence: row.confidence as any,
      observedLayers: JSON.parse((row.observed_layers_json as string) || '[]'),
      capturedAt: row.captured_at as string,
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
    };
  }

  // ================= Operator Actions =================

  public saveAction(action: OperatorActionPayload, status: string = 'PENDING', error?: string, evidence?: Record<string, unknown>): void {
    const stmt = this.db.prepare(
      `INSERT INTO operator_actions (
        id, workspace_id, application_id, action_type, risk_level, target_json,
        parameters_json, status, confidence, agent_id, workflow_id, started_at,
        completed_at, error_message, evidence_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        completed_at = excluded.completed_at,
        error_message = excluded.error_message,
        evidence_json = excluded.evidence_json`
    );

    const nowIso = new Date().toISOString();
    stmt.run(
      action.actionId,
      action.workspaceId,
      action.applicationId ?? null,
      action.actionType,
      action.riskLevel,
      action.target ? JSON.stringify(action.target) : null,
      JSON.stringify(action.parameters || {}),
      status,
      action.confidence,
      action.agentId ?? null,
      action.workflowId ?? null,
      nowIso,
      status === 'COMPLETED' || status === 'FAILED' ? nowIso : null,
      error ?? null,
      JSON.stringify(evidence || {})
    );
  }

  public getAction(id: string): OperatorActionResult | null {
    const stmt = this.db.prepare(`SELECT * FROM operator_actions WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      actionId: row.id as string,
      workspaceId: row.workspace_id as string,
      status: row.status as any,
      isVerified: false,
      startedAt: row.started_at as string,
      completedAt: (row.completed_at as string) || undefined,
      durationMs: 0,
      evidence: JSON.parse((row.evidence_json as string) || '{}'),
      errorMessage: (row.error_message as string) || undefined,
    };
  }

  public listActions(workspaceId?: string, limit: number = 50): Record<string, unknown>[] {
    let stmt;
    if (workspaceId) {
      stmt = this.db.prepare(`SELECT * FROM operator_actions WHERE workspace_id = ? ORDER BY started_at DESC LIMIT ?`);
      return stmt.all(workspaceId, limit) as Record<string, unknown>[];
    } else {
      stmt = this.db.prepare(`SELECT * FROM operator_actions ORDER BY started_at DESC LIMIT ?`);
      return stmt.all(limit) as Record<string, unknown>[];
    }
  }

  // ================= Operator Verifications =================

  public saveVerification(actionId: string, workspaceId: string, verif: ActionVerificationResult): void {
    const existing = this.getAction(actionId);
    if (!existing) {
      this.saveAction({
        actionId,
        workspaceId,
        actionType: 'CLICK',
        riskLevel: 'TIER_1_READ',
        parameters: {},
        confidence: 'HIGH',
      });
    }

    const stmt = this.db.prepare(
      `INSERT INTO operator_verifications (
        id, action_id, workspace_id, strategy, is_verified, evidence_json,
        discrepancies_json, verified_at, duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const id = `verif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    stmt.run(
      id,
      actionId,
      workspaceId,
      verif.strategy,
      verif.isVerified ? 1 : 0,
      JSON.stringify(verif.evidence || {}),
      JSON.stringify(verif.discrepancies || []),
      verif.verifiedAt,
      verif.durationMs
    );
  }

  // ================= Operator Recoveries =================

  public saveRecovery(actionId: string, workspaceId: string, recovery: RecoveryAttemptResult): void {
    const existing = this.getAction(actionId);
    if (!existing) {
      this.saveAction({
        actionId,
        workspaceId,
        actionType: 'CLICK',
        riskLevel: 'TIER_1_READ',
        parameters: {},
        confidence: 'HIGH',
      });
    }

    const stmt = this.db.prepare(
      `INSERT INTO operator_recoveries (
        id, action_id, workspace_id, strategy, attempt_number, success,
        evidence_json, recovered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const id = `recov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    stmt.run(
      id,
      actionId,
      workspaceId,
      recovery.strategy,
      recovery.attemptNumber,
      recovery.success ? 1 : 0,
      JSON.stringify(recovery.evidence || {}),
      new Date().toISOString()
    );
  }


  // ================= Action Traces =================

  public saveActionTrace(trace: ActionTrace): void {
    const stmt = this.db.prepare(
      `INSERT INTO action_traces (
        id, name, description, workspace_id, application_id, initiator_agent_id,
        status, started_at, completed_at, is_reusable_proposal, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        completed_at = excluded.completed_at,
        is_reusable_proposal = excluded.is_reusable_proposal,
        metadata_json = excluded.metadata_json`
    );

    stmt.run(
      trace.traceId,
      trace.name,
      trace.description ?? null,
      trace.workspaceId,
      trace.applicationId ?? null,
      trace.initiatorAgentId ?? null,
      trace.status,
      trace.startedAt,
      trace.completedAt ?? null,
      trace.isReusableProposal ? 1 : 0,
      JSON.stringify(trace.metadata || {})
    );
  }

  public getActionTrace(id: string): ActionTrace | null {
    const stmt = this.db.prepare(`SELECT * FROM action_traces WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    const steps = this.getTraceSteps(id);

    return {
      traceId: row.id as string,
      name: row.name as string,
      description: (row.description as string) || undefined,
      workspaceId: row.workspace_id as string,
      applicationId: (row.application_id as string) || undefined,
      initiatorAgentId: (row.initiator_agent_id as string) || undefined,
      status: row.status as any,
      steps,
      startedAt: row.started_at as string,
      completedAt: (row.completed_at as string) || undefined,
      isReusableProposal: Boolean(row.is_reusable_proposal),
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
    };
  }

  public listActionTraces(workspaceId?: string): ActionTrace[] {
    let stmt;
    let rows: Record<string, unknown>[];
    if (workspaceId) {
      stmt = this.db.prepare(`SELECT * FROM action_traces WHERE workspace_id = ? ORDER BY started_at DESC`);
      rows = stmt.all(workspaceId) as Record<string, unknown>[];
    } else {
      stmt = this.db.prepare(`SELECT * FROM action_traces ORDER BY started_at DESC`);
      rows = stmt.all() as Record<string, unknown>[];
    }

    return rows.map((row) => ({
      traceId: row.id as string,
      name: row.name as string,
      description: (row.description as string) || undefined,
      workspaceId: row.workspace_id as string,
      applicationId: (row.application_id as string) || undefined,
      initiatorAgentId: (row.initiator_agent_id as string) || undefined,
      status: row.status as any,
      steps: [],
      startedAt: row.started_at as string,
      completedAt: (row.completed_at as string) || undefined,
      isReusableProposal: Boolean(row.is_reusable_proposal),
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
    }));
  }

  public saveTraceStep(step: ActionTraceStep): void {
    const stmt = this.db.prepare(
      `INSERT INTO action_trace_steps (
        id, trace_id, step_index, timestamp, workspace_id, application_id,
        observation_hash, action_json, result_json, verification_json,
        confidence, agent_id, skill_id, workflow_id, provenance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      step.stepId,
      step.traceId,
      step.stepIndex,
      step.timestamp,
      step.workspaceId,
      step.applicationId ?? null,
      step.observationHash ?? null,
      JSON.stringify(step.action),
      JSON.stringify(step.result),
      step.verificationEvidence ? JSON.stringify(step.verificationEvidence) : null,
      step.confidence,
      step.agentId ?? null,
      step.skillId ?? null,
      step.workflowId ?? null,
      step.provenance
    );
  }

  public getTraceSteps(traceId: string): ActionTraceStep[] {
    const stmt = this.db.prepare(`SELECT * FROM action_trace_steps WHERE trace_id = ? ORDER BY step_index ASC`);
    const rows = stmt.all(traceId) as Record<string, unknown>[];

    return rows.map((row) => ({
      stepId: row.id as string,
      traceId: row.trace_id as string,
      stepIndex: row.step_index as number,
      timestamp: row.timestamp as string,
      workspaceId: row.workspace_id as string,
      applicationId: (row.application_id as string) || undefined,
      observationHash: (row.observation_hash as string) || undefined,
      action: JSON.parse(row.action_json as string),
      result: JSON.parse(row.result_json as string),
      verificationEvidence: row.verification_json ? JSON.parse(row.verification_json as string) : undefined,
      confidence: row.confidence as string,
      agentId: (row.agent_id as string) || undefined,
      skillId: (row.skill_id as string) || undefined,
      workflowId: (row.workflow_id as string) || undefined,
      provenance: row.provenance as string,
    }));
  }

  // ================= Learned UI Patterns =================

  public savePattern(pattern: LearnedUIPattern): void {
    const stmt = this.db.prepare(
      `INSERT INTO learned_ui_patterns (
        id, application_name, application_version, intent, successful_selector,
        resolution_method, confidence, use_count, last_used_at, created_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        successful_selector = excluded.successful_selector,
        resolution_method = excluded.resolution_method,
        confidence = excluded.confidence,
        use_count = excluded.use_count,
        last_used_at = excluded.last_used_at,
        metadata_json = excluded.metadata_json`
    );

    stmt.run(
      pattern.patternId,
      pattern.applicationName,
      pattern.applicationVersion ?? null,
      pattern.intent,
      pattern.successfulSelector,
      pattern.resolutionMethod,
      pattern.confidence,
      pattern.useCount,
      pattern.lastUsedAt,
      pattern.createdAt,
      JSON.stringify(pattern.metadata || {})
    );
  }

  public findPattern(appName: string, intent: string): LearnedUIPattern | null {
    const stmt = this.db.prepare(
      `SELECT * FROM learned_ui_patterns WHERE LOWER(application_name) = LOWER(?) AND LOWER(intent) = LOWER(?) ORDER BY confidence DESC, use_count DESC LIMIT 1`
    );
    const row = stmt.get(appName, intent) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      patternId: row.id as string,
      applicationName: row.application_name as string,
      applicationVersion: (row.application_version as string) || undefined,
      intent: row.intent as string,
      successfulSelector: row.successful_selector as string,
      resolutionMethod: row.resolution_method as string,
      confidence: row.confidence as number,
      useCount: row.use_count as number,
      lastUsedAt: row.last_used_at as string,
      createdAt: row.created_at as string,
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
    };
  }

  public listPatterns(appName?: string): LearnedUIPattern[] {
    let stmt;
    let rows: Record<string, unknown>[];
    if (appName) {
      stmt = this.db.prepare(`SELECT * FROM learned_ui_patterns WHERE LOWER(application_name) = LOWER(?) ORDER BY use_count DESC`);
      rows = stmt.all(appName) as Record<string, unknown>[];
    } else {
      stmt = this.db.prepare(`SELECT * FROM learned_ui_patterns ORDER BY use_count DESC`);
      rows = stmt.all() as Record<string, unknown>[];
    }

    return rows.map((row) => ({
      patternId: row.id as string,
      applicationName: row.application_name as string,
      applicationVersion: (row.application_version as string) || undefined,
      intent: row.intent as string,
      successfulSelector: row.successful_selector as string,
      resolutionMethod: row.resolution_method as string,
      confidence: row.confidence as number,
      useCount: row.use_count as number,
      lastUsedAt: row.last_used_at as string,
      createdAt: row.created_at as string,
      metadata: JSON.parse((row.metadata_json as string) || '{}'),
    }));
  }

  // ================= Workspace Locks =================

  public acquireLock(lock: WorkspaceLock): boolean {
    // Check if there is an active exclusive lock on this workspace
    const checkStmt = this.db.prepare(
      `SELECT * FROM workspace_locks WHERE workspace_id = ? AND is_released = 0`
    );
    const existing = checkStmt.all(lock.workspaceId) as Record<string, unknown>[];

    const nowIso = new Date().toISOString();
    const activeValid = existing.filter((l) => (l.expires_at as string) > nowIso);

    if (activeValid.length > 0) {
      // If exclusive or already held by another agent
      const hasExclusive = activeValid.some((l) => l.lock_type === 'EXCLUSIVE');
      if (hasExclusive || lock.lockType === 'EXCLUSIVE') {
        // If it's held by the same agent, allow renew
        const sameAgent = activeValid.every((l) => l.holder_agent_id === lock.holderAgentId);
        if (!sameAgent) {
          return false;
        }
      }
    }

    const stmt = this.db.prepare(
      `INSERT INTO workspace_locks (
        id, workspace_id, application_id, holder_agent_id, lock_type, task_id,
        acquired_at, expires_at, is_released
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        expires_at = excluded.expires_at,
        is_released = excluded.is_released`
    );

    stmt.run(
      lock.lockId,
      lock.workspaceId,
      lock.applicationId ?? null,
      lock.holderAgentId,
      lock.lockType,
      lock.taskId,
      lock.acquiredAt,
      lock.expiresAt,
      0
    );

    return true;
  }

  public releaseLock(lockId: string): void {
    const stmt = this.db.prepare(`UPDATE workspace_locks SET is_released = 1 WHERE id = ?`);
    stmt.run(lockId);
  }

  public releaseLocksForAgent(agentId: string): void {
    const stmt = this.db.prepare(`UPDATE workspace_locks SET is_released = 1 WHERE holder_agent_id = ? AND is_released = 0`);
    stmt.run(agentId);
  }

  public getActiveLock(workspaceId: string): WorkspaceLock | null {
    const nowIso = new Date().toISOString();
    const stmt = this.db.prepare(
      `SELECT * FROM workspace_locks WHERE workspace_id = ? AND is_released = 0 AND expires_at > ? ORDER BY acquired_at DESC LIMIT 1`
    );
    const row = stmt.get(workspaceId, nowIso) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      lockId: row.id as string,
      workspaceId: row.workspace_id as string,
      applicationId: (row.application_id as string) || undefined,
      holderAgentId: row.holder_agent_id as string,
      lockType: row.lock_type as any,
      taskId: row.task_id as string,
      acquiredAt: row.acquired_at as string,
      expiresAt: row.expires_at as string,
      isReleased: Boolean(row.is_released),
    };
  }
}
