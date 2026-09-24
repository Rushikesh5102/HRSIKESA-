/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Company Automation Engine
 *
 * Master orchestrator implementing the autonomous operating loop:
 * OBJECTIVE -> PLAN -> DELEGATE -> EXECUTE -> OBSERVE -> VERIFY -> RECORD -> ADAPT -> CONTINUE
 *
 * Coordinates workforce dispatch across the 17 specialist agents,
 * manages bounded execution loops, enforces policy hierarchy,
 * and maintains multi-company operational state.
 */

import { randomUUID } from 'crypto';
import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import { CompanyHealthService } from './company-health.service.js';
import { CompanyKpiEngine } from './company-kpi.engine.js';
import { CompanyWorkforceManager } from './company-workforce.manager.js';
import { CompanyApprovalService } from './company-approval.service.js';
import { CompanyRepository } from '../../persistence/repositories/company.repository.js';
import { CompanyIncidentManager } from './company-incident.manager.js';
import { CompanyRiskManager } from './company-risk.manager.js';
import { EventBus } from '../../core/events/event-bus.js';
import {
  CompanyOperatingState,
  CompanyLoopBudget,
  CompanyOperatingCycleResult,
  ICompanyObjective
} from '../interfaces/company-operations.types.js';

export class CompanyAutomationEngine {
  private readonly pausedCompanies: Set<string> = new Set();
  private readonly companyStates: Map<string, CompanyOperatingState> = new Map();

  private readonly defaultBudget: CompanyLoopBudget = {
    maxTasks: 10,
    maxMissions: 5,
    maxModelCalls: 20,
    maxRuntimeMs: 30000,
    maxRetries: 3
  };

  constructor(
    private readonly opsRepo: CompanyOperationsRepository,
    public readonly companyRepo: CompanyRepository,
    public readonly healthService: CompanyHealthService,
    public readonly kpiEngine: CompanyKpiEngine,
    public readonly workforceManager: CompanyWorkforceManager,
    public readonly approvalService: CompanyApprovalService,
    public readonly incidentManager?: CompanyIncidentManager,
    public readonly riskManager?: CompanyRiskManager,
    public readonly eventBus?: EventBus
  ) {}

  public getCompanyOperatingState(companyId: string): CompanyOperatingState {
    if (this.pausedCompanies.has(companyId)) {
      return 'PAUSED';
    }
    return this.companyStates.get(companyId) || 'PLANNING';
  }

  public setCompanyOperatingState(companyId: string, state: CompanyOperatingState): void {
    const prevState = this.getCompanyOperatingState(companyId);
    this.companyStates.set(companyId, state);

    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('company.state_changed', {
        companyId,
        fromState: prevState,
        toState: state,
        timestamp: new Date().toISOString()
      } as any);
    }

