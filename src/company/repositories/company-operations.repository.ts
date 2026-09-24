/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Company Operations Repository
 *
 * Provides transactional persistence for all Phase 25 entities:
 * Objectives, KPIs, Observations, Orders, Order Events, Support Tickets,
 * Incidents, Risks, Approvals, SOPs, Releases, Reviews, Budgets, and Activities.
 */

import { DatabaseManager } from '../../persistence/database/database.manager.js';
import {
  ICompanyObjective,
  ICompanyKpi,
  ICompanyMetricObservation,
  ICompanyOrder,
  ICompanyOrderEvent,
  ICompanySupportTicket,
  ICompanyIncident,
  ICompanyRisk,
  ICompanyApproval,
  ICompanySop,
  ICompanyRelease,
  ICompanyReview,
  ICompanyBudget,
  ICompanyActivity,
  ObjectiveStatus,
  OrderLifecycleStage,
  TicketStatus,
  IncidentStatus,
  RiskStatus,
  ApprovalStatus,
  ReleaseStatus
} from '../interfaces/company-operations.types.js';
import { randomUUID } from 'crypto';

export class CompanyOperationsRepository {
  constructor(private readonly dbManager: DatabaseManager) {}

  // ==========================================
  // 1. OBJECTIVES
  // ==========================================

  public createObjective(obj: ICompanyObjective): ICompanyObjective {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_objectives (
        id, company_id, owner_agent_id, title, description, category, priority,
        status, deadline, budget_allocated, budget_spent, dependencies, metrics,
        evidence, risk_level, approval_required, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      obj.id,
      obj.companyId,
      obj.ownerAgentId,
      obj.title,
      obj.description ?? null,
      obj.category,
      obj.priority,
      obj.status,
      obj.deadline ?? null,
      obj.budgetAllocated ?? 0,
      obj.budgetSpent ?? 0,
      JSON.stringify(obj.dependencies ?? []),
      JSON.stringify(obj.metrics ?? []),
      obj.evidence ?? null,
      obj.riskLevel ?? 'LOW',
      obj.approvalRequired ? 1 : 0,
      obj.metadata ? JSON.stringify(obj.metadata) : null,
      obj.createdAt ?? now,
      obj.updatedAt ?? now
    );
    return obj;
  }

  public getObjectiveById(id: string): ICompanyObjective | null {
    const row = this.dbManager.prepare('SELECT * FROM company_objectives WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapObjective(row);
  }

  public getObjective(id: string): ICompanyObjective | null {
    return this.getObjectiveById(id);
  }

  public listObjectivesByCompany(companyId: string, status?: ObjectiveStatus): ICompanyObjective[] {
    let query = 'SELECT * FROM company_objectives WHERE company_id = ?';
    const params: string[] = [companyId];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC;';
    const rows = this.dbManager.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapObjective(r));
  }

  public listObjectives(companyId: string, status?: ObjectiveStatus): ICompanyObjective[] {
    return this.listObjectivesByCompany(companyId, status);
  }

