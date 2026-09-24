/**
 * HṚṢĪKEŚA (हृषीकेश) — Enterprise Environment Security & Policy Engine
 *
 * Phase 23: Enforces danger tiers, command injection defense, path traversal prevention,
 * privilege escalation detection, protected process shielding, and destructive action gating.
 */

import path from 'node:path';
import { ILogger } from '../../../core/logging/logger.types.js';
import { DangerTier } from '../interfaces/environment.types.js';

export interface CommandSecurityEvaluation {
  readonly allowed: boolean;
  readonly dangerTier: DangerTier;
  readonly requiresApproval: boolean;
  readonly reason?: string;
  readonly isPrivilegeEscalation: boolean;
  readonly sanitizedCommand: string;
}

export class EnvironmentSecurityPolicy {
  private readonly logger?: ILogger;

  // Protected system processes across Windows & Linux
  private static readonly PROTECTED_PROCESSES = [
    'systemd',
    'init',
    'kthreadd',
    'sshd',
    'dockerd',
    'containerd',
    'csrss',
    'lsass',
    'services',
    'smss',
    'winlogon',
    'securityhealthservice',
    'msmpeng',
  ];

  // Critical destructive keywords
  private static readonly DESTRUCTIVE_KEYWORDS = [
    'rm -rf /',
    'rm -rf /*',
    'mkfs',
    'format',
    'fdisk',
    'dd if=',
    'drop database',
    'userdel',
    'shutdown',
    'reboot',
    'poweroff',
    'init 0',
    'init 6',
  ];

  constructor(logger?: ILogger) {
    this.logger = logger?.child('EnvironmentSecurityPolicy');
  }

  /**
   * Static helper: asserts command safety, throwing if unsafe or injection is found.
   */
  public static assertCommandSafety(command: string): void {
    if (!command || typeof command !== 'string') {
      throw new Error('[EnvironmentPolicy] Command must be a non-empty string.');
    }

    if (
      command.includes(':(){ :|:& };:') ||
      command.includes('eval(') ||
      command.includes('`') ||
      command.includes(';')
    ) {
      throw new Error(`[EnvironmentPolicy] Command contains dangerous shell injection character or pattern.`);
    }

    const lower = command.toLowerCase();
    for (const kw of EnvironmentSecurityPolicy.DESTRUCTIVE_KEYWORDS) {
      if (lower.includes(kw)) {
        throw new Error(`[EnvironmentPolicy] Command contains destructive or malicious pattern '${kw}'. Execution blocked.`);
      }
    }
  }

  /**
   * Static helper: classifies a command string into a DangerTier.
   */
  public static classifyCommand(command: string, isPrivilegeEscalation = false): DangerTier {
    const lower = command.toLowerCase().trim();

    if (
      lower.includes('terminate') ||
      lower.includes('destroy') ||
      lower.includes('drop table') ||
      lower.includes('drop database') ||
      lower.includes('rm -rf') ||
      lower.includes('format') ||
      lower.includes('mkfs')
    ) {
      return 'CRITICAL';
    }

    if (isPrivilegeEscalation || lower.startsWith('sudo ') || lower.startsWith('su ') || lower.startsWith('runas ')) {
      return 'HIGH_RISK';
    }

    for (const kw of EnvironmentSecurityPolicy.DESTRUCTIVE_KEYWORDS) {
      if (lower.includes(kw)) return 'CRITICAL';
    }

    // Safe read-only / informational commands
    if (
      lower === 'whoami' ||
      lower === 'pwd' ||
      lower.startsWith('ls') ||
      lower.startsWith('dir') ||
      lower.startsWith('echo') ||
      lower.startsWith('hostname') ||
      lower.startsWith('uname') ||
      lower.startsWith('uptime') ||
      lower.startsWith('date') ||
      lower.startsWith('cat ') ||
      lower.startsWith('type ') ||
      lower.startsWith('head ') ||
      lower.startsWith('tail ') ||
      lower.startsWith('ps ') ||
      lower === 'ps'
    ) {
      return 'SAFE';
    }

    // Medium risk build / install commands
    if (
      lower.startsWith('git ') ||
      lower.startsWith('npm ') ||
      lower.startsWith('yarn ') ||
      lower.startsWith('pnpm ') ||
      lower.startsWith('pip ') ||
      lower.startsWith('apt-get update') ||
      lower.startsWith('cargo ') ||
      lower.startsWith('dotnet ') ||
      lower.startsWith('go ') ||
      lower.startsWith('curl ') ||
      lower.startsWith('wget ')
    ) {
      return 'MEDIUM_RISK';
    }

    // High risk system / service modifications
    if (
      lower.startsWith('systemctl') ||
      lower.startsWith('service') ||
      lower.startsWith('docker') ||
      lower.startsWith('podman') ||
      lower.startsWith('chmod') ||
      lower.startsWith('chown') ||
      lower.startsWith('netsh') ||
      lower.startsWith('iptables') ||
      lower.startsWith('ufw')
    ) {
      return 'HIGH_RISK';
    }

    return 'MEDIUM_RISK';
  }

