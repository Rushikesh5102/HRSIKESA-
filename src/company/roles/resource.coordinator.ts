/**
 * HṚṢĪKEŚA (हृषीकेश) — Resource Coordinator (KĀLA's Functional Domain)
 *
 * Coordinates project priorities, mission scheduling, workload allocation,
 * and execution windows across persistent companies and projects.
 *
 * Invariant: KĀLA coordinates scheduling but cannot override security, HITL, or permissions.
 */

import { IProject, ProjectPriority } from '../interfaces/company.types.js';
import { IMission } from '../../agents/interfaces/mission.types.js';

export interface WorkloadAllocation {
  agentId: string;
  activeMissionsCount: number;
  assignedProjects: string[];
  capacityScore: number; // 0 (saturated) to 1.0 (free)
}

export class ResourceCoordinator {
  private static readonly PRIORITY_WEIGHTS: Record<ProjectPriority, number> = {
    urgent: 100,
    high: 75,
    normal: 50,
    low: 25
  };

  /**
   * Sorts projects by scheduling priority based on priority rank and update freshness.
   */
  public static prioritizeProjects(projects: IProject[]): IProject[] {
    return [...projects].sort((a, b) => {
      const weightA = this.PRIORITY_WEIGHTS[a.priority] || 50;
      const weightB = this.PRIORITY_WEIGHTS[b.priority] || 50;
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  /**
   * Prioritizes missions within a company or project context.
   */
  public static prioritizeMissions(missions: IMission[], projectsById: Map<string, IProject>): IMission[] {
    return [...missions].sort((a, b) => {
      const projA = a.projectId ? projectsById.get(a.projectId) : undefined;
      const projB = b.projectId ? projectsById.get(b.projectId) : undefined;

      const prioA = projA ? this.PRIORITY_WEIGHTS[projA.priority] : 50;
      const prioB = projB ? this.PRIORITY_WEIGHTS[projB.priority] : 50;

      if (prioB !== prioA) {
        return prioB - prioA;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Evaluates workforce capacity for a set of agents given active missions.
   */
  public static calculateWorkloadAllocations(
    agentIds: string[],
    activeMissions: IMission[]
  ): WorkloadAllocation[] {
    const counts = new Map<string, { count: number; projectIds: Set<string> }>();
    for (const id of agentIds) {
      counts.set(id, { count: 0, projectIds: new Set() });
    }

    for (const m of activeMissions) {
      const entry = counts.get(m.rootAgentId);
      if (entry) {
        entry.count += 1;
        if (m.projectId) {
          entry.projectIds.add(m.projectId);
        }
      }
    }

    return agentIds.map((id) => {
      const entry = counts.get(id) || { count: 0, projectIds: new Set() };
      // Max nominal concurrency per agent is 3 before saturation
      const capacityScore = Math.max(0, (3 - entry.count) / 3);
      return {
        agentId: id,
        activeMissionsCount: entry.count,
        assignedProjects: Array.from(entry.projectIds),
        capacityScore
      };
    });
  }
}
