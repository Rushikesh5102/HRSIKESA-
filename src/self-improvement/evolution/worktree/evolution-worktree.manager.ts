/**
 * HṚṢĪKEŚA (हृषीकेश) — Evolution Worktree & Isolated Workspace Manager
 *
 * Enforces total isolation of autonomous self-development experiments.
 * The trusted running production source tree is strictly protected and NEVER modified directly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ILogger } from '../../../core/logging/logger.types.js';
import { BoundaryGuard } from '../safety/boundary-guard.js';

const execAsync = promisify(exec);

export interface WorktreeDirectories {
  base: string;
  objectives: string;
  experiments: string;
  worktrees: string;
  checkpoints: string;
  benchmarks: string;
  reports: string;
  logs: string;
  rollbacks: string;
}

export interface WorktreeCreationResult {
  worktreePath: string;
  baselineCommit: string;
  isolationMode: 'GIT_WORKTREE' | 'ISOLATED_WORKSPACE';
}

export class EvolutionWorktreeManager {
  private readonly repoRoot: string;
  private readonly dirs: WorktreeDirectories;
  private readonly boundaryGuard: BoundaryGuard;
  private readonly logger?: ILogger;
  private readonly activeWorktrees: Map<string, string> = new Map(); // experimentId -> worktreePath

  constructor(repoRoot: string = process.cwd(), boundaryGuard: BoundaryGuard, logger?: ILogger, customBaseDir?: string) {
    this.repoRoot = path.resolve(repoRoot);
    this.boundaryGuard = boundaryGuard;
    this.logger = typeof logger?.child === 'function' ? logger.child('EvolutionWorktreeManager') : logger;

    const baseDir = customBaseDir ? path.resolve(customBaseDir) : path.join(this.repoRoot, '.hrisekesa', 'evolution');
    this.dirs = {
      base: baseDir,
      objectives: path.join(baseDir, 'objectives'),
      experiments: path.join(baseDir, 'experiments'),
      worktrees: path.join(baseDir, 'worktrees'),
      checkpoints: path.join(baseDir, 'checkpoints'),
      benchmarks: path.join(baseDir, 'benchmarks'),
      reports: path.join(baseDir, 'reports'),
      logs: path.join(baseDir, 'logs'),
      rollbacks: path.join(baseDir, 'rollbacks'),
    };

    this.ensureDirectories();
  }

  public getDirectories(): WorktreeDirectories {
    return this.dirs;
  }

  private ensureDirectories(): void {
    for (const dir of Object.values(this.dirs)) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Retrieves current baseline Git commit SHA from repository.
   */
  public async getBaselineCommit(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.repoRoot });
      return stdout.trim();
    } catch {
      return 'commit_initial_' + Date.now();
    }
  }

  /**
   * Creates an isolated development worktree or isolated workspace for an experiment.
   */
  public async createWorktree(
    objectiveId: string,
    experimentId: string,
    baseCommit?: string
  ): Promise<WorktreeCreationResult> {
    const baseline = baseCommit || (await this.getBaselineCommit());
    const worktreePath = path.join(this.dirs.worktrees, experimentId);
    this.logger?.info(`[${objectiveId}] Creating isolated worktree for experiment ${experimentId} from ${baseline}`);

    if (fs.existsSync(worktreePath)) {
      await this.deleteWorktree(experimentId);
    }

    const branchName = `evo/${experimentId}`;
    let isolationMode: 'GIT_WORKTREE' | 'ISOLATED_WORKSPACE' = 'GIT_WORKTREE';

    try {
      // Try creating genuine Git worktree
      this.logger?.info(`Attempting Git worktree creation for [${experimentId}] at [${worktreePath}]...`);
      await execAsync(`git worktree add -B "${branchName}" "${worktreePath}" HEAD`, {
        cwd: this.repoRoot,
      });
      isolationMode = 'GIT_WORKTREE';
    } catch (err: any) {
      this.logger?.warn(`Git worktree creation returned note: ${err.message}. Falling back to high-fidelity isolated copy-on-write workspace.`);
      // High-fidelity isolated copy fallback
      this.createIsolatedWorkspaceCopy(this.repoRoot, worktreePath);
      isolationMode = 'ISOLATED_WORKSPACE';
    }

    // Ensure node_modules is accessible in isolated worktree for compiler and test runners
    const srcNodeModules = path.join(this.repoRoot, 'node_modules');
    const destNodeModules = path.join(worktreePath, 'node_modules');
    if (fs.existsSync(srcNodeModules) && !fs.existsSync(destNodeModules)) {
      try {
        fs.symlinkSync(srcNodeModules, destNodeModules, 'junction');
      } catch (linkErr: any) {
        this.logger?.warn(`Could not junction node_modules into worktree: ${linkErr.message}`);
      }
    }

    this.activeWorktrees.set(experimentId, worktreePath);
    this.boundaryGuard.registerWorktreeRoot(worktreePath);

    this.logger?.info(`Experiment [${experimentId}] isolated at: [${worktreePath}] (Mode: ${isolationMode})`);
    return {
      worktreePath,
      baselineCommit: baseline,
      isolationMode,
    };
  }

  /**
   * Fallback copy-on-write mirroring source tree while ignoring heavy/unneeded directories.
   */
  private createIsolatedWorkspaceCopy(srcDir: string, destDir: string): void {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const ignored = new Set([
      'node_modules',
      '.git',
      '.hrisekesa',
      'dist',
      'scratch',
      'ui/node_modules',
      'ui/dist',
      '.gemini',
    ]);

    const copyRecursive = (currentSrc: string, currentDest: string) => {
      const entries = fs.readdirSync(currentSrc, { withFileTypes: true });
      for (const ent of entries) {
        if (ignored.has(ent.name)) continue;

        const srcPath = path.join(currentSrc, ent.name);
        const destPath = path.join(currentDest, ent.name);

        if (ent.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyRecursive(srcPath, destPath);
        } else if (ent.isFile()) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyRecursive(srcDir, destDir);
  }

  /**
   * Resets worktree back to baseline commit.
   */
  public async resetWorktree(experimentId: string): Promise<boolean> {
    const worktreePath = this.activeWorktrees.get(experimentId) || path.join(this.dirs.worktrees, experimentId);
    if (!fs.existsSync(worktreePath)) return false;

    try {
      await execAsync('git checkout -- .', { cwd: worktreePath });
      await execAsync('git clean -fd', { cwd: worktreePath });
      this.logger?.info(`Reset worktree [${experimentId}] via Git clean.`);
      return true;
    } catch {
      // Re-copy pristine files if not git-backed
      this.createIsolatedWorkspaceCopy(this.repoRoot, worktreePath);
      this.logger?.info(`Reset worktree [${experimentId}] via isolated workspace restore.`);
      return true;
    }
  }

  /**
   * Deletes and cleans up an experiment worktree.
   */
  public async deleteWorktree(experimentId: string): Promise<boolean> {
    const worktreePath = this.activeWorktrees.get(experimentId) || path.join(this.dirs.worktrees, experimentId);
    this.boundaryGuard.unregisterWorktreeRoot(worktreePath);
    this.activeWorktrees.delete(experimentId);

    if (!fs.existsSync(worktreePath)) return true;

    try {
      await execAsync(`git worktree remove --force "${worktreePath}"`, { cwd: this.repoRoot });
    } catch {
      // Fallback to filesystem removal
    }

    try {
      fs.rmSync(worktreePath, { recursive: true, force: true });
      return true;
    } catch (err: any) {
      this.logger?.warn(`Failed removing worktree directory [${worktreePath}]: ${err.message}`);
      return false;
    }
  }

  /**
   * Computes Git diff of the worktree against baseline or uncommitted working tree.
   */
  public async getDiff(experimentId: string): Promise<string> {
    const worktreePath = this.activeWorktrees.get(experimentId) || path.join(this.dirs.worktrees, experimentId);
    if (!fs.existsSync(worktreePath)) return '';

    try {
      try {
        await execAsync('git add -N .', { cwd: worktreePath });
      } catch {}
      const { stdout } = await execAsync('git diff HEAD', { cwd: worktreePath });
      return stdout;
    } catch {
      return '';
    }
  }

  /**
   * Returns list of changed files inside the worktree relative to baseline.
   */
  public async getChangedFiles(experimentId: string): Promise<string[]> {
    const worktreePath = this.activeWorktrees.get(experimentId) || path.join(this.dirs.worktrees, experimentId);
    if (!fs.existsSync(worktreePath)) return [];

    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: worktreePath });
      return stdout
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => l.slice(3).trim());
    } catch {
      return [];
    }
  }

  public getWorktreePath(experimentId: string): string | undefined {
    return this.activeWorktrees.get(experimentId) || (fs.existsSync(path.join(this.dirs.worktrees, experimentId)) ? path.join(this.dirs.worktrees, experimentId) : undefined);
  }
}
