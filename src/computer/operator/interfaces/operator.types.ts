/**
 * HṚṢĪKEŚA (हृषीकेश) — Advanced Computer Operator Interfaces & Domain Models
 *
 * Phase 22: Perception, planning, execution, verification, and recovery
 * for autonomous, permission-aware desktop computer operations.
 */

import { MouseButton, SpecialKey } from '../../../tools/computer/interfaces/computer.types.js';
import { UIBoundingBox } from '../../../tools/computer/uia/interfaces/uia.types.js';

export type ComputerScope =
  | 'DESKTOP'
  | 'APPLICATION'
  | 'WINDOW'
  | 'DOCUMENT'
  | 'BROWSER'
  | 'VDI'
  | 'REMOTE_SESSION';

export type ComputerSafetyTier =
  | 'SAFE'
  | 'LOW_RISK'
  | 'MEDIUM_RISK'
  | 'HIGH_RISK'
  | 'CRITICAL';

export const ActionType = {
  MOVE: 'MOVE',
  CLICK: 'CLICK',
  DOUBLE_CLICK: 'DOUBLE_CLICK',
  RIGHT_CLICK: 'RIGHT_CLICK',
  TYPE: 'TYPE',
  KEYPRESS: 'KEYPRESS',
  HOTKEY: 'HOTKEY',
  SCROLL: 'SCROLL',
  DRAG: 'DRAG',
  SELECT: 'SELECT',
  FOCUS: 'FOCUS',
  OPEN: 'OPEN',
  CLOSE: 'CLOSE',
  MINIMIZE: 'MINIMIZE',
  MAXIMIZE: 'MAXIMIZE',
  RESTORE: 'RESTORE',
  WAIT: 'WAIT',
  LAUNCH: 'LAUNCH',
  TERMINATE: 'TERMINATE',
  PASTE: 'PASTE',
  COPY: 'COPY',
  CUT: 'CUT'
} as const;
export type ComputerActionType = (typeof ActionType)[keyof typeof ActionType];

export const TargetMethod = {
  UIA_SEMANTIC: 'UIA_SEMANTIC',
  AUTOMATION_ID: 'AUTOMATION_ID',
  ACCESSIBLE_NAME: 'ACCESSIBLE_NAME',
  NORMALIZED_TEXT: 'NORMALIZED_TEXT',
  CONTROL_TYPE: 'CONTROL_TYPE',
  RELATIVE_STRUCTURE: 'RELATIVE_STRUCTURE',
  VISUAL_OCR: 'VISUAL_OCR',
  COORDINATES: 'COORDINATES',
  COORDINATE_FALLBACK: 'COORDINATES'
} as const;
export type ResolutionMethod = (typeof TargetMethod)[keyof typeof TargetMethod];

export const VerificationStrategy = {
  WINDOW_PRESENT: 'WINDOW_PRESENT',
  WINDOW_ABSENT: 'WINDOW_ABSENT',
  ELEMENT_PRESENT: 'ELEMENT_PRESENT',
  ELEMENT_ABSENT: 'ELEMENT_ABSENT',
  ELEMENT_VALUE: 'ELEMENT_VALUE',
  FOCUS_CHANGED: 'FOCUS_CHANGED',
  TEXT_PRESENT: 'TEXT_PRESENT',
  TEXT_ABSENT: 'TEXT_ABSENT',
  PROCESS_RUNNING: 'PROCESS_RUNNING',
  PROCESS_EXITED: 'PROCESS_EXITED',
  TITLE_MATCH: 'TITLE_MATCH',
  UI_TREE_CHANGED: 'UI_TREE_CHANGED',
  SCREEN_REGION_CHANGED: 'SCREEN_REGION_CHANGED',
  CUSTOM_PREDICATE: 'CUSTOM_PREDICATE'
} as const;
export type VerificationStrategy = (typeof VerificationStrategy)[keyof typeof VerificationStrategy];

