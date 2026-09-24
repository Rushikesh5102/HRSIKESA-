/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Product Release Service
 *
 * Manages product releases, versioning, deployment targets, test coverage,
 * rollback plans, and post-deployment verification.
 *
 * Spoota designs -> Gāṇḍīva implements -> Vighna verifies -> Arvan deploys.
 */

import { randomUUID } from 'crypto';
import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import {
  ICompanyRelease,
  ReleaseStatus
} from '../interfaces/company-operations.types.js';

export interface CreateReleaseInput {
  companyId: string;
  productId: string;
  version: string;
  scope?: string;
  changes: string[];
  tests: string[];
  approvals?: string[];
  deploymentTarget?: string;
  rollbackPlan?: string;
}

export class CompanyProductReleaseService {
  constructor(private readonly opsRepo: CompanyOperationsRepository) {}

  public createRelease(input: any): ICompanyRelease {
    const now = new Date().toISOString();
    const release: ICompanyRelease = {
      id: input.id || randomUUID(),
      companyId: input.companyId,
      productId: input.productId,
      version: input.version,
      scope: input.scope,
      changes: input.changes || [],
      tests: input.tests || [],
      approvals: input.approvals || [],
      deploymentTarget: input.deploymentTarget || 'LOCAL',
      rollbackPlan: input.rollbackPlan,
      status: input.status || 'RELEASE_CANDIDATE',
      createdAt: now,
      updatedAt: now
    };

    return this.opsRepo.createRelease(release);
  }

  public verifyAndDeployRelease(
    releaseId: string,
    opts: { testsPassed: boolean; healthCheckPassed: boolean; evidence?: string }
  ): { success: boolean; status: string } {
    if (!opts.testsPassed || !opts.healthCheckPassed) {
      this.opsRepo.updateReleaseStatus(releaseId, 'FAILED' as any, opts.evidence || 'Verification checks failed');
      return { success: false, status: 'FAILED' };
    }
    this.opsRepo.updateReleaseStatus(releaseId, 'RELEASED' as any, opts.evidence || 'Verified and deployed');
    return { success: true, status: 'RELEASED' };
  }

  public advanceReleaseStatus(
    releaseId: string,
    status: ReleaseStatus,
    evidence?: string
  ): ICompanyRelease {
    const release = this.opsRepo.getReleaseById(releaseId);
    if (!release) {
      throw new Error(`Release with id '${releaseId}' not found.`);
    }

    this.opsRepo.updateReleaseStatus(releaseId, status, evidence);

    const updated: ICompanyRelease = {
      ...release,
      status,
      evidence: evidence ?? release.evidence,
      updatedAt: new Date().toISOString()
    };

    if (status === 'VERIFIED') {
      this.opsRepo.recordActivity({
        id: randomUUID(),
        companyId: release.companyId,
        actor: 'vighna',
        action: 'RELEASE_VERIFIED',
        target: `release:${release.id}`,
        result: 'VERIFIED',
        evidence: evidence || `Release v${release.version} verified successfully`,
        timestamp: new Date().toISOString()
      });
    }

    return updated;
  }

  public listReleases(companyId: string): ICompanyRelease[] {
    return this.opsRepo.listReleasesByCompany(companyId);
  }
}
