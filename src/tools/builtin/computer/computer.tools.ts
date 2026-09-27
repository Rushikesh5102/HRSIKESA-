/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Computer / Desktop Tools (Phase 7)
 *
 * Exposes Windows desktop automation capabilities to HṚṢĪKEŚA's Tool Execution Bus.
 * All tools strictly honor Danger Tiers, coordinate bounds, application allowlists, and audit logging.
 */

import { ITool } from '../../interfaces/tool.types.js';
import { DangerTier } from '../../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../../interfaces/execution.types.js';
import { IComputerAdapter, MouseButton, SpecialKey } from '../../computer/interfaces/computer.types.js';
import { ApplicationAllowlist } from '../../computer/security/app.allowlist.js';

// 1. computer.screen.size
export class ComputerScreenSizeTool implements ITool {
  public readonly id = 'computer.screen.size';
  public readonly name = 'Get Screen Resolution';
  public readonly description = 'Retrieve the primary display resolution and coordinate boundaries.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:inspect'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {}
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    _input: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const bounds = await this.adapter.getScreenSize();
      return {
        success: true,
        output: bounds,
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

// 2. computer.screenshot
export class ComputerScreenshotTool implements ITool {
  public readonly id = 'computer.screenshot';
  public readonly name = 'Capture Desktop Screenshot';
  public readonly description = 'Capture a full desktop screenshot and save it as an image artifact in data/screenshots/.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:inspect'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'Optional custom artifact filename (alphanumeric, dashes, underscores)'
      }
    }
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    input: { filename?: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.adapter.screenshot(input?.filename);
      return {
        success: true,
        output: res,
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

// 3. computer.window.active
export class ComputerWindowActiveTool implements ITool {
  public readonly id = 'computer.window.active';
  public readonly name = 'Get Active Window Info';
  public readonly description = 'Inspect the currently focused/active top-level desktop window title, process ID, and process name.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:inspect'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {}
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    _input: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const win = await this.adapter.getActiveWindow();
      return {
        success: true,
        output: win,
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

// 4. computer.mouse.move
export class ComputerMouseMoveTool implements ITool {
  public readonly id = 'computer.mouse.move';
  public readonly name = 'Move Mouse Cursor';
  public readonly description = 'Move the desktop mouse cursor to specified (x, y) coordinates within display boundaries.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      x: { type: 'number', description: 'Horizontal pixel coordinate' },
      y: { type: 'number', description: 'Vertical pixel coordinate' }
    },
    required: ['x', 'y']
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    input: { x: number; y: number },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const pos = await this.adapter.mouseMove(input.x, input.y);
      return {
        success: true,
        output: pos,
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

// 5. computer.mouse.click
export class ComputerMouseClickTool implements ITool {
  public readonly id = 'computer.mouse.click';
  public readonly name = 'Click Mouse Button';
  public readonly description = 'Perform a single mouse click at the current cursor position with left, right, or middle button.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      button: {
        type: 'string',
        enum: ['left', 'right', 'middle'],
        description: 'Mouse button to click (default: left)'
      }
    }
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    input: { button?: MouseButton },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.adapter.mouseClick(input?.button || 'left', false);
      return {
        success: true,
        output: res,
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

// 6. computer.mouse.double_click
export class ComputerMouseDoubleClickTool implements ITool {
  public readonly id = 'computer.mouse.double_click';
  public readonly name = 'Double Click Mouse Button';
  public readonly description = 'Perform a double click at the current cursor position.';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      button: {
        type: 'string',
        enum: ['left', 'right', 'middle'],
        description: 'Mouse button to double click (default: left)'
      }
    }
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    input: { button?: MouseButton },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.adapter.mouseClick(input?.button || 'left', true);
      return {
        success: true,
        output: res,
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

// 7. computer.keyboard.type
export class ComputerKeyboardTypeTool implements ITool {
  public readonly id = 'computer.keyboard.type';
  public readonly name = 'Type Keyboard Text';
  public readonly description = 'Type text into the currently active desktop window or focused input control (max 500 chars).';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text string to type into the active application'
      }
    },
    required: ['text']
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    input: { text: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.adapter.keyboardType(input.text);
      return {
        success: true,
        output: res,
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

// 8. computer.keyboard.keypress
export class ComputerKeyboardKeypressTool implements ITool {
  public readonly id = 'computer.keyboard.keypress';
  public readonly name = 'Press Keyboard Key';
  public readonly description = 'Press a single special keyboard key (e.g., ENTER, TAB, ESCAPE, BACKSPACE, UP, DOWN, LEFT, RIGHT, SPACE).';
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:interact'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Key name to press (e.g., ENTER, TAB, ESCAPE, BACKSPACE, DELETE, SPACE, UP, DOWN, LEFT, RIGHT)'
      }
    },
    required: ['key']
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    input: { key: SpecialKey | string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.adapter.keyPress(input.key);
      return {
        success: true,
        output: res,
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

// 9. computer.app.launch
export class ComputerAppLaunchTool implements ITool {
  public readonly id = 'computer.app.launch';
  public readonly name = 'Launch Desktop Application';
  public readonly description = `Launch an allowlisted Windows application (${ApplicationAllowlist.listAllowedApps().map(a => a.id).join(', ')}). Arbitrary unlisted executables are rejected.`;
  public readonly version = '1.0.0';
  public readonly category = 'computer';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['computer', 'computer:manage'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      appName: {
        type: 'string',
        description: `Target application alias (allowed: ${ApplicationAllowlist.listAllowedApps().map(a => a.id).join(', ')})`
      },
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional command-line arguments to pass to the application'
      }
    },
    required: ['appName']
  };

  constructor(private readonly adapter: IComputerAdapter) {}

  public async execute(
    input: { appName: string; args?: string[] },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const res = await this.adapter.launchApp(input.appName, input.args);
      return {
        success: true,
        output: res,
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

export function createComputerTools(adapter: IComputerAdapter): ITool[] {
  return [
    new ComputerScreenSizeTool(adapter),
    new ComputerScreenshotTool(adapter),
    new ComputerWindowActiveTool(adapter),
    new ComputerMouseMoveTool(adapter),
    new ComputerMouseClickTool(adapter),
    new ComputerMouseDoubleClickTool(adapter),
    new ComputerKeyboardTypeTool(adapter),
    new ComputerKeyboardKeypressTool(adapter),
    new ComputerAppLaunchTool(adapter)
  ];
}
