/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Digital Workspace & Application Operator
 *
 * FP-13: Production-grade master operator providing a unified, secure,
 * observable abstraction for operating Windows apps, desktop GUI, browser,
 * terminal, files, IDE, software, and remote VDI/RDP environments.
 *
 * Enforces the universal cycle:
 * OBSERVE → UNDERSTAND → PLAN → PRECONDITION CHECK → ACT → OBSERVE → VERIFY → RECOVER/RETRY → REPORT → AUDIT
 */

import { IDigitalWorkspace } from './workspaces/digital.workspace.interface.js';
import { WorkspaceRegistry } from './workspaces/workspace.registry.js';
import { WorkspaceRepository } from './repository/workspace.repository.js';
import { WorkspaceObserver } from './observation/workspace.observer.js';
import { TargetResolver } from './resolution/target.resolver.js';
import { PreconditionEngine } from './precondition/precondition.engine.js';
import { ActionVerifier } from './verification/action.verifier.js';
import { RecoveryEngine } from './recovery/recovery.engine.js';
import { ActionTraceRecorder } from './trace/action.trace.recorder.js';
import { LearnedPatternStore } from './learning/learned.pattern.store.js';
import { WorkspaceLockManager } from './locking/workspace.lock.manager.js';

import {
  DigitalWorkspaceDescriptor,
  WorkspaceObservation,
  ApplicationDescriptor,
  ApplicationSession,
  ApplicationLaunchOptions,
  OperatorActionPayload,
  OperatorActionResult,
  TargetResolutionRequest,
  TargetResolutionResult,
} from './types/index.js';

import { ILogger } from '../core/logging/logger.types.js';
import { EventBus } from '../core/events/event-bus.js';
import { OperatorEventTopics } from './types/operator.events.js';

export class ApplicationOperator {
  public readonly registry: WorkspaceRegistry;
  public readonly observer: WorkspaceObserver;
  public readonly resolver: TargetResolver;
  public readonly preconditions: PreconditionEngine;
  public readonly verifier: ActionVerifier;
  public readonly recovery: RecoveryEngine;
  public readonly tracer: ActionTraceRecorder;
  public readonly patterns: LearnedPatternStore;
  public readonly lockManager: WorkspaceLockManager;

  constructor(
    private readonly repository?: WorkspaceRepository,
    private readonly logger?: ILogger,
    private readonly eventBus?: EventBus
  ) {
    this.patterns = new LearnedPatternStore(repository, logger);
    this.registry = new WorkspaceRegistry(repository, logger, eventBus);
    this.observer = new WorkspaceObserver(repository, logger, eventBus);
    this.resolver = new TargetResolver(this.patterns, logger);
    this.preconditions = new PreconditionEngine(logger);
    this.verifier = new ActionVerifier(repository, logger, eventBus);
    this.recovery = new RecoveryEngine(repository, logger, eventBus);
    this.tracer = new ActionTraceRecorder(repository, logger);
    this.lockManager = new WorkspaceLockManager(repository, logger, eventBus);
  }

  // ================= Workspace Operations =================

