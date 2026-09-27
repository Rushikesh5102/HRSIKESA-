/**
 * HṚṢĪKEŚA (हृषीकेश) — Working Memory Engine
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 *
 * Master orchestrator unifying conversation threads, deictic reference resolution,
 * explicit user corrections, project/task continuity, and checkpoint restoration.
 */

import { ThreadManagerService } from './thread-manager.service.js';
import { ReferenceResolverService } from './reference-resolver.service.js';
import { CorrectionDetectorService, CorrectionResult } from './correction-detector.service.js';
import { ContinuityTrackerService } from './continuity-tracker.service.js';
import { CheckpointManagerService } from './checkpoint-manager.service.js';
import { WorkingMemoryItemRepository } from '../repositories/working-memory-item.repository.js';
import { PendingItemRepository } from '../repositories/pending-item.repository.js';
import { ConversationThreadRepository } from '../repositories/conversation-thread.repository.js';
import { ConversationCheckpointRepository } from '../repositories/conversation-checkpoint.repository.js';
import {
  ConversationThread,
  ReferenceResolutionResult,
  WorkingMemoryConfig,
} from '../interfaces/working-memory.types.js';
import { ContextCandidate } from '../../context/interfaces/context.types.js';
import { ResourceGovernor } from '../../core/hardware/resource.governor.js';

export interface TurnProcessingResult {
  readonly activeThread?: ConversationThread;
  readonly activeProject?: string;
  readonly activeCompany?: string;
  readonly referenceResult?: ReferenceResolutionResult;
  readonly correctionResult?: CorrectionResult;
  readonly continuityContext: string;
}

export const DEFAULT_WORKING_MEMORY_CONFIG: WorkingMemoryConfig = {
  ttl: {
    temporaryAssumptionMs: 15 * 60 * 1000, // 15m
    activeTopicMs: 2 * 60 * 60 * 1000,     // 2h
    recentResultMs: 1 * 60 * 60 * 1000,    // 1h
    userIntentMs: 30 * 60 * 1000,          // 30m
    defaultItemMs: 4 * 60 * 60 * 1000,     // 4h
  },
  maxActiveThreads: 5,
  maxWorkingItemsPerSession: 50,
  enableAutoCheckpoint: true,
  autoCheckpointIntervalTurns: 10,
};

export class WorkingMemoryEngine {
  public readonly threadManager: ThreadManagerService;
  public readonly referenceResolver: ReferenceResolverService;
  public readonly correctionDetector: CorrectionDetectorService;
  public readonly continuityTracker: ContinuityTrackerService;
  public readonly checkpointManager: CheckpointManagerService;
  public readonly itemRepo: WorkingMemoryItemRepository;
  public readonly pendingRepo: PendingItemRepository;
  public readonly threadRepo: ConversationThreadRepository;
  public readonly checkpointRepo: ConversationCheckpointRepository;

  private readonly config: WorkingMemoryConfig;
  private readonly resourceGovernor?: ResourceGovernor;
  private turnCounters: Map<string, number> = new Map();

  constructor(
    threadRepo: ConversationThreadRepository,
    itemRepo: WorkingMemoryItemRepository,
    checkpointRepo: ConversationCheckpointRepository,
    pendingRepo: PendingItemRepository,
    resourceGovernor?: ResourceGovernor,
    config: Partial<WorkingMemoryConfig> = {}
  ) {
    this.threadRepo = threadRepo;
    this.itemRepo = itemRepo;
    this.checkpointRepo = checkpointRepo;
    this.pendingRepo = pendingRepo;
    this.resourceGovernor = resourceGovernor;
    this.config = { ...DEFAULT_WORKING_MEMORY_CONFIG, ...config };

    this.threadManager = new ThreadManagerService(this.threadRepo, this.config.maxActiveThreads);
    this.referenceResolver = new ReferenceResolverService();
    this.correctionDetector = new CorrectionDetectorService();
    this.continuityTracker = new ContinuityTrackerService(this.itemRepo, this.pendingRepo);
    this.checkpointManager = new CheckpointManagerService(this.checkpointRepo, this.threadRepo, this.itemRepo);
  }

