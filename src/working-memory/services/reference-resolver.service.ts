/**
 * HṚṢĪKEŚA (हृषीकेश) — Reference Resolver Service
 *
 * Track A / INT-008: Persistent Working Memory & Conversational Continuity Engine
 *
 * Resolves conversational references ("it", "this", "that", "the previous one",
 * "continue", "fix it", "do that", "same thing", "that project", "the current task")
 * against active working memory, recent context, and detects ambiguity.
 */

import {
  ReferenceResolutionResult,
  WorkingMemoryItem,
  ConversationThread,
} from '../interfaces/working-memory.types.js';

export interface ReferenceContext {
  readonly activeThread?: ConversationThread;
  readonly activeProject?: string;
  readonly activeCompany?: string;
  readonly activeGoal?: string;
  readonly activeMission?: string;
  readonly activeTask?: string;
  readonly workingItems: WorkingMemoryItem[];
  readonly recentUserMessages?: string[];
  readonly recentAssistantMessages?: string[];
}

export class ReferenceResolverService {
  /**
   * Evaluates a user prompt to determine if it contains anaphoric/deictic references
   * and attempts to resolve them unambiguously.
   */
  public resolveReference(
    userMessage: string,
    context: ReferenceContext
  ): ReferenceResolutionResult {
    return this.resolveReferences(userMessage, context);
  }