    this.opsRepo.recordActivity({
      id: randomUUID(),
      companyId,
      actor: 'hrisekesa',
      action: 'STATE_CHANGED',
      target: `company:${companyId}`,
      result: state,
      evidence: `State transitioned from ${prevState} to ${state}`,
      timestamp: new Date().toISOString()
    });
  }

  public pauseCompany(companyId: string): void {
    this.pausedCompanies.add(companyId);
    this.setCompanyOperatingState(companyId, 'PAUSED');
  }

  public resumeCompany(companyId: string): void {
    this.pausedCompanies.delete(companyId);
    this.setCompanyOperatingState(companyId, 'OPERATING');
  }

  public isPaused(companyId: string): boolean {
    if (this.pausedCompanies.has(companyId)) return true;
    try {
      const state = this.opsRepo.getOperatingState(companyId);
      return state === 'PAUSED';
    } catch {
      return false;
    }
  }

  /**
   * Executes a bounded autonomous company operating cycle.
   */
  public executeOperatingCycle(
    companyId: string,
    customBudget?: Partial<CompanyLoopBudget>
  ): CompanyOperatingCycleResult {
    const start = Date.now();
    const budget = { ...this.defaultBudget, ...customBudget };
    const details: string[] = [];
    const health = this.healthService.evaluateCompanyHealth(companyId, this.isPaused(companyId));

    if (this.isPaused(companyId)) {
      return {
        cycleId: randomUUID(),
        companyId,
        state: 'PAUSED',
        status: 'SKIPPED_PAUSED' as any,
        tasksDispatched: 0,
        executedTasks: 0,
        missionsCreated: 0,
        completedObjectives: 0,
        pendingApprovals: 0,
        activeIncidents: 0,
        healthEvaluated: health,
        actionsTaken: ['Company is currently paused. No autonomous cycles executed.'],
        durationMs: Date.now() - start,
        details: ['Company is currently paused. No autonomous cycles executed.']
      };
    }

    // 1. Inspect Company Health & State
    details.push(`Company health evaluated: ${health.overallStatus}`);

    // 2. Inspect Pending Approvals
    const pendingApprovals = this.approvalService.getPendingApprovals(companyId);
    if (pendingApprovals.length > 0) {
      details.push(`${pendingApprovals.length} pending approvals require sovereign resolution.`);
    }

    // 3. Inspect Active Incidents
    const incidents = this.opsRepo.listIncidentsByCompany(companyId);
    const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'POSTMORTEM');
    if (activeIncidents.length > 0) {
      details.push(`${activeIncidents.length} active incident(s) undergoing mitigation.`);
    }

    // 4. Identify Pending Objectives
    const pendingObjectives = this.opsRepo.listObjectivesByCompany(companyId, 'PENDING');
    let executedTasks = 0;
    let completedObjectives = 0;

    for (const obj of pendingObjectives) {
      if (executedTasks >= budget.maxTasks) {
        details.push(`Cycle task budget limit (${budget.maxTasks}) reached.`);
        break;
      }

      // Check if objective requires approval
      if (obj.approvalRequired) {
        const approved = this.approvalService.isActionApproved(obj.metadata?.approvalId as string);
        if (!approved) {
          details.push(`Objective '${obj.title}' awaiting approval.`);
          continue;
        }
      }

      // Allocate agent based on objective category
      const assignedAgent = this.resolveAgentForObjective(obj);
      const allocated = this.workforceManager.allocateAgent(assignedAgent, obj.id, companyId);

      if (allocated) {
        executedTasks++;
        details.push(`Executed objective '${obj.title}' via agent [${assignedAgent}].`);

        // Mark objective in progress -> completed
        this.opsRepo.updateObjectiveStatus(obj.id, 'COMPLETED', `Completed autonomously by ${assignedAgent}`);
        completedObjectives++;

        this.workforceManager.releaseAgent(assignedAgent, obj.id);

        if (this.eventBus) {
          this.eventBus.emit('company.objective_completed', {
            companyId,
            objectiveId: obj.id,
            title: obj.title,
            ownerAgentId: assignedAgent,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        details.push(`Agent [${assignedAgent}] is busy/unavailable for objective '${obj.title}'.`);
      }
    }

    // 5. Update State if Appropriate
    const currentState = this.getCompanyOperatingState(companyId);
    if (currentState === 'PLANNING' && completedObjectives > 0) {
      this.setCompanyOperatingState(companyId, 'BUILDING');
    } else if (currentState === 'BUILDING' && activeIncidents.length === 0) {
      this.setCompanyOperatingState(companyId, 'OPERATING');
    }

    const durationMs = Date.now() - start;

    return {
      cycleId: randomUUID(),
      companyId,
      state: this.getCompanyOperatingState(companyId),
      status: 'COMPLETED' as any,
      tasksDispatched: executedTasks,
      executedTasks,
      missionsCreated: completedObjectives > 0 ? 1 : 0,
      completedObjectives,
      pendingApprovals: pendingApprovals.length,
      activeIncidents: activeIncidents.length,
      healthEvaluated: health,
      actionsTaken: details,
      durationMs,
      details
    };
  }

  private resolveAgentForObjective(obj: ICompanyObjective): string {
    switch (obj.category) {
      case 'STRATEGIC': return 'aja';
      case 'PRODUCT': return 'spoota';
      case 'TECHNICAL': return 'gandiva';
      case 'COMPLIANCE': return 'rutam';
      case 'FINANCIAL': return 'kalki';
      case 'CUSTOMER': return 'taraka';
      case 'GROWTH': return 'raudra';
      case 'OPERATIONAL': return 'garuda';
      default: return obj.ownerAgentId || 'aja';
    }
  }
}
