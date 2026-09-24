/**
 * HṚṢĪKEŚA (हृषीकेश) — Process Lifecycle Manager (Phase 10)
 *
 * Provides controlled execution, process tracking, readiness detection,
 * and safe process termination for HṚṢĪKEŚA.
 */

import { spawn, execFile, ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import {
  ApplicationInfo,
  ApplicationLaunchResult,
  ProcessInfo,
  ReadinessStatus,
  IProcessManager
} from '../interfaces/environment.types.js';
import { EnvironmentSecurityValidator } from '../security/environment.security.js';
import { IUiaAdapter } from '../../tools/computer/uia/interfaces/uia.types.js';

const execFileAsync = promisify(execFile);

interface TrackedProcess {
  pid: number;
  applicationId: string;
  applicationName: string;
  executablePath: string;
  args: string[];
  startTime: string;
  childProcess?: ChildProcess;
  status: 'running' | 'terminated';
}

export class ProcessManager implements IProcessManager {
  private readonly trackedProcesses = new Map<number, TrackedProcess>();
  private processCache: ProcessInfo[] | null = null;
  private lastProcessCacheTime = 0;
  private readonly PROCESS_CACHE_TTL_MS = 3000; // 3 seconds TTL

  constructor(private readonly uiaAdapter?: IUiaAdapter) {}

  /**
   * Launch a verified application and await readiness.
   */
  public async launch(app: ApplicationInfo, args: string[] = []): Promise<ApplicationLaunchResult> {
    const startTime = Date.now();

    if (!app.executablePath || !EnvironmentSecurityValidator.validateExecutablePath(app.executablePath)) {
      return {
        success: false,
        applicationId: app.id,
        applicationName: app.name,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        error: `Cannot launch application "${app.name}": executable path is missing or invalid (${app.executablePath}).`
      };
    }

    const safeArgs = EnvironmentSecurityValidator.redactArguments(args);

    try {
      // Spawn application detached so it runs independently in the user desktop session
      const child = spawn(app.executablePath, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        cwd: app.installPath || path.dirname(app.executablePath)
      });

      child.unref();

      const pid = child.pid;
      if (!pid) {
        return {
          success: false,
          applicationId: app.id,
          applicationName: app.name,
          status: 'FAILED',
          durationMs: Date.now() - startTime,
          error: `Failed to retrieve process ID after spawning "${app.name}".`
        };
      }

      // Record in tracked processes
      this.processCache = null;
      const tracked: TrackedProcess = {
        pid,
        applicationId: app.id,
        applicationName: app.name,
        executablePath: app.executablePath,
        args: safeArgs,
        startTime: new Date().toISOString(),
        childProcess: child,
        status: 'running'
      };
      this.trackedProcesses.set(pid, tracked);

      // Listen to exit
      child.on('exit', () => {
        tracked.status = 'terminated';
      });

      // Readiness detection
      const readiness = await this.waitForReadiness(pid, app.name, 10000);
      const effectivePid = readiness.actualPid || pid;

      if (readiness.actualPid && readiness.actualPid !== pid) {
        // Track the actual window process ID as well
        this.trackedProcesses.set(readiness.actualPid, {
          ...tracked,
          pid: readiness.actualPid
        });
      }

      const isSuccess = readiness.status === 'READY' || readiness.status === 'STARTING';

      return {
        success: isSuccess,
        applicationId: app.id,
        applicationName: app.name,
        processId: effectivePid,
        status: readiness.status,
        windowTitle: readiness.windowTitle,
        durationMs: Date.now() - startTime,
        error: isSuccess ? undefined : `Application "${app.name}" readiness detection returned status "${readiness.status}".`
      };
    } catch (err) {
      return {
        success: false,
        applicationId: app.id,
        applicationName: app.name,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Poll readiness signals (process existence + window visibility).
   */
  private async waitForReadiness(
    pid: number,
    _appName: string,
    timeoutMs: number
  ): Promise<{ status: ReadinessStatus; actualPid?: number; windowTitle?: string }> {
    const deadline = Date.now() + timeoutMs;
    const pollInterval = 300;
    const appTarget = path.basename(_appName).toLowerCase().replace(/\.exe$/, '');

    // Initial brief pause for process bootstrap
    await new Promise(resolve => setTimeout(resolve, 500));

    while (Date.now() < deadline) {
      // 1. Check window via UIA adapter if available
      if (this.uiaAdapter) {
        try {
          const activeWin = await this.uiaAdapter.observeActiveWindow();
          if (activeWin) {
            const winProc = activeWin.processName.toLowerCase();
            const winTitle = activeWin.title.toLowerCase();
            if (
              activeWin.processId === pid ||
              winProc.includes(appTarget) ||
              winTitle.includes(appTarget)
            ) {
              return {
                status: 'READY',
                actualPid: activeWin.processId,
                windowTitle: activeWin.title
              };
            }
          }
        } catch {
          // UIA check is non-fatal
        }
      }

      // 2. Check if spawned PID is still alive
      const isAlive = await this.isProcessRunning(pid);
      if (isAlive) {
        return { status: 'READY', actualPid: pid };
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return { status: 'TIMEOUT' };
  }

  /**
   * Checks if a process is alive.
   */
  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
        timeout: 2000,
        windowsHide: true
      });
      return stdout.includes(String(pid));
    } catch {
      // Fallback using process.kill(pid, 0)
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Lists active processes with HṚṢĪKEŚA ownership annotations.
   */
  public async listProcesses(forceRefresh = false): Promise<ProcessInfo[]> {
    if (!forceRefresh && this.processCache && (Date.now() - this.lastProcessCacheTime < this.PROCESS_CACHE_TTL_MS)) {
      return [...this.processCache];
    }

    const processes: ProcessInfo[] = [];

    try {
      const { stdout } = await execFileAsync('tasklist', ['/FO', 'CSV', '/NH'], {
        timeout: 5000,
        windowsHide: true
      });

      const lines = stdout.trim().split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Parse CSV line: "Image Name","PID","Session Name","Session#","Mem Usage"
        const parts = trimmed.split('","').map(p => p.replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          const name = parts[0];
          const pid = parseInt(parts[1], 10);
          if (!isNaN(pid)) {
            const isOwned = this.isHrisekesaOwned(pid);
            const tracked = this.trackedProcesses.get(pid);

            processes.push({
              pid,
              processName: name,
              status: 'running',
              isHrisekesaSpawned: isOwned,
              applicationId: tracked?.applicationId,
              startTime: tracked?.startTime
            });
          }
        }
      }
    } catch {
      // Fallback: return tracked processes if tasklist fails
      for (const [pid, tracked] of this.trackedProcesses.entries()) {
        processes.push({
          pid,
          processName: path.basename(tracked.executablePath),
          status: tracked.status,
          isHrisekesaSpawned: true,
          applicationId: tracked.applicationId,
          startTime: tracked.startTime
        });
      }
    }

    this.processCache = processes;
    this.lastProcessCacheTime = Date.now();
    return [...processes];
  }

  /**
   * Inspect a specific process.
   */
  public async inspectProcess(pid: number): Promise<ProcessInfo | null> {
    const all = await this.listProcesses();
    return all.find(p => p.pid === pid) || null;
  }

  /**
   * Safely terminate a process.
   * Only allows terminating processes launched by HṚṢĪKEŚA or explicitly allowed targets.
   * Never terminates system-critical or protected processes.
   */
  public async terminate(pid: number, force = false): Promise<{ success: boolean; error?: string }> {
    // 1. Check if process is protected
    const processInfo = await this.inspectProcess(pid);
    if (EnvironmentSecurityValidator.isProtectedProcess(pid, processInfo?.processName)) {
      return {
        success: false,
        error: `Security violation: Process PID ${pid} (${processInfo?.processName || 'system'}) is a protected OS component and cannot be terminated.`
      };
    }

    // 2. Verify ownership or authorization
    const isOwned = this.isHrisekesaOwned(pid);
    const tracked = this.trackedProcesses.get(pid);
    if (!isOwned && !tracked && !force) {
      return {
        success: false,
        error: `Safety boundary: Process PID ${pid} was not spawned by HṚṢĪKEŚA. Explicit authorization is required to terminate external processes.`
      };
    }

    // Check if process is already dead
    const alive = await this.isProcessRunning(pid);
    if (!alive) {
      if (tracked) {
        tracked.status = 'terminated';
      }
      return { success: true };
    }

    // 3. Terminate process via taskkill
    try {
      const args = ['/PID', String(pid), '/T'];
      if (force) {
        args.push('/F');
      }

      await execFileAsync('taskkill', args, {
        timeout: 3000,
        windowsHide: true
      });

      if (tracked) {
        tracked.status = 'terminated';
      }
      this.processCache = null;

      return { success: true };
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.toLowerCase().includes('not found') || errStr.toLowerCase().includes('no running instance')) {
        if (tracked) {
          tracked.status = 'terminated';
        }
        return { success: true };
      }

      // Fallback using process.kill
      try {
        process.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
        if (tracked) {
          tracked.status = 'terminated';
        }
        return { success: true };
      } catch (e: unknown) {
        const eStr = e instanceof Error ? e.message : String(e);
        if (eStr.includes('ESRCH')) {
          if (tracked) {
            tracked.status = 'terminated';
          }
          return { success: true };
        }
        return {
          success: false,
          error: `Failed to terminate PID ${pid}: ${errStr}`
        };
      }
    }
  }

  /**
   * Check if a PID was spawned and tracked by HṚṢĪKEŚA.
   */
  public isHrisekesaOwned(pid: number): boolean {
    const tracked = this.trackedProcesses.get(pid);
    return Boolean(tracked && tracked.status === 'running');
  }

  /**
   * Returns all processes spawned by HṚṢĪKEŚA.
   */
  public getTrackedProcesses(): ProcessInfo[] {
    const list: ProcessInfo[] = [];
    for (const [pid, tracked] of this.trackedProcesses.entries()) {
      list.push({
        pid,
        processName: path.basename(tracked.executablePath),
        status: tracked.status,
        isHrisekesaSpawned: true,
        applicationId: tracked.applicationId,
        startTime: tracked.startTime
      });
    }
    return list;
  }
}
