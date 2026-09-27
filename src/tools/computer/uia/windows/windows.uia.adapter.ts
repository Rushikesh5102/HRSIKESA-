/**
 * HṚṢĪKEŚA (हृषीकेश) — Native Windows UI Automation Adapter
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  IUiaAdapter,
  UIWindow,
  UIElement,
  UIElementFilterOptions,
  UIElementSearchCriteria,
  UIActionResult
} from '../interfaces/uia.types.js';
import { UiaSecurityValidator } from '../security/uia.security.js';
import { ILogger } from '../../../../core/logging/logger.types.js';

const execFileAsync = promisify(execFile);

interface CachedElementData {
  readonly id: string;
  readonly windowHandle: number;
  readonly processId: number;
  readonly controlType: string;
  readonly name: string;
  readonly automationId?: string;
  readonly className?: string;
  readonly bounds?: { x: number; y: number; width: number; height: number };
  value?: string;
}

export class WindowsUiaAdapter implements IUiaAdapter {
  public readonly id = 'windows-uia';
  public readonly name = 'Windows Native UI Automation Adapter';
  private readonly logger?: ILogger;
  private readonly elementCache = new Map<string, CachedElementData>();
  private currentWindowHandle = 0;
  private currentProcessId = 0;
  private initialized = false;

  constructor(logger?: ILogger) {
    this.logger = logger?.child('WindowsUiaAdapter');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Verify UIAutomation assembly availability
    const psScript = `
      Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
      [System.Windows.Automation.AutomationElement]::RootElement.Current.Name | Out-Null
      Write-Output "OK"
    `;

    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        timeout: 5000
      });
      this.initialized = true;
      this.logger?.info('Windows UI Automation Subsystem initialized successfully.');
    } catch (err) {
      this.logger?.error('Failed to initialize Windows UI Automation', { err });
      throw new Error(`UIAutomationClient failed to initialize: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public async observeActiveWindow(options?: UIElementFilterOptions): Promise<UIWindow> {
    if (!this.initialized) await this.initialize();

    const normalized = UiaSecurityValidator.normalizeFilterOptions(options);

    const psScript = `
      Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32Active {
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll", SetLastError=true)]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        }
"@

      $currentPowerShellPid = $PID
      $windowElem = $null
      $hwnd = [Win32Active]::GetForegroundWindow()
      if ($hwnd -ne [IntPtr]::Zero -and $hwnd -ne $null) {
        try {
          $cand = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
          if ($cand -ne $null -and $cand.Current.ProcessId -ne $currentPowerShellPid -and $cand.Current.ClassName -notmatch "Shell_TrayWnd|Progman|WorkerW|ConsoleWindowClass|InputIndicator") {
            $windowElem = $cand
          }
        } catch {}
      }

      if ($windowElem -eq $null) {
        $root = [System.Windows.Automation.AutomationElement]::RootElement
        $topWindows = $root.FindAll(
          [System.Windows.Automation.TreeScope]::Children,
          [System.Windows.Automation.Condition]::TrueCondition
        )
        foreach ($tw in $topWindows) {
          try {
            $twPid = $tw.Current.ProcessId
            if ($twPid -eq $currentPowerShellPid -or $twPid -eq 0) { continue }
            $pName = (Get-Process -Id $twPid -ErrorAction SilentlyContinue).ProcessName
            if ($pName -and $pName -notmatch "powershell|pwsh|node|cmd|conhost|explorer" -and [string]::IsNullOrWhiteSpace($tw.Current.Name) -eq $false -and $tw.Current.ClassName -notmatch "Shell_TrayWnd|Progman|WorkerW") {
              $windowElem = $tw
              $hwnd = [IntPtr]$tw.Current.NativeWindowHandle
              break
            }
          } catch {}
        }
      }

      if ($windowElem -eq $null) {
        # Fallback to any visible top level window with a title
        $root = [System.Windows.Automation.AutomationElement]::RootElement
        $topWindows = $root.FindAll(
          [System.Windows.Automation.TreeScope]::Children,
          [System.Windows.Automation.Condition]::TrueCondition
        )
        foreach ($tw in $topWindows) {
          if ($tw.Current.ProcessId -ne $currentPowerShellPid -and [string]::IsNullOrWhiteSpace($tw.Current.Name) -eq $false -and $tw.Current.ClassName -notmatch "Shell_TrayWnd|Progman|WorkerW") {
            $windowElem = $tw
            $hwnd = [IntPtr]$tw.Current.NativeWindowHandle
            break
          }
        }
      }

      if ($windowElem -eq $null) {
        Write-Output '{"error":"No active application window detected on desktop"}'
        exit 0
      }

      $pid = $windowElem.Current.ProcessId
      $procName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
      $windowTitle = $windowElem.Current.Name
      $winBounds = $windowElem.Current.BoundingRectangle

      $elemList = New-Object System.Collections.Generic.List[Object]
      $counter = 1
      $maxElem = ${normalized.maxElements}

      $descendants = $windowElem.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition
      )

      foreach ($child in $descendants) {
        if ($counter -gt $maxElem) { break }
        try {
          $isOff = $child.Current.IsOffscreen
          if (${normalized.omitInvisible ? '$true' : '$false'} -and $isOff) { continue }

          $cType = $child.Current.ControlType.ProgrammaticName.Replace("ControlType.", "")
          $cName = $child.Current.Name
          $cAutoId = $child.Current.AutomationId
          $cClass = $child.Current.ClassName
          $cEnabled = $child.Current.IsEnabled
          $cBounds = $child.Current.BoundingRectangle

          # Try to read value pattern
          $cVal = ""
          try {
            $valPat = $child.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            if ($valPat -ne $null) {
              $cVal = $valPat.Current.Value
            }
          } catch {}

          $elemId = "elem_" + $counter
          $counter++

          $elemData = @{
            id = $elemId
            name = if ($cName.Length -gt ${normalized.maxTextLength}) { $cName.Substring(0, ${normalized.maxTextLength}) } else { $cName }
            controlType = $cType
            automationId = $cAutoId
            className = $cClass
            enabled = $cEnabled
            visible = (-not $isOff)
            value = if ($cVal.Length -gt ${normalized.maxTextLength}) { $cVal.Substring(0, ${normalized.maxTextLength}) } else { $cVal }
            bounds = @{
              x = [int]$cBounds.X
              y = [int]$cBounds.Y
              width = [int]$cBounds.Width
              height = [int]$cBounds.Height
            }
          }
          $elemList.Add($elemData)
        } catch {}
      }

      $result = @{
        title = $windowTitle
        processName = $procName
        processId = $pid
        handle = [int64]$hwnd
        bounds = @{
          x = [int]$winBounds.X
          y = [int]$winBounds.Y
          width = [int]$winBounds.Width
          height = [int]$winBounds.Height
        }
        elements = $elemList
      } | ConvertTo-Json -Depth 5 -Compress

      Write-Output $result
    `;

    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psScript],
      { timeout: 15000 }
    );

    const parsed = JSON.parse(stdout.trim() || '{}');
    if (parsed.error) {
      throw new Error(`UIA Observation failed: ${parsed.error}`);
    }

    this.currentWindowHandle = Number(parsed.handle || 0);
    this.currentProcessId = Number(parsed.processId || 0);
    this.elementCache.clear();

    const rawElements: UIElement[] = (parsed.elements || []).map((el: any) => ({
      id: el.id,
      name: el.name || '',
      controlType: el.controlType || 'Unknown',
      automationId: el.automationId || undefined,
      className: el.className || undefined,
      value: el.value || undefined,
      enabled: Boolean(el.enabled),
      visible: Boolean(el.visible),
      bounds: el.bounds ? {
        x: Number(el.bounds.x),
        y: Number(el.bounds.y),
        width: Number(el.bounds.width),
        height: Number(el.bounds.height)
      } : undefined
    }));

    // Cache element references for safe, verified action dispatch
    for (const el of rawElements) {
      this.elementCache.set(el.id, {
        id: el.id,
        windowHandle: this.currentWindowHandle,
        processId: this.currentProcessId,
        controlType: el.controlType,
        name: el.name,
        automationId: el.automationId,
        className: el.className,
        bounds: el.bounds,
        value: el.value
      });
    }

    const sanitizedElements = rawElements.map((el) => UiaSecurityValidator.sanitizeElement(el));

    return {
      title: parsed.title || 'Untitled Window',
      processName: parsed.processName || 'Unknown',
      processId: this.currentProcessId,
      handle: this.currentWindowHandle,
      bounds: parsed.bounds ? {
        x: Number(parsed.bounds.x),
        y: Number(parsed.bounds.y),
        width: Number(parsed.bounds.width),
        height: Number(parsed.bounds.height)
      } : undefined,
      elements: sanitizedElements
    };
  }

  public async findElement(
    criteria: UIElementSearchCriteria,
    _windowHandle?: number
  ): Promise<UIElement | undefined> {
    const results = await this.findElements(criteria, _windowHandle);
    return results[0];
  }

  public async findElements(
    criteria: UIElementSearchCriteria,
    _windowHandle?: number
  ): Promise<readonly UIElement[]> {
    UiaSecurityValidator.validateSearchCriteria(criteria);

    if (this.elementCache.size === 0) {
      await this.observeActiveWindow();
    }

    const matches: UIElement[] = [];

    for (const cached of this.elementCache.values()) {
      let isMatch = true;

      if (criteria.name && !cached.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        isMatch = false;
      }
      if (criteria.controlType && cached.controlType.toLowerCase() !== criteria.controlType.toLowerCase()) {
        isMatch = false;
      }
      if (criteria.automationId && cached.automationId?.toLowerCase() !== criteria.automationId.toLowerCase()) {
        isMatch = false;
      }
      if (criteria.className && cached.className?.toLowerCase() !== criteria.className.toLowerCase()) {
        isMatch = false;
      }

      if (isMatch) {
        matches.push(UiaSecurityValidator.sanitizeElement({
          id: cached.id,
          name: cached.name,
          controlType: cached.controlType,
          automationId: cached.automationId,
          className: cached.className,
          value: cached.value,
          enabled: true,
          visible: true,
          bounds: cached.bounds
        }));
      }
    }

    return matches;
  }

  public async clickElement(elementId: string): Promise<UIActionResult> {
    const cached = this.elementCache.get(elementId);
    if (!cached) {
      throw new Error(`Stale element reference: '${elementId}' was not found in active window cache. Run computer.ui.observe to refresh.`);
    }

    if (!cached.bounds || cached.bounds.width <= 0 || cached.bounds.height <= 0) {
      throw new Error(`Element '${elementId}' has invalid or zero-sized bounding box.`);
    }

    const clickX = Math.floor(cached.bounds.x + cached.bounds.width / 2);
    const clickY = Math.floor(cached.bounds.y + cached.bounds.height / 2);

    const psScript = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32Mouse {
          [DllImport("user32.dll")]
          public static extern bool SetCursorPos(int X, int Y);
          [DllImport("user32.dll")]
          public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
        }
"@
      [Win32Mouse]::SetCursorPos(${clickX}, ${clickY})
      Start-Sleep -Milliseconds 50
      # MOUSEEVENTF_LEFTDOWN = 0x0002, MOUSEEVENTF_LEFTUP = 0x0004
      [Win32Mouse]::mouse_event(0x0002, 0, 0, 0, 0)
      Start-Sleep -Milliseconds 30
      [Win32Mouse]::mouse_event(0x0004, 0, 0, 0, 0)
    `;

    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      timeout: 5000
    });

    return {
      success: true,
      elementId,
      action: 'click',
      message: `Clicked element '${cached.name || elementId}' at center (${clickX}, ${clickY}).`
    };
  }

  public async focusElement(elementId: string): Promise<UIActionResult> {
    return this.clickElement(elementId);
  }

  public async typeText(elementId: string, text: string): Promise<UIActionResult> {
    const cached = this.elementCache.get(elementId);
    if (!cached) {
      throw new Error(`Stale element reference: '${elementId}' was not found in active window cache. Run computer.ui.observe to refresh.`);
    }

    const previousValue = cached.value;

    // Focus element by clicking center
    await this.clickElement(elementId);

    // Escape text for SendKeys
    const sanitizedText = text.replace(/"/g, '`"').replace(/\$/g, '`$');

    const psScript = `
      Start-Sleep -Milliseconds 100
      $wshell = New-Object -ComObject WScript.Shell
      $wshell.SendKeys("${sanitizedText}")
    `;

    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      timeout: 10000
    });

    // Update local cache estimate
    cached.value = text;

    return {
      success: true,
      elementId,
      action: 'type',
      previousValue,
      updatedValue: text,
      message: `Typed text into element '${cached.name || elementId}'.`
    };
  }

  public async sendKeypress(elementId: string, key: string): Promise<UIActionResult> {
    const cached = this.elementCache.get(elementId);
    if (!cached) {
      throw new Error(`Stale element reference: '${elementId}' was not found in active window cache. Run computer.ui.observe to refresh.`);
    }

    await this.clickElement(elementId);

    const keyMap: Record<string, string> = {
      enter: '{ENTER}',
      tab: '{TAB}',
      escape: '{ESC}',
      backspace: '{BACKSPACE}',
      delete: '{DELETE}',
      space: ' ',
      up: '{UP}',
      down: '{DOWN}',
      left: '{LEFT}',
      right: '{RIGHT}'
    };

    const mappedKey = keyMap[key.toLowerCase()] || `{${key.toUpperCase()}}`;

    const psScript = `
      Start-Sleep -Milliseconds 50
      $wshell = New-Object -ComObject WScript.Shell
      $wshell.SendKeys("${mappedKey}")
    `;

    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      timeout: 5000
    });

    return {
      success: true,
      elementId,
      action: 'keypress',
      message: `Dispatched keypress '${key}' to element '${cached.name || elementId}'.`
    };
  }

  public async getElementValue(elementId: string): Promise<string | undefined> {
    const cached = this.elementCache.get(elementId);
    return cached?.value;
  }

  public async shutdown(): Promise<void> {
    this.elementCache.clear();
    this.initialized = false;
    this.logger?.info('Windows UI Automation adapter shutdown.');
  }

  public async dispose(): Promise<void> {
    await this.shutdown();
  }
}
