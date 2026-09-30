/**
 * HṚṢĪKEŚA (हृषीकेश) — Workforce Planner
 *
 * FP-14: Computes multi-factor dynamic agent assignment scores across the canonical
 * workforce roster, ensuring specializations are preferred without becoming rigid silos.
 */

import {
  AgentAssignmentScore,
} from '../types/workforce.types.js';
import { MissionTask } from '../types/task.types.js';
import { MissionDescriptor } from '../types/mission.types.js';
import { WorkforceCapacityTracker, INITIAL_AGENT_IDS } from './workforce.capacity.tracker.js';
import { ILogger } from '../../core/logging/logger.types.js';

export class WorkforcePlanner {
  constructor(
    private readonly capacityTracker: WorkforceCapacityTracker,
    private readonly logger?: ILogger
  ) {
    if (this.logger) {
      this.logger.debug('WorkforcePlanner initialized');
    }
  }

  public rankAgentsForTask(params: {
    title: string;
    description?: string;
    requiredCapabilities?: string[];
  }): Array<{ agentName: string; score: number; availabilityState: string }> {
    const titleLower = params.title.toLowerCase();
    const descLower = (params.description || '').toLowerCase();
    const caps = params.requiredCapabilities || [];

    const results: Array<{ agentName: string; score: number; availabilityState: string }> = [];

    for (const agentId of INITIAL_AGENT_IDS) {
      const cap = this.capacityTracker.getCapacity(agentId);
      let score = 50;

      // Specialization matching across 33-agent domains
      if (caps.includes('CODE_GENERATION') || caps.includes('software_engineering') || titleLower.includes('code') || titleLower.includes('backend') || titleLower.includes('typescript') || titleLower.includes('software')) {
        if (agentId === 'manyu') score += 45;
        else if (agentId === 'bhava' || agentId === 'mahan' || agentId === 'manu') score += 20;
      }
      if (caps.includes('VERIFICATION') || caps.includes('testing') || titleLower.includes('verify') || titleLower.includes('qa') || titleLower.includes('test') || titleLower.includes('audit')) {
        if (agentId === 'ritadhvaja') score += 45;
        else if (agentId === 'siva') score += 30;
        else if (agentId === 'manyu' || agentId === 'varuna' || agentId === 'dhruva') score += 20;
      }
      if (caps.includes('RESEARCH') || caps.includes('market_research') || titleLower.includes('research') || titleLower.includes('market') || descLower.includes('competitor') || titleLower.includes('pricing')) {
        if (agentId === 'bhaga') score += 45;
        else if (agentId === 'tvasta' || agentId === 'dhata') score += 20;
      }
      if (titleLower.includes('strategy') || titleLower.includes('business') || titleLower.includes('plan')) {
        if (agentId === 'dhata') score += 45;
      }
      if (titleLower.includes('company') || titleLower.includes('team') || titleLower.includes('org')) {
        if (agentId === 'aryaman') score += 45;
      }
      if (titleLower.includes('deploy') || titleLower.includes('fulfillment') || titleLower.includes('release')) {
        if (agentId === 'pusa') score += 45;
      }
      if (titleLower.includes('ops') || titleLower.includes('infrastructure') || titleLower.includes('monitor') || titleLower.includes('sre')) {
        if (agentId === 'prabhasa') score += 45;
      }
      if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux') || titleLower.includes('product')) {
        if (agentId === 'tvasta' || agentId === 'savita') score += 45;
      }
      if (titleLower.includes('security') || titleLower.includes('vulnerability') || titleLower.includes('guard')) {
        if (agentId === 'ugrareta') score += 45;
      }
      if (titleLower.includes('recover') || titleLower.includes('restore') || titleLower.includes('rollback')) {
        if (agentId === 'vamadeva') score += 45;
      }
      if (titleLower.includes('retire') || titleLower.includes('decommission') || titleLower.includes('sunset')) {
        if (agentId === 'dhritavrata') score += 45;
      }
      if (titleLower.includes('command') || titleLower.includes('mission') || titleLower.includes('dispatch')) {
        if (agentId === 'indra') score += 45;
      }

      // Workload penalties
      if (cap.status === 'OVERLOADED') score -= 50;
      else if (cap.status === 'BUSY') score -= 15;

      results.push({
        agentName: cap.name,
        score: Math.max(0, Math.min(100, score)),
        availabilityState: cap.status
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  public scoreAndRankAgents(
    task: MissionTask,
    mission: MissionDescriptor
  ): AgentAssignmentScore[] {
    const scores: AgentAssignmentScore[] = [];

    for (const agentId of INITIAL_AGENT_IDS) {
      const cap = this.capacityTracker.getCapacity(agentId);
      const isPrimary = (task.assignedAgent || '').toLowerCase() === agentId;

      let specializationScore = 40;
      if (isPrimary) {
        specializationScore = 100;
      } else if (this.isRelatedSpecialty(agentId, task.executionKind, task.title)) {
        specializationScore = 75;
      }

      let availabilityScore = 100;
      if (cap.status === 'BUSY') availabilityScore = 60;
      if (cap.status === 'OVERLOADED') availabilityScore = 15;
      if (cap.status === 'OFFLINE' || cap.status === 'DEGRADED') availabilityScore = 0;

      const workloadPenalty = cap.currentWorkloadScore;
      const historicalFitScore = Math.round(cap.historicalSuccessRate * 100);

      let privacyFitScore = 100;
      if (mission.privacyLevel === 'SOVEREIGN_LOCAL' && (agentId === 'vivasvan' || agentId === 'parjanya')) {
        privacyFitScore = 70;
      }

      const environmentFitScore = 100;

      const compositeScore = Math.round(
        specializationScore * 0.45 +
        availabilityScore * 0.25 +
        historicalFitScore * 0.15 +
        ((privacyFitScore + environmentFitScore) / 2) * 0.15 -
        workloadPenalty * 0.2
      );

      scores.push({
        agentId,
        agentName: cap.name,
        specializationScore,
        availabilityScore,
        workloadPenalty,
        historicalFitScore,
        environmentFitScore,
        privacyFitScore,
        compositeScore: Math.max(0, Math.min(100, compositeScore)),
        rationale: isPrimary
          ? `Primary specialist designated for ${task.executionKind}`
          : `Secondary candidate fit ${compositeScore}% for ${task.title}`,
      });
    }

    scores.sort((a, b) => b.compositeScore - a.compositeScore);
    return scores;
  }

  private isRelatedSpecialty(agentId: string, kind?: string, title?: string): boolean {
    const lower = (title || '').toLowerCase();
    const k = (kind || '').toUpperCase();
    switch (agentId) {
      case 'manyu':
      case 'bhava':
        return k === 'ENGINEERING' || k === 'ENGINEERING_FIX' || lower.includes('code') || lower.includes('fix') || lower.includes('build');
      case 'ritadhvaja':
      case 'siva':
        return lower.includes('verify') || lower.includes('test') || lower.includes('qa') || lower.includes('audit');
      case 'pusa':
        return lower.includes('deploy') || lower.includes('release') || lower.includes('deliver');
      case 'bhaga':
        return lower.includes('research') || lower.includes('intel') || lower.includes('market');
      case 'prabhasa':
        return lower.includes('ops') || lower.includes('infrastructure') || lower.includes('monitor');
      case 'indra':
        return lower.includes('command') || lower.includes('orchestrate') || lower.includes('dispatch');
      case 'prajapati':
        return lower.includes('spawn') || lower.includes('evolve') || lower.includes('optimize');
      default:
        return false;
    }
  }
}
