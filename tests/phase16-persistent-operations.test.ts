/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 16 Persistent Autonomous Operations Test Suite
 *
 * Tests:
 * 1. Persistent objective lifecycle and deterministic health state evaluation
 * 2. Continuous objective evaluation loop with budget bounds
 * 3. Persistent scheduler (ONE_TIME, INTERVAL, RECURRING) and lifecycle (pause/resume/cancel)
 * 4. Restart and crash recovery for in-flight tasks, missions, and goals
 * 5. Hardware resource governance and pressure detection
 * 6. Migration 007 and SQLite persistence
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { GoalRepository } from '../src/persistence/repositories/goal.repository.js';
import { MilestoneRepository } from '../src/persistence/repositories/milestone.repository.js';
import { MissionRepository } from '../src/persistence/repositories/mission.repository.js';
import { TaskRepository } from '../src/persistence/repositories/task.repository.js';
import { ScheduleRepository } from '../src/persistence/repositories/schedule.repository.js';
import { ObjectiveEvaluationRepository } from '../src/persistence/repositories/objective-evaluation.repository.js';
import { ObjectiveHealthEvaluator } from '../src/goal/engine/objective.health.js';
import { ObjectiveEvaluator } from '../src/goal/engine/objective.evaluator.js';
import { PersistentScheduler } from '../src/scheduling/persistent.scheduler.js';
import { ObjectiveRecoveryManager } from '../src/runtime/recovery/objective.recovery.manager.js';
import { ResourceGovernor } from '../src/core/hardware/resource.governor.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { GoalVerifier } from '../src/goal/verification/goal.verifier.js';
import { MissionOrchestrator } from '../src/agents/mission/mission.orchestrator.js';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER } from '../src/agents/roster/initial.agents.js';
import { AgentRuntime } from '../src/agents/runtime/agent.runtime.js';
import { AgentDelegationManager } from '../src/agents/delegation/delegation.manager.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import { MissionVerifier } from '../src/agents/verification/mission.verifier.js';
import { RecoveryManager } from '../src/agents/recovery/recovery.manager.js';
import { DEFAULT_GOAL_BUDGET, IGoal } from '../src/goal/interfaces/goal.types.js';

