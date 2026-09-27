import { createHash } from 'node:crypto';
import { MissionTask, PlanVersion } from '../types/index.js';

export interface LoopProtectionLimits {
  maxTaskRetries: number;
  maxPlanRevisions: number;
  maxDelegationDepth: number;
  maxConsecutiveFailures: number;
  maxStateRepetitions: number;
}

export class LoopProtectionEngine {
  private readonly limits: LoopProtectionLimits;
  private stateFingerprintHistory: Map<string, string[]> = new Map(); // missionId -> hashes
  private consecutiveFailures: Map<string, number> = new Map(); // missionId -> count

  constructor(limits?: Partial<LoopProtectionLimits>) {
    this.limits = {
      maxTaskRetries: limits?.maxTaskRetries ?? 3,
      maxPlanRevisions: limits?.maxPlanRevisions ?? 5,
      maxDelegationDepth: limits?.maxDelegationDepth ?? 3,
      maxConsecutiveFailures: limits?.maxConsecutiveFailures ?? 4,
      maxStateRepetitions: limits?.maxStateRepetitions ?? 3
    };
  }

  /**
   * Generates a deterministic SHA-256 fingerprint for the current mission execution state
   */
  public generateStateFingerprint(
    missionId: string,
    tasks: MissionTask[],
    activeBlockers: string[]
  ): string {
    const taskSummaries = tasks.map(t => `${t.taskId}:${t.status}:${t.retryCount}:${t.assignedAgent}`).sort().join('|');
    const blockerSummary = activeBlockers.sort().join('|');
    const raw = `${missionId}|tasks=${taskSummaries}|blockers=${blockerSummary}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Check if mission execution is cycling or entering an infinite loop
   */
  public checkLoopDetection(
    missionId: string,
    tasks: MissionTask[],
    activeBlockers: string[] = []
  ): { isLoopDetected: boolean; reason?: string } {
    const fingerprint = this.generateStateFingerprint(missionId, tasks, activeBlockers);
    const history = this.stateFingerprintHistory.get(missionId) || [];

    const repetitions = history.filter(h => h === fingerprint).length;
    history.push(fingerprint);
    this.stateFingerprintHistory.set(missionId, history);

    if (repetitions >= this.limits.maxStateRepetitions) {
      return {
        isLoopDetected: true,
        reason: `Mission entered repeated execution state cycle (${repetitions + 1} occurrences with identical tasks/blockers fingerprint). Halting to prevent infinite loop.`
      };
    }

    return { isLoopDetected: false };
  }

  /**
   * Check if replan limit exceeded
   */
  public checkReplanLimit(planVersions: PlanVersion[]): { allowed: boolean; reason?: string } {
    if (planVersions.length >= this.limits.maxPlanRevisions) {
      return {
        allowed: false,
        reason: `Max plan revisions (${this.limits.maxPlanRevisions}) reached. Manual human intervention required to proceed.`
      };
    }
    return { allowed: true };
  }

  /**
   * Record task failure and check consecutive failure bounds
   */
  public recordFailure(missionId: string): { limitExceeded: boolean; failures: number } {
    const current = (this.consecutiveFailures.get(missionId) || 0) + 1;
    this.consecutiveFailures.set(missionId, current);

    return {
      limitExceeded: current >= this.limits.maxConsecutiveFailures,
      failures: current
    };
  }

  /**
   * Reset consecutive failure counter on task success
   */
  public recordSuccess(missionId: string): void {
    this.consecutiveFailures.set(missionId, 0);
  }

  /**
   * Check if task retries have been exhausted
   */
  public isTaskRetryAllowed(task: MissionTask): boolean {
    const max = task.maxRetries ?? this.limits.maxTaskRetries;
    return task.retryCount < max;
  }

  public clearHistory(missionId?: string): void {
    if (missionId) {
      this.stateFingerprintHistory.delete(missionId);
      this.consecutiveFailures.delete(missionId);
    } else {
      this.stateFingerprintHistory.clear();
      this.consecutiveFailures.clear();
    }
  }
}
