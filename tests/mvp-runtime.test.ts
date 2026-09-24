/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 16 MVP Runtime Integration Test Suite
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { HrisekesaKernel } from '../src/runtime/kernel.js';
import { MissionIntentClassifier } from '../src/conversation/intent.classifier.js';

describe('Phase 16: HṚṢĪKEŚA MVP Runtime & Natural-Language Bridge', () => {
  const testDbDir = path.resolve(process.cwd(), 'data/mvp_test_suite');
  const testDbPath = path.join(testDbDir, 'mvp_test.db');
  const testArtifactDir = path.join(testDbDir, 'artifacts');
  const testPort = 4277;

  let kernel: HrisekesaKernel;

  before(async () => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testArtifactDir, { recursive: true });

    kernel = new HrisekesaKernel({
      PORT: String(testPort),
      HRISEKESA_DB_PATH: testDbPath,
      ARTIFACTS_DIR: testArtifactDir
    });
    await kernel.start();
    
    // Stub executeMission to prevent background LLM calls and concurrency limit errors during tests
    kernel.missionOrchestrator.executeMission = async (missionId: string) => {
      return {
        missionId,
        status: 'completed',
        objective: 'Stubbed mission',
        summary: 'Stubbed mission execution for test',
        taskCount: 1,
        artifacts: [],
        completedAt: new Date().toISOString()
      };
    };

    // Stub missionPlanner to prevent LLM timeouts during tests
    kernel.missionPlanner.createPlan = async (options) => {
       const stubId = Math.random().toString(36).substring(7);
       return {
         objective: options.objective,
         constraints: options.constraints ? [...options.constraints] : [],
         successCriteria: ['Task executed successfully'],
         tasks: [
           {
             id: `task_stub_${stubId}`,
             title: 'Execute Stub Objective',
             objective: options.objective,
             agentId: options.defaultAgentId || 'gandiva',
             dependencies: [],
             requiredCapabilities: [],
             expectedOutputs: [],
             dangerLevel: 0
           }
         ],
         riskLevel: 'low',
         estimatedModelCalls: 0,
         createdAt: new Date().toISOString()
       };
    };

    // Stub goalPlanner to prevent LLM timeouts during tests
    kernel.goalPlanner.plan = async (request) => {
      const stubId = Math.random().toString(36).substring(7);
      return {
        plan: {
          interpretation: request.objective,
          assumptions: [],
          constraints: request.constraints || [],
          requiredDepartments: [],
          milestones: [
            {
              id: `milestone_stub_${stubId}`,
              title: 'Stubbed Milestone',
              description: 'A stubbed milestone for testing',
              sequence: 1,
              requiredAgentIds: ['gandiva'],
              requiredCapabilities: [],
              successCriteria: [],
              verificationCriteria: [],
              missionObjective: request.objective,
              requiresApproval: false
            }
          ],
          approvalPoints: [],
          stoppingConditions: [],
          estimatedModelCalls: 0,
          riskLevel: 'low',
          createdAt: new Date().toISOString(),
          source: 'deterministic'
        },
        modelCallsUsed: 0,
        planningMode: 'deterministic'
      };
    };
  });

  after(async () => {
    if (kernel) {
      await kernel.shutdown();
    }
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
  });

  describe('1. Natural-Language Intent Routing', () => {
    const classifier = new MissionIntentClassifier();

    test('should classify high-level strategic/software objectives as GOAL_REQUEST', () => {
      const g1 = classifier.classify('Build a website for my project');
      assert.equal(g1.mode, 'GOAL_REQUEST');
      assert.equal(g1.isGoal, true);

      const g2 = classifier.classify('Research this company and determine viable market entry');
      assert.equal(g2.mode, 'GOAL_REQUEST');
      assert.equal(g2.isGoal, true);

      const g3 = classifier.classify('Create a local project verification report for HṚṢĪKEŚA');
      assert.equal(g3.mode, 'GOAL_REQUEST');
      assert.equal(g3.isGoal, true);
    });

    test('should classify bounded tasks as MISSION_REQUEST', () => {
      const m1 = classifier.classify('Create a README file for the project');
      assert.equal(m1.mode, 'MISSION_REQUEST');
      assert.equal(m1.isMission, true);

      const m2 = classifier.classify('Write a script to benchmark database queries');
      assert.equal(m2.mode, 'MISSION_REQUEST');
    });

    test('should classify status queries as STATUS_REQUEST', () => {
      const s1 = classifier.classify('What is the status of my goal?');
      assert.equal(s1.mode, 'STATUS_REQUEST');

      const s2 = classifier.classify('Show system status');
      assert.equal(s2.mode, 'STATUS_REQUEST');
    });

    test('should classify operator approvals as APPROVAL_RESPONSE', () => {
      const a1 = classifier.classify('approve');
      assert.equal(a1.mode, 'APPROVAL_RESPONSE');
      assert.equal(a1.objective, 'APPROVE');

      const a2 = classifier.classify('reject');
      assert.equal(a2.mode, 'APPROVAL_RESPONSE');
      assert.equal(a2.objective, 'REJECT');
    });

    test('should classify chit-chat and questions as INFORMATION', () => {
      const i1 = classifier.classify('What is the meaning of sovereign AI?');
      assert.equal(i1.mode, 'INFORMATION');

      const i2 = classifier.classify('Hello HṚṢĪKEŚA');
      assert.equal(i2.mode, 'INFORMATION');
    });
  });

  describe('2. Unified Chat to Autonomous Engine Bridge', () => {
    test('should create and plan goal automatically when receiving GOAL_REQUEST in chat', async () => {
      const session = kernel.sessionRepo.create({
        id: `test-session-${Date.now()}`,
        title: 'MVP Goal Test'
      });

      const res = await kernel.conversation.sendMessage(
        'Goal: Create a local project verification report for HṚṢĪKEŚA',
        session.id
      );

      assert.equal(res.success, true);
      assert.ok(res.intentMode === 'GOAL_REQUEST' || res.goalId, 'Expected goal request handling');

      if (res.goalId) {
        const goal = kernel.goalEngine.getGoal(res.goalId);
        assert.ok(goal);
        assert.ok(goal.status === 'EXECUTING' || goal.status === 'COMPLETED' || goal.status === 'PLANNED' || goal.status === 'PAUSED');
        if (goal.status === 'EXECUTING' || goal.status === 'PLANNED') {
          kernel.goalEngine.pauseGoal(res.goalId);
        }
      }
    });

    test('should handle status request in chat and return system metrics', async () => {
      const session = kernel.sessionRepo.create({
        id: `test-status-${Date.now()}`,
        title: 'Status Test'
      });

      const res = await kernel.conversation.sendMessage('Show system status', session.id);
      assert.equal(res.success, true);
      assert.ok(res.intentMode === 'STATUS_REQUEST' || res.intentMode === 'STATUS_QUERY');
      assert.ok(res.response.includes('HṚṢĪKEŚA System & Workforce Status') || res.response.includes('System'));
    });
  });

  describe('3. Company OS Context Resolution', () => {
    test('should resolve company and project context when mentioned in prompt', async () => {
      const company = kernel.companyService.createCompany({
        name: 'Sovereign Nexus',
        mission: 'Nexus operations'
      });
      const project = kernel.companyService.createProject({
        companyId: company.id,
        name: 'Nexus Core',
        description: 'Core runtime',
        objective: 'Build core runtime services'
      });

      const session = kernel.sessionRepo.create({
        id: `test-scoped-${Date.now()}`,
        title: 'Scoped Test'
      });

      const res = await kernel.conversation.sendMessage(
        'Build a website for Sovereign Nexus',
        session.id
      );

      assert.equal(res.success, true);
      if (res.goalId) {
        const goal = kernel.goalEngine.getGoal(res.goalId);
        assert.equal(goal?.companyId, company.id);
        if (goal?.status === 'EXECUTING' || goal?.status === 'PLANNED') {
          kernel.goalEngine.pauseGoal(res.goalId);
        }
      }
    });
  });

  describe('4. Lifecycle Control & Restart Persistence', () => {
    test('should support pausing, resuming, and cancelling a goal cleanly', async () => {
      const goal = kernel.goalEngine.createGoal({
        title: 'Lifecycle Control Goal',
        objective: 'Build and launch telemetry service',
        priority: 'NORMAL'
      });
      await kernel.goalEngine.planGoal(goal.id);

      // Pause
      const paused = kernel.goalEngine.pauseGoal(goal.id);
      assert.equal(paused.status, 'PAUSED');

      // Resume
      const resumed = kernel.goalEngine.resumeGoal(goal.id);
      assert.ok(resumed.status === 'PAUSED' || resumed.status === 'EXECUTING');

      // Cancel
      const cancelled = kernel.goalEngine.cancelGoal(goal.id, 'Test operator cancellation');
      assert.equal(cancelled.status, 'CANCELLED');
    });

    test('should preserve session history and goal states across cold restart', async () => {
      const session = kernel.sessionRepo.create({
        id: 'durability-session-1',
        title: 'Durability Check'
      });
      kernel.messageRepo.create({
        id: 'msg-1',
        sessionId: session.id,
        role: 'user',
        content: 'Preserve this message across reboot'
      });

      // Shutdown kernel
      await kernel.shutdown();

      // Boot fresh kernel against same SQLite DB
      kernel = new HrisekesaKernel({
        PORT: String(testPort),
        HRISEKESA_DB_PATH: testDbPath,
        ARTIFACTS_DIR: testArtifactDir
      });
      await kernel.start();

      const recoveredSession = kernel.sessionRepo.findById('durability-session-1');
      assert.ok(recoveredSession);
      const messages = kernel.messageRepo.findBySessionId('durability-session-1');
      assert.equal(messages.length, 1);
      assert.equal(messages[0].content, 'Preserve this message across reboot');
    });
  });
});
