/**
 * HṚṢĪKEŚA (हृषीकेश) — Agent Registry
 *
 * Authoritative registry managing the 17-agent specialized workforce.
 */

import { IAgent, AgentId, AgentStatus, AgentRegistryDiagnostics, WorkforceHealth } from '../interfaces/agent.types.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

const VALID_ID = /^[a-z][a-z0-9_-]{0,63}$/;

export class AgentRegistry {
  private readonly agents = new Map<AgentId, IAgent>();
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;

  constructor(eventBus?: EventBus, logger?: ILogger) {
    this.eventBus = eventBus;
    this.logger = logger?.child('AgentRegistry');
  }

  public validate(agent: IAgent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!agent.id || !VALID_ID.test(agent.id)) errors.push(`Invalid agent ID: '${agent.id}' (must be lowercase alphanumeric/hyphen/underscore, starting with a letter)`);
    if (!agent.name) errors.push('Agent name is required');
    if (!agent.displayName) errors.push('Agent displayName is required');
    if (!agent.role) errors.push('Agent role is required');
    if (!agent.systemPrompt) errors.push('Agent systemPrompt is required');
    if (!Array.isArray(agent.capabilities) && !Array.isArray([...agent.capabilities])) errors.push('capabilities must be an array');
    if (!Array.isArray(agent.allowedTools) && !Array.isArray([...agent.allowedTools])) errors.push('allowedTools must be an array');
    if (agent.dangerTierLimit === undefined || agent.dangerTierLimit === null) errors.push('dangerTierLimit is required');
    return { valid: errors.length === 0, errors };
  }

  public register(agent: IAgent): void {
    const { valid, errors } = this.validate(agent);
    if (!valid) throw new Error(`Agent registration failed for '${agent.id}': ${errors.join(', ')}`);
    if (this.agents.has(agent.id)) throw new Error(`Agent '${agent.id}' is already registered. Duplicate agent IDs are not permitted.`);
    this.agents.set(agent.id, agent);
    this.logger?.info(`Registered agent: [${agent.displayName}] (Role: ${agent.role}, DangerLimit: TIER_${agent.dangerTierLimit})`);
    this.eventBus?.emit('agent.registered', { agentId: agent.id, role: agent.role });
  }

  public unregister(id: AgentId): boolean {
    const existed = this.agents.delete(id);
    if (existed) {
      this.logger?.info(`Unregistered agent: [${id}]`);
      this.eventBus?.emit('agent.unregistered', { agentId: id });
    }
    return existed;
  }

  public get(id: AgentId): IAgent | undefined {
    return this.agents.get(id);
  }

  public getOrThrow(id: AgentId): IAgent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent '${id}' not found in registry.`);
    return agent;
  }

  public getAll(): IAgent[] {
    return Array.from(this.agents.values());
  }

  public findByRole(role: string): IAgent[] {
    return this.getAll().filter(a => a.role.toLowerCase() === role.toLowerCase());
  }

  public findByCapability(capability: string): IAgent[] {
    return this.getAll().filter(a => a.capabilities.some(c => c.toLowerCase() === capability.toLowerCase()));
  }

  public findByLifecyclePosition(position: string): IAgent[] {
    return this.getAll().filter(a => a.lifecyclePosition?.toLowerCase().includes(position.toLowerCase()));
  }

  /**
   * Dynamically match the best specialist agent for a set of required capabilities.
   */
  public findBestSpecialist(requiredCapabilities: readonly string[], defaultAgentId?: string): IAgent | undefined {
    if (defaultAgentId && this.agents.has(defaultAgentId)) {
      return this.agents.get(defaultAgentId);
    }

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return this.getAll()[0];
    }

    let bestAgent: IAgent | undefined;
    let highestMatch = -1;

    for (const agent of this.getAll()) {
      const matchCount = requiredCapabilities.filter(c =>
        agent.capabilities.some(ac => ac.toLowerCase() === c.toLowerCase())
      ).length;

      if (matchCount > highestMatch) {
        highestMatch = matchCount;
        bestAgent = agent;
      }
    }

    return bestAgent || this.getAll()[0];
  }

  public updateStatus(id: AgentId, status: AgentStatus): void {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Cannot update status: Agent '${id}' not found.`);
    agent.status = status;
    agent.updatedAt = new Date().toISOString();
    this.eventBus?.emit('agent.status_changed', { agentId: id, status });
  }

  public getDiagnostics(): AgentRegistryDiagnostics {
    const all = this.getAll();
    const byStatus: Record<AgentStatus, number> = {
      idle: 0,
      working: 0,
      thinking: 0,
      executing: 0,
      waiting: 0,
      blocked: 0,
      awaiting_approval: 0,
      verifying: 0,
      recovering: 0,
      completed: 0,
      failed: 0,
      retired: 0,
      paused: 0
    };
    const byRole: Record<string, number> = {};

    let activeCount = 0;
    let idleCount = 0;
    let blockedCount = 0;
    let awaitingApprovalCount = 0;
    let failedCount = 0;
    let recoveringCount = 0;
    let retiredCount = 0;

    for (const a of all) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      byRole[a.role] = (byRole[a.role] || 0) + 1;

      if (a.status === 'working' || a.status === 'thinking' || a.status === 'executing' || a.status === 'verifying') {
        activeCount++;
      } else if (a.status === 'idle') {
        idleCount++;
      } else if (a.status === 'blocked') {
        blockedCount++;
      } else if (a.status === 'awaiting_approval') {
        awaitingApprovalCount++;
      } else if (a.status === 'failed') {
        failedCount++;
      } else if (a.status === 'recovering') {
        recoveringCount++;
      } else if (a.status === 'retired') {
        retiredCount++;
      }
    }

    const workforceHealth: WorkforceHealth = {
      total: all.length,
      active: activeCount,
      idle: idleCount,
      blocked: blockedCount,
      awaitingApproval: awaitingApprovalCount,
      failed: failedCount,
      recovering: recoveringCount,
      retired: retiredCount
    };

    return {
      totalRegistered: all.length,
      byStatus,
      byRole,
      registeredIds: all.map(a => a.id),
      workforceHealth
    };
  }
}

