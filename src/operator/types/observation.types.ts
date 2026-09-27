/**
 * HṚṢĪKEŚA (हृषीकेश) — Workspace Observation & UI Tree Types
 *
 * FP-13: Normalized multi-layered observation envelope:
 * 1. Semantic/UIA -> 2. A11y -> 3. DOM -> 4. App API -> 5. OCR -> 6. Vision -> 7. Coordinates
 */

export type ObservationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS';

export type ObservationLayer =
  | 'SEMANTIC_UIA'
  | 'ACCESSIBILITY_TREE'
  | 'BROWSER_DOM'
  | 'TERMINAL_STATE'
  | 'STRUCTURED_API'
  | 'OCR'
  | 'OCR_TEXT'
  | 'VISION_MODEL'
  | 'BOUNDED_COORDINATES'
  | 'LEARNED_PATTERN'
  | 'SEMANTIC_SELECTOR'
  | 'ACCESSIBILITY_PROPERTIES'
  | 'SCREENSHOT'
  | 'NONE';

export interface UIElementNode {
  elementId: string;
  id?: string;
  name: string;
  role?: string;
  controlType?: string;
  className?: string;
  automationId?: string;
  isEnabled?: boolean;
  isVisible?: boolean;
  isFocused?: boolean;
  isPassword?: boolean;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  textContent?: string;
  placeholder?: string;
  value?: string;
  children?: UIElementNode[];
}

export interface WindowDescriptor {
  windowId: string;
  id?: string;
  title: string;
  processId?: number;
  processName?: string;
  isFocused: boolean;
  isMinimized?: boolean;
  isMaximized?: boolean;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface WorkspaceObservation {
  observationId: string;
  id?: string;
  workspaceId: string;
  activeApplicationId?: string;
  activeApplication?: string;
  activeWindowTitle?: string;
  activeWindowHandle?: string;
  activeWindow?: WindowDescriptor;
  windows: WindowDescriptor[];
  uiTree: UIElementNode[];
  focusedElement?: UIElementNode;
  ocrText?: string;
  screenshotRef?: string;
  dialogs: Array<{
    title: string;
    message?: string;
    isModal?: boolean;
    buttons?: string[];
  }>;
  isLoading?: boolean;
  isError?: boolean;
  hasModal?: boolean;
  hasSecurityChallenge?: boolean;
  authenticationState?: 'NORMAL' | 'MFA_PAUSED' | 'CAPTCHA_PAUSED' | 'AUTH_REQUIRED';
  confidence: ObservationConfidence;
  observedLayers: ObservationLayer[] | string[];
  capturedAt: string;
  metadata?: Record<string, any>;
}
