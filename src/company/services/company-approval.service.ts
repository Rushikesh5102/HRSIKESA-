/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Approval Service
 *
 * Manages company-scoped HITL approvals for high-risk operations:
 * financial transactions, legal agreements, external communications,
 * production deployments, destructive operations, and company closure.
 *
 * Enforces: PENDING APPROVAL MUST NEVER EQUAL SUCCESS.
 */

import { randomUUID } from 'crypto';
import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import {
  ICompanyApproval,
  ApprovalCategory,
  ApprovalStatus
} from '../interfaces/company-operations.types.js';

export interface RequestApprovalInput {
  companyId: string;
  category: ApprovalCategory;
  title: string;
  description?: string;
  requesterAgentId: string;
  payload?: Record<string, unknown>;
  expiresInHours?: number;
}

export class CompanyApprovalService {
  constructor(private readonly opsRepo: CompanyOperationsRepository) {}

  public requestApproval(input: RequestApprovalInput): ICompanyApproval {
    const now = new Date();
    const expiresAt = input.expiresInHours
      ? new Date(now.getTime() + input.expiresInHours * 3600 * 1000).toISOString()
      : undefined;

    const approval: ICompanyApproval = {
      id: (input as any).id || randomUUID(),
      companyId: input.companyId,
      category: input.category,
      title: input.title,
      description: input.description,
      requesterAgentId: input.requesterAgentId,
      status: 'PENDING',
      payload: input.payload,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return this.opsRepo.createApproval(approval);
  }

  public resolveApproval(
    approvalId: string,
    decision: 'APPROVE' | 'REJECT' | 'APPROVED' | 'REJECTED',
    resolvedBy: string,
    reason?: string
  ): ICompanyApproval {
    const approval = this.opsRepo.getApprovalById(approvalId);
    if (!approval) {
      throw new Error(`Approval with id '${approvalId}' not found.`);
    }

    if (approval.status !== 'PENDING') {
      throw new Error(`Approval '${approvalId}' is already resolved with status '${approval.status}'.`);
    }

    const newStatus: ApprovalStatus = (decision === 'APPROVE' || decision === 'APPROVED') ? 'APPROVED' : 'REJECTED';
    this.opsRepo.resolveApproval(approvalId, newStatus, resolvedBy, reason);

    return {
      ...approval,
      status: newStatus,
      resolvedBy,
      resolutionReason: reason,
      updatedAt: new Date().toISOString()
    };
  }

  public isApproved(approvalId?: string): boolean {
    return this.isActionApproved(approvalId);
  }

  public isActionApproved(approvalId?: string): boolean {
    if (!approvalId) return false;
    const approval = this.opsRepo.getApprovalById(approvalId);
    return approval !== null && approval.status === 'APPROVED';
  }

  public getPendingApprovals(companyId: string): ICompanyApproval[] {
    return this.opsRepo.listApprovalsByCompany(companyId, 'PENDING');
  }
}
