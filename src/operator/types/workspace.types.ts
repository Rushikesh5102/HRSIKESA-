/**
 * HṚṢĪKEŚA (हृषीकेश) — Universal Digital Workspace Types
 *
 * FP-13: Provider-independent contracts for desktop, browser, terminal, IDE,
 * and remote VDI/RDP workspace environments.
 */

export type DigitalWorkspaceType =
  | 'LOCAL_WINDOWS'
  | 'BROWSER'
  | 'TERMINAL'
  | 'IDE'
  | 'REMOTE_WINDOWS'
  | 'REMOTE_VDI'
  | 'REMOTE_BROWSER'
  | 'MCP_WORKSPACE'
  | 'VDI'
  | 'RDP'
  | 'CUSTOM';

export type DigitalWorkspaceStatus =
  | 'DISCOVERING'
  | 'AVAILABLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'READY'
  | 'BUSY'
  | 'WAITING_AUTH'
  | 'WAITING_USER'
  | 'DEGRADED'
  | 'BLOCKED'
  | 'DISCONNECTED'
  | 'RECOVERING'
  | 'CLOSED'
  | 'FAILED';

export type WorkspaceHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'BUSY'
  | 'HUNG'
  | 'CRASHED'
  | 'DISCONNECTED'
  | 'UNKNOWN';

export interface WorkspaceCapabilities {
  canObserveGUI?: boolean;
  canObserveDOM?: boolean;
  canObserveTerminal?: boolean;
  canControlMouse?: boolean;
  canControlKeyboard?: boolean;
  canExecuteTerminal?: boolean;
  canManageProcesses?: boolean;
  canCaptureScreenshot?: boolean;
  canInspectAccessibilityTree?: boolean;
  canReadFiles?: boolean;
  canWriteFiles?: boolean;
  canObserve?: boolean;
  canInteract?: boolean;
  canNavigateBrowser?: boolean;
  canAccessUia?: boolean;
  canAccessOcr?: boolean;
  canAccessVision?: boolean;
  supportsMultiWindow?: boolean;
  supportsFileTransfer?: boolean;
  supportsDirectMcp?: boolean;
}

export interface DigitalWorkspaceDescriptor {
  workspaceId: string;
  id?: string;
  name: string;
  workspaceType: DigitalWorkspaceType;
  type?: DigitalWorkspaceType;
  status: DigitalWorkspaceStatus;
  targetUri?: string;
  host?: string;
  isLocal?: boolean;
  capabilities: WorkspaceCapabilities;
  resourceUsage?: {
    cpuPercent?: number;
    memoryMb?: number;
  };
  activeApplicationId?: string | null;
  isAuthenticated: boolean;
  provenance?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSession {
  sessionId: string;
  id?: string;
  workspaceId: string;
  ownerAgentId: string;
  agentId?: string;
  taskId?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ACTIVE' | 'PAUSED' | 'IDLE' | 'TERMINATED';
  connectedAt: string;
  disconnectedAt?: string;
  startedAt?: string;
  endedAt?: string;
  metadata?: Record<string, any>;
}

export interface WorkspaceHealth {
  workspaceId: string;
  status: WorkspaceHealthStatus | string;
  isResponsive: boolean;
  cpuPercent?: number;
  memoryMb?: number;
  lastCheckTime?: string;
  activeApplicationsCount?: number;
  latencyMs?: number;
  activeWindowsCount?: number;
  activeProcessesCount?: number;
  details?: Record<string, any>;
}
