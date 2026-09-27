/**
 * HṚṢĪKEŚA (हृषीकेश) — Evolution Tools for ToolBus Integration
 *
 * Exposes the Self-Development Gateway capabilities as first-class ITool instances
 * passing through ToolBus validation, permissions, and audit logs.
 */

import { ITool } from '../../../tools/interfaces/tool.types.js';
import { DangerTier } from '../../../tools/interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../../tools/interfaces/execution.types.js';
import { SelfDevelopmentGateway } from './self-development.gateway.js';

export function createEvolutionTools(gateway: SelfDevelopmentGateway): ITool[] {
  const tools: ITool[] = [
    {
      id: 'source.list',
      name: 'List Source Files',
      description: 'Lists files in HṚṢĪKEŚA repository source tree within allowed boundary.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['source.list', 'code.inspection'],
      inputSchema: {
        type: 'object',
        properties: { subPath: { type: 'string', description: 'Subdirectory path' } },
      },
      execute: async (input: { subPath?: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.sourceList(input?.subPath);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'source.read',
      name: 'Read Source File',
      description: 'Reads contents of a source file within HṚṢĪKEŚA repository with secret redaction.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['source.read', 'code.inspection'],
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Relative path to source file' },
          startLine: { type: 'number', description: 'Start line' },
          endLine: { type: 'number', description: 'End line' },
        },
        required: ['filePath'],
      },
      execute: async (input: { filePath: string; startLine?: number; endLine?: number }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.sourceRead(input.filePath, input.startLine, input.endLine);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'source.search',
      name: 'Search Source Code',
      description: 'Searches text or regex across the HṚṢĪKEŚA source tree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['source.search', 'code.search'],
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term or pattern' },
          isRegex: { type: 'boolean', description: 'Regex search' },
        },
        required: ['query'],
      },
      execute: async (input: { query: string; isRegex?: boolean }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.sourceSearch(input.query, input.isRegex);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'source.diff',
      name: 'Source Git Diff',
      description: 'Retrieves current Git diff of working directory against ref.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['source.diff'],
      inputSchema: {
        type: 'object',
        properties: { targetRef: { type: 'string', description: 'Git ref or commit' } },
      },
      execute: async (input: { targetRef?: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.sourceDiff(input?.targetRef);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'source.symbols',
      name: 'Extract Source Symbols',
      description: 'Extracts classes, interfaces, and functions from a source file.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['source.symbols'],
      inputSchema: {
        type: 'object',
        properties: { filePath: { type: 'string', description: 'File path' } },
        required: ['filePath'],
      },
      execute: async (input: { filePath: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.sourceSymbols(input.filePath);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'source.dependencies',
      name: 'Inspect Dependencies',
      description: 'Inspects active dependencies and devDependencies from package.json.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['source.dependencies'],
      inputSchema: { type: 'object', properties: {} },
      execute: async (_input: Record<string, unknown>, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.sourceDependencies();
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.workspace.create',
      name: 'Create Evolution Worktree',
      description: 'Creates an isolated development worktree for an experiment.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.workspace.create'],
      inputSchema: {
        type: 'object',
        properties: {
          objectiveId: { type: 'string', description: 'Objective ID' },
          experimentId: { type: 'string', description: 'Unique experiment ID' },
        },
        required: ['objectiveId', 'experimentId'],
      },
      execute: async (input: { objectiveId: string; experimentId: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionWorkspaceCreate(input.objectiveId, input.experimentId);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.workspace.reset',
      name: 'Reset Evolution Worktree',
      description: 'Resets an isolated experiment worktree back to baseline.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.workspace.reset'],
      inputSchema: {
        type: 'object',
        properties: { experimentId: { type: 'string', description: 'Experiment ID' } },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionWorkspaceReset(input.experimentId);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.workspace.delete',
      name: 'Delete Evolution Worktree',
      description: 'Cleans up and removes an isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.workspace.delete'],
      inputSchema: {
        type: 'object',
        properties: { experimentId: { type: 'string', description: 'Experiment ID' } },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionWorkspaceDelete(input.experimentId);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.file.create',
      name: 'Create File In Worktree',
      description: 'Creates a file inside the isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.file.create'],
      inputSchema: {
        type: 'object',
        properties: {
          experimentId: { type: 'string', description: 'Experiment ID' },
          relativePath: { type: 'string', description: 'Relative path in worktree' },
          content: { type: 'string', description: 'File content' },
        },
        required: ['experimentId', 'relativePath', 'content'],
      },
      execute: async (input: { experimentId: string; relativePath: string; content: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionFileCreate(input.experimentId, input.relativePath, input.content);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.file.modify',
      name: 'Modify File In Worktree',
      description: 'Modifies code in a file strictly inside the isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.file.modify'],
      inputSchema: {
        type: 'object',
        properties: {
          experimentId: { type: 'string', description: 'Experiment ID' },
          relativePath: { type: 'string', description: 'Relative path in worktree' },
          targetContent: { type: 'string', description: 'Target string to replace' },
          replacementContent: { type: 'string', description: 'Replacement string' },
          startLine: { type: 'number', description: 'Optional start line' },
          endLine: { type: 'number', description: 'Optional end line' },
        },
        required: ['experimentId', 'relativePath', 'targetContent', 'replacementContent'],
      },
      execute: async (
        input: {
          experimentId: string;
          relativePath: string;
          targetContent: string;
          replacementContent: string;
          startLine?: number;
          endLine?: number;
        },
        _ctx: ToolExecutionContext
      ): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionFileModify(
          input.experimentId,
          input.relativePath,
          input.targetContent,
          input.replacementContent,
          input.startLine,
          input.endLine
        );
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.file.delete',
      name: 'Delete File In Worktree',
      description: 'Deletes a file strictly inside the isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.file.delete'],
      inputSchema: {
        type: 'object',
        properties: {
          experimentId: { type: 'string', description: 'Experiment ID' },
          relativePath: { type: 'string', description: 'Relative path' },
        },
        required: ['experimentId', 'relativePath'],
      },
      execute: async (input: { experimentId: string; relativePath: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionFileDelete(input.experimentId, input.relativePath);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.file.rename',
      name: 'Rename File In Worktree',
      description: 'Renames a file strictly inside the isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.file.rename'],
      inputSchema: {
        type: 'object',
        properties: {
          experimentId: { type: 'string', description: 'Experiment ID' },
          oldPath: { type: 'string', description: 'Original relative path' },
          newPath: { type: 'string', description: 'New relative path' },
        },
        required: ['experimentId', 'oldPath', 'newPath'],
      },
      execute: async (input: { experimentId: string; oldPath: string; newPath: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionFileRename(input.experimentId, input.oldPath, input.newPath);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.build',
      name: 'Build Worktree',
      description: 'Runs build in isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.build'],
      inputSchema: {
        type: 'object',
        properties: { experimentId: { type: 'string', description: 'Experiment ID' } },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionBuild(input.experimentId);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.typecheck',
      name: 'Typecheck Worktree',
      description: 'Executes TypeScript typecheck in isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.typecheck'],
      inputSchema: {
        type: 'object',
        properties: { experimentId: { type: 'string', description: 'Experiment ID' } },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionTypecheck(input.experimentId);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.lint',
      name: 'Lint Worktree',
      description: 'Executes static analysis / lint in isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.lint'],
      inputSchema: {
        type: 'object',
        properties: { experimentId: { type: 'string', description: 'Experiment ID' } },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionLint(input.experimentId);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.test',
      name: 'Run Worktree Tests',
      description: 'Executes test suite or targeted tests in isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.test'],
      inputSchema: {
        type: 'object',
        properties: {
          experimentId: { type: 'string', description: 'Experiment ID' },
          testPattern: { type: 'string', description: 'Optional test file or pattern' },
        },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string; testPattern?: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionTest(input.experimentId, input.testPattern);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.benchmark',
      name: 'Run Benchmark Comparison',
      description: 'Evaluates candidate metric against baseline measurement.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['evolution.benchmark'],
      inputSchema: {
        type: 'object',
        properties: {
          experimentId: { type: 'string', description: 'Experiment ID' },
          metricName: { type: 'string', description: 'Metric name' },
          candidateValue: { type: 'number', description: 'Measured candidate value' },
          baselineValue: { type: 'number', description: 'Baseline value' },
          lowerIsBetter: { type: 'boolean', description: 'Whether lower is better' },
        },
        required: ['experimentId', 'metricName', 'candidateValue', 'baselineValue'],
      },
      execute: async (
        input: {
          experimentId: string;
          metricName: string;
          candidateValue: number;
          baselineValue: number;
          lowerIsBetter?: boolean;
        },
        _ctx: ToolExecutionContext
      ): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionBenchmark(
          input.experimentId,
          input.metricName,
          input.candidateValue,
          input.baselineValue,
          input.lowerIsBetter
        );
        return { success: res.overallPassed, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.git.status',
      name: 'Worktree Git Status',
      description: 'Returns Git status of the isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['evolution.git.status'],
      inputSchema: {
        type: 'object',
        properties: { experimentId: { type: 'string', description: 'Experiment ID' } },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionGitStatus(input.experimentId);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.git.diff',
      name: 'Worktree Git Diff',
      description: 'Returns Git diff for isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_0,
      requiresApproval: false,
      capabilities: ['evolution.git.diff'],
      inputSchema: {
        type: 'object',
        properties: {
          experimentId: { type: 'string', description: 'Experiment ID' },
          filePath: { type: 'string', description: 'Optional specific file path' },
        },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string; filePath?: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionGitDiff(input.experimentId, input.filePath);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.git.checkpoint',
      name: 'Create Worktree Checkpoint',
      description: 'Creates a Git commit / checkpoint within the isolated experiment worktree.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.git.checkpoint'],
      inputSchema: {
        type: 'object',
        properties: {
          experimentId: { type: 'string', description: 'Experiment ID' },
          message: { type: 'string', description: 'Checkpoint message' },
        },
        required: ['experimentId', 'message'],
      },
      execute: async (input: { experimentId: string; message: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionGitCheckpoint(input.experimentId, input.message);
        return { success: true, output: res, durationMs: Date.now() - start };
      },
    },
    {
      id: 'evolution.git.rollback',
      name: 'Rollback Worktree Changes',
      description: 'Rolls back all uncommitted or experimental changes in worktree back to baseline commit.',
      version: '1.0.0',
      category: 'evolution',
      riskLevel: DangerTier.TIER_1,
      requiresApproval: false,
      capabilities: ['evolution.git.rollback'],
      inputSchema: {
        type: 'object',
        properties: { experimentId: { type: 'string', description: 'Experiment ID' } },
        required: ['experimentId'],
      },
      execute: async (input: { experimentId: string }, _ctx: ToolExecutionContext): Promise<ToolExecutionResult> => {
        const start = Date.now();
        const res = await gateway.evolutionGitRollback(input.experimentId);
        return { success: res.success, output: res, durationMs: Date.now() - start };
      },
    },
  ];

  return tools;
}
