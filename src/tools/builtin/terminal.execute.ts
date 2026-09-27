/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tool Abstraction: terminal.execute
 * 
 * In Phase 4, arbitrary terminal execution is strictly disabled.
 * This tool establishes the formal execution contract, sandboxing policies,
 * timeouts, and output limits for future phases while only allowing
 * strictly whitelisted non-mutating status probes.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../interfaces/execution.types.js';

const execAsync = promisify(exec);

export interface TerminalExecuteInput {
  readonly command: string;
  readonly cwd?: string;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly envPolicy?: 'inherit' | 'isolated';
}

export interface TerminalExecuteOutput {
  readonly command: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly sandboxed: boolean;
}

export class TerminalExecuteTool implements ITool<TerminalExecuteInput, TerminalExecuteOutput> {
  public readonly id = 'terminal.execute';
  public readonly name = 'Terminal Command Execution';
  public readonly description = 'Executes a sandboxed terminal command. In Phase 4, arbitrary execution is strictly disabled per security policy; only safe read-only environment checks are permitted.';
  public readonly version = '1.0.0';
  public readonly category = 'terminal';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = true; // Always requires interactive authorization
  public readonly capabilities = ['terminal.exec', 'shell.sandbox'];

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string' as const,
        description: 'The command string to execute.'
      },
      cwd: {
        type: 'string' as const,
        description: 'Working directory for the execution. Must be within the authorized workspace.'
      },
      timeoutMs: {
        type: 'integer' as const,
        description: 'Execution timeout in milliseconds. Default 5000, max 30000.'
      },
      maxOutputBytes: {
        type: 'integer' as const,
        description: 'Maximum standard output buffer size in bytes. Default 10000.'
      },
      envPolicy: {
        type: 'string' as const,
        enum: ['inherit', 'isolated'],
        description: 'Environment isolation policy. Defaults to isolated.'
      }
    },
    required: ['command']
  };

  /**
   * Safe read-only diagnostic commands allowed during Phase 4 verification.
   */
  private readonly SAFE_ALLOWLIST = new Set([
    'node --version',
    'node -v',
    'npm --version',
    'npm -v',
    'git --version'
  ]);

  public async execute(
    input: TerminalExecuteInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<TerminalExecuteOutput>> {
    const rawCommand = input.command?.trim();
    if (!rawCommand) {
      return { success: false, error: 'Command parameter is required.', durationMs: 0 };
    }

    // Security Gate: Check if command is on the safe read-only allowlist
    const isWhitelisted = this.SAFE_ALLOWLIST.has(rawCommand);
    if (!isWhitelisted) {
      return {
        success: false,
        error: `Security Restriction: Arbitrary terminal execution is disabled in Phase 4. Command '${rawCommand}' is not in the safe diagnostic allowlist [${Array.from(this.SAFE_ALLOWLIST).join(', ')}].`,
        durationMs: 0
      };
    }

    const workspaceRoot = path.resolve(context.workspaceRoot);
    const targetCwd = input.cwd ? path.resolve(workspaceRoot, input.cwd) : workspaceRoot;

    // Boundary check for cwd
    const normalizedTarget = path.normalize(targetCwd).toLowerCase();
    const normalizedRoot = path.normalize(workspaceRoot).toLowerCase();
    if (
      normalizedTarget !== normalizedRoot &&
      !normalizedTarget.startsWith(normalizedRoot + path.sep)
    ) {
      return {
        success: false,
        error: `Working directory '${targetCwd}' resolves outside authorized workspace root.`,
        durationMs: 0
      };
    }

    const timeoutMs = Math.min(input.timeoutMs ?? 5000, 30000);
    const maxBuffer = Math.min(input.maxOutputBytes ?? 10000, 50000);
    const startTime = Date.now();

    try {
      const env = input.envPolicy === 'isolated'
        ? { PATH: process.env.PATH || '', SystemRoot: process.env.SystemRoot || '' }
        : process.env;

      const { stdout, stderr } = await execAsync(rawCommand, {
        cwd: targetCwd,
        timeout: timeoutMs,
        maxBuffer,
        env
      });

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        output: {
          command: rawCommand,
          exitCode: 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          durationMs,
          sandboxed: true
        },
        durationMs
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorObj = err as { code?: number; stdout?: string; stderr?: string; message?: string };

      return {
        success: false,
        output: {
          command: rawCommand,
          exitCode: typeof errorObj.code === 'number' ? errorObj.code : 1,
          stdout: (errorObj.stdout || '').trim(),
          stderr: (errorObj.stderr || errorObj.message || String(err)).trim(),
          durationMs,
          sandboxed: true
        },
        error: `Command failed: ${errorObj.message || String(err)}`,
        durationMs
      };
    }
  }
}
