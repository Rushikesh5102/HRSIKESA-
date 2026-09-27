/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Semantic UI Automation Tools (Phase 9)
 *
 * Exposes Windows UI Automation (UIA) tree discovery, semantic search, and element actions.
 * Integrates with ToolExecutionBus, PermissionManager, and AuditLogger.
 */

import { ITool } from '../../interfaces/tool.types.js';
import { DangerTier } from '../../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../../interfaces/execution.types.js';
import { IUiaAdapter, UIElementSearchCriteria, UIElementFilterOptions } from '../../computer/uia/interfaces/uia.types.js';
import { SpecialKey } from '../../computer/interfaces/computer.types.js';

// Helper to resolve elementId from elementId or criteria
async function resolveTargetElementId(
  adapter: IUiaAdapter,
  input: { elementId?: string; criteria?: UIElementSearchCriteria }
): Promise<string> {
  if (input.elementId && typeof input.elementId === 'string') {
    return input.elementId;
  }
  if (input.criteria && typeof input.criteria === 'object') {
    const matches = await adapter.findElements(input.criteria);
    if (!matches || matches.length === 0) {
      throw new Error(`No UI element found matching criteria: ${JSON.stringify(input.criteria)}`);
    }
    return matches[0].id;
  }
  throw new Error('Either "elementId" or "criteria" must be provided.');
}

