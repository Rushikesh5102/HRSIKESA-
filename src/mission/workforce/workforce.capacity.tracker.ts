/**
 * HṚṢĪKEŚA (हृषीकेश) — Workforce Capacity Tracker
 *
 * FP-14: Tracks runtime capacity, active tasks, queued tasks,
 * and workload metrics across the 17 specialized agents.
 */

import { AgentWorkforceCapacity } from '../types/workforce.types.js';
import { MissionRepository } from '../repository/mission.repository.js';
import { ILogger } from '../../core/logging/logger.types.js';

export const INITIAL_17_AGENT_IDS = [
  'rahu',
  'aja',
  'ritvan',
  'tvas',
  'spoota',
  'gandiva',
  'vighna',
  'raudra',
  'rutam',
  'arvan',
  'taraka',
  'kalki',
  'garuda',
  'kali',
  'kala',
  'yama',
  'mrtyu',
];

export class WorkforceCapacityTracker {
  private inMemoryCapacity: Map<string, AgentWorkforceCapacity> = new Map();

  constructor(
    private readonly repository?: MissionRepository,
    private readonly logger?: ILogger
  ) {
    this.initializeRoster();
    if (this.logger) {
      this.logger.debug('WorkforceCapacityTracker initialized with 17 agents');
    }
  }

  public getCapacity(agentIdOrName: string): AgentWorkforceCapacity {
    const normalized = agentIdOrName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let cap = this.inMemoryCapacity.get(normalized);
    if (!cap) {
      for (const [id, c] of this.inMemoryCapacity.entries()) {
        if (id.includes(normalized) || c.name.toLowerCase().includes(normalized)) {
          cap = c;
          break;
        }
      }
    }
    if (cap) return cap;

    const fallback: AgentWorkforceCapacity = {
      agentId: normalized,
      name: agentIdOrName,
      role: 'Specialist Agent',
      primarySpecialization: 'General Operations',
      status: 'AVAILABLE',
      activeTaskIds: [],
      queuedTaskIds: [],
      currentMissionIds: [],
      maxConcurrentTasks: 3,
      currentWorkloadScore: 0,
      historicalSuccessRate: 1.0,
      lastActiveTimestamp: new Date().toISOString(),
    };
    this.inMemoryCapacity.set(normalized, fallback);
    return fallback;
  }

  public getAllCapacities(): any[] {
    return Array.from(this.inMemoryCapacity.values()).map(c => ({
      agentName: c.name,
      status: c.status,
      activeTasks: c.activeTaskIds.length,
      queuedTasks: c.queuedTaskIds.length,
      specialization: c.primarySpecialization,
      currentWorkloadScore: c.currentWorkloadScore
    }));
  }

  public recordTaskStart(agentIdOrName: string, taskId?: string): void {
    const cap = this.getCapacity(agentIdOrName);
    const id = taskId || `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (!cap.activeTaskIds.includes(id)) {
      cap.activeTaskIds.push(id);
    }
    cap.currentWorkloadScore = Math.min(100, Math.round((cap.activeTaskIds.length / cap.maxConcurrentTasks) * 100));
    if (cap.activeTaskIds.length >= cap.maxConcurrentTasks) {
      cap.status = 'OVERLOADED';
    } else if (cap.activeTaskIds.length > 0) {
      cap.status = 'BUSY';
    }
    cap.lastActiveTimestamp = new Date().toISOString();
    this.inMemoryCapacity.set(cap.agentId, cap);

    if (this.repository) {
      try {
        this.repository.saveCapacity(cap);
      } catch {
        // ignore
      }
    }
  }

  public recordTaskEnd(agentIdOrName: string, taskId?: string): void {
    const cap = this.getCapacity(agentIdOrName);
    if (taskId) {
      cap.activeTaskIds = cap.activeTaskIds.filter(id => id !== taskId);
    } else if (cap.activeTaskIds.length > 0) {
      cap.activeTaskIds.pop();
    }
    cap.currentWorkloadScore = Math.min(100, Math.round((cap.activeTaskIds.length / cap.maxConcurrentTasks) * 100));
    if (cap.activeTaskIds.length === 0) {
      cap.status = 'AVAILABLE';
    } else if (cap.activeTaskIds.length < cap.maxConcurrentTasks) {
      cap.status = 'BUSY';
    }
    cap.lastActiveTimestamp = new Date().toISOString();
    this.inMemoryCapacity.set(cap.agentId, cap);

    if (this.repository) {
      try {
        this.repository.saveCapacity(cap);
      } catch {
        // ignore
      }
    }
  }

  private initializeRoster(): void {
    const specs: Record<string, { role: string; spec: string; name: string }> = {
      rahu: { role: 'Chief Intelligence Officer', spec: 'Market Research & Competitive Intelligence', name: 'Rahu' },
      aja: { role: 'Chief Strategy Officer', spec: 'Strategy & Business Planning', name: 'Aja' },
      ritvan: { role: 'Chief Organization Architect', spec: 'Company & Team Setup', name: 'Ritvan' },
      tvas: { role: 'Chief User Researcher', spec: 'Customer & Requirements Research', name: 'Tvas' },
      spoota: { role: 'Chief Product Officer', spec: 'Product & Service Design', name: 'Spoota' },
      gandiva: { role: 'Chief Engineering Officer', spec: 'Software Engineering & Autonomous Coding', name: 'Gāṇḍīva' },
      vighna: { role: 'Chief Risk & Verification Officer', spec: 'QA, Risk & Independent Verification', name: 'Vighna' },
      raudra: { role: 'Chief Growth Officer', spec: 'Marketing & Sales', name: 'Raudra' },
      rutam: { role: 'Chief Governance Officer', spec: 'Contracts, Orders & Compliance', name: 'Rutam' },
      arvan: { role: 'Chief Fulfillment Officer', spec: 'Fulfillment & Production Deployment', name: 'Arvan' },
      taraka: { role: 'Chief Customer Success Officer', spec: 'Customer Onboarding & Support', name: 'Tāraka' },
      kalki: { role: 'Chief Commercial Officer', spec: 'Billing & Financial Operations', name: 'Kalki' },
      garuda: { role: 'Chief Operations Officer', spec: 'Operations & Infrastructure Monitoring', name: 'Garuḍa' },
      kali: { role: 'Chief Transformation Officer', spec: 'Improvement & System Expansion', name: 'Kali' },
      kala: { role: 'Master Coordinator', spec: 'Time, Scheduling & Resource Governance', name: 'KĀLA' },
      yama: { role: 'Chief Resilience Officer', spec: 'Backup & Disaster Recovery', name: 'Yama' },
      mrtyu: { role: 'System Lifecycle Officer', spec: 'Deprecation & Teardown', name: 'Mṛtyu' },
    };

    const now = new Date().toISOString();
    for (const agentId of INITIAL_17_AGENT_IDS) {
      const info = specs[agentId] || { role: 'Specialist Agent', spec: 'Operations', name: agentId };
      this.inMemoryCapacity.set(agentId, {
        agentId,
        name: info.name,
        role: info.role,
        primarySpecialization: info.spec,
        status: 'AVAILABLE',
        activeTaskIds: [],
        queuedTaskIds: [],
        currentMissionIds: [],
        maxConcurrentTasks: 3,
        currentWorkloadScore: 0,
        historicalSuccessRate: 1.0,
        lastActiveTimestamp: now,
      });
    }
  }
}
