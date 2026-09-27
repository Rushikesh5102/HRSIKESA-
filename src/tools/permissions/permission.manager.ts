/**
 * HṚṢĪKEŚA (हृषीकेश) — Permission Manager & Human Approval Subsystem
 */

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { ITool } from '../interfaces/tool.types.js';
import { DangerTier, DANGER_TIER_NAMES, requiresHumanApproval } from '../interfaces/danger.types.js';
import {
  PermissionEvaluationResult,
  ApprovalRequest,
  IPermissionPolicy
} from '../interfaces/permission.types.js';
import { ToolExecutionContext } from '../interfaces/execution.types.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

export class PermissionManager {
  private readonly policy: IPermissionPolicy;
  private readonly approvals = new Map<string, ApprovalRequest>();
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;

  constructor(
    policy?: Partial<IPermissionPolicy>,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    const defaultWorkspace = path.resolve(process.cwd());
    this.policy = {
      maxAutonomousTier: policy?.maxAutonomousTier ?? DangerTier.TIER_1,
      allowedWorkspaceRoots: (policy?.allowedWorkspaceRoots && policy.allowedWorkspaceRoots.length > 0)
        ? policy.allowedWorkspaceRoots.map((r) => path.resolve(r))
        : [defaultWorkspace],
      allowedCommands: policy?.allowedCommands ?? ['node --version', 'npm --version', 'git --version'],
      blockedTools: policy?.blockedTools ?? []
    };
    this.eventBus = eventBus;
    this.logger = logger?.child('PermissionManager');
  }

  /**
   * Evaluate whether a tool execution is ALLOWED, DENIED, or REQUIRES_APPROVAL.
   */
  public evaluate(
    tool: ITool,
    input: Record<string, unknown>,
    context: ToolExecutionContext
  ): PermissionEvaluationResult {
    // 1. Check if tool is explicitly blocked
    if (this.policy.blockedTools?.includes(tool.id)) {
      return {
        decision: 'DENY',
        reason: `Tool '${tool.id}' is explicitly blocked by current system security policy.`,
        riskLevel: tool.riskLevel,
        requiresApproval: false
      };
    }

    // 2. Filesystem sandbox path validation
    if (tool.category === 'filesystem') {
      const targetPath = (input.path as string) || (input.filePath as string) || (input.directoryPath as string);
      if (targetPath) {
        const pathValidation = this.validateWorkspaceBoundary(targetPath, context.workspaceRoot);
        if (!pathValidation.allowed) {
          return {
            decision: 'DENY',
            reason: pathValidation.reason,
            riskLevel: tool.riskLevel,
            requiresApproval: false
          };
        }
      }
    }

    // 3. If an approval ID is provided in execution context, verify its validity
    if (context.approvalId) {
      const approval = this.approvals.get(context.approvalId);
      if (!approval) {
        return {
          decision: 'DENY',
          reason: `Approval request '${context.approvalId}' was not found.`,
          riskLevel: tool.riskLevel,
          requiresApproval: true
        };
      }

      if (approval.toolId !== tool.id) {
        return {
          decision: 'DENY',
          reason: `Approval request '${context.approvalId}' was issued for tool '${approval.toolId}', not '${tool.id}'.`,
          riskLevel: tool.riskLevel,
          requiresApproval: true
        };
      }

      const now = Date.now();
      const expiresAt = new Date(approval.expiresAt).getTime();
      if (now > expiresAt) {
        return {
          decision: 'DENY',
          reason: `Approval request '${context.approvalId}' has expired.`,
          riskLevel: tool.riskLevel,
          requiresApproval: true
        };
      }

      if (approval.status === 'approved') {
        return {
          decision: 'ALLOW',
          reason: `Approved by human authority '${approval.resolvedBy || 'root'}' at ${approval.resolvedAt}.`,
          riskLevel: tool.riskLevel,
          requiresApproval: false,
          approvalRequest: approval
        };
      }

      if (approval.status === 'rejected') {
        return {
          decision: 'DENY',
          reason: `Approval request was rejected: ${approval.resolutionReason || 'No reason provided'}.`,
          riskLevel: tool.riskLevel,
          requiresApproval: true,
          approvalRequest: approval
        };
      }

      // Still pending
      return {
        decision: 'REQUIRE_APPROVAL',
        reason: `Action is awaiting human authorization (approval id: ${approval.id}).`,
        riskLevel: tool.riskLevel,
        requiresApproval: true,
        approvalRequest: approval
      };
    }

    // 4. Check if the tool requires explicit human approval
    const needsApproval = tool.requiresApproval ||
      requiresHumanApproval(tool.riskLevel) ||
      tool.riskLevel > this.policy.maxAutonomousTier;

    if (needsApproval) {
      const approvalRequest = this.createApprovalRequest(tool, input, context);
      this.logger?.warn(
        `Action requires human approval: tool [${tool.id}] (Risk: ${DANGER_TIER_NAMES[tool.riskLevel]}). Approval ID: ${approvalRequest.id}`
      );
      return {
        decision: 'REQUIRE_APPROVAL',
        reason: `Action requires human authorization: tool '${tool.id}' has risk tier ${DANGER_TIER_NAMES[tool.riskLevel]}.`,
        riskLevel: tool.riskLevel,
        requiresApproval: true,
        approvalRequest
      };
    }

    // 5. Tool is within autonomous tier bounds and authorized
    return {
      decision: 'ALLOW',
      reason: `Autonomous execution permitted under active policy (Risk: ${DANGER_TIER_NAMES[tool.riskLevel]} <= MaxAutonomous: ${DANGER_TIER_NAMES[this.policy.maxAutonomousTier]}).`,
      riskLevel: tool.riskLevel,
      requiresApproval: false
    };
  }

