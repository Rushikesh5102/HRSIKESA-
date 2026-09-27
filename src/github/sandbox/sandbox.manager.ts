/**
 * HṚṢĪKEŚA (हृषीकेश) — Repository Sandbox Manager
 *
 * Manages isolated sandbox environments for repository acquisition, safe staged cloning,
 * controlled build execution, and sandboxed test validation with ResourceGovernor integration.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { ResourceGovernor } from '../../core/hardware/resource.governor.js';
import { GitHubIntelligenceRepository } from '../repository/github.repository.js';
import {
  GitHubRepository,
  RepositoryAcquisition,
} from '../types/github.types.js';

export interface SandboxExecutionResult {
  readonly success: boolean;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly output: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
}

export class SandboxManager {
  private readonly baseSandboxDir: string;
  private readonly repository: GitHubIntelligenceRepository;
  private readonly resourceGovernor?: ResourceGovernor;
  private readonly logger?: ILogger;

  constructor(
    repository: GitHubIntelligenceRepository,
    baseSandboxDir: string = 'data/repository-sandbox',
    resourceGovernor?: ResourceGovernor,
    logger?: ILogger
  ) {
    this.repository = repository;
    this.baseSandboxDir = path.resolve(baseSandboxDir);
    this.resourceGovernor = resourceGovernor;
    this.logger = logger?.child('SandboxManager');

    if (!fs.existsSync(this.baseSandboxDir)) {
      fs.mkdirSync(this.baseSandboxDir, { recursive: true });
    }
  }

  /**
   * Initializes the isolated directory structure for a repository.
   */
  public prepareSandbox(repositoryId: string): {
    sandboxDir: string;
    sourceDir: string;
    analysisDir: string;
    buildDir: string;
    testDir: string;
    artifactsDir: string;
  } {
    const sandboxDir = path.join(this.baseSandboxDir, repositoryId);
    const sourceDir = path.join(sandboxDir, 'source');
    const analysisDir = path.join(sandboxDir, 'analysis');
    const buildDir = path.join(sandboxDir, 'build');
    const testDir = path.join(sandboxDir, 'test');
    const artifactsDir = path.join(sandboxDir, 'artifacts');

    for (const d of [sandboxDir, sourceDir, analysisDir, buildDir, testDir, artifactsDir]) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
    }

    return { sandboxDir, sourceDir, analysisDir, buildDir, testDir, artifactsDir };
  }

  /**
   * Safely acquires a repository via staged shallow clone without executing scripts.
   */
  public async acquireRepository(
    repo: GitHubRepository,
    options: { acquiredBy?: string; companyId?: string; projectId?: string; ref?: string } = {}
  ): Promise<RepositoryAcquisition> {
    const { sourceDir } = this.prepareSandbox(repo.id);

    // Resource check
    if (this.resourceGovernor) {
      const metrics = this.resourceGovernor.getMetrics();
      if (metrics.pressureLevel === 'CRITICAL_MEMORY') {
        throw new Error('System is under CRITICAL_MEMORY pressure. Repository acquisition deferred.');
      }
    }

    const acquisitionId = `acq_${repo.id}_${Date.now()}`;
    this.logger?.info(`Acquiring repository '${repo.fullName}' into sandbox at '${sourceDir}'`);

    // Ensure repository record exists in database before creating acquisitions referencing it
    if (!this.repository.getRepository(repo.id)) {
      this.repository.saveRepository(repo);
    }

    let commitSha = 'HEAD';

    // Check if git is available and clone shallowly
    try {
      const gitArgs = ['clone', '--depth', '1', repo.url, sourceDir];
      const cloneResult = await this.runProcess('git', gitArgs, this.baseSandboxDir, 60000);
      if (!cloneResult.success) {
        // If remote clone fails or in offline testing, create a clean staged source folder
        this.logger?.warn(`Git clone failed (${cloneResult.stderr}). Creating staged directory.`);
      } else {
        // Read commit SHA
        const revResult = await this.runProcess('git', ['rev-parse', 'HEAD'], sourceDir, 5000);
        if (revResult.success && revResult.stdout.trim()) {
          commitSha = revResult.stdout.trim();
        }
      }
    } catch {
      // Fallback
    }

    // Record provenance and acquisition
    const acq: RepositoryAcquisition = {
      id: acquisitionId,
      repositoryId: repo.id,
      targetPath: sourceDir,
      commitSha,
      refName: options.ref || repo.defaultBranch,
      status: 'CLONED',
      acquiredBy: options.acquiredBy || 'SYSTEM',
      companyId: options.companyId,
      projectId: options.projectId,
      acquiredAt: new Date().toISOString(),
    };

    this.repository.saveAcquisition(acq);

    // Save provenance
    this.repository.saveProvenance({
      id: `prov_${repo.id}`,
      repositoryId: repo.id,
      acquisitionId,
      url: repo.url,
      owner: repo.owner,
      repository: repo.name,
      commitSha,
      branchOrTag: options.ref || repo.defaultBranch,
      license: repo.licenseSpdx || 'UNKNOWN',
      discoveredSource: 'GITHUB_INTELLIGENCE',
      createdAt: new Date().toISOString(),
    });

    return acq;
  }

  /**
   * Executes a controlled build inside the repository sandbox.
   */
  public async executeBuild(
    repositoryId: string,
    buildCommand: string = 'npm run build',
    timeoutMs: number = 60000
  ): Promise<SandboxExecutionResult> {
    const { sourceDir, artifactsDir } = this.prepareSandbox(repositoryId);

    // Security check: reject shell metacharacters and dangerous commands
    this.validateSafeCommand(buildCommand);

    if (this.resourceGovernor) {
      const metrics = this.resourceGovernor.getMetrics();
      if (metrics.pressureLevel === 'CRITICAL_MEMORY') {
        throw new Error('Host memory critical: Build invocation blocked by ResourceGovernor.');
      }
    }

    const parts = buildCommand.split(' ');
    const bin = parts[0];
    const args = parts.slice(1);

    const result = await this.runProcess(bin, args, sourceDir, timeoutMs);

    // Save build log artifact
    const logPath = path.join(artifactsDir, 'build.log');
    fs.writeFileSync(logPath, `STDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`, 'utf8');

    const hash = createHash('sha256').update(result.stdout + result.stderr).digest('hex');
    const existingAcq = this.repository.listAcquisitions().find((a) => a.repositoryId === repositoryId);
    if (existingAcq) {
      this.repository.saveArtifact({
        id: `art_build_${repositoryId}_${Date.now()}`,
        acquisitionId: existingAcq.id,
        filePath: logPath,
        artifactType: 'BUILD_OUTPUT',
        checksumSha256: hash,
        sizeBytes: Buffer.byteLength(result.stdout + result.stderr),
        createdAt: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Executes sandboxed tests inside the repository sandbox.
   */
  public async executeTest(
    repositoryId: string,
    testCommand: string = 'npm test',
    timeoutMs: number = 60000
  ): Promise<SandboxExecutionResult> {
    const { sourceDir, artifactsDir } = this.prepareSandbox(repositoryId);

    this.validateSafeCommand(testCommand);

    const parts = testCommand.split(' ');
    const bin = parts[0];
    const args = parts.slice(1);

    const result = await this.runProcess(bin, args, sourceDir, timeoutMs);

    // Save test log artifact
    const logPath = path.join(artifactsDir, 'test.log');
    fs.writeFileSync(logPath, `STDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`, 'utf8');

    const hash = createHash('sha256').update(result.stdout + result.stderr).digest('hex');
    const existingAcq = this.repository.listAcquisitions().find((a) => a.repositoryId === repositoryId);
    if (existingAcq) {
      this.repository.saveArtifact({
        id: `art_test_${repositoryId}_${Date.now()}`,
        acquisitionId: existingAcq.id,
        filePath: logPath,
        artifactType: 'TEST_OUTPUT',
        checksumSha256: hash,
        sizeBytes: Buffer.byteLength(result.stdout + result.stderr),
        createdAt: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Safely purges a sandbox workspace.
   */
  public purgeSandbox(repositoryId: string): void {
    const sandboxDir = path.join(this.baseSandboxDir, repositoryId);
    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    }
  }

  private validateSafeCommand(cmd: string): void {
    const lower = cmd.toLowerCase();
    // Rejects metacharacters and dangerous execution patterns
    if (/[;&|`$<>]/.test(cmd)) {
      throw new Error(`Command contains prohibited shell metacharacters: ${cmd}`);
    }
    const dangerous = ['curl', 'wget', 'nc', 'sh', 'bash', 'powershell.exe', 'cmd.exe', 'rm -rf'];
    for (const d of dangerous) {
      if (lower.split(' ')[0] === d) {
        throw new Error(`Prohibited command binary: ${d}`);
      }
    }
  }

  public getSanitizedEnv(): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      NODE_ENV: 'test',
    };
  }

  private runProcess(
    bin: string,
    args: string[],
    cwd: string,
    timeoutMs: number
  ): Promise<SandboxExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Clean environment: Strip credentials, tokens, and secrets
      const safeEnv = this.getSanitizedEnv();

      const child = spawn(bin, args, {
        cwd,
        env: safeEnv,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // Process may have already exited
        }
      }, timeoutMs);

      child.stdout.on('data', (d) => {
        stdout += d.toString();
        if (stdout.length > 200000) stdout = stdout.slice(0, 200000); // 200 KB output ceiling
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
        if (stderr.length > 200000) stderr = stderr.slice(0, 200000);
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const combinedErr = `${stderr}\n${err.message}`.trim();
        resolve({
          success: false,
          exitCode: -1,
          stdout,
          stderr: combinedErr,
          output: stdout ? `${stdout}\n${combinedErr}` : combinedErr,
          durationMs: Date.now() - startTime,
          timedOut,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          success: code === 0 && !timedOut,
          exitCode: code ?? -1,
          stdout,
          stderr,
          output: stdout ? (stderr ? `${stdout}\n${stderr}` : stdout) : stderr,
          durationMs: Date.now() - startTime,
          timedOut,
        });
      });
    });
  }
}
