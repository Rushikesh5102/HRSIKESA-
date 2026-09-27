/**
 * HṚṢĪKEŚA (हृषीकेश) — Sovereign Personal AI Operating System
 * Phase 7: Windows Computer / Desktop GUI Automation Interfaces
 */

export type MouseButton = 'left' | 'right' | 'middle';

export type SpecialKey =
  | 'ENTER'
  | 'TAB'
  | 'ESCAPE'
  | 'BACKSPACE'
  | 'DELETE'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'HOME'
  | 'END'
  | 'PAGEUP'
  | 'PAGEDOWN'
  | 'SPACE'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12';

export interface ScreenBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface ActiveWindowInfo {
  hwnd: number | string;
  title: string;
  processId: number;
  processName: string;
}

export interface DesktopScreenshotResult {
  artifactPath: string;
  width: number;
  height: number;
  bytes: number;
  timestamp: string;
  format: 'png';
}

export interface AppLaunchResult {
  appName: string;
  executable: string;
  pid: number;
  launchedAt: string;
  status: 'launched' | 'already_running';
}

export interface IComputerAdapter {
  readonly adapterName: string;
  initialize(): Promise<void>;
  getScreenSize(): Promise<ScreenBounds>;
  screenshot(filename?: string): Promise<DesktopScreenshotResult>;
  getActiveWindow(): Promise<ActiveWindowInfo>;
  mouseMove(x: number, y: number): Promise<{ x: number; y: number }>;
  mouseClick(button?: MouseButton, doubleClick?: boolean): Promise<{ button: MouseButton; doubleClick: boolean }>;
  keyboardType(text: string): Promise<{ length: number; charactersTyped: number }>;
  keyPress(key: SpecialKey | string): Promise<{ key: string }>;
  launchApp(appName: string, args?: string[]): Promise<AppLaunchResult>;
  closeApp(pid: number): Promise<{ pid: number; killed: boolean }>;
  closeAll(): Promise<void>;
}