export type ComputerTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'NEEDS_USER'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export const FailureClassification = {
  STALE_ELEMENT: 'STALE_ELEMENT',
  WRONG_FOCUS: 'WRONG_FOCUS',
  WINDOW_MOVED: 'WINDOW_MOVED',
  WINDOW_CLOSED: 'WINDOW_CLOSED',
  APPLICATION_BUSY: 'APPLICATION_BUSY',
  APPLICATION_CRASHED: 'APPLICATION_CRASHED',
  UNEXPECTED_DIALOG: 'UNEXPECTED_DIALOG',
  UNEXPECTED_NAVIGATION: 'UNEXPECTED_NAVIGATION',
  UI_CHANGED: 'UI_CHANGED',
  TARGET_DISAPPEARED: 'TARGET_DISAPPEARED',
  TARGET_NOT_FOUND: 'TARGET_DISAPPEARED',
  TIMEOUT: 'TIMEOUT',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  CAPTCHA_DETECTED: 'CAPTCHA_DETECTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED'
} as const;
export type FailureClassification = (typeof FailureClassification)[keyof typeof FailureClassification];

export const RecoveryStrategy = {
  RETRY_SAFE: 'RETRY_SAFE',
  REFOCUS_WINDOW: 'REFOCUS_WINDOW',
  REOBSERVE_AND_REPLAN: 'REOBSERVE_AND_REPLAN',
  REOBSERVE_AND_RERESOLVE: 'REOBSERVE_AND_REPLAN',
  DISMISS_MODAL: 'DISMISS_MODAL',
  WAIT_FOR_BUSY: 'WAIT_FOR_BUSY',
  RESTART_APP: 'RESTART_APP',
  PAUSE_FOR_USER: 'PAUSE_FOR_USER',
  ABORT: 'ABORT'
} as const;
export type RecoveryStrategy = (typeof RecoveryStrategy)[keyof typeof RecoveryStrategy];

export interface ScreenMetrics {
  readonly width: number;
  readonly height: number;
  readonly scaleFactor?: number;
  readonly primaryMonitor?: boolean;
}

export interface ControlObservation {
  readonly id: string;
  readonly name: string;
  readonly controlType: string;
  readonly automationId?: string;
  readonly className?: string;
  readonly value?: string;
  readonly enabled: boolean;
  readonly visible: boolean;
  readonly bounds?: UIBoundingBox;
  readonly isFocused?: boolean;
  readonly isSelected?: boolean;
  readonly isChecked?: boolean;
  readonly availablePatterns?: readonly string[];
  readonly children?: readonly ControlObservation[];
}

export interface WindowObservation {
  readonly hwnd: number | string;
  readonly title: string;
  readonly processId: number;
  readonly processName: string;
  readonly bounds?: UIBoundingBox;
  readonly isForeground: boolean;
  readonly isMinimized?: boolean;
  readonly isMaximized?: boolean;
  readonly controls: readonly ControlObservation[];
}

export interface DesktopObservation {
  readonly id: string;
  readonly timestamp: string;
  readonly capturedAt?: string;
  readonly screenMetrics: ScreenMetrics;
  readonly activeWindow?: WindowObservation;
  readonly visibleWindows: readonly WindowObservation[];
  readonly focusedControl?: ControlObservation;
  readonly screenshotArtifactPath?: string;
  readonly nodeCount: number;
  readonly domHash: string;
  readonly summary: string;
}

export interface TargetDescription {
  readonly query?: string;
  readonly coordinates?: { readonly x: number; readonly y: number };
  readonly expectedControlType?: string;
  readonly expectedWindow?: string;
  readonly automationId?: string;
  readonly positionHint?: 'first' | 'last' | 'nth' | 'center' | 'top' | 'bottom';
  readonly index?: number;
  readonly relativeTo?: {
    readonly targetQuery: string;
    readonly direction: 'left' | 'right' | 'above' | 'below' | 'inside';
  };
}

export interface ResolvedTarget {
  readonly targetId: string;
  readonly name: string;
  readonly controlType: string;
  readonly method: ResolutionMethod;
  readonly confidence: number; // 0.0 to 1.0
  readonly bounds: UIBoundingBox;
  readonly windowHandle?: number | string;
  readonly evidence: string;
  readonly isAmbiguous?: boolean;
  readonly alternativeMatches?: number;
  readonly timestamp: string;
}

