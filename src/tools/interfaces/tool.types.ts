/**
 * HṚṢĪKEŚA (हृषीकेश) — Vendor-Neutral Tool Interface
 */

import { DangerTier } from './danger.types.js';
import { ToolExecutionContext, ToolExecutionResult, JsonSchemaObject } from './execution.types.js';

export type ToolCategory =
  | 'system'
  | 'filesystem'
  | 'ollama'
  | 'terminal'
  | 'browser'
  | 'computer'
  | 'environment'
  | 'mcp'
  | 'multimodal'
  | 'voice'
  | 'vision'
  | 'camera'
  | 'company'
  | 'research'
  | 'knowledge'
  | 'context'
  | 'working_memory'
  | 'self'
  | 'evolution'
  | 'custom';

export interface ITool<TInput = any, TOutput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: ToolCategory;
  readonly inputSchema: JsonSchemaObject;
  readonly outputSchema?: JsonSchemaObject;
  readonly riskLevel: DangerTier;
  readonly requiresApproval: boolean;
  readonly capabilities: readonly string[];

  /**
   * Execute the tool with validated input and runtime context.
   */
  execute(
    input: TInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<TOutput>>;
}