// 1. computer.ui.observe
export class UIObserveTool implements ITool {
  public readonly id = 'computer.ui.observe';
  public readonly name = 'Observe Active Window UI Tree';
  public readonly description = 'Inspect the currently active desktop window and retrieve a structured, filtered semantic UI element tree.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:inspect'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      maxDepth: {
        type: 'number',
        description: 'Maximum depth of child elements to traverse (default: 3, max: 5)'
      },
      maxElements: {
        type: 'number',
        description: 'Maximum total elements to return in the tree (default: 60, max: 150)'
      },
      omitInvisible: {
        type: 'boolean',
        description: 'Whether to omit offscreen or invisible UI elements (default: true)'
      }
    }
  };

  constructor(private readonly uiaAdapter: IUiaAdapter) {}

  public async execute(
    input: { maxDepth?: number; maxElements?: number; omitInvisible?: boolean },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const options: UIElementFilterOptions = {
        maxDepth: input?.maxDepth,
        maxElements: input?.maxElements,
        omitInvisible: input?.omitInvisible ?? true
      };
      const windowTree = await this.uiaAdapter.observeActiveWindow(options);
      return {
        success: true,
        output: windowTree,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 2. computer.ui.find
export class UIFindTool implements ITool {
  public readonly id = 'computer.ui.find';
  public readonly name = 'Find UI Elements Semantically';
  public readonly description = 'Search for UI elements matching semantic criteria (name, controlType, automationId, className, role) in the active window or target process.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:inspect'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Element accessible name or label (exact or partial match)'
      },
      controlType: {
        type: 'string',
        description: 'UIA control type (e.g. edit, button, menuItem, window, text, document, list)'
      },
      automationId: {
        type: 'string',
        description: 'Element AutomationId identifier'
      },
      className: {
        type: 'string',
        description: 'Element Win32/WPF class name (e.g. Edit, RichEditD2DPT)'
      },
      role: {
        type: 'string',
        description: 'Element role description'
      }
    }
  };

  constructor(private readonly uiaAdapter: IUiaAdapter) {}

  public async execute(
    input: UIElementSearchCriteria,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const elements = await this.uiaAdapter.findElements(input);
      return {
        success: true,
        output: {
          count: elements.length,
          elements
        },
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 3. computer.ui.focus
export class UIFocusTool implements ITool {
  public readonly id = 'computer.ui.focus';
  public readonly name = 'Focus Semantic UI Element';
  public readonly description = 'Set keyboard and accessibility focus onto a specific UI element referenced by ID or search criteria.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      elementId: {
        type: 'string',
        description: 'Unique element ID returned by computer.ui.observe or computer.ui.find (e.g. elem_1)'
      },
      criteria: {
        type: 'object',
        description: 'Optional semantic search criteria if elementId is not provided',
        properties: {
          name: { type: 'string' },
          controlType: { type: 'string' },
          automationId: { type: 'string' },
          className: { type: 'string' }
        }
      }
    }
  };

  constructor(private readonly uiaAdapter: IUiaAdapter) {}

  public async execute(
    input: { elementId?: string; criteria?: UIElementSearchCriteria },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const targetId = await resolveTargetElementId(this.uiaAdapter, input);
      const result = await this.uiaAdapter.focusElement(targetId);
      return {
        success: result.success,
        output: result,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 4. computer.ui.click
export class UIClickTool implements ITool {
  public readonly id = 'computer.ui.click';
  public readonly name = 'Click Semantic UI Element';
  public readonly description = 'Invoke or click a specific UI element referenced by ID or search criteria using InvokePattern or verified bounds.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      elementId: {
        type: 'string',
        description: 'Unique element ID returned by computer.ui.observe or computer.ui.find (e.g. elem_1)'
      },
      criteria: {
        type: 'object',
        description: 'Optional semantic search criteria if elementId is not provided',
        properties: {
          name: { type: 'string' },
          controlType: { type: 'string' },
          automationId: { type: 'string' },
          className: { type: 'string' }
        }
      }
    }
  };

  constructor(private readonly uiaAdapter: IUiaAdapter) {}

  public async execute(
    input: { elementId?: string; criteria?: UIElementSearchCriteria },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const targetId = await resolveTargetElementId(this.uiaAdapter, input);
      const result = await this.uiaAdapter.clickElement(targetId);
      return {
        success: result.success,
        output: result,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 5. computer.ui.type
export class UITypeTool implements ITool {
  public readonly id = 'computer.ui.type';
  public readonly name = 'Type Text Into UI Element';
  public readonly description = 'Focus an editable UI element and type text, returning previous and new state for verification.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      elementId: {
        type: 'string',
        description: 'Unique element ID returned by computer.ui.observe or computer.ui.find (e.g. elem_1)'
      },
      text: {
        type: 'string',
        description: 'Text string to type into the target element (max 500 chars)'
      },
      criteria: {
        type: 'object',
        description: 'Optional semantic search criteria if elementId is not provided',
        properties: {
          name: { type: 'string' },
          controlType: { type: 'string' },
          automationId: { type: 'string' },
          className: { type: 'string' }
        }
      }
    },
    required: ['text']
  };

  constructor(private readonly uiaAdapter: IUiaAdapter) {}

  public async execute(
    input: { elementId?: string; text: string; criteria?: UIElementSearchCriteria },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      if (typeof input.text !== 'string') {
        return {
          success: false,
          error: 'Parameter "text" is required for computer.ui.type.',
          durationMs: Date.now() - startTime
        };
      }
      const targetId = await resolveTargetElementId(this.uiaAdapter, input);
      const result = await this.uiaAdapter.typeText(targetId, input.text);
      return {
        success: result.success,
        output: result,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

// 6. computer.ui.keypress
export class UIKeypressTool implements ITool {
  public readonly id = 'computer.ui.keypress';
  public readonly name = 'Send Keypress to UI Element';
  public readonly description = 'Focus a specific UI element and send a special key (e.g. ENTER, TAB, ESCAPE, BACKSPACE, UP, DOWN).';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      elementId: {
        type: 'string',
        description: 'Unique element ID returned by computer.ui.observe or computer.ui.find (e.g. elem_1)'
      },
      key: {
        type: 'string',
        description: 'Key name (ENTER, TAB, ESCAPE, BACKSPACE, DELETE, SPACE, UP, DOWN, LEFT, RIGHT)'
      },
      criteria: {
        type: 'object',
        description: 'Optional semantic search criteria if elementId is not provided',
        properties: {
          name: { type: 'string' },
          controlType: { type: 'string' },
          automationId: { type: 'string' },
          className: { type: 'string' }
        }
      }
    },
    required: ['key']
  };

  constructor(private readonly uiaAdapter: IUiaAdapter) {}

  public async execute(
    input: { elementId?: string; key: SpecialKey | string; criteria?: UIElementSearchCriteria },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      if (!input.key) {
        return {
          success: false,
          error: 'Parameter "key" is required for computer.ui.keypress.',
          durationMs: Date.now() - startTime
        };
      }
      const targetId = await resolveTargetElementId(this.uiaAdapter, input);
      const result = await this.uiaAdapter.sendKeypress(targetId, String(input.key));
      return {
        success: result.success,
        output: result,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }
}

export function createUiaTools(adapter: IUiaAdapter): ITool[] {
  return [
    new UIObserveTool(adapter),
    new UIFindTool(adapter),
    new UIFocusTool(adapter),
    new UIClickTool(adapter),
    new UITypeTool(adapter),
    new UIKeypressTool(adapter)
  ];
}
