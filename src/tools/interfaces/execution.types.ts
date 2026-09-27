/**
 * HṚṢĪKEŚA (हृषीकेश) — Tool Execution Context & Result Types
 */

export interface ToolExecutionContext {
  readonly requestId: string;
  readonly sessionId?: string;
  readonly projectId?: string;
  readonly agentId?: string;
  readonly userId: string;
  readonly environment: 'development' | 'production' | 'test';
  readonly workspaceRoot: string;
  readonly approvalId?: string;
}

export interface ToolExecutionResult<T = unknown> {
  readonly success: boolean;
  readonly output?: T;
  readonly error?: string;
  readonly durationMs: number;
  readonly auditRecordId?: string;
}

export interface JsonSchemaProperty {
  readonly type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  readonly description?: string;
  readonly enum?: readonly (string | number)[];
  readonly default?: unknown;
  readonly items?: JsonSchemaProperty;
  readonly properties?: Record<string, JsonSchemaProperty>;
  readonly required?: readonly string[];
}

export interface JsonSchemaObject extends Record<string, unknown> {
  readonly type: 'object';
  readonly properties: Record<string, JsonSchemaProperty>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}
