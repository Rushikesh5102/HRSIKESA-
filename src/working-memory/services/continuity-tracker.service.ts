/**
 * HṚṢĪKEŚA (हृषीकेश) — Continuity Tracker Service
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 *
 * Tracks active project, company, goal, mission, task, blockers, and next steps across turns.
 */

import { WorkingMemoryItemRepository } from '../repositories/working-memory-item.repository.js';
import { PendingItemRepository } from '../repositories/pending-item.repository.js';
import {
  ContinuityState,
  WorkingMemoryItem,
  ConversationThread,
} from '../interfaces/working-memory.types.js';

export class ContinuityTrackerService {
  private readonly itemRepo: WorkingMemoryItemRepository;
  private readonly pendingRepo: PendingItemRepository;

  constructor(itemRepo: WorkingMemoryItemRepository, pendingRepo: PendingItemRepository) {
    this.itemRepo = itemRepo;
    this.pendingRepo = pendingRepo;
  }

  /**
   * Detects project references or switch directives in incoming message.
   */
  public detectProjectIntent(message: string): { targetProject?: string; isSwitch: boolean } {
    const raw = message.trim();
    const lower = raw.toLowerCase();

    // 1. Direct canonical project names first
    if (lower.includes('hrisekesa') || lower.includes('hṛṣīkeśa') || lower.includes('हृषीकेश')) {
      return { targetProject: 'HṚṢĪKEŚA', isSwitch: lower.includes('switch') || lower.includes('let') };
    }
    if (lower.includes('sahikara') || lower.includes('साहिकार')) {
      return { targetProject: 'SAHIKARA', isSwitch: lower.includes('switch') || lower.includes('let') };
    }

    // 2. Check explicit project switch or continuation directive with Unicode support
    const patterns = [
      /(?:let(?:'s|\s+us)\s+(?:work\s+on|continue)|switch\s+to|focus\s+on|project:?)\s+([\p{L}\p{N}_\-]+)/iu,
      /(?:for|in)\s+project\s+([\p{L}\p{N}_\-]+)/iu,
    ];

    for (const pat of patterns) {
      const match = raw.match(pat);
      if (match && match[1]) {
        const candidate = match[1].trim();
        // Ignore generic common words
        if (!['the', 'our', 'this', 'that', 'next', 'a', 'an'].includes(candidate.toLowerCase())) {
          return { targetProject: candidate, isSwitch: true };
        }
      }
    }

    return { isSwitch: false };
  }

  /**
   * Detects company references or switch directives in incoming message.
   */
  public detectCompanyIntent(message: string): { targetCompany?: string; isSwitch: boolean } {
    const raw = message.trim();
    const lower = raw.toLowerCase();

    // 1. Known canonical companies first
    if (lower.includes('aumtrix')) return { targetCompany: 'Aumtrix', isSwitch: lower.includes('switch') || lower.includes('let') };
    if (lower.includes('pragnya')) return { targetCompany: 'Pragnya', isSwitch: lower.includes('switch') || lower.includes('let') };
    if (lower.includes('svara')) return { targetCompany: 'Svara', isSwitch: lower.includes('switch') || lower.includes('let') };

    // 2. Generic patterns
    const patterns = [
      /(?:company|org|enterprise):?\s+([A-Za-z0-9_\-]+)/i,
      /(?:let(?:'s|\s+us)\s+(?:work\s+on|switch\s+to)|for)\s+company\s+([A-Za-z0-9_\-]+)/i,
    ];

    for (const pat of patterns) {
      const match = raw.match(pat);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (!['workspace', 'the', 'our', 'this', 'that', 'next'].includes(candidate.toLowerCase())) {
          return { targetCompany: candidate, isSwitch: true };
        }
      }
    }

    return { isSwitch: false };
  }

  /**
   * Assembles the complete active continuity state for a session.
   */
  public getContinuityState(sessionId: string, activeThread?: ConversationThread): ContinuityState {
    const activeItems = this.itemRepo.listActiveBySession(sessionId, 50);
    const pendingItems = this.pendingRepo.listOpenBySession(sessionId, 20);

    let activeProject: string | undefined;
    let activeCompany: string | undefined;
    let activeGoal: string | undefined;
    let activeMission: string | undefined;
    let activeTask: string | undefined;

    const blockers: WorkingMemoryItem[] = [];
    const nextSteps: WorkingMemoryItem[] = [];
    const recentDecisions: WorkingMemoryItem[] = [];
    const userCorrections: WorkingMemoryItem[] = [];
    const assumptions: WorkingMemoryItem[] = [];
    const recentResults: WorkingMemoryItem[] = [];

    // Prioritize active thread metadata if present
    if (activeThread?.targetProjectId) activeProject = activeThread.targetProjectId;
    if (activeThread?.targetCompanyId) activeCompany = activeThread.targetCompanyId;
    if (activeThread?.targetGoalId) activeGoal = activeThread.targetGoalId;
    if (activeThread?.targetMissionId) activeMission = activeThread.targetMissionId;
    if (activeThread?.activeTaskId) activeTask = activeThread.activeTaskId;

    for (const item of activeItems) {
      if (item.type === 'CURRENT_PROJECT' && !activeProject) {
        activeProject = item.content;
      } else if (item.type === 'CURRENT_COMPANY' && !activeCompany) {
        activeCompany = item.content;
      } else if (item.type === 'CURRENT_GOAL' && !activeGoal) {
        activeGoal = item.content;
      } else if (item.type === 'CURRENT_MISSION' && !activeMission) {
        activeMission = item.content;
      } else if (item.type === 'CURRENT_TASK' && !activeTask) {
        activeTask = item.content;
      } else if (item.type === 'BLOCKER' || item.type === 'ERROR_STATE') {
        blockers.push(item);
      } else if (item.type === 'NEXT_STEP') {
        nextSteps.push(item);
      } else if (item.type === 'RECENT_DECISION') {
        recentDecisions.push(item);
      } else if (item.type === 'USER_CORRECTION') {
        userCorrections.push(item);
      } else if (item.type === 'TEMPORARY_ASSUMPTION') {
        assumptions.push(item);
      } else if (item.type === 'RECENT_RESULT') {
        recentResults.push(item);
      }
    }

    return {
      activeThread,
      activeProject,
      activeCompany,
      activeGoal,
      activeMission,
      activeTask,
      workingItems: activeItems,
      pendingItems,
      blockers,
      nextSteps,
      recentDecisions,
      userCorrections,
      assumptions,
      recentResults,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Sets or switches the active project for a session.
   */
  public setActiveProject(sessionId: string, threadId: string | undefined, project: string): WorkingMemoryItem {
    // Supersede previous active project in this session to prevent bleed
    this.itemRepo.supersedeType(sessionId, 'CURRENT_PROJECT');

    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'CURRENT_PROJECT',
      content: project,
      scope: 'PROJECT',
      source: 'EXPLICIT',
      priority: 95,
      relatedProjectId: project,
    });
  }

  /**
   * Sets or switches the active company for a session.
   */
  public setActiveCompany(sessionId: string, threadId: string | undefined, company: string): WorkingMemoryItem {
    this.itemRepo.supersedeType(sessionId, 'CURRENT_COMPANY');

    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'CURRENT_COMPANY',
      content: company,
      scope: 'COMPANY',
      source: 'EXPLICIT',
      priority: 90,
      relatedCompanyId: company,
    });
  }

  /**
   * Sets the active task.
   */
  public setActiveTask(
    sessionId: string,
    threadId: string | undefined,
    task: string,
    projectId?: string
  ): WorkingMemoryItem {
    this.itemRepo.supersedeType(sessionId, 'CURRENT_TASK');

    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'CURRENT_TASK',
      content: task,
      scope: projectId ? 'PROJECT' : 'SESSION',
      source: 'SYSTEM',
      priority: 90,
      relatedProjectId: projectId,
    });
  }

  /**
   * Records an active blocker or error.
   */
  public recordBlocker(
    sessionId: string,
    threadId: string | undefined,
    blockerText: string,
    projectId?: string
  ): WorkingMemoryItem {
    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'BLOCKER',
      content: blockerText,
      scope: projectId ? 'PROJECT' : 'SESSION',
      source: 'SYSTEM',
      priority: 95,
      relatedProjectId: projectId,
    });
  }

  /**
   * Resolves existing blockers for a session.
   */
  public resolveBlockers(sessionId: string): void {
    const blockers = this.itemRepo.listActiveByType(sessionId, 'BLOCKER');
    for (const b of blockers) {
      this.itemRepo.updateStatus(b.id, 'RESOLVED');
    }
  }

  /**
   * Records next recommended step.
   */
  public recordNextStep(
    sessionId: string,
    threadId: string | undefined,
    stepText: string,
    projectId?: string
  ): WorkingMemoryItem {
    this.itemRepo.supersedeType(sessionId, 'NEXT_STEP');

    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'NEXT_STEP',
      content: stepText,
      scope: projectId ? 'PROJECT' : 'SESSION',
      source: 'SYSTEM',
      priority: 85,
      relatedProjectId: projectId,
    });
  }

  public setNextStep(sessionId: string, threadId: string | undefined, stepText: string, projectId?: string): WorkingMemoryItem {
    return this.recordNextStep(sessionId, threadId, stepText, projectId);
  }

  public setActiveBlocker(sessionId: string, threadId: string | undefined, blockerText: string, projectId?: string): WorkingMemoryItem {
    return this.recordBlocker(sessionId, threadId, blockerText, projectId);
  }

  public clearBlockers(sessionId: string): void {
    this.resolveBlockers(sessionId);
  }

  public setActiveGoal(sessionId: string, threadId: string | undefined, goalText: string): WorkingMemoryItem {
    this.itemRepo.supersedeType(sessionId, 'CURRENT_GOAL');
    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'CURRENT_GOAL',
      content: goalText,
      scope: 'SESSION',
      source: 'SYSTEM',
      priority: 85,
    });
  }

  public setActiveMission(sessionId: string, threadId: string | undefined, missionText: string): WorkingMemoryItem {
    this.itemRepo.supersedeType(sessionId, 'CURRENT_MISSION');
    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'CURRENT_MISSION',
      content: missionText,
      scope: 'SESSION',
      source: 'SYSTEM',
      priority: 85,
    });
  }

  public setRecentDecision(sessionId: string, threadId: string | undefined, decisionText: string): WorkingMemoryItem {
    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'RECENT_DECISION',
      content: decisionText,
      scope: 'SESSION',
      source: 'EXPLICIT',
      priority: 85,
    });
  }

  public setTemporaryAssumption(sessionId: string, threadId: string | undefined, assumptionText: string): WorkingMemoryItem {
    return this.itemRepo.createItem({
      sessionId,
      threadId,
      type: 'TEMPORARY_ASSUMPTION',
      content: assumptionText,
      scope: 'SESSION',
      source: 'SYSTEM',
      priority: 60,
    });
  }

  public completeActiveTask(sessionId: string, resultSummary: string): void {
    const tasks = this.itemRepo.listActiveByType(sessionId, 'CURRENT_TASK');
    for (const t of tasks) {
      this.itemRepo.updateStatus(t.id, 'RESOLVED');
    }
    this.itemRepo.createItem({
      sessionId,
      type: 'RECENT_RESULT',
      content: resultSummary,
      scope: 'SESSION',
      source: 'SYSTEM',
      priority: 75,
    });
  }
}

