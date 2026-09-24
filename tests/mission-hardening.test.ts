/**
 * HRSIKESA (हृषीकेश) — Phase 13.5 Autonomous Mission Hardening Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { TaskRepository } from '../src/persistence/repositories/task.repository.js';
import { MissionRepository } from '../src/persistence/repositories/mission.repository.js';
import { ArtifactRepository } from '../src/persistence/repositories/artifact.repository.js';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER } from '../src/agents/roster/initial.agents.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { AgentRuntime } from '../src/agents/runtime/agent.runtime.js';
import { AgentDelegationManager } from '../src/agents/delegation/delegation.manager.js';
import { AgentBlackboard } from '../src/agents/blackboard/blackboard.js';
import { MissionPlanner } from '../src/agents/planner/mission.planner.js';
import { MissionVerifier } from '../src/agents/verification/mission.verifier.js';
import { RecoveryManager } from '../src/agents/recovery/recovery.manager.js';
import { MissionOrchestrator } from '../src/agents/mission/mission.orchestrator.js';
import { MissionBudgetTracker } from '../src/agents/interfaces/mission.types.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';

test('Phase 13.5 — Mission Hardening & Governance Verification', async (t) => {
  let db: DatabaseManager;
  let taskRepo: TaskRepository;
  let missionRepo: MissionRepository;
  let artifactRepo: ArtifactRepository;
  let agentRegistry: AgentRegistry;
  let toolRegistry: ToolRegistry;
  let permManager: PermissionManager;
  let auditManager: ToolAuditManager;
  let toolBus: ToolExecutionBus;
  let modelRegistry: ModelRegistry;
  let modelRouter: ModelRouter;
  let agentRuntime: AgentRuntime;
  let delegationManager: AgentDelegationManager;
  let blackboard: AgentBlackboard;
  let planner: MissionPlanner;
  let verifier: MissionVerifier;
  let recovery: RecoveryManager;
  let orchestrator: MissionOrchestrator;
  let eventBus: EventBus;

  const setup = () => {
    db = new DatabaseManager(':memory:');
    db.open();
    new MigrationManager(db).runPending();

    taskRepo = new TaskRepository(db);
    missionRepo = new MissionRepository(db);
    artifactRepo = new ArtifactRepository(db);
    eventBus = new EventBus();

    agentRegistry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      agentRegistry.register(agent);
    }

    toolRegistry = new ToolRegistry();
    permManager = new PermissionManager({ maxAutonomousTier: DangerTier.TIER_0 }); // Tier 1+ requires approval
    auditManager = new ToolAuditManager(undefined, eventBus);
    toolBus = new ToolExecutionBus(toolRegistry, permManager, auditManager, eventBus);

    // Register test tools
    toolRegistry.register({
      id: 'filesystem.read',
      name: 'Read File',
      description: 'Read file contents',
      category: 'filesystem',
      riskLevel: DangerTier.TIER_0,
      inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
      outputSchema: { type: 'object' },
      execute: async (input) => ({ success: true, output: { content: 'test-content', path: input.path } })
    });

    toolRegistry.register({
      id: 'terminal.execute',
      name: 'Execute Command',
      description: 'Execute shell command',
      category: 'terminal',
      riskLevel: DangerTier.TIER_1, // Requires human approval under TIER_0 maxAutonomousTier
      inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
      outputSchema: { type: 'object' },
      execute: async () => ({ success: true, output: { stdout: 'executed' } })
    });

    modelRegistry = new ModelRegistry();
    modelRouter = new ModelRouter(modelRegistry);
    agentRuntime = new AgentRuntime(agentRegistry, toolRegistry, toolBus, modelRouter, eventBus);
    delegationManager = new AgentDelegationManager({}, eventBus);
    blackboard = new AgentBlackboard(db);
    planner = new MissionPlanner(agentRegistry, modelRouter);
    verifier = new MissionVerifier(blackboard);
    recovery = new RecoveryManager(3);

    orchestrator = new MissionOrchestrator(
      agentRegistry,
      agentRuntime,
      delegationManager,
      blackboard,
      taskRepo,
      missionRepo,
      eventBus,
      undefined,
      artifactRepo,
      planner,
      verifier,
      recovery
    );
  };

  await t.test('should enforce mission-wide model budget and throw when budget exhausted', () => {
    const tracker = new MissionBudgetTracker(2);
    assert.strictEqual(tracker.getModelCallsCount(), 0);
    assert.strictEqual(tracker.isExhausted(), false);

    tracker.recordModelCall();
    assert.strictEqual(tracker.getModelCallsCount(), 1);
    assert.strictEqual(tracker.isExhausted(), false);

    tracker.recordModelCall();
    assert.strictEqual(tracker.getModelCallsCount(), 2);
    assert.strictEqual(tracker.isExhausted(), true);

    assert.throws(() => tracker.recordModelCall(), /model call budget exhausted/i);
  });

  await t.test('should execute deterministic fast-path task with 0 model calls', async () => {
    setup();
    try {
      const mission = await orchestrator.planAndCreateMission({
        objective: 'Check whether package.json exists in the HṚṢĪKEŚA workspace.'
      });

      assert.strictEqual(mission.plan?.tasks.length, 1);
      assert.ok(mission.plan?.tasks[0].deterministicToolAction !== undefined);

      const result = await orchestrator.executeMission(mission.id);
      assert.strictEqual(result.status, 'completed');
      assert.strictEqual(result.report?.modelCallsCount, 0);
      assert.strictEqual(result.report?.tasks.completed, 1);
    } finally {
      db.close();
    }
  });

  await t.test('should never treat pending approval as success and transition to BLOCKED', async () => {
    setup();
    try {
      const mission = orchestrator.createMission({
        objective: 'Run restricted terminal command',
        rootAgentId: 'gandiva'
      });

      taskRepo.update(mission.rootTaskId, {
        inputs: { tool: 'terminal.execute', input: { command: 'node -v' } }
      });

      const result = await orchestrator.executeMission(mission.id);
      assert.strictEqual(result.status, 'blocked');

      const updatedMission = missionRepo.get(mission.id)!;
      assert.strictEqual(updatedMission.status, 'blocked');
      assert.ok(updatedMission.interventionRequest !== undefined);
      assert.strictEqual(updatedMission.interventionRequest?.resolved, false);
      assert.ok(updatedMission.interventionRequest?.id.startsWith('apr_'));

      const updatedTask = taskRepo.get(mission.rootTaskId)!;
      assert.strictEqual(updatedTask.status, 'blocked');
    } finally {
      db.close();
    }
  });

  await t.test('should successfully resume blocked mission when human approval is granted', async () => {
    setup();
    try {
      const mission = orchestrator.createMission({
        objective: 'Run restricted terminal command',
        rootAgentId: 'gandiva'
      });

      taskRepo.update(mission.rootTaskId, {
        inputs: { tool: 'terminal.execute', input: { command: 'node -v' } }
      });

      const blockedResult = await orchestrator.executeMission(mission.id);
      assert.strictEqual(blockedResult.status, 'blocked');

      const approvalId = missionRepo.get(mission.id)!.interventionRequest!.id;
      permManager.approve(approvalId, 'ROOT_OPERATOR');

      const resumeResult = await orchestrator.resumeMission(mission.id, {
        approvalId,
        decision: 'APPROVED',
        resolution: 'Operator authorized execution'
      });

      assert.strictEqual(resumeResult.status, 'completed');
      const finalMission = missionRepo.get(mission.id)!;
      assert.strictEqual(finalMission.status, 'completed');
      assert.strictEqual(finalMission.interventionRequest?.resolved, true);
    } finally {
      db.close();
    }
  });

  await t.test('should cleanly abort blocked mission when human approval is rejected', async () => {
    setup();
    try {
      const mission = orchestrator.createMission({
        objective: 'Run restricted terminal command',
        rootAgentId: 'gandiva'
      });

      taskRepo.update(mission.rootTaskId, {
        inputs: { tool: 'terminal.execute', input: { command: 'node -v' } }
      });

      const blockedResult = await orchestrator.executeMission(mission.id);
      assert.strictEqual(blockedResult.status, 'blocked');

      const approvalId = missionRepo.get(mission.id)!.interventionRequest!.id;
      permManager.reject(approvalId, 'Denied dangerous action', 'ROOT_OPERATOR');

      const rejectResult = await orchestrator.resumeMission(mission.id, {
        approvalId,
        decision: 'REJECTED',
        resolution: 'Action deemed unsafe by operator'
      });

      assert.strictEqual(rejectResult.status, 'failed');
      const finalMission = missionRepo.get(mission.id)!;
      assert.strictEqual(finalMission.status, 'failed');
      assert.strictEqual(finalMission.interventionRequest?.resolved, true);
    } finally {
      db.close();
    }
  });

  await t.test('should cancel active mission and mark all associated tasks cancelled', async () => {
    setup();
    try {
      const mission = orchestrator.createMission({
        objective: 'Cancel test mission',
        rootAgentId: 'gandiva'
      });

      const cancelled = await orchestrator.cancelMission(mission.id, 'User stopped mission');
      assert.strictEqual(cancelled.status, 'cancelled');

      const task = taskRepo.get(mission.rootTaskId)!;
      assert.strictEqual(task.status, 'cancelled');
    } finally {
      db.close();
    }
  });

  await t.test('should bound retries via RecoveryManager to max 3 attempts', () => {
    setup();
    try {
      const task = {
        id: 't_fail',
        agentId: 'gandiva',
        objective: 'Fail repeatedly',
        priority: 'normal' as const,
        status: 'pending' as const,
        depth: 0,
        retryCount: 3,
        createdAt: new Date().toISOString()
      };

      const classification = recovery.classifyError('Network timeout', 0, 3, 3);
      const canRetry = recovery.canRetry(task, classification);
      assert.strictEqual(canRetry, false);
    } finally {
      db.close();
    }
  });
});