  /**
   * Validate that a filesystem path resides strictly inside an authorized workspace root.
   * Traversal outside workspace (e.g. ../, Windows System32) is strictly rejected.
   */
  public validateWorkspaceBoundary(
    targetPath: string,
    contextRoot?: string
  ): { allowed: boolean; reason: string; resolvedPath: string } {
    const activeRoots = contextRoot
      ? [path.resolve(contextRoot), ...this.policy.allowedWorkspaceRoots]
      : this.policy.allowedWorkspaceRoots;

    // Resolve absolute path relative to context root or process cwd
    const baseDir = contextRoot ? path.resolve(contextRoot) : this.policy.allowedWorkspaceRoots[0];
    const resolved = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(baseDir, targetPath);

    // Normalize for case-insensitive comparison on Windows
    const normalizedTarget = path.normalize(resolved).toLowerCase();

    for (const root of activeRoots) {
      const normalizedRoot = path.normalize(root).toLowerCase();
      if (
        normalizedTarget === normalizedRoot ||
        normalizedTarget.startsWith(normalizedRoot + path.sep)
      ) {
        return {
          allowed: true,
          reason: `Path is within authorized workspace root: ${root}`,
          resolvedPath: resolved
        };
      }
    }

    return {
      allowed: false,
      reason: `Access denied: target path '${targetPath}' (${resolved}) is outside authorized workspace roots: [${activeRoots.join(', ')}]. Path traversal is strictly prohibited.`,
      resolvedPath: resolved
    };
  }

  /**
   * Create an approval request for a sensitive/dangerous action.
   */
  public createApprovalRequest(
    tool: ITool,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    expirationMinutes = 10
  ): ApprovalRequest {
    const id = `apr_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

    const request: ApprovalRequest = {
      id,
      toolId: tool.id,
      risk: tool.riskLevel,
      description: `Execution of ${tool.name} (${tool.id}) requested by user '${context.userId}'`,
      requestedBy: context.userId,
      requestedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      inputSummary: this.sanitizeInputSummary(input)
    };

    this.approvals.set(id, request);

    this.eventBus?.emit('tool.approval.requested', {
      approvalId: id,
      toolId: tool.id,
      riskLevel: tool.riskLevel,
      expiresAt: request.expiresAt
    });

    return request;
  }

  /**
   * Human approver explicitly grants approval for a pending request.
   */
  public approve(approvalId: string, approver: string): ApprovalRequest {
    const existing = this.approvals.get(approvalId);
    if (!existing) {
      throw new Error(`Approval request '${approvalId}' not found.`);
    }

    if (existing.status !== 'pending') {
      throw new Error(`Cannot approve request '${approvalId}': current status is '${existing.status}'.`);
    }

    const updated: ApprovalRequest = {
      ...existing,
      status: 'approved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: approver,
      resolutionReason: 'Approved by authorized operator'
    };

    this.approvals.set(approvalId, updated);
    this.logger?.info(`Approval request '${approvalId}' APPROVED by '${approver}' for tool '${updated.toolId}'.`);

    this.eventBus?.emit('tool.approval.resolved', {
      approvalId,
      status: 'approved',
      resolvedBy: approver
    });

    return updated;
  }

  /**
   * Human approver rejects a pending approval request.
   */
  public reject(approvalId: string, reason: string, rejecter: string): ApprovalRequest {
    const existing = this.approvals.get(approvalId);
    if (!existing) {
      throw new Error(`Approval request '${approvalId}' not found.`);
    }

    if (existing.status !== 'pending') {
      throw new Error(`Cannot reject request '${approvalId}': current status is '${existing.status}'.`);
    }

    const updated: ApprovalRequest = {
      ...existing,
      status: 'rejected',
      resolvedAt: new Date().toISOString(),
      resolvedBy: rejecter,
      resolutionReason: reason
    };

    this.approvals.set(approvalId, updated);
    this.logger?.info(`Approval request '${approvalId}' REJECTED by '${rejecter}'. Reason: ${reason}`);

    this.eventBus?.emit('tool.approval.resolved', {
      approvalId,
      status: 'rejected',
      resolvedBy: rejecter,
      reason
    });

    return updated;
  }

  public getApproval(approvalId: string): ApprovalRequest | undefined {
    return this.approvals.get(approvalId);
  }

  public getPendingApprovals(): readonly ApprovalRequest[] {
    const now = Date.now();
    return Array.from(this.approvals.values()).filter((a) => {
      if (a.status !== 'pending') return false;
      const exp = new Date(a.expiresAt).getTime();
      return now <= exp;
    });
  }

  public getPolicy(): IPermissionPolicy {
    return this.policy;
  }

  private sanitizeInputSummary(input: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (/password|secret|key|token|auth|credential/i.test(k)) {
        clean[k] = '[REDACTED]';
      } else if (typeof v === 'string' && v.length > 200) {
        clean[k] = `${v.substring(0, 197)}...`;
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }
}