export interface ActionPrecondition {
  readonly targetExists?: boolean;
  readonly targetVisible?: boolean;
  readonly targetEnabled?: boolean;
  readonly expectedWindow?: string;
  readonly expectedProcessId?: number;
  readonly customCheck?: string;
}

export interface ComputerAction {
  readonly id: string;
  readonly type: ComputerActionType;
  readonly target?: TargetDescription | ResolvedTarget;
  readonly params?: {
    readonly text?: string;
    readonly key?: SpecialKey | string;
    readonly hotkeyModifiers?: readonly ('Ctrl' | 'Alt' | 'Shift' | 'Win')[];
    readonly mouseButton?: MouseButton;
    readonly doubleClick?: boolean;
    readonly coordinates?: { readonly x: number; readonly y: number };
    readonly dragDestination?: { readonly x: number; readonly y: number } | TargetDescription | ResolvedTarget;
    readonly scrollDelta?: number;
    readonly scrollDirection?: 'up' | 'down' | 'left' | 'right';
    readonly appName?: string;
    readonly appArgs?: readonly string[];
    readonly waitMs?: number;
  };
  readonly preconditions?: ActionPrecondition;
  readonly expectedVerification?: VerificationRule;
  readonly riskTier?: ComputerSafetyTier;
  readonly scope?: ComputerScope;
  readonly requiresApproval?: boolean;
}

export interface VerificationRule {
  readonly strategy: VerificationStrategy;
  readonly targetElementId?: string;
  readonly expectedValue?: string;
  readonly expectedTitle?: string;
  readonly expectedProcessName?: string;
  readonly expectedProcessId?: number;
  readonly expectedRegion?: UIBoundingBox;
  readonly timeoutMs?: number;
  readonly pollIntervalMs?: number;
}

export interface VerificationResult {
  readonly verified: boolean;
  readonly strategy: VerificationStrategy;
  readonly durationMs: number;
  readonly evidence: string;
  readonly observedValue?: unknown;
  readonly mismatchDetails?: string;
  readonly timestamp: string;
}

export interface ActionResult {
  readonly actionId: string;
  readonly success: boolean;
  readonly actionType: ComputerActionType;
  readonly resolvedTarget?: ResolvedTarget;
  readonly preconditionPassed: boolean;
  readonly verification: VerificationResult;
  readonly durationMs: number;
  readonly screenshotPath?: string;
  readonly error?: string;
  readonly failureClassification?: FailureClassification;
}

export interface RecoveryAttempt {
  readonly attemptNumber: number;
  readonly failure: FailureClassification;
  readonly strategy: RecoveryStrategy;
  readonly actionTaken: string;
  readonly success: boolean;
  readonly error?: string;
  readonly timestamp: string;
}

export interface ComputerState {
  readonly activeWindow?: WindowObservation;
  readonly foregroundProcess?: string;
  readonly focusedElement?: ControlObservation;
  readonly lastObservation?: DesktopObservation;
  readonly lastAction?: ComputerAction;
  readonly pendingVerification?: VerificationRule;
  readonly recentActions: readonly ActionResult[];
  readonly recoveryHistory: readonly RecoveryAttempt[];
  readonly loopDetectionHistory: readonly string[];
}

export interface ComputerTask {
  readonly id: string;
  readonly intent: string;
  readonly objective: string;
  readonly scope: ComputerScope;
  readonly status: ComputerTaskStatus;
  readonly targetApplication?: string;
  readonly targetWindow?: string;
  readonly maxActions: number;
  readonly actionsExecuted: number;
  readonly retriesCount: number;
  readonly errorMessage?: string;
  readonly requiresApproval: boolean;
  readonly approvalId?: string;
  readonly agentId?: string;
  readonly missionId?: string;
  readonly goalId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
}

export interface LearnedUIPattern {
  readonly id: string;
  readonly applicationName: string;
  readonly windowTitlePattern?: string;
  readonly elementDescriptor: string;
  readonly automationId?: string;
  readonly controlType?: string;
  readonly accessibleName?: string;
  readonly className?: string;
  readonly confidence: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly lastVerifiedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
