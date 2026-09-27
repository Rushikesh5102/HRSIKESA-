/**
 * HṚṢĪKEŚA (हृषीकेश) — Autonomous Company Operations Tools
 *
 * Tools registered in the ToolRegistry and executed via ToolExecutionBus:
 * - company.operations.status
 * - company.operations.cycle
 * - company.objectives.manage
 * - company.kpis.record
 * - company.orders.manage
 * - company.incidents.manage
 */

import { ITool } from '../../tools/interfaces/tool.types.js';
import { DangerTier } from '../../tools/interfaces/danger.types.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../tools/interfaces/execution.types.js';
import { CompanyAutomationEngine } from '../services/company-automation.engine.js';
import { CompanyHealthService } from '../services/company-health.service.js';
import { CompanyKpiEngine } from '../services/company-kpi.engine.js';
import { CompanyCrmOrderService } from '../services/company-crm-order.service.js';
import { CompanyIncidentManager } from '../services/company-incident.manager.js';
import { CompanyOperationsRepository } from '../repositories/company-operations.repository.js';
import { ObjectiveCategory, ObjectivePriority, MetricSource, OrderLifecycleStage, IncidentSeverity, IncidentStatus } from '../interfaces/company-operations.types.js';
import { randomUUID } from 'crypto';

export function createCompanyTools(
  automationEngine: CompanyAutomationEngine,
  healthService: CompanyHealthService,
  kpiEngine: CompanyKpiEngine,
  crmOrderService: CompanyCrmOrderService,
  incidentManager: CompanyIncidentManager,
  opsRepo: CompanyOperationsRepository
): ITool[] {
  const unwrapInput = (raw: any) => (raw && raw.input !== undefined ? raw.input : raw);

  const statusTool: ITool = {
    id: 'company.operations.status',
    name: 'Company Operations Status',
    description: 'Retrieves current company operating state, health dimensions, active incidents, and KPIs.',
    version: '1.0.0',
    category: 'company',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['company.status'],
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Target company UUID' }
      },
      required: ['companyId']
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const input = unwrapInput(rawInput);
        const companyId = String(input.companyId);
        const state = automationEngine.getCompanyOperatingState(companyId);
        const health = healthService.evaluateCompanyHealth(companyId, automationEngine.isPaused(companyId));
        const kpis = kpiEngine.getKpiSummary(companyId);
        const activeIncidents = incidentManager.getActiveIncidents(companyId);

        return {
          success: true,
          output: {
            companyId,
            state,
            health: health.overallStatus,
            dimensions: health.dimensions,
            kpiSummary: kpis,
            activeIncidentsCount: activeIncidents.length
          },
          durationMs: Date.now() - startTime
        };
      } catch (err: any) {
        return { success: false, error: err.message, durationMs: Date.now() - startTime };
      }
    }
  };

  const cycleTool: ITool = {
    id: 'company.operations.cycle',
    name: 'Company Operating Cycle',
    description: 'Triggers a bounded autonomous operating cycle (OBJECTIVE -> PLAN -> EXECUTE -> VERIFY).',
    version: '1.0.0',
    category: 'company',
    riskLevel: DangerTier.TIER_1,
    requiresApproval: false,
    capabilities: ['company.cycle'],
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Target company UUID' }
      },
      required: ['companyId']
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const input = unwrapInput(rawInput);
        const companyId = String(input.companyId);
        const result = automationEngine.executeOperatingCycle(companyId);
        return { success: true, output: result, durationMs: Date.now() - startTime };
      } catch (err: any) {
        return { success: false, error: err.message, durationMs: Date.now() - startTime };
      }
    }
  };

  const objectiveTool: ITool = {
    id: 'company.objectives.manage',
    name: 'Manage Company Objective',
    description: 'Creates or updates a company objective.',
    version: '1.0.0',
    category: 'company',
    riskLevel: DangerTier.TIER_1,
    requiresApproval: false,
    capabilities: ['company.objectives'],
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Target company UUID' },
        title: { type: 'string', description: 'Title of the objective' },
        category: { type: 'string', description: 'Category: STRATEGIC, PRODUCT, TECHNICAL, etc.' },
        ownerAgentId: { type: 'string', description: 'Authoritative agent owner' }
      },
      required: ['companyId', 'title']
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const input = unwrapInput(rawInput);
        const companyId = String(input.companyId);
        const title = String(input.title);
        const category = (input.category || 'STRATEGIC') as ObjectiveCategory;
        const ownerAgentId = String(input.ownerAgentId || 'aja');

        const now = new Date().toISOString();
        const obj = opsRepo.createObjective({
          id: randomUUID(),
          companyId,
          ownerAgentId,
          title,
          category,
          priority: 'NORMAL' as ObjectivePriority,
          status: 'PENDING',
          budgetAllocated: 0,
          budgetSpent: 0,
          dependencies: [],
          metrics: [],
          riskLevel: 'LOW',
          approvalRequired: false,
          createdAt: now,
          updatedAt: now
        });

        return { success: true, output: obj, durationMs: Date.now() - startTime };
      } catch (err: any) {
        return { success: false, error: err.message, durationMs: Date.now() - startTime };
      }
    }
  };

  const kpiTool: ITool = {
    id: 'company.kpis.record',
    name: 'Record KPI Observation',
    description: 'Records a metric observation for a company KPI.',
    version: '1.0.0',
    category: 'company',
    riskLevel: DangerTier.TIER_0,
    requiresApproval: false,
    capabilities: ['company.kpis'],
    inputSchema: {
      type: 'object',
      properties: {
        kpiId: { type: 'string', description: 'Target KPI UUID' },
        value: { type: 'number', description: 'Observed numeric metric value' },
        source: { type: 'string', description: 'Data source (SYSTEM, MANUAL, etc.)' }
      },
      required: ['kpiId', 'value']
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const input = unwrapInput(rawInput);
        const kpiId = String(input.kpiId);
        const value = Number(input.value);
        const source = (input.source || 'SYSTEM') as MetricSource;
        const result = kpiEngine.recordObservation(kpiId, value, source);
        return { success: true, output: result, durationMs: Date.now() - startTime };
      } catch (err: any) {
        return { success: false, error: err.message, durationMs: Date.now() - startTime };
      }
    }
  };

  const orderTool: ITool = {
    id: 'company.orders.manage',
    name: 'Manage Company Order',
    description: 'Creates or transitions customer order lifecycle.',
    version: '1.0.0',
    category: 'company',
    riskLevel: DangerTier.TIER_1,
    requiresApproval: false,
    capabilities: ['company.orders'],
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order UUID (if transitioning)' },
        companyId: { type: 'string', description: 'Target company UUID' },
        customerId: { type: 'string', description: 'Customer UUID (if creating)' },
        status: { type: 'string', description: 'Target Order status' }
      }
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const input = unwrapInput(rawInput);
        if (input.orderId && input.status) {
          const res = crmOrderService.transitionOrderStatus(
            String(input.orderId),
            input.status as OrderLifecycleStage,
            'hrisekesa',
            'Updated via company tool'
          );
          return { success: true, output: res, durationMs: Date.now() - startTime };
        }
        if (input.companyId && input.customerId) {
          const res = crmOrderService.createOrder({
            companyId: String(input.companyId),
            customerId: String(input.customerId),
            items: [{ productId: 'default', productName: 'Standard License', quantity: 1, unitPrice: 100, subtotal: 100 }]
          });
          return { success: true, output: res, durationMs: Date.now() - startTime };
        }
        throw new Error('Insufficient parameters for company.orders.manage.');
      } catch (err: any) {
        return { success: false, error: err.message, durationMs: Date.now() - startTime };
      }
    }
  };

  const incidentTool: ITool = {
    id: 'company.incidents.manage',
    name: 'Manage Incident',
    description: 'Creates or updates SRE incident.',
    version: '1.0.0',
    category: 'company',
    riskLevel: DangerTier.TIER_1,
    requiresApproval: false,
    capabilities: ['company.incidents'],
    inputSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string', description: 'Incident UUID (if updating)' },
        companyId: { type: 'string', description: 'Target company UUID (if creating)' },
        title: { type: 'string', description: 'Incident title' },
        status: { type: 'string', description: 'Target incident status' }
      }
    },
    async execute(rawInput: any, _context: ToolExecutionContext): Promise<ToolExecutionResult> {
      const startTime = Date.now();
      try {
        const input = unwrapInput(rawInput);
        if (input.incidentId && input.status) {
          const res = incidentManager.advanceIncidentStatus(
            String(input.incidentId),
            input.status as IncidentStatus,
            'Advanced via tool'
          );
          return { success: true, output: res, durationMs: Date.now() - startTime };
        }
        if (input.companyId && input.title) {
          const res = incidentManager.createIncident({
            companyId: String(input.companyId),
            title: String(input.title),
            severity: 'MEDIUM' as IncidentSeverity,
            affectedSystem: 'Core Services'
          });
          return { success: true, output: res, durationMs: Date.now() - startTime };
        }
        throw new Error('Insufficient parameters for company.incidents.manage.');
      } catch (err: any) {
        return { success: false, error: err.message, durationMs: Date.now() - startTime };
      }
    }
  };

  return [statusTool, cycleTool, objectiveTool, kpiTool, orderTool, incidentTool];
}
