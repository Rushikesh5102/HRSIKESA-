/**
 * HṚṢĪKEŚA (हृषीकेश) — Windows Package Manager (winget) Adapter (Phase 10)
 *
 * Implements constrained, non-interactive interaction with Microsoft Windows Package Manager (winget.exe).
 * Enforces strict query sanitization, package ID validation, and human intervention detection for UAC elevation.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  PackageInfo,
  PackageInstallResult,
  PackageSearchResult,
  IPackageManagerAdapter
} from '../interfaces/environment.types.js';
import { EnvironmentSecurityValidator } from '../security/environment.security.js';

const execFileAsync = promisify(execFile);

export class WingetAdapter implements IPackageManagerAdapter {
  private available: boolean | null = null;

  /**
   * Check whether winget.exe is available and operational.
   */
  public async isAvailable(): Promise<boolean> {
    if (this.available !== null) {
      return this.available;
    }

    try {
      const { stdout } = await execFileAsync('winget.exe', ['--version'], {
        timeout: 3000,
        windowsHide: true
      });
      this.available = Boolean(stdout && stdout.trim().length > 0);
    } catch {
      this.available = false;
    }

    return this.available;
  }

  /**
   * Search for packages in the official winget repository.
   */
  public async search(query: string): Promise<PackageSearchResult> {
    const sanitized = EnvironmentSecurityValidator.sanitizeQuery(query);

    const isAvail = await this.isAvailable();
    if (!isAvail) {
      return {
        packages: [],
        totalFound: 0,
        query: sanitized
      };
    }

    try {
      // Execute winget search with query
      const { stdout } = await execFileAsync(
        'winget.exe',
        ['search', sanitized, '--accept-source-agreements'],
        {
          timeout: 15000,
          windowsHide: true
        }
      );

      const packages = this.parseWingetTable(stdout);
      return {
        packages,
        totalFound: packages.length,
        query: sanitized
      };
    } catch (err) {
      return {
        packages: [],
        totalFound: 0,
        query: sanitized
      };
    }
  }

  /**
   * Inspect a package by ID.
   */
  public async inspect(packageId: string): Promise<PackageInfo | null> {
    const validId = EnvironmentSecurityValidator.validatePackageId(packageId);

    const isAvail = await this.isAvailable();
    if (!isAvail) {
      return null;
    }

    try {
      const { stdout } = await execFileAsync(
        'winget.exe',
        ['show', '--id', validId, '--exact', '--accept-source-agreements'],
        {
          timeout: 15000,
          windowsHide: true
        }
      );

      return this.parseWingetShow(validId, stdout);
    } catch {
      return null;
    }
  }

  /**
   * Install an approved package.
   * Uses non-interactive flags. If UAC elevation or interactive input is required,
   * detects the condition and returns humanInterventionRequired: true.
   */
  public async install(packageId: string, options: { version?: string } = {}): Promise<PackageInstallResult> {
    const startTime = Date.now();
    const validId = EnvironmentSecurityValidator.validatePackageId(packageId);

    const isAvail = await this.isAvailable();
    if (!isAvail) {
      return {
        success: false,
        packageId: validId,
        durationMs: Date.now() - startTime,
        error: 'Windows Package Manager (winget) is not available on this system.'
      };
    }

    const args = [
      'install',
      '--id', validId,
      '--exact',
      '--accept-source-agreements',
      '--accept-package-agreements',
      '--disable-interactivity'
    ];

    if (options.version) {
      args.push('--version', options.version);
    }

    try {
      const { stdout, stderr } = await execFileAsync('winget.exe', args, {
        timeout: 120000, // 2 minutes max for installation
        windowsHide: true
      });

      const output = `${stdout}\n${stderr}`.trim();

      // Check for success markers
      if (output.includes('Successfully installed') || output.includes('Found an existing package')) {
        return {
          success: true,
          packageId: validId,
          installedVersion: options.version,
          durationMs: Date.now() - startTime,
          output
        };
      }

      // Check for UAC / administrative privilege required
      if (
        output.includes('administrator privileges') ||
        output.includes('elevation') ||
        output.includes('0x80070005') || // Access Denied
        output.includes('canceled by the user')
      ) {
        return {
          success: false,
          packageId: validId,
          durationMs: Date.now() - startTime,
          humanInterventionRequired: true,
          error: 'Installation requires administrative elevation (UAC prompt). Please complete the installation interactively.',
          output
        };
      }

      return {
        success: false,
        packageId: validId,
        durationMs: Date.now() - startTime,
        output,
        error: `Winget exited without confirming successful installation.`
      };
    } catch (err: unknown) {
      const errorObj = err as { code?: number; stdout?: string; stderr?: string; message?: string };
      const output = `${errorObj.stdout || ''}\n${errorObj.stderr || ''}`.trim();

      if (output.includes('administrator') || output.includes('elevation') || errorObj.code === 0x80070005) {
        return {
          success: false,
          packageId: validId,
          durationMs: Date.now() - startTime,
          humanInterventionRequired: true,
          error: 'Installation requires administrative elevation (UAC prompt). Please complete the installation interactively.',
          output
        };
      }

      return {
        success: false,
        packageId: validId,
        durationMs: Date.now() - startTime,
        error: errorObj.message || String(err),
        output
      };
    }
  }

  /**
   * Parse tabular output from `winget search`.
   */
  private parseWingetTable(stdout: string): PackageInfo[] {
    const packages: PackageInfo[] = [];
    const lines = stdout.trim().split(/\r?\n/);

    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Name') && lines[i].includes('Id') && lines[i].includes('Version')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1 || headerIdx + 2 >= lines.length) {
      return packages;
    }

    const headerLine = lines[headerIdx];

    // Find column split indices based on header line
    const nameStart = 0;
    const idStart = headerLine.indexOf('Id');
    const verStart = headerLine.indexOf('Version');
    const matchStart = headerLine.indexOf('Match');
    const sourceStart = headerLine.indexOf('Source');

    for (let i = headerIdx + 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('-') || line.length < verStart) continue;

      const name = line.substring(nameStart, idStart).trim();
      const id = line.substring(idStart, verStart).trim();
      const verEnd = matchStart !== -1 ? matchStart : (sourceStart !== -1 ? sourceStart : line.length);
      const version = line.substring(verStart, verEnd).trim();
      const source = sourceStart !== -1 && line.length > sourceStart ? line.substring(sourceStart).trim() : 'winget';

      if (id && name) {
        packages.push({
          id,
          name,
          version,
          source
        });
      }
    }

    return packages;
  }

  /**
   * Parse key-value output from `winget show`.
   */
  private parseWingetShow(packageId: string, stdout: string): PackageInfo {
    const lines = stdout.trim().split(/\r?\n/);
    let name = packageId;
    let version = 'unknown';
    let publisher: string | undefined;
    let description: string | undefined;
    let homepage: string | undefined;
    let license: string | undefined;

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const val = line.substring(colonIdx + 1).trim();

      if (key === 'found' || key === 'name') {
        name = val;
      } else if (key === 'version') {
        version = val;
      } else if (key === 'publisher') {
        publisher = val;
      } else if (key === 'description') {
        description = val;
      } else if (key === 'homepage') {
        homepage = val;
      } else if (key === 'license') {
        license = val;
      }
    }

    return {
      id: packageId,
      name,
      version,
      source: 'winget',
      publisher,
      description,
      homepage,
      license
    };
  }
}
