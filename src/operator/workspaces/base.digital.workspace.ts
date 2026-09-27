/**
 * FP-13 Base Digital Workspace Implementation
 *
 * Provides shared state management, lifecycle tracking, and standard fallback hooks.
 */

import { IDigitalWorkspace } from './digital.workspace.interface.js';
import {
  DigitalWorkspaceDescriptor,
  DigitalWorkspaceStatus,
  WorkspaceHealth,
  WorkspaceObservation,
  ApplicationDescriptor,
  ApplicationSession,
  ApplicationLaunchOptions,
  OperatorActionPayload,
  OperatorActionResult,
  ActionVerificationStrategy,
  ActionVerificationResult,
  RecoveryStrategy,
  RecoveryAttemptResult,
} from '../types/index.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { OperatorEventTopics } from '../types/operator.events.js';

export abstract class BaseDigitalWorkspace implements IDigitalWorkspace {
  protected _descriptor: DigitalWorkspaceDescriptor;
  protected _status: DigitalWorkspaceStatus;
  protected _activeSessionId: string | null = null;
  protected _currentAgentId: string | null = null;

  constructor(
    descriptor: DigitalWorkspaceDescriptor,
    protected readonly logger?: ILogger,
    protected readonly eventBus?: EventBus
  ) {
    this._descriptor = { ...descriptor };
    this._status = descriptor.status || 'AVAILABLE';
  }

  public get workspaceId(): string {
    return this._descriptor.workspaceId;
  }

  public get descriptor(): DigitalWorkspaceDescriptor {
    return { ...this._descriptor, status: this._status };
  }

  public get status(): DigitalWorkspaceStatus {
    return this._status;
  }

  protected setStatus(newStatus: DigitalWorkspaceStatus): void {
    const oldStatus = this._status;
    this._status = newStatus;
    this._descriptor.status = newStatus;
    this._descriptor.updatedAt = new Date().toISOString();

    if (this.eventBus) {
      this.eventBus.emit(OperatorEventTopics.WORKSPACE_STATUS_CHANGED, {
        workspaceId: this.workspaceId,
        status: newStatus,
        previousStatus: oldStatus,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public async connect(agentId: string): Promise<boolean> {
    this.setStatus('CONNECTING');
    try {
      this._currentAgentId = agentId;
      this._activeSessionId = `ws_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      this.setStatus('CONNECTED');
      this.setStatus('READY');

      if (this.eventBus) {
        this.eventBus.emit(OperatorEventTopics.WORKSPACE_CONNECTED, {
          workspaceId: this.workspaceId,
          agentId,
          timestamp: new Date().toISOString(),
        });
      }
      return true;
    } catch (err: any) {
      this.setStatus('FAILED');
      this.logger?.error(`Failed to connect workspace ${this.workspaceId}: ${err.message}`);
      return false;
    }
  }

  public async disconnect(): Promise<boolean> {
    try {
      this.setStatus('DISCONNECTED');
      this._activeSessionId = null;
      this._currentAgentId = null;

      if (this.eventBus) {
        this.eventBus.emit(OperatorEventTopics.WORKSPACE_DISCONNECTED, {
          workspaceId: this.workspaceId,
          timestamp: new Date().toISOString(),
        });
      }
      return true;
    } catch (err: any) {
      this.logger?.error(`Failed to cleanly disconnect workspace ${this.workspaceId}: ${err.message}`);
      return false;
    }
  }

  public async health(): Promise<WorkspaceHealth> {
    return {
      workspaceId: this.workspaceId,
      status: this._status === 'READY' || this._status === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
      isResponsive: this._status !== 'BLOCKED' && this._status !== 'FAILED',
      cpuPercent: 5.0,
      memoryMb: 120.0,
      lastCheckTime: new Date().toISOString(),
      activeApplicationsCount: 1,
    };
  }

  public abstract observe(): Promise<WorkspaceObservation>;
  public abstract inspect(): Promise<Record<string, unknown>>;
  public abstract captureScreenshot(): Promise<string | null>;
  public abstract discoverApplications(): Promise<ApplicationDescriptor[]>;
  public abstract launchApplication(appNameOrPath: string, options?: ApplicationLaunchOptions): Promise<ApplicationSession>;
  public abstract focusApplication(applicationId: string): Promise<boolean>;
  public abstract closeApplication(applicationId: string): Promise<boolean>;
  public abstract execute(action: OperatorActionPayload): Promise<OperatorActionResult>;
  public abstract verify(action: OperatorActionPayload, result: OperatorActionResult, strategy?: ActionVerificationStrategy): Promise<ActionVerificationResult>;
  public abstract recover(action: OperatorActionPayload, error: Error, strategy?: RecoveryStrategy): Promise<RecoveryAttemptResult>;
}