  /**
   * Static helper: sanitizes a remote path, throwing if traversal is attempted.
   */
  public static sanitizePath(targetPath: string): string {
    if (!targetPath || typeof targetPath !== 'string') {
      throw new Error('[EnvironmentPolicy] Invalid or empty path.');
    }

    if (targetPath.includes('\0')) {
      throw new Error('[EnvironmentPolicy] Path contains illegal null-byte.');
    }

    if (targetPath.includes('..\\') || targetPath.includes('../') || targetPath.includes('..')) {
      const normalized = path.posix.normalize(targetPath.replace(/\\/g, '/'));
      if (normalized.startsWith('../') || normalized === '..') {
        throw new Error('[EnvironmentPolicy] Path traversal attempt detected.');
      }
      return normalized;
    }

    return targetPath.replace(/\\/g, '/');
  }

  /**
   * Static helper: checks if a process is a protected operating system daemon.
   */
  public static isProtectedProcess(processName?: string): boolean {
    if (!processName) return false;
    const clean = processName.toLowerCase().replace(/\.exe$/, '').trim();
    return EnvironmentSecurityPolicy.PROTECTED_PROCESSES.includes(clean);
  }

  /**
   * Evaluates command safety, detects injection vulnerabilities, classifies risk, and checks approval requirements.
   */
  public evaluateCommand(rawCommand: string): CommandSecurityEvaluation {
    const cmd = (rawCommand || '').trim();
    const lower = cmd.toLowerCase();

    // 1. Detect Privilege Escalation
    const isPrivilegeEscalation =
      lower.startsWith('sudo ') ||
      lower.startsWith('su ') ||
      lower.startsWith('runas ') ||
      lower.includes(' doas ') ||
      lower.includes(' sudo ');

    // 2. Detect Destructive Operations
    const isDestructive = EnvironmentSecurityPolicy.DESTRUCTIVE_KEYWORDS.some((kw) => lower.includes(kw));
    if (isDestructive) {
      this.logger?.warn(`CRITICAL destructive command intercepted: '${cmd}'`);
      return {
        allowed: false,
        dangerTier: 'CRITICAL',
        requiresApproval: true,
        isPrivilegeEscalation,
        sanitizedCommand: cmd,
        reason: `Destructive system operation requires explicit sovereign authorization.`,
      };
    }

    // 3. Detect Shell Injection / Malicious Chaining in untrusted contexts
    if (this.containsDangerousMetaChars(cmd)) {
      this.logger?.warn(`Command contains dangerous shell meta-characters: '${cmd}'`);
      return {
        allowed: false,
        dangerTier: 'HIGH_RISK',
        requiresApproval: true,
        isPrivilegeEscalation,
        sanitizedCommand: cmd,
        reason: `Command contains potentially hazardous shell injection or chaining tokens.`,
      };
    }

    // 4. Classify Danger Tier
    const dangerTier = EnvironmentSecurityPolicy.classifyCommand(cmd, isPrivilegeEscalation);
    const requiresApproval = dangerTier === 'CRITICAL' || dangerTier === 'HIGH_RISK' || isPrivilegeEscalation;

    return {
      allowed: true,
      dangerTier,
      requiresApproval,
      isPrivilegeEscalation,
      sanitizedCommand: cmd,
      reason: requiresApproval ? `Operation classified as ${dangerTier} requires sovereign approval.` : undefined,
    };
  }

  private containsDangerousMetaChars(command: string): boolean {
    return command.includes(':(){ :|:& };:') || command.includes('eval(') || command.includes('`') || command.includes(';');
  }
}

export const EnvironmentPolicy = EnvironmentSecurityPolicy;
