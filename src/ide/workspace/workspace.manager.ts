/**
 * HṚṢĪKEŚA (हृषीकेश) — Workspace Manager & Architecture Engine
 *
 * FP-09: Multi-root workspace lifecycle, architecture classification,
 * entrypoint detection, dependency analysis, and file tree navigation.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';
import {
  WorkspaceMetadata,
  ProjectArchitecture,
  ProjectFramework,
  FileNode,
} from '../types/ide.types.js';
import { IdeRepository } from '../repository/ide.repository.js';

export class WorkspaceManager {
  private readonly repo: IdeRepository;
  private readonly eventBus?: EventBus;
  private readonly logger?: ILogger;
  private activeWorkspaceId?: string;

  constructor(repo: IdeRepository, eventBus?: EventBus, logger?: ILogger) {
    this.repo = repo;
    this.eventBus = eventBus;
    this.logger = logger?.child('WorkspaceManager');
  }

  /**
   * Opens or creates a workspace for the given directory path.
   */
  public async openWorkspace(rootPath: string, options?: { name?: string; companyId?: string; projectId?: string }): Promise<WorkspaceMetadata> {
    const resolvedPath = path.resolve(rootPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Workspace path does not exist: ${resolvedPath}`);
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      throw new Error(`Workspace path is not a directory: ${resolvedPath}`);
    }

    // Check if workspace already registered
    let existing = this.repo.getWorkspaceByPath(resolvedPath);
    const arch = this.detectArchitecture(resolvedPath);

    if (existing) {
      if (options?.name) existing.name = options.name;
      existing.lastAccessedAt = new Date().toISOString();
      existing.architecture = arch.framework;
      existing.framework = arch.framework;
      existing.packageManager = arch.packageManager;
      if (options?.companyId) existing.companyId = options.companyId;
      if (options?.projectId) existing.projectId = options.projectId;

      (existing as any).architecture = {
        framework: arch.framework,
        language: arch.language || 'TypeScript',
        packageManager: arch.packageManager,
        entryPoints: arch.entryPoints,
      };

      this.repo.saveWorkspace(existing);
      this.activeWorkspaceId = existing.id;
      return existing;
    }

    const wsName = options?.name || path.basename(resolvedPath) || 'workspace';
    const workspace: WorkspaceMetadata = {
      id: `ws_${crypto.randomUUID().slice(0, 12)}`,
      name: wsName,
      rootPath: resolvedPath,
      companyId: options?.companyId,
      projectId: options?.projectId,
      architecture: arch.framework,
      framework: arch.framework,
      packageManager: arch.packageManager,
      settings: {},
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    (workspace as any).architecture = {
      framework: arch.framework,
      language: arch.language || 'TypeScript',
      packageManager: arch.packageManager,
      entryPoints: arch.entryPoints,
    };

    this.repo.saveWorkspace(workspace);
    this.activeWorkspaceId = workspace.id;

    this.eventBus?.emit('ide.workspace.opened', {
      workspaceId: workspace.id,
      rootPath: workspace.rootPath,
      architecture: workspace.architecture,
      timestamp: new Date().toISOString(),
    });

    this.logger?.info(`Opened workspace [${workspace.name}] at [${workspace.rootPath}] (${workspace.architecture})`);
    return workspace;
  }

  /**
   * Retrieves active workspace metadata.
   */
  public getActiveWorkspace(): WorkspaceMetadata | undefined {
    if (!this.activeWorkspaceId) return undefined;
    return this.repo.getWorkspace(this.activeWorkspaceId);
  }

  /**
   * Sets the active workspace by ID.
   */
  public setActiveWorkspace(id: string): void {
    const ws = this.repo.getWorkspace(id);
    if (!ws) throw new Error(`Workspace with ID ${id} not found.`);
    this.activeWorkspaceId = id;
    ws.lastAccessedAt = new Date().toISOString();
    this.repo.saveWorkspace(ws);
  }

  /**
   * Validates that a file path is safely contained within the active workspace root.
   */
  public resolveSafePath(workspaceOrSubPath: WorkspaceMetadata | string, maybeSubPath?: string): string {
    let ws: WorkspaceMetadata;
    let subPath: string;

    if (typeof workspaceOrSubPath === 'string') {
      ws = this.getActiveWorkspace() || { id: 'default_ws', name: 'Default', rootPath: process.cwd(), architecture: 'custom', settings: {}, createdAt: '', lastAccessedAt: '' };
      subPath = workspaceOrSubPath;
    } else {
      ws = workspaceOrSubPath;
      subPath = maybeSubPath || '';
    }

    const fullPath = path.resolve(ws.rootPath, subPath);
    const normalizedRoot = path.normalize(ws.rootPath).toLowerCase();
    const normalizedPath = path.normalize(fullPath).toLowerCase();

    const rel = path.relative(normalizedRoot, normalizedPath);
    if (rel.startsWith('..') || (path.isAbsolute(rel) && !normalizedPath.startsWith(normalizedRoot))) {
      throw new Error(`Security Violation: Path traversal detected. Path [${subPath}] traverses outside workspace root [${ws.rootPath}]`);
    }
    return fullPath;
  }

  /**
   * Deep architecture and framework analysis for a project root directory.
   */
  public detectArchitecture(rootPath: string): ProjectArchitecture {
    const pkgJsonPath = path.join(rootPath, 'package.json');
    const cargoTomlPath = path.join(rootPath, 'Cargo.toml');
    const reqTxtPath = path.join(rootPath, 'requirements.txt');
    const pyprojectPath = path.join(rootPath, 'pyproject.toml');
    const goModPath = path.join(rootPath, 'go.mod');
    const indexHtmlPath = path.join(rootPath, 'index.html');
    const gitDir = path.join(rootPath, '.git');
    const dockerfile = path.join(rootPath, 'Dockerfile');

    let framework: ProjectFramework = 'GENERIC';
    let packageManager: ProjectArchitecture['packageManager'] = 'none';
    let manifestPath: string | undefined;
    let scripts: Record<string, string> = {};
    let dependencies: string[] = [];
    let devDependencies: string[] = [];
    const entryPoints: string[] = [];

    if (fs.existsSync(pkgJsonPath)) {
      manifestPath = pkgJsonPath;
      packageManager = fs.existsSync(path.join(rootPath, 'pnpm-lock.yaml'))
        ? 'pnpm'
        : fs.existsSync(path.join(rootPath, 'yarn.lock'))
        ? 'yarn'
        : 'npm';

      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        scripts = pkg.scripts || {};
        dependencies = Object.keys(pkg.dependencies || {});
        devDependencies = Object.keys(pkg.devDependencies || {});

        if (pkg.main) entryPoints.push(pkg.main);
        if (pkg.module) entryPoints.push(pkg.module);

        // Detect frameworks
        if (dependencies.includes('next') || devDependencies.includes('next')) {
          framework = 'Next.js';
        } else if (dependencies.includes('vite') || devDependencies.includes('vite') || fs.existsSync(path.join(rootPath, 'vite.config.ts')) || fs.existsSync(path.join(rootPath, 'vite.config.js'))) {
          framework = 'Vite';
        } else if (dependencies.includes('react') || devDependencies.includes('react')) {
          framework = 'React';
        } else if (dependencies.includes('express')) {
          framework = 'Express';
        } else if (devDependencies.includes('typescript') || fs.existsSync(path.join(rootPath, 'tsconfig.json'))) {
          framework = 'TypeScript';
        } else {
          framework = 'Node.js';
        }
      } catch {}
    } else if (fs.existsSync(cargoTomlPath)) {
      manifestPath = cargoTomlPath;
      packageManager = 'cargo';
      framework = 'RUST';
      entryPoints.push('src/main.rs', 'src/lib.rs');
    } else if (fs.existsSync(reqTxtPath) || fs.existsSync(pyprojectPath)) {
      manifestPath = fs.existsSync(pyprojectPath) ? pyprojectPath : reqTxtPath;
      packageManager = 'pip';
      framework = 'PYTHON';
      entryPoints.push('main.py', 'app.py');
    } else if (fs.existsSync(goModPath)) {
      manifestPath = goModPath;
      packageManager = 'go';
      framework = 'GO';
      entryPoints.push('main.go');
    } else if (fs.existsSync(indexHtmlPath)) {
      framework = 'HTML_STATIC';
      entryPoints.push('index.html');
    }

    // Common standard entry points check
    const candidateEntries = ['src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js', 'index.js', 'index.ts'];
    for (const c of candidateEntries) {
      if (fs.existsSync(path.join(rootPath, c)) && !entryPoints.includes(c)) {
        entryPoints.push(c);
      }
    }

    const hasTs = fs.existsSync(path.join(rootPath, 'tsconfig.json')) ||
      fs.existsSync(path.join(rootPath, 'vite.config.ts')) ||
      fs.existsSync(path.join(rootPath, 'src/index.ts')) ||
      devDependencies.includes('typescript');

    return {
      framework,
      language: hasTs ? 'TypeScript' : 'JavaScript',
      packageManager,
      entryPoints,
      manifestPath,
      scripts,
      dependencies,
      devDependencies,
      buildCommand: scripts.build,
      testCommand: scripts.test,
      devCommand: scripts.dev || scripts.start,
      hasGit: fs.existsSync(gitDir),
      hasDocker: fs.existsSync(dockerfile),
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a recursive file tree structure for workspace navigation.
   */
  public getFileTree(workspace: WorkspaceMetadata | string, subDirOrDepth: string | number = '', maxDepth = 4): FileNode[] {
    let rootPath: string;
    let subDir = '';
    let actualMaxDepth = maxDepth;

    if (typeof workspace === 'string') {
      rootPath = path.resolve(workspace);
    } else {
      rootPath = workspace.rootPath;
    }

    if (typeof subDirOrDepth === 'number') {
      actualMaxDepth = subDirOrDepth;
      subDir = '';
    } else if (typeof subDirOrDepth === 'string') {
      subDir = subDirOrDepth;
    }

    const targetDir = subDir ? path.resolve(rootPath, subDir) : rootPath;
    if (!fs.existsSync(targetDir)) return [];

    const defaultIgnores = new Set([
      'node_modules',
      '.git',
      'dist',
      'build',
      '.gemini',
      '.antigravity',
      'coverage',
      '.turbo',
      '.cache',
    ]);

    const buildTree = (currentDir: string, currentDepth: number): FileNode[] => {
      if (currentDepth > actualMaxDepth) return [];
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return [];
      }

      const nodes: FileNode[] = [];
      for (const ent of entries) {
        if (defaultIgnores.has(ent.name)) continue;

        const fullPath = path.join(currentDir, ent.name);
        const relPath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
        const isDir = ent.isDirectory();

        let sizeBytes = 0;
        let lastMod = new Date().toISOString();
        try {
          const st = fs.statSync(fullPath);
          sizeBytes = st.size;
          lastMod = st.mtime.toISOString();
        } catch {}

        const node: FileNode = {
          path: fullPath,
          relativePath: relPath,
          name: ent.name,
          type: isDir ? 'directory' : 'file',
          sizeBytes: isDir ? 0 : sizeBytes,
          lastModified: lastMod,
          extension: isDir ? undefined : path.extname(ent.name),
        };

        if (isDir) {
          node.children = buildTree(fullPath, currentDepth + 1);
        }

        nodes.push(node);
      }

      // Sort directories first, then alphabetically
      return nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    };

    return buildTree(targetDir, 1);
  }
}