  public updateObjectiveStatus(id: string, status: ObjectiveStatus, evidence?: string): void {
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_objectives
      SET status = ?, evidence = COALESCE(?, evidence), updated_at = ?
      WHERE id = ?;
    `).run(status, evidence ?? null, now, id);
  }

  public updateObjective(id: string, updates: Partial<ICompanyObjective>): ICompanyObjective {
    const current = this.getObjectiveById(id);
    if (!current) throw new Error(`Objective '${id}' not found`);
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_objectives
      SET title = COALESCE(?, title),
          status = COALESCE(?, status),
          evidence = COALESCE(?, evidence),
          budget_spent = COALESCE(?, budget_spent),
          updated_at = ?
      WHERE id = ?;
    `).run(
      updates.title ?? null,
      updates.status ?? null,
      updates.evidence ?? null,
      updates.budgetSpent ?? null,
      now,
      id
    );
    return this.getObjectiveById(id)!;
  }

  // ==========================================
  // 2. KPIs & OBSERVATIONS
  // ==========================================

  public createKpi(kpi: ICompanyKpi): ICompanyKpi {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_kpis (
        id, company_id, name, category, source, unit, target_value, current_value,
        delta, trend, confidence, owner_agent_id, deadline, evidence, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      kpi.id,
      kpi.companyId,
      kpi.name,
      kpi.category,
      kpi.source,
      kpi.unit ?? '',
      kpi.targetValue,
      kpi.currentValue,
      kpi.delta ?? (kpi.currentValue - kpi.targetValue),
      kpi.trend ?? 'FLAT',
      kpi.confidence ?? 1.0,
      kpi.ownerAgentId ?? 'hrisekesa',
      kpi.deadline ?? null,
      kpi.evidence ?? null,
      kpi.metadata ? JSON.stringify(kpi.metadata) : null,
      kpi.createdAt ?? now,
      kpi.updatedAt ?? now
    );
    return kpi;
  }

  public getKpiById(id: string): ICompanyKpi | null {
    const row = this.dbManager.prepare('SELECT * FROM company_kpis WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapKpi(row);
  }

  public getKpi(id: string): ICompanyKpi | null {
    return this.getKpiById(id);
  }

  public listKpisByCompany(companyId: string): ICompanyKpi[] {
    const rows = this.dbManager.prepare('SELECT * FROM company_kpis WHERE company_id = ? ORDER BY category, name;').all(companyId) as Record<string, unknown>[];
    return rows.map((r) => this.mapKpi(r));
  }

  public listKpis(companyId: string): ICompanyKpi[] {
    return this.listKpisByCompany(companyId);
  }

  public updateKpiValue(id: string, currentValue: number, delta: number, trend: string, confidence: number, evidence?: string): void {
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_kpis
      SET current_value = ?, delta = ?, trend = ?, confidence = ?, evidence = COALESCE(?, evidence), updated_at = ?
      WHERE id = ?;
    `).run(currentValue, delta, trend, confidence, evidence ?? null, now, id);
  }

  public recordObservation(obs: ICompanyMetricObservation): ICompanyMetricObservation {
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_metric_observations (
        id, kpi_id, company_id, observed_value, source, notes, evidence, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      obs.id,
      obs.kpiId,
      obs.companyId,
      obs.observedValue,
      obs.source,
      obs.notes ?? null,
      obs.evidence ?? null,
      obs.timestamp
    );
    return obs;
  }

  public listObservationsByKpi(kpiId: string, limit = 50): any[] {
    const rows = this.dbManager.prepare('SELECT * FROM company_metric_observations WHERE kpi_id = ? ORDER BY timestamp DESC, rowid DESC LIMIT ?;').all(kpiId, limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      kpiId: String(r.kpi_id),
      companyId: String(r.company_id),
      observedValue: Number(r.observed_value),
      value: Number(r.observed_value),
      source: String(r.source) as any,
      notes: r.notes ? String(r.notes) : undefined,
      evidence: r.evidence ? String(r.evidence) : undefined,
      timestamp: String(r.timestamp)
    }));
  }

  public listKpiObservations(kpiId: string, limit = 50): any[] {
    return this.listObservationsByKpi(kpiId, limit);
  }

  // ==========================================
  // 3. ORDERS & EVENTS
  // ==========================================

  public createOrder(order: ICompanyOrder): ICompanyOrder {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_orders (
        id, company_id, customer_id, product_id, order_number, status, total_amount,
        currency, items, contract_reference, approval_id, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      order.id,
      order.companyId,
      order.customerId,
      order.productId ?? null,
      order.orderNumber ?? `ORD-${Date.now()}`,
      order.status ?? 'LEAD',
      order.totalAmount ?? 0,
      order.currency ?? 'USD',
      JSON.stringify(order.items ?? []),
      order.contractReference ?? null,
      order.approvalId ?? null,
      order.metadata ? JSON.stringify(order.metadata) : null,
      order.createdAt ?? now,
      order.updatedAt ?? now
    );
    return order;
  }

  public getOrderById(id: string): ICompanyOrder | null {
    const row = this.dbManager.prepare('SELECT * FROM company_orders WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapOrder(row);
  }

  public getOrder(id: string): ICompanyOrder | null {
    return this.getOrderById(id);
  }

  public listOrdersByCompany(companyId: string, status?: OrderLifecycleStage): ICompanyOrder[] {
    let query = 'SELECT * FROM company_orders WHERE company_id = ?';
    const params: string[] = [companyId];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC;';
    const rows = this.dbManager.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapOrder(r));
  }

  public listOrders(companyId: string, status?: OrderLifecycleStage): ICompanyOrder[] {
    return this.listOrdersByCompany(companyId, status);
  }

  public updateOrderStatus(id: string, status: OrderLifecycleStage): void {
    const now = new Date().toISOString();
    this.dbManager.prepare('UPDATE company_orders SET status = ?, updated_at = ? WHERE id = ?;').run(status, now, id);
  }

  public recordOrderEvent(event: ICompanyOrderEvent): ICompanyOrderEvent {
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_order_events (
        id, order_id, company_id, event_type, from_status, to_status, actor, reason, evidence, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      event.id,
      event.orderId,
      event.companyId,
      event.eventType,
      event.fromStatus ?? null,
      event.toStatus,
      event.actor,
      event.reason ?? null,
      event.evidence ?? null,
      event.timestamp
    );
    return event;
  }

  public listOrderEvents(orderId: string): ICompanyOrderEvent[] {
    const rows = this.dbManager.prepare('SELECT * FROM company_order_events WHERE order_id = ? ORDER BY timestamp ASC;').all(orderId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      orderId: String(r.order_id),
      companyId: String(r.company_id),
      eventType: String(r.event_type),
      fromStatus: r.from_status ? (String(r.from_status) as OrderLifecycleStage) : undefined,
      toStatus: String(r.to_status) as OrderLifecycleStage,
      actor: String(r.actor),
      reason: r.reason ? String(r.reason) : undefined,
      evidence: r.evidence ? String(r.evidence) : undefined,
      timestamp: String(r.timestamp)
    }));
  }

  // ==========================================
  // 4. SUPPORT TICKETS
  // ==========================================

  public createTicket(ticket: ICompanySupportTicket): ICompanySupportTicket {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_support_tickets (
        id, company_id, customer_id, title, issue, priority, status, assigned_agent_id,
        sla_deadline, resolution, evidence, messages, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      ticket.id,
      ticket.companyId,
      ticket.customerId,
      ticket.title,
      ticket.issue ?? ticket.title,
      ticket.priority ?? 'MEDIUM',
      ticket.status ?? 'OPEN',
      ticket.assignedAgentId ?? 'Tāraka',
      ticket.slaDeadline ?? null,
      ticket.resolution ?? null,
      ticket.evidence ?? null,
      JSON.stringify(ticket.messages ?? []),
      ticket.metadata ? JSON.stringify(ticket.metadata) : null,
      ticket.createdAt ?? now,
      ticket.updatedAt ?? now
    );
    return ticket;
  }

  public getTicketById(id: string): ICompanySupportTicket | null {
    const row = this.dbManager.prepare('SELECT * FROM company_support_tickets WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapTicket(row);
  }

  public getTicket(id: string): ICompanySupportTicket | null {
    return this.getTicketById(id);
  }

  public listTicketsByCompany(companyId: string, status?: TicketStatus): ICompanySupportTicket[] {
    let query = 'SELECT * FROM company_support_tickets WHERE company_id = ?';
    const params: string[] = [companyId];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC;';
    const rows = this.dbManager.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapTicket(r));
  }

  public listTickets(companyId: string, status?: TicketStatus): ICompanySupportTicket[] {
    return this.listTicketsByCompany(companyId, status);
  }

  public updateTicketStatus(id: string, status: TicketStatus, resolution?: string, evidence?: string): void {
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_support_tickets
      SET status = ?, resolution = COALESCE(?, resolution), evidence = COALESCE(?, evidence), updated_at = ?
      WHERE id = ?;
    `).run(status, resolution ?? null, evidence ?? null, now, id);
  }

  // ==========================================
  // 5. INCIDENTS
  // ==========================================

  public createIncident(incident: ICompanyIncident): ICompanyIncident {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_incidents (
        id, company_id, title, severity, source, affected_system, detected_time,
        owner_agent_id, status, actions, evidence, resolution, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      incident.id,
      incident.companyId,
      incident.title,
      incident.severity ?? 'MEDIUM',
      incident.source ?? 'SYSTEM',
      incident.affectedSystem ?? 'Core Engine',
      incident.detectedTime ?? now,
      incident.ownerAgentId ?? 'Garuḍa',
      incident.status ?? 'DETECTED',
      JSON.stringify(incident.actions ?? []),
      incident.evidence ?? null,
      incident.resolution ?? null,
      incident.metadata ? JSON.stringify(incident.metadata) : null,
      incident.createdAt ?? now,
      incident.updatedAt ?? now
    );
    return incident;
  }

  public getIncidentById(id: string): ICompanyIncident | null {
    const row = this.dbManager.prepare('SELECT * FROM company_incidents WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapIncident(row);
  }

  public getIncident(id: string): ICompanyIncident | null {
    return this.getIncidentById(id);
  }

  public listIncidentsByCompany(companyId: string, status?: IncidentStatus): ICompanyIncident[] {
    let query = 'SELECT * FROM company_incidents WHERE company_id = ?';
    const params: string[] = [companyId];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC;';
    const rows = this.dbManager.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapIncident(r));
  }

  public listIncidents(companyId: string, status?: IncidentStatus): ICompanyIncident[] {
    return this.listIncidentsByCompany(companyId, status);
  }

  public updateIncidentStatus(id: string, status: IncidentStatus, resolution?: string, evidence?: string): void {
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_incidents
      SET status = ?, resolution = COALESCE(?, resolution), evidence = COALESCE(?, evidence), updated_at = ?
      WHERE id = ?;
    `).run(status, resolution ?? null, evidence ?? null, now, id);
  }

  // ==========================================
  // 6. RISKS
  // ==========================================

  public createRisk(risk: ICompanyRisk): ICompanyRisk {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_risks (
        id, company_id, title, description, probability, impact, severity,
        owner_agent_id, mitigation, contingency, status, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      risk.id,
      risk.companyId,
      risk.title,
      risk.description ?? null,
      risk.probability ?? 'MEDIUM',
      risk.impact ?? 'MEDIUM',
      risk.severity ?? 'MEDIUM',
      risk.ownerAgentId ?? 'Vighna',
      risk.mitigation ?? null,
      risk.contingency ?? null,
      risk.status ?? 'IDENTIFIED',
      risk.metadata ? JSON.stringify(risk.metadata) : null,
      risk.createdAt ?? now,
      risk.updatedAt ?? now
    );
    return risk;
  }

  public getRiskById(id: string): ICompanyRisk | null {
    const row = this.dbManager.prepare('SELECT * FROM company_risks WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRisk(row);
  }

  public getRisk(id: string): ICompanyRisk | null {
    return this.getRiskById(id);
  }

  public listRisksByCompany(companyId: string, status?: RiskStatus): ICompanyRisk[] {
    let query = 'SELECT * FROM company_risks WHERE company_id = ?';
    const params: string[] = [companyId];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC;';
    const rows = this.dbManager.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapRisk(r));
  }

  public listRisks(companyId: string, status?: RiskStatus): ICompanyRisk[] {
    return this.listRisksByCompany(companyId, status);
  }

  public updateRiskStatus(id: string, status: RiskStatus, mitigation?: string): void {
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_risks
      SET status = ?, mitigation = COALESCE(?, mitigation), updated_at = ?
      WHERE id = ?;
    `).run(status, mitigation ?? null, now, id);
  }

  // ==========================================
  // 7. APPROVALS
  // ==========================================

  public createApproval(appr: ICompanyApproval): ICompanyApproval {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_approvals (
        id, company_id, category, title, description, requester_agent_id,
        status, resolved_by, resolution_reason, payload, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      appr.id,
      appr.companyId,
      appr.category,
      appr.title,
      appr.description ?? null,
      appr.requesterAgentId ?? 'hrisekesa',
      appr.status ?? 'PENDING',
      appr.resolvedBy ?? null,
      appr.resolutionReason ?? null,
      appr.payload ? JSON.stringify(appr.payload) : null,
      appr.expiresAt ?? null,
      appr.createdAt ?? now,
      appr.updatedAt ?? now
    );
    return appr;
  }

  public getApprovalById(id: string): ICompanyApproval | null {
    const row = this.dbManager.prepare('SELECT * FROM company_approvals WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapApproval(row);
  }

  public getApproval(id: string): ICompanyApproval | null {
    return this.getApprovalById(id);
  }

  public listApprovalsByCompany(companyId: string, status?: ApprovalStatus): ICompanyApproval[] {
    let query = 'SELECT * FROM company_approvals WHERE company_id = ?';
    const params: string[] = [companyId];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC;';
    const rows = this.dbManager.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapApproval(r));
  }

  public listApprovals(companyId: string, status?: ApprovalStatus): ICompanyApproval[] {
    return this.listApprovalsByCompany(companyId, status);
  }

  public resolveApproval(id: string, status: 'APPROVED' | 'REJECTED', resolvedBy: string, reason?: string): void {
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_approvals
      SET status = ?, resolved_by = ?, resolution_reason = ?, updated_at = ?
      WHERE id = ?;
    `).run(status, resolvedBy, reason ?? null, now, id);
  }

  // ==========================================
  // 8. SOPs
  // ==========================================

  public createSop(sop: ICompanySop): ICompanySop {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_sops (
        id, company_id, name, purpose, scope, owner_agent_id, steps,
        required_skills, required_tools, approval_requirements, verification,
        version, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      sop.id,
      sop.companyId,
      sop.name,
      sop.purpose,
      sop.scope,
      sop.ownerAgentId ?? 'hrisekesa',
      JSON.stringify(sop.steps ?? []),
      JSON.stringify(sop.requiredSkills ?? []),
      JSON.stringify(sop.requiredTools ?? []),
      JSON.stringify(sop.approvalRequirements ?? []),
      sop.verification ?? '',
      sop.version ?? '1.0.0',
      sop.status ?? 'ACTIVE',
      sop.createdAt ?? now,
      sop.updatedAt ?? now
    );
    return sop;
  }

  public getSopById(id: string): ICompanySop | null {
    const row = this.dbManager.prepare('SELECT * FROM company_sops WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapSop(row);
  }

  public getSop(id: string): ICompanySop | null {
    return this.getSopById(id);
  }

  public listSopsByCompany(companyId: string): ICompanySop[] {
    const rows = this.dbManager.prepare('SELECT * FROM company_sops WHERE company_id = ? ORDER BY name;').all(companyId) as Record<string, unknown>[];
    return rows.map((r) => this.mapSop(r));
  }

  public listSops(companyId: string): ICompanySop[] {
    return this.listSopsByCompany(companyId);
  }

  // ==========================================
  // 9. RELEASES
  // ==========================================

  public createRelease(rel: ICompanyRelease): ICompanyRelease {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_releases (
        id, company_id, product_id, version, scope, changes, tests,
        approvals, deployment_target, rollback_plan, status, evidence, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      rel.id,
      rel.companyId,
      rel.productId,
      rel.version,
      rel.scope ?? null,
      JSON.stringify(rel.changes ?? []),
      JSON.stringify(rel.tests ?? []),
      JSON.stringify(rel.approvals ?? []),
      rel.deploymentTarget ?? 'LOCAL',
      rel.rollbackPlan ?? null,
      rel.status ?? 'RELEASE_CANDIDATE',
      rel.evidence ?? null,
      rel.createdAt ?? now,
      rel.updatedAt ?? now
    );
    return rel;
  }

  public getReleaseById(id: string): ICompanyRelease | null {
    const row = this.dbManager.prepare('SELECT * FROM company_releases WHERE id = ?;').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRelease(row);
  }

  public getRelease(id: string): ICompanyRelease | null {
    return this.getReleaseById(id);
  }

  public listReleasesByCompany(companyId: string): ICompanyRelease[] {
    const rows = this.dbManager.prepare('SELECT * FROM company_releases WHERE company_id = ? ORDER BY created_at DESC;').all(companyId) as Record<string, unknown>[];
    return rows.map((r) => this.mapRelease(r));
  }

  public listReleases(companyId: string): ICompanyRelease[] {
    return this.listReleasesByCompany(companyId);
  }

  public updateReleaseStatus(id: string, status: ReleaseStatus, evidence?: string): void {
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_releases
      SET status = ?, evidence = COALESCE(?, evidence), updated_at = ?
      WHERE id = ?;
    `).run(status, evidence ?? null, now, id);
  }

  // ==========================================
  // 10. REVIEWS
  // ==========================================

  public createReview(rev: ICompanyReview): ICompanyReview {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_reviews (
        id, company_id, reviewer_agent_id, review_type, findings, actions, proposals, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      rev.id,
      rev.companyId,
      rev.reviewerAgentId ?? 'hrisekesa',
      rev.reviewType ?? 'PERIODIC',
      JSON.stringify(rev.findings ?? []),
      JSON.stringify(rev.actions ?? []),
      JSON.stringify(rev.proposals ?? []),
      rev.status ?? 'COMPLETED',
      rev.createdAt ?? now,
      rev.updatedAt ?? now
    );
    return rev;
  }

  public listReviewsByCompany(companyId: string): ICompanyReview[] {
    const rows = this.dbManager.prepare('SELECT * FROM company_reviews WHERE company_id = ? ORDER BY created_at DESC;').all(companyId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      companyId: String(r.company_id),
      reviewerAgentId: String(r.reviewer_agent_id),
      reviewType: String(r.review_type) as any,
      findings: r.findings ? JSON.parse(String(r.findings)) : [],
      actions: r.actions ? JSON.parse(String(r.actions)) : [],
      proposals: r.proposals ? JSON.parse(String(r.proposals)) : [],
      status: String(r.status) as any,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    }));
  }

  public listReviews(companyId: string): ICompanyReview[] {
    return this.listReviewsByCompany(companyId);
  }

  // ==========================================
  // 11. BUDGETS
  // ==========================================

  public createBudget(bud: ICompanyBudget): ICompanyBudget {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_budgets (
        id, company_id, department_id, project_id, category, allocated_amount,
        reserved_amount, spent_amount, currency, forecast, period_start, period_end,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      bud.id,
      bud.companyId,
      bud.departmentId ?? null,
      bud.projectId ?? null,
      bud.category ?? 'OPERATIONS',
      bud.allocatedAmount ?? 0,
      bud.reservedAmount ?? 0,
      bud.spentAmount ?? 0,
      bud.currency ?? 'USD',
      bud.forecast ?? 0,
      bud.periodStart ?? now,
      bud.periodEnd ?? now,
      bud.createdAt ?? now,
      bud.updatedAt ?? now
    );
    return {
      ...bud,
      remainingAmount: (bud.allocatedAmount ?? 0) - (bud.spentAmount ?? 0)
    };
  }

  public listBudgetsByCompany(companyId: string): ICompanyBudget[] {
    const rows = this.dbManager.prepare('SELECT * FROM company_budgets WHERE company_id = ? ORDER BY created_at DESC;').all(companyId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      companyId: String(r.company_id),
      departmentId: r.department_id ? String(r.department_id) : null,
      projectId: r.project_id ? String(r.project_id) : null,
      category: String(r.category) as any,
      allocatedAmount: Number(r.allocated_amount),
      reservedAmount: Number(r.reserved_amount),
      spentAmount: Number(r.spent_amount),
      remainingAmount: Number(r.allocated_amount) - Number(r.spent_amount),
      currency: String(r.currency),
      forecast: r.forecast ? Number(r.forecast) : undefined,
      periodStart: String(r.period_start),
      periodEnd: String(r.period_end),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    }));
  }

  public listBudgets(companyId: string): ICompanyBudget[] {
    return this.listBudgetsByCompany(companyId);
  }

  public recordBudgetSpend(id: string, amount: number): void {
    const now = new Date().toISOString();
    this.dbManager.prepare(`
      UPDATE company_budgets
      SET spent_amount = spent_amount + ?, updated_at = ?
      WHERE id = ?;
    `).run(amount, now, id);
  }

  public recordExpense(budgetId: string, amount: number, _description?: string, _actor?: string): any {
    this.recordBudgetSpend(budgetId, amount);
    const rows = this.dbManager.prepare('SELECT * FROM company_budgets WHERE id = ?').all(budgetId) as Record<string, unknown>[];
    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: String(r.id),
        allocatedAmount: Number(r.allocated_amount),
        spentAmount: Number(r.spent_amount),
        remainingAmount: Number(r.allocated_amount) - Number(r.spent_amount)
      };
    }
    return { spentAmount: amount, remainingAmount: 0 };
  }

  // ==========================================
  // 12. ACTIVITIES (APPEND-ONLY)
  // ==========================================

  public recordActivity(act: ICompanyActivity): ICompanyActivity {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO company_activities (
        id, company_id, actor, action, target, result, evidence, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      act.id,
      act.companyId,
      act.actor,
      act.action,
      act.target,
      act.result ?? null,
      act.evidence ?? null,
      act.timestamp ?? now
    );
    return act;
  }

  public listActivitiesByCompany(companyId: string, limit = 100): ICompanyActivity[] {
    const rows = this.dbManager.prepare('SELECT * FROM company_activities WHERE company_id = ? ORDER BY timestamp DESC LIMIT ?;').all(companyId, limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      companyId: String(r.company_id),
      actor: String(r.actor),
      action: String(r.action),
      target: String(r.target),
      result: r.result ? String(r.result) : undefined,
      evidence: r.evidence ? String(r.evidence) : undefined,
      timestamp: String(r.timestamp)
    }));
  }

  public listActivities(companyId: string, limit = 100): ICompanyActivity[] {
    return this.listActivitiesByCompany(companyId, limit);
  }

  public logActivity(act: any): void {
    const now = new Date().toISOString();
    this.recordActivity({
      id: act.id || randomUUID(),
      companyId: act.companyId,
      actor: act.actor,
      action: act.action,
      target: act.target,
      result: act.details || act.result,
      timestamp: act.timestamp || now
    });
  }

  // ==========================================
  // 13. OPERATING STATE & DECISION HELPERS
  // ==========================================

  public getOperatingState(companyId: string): string {
    const row = this.dbManager.prepare('SELECT status, metadata FROM companies WHERE id = ?').get(companyId) as any;
    if (!row) return 'IDEATION';
    if (row.metadata) {
      try {
        const meta = JSON.parse(row.metadata);
        if (meta.operatingState) return meta.operatingState;
      } catch {
        // ignore
      }
    }
    return 'OPERATING';
  }

  public updateOperatingState(companyId: string, state: string): string {
    const current = this.dbManager.prepare('SELECT metadata FROM companies WHERE id = ?').get(companyId) as any;
    let meta: any = {};
    if (current?.metadata) {
      try { meta = JSON.parse(current.metadata); } catch {}
    }
    meta.operatingState = state;
    this.dbManager.prepare('UPDATE companies SET metadata = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(meta), new Date().toISOString(), companyId);
    return state;
  }

  public isCompanyPaused(companyId: string): boolean {
    const current = this.dbManager.prepare('SELECT metadata FROM companies WHERE id = ?').get(companyId) as any;
    if (!current?.metadata) return false;
    try {
      const meta = JSON.parse(current.metadata);
      return Boolean(meta.isPaused);
    } catch {
      return false;
    }
  }

  public pauseCompany(companyId: string): string {
    const current = this.dbManager.prepare('SELECT metadata FROM companies WHERE id = ?').get(companyId) as any;
    let meta: any = {};
    if (current?.metadata) {
      try { meta = JSON.parse(current.metadata); } catch {}
    }
    meta.isPaused = true;
    meta.operatingState = 'PAUSED';
    this.dbManager.prepare('UPDATE companies SET metadata = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(meta), new Date().toISOString(), companyId);
    return 'PAUSED';
  }

  public resumeCompany(companyId: string): string {
    const current = this.dbManager.prepare('SELECT metadata FROM companies WHERE id = ?').get(companyId) as any;
    let meta: any = {};
    if (current?.metadata) {
      try { meta = JSON.parse(current.metadata); } catch {}
    }
    meta.isPaused = false;
    meta.operatingState = 'OPERATING';
    this.dbManager.prepare('UPDATE companies SET metadata = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(meta), new Date().toISOString(), companyId);
    return 'OPERATING';
  }

  public getDb(): DatabaseManager {
    return this.dbManager;
  }

  public createDecision(dec: any): any {
    const now = new Date().toISOString();
    const id = dec.id || randomUUID();
    this.dbManager.prepare(`
      INSERT INTO decisions (
        id, company_id, project_id, title, description, decision, reasoning, status, made_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(
      id,
      dec.companyId,
      dec.projectId ?? null,
      dec.title,
      dec.description ?? null,
      dec.decision,
      dec.reasoning ?? null,
      dec.status || 'APPROVED',
      dec.madeBy || 'hrisekesa',
      dec.createdAt || now,
      dec.updatedAt || now
    );
    return { id, ...dec, createdAt: now, updatedAt: now };
  }

  public listDecisions(companyId: string): any[] {
    const rows = this.dbManager.prepare('SELECT * FROM decisions WHERE company_id = ? ORDER BY created_at DESC;').all(companyId) as any[];
    return rows.map((r) => ({
      id: String(r.id),
      companyId: String(r.company_id),
      title: String(r.title),
      decision: String(r.decision),
      reasoning: r.reasoning ? String(r.reasoning) : undefined,
      status: String(r.status),
      madeBy: String(r.made_by),
      createdAt: String(r.created_at)
    }));
  }

  // ==========================================
  // MAPPER HELPERS
  // ==========================================

  private mapObjective(r: Record<string, unknown>): ICompanyObjective {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      ownerAgentId: String(r.owner_agent_id),
      title: String(r.title),
      description: r.description ? String(r.description) : undefined,
      category: String(r.category) as any,
      priority: String(r.priority) as any,
      status: String(r.status) as any,
      deadline: r.deadline ? String(r.deadline) : undefined,
      budgetAllocated: Number(r.budget_allocated || 0),
      budgetSpent: Number(r.budget_spent || 0),
      dependencies: r.dependencies ? JSON.parse(String(r.dependencies)) : [],
      metrics: r.metrics ? JSON.parse(String(r.metrics)) : [],
      evidence: r.evidence ? String(r.evidence) : undefined,
      riskLevel: String(r.risk_level || 'LOW') as any,
      approvalRequired: Boolean(r.approval_required),
      progressPercentage: r.progress_percentage !== undefined ? Number(r.progress_percentage) : (String(r.status) === 'COMPLETED' ? 100 : 0),
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    } as any;
  }

  private mapKpi(r: Record<string, unknown>): ICompanyKpi {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      name: String(r.name),
      category: String(r.category) as any,
      source: String(r.source) as any,
      unit: String(r.unit || ''),
      targetValue: Number(r.target_value),
      currentValue: Number(r.current_value),
      delta: Number(r.delta),
      trend: String(r.trend) as any,
      confidence: Number(r.confidence),
      ownerAgentId: String(r.owner_agent_id),
      deadline: r.deadline ? String(r.deadline) : undefined,
      evidence: r.evidence ? String(r.evidence) : undefined,
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  }

  private mapOrder(r: Record<string, unknown>): ICompanyOrder {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      customerId: String(r.customer_id),
      productId: r.product_id ? String(r.product_id) : null,
      orderNumber: String(r.order_number),
      status: String(r.status) as OrderLifecycleStage,
      totalAmount: Number(r.total_amount),
      currency: String(r.currency),
      items: r.items ? JSON.parse(String(r.items)) : [],
      contractReference: r.contract_reference ? String(r.contract_reference) : undefined,
      approvalId: r.approval_id ? String(r.approval_id) : undefined,
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  }

  private mapTicket(r: Record<string, unknown>): ICompanySupportTicket {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      customerId: String(r.customer_id),
      title: String(r.title),
      issue: String(r.issue),
      priority: String(r.priority) as any,
      status: String(r.status) as TicketStatus,
      assignedAgentId: String(r.assigned_agent_id),
      slaDeadline: r.sla_deadline ? String(r.sla_deadline) : undefined,
      resolution: r.resolution ? String(r.resolution) : undefined,
      evidence: r.evidence ? String(r.evidence) : undefined,
      messages: r.messages ? JSON.parse(String(r.messages)) : [],
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  }

  private mapIncident(r: Record<string, unknown>): ICompanyIncident {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      title: String(r.title),
      severity: String(r.severity) as any,
      source: String(r.source),
      affectedSystem: String(r.affected_system),
      detectedTime: String(r.detected_time),
      ownerAgentId: String(r.owner_agent_id),
      status: String(r.status) as IncidentStatus,
      actions: r.actions ? JSON.parse(String(r.actions)) : [],
      evidence: r.evidence ? String(r.evidence) : undefined,
      resolution: r.resolution ? String(r.resolution) : undefined,
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  }

  private mapRisk(r: Record<string, unknown>): ICompanyRisk {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      title: String(r.title),
      description: r.description ? String(r.description) : undefined,
      probability: String(r.probability) as any,
      impact: String(r.impact) as any,
      severity: String(r.severity) as any,
      ownerAgentId: String(r.owner_agent_id),
      mitigation: r.mitigation ? String(r.mitigation) : undefined,
      contingency: r.contingency ? String(r.contingency) : undefined,
      status: String(r.status) as RiskStatus,
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  }

  private mapApproval(r: Record<string, unknown>): ICompanyApproval {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      category: String(r.category) as any,
      title: String(r.title),
      description: r.description ? String(r.description) : undefined,
      requesterAgentId: String(r.requester_agent_id),
      status: String(r.status) as ApprovalStatus,
      resolvedBy: r.resolved_by ? String(r.resolved_by) : undefined,
      resolutionReason: r.resolution_reason ? String(r.resolution_reason) : undefined,
      payload: r.payload ? JSON.parse(String(r.payload)) : undefined,
      expiresAt: r.expires_at ? String(r.expires_at) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  }

  private mapSop(r: Record<string, unknown>): ICompanySop {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      name: String(r.name),
      purpose: String(r.purpose),
      scope: String(r.scope),
      ownerAgentId: String(r.owner_agent_id),
      steps: r.steps ? JSON.parse(String(r.steps)) : [],
      requiredSkills: r.required_skills ? JSON.parse(String(r.required_skills)) : [],
      requiredTools: r.required_tools ? JSON.parse(String(r.required_tools)) : [],
      approvalRequirements: r.approval_requirements ? JSON.parse(String(r.approval_requirements)) : [],
      verification: String(r.verification || ''),
      version: String(r.version || '1.0.0'),
      status: String(r.status) as any,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  }

  private mapRelease(r: Record<string, unknown>): ICompanyRelease {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      productId: String(r.product_id),
      version: String(r.version),
      scope: r.scope ? String(r.scope) : undefined,
      changes: r.changes ? JSON.parse(String(r.changes)) : [],
      tests: r.tests ? JSON.parse(String(r.tests)) : [],
      approvals: r.approvals ? JSON.parse(String(r.approvals)) : [],
      deploymentTarget: String(r.deployment_target || 'LOCAL'),
      rollbackPlan: r.rollback_plan ? String(r.rollback_plan) : undefined,
      status: String(r.status) as ReleaseStatus,
      evidence: r.evidence ? String(r.evidence) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================
  public createCustomer(cust: {
    id: string;
    companyId: string;
    name: string;
    type?: string;
    status?: string;
    contactReference?: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
  }): any {
    const now = new Date().toISOString();
    const stmt = this.dbManager.prepare(`
      INSERT INTO customers (id, company_id, name, type, status, contact_reference, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      cust.id,
      cust.companyId,
      cust.name,
      cust.type ?? 'individual',
      cust.status ?? 'PROSPECT',
      cust.contactReference ?? null,
      cust.metadata ? JSON.stringify(cust.metadata) : null,
      cust.createdAt ?? now,
      cust.updatedAt ?? now
    );
    return this.getCustomerById(cust.id);
  }

  public getCustomerById(id: string): any | null {
    const row = this.dbManager.prepare(`SELECT * FROM customers WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      name: String(row.name),
      type: String(row.type),
      status: String(row.status),
      contactReference: row.contact_reference ? String(row.contact_reference) : undefined,
      metadata: row.metadata ? JSON.parse(String(row.metadata)) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  public updateCustomer(id: string, updates: Partial<{ name: string; type: string; status: string; contactReference: string; metadata: any }>): any {
    const existing = this.getCustomerById(id);
    if (!existing) throw new Error(`Customer with id '${id}' not found.`);
    const now = new Date().toISOString();
    const updated = { ...existing, ...updates, updatedAt: now };
    const stmt = this.dbManager.prepare(`
      UPDATE customers
      SET name = ?, type = ?, status = ?, contact_reference = ?, metadata = ?, updated_at = ?
      WHERE id = ?;
    `);
    stmt.run(
      updated.name,
      updated.type,
      updated.status,
      updated.contactReference ?? null,
      updated.metadata ? JSON.stringify(updated.metadata) : null,
      now,
      id
    );
    return updated;
  }

  public listCustomersByCompany(companyId: string): any[] {
    const rows = this.dbManager.prepare(`SELECT * FROM customers WHERE company_id = ? ORDER BY created_at DESC`).all(companyId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      companyId: String(r.company_id),
      name: String(r.name),
      type: String(r.type),
      status: String(r.status),
      contactReference: r.contact_reference ? String(r.contact_reference) : undefined,
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    }));
  }
}

