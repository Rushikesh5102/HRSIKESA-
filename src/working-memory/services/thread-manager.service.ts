/**
 * HṚṢĪKEŚA (हृषीकेश) — Thread Manager Service
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 *
 * Manages active conversation threads, thread switching, and bounded multi-factor ranking.
 */

import { ConversationThreadRepository } from '../repositories/conversation-thread.repository.js';
import { ConversationThread, ThreadStatus } from '../interfaces/working-memory.types.js';

export interface ThreadRankingCandidate {
  readonly thread: ConversationThread;
  readonly score: number;
  readonly reasons: string[];
}

export class ThreadManagerService {
  private readonly threadRepo: ConversationThreadRepository;
  private readonly maxActiveThreads: number;

  constructor(threadRepo: ConversationThreadRepository, maxActiveThreads = 5) {
    this.threadRepo = threadRepo;
    this.maxActiveThreads = maxActiveThreads;
  }

  public getMaxActiveThreads(): number {
    return this.maxActiveThreads;
  }

  public getActiveThread(sessionId: string): ConversationThread | null {
    return this.threadRepo.getActiveThreadForSession(sessionId);
  }

  public getThreadById(id: string): ConversationThread | null {
    return this.threadRepo.getById(id);
  }

  public listThreadsForSession(sessionId: string, status?: ThreadStatus): ConversationThread[] {
    return this.threadRepo.listBySession(sessionId, status);
  }

  public createThread(
    sessionId: string,
    title: string,
    options?: {
      targetProjectId?: string;
      targetCompanyId?: string;
      targetGoalId?: string;
      targetMissionId?: string;
      activeTaskId?: string;
      priority?: number;
      summary?: string;
      metadata?: Record<string, unknown>;
    }
  ): ConversationThread {
    // If there is currently an active thread in this session, pause it
    const active = this.getActiveThread(sessionId);
    if (active) {
      this.threadRepo.update(active.id, { status: 'PAUSED' });
    }

    return this.threadRepo.createThread({
      sessionId,
      title,
      status: 'ACTIVE',
      targetProjectId: options?.targetProjectId,
      targetCompanyId: options?.targetCompanyId,
      targetGoalId: options?.targetGoalId,
      targetMissionId: options?.targetMissionId,
      activeTaskId: options?.activeTaskId,
      priority: options?.priority ?? 50,
      summary: options?.summary,
      metadata: options?.metadata,
    });
  }

  public switchThread(sessionId: string, targetThreadId: string): ConversationThread | null {
    const target = this.threadRepo.getById(targetThreadId);
    if (!target) return null;

    // Pause any other active thread for this session
    const currentActive = this.getActiveThread(sessionId);
    if (currentActive && currentActive.id !== targetThreadId) {
      this.threadRepo.update(currentActive.id, { status: 'PAUSED' });
    }

    return this.threadRepo.update(targetThreadId, {
      status: 'ACTIVE',
      lastActiveAt: new Date().toISOString(),
    });
  }

  public updateThreadStatus(id: string, status: ThreadStatus, summary?: string): ConversationThread | null {
    return this.threadRepo.update(id, { status, summary });
  }

  public touchThread(id: string): void {
    this.threadRepo.touch(id);
  }

  /**
   * Evaluates candidate threads against a user query and returns scored rankings.
   * Explicit references ("continue INT-008", "work on HṚṢĪKEŚA") strictly dominate weak similarity.
   */
  public rankCandidateThreads(
    sessionId: string,
    userQuery: string,
    activeProjectId?: string
  ): ThreadRankingCandidate[] {
    const query = userQuery.toLowerCase().trim();
    const threads = this.threadRepo.listBySession(sessionId);

    // If session has no threads, check recent threads across sessions for restart recovery
    const candidatePool = threads.length > 0
      ? threads
      : this.threadRepo.getLatestThreadAcrossSessions(5);

    if (candidatePool.length === 0) return [];

    const now = Date.now();
    const ranked: ThreadRankingCandidate[] = candidatePool.map((thread) => {
      let score = 0.20;
      const reasons: string[] = [];

      const titleLower = thread.title.toLowerCase();
      const projectLower = (thread.targetProjectId || '').toLowerCase();

      // Check continuation requests
      const isContinuation =
        query === 'continue' ||
        query.startsWith('continue ') ||
        query.includes('continue from') ||
        query.includes('resume') ||
        query.includes('pick up where we left off');

      // 1. Explicit reference in user query (Dominant)
      let hasExplicitMatch = false;
      if (titleLower.length >= 3 && query.includes(titleLower)) {
        score += 0.50;
        reasons.push(`explicit_title_match:${thread.title}`);
        hasExplicitMatch = true;
      }

      // Check tokens of title
      const titleTokens = titleLower.split(/[\s\-_]+/).filter((t) => t.length >= 3);
      let tokenMatches = 0;
      for (const t of titleTokens) {
        if (query.includes(t)) {
          tokenMatches++;
        }
      }
      if (tokenMatches > 0) {
        score += Math.min(0.30, tokenMatches * 0.15);
        reasons.push(`title_token_matches:${tokenMatches}`);
        hasExplicitMatch = true;
      }

      // 2. Project overlap
      if (activeProjectId && thread.targetProjectId === activeProjectId) {
        score += 0.25;
        reasons.push(`project_overlap:${thread.targetProjectId}`);
        hasExplicitMatch = true;
      } else if (projectLower && query.includes(projectLower)) {
        score += 0.35;
        reasons.push(`explicit_project_mention:${thread.targetProjectId}`);
        hasExplicitMatch = true;
      }

      // Cross-session candidate isolation: do not bleed foreign threads unless explicit match or continuation
      const isCrossSession = thread.sessionId !== sessionId;
      if (isCrossSession && !hasExplicitMatch && !isContinuation) {
        return {
          thread,
          score: 0.05,
          reasons: ['cross_session_no_relevance_match'],
        };
      }

      // 3. Status priority (ACTIVE > RESUMABLE > PAUSED > BLOCKED > COMPLETED)
      if (thread.status === 'ACTIVE') {
        score += 0.25;
        reasons.push('status_active');
      } else if (thread.status === 'RESUMABLE') {
        score += 0.20;
        reasons.push('status_resumable');
      } else if (thread.status === 'PAUSED') {
        score += 0.15;
        reasons.push('status_paused');
      } else if (thread.status === 'BLOCKED') {
        score += 0.10;
        reasons.push('status_blocked');
      } else if (thread.status === 'COMPLETED') {
        score -= 0.15;
        reasons.push('status_completed_demoted');
      }

      // 4. Recency factor (decay over 24 hours)
      const lastActiveMs = new Date(thread.lastActiveAt).getTime();
      const ageHours = Math.max(0, (now - lastActiveMs) / (1000 * 60 * 60));
      const recencyBoost = Math.max(0, 0.20 - ageHours * 0.01);
      score += recencyBoost;
      reasons.push(`recency_factor:${recencyBoost.toFixed(2)}`);

      // 5. Continuation boost
      if (isContinuation && (thread.status === 'ACTIVE' || thread.status === 'RESUMABLE' || thread.status === 'PAUSED')) {
        score += 0.30;
        reasons.push('continuation_boost');
      }

      const finalScore = Number(Math.max(0.01, Math.min(1.0, score)).toFixed(3));
      return {
        thread,
        score: finalScore,
        reasons,
      };
    });

    return ranked.sort((a, b) => b.score - a.score);
  }
}
