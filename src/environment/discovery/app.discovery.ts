/**
 * HṚṢĪKEŚA (हृषीकेश) — Application Discovery Subsystem (Phase 10)
 *
 * Implements bounded, multi-source discovery of installed Windows applications
 * using the Known Application Catalog, Start Menu shortcuts, Registry App Paths, and PATH resolution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ApplicationInfo, IApplicationDiscovery } from '../interfaces/environment.types.js';
import { KnownAppCatalog, KnownAppDefinition } from './known.apps.js';
import { EnvironmentSecurityValidator } from '../security/environment.security.js';

const execFileAsync = promisify(execFile);

export class AppDiscovery implements IApplicationDiscovery {
  private cache: ApplicationInfo[] | null = null;
  private lastCacheTime = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Discovers installed applications across all safe discovery sources.
   */
  public async discoverInstalledApps(): Promise<ApplicationInfo[]> {
    if (this.cache && (Date.now() - this.lastCacheTime < this.CACHE_TTL_MS)) {
      return [...this.cache];
    }

    const discoveredMap = new Map<string, ApplicationInfo>();

    // 1. Discover from Known Application Catalog
    const knownApps = KnownAppCatalog.getAllKnownApps();
    for (const def of knownApps) {
      const verified = await this.verifyKnownApp(def);
      if (verified) {
        discoveredMap.set(verified.id, verified);
      }
    }

    // 2. Discover from Start Menu Shortcuts (.lnk targets)
    try {
      const startMenuApps = await this.scanStartMenu();
      for (const app of startMenuApps) {
        if (!discoveredMap.has(app.id)) {
          discoveredMap.set(app.id, app);
        }
      }
    } catch {
      // Start Menu scanning is non-blocking fallback
    }

    // 3. Discover from Registry App Paths
    try {
      const registryApps = await this.scanRegistryAppPaths();
      for (const app of registryApps) {
        if (!discoveredMap.has(app.id)) {
          discoveredMap.set(app.id, app);
        }
      }
    } catch {
      // Registry App Paths scanning is non-blocking fallback
    }

    const results = Array.from(discoveredMap.values());
    this.cache = results;
    this.lastCacheTime = Date.now();
    return results;
  }

  /**
   * Finds an application by name, ID, alias, or executable name.
   */
  public async findApp(query: string): Promise<ApplicationInfo | null> {
    const sanitized = EnvironmentSecurityValidator.sanitizeQuery(query);
    const qLower = sanitized.toLowerCase();

    // 1. Check Known Catalog
    const knownDef = KnownAppCatalog.findInCatalog(sanitized);
    if (knownDef) {
      const verified = await this.verifyKnownApp(knownDef);
      if (verified) {
        return verified;
      }
      // If known app is not installed, return structured not-installed record
      return {
        id: knownDef.id,
        name: knownDef.name,
        publisher: knownDef.publisher,
        source: 'known-catalog',
        installed: false,
        running: false,
        capabilities: knownDef.capabilities,
        lastVerifiedAt: new Date().toISOString()
      };
    }

    // 2. Search cached or full discovery
    const allApps = await this.discoverInstalledApps();
    for (const app of allApps) {
      if (
        app.id.toLowerCase() === qLower ||
        app.name.toLowerCase() === qLower ||
        (app.executablePath && path.basename(app.executablePath).toLowerCase() === qLower)
      ) {
        return app;
      }
    }

    // Partial substring match in name or ID
    for (const app of allApps) {
      if (app.name.toLowerCase().includes(qLower) || app.id.toLowerCase().includes(qLower)) {
        return app;
      }
    }

    // 3. Fallback: Check system PATH via where.exe
    const pathExe = await this.resolveFromPath(sanitized);
    if (pathExe) {
      const normalizedId = path.basename(pathExe, path.extname(pathExe)).toLowerCase();
      const appInfo: ApplicationInfo = {
        id: normalizedId,
        name: path.basename(pathExe),
        executablePath: pathExe,
        installPath: path.dirname(pathExe),
        source: 'path',
        installed: true,
        running: false,
        lastVerifiedAt: new Date().toISOString()
      };
      return appInfo;
    }

    return null;
  }

  /**
   * Checks if an application ID is installed.
   */
  public async isInstalled(appId: string): Promise<boolean> {
    const app = await this.findApp(appId);
    return Boolean(app && app.installed && app.executablePath);
  }

  /**
   * Verify known app definition against disk paths and PATH.
   */
  private async verifyKnownApp(def: KnownAppDefinition): Promise<ApplicationInfo | null> {
    // Check standard paths
    for (const stdPath of def.standardPaths) {
      if (EnvironmentSecurityValidator.validateExecutablePath(stdPath)) {
        return {
          id: def.id,
          name: def.name,
          publisher: def.publisher,
          executablePath: path.normalize(stdPath),
          installPath: path.dirname(stdPath),
          source: 'known-catalog',
          installed: true,
          running: false,
          capabilities: def.capabilities,
          lastVerifiedAt: new Date().toISOString()
        };
      }
    }

    // Check default executable names via PATH
    for (const exeName of def.defaultExecutableNames) {
      const resolved = await this.resolveFromPath(exeName);
      if (resolved && EnvironmentSecurityValidator.validateExecutablePath(resolved)) {
        return {
          id: def.id,
          name: def.name,
          publisher: def.publisher,
          executablePath: path.normalize(resolved),
          installPath: path.dirname(resolved),
          source: 'path',
          installed: true,
          running: false,
          capabilities: def.capabilities,
          lastVerifiedAt: new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Resolve an executable path from PATH via where.exe.
   */
  private async resolveFromPath(command: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('where.exe', [command], {
        timeout: 3000,
        windowsHide: true
      });
      const lines = stdout.trim().split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (EnvironmentSecurityValidator.validateExecutablePath(trimmed)) {
          return trimmed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Scan Start Menu directories for shortcut files (.lnk).
   */
  private async scanStartMenu(): Promise<ApplicationInfo[]> {
    const startMenuDirs: string[] = [];
    if (process.env.ProgramData) {
      startMenuDirs.push(path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
    }
    if (process.env.APPDATA) {
      startMenuDirs.push(path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
    }

    const apps: ApplicationInfo[] = [];

    for (const baseDir of startMenuDirs) {
      if (!fs.existsSync(baseDir)) continue;

      try {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true, recursive: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.toLowerCase().endsWith('.lnk')) {
            const fullPath = path.join(entry.parentPath || baseDir, entry.name);
            const appName = path.basename(entry.name, '.lnk').trim();
            const id = appName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

            apps.push({
              id,
              name: appName,
              installPath: path.dirname(fullPath),
              source: 'start-menu',
              installed: true,
              running: false,
              lastVerifiedAt: new Date().toISOString()
            });
          }
        }
      } catch {
        // Skip inaccessible folders
      }
    }

    return apps;
  }

  /**
   * Scan Windows Registry App Paths for registered applications.
   */
  private async scanRegistryAppPaths(): Promise<ApplicationInfo[]> {
    const apps: ApplicationInfo[] = [];
    try {
      const script = `
        $paths = @("HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths", "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths")
        $results = @()
        foreach ($p in $paths) {
          if (Test-Path $p) {
            Get-ChildItem -Path $p -ErrorAction SilentlyContinue | ForEach-Object {
              $exe = (Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue).'(default)'
              if ($exe -and (Test-Path $exe -PathType Leaf)) {
                $results += [PSCustomObject]@{
                  Name = $_.PSChildName
                  ExePath = $exe
                }
              }
            }
          }
        }
        $results | ConvertTo-Json -Compress
      `;

      const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
        timeout: 5000,
        windowsHide: true
      });

      const trimmed = stdout.trim();
      if (!trimmed) return apps;

      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (item && item.ExePath && EnvironmentSecurityValidator.validateExecutablePath(item.ExePath)) {
          const rawName = String(item.Name || '');
          const id = path.basename(rawName, path.extname(rawName)).toLowerCase();
          apps.push({
            id,
            name: path.basename(item.ExePath, path.extname(item.ExePath)),
            executablePath: path.normalize(item.ExePath),
            installPath: path.dirname(item.ExePath),
            source: 'registry',
            installed: true,
            running: false,
            lastVerifiedAt: new Date().toISOString()
          });
        }
      }
    } catch {
      // Non-blocking fallback
    }

    return apps;
  }
}
