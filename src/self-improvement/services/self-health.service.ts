/**
 * HṚṢĪKEŚA (हृषीकेश) — Self-Health Service
 */

import { SelfImprovementRepository } from '../repositories/self-improvement.repository.js';
import { ISelfHealthReport } from '../interfaces/self-improvement.types.js';

export class SelfHealthService {
  private readonly repository: SelfImprovementRepository;

  constructor(repository: SelfImprovementRepository) {
    this.repository = repository;
  }

  public evaluateHealth(companyId?: string): ISelfHealthReport {
    const activeAnomalies = this.repository.listAnomalies({ status: 'ACTIVE', companyId });
    const activeProposals = this.repository.listProposals({ companyId }).filter(
      (p) => p.state !== 'ACCEPTED' && p.state !== 'REJECTED' && p.state !== 'CANCELLED' && p.state !== 'EXPIRED'
    );
    const criticalAnomalies = activeAnomalies.filter((a) => a.severity === 'CRITICAL');
    const highAnomalies = activeAnomalies.filter((a) => a.severity === 'HIGH');
    const mediumAnomalies = activeAnomalies.filter((a) => a.severity === 'MEDIUM');

    // Subsystem baseline health scores
    let kernelScore = 100;
    let testsScore = 100;
    let memoryScore = 100;
    let modelsScore = 100;
    let toolsScore = 100;
    let skillsScore = 100;
    let mcpScore = 100;
    let companyOsScore = 100;

    for (const anom of activeAnomalies) {
      const penalty = anom.severity === 'CRITICAL' ? 30 : anom.severity === 'HIGH' ? 15 : 5;
      const comp = anom.component.toLowerCase();
      if (comp.includes('kernel')) kernelScore = Math.max(0, kernelScore - penalty);
      if (comp.includes('test')) testsScore = Math.max(0, testsScore - penalty);
      if (comp.includes('memory')) memoryScore = Math.max(0, memoryScore - penalty);
      if (comp.includes('model')) modelsScore = Math.max(0, modelsScore - penalty);
      if (comp.includes('tool')) toolsScore = Math.max(0, toolsScore - penalty);
      if (comp.includes('skill')) skillsScore = Math.max(0, skillsScore - penalty);
      if (comp.includes('mcp')) mcpScore = Math.max(0, mcpScore - penalty);
      if (comp.includes('company')) companyOsScore = Math.max(0, companyOsScore - penalty);
    }

    const subsystemScores = {
      kernel: kernelScore,
      tests: testsScore,
      memory: memoryScore,
      models: modelsScore,
      tools: toolsScore,
      skills: skillsScore,
      mcp: mcpScore,
      companyOs: companyOsScore,
    };

    const overallScore = Math.round(
      (kernelScore + testsScore + memoryScore + modelsScore + toolsScore + skillsScore + mcpScore + companyOsScore) / 8
    );

    let overallStatus: ISelfHealthReport['overallStatus'] = 'HEALTHY';
    if (criticalAnomalies.length > 0 || overallScore < 60) {
      overallStatus = 'CRITICAL';
    } else if (highAnomalies.length > 0 || overallScore < 80) {
      overallStatus = 'DEGRADED';
    } else if (mediumAnomalies.length > 0 || activeAnomalies.length > 0) {
      overallStatus = 'NEEDS_ATTENTION';
    }

    const pendingApprovals = this.repository.listProposals({ state: 'AWAITING_APPROVAL', companyId }).length;

    return {
      overallStatus,
      overallScore,
      subsystemScores,
      activeAnomaliesCount: activeAnomalies.length,
      activeProposalsCount: activeProposals.length,
      pendingApprovalsCount: pendingApprovals,
      timestamp: new Date().toISOString(),
    };
  }
}
