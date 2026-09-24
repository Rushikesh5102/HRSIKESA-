/**
 * HṚṢĪKEŚA (हृषीकेश) — Self-Improvement & Self-Maintenance SQLite Repository
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  ISelfObservation,
  ISelfAnomaly,
  IImprovementProposal,
  IImprovementEvidence,
  IImprovementChangeSet,
  IImprovementTestResult,
  IImprovementBenchmarkResult,
  IImprovementApproval,
  IImprovementDeployment,
  IImprovementRollback,
  IMaintenanceJob,
  IDependencyFinding,
  ImprovementLifecycleState,
  ApprovalStatus,
  MaintenanceJobStatus,
} from '../interfaces/self-improvement.types.js';

export class SelfImprovementRepository {
  private readonly dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  // ============================================================================
  // Observations
  // ============================================================================

  public createObservation(obs: ISelfObservation): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO self_observations (id, company_id, source, category, metric_name, metric_value, details, level, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      obs.id,
      obs.companyId || null,
      obs.source,
      obs.category,
      obs.metricName || null,
      obs.metricValue !== undefined ? obs.metricValue : null,
      JSON.stringify(obs.details || {}),
      obs.level,
      obs.timestamp
    );
  }

  public getObservationById(id: string): ISelfObservation | null {
    const db = this.dbManager.getRawDb();
    const row = db.prepare(`SELECT * FROM self_observations WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.mapObservation(row);
  }

  public listObservations(filter?: { category?: string; level?: string; companyId?: string; limit?: number }): ISelfObservation[] {
    const db = this.dbManager.getRawDb();
    let query = `SELECT * FROM self_observations WHERE 1=1`;
    const params: any[] = [];

    if (filter?.category) {
      query += ` AND category = ?`;
      params.push(filter.category);
    }
    if (filter?.level) {
      query += ` AND level = ?`;
      params.push(filter.level);
    }
    if (filter?.companyId) {
      query += ` AND (company_id = ? OR company_id IS NULL)`;
      params.push(filter.companyId);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(filter?.limit || 100);

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.mapObservation(r));
  }

  // ============================================================================
  // Anomalies
  // ============================================================================

  public createAnomaly(anomaly: ISelfAnomaly): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO self_anomalies (id, company_id, title, component, severity, description, evidence_summary, observation_ids, status, detected_at, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      anomaly.id,
      anomaly.companyId || null,
      anomaly.title,
      anomaly.component,
      anomaly.severity,
      anomaly.description,
      anomaly.evidenceSummary,
      JSON.stringify(anomaly.observationIds || []),
      anomaly.status,
      anomaly.detectedAt,
      anomaly.resolvedAt || null
    );
  }

  public getAnomalyById(id: string): ISelfAnomaly | null {
    const db = this.dbManager.getRawDb();
    const row = db.prepare(`SELECT * FROM self_anomalies WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.mapAnomaly(row);
  }

  public updateAnomalyStatus(id: string, status: ISelfAnomaly['status'], resolvedAt?: string): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      UPDATE self_anomalies
      SET status = ?, resolved_at = ?
      WHERE id = ?
    `);
    stmt.run(status, resolvedAt || (status === 'RESOLVED' ? new Date().toISOString() : null), id);
  }

  public listAnomalies(filter?: { status?: string; severity?: string; component?: string; companyId?: string }): ISelfAnomaly[] {
    const db = this.dbManager.getRawDb();
    let query = `SELECT * FROM self_anomalies WHERE 1=1`;
    const params: any[] = [];

    if (filter?.status) {
      query += ` AND status = ?`;
      params.push(filter.status);
    }
    if (filter?.severity) {
      query += ` AND severity = ?`;
      params.push(filter.severity);
    }
    if (filter?.component) {
      query += ` AND component = ?`;
      params.push(filter.component);
    }
    if (filter?.companyId) {
      query += ` AND (company_id = ? OR company_id IS NULL)`;
      params.push(filter.companyId);
    }

    query += ` ORDER BY detected_at DESC`;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.mapAnomaly(r));
  }

  // ============================================================================
  // Improvement Proposals
  // ============================================================================

  public createProposal(prop: IImprovementProposal): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO improvement_proposals (
        id, company_id, anomaly_id, title, category, state, problem_statement, evidence_summary,
        expected_benefit, affected_components, risk_level, confidence_score, proposed_implementation,
        rollback_strategy, test_plan, benchmark_plan, requires_human_approval, estimated_resource_cost,
        version, created_by_agent, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      prop.id,
      prop.companyId || null,
      prop.anomalyId || null,
      prop.title,
      prop.category,
      prop.state,
      prop.problemStatement,
      prop.evidenceSummary,
      prop.expectedBenefit,
      JSON.stringify(prop.affectedComponents || []),
      prop.riskLevel,
      prop.confidenceScore,
      prop.proposedImplementation,
      prop.rollbackStrategy,
      prop.testPlan,
      prop.benchmarkPlan || null,
      prop.requiresHumanApproval ? 1 : 0,
      prop.estimatedResourceCost,
      prop.version,
      prop.createdByAgent,
      prop.createdAt,
      prop.updatedAt,
      prop.expiresAt || null
    );
  }

  public getProposalById(id: string): IImprovementProposal | null {
    const db = this.dbManager.getRawDb();
    const row = db.prepare(`SELECT * FROM improvement_proposals WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.mapProposal(row);
  }

  public updateProposalState(id: string, state: ImprovementLifecycleState): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      UPDATE improvement_proposals
      SET state = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(state, new Date().toISOString(), id);
  }

  public listProposals(filter?: { category?: string; state?: string; riskLevel?: string; companyId?: string }): IImprovementProposal[] {
    const db = this.dbManager.getRawDb();
    let query = `SELECT * FROM improvement_proposals WHERE 1=1`;
    const params: any[] = [];

    if (filter?.category) {
      query += ` AND category = ?`;
      params.push(filter.category);
    }
    if (filter?.state) {
      query += ` AND state = ?`;
      params.push(filter.state);
    }
    if (filter?.riskLevel) {
      query += ` AND risk_level = ?`;
      params.push(filter.riskLevel);
    }
    if (filter?.companyId) {
      query += ` AND (company_id = ? OR company_id IS NULL)`;
      params.push(filter.companyId);
    }

    query += ` ORDER BY created_at DESC`;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.mapProposal(r));
  }

  // ============================================================================
  // Evidence
  // ============================================================================

  public addEvidence(evid: IImprovementEvidence): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO improvement_evidence (id, proposal_id, evidence_type, title, data, hash, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      evid.id,
      evid.proposalId,
      evid.evidenceType,
      evid.title,
      JSON.stringify(evid.data || {}),
      evid.hash,
      evid.capturedAt
    );
  }

  public listEvidenceByProposal(proposalId: string): IImprovementEvidence[] {
    const db = this.dbManager.getRawDb();
    const rows = db.prepare(`SELECT * FROM improvement_evidence WHERE proposal_id = ? ORDER BY captured_at ASC`).all(proposalId) as any[];
    return rows.map((r) => ({
      id: r.id,
      proposalId: r.proposal_id,
      evidenceType: r.evidence_type,
      title: r.title,
      data: JSON.parse(r.data || '{}'),
      hash: r.hash,
      capturedAt: r.captured_at,
    }));
  }

  // ============================================================================
  // Changesets
  // ============================================================================

  public createChangeSet(cs: IImprovementChangeSet): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO improvement_changesets (id, proposal_id, files, summary, author_agent, is_sandboxed, sandbox_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      cs.id,
      cs.proposalId,
      JSON.stringify(cs.files || []),
      cs.summary,
      cs.authorAgent,
      cs.isSandboxed ? 1 : 0,
      cs.sandboxPath || null,
      cs.createdAt
    );
  }

  public getChangeSetById(id: string): IImprovementChangeSet | null {
    const db = this.dbManager.getRawDb();
    const row = db.prepare(`SELECT * FROM improvement_changesets WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      proposalId: row.proposal_id,
      files: JSON.parse(row.files || '[]'),
      summary: row.summary,
      authorAgent: row.author_agent,
      isSandboxed: row.is_sandboxed === 1,
      sandboxPath: row.sandbox_path || undefined,
      createdAt: row.created_at,
    };
  }

  public getChangeSetByProposal(proposalId: string): IImprovementChangeSet | null {
    const db = this.dbManager.getRawDb();
    const row = db.prepare(`SELECT * FROM improvement_changesets WHERE proposal_id = ? ORDER BY created_at DESC LIMIT 1`).get(proposalId) as any;
    if (!row) return null;
    return {
      id: row.id,
      proposalId: row.proposal_id,
      files: JSON.parse(row.files || '[]'),
      summary: row.summary,
      authorAgent: row.author_agent,
      isSandboxed: row.is_sandboxed === 1,
      sandboxPath: row.sandbox_path || undefined,
      createdAt: row.created_at,
    };
  }

  // ============================================================================
  // Tests
  // ============================================================================

  public recordTestResult(res: IImprovementTestResult): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO improvement_tests (id, proposal_id, changeset_id, suite_name, total_tests, passed_tests, failed_tests, skipped_tests, duration_ms, errors, passed, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      res.id,
      res.proposalId,
      res.changeSetId,
      res.suiteName,
      res.totalTests,
      res.passedTests,
      res.failedTests,
      res.skippedTests,
      res.durationMs,
      JSON.stringify(res.errors || []),
      res.passed ? 1 : 0,
      res.executedAt
    );
  }

  public listTestResultsByProposal(proposalId: string): IImprovementTestResult[] {
    const db = this.dbManager.getRawDb();
    const rows = db.prepare(`SELECT * FROM improvement_tests WHERE proposal_id = ? ORDER BY executed_at DESC`).all(proposalId) as any[];
    return rows.map((r) => ({
      id: r.id,
      proposalId: r.proposal_id,
      changeSetId: r.changeset_id,
      suiteName: r.suite_name,
      totalTests: r.total_tests,
      passedTests: r.passed_tests,
      failedTests: r.failed_tests,
      skippedTests: r.skipped_tests,
      durationMs: r.duration_ms,
      errors: JSON.parse(r.errors || '[]'),
      passed: r.passed === 1,
      executedAt: r.executed_at,
    }));
  }

  // ============================================================================
  // Benchmarks
  // ============================================================================

  public recordBenchmarkResult(bm: IImprovementBenchmarkResult): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO improvement_benchmarks (id, proposal_id, changeset_id, metric_name, unit, before_value, after_value, delta, delta_percentage, outcome, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      bm.id,
      bm.proposalId,
      bm.changeSetId,
      bm.metricName,
      bm.unit,
      bm.beforeValue,
      bm.afterValue,
      bm.delta,
      bm.deltaPercentage,
      bm.outcome,
      bm.executedAt
    );
  }

  public listBenchmarkResultsByProposal(proposalId: string): IImprovementBenchmarkResult[] {
    const db = this.dbManager.getRawDb();
    const rows = db.prepare(`SELECT * FROM improvement_benchmarks WHERE proposal_id = ? ORDER BY executed_at DESC`).all(proposalId) as any[];
    return rows.map((r) => ({
      id: r.id,
      proposalId: r.proposal_id,
      changeSetId: r.changeset_id,
      metricName: r.metric_name,
      unit: r.unit,
      beforeValue: r.before_value,
      afterValue: r.after_value,
      delta: r.delta,
      deltaPercentage: r.delta_percentage,
      outcome: r.outcome,
      executedAt: r.executed_at,
    }));
  }

  // ============================================================================
  // Approvals
  // ============================================================================

  public createApproval(appr: IImprovementApproval): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO improvement_approvals (id, proposal_id, requested_by, required_role, risk_level, status, resolution_rationale, resolved_by, resolved_at, requested_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      appr.id,
      appr.proposalId,
      appr.requestedBy,
      appr.requiredRole,
      appr.riskLevel,
      appr.status,
      appr.resolutionRationale || null,
      appr.resolvedBy || null,
      appr.resolvedAt || null,
      appr.requestedAt
    );
  }

  public getApprovalById(id: string): IImprovementApproval | null {
    const db = this.dbManager.getRawDb();
    const row = db.prepare(`SELECT * FROM improvement_approvals WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.mapApproval(row);
  }

  public getApprovalByProposal(proposalId: string): IImprovementApproval | null {
    const db = this.dbManager.getRawDb();
    const row = db.prepare(`SELECT * FROM improvement_approvals WHERE proposal_id = ? ORDER BY requested_at DESC LIMIT 1`).get(proposalId) as any;
    if (!row) return null;
    return this.mapApproval(row);
  }

  public resolveApproval(id: string, status: ApprovalStatus, resolvedBy: string, rationale: string): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      UPDATE improvement_approvals
      SET status = ?, resolved_by = ?, resolution_rationale = ?, resolved_at = ?
      WHERE id = ?
    `);
    stmt.run(status, resolvedBy, rationale, new Date().toISOString(), id);
  }

  // ============================================================================
  // Deployments & Rollbacks
  // ============================================================================

  public createDeployment(dep: IImprovementDeployment): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO improvement_deployments (id, proposal_id, changeset_id, stage, status, deployed_at, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      dep.id,
      dep.proposalId,
      dep.changeSetId,
      dep.stage,
      dep.status,
      dep.deployedAt,
      dep.verifiedAt || null
    );
  }

  public getDeploymentById(id: string): IImprovementDeployment | null {
    const db = this.dbManager.getRawDb();
    const row = db.prepare(`SELECT * FROM improvement_deployments WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      proposalId: row.proposal_id,
      changeSetId: row.changeset_id,
      stage: row.stage,
      status: row.status,
      deployedAt: row.deployed_at,
      verifiedAt: row.verified_at || undefined,
    };
  }

  public updateDeploymentStatus(id: string, status: IImprovementDeployment['status'], verifiedAt?: string): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      UPDATE improvement_deployments
      SET status = ?, verified_at = ?
      WHERE id = ?
    `);
    stmt.run(status, verifiedAt || (status === 'PROMOTED' ? new Date().toISOString() : null), id);
  }

  public recordRollback(rb: IImprovementRollback): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO improvement_rollbacks (id, proposal_id, deployment_id, reason, snapshot_reference, verified_restored, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      rb.id,
      rb.proposalId,
      rb.deploymentId,
      rb.reason,
      rb.snapshotReference,
      rb.verifiedRestored ? 1 : 0,
      rb.executedAt
    );
  }

  // ============================================================================
  // Maintenance & Dependencies
  // ============================================================================

  public createMaintenanceJob(job: IMaintenanceJob): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO maintenance_jobs (id, type, target, status, details, reclaimed_bytes, duration_ms, scheduled_at, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      job.id,
      job.type,
      job.target,
      job.status,
      JSON.stringify(job.details || {}),
      job.reclaimedBytes || null,
      job.durationMs || null,
      job.scheduledAt,
      job.executedAt || null
    );
  }

  public updateMaintenanceJob(id: string, status: MaintenanceJobStatus, details?: { reclaimedBytes?: number; durationMs?: number }): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      UPDATE maintenance_jobs
      SET status = ?, reclaimed_bytes = COALESCE(?, reclaimed_bytes), duration_ms = COALESCE(?, duration_ms), executed_at = ?
      WHERE id = ?
    `);
    stmt.run(
      status,
      details?.reclaimedBytes || null,
      details?.durationMs || null,
      new Date().toISOString(),
      id
    );
  }

  public listMaintenanceJobs(limit: number = 50): IMaintenanceJob[] {
    const db = this.dbManager.getRawDb();
    const rows = db.prepare(`SELECT * FROM maintenance_jobs ORDER BY scheduled_at DESC LIMIT ?`).all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      target: r.target,
      status: r.status,
      details: JSON.parse(r.details || '{}'),
      reclaimedBytes: r.reclaimed_bytes ?? undefined,
      durationMs: r.duration_ms ?? undefined,
      scheduledAt: r.scheduled_at,
      executedAt: r.executed_at ?? undefined,
    }));
  }

  public recordDependencyFinding(finding: IDependencyFinding): void {
    const db = this.dbManager.getRawDb();
    const stmt = db.prepare(`
      INSERT INTO dependency_findings (id, package_name, current_version, latest_version, is_outdated, has_breaking_changes, vulnerability_severity, recommendation, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      finding.id,
      finding.packageName,
      finding.currentVersion,
      finding.latestVersion,
      finding.isOutdated ? 1 : 0,
      finding.hasBreakingChanges ? 1 : 0,
      finding.vulnerabilitySeverity || null,
      finding.recommendation,
      finding.detectedAt
    );
  }

  public listDependencyFindings(): IDependencyFinding[] {
    const db = this.dbManager.getRawDb();
    const rows = db.prepare(`SELECT * FROM dependency_findings ORDER BY detected_at DESC`).all() as any[];
    return rows.map((r) => ({
      id: r.id,
      packageName: r.package_name,
      currentVersion: r.current_version,
      latestVersion: r.latest_version,
      isOutdated: r.is_outdated === 1,
      hasBreakingChanges: r.has_breaking_changes === 1,
      vulnerabilitySeverity: r.vulnerability_severity || undefined,
      recommendation: r.recommendation,
      detectedAt: r.detected_at,
    }));
  }

  public listTestResults(proposalId: string): IImprovementTestResult[] {
    return this.listTestResultsByProposal(proposalId);
  }

  public listBenchmarkResults(proposalId: string): IImprovementBenchmarkResult[] {
    return this.listBenchmarkResultsByProposal(proposalId);
  }

  public listApprovals(filter?: { status?: ApprovalStatus; proposalId?: string }): IImprovementApproval[] {
    const db = this.dbManager.getRawDb();
    let query = `SELECT * FROM improvement_approvals WHERE 1=1`;
    const params: any[] = [];

    if (filter?.status) {
      query += ` AND status = ?`;
      params.push(filter.status);
    }
    if (filter?.proposalId) {
      query += ` AND proposal_id = ?`;
      params.push(filter.proposalId);
    }

    query += ` ORDER BY requested_at DESC`;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.mapApproval(r));
  }

  public listRollbacks(proposalId?: string): IImprovementRollback[] {
    const db = this.dbManager.getRawDb();
    let query = `SELECT * FROM improvement_rollbacks WHERE 1=1`;
    const params: any[] = [];

    if (proposalId) {
      query += ` AND proposal_id = ?`;
      params.push(proposalId);
    }

    query += ` ORDER BY executed_at DESC`;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      proposalId: r.proposal_id,
      deploymentId: r.deployment_id,
      reason: r.reason,
      snapshotReference: r.snapshot_reference,
      verifiedRestored: r.verified_restored === 1,
      executedAt: r.executed_at,
    }));
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private mapObservation(r: any): ISelfObservation {
    return {
      id: r.id,
      companyId: r.company_id || undefined,
      source: r.source,
      category: r.category,
      metricName: r.metric_name || undefined,
      metricValue: r.metric_value !== null ? r.metric_value : undefined,
      details: JSON.parse(r.details || '{}'),
      level: r.level,
      timestamp: r.timestamp,
    };
  }

  private mapAnomaly(r: any): ISelfAnomaly {
    return {
      id: r.id,
      companyId: r.company_id || undefined,
      title: r.title,
      component: r.component,
      severity: r.severity,
      description: r.description,
      evidenceSummary: r.evidence_summary,
      observationIds: JSON.parse(r.observation_ids || '[]'),
      status: r.status,
      detectedAt: r.detected_at,
      resolvedAt: r.resolved_at || undefined,
    };
  }

  private mapProposal(r: any): IImprovementProposal {
    return {
      id: r.id,
      companyId: r.company_id || undefined,
      anomalyId: r.anomaly_id || undefined,
      title: r.title,
      category: r.category,
      state: r.state,
      problemStatement: r.problem_statement,
      evidenceSummary: r.evidence_summary,
      expectedBenefit: r.expected_benefit,
      affectedComponents: JSON.parse(r.affected_components || '[]'),
      riskLevel: r.risk_level,
      confidenceScore: r.confidence_score,
      proposedImplementation: r.proposed_implementation,
      rollbackStrategy: r.rollback_strategy,
      testPlan: r.test_plan,
      benchmarkPlan: r.benchmark_plan || undefined,
      requiresHumanApproval: r.requires_human_approval === 1,
      estimatedResourceCost: r.estimated_resource_cost,
      version: r.version,
      createdByAgent: r.created_by_agent,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      expiresAt: r.expires_at || undefined,
    };
  }

  private mapApproval(r: any): IImprovementApproval {
    return {
      id: r.id,
      proposalId: r.proposal_id,
      requestedBy: r.requested_by,
      requiredRole: r.required_role,
      riskLevel: r.risk_level,
      status: r.status,
      resolutionRationale: r.resolution_rationale || undefined,
      resolvedBy: r.resolved_by || undefined,
      resolvedAt: r.resolved_at || undefined,
      requestedAt: r.requested_at,
    };
  }
}
