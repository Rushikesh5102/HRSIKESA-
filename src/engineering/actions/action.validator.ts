/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Engineering Action Validator
 *
 * FP-10: Schema validation, path containment verification, command safety checks,
 * danger-tier assessment, and permission gating for model-proposed actions.
 */

import path from 'node:path';
import {
  EngineeringAction,
  EngineeringActionType,
} from '../types/engineering.types.js';
import { WorkspaceManager } from '../../ide/workspace/workspace.manager.js';
import { WorkspaceMetadata } from '../../ide/types/ide.types.js';

export interface ActionValidationResult {
  valid: boolean;
  reason?: string;
  riskTier: number;
  requiresApproval: boolean;
}

const FORBIDDEN_COMMAND_PATTERNS = [
  /\bformat\b/i,
  /\brmdir\s+\/s\s+\/q\s+[c-zC-Z]:\\/i,
  /\bdel\s+\/f\s+\/s\s+\/q\s+[c-zC-Z]:\\/i,
  /\brm\s+-rf\s+\/\b/i,
  /\bshutdown\b/i,
  /\bdiskpart\b/i,
  /\bgit\s+push\s+--force\b/i,
  /\bcurl\b.*\|\s*(?:bash|sh|powershell)/i,
];

export class EngineeringActionValidator {
  private readonly workspaceManager?: WorkspaceManager;

  constructor(workspaceManager?: WorkspaceManager) {
    this.workspaceManager = workspaceManager;
  }

  public validateAction(action: EngineeringAction, workspace: WorkspaceMetadata): ActionValidationResult {
    return this.validate(action, workspace);
  }

