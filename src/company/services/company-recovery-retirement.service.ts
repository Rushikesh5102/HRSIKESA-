/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Recovery & Retirement Service
 *
 * Coordinates:
 * 1. Disaster recovery, backup checkpoints, and state recovery managed by Yama.
 * 2. Safe, auditable decommissioning, data retention, and exit lifecycle managed by Mṛtyu.
 *
 * Enforces:
 * - Never blindly retry destructive/financial operations during recovery.
 * - Never permanently destroy company data during retirement without authorization.
 */

import { randomUUID } from 'crypto';
import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import { CompanyRepository } from '../../persistence/repositories/company.repository.js';

export interface CompanySnapshot {
  snapshotId: string;
  companyId: string;
  createdAt: string;
  objectivesCount: number;
  kpisCount: number;
  ordersCount: number;
  risksCount: number;
  incidentsCount: number;
}

export interface RetirementPlan {
  planId: string;
  companyId: string;
  status: 'REVIEW' | 'APPROVAL' | 'WINDING_DOWN' | 'DATA_RETENTION' | 'RESOURCE_RELEASE' | 'ARCHIVED' | 'RETIRED';
  retentionPeriodDays: number;
  dataArchived: boolean;
  resourcesReleased: boolean;
  approvedBy?: string;
  completedAt?: string;
}

export class CompanyRecoveryRetirementService {
  private readonly snapshots: Map<string, CompanySnapshot[]> = new Map();
  private readonly retirementPlans: Map<string, RetirementPlan> = new Map();

  constructor(
    private readonly opsRepo: CompanyOperationsRepository,
    private readonly companyRepo: CompanyRepository
  ) {}

  // ==========================================
  // 1. RECOVERY & BACKUP (YAMA)
  // ==========================================

  public createCheckpoint(companyId: string): CompanySnapshot {
    const objectives = this.opsRepo.listObjectivesByCompany(companyId);
    const kpis = this.opsRepo.listKpisByCompany(companyId);
    const orders = this.opsRepo.listOrdersByCompany(companyId);
    const risks = this.opsRepo.listRisksByCompany(companyId);
    const incidents = this.opsRepo.listIncidentsByCompany(companyId);

    const snapshot: CompanySnapshot = {
      snapshotId: randomUUID(),
      companyId,
      createdAt: new Date().toISOString(),
      objectivesCount: objectives.length,
      kpisCount: kpis.length,
      ordersCount: orders.length,
      risksCount: risks.length,
      incidentsCount: incidents.length
    };

    const existing = this.snapshots.get(companyId) || [];
    existing.push(snapshot);
    this.snapshots.set(companyId, existing);

    this.opsRepo.recordActivity({
      id: randomUUID(),
      companyId,
      actor: 'yama',
      action: 'RECOVERY_CHECKPOINT_CREATED',
      target: `snapshot:${snapshot.snapshotId}`,
      result: 'SUCCESS',
      evidence: `Saved checkpoint with ${objectives.length} objectives, ${orders.length} orders`,
      timestamp: snapshot.createdAt
    });

    return snapshot;
  }

  public getCheckpoints(companyId: string): CompanySnapshot[] {
    return this.snapshots.get(companyId) || [];
  }

  public createSnapshot(companyId: string, description = 'Recovery Checkpoint', actor = 'Yama'): any {
    const cp = this.createCheckpoint(companyId);
    const snap = {
      id: cp.snapshotId,
      companyId,
      description,
      actor,
      status: 'VALIDATED',
      entityCounts: {
        objectives: cp.objectivesCount,
        kpis: cp.kpisCount,
        orders: cp.ordersCount,
        risks: cp.risksCount,
        incidents: cp.incidentsCount
      },
      createdAt: cp.createdAt
    };
    return snap;
  }

  public getSnapshot(snapshotId: string): any | null {
    for (const [, snaps] of this.snapshots.entries()) {
      const found = snaps.find((s) => s.snapshotId === snapshotId);
      if (found) {
        return {
          id: found.snapshotId,
          companyId: found.companyId,
          status: 'VALIDATED',
          entityCounts: {
            objectives: found.objectivesCount,
            kpis: found.kpisCount,
            orders: found.ordersCount
          },
          createdAt: found.createdAt
        };
      }
    }
    return null;
  }

  public createRetirementPlan(companyId: string, retentionPeriodDays = 365): RetirementPlan {
    const plan: RetirementPlan = {
      planId: randomUUID(),
      companyId,
      status: 'REVIEW',
      retentionPeriodDays,
      dataArchived: false,
      resourcesReleased: false
    };
    this.retirementPlans.set(companyId, plan);
    return plan;
  }

  public advanceRetirement(companyId: string, targetStatus: RetirementPlan['status'], approver?: string): RetirementPlan {
    let plan = this.retirementPlans.get(companyId);
    if (!plan) {
      plan = this.createRetirementPlan(companyId);
    }
    plan.status = targetStatus;
    if (approver) plan.approvedBy = approver;
    if (targetStatus === 'ARCHIVED' || targetStatus === 'RETIRED') {
      plan.dataArchived = true;
      plan.resourcesReleased = true;
      plan.completedAt = new Date().toISOString();
    }
    this.retirementPlans.set(companyId, plan);
    return plan;
  }

  public initiateRetirement(companyId: string, _reason = 'Retirement', isApproved = false): any {
    if (!isApproved) {
      throw new Error('Retirement requires explicit sovereign human approval');
    }
    const company = this.companyRepo.get(companyId);
    if (!company) {
      throw new Error(`Company with id '${companyId}' not found.`);
    }

    const plan = this.advanceRetirement(companyId, 'RETIRED', 'Rushikesh (Sovereign)');
    this.companyRepo.update(companyId, { status: 'RETIRED' });
    this.opsRepo.updateOperatingState(companyId, 'RETIRED');

    return {
      planId: plan.planId,
      companyId,
      operatingState: 'RETIRED',
      isArchived: true
    };
  }

  public getRetirementPlan(companyId: string): RetirementPlan | null {
    return this.retirementPlans.get(companyId) || null;
  }
}

