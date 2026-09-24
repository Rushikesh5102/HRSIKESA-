/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Observation Engine
 *
 * Phase 22: Constructs bounded desktop representations, UI Automation trees,
 * screen metric snapshots, and temporary screenshots with automatic lifecycle management.
 */

import crypto from 'node:crypto';
import { ILogger } from '../../../core/logging/logger.types.js';
import { IComputerAdapter, ScreenBounds, DesktopScreenshotResult } from '../../../tools/computer/interfaces/computer.types.js';
import { IUiaAdapter, UIWindow, UIElement } from '../../../tools/computer/uia/interfaces/uia.types.js';
import {
  DesktopObservation,
  WindowObservation,
  ControlObservation,
  ScreenMetrics,
} from '../interfaces/operator.types.js';
import { ComputerWindowManager } from './window.manager.js';

export interface ObservationOptions {
  readonly maxDepth?: number;
  readonly maxNodes?: number;
  readonly maxTextLength?: number;
  readonly maxWindows?: number;
  readonly captureScreenshot?: boolean;
  readonly taskId?: string;
}

export class ComputerObservationEngine {
  private readonly computerAdapter: IComputerAdapter;
  private readonly uiaAdapter?: IUiaAdapter;
  private readonly windowManager: ComputerWindowManager;
  private readonly logger?: ILogger;

  constructor(
    computerAdapter: IComputerAdapter,
    windowManager: ComputerWindowManager,
    uiaAdapter?: IUiaAdapter,
    logger?: ILogger
  ) {
    this.computerAdapter = computerAdapter;
    this.windowManager = windowManager;
    this.uiaAdapter = uiaAdapter;
    this.logger = logger?.child('ComputerObservationEngine');
  }

  /**
   * Captures a bounded, structured observation of current desktop state.
   */
  public async observeDesktop(options: ObservationOptions = {}): Promise<DesktopObservation> {
    const maxDepth = options.maxDepth ?? 4;
    const maxNodes = options.maxNodes ?? 100;
    const maxTextLength = options.maxTextLength ?? 200;
    const shouldScreenshot = options.captureScreenshot ?? true;

    // 1. Get Screen Metrics
    let screenMetrics: ScreenMetrics = { width: 1920, height: 1080 };
    try {
      const bounds: ScreenBounds = await this.computerAdapter.getScreenSize();
      screenMetrics = {
        width: bounds.width,
        height: bounds.height,
        primaryMonitor: true,
      };
    } catch (e: any) {
      this.logger?.debug(`Screen metrics query note: ${e.message}`);
    }

    // 2. Get Active Window & Basic Window Observation
    const activeWindow = await this.windowManager.getActiveWindow();

    // 3. Inspect UIA Tree
    let uiaControls: ControlObservation[] = [];
    if (this.uiaAdapter) {
      try {
        const uiaWin: UIWindow = await this.uiaAdapter.observeActiveWindow({
          maxDepth,
          maxElements: maxNodes,
          maxTextLength,
          omitInvisible: true,
        });
        uiaControls = this.mapElements(uiaWin.elements || [], maxDepth, maxNodes, maxTextLength);
      } catch (err: any) {
        this.logger?.debug(`UIA tree observation note: ${err.message}`);
      }
    }

    // Combine controls from UIA into active window observation
    const activeWindowFull: WindowObservation = {
      ...activeWindow,
      controls: uiaControls.length > 0 ? uiaControls : activeWindow.controls,
    };

    // 4. Capture Bounded Screenshot (if requested)
    let screenshotPath: string | undefined;
    if (shouldScreenshot) {
      try {
        const shot: DesktopScreenshotResult = await this.computerAdapter.screenshot(`comp_obs_${Date.now()}.png`);
        screenshotPath = shot.artifactPath;
      } catch (err: any) {
        this.logger?.debug(`Screenshot capture note: ${err.message}`);
      }
    }

    // 5. Calculate DOM / Tree Hash and Node Count
    const nodeCount = this.countNodes(activeWindowFull.controls);
    const domHash = this.computeTreeHash(activeWindowFull);
    const summary = `Active Window: '${activeWindowFull.title}' (${activeWindowFull.processName}, PID: ${activeWindowFull.processId}) with ${nodeCount} controls visible.`;

    const observation: DesktopObservation = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      screenMetrics,
      activeWindow: activeWindowFull,
      visibleWindows: [activeWindowFull],
      focusedControl: this.findFocused(activeWindowFull.controls),
      screenshotArtifactPath: screenshotPath,
      nodeCount,
      domHash,
      summary,
    };

    this.logger?.info(`Desktop observed: ${summary}`);
    return observation;
  }

  private mapElements(elements: readonly UIElement[], maxDepth: number, maxNodes: number, maxTextLength: number, depth = 1): ControlObservation[] {
    if (depth > maxDepth || elements.length === 0) return [];
    const results: ControlObservation[] = [];

    for (const el of elements) {
      if (results.length >= maxNodes) break;
      const textVal = el.value ? el.value.slice(0, maxTextLength) : undefined;
      const obsEl: ControlObservation = {
        id: el.id,
        name: el.name,
        controlType: el.controlType,
        automationId: el.automationId,
        className: el.className,
        value: textVal,
        enabled: el.enabled,
        visible: el.visible,
        bounds: el.bounds,
        children: el.children ? this.mapElements(el.children, maxDepth, maxNodes - results.length, maxTextLength, depth + 1) : undefined,
      };
      results.push(obsEl);
    }

    return results;
  }

  private countNodes(controls: readonly ControlObservation[]): number {
    let count = controls.length;
    for (const c of controls) {
      if (c.children && c.children.length > 0) {
        count += this.countNodes(c.children);
      }
    }
    return count;
  }

  private findFocused(controls: readonly ControlObservation[]): ControlObservation | undefined {
    for (const c of controls) {
      if (c.isFocused) return c;
      if (c.children) {
        const child = this.findFocused(c.children);
        if (child) return child;
      }
    }
    return undefined;
  }

  private computeTreeHash(win: WindowObservation): string {
    const raw = `${win.title}|${win.processName}|${win.controls.map((c) => `${c.id}:${c.name}:${c.controlType}`).join(';')}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }
}
