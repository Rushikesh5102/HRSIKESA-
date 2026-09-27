/**
 * HṚṢĪKEŚA (हृषीकेश) — Git Workspace & Source Control Subsystem
 *
 * FP-09: Git working-tree inspection, branch management, status tracking,
 * diff generation, and commit creation with audit provenance.
 */

import { TerminalManager } from '../terminal/terminal.manager.js';
import { WorkspaceMetadata } from '../types/ide.types.js';

export interface GitFileStatus {
  path: string;
  status: 'MODIFIED' | 'ADDED' | 'DELETED' | 'UNTRACKED' | 'RENAMED';
  staged: boolean;
}

export interface GitWorkingTreeStatus {
  branch: string;
  isClean: boolean;
  files: GitFileStatus[];
  aheadCount: number;
  behindCount: number;
  latestCommitSha?: string;
  latestCommitMsg?: string;
}

export class GitWorkspaceManager {
  private readonly terminalManager: TerminalManager;

  constructor(terminalManager: TerminalManager) {
    this.terminalManager = terminalManager;
  }

  /**
   * Retrieves complete working-tree Git status.
   */
  public async getStatus(workspace?: WorkspaceMetadata): Promise<GitWorkingTreeStatus & { staged: string[]; modified: string[]; untracked: string[] }> {
    const cwd = workspace?.rootPath || process.cwd();

    // Check if git is initialized
    const branchRes = await this.terminalManager.executeCommand(cwd, 'git rev-parse --abbrev-ref HEAD', 5000);
    if (branchRes.exitCode !== 0) {
      return {
        branch: 'none',
        isClean: true,
        files: [],
        staged: [],
        modified: [],
        untracked: [],
        aheadCount: 0,
        behindCount: 0,
      };
    }

    const branch = branchRes.stdout.trim() || 'main';

    // Get porcelain status
    const statusRes = await this.terminalManager.executeCommand(cwd, 'git status --porcelain', 5000);
    const lines = statusRes.stdout.split('\n').filter((l) => l.trim().length > 0);

    const files: GitFileStatus[] = [];
    for (const l of lines) {
      const code = l.slice(0, 2);
      const filePath = l.slice(3).trim();

      let status: GitFileStatus['status'] = 'MODIFIED';
      if (code.includes('?')) status = 'UNTRACKED';
      else if (code.includes('A')) status = 'ADDED';
      else if (code.includes('D')) status = 'DELETED';
      else if (code.includes('R')) status = 'RENAMED';

      const staged = code[0] !== ' ' && code[0] !== '?';

      files.push({
        path: filePath,
        status,
        staged,
      });
    }

    // Get latest commit
    const logRes = await this.terminalManager.executeCommand(cwd, 'git log -1 --format="%h|%s"', 5000);
    let latestCommitSha: string | undefined;
    let latestCommitMsg: string | undefined;

    if (logRes.exitCode === 0 && logRes.stdout.trim()) {
      const parts = logRes.stdout.trim().split('|');
      latestCommitSha = parts[0]?.replace(/"/g, '');
      latestCommitMsg = parts[1]?.replace(/"/g, '');
    }

    return {
      branch,
      isClean: files.length === 0,
      files,
      staged: files.filter((f) => f.staged).map((f) => f.path),
      modified: files.filter((f) => !f.staged && f.status === 'MODIFIED').map((f) => f.path),
      untracked: files.filter((f) => f.status === 'UNTRACKED').map((f) => f.path),
      aheadCount: 0,
      behindCount: 0,
      latestCommitSha,
      latestCommitMsg,
    };
  }

  /**
   * Generates git diff for the workspace or specific file.
   */
  public async getDiff(workspace: WorkspaceMetadata, filePath?: string): Promise<string> {
    const cwd = workspace.rootPath;
    const cmd = filePath ? `git diff -- "${filePath}"` : 'git diff';
    const res = await this.terminalManager.executeCommand(cwd, cmd, 10000);
    return res.stdout;
  }

  /**
   * Stages files in git index.
   */
  public async stageFiles(workspace: WorkspaceMetadata, filePaths: string[]): Promise<boolean> {
    const cwd = workspace.rootPath;
    const filesStr = filePaths.map((f) => `"${f}"`).join(' ');
    const res = await this.terminalManager.executeCommand(cwd, `git add ${filesStr}`, 10000);
    return res.exitCode === 0;
  }

  /**
   * Creates a Git commit.
   */
  public async commit(workspace: WorkspaceMetadata, message: string): Promise<{ success: boolean; commitSha?: string; output: string }> {
    const cwd = workspace.rootPath;
    const sanitizedMsg = message.replace(/"/g, '\\"');
    const res = await this.terminalManager.executeCommand(cwd, `git commit -m "${sanitizedMsg}"`, 10000);

    const match = res.stdout.match(/\[(?:.+)\s+([a-f0-9]+)\]/i);
    const commitSha = match ? match[1] : undefined;

    return {
      success: res.exitCode === 0,
      commitSha,
      output: res.stdout + res.stderr,
    };
  }
}
