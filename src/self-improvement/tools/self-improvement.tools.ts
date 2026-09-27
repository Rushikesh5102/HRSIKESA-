/**
 * HṚṢĪKEŚA (हृषीकेश) — Self-Improvement & Self-Maintenance Tools
 */

import { ITool } from '../../tools/interfaces/tool.types.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../tools/interfaces/execution.types.js';
import { SelfImprovementCoordinator } from '../services/self-improvement-coordinator.js';
import { ImprovementCategory, MaintenanceJobType } from '../interfaces/self-improvement.types.js';

export function createSelfImprovementTools(coordinator: SelfImprovementCoordinator): ITool[] {
  const healthInspectTool: ITool = {
    id: 'self.health.inspect',
    name: 'Inspect System Self-Health',
    description: 'Inspects HṚṢĪKEŚA system health across all subsystems, active anomalies, and proposals.',
    version: '1.0.0',
    category: 'self',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['self.health.inspect', 'system.health'],
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Optional company ID filter' },
      },
    },
    execute: async (input: { companyId?: string }, _context: ToolExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const health = coordinator.healthService.evaluateHealth(input?.companyId);
      return {
        success: true,
        output: { health },
        durationMs: Date.now() - startTime,
      };
    },
  };

  const anomaliesListTool: ITool = {
    id: 'self.anomalies.list',
    name: 'List System Anomalies',
    description: 'Lists active and historical operational anomalies and error clusters.',
    version: '1.0.0',
    category: 'self',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['self.anomalies.list', 'system.diagnostics'],
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by anomaly status' },
        severity: { type: 'string', description: 'Filter by severity' },
        component: { type: 'string', description: 'Filter by component' },
        companyId: { type: 'string', description: 'Filter by company ID' },
      },
    },
    execute: async (
      input: { status?: string; severity?: string; component?: string; companyId?: string },
      _context: ToolExecutionContext
    ): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const anomalies = coordinator.repository.listAnomalies(input);
      return {
        success: true,
        output: { count: anomalies.length, anomalies },
        durationMs: Date.now() - startTime,
      };
    },
  };

  const proposalsManageTool: ITool = {
    id: 'self.proposals.manage',
    name: 'Manage Improvement Proposals',
    description: 'Creates or transitions structured improvement proposals.',
    version: '1.0.0',
    category: 'self',
    riskLevel: DangerTier.TIER_1,
    requiresApproval: false,
    capabilities: ['self.proposals.manage', 'system.self_improvement'],
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['CREATE', 'TRANSITION', 'LIST', 'GET'] },
        proposalId: { type: 'string' },
        newState: { type: 'string' },
        companyId: { type: 'string' },
        title: { type: 'string' },
        category: { type: 'string' },
        problemStatement: { type: 'string' },
        expectedBenefit: { type: 'string' },
        affectedComponents: { type: 'array', items: { type: 'string' } },
        proposedImplementation: { type: 'string' },
        rollbackStrategy: { type: 'string' },
        testPlan: { type: 'string' },
      },
    },
    execute: async (input: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      if (input.action === 'CREATE') {
        const prop = coordinator.proposalService.createProposal({
          companyId: input.companyId,
          title: input.title,
          category: input.category as ImprovementCategory,
          problemStatement: input.problemStatement,
          evidenceSummary: 'Manual proposal creation via Tool Bus',
          expectedBenefit: input.expectedBenefit,
          affectedComponents: input.affectedComponents || ['core'],
          proposedImplementation: input.proposedImplementation,
          rollbackStrategy: input.rollbackStrategy,
          testPlan: input.testPlan,
          createdByAgent: 'kali',
        });
        return {
          success: true,
          output: { proposal: prop },
          durationMs: Date.now() - startTime,
        };
      } else if (input.action === 'TRANSITION') {
        const updated = coordinator.proposalService.transitionState(input.proposalId, input.newState);
        return {
          success: true,
          output: { proposal: updated },
          durationMs: Date.now() - startTime,
        };
      } else if (input.action === 'GET') {
        const prop = coordinator.repository.getProposalById(input.proposalId);
        return {
          success: true,
          output: { proposal: prop },
          durationMs: Date.now() - startTime,
        };
      } else {
        const list = coordinator.repository.listProposals({ companyId: input.companyId });
        return {
          success: true,
          output: { count: list.length, proposals: list },
          durationMs: Date.now() - startTime,
        };
      }
    },
  };

  const changesetSandboxTool: ITool = {
    id: 'self.changeset.sandbox',
    name: 'Sandbox Improvement ChangeSet',
    description: 'Creates and tests an isolated changeset in sandbox environment.',
    version: '1.0.0',
    category: 'self',
    riskLevel: DangerTier.TIER_1,
    requiresApproval: false,
    capabilities: ['self.changeset.sandbox', 'system.sandbox'],
    inputSchema: {
      type: 'object',
      required: ['proposalId', 'files', 'summary'],
      properties: {
        proposalId: { type: 'string' },
        summary: { type: 'string' },
        files: { type: 'array' },
      },
    },
    execute: async (input: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const cs = coordinator.changesetService.createChangeSet({
        proposalId: input.proposalId,
        summary: input.summary,
        files: input.files,
      });
      const testRes = await coordinator.sandboxService.runSandboxedVerification({
        proposalId: input.proposalId,
        changeSetId: cs.id,
      });
      return {
        success: true,
        output: { changeset: cs, testResult: testRes },
        durationMs: Date.now() - startTime,
      };
    },
  };

  const benchmarkRunTool: ITool = {
    id: 'self.benchmark.run',
    name: 'Run Improvement Benchmark',
    description: 'Runs benchmark comparison for an improvement proposal.',
    version: '1.0.0',
    category: 'self',
    riskLevel: DangerTier.TIER_1,
    requiresApproval: false,
    capabilities: ['self.benchmark.run', 'system.benchmarks'],
    inputSchema: {
      type: 'object',
      required: ['proposalId', 'changeSetId', 'metricName', 'unit', 'beforeValue', 'afterValue'],
      properties: {
        proposalId: { type: 'string' },
        changeSetId: { type: 'string' },
        metricName: { type: 'string' },
        unit: { type: 'string' },
        beforeValue: { type: 'number' },
        afterValue: { type: 'number' },
        lowerIsBetter: { type: 'boolean' },
      },
    },
    execute: async (input: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const bm = coordinator.benchmarkService.runBenchmark(input);
      return {
        success: true,
        output: { benchmark: bm },
        durationMs: Date.now() - startTime,
      };
    },
  };

  const maintenanceExecuteTool: ITool = {
    id: 'self.maintenance.execute',
    name: 'Execute Self-Maintenance Job',
    description: 'Executes bounded system maintenance (temp file cleanup, cache rebuild, etc.).',
    version: '1.0.0',
    category: 'self',
    riskLevel: DangerTier.TIER_2,
    requiresApproval: false,
    capabilities: ['self.maintenance.execute', 'system.maintenance'],
    inputSchema: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string' },
        target: { type: 'string' },
      },
    },
    execute: async (input: { type: string; target?: string }, _context: ToolExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const job = await coordinator.maintenanceService.executeMaintenance(
        input.type as MaintenanceJobType,
        input.target || 'system'
      );
      return {
        success: true,
        output: { job },
        durationMs: Date.now() - startTime,
      };
    },
  };

  return [
    healthInspectTool,
    anomaliesListTool,
    proposalsManageTool,
    changesetSandboxTool,
    benchmarkRunTool,
    maintenanceExecuteTool,
  ];
}
