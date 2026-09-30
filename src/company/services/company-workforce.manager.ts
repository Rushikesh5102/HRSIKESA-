/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Workforce Capacity Manager
 *
 * Tracks operational capacity, task loads, availability, and specializations
 * for the canonical workforce across multi-company contexts.
 */

import {
  IAgentWorkforceCapacity,
  AgentCapacityStatus
} from '../interfaces/company-operations.types.js';
import { INITIAL_AGENT_ROSTER } from '../../agents/roster/initial.agents.js';

export interface WorkforceCapacityExtended extends IAgentWorkforceCapacity {
  activeTasksCount: number;
}

export class CompanyWorkforceManager {
  private readonly capacities: Map<string, WorkforceCapacityExtended> = new Map();

  public static readonly AGENT_MAPPINGS: Array<{ key: string; name: string; specs: string[] }> =
    INITIAL_AGENT_ROSTER.map(a => ({
      key: a.id,
      name: a.displayName,
      specs: [...a.capabilities, ...(a.responsibilities || [])]
    }));

  constructor() {
    this.initDefaultCapacities();
  }

  private normalizeKey(raw: string): string {
    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private initDefaultCapacities(): void {
    const now = new Date().toISOString();
    for (const item of CompanyWorkforceManager.AGENT_MAPPINGS) {
      const cap: WorkforceCapacityExtended = {
        agentId: item.name,
        companyId: 'global',
        status: 'AVAILABLE',
        activeTaskCount: 0,
        activeTasksCount: 0,
        maxCapacity: 3,
        specializations: item.specs,
        updatedAt: now
      };
      this.capacities.set(item.name, cap);
      this.capacities.set(item.key, cap);
      this.capacities.set(this.normalizeKey(item.name), cap);
      this.capacities.set(this.normalizeKey(item.key), cap);
    }
  }

  public getAgentCapacity(agentId: string, _companyId = 'global'): WorkforceCapacityExtended {
    const direct = this.capacities.get(agentId);
    if (direct) return direct;
    const norm = this.normalizeKey(agentId);
    const byNorm = this.capacities.get(norm);
    if (byNorm) return byNorm;

    const now = new Date().toISOString();
    const newCap: WorkforceCapacityExtended = {
      agentId,
      companyId: 'global',
      status: 'AVAILABLE',
      activeTaskCount: 0,
      activeTasksCount: 0,
      maxCapacity: 3,
      specializations: ['general_operations'],
      updatedAt: now
    };
    this.capacities.set(agentId, newCap);
    return newCap;
  }

  public allocateAgent(agentId: string, taskId: string, companyId = 'global'): boolean {
    const cap = this.getAgentCapacity(agentId, companyId);
    if (cap.status === 'BLOCKED' || cap.status === 'OFFLINE' || cap.status === 'PAUSED') {
      return false;
    }
    if (cap.activeTaskCount >= cap.maxCapacity) {
      return false;
    }

    cap.activeTaskCount += 1;
    cap.activeTasksCount = cap.activeTaskCount;
    cap.currentTaskId = taskId;
    cap.companyId = companyId;
    cap.status = cap.activeTaskCount >= cap.maxCapacity ? 'BUSY' : 'BUSY';
    cap.updatedAt = new Date().toISOString();

    return true;
  }

  public releaseAgent(agentId: string, taskId?: string): void {
    const cap = this.getAgentCapacity(agentId);
    if (cap.activeTaskCount > 0) {
      cap.activeTaskCount -= 1;
      cap.activeTasksCount = cap.activeTaskCount;
    }
    if (cap.currentTaskId === taskId || cap.activeTaskCount === 0) {
      cap.currentTaskId = undefined;
    }
    cap.status = cap.activeTaskCount === 0 ? 'AVAILABLE' : 'AVAILABLE';
    cap.updatedAt = new Date().toISOString();
  }

  public setAgentStatus(agentId: string, status: AgentCapacityStatus): void {
    const cap = this.getAgentCapacity(agentId);
    cap.status = status;
    cap.updatedAt = new Date().toISOString();
  }

  public getAllCapacities(): IAgentWorkforceCapacity[] {
    const seen = new Set<string>();
    const result: IAgentWorkforceCapacity[] = [];
    for (const item of CompanyWorkforceManager.AGENT_MAPPINGS) {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        result.push(this.getAgentCapacity(item.name));
      }
    }
    return result;
  }

  public getCompanyWorkforceCapacities(_companyId?: string): IAgentWorkforceCapacity[] {
    return this.getAllCapacities();
  }

  public getWorkforceCapacities(_companyId?: string): IAgentWorkforceCapacity[] {
    return this.getAllCapacities();
  }

  public findBestAgentForCapability(capability: string): string | null {
    const norm = capability.toLowerCase();
    for (const item of CompanyWorkforceManager.AGENT_MAPPINGS) {
      if (item.specs.some((s) => s.toLowerCase().includes(norm) || norm.includes(s.toLowerCase()))) {
        return item.name;
      }
    }
    return null;
  }

  public routeWork(capability: string, companyId = 'global'): { agentId: string; status: AgentCapacityStatus } {
    const bestAgent = this.findBestAgentForCapability(capability);
    const agentName = bestAgent || 'Dhātā';
    const cap = this.getAgentCapacity(agentName, companyId);
    return { agentId: cap.agentId, status: cap.status };
  }

  public assignTask(agentId: string, taskId: string, companyId = 'global'): boolean {
    return this.allocateAgent(agentId, taskId, companyId);
  }

  public completeTask(agentId: string, taskId?: string, _companyId = 'global'): void {
    this.releaseAgent(agentId, taskId);
  }
}
