/**
 * HṚṢĪKEŚA (हृषीकेश) — Test Discovery & Execution Engine
 *
 * FP-10: Automated test framework detection, targeted test script resolution,
 * and test execution supervision.
 */

import fs from 'node:fs';
import path from 'node:path';
import { TerminalManager } from '../../ide/terminal/terminal.manager.js';
import { WorkspaceMetadata } from '../../ide/types/ide.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface TestExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  output: string;
  durationMs: number;
  passed: boolean;
  rawOutput: string;
}

export class TestDiscoveryEngine {
  private readonly terminalManager: TerminalManager;
  private readonly logger?: ILogger;

  constructor(terminalManager: TerminalManager, logger?: ILogger) {
    this.terminalManager = terminalManager;
    this.logger = logger?.child('TestDiscoveryEngine');
  }

  public discoverTestRunner(workspace: WorkspaceMetadata): { framework: string; command: string } {
    const rootPath = workspace.rootPath;
    const pkgJsonPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if (pkg.scripts?.test) {
          return { framework: 'npm', command: 'npm test' };
        }
      } catch {}
    }
    if (fs.existsSync(path.join(rootPath, 'pytest.ini')) || fs.existsSync(path.join(rootPath, 'pyproject.toml'))) {
      return { framework: 'pytest', command: 'pytest' };
    }
    if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) {
      return { framework: 'cargo', command: 'cargo test' };
    }
    if (fs.existsSync(path.join(rootPath, 'go.mod'))) {
      return { framework: 'go', command: 'go test ./...' };
    }
    return { framework: 'node', command: 'node --test' };
  }

  /**
   * Resolves the primary test command for the workspace.
   */
  public resolveTestCommand(workspace: WorkspaceMetadata, explicitCommand?: string): string {
    if (explicitCommand) return explicitCommand;

    const rootPath = workspace.rootPath;
    const pkgJsonPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if (pkg.scripts?.test) {
          // If script directly invokes node or npx, run directly for fast, deterministic execution
          const script = pkg.scripts.test.trim();
          if (script.startsWith('node ') || script.startsWith('npx ')) {
            return script;
          }
          return 'npm test';
        }
      } catch {}
    }

    if (fs.existsSync(path.join(rootPath, 'test.js'))) {
      return 'node test.js';
    }
    if (fs.existsSync(path.join(rootPath, 'test.ts'))) {
      return 'npx tsx test.ts';
    }

    if (fs.existsSync(path.join(rootPath, 'pytest.ini')) || fs.existsSync(path.join(rootPath, 'pyproject.toml'))) {
      return 'pytest';
    }

    if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) {
      return 'cargo test';
    }

    if (fs.existsSync(path.join(rootPath, 'go.mod'))) {
      return 'go test ./...';
    }

    // Default fallback
    return 'node --test';
  }

  /**
   * Discovers test files relevant to modified source files.
   */
  public findRelatedTests(workspace: WorkspaceMetadata, sourceFiles: string[]): string[] {
    const rootPath = workspace.rootPath;
    const relatedTests: string[] = [];

    for (const src of sourceFiles) {
      const baseName = path.basename(src, path.extname(src));
      const candidates = [
        path.join(rootPath, 'tests', `${baseName}.test.ts`),
        path.join(rootPath, 'tests', `${baseName}.test.js`),
        path.join(rootPath, 'tests', `test_${baseName}.py`),
        path.join(rootPath, path.dirname(src), `${baseName}.test.ts`),
        path.join(rootPath, path.dirname(src), `${baseName}.spec.ts`),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && !relatedTests.includes(candidate)) {
          relatedTests.push(path.relative(rootPath, candidate).replace(/\\/g, '/'));
        }
      }
    }

    return relatedTests;
  }

  /**
   * Executes tests in the workspace with safety checks and timeout.
   */
  public async runTests(
    workspace: WorkspaceMetadata,
    command?: string,
    timeoutMs = 60000
  ): Promise<TestExecutionResult> {
    const testCmd = this.resolveTestCommand(workspace, command);
    this.logger?.info(`Executing tests in [${workspace.rootPath}]: ${testCmd}`);

    const res = await this.terminalManager.executeCommand(workspace.rootPath, testCmd, timeoutMs);
    const passed = res.exitCode === 0;
    const rawOutput = (res.stdout + (res.stderr ? '\n' + res.stderr : '')).trim();

    return {
      command: testCmd,
      exitCode: res.exitCode,
      stdout: res.stdout,
      stderr: res.stderr,
      output: rawOutput,
      durationMs: res.durationMs,
      passed,
      rawOutput,
    };
  }
}