  public getWorkspace(workspaceId: string): IDigitalWorkspace {
    const ws = this.registry.get(workspaceId);
    if (!ws) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }
    return ws;
  }

  public listWorkspaces(): DigitalWorkspaceDescriptor[] {
    return this.registry.listDescriptors();
  }

  public async connectWorkspace(workspaceId: string, agentId: string): Promise<boolean> {
    const ws = this.getWorkspace(workspaceId);
    const connected = await ws.connect(agentId);
    if (connected && this.repository) {
      this.repository.saveWorkspace(ws.descriptor);
      this.repository.saveSession({
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId,
        ownerAgentId: agentId,
        status: 'CONNECTED',
        connectedAt: new Date().toISOString(),
        metadata: {},
      });
    }
    return connected;
  }

  public async disconnectWorkspace(workspaceId: string): Promise<boolean> {
    const ws = this.getWorkspace(workspaceId);
    const disconnected = await ws.disconnect();
    if (disconnected && this.repository) {
      this.repository.saveWorkspace(ws.descriptor);
    }
    return disconnected;
  }

  // ================= Application Operations =================

  public async discoverApplications(workspaceId: string): Promise<ApplicationDescriptor[]> {
    const ws = this.getWorkspace(workspaceId);
    const apps = await ws.discoverApplications();
    if (this.repository) {
      for (const app of apps) {
        this.repository.saveApplication(app);
      }
    }
    return apps;
  }

  public async launchApplication(
    workspaceId: string,
    appNameOrPath: string,
    options?: ApplicationLaunchOptions
  ): Promise<ApplicationSession> {
    const ws = this.getWorkspace(workspaceId);
    const session = await ws.launchApplication(appNameOrPath, options);

    if (this.repository) {
      const existingApp = this.repository.getApplication(session.applicationId);
      if (!existingApp) {
        this.repository.saveApplication({
          applicationId: session.applicationId,
          name: appNameOrPath,
          displayName: appNameOrPath,
          executablePath: appNameOrPath,
          category: 'UTILITY',
          workspaceId,
          capabilities: [],
          readinessState: 'READY',
          healthStatus: 'HEALTHY',
          installationSource: 'SYSTEM',
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      this.repository.saveAppSession(session);
      this.repository.saveWorkspace(ws.descriptor);
    }

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.APPLICATION_LAUNCHED, {
        workspaceId,
        applicationId: session.applicationId,
        processId: session.processId,
        timestamp: session.startedAt,
      });
    }

    return session;
  }

  public async focusApplication(workspaceId: string, applicationId: string): Promise<boolean> {
    const ws = this.getWorkspace(workspaceId);
    const success = await ws.focusApplication(applicationId);
    if (success && this.repository) {
      this.repository.saveWorkspace(ws.descriptor);
    }
    return success;
  }

  public async closeApplication(workspaceId: string, applicationId: string): Promise<boolean> {
    const ws = this.getWorkspace(workspaceId);
    const success = await ws.closeApplication(applicationId);
    if (success && this.repository) {
      this.repository.saveWorkspace(ws.descriptor);
    }
    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.APPLICATION_CLOSED, {
        workspaceId,
        applicationId,
        timestamp: new Date().toISOString(),
      });
    }
    return success;
  }

  // ================= Multi-Layer Observation =================

  public async observe(workspaceId: string): Promise<WorkspaceObservation> {
    const ws = this.getWorkspace(workspaceId);
    return this.observer.observe(ws);
  }

  public async inspect(workspaceId: string): Promise<Record<string, unknown>> {
    const ws = this.getWorkspace(workspaceId);
    return ws.inspect();
  }

  public async captureScreenshot(workspaceId: string): Promise<string | null> {
    const ws = this.getWorkspace(workspaceId);
    return ws.captureScreenshot();
  }

  // ================= Target Resolution =================

  public async resolveTarget(
    workspaceId: string,
    request: TargetResolutionRequest
  ): Promise<TargetResolutionResult> {
    const ws = this.getWorkspace(workspaceId);
    const obs = await this.observer.observe(ws);
    const appName = ws.descriptor.activeApplicationId || undefined;

    const resolution = await this.resolver.resolve(request, obs, appName);

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.TARGET_RESOLVED, {
        workspaceId,
        request,
        resolution,
        timestamp: new Date().toISOString(),
      });
    }

    return resolution;
  }

  // ================= Master Action Orchestration Cycle =================

  public async performAction(actionPayload: OperatorActionPayload): Promise<OperatorActionResult> {
    const ws = this.getWorkspace(actionPayload.workspaceId);
    const startTime = Date.now();
    const agentId = actionPayload.agentId || 'agent_operator';

    // 1. OBSERVE initial state
    const initialObs = await this.observer.observe(ws);

    // 2. RESOLVE TARGET if not fully resolved
    let targetResolution: TargetResolutionResult | undefined;
    if (actionPayload.target && !actionPayload.target.semanticSelector && !actionPayload.target.coordinates) {
      targetResolution = await this.resolver.resolve(
        {
          semanticSelector: actionPayload.target.semanticSelector,
          textLabel: actionPayload.target.textLabel,
          role: actionPayload.target.role,
        },
        initialObs,
        ws.descriptor.activeApplicationId || undefined
      );

      if (targetResolution.isAmbiguous || targetResolution.confidence === 'AMBIGUOUS') {
        const failureResult: OperatorActionResult = {
          actionId: actionPayload.actionId,
          workspaceId: ws.workspaceId,
          status: 'BLOCKED',
          isVerified: false,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          errorMessage: `Target is materially ambiguous (${targetResolution.candidateCount} matching candidates). Refusing blind execution.`,
          evidence: targetResolution.evidence,
        };
        if (this.repository) {
          this.repository.saveAction(actionPayload, 'BLOCKED', failureResult.errorMessage, failureResult.evidence);
        }
        return failureResult;
      }

      actionPayload.target = targetResolution.target;
    }

    // 3. PRECONDITION CHECK
    const precond = await this.preconditions.evaluate(actionPayload, ws, initialObs, targetResolution);
    if (!precond.isSatisfied) {
      const blockedResult: OperatorActionResult = {
        actionId: actionPayload.actionId,
        workspaceId: ws.workspaceId,
        status: 'BLOCKED',
        isVerified: false,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        errorMessage: `Precondition violations: ${precond.violations.join('; ')}`,
        evidence: { violations: precond.violations, requiresApproval: precond.requiresApproval },
      };

      if (this.repository) {
        this.repository.saveAction(actionPayload, 'BLOCKED', blockedResult.errorMessage, blockedResult.evidence);
      }

      if (this.eventBus) {
        this.eventBus.emit(OperatorEventTopics.ACTION_BLOCKED, {
          actionId: actionPayload.actionId,
          workspaceId: ws.workspaceId,
          reason: precond.violations.join('; '),
          timestamp: new Date().toISOString(),
        });
      }

      return blockedResult;
    }

    // 4. LOCK WORKSPACE
    const lockAcquired = this.lockManager.acquireLock(
      ws.workspaceId,
      agentId,
      actionPayload.actionId,
      actionPayload.riskLevel === 'TIER_0_OBSERVE' ? 'SHARED_OBSERVE' : 'EXCLUSIVE',
      60
    );

    if (!lockAcquired) {
      return {
        actionId: actionPayload.actionId,
        workspaceId: ws.workspaceId,
        status: 'BLOCKED',
        isVerified: false,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        errorMessage: `Workspace ${ws.workspaceId} is currently locked by another agent or task.`,
      };
    }

    try {
      // 5. Check Loop Prevention
      if (this.recovery.detectLoop(initialObs, actionPayload)) {
        return {
          actionId: actionPayload.actionId,
          workspaceId: ws.workspaceId,
          status: 'FAILED',
          isVerified: false,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          errorMessage: 'Loop detected: identical state/action failure repeated. Operation halted to prevent infinite loop.',
          evidence: { loopDetected: true },
        };
      }

      if (this.eventBus) {
        this.eventBus.emit(OperatorEventTopics.ACTION_STARTED, {
          actionId: actionPayload.actionId,
          actionType: actionPayload.actionType,
          workspaceId: ws.workspaceId,
          timestamp: new Date().toISOString(),
        });
      }

      // 6. ACT
      let executionResult = await ws.execute(actionPayload);

      // Persist initial action state before verifier runs
      if (this.repository) {
        this.repository.saveAction(
          actionPayload,
          executionResult.status,
          executionResult.errorMessage,
          executionResult.evidence
        );
      }

      // 7. OBSERVE post-action state
      await this.observer.observe(ws);

      // 8. VERIFY
      const verification = await this.verifier.verify(
        actionPayload,
        executionResult,
        ws,
        actionPayload.verificationStrategy
      );

      executionResult.isVerified = verification.isVerified;
      executionResult.verificationEvidence = verification.evidence;

      // 9. RECOVER / RETRY if verification or execution failed
      if (!verification.isVerified || executionResult.status === 'FAILED') {
        this.logger?.warn(`Action ${actionPayload.actionId} verification failed, attempting recovery...`);
        const recoveryResult = await this.recovery.attemptRecovery(
          actionPayload,
          new Error(executionResult.errorMessage || 'Verification failed'),
          ws
        );

        if (recoveryResult.success) {
          // Re-verify after recovery
          const reVerification = await this.verifier.verify(
            actionPayload,
            executionResult,
            ws,
            actionPayload.verificationStrategy
          );
          if (reVerification.isVerified) {
            executionResult.status = 'COMPLETED';
            executionResult.isVerified = true;
          }
        }
      } else {
        // Successful without loop
        this.recovery.clearLoopCounter(initialObs, actionPayload);

        // Record learned pattern if semantic target was used
        if (actionPayload.target?.semanticSelector && ws.descriptor.activeApplicationId) {
          this.patterns.recordSuccess(
            ws.descriptor.activeApplicationId,
            actionPayload.target.textLabel || actionPayload.target.semanticSelector,
            actionPayload.target.semanticSelector,
            targetResolution?.resolutionMethod || 'SEMANTIC_SELECTOR'
          );
        }
      }

      // 10. Persist & Audit
      if (this.repository) {
        this.repository.saveAction(
          actionPayload,
          executionResult.status,
          executionResult.errorMessage,
          executionResult.evidence
        );
      }

      if (this.eventBus) {
        if (executionResult.status === 'COMPLETED') {
          this.eventBus.emit(OperatorEventTopics.ACTION_COMPLETED, {
            actionId: actionPayload.actionId,
            actionType: actionPayload.actionType,
            workspaceId: ws.workspaceId,
            success: true,
            status: executionResult.status,
            timestamp: new Date().toISOString(),
          });
        } else {
          this.eventBus.emit(OperatorEventTopics.ACTION_FAILED, {
            actionId: actionPayload.actionId,
            actionType: actionPayload.actionType,
            workspaceId: ws.workspaceId,
            error: executionResult.errorMessage || 'Action execution failed',
            status: executionResult.status,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return executionResult;
    } finally {
      // 11. UNLOCK
      this.lockManager.releaseLock(ws.workspaceId, agentId);
    }
  }
}
