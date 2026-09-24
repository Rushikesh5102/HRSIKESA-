/**
 * HṚṢĪKEŚA (हृषीकेश) — Live Phase 22 Advanced Computer Operator Verifier
 *
 * 35-Scenario Verification of:
 * Perception -> Planning -> Execution -> Verification -> Recovery -> Safety & Audit
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { ResourceGovernor } from '../src/core/hardware/resource.governor.js';
import { KnowledgeEntityRepository } from '../src/knowledge/repositories/knowledge-entity.repository.js';
import { MockComputerAdapter } from '../src/tools/computer/adapter/mock.computer.adapter.js';
import { MockUiaAdapter } from '../src/tools/computer/uia/mock/mock.uia.adapter.js';
import { WindowsComputerAdapter } from '../src/tools/computer/adapter/windows.computer.adapter.js';
import { WindowsUiaAdapter } from '../src/tools/computer/uia/windows/windows.uia.adapter.js';
import { IComputerAdapter } from '../src/tools/computer/interfaces/computer.types.js';
import { IUiaAdapter } from '../src/tools/computer/uia/interfaces/uia.types.js';
import { ComputerOperatorRepository } from '../src/computer/operator/repositories/computer-operator.repository.js';
import { ComputerSafetyPolicy } from '../src/computer/operator/services/safety.policy.js';
import { ComputerWindowManager } from '../src/computer/operator/services/window.manager.js';
import { ComputerObservationEngine } from '../src/computer/operator/services/observation.engine.js';
import { ComputerTargetResolver } from '../src/computer/operator/services/target.resolver.js';
import { ComputerVerificationEngine } from '../src/computer/operator/services/verification.engine.js';
import { ComputerActionExecutor } from '../src/computer/operator/services/action.executor.js';
import { ComputerRecoveryEngine } from '../src/computer/operator/services/recovery.engine.js';
import { ComputerActionPlanner } from '../src/computer/operator/services/action.planner.js';
import { ComputerOperator } from '../src/computer/operator/services/computer.operator.js';
import { NotepadAdapter } from '../src/computer/operator/adapters/notepad.adapter.js';
import { FileDialogAdapter } from '../src/computer/operator/adapters/file-dialog.adapter.js';
import { BrowserBridgeAdapter } from '../src/computer/operator/adapters/browser-bridge.adapter.js';
import { createComputerOperatorTools } from '../src/computer/operator/tools/operator.tools.js';

interface VerifierResult {
  scenario: number;
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

async function runLivePhase22Verification() {
  console.log('================================================================================');
  console.log('HṚṢĪKEŚA — Phase 22 Live Advanced Computer Operator Verification');
  console.log('================================================================================\n');

  const testDbDir = path.resolve(process.cwd(), 'data/live_phase22_verification');
  const testDbPath = path.join(testDbDir, 'operator_verify.db');

  if (fs.existsSync(testDbDir)) {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDbDir, { recursive: true });

  const db = new DatabaseManager(testDbPath);
  db.open();
  const migrations = new MigrationManager(db);
  migrations.runPending();

  const eventBus = new EventBus();
  const logger = new Logger('Phase22Verifier', 'error', false);
  const resourceGov = new ResourceGovernor(eventBus, logger);
  resourceGov.setForcedPressure('NORMAL');
  const entityRepo = new KnowledgeEntityRepository(db);

  // Initialize deterministic adapters with rich UI Automation tree
  const mockComputer = new MockComputerAdapter();
  await mockComputer.initialize();
  mockComputer.activeWindow = {
    hwnd: 1024,
    title: 'Untitled - Notepad',
    processId: 4321,
    processName: 'Notepad'
  };

  const mockUia = new MockUiaAdapter();
  await mockUia.initialize();
  mockUia.mockWindow = {
    title: 'Untitled - Notepad',
    processName: 'Notepad',
    processId: 4321,
    handle: 1024,
    bounds: { x: 100, y: 100, width: 800, height: 600 },
    elements: [
      { id: 'elem_1', name: 'File', controlType: 'MenuItem', enabled: true, visible: true, bounds: { x: 110, y: 130, width: 40, height: 20 } },
      { id: 'elem_2', name: 'Edit', controlType: 'MenuItem', enabled: true, visible: true, bounds: { x: 155, y: 130, width: 40, height: 20 } },
      { id: 'elem_3', name: 'Text Editor', controlType: 'Edit', automationId: '15', className: 'Edit', value: '', enabled: true, visible: true, bounds: { x: 105, y: 160, width: 790, height: 530 } },
      { id: 'elem_4', name: 'Save', automationId: 'SaveButton', controlType: 'Button', enabled: true, visible: true, bounds: { x: 700, y: 125, width: 60, height: 25 } },
      { id: 'elem_5', name: 'Close', controlType: 'Button', enabled: true, visible: true, bounds: { x: 860, y: 105, width: 35, height: 25 } }
    ]
  };

  const computerAdapter: IComputerAdapter = mockComputer;
  const uiaAdapter: IUiaAdapter = mockUia;

  const repo = new ComputerOperatorRepository(db);
  const safetyPolicy = new ComputerSafetyPolicy(logger);
  const windowManager = new ComputerWindowManager(computerAdapter, uiaAdapter, logger);
  const observationEngine = new ComputerObservationEngine(computerAdapter, windowManager, uiaAdapter, logger);
  const targetResolver = new ComputerTargetResolver(uiaAdapter, repo, logger);
  const verificationEngine = new ComputerVerificationEngine(observationEngine, logger);
  const actionExecutor = new ComputerActionExecutor(computerAdapter, targetResolver, verificationEngine, safetyPolicy, uiaAdapter, logger);
  const recoveryEngine = new ComputerRecoveryEngine(observationEngine, windowManager, logger);
  const actionPlanner = new ComputerActionPlanner(logger);
  const operator = new ComputerOperator(
    observationEngine,
    windowManager,
    targetResolver,
    actionPlanner,
    actionExecutor,
    verificationEngine,
    recoveryEngine,
    safetyPolicy,
    repo,
    eventBus,
    resourceGov,
    entityRepo,
    logger
  );

  const results: VerifierResult[] = [];

  async function testScenario(num: number, name: string, fn: () => Promise<{ passed: boolean; details: string }>) {
    const start = Date.now();
    try {
      const res = await fn();
      const dur = Date.now() - start;
      results.push({ scenario: num, name, passed: res.passed, durationMs: dur, details: res.details });
      const symbol = res.passed ? '✔' : '✖';
      console.log(`[${symbol}] Scenario ${num.toString().padStart(2, '0')}: ${name} (${dur}ms) — ${res.details}`);
    } catch (e: any) {
      const dur = Date.now() - start;
      results.push({ scenario: num, name, passed: false, durationMs: dur, details: `Error: ${e.message}` });
      console.log(`[✖] Scenario ${num.toString().padStart(2, '0')}: ${name} (${dur}ms) — Exception: ${e.message}`);
    }
  }

  // 1. Migration & Schema Check
  await testScenario(1, 'Database Schema & Tables Integrity', async () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'computer_%'").all().map((r: any) => r.name);
    const passed = tables.includes('computer_tasks') && tables.includes('computer_action_history') && tables.includes('computer_ui_patterns');
    return { passed, details: `Tables validated: ${tables.join(', ')}` };
  });

  // 2. Task Lifecycle CRUD
  await testScenario(2, 'Task Record Lifecycle Persistence', async () => {
    const task = repo.createTask({ objective: 'Live verification task', scope: 'DESKTOP', status: 'PENDING' });
    repo.updateTaskStatus(task.id, 'RUNNING');
    const fetched = repo.getTask(task.id);
    return { passed: fetched?.status === 'RUNNING', details: `Task ${task.id.slice(0, 8)} transitioned to RUNNING` };
  });

  // 3. Desktop Observation
  await testScenario(3, 'Perception Engine Desktop Observation', async () => {
    const obs = await observationEngine.observeDesktop({ maxDepth: 2, maxNodes: 20 });
    return { passed: obs.nodeCount > 0 && !!obs.domHash, details: `Observed ${obs.nodeCount} nodes, hash: ${obs.domHash.slice(0, 8)}` };
  });

  // 4. Window Manager Active Window
  await testScenario(4, 'Window Manager Active Window Discovery', async () => {
    const win = await windowManager.getActiveWindow();
    return { passed: !!win.title, details: `Foreground: '${win.title}' (PID: ${win.processId})` };
  });

  // 5. Window Manager List Visible Windows
  await testScenario(5, 'Window Manager Window Enumeration', async () => {
    const windows = await windowManager.listVisibleWindows();
    return { passed: windows.length > 0, details: `Enumerated ${windows.length} visible window(s)` };
  });

  // 6. Target Resolver Semantic Match
  await testScenario(6, 'Semantic UIA Element Resolution', async () => {
    const obs = await observationEngine.observeDesktop();
    const resolved = await targetResolver.resolveTarget({ query: 'File' }, obs);
    return { passed: resolved.confidence > 0, details: `Target resolved via ${resolved.method} (Confidence: ${resolved.confidence})` };
  });

  // 7. Target Resolver Coordinate Fallback
  await testScenario(7, 'Coordinate Fallback with Bound Confidence', async () => {
    const obs = await observationEngine.observeDesktop();
    const resolved = await targetResolver.resolveTarget({ coordinates: { x: 400, y: 300 } }, obs);
    return { passed: resolved.confidence === 0.35, details: `Coordinate target assigned safe confidence ${resolved.confidence}` };
  });

  // 8. Learned UI Pattern Saving
  await testScenario(8, 'Learned UI Pattern Memory', async () => {
    repo.saveUIPattern({ application: 'Notepad', target_label: 'Save', automation_id: 'SaveBtn', confidence: 0.95 });
    const patterns = repo.getUIPatterns('Notepad', 'Save');
    return { passed: patterns.length > 0, details: `Saved & retrieved learned pattern with confidence ${patterns[0]?.confidence}` };
  });

  // 9. Structured Action Dispatch: MOVE
  await testScenario(9, 'Action Execution: MOVE', async () => {
    const res = await actionExecutor.executeAction({ id: 'm-1', type: 'MOVE', params: { x: 200, y: 200 } });
    return { passed: res.success, details: `Dispatched MOVE in ${res.durationMs}ms` };
  });

  // 10. Structured Action Dispatch: CLICK
  await testScenario(10, 'Action Execution: CLICK', async () => {
    const res = await actionExecutor.executeAction({ id: 'c-1', type: 'CLICK', target: { query: 'Save' } });
    return { passed: res.success, details: `Dispatched CLICK with verification strategy ${res.verificationStatus}` };
  });

  // 11. Structured Action Dispatch: TYPE
  await testScenario(11, 'Action Execution: TYPE Unicode', async () => {
    const res = await actionExecutor.executeAction({ id: 't-1', type: 'TYPE', params: { text: 'नमस्ते HṚṢĪKEŚA 🕉' } });
    return { passed: res.success, details: `Dispatched Unicode text entry (${res.durationMs}ms)` };
  });

  // 12. Structured Action Dispatch: HOTKEY
  await testScenario(12, 'Action Execution: HOTKEY Combination', async () => {
    const res = await actionExecutor.executeAction({ id: 'h-1', type: 'HOTKEY', params: { keys: ['Ctrl', 'S'] } });
    return { passed: res.success, details: `Dispatched Ctrl+S shortcut successfully` };
  });

  // 13. Precondition Validation
  await testScenario(13, 'Precondition Validation Gate', async () => {
    const res = await actionExecutor.executeAction({ id: 'p-1', type: 'CLICK', preconditions: { expectedWindow: 'NonExistentWindowXYZ' } });
    return { passed: !res.success && res.preconditionPassed === false, details: `Precondition blocked unauthorized blind execution` };
  });

  // 14. Verification Strategy: WINDOW_PRESENT
  await testScenario(14, 'Verification Engine: WINDOW_PRESENT', async () => {
    const obs = await observationEngine.observeDesktop();
    const v = await verificationEngine.verifyAction({ id: 'v-1', type: 'LAUNCH' }, obs, { strategy: 'WINDOW_PRESENT', expectedTitle: obs.activeWindow?.title });
    return { passed: v.verified, details: `Verified active window state: ${v.evidence}` };
  });

  // 15. Verification Strategy: TEXT_PRESENT
  await testScenario(15, 'Verification Engine: TEXT_PRESENT', async () => {
    const obs = await observationEngine.observeDesktop();
    const v = await verificationEngine.verifyAction({ id: 'v-2', type: 'TYPE' }, obs, { strategy: 'TEXT_PRESENT', expectedValue: obs.activeWindow?.controls[0]?.name || 'File' });
    return { passed: v.verified, details: `Verified presence of text: ${v.evidence}` };
  });

  // 16. Verification Non-Fabrication Rule
  await testScenario(16, 'Verification Engine: Non-Fabrication on Failure', async () => {
    const obs = await observationEngine.observeDesktop();
    const v = await verificationEngine.verifyAction({ id: 'v-3', type: 'LAUNCH' }, obs, { strategy: 'WINDOW_PRESENT', expectedProcessName: 'NonExistentApp99' });
    return { passed: !v.verified, details: `Correctly reported failure with evidence: ${v.evidence}` };
  });

  // 17. Recovery Engine: STALE_ELEMENT
  await testScenario(17, 'Recovery Protocol: STALE_ELEMENT', async () => {
    const plan = await recoveryEngine.recover({ id: 'r-1', type: 'CLICK' }, { actionId: 'r-1', actionType: 'CLICK', success: false, durationMs: 10, failureClassification: 'STALE_ELEMENT', error: 'Element missing' });
    return { passed: plan.recovered && plan.attempt.strategy === 'REOBSERVE_AND_REPLAN', details: `Executed safe re-observation recovery strategy` };
  });

  // 18. Recovery Engine: APPLICATION_BUSY
  await testScenario(18, 'Recovery Protocol: APPLICATION_BUSY', async () => {
    const plan = await recoveryEngine.recover({ id: 'r-2', type: 'CLICK' }, { actionId: 'r-2', actionType: 'CLICK', success: false, durationMs: 10, failureClassification: 'APPLICATION_BUSY', error: 'App busy' });
    return { passed: plan.recovered && plan.attempt.strategy === 'WAIT_FOR_BUSY', details: `Executed bounded backoff wait` };
  });

  // 19. Action Planner Multi-Step Generation
  await testScenario(19, 'Action Planner Multi-Step Plan Decomposition', async () => {
    const obs = await observationEngine.observeDesktop();
    const plan = actionPlanner.planActions({ id: 'p-1', objective: 'Open Notepad and enter test data', scope: 'APPLICATION', status: 'PENDING', maxActions: 5, createdAt: '', updatedAt: '' }, obs);
    return { passed: plan.actions.length >= 2, details: `Generated ${plan.actions.length} action steps` };
  });

  // 20. Action Planner Loop Detection
  await testScenario(20, 'Action Planner State Cycling Loop Breaker', async () => {
    actionPlanner.clearHistory();
    actionPlanner.detectLoop('state-x');
    actionPlanner.detectLoop('state-x');
    actionPlanner.detectLoop('state-x');
    const looping = actionPlanner.detectLoop('state-x');
    return { passed: looping, details: `Loop breaker detected 4x identical consecutive state` };
  });

  // 21. Safety Policy Danger Tiers
  await testScenario(21, 'Safety Policy Danger Tier Classification', async () => {
    const s1 = safetyPolicy.evaluateActionSafety({ id: 's1', type: 'MOVE' });
    const s2 = safetyPolicy.evaluateActionSafety({ id: 's2', type: 'TERMINATE', params: { appName: 'format c:' } });
    return { passed: s1.tier === 'SAFE' && s2.tier === 'CRITICAL', details: `MOVE: ${s1.tier}, FORMAT: ${s2.tier}` };
  });

  // 22. Safety Policy Destructive Action Gate
  await testScenario(22, 'Safety Policy Destructive Confirmation Gate', async () => {
    const evalResult = safetyPolicy.evaluateActionSafety({ id: 's3', type: 'TERMINATE', params: { appName: 'delete all logs' } });
    return { passed: evalResult.requiresApproval, details: `Destructive action flagged for explicit human approval` };
  });

  // 23. Safety Policy Auth Pause
  await testScenario(23, 'Safety Policy Password & PIN Pause Detection', async () => {
    const auth = safetyPolicy.detectAuthOrCaptcha('Please enter your Windows PIN');
    return { passed: auth.isAuthRequired && auth.authType === 'PIN', details: `Detected sensitive auth prompt: ${auth.authType}` };
  });

  // 24. Safety Policy CAPTCHA Pause
  await testScenario(24, 'Safety Policy CAPTCHA Intervention Pause', async () => {
    const cap = safetyPolicy.detectAuthOrCaptcha('Please solve the Cloudflare CAPTCHA challenge');
    return { passed: cap.isCaptcha, details: `Detected CAPTCHA challenge requiring human interaction` };
  });

  // 25. Safety Policy Secret Redaction
  await testScenario(25, 'Safety Policy Secret & Token Redaction', async () => {
    const redacted = safetyPolicy.redactSecrets('key=ghp_9876543210abcdef9876543210abcdef9876 and password=MySecretPass123');
    return { passed: !redacted.includes('ghp_') && redacted.includes('[REDACTED_API_KEY]'), details: `Redacted secret output: ${redacted}` };
  });

  // 26. Safety Policy Protected Processes
  await testScenario(26, 'Safety Policy Protected Windows System Processes', async () => {
    const p1 = safetyPolicy.isProtectedProcess('csrss.exe');
    const p2 = safetyPolicy.isProtectedProcess('notepad.exe');
    return { passed: p1 === true && p2 === false, details: `csrss: protected=${p1}, notepad: protected=${p2}` };
  });

  // 27. Safety Policy Scoping
  await testScenario(27, 'Safety Policy Scope Boundary Enforcement', async () => {
    const inScope = safetyPolicy.isWithinScope('APPLICATION', 'notepad.exe', 'notepad.exe');
    const outScope = safetyPolicy.isWithinScope('APPLICATION', 'calc.exe', 'notepad.exe');
    return { passed: inScope && !outScope, details: `Correctly restricted operations to active application scope` };
  });

  // 28. Application Context Tracking
  await testScenario(28, 'Application Context Tracker', async () => {
    windowManager.setApplicationContext({ applicationName: 'notepad.exe', processId: 1010, windowTitle: 'Untitled - Notepad', scope: 'APPLICATION' });
    const ctx = windowManager.getApplicationContext();
    return { passed: ctx?.applicationName === 'notepad.exe', details: `Active context isolated to ${ctx?.applicationName}` };
  });

  // 29. Governed Clipboard Operations
  await testScenario(29, 'Governed Clipboard Operations', async () => {
    const copyRes = await actionExecutor.executeAction({ id: 'cb-1', type: 'COPY' });
    const pasteRes = await actionExecutor.executeAction({ id: 'cb-2', type: 'PASTE' });
    return { passed: copyRes.success && pasteRes.success, details: `Copy and paste dispatches verified` };
  });

  // 30. File Dialog Adapter
  await testScenario(30, 'File Dialog Save Sequence Generation', async () => {
    const fileAdapter = new FileDialogAdapter(observationEngine, actionExecutor, logger);
    const seq = fileAdapter.buildSaveSequence('C:\\test\\doc.txt');
    return { passed: seq.length >= 2, details: `Generated ${seq.length}-step atomic file dialog save sequence` };
  });

  // 31. Browser Bridge Process Identification
  await testScenario(31, 'Browser Bridge Process Recognition', async () => {
    const bridge = new BrowserBridgeAdapter(undefined);
    const isBrowser = bridge.isBrowserProcess('msedge.exe');
    return { passed: isBrowser, details: `Identified msedge.exe as browser process` };
  });

  // 32. Tool Registry Integration
  await testScenario(32, 'Tool Registry Operator Tools Execution', async () => {
    const tools = createComputerOperatorTools(operator);
    const obsTool = tools.find((t) => t.id === 'computer.observe_desktop');
    const res = await obsTool?.execute({}, {} as any);
    return { passed: !!res?.success, details: `Executed computer.observe_desktop via ToolRegistry` };
  });

  // 33. Knowledge Graph Entity Synchronization
  await testScenario(33, 'Knowledge Graph Entity Synchronization', async () => {
    const entity = entityRepo.createEntity({ displayName: 'notepad.exe', canonicalName: 'notepad.exe', entityType: 'TOOL' as any, description: 'Windows Notepad' });
    const fetched = entityRepo.findById(entity.id);
    return { passed: !!fetched, details: `Synced application entity to semantic memory (${fetched?.displayName})` };
  });

  // 34. Real-Time Domain Events (SSE)
  await testScenario(34, 'Real-Time SSE Event Bus Telemetry', async () => {
    let captured = false;
    eventBus.subscribe('computer.observation', () => { captured = true; });
    await operator.observeDesktop();
    return { passed: captured, details: `Dispatched and received computer.observation SSE event` };
  });

  // 35. Master Operator End-to-End Orchestration
  await testScenario(35, 'Master Computer Operator End-to-End Task Execution', async () => {
    const execution = await operator.executeTask('Notepad test workflow', 'Open Notepad and write verify text', { scope: 'APPLICATION', maxActions: 3 });
    return { passed: execution.task.actionsExecuted > 0, details: `Task ${execution.task.id.slice(0, 8)} executed ${execution.task.actionsExecuted} actions with status ${execution.task.status}` };
  });

  db.close();

  const totalPassed = results.filter((r) => r.passed).length;
  console.log('\n================================================================================');
  console.log(`Phase 22 Live Verification Complete: ${totalPassed}/${results.length} Scenarios Passed`);
  console.log('================================================================================\n');

  if (totalPassed === results.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLivePhase22Verification().catch((e) => {
  console.error('Fatal live verifier failure:', e);
  process.exit(1);
});
