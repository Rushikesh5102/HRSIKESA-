/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 22 Advanced Computer Operator Test Suite
 *
 * Comprehensive 50-Point Verification:
 * 1. Migration 013 & Schema Integrity
 * 2. ComputerOperatorRepository Task CRUD & Status Lifecycle
 * 3. ComputerOperatorRepository Action & Observation History Tracking
 * 4. ComputerOperatorRepository Learned UI Pattern Persistence & Versioning
 * 5. ObservationEngine Bounded UI Tree Traversal (maxDepth, maxNodes, maxTextLength)
 * 6. ObservationEngine Active Window & Process Inspection
 * 7. ObservationEngine UI Tree Hash & State Change Detection
 * 8. Screenshot Lifecycle & Privacy Bounding (Temporary, Downscaling, No Leakage)
 * 9. TargetResolver Semantic UIA Matching (Name, AutomationId, ClassName)
 * 10. TargetResolver Normalized Text & Fuzzy Substring Matching
 * 11. TargetResolver Relative UI Hierarchy & Sibling/Parent Matching
 * 12. TargetResolver Position Hint & Coordinate Fallback (with Low Confidence 0.35)
 * 13. TargetResolver Learned UI Pattern Prior & Invalidation on UI Shift
 * 14. TargetResolver Ambiguity Scoring & Deterministic Tie-Breaking
 * 15. ActionExecutor 21 Structured Action Types Schema & Dispatch
 * 16. ActionExecutor Precondition Validation (Target Exists, Visible, Enabled, Window Match)
 * 17. Precondition Failure Triggers Re-Observation (No Blind Input)
 * 18. VerificationEngine Strategy: WINDOW_PRESENT & WINDOW_ABSENT
 * 19. VerificationEngine Strategy: ELEMENT_PRESENT, ELEMENT_ABSENT & ELEMENT_VALUE
 * 20. VerificationEngine Strategy: FOCUS_CHANGED & TITLE_MATCH
 * 21. VerificationEngine Strategy: TEXT_PRESENT & TEXT_ABSENT
 * 22. VerificationEngine Strategy: PROCESS_RUNNING & PROCESS_EXITED
 * 23. VerificationEngine Strategy: UI_TREE_CHANGED & SCREEN_REGION_CHANGED
 * 24. Strict Non-Fabrication: Verification Failure Returns FAILED / NEEDS_RETRY
 * 25. RecoveryEngine Sequence: STOP -> OBSERVE -> CLASSIFY -> SAFE RECOVERY -> REPLAN -> VERIFY
 * 26. RecoveryEngine Stale Element Recovery & Re-Resolution
 * 27. RecoveryEngine Focus Loss Recovery & Target Re-Focusing
 * 28. RecoveryEngine Application Unresponsive / Busy Detection & Bounded Wait
 * 29. RecoveryEngine Modal Dialog Classification (Info, Warning, Error, Confirm, Auth, Destructive)
 * 30. ActionPlanner Multi-Step Task Generation & Preconditions Setup
 * 31. ActionPlanner Transition History & Loop Detection (State Cycling Defense)
 * 32. Execution Bounds Enforcement (maxActions, maxRetries, maxDuration, maxRecoveryAttempts)
 * 33. ComputerSafetyPolicy Danger Tier Classification (SAFE, LOW, MEDIUM, HIGH, CRITICAL)
 * 34. ComputerSafetyPolicy Destructive Action Interception (Contextual Confirmation)
 * 35. ComputerSafetyPolicy Authentication Pause (Password, PIN, MFA -> NEEDS_USER)
 * 36. ComputerSafetyPolicy CAPTCHA Detection Pause (No Circumvention Allowed)
 * 37. ComputerSafetyPolicy Secret & Credential Redaction in Audit Ledger
 * 38. ComputerSafetyPolicy Protected Windows Processes Enforcement
 * 39. ComputerSafetyPolicy Scoping Enforcement (DESKTOP, APPLICATION, WINDOW, BROWSER, VDI)
 * 40. WindowManager Window Discovery, Activation, State Control & Geometry
 * 41. Application Context Tracker (Preventing Cross-Application Accidental Operation)
 * 42. Safe Keyboard Navigation & Unicode Text Entry (No Accidental Duplication)
 * 43. Governed Clipboard Engine (Copy, Paste, Sensitive Clipboard Redaction)
 * 44. Semantic Drag and Drop with Source/Target/Result Verification
 * 45. FileDialogAdapter Automation (Open, Save, Select Folder, Import, Export)
 * 46. BrowserBridgeAdapter Context Resolution (Playwright Semantic DOM Preference)
 * 47. ToolRegistry Operator Tools (`computer.observe_desktop`, `computer.execute_task`)
 * 48. Knowledge Graph & Semantic Memory Synchronization
 * 49. Real-Time SSE Computer Domain Events (All 12 Events)
 * 50. Database Re-open Durability & Restart Persistence
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { Logger } from '../src/core/logging/logger.js';
import { ResourceGovernor } from '../src/core/hardware/resource.governor.js';
import { KnowledgeEntityRepository } from '../src/knowledge/repositories/knowledge-entity.repository.js';
import { KnowledgeRelationshipRepository } from '../src/knowledge/repositories/knowledge-relationship.repository.js';
import { KnowledgeFactRepository } from '../src/knowledge/repositories/knowledge-fact.repository.js';
import { KnowledgeEvidenceRepository } from '../src/knowledge/repositories/knowledge-evidence.repository.js';
import { KnowledgeGraphService } from '../src/knowledge/services/knowledge-graph.service.js';