  public getResourceLimits(): { maxThreads: number; maxItems: number } {
    if (this.resourceGovernor) {
      const metrics = this.resourceGovernor.getMetrics();
      if (metrics.pressureLevel === 'CRITICAL_MEMORY' || metrics.pressureLevel === 'LOW_MEMORY') {
        return { maxThreads: 2, maxItems: 15 };
      }
    }
    return { maxThreads: this.config.maxActiveThreads, maxItems: this.config.maxWorkingItemsPerSession };
  }

  /**
   * Main turn intake for non-fast-path requests.
   * Updates threads, detects corrections, resolves references, and maintains working items.
   */
  public async processIncomingTurn(
    userMessage: string,
    sessionId: string
  ): Promise<TurnProcessingResult> {
    const raw = userMessage.trim();

    // 1. Expiration cleanup
    this.itemRepo.expireOldItems();

    // 2. Fetch or select active thread
    let activeThread = this.threadManager.getActiveThread(sessionId);

    // If no active thread in this session, try to recover recent unfinished work from latest checkpoint/thread
    if (!activeThread) {
      const candidates = this.threadManager.rankCandidateThreads(sessionId, raw);
      if (candidates.length > 0 && candidates[0].score >= 0.40) {
        activeThread = this.threadManager.switchThread(sessionId, candidates[0].thread.id);
      } else {
        // Fallback check: check for a recent active checkpoint across sessions
        const recentCheckpoint = this.checkpointManager.getLatestCheckpointAcrossSessions();
        if (recentCheckpoint && (raw.toLowerCase() === 'continue' || raw.toLowerCase().startsWith('continue '))) {
          const restored = this.checkpointManager.restoreCheckpoint(recentCheckpoint.id, sessionId);
          if (restored.restoredThreadId) {
            activeThread = this.threadRepo.getById(restored.restoredThreadId);
          }
        }
      }
    }

    // 3. User Correction Detection (Highest priority)
    const correctionResult = this.correctionDetector.detectCorrection(raw);
    if (correctionResult.isCorrection) {
      if (correctionResult.correctionType === 'PROJECT' && correctionResult.correctedValue) {
        this.continuityTracker.setActiveProject(sessionId, activeThread?.id, correctionResult.correctedValue);
        if (activeThread) {
          this.threadRepo.update(activeThread.id, { targetProjectId: correctionResult.correctedValue });
          activeThread = this.threadRepo.getById(activeThread.id);
        }
      } else if (correctionResult.correctionType === 'ASSUMPTION') {
        this.itemRepo.supersedeType(sessionId, 'TEMPORARY_ASSUMPTION');
      } else if (correctionResult.correctedValue) {
        // Record user correction item
        this.itemRepo.createItem({
          sessionId,
          threadId: activeThread?.id,
          type: 'USER_CORRECTION',
          content: correctionResult.correctedValue,
          scope: 'SESSION',
          source: 'EXPLICIT',
          priority: 100,
        });
      }
    }

    // 4. Project and Company Continuity Detection
    const projectIntent = this.continuityTracker.detectProjectIntent(raw);
    if (projectIntent.targetProject) {
      this.continuityTracker.setActiveProject(sessionId, activeThread?.id, projectIntent.targetProject);
      if (activeThread) {
        this.threadRepo.update(activeThread.id, { targetProjectId: projectIntent.targetProject });
        activeThread = this.threadRepo.getById(activeThread.id);
      }
    }

    const companyIntent = this.continuityTracker.detectCompanyIntent(raw);
    if (companyIntent.targetCompany) {
      this.continuityTracker.setActiveCompany(sessionId, activeThread?.id, companyIntent.targetCompany);
      if (activeThread) {
        this.threadRepo.update(activeThread.id, { targetCompanyId: companyIntent.targetCompany });
        activeThread = this.threadRepo.getById(activeThread.id);
      }
    }

    // 5. If still no active thread, initialize one from this turn
    if (!activeThread) {
      const title = raw.length > 50 ? raw.slice(0, 47) + '...' : raw;
      activeThread = this.threadManager.createThread(sessionId, title, {
        targetProjectId: projectIntent.targetProject,
        targetCompanyId: companyIntent.targetCompany,
      });
    } else {
      this.threadManager.touchThread(activeThread.id);
    }

    // 6. Current state retrieval
    const continuityState = this.continuityTracker.getContinuityState(sessionId, activeThread);

    // 7. Reference Resolution
    const referenceResult = this.referenceResolver.resolveReferences(raw, {
      activeThread,
      activeProject: continuityState.activeProject,
      activeCompany: continuityState.activeCompany,
      activeGoal: continuityState.activeGoal,
      activeMission: continuityState.activeMission,
      activeTask: continuityState.activeTask,
      workingItems: continuityState.workingItems,
    });

    // 8. Record active topic / user intent
    if (!correctionResult.isCorrection && raw.length >= 8) {
      const expiresAt = new Date(Date.now() + this.config.ttl.activeTopicMs).toISOString();
      this.itemRepo.createItem({
        sessionId,
        threadId: activeThread.id,
        type: 'ACTIVE_TOPIC',
        content: raw.length > 120 ? raw.slice(0, 117) + '...' : raw,
        scope: continuityState.activeProject ? 'PROJECT' : 'SESSION',
        source: 'EXPLICIT',
        priority: 70,
        relatedProjectId: continuityState.activeProject,
        expiresAt,
      });
    }

    // 9. Turn counter for auto-checkpointing
    const turns = (this.turnCounters.get(sessionId) || 0) + 1;
    this.turnCounters.set(sessionId, turns);

    // 10. Generate continuity context string
    const continuityContext = this.assembleWorkingContext(sessionId, 1200, activeThread ?? undefined);

    return {
      activeThread,
      activeProject: continuityState.activeProject,
      activeCompany: continuityState.activeCompany,
      referenceResult,
      correctionResult,
      continuityContext,
    };
  }

