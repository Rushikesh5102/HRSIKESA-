/**
 * HṚṢĪKEŚA (हृषीकेश) — Semantic Windows UI Automation Interfaces & Types
 */

export interface UIBoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface UIElement {
  readonly id: string;
  readonly name: string;
  readonly controlType: string;
  readonly role?: string;
  readonly automationId?: string;
  readonly className?: string;
  readonly value?: string;
  readonly enabled: boolean;
  readonly visible: boolean;
  readonly bounds?: UIBoundingBox;
  readonly parentId?: string;
  readonly children?: readonly UIElement[];
}

export interface UIWindow {
  readonly title: string;
  readonly processName: string;
  readonly processId: number;
  readonly handle?: number;
  readonly bounds?: UIBoundingBox;
  readonly elements: readonly UIElement[];
}

export interface UIElementFilterOptions {
  readonly maxDepth?: number;
  readonly maxElements?: number;
  readonly maxTextLength?: number;
  readonly omitInvisible?: boolean;
  readonly omitSystemNodes?: boolean;
}

export interface UIElementSearchCriteria {
  readonly name?: string;
  readonly controlType?: string;
  readonly automationId?: string;
  readonly className?: string;
  readonly role?: string;
}

export interface UIActionResult {
  readonly success: boolean;
  readonly elementId: string;
  readonly action: 'click' | 'focus' | 'type' | 'keypress';
  readonly previousValue?: string;
  readonly updatedValue?: string;
  readonly message?: string;
}

export interface IUiaAdapter {
  readonly id: string;
  readonly name: string;
  initialize(): Promise<void>;
  observeActiveWindow(options?: UIElementFilterOptions): Promise<UIWindow>;
  findElement(criteria: UIElementSearchCriteria, windowHandle?: number): Promise<UIElement | undefined>;
  findElements(criteria: UIElementSearchCriteria, windowHandle?: number): Promise<readonly UIElement[]>;
  clickElement(elementId: string): Promise<UIActionResult>;
  focusElement(elementId: string): Promise<UIActionResult>;
  typeText(elementId: string, text: string): Promise<UIActionResult>;
  sendKeypress(elementId: string, key: string): Promise<UIActionResult>;
  getElementValue(elementId: string): Promise<string | undefined>;
  shutdown(): Promise<void>;
  dispose(): Promise<void>;
}
