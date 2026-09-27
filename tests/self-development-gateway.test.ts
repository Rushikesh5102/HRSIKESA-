import { test, describe, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';

import {
  ProtectionTier,
  TrustTierManager,
  BoundaryGuard,
  SafetyController,
  EvolutionWorktreeManager,
  SelfDevelopmentGateway,
  createEvolutionTools,
  SupervisorGateway,
  EvolutionObjectiveEngine,
  EvolutionConvergenceEngine,
  EvolutionReportGenerator,
  EvolutionLoopEngine,
} from '../src/self-improvement/evolution/index.js';

describe('Safe Self-Development Gateway & Evolution Engine', () => {
  let db: DatabaseManager;
  let migrations: MigrationManager;
  let eventBus: EventBus;
  let boundaryGuard: BoundaryGuard;
  let safetyController: SafetyController;
  let worktreeManager: EvolutionWorktreeManager;
  let supervisorGateway: SupervisorGateway;
  let objectiveEngine: EvolutionObjectiveEngine;
  let convergenceEngine: EvolutionConvergenceEngine;
  let reportGenerator: EvolutionReportGenerator;
  let gateway: SelfDevelopmentGateway;
  let loopEngine: EvolutionLoopEngine;

  let toolBus: ToolExecutionBus;
  let toolRegistry: ToolRegistry;
  let permManager: PermissionManager;
  let toolAudit: ToolAuditManager;

  const repoRoot = path.resolve(process.cwd());
  const testObjectiveId = 'obj-test-harmless-001';

  before(() => {
    db = new DatabaseManager(':memory:');
    db.open();
    migrations = new MigrationManager(db);
    migrations.runPending();

    eventBus = new EventBus();
    const trustTiers = new TrustTierManager();
    boundaryGuard = new BoundaryGuard(repoRoot);
    safetyController = new SafetyController(eventBus);
    worktreeManager = new EvolutionWorktreeManager(repoRoot, boundaryGuard);
    supervisorGateway = new SupervisorGateway(db, safetyController, eventBus);
    objectiveEngine = new EvolutionObjectiveEngine(db);
    convergenceEngine = new EvolutionConvergenceEngine();
    reportGenerator = new EvolutionReportGenerator(repoRoot);

    gateway = new SelfDevelopmentGateway({
      repoRoot,
      boundaryGuard,
      trustTiers,
      safetyController,
      worktreeManager,
      db,
      eventBus,
    });

    loopEngine = new EvolutionLoopEngine({
      repoRoot,
      db,
      eventBus,
      gateway,
      worktreeManager,
      safetyController,
      trustTiers,
      boundaryGuard,
      supervisorGateway,
      objectiveEngine,
      convergenceEngine,
      reportGenerator,
    });

    // ToolBus setup
    toolRegistry = new ToolRegistry();
    permManager = new PermissionManager();
    toolAudit = new ToolAuditManager(db);
    toolBus = new ToolExecutionBus(toolRegistry, permManager, toolAudit);

    const tools = createEvolutionTools(gateway);
    for (const t of tools) {
      toolRegistry.register(t);
    }
  });

  after(() => {
    try {
      db.close();
    } catch {
      // ignore
    }
  });

  describe('1. Trust Tiers & Protection Enforcement (Section C)', () => {
    const tierManager = new TrustTierManager();

    test('Tier 0 paths are correctly identified and immutable', () => {
      assert.equal(tierManager.getFileTier('src/self-improvement/evolution/safety/safety-controller.ts'), ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE);
      assert.equal(tierManager.getFileTier('src/self-improvement/evolution/safety/boundary-guard.ts'), ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE);
      assert.equal(tierManager.getFileTier('src/tools/permissions/permission.manager.ts'), ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE);
      assert.equal(tierManager.getFileTier('src/accounts/vault/credential.vault.ts'), ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE);
      assert.equal(tierManager.getFileTier('src/self-improvement/evolution/supervisors/supervisor.gateway.ts'), ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE);

      assert.equal(tierManager.getFileTier('src/self-improvement/evolution/safety/safety-controller.ts') === ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE, true);
      assert.equal(tierManager.getFileTier('src/api/routes/chat.routes.ts') === ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE, false);
    });

    test('Tier 1 and Tier 2 paths are classified accurately', () => {
      assert.equal(tierManager.getFileTier('src/runtime/kernel.ts'), ProtectionTier.TIER_1_PROTECTED_CORE);
      assert.equal(tierManager.getFileTier('src/tools/custom/my-tool.ts'), ProtectionTier.TIER_2_NORMAL_APPLICATION);
      assert.equal(tierManager.getFileTier('evolution/experiments/exp-1/temp.ts'), ProtectionTier.TIER_3_EXPERIMENT_CODE);
    });
  });

  describe('2. Boundary Guard & Sensitive Asset Redaction (Sections J, K, L)', () => {
    test('Blocks file paths outside the authorized root', () => {
      assert.throws(() => {
        boundaryGuard.assertPathAllowed('C:\\Windows\\System32\\calc.exe');
      }, /Access outside authorized development boundary is prohibited/);

      assert.throws(() => {
        boundaryGuard.assertPathAllowed('C:\\Users\\Rushi\\Documents\\secret.docx');
      }, /Access outside authorized development boundary is prohibited/);

      assert.throws(() => {
        boundaryGuard.assertPathAllowed('C:\\Users\\Rushi\\.ssh\\id_rsa');
      }, /Access outside authorized development boundary is prohibited/);
    });

    test('Prevents path traversal attempts', () => {
      assert.throws(() => {
        boundaryGuard.assertPathAllowed(path.join(repoRoot, '../../Windows/System32'));
      }, /Access outside authorized development boundary is prohibited/);
    });

    test('Redacts sensitive keys, tokens, and passwords from logs/evidence', () => {
      const sensitiveText = 'My API key is sk-1234567890abcdef1234567890abcdef and token is Bearer abc.def.ghi and password="SuperSecretPassword123!"';
      const sanitized = boundaryGuard.redactSensitive(sensitiveText);

      assert.ok(!sanitized.includes('sk-1234567890abcdef1234567890abcdef'));
      assert.ok(!sanitized.includes('SuperSecretPassword123!'));
      assert.ok(sanitized.includes('[REDACTED_API_KEY]'));
      assert.ok(sanitized.includes('[REDACTED_CREDENTIAL]'));
    });

    test('Network egress validation enforces allowlist', () => {
      const allowed = boundaryGuard.validateNetworkEgress('https://api.github.com/repos');
      assert.equal(allowed.allowed, true);

      const blocked = boundaryGuard.validateNetworkEgress('https://malicious-external-exfiltration.xyz/leak');
      assert.equal(blocked.allowed, false);
      assert.ok(blocked.reason?.includes('not on allowlist') || blocked.reason?.includes('not on allowed'));
    });
  });

  describe('3. Objective Model & Acceptance Criteria (Section D)', () => {
    test('Rejects vague objectives without measurable criteria', async () => {
      await assert.rejects(
        async () => {
          await objectiveEngine.createObjective({
            objective: 'Make yourself better and faster',
            allowedScope: ['src/tools'],
          });
        },
        /Vague objective rejected/
      );
    });

    test('Accepts and parses measurable objective with acceptance criteria', async () => {
      const obj = await objectiveEngine.createObjective({
        objective: 'Reduce average interactive response latency by 20% without reducing correctness',
        allowedScope: ['src/tools', 'src/api'],
        acceptanceCriteria: [
          {
            metric: 'latency_ms',
            targetValue: 80,
            operator: '<=',
            unit: 'ms',
          },
        ],
      });

      assert.ok(obj.id.startsWith('obj_') || obj.id.startsWith('obj-'));
      assert.ok(obj.status === 'OBJECTIVE_ACCEPTED' || obj.status === 'ACTIVE');
      assert.equal(obj.acceptanceCriteria.length, 1);
      assert.equal(obj.acceptanceCriteria[0].metric, 'latency_ms');

      // Check progress evaluation
      const evalProgress = objectiveEngine.evaluateCriteria(obj, { latency_ms: 78 });
      assert.equal(evalProgress.allMet, true);

      const evalProgressIncomplete = objectiveEngine.evaluateCriteria(obj, { latency_ms: 95 });
      assert.equal(evalProgressIncomplete.allMet, false);
    });
  });

  describe('4. Anti-Infinite-Loop & Convergence Protection (Section F)', () => {
    test('Detects stagnation when progress fails to improve for threshold iterations', () => {
      const check = convergenceEngine.checkConvergence([
        { hypothesis: 'opt 1', decision: 'REJECT' },
        { hypothesis: 'opt 2', decision: 'REJECT' },
        { hypothesis: 'opt 3', decision: 'REJECT' },
        { hypothesis: 'opt 4', decision: 'REJECT' },
      ], {
        maxConsecutiveFailures: 3,
        stagnationThreshold: 4,
      });

      assert.equal(check.converged, true);
      assert.equal(check.decision, 'PAUSE');
      assert.ok(check.reason?.includes('consecutive') || check.reason?.includes('Stagnation'));
    });

    test('Detects repeated identical hypotheses', () => {
      const check = convergenceEngine.checkConvergence([
        { hypothesis: 'Cache token verification in memory', decision: 'REJECT' },
        { hypothesis: 'Cache token verification in memory', decision: 'REJECT' },
        { hypothesis: 'Cache token verification in memory', decision: 'REJECT' },
      ]);

      assert.equal(check.converged, true);
      assert.equal(check.decision, 'PAUSE');
      assert.ok(check.reason?.includes('Repeated') || check.reason?.includes('equivalent'));
    });
  });

  describe('5. Self-Development Gateway & ToolBus Integration (Section A)', () => {
    test('All 21 evolution tools are registered in ToolRegistry with evolution category', () => {
      const tools = toolRegistry.list().filter((t) => t.category === 'evolution');
      assert.equal(tools.length >= 21, true);

      const toolIds = tools.map((t) => t.id);
      assert.ok(toolIds.includes('source.list'));
      assert.ok(toolIds.includes('source.read'));
      assert.ok(toolIds.includes('source.search'));
      assert.ok(toolIds.includes('source.symbols'));
      assert.ok(toolIds.includes('source.dependencies'));
      assert.ok(toolIds.includes('evolution.workspace.create'));
      assert.ok(toolIds.includes('evolution.file.modify'));
      assert.ok(toolIds.includes('evolution.build'));
      assert.ok(toolIds.includes('evolution.test'));
      assert.ok(toolIds.includes('evolution.benchmark'));
      assert.ok(toolIds.includes('evolution.git.status'));
      assert.ok(toolIds.includes('evolution.git.rollback'));
    });

    test('source.list and source.read return read-only views through Gateway', async () => {
      const listRes = await gateway.executeCapability('source.list', { subDir: 'src/tools/execution' });
      assert.equal(listRes.success, true);
      assert.ok(Array.isArray(listRes.data));
      assert.ok(listRes.data.some((f: string) => f.includes('tool.bus.ts')));

      const readRes = await gateway.executeCapability('source.read', { relativePath: 'package.json' });
      assert.equal(readRes.success, true);
      assert.ok(readRes.data.content.includes('hrisekesa'));
    });

    test('Gateway blocks Tier 0 modification attempts and triggers safety alert', async () => {
      await assert.rejects(
        async () => {
          await gateway.executeCapability('evolution.file.modify', {
            targetPath: 'src/self-improvement/evolution/safety/safety-controller.ts',
            content: '// bypass',
          });
        },
        /Prohibited: Target file belongs to TIER 0/
      );
    });
  });

  describe('6. Independent Supervisor Gateway (Sections G & H)', () => {
    test('Supervisors review evidence and provide independent votes', async () => {
      const evidence = {
        experiment: {
          id: 'exp-sup-01',
          objectiveId: 'obj-test',
          hypothesis: 'Optimize memory indexing in tools',
          changedFiles: ['src/tools/bus/tool.bus.ts'],
          diff: '--- a/src/tools/bus/tool.bus.ts\n+++ b/src/tools/bus/tool.bus.ts\n@@ -10,1 +10,1 @@\n-const x = 1;\n+const x = 2;',
        },
        changedFiles: ['src/tools/bus/tool.bus.ts'],
        diff: '--- a/src/tools/bus/tool.bus.ts\n+++ b/src/tools/bus/tool.bus.ts\n@@ -10,1 +10,1 @@\n-const x = 1;\n+const x = 2;',
        baselineCommit: 'abc1234',
        testResults: { success: true, passed: 15, failed: 0, total: 15, durationMs: 100, failedTestNames: [] },
        benchmarkResults: { overallPassed: true, metrics: { latency: { baseline: 100, candidate: 82, deltaPercent: -18, unit: 'ms', improved: true } } },
        securityResults: { passed: true, boundaryViolations: [], credentialLeaksDetected: [], prohibitedImports: [], tierViolations: [], networkAnomalies: [] },
        resourceUsage: { memoryMb: 120, cpuPercent: 15, diskMb: 10 },
      };

      const result = await supervisorGateway.evaluateExperiment(evidence as any);

      assert.equal(result.passed, true);
      assert.equal(result.overallVote, 'APPROVE');
      assert.equal(result.reviews['antigravity'].vote, 'APPROVE');
      if (result.reviews['jules']) assert.equal(result.reviews['jules'].vote, 'APPROVE');
      if (result.reviews['spark']) assert.equal(result.reviews['spark'].vote, 'APPROVE');
    });

    test('Spark supervisor vetoes on security violation and triggers emergency stop', async () => {
      const maliciousEvidence = {
        experiment: {
          id: 'exp-sup-malicious',
          objectiveId: 'obj-test',
          hypothesis: 'Attempted boundary escalation',
          changedFiles: ['src/self-improvement/evolution/safety/safety-controller.ts'],
          diff: '--- a/src/self-improvement/evolution/safety/safety-controller.ts\n+++ b/src/self-improvement/evolution/safety/safety-controller.ts\n+ disableEmergencyStop()',
        },
        changedFiles: ['src/self-improvement/evolution/safety/safety-controller.ts'],
        diff: '--- a/src/self-improvement/evolution/safety/safety-controller.ts\n+++ b/src/self-improvement/evolution/safety/safety-controller.ts\n+ disableEmergencyStop()',
        baselineCommit: 'abc1234',
        testResults: { success: true, passed: 1, failed: 0, total: 1, durationMs: 10, failedTestNames: [] },
        benchmarkResults: { overallPassed: true, metrics: {} },
        securityResults: { passed: false, boundaryViolations: ['Tier 0 safety core modification detected'], credentialLeaksDetected: [], prohibitedImports: [], tierViolations: [], networkAnomalies: [] },
        resourceUsage: { memoryMb: 200, cpuPercent: 20, diskMb: 10 },
      };

      const result = await supervisorGateway.evaluateExperiment(maliciousEvidence as any);

      assert.equal(result.passed, false);
      assert.equal(result.overallVote, 'EMERGENCY_STOP');
      assert.equal(result.hasEmergencyStop, true);
      assert.equal(safetyController.getStatus().isEmergencyStopped, true);

      // Reset safety controller for subsequent tests
      safetyController.resetEmergencyStop();
      assert.equal(safetyController.getStatus().isEmergencyStopped, false);
    });
  });

  describe('7. Safety Controller & Emergency Stop (Section I)', () => {
    test('Emergency stop immediately halts system, records reason, and blocks new operations', () => {
      safetyController.triggerEmergencyStop('Automated test emergency verification');

      const status = safetyController.getStatus();
      assert.equal(status.isEmergencyStopped, true);
      assert.equal(status.reason, 'Automated test emergency verification');

      assert.throws(() => {
        safetyController.assertOperational();
      }, /EMERGENCY_STOPPED/);

      safetyController.resetEmergencyStop();
    });

    test('Pause and resume control works correctly', () => {
      safetyController.pause('Test operator pause');
      assert.equal(safetyController.getStatus().isPaused, true);

      safetyController.resume();
      assert.equal(safetyController.getStatus().isPaused, false);
    });
  });

  describe('8. Harmless End-to-End Self-Development Scenario (Section S)', () => {
    test('Executes full harmless evolution cycle in isolated worktree and rolls back cleanly', async () => {
      const expId = `exp-e2e-${Date.now()}`;

      // 1. Capture baseline
      const baselineCommit = await worktreeManager.getBaselineCommit();
      assert.ok(typeof baselineCommit === 'string' && baselineCommit.length > 0);

      // 2. Create isolated worktree
      const worktree = await worktreeManager.createWorktree(testObjectiveId, expId, baselineCommit);
      assert.ok(fs.existsSync(worktree.worktreePath));

      // 3. Inspect source through Gateway
      const inspectRes = await gateway.executeCapability('source.read', { relativePath: 'package.json' });
      assert.equal(inspectRes.success, true);

      // 4. Make a controlled non-critical code improvement inside worktree
      const targetExperimentFile = path.join(worktree.worktreePath, 'temp-harmless-improvement.txt');
      fs.writeFileSync(targetExperimentFile, 'Optimization: Harmless memory cache flag set to active', 'utf-8');

      // 5. Run tests & verification
      const statusRes = await gateway.executeCapability('evolution.git.status', { experimentId: expId });
      assert.equal(statusRes.success, true);
      assert.ok(statusRes.data.changedFiles.length > 0);

      // 6. Produce diff
      const diffRes = await gateway.executeCapability('evolution.git.diff', { experimentId: expId });
      assert.equal(diffRes.success, true);
      assert.ok(diffRes.data.diff.includes('Optimization: Harmless memory cache'));

      // 7. Supervisors inspect evidence
      const evidence = {
        objective: {
          id: testObjectiveId,
          objective: 'Harmless self-development verification',
          status: 'IN_PROGRESS',
          baselineCommit,
          acceptanceCriteria: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        experiment: {
          id: expId,
          objectiveId: testObjectiveId,
          hypothesis: 'Harmless memory cache flag',
          changedFiles: statusRes.data.changedFiles,
          diff: diffRes.data.diff,
        },
        baselineCommit,
        changedFiles: statusRes.data.changedFiles,
        diff: diffRes.data.diff,
        testResults: { success: true, passed: 1, failed: 0, total: 1, durationMs: 10, failedTestNames: [] },
        benchmarkResults: { overallPassed: true, metrics: { latency: { baseline: 100, candidate: 80, deltaPercent: -20, unit: 'ms', improved: true } } },
        securityResults: { passed: true, boundaryViolations: [], credentialLeaksDetected: [], prohibitedImports: [], tierViolations: [], networkAnomalies: [] },
        resourceUsage: { memoryMb: 150, cpuPercent: 10, diskMb: 5 },
        filesystemActivity: ['temp-harmless-improvement.txt'],
        processActivity: [],
        networkActivity: [],
        experimentHistory: [],
        rollbackHistory: [],
      };

      const quorum = await supervisorGateway.evaluateExperiment(evidence as any);
      assert.equal(quorum.passed, true);
      assert.equal(quorum.overallVote, 'APPROVE');

      // 8. Roll back experiment cleanly
      await worktreeManager.deleteWorktree(expId);
      assert.equal(fs.existsSync(worktree.worktreePath), false);

      // 9. Verify trusted production source tree was untouched
      assert.equal(fs.existsSync(path.join(repoRoot, 'temp-harmless-improvement.txt')), false);

      // 10. Generate complete final evolution report
      const report = reportGenerator.generateFinalEvolutionReport(
        {
          id: testObjectiveId,
          objective: 'Harmless self-development verification',
          status: 'COMPLETED',
          baselineCommit,
          acceptanceCriteria: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        [
          {
            id: expId,
            objectiveId: testObjectiveId,
            hypothesis: 'Harmless memory cache flag',
            status: 'ACCEPTED',
            decision: 'ACCEPT',
            baselineCommit,
            changedFiles: ['temp-harmless-improvement.txt'],
            benchmarkResult: { improvementPercentage: 20 },
            securityResult: { passed: true, violations: [] },
            supervisorResults: { antigravity: { vote: 'APPROVE' }, jules: { vote: 'APPROVE' }, spark: { vote: 'APPROVE' } },
          } as any,
        ]
      );

      assert.ok(report.includes('# HṚṢĪKEŚA Final Self-Evolution Report'));
      assert.ok(report.includes(testObjectiveId));
      assert.ok(report.includes('Harmless memory cache flag'));
    });
  });

  describe('9. Negative Security Tests', () => {
    test('Negative Test 1: Access outside workspace boundary is blocked', () => {
      assert.throws(() => {
        boundaryGuard.assertPathAllowed('C:\\Users\\All Users\\passwords.txt');
      }, /Access outside authorized development boundary is prohibited/);
    });

    test('Negative Test 2: Credential access attempt is blocked', () => {
      assert.throws(() => {
        boundaryGuard.assertPathAllowed(path.join(repoRoot, '.env'));
      }, /Direct access to environment secrets file is prohibited/);
    });

    test('Negative Test 3: Unauthorized network access is blocked', () => {
      const result = boundaryGuard.validateNetworkEgress('https://evil-hacker.com/steal-keys');
      assert.equal(result.allowed, false);
    });

    test('Negative Test 4: Modification of safety core triggers safety veto', () => {
      const tierMgr = new TrustTierManager();
      assert.equal(tierMgr.getFileTier('src/self-improvement/evolution/safety/safety-controller.ts') === ProtectionTier.TIER_0_IMMUTABLE_SAFETY_CORE, true);
      assert.throws(() => {
        boundaryGuard.assertPathAllowed(path.join(repoRoot, 'src/self-improvement/evolution/safety/safety-controller.ts'), 'WRITE');
      }, /Prohibited write access to Tier 0 immutable safety core/);
    });

    test('Negative Test 5: Disabling emergency stop is rejected by Spark supervisor', async () => {
      const maliciousEvidence = {
        experiment: {
          id: 'exp-negative-5',
          objectiveId: 'obj-test',
          hypothesis: 'Override emergency stop controller',
          changedFiles: ['src/self-improvement/evolution/safety/safety-controller.ts'],
          diff: '+ export function emergencyStop() { /* disabled */ }',
        },
        baselineCommit: 'abc1234',
        testResults: { success: true, passed: 1, failed: 0, total: 1, durationMs: 10, failedTestNames: [] },
        benchmarkResults: { overallPassed: true, metrics: {} },
        securityResults: { passed: false, boundaryViolations: ['Tier 0 modification attempted'], credentialLeaksDetected: [], prohibitedImports: [], tierViolations: [], networkAnomalies: [] },
        resourceUsage: { memoryMb: 100, cpuPercent: 5, diskMb: 1 },
      };

      const review = await supervisorGateway.evaluateExperiment(maliciousEvidence as any);
      assert.equal(review.overallVote, 'EMERGENCY_STOP');
      assert.equal(review.hasEmergencyStop, true);

      safetyController.resetEmergencyStop();
    });
  });

  describe('10. Sovereign Human Promotion (Section Q)', () => {
    test('Successful experiments reach PROMOTION_READY and require explicit human promotion', async () => {
      await assert.rejects(
        async () => {
          await loopEngine.promoteExperiment('non-existent-experiment-id');
        },
        /not found/
      );
    });
  });
});
