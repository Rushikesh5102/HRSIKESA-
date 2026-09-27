/**
 * HṚṢĪKEŚA (हृषीकेश) — Terminal & Process Execution Supervisor
 *
 * FP-09: Interactive and background terminal management, circular output buffering,
 * command validation, and process lifecycle control.
 */

import { spawn, ChildProcess } from 'node:child_process';
import os from 'node:os';
import crypto from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import { TerminalSession } from '../types/ide.types.js';
import { IdeRepository } from '../repository/ide.repository.js';

interface ActiveTerminalProcess {
  session: TerminalSession;
  child?: ChildProcess;
  outputBuffer: string[];
  maxBufferBytes: number;
}

export class TerminalManager {
  private readonly repo: IdeRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private readonly activeTerminals: Map<string, ActiveTerminalProcess> = new Map();
  private readonly defaultShell: string;

  constructor(repo: IdeRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repo = repo;
    this.eventBus = eventBus;
    this.logger = logger?.child('TerminalManager');
    this.defaultShell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
  }

  /**
   * Spawns a new terminal session in the workspace directory.
   */
  public createTerminal(
    workspaceIdOrMeta: string | any,
    cwdOrName?: string,
    name?: string,
    shellPath?: string
  ): TerminalSession {
    let wsId: string;
    let cwd: string;
    let termName: string | undefined;

    if (typeof workspaceIdOrMeta === 'object' && workspaceIdOrMeta !== null) {
      wsId = workspaceIdOrMeta.id || 'default_ws';
      cwd = workspaceIdOrMeta.rootPath || cwdOrName || process.cwd();
      termName = cwdOrName || name;
    } else {
      wsId = workspaceIdOrMeta || 'default_ws';
      cwd = cwdOrName || process.cwd();
      termName = name;
    }

    const termId = `term_${crypto.randomUUID().slice(0, 10)}`;
    const shell = shellPath || this.defaultShell;

    const session: TerminalSession = {
      id: termId,
      workspaceId: wsId,
      name: termName || `Terminal ${this.activeTerminals.size + 1}`,
      shellPath: shell,
      cwd,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    const active: ActiveTerminalProcess = {
      session,
      outputBuffer: [],
      maxBufferBytes: 102400, // 100KB circular buffer per terminal
    };

    this.activeTerminals.set(termId, active);
    this.repo.saveTerminal(session);

    this.eventBus?.emit('ide.terminal.created', {
      terminalId: termId,
      workspaceId: wsId,
      name: session.name,
      timestamp: new Date().toISOString(),
    });

    this.logger?.info(`Created terminal session [${termId}] (${session.name}) in [${cwd}]`);
    return session;
  }

  public createSession(cwd: string, workspaceId = 'default_ws'): TerminalSession {
    return this.createTerminal(workspaceId, cwd);
  }

  public closeSession(terminalId: string): boolean {
    const active = this.activeTerminals.get(terminalId);
    if (!active) return false;
    if (active.child) {
      this.killTerminal(terminalId);
    }
    active.session.status = 'CLOSED';
    this.repo.saveTerminal(active.session);
    this.activeTerminals.delete(terminalId);
    return true;
  }

  public closeTerminal(terminalId: string): boolean {
    return this.closeSession(terminalId);
  }

  public getBuffer(terminalId: string): string {
    return this.getTerminalOutput(terminalId);
  }

  public async executeSync(
    commandLine: string,
    cwd = process.cwd(),
    timeoutMs = 60000
  ): Promise<{ exitCode: number; output: string; durationMs: number }> {
    try {
      this.validateCommandSafety(commandLine);
    } catch (err: any) {
      return {
        exitCode: 1,
        output: `Command rejected: matched dangerous pattern: ${err.message}`,
        durationMs: 0,
      };
    }
    const res = await this.executeCommand(cwd, commandLine, timeoutMs);
    return {
      exitCode: res.exitCode,
      output: (res.stdout + (res.stderr ? '\n' + res.stderr : '')).trim(),
      durationMs: res.durationMs,
    };
  }

  /**
   * Executes a command synchronously with timeout, capturing exit code and output.
   */
  public async executeCommand(
    cwdOrTerminalId: string,
    commandLine: string,
    timeoutMs = 60000,
    terminalId?: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string; output: string; durationMs: number }> {
    this.validateCommandSafety(commandLine);

    let cwd = cwdOrTerminalId;
    let targetTermId = terminalId;

    if (this.activeTerminals.has(cwdOrTerminalId)) {
      targetTermId = cwdOrTerminalId;
      cwd = this.activeTerminals.get(cwdOrTerminalId)!.session.cwd;
    } else if (cwdOrTerminalId.startsWith('term_')) {
      const termSession = this.repo.getTerminal(cwdOrTerminalId);
      if (termSession) {
        targetTermId = cwdOrTerminalId;
        cwd = termSession.cwd;
      }
    }

    const isWin = os.platform() === 'win32';
    const shell = isWin ? 'powershell.exe' : '/bin/bash';
    const args = isWin ? ['-NoProfile', '-NonInteractive', '-Command', commandLine] : ['-c', commandLine];

    const t0 = Date.now();
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(shell, args, {
        cwd,
        env: { ...process.env, CI: 'true', PAGER: 'cat' },
        windowsHide: true,
      });

      if (targetTermId && this.activeTerminals.has(targetTermId)) {
        const active = this.activeTerminals.get(targetTermId)!;
        active.session.pid = child.pid;
        active.child = child;
        active.session.status = 'ACTIVE';
        active.session.lastActiveAt = new Date().toISOString();
        this.repo.saveTerminal(active.session);
      }

      let timer: NodeJS.Timeout | undefined;
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          this.logger?.warn(`Command timed out after ${timeoutMs}ms: ${commandLine}`);
          try {
            if (isWin && child.pid) {
              spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
            } else {
              child.kill('SIGKILL');
            }
          } catch {}
        }, timeoutMs);
      }

      child.stdout?.on('data', (data) => {
        const str = data.toString();
        stdout += str;
        if (targetTermId) this.appendOutput(targetTermId, str);
      });

      child.stderr?.on('data', (data) => {
        const str = data.toString();
        stderr += str;
        if (targetTermId) this.appendOutput(targetTermId, str);
      });

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        const durationMs = Date.now() - t0;
        const exitCode = code ?? (stdout ? 0 : 1);
        const output = (stdout + (stderr ? '\n' + stderr : '')).trim();

        if (targetTermId && this.activeTerminals.has(targetTermId)) {
          const active = this.activeTerminals.get(targetTermId)!;
          active.session.status = 'IDLE';
          active.session.lastActiveAt = new Date().toISOString();
          this.repo.saveTerminal(active.session);
        }

        resolve({ exitCode, stdout, stderr, output, durationMs });
      });

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        const fullErr = (stderr ? stderr + '\n' : '') + err.message;
        resolve({
          exitCode: 1,
          stdout,
          stderr: fullErr,
          output: (stdout + '\n' + fullErr).trim(),
          durationMs: Date.now() - t0,
        });
      });
    });
  }

  /**
   * Retrieves current buffered output for a terminal session.
   */
  public getTerminalOutput(terminalId: string): string {
    const active = this.activeTerminals.get(terminalId);
    if (!active) return '';
    return active.outputBuffer.join('');
  }

  /**
   * Kills an active terminal process.
   */
  public killTerminal(terminalId: string): boolean {
    const active = this.activeTerminals.get(terminalId);
    if (!active || !active.child) return false;

    try {
      if (os.platform() === 'win32' && active.child.pid) {
        spawn('taskkill', ['/pid', String(active.child.pid), '/T', '/F']);
      } else {
        active.child.kill('SIGKILL');
      }
      active.session.status = 'TERMINATED';
      this.repo.saveTerminal(active.session);
      this.logger?.info(`Killed terminal [${terminalId}]`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Appends output chunk to circular buffer and emits real-time event.
   */
  private appendOutput(terminalId: string, chunk: string): void {
    const active = this.activeTerminals.get(terminalId);
    if (!active) return;

    active.outputBuffer.push(chunk);

    // Prune circular buffer if exceeding 100KB
    let currentBytes = active.outputBuffer.reduce((sum, str) => sum + str.length, 0);
    while (currentBytes > active.maxBufferBytes && active.outputBuffer.length > 1) {
      const removed = active.outputBuffer.shift();
      if (removed) currentBytes -= removed.length;
    }
    if (active.outputBuffer.length === 1 && active.outputBuffer[0].length > active.maxBufferBytes) {
      active.outputBuffer[0] = active.outputBuffer[0].slice(-active.maxBufferBytes);
    }

    this.eventBus?.emit('ide.terminal.output', {
      terminalId,
      chunk,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Validates terminal commands against system safety rules.
   */
  public validateCommandSafety(cmd: string): void {
    const lower = cmd.toLowerCase().trim();
    const destructive = [
      'rm -rf /',
      'rm -rf /*',
      'rmdir /s /q c:\\',
      'format c:',
      ':(){ :|:& };:',
      'del /f /s /q c:\\windows',
    ];

    for (const d of destructive) {
      if (lower.includes(d)) {
        throw new Error(`Security Violation: Command contains prohibited destructive pattern: "${d}"`);
      }
    }
  }

  /**
   * Disposes all active terminals on kernel shutdown.
   */
  public shutdown(): void {
    for (const active of this.activeTerminals.values()) {
      if (active.child && !active.child.killed) {
        try {
          if (os.platform() === 'win32' && active.child.pid) {
            spawn('taskkill', ['/pid', String(active.child.pid), '/T', '/F']);
          } else {
            active.child.kill('SIGTERM');
          }
        } catch {}
      }
      active.session.status = 'TERMINATED';
      this.repo.saveTerminal(active.session);
    }
    this.activeTerminals.clear();
    this.logger?.info('Terminal supervisor shutdown complete.');
  }
}
