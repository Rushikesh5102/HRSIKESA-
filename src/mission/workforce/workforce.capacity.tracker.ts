/**
 * HṚṢĪKEŚA (हृषीकेश) — Workforce Capacity Tracker
 *
 * FP-14: Tracks runtime capacity, active tasks, queued tasks,
 * and workload metrics across the canonical workforce agents.
 */

import { AgentWorkforceCapacity } from '../types/workforce.types.js';
import { MissionRepository } from '../repository/mission.repository.js';
import { INITIAL_AGENT_ROSTER } from '../../agents/roster/initial.agents.js';
import { ILogger } from '../../core/logging/logger.types.js';

/** Canonical initial agent IDs dynamically derived from the authoritative workforce roster. */
export const INITIAL_AGENT_IDS: readonly string[] = INITIAL_AGENT_ROSTER.map(a => a.id);

/** Backward-compatible alias for existing imports. */
export const INITIAL_17_AGENT_IDS = INITIAL_AGENT_IDS;

export class WorkforceCapacityTracker {
  private inMemoryCapacity: Map<string, AgentWorkforceCapacity> = new Map();

  constructor(
    private readonly repository?: MissionRepository,
    private readonly logger?: ILogger
  ) {
    this.initializeRoster();
    if (this.logger) {
      this.logger.debug(`WorkforceCapacityTracker initialized with ${this.inMemoryCapacity.size} agents`);
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
    const now = new Date().toISOString();
    for (const agent of INITIAL_AGENT_ROSTER) {
      this.inMemoryCapacity.set(agent.id, {
        agentId: agent.id,
        name: agent.displayName,
        role: agent.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        primarySpecialization: agent.description,
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
