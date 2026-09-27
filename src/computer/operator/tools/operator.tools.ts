/**
 * HṚṢĪKEŚA (हृषीकेश) — Computer Operator Tools
 *
 * Phase 22: High-level ITool implementations for desktop observation, action execution,
 * and autonomous computer task orchestration registered in ToolRegistry.
 */

import { ITool } from '../../../tools/interfaces/tool.types.js';
import { DangerTier } from '../../../tools/interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../../tools/interfaces/execution.types.js';
import { ComputerOperator } from '../services/computer.operator.js';

export function createComputerOperatorTools(operator: ComputerOperator): ITool[] {
  // 1. Observe Desktop Tool
  const observeTool: ITool<{ maxDepth?: number; captureScreenshot?: boolean }, any> = {
    id: 'computer.observe_desktop',
    name: 'Observe Desktop State',
    description: 'Captures a bounded semantic observation of the active desktop, windows, and UI controls.',
    version: '1.0.0',
    category: 'computer',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['computer.observe', 'computer.desktop', 'desktop.read'],
    inputSchema: {
      type: 'object',
      properties: {
        maxDepth: { type: 'integer', description: 'Maximum UI tree traversal depth (default: 3)' },
        captureScreenshot: { type: 'boolean', description: 'Whether to capture screenshot (default: true)' },
      },
    },
    async execute(input, _ctx: ToolExecutionContext): Promise<ToolExecutionResult<any>> {
      const startTime = Date.now();
      try {
        const obs = await operator.observationEngine.observeDesktop(input);
        return {
          success: true,
          output: obs,
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },
  };

  // 2. Execute Computer Task Tool
  const taskTool: ITool<{ intent: string; objective: string; maxActions?: number }, any> = {
    id: 'computer.execute_task',
    name: 'Execute Computer Task',
    description: 'Executes an autonomous, verified multi-step computer operation workflow against desktop applications.',
    version: '1.0.0',
    category: 'computer',
    riskLevel: DangerTier.TIER_2,
    requiresApproval: false,
    capabilities: ['computer.operate', 'computer.task.execute', 'desktop.write'],
    inputSchema: {
      type: 'object',
      properties: {
        intent: { type: 'string', description: 'High level intention of the computer operation' },
        objective: { type: 'string', description: 'Detailed objective steps to plan and execute' },
        maxActions: { type: 'integer', description: 'Maximum actions permitted in this task' },
      },
      required: ['intent', 'objective'],
    },
    async execute(input, ctx: ToolExecutionContext): Promise<ToolExecutionResult<any>> {
      const startTime = Date.now();
      try {
        const res = await operator.executeTask(input.intent, input.objective, {
          maxActions: input.maxActions,
          agentId: ctx.agentId,
          scope: 'DESKTOP',
        });
        return {
          success: res.task.status === 'COMPLETED',
          output: res,
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        };
      }
    },
  };

  return [observeTool, taskTool];
}
