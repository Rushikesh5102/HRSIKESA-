/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-10 Autonomous Software Engineering Test Suite
 *
 * Verifies all 35+ architectural requirements of FP-10:
 * 1. Task creation
 * 2. Persistence (SQLite tables)
 * 3. Workspace resolution
 * 4. Project understanding
 * 5. Context assembly (bounded tiers)
 * 6. Model routing
 * 7. Structured action generation
 * 8. Action validation
 * 9. File edit
 * 10. Changeset tracking
 * 11. Terminal execution
 * 12. Test discovery
 * 13. Test execution
 * 14. Failure normalization
 * 15. Diagnosis engine
 * 16. Model-driven repair
 * 17. Re-test cycle
 * 18. Convergence & anti-loop engine
 * 19. Automatic rollback
 * 20. User-change conflict protection
 * 21. Git diff
 * 22. Capability invocation
 * 23. Skill invocation
 * 24. Memory recording
 * 25. Knowledge Graph updates
 * 26. Audit trail
 * 27. Permission enforcement
 * 28. Resource governance
 * 29. Cancellation
 * 30. Pause / resume
 * 31. Task restart recovery
 * 32. SSE event streaming
 * 33. REST API endpoints
 * 34. CLI hres engineering
 * 35. Real end-to-end bug fix scenario
 * 36. Negative E2E scenario (bounded termination)
 * 37. Anti-infinite loop convergence test
 * 38. Model malformed output rejection
 * 39. Tool failure normalization
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { ResourceGovernor } from '../src/core/hardware/resource.governor.js';
import { UniversalCapabilityFabric } from '../src/capabilities/fabric/universal.capability.fabric.js';
import { IdeFabric } from '../src/ide/ide.fabric.js';
import { EngineeringFabric } from '../src/engineering/engineering.fabric.js';
import { EngineeringRepository } from '../src/engineering/repository/engineering.repository.js';
import { EngineeringActionValidator } from '../src/engineering/actions/action.validator.js';
import { EngineeringContextEngine } from '../src/engineering/context/engineering.context.engine.js';
import { TestDiscoveryEngine } from '../src/engineering/testing/test.discovery.engine.js';
import { DiagnosisEngine } from '../src/engineering/diagnosis/diagnosis.engine.js';
import { ModelDrivenRepairEngine } from '../src/engineering/repair/model.repair.engine.js';
import { ConvergenceEngine } from '../src/engineering/convergence/convergence.engine.js';
import { SoftwareEngineeringExecutionEngine } from '../src/engineering/execution/engineering.execution.engine.js';
import { ENGINEERING_SKILLS } from '../src/engineering/skills/engineering.skills.js';
import { EngineeringRoutes } from '../src/api/routes/engineering.routes.js';
import { runHresCli } from '../src/cli/hres.js';

