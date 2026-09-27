/**
 * HṚṢĪKEŚA (हृषीकेश) — Decision Intelligence Repository
 *
 * FP-18: SQLite persistence for ResearchCases, Candidates, Comparisons,
 * DecisionRecords, DecisionReviews, and ProposedActions.
 */

import { DatabaseSync } from 'node:sqlite';
import { DatabaseManager } from '../../persistence/database/database.manager.js';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  ResearchCase,
  ResearchCaseStatus,
  ResearchCandidate,
  CandidateComparison,
  DecisionRecord,
  DecisionReview,
  ProposedAction,
} from '../interfaces/decision.types.js';

export class DecisionRepository {
  private readonly dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager, _logger?: ILogger) {
    this.dbManager = dbManager;
  }

  private get db(): DatabaseSync {
    return this.dbManager.getRawDb();
  }

  // ==========================================
  // 1. RESEARCH CASES
  // ==========================================

  public createCase(c: ResearchCase): ResearchCase {
    const stmt = this.db.prepare(`
      INSERT INTO research_cases (
        id, owner, company_id, project_id, objective, question, scope,
        status, research_type, depth, criteria_json, constraints_json,
        plan_json, sources_json, claims_json, contradictions_json,
        unknowns_json, artifacts_json, decision_brief_json, decision_record_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      c.id,
      c.owner,
      c.companyId || null,
      c.projectId || null,
      c.objective,
      c.question,
      c.scope,
      c.status,
      c.researchType,
      c.depth,
      JSON.stringify(c.criteria || []),
      JSON.stringify(c.constraints || []),
      JSON.stringify(c.plan || {}),
      JSON.stringify(c.sources || []),
      JSON.stringify(c.claims || []),
      JSON.stringify(c.contradictions || []),
      JSON.stringify(c.unknowns || []),
      JSON.stringify(c.artifacts || []),
      c.decisionBrief ? JSON.stringify(c.decisionBrief) : null,
      c.decisionRecordId || null,
      c.createdAt,
      c.updatedAt
    );

    return c;
  }

  public getCaseById(id: string): ResearchCase | null {
    const row = this.db
      .prepare('SELECT * FROM research_cases WHERE id = ?')
      .get(id) as Record<string, any> | undefined;

    if (!row) return null;
    return this.mapCaseRow(row);
  }

  public updateCase(c: ResearchCase): void {
    const stmt = this.db.prepare(`
      UPDATE research_cases SET
        owner = ?,
        company_id = ?,
        project_id = ?,
        objective = ?,
        question = ?,
        scope = ?,
        status = ?,
        research_type = ?,
        depth = ?,
        criteria_json = ?,
        constraints_json = ?,
        plan_json = ?,
        sources_json = ?,
        claims_json = ?,
        contradictions_json = ?,
        unknowns_json = ?,
        artifacts_json = ?,
        decision_brief_json = ?,
        decision_record_id = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      c.owner,
      c.companyId || null,
      c.projectId || null,
      c.objective,
      c.question,
      c.scope,
      c.status,
      c.researchType,
      c.depth,
      JSON.stringify(c.criteria || []),
      JSON.stringify(c.constraints || []),
      JSON.stringify(c.plan || {}),
      JSON.stringify(c.sources || []),
      JSON.stringify(c.claims || []),
      JSON.stringify(c.contradictions || []),
      JSON.stringify(c.unknowns || []),
      JSON.stringify(c.artifacts || []),
      c.decisionBrief ? JSON.stringify(c.decisionBrief) : null,
      c.decisionRecordId || null,
      c.updatedAt,
      c.id
    );
  }

  public updateCaseStatus(id: string, status: ResearchCaseStatus): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE research_cases SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  }

  public listCases(filter?: {
    companyId?: string;
    projectId?: string;
    status?: ResearchCaseStatus;
    limit?: number;
  }): ResearchCase[] {
    let sql = 'SELECT * FROM research_cases WHERE 1=1';
    const params: any[] = [];

    if (filter?.companyId) {
      sql += ' AND company_id = ?';
      params.push(filter.companyId);
    }
    if (filter?.projectId) {
      sql += ' AND project_id = ?';
      params.push(filter.projectId);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY created_at DESC';
    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, any>[];
    return rows.map((r) => this.mapCaseRow(r));
  }

  private mapCaseRow(r: Record<string, any>): ResearchCase {
    const candidates = this.getCandidatesByCaseId(r.id);
    const comparison = this.getComparisonByCaseId(r.id);

    return {
      id: r.id,
      owner: r.owner,
      companyId: r.company_id || undefined,
      projectId: r.project_id || undefined,
      objective: r.objective,
      question: r.question,
      scope: r.scope || '',
      status: r.status as ResearchCaseStatus,
      researchType: r.research_type,
      depth: r.depth,
      criteria: JSON.parse(r.criteria_json || '[]'),
      constraints: JSON.parse(r.constraints_json || '[]'),
      plan: r.plan_json ? JSON.parse(r.plan_json) : undefined,
      sources: JSON.parse(r.sources_json || '[]'),
      claims: JSON.parse(r.claims_json || '[]'),
      contradictions: JSON.parse(r.contradictions_json || '[]'),
      unknowns: JSON.parse(r.unknowns_json || '[]'),
      candidates,
      comparison: comparison || undefined,
      decisionBrief: r.decision_brief_json ? JSON.parse(r.decision_brief_json) : undefined,
      decisionRecordId: r.decision_record_id || undefined,
      artifacts: JSON.parse(r.artifacts_json || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  // ==========================================
  // 2. RESEARCH CANDIDATES
  // ==========================================

  public createCandidate(cand: ResearchCandidate): ResearchCandidate {
    const stmt = this.db.prepare(`
      INSERT INTO research_candidates (
        id, case_id, name, description, source_url, repository_url,
        license, license_category, compatibility_status,
        compatibility_details_json, capabilities_json, limitations_json,
        cost_summary, operational_complexity, confidence,
        evidence_ids_json, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      cand.id,
      cand.caseId,
      cand.name,
      cand.description,
      cand.sourceUrl,
      cand.repositoryUrl || null,
      cand.license,
      cand.licenseCategory,
      cand.compatibilityStatus,
      JSON.stringify(cand.compatibilityDetails || {}),
      JSON.stringify(cand.capabilities || []),
      JSON.stringify(cand.limitations || []),
      cand.costSummary,
      cand.operationalComplexity,
      cand.confidence,
      JSON.stringify(cand.evidenceIds || []),
      JSON.stringify(cand.metadata || {}),
      cand.createdAt
    );

    return cand;
  }

  public getCandidatesByCaseId(caseId: string): ResearchCandidate[] {
    const rows = this.db
      .prepare('SELECT * FROM research_candidates WHERE case_id = ? ORDER BY created_at ASC')
      .all(caseId) as Record<string, any>[];

    return rows.map((r) => ({
      id: r.id,
      caseId: r.case_id,
      name: r.name,
      description: r.description,
      sourceUrl: r.source_url,
      repositoryUrl: r.repository_url || undefined,
      license: r.license,
      licenseCategory: r.license_category,
      compatibilityStatus: r.compatibility_status,
      compatibilityDetails: JSON.parse(r.compatibility_details_json || '{}'),
      capabilities: JSON.parse(r.capabilities_json || '[]'),
      limitations: JSON.parse(r.limitations_json || '[]'),
      costSummary: r.cost_summary,
      operationalComplexity: r.operational_complexity,
      confidence: r.confidence,
      evidenceIds: JSON.parse(r.evidence_ids_json || '[]'),
      metadata: JSON.parse(r.metadata_json || '{}'),
      createdAt: r.created_at,
    }));
  }

  // ==========================================
  // 3. CANDIDATE COMPARISONS
  // ==========================================

  public saveComparison(comp: CandidateComparison): CandidateComparison {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO research_comparisons (
        id, case_id, criteria_json, candidates_json, matrix_json,
        tradeoff_summary, unknowns_json, confidence_score,
        recommended_candidate_id, recommendation_rationale, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      comp.id,
      comp.caseId,
      JSON.stringify(comp.criteria || []),
      JSON.stringify(comp.candidates || []),
      JSON.stringify(comp.matrix || []),
      comp.tradeoffSummary,
      JSON.stringify(comp.unknowns || []),
      comp.confidenceScore,
      comp.recommendedCandidateId || null,
      comp.recommendationRationale || null,
      comp.createdAt
    );

    return comp;
  }

  public getComparisonByCaseId(caseId: string): CandidateComparison | null {
    const row = this.db
      .prepare('SELECT * FROM research_comparisons WHERE case_id = ?')
      .get(caseId) as Record<string, any> | undefined;

    if (!row) return null;

    return {
      id: row.id,
      caseId: row.case_id,
      criteria: JSON.parse(row.criteria_json || '[]'),
      candidates: JSON.parse(row.candidates_json || '[]'),
      matrix: JSON.parse(row.matrix_json || '[]'),
      tradeoffSummary: row.tradeoff_summary,
      unknowns: JSON.parse(row.unknowns_json || '[]'),
      confidenceScore: row.confidence_score,
      recommendedCandidateId: row.recommended_candidate_id || undefined,
      recommendationRationale: row.recommendation_rationale || undefined,
      createdAt: row.created_at,
    };
  }

  // ==========================================
  // 4. DECISION RECORDS
  // ==========================================

  public createDecisionRecord(rec: DecisionRecord): DecisionRecord {
    const stmt = this.db.prepare(`
      INSERT INTO decision_records (
        id, case_id, company_id, project_id, context, objective,
        options_considered_json, criteria_json, evidence_summary,
        assumptions_json, selected_option_json, rationale, approver,
        timestamp, superseded_decision_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      rec.id,
      rec.caseId,
      rec.companyId || null,
      rec.projectId || null,
      rec.context,
      rec.objective,
      JSON.stringify(rec.optionsConsidered || []),
      JSON.stringify(rec.criteria || []),
      rec.evidenceSummary,
      JSON.stringify(rec.assumptions || []),
      JSON.stringify(rec.selectedOption || {}),
      rec.rationale,
      rec.approver,
      rec.timestamp,
      rec.supersededDecisionId || null,
      rec.status,
      rec.createdAt,
      rec.updatedAt
    );

    // Save proposed actions
    if (rec.resultingActions && rec.resultingActions.length > 0) {
      for (const action of rec.resultingActions) {
        this.createProposedAction(action);
      }
    }

    return rec;
  }

  public getDecisionRecordById(id: string): DecisionRecord | null {
    const row = this.db
      .prepare('SELECT * FROM decision_records WHERE id = ?')
      .get(id) as Record<string, any> | undefined;

    if (!row) return null;
    return this.mapDecisionRecordRow(row);
  }

  public listDecisionRecords(filter?: {
    companyId?: string;
    projectId?: string;
    status?: string;
    limit?: number;
  }): DecisionRecord[] {
    let sql = 'SELECT * FROM decision_records WHERE 1=1';
    const params: any[] = [];

    if (filter?.companyId) {
      sql += ' AND company_id = ?';
      params.push(filter.companyId);
    }
    if (filter?.projectId) {
      sql += ' AND project_id = ?';
      params.push(filter.projectId);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY created_at DESC';
    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, any>[];
    return rows.map((r) => this.mapDecisionRecordRow(r));
  }

  public updateDecisionStatus(
    id: string,
    status: 'ACTIVE' | 'SUPERSEDED' | 'UNDER_REVIEW' | 'REVOKED',
    supersededBy?: string
  ): void {
    const now = new Date().toISOString();
    if (supersededBy) {
      this.db
        .prepare('UPDATE decision_records SET status = ?, superseded_decision_id = ?, updated_at = ? WHERE id = ?')
        .run(status, supersededBy, now, id);
    } else {
      this.db
        .prepare('UPDATE decision_records SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, now, id);
    }
  }

  private mapDecisionRecordRow(r: Record<string, any>): DecisionRecord {
    const resultingActions = this.getProposedActionsByDecisionId(r.id);

    return {
      id: r.id,
      caseId: r.case_id,
      companyId: r.company_id || undefined,
      projectId: r.project_id || undefined,
      context: r.context,
      objective: r.objective,
      optionsConsidered: JSON.parse(r.options_considered_json || '[]'),
      criteria: JSON.parse(r.criteria_json || '[]'),
      evidenceSummary: r.evidence_summary || '',
      assumptions: JSON.parse(r.assumptions_json || '[]'),
      selectedOption: JSON.parse(r.selected_option_json || '{}'),
      rationale: r.rationale,
      approver: r.approver,
      timestamp: r.timestamp,
      supersededDecisionId: r.superseded_decision_id || undefined,
      resultingActions,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  // ==========================================
  // 5. DECISION REVIEWS
  // ==========================================

  public createDecisionReview(rev: DecisionReview): DecisionReview {
    const stmt = this.db.prepare(`
      INSERT INTO decision_reviews (
        id, decision_id, review_trigger, original_evidence_summary,
        new_evidence_summary, changed_assumptions_json,
        changed_constraints_json, contradictions_identified_json,
        review_warranted, recommendation, rationale, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      rev.id,
      rev.decisionId,
      rev.reviewTrigger,
      rev.originalEvidenceSummary,
      rev.newEvidenceSummary,
      JSON.stringify(rev.changedAssumptions || []),
      JSON.stringify(rev.changedConstraints || []),
      JSON.stringify(rev.contradictionsIdentified || []),
      rev.reviewWarranted ? 1 : 0,
      rev.recommendation,
      rev.rationale,
      rev.createdAt
    );

    return rev;
  }

  public getReviewsByDecisionId(decisionId: string): DecisionReview[] {
    const rows = this.db
      .prepare('SELECT * FROM decision_reviews WHERE decision_id = ? ORDER BY created_at DESC')
      .all(decisionId) as Record<string, any>[];

    return rows.map((r) => ({
      id: r.id,
      decisionId: r.decision_id,
      reviewTrigger: r.review_trigger,
      originalEvidenceSummary: r.original_evidence_summary,
      newEvidenceSummary: r.new_evidence_summary,
      changedAssumptions: JSON.parse(r.changed_assumptions_json || '[]'),
      changedConstraints: JSON.parse(r.changed_constraints_json || '[]'),
      contradictionsIdentified: JSON.parse(r.contradictions_identified_json || '[]'),
      reviewWarranted: Boolean(r.review_warranted),
      recommendation: r.recommendation,
      rationale: r.rationale,
      createdAt: r.created_at,
    }));
  }

  // ==========================================
  // 6. PROPOSED ACTIONS
  // ==========================================

  public createProposedAction(action: ProposedAction): ProposedAction {
    const stmt = this.db.prepare(`
      INSERT INTO decision_proposed_actions (
        id, case_id, decision_id, type, title, description,
        parameters_json, requires_approval, status,
        dispatched_entity_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      action.id,
      action.caseId,
      action.decisionId || null,
      action.type,
      action.title,
      action.description,
      JSON.stringify(action.parameters || {}),
      action.requiresApproval ? 1 : 0,
      action.status,
      action.dispatchedEntityId || null,
      action.createdAt
    );

    return action;
  }

  public getProposedActionsByCaseId(caseId: string): ProposedAction[] {
    const rows = this.db
      .prepare('SELECT * FROM decision_proposed_actions WHERE case_id = ? ORDER BY created_at ASC')
      .all(caseId) as Record<string, any>[];

    return rows.map((r) => this.mapActionRow(r));
  }

  public getProposedActionsByDecisionId(decisionId: string): ProposedAction[] {
    const rows = this.db
      .prepare('SELECT * FROM decision_proposed_actions WHERE decision_id = ? ORDER BY created_at ASC')
      .all(decisionId) as Record<string, any>[];

    return rows.map((r) => this.mapActionRow(r));
  }

  public updateActionStatus(
    id: string,
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'REJECTED' | 'FAILED',
    dispatchedEntityId?: string
  ): void {
    if (dispatchedEntityId) {
      this.db
        .prepare('UPDATE decision_proposed_actions SET status = ?, dispatched_entity_id = ? WHERE id = ?')
        .run(status, dispatchedEntityId, id);
    } else {
      this.db
        .prepare('UPDATE decision_proposed_actions SET status = ? WHERE id = ?')
        .run(status, id);
    }
  }

  public getProposedActionById(id: string): ProposedAction | null {
    const row = this.db
      .prepare('SELECT * FROM decision_proposed_actions WHERE id = ?')
      .get(id) as Record<string, any> | undefined;
    return row ? this.mapActionRow(row) : null;
  }

  public listProposedActions(filters?: { status?: string; caseId?: string }): ProposedAction[] {
    let query = 'SELECT * FROM decision_proposed_actions WHERE 1=1';
    const params: any[] = [];
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.caseId) {
      query += ' AND case_id = ?';
      params.push(filters.caseId);
    }
    query += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(query).all(...params) as Record<string, any>[];
    return rows.map((r) => this.mapActionRow(r));
  }

  public updateProposedActionStatus(
    id: string,
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'REJECTED' | 'FAILED',
    dispatchedEntityId?: string
  ): void {
    this.updateActionStatus(id, status, dispatchedEntityId);
  }

  private mapActionRow(r: Record<string, any>): ProposedAction {
    return {
      id: r.id,
      caseId: r.case_id,
      decisionId: r.decision_id || undefined,
      type: r.type,
      title: r.title,
      description: r.description,
      parameters: JSON.parse(r.parameters_json || '{}'),
      requiresApproval: Boolean(r.requires_approval),
      status: r.status,
      dispatchedEntityId: r.dispatched_entity_id || undefined,
      createdAt: r.created_at,
    };
  }
}
