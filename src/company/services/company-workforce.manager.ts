/**
 * HṚṢĪKEŚA (हृषीकेश) — Company Workforce Capacity Manager
 *
 * Tracks operational capacity, task loads, availability, and specializations
 * for the authoritative 17-agent workforce across multi-company contexts.
 * Coordinates with KĀLA for temporal scheduling.
 */

import {
  IAgentWorkforceCapacity,
  AgentCapacityStatus
} from '../interfaces/company-operations.types.js';

export interface WorkforceCapacityExtended extends IAgentWorkforceCapacity {
  activeTasksCount: number;
}

export class CompanyWorkforceManager {
  private readonly capacities: Map<string, WorkforceCapacityExtended> = new Map();

  private static readonly AGENT_MAPPINGS: Array<{ key: string; name: string; specs: string[] }> = [
    { key: 'rahu', name: 'Rahu', specs: ['market_intelligence', 'web_research', 'competitor_analysis', 'research'] },
    { key: 'aja', name: 'Aja', specs: ['strategy', 'business_planning', 'roadmap_design', 'plan'] },
    { key: 'ritvan', name: 'Ritvan', specs: ['company_setup', 'organization_topology', 'role_architecture', 'org'] },
    { key: 'tvas', name: 'Tvas', specs: ['customer_discovery', 'requirements_research', 'personas', 'discovery'] },
    { key: 'spoota', name: 'Spoota', specs: ['product_design', 'api_specification', 'ui_ux_architecture', 'design'] },
    { key: 'gandiva', name: 'Gāṇḍīva', specs: ['software_engineering', 'implementation', 'system_building', 'coding', 'code'] },
    { key: 'vighna', name: 'Vighna', specs: ['qa_testing', 'risk_management', 'verification', 'qa', 'test', 'risk'] },
    { key: 'raudra', name: 'Raudra', specs: ['marketing', 'sales_pipeline', 'lead_generation', 'sales'] },
    { key: 'rutam', name: 'Rutam', specs: ['contracts', 'compliance', 'legal_governance', 'legal'] },
    { key: 'arvan', name: 'Arvan', specs: ['fulfillment', 'deployment', 'release_delivery', 'deploy', 'fulfill'] },
    { key: 'taraka', name: 'Tāraka', specs: ['customer_onboarding', 'support_tickets', 'user_success', 'support', 'onboard'] },
    { key: 'kalki', name: 'Kalki', specs: ['billing', 'financial_accounting', 'invoicing', 'finance'] },
    { key: 'garuda', name: 'Garuḍa', specs: ['sre_operations', 'infrastructure', 'incident_management', 'sre', 'ops'] },
    { key: 'kali', name: 'Kali', specs: ['continuous_improvement', 'optimization', 'expansion', 'improvement'] },
    { key: 'kala', name: 'KĀLA', specs: ['temporal_scheduling', 'resource_coordination', 'deadlines', 'schedule'] },
    { key: 'yama', name: 'Yama', specs: ['backup_recovery', 'disaster_management', 'integrity_check', 'recovery'] },
    { key: 'mrtyu', name: 'Mṛtyu', specs: ['retirement', 'decommissioning', 'archival', 'exit'] }
  ];

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
    const agentName = bestAgent || 'Aja';
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
