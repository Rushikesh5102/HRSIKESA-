/**
 * HṚṢĪKEŚA (हृषीकेश) — Software & Environment Manager Type Contracts (Phase 10)
 *
 * Defines vendor-neutral application, process, and package management models.
 */

export type ApplicationSource = 'known-catalog' | 'start-menu' | 'registry' | 'path' | 'winget' | 'custom';

export interface ApplicationInfo {
  /** Unique normalized application ID (e.g., "blender", "vscode", "notepad") */
  id: string;
  /** Human-readable application name */
  name: string;
  /** Publisher or organization */
  publisher?: string;
  /** Version string if discoverable */
  version?: string;
  /** Absolute path to the verified executable */
  executablePath?: string;
  /** Directory containing the application */
  installPath?: string;
  /** Discovery source */
  source: ApplicationSource;
  /** Whether the application is verified to be installed on the machine */
  installed: boolean;
  /** Whether an instance of the application is currently running */
  running: boolean;
  /** Active process IDs if running */
  processIds?: number[];
  /** Application capabilities (e.g., ["gui", "cli", "3d", "code-editor"]) */
  capabilities?: string[];
  /** Timestamp when the installation status was last verified */
  lastVerifiedAt?: string;
}

export interface ProcessInfo {
  pid: number;
  processName: string;
  executablePath?: string;
  title?: string;
  startTime?: string;
  status: 'running' | 'terminated' | 'unknown';
  isHrisekesaSpawned: boolean;
  applicationId?: string;
  memoryMb?: number;
}

export type ReadinessStatus = 'STARTING' | 'READY' | 'FAILED' | 'TIMEOUT' | 'UNKNOWN';

export interface ApplicationLaunchResult {
  success: boolean;
  applicationId: string;
  applicationName: string;
  processId?: number;
  status: ReadinessStatus;
  windowTitle?: string;
  durationMs: number;
  error?: string;
}

export interface PackageInfo {
  id: string;
  name: string;
  version: string;
  source: string;
  publisher?: string;
  description?: string;
  homepage?: string;
  license?: string;
}

export interface PackageSearchResult {
  packages: PackageInfo[];
  totalFound: number;
  query: string;
}

export interface PackageInstallResult {
  success: boolean;
  packageId: string;
  installedVersion?: string;
  durationMs: number;
  humanInterventionRequired?: boolean;
  output?: string;
  error?: string;
}

export interface IApplicationDiscovery {
  discoverInstalledApps(): Promise<ApplicationInfo[]>;
  findApp(query: string): Promise<ApplicationInfo | null>;
  isInstalled(appId: string): Promise<boolean>;
}

export interface IProcessManager {
  listProcesses(): Promise<ProcessInfo[]>;
  inspectProcess(pid: number): Promise<ProcessInfo | null>;
  launch(app: ApplicationInfo, args?: string[]): Promise<ApplicationLaunchResult>;
  terminate(pid: number, force?: boolean): Promise<{ success: boolean; error?: string }>;
  isHrisekesaOwned(pid: number): boolean;
  getTrackedProcesses(): ProcessInfo[];
}

export interface IPackageManagerAdapter {
  isAvailable(): Promise<boolean>;
  search(query: string): Promise<PackageSearchResult>;
  inspect(packageId: string): Promise<PackageInfo | null>;
  install(packageId: string, options?: { version?: string }): Promise<PackageInstallResult>;
}

export interface IEnvironmentManager {
  listApplications(): Promise<ApplicationInfo[]>;
  findApplication(query: string): Promise<ApplicationInfo | null>;
  getApplicationStatus(appId: string): Promise<ApplicationInfo | null>;
  launchApplication(query: string, args?: string[]): Promise<ApplicationLaunchResult>;
  listProcesses(): Promise<ProcessInfo[]>;
  inspectProcess(pid: number): Promise<ProcessInfo | null>;
  terminateProcess(pid: number, force?: boolean): Promise<{ success: boolean; error?: string }>;
  isHrisekesaOwned(pid: number): boolean;
  getTrackedProcesses(): ProcessInfo[];
  searchPackages(query: string): Promise<PackageSearchResult>;
  inspectPackage(packageId: string): Promise<PackageInfo | null>;
  installPackage(packageId: string): Promise<PackageInstallResult>;
  shutdown(): Promise<void>;
}
