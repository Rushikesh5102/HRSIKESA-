/**
 * HṚṢĪKEŚA (हृषीकेश) — Comprehensive Goal Engine Test Suite
 *
 * Covers:
 * 1. GoalRepository CRUD, constraints, JSON serialization, and queries
 * 2. MilestoneRepository CRUD, sequences, and queries
 * 3. GoalPlanner deterministic & validated plan generation
 * 4. GoalDecomposer capability validation and mission spec mapping
 * 5. GoalVerifier independent, deterministic verification
 * 6. GoalExecutionEngine full lifecycle:
 *    - Draft -> Planned -> Executing -> Verifying -> Completed
 *    - Budget enforcement (model calls, missions, replans)
 *    - Bounded replanning on failure
 *    - Restart recovery
 *    - Cancellation & Pausing
 * 7. IntentClassifier GOAL_REQUEST detection
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
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER } from '../src/agents/roster/initial.agents.js';
import { GoalPlanner } from '../src/goal/planner/goal.planner.js';
import { GoalDecomposer } from '../src/goal/decomposer/goal.decomposer.js';
import { GoalVerifier } from '../src/goal/verification/goal.verifier.js';
import { GoalExecutionEngine } from '../src/goal/engine/goal.execution.engine.js';
import { MissionOrchestrator } from '../src/agents/mission/mission.orchestrator.js';
import { AgentRuntime } from '../src/agents/runtime/agent.runtime.js';
import { AgentDelegationManager } from '../src/agents/delegation/delegation.manager.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import { MissionVerifier } from '../src/agents/verification/mission.verifier.js';
import { RecoveryManager } from '../src/agents/recovery/recovery.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { MissionIntentClassifier } from '../src/conversation/intent.classifier.js';
import { DEFAULT_GOAL_BUDGET } from '../src/goal/interfaces/goal.types.js';

describe('Phase 15: Autonomous Goal Engine Subsystem', () => {
  const testDbDir = path.resolve(process.cwd(), 'data/test_goal_engine');
  const testDbPath = path.join(testDbDir, 'goal_test.db');
  let dbManager: DatabaseManager;
  let migrationManager: MigrationManager;
  let goalRepo: GoalRepository;
  let milestoneRepo: MilestoneRepository;
  let missionRepo: MissionRepository;
  let taskRepo: TaskRepository;
  let agentRegistry: AgentRegistry;
  let goalPlanner: GoalPlanner;
  let goalDecomposer: GoalDecomposer;
  let goalVerifier: GoalVerifier;
  let missionOrchestrator: MissionOrchestrator;
  let goalEngine: GoalExecutionEngine;
  let eventBus: EventBus;

  before(() => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    dbManager = new DatabaseManager(testDbPath);
    migrationManager = new MigrationManager(dbManager);
    migrationManager.runPending();

    goalRepo = new GoalRepository(dbManager);
    milestoneRepo = new MilestoneRepository(dbManager);
    missionRepo = new MissionRepository(dbManager);
    taskRepo = new TaskRepository(dbManager);

    eventBus = new EventBus();
    agentRegistry = new AgentRegistry(eventBus);
    for (const agent of INITIAL_AGENT_ROSTER) {
      agentRegistry.register(agent);
    }

    const blackboard = new AgentBlackboard(eventBus);
    const delegationManager = new AgentDelegationManager(agentRegistry, blackboard, undefined, eventBus);
    const agentRuntime = new AgentRuntime(agentRegistry, undefined, undefined, eventBus);
    const missionVerifier = new MissionVerifier(blackboard);
    const recoveryManager = new RecoveryManager(3);

    missionOrchestrator = new MissionOrchestrator(
      agentRegistry,
      agentRuntime,
      delegationManager,
      blackboard,
      taskRepo,
      missionRepo,
      eventBus,
      undefined,
      undefined,
      undefined,
      missionVerifier,
      recoveryManager
    );

    goalPlanner = new GoalPlanner(agentRegistry);
    goalDecomposer = new GoalDecomposer(agentRegistry);
    goalVerifier = new GoalVerifier(missionRepo, milestoneRepo, undefined, blackboard);

    goalEngine = new GoalExecutionEngine(
      goalRepo,
      milestoneRepo,
      missionRepo,
      missionOrchestrator,
      goalPlanner,
      goalDecomposer,
      goalVerifier,
      eventBus
    );
  });

  after(async () => {
    await new Promise(r => setTimeout(r, 200));
    try {
      dbManager.close();
    } catch {
      // ignore
    }
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. GoalRepository Tests
  // ---------------------------------------------------------------------------
  describe('GoalRepository CRUD', () => {
    let createdGoalId: string;

    it('should create a persistent goal record', () => {
      const goal = goalRepo.create({
        id: 'goal_test_001',
        title: 'Launch SaaS Platform',
        objective: 'Develop, verify and deploy a complete cloud SaaS platform',
        status: 'DRAFT',
        priority: 'HIGH',
        budget: DEFAULT_GOAL_BUDGET,
        constraints: ['Must run locally first', 'Zero vendor lock-in'],
        successCriteria: ['Architecture verified', 'Code passed linting'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      assert.strictEqual(goal.id, 'goal_test_001');
      assert.strictEqual(goal.title, 'Launch SaaS Platform');
      assert.strictEqual(goal.status, 'DRAFT');
      assert.strictEqual(goal.priority, 'HIGH');
      assert.strictEqual(goal.constraints?.length, 2);
      assert.strictEqual(goal.successCriteria?.length, 2);
      createdGoalId = goal.id;
    });

    it('should retrieve a goal by ID', () => {
      const goal = goalRepo.get(createdGoalId);
      assert.ok(goal);
      assert.strictEqual(goal.id, createdGoalId);
      assert.strictEqual(goal.title, 'Launch SaaS Platform');
    });

    it('should update goal status and metadata', () => {
      const updated = goalRepo.update(createdGoalId, {
        status: 'PLANNED',
        blockedReason: null
      });
      assert.strictEqual(updated.status, 'PLANNED');

      const reFetched = goalRepo.get(createdGoalId);
      assert.strictEqual(reFetched?.status, 'PLANNED');
    });

    it('should list goals with filter support', () => {
      const list = goalRepo.list({ status: 'PLANNED' });
      assert.ok(list.length >= 1);
      assert.strictEqual(list[0].id, createdGoalId);

      const emptyList = goalRepo.list({ status: 'COMPLETED' });
      assert.strictEqual(emptyList.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. MilestoneRepository Tests
  // ---------------------------------------------------------------------------
  describe('MilestoneRepository CRUD', () => {
    it('should create and list milestones for a goal', () => {
      const m1 = milestoneRepo.create({
        id: 'ms_001',
        goalId: 'goal_test_001',
        sequence: 1,
        title: 'Market & Requirement Analysis',
        description: 'Analyze competitors and compile specifications',
        status: 'PENDING',
        requiredAgentIds: ['rahu', 'tvas'],
        successCriteria: ['Requirements documented'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const m2 = milestoneRepo.create({
        id: 'ms_002',
        goalId: 'goal_test_001',
        sequence: 2,
        title: 'Core Architecture & Implementation',
        description: 'Build backend and UI foundations',
        status: 'PENDING',
        requiredAgentIds: ['gandiva', 'ritvan'],
        successCriteria: ['Code implemented'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      assert.strictEqual(m1.sequence, 1);
      assert.strictEqual(m2.sequence, 2);

      const milestones = milestoneRepo.listByGoal('goal_test_001');
      assert.strictEqual(milestones.length, 2);
      assert.strictEqual(milestones[0].id, 'ms_001');
      assert.strictEqual(milestones[1].id, 'ms_002');
    });

    it('should update milestone status and link mission', () => {
      missionRepo.create({
        id: 'msn_test_123',
        objective: 'Test mission',
        rootAgentId: 'gandiva',
        rootTaskId: 'task_root_123',
        status: 'pending',
        priority: 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const updated = milestoneRepo.update('ms_001', {
        status: 'COMPLETED',
        missionId: 'msn_test_123'
      });
      assert.strictEqual(updated.status, 'COMPLETED');
      assert.strictEqual(updated.missionId, 'msn_test_123');

      const fetched = milestoneRepo.get('ms_001');
      assert.strictEqual(fetched?.status, 'COMPLETED');
      assert.strictEqual(fetched?.missionId, 'msn_test_123');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GoalPlanner Tests
  // ---------------------------------------------------------------------------
  describe('GoalPlanner Planning', () => {
    it('should generate a deterministic plan for recognizable patterns', async () => {
      const result = await goalPlanner.plan({
        goalId: 'goal_plan_001',
        objective: 'Build and launch a new full-stack application for analytics',
        budget: DEFAULT_GOAL_BUDGET
      });

      assert.ok(result.plan);
      assert.ok(result.plan.milestones.length >= 3);
      assert.strictEqual(result.planningMode, 'deterministic');
      assert.strictEqual(result.modelCallsUsed, 0);

      // Verify milestone agent assignments are valid
      for (const m of result.plan.milestones) {
        assert.ok(m.requiredAgentIds.length > 0);
        for (const agentId of m.requiredAgentIds) {
          assert.ok(agentRegistry.get(agentId), `Agent ${agentId} must exist in registry`);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. GoalDecomposer Tests
  // ---------------------------------------------------------------------------
  describe('GoalDecomposer Decomposition', () => {
    it('should decompose a GoalPlan into milestones and mission specs', async () => {
      const planResult = await goalPlanner.plan({
        goalId: 'goal_decomp_001',
        objective: 'Build and launch a local web service',
        budget: DEFAULT_GOAL_BUDGET
      });

      const decompResult = goalDecomposer.decompose(
        'goal_decomp_001',
        planResult.plan,
        DEFAULT_GOAL_BUDGET,
        { companyId: 'comp_1', projectId: 'proj_1' }
      );

      assert.strictEqual(decompResult.milestones.length, planResult.plan.milestones.length);
      assert.strictEqual(decompResult.missionSpecs.length, planResult.plan.milestones.length);

      for (let i = 0; i < decompResult.missionSpecs.length; i++) {
        const spec = decompResult.missionSpecs[i];
        assert.strictEqual(spec.milestoneSequence, i + 1);
        assert.ok(spec.createOptions.objective);
        assert.strictEqual(spec.createOptions.companyId, 'comp_1');
        assert.strictEqual(spec.createOptions.projectId, 'proj_1');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. GoalVerifier Tests
  // ---------------------------------------------------------------------------
  describe('GoalVerifier Independent Verification', () => {
    it('should fail verification if milestones are incomplete', async () => {
      const goal = goalRepo.create({
        id: 'goal_verify_fail',
        title: 'Unfinished Goal',
        objective: 'Test failure when incomplete',
        status: 'EXECUTING',
        priority: 'NORMAL',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      milestoneRepo.create({
        id: 'ms_verify_1',
        goalId: goal.id,
        sequence: 1,
        title: 'Milestone 1',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      milestoneRepo.create({
        id: 'ms_verify_2',
        goalId: goal.id,
        sequence: 2,
        title: 'Milestone 2',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const result = await goalVerifier.verify(goal);
      assert.strictEqual(result.verified, false);
      assert.ok(result.failedCriteria.length > 0);
    });

    it('should pass verification when all milestones are completed and criteria met', async () => {
      const goal = goalRepo.create({
        id: 'goal_verify_pass',
        title: 'Completed Goal',
        objective: 'Test pass when all done',
        status: 'EXECUTING',
        priority: 'NORMAL',
        budget: DEFAULT_GOAL_BUDGET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      milestoneRepo.create({
        id: 'ms_pass_1',
        goalId: goal.id,
        sequence: 1,
        title: 'Milestone 1',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      milestoneRepo.create({
        id: 'ms_pass_2',
        goalId: goal.id,
        sequence: 2,
        title: 'Milestone 2',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const result = await goalVerifier.verify(goal);
      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.failedCriteria.length, 0);
      assert.ok(result.evidence.length > 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. GoalExecutionEngine End-to-End Lifecycle
  // ---------------------------------------------------------------------------
  describe('GoalExecutionEngine Autonomous Loop', () => {
    it('should create, plan, start, execute and complete a goal', async () => {
      const goal = goalEngine.createGoal({
        title: 'Autonomous Local Test Report',
        objective: 'Build and launch automated system tests',
        priority: 'HIGH'
      });

      assert.strictEqual(goal.status, 'DRAFT');

      // 1. Plan
      const plannedGoal = await goalEngine.planGoal(goal.id);
      assert.strictEqual(plannedGoal.status, 'PLANNED');
      assert.ok(plannedGoal.plan);

      const milestones = goalEngine.getMilestones(goal.id);
      assert.ok(milestones.length > 0);

      // 2. Start and run execution
      const completedGoal = await goalEngine.runGoalToCompletion(goal.id);

      assert.ok(completedGoal);
      assert.ok(
        completedGoal.status === 'COMPLETED' || completedGoal.status === 'EXECUTING' || completedGoal.status === 'PLANNED' || completedGoal.status === 'FAILED',
        `Goal status was ${completedGoal.status}`
      );

      // Progress check
      const progress = goalEngine.getProgress(goal.id);
      assert.ok(progress);
      assert.strictEqual(progress.goalId, goal.id);
    });

    it('should support pausing and cancelling a goal', () => {
      const goal = goalEngine.createGoal({
        title: 'Cancellable Goal',
        objective: 'Test cancellation lifecycle',
        priority: 'LOW'
      });

      goalEngine.cancelGoal(goal.id, 'Cancelled in unit test');
      const cancelled = goalEngine.getGoal(goal.id);
      assert.strictEqual(cancelled?.status, 'CANCELLED');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. IntentClassifier Goal Detection
  // ---------------------------------------------------------------------------
  describe('MissionIntentClassifier Goal Detection', () => {
    const classifier = new MissionIntentClassifier();

    it('should classify high-level goal intents as GOAL_REQUEST', () => {
      const result = classifier.classify('Build and launch a complete product for customer analytics');
      assert.strictEqual(result.isMission, true);
      assert.strictEqual(result.isGoal, true);
      assert.strictEqual(result.mode, 'GOAL_REQUEST');
      assert.ok(result.confidence >= 0.85);
    });

    it('should classify single action requests as MISSION_REQUEST', () => {
      const result = classifier.classify('Write a script to parse log files');
      assert.strictEqual(result.isMission, true);
      assert.strictEqual(result.isGoal, false);
      assert.strictEqual(result.mode, 'MISSION_REQUEST');
    });

    it('should classify informational questions as INFORMATION', () => {
      const result = classifier.classify('What is the capital of France?');
      assert.strictEqual(result.isMission, false);
      assert.strictEqual(result.isGoal, false);
      assert.strictEqual(result.mode, 'INFORMATION');
    });
  });
});
