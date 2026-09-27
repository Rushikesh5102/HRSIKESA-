/**
 * HṚṢĪKEŚA (हृषीकेश) — Application Descriptor & Session Types
 *
 * FP-13: Unified application modeling across Windows binaries, web apps,
 * developer IDEs, terminals, and remote services.
 */

export type ApplicationCategory =
  | 'DESKTOP_GUI'
  | 'BROWSER_WEB'
  | 'TERMINAL_CLI'
  | 'IDE_EDITOR'
  | 'PRODUCTIVITY'
  | 'ENGINEERING'
  | 'MEDIA'
  | 'SYSTEM'
  | 'UTILITY'
  | 'EDITOR'
  | 'BROWSER'
  | 'TERMINAL'
  | 'IDE'
  | 'ENTERPRISE'
  | 'CUSTOM';

export type ApplicationReadinessState =
  | 'NOT_RUNNING'
  | 'INSTALLED'
  | 'STARTING'
  | 'INITIALIZING'
  | 'READY'
  | 'UNRESPONSIVE'
  | 'CRASHED'
  | 'CLOSING'
  | 'TERMINATED';

export type ApplicationHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'BUSY'
  | 'HUNG'
  | 'CRASHED'
  | 'DISCONNECTED'
  | 'UNKNOWN';

export interface ApplicationDescriptor {
  applicationId: string;
  id?: string;
  name: string;
  displayName: string;
  executablePath: string;
  executable?: string;
  version?: string;
  publisher?: string;
  category: ApplicationCategory;
  workspaceId: string;
  processIds?: number[];
  windowIds?: string[];
  capabilities: string[];
  authenticationState?: 'NONE' | 'AUTHENTICATED' | 'AUTH_REQUIRED' | 'MFA_REQUIRED' | 'CAPTCHA_REQUIRED';
  readinessState: ApplicationReadinessState;
  healthStatus: ApplicationHealthStatus;
  health?: ApplicationHealthStatus;
  installationSource: 'SYSTEM' | 'USER' | 'PACKAGE_MANAGER' | 'REMOTE' | string;
  provenance?: Record<string, any>;
  permissions?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSession {
  sessionId: string;
  id?: string;
  applicationId: string;
  workspaceId: string;
  processId?: number;
  mainWindowId?: string;
  mainHwnd?: string;
  windowTitle?: string;
  isFocused?: boolean;
  status?: 'RUNNING' | 'FOCUSED' | 'BACKGROUND' | 'CRASHED' | 'CLOSED';
  healthStatus: ApplicationHealthStatus;
  startedAt: string;
  closedAt?: string;
  metadata?: Record<string, any>;
}

export interface ApplicationLaunchOptions {
  workspaceId?: string;
  args?: string[];
  detached?: boolean;
  workingDirectory?: string;
  environment?: Record<string, string>;
  waitForReadiness?: boolean;
  timeoutMs?: number;
  preferredWindowMode?: 'NORMAL' | 'MAXIMIZED' | 'MINIMIZED';
}
