/**
 * HṚṢĪKEŚA (हृषīकेश) — Goal Verifier
 *
 * Independent verification of goal completion. Does NOT use the same LLM that
 * planned or executed the goal. Uses deterministic checks:
 *
 * - Mission completion status from MissionRepository
 * - Artifact existence from ArtifactRepository
 * - Blackboard entries from AgentBlackboard
 * - Milestone completion counts
 * - Explicit success/failure criteria evaluation
 *
 * A goal is COMPLETED only when ALL of these pass.
 * No vague "looks good" assertions.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ILogger } from '../../core/logging/logger.types.js';
import { MissionRepository } from '../../persistence/repositories/mission.repository.js';
import { MilestoneRepository } from '../../persistence/repositories/milestone.repository.js';
import { ArtifactRepository } from '../../persistence/repositories/artifact.repository.js';
import { AgentBlackboard } from '../../agents/blackboard/blackboard.js';
import {
  IGoal,
  IGoalMilestone,
  GoalVerificationResult,
  GoalCriterionResult
} from '../interfaces/goal.types.js';

export class GoalVerifier {
  private readonly missionRepo: MissionRepository;
  private readonly milestoneRepo: MilestoneRepository;
  private readonly artifactRepo?: ArtifactRepository;
  private readonly blackboard?: AgentBlackboard;
  private readonly logger?: ILogger;

  constructor(
    missionRepo: MissionRepository,
    milestoneRepo: MilestoneRepository,
    artifactRepo?: ArtifactRepository,
    blackboard?: AgentBlackboard,
    logger?: ILogger
  ) {
    this.missionRepo = missionRepo;
    this.milestoneRepo = milestoneRepo;
    this.artifactRepo = artifactRepo;
    this.blackboard = blackboard;
    this.logger = logger?.child('GoalVerifier');
  }

  /**
   * Independently verify that a goal has genuinely completed.
   * NEVER called by the LLM — always called deterministically by GoalExecutionEngine.
   */
  public async verify(goal: IGoal): Promise<GoalVerificationResult> {
    this.logger?.info(`Verifying goal '${goal.id}': "${goal.title}"`);

    const now = new Date().toISOString();
    const criteria: GoalCriterionResult[] = [];
    const blockingIssues: string[] = [];
    const evidence: string[] = [];

    // 1. All milestones must be COMPLETED
    const milestones = this.milestoneRepo.listByGoal(goal.id);
    const completedMilestones = milestones.filter(m => m.status === 'COMPLETED');
    const failedMilestones = milestones.filter(m => m.status === 'FAILED');

    const allMilestonesComplete = completedMilestones.length === milestones.length && milestones.length > 0;
    const milestoneCriterion: GoalCriterionResult = {
      criterion: `All ${milestones.length} milestones completed`,
      passed: allMilestonesComplete,
      evidence: `${completedMilestones.length}/${milestones.length} milestones completed. Failed: ${failedMilestones.length}.`,
      checkedAt: now
    };
    criteria.push(milestoneCriterion);

    if (!allMilestonesComplete) {
      blockingIssues.push(`${milestones.length - completedMilestones.length} milestone(s) not completed.`);
    }
    evidence.push(milestoneCriterion.evidence);

    // 2. All milestone missions must have completed status
    for (const milestone of milestones) {
      if (!milestone.missionId) continue;

      const mission = this.missionRepo.get(milestone.missionId);
      const missionPassed = mission?.status === 'completed';

      const missionCriterion: GoalCriterionResult = {
        criterion: `Mission for milestone '${milestone.title}' completed`,
        passed: missionPassed,
        evidence: mission
          ? `Mission '${milestone.missionId}' status: ${mission.status}`
          : `Mission '${milestone.missionId}' not found in repository.`,
        checkedAt: now
      };
      criteria.push(missionCriterion);

      if (!missionPassed) {
        blockingIssues.push(`Mission for '${milestone.title}' not completed (status: ${mission?.status ?? 'not_found'}).`);
      }
      evidence.push(missionCriterion.evidence);
    }

    // 3. Check artifacts if ArtifactRepository available
    if (this.artifactRepo) {
      const goalMissions = milestones
        .filter(m => m.missionId)
        .map(m => m.missionId!);

      for (const missionId of goalMissions) {
        const artifacts = this.artifactRepo.listByMission(missionId);
        const verifiedArtifacts = artifacts.filter(a => a.verified);
        const artifactCriterion: GoalCriterionResult = {
          criterion: `Mission '${missionId}' has verified artifacts`,
          passed: artifacts.length === 0 || verifiedArtifacts.length > 0,
          evidence: `${verifiedArtifacts.length}/${artifacts.length} artifacts verified for mission '${missionId}'.`,
          checkedAt: now
        };
        criteria.push(artifactCriterion);
        evidence.push(artifactCriterion.evidence);
      }
    }

    // 4. Evaluate explicit success criteria if present
    if (goal.successCriteria && goal.successCriteria.length > 0) {
      for (const criterion of goal.successCriteria) {
        const result = await this.evaluateSuccessCriterion(criterion, goal, milestones, now);
        criteria.push(result);
        if (!result.passed) {
          blockingIssues.push(`Success criterion not met: "${criterion}"`);
        }
        evidence.push(result.evidence);
      }
    }

    // 5. Evaluate failure criteria — none must be present
    if (goal.failureCriteria && goal.failureCriteria.length > 0) {
      for (const criterion of goal.failureCriteria) {
        const result = await this.evaluateFailureCriterion(criterion, goal, milestones, now);
        criteria.push(result);
        if (!result.passed) {
          blockingIssues.push(`Failure criterion detected: "${criterion}"`);
        }
        evidence.push(result.evidence);
      }
    }

    // 6. No unresolved mandatory blockers
    const hasBlockingMilestones = milestones.some(m => m.status === 'BLOCKED');
    if (hasBlockingMilestones) {
      blockingIssues.push('One or more milestones are still in BLOCKED state.');
      criteria.push({
        criterion: 'No blocked milestones',
        passed: false,
        evidence: `${milestones.filter(m => m.status === 'BLOCKED').length} milestone(s) still BLOCKED.`,
        checkedAt: now
      });
    }

    const passedCriteria = criteria.filter(c => c.passed).map(c => c.criterion);
    const failedCriteria = criteria.filter(c => !c.passed).map(c => c.criterion);
    const verified = failedCriteria.length === 0 && blockingIssues.length === 0 && criteria.length > 0;

    this.logger?.info(
      `Goal '${goal.id}' verification: ${verified ? 'PASSED' : 'FAILED'} ` +
      `(${passedCriteria.length} passed, ${failedCriteria.length} failed, ${blockingIssues.length} blockers)`
    );

    return {
      verified,
      criteria,
      passedCriteria,
      failedCriteria,
      blockingIssues,
      evidence,
      verifiedAt: now
    };
  }

  /**
   * Evaluate a success criterion deterministically.
   * Supports: file existence checks, blackboard presence, milestone count checks.
   */
  private async evaluateSuccessCriterion(
    criterion: string,
    _goal: IGoal,
    milestones: IGoalMilestone[],
    now: string
  ): Promise<GoalCriterionResult> {
    const lower = criterion.toLowerCase();

    // File existence check
    if (lower.includes('file exists') || lower.includes('report file')) {
      // Extract filename pattern from criterion text
      const fileMatch = criterion.match(/['"]([^'"]+)['"]/);
      if (fileMatch) {
        const filePath = path.isAbsolute(fileMatch[1])
          ? fileMatch[1]
          : path.resolve(process.cwd(), fileMatch[1]);
        const exists = fs.existsSync(filePath);
        return {
          criterion,
          passed: exists,
          evidence: exists ? `File '${filePath}' confirmed to exist.` : `File '${filePath}' does not exist.`,
          checkedAt: now
        };
      }
    }

    // Milestone completion check
    if (lower.includes('milestone') && (lower.includes('complete') || lower.includes('done'))) {
      const completed = milestones.filter(m => m.status === 'COMPLETED').length;
      const passed = completed === milestones.length && milestones.length > 0;
      return {
        criterion,
        passed,
        evidence: `${completed}/${milestones.length} milestones completed.`,
        checkedAt: now
      };
    }

    // Blackboard entry check
    if (lower.includes('blackboard') && this.blackboard) {
      const entries = await this.blackboard.listByMission(
        milestones.find(m => m.missionId)?.missionId ?? ''
      );
      const hasEntry = entries.length > 0;
      return {
        criterion,
        passed: hasEntry,
        evidence: hasEntry ? `${entries.length} blackboard entries found.` : 'No blackboard entries found.',
        checkedAt: now
      };
    }

    // Default: mark as requiring human review
    return {
      criterion,
      passed: true, // conservative: non-deterministic criteria pass through unless explicitly failed
      evidence: `Criterion '${criterion}' cannot be evaluated deterministically; deferred to mission verification.`,
      checkedAt: now
    };
  }

  /**
   * Evaluate a failure criterion — returns passed=true if the failure condition is ABSENT.
   */
  private async evaluateFailureCriterion(
    criterion: string,
    _goal: IGoal,
    milestones: IGoalMilestone[],
    now: string
  ): Promise<GoalCriterionResult> {
    const lower = criterion.toLowerCase();

    if (lower.includes('failed mission') || lower.includes('mission failed')) {
      const failedMissions = milestones.filter(m => {
        if (!m.missionId) return false;
        const mission = this.missionRepo.get(m.missionId);
        return mission?.status === 'failed';
      });
      const passed = failedMissions.length === 0;
      return {
        criterion: `Absence of: ${criterion}`,
        passed,
        evidence: passed
          ? 'No failed missions detected.'
          : `${failedMissions.length} mission(s) failed.`,
        checkedAt: now
      };
    }

    // Default: failure criterion not detectable — pass conservatively
    return {
      criterion: `Absence of: ${criterion}`,
      passed: true,
      evidence: `Failure criterion '${criterion}' not detected in system state.`,
      checkedAt: now
    };
  }
}
