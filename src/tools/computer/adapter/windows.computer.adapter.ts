/**
 * HṚṢĪKEŚA (हृषीकेश) — Sovereign Personal AI Operating System
 * Phase 7: Windows Native Desktop & GUI Automation Adapter
 */

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
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

const execFileAsync = promisify(execFile);

export class WindowsComputerAdapter implements IComputerAdapter {
  public readonly adapterName = 'windows_native';
  private initialized = false;
  private readonly screenshotDir: string;
  private readonly spawnedPids = new Set<number>();
  private cachedScreenBounds: ScreenBounds | null = null;

  constructor(screenshotDir?: string) {
    this.screenshotDir = screenshotDir || path.resolve(process.cwd(), 'data', 'screenshots');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(this.screenshotDir, { recursive: true });
    this.initialized = true;
  }

  /**
   * Query the primary screen dimensions.
   */
  public async getScreenSize(): Promise<ScreenBounds> {
    await this.initialize();
    if (this.cachedScreenBounds) {
      return this.cachedScreenBounds;
    }

    const script = `
Add-Type -AssemblyName System.Windows.Forms
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
[PSCustomObject]@{
  width = $b.Width
  height = $b.Height
  x = $b.X
  y = $b.Y
} | ConvertTo-Json -Compress
`;

    try {
      const { stdout } = await this.runPowerShell(script);
      const parsed = JSON.parse(stdout.trim());
      this.cachedScreenBounds = {
        width: parsed.width || 1920,
        height: parsed.height || 1080,
        x: parsed.x || 0,
        y: parsed.y || 0
      };
      return this.cachedScreenBounds;
    } catch {
      // Fallback standard resolution
      return { width: 1920, height: 1080, x: 0, y: 0 };
    }
  }

  /**
   * Capture a full desktop screenshot and save to PNG artifact.
   */
  public async screenshot(customFilename?: string): Promise<DesktopScreenshotResult> {
    await this.initialize();
    const id = crypto.randomBytes(6).toString('hex');
    const filename = customFilename ? `${customFilename.replace(/[^a-zA-Z0-9_-]/g, '_')}.png` : `desktop_${Date.now()}_${id}.png`;
    const targetPath = path.join(this.screenshotDir, filename);

    const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$target = [System.IO.Path]::GetFullPath("${targetPath.replace(/\\/g, '\\\\')}")
$bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

[PSCustomObject]@{
  width = $bounds.Width
  height = $bounds.Height
  path = $target
  success = $true
} | ConvertTo-Json -Compress
`;

    await this.runPowerShell(script);

    const stats = await fs.stat(targetPath);
    const bounds = await this.getScreenSize();

    return {
      artifactPath: targetPath,
      width: bounds.width,
      height: bounds.height,
      bytes: stats.size,
      timestamp: new Date().toISOString(),
      format: 'png'
    };
  }

  /**
   * Retrieve active/foreground window metadata.
   */
  public async getActiveWindow(): Promise<ActiveWindowInfo> {
    await this.initialize();

    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class Win32Window {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@

$hwnd = [Win32Window]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[void][Win32Window]::GetWindowText($hwnd, $sb, $sb.Capacity)
$title = $sb.ToString()

$procId = 0
[void][Win32Window]::GetWindowThreadProcessId($hwnd, [ref]$procId)
$proc = Get-Process -Id $procId -ErrorAction SilentlyContinue

[PSCustomObject]@{
    hwnd = $hwnd.ToInt64()
    title = $title
    processId = $procId
    processName = if ($proc) { $proc.ProcessName } else { "Unknown" }
} | ConvertTo-Json -Compress
`;

    try {
      const { stdout } = await this.runPowerShell(script);
      const parsed = JSON.parse(stdout.trim());
      return {
        hwnd: parsed.hwnd || 0,
        title: parsed.title || '',
        processId: parsed.processId || 0,
        processName: parsed.processName || 'Unknown'
      };
    } catch {
      return { hwnd: 0, title: 'Desktop', processId: 0, processName: 'explorer' };
    }
  }

