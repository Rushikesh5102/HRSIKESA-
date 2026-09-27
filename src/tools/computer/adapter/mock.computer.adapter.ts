/**
 * HṚṢĪKEŚA (हृषीकेश) — Sovereign Personal AI Operating System
 * Phase 7: Deterministic In-Memory Mock Computer Adapter for Unit Testing
 */

import {
  IComputerAdapter,
  ScreenBounds,
  ActiveWindowInfo,
  DesktopScreenshotResult,
  MouseButton,
  SpecialKey,
  AppLaunchResult
} from '../interfaces/computer.types.js';
import { ComputerSecurityValidator } from '../security/coordinate.validator.js';
import { ApplicationAllowlist } from '../security/app.allowlist.js';

export class MockComputerAdapter implements IComputerAdapter {
  public readonly adapterName = 'mock_computer';
  public isInitialized = false;
  public screenBounds: ScreenBounds = { width: 1920, height: 1080, x: 0, y: 0 };
  public activeWindow: ActiveWindowInfo = {
    hwnd: 1024,
    title: 'HṚṢĪKEŚA Command Center',
    processId: 4321,
    processName: 'hrisekesa'
  };
  public cursorPosition = { x: 500, y: 500 };
  public typedHistory: string[] = [];
  public pressedKeys: string[] = [];
  public mouseClicks: Array<{ button: MouseButton; doubleClick: boolean }> = [];
  public launchedApps: AppLaunchResult[] = [];
  public closedPids: number[] = [];

  public async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  public async getScreenSize(): Promise<ScreenBounds> {
    return this.screenBounds;
  }

  public async screenshot(customFilename?: string): Promise<DesktopScreenshotResult> {
    const filename = customFilename
      ? (customFilename.endsWith('.png') ? customFilename : `${customFilename}.png`)
      : 'mock_screen.png';
    return {
      artifactPath: `C:\\Users\\Rushi\\Desktop\\HṚṢĪKEŚA\\data\\screenshots\\${filename}`,
      width: this.screenBounds.width,
      height: this.screenBounds.height,
      bytes: 24500,
      timestamp: new Date().toISOString(),
      format: 'png'
    };
  }

  public async getActiveWindow(): Promise<ActiveWindowInfo> {
    return this.activeWindow;
  }

  public async mouseMove(x: number, y: number): Promise<{ x: number; y: number }> {
    const check = ComputerSecurityValidator.validateCoordinates(x, y, this.screenBounds);
    if (!check.valid) {
      throw new Error(`Invalid mouse coordinates: ${check.reason}`);
    }
    this.cursorPosition = { x: Math.round(x), y: Math.round(y) };
    return this.cursorPosition;
  }

  public async mouseClick(button: MouseButton = 'left', doubleClick = false): Promise<{ button: MouseButton; doubleClick: boolean }> {
    this.mouseClicks.push({ button, doubleClick });
    return { button, doubleClick };
  }

  public async keyboardType(text: string): Promise<{ length: number; charactersTyped: number }> {
    const check = ComputerSecurityValidator.validateTypingPayload(text);
    if (!check.valid) {
      throw new Error(`Typing payload rejected: ${check.reason}`);
    }
    this.typedHistory.push(check.sanitized);
    return { length: check.sanitized.length, charactersTyped: check.sanitized.length };
  }

  public async keyPress(key: SpecialKey | string): Promise<{ key: string }> {
    const upper = key.trim().toUpperCase();
    this.pressedKeys.push(upper);
    return { key: upper };
  }

  public async launchApp(appName: string, _args: string[] = []): Promise<AppLaunchResult> {
    const app = ApplicationAllowlist.resolveApp(appName);
    if (!app) {
      throw new Error(
        `Application '${appName}' is not in the configured desktop allowlist. Allowed apps: ${ApplicationAllowlist.listAllowedApps().map(a => a.id).join(', ')}`
      );
    }
    const result: AppLaunchResult = {
      appName: app.name,
      executable: app.executable,
      pid: 99000 + this.launchedApps.length + 1,
      launchedAt: new Date().toISOString(),
      status: 'launched'
    };
    this.launchedApps.push(result);
    return result;
  }

  public async closeApp(pid: number): Promise<{ pid: number; killed: boolean }> {
    this.closedPids.push(pid);
    return { pid, killed: true };
  }

  public async closeAll(): Promise<void> {
    for (const app of this.launchedApps) {
      this.closedPids.push(app.pid);
    }
  }
}
