/**
 * HṚṢĪKEŚA (हृषीकेश) — Mock UI Automation Adapter
 */

import {
  IUiaAdapter,
  UIWindow,
  UIElement,
  UIElementFilterOptions,
  UIElementSearchCriteria,
  UIActionResult
} from '../interfaces/uia.types.js';
import { UiaSecurityValidator } from '../security/uia.security.js';

export class MockUiaAdapter implements IUiaAdapter {
  public readonly id = 'mock-uia';
  public readonly name = 'Mock UI Automation Adapter';
  public initialized = false;
  public observeCallCount = 0;
  public clickCallCount = 0;
  public typeCallCount = 0;
  public lastTypedText = '';
  public lastClickedElementId = '';

  public mockWindow: UIWindow = {
    title: 'Untitled - Notepad',
    processName: 'Notepad',
    processId: 1234,
    handle: 5678,
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
        name: 'Close',
        controlType: 'Button',
        enabled: true,
        visible: true,
        bounds: { x: 860, y: 105, width: 35, height: 25 }
      }
    ]
  };

  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async observeActiveWindow(options?: UIElementFilterOptions): Promise<UIWindow> {
    this.observeCallCount++;
    const normalized = UiaSecurityValidator.normalizeFilterOptions(options);
    const limitedElements = this.mockWindow.elements
      .slice(0, normalized.maxElements)
      .map(el => UiaSecurityValidator.sanitizeElement(el));

    return {
      ...this.mockWindow,
      elements: limitedElements
    };
  }

  public async findElement(criteria: UIElementSearchCriteria, windowHandle?: number): Promise<UIElement | undefined> {
    const results = await this.findElements(criteria, windowHandle);
    return results[0];
  }

  public async findElements(criteria: UIElementSearchCriteria, _windowHandle?: number): Promise<readonly UIElement[]> {
    UiaSecurityValidator.validateSearchCriteria(criteria);
    return this.mockWindow.elements.filter((el) => {
      if (criteria.name && !el.name.toLowerCase().includes(criteria.name.toLowerCase())) return false;
      if (criteria.controlType && el.controlType.toLowerCase() !== criteria.controlType.toLowerCase()) return false;
      if (criteria.automationId && el.automationId?.toLowerCase() !== criteria.automationId.toLowerCase()) return false;
      if (criteria.className && el.className?.toLowerCase() !== criteria.className.toLowerCase()) return false;
      return true;
    });
  }

  public async clickElement(elementId: string): Promise<UIActionResult> {
    this.clickCallCount++;
    this.lastClickedElementId = elementId;
    const found = this.mockWindow.elements.find(e => e.id === elementId);
    if (!found) {
      throw new Error(`Stale element reference: '${elementId}' was not found in mock window.`);
    }

    return {
      success: true,
      elementId,
      action: 'click',
      message: `Clicked mock element '${found.name}'.`
    };
  }

  public async focusElement(elementId: string): Promise<UIActionResult> {
    return this.clickElement(elementId);
  }

  public async typeText(elementId: string, text: string): Promise<UIActionResult> {
    this.typeCallCount++;
    this.lastTypedText = text;
    const found = this.mockWindow.elements.find(e => e.id === elementId);
    if (!found) {
      throw new Error(`Stale element reference: '${elementId}' was not found in mock window.`);
    }

    const previousValue = found.value;
    (found as { value?: string }).value = text;

    return {
      success: true,
      elementId,
      action: 'type',
      previousValue,
      updatedValue: text,
      message: `Typed text into mock element '${found.name}'.`
    };
  }

  public async sendKeypress(elementId: string, key: string): Promise<UIActionResult> {
    const found = this.mockWindow.elements.find(e => e.id === elementId);
    if (!found) {
      throw new Error(`Stale element reference: '${elementId}' was not found in mock window.`);
    }

    return {
      success: true,
      elementId,
      action: 'keypress',
      message: `Dispatched keypress '${key}' to mock element '${found.name}'.`
    };
  }

  public async getElementValue(elementId: string): Promise<string | undefined> {
    const found = this.mockWindow.elements.find(e => e.id === elementId);
    return found?.value;
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
  }

  public async dispose(): Promise<void> {
    await this.shutdown();
  }
}