  /**
   * Move the mouse cursor to specific coordinates (x, y).
   */
  public async mouseMove(x: number, y: number): Promise<{ x: number; y: number }> {
    await this.initialize();
    const screen = await this.getScreenSize();
    const check = ComputerSecurityValidator.validateCoordinates(x, y, screen);
    if (!check.valid) {
      throw new Error(`Invalid mouse coordinates: ${check.reason}`);
    }

    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Win32Cursor {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
}
"@
[Win32Cursor]::SetCursorPos(${Math.round(x)}, ${Math.round(y)})
`;
    await this.runPowerShell(script);
    return { x: Math.round(x), y: Math.round(y) };
  }

  /**
   * Click mouse button (left, right, middle) with single or double click.
   */
  public async mouseClick(button: MouseButton = 'left', doubleClick = false): Promise<{ button: MouseButton; doubleClick: boolean }> {
    await this.initialize();

    let downFlag = '0x0002'; // LEFTDOWN
    let upFlag = '0x0004';   // LEFTUP

    if (button === 'right') {
      downFlag = '0x0008';
      upFlag = '0x0010';
    } else if (button === 'middle') {
      downFlag = '0x0020';
      upFlag = '0x0040';
    }

    const clicks = doubleClick ? 2 : 1;

    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Win32Click {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);
}
"@

for ($i = 0; $i -lt ${clicks}; $i++) {
    [Win32Click]::mouse_event(${downFlag}, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 40
    [Win32Click]::mouse_event(${upFlag}, 0, 0, 0, [UIntPtr]::Zero)
    if ($i -lt ${clicks - 1}) {
        Start-Sleep -Milliseconds 60
    }
}
`;
    await this.runPowerShell(script);
    return { button, doubleClick };
  }

  /**
   * Type text into currently active focused control.
   */
  public async keyboardType(text: string): Promise<{ length: number; charactersTyped: number }> {
    await this.initialize();
    const check = ComputerSecurityValidator.validateTypingPayload(text);
    if (!check.valid) {
      throw new Error(`Typing payload rejected: ${check.reason}`);
    }

    // Escape WScript.Shell SendKeys special characters: +, ^, %, ~, (, ), {, }
    const escaped = check.sanitized.replace(/([+^%~(){}])/g, '{$1}');

    const script = `
$wshell = New-Object -ComObject WScript.Shell
$wshell.SendKeys("${escaped.replace(/"/g, '`"')}")
`;
    await this.runPowerShell(script);
    return { length: check.sanitized.length, charactersTyped: check.sanitized.length };
  }

  /**
   * Press a single special keyboard key.
   */
  public async keyPress(key: SpecialKey | string): Promise<{ key: string }> {
    await this.initialize();
    const upper = key.trim().toUpperCase();

    const keyMap: Record<string, string> = {
      ENTER: '{ENTER}',
      TAB: '{TAB}',
      ESCAPE: '{ESC}',
      ESC: '{ESC}',
      BACKSPACE: '{BKSP}',
      DELETE: '{DEL}',
      UP: '{UP}',
      DOWN: '{DOWN}',
      LEFT: '{LEFT}',
      RIGHT: '{RIGHT}',
      HOME: '{HOME}',
      END: '{END}',
      PAGEUP: '{PGUP}',
      PAGEDOWN: '{PGDN}',
      SPACE: ' ',
      F1: '{F1}',
      F2: '{F2}',
      F3: '{F3}',
      F4: '{F4}',
      F5: '{F5}',
      F6: '{F6}',
      F7: '{F7}',
      F8: '{F8}',
      F9: '{F9}',
      F10: '{F10}',
      F11: '{F11}',
      F12: '{F12}'
    };

    const sendSequence = keyMap[upper] || `{${upper}}`;

    const script = `
$wshell = New-Object -ComObject WScript.Shell
$wshell.SendKeys("${sendSequence}")
`;
    await this.runPowerShell(script);
    return { key: upper };
  }

  /**
   * Launch an allowlisted desktop application.
   */
  public async launchApp(appName: string, args: string[] = []): Promise<AppLaunchResult> {
    await this.initialize();
    const app = ApplicationAllowlist.resolveApp(appName);
    if (!app) {
      throw new Error(
        `Application '${appName}' is not in the configured desktop allowlist. Allowed apps: ${ApplicationAllowlist.listAllowedApps().map(a => a.id).join(', ')}`
      );
    }

    const proc = spawn(app.executable, args, {
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();

    if (proc.pid) {
      this.spawnedPids.add(proc.pid);
    }

    return {
      appName: app.name,
      executable: app.executable,
      pid: proc.pid || 0,
      launchedAt: new Date().toISOString(),
      status: 'launched'
    };
  }

  /**
   * Safely close a process that was launched by HṚṢĪKEŚA or matching a target PID.
   */
  public async closeApp(pid: number): Promise<{ pid: number; killed: boolean }> {
    if (!pid || pid <= 0) {
      throw new Error(`Invalid PID: ${pid}`);
    }

    try {
      process.kill(pid);
      this.spawnedPids.delete(pid);
      return { pid, killed: true };
    } catch {
      return { pid, killed: false };
    }
  }

  /**
   * Cleanly terminate any active desktop processes spawned during this session.
   */
  public async closeAll(): Promise<void> {
    for (const pid of this.spawnedPids) {
      try {
        process.kill(pid);
      } catch {
        // Ignored on cleanup
      }
    }
    this.spawnedPids.clear();
  }

  private async runPowerShell(script: string): Promise<{ stdout: string; stderr: string }> {
    return execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script
    ]);
  }
}
