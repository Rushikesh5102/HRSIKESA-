/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tool: filesystem.read
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../interfaces/execution.types.js';

export interface FileReadOutput {
  readonly path: string;
  readonly content: string;
  readonly sizeBytes: number;
  readonly lineCount: number;
  readonly truncated: boolean;
}

export class FileReadTool implements ITool<{ path: string; maxBytes?: number }, FileReadOutput> {
  public readonly id = 'filesystem.read';
  public readonly name = 'Filesystem Read File';
  public readonly description = 'Reads a text file within the authorized workspace. Traversal outside the workspace is blocked.';
  public readonly version = '1.0.0';
  public readonly category = 'filesystem';
  public readonly riskLevel = DangerTier.TIER_0;
  public readonly requiresApproval = false;
  public readonly capabilities = ['filesystem.read', 'file.inspect'];

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string' as const,
        description: 'Relative or workspace-relative path to the file to read.'
      },
      maxBytes: {
        type: 'integer' as const,
        description: 'Maximum bytes to read (defaults to 1,000,000 bytes / 1MB).'
      }
    },
    required: ['path']
  };

  public async execute(
    input: { path: string; maxBytes?: number },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<FileReadOutput>> {
    const rawPath = input.path?.trim();
    if (!rawPath) {
      return { success: false, error: 'Path parameter is required.', durationMs: 0 };
    }

    const workspaceRoot = path.resolve(context.workspaceRoot);
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
        error: `Security boundary violation: target file '${rawPath}' resolves outside the authorized workspace root. Path traversal is strictly forbidden.`,
        durationMs: 0
      };
    }

    try {
      const stat = await fs.stat(targetPath);
      if (stat.isDirectory()) {
        return {
          success: false,
          error: `Target path '${rawPath}' is a directory, not a file. Use filesystem.list instead.`,
          durationMs: 0
        };
      }

      const maxBytes = input.maxBytes ?? 1_000_000;
      const truncated = stat.size > maxBytes;
      const buffer = await fs.readFile(targetPath);
      const text = buffer.subarray(0, maxBytes).toString('utf-8');

      return {
        success: true,
        output: {
          path: path.relative(workspaceRoot, targetPath),
          content: text,
          sizeBytes: stat.size,
          lineCount: text.split('\n').length,
          truncated
        },
        durationMs: 0
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to read file '${rawPath}': ${err instanceof Error ? err.message : String(err)}`,
        durationMs: 0
      };
    }
  }
}