describe('Phase 16: Persistent Autonomous Operations Subsystem', () => {
  const testDbDir = path.resolve(process.cwd(), 'data/test_phase16');
  const testDbPath = path.join(testDbDir, 'phase16_test.db');
  let db: DatabaseManager;
  let migrations: MigrationManager;
  let goalRepo: GoalRepository;
  let milestoneRepo: MilestoneRepository;
  let missionRepo: MissionRepository;
  let taskRepo: TaskRepository;
  let scheduleRepo: ScheduleRepository;
  let evalRepo: ObjectiveEvaluationRepository;
  let eventBus: EventBus;
  let agentRegistry: AgentRegistry;
  let orchestrator: MissionOrchestrator;
  let verifier: GoalVerifier;
  let objectiveEvaluator: ObjectiveEvaluator;
  let scheduler: PersistentScheduler;
  let recoveryManager: ObjectiveRecoveryManager;
  let resourceGovernor: ResourceGovernor;

  before(async () => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    db = new DatabaseManager(testDbPath);
    migrations = new MigrationManager(db);
    migrations.runPending();

    goalRepo = new GoalRepository(db);
    milestoneRepo = new MilestoneRepository(db);
    missionRepo = new MissionRepository(db);
    taskRepo = new TaskRepository(db);
    scheduleRepo = new ScheduleRepository(db);
    evalRepo = new ObjectiveEvaluationRepository(db);
    eventBus = new EventBus();

    agentRegistry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      agentRegistry.register(agent);
    }

    const blackboard = new AgentBlackboard();
    const runtime = new AgentRuntime();
    const delegation = new AgentDelegationManager(agentRegistry);
    const mVerifier = new MissionVerifier(blackboard);
    const recManager = new RecoveryManager(3);

    orchestrator = new MissionOrchestrator(
      agentRegistry,
      runtime,
      delegation,
      blackboard,
      taskRepo,
      missionRepo,
      eventBus
    );

    verifier = new GoalVerifier(missionRepo, milestoneRepo);

    objectiveEvaluator = new ObjectiveEvaluator({
      goalRepo,
      milestoneRepo,
      missionRepo,
      evaluationRepo: evalRepo,
      orchestrator,
      verifier,
      eventBus,
    });

    scheduler = new PersistentScheduler(scheduleRepo, eventBus);

    recoveryManager = new ObjectiveRecoveryManager(
      goalRepo,
      milestoneRepo,
      missionRepo,
      taskRepo,
      objectiveEvaluator,
      eventBus
    );

    resourceGovernor = new ResourceGovernor(eventBus);
  });

  after(() => {
    scheduler.stop();
    db.close();
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
  });

  describe('1. Migration 007 & Schema Persistence', () => {
    it('should create schedules and objective_evaluations tables successfully', () => {
      const scheduleTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schedules';").get();
      assert.ok(scheduleTable, 'schedules table should exist');

      const evalTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='objective_evaluations';").get();
      assert.ok(evalTable, 'objective_evaluations table should exist');
    });

    it('should persist and query persistent schedules with ScheduleRepository', () => {
      const created = scheduleRepo.create({
        id: 'sch_test_001',
        name: 'Daily Portfolio Backup',
        description: 'Backs up portfolio code every night',
        targetType: 'goal',
        targetId: 'goal_portfolio_001',
        scheduleType: 'INTERVAL',
        intervalMs: 86400000,
        runCount: 0,
        status: 'ACTIVE',
        createdBy: 'rushikesh',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      assert.equal(created.id, 'sch_test_001');
      const retrieved = scheduleRepo.get('sch_test_001');
      assert.ok(retrieved);
      assert.equal(retrieved.name, 'Daily Portfolio Backup');
      assert.equal(retrieved.status, 'ACTIVE');

      const all = scheduleRepo.findAll();
      assert.ok(all.length >= 1);
    });

    it('should record and list immutable objective evaluation records', () => {
      goalRepo.create({
        id: 'goal_portfolio_001',
        title: 'Portfolio Website',
        objective: 'Build personal portfolio site',
        status: 'PLANNED',
        priority: 'high',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const evalRecord = evalRepo.create({
        id: 'eval_001',
        goalId: 'goal_portfolio_001',
        cycleNumber: 1,
        evaluatedAt: new Date().toISOString(),
        previousStatus: 'PLANNED',
        newStatus: 'EXECUTING',
        healthState: 'HEALTHY',
        healthReason: 'Actively progressing on milestone 1',
        isComplete: false,
        isBlocked: false,
        decision: 'CONTINUE',
        nextAction: 'Executing milestone 1',
        modelCallsUsed: 1,
        tasksEvaluated: 3,
        createdAt: new Date().toISOString(),
      });

      assert.equal(evalRecord.id, 'eval_001');
      const list = evalRepo.findByGoalId('goal_portfolio_001');
      assert.equal(list.length, 1);
      assert.equal(list[0].decision, 'CONTINUE');
    });
  });

  describe('2. Deterministic Objective Health Evaluator', () => {
    it('should classify an unstarted goal as WAITING', () => {
      const goal: IGoal = {
        id: 'g_wait',
        title: 'Build Documentation',
        objective: 'Write full docs',
        status: 'PLANNED',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const health = ObjectiveHealthEvaluator.evaluate({
        goal,
        milestones: [],
        missions: [],
        pendingApprovalsCount: 0,
      });

      assert.equal(health.state, 'WAITING');
    });

    it('should classify a goal with pending human approval as NEEDS_USER', () => {
      const goal: IGoal = {
        id: 'g_appr',
        title: 'Deploy Production Server',
        objective: 'Deploy live stack',
        status: 'AWAITING_APPROVAL',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const health = ObjectiveHealthEvaluator.evaluate({
        goal,
        milestones: [],
        missions: [],
        pendingApprovalsCount: 1,
      });

      assert.equal(health.state, 'NEEDS_USER');
      assert.equal(health.pendingApprovalsCount, 1);
    });

    it('should classify a goal with failed milestones as FAILED', () => {
      const goal: IGoal = {
        id: 'g_fail',
        title: 'Compile Rust Kernel',
        objective: 'Compile kernel',
        status: 'FAILED',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const health = ObjectiveHealthEvaluator.evaluate({
        goal,
        milestones: [{
          id: 'm_f1',
          goalId: 'g_fail',
          sequence: 1,
          title: 'Link libraries',
          status: 'FAILED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        missions: [],
        pendingApprovalsCount: 0,
      });

      assert.equal(health.state, 'FAILED');
      assert.equal(health.failedTasksCount, 1);
    });

    it('should classify completed milestones as COMPLETED', () => {
      const goal: IGoal = {
        id: 'g_done',
        title: 'Create landing page',
        objective: 'Build page',
        status: 'COMPLETED',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const health = ObjectiveHealthEvaluator.evaluate({
        goal,
        milestones: [{
          id: 'm_d1',
          goalId: 'g_done',
          sequence: 1,
          title: 'Build HTML',
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        missions: [],
        pendingApprovalsCount: 0,
      });

      assert.equal(health.state, 'COMPLETED');
    });
  });

  describe('3. Objective Continuous Evaluation Loop', () => {
    it('should execute evaluation cycle and transition goal state deterministically', async () => {
      const goal = goalRepo.create({
        id: 'g_eval_test',
        title: 'Setup automated CI/CD',
        objective: 'Setup GitHub workflow and test scripts',
        status: 'PLANNED',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      milestoneRepo.create({
        id: 'm_eval_1',
        goalId: goal.id,
        sequence: 1,
        title: 'Create CI workflow file',
        status: 'PENDING',
        requiredAgentIds: ['gandiva'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Run evaluation cycle
      const result = await objectiveEvaluator.evaluate(goal.id);
      assert.equal(result.decision, 'CONTINUE');
      assert.equal(result.newStatus, 'EXECUTING');
      assert.ok(result.childMissionId, 'child mission should be spawned for pending milestone');

      // Check evaluation record persisted
      const evals = evalRepo.findByGoalId(goal.id);
      assert.equal(evals.length, 1);
      assert.equal(evals[0].decision, 'CONTINUE');
    });

    it('should provide evaluateHealth endpoint without mutating state', async () => {
      const health = await objectiveEvaluator.evaluateHealth('g_eval_test');
      assert.ok(health.state === 'HEALTHY' || health.state === 'WAITING');
    });
  });

  describe('4. Persistent Scheduler Engine', () => {
    it('should create, pause, resume, trigger, and cancel persistent schedules', async () => {
      let triggerCount = 0;
      scheduler.registerHandler('custom', async (sch) => {
        triggerCount++;
      });

      const sch = await scheduler.schedule({
        name: 'Quick Ping',
        targetType: 'custom',
        targetId: 'custom_001',
        scheduleType: 'INTERVAL',
        intervalMs: 100,
        maxRuns: 3,
      });

      assert.equal(sch.name, 'Quick Ping');
      assert.equal(sch.status, 'ACTIVE');

      // Pause schedule
      const paused = scheduler.pauseSchedule(sch.id);
      assert.equal(paused?.status, 'PAUSED');

      // Resume schedule
      const resumed = scheduler.resumeSchedule(sch.id);
      assert.equal(resumed?.status, 'ACTIVE');

      // Trigger due schedules
      await scheduler.checkDueSchedules();

      // Cancel schedule
      const cancelled = scheduler.cancelSchedule(sch.id);
      assert.equal(cancelled?.status, 'CANCELLED');
    });
  });

  describe('5. Restart & Crash Recovery', () => {
    it('should recover hung tasks, active missions, and resume in-flight goals idempotently', async () => {
      // Seed an interrupted running task
      taskRepo.create({
        id: 'tsk_interrupted_1',
        agentId: 'gandiva',
        objective: 'Build stylesheet',
        status: 'running',
        priority: 'normal',
        depth: 0,
        createdAt: new Date().toISOString(),
      });

      // Seed an interrupted goal
      const inFlightGoal = goalRepo.create({
        id: 'g_interrupted_1',
        title: 'Build analytics dashboard',
        objective: 'Build UI charts',
        status: 'EXECUTING',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      milestoneRepo.create({
        id: 'm_rec_1',
        goalId: inFlightGoal.id,
        sequence: 1,
        title: 'Render charts',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const summary = await recoveryManager.recoverOnStartup();
      assert.ok(summary.recoveredTasksCount >= 1, 'interrupted task should be recovered');
      assert.ok(summary.recoveredGoalsCount >= 1, 'in-flight goal should be recovered and evaluated');

      // Verify task status reset to ready
      const recoveredTask = taskRepo.get('tsk_interrupted_1');
      assert.equal(recoveredTask?.status, 'ready');
    });
  });

  describe('6. Resource Governor', () => {
    it('should report host memory metrics and derive pressure level', () => {
      const metrics = resourceGovernor.getMetrics();
      assert.ok(metrics.totalMemoryBytes > 0);
      assert.ok(metrics.freeMemoryBytes > 0);
      assert.ok(metrics.freeMemoryGb > 0);
      assert.ok(metrics.usedMemoryPercentage >= 0 && metrics.usedMemoryPercentage <= 100);
      assert.ok(['NORMAL', 'LOW_MEMORY', 'CRITICAL_MEMORY'].includes(metrics.pressureLevel));
      assert.ok(metrics.maxConcurrentTasks >= 1);
      assert.ok(metrics.maxConcurrentMissions >= 1);
    });

    it('should provide isConstrained boolean check', () => {
      const constrained = resourceGovernor.isConstrained();
      assert.equal(typeof constrained, 'boolean');
    });
  });
});
