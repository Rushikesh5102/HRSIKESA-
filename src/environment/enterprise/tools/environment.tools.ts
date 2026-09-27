/**
 * HṚṢĪKEŚA (हृषीकेश) — Enterprise Environment Tools
 *
 * Phase 23: Exposes environment discovery, connection, remote execution, and inspection
 * tools to the ToolRegistry and ToolExecutionBus.
 */

import { ITool } from '../../../tools/interfaces/tool.types.js';
import { DangerTier } from '../../../tools/interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../../tools/interfaces/execution.types.js';
import { EnvironmentRegistry } from '../services/environment.registry.js';
import { EnvironmentTrustLevel } from '../interfaces/environment.types.js';

export function createEnterpriseEnvironmentTools(registry: EnvironmentRegistry): ITool[] {
  const listEnvironmentsTool: ITool = {
    id: 'environment.list',
    name: 'List Environments',
    description: 'Lists registered external, remote, cloud, and local environments with status and trust levels.',
    version: '1.0.0',
    category: 'environment',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['environment.read'],
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filter by environment type (SSH, RDP, CLOUD, etc.)' },
        status: { type: 'string', description: 'Filter by lifecycle status' },
      },
    },
    async execute(input: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const envs = await registry.listEnvironments(input);
        return {
          success: true,
          output: envs,
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

  const inspectEnvironmentTool: ITool = {
    id: 'environment.inspect',
    name: 'Inspect Environment',
    description: 'Inspects and captures the fingerprint and capabilities of an environment.',
    version: '1.0.0',
    category: 'environment',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['environment.inspect'],
    inputSchema: {
      type: 'object',
      properties: {
        environmentId: { type: 'string', description: 'Target environment ID' },
      },
      required: ['environmentId'],
    },
    async execute(input: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const env = await registry.inspectEnvironment(input.environmentId);
        return {
          success: true,
          output: env,
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

  const authorizeEnvironmentTool: ITool = {
    id: 'environment.authorize',
    name: 'Authorize Environment',
    description: 'Authorizes an environment for operational use with an assigned trust level.',
    version: '1.0.0',
    category: 'environment',
    riskLevel: DangerTier.TIER_3,
    requiresApproval: true,
    capabilities: ['environment.authorize'],
    inputSchema: {
      type: 'object',
      properties: {
        environmentId: { type: 'string', description: 'Target environment ID' },
        trustLevel: { type: 'string', enum: ['TRUSTED', 'USER_APPROVED', 'REVIEWED'] },
      },
      required: ['environmentId'],
    },
    async execute(input: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const env = await registry.authorizeEnvironment(
          input.environmentId,
          input.trustLevel as EnvironmentTrustLevel || EnvironmentTrustLevel.TRUSTED,
        );
        return {
          success: true,
          output: env,
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

  const connectEnvironmentTool: ITool = {
    id: 'environment.connect',
    name: 'Connect Environment',
    description: 'Establishes a session with an authorized environment.',
    version: '1.0.0',
    category: 'environment',
    riskLevel: DangerTier.TIER_2,
    requiresApproval: false,
    capabilities: ['environment.connect'],
    inputSchema: {
      type: 'object',
      properties: {
        environmentId: { type: 'string', description: 'Target environment ID' },
      },
      required: ['environmentId'],
    },
    async execute(input: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const session = await registry.connect(input.environmentId, context.agentId);
        return {
          success: true,
          output: session,
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

  const disconnectEnvironmentTool: ITool = {
    id: 'environment.disconnect',
    name: 'Disconnect Environment',
    description: 'Disconnects and terminates all active sessions for an environment.',
    version: '1.0.0',
    category: 'environment',
    riskLevel: DangerTier.TIER_1,
    requiresApproval: false,
    capabilities: ['environment.disconnect'],
    inputSchema: {
      type: 'object',
      properties: {
        environmentId: { type: 'string', description: 'Target environment ID' },
      },
      required: ['environmentId'],
    },
    async execute(input: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        await registry.disconnect(input.environmentId);
        return {
          success: true,
          output: { message: `Disconnected environment ${input.environmentId}` },
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

  const executeRemoteCommandTool: ITool = {
    id: 'environment.execute',
    name: 'Execute Remote Command',
    description: 'Executes a command on an authorized environment subject to policy and audit.',
    version: '1.0.0',
    category: 'environment',
    riskLevel: DangerTier.TIER_2,
    requiresApproval: false,
    capabilities: ['terminal.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        environmentId: { type: 'string', description: 'Target environment ID' },
        command: { type: 'string', description: 'Command string to execute' },
        timeoutMs: { type: 'number', description: 'Optional timeout in ms' },
      },
      required: ['environmentId', 'command'],
    },
    async execute(input: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const result = await registry.executeCommand(input.environmentId, input.command, {
          timeoutMs: input.timeoutMs,
          agentId: context.agentId,
        });
        return {
          success: result.success,
          output: result,
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

  const checkEnvironmentHealthTool: ITool = {
    id: 'environment.health',
    name: 'Check Environment Health',
    description: 'Checks latency, CPU, memory, and status of an environment.',
    version: '1.0.0',
    category: 'environment',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['environment.health'],
    inputSchema: {
      type: 'object',
      properties: {
        environmentId: { type: 'string', description: 'Target environment ID' },
      },
      required: ['environmentId'],
    },
    async execute(input: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const health = await registry.checkHealth(input.environmentId);
        return {
          success: true,
          output: health,
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

  return [
    listEnvironmentsTool,
    inspectEnvironmentTool,
    authorizeEnvironmentTool,
    connectEnvironmentTool,
    disconnectEnvironmentTool,
    executeRemoteCommandTool,
    checkEnvironmentHealthTool,
  ];
}

export const createEnvironmentTools = createEnterpriseEnvironmentTools;