  public resolveReferences(
    userMessage: string,
    context: ReferenceContext
  ): ReferenceResolutionResult {
    const raw = userMessage.trim();
    const lower = raw.toLowerCase();

    // Check for continuation triggers
    const isContinuation =
      lower === 'continue' ||
      lower.startsWith('continue ') ||
      lower === 'continue from there' ||
      lower === 'carry on' ||
      lower === 'resume' ||
      lower.includes('pick up where we left off');

    if (isContinuation) {
      if (context.activeTask) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: context.activeTask,
            targetType: 'TASK',
            confidence: 0.95,
            isAmbiguous: false,
            candidateMatches: [context.activeTask],
            explanation: `Resolved continuation request to active task: "${context.activeTask}"`,
          },
        };
      }
      if (context.activeThread) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: context.activeThread.title,
            targetType: 'THREAD',
            targetId: context.activeThread.id,
            confidence: 0.90,
            isAmbiguous: false,
            candidateMatches: [context.activeThread.title],
            explanation: `Resolved continuation request to active thread: "${context.activeThread.title}"`,
          },
        };
      }
      if (context.activeProject) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: context.activeProject,
            targetType: 'PROJECT',
            confidence: 0.85,
            isAmbiguous: false,
            candidateMatches: [context.activeProject],
            explanation: `Resolved continuation request to active project: "${context.activeProject}"`,
          },
        };
      }
    }

    // Check for "fix it" / "now fix it" / "fix that" / "fix the error"
    const isFixRequest =
      lower === 'fix it' ||
      lower === 'now fix it' ||
      lower === 'fix that' ||
      lower.includes('fix the error') ||
      lower.includes('resolve this') ||
      lower.includes('solve it');

    if (isFixRequest) {
      const errorOrBlocker = context.workingItems.find(
        (item) => item.status === 'ACTIVE' && (item.type === 'ERROR_STATE' || item.type === 'BLOCKER')
      );
      if (errorOrBlocker) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: errorOrBlocker.content,
            targetType: 'ERROR',
            targetId: errorOrBlocker.id,
            confidence: 0.95,
            isAmbiguous: false,
            candidateMatches: [errorOrBlocker.content],
            explanation: `Resolved fix request to active error/blocker: "${errorOrBlocker.content}"`,
          },
        };
      }
      if (context.activeTask) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: context.activeTask,
            targetType: 'TASK',
            confidence: 0.85,
            isAmbiguous: false,
            candidateMatches: [context.activeTask],
            explanation: `Resolved fix request to active task: "${context.activeTask}"`,
          },
        };
      }
    }

    // Check for "that project" / "the project"
    if (lower.includes('that project') || lower.includes('the current project')) {
      if (context.activeProject) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: context.activeProject,
            targetType: 'PROJECT',
            confidence: 0.95,
            isAmbiguous: false,
            candidateMatches: [context.activeProject],
            explanation: `Resolved project reference to active project: "${context.activeProject}"`,
          },
        };
      }
    }

    // Check for "the current task" / "the task" / "that task"
    if (lower.includes('the current task') || lower.includes('that task') || lower.includes('the task')) {
      if (context.activeTask) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: context.activeTask,
            targetType: 'TASK',
            confidence: 0.95,
            isAmbiguous: false,
            candidateMatches: [context.activeTask],
            explanation: `Resolved task reference to active task: "${context.activeTask}"`,
          },
        };
      }
    }

    // Check for "the previous one" / "the earlier version" / "the last one"
    if (lower.includes('the previous one') || lower.includes('the earlier version') || lower.includes('the last one')) {
      const supersededItems = context.workingItems.filter((i) => i.status === 'SUPERSEDED');
      if (supersededItems.length === 1) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: supersededItems[0].content,
            targetType: 'GENERAL',
            confidence: 0.85,
            isAmbiguous: false,
            candidateMatches: [supersededItems[0].content],
            explanation: `Resolved reference to earlier superseded state: "${supersededItems[0].content}"`,
          },
        };
      } else if (supersededItems.length > 1) {
        return {
          resolved: false,
          ambiguity: {
            isAmbiguous: true,
            message: 'Multiple previous candidates exist for "the previous one".',
            candidates: supersededItems.map((i) => i.content),
          },
        };
      } else if (context.workingItems.length > 0) {
        const item = context.workingItems[0];
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: item.content,
            targetType: 'GENERAL',
            confidence: 0.85,
            isAmbiguous: false,
            candidateMatches: [item.content],
            explanation: `Resolved reference to preceding item: "${item.content}"`,
          },
        };
      }
    }

    // Check for general pronouns: "it", "this", "that"
    const hasPronoun =
      /\b(it|this|that|do that|same thing|the above)\b/i.test(lower);

    if (hasPronoun) {
      // Find candidate targets from active working items
      const candidates: { concept: string; type: any; id?: string; weight: number }[] = [];

      // If there is an active error/blocker and message contains action verb
      const blocker = context.workingItems.find(
        (i) => i.status === 'ACTIVE' && (i.type === 'ERROR_STATE' || i.type === 'BLOCKER')
      );
      if (blocker) {
        candidates.push({ concept: blocker.content, type: 'ERROR', id: blocker.id, weight: 0.90 });
      }

      // If there are task items in working items
      const taskItems = context.workingItems.filter(
        (i) => i.status === 'ACTIVE' && i.type === 'CURRENT_TASK'
      );
      if (taskItems.length > 0) {
        for (const t of taskItems) {
          candidates.push({ concept: t.content, type: 'TASK', id: t.id, weight: 0.85 });
        }
      } else if (context.activeTask) {
        candidates.push({ concept: context.activeTask, type: 'TASK', weight: 0.85 });
      }

      // If there is a recent result (concrete outcome)
      const recentResult = context.workingItems.find(
        (i) => i.status === 'ACTIVE' && i.type === 'RECENT_RESULT'
      );
      if (recentResult) {
        const resultWeight = /\b(that|verify|check|result|output)\b/i.test(lower) ? 0.90 : 0.80;
        candidates.push({ concept: recentResult.content, type: 'GENERAL', id: recentResult.id, weight: resultWeight });
      }

      // If there is a recent decision
      const decision = context.workingItems.find(
        (i) => i.status === 'ACTIVE' && i.type === 'RECENT_DECISION'
      );
      if (decision) {
        candidates.push({ concept: decision.content, type: 'DECISION', id: decision.id, weight: 0.80 });
      }

      // If there is an active topic (conversational fallback)
      const activeTopic = context.workingItems.find(
        (i) => i.status === 'ACTIVE' && i.type === 'ACTIVE_TOPIC'
      );
      if (activeTopic) {
        candidates.push({ concept: activeTopic.content, type: 'GENERAL', id: activeTopic.id, weight: 0.70 });
      }

      // If candidates exist
      if (candidates.length === 1) {
        return {
          resolved: true,
          reference: {
            rawText: raw,
            resolvedEntityOrConcept: candidates[0].concept,
            targetType: candidates[0].type,
            targetId: candidates[0].id,
            confidence: candidates[0].weight,
            isAmbiguous: false,
            candidateMatches: [candidates[0].concept],
            explanation: `Resolved reference to candidate: "${candidates[0].concept}"`,
          },
        };
      } else if (candidates.length > 1) {
        // Check if top candidate has clear dominance
        const sorted = candidates.sort((a, b) => b.weight - a.weight);
        if (sorted[0].weight - sorted[1].weight >= 0.15) {
          return {
            resolved: true,
            reference: {
              rawText: raw,
              resolvedEntityOrConcept: sorted[0].concept,
              targetType: sorted[0].type,
              targetId: sorted[0].id,
              confidence: sorted[0].weight,
              isAmbiguous: false,
              candidateMatches: sorted.map((c) => c.concept),
              explanation: `Resolved dominant reference candidate: "${sorted[0].concept}"`,
            },
          };
        } else {
          // Ambiguous
          return {
            resolved: false,
            ambiguity: {
              isAmbiguous: true,
              message: 'Multiple competing candidates found with similar confidence.',
              candidates: sorted.map((c) => c.concept),
            },
          };
        }
      }
    }

    return { resolved: false };
  }
}
