/**
 * HṚṢĪKEŚA (हृषीकेश) — Software Engineering Execution Engine
 *
 * FP-10: Executes validated actions across Editor, Terminal, Git, Search, Preview,
 * and Capability Fabric with user-conflict protection and changeset tracking.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  EngineeringAction,
} from '../types/engineering.types.js';
import { EditorEngine } from '../../ide/editor/editor.engine.js';
import { TerminalManager } from '../../ide/terminal/terminal.manager.js';
import { CodeSearchEngine } from '../../ide/search/code.search.js';
import { GitWorkspaceManager } from '../../ide/git/git.workspace.js';
import { PreviewManager } from '../../ide/preview/preview.manager.js';
import { UniversalCapabilityFabric } from '../../capabilities/fabric/universal.capability.fabric.js';
import { WorkspaceMetadata } from '../../ide/types/ide.types.js';
import { ILogger } from '../../core/logging/logger.types.js';

export interface ActionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  diff?: string;
  durationMs: number;
}

export class SoftwareEngineeringExecutionEngine {
  private readonly editorEngine: EditorEngine;
  private readonly terminalManager: TerminalManager;
  private readonly searchEngine: CodeSearchEngine;
  private readonly gitWorkspace: GitWorkspaceManager;
  private readonly previewManager: PreviewManager;
  private readonly capabilityFabric?: UniversalCapabilityFabric;
  protected readonly logger?: ILogger;

  // Track initial file hashes to detect concurrent user modifications
  private readonly fileBaselineHashes: Map<string, string> = new Map();

  constructor(
    editorEngine: EditorEngine,
    terminalManager: TerminalManager,
    searchEngine: CodeSearchEngine,
    gitWorkspace: GitWorkspaceManager,
    previewManager: PreviewManager,
    capabilityFabric?: UniversalCapabilityFabric,
    logger?: ILogger
  ) {
    this.editorEngine = editorEngine;
    this.terminalManager = terminalManager;
    this.searchEngine = searchEngine;
    this.gitWorkspace = gitWorkspace;
    this.previewManager = previewManager;
    this.capabilityFabric = capabilityFabric;
    this.logger = logger?.child('EngineeringExecutionEngine');
  }

  /**
   * Records initial state of a file before an autonomous session begins.
   */
  public recordFileBaseline(filePath: string): void {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      this.fileBaselineHashes.set(path.resolve(filePath), hash);
    }
  }

  /**
   * Executes a validated engineering action.
   */
  public async executeAction(
    action: EngineeringAction,
    workspace: WorkspaceMetadata
  ): Promise<ActionResult> {
    const t0 = Date.now();
    const { actionType, payload } = action;

    try {
      switch (actionType) {
        case 'READ_FILE': {
          const filePath = this.resolvePath(payload.file || payload.filePath || payload.path || '', workspace);
          this.recordFileBaseline(filePath);
          const slice = this.editorEngine.viewFile(filePath, payload.startLine, payload.endLine);
          return {
            success: true,
            output: slice,
            durationMs: Date.now() - t0,
          };
        }

        case 'SEARCH': {
          const res = await this.searchEngine.search(
            {
              query: payload.query || '',
              isRegex: payload.isRegex,
            },
            workspace
          );
          return {
            success: true,
            output: res,
            durationMs: Date.now() - t0,
          };
        }

        case 'EDIT_FILE': {
          const filePath = this.resolvePath(payload.file || payload.filePath || payload.path || '', workspace);

          // User conflict protection: check if file was modified externally
          const baseline = this.fileBaselineHashes.get(path.resolve(filePath));
          if (baseline && fs.existsSync(filePath)) {
            const currentContent = fs.readFileSync(filePath, 'utf8');
            const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
            if (currentHash !== baseline || (payload.expectedHash && currentHash !== payload.expectedHash)) {
              return {
                success: false,
                error: `Concurrent modification detected: User work protected. File [${path.basename(filePath)}] was modified externally. Halting patch.`,
                durationMs: Date.now() - t0,
              };
            }
          }

          if (payload.replacements && payload.replacements.length > 0) {
            const multiRes = this.editorEngine.multiReplace(filePath, payload.replacements, payload.reason);
            if (!multiRes.success) {
              return {
                success: false,
                error: multiRes.error || 'MultiReplace failed dry-run validation',
                durationMs: Date.now() - t0,
              };
            }
            return {
              success: true,
              output: multiRes,
              diff: multiRes.diff,
              durationMs: Date.now() - t0,
            };
          }

          if (payload.targetContent && payload.replacementContent) {
            const editRes = this.editorEngine.replaceContent(
              filePath,
              payload.targetContent,
              payload.replacementContent,
              payload.startLine,
              payload.endLine,
              false
            );
            return {
              success: true,
              output: editRes,
              diff: editRes.diff,
              durationMs: Date.now() - t0,
            };
          }

          if (payload.content !== undefined) {
            this.editorEngine.writeFile(filePath, payload.content, true);
            return {
              success: true,
              output: { written: true, path: filePath },
              durationMs: Date.now() - t0,
            };
          }

          return { success: false, error: 'EDIT_FILE payload missing replacement content', durationMs: Date.now() - t0 };
        }

        case 'CREATE_FILE': {
          const filePath = this.resolvePath(payload.file || payload.filePath || payload.path || '', workspace);
          if (fs.existsSync(filePath)) {
            return { success: false, error: `File already exists: ${filePath}`, durationMs: Date.now() - t0 };
          }
          this.editorEngine.writeFile(filePath, payload.content || '', false);
          return {
            success: true,
            output: { created: true, path: filePath },
            durationMs: Date.now() - t0,
          };
        }

        case 'DELETE_FILE': {
          const filePath = this.resolvePath(payload.file || payload.filePath || payload.path || '', workspace);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return {
            success: true,
            output: { deleted: true, path: filePath },
            durationMs: Date.now() - t0,
          };
        }

        case 'RUN_TEST':
        case 'RUN_BUILD':
        case 'RUN_LINT':
        case 'RUN_COMMAND': {
          const cmd = payload.command || payload.commandLine || 'node -v';
          const timeout = payload.timeoutMs || 60000;
          const execRes = await this.terminalManager.executeSync(cmd, workspace.rootPath, timeout);
          return {
            success: execRes.exitCode === 0,
            output: execRes,
            error: execRes.exitCode !== 0 ? execRes.output : undefined,
            durationMs: execRes.durationMs,
          };
        }

        case 'GIT_DIFF': {
          const diff = await this.gitWorkspace.getDiff(workspace, payload.path);
          return {
            success: true,
            output: diff,
            diff,
            durationMs: Date.now() - t0,
          };
        }

        case 'START_PREVIEW': {
          const port = await this.previewManager.findAvailablePort(5173);
          const server = await this.previewManager.startPreviewServer(workspace, payload.command, port);
          return {
            success: true,
            output: server,
            durationMs: Date.now() - t0,
          };
        }

        case 'STOP_PREVIEW': {
          const serverId = payload.path || 'default';
          const stopped = await this.previewManager.stopPreviewServer(serverId);
          return {
            success: stopped,
            output: { stopped },
            durationMs: Date.now() - t0,
          };
        }

        case 'RESEARCH': {
          if (this.capabilityFabric) {
            const capRes = await this.capabilityFabric.invoke({
              invocationId: crypto.randomUUID(),
              capabilityId: 'research.synthesize',
              operation: 'synthesize',
              inputs: { query: payload.query || '' },
              actor: 'SYSTEM',
              agentId: 'rahu',
              privacyClass: 'PRIVATE',
              requestedAt: new Date().toISOString(),
            });
            return {
              success: capRes.status === 'SUCCESS',
              output: capRes.output,
              durationMs: Date.now() - t0,
            };
          }
          return {
            success: true,
            output: { researched: true, query: payload.query },
            durationMs: Date.now() - t0,
          };
        }

        case 'ASK_USER':
        case 'COMPLETE': {
          return {
            success: true,
            output: payload,
            durationMs: Date.now() - t0,
          };
        }

        default:
          return {
            success: false,
            error: `Unsupported execution action type: ${actionType}`,
            durationMs: Date.now() - t0,
          };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - t0,
      };
    }
  }

  private resolvePath(subPath: string, workspace: WorkspaceMetadata): string {
    if (path.isAbsolute(subPath)) return subPath;
    return path.resolve(workspace.rootPath, subPath);
  }
}