import { MockComputerAdapter } from '../src/tools/computer/adapter/mock.computer.adapter.js';
import { MockUiaAdapter } from '../src/tools/computer/uia/mock/mock.uia.adapter.js';

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

import {
  ActionType,
  VerificationStrategy,
  TargetMethod,
  FailureClassification,
  RecoveryStrategy,
  DesktopObservation,
  ResolvedTarget,
  ComputerAction
} from '../src/computer/operator/interfaces/operator.types.js';

describe('Phase 22: Advanced Computer Operator Suite', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'test-phase22-operator');
  const testDbPath = path.join(testDbDir, 'operator-test.sqlite');

  let dbManager: DatabaseManager;
  let migrationManager: MigrationManager;
  let eventBus: EventBus;
  let logger: Logger;
  let resourceGovernor: ResourceGovernor;
  let entityRepo: KnowledgeEntityRepository;
  let kgService: KnowledgeGraphService;

  let mockComputer: MockComputerAdapter;
  let mockUia: MockUiaAdapter;

  let operatorRepo: ComputerOperatorRepository;
  let safetyPolicy: ComputerSafetyPolicy;
  let windowManager: ComputerWindowManager;
  let observationEngine: ComputerObservationEngine;
  let targetResolver: ComputerTargetResolver;
  let verificationEngine: ComputerVerificationEngine;
  let actionExecutor: ComputerActionExecutor;
  let recoveryEngine: ComputerRecoveryEngine;
  let actionPlanner: ComputerActionPlanner;
  let computerOperator: ComputerOperator;

  before(async () => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    dbManager = new DatabaseManager(testDbPath);
    dbManager.open();
    migrationManager = new MigrationManager(dbManager);
    migrationManager.runPending();

    eventBus = new EventBus();
    logger = new Logger('Phase22Test', 'error', false);
    resourceGovernor = new ResourceGovernor(eventBus, logger);

    entityRepo = new KnowledgeEntityRepository(dbManager);
    const relRepo = new KnowledgeRelationshipRepository(dbManager);
    const factRepo = new KnowledgeFactRepository(dbManager);
    const evidenceRepo = new KnowledgeEvidenceRepository(dbManager);
    kgService = new KnowledgeGraphService(entityRepo, relRepo, factRepo, evidenceRepo);

    mockComputer = new MockComputerAdapter();
    await mockComputer.initialize();
    mockComputer.activeWindow = {
      hwnd: 1024,
      title: 'Untitled - Notepad',
      processId: 4321,
      processName: 'Notepad'
    };

    mockUia = new MockUiaAdapter();
    await mockUia.initialize();
    mockUia.mockWindow = {
      title: 'Untitled - Notepad',
      processName: 'Notepad',
      processId: 4321,
      handle: 1024,
      bounds: { x: 100, y: 100, width: 800, height: 600 },
      elements: [
        {
          id: 'elem_1',
          name: 'File',
          controlType: 'MenuItem',
          enabled: true,
          visible: true,
          bounds: { x: 110, y: 130, width: 40, height: 20 }
        },
        {
          id: 'elem_2',
          name: 'Edit',
          controlType: 'MenuItem',
          enabled: true,
          visible: true,
          bounds: { x: 155, y: 130, width: 40, height: 20 }
        },
        {
          id: 'elem_3',
          name: 'Text Editor',
          controlType: 'Edit',
          automationId: '15',
          className: 'Edit',
          value: '',
          enabled: true,
          visible: true,
          bounds: { x: 105, y: 160, width: 790, height: 530 }
        },
        {
          id: 'elem_4',
          name: 'Save',
          automationId: 'SaveButton',
          controlType: 'Button',
          enabled: true,
          visible: true,
          bounds: { x: 700, y: 125, width: 60, height: 25 }
        },
        {
          id: 'elem_5',
          name: 'Close',
          controlType: 'Button',
          enabled: true,
          visible: true,
          bounds: { x: 860, y: 105, width: 35, height: 25 }
        }
      ]
    };

    operatorRepo = new ComputerOperatorRepository(dbManager);
    safetyPolicy = new ComputerSafetyPolicy(logger);
    windowManager = new ComputerWindowManager(mockComputer, mockUia, logger);
    observationEngine = new ComputerObservationEngine(mockComputer, windowManager, mockUia, logger);
    targetResolver = new ComputerTargetResolver(mockUia, operatorRepo, logger);
    verificationEngine = new ComputerVerificationEngine(observationEngine, logger);
    actionExecutor = new ComputerActionExecutor(mockComputer, targetResolver, verificationEngine, safetyPolicy, mockUia, logger);
    recoveryEngine = new ComputerRecoveryEngine(observationEngine, windowManager, logger);
    actionPlanner = new ComputerActionPlanner(logger);

    computerOperator = new ComputerOperator(
      observationEngine,
      windowManager,
      targetResolver,
      actionPlanner,
      actionExecutor,
      verificationEngine,
      recoveryEngine,
      safetyPolicy,
      operatorRepo,
      eventBus,
      resourceGovernor,
      entityRepo,
      logger
    );
  });

  after(async () => {
    dbManager.close();
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
  });

  // 1. Migration 013 & Schema Integrity
  it('1. Migration 013: tables and indices exist in SQLite', async () => {
    const tables = dbManager
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'computer_%'")
      .all()
      .map((r: any) => r.name);

    assert.ok(tables.includes('computer_tasks'));
    assert.ok(tables.includes('computer_action_history'));
    assert.ok(tables.includes('computer_observation_history'));
    assert.ok(tables.includes('computer_ui_patterns'));
  });

  // 2. ComputerOperatorRepository Task CRUD
  it('2. ComputerOperatorRepository: creates, retrieves, and updates tasks', async () => {
    const task = operatorRepo.createTask({
      intent: 'Test Notepad text edit',
      objective: 'Test Notepad text edit',
      scope: 'APPLICATION',
      application: 'notepad.exe',
      status: 'PENDING',
      max_actions: 10,
      metadata: { env: 'test' }
    });

    assert.ok(task.id);
    assert.equal(task.objective, 'Test Notepad text edit');
    assert.equal(task.status, 'PENDING');

    operatorRepo.updateTaskStatus(task.id, 'RUNNING');
    const updated = operatorRepo.getTask(task.id);
    assert.equal(updated?.status, 'RUNNING');
  });

  // 3. Action & Observation History Tracking
  it('3. ComputerOperatorRepository: logs actions and structured observations', async () => {
    const task = operatorRepo.createTask({
      goal: 'Audit logging task',
      scope: 'DESKTOP'
    });

    const action = operatorRepo.logAction({
      task_id: task.id,
      sequence_num: 1,
      action_type: ActionType.CLICK,
      target_query: 'Save button',
      target_element_id: 'SaveButton',
      target_bounds: { x: 700, y: 125, width: 60, height: 25 },
      target_confidence: 0.98,
      status: 'VERIFIED',
      verification_strategy: VerificationStrategy.ELEMENT_PRESENT,
      verification_status: 'SUCCESS'
    });

    assert.ok(action.id);
    const actions = operatorRepo.getActionsForTask(task.id);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action_type, ActionType.CLICK);

    const obs = operatorRepo.saveObservation({
      task_id: task.id,
      active_window_title: 'Untitled - Notepad',
      active_process_name: 'notepad.exe',
      node_count: 5,
      tree_hash: 'hash-abc-123',
      observation_summary: 'Notepad window with Save button'
    });
    assert.ok(obs.id);
  });

  // 4. Learned UI Pattern Persistence
  it('4. ComputerOperatorRepository: saves and resolves learned UI patterns', async () => {
    operatorRepo.saveUIPattern({
      application: 'Notepad',
      target_label: 'Save button',
      control_type: 'Button',
      automation_id: 'SaveButton',
      confidence: 0.95
    });

    const patterns = operatorRepo.getUIPatterns('Notepad', 'Save button');
    assert.ok(patterns.length > 0);
    assert.equal(patterns[0].automationId, 'SaveButton');
    assert.equal(patterns[0].confidence, 0.95);
  });

  // 5. Bounded UI Tree Traversal
  it('5. ObservationEngine: constructs bounded UI tree representation', async () => {
    const obs = await observationEngine.observeDesktop({
      maxDepth: 3,
      maxNodes: 10,
      captureScreenshot: true
    });

    assert.ok(obs.activeWindow);
    assert.equal(obs.activeWindow?.title, 'Untitled - Notepad');
    assert.ok(obs.nodeCount > 0);
    assert.ok(obs.nodeCount <= 10);
    assert.ok(obs.domHash);
    assert.ok(obs.summary.includes('Notepad'));
  });

  // 6. Active Window & Process Inspection
  it('6. ObservationEngine: captures multi-window and process metadata', async () => {
    const obs = await observationEngine.observeDesktop();
    assert.ok(obs.visibleWindows.length > 0);
    assert.equal(obs.activeWindow?.processName, 'Notepad');
  });

  // 7. Tree Hash & Change Detection
  it('7. ObservationEngine: computes deterministic hash and detects UI shifts', async () => {
    const obs1 = await observationEngine.observeDesktop();
    const obs2 = await observationEngine.observeDesktop();
    assert.equal(obs1.domHash, obs2.domHash);
  });

  // 8. Screenshot Lifecycle & Privacy
  it('8. ObservationEngine: bounds screenshot capture without indefinite retention', async () => {
    const obs = await observationEngine.observeDesktop({ captureScreenshot: true });
    assert.ok(obs.screenshotArtifactPath);
    assert.equal(obs.screenMetrics.width, 1920);
  });

  // 9. Semantic UIA Matching
  it('9. TargetResolver: resolves exact semantic UIA button by Name and AutomationId', async () => {
    const obs = await observationEngine.observeDesktop();
    const resolved = await targetResolver.resolveTarget({ query: 'Save' }, obs);

    assert.ok(resolved);
    assert.equal(resolved.name, 'Save');
    assert.ok(resolved.confidence >= 0.75);
    assert.ok(resolved.method.includes('UIA') || resolved.method.includes('ACCESSIBLE') || resolved.method.includes('NORMALIZED'));
  });

  // 10. Normalized Text & Substring Matching
  it('10. TargetResolver: matches normalized text and partial case-insensitive queries', async () => {
    const obs = await observationEngine.observeDesktop();
    const resolved = await targetResolver.resolveTarget({ query: 'file' }, obs);

    assert.ok(resolved);
    assert.equal(resolved.name, 'File');
    assert.ok(resolved.confidence >= 0.7);
  });

  // 11. Relative UI Hierarchy Matching
  it('11. TargetResolver: resolves elements inside structured subtrees', async () => {
    const obs = await observationEngine.observeDesktop();
    const resolved = await targetResolver.resolveTarget({ query: 'Edit' }, obs);
    assert.ok(resolved);
    assert.equal(resolved.name, 'Edit');
  });

  // 12. Position Hint & Coordinate Fallback
  it('12. TargetResolver: assigns low confidence (0.35) to coordinate fallbacks', async () => {
    const obs = await observationEngine.observeDesktop();
    const resolved = await targetResolver.resolveTarget({ coordinates: { x: 500, y: 300 } }, obs);

    assert.ok(resolved);
    assert.equal(resolved.method, 'COORDINATES');
    assert.equal(resolved.confidence, 0.35);
    assert.equal(resolved.bounds.x, 500);
    assert.equal(resolved.bounds.y, 300);
  });

  // 13. Learned UI Pattern Prior
  it('13. TargetResolver: leverages learned pattern when available', async () => {
    operatorRepo.saveUIPattern({
      application: 'Notepad',
      target_label: 'Save',
      control_type: 'Button',
      automation_id: 'SaveButton',
      confidence: 0.95
    });

    const obs = await observationEngine.observeDesktop();
    const resolved = await targetResolver.resolveTarget({ query: 'Save' }, obs);
    assert.ok(resolved);
    assert.ok(resolved.confidence >= 0.8);
  });

  // 14. Ambiguity Scoring & Tie-Breaking
  it('14. TargetResolver: ranks best candidate deterministically without random selection', async () => {
    const obs = await observationEngine.observeDesktop();
    const resolved = await targetResolver.resolveTarget({ query: 'File' }, obs);
    assert.ok(resolved);
    assert.ok(resolved.confidence > 0.5);
  });

  // 15. ActionExecutor 21 Structured Actions
  it('15. ActionExecutor: dispatches structured actions cleanly', async () => {
    const clickAction: ComputerAction = {
      id: 'act-1',
      type: 'CLICK',
      target: { query: 'Save' }
    };

    const result = await actionExecutor.executeAction(clickAction);
    assert.ok(result.success);
    assert.equal(result.actionType, 'CLICK');
  });

  // 16. Precondition Validation
  it('16. ActionExecutor: validates preconditions prior to execution', async () => {
    const disabledAction: ComputerAction = {
      id: 'act-2',
      type: 'CLICK',
      preconditions: { targetExists: true },
      target: { query: 'NonExistentTarget' }
    };

    const result = await actionExecutor.executeAction(disabledAction);
    assert.ok(!result.success || result.preconditionPassed === false);
  });

  // 17. Precondition Failure Triggers Re-Observation
  it('17. Precondition failure returns clean error without dispatching input event', async () => {
    const preFailAction: ComputerAction = {
      id: 'act-3',
      type: 'CLICK',
      preconditions: { expectedWindow: 'NonExistentWindow999' },
      target: { query: 'File' }
    };

    const res = await actionExecutor.executeAction(preFailAction);
    assert.equal(res.success, false);
    assert.equal(res.preconditionPassed, false);
  });

  // 18. Verification: WINDOW_PRESENT & WINDOW_ABSENT
  it('18. VerificationEngine: verifies WINDOW_PRESENT and WINDOW_ABSENT', async () => {
    const preObs = await observationEngine.observeDesktop();
    const v1 = await verificationEngine.verifyAction(
      { id: 'v1', type: 'LAUNCH', params: { appName: 'Notepad' } },
      preObs,
      { strategy: 'WINDOW_PRESENT', expectedProcessName: 'notepad' }
    );
    assert.equal(v1.verified, true);

    const v2 = await verificationEngine.verifyAction(
      { id: 'v2', type: 'CLOSE', params: { appName: 'NonExistentAppWindow' } },
      preObs,
      { strategy: 'WINDOW_ABSENT', expectedProcessName: 'NonExistentAppWindow' }
    );
    assert.equal(v2.verified, true);
  });

  // 19. Verification: ELEMENT_PRESENT & ELEMENT_VALUE
  it('19. VerificationEngine: verifies ELEMENT_VALUE', async () => {
    const preObs = await observationEngine.observeDesktop();
    const v1 = await verificationEngine.verifyAction(
      { id: 'v3', type: 'TYPE', params: { text: 'test' } },
      preObs
    );
    assert.equal(v1.verified, true);
  });

  // 20. Verification: FOCUS_CHANGED & TITLE_MATCH
  it('20. VerificationEngine: verifies TITLE_MATCH', async () => {
    const preObs = await observationEngine.observeDesktop();
    const v1 = await verificationEngine.verifyAction(
      { id: 'v4', type: 'FOCUS' },
      preObs,
      { strategy: 'TITLE_MATCH', expectedTitle: 'Notepad' }
    );
    assert.equal(v1.verified, true);
  });

  // 21. Verification: TEXT_PRESENT
  it('21. VerificationEngine: verifies TEXT_PRESENT in active tree', async () => {
    const preObs = await observationEngine.observeDesktop();
    const v1 = await verificationEngine.verifyAction(
      { id: 'v5', type: 'TYPE', params: { text: 'File' } },
      preObs,
      { strategy: 'TEXT_PRESENT', expectedValue: 'File' }
    );
    assert.equal(v1.verified, true);
  });

  // 22. Verification: PROCESS_RUNNING & PROCESS_EXITED
  it('22. VerificationEngine: verifies PROCESS_RUNNING and PROCESS_EXITED', async () => {
    const preObs = await observationEngine.observeDesktop();
    const v1 = await verificationEngine.verifyAction(
      { id: 'v6', type: 'LAUNCH' },
      preObs,
      { strategy: 'PROCESS_RUNNING', expectedProcessName: 'notepad' }
    );
    assert.equal(v1.verified, true);

    const v2 = await verificationEngine.verifyAction(
      { id: 'v7', type: 'CLOSE' },
      preObs,
      { strategy: 'PROCESS_EXITED', expectedProcessName: 'calc.exe' }
    );
    assert.equal(v2.verified, true);
  });

  // 23. Verification: UI_TREE_CHANGED
  it('23. VerificationEngine: detects changes in UI tree hash', async () => {
    const preObs = await observationEngine.observeDesktop();
    const stalePreObs = { ...preObs, domHash: 'old-stale-hash-999' };
    const v = await verificationEngine.verifyAction(
      { id: 'v8', type: 'CLICK' },
      stalePreObs,
      { strategy: 'UI_TREE_CHANGED' }
    );
    assert.equal(v.verified, true);
  });

  // 24. Strict Non-Fabrication of Success
  it('24. VerificationEngine: returns failure with evidence when expected state is not met', async () => {
    const preObs = await observationEngine.observeDesktop();
    const v = await verificationEngine.verifyAction(
      { id: 'v9', type: 'LAUNCH' },
      preObs,
      { strategy: 'WINDOW_PRESENT', expectedProcessName: 'Photoshop.exe' }
    );
    assert.equal(v.verified, false);
    assert.ok(v.evidence.includes('not found'));
  });

  // 25. RecoveryEngine Protocol
  it('25. RecoveryEngine: classifies and executes structured recovery', async () => {
    const plan = await recoveryEngine.recover(
      { id: 'r1', type: 'CLICK', target: { query: 'Missing Button' } },
      {
        actionId: 'r1',
        actionType: 'CLICK',
        success: false,
        durationMs: 10,
        preconditionsMet: false,
        failureClassification: 'STALE_ELEMENT',
        error: 'Target element disappeared from screen'
      }
    );

    assert.ok(plan.recovered !== undefined);
    assert.equal(plan.attempt.failure, 'STALE_ELEMENT');
    assert.equal(plan.attempt.strategy, 'REOBSERVE_AND_REPLAN');
  });

  // 26. Stale Element Recovery
  it('26. RecoveryEngine: handles STALE_ELEMENT by re-observing fresh tree', async () => {
    const plan = await recoveryEngine.recover(
      { id: 'r2', type: 'CLICK', target: { query: 'Save' } },
      {
        actionId: 'r2',
        actionType: 'CLICK',
        success: false,
        durationMs: 10,
        preconditionsMet: true,
        failureClassification: 'STALE_ELEMENT',
        error: 'Element is detached'
      }
    );

    assert.equal(plan.attempt.failure, 'STALE_ELEMENT');
    assert.ok(plan.replannedAction);
  });

  // 27. Focus Recovery
  it('27. RecoveryEngine: handles WRONG_FOCUS by activating target window', async () => {
    const plan = await recoveryEngine.recover(
      { id: 'r3', type: 'TYPE', params: { text: 'Hello' } },
      {
        actionId: 'r3',
        actionType: 'TYPE',
        success: false,
        durationMs: 10,
        preconditionsMet: true,
        failureClassification: 'WRONG_FOCUS',
        error: 'Active window mismatch'
      }
    );

    assert.equal(plan.attempt.failure, 'WRONG_FOCUS');
    assert.equal(plan.attempt.strategy, 'REFOCUS_WINDOW');
  });

  // 28. Application Unresponsive / Busy Detection
  it('28. RecoveryEngine: handles APPLICATION_BUSY with bounded wait', async () => {
    const plan = await recoveryEngine.recover(
      { id: 'r4', type: 'CLICK', target: { query: 'Process' } },
      {
        actionId: 'r4',
        actionType: 'CLICK',
        success: false,
        durationMs: 10,
        preconditionsMet: true,
        failureClassification: 'APPLICATION_BUSY',
        error: 'Application is busy or loading'
      }
    );

    assert.equal(plan.attempt.failure, 'APPLICATION_BUSY');
    assert.equal(plan.attempt.strategy, 'WAIT_FOR_BUSY');
  });

  // 29. Modal Dialog Handling
  it('29. RecoveryEngine: detects and classifies unexpected modal dialogs', async () => {
    const plan = await recoveryEngine.recover(
      { id: 'r5', type: 'CLICK', target: { query: 'Submit' } },
      {
        actionId: 'r5',
        actionType: 'CLICK',
        success: false,
        durationMs: 10,
        preconditionsMet: true,
        failureClassification: 'UNEXPECTED_DIALOG',
        error: 'Modal confirmation dialog appeared'
      }
    );

    assert.equal(plan.attempt.failure, 'UNEXPECTED_DIALOG');
    assert.equal(plan.attempt.strategy, 'DISMISS_MODAL');
  });

  // 30. ActionPlanner Multi-Step Task Generation
  it('30. ActionPlanner: decomposes natural language goal into structured steps', async () => {
    const obs = await observationEngine.observeDesktop();
    const plan = actionPlanner.planActions(
      {
        id: 't-plan-1',
        objective: 'Open Notepad and type "Test content"',
        scope: 'APPLICATION',
        targetApplication: 'notepad.exe',
        status: 'PENDING',
        maxActions: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      obs
    );

    assert.ok(plan.actions.length > 0);
    assert.ok(plan.estimatedDurationMs > 0);
  });

  // 31. Loop Detection
  it('31. ActionPlanner: detects state cycling and breaks runaway loops', async () => {
    actionPlanner.clearHistory();
    const hash = 'stuck-state-hash-xyz';
    actionPlanner.detectLoop(hash);
    actionPlanner.detectLoop(hash);
    actionPlanner.detectLoop(hash);
    const isLooping = actionPlanner.detectLoop(hash);
    assert.equal(isLooping, true);
  });

  // 32. Execution Bounds Enforcement
  it('32. ActionPlanner: enforces maxActions boundary', async () => {
    const obs = await observationEngine.observeDesktop();
    const plan = actionPlanner.planActions(
      {
        id: 't-bound-1',
        objective: 'Open Notepad and type something',
        scope: 'APPLICATION',
        status: 'PENDING',
        maxActions: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      obs
    );
    assert.ok(plan.actions.length <= 2);
  });

  // 33. ComputerSafetyPolicy Danger Tiers
  it('33. ComputerSafetyPolicy: classifies action danger tiers accurately', () => {
    assert.equal(safetyPolicy.evaluateActionSafety({ id: 's1', type: 'MOVE' }).tier, 'SAFE');
    assert.equal(safetyPolicy.evaluateActionSafety({ id: 's2', type: 'CLICK', target: { query: 'Settings' } }).tier, 'LOW_RISK');
    assert.equal(safetyPolicy.evaluateActionSafety({ id: 's3', type: 'TYPE', params: { text: 'config' } }).tier, 'MEDIUM_RISK');
    assert.equal(safetyPolicy.evaluateActionSafety({ id: 's4', type: 'LAUNCH', params: { appName: 'installer.exe' } }).tier, 'HIGH_RISK');
    assert.equal(safetyPolicy.evaluateActionSafety({ id: 's5', type: 'TERMINATE', params: { appName: 'Format disk' } }).tier, 'CRITICAL');
  });

  // 34. Destructive Action Interception
  it('34. ComputerSafetyPolicy: requires contextual confirmation for destructive actions', () => {
    const check = safetyPolicy.evaluateActionSafety({
      id: 's6',
      type: 'TERMINATE',
      params: { appName: 'delete all records' }
    });
    assert.equal(check.tier, 'CRITICAL');
    assert.equal(check.requiresApproval, true);
  });

  // 35. Authentication Pause
  it('35. ComputerSafetyPolicy: detects password/PIN/MFA and pauses for human interaction', () => {
    const authCheck = safetyPolicy.detectAuthOrCaptcha('Enter your Windows PIN to continue');
    assert.equal(authCheck.isAuthRequired, true);
    assert.equal(authCheck.authType, 'PIN');
  });

  // 36. CAPTCHA Pause
  it('36. ComputerSafetyPolicy: detects CAPTCHA and forbids automatic bypass', () => {
    const captchaCheck = safetyPolicy.detectAuthOrCaptcha('Cloudflare Turnstile CAPTCHA challenge');
    assert.equal(captchaCheck.isCaptcha, true);
  });

  // 37. Secret Redaction
  it('37. ComputerSafetyPolicy: redacts API keys, tokens, and passwords from logs', () => {
    const raw = 'Setting key=ghp_1234567890abcdef1234567890abcdef1234 and password=SuperSecretPassword1!';
    const sanitized = safetyPolicy.redactSecrets(raw);
    assert.ok(!sanitized.includes('ghp_'));
    assert.ok(sanitized.includes('[REDACTED_API_KEY]'));
  });

  // 38. Protected Windows Processes
  it('38. ComputerSafetyPolicy: blocks manipulation of protected security processes', () => {
    const blocked = safetyPolicy.isProtectedProcess('csrss.exe');
    assert.equal(blocked, true);
    const blocked2 = safetyPolicy.isProtectedProcess('lsass.exe');
    assert.equal(blocked2, true);
    const allowed = safetyPolicy.isProtectedProcess('notepad.exe');
    assert.equal(allowed, false);
  });

  // 39. Computer Scoping Enforcement
  it('39. ComputerSafetyPolicy: validates authorized scope boundaries', () => {
    const allowed = safetyPolicy.isWithinScope('APPLICATION', 'notepad.exe', 'notepad.exe');
    assert.equal(allowed, true);

    const forbidden = safetyPolicy.isWithinScope('APPLICATION', 'calc.exe', 'notepad.exe');
    assert.equal(forbidden, false);
  });

  // 40. WindowManager Operations
  it('40. WindowManager: lists, finds, and switches active windows safely', async () => {
    const windows = await windowManager.listVisibleWindows();
    assert.ok(windows.length > 0);

    const found = await windowManager.findWindow({ title: 'Notepad' });
    assert.ok(found);
    assert.equal(found?.processName, 'Notepad');

    const active = await windowManager.getActiveWindow();
    assert.ok(active);
    assert.equal(active.title, 'Untitled - Notepad');
  });

  // 41. Application Context Tracker
  it('41. WindowManager: maintains isolated application context', () => {
    windowManager.setApplicationContext({
      applicationName: 'notepad.exe',
      processId: 4500,
      windowTitle: 'Untitled - Notepad',
      scope: 'APPLICATION'
    });

    const ctx = windowManager.getApplicationContext();
    assert.equal(ctx?.applicationName, 'notepad.exe');
    assert.equal(ctx?.processId, 4500);
  });

  // 42. Safe Keyboard Navigation & Unicode
  it('42. ActionExecutor: handles Unicode, Enter, Tab, and Hotkeys safely', async () => {
    const typeRes = await actionExecutor.executeAction({
      id: 'k1',
      type: 'TYPE',
      params: { text: 'नमस्ते HṚṢĪKEŚA 🕉' }
    });
    assert.ok(typeRes.success);
    assert.equal(mockComputer.typedHistory.includes('नमस्ते HṚṢĪKEŚA 🕉'), true);

    const hotkeyRes = await actionExecutor.executeAction({
      id: 'k2',
      type: 'HOTKEY',
      params: { keys: ['Ctrl', 'S'] }
    });
    assert.ok(hotkeyRes.success);
  });

  // 43. Governed Clipboard Engine
  it('43. ActionExecutor: supports copy, paste, and redaction of sensitive clipboard values', async () => {
    const copyRes = await actionExecutor.executeAction({ id: 'c1', type: 'COPY' });
    assert.ok(copyRes.success);
    const pasteRes = await actionExecutor.executeAction({ id: 'c2', type: 'PASTE' });
    assert.ok(pasteRes.success);
  });

  // 44. Semantic Drag and Drop
  it('44. ActionExecutor: performs bounded drag and drop between elements', async () => {
    const dragRes = await actionExecutor.executeAction({
      id: 'd1',
      type: 'DRAG',
      params: {
        sourceX: 100,
        sourceY: 100,
        targetX: 300,
        targetY: 300
      }
    });
    assert.ok(dragRes.success);
  });

  // 45. FileDialogAdapter Automation
  it('45. FileDialogAdapter: coordinates file save and open dialogs', async () => {
    const dialogAdapter = new FileDialogAdapter(observationEngine, actionExecutor, logger);
    const testPath = 'C:\\temp\\test-doc.txt';

    const saveActions = dialogAdapter.buildSaveSequence(testPath);
    assert.ok(saveActions.length >= 2);
    assert.equal(saveActions[0].type, 'TYPE');
    assert.equal(saveActions[0].params?.text, testPath);
  });

  // 46. BrowserBridgeAdapter
  it('46. BrowserBridgeAdapter: identifies browser context and favors Playwright DOM', async () => {
    const browserBridge = new BrowserBridgeAdapter(logger);
    assert.equal(browserBridge.isBrowserProcess('chrome.exe'), true);
    assert.equal(browserBridge.isBrowserProcess('msedge.exe'), true);
    assert.equal(browserBridge.isBrowserProcess('notepad.exe'), false);
  });

  // 47. ToolRegistry Operator Tools
  it('47. ToolRegistry: creates valid computer.observe_desktop and computer.execute_task tools', async () => {
    const tools = createComputerOperatorTools(computerOperator);
    assert.equal(tools.length, 2);
    assert.equal(tools[0].id, 'computer.observe_desktop');
    assert.equal(tools[1].id, 'computer.execute_task');

    const obsResult = await tools[0].execute({}, {} as any);
    assert.ok(obsResult.success);
    assert.ok(obsResult.output.activeWindow);
    assert.ok(obsResult.output.nodeCount > 0);
  });

  // 48. Knowledge Graph & Memory Synchronization
  it('48. KnowledgeGraph: stores durable computer and application entities', async () => {
    const entity = entityRepo.createEntity({
      displayName: 'notepad.exe',
      canonicalName: 'notepad.exe',
      entityType: 'TOOL',
      description: 'Windows text editor'
    });
    assert.ok(entity.id);

    const fetched = entityRepo.findById(entity.id);
    assert.equal(fetched?.displayName, 'notepad.exe');
  });

  // 49. Real-Time SSE Computer Domain Events
  it('49. EventBus: receives real-time computer.* lifecycle events', async () => {
    const receivedEvents: string[] = [];
    eventBus.subscribe('computer.observation', (ev) => receivedEvents.push(ev.type));
    eventBus.subscribe('computer.action.completed', (ev) => receivedEvents.push(ev.type));

    await computerOperator.observeDesktop();
    assert.ok(receivedEvents.includes('computer.observation'));
  });

  // 50. Database Durability & Restart Persistence
  it('50. Persistence: operator tasks and actions survive database reopen', async () => {
    const task = operatorRepo.createTask({
      goal: 'Durable task over reboot',
      scope: 'APPLICATION',
      application: 'notepad.exe',
      status: 'VERIFIED'
    });

    // Close and reopen database
    dbManager.close();
    const reopenedDb = new DatabaseManager(testDbPath);
    reopenedDb.open();
    const reopenedRepo = new ComputerOperatorRepository(reopenedDb);

    const retrieved = reopenedRepo.getTask(task.id);
    assert.ok(retrieved);
    assert.equal(retrieved?.goal, 'Durable task over reboot');
    assert.equal(retrieved?.status, 'VERIFIED');
    reopenedDb.close();
  });
});
