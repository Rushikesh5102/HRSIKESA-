/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Window Manager
 *
 * Phase 22: Window discovery, activation, state tracking, and application context isolation.
 */

import { ILogger } from '../../../core/logging/logger.types.js';
import { IComputerAdapter, ActiveWindowInfo } from '../../../tools/computer/interfaces/computer.types.js';
import { IUiaAdapter, UIWindow } from '../../../tools/computer/uia/interfaces/uia.types.js';
import { WindowObservation, ComputerScope } from '../interfaces/operator.types.js';

export interface ApplicationContext {
  readonly applicationName: string;
  readonly processId: number;
  readonly windowHandle?: number | string;
  readonly windowTitle: string;
  readonly activeDocument?: string;
  readonly projectContext?: string;
  readonly scope: ComputerScope;
}

export class ComputerWindowManager {
  private readonly computerAdapter: IComputerAdapter;
  private readonly uiaAdapter?: IUiaAdapter;
  private readonly logger?: ILogger;
  private currentContext?: ApplicationContext;

  constructor(computerAdapter: IComputerAdapter, uiaAdapter?: IUiaAdapter, logger?: ILogger) {
    this.computerAdapter = computerAdapter;
    this.uiaAdapter = uiaAdapter;
    this.logger = logger?.child('ComputerWindowManager');
  }

  /**
   * Retrieves the currently active foreground window.
   */
  public async getActiveWindow(): Promise<WindowObservation> {
    try {
      const info: ActiveWindowInfo = await this.computerAdapter.getActiveWindow();
      let uiaWindow: UIWindow | undefined;

      if (this.uiaAdapter) {
        try {
          uiaWindow = await this.uiaAdapter.observeActiveWindow({ maxDepth: 2, maxElements: 20 });
        } catch (e: any) {
          this.logger?.debug(`UIA window observation note: ${e.message}`);
        }
      }

      const obs: WindowObservation = {
        hwnd: info.hwnd,
        title: info.title,
        processId: info.processId,
        processName: info.processName,
        bounds: uiaWindow?.bounds,
        isForeground: true,
        controls: (uiaWindow?.elements || []).map((el: any) => ({
          id: el.id,
          name: el.name,
          controlType: el.controlType,
          automationId: el.automationId,
          className: el.className,
          value: el.value,
          enabled: el.enabled,
          visible: el.visible,
          bounds: el.bounds,
        })),
      };

      // Update active application context
      this.currentContext = {
        applicationName: info.processName,
        processId: info.processId,
        windowHandle: info.hwnd,
        windowTitle: info.title,
        scope: 'WINDOW',
      };

      return obs;
    } catch (err: any) {
      this.logger?.warn(`Failed to inspect active window: ${err.message}`);
      return {
        hwnd: 0,
        title: 'Unknown Desktop',
        processId: 0,
        processName: 'explorer.exe',
        isForeground: true,
        controls: [],
      };
    }
  }

  /**
   * Finds a window by title pattern or process name.
   */
  public async findWindow(query: string | { title?: string; processName?: string }): Promise<WindowObservation | null> {
    const active = await this.getActiveWindow();
    if (typeof query === 'string') {
      const q = query.toLowerCase();
      if (active.title.toLowerCase().includes(q) || active.processName.toLowerCase().includes(q)) {
        return active;
      }
    } else {
      const titleMatch = !query.title || active.title.toLowerCase().includes(query.title.toLowerCase());
      const procMatch = !query.processName || active.processName.toLowerCase().includes(query.processName.toLowerCase());
      if (titleMatch && procMatch) {
        return active;
      }
    }
    return null;
  }

  /**
   * Sets focus to a specific window or application.
   */
  public async focusWindow(titleOrProcess: string): Promise<boolean> {
    this.logger?.info(`Attempting to focus window matching: '${titleOrProcess}'`);
    const active = await this.getActiveWindow();
    const q = titleOrProcess.toLowerCase();
    if (active.title.toLowerCase().includes(q) || active.processName.toLowerCase().includes(q)) {
      return true;
    }

    // Try launching/focusing via computer adapter
    try {
      await this.computerAdapter.launchApp(titleOrProcess);
      return true;
    } catch (e: any) {
      this.logger?.warn(`Could not activate window '${titleOrProcess}': ${e.message}`);
      return false;
    }
  }

  public async listVisibleWindows(): Promise<WindowObservation[]> {
    const active = await this.getActiveWindow();
    return [active];
  }

  public getApplicationContext(): ApplicationContext | undefined {
    return this.currentContext;
  }

  public setApplicationContext(context: ApplicationContext): void {
    this.currentContext = context;
  }

  /**
   * Gets the current application context.
   */
  public getCurrentContext(): ApplicationContext | undefined {
    return this.currentContext;
  }

  /**
   * Sets the current application context.
   */
  public setContext(context: ApplicationContext): void {
    this.currentContext = context;
  }

  /**
   * Closes the specified application by PID or current window.
   */
  public async closeWindow(processId?: number): Promise<boolean> {
    const pid = processId || this.currentContext?.processId;
    if (!pid) return false;
    try {
      const res = await this.computerAdapter.closeApp(pid);
      return res.killed;
    } catch (err: any) {
      this.logger?.warn(`Error closing window for PID ${pid}: ${err.message}`);
      return false;
    }
  }
}