  /**
   * Post-inference update: records results, completed tasks, or errors.
   */
  public async processOutgoingTurn(
    sessionId: string,
    assistantResponse: string,
    options?: {
      threadId?: string;
      isError?: boolean;
      newDecision?: string;
      newNextStep?: string;
    }
  ): Promise<void> {
    const thread = options?.threadId
      ? this.threadRepo.getById(options.threadId)
      : this.threadManager.getActiveThread(sessionId);

    if (options?.newDecision) {
      this.itemRepo.createItem({
        sessionId,
        threadId: thread?.id,
        type: 'RECENT_DECISION',
        content: options.newDecision,
        scope: thread?.targetProjectId ? 'PROJECT' : 'SESSION',
        source: 'SYSTEM',
        priority: 85,
        relatedProjectId: thread?.targetProjectId,
      });
    }

    if (options?.newNextStep) {
      this.continuityTracker.recordNextStep(sessionId, thread?.id, options.newNextStep, thread?.targetProjectId);
    }

    if (options?.isError) {
      this.continuityTracker.recordBlocker(sessionId, thread?.id, assistantResponse.slice(0, 200), thread?.targetProjectId);
    } else if (assistantResponse && assistantResponse.length >= 5) {
      this.itemRepo.createItem({
        sessionId,
        threadId: thread?.id,
        type: 'RECENT_RESULT',
        content: assistantResponse.length > 200 ? assistantResponse.slice(0, 197) + '...' : assistantResponse,
        scope: thread?.targetProjectId ? 'PROJECT' : 'SESSION',
        source: 'SYSTEM',
        priority: 70,
        relatedProjectId: thread?.targetProjectId,
      });
    }

    // Auto-checkpoint check
    const turns = this.turnCounters.get(sessionId) || 0;
    if (this.config.enableAutoCheckpoint && thread && turns % this.config.autoCheckpointIntervalTurns === 0) {
      const state = this.continuityTracker.getContinuityState(sessionId, thread);
      this.checkpointManager.createCheckpoint(sessionId, thread.id, `Auto-Checkpoint Turn ${turns}`, state);
    }
  }

