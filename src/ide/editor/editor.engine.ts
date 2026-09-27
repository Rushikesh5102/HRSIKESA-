/**
 * HṚṢĪKEŚA (हृषीकेश) — Precision File Modification & Editor Engine
 *
 * FP-09: Single-chunk & transactional multi-chunk code replacement, bounded view_file,
 * unified diff generation, staged changeset review, and atomic rollback.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ILogger } from '../../core/logging/logger.types.js';
import {
  FileSlice,
  ReplacementChunk,
  StagedChangeset,
} from '../types/ide.types.js';
import { IdeRepository } from '../repository/ide.repository.js';

export class EditorEngine {
  private readonly repo: IdeRepository;
  private readonly logger?: ILogger;
  private readonly maxViewBytes = 46080; // 45KB view limit matching Antigravity / IDE standard
  private readonly stagedBackups: Map<string, Array<{ file: string; beforeContent: string }>> = new Map();

  constructor(repo: IdeRepository, logger?: ILogger) {
    this.repo = repo;
    this.logger = logger?.child('EditorEngine');
  }

  public resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath) && fs.existsSync(filePath)) return filePath;
    const workspaces = this.repo.listWorkspaces();
    for (const ws of workspaces) {
      const candidate = path.resolve(ws.rootPath, filePath);
      if (fs.existsSync(candidate)) return candidate;
    }
    if (fs.existsSync(filePath)) return filePath;
    return filePath;
  }

  /**
   * Reads a bounded slice of a file with line numbers and truncation awareness.
   */
  public viewFile(filePath: string, startLine?: number, endLine?: number, offsetBytes = 0): FileSlice & { lines: string[] } {
    const resolvedPath = this.resolvePath(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      throw new Error(`Path is not a regular file: ${filePath}`);
    }

    const fullContent = fs.readFileSync(resolvedPath, 'utf8');
    const allLines = fullContent.split('\n');
    const totalLines = allLines.length;

    const actualStart = Math.max(1, startLine || 1);
    const actualEnd = Math.min(totalLines, endLine || Math.min(totalLines, actualStart + 799));

    if (actualStart > actualEnd) {
      throw new Error(`Invalid line range: StartLine (${actualStart}) > EndLine (${actualEnd})`);
    }

    const selectedLines = allLines.slice(actualStart - 1, actualEnd);
    let sliceText = selectedLines.join('\n');

    let truncated = false;
    if (offsetBytes > 0) {
      sliceText = sliceText.slice(offsetBytes);
    }
    if (Buffer.byteLength(sliceText, 'utf8') > this.maxViewBytes) {
      sliceText = sliceText.slice(0, this.maxViewBytes);
      truncated = true;
    }

    return {
      path: filePath,
      relativePath: path.basename(filePath),
      totalLines,
      startLine: actualStart,
      endLine: actualEnd,
      content: sliceText,
      lines: selectedLines,
      truncated,
      byteSize: stat.size,
    };
  }

  /**
   * Writes content to a file, creating parent directories as needed.
   */
  public writeFile(filePath: string, content: string, overwrite = false): void {
    if (fs.existsSync(filePath) && !overwrite) {
      throw new Error(`File already exists and overwrite is false: ${filePath}`);
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    this.logger?.info(`Wrote file [${filePath}] (${Buffer.byteLength(content, 'utf8')} bytes)`);
  }

  /**
   * Replaces a single contiguous chunk of content within [startLine, endLine].
   */
  public replaceContent(
    filePathOrOptions: string | { file?: string; filePath?: string; targetContent: string; replacementContent: string; startLine?: number; endLine?: number; allowMultiple?: boolean },
    targetContent?: string,
    replacementContent?: string,
    startLine?: number,
    endLine?: number,
    allowMultiple = false
  ): { originalContent: string; newContent: string; diff: string; success: boolean } {
    let targetPath: string;
    let targetStr: string;
    let repStr: string;
    let sLine: number;
    let eLine: number;
    let allowMult: boolean;

    if (typeof filePathOrOptions === 'object') {
      targetPath = this.resolvePath(filePathOrOptions.file || filePathOrOptions.filePath || '');
      targetStr = filePathOrOptions.targetContent;
      repStr = filePathOrOptions.replacementContent;
      sLine = filePathOrOptions.startLine || 1;
      eLine = filePathOrOptions.endLine || (fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8').split('\n').length : 100);
      allowMult = !!filePathOrOptions.allowMultiple;
    } else {
      targetPath = this.resolvePath(filePathOrOptions);
      targetStr = targetContent || '';
      repStr = replacementContent || '';
      sLine = startLine || 1;
      eLine = endLine || (fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8').split('\n').length : 100);
      allowMult = allowMultiple;
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found: ${targetPath}`);
    }

    const originalContent = fs.readFileSync(targetPath, 'utf8');
    const lines = originalContent.split('\n');

    if (sLine < 1 || eLine > lines.length || sLine > eLine) {
      throw new Error(`Line range [${sLine}, ${eLine}] is invalid for file with ${lines.length} lines.`);
    }

    // Extract slice where target must occur
    const rangeLines = lines.slice(sLine - 1, eLine);
    const rangeText = rangeLines.join('\n');

    if (!rangeText.includes(targetStr)) {
      throw new Error(`Target content not found within specified lines [${sLine}, ${eLine}].`);
    }

    // Check uniqueness if allowMultiple is false
    if (!allowMult) {
      const firstIndex = rangeText.indexOf(targetStr);
      const nextIndex = rangeText.indexOf(targetStr, firstIndex + 1);
      if (nextIndex !== -1) {
        throw new Error(`Target content is not unique in specified range. Set allowMultiple=true or refine range.`);
      }
    }

    const updatedRangeText = allowMult
      ? rangeText.replaceAll(targetStr, repStr)
      : rangeText.replace(targetStr, repStr);

    const prefix = lines.slice(0, sLine - 1).join('\n');
    const suffix = lines.slice(eLine).join('\n');

    let newContent = '';
    if (sLine === 1 && eLine === lines.length) {
      newContent = updatedRangeText;
    } else if (sLine === 1) {
      newContent = updatedRangeText + '\n' + suffix;
    } else if (eLine === lines.length) {
      newContent = prefix + '\n' + updatedRangeText;
    } else {
      newContent = prefix + '\n' + updatedRangeText + '\n' + suffix;
    }

    fs.writeFileSync(targetPath, newContent, 'utf8');
    const diff = this.generateUnifiedDiff(originalContent, newContent, targetPath);
    this.logger?.info(`Replaced content in [${targetPath}] at lines [${sLine}, ${eLine}]`);
    return { originalContent, newContent, diff, success: true };
  }

  /**
   * Applies non-contiguous multi-chunk edits with transactional atomic rollback.
   * If any chunk fails to validate, zero edits are applied to the disk.
   */
  public multiReplace(
    filePath: string,
    chunks: ReplacementChunk[],
    description?: string
  ): { originalContent: string; newContent: string; appliedChunks: number; diff: string; success: boolean; error?: string } {
    if (description) {
      this.logger?.debug(`Executing multiReplace on [${filePath}]: ${description}`);
    }
    const resolved = this.resolvePath(filePath);
    if (!fs.existsSync(resolved)) {
      return {
        originalContent: '',
        newContent: '',
        appliedChunks: 0,
        diff: '',
        success: false,
        error: `File not found: ${filePath}`,
      };
    }

    const originalContent = fs.readFileSync(resolved, 'utf8');
    let workingContent = originalContent;

    // Sort chunks from bottom to top so line modifications do not alter preceding chunk offsets
    const sortedChunks = [...chunks].sort((a, b) => b.startLine - a.startLine);

    try {
      // Dry-run validation pass
      for (const chunk of sortedChunks) {
        const lines = workingContent.split('\n');
        if (chunk.startLine < 1 || chunk.endLine > lines.length || chunk.startLine > chunk.endLine) {
          throw new Error(`Chunk range [${chunk.startLine}, ${chunk.endLine}] is invalid for file with ${lines.length} lines.`);
        }
        const rangeText = lines.slice(chunk.startLine - 1, chunk.endLine).join('\n');
        if (!rangeText.includes(chunk.targetContent)) {
          throw new Error(`Target content not found within specified chunk lines [${chunk.startLine}, ${chunk.endLine}].`);
        }
      }
    } catch (err: any) {
      return {
        originalContent,
        newContent: originalContent,
        appliedChunks: 0,
        diff: '',
        success: false,
        error: err.message,
      };
    }

    // Actual replacement pass
    for (const chunk of sortedChunks) {
      const lines = workingContent.split('\n');
      const rangeLines = lines.slice(chunk.startLine - 1, chunk.endLine);
      const rangeText = rangeLines.join('\n');

      const updatedRangeText = chunk.allowMultiple
        ? rangeText.replaceAll(chunk.targetContent, chunk.replacementContent)
        : rangeText.replace(chunk.targetContent, chunk.replacementContent);

      const prefix = lines.slice(0, chunk.startLine - 1).join('\n');
      const suffix = lines.slice(chunk.endLine).join('\n');

      if (chunk.startLine === 1 && chunk.endLine === lines.length) {
        workingContent = updatedRangeText;
      } else if (chunk.startLine === 1) {
        workingContent = updatedRangeText + '\n' + suffix;
      } else if (chunk.endLine === lines.length) {
        workingContent = prefix + '\n' + updatedRangeText;
      } else {
        workingContent = prefix + '\n' + updatedRangeText + '\n' + suffix;
      }
    }

    fs.writeFileSync(resolved, workingContent, 'utf8');
    const diff = this.generateUnifiedDiff(originalContent, workingContent, resolved);
    this.logger?.info(`Multi-replaced ${chunks.length} chunks in [${resolved}]`);
    return {
      originalContent,
      newContent: workingContent,
      appliedChunks: chunks.length,
      diff,
      success: true,
    };
  }

  /**
   * Stages a changeset without immediately committing, enabling review and approval.
   */
  public stageChangeset(
    workspaceIdOrEdits: string | Array<{ file?: string; filePath?: string; beforeContent?: string; afterContent?: string; originalContent?: string; newContent?: string }>,
    titleOrDescription = 'Staged changes',
    authorAgent = 'IDE',
    editsList?: Array<{ filePath: string; originalContent: string; newContent: string }>,
    description?: string,
    dangerTier = 1
  ): StagedChangeset {
    let wsId: string;
    let title: string;
    let actualEdits: Array<{ filePath: string; originalContent: string; newContent: string }>;

    if (Array.isArray(workspaceIdOrEdits)) {
      wsId = 'default_ws';
      title = titleOrDescription;
      actualEdits = workspaceIdOrEdits.map((e) => ({
        filePath: e.filePath || e.file || '',
        originalContent: e.originalContent ?? e.beforeContent ?? '',
        newContent: e.newContent ?? e.afterContent ?? '',
      }));
    } else {
      wsId = workspaceIdOrEdits;
      title = titleOrDescription;
      actualEdits = editsList || [];
    }

    const files = actualEdits.map((e) => e.filePath);
    let fullDiff = '';

    for (const edit of actualEdits) {
      fullDiff += this.generateUnifiedDiff(edit.originalContent, edit.newContent, edit.filePath) + '\n';
    }

    const diffChecksum = crypto.createHash('sha256').update(fullDiff).digest('hex');

    const changeset: StagedChangeset = {
      id: `cs_${crypto.randomUUID().slice(0, 12)}`,
      workspaceId: wsId,
      title,
      description,
      status: 'STAGED',
      authorAgent,
      dangerTier,
      files,
      diffUnified: fullDiff,
      unifiedDiff: fullDiff,
      diffChecksum,
      createdAt: new Date().toISOString(),
    };

    this.stagedBackups.set(
      changeset.id,
      actualEdits.map((e) => ({
        file: e.filePath,
        beforeContent: e.originalContent,
      }))
    );

    this.repo.saveChangeset(changeset);
    this.logger?.info(`Staged changeset [${changeset.id}] modifying ${files.length} file(s)`);
    return changeset;
  }

  public getHistory(workspaceId = 'default_ws'): StagedChangeset[] {
    return this.repo.listChangesets(workspaceId);
  }

  /**
   * Applies an approved staged changeset to disk.
   */
  public applyChangeset(
    changesetId: string,
    fileMap: Map<string, string>
  ): StagedChangeset {
    const cs = this.repo.getChangeset(changesetId);
    if (!cs) throw new Error(`Changeset not found: ${changesetId}`);

    for (const filePath of cs.files) {
      const content = fileMap.get(filePath);
      if (content !== undefined) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }

    cs.status = 'APPLIED';
    cs.appliedAt = new Date().toISOString();
    this.repo.saveChangeset(cs);
    this.logger?.info(`Applied changeset [${changesetId}]`);
    return cs;
  }

  /**
   * Rolls back a staged or applied changeset to its original before-content state.
   */
  public rollbackChangeset(changesetId: string): void {
    const backup = this.stagedBackups.get(changesetId);
    if (backup) {
      for (const item of backup) {
        if (fs.existsSync(item.file)) {
          fs.writeFileSync(item.file, item.beforeContent, 'utf8');
        }
      }
    }
    const cs = this.repo.getChangeset(changesetId);
    if (cs) {
      cs.status = 'REVERTED';
      this.repo.saveChangeset(cs);
    }
    this.logger?.info(`Rolled back changeset [${changesetId}]`);
  }

  /**
   * Generates standard unified diff format between old and new text.
   */
  public generateUnifiedDiff(oldStr: string, newStr: string, filePath: string): string {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');

    let diff = `--- a/${filePath.replace(/\\/g, '/')}\n+++ b/${filePath.replace(/\\/g, '/')}\n`;

    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        i++;
        j++;
      } else {
        const hunkStartOld = i + 1;
        const hunkStartNew = j + 1;
        const oldHunk: string[] = [];
        const newHunk: string[] = [];

        while (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
          oldHunk.push(`-${oldLines[i]}`);
          i++;
        }
        while (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
          newHunk.push(`+${newLines[j]}`);
          j++;
        }

        diff += `@@ -${hunkStartOld},${oldHunk.length} +${hunkStartNew},${newHunk.length} @@\n`;
        diff += oldHunk.join('\n') + (oldHunk.length > 0 ? '\n' : '');
        diff += newHunk.join('\n') + (newHunk.length > 0 ? '\n' : '');
      }
    }

    return diff;
  }
}
