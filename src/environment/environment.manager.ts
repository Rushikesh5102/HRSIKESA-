/**
 * HṚṢĪKEŚA (हृषीकेश) — Software & Environment Manager (Phase 10)
 *
 * Central orchestrator for application discovery, verified execution,
 * process tracking, and package management.
 */

import {
  ApplicationInfo,
  ApplicationLaunchResult,
  PackageInfo,
  PackageInstallResult,
  PackageSearchResult,
  ProcessInfo,
  IApplicationDiscovery,
  IEnvironmentManager,
  IPackageManagerAdapter,
  IProcessManager
} from './interfaces/environment.types.js';
import { AppDiscovery } from './discovery/app.discovery.js';
import { ProcessManager } from './process/process.manager.js';
import { WingetAdapter } from './installers/winget.adapter.js';
import { EnvironmentSecurityValidator } from './security/environment.security.js';
import { IUiaAdapter } from '../tools/computer/uia/interfaces/uia.types.js';

export class EnvironmentManager implements IEnvironmentManager {
  private readonly discovery: IApplicationDiscovery;
  private readonly processManager: IProcessManager;
  private readonly packageManager: IPackageManagerAdapter;

  constructor(
    customDiscovery?: IApplicationDiscovery,
    customProcessManager?: IProcessManager,
    customPackageManager?: IPackageManagerAdapter,
    uiaAdapter?: IUiaAdapter
  ) {
    this.discovery = customDiscovery || new AppDiscovery();
    this.processManager = customProcessManager || new ProcessManager(uiaAdapter);
    this.packageManager = customPackageManager || new WingetAdapter();
  }

  /**
   * List all discovered installed applications.
   */
  public async listApplications(): Promise<ApplicationInfo[]> {
    const apps = await this.discovery.discoverInstalledApps();
    const processes = await this.processManager.listProcesses();

    // Cross-reference running processes
    for (const app of apps) {
      const runningPids: number[] = [];
      const appNameLower = app.name.toLowerCase();
      const appExeLower = app.executablePath ? app.executablePath.toLowerCase() : '';

      for (const p of processes) {
        const pNameLower = p.processName.toLowerCase();
        if (
          pNameLower === appNameLower ||
          pNameLower === `${appNameLower}.exe` ||
          (appExeLower && appExeLower.endsWith(pNameLower))
        ) {
          runningPids.push(p.pid);
        }
      }

      app.running = runningPids.length > 0;
      app.processIds = runningPids.length > 0 ? runningPids : undefined;
    }

    return apps;
  }

  /**
   * Find an application by name, ID, or alias.
   */
  public async findApplication(query: string): Promise<ApplicationInfo | null> {
    const app = await this.discovery.findApp(query);
    if (!app) return null;

    if (app.installed) {
      const processes = await this.processManager.listProcesses();
      const runningPids: number[] = [];
      const appNameLower = app.name.toLowerCase();
      const appExeLower = app.executablePath ? app.executablePath.toLowerCase() : '';

      for (const p of processes) {
        const pNameLower = p.processName.toLowerCase();
        if (
          pNameLower === appNameLower ||
          pNameLower === `${appNameLower}.exe` ||
          (appExeLower && appExeLower.endsWith(pNameLower))
        ) {
          runningPids.push(p.pid);
        }
      }

      app.running = runningPids.length > 0;
      app.processIds = runningPids.length > 0 ? runningPids : undefined;
    }

    return app;
  }

  /**
   * Get detailed status for an application.
   */
  public async getApplicationStatus(appId: string): Promise<ApplicationInfo | null> {
    return this.findApplication(appId);
  }

  /**
   * Verified application launch:
   * 1. Resolves and verifies application executable from trusted discovery.
   * 2. Launches via controlled process manager.
   * 3. Awaits readiness state.
   */
  public async launchApplication(query: string, args: string[] = []): Promise<ApplicationLaunchResult> {
    const startTime = Date.now();
    const app = await this.findApplication(query);

    if (!app) {
      return {
        success: false,
        applicationId: query.toLowerCase().trim(),
        applicationName: query,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        error: `Application "${query}" is not recognized or discovered on this system.`
      };
    }

    if (!app.installed || !app.executablePath) {
      return {
        success: false,
        applicationId: app.id,
        applicationName: app.name,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        error: `Application "${app.name}" is not installed on this system. You can search and install it using environment.package.search.`
      };
    }

    // Verify executable path safety
    if (!EnvironmentSecurityValidator.validateExecutablePath(app.executablePath)) {
      return {
        success: false,
        applicationId: app.id,
        applicationName: app.name,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        error: `Security verification failed for "${app.name}": invalid executable path (${app.executablePath}).`
      };
    }

    return this.processManager.launch(app, args);
  }

  /**
   * List active processes with ownership annotations.
   */
  public async listProcesses(): Promise<ProcessInfo[]> {
    return this.processManager.listProcesses();
  }

  /**
   * Inspect a specific process.
   */
  public async inspectProcess(pid: number): Promise<ProcessInfo | null> {
    return this.processManager.inspectProcess(pid);
  }

  /**
   * Safely terminate a process.
   */
  public async terminateProcess(pid: number, force = false): Promise<{ success: boolean; error?: string }> {
    return this.processManager.terminate(pid, force);
  }

  /**
   * Check if a PID is tracked as HṚṢĪKEŚA-spawned.
   */
  public isHrisekesaOwned(pid: number): boolean {
    return this.processManager.isHrisekesaOwned(pid);
  }

  /**
   * Return all processes spawned and tracked by HṚṢĪKEŚA.
   */
  public getTrackedProcesses(): ProcessInfo[] {
    return this.processManager.getTrackedProcesses();
  }

  /**
   * Search for software packages in winget.
   */
  public async searchPackages(query: string): Promise<PackageSearchResult> {
    return this.packageManager.search(query);
  }

  /**
   * Inspect package details in winget.
   */
  public async inspectPackage(packageId: string): Promise<PackageInfo | null> {
    return this.packageManager.inspect(packageId);
  }

  /**
   * Install an approved package via winget.
   */
  public async installPackage(packageId: string): Promise<PackageInstallResult> {
    return this.packageManager.install(packageId);
  }

  /**
   * Clean shutdown of the environment manager.
   */
  public async shutdown(): Promise<void> {
    // Process manager cleanup if needed
  }
}
