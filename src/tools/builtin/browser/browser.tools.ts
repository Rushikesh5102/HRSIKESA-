/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Browser Tools (Phase 6)
 *
 * Exposes browser automation capabilities to HṚṢĪKEŚA's Tool Execution Bus.
 * All tools strictly honor Danger Tiers, URL safety verification, and audit logging.
 */

import { ITool } from '../../interfaces/tool.types.js';
import { DangerTier } from '../../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../../interfaces/execution.types.js';
import { IBrowserAdapter } from '../../browser/interfaces/browser.types.js';

/**
 * Helper to ensure a valid session ID from tool input, creating a default session if omitted.
 */
async function resolveSessionId(
  adapter: IBrowserAdapter,
  providedSessionId?: string
): Promise<string> {
  if (providedSessionId) {
    const existing = adapter.getSession(providedSessionId);
    if (existing && existing.status !== 'closed') {
      return providedSessionId;
    }
  }

  // Find any active session
  const active = adapter.listSessions().find((s) => s.status !== 'closed');
  if (active) {
    return active.id;
  }

  // Create new session
  const created = await adapter.createSession();
  return created.id;
}

// 1. browser.session.create
export class BrowserSessionCreateTool implements ITool {
  public readonly id = 'browser.session.create';
  public readonly name = 'Browser Session Create';
  public readonly description = 'Launches an ephemeral, sandboxed browser session and returns session metadata.';
  public readonly version = '1.0.0';
  public readonly category = 'browser';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['browser', 'browser:session'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      browserType: {
        type: 'string',
        enum: ['chrome', 'msedge', 'chromium'],
        description: 'Target browser channel (default: chrome/msedge auto-detection).',
      },
      headless: {
        type: 'boolean',
        description: 'Whether to run headless (default: true).',
      },
    },
  };

  constructor(private readonly adapter: IBrowserAdapter) {}

  public async execute(
    input: { browserType?: 'chrome' | 'msedge' | 'chromium'; headless?: boolean },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const session = await this.adapter.createSession(input);
      return {
        success: true,
        output: session,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// 2. browser.navigate
export class BrowserNavigateTool implements ITool {
  public readonly id = 'browser.navigate';
  public readonly name = 'Browser Navigate';
  public readonly description = 'Navigates the browser to a validated HTTP/HTTPS URL and returns distilled page content.';
  public readonly version = '1.0.0';
  public readonly category = 'browser';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['browser', 'browser:navigate'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The HTTP or HTTPS URL to navigate to (e.g. "https://example.com"). Protocols like file:// or javascript: are blocked.',
      },
      sessionId: {
        type: 'string',
        description: 'Optional browser session ID. If omitted, uses or creates the default session.',
      },
      timeoutMs: {
        type: 'number',
        description: 'Navigation timeout in milliseconds (default: 30000).',
      },
    },
    required: ['url'],
  };

  constructor(private readonly adapter: IBrowserAdapter) {}

  public async execute(
    input: { url: string; sessionId?: string; timeoutMs?: number },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const sessionId = await resolveSessionId(this.adapter, input.sessionId);
      const observation = await this.adapter.navigate(sessionId, input.url, input.timeoutMs);
      return {
        success: true,
        output: observation,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// 3. browser.page.read
export class BrowserPageReadTool implements ITool {
  public readonly id = 'browser.page.read';
  public readonly name = 'Browser Page Read';
  public readonly description = 'Reads and distills the visible text, title, headings, and interactive elements of the current page.';
  public readonly version = '1.0.0';
  public readonly category = 'browser';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['browser', 'browser:read'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Optional browser session ID. If omitted, uses active session.',
      },
      maxTextLength: {
        type: 'number',
        description: 'Maximum characters of visible text to return (default: 8000).',
      },
    },
  };

  constructor(private readonly adapter: IBrowserAdapter) {}

  public async execute(
    input: { sessionId?: string; maxTextLength?: number },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const sessionId = await resolveSessionId(this.adapter, input.sessionId);
      const observation = await this.adapter.readPage(sessionId, input.maxTextLength);
      return {
        success: true,
        output: observation,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// 4. browser.click
export class BrowserClickTool implements ITool {
  public readonly id = 'browser.click';
  public readonly name = 'Browser Click';
  public readonly description = 'Clicks an interactive element on the page using a CSS selector or text matcher.';
  public readonly version = '1.0.0';
  public readonly category = 'browser';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['browser', 'browser:action'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector or text matcher for the target element (e.g. "button#submit", "a.nav-link", "text=Sign In").',
      },
      sessionId: {
        type: 'string',
        description: 'Optional browser session ID.',
      },
      timeoutMs: {
        type: 'number',
        description: 'Click timeout in milliseconds (default: 10000).',
      },
    },
    required: ['selector'],
  };

  constructor(private readonly adapter: IBrowserAdapter) {}

  public async execute(
    input: { selector: string; sessionId?: string; timeoutMs?: number },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const sessionId = await resolveSessionId(this.adapter, input.sessionId);
      const observation = await this.adapter.click(sessionId, input.selector, input.timeoutMs);
      return {
        success: true,
        output: observation,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// 5. browser.type
export class BrowserTypeTool implements ITool {
  public readonly id = 'browser.type';
  public readonly name = 'Browser Type';
  public readonly description = 'Fills text into an input or textarea element on the active page.';
  public readonly version = '1.0.0';
  public readonly category = 'browser';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['browser', 'browser:action'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the target input (e.g. "input[name=q]", "#search-input").',
      },
      text: {
        type: 'string',
        description: 'The text value to fill into the input.',
      },
      sessionId: {
        type: 'string',
        description: 'Optional browser session ID.',
      },
      timeoutMs: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 10000).',
      },
    },
    required: ['selector', 'text'],
  };

  constructor(private readonly adapter: IBrowserAdapter) {}

  public async execute(
    input: { selector: string; text: string; sessionId?: string; timeoutMs?: number },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const sessionId = await resolveSessionId(this.adapter, input.sessionId);
      const observation = await this.adapter.type(sessionId, input.selector, input.text, input.timeoutMs);
      return {
        success: true,
        output: observation,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// 6. browser.keypress
export class BrowserKeypressTool implements ITool {
  public readonly id = 'browser.keypress';
  public readonly name = 'Browser Keypress';
  public readonly description = 'Presses a specific keyboard key (e.g. "Enter", "Tab", "Escape", "ArrowDown").';
  public readonly version = '1.0.0';
  public readonly category = 'browser';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false;
  public readonly capabilities = ['browser', 'browser:action'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The key name to press (e.g. "Enter", "Tab", "Escape", "ArrowDown", "PageDown").',
      },
      sessionId: {
        type: 'string',
        description: 'Optional browser session ID.',
      },
      timeoutMs: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 5000).',
      },
    },
    required: ['key'],
  };

  constructor(private readonly adapter: IBrowserAdapter) {}

  public async execute(
    input: { key: string; sessionId?: string; timeoutMs?: number },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const sessionId = await resolveSessionId(this.adapter, input.sessionId);
      const observation = await this.adapter.keypress(sessionId, input.key, input.timeoutMs);
      return {
        success: true,
        output: observation,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// 7. browser.screenshot
export class BrowserScreenshotTool implements ITool {
  public readonly id = 'browser.screenshot';
  public readonly name = 'Browser Screenshot';
  public readonly description = 'Captures a screenshot of the active page and saves it as a local image artifact.';
  public readonly version = '1.0.0';
  public readonly category = 'browser';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['browser', 'browser:screenshot'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Optional browser session ID.',
      },
      fullPage: {
        type: 'boolean',
        description: 'Whether to capture full scrollable page or visible viewport (default: false).',
      },
      filename: {
        type: 'string',
        description: 'Custom filename for the screenshot (default: auto-generated timestamp).',
      },
    },
  };

  constructor(private readonly adapter: IBrowserAdapter) {}

  public async execute(
    input: { sessionId?: string; fullPage?: boolean; filename?: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const sessionId = await resolveSessionId(this.adapter, input.sessionId);
      const result = await this.adapter.screenshot(sessionId, {
        fullPage: input.fullPage,
        filename: input.filename,
      });
      return {
        success: true,
        output: {
          path: result.path,
          mimeType: result.mimeType,
          sizeBytes: result.sizeBytes,
          width: result.width,
          height: result.height,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// 8. browser.session.close
export class BrowserSessionCloseTool implements ITool {
  public readonly id = 'browser.session.close';
  public readonly name = 'Browser Session Close';
  public readonly description = 'Closes a browser session and releases associated memory and context resources.';
  public readonly version = '1.0.0';
  public readonly category = 'browser';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['browser', 'browser:session'];

  public readonly inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Browser session ID to close.',
      },
    },
    required: ['sessionId'],
  };

  constructor(private readonly adapter: IBrowserAdapter) {}

  public async execute(
    input: { sessionId: string },
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      await this.adapter.closeSession(input.sessionId);
      return {
        success: true,
        output: { closedSessionId: input.sessionId, status: 'closed' },
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}
