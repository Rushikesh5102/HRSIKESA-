/**
 * HṚṢĪKEŚA (हृषीकेश) — Tool Execution Bus
 */

import { randomUUID } from 'node:crypto';
import { ToolRegistry } from '../registry/tool.registry.js';
import { PermissionManager } from '../permissions/permission.manager.js';
import { ToolAuditManager } from '../audit/tool.audit.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from '../interfaces/execution.types.js';
import { ILogger } from '../../core/logging/logger.types.js';
import { EventBus } from '../../core/events/event-bus.js';

export class ToolExecutionBus {
  private readonly registry: ToolRegistry;
  private readonly permissions: PermissionManager;
  private readonly audit: ToolAuditManager;
  private readonly logger?: ILogger;
  private readonly eventBus?: EventBus;

  constructor(
    registry: ToolRegistry,
    permissions: PermissionManager,
    audit: ToolAuditManager,
    eventBus?: EventBus,
    logger?: ILogger
  ) {
    this.registry = registry;
    this.permissions = permissions;
    this.audit = audit;
    this.eventBus = eventBus;
    this.logger = logger?.child('ToolExecutionBus');
  }

  /**
   * Execute a tool through the rigorous security and audit pipeline.
   * 
   * Pipeline:
   * Request -> Validate Tool -> Validate Input Schema -> Permission Check
   *         -> Approval Check -> Execute -> Validate Result -> Audit -> Return
   */
  public async execute(
    toolId: string,
    rawInput: Record<string, unknown> = {},
    partialContext?: Partial<ToolExecutionContext>
  ): Promise<ToolExecutionResult> {
    const requestId = partialContext?.requestId || `req_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const context: ToolExecutionContext = {
      requestId,
      sessionId: partialContext?.sessionId,
      projectId: partialContext?.projectId,
      agentId: partialContext?.agentId,
      userId: partialContext?.userId || 'ROOT_RUSHIKESH',
      environment: partialContext?.environment || 'development',
      workspaceRoot: partialContext?.workspaceRoot || process.cwd(),
      approvalId: partialContext?.approvalId
    };

    const startTime = Date.now();

    // 1. Validate tool exists in registry
    const tool = this.registry.get(toolId);
    if (!tool) {
      const errorMsg = `Tool '${toolId}' is not registered in the system.`;
      const auditRec = this.audit.record({
        requestId,
        sessionId: context.sessionId,
        toolId,
        rawInput,
        riskLevel: 0,
        permissionDecision: 'DENY',
        executionStatus: 'failed',
        durationMs: 0,
        errorSummary: errorMsg,
        userId: context.userId
      });

      return {
        success: false,
        error: errorMsg,
        durationMs: 0,
        auditRecordId: auditRec.id
      };
    }

    // 2. Validate input schema
    const schemaValidation = this.validateInputSchema(tool.inputSchema, rawInput);
    if (!schemaValidation.valid) {
      const errorMsg = `Input schema validation failed for tool '${toolId}': ${schemaValidation.errors.join('; ')}`;
      const auditRec = this.audit.record({
        requestId,
        sessionId: context.sessionId,
        toolId,
        rawInput,
        riskLevel: tool.riskLevel,
        permissionDecision: 'DENY',
        executionStatus: 'failed',
        durationMs: 0,
        errorSummary: errorMsg,
        userId: context.userId
      });

      return {
        success: false,
        error: errorMsg,
        durationMs: 0,
        auditRecordId: auditRec.id
      };
    }

    // 3. Permission & Approval Evaluation (NEVER execute before permission check)
    const permResult = this.permissions.evaluate(tool, rawInput, context);

    if (permResult.decision === 'DENY') {
      const durationMs = Date.now() - startTime;
      const auditRec = this.audit.record({
        requestId,
        sessionId: context.sessionId,
        toolId,
        rawInput,
        riskLevel: tool.riskLevel,
        permissionDecision: 'DENY',
        executionStatus: 'denied',
        durationMs,
        errorSummary: permResult.reason,
        userId: context.userId
      });

      this.logger?.warn(`Tool execution DENIED: [${toolId}] - ${permResult.reason}`);

      return {
        success: false,
        error: `Execution Denied: ${permResult.reason}`,
        durationMs,
        auditRecordId: auditRec.id
      };
    }

    if (permResult.decision === 'REQUIRE_APPROVAL') {
      const durationMs = Date.now() - startTime;
      const approvalId = permResult.approvalRequest?.id;
      const auditRec = this.audit.record({
        requestId,
        sessionId: context.sessionId,
        toolId,
        rawInput,
        riskLevel: tool.riskLevel,
        permissionDecision: 'REQUIRE_APPROVAL',
        approvalId,
        executionStatus: 'pending_approval',
        durationMs,
        errorSummary: `Awaiting human approval (Approval ID: ${approvalId})`,
        userId: context.userId
      });

      this.logger?.info(`Tool execution pending human approval: [${toolId}], approval id: ${approvalId}`);

      return {
        success: false,
        error: `Action requires human authorization: ${permResult.reason} (Approval Request ID: ${approvalId})`,
        durationMs,
        auditRecordId: auditRec.id
      };
    }

    // 4. Execute tool
    this.logger?.info(`Executing tool [${toolId}] for user '${context.userId}' (Risk: ${tool.riskLevel})`);
    this.eventBus?.emit('tool.execution.started', {
      requestId,
      toolId,
      userId: context.userId
    });

    try {
      const result = await tool.execute(rawInput, context);
      const durationMs = Date.now() - startTime;

      const auditRec = this.audit.record({
        requestId,
        sessionId: context.sessionId,
        toolId,
        rawInput,
        riskLevel: tool.riskLevel,
        permissionDecision: 'ALLOW',
        approvalId: context.approvalId,
        executionStatus: result.success ? 'success' : 'failed',
        durationMs,
        errorSummary: result.error,
        userId: context.userId
      });

      this.eventBus?.emit('tool.execution.completed', {
        requestId,
        toolId,
        success: result.success,
        durationMs
      });

      return {
        ...result,
        durationMs,
        auditRecordId: auditRec.id
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      const auditRec = this.audit.record({
        requestId,
        sessionId: context.sessionId,
        toolId,
        rawInput,
        riskLevel: tool.riskLevel,
        permissionDecision: 'ALLOW',
        approvalId: context.approvalId,
        executionStatus: 'failed',
        durationMs,
        errorSummary: errorMsg,
        userId: context.userId
      });

      this.logger?.error(`Tool execution failed with exception: [${toolId}]`, { error: errorMsg });

      return {
        success: false,
        error: `Tool execution threw error: ${errorMsg}`,
        durationMs,
        auditRecordId: auditRec.id
      };
    }
  }

  /**
   * Lightweight JSON schema validation conforming to standard types.
   */
  public validateInputSchema(
    schema: JsonSchemaObject,
    input: unknown
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { valid: false, errors: ['Input must be a JSON object.'] };
    }

    const obj = input as Record<string, unknown>;

    // Check required properties
    if (schema.required) {
      for (const req of schema.required) {
        if (obj[req] === undefined || obj[req] === null) {
          errors.push(`Missing required parameter '${req}'.`);
        }
      }
    }

    // Check property types
    for (const [propName, propDef] of Object.entries(schema.properties)) {
      const val = obj[propName];
      if (val === undefined || val === null) {
        continue;
      }

      switch (propDef.type) {
        case 'string':
          if (typeof val !== 'string') {
            errors.push(`Parameter '${propName}' must be a string, received ${typeof val}.`);
          } else if (propDef.enum && !propDef.enum.includes(val)) {
            errors.push(`Parameter '${propName}' value '${val}' is not one of allowed enum values: [${propDef.enum.join(', ')}].`);
          }
          break;
        case 'number':
          if (typeof val !== 'number' || Number.isNaN(val)) {
            errors.push(`Parameter '${propName}' must be a number.`);
          }
          break;
        case 'integer':
          if (typeof val !== 'number' || !Number.isInteger(val)) {
            errors.push(`Parameter '${propName}' must be an integer.`);
          }
          break;
        case 'boolean':
          if (typeof val !== 'boolean') {
            errors.push(`Parameter '${propName}' must be a boolean.`);
          }
          break;
        case 'array':
          if (!Array.isArray(val)) {
            errors.push(`Parameter '${propName}' must be an array.`);
          }
          break;
        case 'object':
          if (typeof val !== 'object' || Array.isArray(val)) {
            errors.push(`Parameter '${propName}' must be an object.`);
          }
          break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  public getRegistry(): ToolRegistry {
    return this.registry;
  }

  public getPermissions(): PermissionManager {
    return this.permissions;
  }

  public getAudit(): ToolAuditManager {
    return this.audit;
  }
}
