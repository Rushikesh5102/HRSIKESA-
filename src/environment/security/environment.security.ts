/**
 * HṚṢĪKEŚA (हृषीकेश) — Environment Security Validator (Phase 10)
 *
 * Enforces strict boundaries on software discovery, process execution,
 * process termination, package manager operations, and audit secret redaction.
 */

import path from 'node:path';
import fs from 'node:fs';

export class EnvironmentSecurityValidator {
  /**
   * System-critical process names that can never be terminated by HṚṢĪKEŚA.
   */
  private static readonly PROTECTED_PROCESS_NAMES = new Set([
    'system',
    'system idle process',
    'smss.exe',
    'csrss.exe',
    'wininit.exe',
    'winlogon.exe',
    'services.exe',
    'lsass.exe',
    'svchost.exe',
    'dwm.exe',
    'explorer.exe',
    'fontdrvhost.exe',
    'sihost.exe',
    'taskhostw.exe',
    'ctfmon.exe',
    'msmpeng.exe', // Microsoft Defender Antivirus
    'nissrv.exe',
    'securityhealthservice.exe',
    'antigravity.exe',
    'node.exe' // Prevent self-termination of the runtime node process via generic name
  ]);

  /**
   * System-critical PIDs (e.g. System Idle = 0, System = 4)
   */
  private static readonly PROTECTED_PIDS = new Set([0, 4]);

  /**
   * Sanitize package search query or application search query.
   * Rejects malicious shell meta-characters.
   */
  public static sanitizeQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query must be a non-empty string.');
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      throw new Error('Search query cannot be empty or whitespace.');
    }

    if (trimmed.length > 100) {
      throw new Error('Search query exceeds maximum length limit of 100 characters.');
    }

    // Disallow shell operators and injection tokens
    if (/[&|;`$><%\r\n\0]/.test(trimmed)) {
      throw new Error('Security check failed: Search query contains prohibited shell control characters.');
    }

    return trimmed;
  }

  /**
   * Validate package ID format (e.g., "BlenderFoundation.Blender", "Git.Git").
   */
  public static validatePackageId(packageId: string): string {
    if (!packageId || typeof packageId !== 'string') {
      throw new Error('Package ID must be a non-empty string.');
    }

    const trimmed = packageId.trim();
    // Allow standard winget package IDs: alphanumeric, dots, dashes, underscores
    if (!/^[a-zA-Z0-9_\-.]+(\.[a-zA-Z0-9_\-.]+)*$/.test(trimmed)) {
      throw new Error(`Invalid package ID format: "${trimmed}". Must contain only alphanumeric, dot, dash, or underscore characters.`);
    }

    return trimmed;
  }

  /**
   * Validate that an executable path is safe to launch:
   * - Must be absolute
   * - Must exist on disk
   * - Must have an executable extension (.exe, .cmd, .bat) or be a verified system command
   */
  public static validateExecutablePath(exePath: string): boolean {
    if (!exePath || typeof exePath !== 'string') {
      return false;
    }

    try {
      const normalized = path.normalize(exePath);
      if (!path.isAbsolute(normalized)) {
        return false;
      }

      if (!fs.existsSync(normalized)) {
        return false;
      }

      const stat = fs.statSync(normalized);
      if (!stat.isFile()) {
        return false;
      }

      const ext = path.extname(normalized).toLowerCase();
      const validExtensions = ['.exe', '.cmd', '.bat', '.com'];
      if (!validExtensions.includes(ext)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a process is protected from termination.
   */
  public static isProtectedProcess(pid: number, processName?: string): boolean {
    if (this.PROTECTED_PIDS.has(pid)) {
      return true;
    }

    if (processName) {
      const lower = processName.toLowerCase().trim();
      if (this.PROTECTED_PROCESS_NAMES.has(lower)) {
        return true;
      }
      // Also check without extension if applicable
      const baseName = lower.endsWith('.exe') ? lower.slice(0, -4) : lower;
      if (this.PROTECTED_PROCESS_NAMES.has(baseName)) {
        return true;
      }
    }

    // Also protect the current running HṚṢĪKEŚA Node.js process PID
    if (pid === process.pid) {
      return true;
    }

    return false;
  }

  /**
   * Redact sensitive tokens and passwords from CLI argument lists.
   */
  public static redactArguments(args: string[]): string[] {
    const credentialFlagNames = new Set([
      '--password',
      '-p',
      '--token',
      '--secret',
      '--api-key',
      '--apikey',
      '--auth'
    ]);

    const secretPatterns = [
      /sk-[a-zA-Z0-9_-]+/i,
      /ghp_[a-zA-Z0-9]+/i,
      /bearer\s+[a-zA-Z0-9._-]+/i
    ];

    return args.map((arg, idx) => {
      // 1. If previous argument was a credential flag, redact this argument value
      if (idx > 0) {
        const prev = args[idx - 1].toLowerCase();
        if (credentialFlagNames.has(prev)) {
          return '[REDACTED]';
        }
      }

      // 2. If argument is of form --flag=value, check if flag or value is sensitive
      if (arg.includes('=')) {
        const [k, v] = arg.split('=');
        const kLower = k.toLowerCase();
        if (
          kLower.includes('password') ||
          kLower.includes('secret') ||
          kLower.includes('token') ||
          kLower.includes('key') ||
          kLower.includes('auth') ||
          secretPatterns.some(p => p.test(v))
        ) {
          return `${k}=[REDACTED]`;
        }
      }

      // 3. Check for specific secret token patterns in standalone argument
      if (secretPatterns.some(p => p.test(arg))) {
        return '[REDACTED]';
      }

      return arg;
    });
  }
}
