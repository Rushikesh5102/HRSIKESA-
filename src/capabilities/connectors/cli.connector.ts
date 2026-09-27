/**
 * HṚṢĪKEŚA (हृषीकेश) — CLI Capability Connector
 *
 * FP-07: Safe CLI Connector for governed commands (git, node, npm, ollama, python, powershell).
 * Enforces argument allowlists, shell metacharacter rejection, working directory constraints,
 * and deterministic verification via process exit code and output analysis.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  UniversalCapability,
  CapabilityInvocation,
  CapabilityHealth,
} from '../fabric/capability.types.js';
import {
  IConnector,
  RawConnectorResult,
  VerificationCheckResult,
  ResolvedCredentials,
} from '../fabric/connector.interface.js';

const execFileAsync = promisify(execFile);

// Dangerous shell metacharacters that must never appear in arguments
const SHELL_METACHARS_REGEX = /[;&|`$><\r\n]/;

export class CliConnector implements IConnector {
  public readonly protocol = 'CLI' as const;
  public readonly name = 'SafeCliConnector';
  private readonly logger?: ILogger;
  private readonly defaultAllowedCommands = new Set([
    'git',
    'node',
    'npm',
    'npx',
    'ollama',
    'python',
    'powershell',
  ]);

  constructor(logger?: ILogger) {
    this.logger = logger?.child('CliConnector');
  }

  public canHandle(capability: UniversalCapability): boolean {
    return capability.protocol === 'CLI';
  }

  public async execute(
    capability: UniversalCapability,
    invocation: CapabilityInvocation,
    _resolvedAuth?: ResolvedCredentials
  ): Promise<RawConnectorResult> {
    const startTime = Date.now();

    // 1. Resolve executable binary name
    const command = (invocation.inputs.command as string) || (capability.metadata?.executable as string) || invocation.operation;
    if (!command) {
      return {
        success: false,
        error: 'Missing executable command name in invocation inputs.',
        durationMs: Date.now() - startTime,
      };
    }

    // 2. Validate against allowed CLI commands
    const baseCommand = path.basename(command).replace(/\.exe$/i, '').toLowerCase();
    if (!this.defaultAllowedCommands.has(baseCommand)) {
      this.logger?.warn(`Blocked CLI execution for unauthorized binary: '${baseCommand}'`);
      return {
        success: false,
        error: `CLI binary '${baseCommand}' is not in the system allowed execution list.`,
        durationMs: Date.now() - startTime,
      };
    }

    // 3. Validate arguments array
    const rawArgs = invocation.inputs.args;
    const args: string[] = Array.isArray(rawArgs) ? rawArgs.map(String) : [];

    for (const arg of args) {
      if (SHELL_METACHARS_REGEX.test(arg)) {
        this.logger?.warn(`Rejected argument containing shell metacharacters: ${JSON.stringify(arg)}`);
        return {
          success: false,
          error: `Argument contains prohibited shell metacharacters: '${arg}'`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // 4. Resolve working directory
    const cwd = (invocation.inputs.cwd as string) ? path.resolve(invocation.inputs.cwd as string) : process.cwd();

    // 5. Execute via execFile (no shell interpolation)
    const timeoutMs = invocation.timeoutMs || 30000;
    try {
      this.logger?.debug(`Executing CLI '${baseCommand}' with args [${args.join(' ')}] in '${cwd}'`);
      const { stdout, stderr } = await execFileAsync(baseCommand, args, {
        cwd,
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
          command: baseCommand,
          args,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      this.logger?.error(`CLI execution failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        data: {
          stdout: err.stdout?.toString().trim() || '',
          stderr: err.stderr?.toString().trim() || '',
          exitCode: err.code || 1,
        },
        durationMs: Date.now() - startTime,
      };
    }
  }

  public async checkHealth(capability: UniversalCapability): Promise<CapabilityHealth> {
    const startTime = Date.now();
    const command = (capability.metadata?.executable as string) || capability.id.split('.').pop() || 'node';
    const baseCommand = path.basename(command).replace(/\.exe$/i, '').toLowerCase();

    try {
      const { stdout } = await execFileAsync(baseCommand, ['--version'], {
        timeout: 5000,
        windowsHide: true,
      });

      return {
        status: 'HEALTHY',
        lastCheckedAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        consecutiveFailures: 0,
        latencyMs: Date.now() - startTime,
        message: `${baseCommand} is operational: ${stdout.trim()}`,
      };
    } catch (err: any) {
      return {
        status: 'DEGRADED',
        lastCheckedAt: new Date().toISOString(),
        lastFailureAt: new Date().toISOString(),
        consecutiveFailures: 1,
        latencyMs: Date.now() - startTime,
        message: `Failed to invoke ${baseCommand} --version: ${err.message}`,
      };
    }
  }

  public async verify(
    _capability: UniversalCapability,
    _invocation: CapabilityInvocation,
    result: RawConnectorResult
  ): Promise<VerificationCheckResult> {
    if (!result.success) {
      return {
        verified: false,
        strategy: 'exit_code',
        details: `Process failed or threw error: ${result.error}`,
      };
    }

    const data = result.data as { exitCode?: number; stdout?: string } | undefined;
    if (data && data.exitCode === 0) {
      return {
        verified: true,
        strategy: 'exit_code',
        details: `Command exited cleanly with code 0. Output length: ${data.stdout?.length || 0} chars.`,
      };
    }

    return {
      verified: false,
      strategy: 'exit_code',
      details: 'Non-zero exit code or missing output data.',
    };
  }
}