  /**
   * Assembles a structured, compact working memory summary for prompt inclusion.
   */
  public assembleWorkingContext(sessionId: string, maxChars = 1200, overrideActiveThread?: ConversationThread): string {
    const activeThread = overrideActiveThread || this.threadManager.getActiveThread(sessionId);
    const state = this.continuityTracker.getContinuityState(sessionId, activeThread ?? undefined);

    const lines: string[] = ['### 🧠 Persistent Working Memory & Active Continuity:'];

    if (state.activeThread) {
      lines.push(`- **Active Thread:** ${state.activeThread.title} (Status: ${state.activeThread.status})`);
    }
    if (state.activeProject) {
      lines.push(`- **Active Project:** ${state.activeProject}`);
    }
    if (state.activeCompany) {
      lines.push(`- **Active Company:** ${state.activeCompany}`);
    }
    if (state.activeTask) {
      lines.push(`- **Current Task:** ${state.activeTask}`);
    }
    if (state.blockers.length > 0) {
      lines.push(`- **Active Blocker(s):** ${state.blockers.map((b) => b.content).join('; ')}`);
    }
    if (state.nextSteps.length > 0) {
      lines.push(`- **Next Recommended Step:** ${state.nextSteps[0].content}`);
    }
    if (state.userCorrections.length > 0) {
      lines.push(`- **User Clarification/Correction:** ${state.userCorrections[0].content}`);
    }
    if (state.recentDecisions.length > 0) {
      lines.push(`- **Recent Working Decision:** ${state.recentDecisions[0].content}`);
    }
    if (state.pendingItems.length > 0) {
      lines.push(`- **Pending Items:** ${state.pendingItems.map((p) => p.description).join('; ')}`);
    }

    // If nothing active, return empty
    if (lines.length === 1) {
      return '';
    }

    const text = lines.join('\n');
    return text.length > maxChars ? text.slice(0, maxChars - 3) + '...' : text;
  }

  /**
   * Generates ContextCandidate[] to feed directly into INT-007's CandidateCollector.
   */
  public getWorkingMemoryCandidates(sessionId: string): ContextCandidate[] {
    const activeItems = this.itemRepo.listActiveBySession(sessionId, 20);
    const candidates: ContextCandidate[] = [];

    for (const item of activeItems) {
      let priorityBonus = 0;
      const reasons: string[] = ['working_memory_item', `type_${item.type.toLowerCase()}`];

      if (item.type === 'USER_CORRECTION') {
        priorityBonus = 0.40;
        reasons.push('explicit_user_correction_priority');
      } else if (item.type === 'CURRENT_TASK' || item.type === 'BLOCKER') {
        priorityBonus = 0.35;
        reasons.push('active_task_blocker_priority');
      } else if (item.type === 'CURRENT_PROJECT' || item.type === 'CURRENT_COMPANY') {
        priorityBonus = 0.30;
        reasons.push('active_project_company_continuity');
      } else if (item.type === 'NEXT_STEP' || item.type === 'RECENT_DECISION') {
        priorityBonus = 0.25;
        reasons.push('working_continuity_progression');
      }

      const score = Number(Math.min(1.0, (item.priority / 100) + priorityBonus).toFixed(3));

      candidates.push({
        id: `wm_${item.id}`,
        sourceType: 'WORKING_MEMORY' as any,
        title: `Working Memory: ${item.type}`,
        content: item.content,
        scope: (item.scope as any) || 'SESSION',
        provenance: item.source === 'EXPLICIT' ? 'EXPLICIT' : 'SYSTEM',
        confidence: item.confidence,
        relevanceScore: score,
        rankingReasons: reasons,
        tokensEstimated: Math.ceil(item.content.length / 4),
        charsCount: item.content.length,
        temporal: {
          isCurrent: true,
          observedAt: item.lastReferencedAt,
        },
      });
    }

    return candidates;
  }
}
