/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tool: filesystem.list
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../interfaces/execution.types.js';

export interface FileListEntry {
  readonly name: string;
  readonly isDirectory: boolean;
  readonly isFile: boolean;
  readonly sizeBytes: number;
  readonly modifiedAt: string;
}

export interface FileListOutput {
  readonly path: string;
  readonly entries: readonly FileListEntry[];
  readonly totalEntries: number;
}

export class FileListTool implements ITool<{ path?: string }, FileListOutput> {
  public readonly id = 'filesystem.list';
  public readonly name = 'Filesystem List Directory';
  public readonly description = 'Lists directory entries (files and folders) within the authorized workspace root. Traversal outside the workspace is blocked.';
  public readonly version = '1.0.0';
  public readonly category = 'filesystem';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['filesystem.read', 'directory.list'];

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string' as const,
        description: 'Relative path or workspace-relative path to list. Defaults to root workspace directory (".").'
      }
    }
  };

  public async execute(
    input: { path?: string },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<FileListOutput>> {
    const rawPath = input.path?.trim() || '.';
    const workspaceRoot = path.resolve(context.workspaceRoot);

    // Resolve target path safely relative to workspaceRoot
    const targetPath = path.isAbsolute(rawPath)
      ? path.resolve(rawPath)
      : path.resolve(workspaceRoot, rawPath);

    // Sandboxing: targetPath MUST be inside workspaceRoot
    const normalizedTarget = path.normalize(targetPath).toLowerCase();
    const normalizedRoot = path.normalize(workspaceRoot).toLowerCase();

    if (
      normalizedTarget !== normalizedRoot &&
      !normalizedTarget.startsWith(normalizedRoot + path.sep)
    ) {
      return {
        success: false,
        error: `Security boundary violation: target path '${rawPath}' resolves outside the authorized workspace root '${workspaceRoot}'. Path traversal is strictly forbidden.`,
        durationMs: 0
      };
    }

    try {
      const dirEntries = await fs.readdir(targetPath, { withFileTypes: true });
      const entries: FileListEntry[] = [];

      for (const dirent of dirEntries) {
        // Skip git and internal sensitive dirs
        if (dirent.name === '.git' || dirent.name === 'node_modules') {
          entries.push({
            name: dirent.name,
            isDirectory: true,
            isFile: false,
            sizeBytes: 0,
            modifiedAt: new Date().toISOString()
          });
          continue;
        }

        try {
          const fullFilePath = path.join(targetPath, dirent.name);
          const stat = await fs.stat(fullFilePath);
          entries.push({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
            isFile: dirent.isFile(),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString()
          });
        } catch {
          entries.push({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
            isFile: dirent.isFile(),
            sizeBytes: 0,
            modifiedAt: new Date().toISOString()
          });
        }
      }

      return {
        success: true,
        output: {
          path: path.relative(workspaceRoot, targetPath) || '.',
          entries,
          totalEntries: entries.length
        },
        durationMs: 0
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to list directory '${rawPath}': ${err instanceof Error ? err.message : String(err)}`,
        durationMs: 0
      };
    }
  }
}
