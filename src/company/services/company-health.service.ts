/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Health Service
 *
 * Evaluates multi-dimensional company operational health across 11 dimensions:
 * strategy, product, customers, sales, finance, operations, technology, security,
 * compliance, support, and resources.
 *
 * Produces descriptive, auditable health states (HEALTHY, WATCH, AT_RISK, BLOCKED, CRITICAL, PAUSED).
 */

import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import {
  ICompanyHealthReport,
  CompanyHealthStatus,
  KpiCategory
} from '../interfaces/company-operations.types.js';

export class CompanyHealthService {
  constructor(private readonly opsRepo: CompanyOperationsRepository) {}

  public evaluateCompanyHealth(companyId: string, isPaused = false): ICompanyHealthReport {
    const timestamp = new Date().toISOString();

    if (isPaused) {
      const dimensions = this.createDefaultDimensions('PAUSED');
      return {
        companyId,
        overallStatus: 'PAUSED',
        dimensions,
        timestamp
      };
    }

    const kpis = this.opsRepo.listKpisByCompany(companyId);
    const incidents = this.opsRepo.listIncidentsByCompany(companyId);
    const risks = this.opsRepo.listRisksByCompany(companyId);
    const approvals = this.opsRepo.listApprovalsByCompany(companyId, 'PENDING');
    const tickets = this.opsRepo.listTicketsByCompany(companyId);

    const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'POSTMORTEM');
    const criticalIncidents = activeIncidents.filter((i) => i.severity === 'CRITICAL');
    const highRisks = risks.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH');
    const openCriticalTickets = tickets.filter((t) => (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && t.priority === 'CRITICAL');

    const dimensions: Record<KpiCategory, { score: number; status: CompanyHealthStatus; issues: string[] }> = {
      STRATEGY: { score: 100, status: 'HEALTHY', issues: [] },
      PRODUCT: { score: 100, status: 'HEALTHY', issues: [] },
      CUSTOMERS: { score: 100, status: 'HEALTHY', issues: [] },
      SALES: { score: 100, status: 'HEALTHY', issues: [] },
      FINANCE: { score: 100, status: 'HEALTHY', issues: [] },
      OPERATIONS: { score: 100, status: 'HEALTHY', issues: [] },
      TECHNOLOGY: { score: 100, status: 'HEALTHY', issues: [] },
      SECURITY: { score: 100, status: 'HEALTHY', issues: [] },
      COMPLIANCE: { score: 100, status: 'HEALTHY', issues: [] },
      SUPPORT: { score: 100, status: 'HEALTHY', issues: [] },
      RESOURCES: { score: 100, status: 'HEALTHY', issues: [] }
    };

    // Evaluate KPI deltas
    for (const kpi of kpis) {
      const cat = kpi.category;
      if (dimensions[cat]) {
        if (kpi.targetValue > 0 && kpi.currentValue < kpi.targetValue * 0.7) {
          dimensions[cat].score = Math.max(0, dimensions[cat].score - 25);
          dimensions[cat].issues.push(`KPI '${kpi.name}' is underperforming (current: ${kpi.currentValue}, target: ${kpi.targetValue})`);
        }
      }
    }

    // Evaluate incidents on Operations & Technology
    if (criticalIncidents.length > 0) {
      dimensions.OPERATIONS.score = 20;
      dimensions.OPERATIONS.status = 'CRITICAL';
      dimensions.OPERATIONS.issues.push(`${criticalIncidents.length} active critical incident(s) detected`);
    } else if (activeIncidents.length > 0) {
      dimensions.OPERATIONS.score = 60;
      dimensions.OPERATIONS.status = 'WATCH';
      dimensions.OPERATIONS.issues.push(`${activeIncidents.length} active non-critical incident(s)`);
    }

    // Evaluate support tickets on Support
    if (openCriticalTickets.length > 0) {
      dimensions.SUPPORT.score = 40;
      dimensions.SUPPORT.status = 'AT_RISK';
      dimensions.SUPPORT.issues.push(`${openCriticalTickets.length} open critical support ticket(s)`);
    }

    // Evaluate risks on Compliance & Strategy
    if (highRisks.length > 0) {
      dimensions.COMPLIANCE.score = 50;
      dimensions.COMPLIANCE.status = 'WATCH';
      dimensions.COMPLIANCE.issues.push(`${highRisks.length} high/critical risk(s) identified`);
    }

    // Evaluate approvals on Governance
    if (approvals.length > 3) {
      dimensions.STRATEGY.score = 70;
      dimensions.STRATEGY.status = 'WATCH';
      dimensions.STRATEGY.issues.push(`${approvals.length} pending approvals awaiting sovereign resolution`);
    }

    // Compute status per dimension
    for (const key of Object.keys(dimensions) as KpiCategory[]) {
      const d = dimensions[key];
      if (d.status !== 'CRITICAL') {
        if (d.score >= 80) d.status = 'HEALTHY';
        else if (d.score >= 60) d.status = 'WATCH';
        else if (d.score >= 40) d.status = 'AT_RISK';
        else d.status = 'CRITICAL';
      }
    }

    // Overall Status
    let overallStatus: CompanyHealthStatus = 'HEALTHY';
    const dimValues = Object.values(dimensions);
    const overallScore = Math.round(dimValues.reduce((sum, d) => sum + d.score, 0) / dimValues.length);

    if (dimValues.some((d) => d.status === 'CRITICAL')) {
      overallStatus = 'CRITICAL';
    } else if (dimValues.some((d) => d.status === 'AT_RISK')) {
      overallStatus = 'AT_RISK';
    } else if (dimValues.some((d) => d.status === 'WATCH')) {
      overallStatus = 'WATCH';
    }

    const hybridDimensions: any = { ...dimensions };
    for (const [k, v] of Object.entries(dimensions)) {
      hybridDimensions[k.toLowerCase()] = v.score;
    }

    return {
      companyId,
      overallStatus,
      overallScore,
      dimensions: hybridDimensions,
      timestamp
    };
  }

  public evaluateHealth(companyId: string, isPaused = false): ICompanyHealthReport {
    return this.evaluateCompanyHealth(companyId, isPaused);
  }

  private createDefaultDimensions(status: CompanyHealthStatus): Record<KpiCategory, { score: number; status: CompanyHealthStatus; issues: string[] }> {
    const cats: KpiCategory[] = ['STRATEGY', 'PRODUCT', 'CUSTOMERS', 'SALES', 'FINANCE', 'OPERATIONS', 'TECHNOLOGY', 'SECURITY', 'COMPLIANCE', 'SUPPORT', 'RESOURCES'];
    const record: any = {};
    for (const c of cats) {
      record[c] = { score: 100, status, issues: [] };
    }
    return record;
  }
}
