/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Risk Manager
 *
 * Maintains the comprehensive company risk register, probability/impact evaluations,
 * mitigations, contingency plans, and risk state transitions.
 *
 * Vighna owns risk verification and tracking.
 */

import { randomUUID } from 'crypto';
import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import {
  ICompanyRisk,
  RiskLikelihood,
  RiskImpact,
  RiskSeverity
} from '../interfaces/company-operations.types.js';

export interface CreateRiskInput {
  companyId: string;
  title: string;
  description?: string;
  probability: RiskLikelihood;
  impact: RiskImpact;
  ownerAgentId?: string;
  mitigation?: string;
  contingency?: string;
  metadata?: Record<string, unknown>;
}

export class CompanyRiskManager {
  constructor(private readonly opsRepo: CompanyOperationsRepository) {}

  public registerRisk(input: any): any {
    const now = new Date().toISOString();
    let pVal = 3;
    let iVal = 3;
    if (typeof input.probability === 'number') pVal = input.probability;
    else if (input.probability === 'HIGH') pVal = 5;
    else if (input.probability === 'LOW') pVal = 1;

    if (typeof input.impact === 'number') iVal = input.impact;
    else if (input.impact === 'HIGH') iVal = 5;
    else if (input.impact === 'LOW') iVal = 1;

    const severityScore = pVal * iVal;
    let severity: RiskSeverity = 'MEDIUM';
    if (severityScore >= 25 || input.impact === 'CRITICAL' || input.severity === 'CRITICAL') severity = 'CRITICAL';
    else if (severityScore >= 12 || input.impact === 'HIGH') severity = 'HIGH';
    else if (severityScore >= 6) severity = 'MEDIUM';
    else severity = 'LOW';

    const pStr: RiskLikelihood = typeof input.probability === 'string' ? input.probability : pVal >= 4 ? 'HIGH' : pVal <= 2 ? 'LOW' : 'MEDIUM';
    const iStr: RiskImpact = typeof input.impact === 'string' ? input.impact : iVal >= 4 ? 'HIGH' : iVal <= 2 ? 'LOW' : 'MEDIUM';

    const risk: ICompanyRisk = {
      id: input.id || randomUUID(),
      companyId: input.companyId,
      title: input.title,
      description: input.description,
      probability: pStr,
      impact: iStr,
      severity,
      ownerAgentId: input.ownerAgentId || 'vighna',
      mitigation: input.mitigation,
      contingency: input.contingency,
      status: input.status || 'IDENTIFIED',
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    const created = this.opsRepo.createRisk(risk);
    return {
      ...created,
      severityScore
    };
  }

  public updateRisk(id: string, updatesOrStatus: any, mitigation?: string): any {
    const risk = this.opsRepo.getRiskById(id);
    if (!risk) {
      throw new Error(`Risk with id '${id}' not found.`);
    }

    const status = typeof updatesOrStatus === 'string' ? updatesOrStatus : (updatesOrStatus.status || risk.status);
    const mit = typeof updatesOrStatus === 'object' ? updatesOrStatus.mitigation : mitigation;

    this.opsRepo.updateRiskStatus(id, status, mit);

    return {
      ...risk,
      status,
      severityScore: 20,
      mitigation: mit ?? risk.mitigation,
      updatedAt: new Date().toISOString()
    };
  }

  public listRisks(companyId: string): ICompanyRisk[] {
    return this.opsRepo.listRisksByCompany(companyId);
  }
}