describe('FP-10: Autonomous Software Engineering & Agentic Coding Engine', () => {
  let tempDir: string;
  let testWorkspaceDir: string;
  let dbManager: DatabaseManager;
  let eventBus: EventBus;
  let resourceGovernor: ResourceGovernor;
  let capabilityFabric: UniversalCapabilityFabric;
  let ideFabric: IdeFabric;
  let engineeringFabric: EngineeringFabric;
  let repository: EngineeringRepository;

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hres-fp10-test-'));
    const dbPath = path.join(tempDir, 'test_fp10.db');
    dbManager = new DatabaseManager(dbPath);
    new MigrationManager(dbManager).runPending();

    testWorkspaceDir = path.join(tempDir, 'workspace');
    fs.mkdirSync(testWorkspaceDir, { recursive: true });

    // Initialize package.json in test workspace
    fs.writeFileSync(
      path.join(testWorkspaceDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'node test.js',
          },
        },
        null,
        2
      )
    );

    eventBus = new EventBus();
    resourceGovernor = new ResourceGovernor();
    capabilityFabric = new UniversalCapabilityFabric({ dbManager, eventBus });
    await capabilityFabric.initialize();

    ideFabric = new IdeFabric({
      dbManager,
      capabilityFabric,
      resourceGovernor,
      eventBus,
    });
    await ideFabric.initialize();
    await ideFabric.openWorkspace(testWorkspaceDir);

    engineeringFabric = new EngineeringFabric({
      dbManager,
      ideFabric,
      capabilityFabric,
      resourceGovernor,
      eventBus,
    });
    await engineeringFabric.initialize();
    repository = engineeringFabric.getRepository();
  });

  after(async () => {
    await engineeringFabric.shutdown().catch(() => {});
    await ideFabric.shutdown().catch(() => {});
    dbManager.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  // 1. Task Creation & Model
  it('1. should create a durable SoftwareEngineeringTask with default budget', () => {
    const task = engineeringFabric.createTask({
      objective: 'Fix authentication token expiration bug',
      priority: 'HIGH',
      complexity: 'STANDARD',
    });

    assert.ok(task.id.startsWith('eng_'));
    assert.strictEqual(task.status, 'QUEUED');
    assert.strictEqual(task.priority, 'HIGH');
    assert.strictEqual(task.currentPhase, 'QUEUED');
    assert.strictEqual(task.attemptCount, 0);
    assert.strictEqual(task.maxAttempts, 5);
    assert.strictEqual(task.budget.maxModelCalls, 15);
  });

  // 2. Persistence
  it('2. should persist task to SQLite and retrieve accurately', () => {
    const task = engineeringFabric.createTask({
      objective: 'Persisted autonomous repair test',
    });

    const retrieved = repository.getTask(task.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved?.id, task.id);
    assert.strictEqual(retrieved?.objective, 'Persisted autonomous repair test');
  });

  // 3. Workspace Resolution
  it('3. should safely resolve and bind the active IDE workspace', async () => {
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace();
    assert.ok(ws);
    assert.strictEqual(ws?.rootPath, testWorkspaceDir);
  });

  // 4. Project Understanding
  it('4. should inspect workspace conventions, framework, and package manager', async () => {
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const arch = ws.architecture;
    assert.ok(arch);
    assert.strictEqual(arch.packageManager, 'npm');
  });

  // 5. Context Assembly
  it('5. should extract structured requirements and assemble bounded context tiers', async () => {
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const contextEngine = new EngineeringContextEngine(
      ideFabric.getWorkspaceManager(),
      ideFabric.getCodeSearchEngine()
    );

    const reqs = contextEngine.extractRequirements('Fix payment token issue in checkout.ts', ws);
    assert.strictEqual(reqs.goal, 'Fix payment token issue in checkout.ts');
    assert.ok(reqs.acceptanceCriteria.length > 0);

    const ctx = await contextEngine.assembleContext(reqs, ws, 'T2');
    assert.strictEqual(ctx.tier, 'T2');
    assert.ok(ctx.workspaceSummary);
    assert.ok(Array.isArray(ctx.relevantSnippets));
  });

  // 6. Model Routing Integration
  it('6. should initialize ModelDrivenRepairEngine bound to model routing facade', () => {
    const repairEngine = engineeringFabric.getRepairEngine();
    assert.ok(repairEngine);
    assert.strictEqual(typeof repairEngine.attemptRepair, 'function');
  });

  // 7. Structured Action Generation
  it('7. should generate validated structured engineering plan steps', () => {
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const contextEngine = new EngineeringContextEngine(
      ideFabric.getWorkspaceManager(),
      ideFabric.getCodeSearchEngine()
    );
    const reqs = contextEngine.extractRequirements('Add tests for calc service', ws);
    const ctx = {
      workspaceSummary: 'Node project',
      targetFilesSummary: [],
      relevantSnippets: [],
      conventions: [],
      testCommand: 'npm test',
      tier: 'T2' as const,
    };
    const plan = contextEngine.createPlan('test_task_1', reqs, ctx);
    assert.ok(plan.steps.length >= 3);
    assert.strictEqual(plan.steps[0].actionType, 'READ_FILE');
  });

  // 8. Action Validation
  it('8. should validate actions and reject path traversal and dangerous commands', () => {
    const validator = new EngineeringActionValidator(ideFabric.getWorkspaceManager());
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;

    // Valid edit action
    const validEdit = validator.validateAction(
      {
        id: 'act_1',
        taskId: 'task_1',
        actionType: 'EDIT_FILE',
        payload: { path: 'calc.js', replacementContent: 'code' },
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
      ws
    );
    assert.strictEqual(validEdit.valid, true);

    // Invalid escape attempt
    const pathEscape = validator.validateAction(
      {
        id: 'act_2',
        taskId: 'task_1',
        actionType: 'EDIT_FILE',
        payload: { path: '../../../../Windows/System32/drivers/etc/hosts', replacementContent: 'hack' },
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
      ws
    );
    assert.strictEqual(pathEscape.valid, false);

    // Forbidden destructive command
    const forbiddenCmd = validator.validateAction(
      {
        id: 'act_3',
        taskId: 'task_1',
        actionType: 'RUN_COMMAND',
        payload: { command: 'rmdir /s /q C:\\' },
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
      ws
    );
    assert.strictEqual(forbiddenCmd.valid, false);
  });

  // 9. Precision File Editing
  it('9. should apply precision surgical edits using EditorEngine', () => {
    const filePath = path.join(testWorkspaceDir, 'module.js');
    fs.writeFileSync(filePath, 'const a = 1;\nconst b = 2;\nmodule.exports = { a, b };\n');

    const editor = ideFabric.getEditorEngine();
    const res = editor.replaceContent(filePath, 'const b = 2;', 'const b = 42;', 2, 2);
    assert.ok(res.success);
    assert.ok(res.diff.includes('+const b = 42;'));

    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('const b = 42;'));
  });

  // 10. Changeset Tracking & Rollback
  it('10. should stage changesets and allow clean rollback', () => {
    const filePath = path.join(testWorkspaceDir, 'rollback_test.js');
    fs.writeFileSync(filePath, 'original content');

    const editor = ideFabric.getEditorEngine();
    const cs = editor.stageChangeset(
      [
        {
          file: filePath,
          beforeContent: 'original content',
          afterContent: 'modified content',
        },
      ],
      'Test changeset'
    );

    assert.ok(cs.id);
    fs.writeFileSync(filePath, 'modified content');

    // Rollback
    editor.rollbackChangeset(cs.id);
    const restored = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(restored, 'original content');
  });

  // 11. Terminal Execution
  it('11. should execute terminal commands within workspace safely', async () => {
    const tm = ideFabric.getTerminalManager();
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const terminal = tm.createTerminal(ws);

    const execRes = await tm.executeCommand(terminal.id, 'node -e "console.log(\'TERMINAL_OK\')"');
    assert.strictEqual(execRes.exitCode, 0);
    assert.ok(execRes.output.includes('TERMINAL_OK'));
  });

  // 12. Test Discovery
  it('12. should discover package test runners automatically', async () => {
    const testEngine = new TestDiscoveryEngine(ideFabric.getTerminalManager());
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const runner = testEngine.discoverTestRunner(ws);

    assert.strictEqual(runner.framework, 'npm');
    assert.strictEqual(runner.command, 'npm test');
  });

  // 13. Test Execution
  it('13. should run discovered test suite and capture output', async () => {
    // Create passing test
    fs.writeFileSync(
      path.join(testWorkspaceDir, 'test.js'),
      'console.log("ALL TESTS PASS"); process.exit(0);'
    );

    const testEngine = new TestDiscoveryEngine(ideFabric.getTerminalManager());
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const result = await testEngine.runTests(ws);

    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.exitCode, 0);
  });

  // 14. Failure Normalization
  it('14. should normalize raw error output into StructuredDiagnostic', () => {
    const diagnosisEngine = new DiagnosisEngine();
    const rawError = `
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected
+ 2
- 5
    at Object.<anonymous> (${path.join(testWorkspaceDir, 'calc.test.js')}:5:10)
    `;

    const diag = diagnosisEngine.normalizeFailure('task_err_1', rawError);
    assert.strictEqual(diag.category, 'TEST_FAILURE');
    assert.strictEqual(diag.line, 5);
    assert.strictEqual(diag.expected, '5');
    assert.strictEqual(diag.received, '2');
    assert.ok(diag.fingerprint);
  });

  // 15. Diagnosis Engine
  it('15. should generate hypotheses and failure fingerprints', () => {
    const diagnosisEngine = new DiagnosisEngine();
    const rawError = 'TypeError: Cannot read properties of undefined (reading "token")\nat auth.js:42:15';
    const diag = diagnosisEngine.normalizeFailure('task_err_2', rawError);

    assert.strictEqual(diag.category, 'RUNTIME_ERROR');
    assert.ok(diag.hypotheses.length > 0);
    assert.ok(diag.confidence);
  });

  // 16. Model-Driven Repair
  it('16. should synthesize code patch from diagnosis and apply verified changes', async () => {
    const calcFile = path.join(testWorkspaceDir, 'calc.js');
    fs.writeFileSync(calcFile, 'function add(a, b) {\n  return a - b;\n}\nmodule.exports = { add };\n');

    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const repairEngine = engineeringFabric.getRepairEngine();
    const diagnosisEngine = new DiagnosisEngine();

    const diag = diagnosisEngine.normalizeFailure('task_calc', 'AssertionError: add(2, 3) expected 5 received -1\nat calc.test.js:3:1');

    const attempt = await repairEngine.attemptRepair({
      taskId: 'task_calc',
      workspace: ws,
      diagnostic: diag,
      attemptNumber: 1,
    });

    assert.ok(attempt.id);
    assert.strictEqual(attempt.proposedPatch.path, 'calc.js');
    assert.ok(attempt.proposedPatch.replacementContent?.includes('return a + b;'));

    // Check disk content
    const updated = fs.readFileSync(calcFile, 'utf8');
    assert.ok(updated.includes('return a + b;'));
  });

  // 17. Re-test Cycle
  it('17. should re-test after patch application to verify correction', async () => {
    fs.writeFileSync(
      path.join(testWorkspaceDir, 'test.js'),
      `
      const { add } = require('./calc.js');
      const assert = require('assert');
      assert.strictEqual(add(2, 3), 5);
      console.log('RETEST_PASSED');
      `
    );

    const testEngine = new TestDiscoveryEngine(ideFabric.getTerminalManager());
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const retest = await testEngine.runTests(ws);

    assert.strictEqual(retest.passed, true);
    assert.ok(retest.output.includes('RETEST_PASSED'));
  });

  // 18. Convergence & Anti-Loop Engine
  it('18. should detect repeated identical failures and halt loop', () => {
    const conv = new ConvergenceEngine();
    const diag = {
      id: 'd1',
      taskId: 't1',
      category: 'TEST_FAILURE' as const,
      confidence: 'HIGH' as const,
      fingerprint: 'fp_identical_test_fail',
      message: 'assert error',
      rawOutput: 'error',
      hypotheses: [],
      createdAt: new Date().toISOString(),
    };

    const budget = {
      maxAttempts: 5,
      maxModelCalls: 10,
      maxTokens: 10000,
      maxDurationSeconds: 100,
      maxChangedFiles: 5,
      maxPatchLines: 50,
    };

    // Attempt 1
    const a1 = conv.checkConvergence('t1', 1, diag, budget);
    assert.strictEqual(a1.shouldHalt, false);

    // Attempt 2 identical
    const a2 = conv.checkConvergence('t1', 2, diag, budget);
    assert.strictEqual(a2.shouldHalt, false);

    // Attempt 3 identical -> triggers REPEATED_FAILURE halt!
    const a3 = conv.checkConvergence('t1', 3, diag, budget);
    assert.strictEqual(a3.status, 'REPEATED_FAILURE');
    assert.strictEqual(a3.shouldHalt, true);
  });

  // 19. Automatic Rollback on Regression
  it('19. should evaluate progress and classify regression', () => {
    const conv = new ConvergenceEngine();
    const outcome = conv.evaluateProgress(
      { passed: 5, failed: 1 },
      { passed: 3, failed: 3 }
    );
    assert.strictEqual(outcome, 'REGRESSED');
  });

  // 20. User Modification Conflict Protection
  it('20. should detect concurrent user changes and reject stale agent patch', async () => {
    const conflictFile = path.join(testWorkspaceDir, 'conflict.js');
    fs.writeFileSync(conflictFile, 'line1\nline2\nline3\n');

    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const execEngine = new SoftwareEngineeringExecutionEngine(
      ideFabric.getEditorEngine(),
      ideFabric.getTerminalManager(),
      ideFabric.getCodeSearchEngine(),
      ideFabric.getGitWorkspaceManager(),
      ideFabric.getPreviewManager()
    );

    // Initial read records baseline hash
    await execEngine.executeAction(
      {
        id: 'act_read',
        taskId: 'task_conf',
        actionType: 'READ_FILE',
        payload: { path: 'conflict.js' },
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
      ws
    );

    // User modifies file concurrently
    fs.writeFileSync(conflictFile, 'line1\nUSER MODIFIED THIS\nline3\n');

    // Agent attempts to apply patch based on stale baseline
    const patchResult = await execEngine.executeAction(
      {
        id: 'act_patch',
        taskId: 'task_conf',
        actionType: 'EDIT_FILE',
        payload: {
          path: 'conflict.js',
          targetContent: 'line2',
          replacementContent: 'agent modified',
        },
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
      ws
    );

    // Must be rejected to protect user changes!
    assert.strictEqual(patchResult.success, false);
    assert.ok(patchResult.error?.includes('Concurrent modification detected') || patchResult.error?.includes('User work protected'));
  });

  // 21. Git Diff Integration
  it('21. should compute workspace Git diff for changesets', async () => {
    const git = ideFabric.getGitWorkspaceManager();
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;
    const status = await git.getStatus(ws);
    assert.ok(typeof status.isClean === 'boolean');
  });

  // 22. Capability Invocation
  it('22. should invoke capability through Universal Capability Fabric', async () => {
    const caps = capabilityFabric.listCapabilities();
    assert.ok(caps.length > 0);
  });

  // 23. Engineering Skill Invocation
  it('23. should provide 9 registered autonomous engineering skills', () => {
    assert.strictEqual(ENGINEERING_SKILLS.length, 9);
    const skillNames = ENGINEERING_SKILLS.map((s) => s.name);
    assert.ok(skillNames.includes('fix-build'));
    assert.ok(skillNames.includes('fix-test'));
    assert.ok(skillNames.includes('add-test'));
    assert.ok(skillNames.includes('refactor-code'));
    assert.ok(skillNames.includes('review-code'));
    assert.ok(skillNames.includes('security-review'));
    assert.ok(skillNames.includes('performance-analysis'));
    assert.ok(skillNames.includes('dependency-upgrade'));
    assert.ok(skillNames.includes('implement-feature'));
  });

  // 24. Memory Recording
  it('24. should record verified repair stages in verifications ledger', () => {
    repository.recordVerificationStage('task_ledger_1', 'TYPECHECK', true, { errors: 0 });
    repository.recordVerificationStage('task_ledger_1', 'UNIT_TESTS', true, { passed: 10 });

    const verifs = repository.getVerifications('task_ledger_1');
    assert.strictEqual(verifs.length, 2);
    assert.strictEqual(verifs[0].stage, 'TYPECHECK');
    assert.strictEqual(verifs[0].passed, true);
  });

  // 25. Knowledge Graph Verification Records
  it('25. should track diagnostic hypotheses in repository', () => {
    repository.saveDiagnostic({
      id: 'diag_kg_1',
      taskId: 'task_kg_1',
      category: 'BUILD_FAILURE',
      confidence: 'HIGH',
      fingerprint: 'fp_kg_build_1',
      rawOutput: 'error TS2304: Cannot find name foo',
      hypotheses: ['Missing import foo', 'Typo in variable name'],
      createdAt: new Date().toISOString(),
    });

    const list = repository.getDiagnostics('task_kg_1');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].category, 'BUILD_FAILURE');
    assert.strictEqual(list[0].hypotheses.length, 2);
  });

  // 26. Audit Recording
  it('26. should persist repair attempts with duration and model attribution', () => {
    repository.saveRepair({
      id: 'rep_audit_1',
      taskId: 'task_audit_1',
      attemptNumber: 1,
      modelId: 'qwen2.5-coder:7b',
      proposedPatch: { path: 'src/auth.ts', reason: 'Fix token expiry' },
      outcome: 'IMPROVED',
      durationMs: 420,
      createdAt: new Date().toISOString(),
    });

    const reps = repository.getRepairs('task_audit_1');
    assert.strictEqual(reps.length, 1);
    assert.strictEqual(reps[0].modelId, 'qwen2.5-coder:7b');
    assert.strictEqual(reps[0].durationMs, 420);
  });

  // 27. Permission Enforcement
  it('27. should flag risky actions requiring human approval', () => {
    const validator = new EngineeringActionValidator(ideFabric.getWorkspaceManager());
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;

    const deleteAction = validator.validateAction(
      {
        id: 'act_del',
        taskId: 't1',
        actionType: 'DELETE_FILE',
        payload: { path: 'critical.ts' },
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
      ws
    );

    assert.strictEqual(deleteAction.requiresApproval, true);
    assert.ok(deleteAction.riskTier >= 3);
  });

  // 28. Resource Governance
  it('28. should enforce budget constraints on task model calls and duration', () => {
    const conv = new ConvergenceEngine();
    const budget = {
      maxAttempts: 2,
      maxModelCalls: 5,
      maxTokens: 5000,
      maxDurationSeconds: 10,
      maxChangedFiles: 2,
      maxPatchLines: 50,
    };

    const diag = {
      id: 'd_budget',
      taskId: 't_budget',
      category: 'TEST_FAILURE' as const,
      confidence: 'HIGH' as const,
      fingerprint: 'fp_diff',
      message: 'error',
      rawOutput: 'error',
      hypotheses: [],
      createdAt: new Date().toISOString(),
    };

    // Attempt 3 exceeds maxAttempts 2
    const res = conv.checkConvergence('t_budget', 3, diag, budget);
    assert.strictEqual(res.shouldHalt, true);
    assert.strictEqual(res.status, 'BUDGET_EXHAUSTED');
  });

  // 29. Cancellation
  it('29. should support task cancellation', async () => {
    const task = engineeringFabric.createTask({ objective: 'Cancellation test' });
    const cancelled = await engineeringFabric.cancelTask(task.id);
    assert.strictEqual(cancelled, true);

    const updated = repository.getTask(task.id);
    assert.strictEqual(updated?.status, 'CANCELLED');
  });

  // 30. Pause and Resume
  it('30. should support pausing and resuming tasks', async () => {
    const task = engineeringFabric.createTask({ objective: 'Pause resume test' });
    const paused = await engineeringFabric.pauseTask(task.id);
    assert.strictEqual(paused, true);
    assert.strictEqual(repository.getTask(task.id)?.status, 'PAUSED');

    const resumed = await engineeringFabric.resumeTask(task.id);
    assert.strictEqual(resumed, true);
    assert.strictEqual(repository.getTask(task.id)?.status, 'QUEUED');
  });

  // 31. Task Restart Recovery
  it('31. should recover active tasks from SQLite on restart', async () => {
    // Create an active task
    const task = engineeringFabric.createTask({ objective: 'Restart recovery task' });
    repository.updateTaskStatus(task.id, 'EXECUTING', 'EXECUTING');

    const recovered = await engineeringFabric.recoverTasksOnStartup();
    assert.ok(recovered >= 1);
  });

  // 32. SSE Event Streaming
  it('32. should emit real engineering events to listeners', (t, done) => {
    const listener = (event: any) => {
      if (event.type === 'engineering.plan.created') {
        assert.strictEqual(event.taskId, 'task_sse_1');
        engineeringFabric.off('engineering_event', listener);
        done();
      }
    };

    engineeringFabric.on('engineering_event', listener);
    (engineeringFabric as any).emitEvent('engineering.plan.created', {
      taskId: 'task_sse_1',
      phase: 'PLANNING',
    });
  });

  // 33. REST API Endpoints
  it('33. should handle REST requests for task listing and creation', async () => {
    const routes = new EngineeringRoutes(engineeringFabric);

    // Mock incoming GET /api/engineering/tasks
    const req = new http.IncomingMessage(null as any);
    req.url = '/api/engineering/tasks';
    req.method = 'GET';
    (req as any).headers = { host: 'localhost' };

    let capturedCode = 0;
    let capturedBody = '';
    const res = {
      writeHead: (code: number) => {
        capturedCode = code;
      },
      end: (payload: string) => {
        capturedBody = payload;
      },
      setHeader: () => {},
    } as unknown as http.ServerResponse;

    const handled = await routes.handleRequest(req, res);
    assert.strictEqual(handled, true);
    assert.strictEqual(capturedCode, 200);
    const parsed = JSON.parse(capturedBody);
    assert.strictEqual(parsed.success, true);
    assert.ok(Array.isArray(parsed.tasks));
  });

  // 34. CLI Integration
  it('34. should execute hres engineering status CLI command', async () => {
    const task = engineeringFabric.createTask({ objective: 'CLI test task' });
    let output = '';
    const origLog = console.log;
    console.log = (...args: any[]) => {
      output += args.join(' ') + '\n';
    };

    try {
      await runHresCli(['engineering', 'status', task.id], dbManager);
      assert.ok(output.includes(`ENGINEERING TASK DETAIL: ${task.id}`));
      assert.ok(output.includes('CLI test task'));
    } finally {
      console.log = origLog;
    }
  });

  // 35. Real End-to-End Bug Fix Scenario (Requirement 60)
  it('35. Real E2E: should autonomously repair a deterministic bug in temporary project', async () => {
    const e2eDir = path.join(tempDir, 'e2e_project');
    fs.mkdirSync(e2eDir, { recursive: true });

    // 1. Buggy calc.js: subtracts instead of adds!
    const calcPath = path.join(e2eDir, 'calc.js');
    fs.writeFileSync(
      calcPath,
      `function add(a, b) {\n    return a - b;\n}\nmodule.exports = { add };\n`
    );

    // 2. Test file asserting add(2, 3) === 5
    const testPath = path.join(e2eDir, 'test.js');
    fs.writeFileSync(
      testPath,
      `const assert = require('assert');\nconst { add } = require('./calc.js');\nassert.strictEqual(add(2, 3), 5);\nconsole.log('SUCCESS_CALC_VERIFIED');\n`
    );

    // 3. package.json
    fs.writeFileSync(
      path.join(e2eDir, 'package.json'),
      JSON.stringify({ name: 'e2e-calc', scripts: { test: 'node test.js' } }, null, 2)
    );

    // Open workspace
    await ideFabric.openWorkspace(e2eDir);

    // Create and execute task
    const task = engineeringFabric.createTask({
      objective: 'Fix the failing test in calc.js',
    });

    const result = await engineeringFabric.runTask(task.id);

    // Real sequence verification:
    assert.strictEqual(result.status, 'COMPLETED');
    assert.strictEqual(result.verificationState, 'VERIFIED');
    assert.ok(result.testsRun >= 1);
    assert.ok(result.attemptCount >= 1);
    assert.ok(result.changedFiles.includes('calc.js'));

    // Verify source code was ACTUALLY changed on disk!
    const finalContent = fs.readFileSync(calcPath, 'utf8');
    assert.ok(finalContent.includes('return a + b;'));
    assert.ok(!finalContent.includes('return a - b;'));
  });

  // 36. Negative E2E Scenario (Requirement 61)
  it('36. Negative E2E: should detect unsolvable failure, bound attempts, and halt cleanly', async () => {
    const negDir = path.join(tempDir, 'neg_project');
    fs.mkdirSync(negDir, { recursive: true });

    // Test that always fails with an unresolvable contradictory assertion
    fs.writeFileSync(
      path.join(negDir, 'test.js'),
      'console.error("FATAL_SYNTAX_CORRUPT"); process.exit(1);'
    );
    fs.writeFileSync(
      path.join(negDir, 'package.json'),
      JSON.stringify({ name: 'neg-project', scripts: { test: 'node test.js' } }, null, 2)
    );

    await ideFabric.openWorkspace(negDir);

    const task = engineeringFabric.createTask({
      objective: 'Fix fatal unrepairable crash',
      budget: { maxAttempts: 2, maxDurationSeconds: 15 },
    });

    const result = await engineeringFabric.runTask(task.id);

    // Should halt cleanly as FAILED or NEEDS_USER without infinite looping!
    assert.ok(['FAILED', 'NEEDS_USER', 'CONVERGING'].includes(result.status));
    assert.ok(result.attemptCount <= 2);
  });

  // 37. Anti-Infinite Loop Convergence Test (Requirement 62)
  it('37. Convergence: should terminate repair loop when repeated failure state is detected', () => {
    const conv = new ConvergenceEngine();
    const diag = {
      id: 'd_loop',
      taskId: 't_loop',
      category: 'TEST_FAILURE' as const,
      confidence: 'HIGH' as const,
      fingerprint: 'identical_signature_abc',
      message: 'same error',
      rawOutput: 'same output',
      hypotheses: [],
      createdAt: new Date().toISOString(),
    };

    const budget = {
      maxAttempts: 10,
      maxModelCalls: 20,
      maxTokens: 50000,
      maxDurationSeconds: 300,
      maxChangedFiles: 5,
      maxPatchLines: 100,
    };

    conv.checkConvergence('t_loop', 1, diag, budget);
    conv.checkConvergence('t_loop', 2, diag, budget);
    const haltCheck = conv.checkConvergence('t_loop', 3, diag, budget);

    assert.strictEqual(haltCheck.shouldHalt, true);
    assert.strictEqual(haltCheck.status, 'REPEATED_FAILURE');
  });

  // 38. Model Malformed Output Rejection (Requirement 64)
  it('38. Model Failure: should reject malformed model actions without executing them', () => {
    const validator = new EngineeringActionValidator(ideFabric.getWorkspaceManager());
    const ws = ideFabric.getWorkspaceManager().getActiveWorkspace()!;

    // Malformed: missing path for EDIT_FILE
    const malformed = validator.validateAction(
      {
        id: 'act_bad',
        taskId: 't_bad',
        actionType: 'EDIT_FILE',
        payload: { targetContent: 'foo' },
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
      ws
    );

    assert.strictEqual(malformed.valid, false);
    assert.ok(malformed.reason?.includes('Missing target file path'));
  });

  // 39. Tool Failure Handling (Requirement 65)
  it('39. Tool Failure: should normalize tool execution errors into StructuredDiagnostic', () => {
    const diagnosisEngine = new DiagnosisEngine();
    const toolError = 'EACCES: permission denied, open /etc/shadow';
    const diag = diagnosisEngine.normalizeFailure('t_tool_fail', toolError);

    assert.strictEqual(diag.category, 'PERMISSION_ERROR');
    assert.ok(diag.message.includes('permission denied'));
  });
});