  public validate(action: EngineeringAction, workspace: WorkspaceMetadata): ActionValidationResult {
    const { actionType, payload } = action;

    // 1. Action Type Validity
    const validTypes: EngineeringActionType[] = [
      'READ_FILE',
      'SEARCH',
      'EDIT_FILE',
      'CREATE_FILE',
      'DELETE_FILE',
      'RUN_TEST',
      'RUN_BUILD',
      'RUN_LINT',
      'RUN_COMMAND',
      'GIT_DIFF',
      'START_PREVIEW',
      'STOP_PREVIEW',
      'RESEARCH',
      'ASK_USER',
      'COMPLETE',
    ];

    if (!validTypes.includes(actionType)) {
      return {
        valid: false,
        reason: `Unsupported or invalid engineering action type: [${actionType}]`,
        riskTier: 4,
        requiresApproval: false,
      };
    }

    // 2. Schema and Path Validation based on action type
    switch (actionType) {
      case 'READ_FILE': {
        const filePath = payload.file || payload.filePath || payload.path;
        if (!filePath) {
          return { valid: false, reason: 'READ_FILE requires a file path', riskTier: 0, requiresApproval: false };
        }
        const pathCheck = this.validatePathContainment(filePath, workspace);
        if (!pathCheck.valid) return pathCheck;
        return { valid: true, riskTier: 0, requiresApproval: false };
      }

      case 'SEARCH': {
        if (!payload.query) {
          return { valid: false, reason: 'SEARCH requires a search query', riskTier: 0, requiresApproval: false };
        }
        return { valid: true, riskTier: 0, requiresApproval: false };
      }

      case 'EDIT_FILE': {
        const filePath = payload.file || payload.filePath || payload.path;
        if (!filePath) {
          return { valid: false, reason: 'Missing target file path: EDIT_FILE requires a target file path', riskTier: 1, requiresApproval: false };
        }
        const pathCheck = this.validatePathContainment(filePath, workspace);
        if (!pathCheck.valid) return pathCheck;

        // Check if single or multi-chunk
        const hasSingle = payload.replacementContent !== undefined || payload.targetContent !== undefined;
        const hasMulti = Array.isArray(payload.replacements) && payload.replacements.length > 0;
        const hasFullContent = typeof payload.content === 'string';

        if (!hasSingle && !hasMulti && !hasFullContent) {
          return {
            valid: false,
            reason: 'EDIT_FILE must specify targetContent/replacementContent, replacements array, or content string',
            riskTier: 1,
            requiresApproval: false,
          };
        }

        if (hasSingle && payload.range) {
          if (payload.range.startLine < 1 || payload.range.endLine < payload.range.startLine) {
            return {
              valid: false,
              reason: `EDIT_FILE line range [${payload.range.startLine}, ${payload.range.endLine}] is invalid`,
              riskTier: 1,
              requiresApproval: false,
            };
          }
        }

        return { valid: true, riskTier: 1, requiresApproval: false };
      }

      case 'CREATE_FILE': {
        const filePath = payload.file || payload.filePath || payload.path;
        if (!filePath) {
          return { valid: false, reason: 'CREATE_FILE requires a file path', riskTier: 1, requiresApproval: false };
        }
        const pathCheck = this.validatePathContainment(filePath, workspace);
        if (!pathCheck.valid) return pathCheck;
        if (typeof payload.content !== 'string') {
          return { valid: false, reason: 'CREATE_FILE requires string content', riskTier: 1, requiresApproval: false };
        }
        return { valid: true, riskTier: 1, requiresApproval: false };
      }

      case 'DELETE_FILE': {
        const filePath = payload.file || payload.filePath || payload.path;
        if (!filePath) {
          return { valid: false, reason: 'DELETE_FILE requires a file path', riskTier: 3, requiresApproval: false };
        }
        const pathCheck = this.validatePathContainment(filePath, workspace);
        if (!pathCheck.valid) return pathCheck;
        return { valid: true, riskTier: 3, requiresApproval: true };
      }

      case 'RUN_TEST':
      case 'RUN_BUILD':
      case 'RUN_LINT': {
        const cmd = payload.command || payload.commandLine;
        if (cmd) {
          const cmdCheck = this.validateCommand(cmd);
          if (!cmdCheck.valid) return cmdCheck;
        }
        return { valid: true, riskTier: 1, requiresApproval: false };
      }

      case 'RUN_COMMAND': {
        const cmd = payload.command || payload.commandLine;
        if (!cmd) {
          return { valid: false, reason: 'RUN_COMMAND requires commandLine string', riskTier: 2, requiresApproval: false };
        }
        const cmdCheck = this.validateCommand(cmd);
        if (!cmdCheck.valid) return cmdCheck;

        // Arbitrary shell command execution is Tier 2, may require approval if destructive
        const requiresApproval = /\b(?:push|deploy|publish|drop|delete)\b/i.test(cmd);
        return { valid: true, riskTier: 2, requiresApproval };
      }

      case 'GIT_DIFF':
      case 'RESEARCH':
      case 'START_PREVIEW':
      case 'STOP_PREVIEW':
      case 'ASK_USER':
      case 'COMPLETE': {
        return { valid: true, riskTier: 0, requiresApproval: false };
      }

      default:
        return { valid: false, reason: `Unhandled action validation: ${actionType}`, riskTier: 3, requiresApproval: false };
    }
  }

  private validatePathContainment(targetPath: string, workspace: WorkspaceMetadata): ActionValidationResult {
    try {
      if (this.workspaceManager) {
        this.workspaceManager.resolveSafePath(workspace, targetPath);
      } else {
        const root = path.resolve(workspace.rootPath);
        const resolved = path.resolve(root, targetPath);
        const rel = path.relative(root.toLowerCase(), resolved.toLowerCase());
        if (rel.startsWith('..') || (path.isAbsolute(rel) && !resolved.toLowerCase().startsWith(root.toLowerCase()))) {
          throw new Error(`Path traversal out of workspace: ${targetPath}`);
        }
      }
      return { valid: true, riskTier: 0, requiresApproval: false };
    } catch (err: any) {
      return {
        valid: false,
        reason: `Security Violation: ${err.message}`,
        riskTier: 4,
        requiresApproval: false,
      };
    }
  }

  private validateCommand(command: string): ActionValidationResult {
    for (const pattern of FORBIDDEN_COMMAND_PATTERNS) {
      if (pattern.test(command)) {
        return {
          valid: false,
          reason: `Security Violation: Command matches forbidden destructive pattern: ${pattern.toString()}`,
          riskTier: 4,
          requiresApproval: false,
        };
      }
    }
    return { valid: true, riskTier: 1, requiresApproval: false };
  }
}
