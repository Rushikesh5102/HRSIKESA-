/**
 * HṚṢĪKEŚA (हृषीकेश) — PowerShell Terminal Execution Capability Adapter
 *
 * Phase 16J: Governed Subprocess Execution Capability
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ICapabilityAdapter } from './capability.adapter.js';
import {
  CapabilityMetadata,
  CapabilityHealthCheckResult,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
} from '../interfaces/capability.types.js';

const execAsync = promisify(exec);

export class PowerShellTerminalCapabilityAdapter implements ICapabilityAdapter {
  private readonly defaultCwd: string;

  constructor(defaultCwd = process.cwd()) {
    this.defaultCwd = defaultCwd;
  }

  public getMetadata(): CapabilityMetadata {
    return {
      id: 'terminal.powershell',
      name: 'PowerShell / Shell Subprocess Execution',
      description: 'Governed command execution in local shell with timeout and working directory constraints.',
      category: 'terminal',
      provider: 'Microsoft PowerShell / OS Shell',
      source: 'native',
      version: '7.x / 5.1',
      license: 'MIT / Proprietary',
      runtimeType: 'subprocess',
      supportedPlatforms: ['win32', 'linux', 'darwin'],
      requiredPermissions: ['terminal:execute'],
      riskLevel: 'HIGH',
      dependencies: ['node:child_process'],
      enabled: true,
      securityStatus: 'VERIFIED',
    };
  }

  public async checkHealth(): Promise<CapabilityHealthCheckResult> {
    const start = Date.now();
    try {
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'powershell -Command "$PSVersionTable.PSVersion.ToString()"' : 'echo OK';
      const { stdout } = await execAsync(cmd, { timeout: 3000 });
      return {
        status: 'HEALTHY',
        message: `Shell executor ready: ${stdout.trim()}`,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'DEGRADED',
        message: `Shell executor warning: ${err.message}`,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

  public async execute(req: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const start = Date.now();
    try {
      const command = String(req.parameters.command || '');
      const cwd = String(req.parameters.cwd || this.defaultCwd);
      const timeout = typeof req.parameters.timeoutMs === 'number' ? req.parameters.timeoutMs : 30000;

      const { stdout, stderr } = await execAsync(command, { cwd, timeout });

      return {
        success: true,
        output: { stdout: stdout.trim(), stderr: stderr.trim() },
        executionTimeMs: Date.now() - start,
        capabilityId: 'terminal.powershell',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        executionTimeMs: Date.now() - start,
        capabilityId: 'terminal.powershell',
      };
    }
  }
}
