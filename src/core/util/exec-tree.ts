/**
 * Run a shell command with a timeout that kills the WHOLE process tree.
 *
 * Node's built-in `exec` timeout only kills the shell it spawned. On Windows the real work
 * (e.g. `npx` -> `node` -> `tsc`) keeps running as orphaned grandchildren, holds the parent's
 * stdio open and leaks CPU/RAM. This wrapper uses `taskkill /T /F` on Windows and a
 * process-group kill elsewhere. Error shape mirrors `child_process.exec` (stdout, stderr, code, killed).
 */

import { spawn } from 'node:child_process';

export interface ExecTreeOptions {
  cwd?: string;
  timeout?: number;
  maxBuffer?: number;
}

export interface ExecTreeResult {
  stdout: string;
  stderr: string;
}

export function execWithTreeKill(command: string, options: ExecTreeOptions = {}): Promise<ExecTreeResult> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const maxBuffer = options.maxBuffer ?? 10 * 1024 * 1024;

    const child = spawn(command, {
      cwd: options.cwd,
      shell: true,
      windowsHide: true,
      detached: !isWindows, // own process group on POSIX so the whole group can be signalled
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length < maxBuffer) stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < maxBuffer) stderr += chunk.toString();
    });

    const killTree = (): void => {
      if (!child.pid) return;
      try {
        if (isWindows) {
          spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        } else {
          process.kill(-child.pid, 'SIGKILL');
        }
      } catch {
        try {
          child.kill('SIGKILL');
        } catch {
          // already gone
        }
      }
    };

    const timer =
      options.timeout && options.timeout > 0
        ? setTimeout(() => {
            timedOut = true;
            killTree();
          }, options.timeout)
        : undefined;

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (code === 0 && !timedOut) {
        resolve({ stdout, stderr });
        return;
      }
      const err: Error & { stdout?: string; stderr?: string; code?: number | null; killed?: boolean } = new Error(
        timedOut
          ? `Command timed out after ${options.timeout}ms: ${command}`
          : `Command failed with exit code ${code}: ${command}`
      );
      err.stdout = stdout;
      err.stderr = stderr;
      err.code = code;
      err.killed = timedOut;
      reject(err);
    });
  });
}
