/**
 * HṚṢĪKEŚA (हृषीकेश) — Built-in Tool: filesystem.write
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { ITool } from '../interfaces/tool.types.js';
import { DangerTier } from '../interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../interfaces/execution.types.js';

export interface FileWriteOutput {
  readonly path: string;
  readonly bytesWritten: number;
  readonly created: boolean;
}

export class FileWriteTool implements ITool<{ path: string; content: string; overwrite?: boolean }, FileWriteOutput> {
  public readonly id = 'filesystem.write';
  public readonly name = 'Filesystem Write File';
  public readonly description = 'Writes a text file within the authorized workspace. Traversal outside the workspace is blocked.';
  public readonly version = '1.0.0';
  public readonly category = 'filesystem';
  public readonly riskLevel = DangerTier.TIER_1;
  public readonly requiresApproval = false; // Within autonomous Tier 1 in workspace
  public readonly capabilities = ['filesystem.write', 'file.create', 'file.modify'];

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string' as const,
        description: 'Relative or workspace-relative path of the file to write.'
      },
      content: {
        type: 'string' as const,
        description: 'Text content to write into the file.'
      },
      overwrite: {
        type: 'boolean' as const,
        description: 'Whether to overwrite if the file already exists. Defaults to true.'
      }
    },
    required: ['path', 'content']
  };

  public async execute(
    input: { path: string; content: string; overwrite?: boolean },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<FileWriteOutput>> {
    const rawPath = input.path?.trim();
    if (!rawPath) {
      return { success: false, error: 'Path parameter is required.', durationMs: 0 };
    }

    if (input.content === undefined || input.content === null) {
      return { success: false, error: 'Content parameter is required.', durationMs: 0 };
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
        error: `Security boundary violation: target file '${rawPath}' resolves outside authorized workspace root. Path traversal is strictly forbidden.`,
        durationMs: 0
      };
    }

    try {
      let created = true;
      try {
        await fs.access(targetPath);
        created = false;
        if (input.overwrite === false) {
          return {
            success: false,
            error: `File '${rawPath}' already exists and overwrite is set to false.`,
            durationMs: 0
          };
        }
      } catch {
        // File does not exist, created = true
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Write file
      const buffer = Buffer.from(input.content, 'utf-8');
      await fs.writeFile(targetPath, buffer);

      return {
        success: true,
        output: {
          path: path.relative(workspaceRoot, targetPath),
          bytesWritten: buffer.length,
          created
        },
        durationMs: 0
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to write file '${rawPath}': ${err instanceof Error ? err.message : String(err)}`,
        durationMs: 0
      };
    }
  }
}
