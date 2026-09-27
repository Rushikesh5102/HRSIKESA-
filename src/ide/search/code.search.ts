/**
 * HṚṢĪKEŚA (हृषीकेश) — Code Search & Intelligence Engine
 *
 * FP-09: Ripgrep-style text & regex search, file path search, and code symbol extraction.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  WorkspaceMetadata,
  SearchQuery,
  SearchMatch,
  CodeSymbol,
  SymbolKind,
} from '../types/ide.types.js';
import type { WorkspaceManager } from '../workspace/workspace.manager.js';

export class CodeSearchEngine {
  private readonly workspaceManager?: WorkspaceManager;

  constructor(workspaceManager?: WorkspaceManager) {
    this.workspaceManager = workspaceManager;
  }

  private readonly defaultExcludes = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.gemini/**',
    '**/*.log',
    '**/*.db',
    '**/*.sqlite',
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.ico',
    '**/*.woff',
    '**/*.woff2',
    '**/*.ttf',
    '**/*.eot',
    '**/*.zip',
    '**/*.tar.gz',
  ];

  public async search(options: SearchQuery, workspace?: WorkspaceMetadata): Promise<{ matches: SearchMatch[]; totalFiles: number }> {
    const ws: WorkspaceMetadata = workspace || this.workspaceManager?.getActiveWorkspace() || {
      id: 'default_ws',
      name: 'Default Workspace',
      rootPath: process.cwd(),
      architecture: 'custom',
      settings: {},
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    const matches = this.searchWorkspace(ws, options);
    const files = new Set(matches.map((m) => m.file));
    return { matches, totalFiles: files.size };
  }

  /**
   * Searches text or regex patterns across the workspace files.
   */
  public searchWorkspace(workspace: WorkspaceMetadata, options: SearchQuery): SearchMatch[] {
    const maxResults = options.maxResults || 100;
    const matches: SearchMatch[] = [];

    let regex: RegExp;
    try {
      const flags = options.caseSensitive ? 'g' : 'gi';
      regex = options.isRegex
        ? new RegExp(options.query, flags)
        : new RegExp(this.escapeRegex(options.query), flags);
    } catch (e: any) {
      throw new Error(`Invalid search expression: ${e.message}`);
    }

    const scanDir = (dir: string): void => {
      if (matches.length >= maxResults) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const ent of entries) {
        if (matches.length >= maxResults) return;

        const fullPath = path.join(dir, ent.name);
        const relPath = path.relative(workspace.rootPath, fullPath).replace(/\\/g, '/');

        if (this.isExcluded(relPath, options.excludes)) continue;

        if (ent.isDirectory()) {
          scanDir(fullPath);
        } else if (ent.isFile() && this.isTextFile(fullPath)) {
          this.searchFile(fullPath, relPath, regex, matches, maxResults);
        }
      }
    };

    scanDir(workspace.rootPath);
    return matches;
  }

  /**
   * Fast file path search matching file names by substring or query.
   */
  public findFiles(workspace: WorkspaceMetadata, query: string, limit = 50): string[] {
    const results: string[] = [];
    const lowerQuery = query.toLowerCase();

    const scanDir = (dir: string): void => {
      if (results.length >= limit) return;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const ent of entries) {
        if (results.length >= limit) return;
        const fullPath = path.join(dir, ent.name);
        const relPath = path.relative(workspace.rootPath, fullPath).replace(/\\/g, '/');

        if (this.isExcluded(relPath)) continue;

        if (ent.isDirectory()) {
          scanDir(fullPath);
        } else if (ent.isFile()) {
          if (!query || relPath.toLowerCase().includes(lowerQuery) || ent.name.toLowerCase().includes(lowerQuery)) {
            results.push(relPath);
          }
        }
      }
    };

    scanDir(workspace.rootPath);
    return results;
  }

  /**
   * Extracts structural code symbols (classes, functions, interfaces, methods, exports).
   */
  public extractSymbols(filePath: string, fileContent?: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const content = fileContent ?? (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '');
    if (!content) return symbols;

    const lines = content.split('\n');

    // Regex definitions for common languages
    const patterns: Array<{ regex: RegExp; kind: SymbolKind }> = [
      { regex: /^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z0-9_$]+)/, kind: 'class' },
      { regex: /^\s*(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/, kind: 'interface' },
      { regex: /^\s*(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=/, kind: 'type' },
      { regex: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/, kind: 'function' },
      { regex: /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*[:{]/, kind: 'method' },
      { regex: /^\s*(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/, kind: 'function' },
      { regex: /^\s*(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*/, kind: 'constant' },
      { regex: /^\s*def\s+([A-Za-z0-9_]+)\s*\(/, kind: 'function' }, // Python
      { regex: /^\s*fn\s+([A-Za-z0-9_]+)\s*\(/, kind: 'function' }, // Rust
      { regex: /^\s*func\s+([A-Za-z0-9_]+)\s*\(/, kind: 'function' }, // Go
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { regex, kind } of patterns) {
        const match = line.match(regex);
        if (match && match[1]) {
          const symbolName = match[1];
          // Exclude language reserved keywords
          if (['if', 'else', 'for', 'while', 'switch', 'catch'].includes(symbolName)) continue;

          symbols.push({
            name: symbolName,
            kind,
            line: i + 1,
            file: filePath,
            detail: line.trim().slice(0, 100),
          });
          break;
        }
      }
    }

    return symbols;
  }

  private searchFile(fullPath: string, relPath: string, regex: RegExp, matches: SearchMatch[], maxResults: number): void {
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      return;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= maxResults) break;
      const line = lines[i];
      regex.lastIndex = 0;
      if (regex.test(line)) {
        matches.push({
          file: relPath,
          fullPath,
          relativePath: relPath,
          lineNumber: i + 1,
          line: i + 1,
          lineContent: line.trimEnd(),
          content: line.trimEnd(),
        } as any);
      }
    }
  }

  private isTextFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const textExts = new Set([
      '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css',
      '.scss', '.yaml', '.yml', '.toml', '.txt', '.py', '.rs', '.go',
      '.c', '.cpp', '.h', '.hpp', '.java', '.sh', '.ps1', '.bat', '.env',
      '.sql', '.xml', '.svg', '.gitignore', '.hrisignore',
    ]);
    return textExts.has(ext) || path.basename(filePath).startsWith('.');
  }

  private isExcluded(relPath: string, customExcludes?: string[]): boolean {
    const lower = relPath.toLowerCase();
    const excludes = customExcludes ? [...this.defaultExcludes, ...customExcludes] : this.defaultExcludes;

    for (const pattern of excludes) {
      const cleanPattern = pattern.replace(/\*\*/g, '').replace(/\*/g, '').toLowerCase();
      if (cleanPattern && lower.includes(cleanPattern)) {
        return true;
      }
    }
    return false;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
