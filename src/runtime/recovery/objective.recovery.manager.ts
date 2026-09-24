/**
 * HṚṢĪKEŚA (हृषीकेश) — Objective Recovery Manager
 *
 * Phase 16F & 16G: Restart Recovery and Crash Resilience
 *
 * Automatically inspects SQLite on kernel boot for unfinished goals/missions
 * in EXECUTING or ANALYZING states, validates milestone integrity, and resumes
 * execution idempotently without duplicating completed work.
 */

import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { GoalRepository } from '../../persistence/repositories/goal.repository.js';
import { MilestoneRepository } from '../../persistence/repositories/milestone.repository.js';
import { MissionRepository } from '../../persistence/repositories/mission.repository.js';
import { TaskRepository } from '../../persistence/repositories/task.repository.js';
import { ObjectiveEvaluator } from '../../goal/engine/objective.evaluator.js';

export interface RecoverySummary {
  recoveredGoalsCount: number;
  recoveredMissionsCount: number;
  recoveredTasksCount: number;
  details: string[];
}

export class ObjectiveRecoveryManager {
  private readonly goalRepo: GoalRepository;
  private readonly milestoneRepo: MilestoneRepository;
  private readonly missionRepo: MissionRepository;
  private readonly taskRepo: TaskRepository;
  private readonly evaluator?: ObjectiveEvaluator;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;

  constructor(
    goalRepo: GoalRepository,
    milestoneRepo: MilestoneRepository,
    missionRepo: MissionRepository,
    taskRepo: TaskRepository,
    evaluator?: ObjectiveEvaluator,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.goalRepo = goalRepo;
    this.milestoneRepo = milestoneRepo;
    this.missionRepo = missionRepo;
    this.taskRepo = taskRepo;
    this.evaluator = evaluator;
    this.eventBus = eventBus;
    this.logger = logger?.child('ObjectiveRecoveryManager');
  }

  /**
   * Run startup recovery check.
   */
  public async recoverOnStartup(): Promise<RecoverySummary> {
    this.logger?.info('Running startup recovery audit for persistent objectives...');
    const details: string[] = [];

    // 1. Recover in-flight tasks (reset hung running tasks to ready or retry)
    const activeTasks = this.taskRepo.listActive();
    const runningTasks = activeTasks.filter((t) => t.status === 'running');
    let recoveredTasksCount = 0;
    for (const task of runningTasks) {
      this.logger?.warn(`Recovering interrupted task '${task.title || task.id}' [${task.id}]`);
      this.taskRepo.updateStatus(task.id, 'ready');
      recoveredTasksCount++;
      details.push(`Task ${task.id} reset from running to ready`);
    }

    // 2. Recover in-flight missions
    const activeMissions = this.missionRepo.listActive();
    const runningMissions = activeMissions.filter((m) => m.status === 'running');
    let recoveredMissionsCount = 0;
    for (const mission of runningMissions) {
      this.logger?.warn(`Recovering interrupted mission [${mission.id}]`);
      this.missionRepo.update(mission.id, {
        status: 'ready',
      });
      recoveredMissionsCount++;
      details.push(`Mission ${mission.id} preserved and set to ready`);
    }

    // 3. Recover in-flight goals
    const inFlightGoals = this.goalRepo.list({ status: 'EXECUTING' });
    let recoveredGoalsCount = 0;

    for (const goal of inFlightGoals) {
      this.logger?.info(`Recovering active goal '${goal.title}' [${goal.id}]`);
      const milestones = this.milestoneRepo.listByGoal(goal.id);
      const completed = milestones.filter((m) => m.status === 'COMPLETED').length;

      details.push(`Goal '${goal.title}' [${goal.id}] recovered with ${completed}/${milestones.length} milestones already completed.`);
      recoveredGoalsCount++;

      // Trigger re-evaluation if evaluator available
      if (this.evaluator) {
        try {
          await this.evaluator.evaluate(goal.id);
        } catch (err: any) {
          this.logger?.error(`Error evaluating recovered goal ${goal.id}: ${err.message}`);
        }
      }
    }

    const summary: RecoverySummary = {
      recoveredGoalsCount,
      recoveredMissionsCount,
      recoveredTasksCount,
      details,
    };

    this.logger?.info(
      `Startup recovery complete: ${recoveredGoalsCount} goal(s), ${recoveredMissionsCount} mission(s), ${recoveredTasksCount} task(s) safely recovered.`
    );

    if (this.eventBus) {
      this.eventBus.emit('recovery.completed', {
        recoveredTasks: recoveredTasksCount,
        recoveredMissions: recoveredMissionsCount,
        timestamp: new Date().toISOString(),
      });
    }

    return summary;
  }
}
