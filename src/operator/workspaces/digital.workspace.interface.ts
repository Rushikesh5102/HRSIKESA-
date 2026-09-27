/**
 * FP-13 Universal Digital Workspace Interface
 *
 * Defines the standard lifecycle and operational methods required across all
 * workspace types (Local Windows, Browser, Terminal, IDE, Remote VDI / RDP).
 */

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

export interface IDigitalWorkspace {
  readonly workspaceId: string;
  readonly descriptor: DigitalWorkspaceDescriptor;
  readonly status: DigitalWorkspaceStatus;

  // Lifecycle
  connect(agentId: string): Promise<boolean>;
  disconnect(): Promise<boolean>;
  health(): Promise<WorkspaceHealth>;

  // Observation & Inspection
  observe(): Promise<WorkspaceObservation>;
  inspect(): Promise<Record<string, unknown>>;
  captureScreenshot(): Promise<string | null>;

  // Application Control
  discoverApplications(): Promise<ApplicationDescriptor[]>;
  launchApplication(appNameOrPath: string, options?: ApplicationLaunchOptions): Promise<ApplicationSession>;
  focusApplication(applicationId: string): Promise<boolean>;
  closeApplication(applicationId: string): Promise<boolean>;

  // Execution & Interaction
  execute(action: OperatorActionPayload): Promise<OperatorActionResult>;
  verify(action: OperatorActionPayload, result: OperatorActionResult, strategy?: ActionVerificationStrategy): Promise<ActionVerificationResult>;
  recover(action: OperatorActionPayload, error: Error, strategy?: RecoveryStrategy): Promise<RecoveryAttemptResult>;
}
