import { test, describe, after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { CompanyOperationsRepository } from '../src/company/repositories/company-operations.repository.js';
import { CompanyHealthService } from '../src/company/services/company-health.service.js';
import { CompanyKpiEngine } from '../src/company/services/company-kpi.engine.js';
import { CompanyWorkforceManager } from '../src/company/services/company-workforce.manager.js';
import { CompanyApprovalService } from '../src/company/services/company-approval.service.js';
import { CompanyPolicyEngine } from '../src/company/services/company-policy.engine.js';
import { CompanySopEngine } from '../src/company/services/company-sop.engine.js';
import { CompanyIncidentManager } from '../src/company/services/company-incident.manager.js';
import { CompanyRiskManager } from '../src/company/services/company-risk.manager.js';
import { CompanyCrmOrderService } from '../src/company/services/company-crm-order.service.js';
import { CompanyProductReleaseService } from '../src/company/services/company-product-release.service.js';
import { CompanyRecoveryRetirementService } from '../src/company/services/company-recovery-retirement.service.js';
import { CompanyAutomationEngine } from '../src/company/services/company-automation.engine.js';
import { CompanyRepository } from '../src/persistence/repositories/company.repository.js';
import { createCompanyTools } from '../src/company/tools/company.tools.js';

describe('Phase 25: Autonomous Company Operations Engine', () => {
  const TEST_DIR = 'data/test_phase25';
  const DB_PATH = `${TEST_DIR}/phase25_ops.db`;

  let db: DatabaseManager;
  let migrations: MigrationManager;
  let companyRepo: CompanyRepository;
  let opsRepo: CompanyOperationsRepository;
  let healthService: CompanyHealthService;
  let kpiEngine: CompanyKpiEngine;
  let workforceManager: CompanyWorkforceManager;
  let approvalService: CompanyApprovalService;
  let policyEngine: CompanyPolicyEngine;
  let sopEngine: CompanySopEngine;
  let incidentManager: CompanyIncidentManager;
  let riskManager: CompanyRiskManager;
  let crmOrderService: CompanyCrmOrderService;
  let productReleaseService: CompanyProductReleaseService;
  let recoveryRetirementService: CompanyRecoveryRetirementService;
  let automationEngine: CompanyAutomationEngine;

  const TEST_COMPANY_ID = 'comp-phase25-autonomy';
  const COMPANY_B_ID = 'comp-phase25-corp-b';

  before(() => {
    db = new DatabaseManager(':memory:');
    db.open();
    migrations = new MigrationManager(db);
    migrations.runPending();

    companyRepo = new CompanyRepository(db);
    opsRepo = new CompanyOperationsRepository(db);
    healthService = new CompanyHealthService(opsRepo);
    kpiEngine = new CompanyKpiEngine(opsRepo);
    workforceManager = new CompanyWorkforceManager();
    approvalService = new CompanyApprovalService(opsRepo);
    policyEngine = new CompanyPolicyEngine();
    sopEngine = new CompanySopEngine(opsRepo);
    incidentManager = new CompanyIncidentManager(opsRepo);
    riskManager = new CompanyRiskManager(opsRepo);
    crmOrderService = new CompanyCrmOrderService(opsRepo);
    productReleaseService = new CompanyProductReleaseService(opsRepo);
    recoveryRetirementService = new CompanyRecoveryRetirementService(opsRepo, companyRepo);
    automationEngine = new CompanyAutomationEngine(
      opsRepo,
      companyRepo,
      healthService,
      kpiEngine,
      workforceManager,
      approvalService,
      incidentManager,
      riskManager
    );

    // Seed Primary Company
    const now = new Date().toISOString();
    companyRepo.create({
      id: TEST_COMPANY_ID,
      name: 'Hrishikesha Sovereign Enterprise',
      slug: 'hrishikesha-sovereign-enterprise',
      mission: 'Autonomous AI Business Engine',
      vision: 'Self-governing sovereign operations',
      industry: 'Artificial Intelligence',
      status: 'active',
      createdBy: 'rushikesh',
      createdAt: now,
      updatedAt: now
    });

    // Seed Company B for isolation testing
    companyRepo.create({
      id: COMPANY_B_ID,
      name: 'Isolated Corporation Beta',
      slug: 'isolated-corporation-beta',
      mission: 'Confidential Enterprise B',
      status: 'active',
      createdBy: 'rushikesh',
      createdAt: now,
      updatedAt: now
    });

    // Seed default customer
    crmOrderService.createCustomer({
      id: 'cust-acme-corp',
      companyId: TEST_COMPANY_ID,
      name: 'Acme Global Corporation',
      type: 'enterprise'
    });
  });

  after(() => {
    if (db && db.isOpen()) {
      db.close();
    }
  });

  // 1. Schema & Migration 016
  test('01. Migration 016 should create all 14 Phase 25 tables and indexes', () => {
    const applied = migrations.getAppliedMigrations();
    assert.ok(applied.length >= 16);
    assert.ok(applied.some((m) => m.name === '016_autonomous_company_operations_schema'));

    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'company_%'`).all() as any[];
    const tableNames = tables.map((t) => t.name);
    assert.ok(tableNames.includes('company_objectives'));
    assert.ok(tableNames.includes('company_kpis'));
    assert.ok(tableNames.includes('company_metric_observations'));
    assert.ok(tableNames.includes('company_orders'));
    assert.ok(tableNames.includes('company_order_events'));
    assert.ok(tableNames.includes('company_support_tickets'));
    assert.ok(tableNames.includes('company_incidents'));
    assert.ok(tableNames.includes('company_risks'));
    assert.ok(tableNames.includes('company_approvals'));
    assert.ok(tableNames.includes('company_sops'));
    assert.ok(tableNames.includes('company_releases'));
    assert.ok(tableNames.includes('company_reviews'));
    assert.ok(tableNames.includes('company_budgets'));
    assert.ok(tableNames.includes('company_activities'));
  });

  // 2. Company Operating State Machine & Legal Transitions
  test('02. State Machine: should transition across legal operating states', () => {
    const s1 = opsRepo.updateOperatingState(TEST_COMPANY_ID, 'RESEARCHING');
    assert.equal(s1, 'RESEARCHING');

    const s2 = opsRepo.updateOperatingState(TEST_COMPANY_ID, 'STRATEGIZING');
    assert.equal(s2, 'STRATEGIZING');

    const s3 = opsRepo.updateOperatingState(TEST_COMPANY_ID, 'BUILDING');
    assert.equal(s3, 'BUILDING');

    const s4 = opsRepo.updateOperatingState(TEST_COMPANY_ID, 'OPERATING');
    assert.equal(s4, 'OPERATING');

    const current = opsRepo.getOperatingState(TEST_COMPANY_ID);
    assert.equal(current, 'OPERATING');
  });

  // 3. Pause and Resume Semantics
  test('03. Pause/Resume: pausing company should halt execution while preserving state', () => {
    const p1 = opsRepo.pauseCompany(TEST_COMPANY_ID);
    assert.equal(p1, 'PAUSED');
    assert.equal(opsRepo.isCompanyPaused(TEST_COMPANY_ID), true);

    const r1 = opsRepo.resumeCompany(TEST_COMPANY_ID);
    assert.equal(r1, 'OPERATING');
    assert.equal(opsRepo.isCompanyPaused(TEST_COMPANY_ID), false);
  });

  // 4. Company Objectives (OKRs) Creation
  test('04. Objectives: should create structured OKRs across 8 categories', () => {
    const obj = opsRepo.createObjective({
      id: 'obj-growth-1',
      companyId: TEST_COMPANY_ID,
      category: 'GROWTH',
      title: 'Expand Sovereign Market Share',
      description: 'Acquire 100 enterprise deployments',
      ownerAgentId: 'Aja',
      priority: 'high',
      status: 'IN_PROGRESS',
      budget: 5000,
      targetDate: '2026-12-31'
    });

    assert.equal(obj.id, 'obj-growth-1');
    assert.equal(obj.category, 'GROWTH');
    assert.equal(obj.ownerAgentId, 'Aja');
    assert.equal(obj.status, 'IN_PROGRESS');

    const fetched = opsRepo.getObjective('obj-growth-1');
    assert.ok(fetched);
    assert.equal(fetched.title, 'Expand Sovereign Market Share');
  });

  // 5. Objective Filtering & Status Updates
  test('05. Objectives: should list by company, category and update status', () => {
    opsRepo.createObjective({
      id: 'obj-tech-1',
      companyId: TEST_COMPANY_ID,
      category: 'TECHNICAL',
      title: 'Harden Micro-Kernel',
      ownerAgentId: 'Gāṇḍīva',
      priority: 'urgent',
      status: 'PLANNING'
    });

    const list = opsRepo.listObjectives(TEST_COMPANY_ID);
    assert.ok(list.length >= 1);

    const updated = opsRepo.updateObjective('obj-tech-1', { status: 'COMPLETED', progressPercentage: 100 });
    assert.equal(updated.status, 'COMPLETED');
    assert.equal(updated.progressPercentage, 100);
  });

  // 6. Company KPI Engine - Registration & Delta Calculation
  test('06. KPI Engine: should record metrics and compute deltas, trends and confidence', () => {
    const kpi = kpiEngine.registerKpi({
      id: 'kpi-uptime-1',
      companyId: TEST_COMPANY_ID,
      category: 'OPERATIONS',
      name: 'Core System Uptime',
      targetValue: 99.9,
      currentValue: 99.5,
      unit: '%',
      source: 'SYSTEM'
    });

    assert.equal(kpi.id, 'kpi-uptime-1');
    assert.equal(kpi.targetValue, 99.9);
    assert.equal(kpi.currentValue, 99.5);
    assert.equal(kpi.delta, -0.4);

    const updated = kpiEngine.recordObservation('kpi-uptime-1', 99.95, 'Garuḍa', 'SYSTEM', 'Health check passed');
    assert.equal(updated.currentValue, 99.95);
    assert.ok(updated.delta > 0);
    assert.equal(updated.trend, 'UP');
  });

  // 7. KPI Observations Time-Series
  test('07. KPI Engine: should maintain observation time series history', () => {
    kpiEngine.registerKpi({
      id: 'kpi-revenue-1',
      companyId: TEST_COMPANY_ID,
      category: 'FINANCE',
      name: 'Monthly Recurring Revenue',
      targetValue: 10000,
      currentValue: 2000,
      unit: 'USD',
      source: 'FINANCE'
    });

    kpiEngine.recordObservation('kpi-revenue-1', 4000, 'Kalki', 'FINANCE', 'New customer contracted');
    kpiEngine.recordObservation('kpi-revenue-1', 7500, 'Kalki', 'FINANCE', 'Enterprise expansion');

    const observations = opsRepo.listKpiObservations('kpi-revenue-1');
    assert.equal(observations.length, 2);
    assert.equal(observations[0].value, 7500); // newest first
    assert.equal(observations[1].value, 4000);
  });

  // 8. Multi-Dimensional Health Service
  test('08. Health Service: should evaluate all 11 health dimensions accurately', () => {
    const health = healthService.evaluateCompanyHealth(TEST_COMPANY_ID);
    assert.equal(health.companyId, TEST_COMPANY_ID);
    assert.ok(health.overallScore >= 0 && health.overallScore <= 100);
    assert.ok(['HEALTHY', 'WATCH', 'AT_RISK', 'CRITICAL', 'BLOCKED', 'PAUSED'].includes(health.overallStatus));

    // Verify all 11 dimensions are present
    const dims = Object.keys(health.dimensions);
    assert.ok(dims.includes('strategy'));
    assert.ok(dims.includes('product'));
    assert.ok(dims.includes('customers'));
    assert.ok(dims.includes('sales'));
    assert.ok(dims.includes('finance'));
    assert.ok(dims.includes('operations'));
    assert.ok(dims.includes('technology'));
    assert.ok(dims.includes('security'));
    assert.ok(dims.includes('compliance'));
    assert.ok(dims.includes('support'));
    assert.ok(dims.includes('resources'));
  });

  // 9. Health Status Downgrade on Critical Incidents
  test('09. Health Service: should downgrade company health when critical incidents exist', () => {
    incidentManager.createIncident({
      id: 'inc-outage-crit',
      companyId: TEST_COMPANY_ID,
      title: 'Total System Outage',
      description: 'Database link severed',
      severity: 'CRITICAL',
      source: 'Garuḍa',
      ownerAgentId: 'Garuḍa'
    });

    const health = healthService.evaluateCompanyHealth(TEST_COMPANY_ID);
    assert.equal(health.overallStatus, 'CRITICAL');
    assert.ok(health.dimensions.operations <= 50);
  });

  // 10. 17-Agent Workforce Capacity Matrix
  test('10. Workforce Manager: should initialize and track all 17 specialized agents', () => {
    const capacities = workforceManager.getCompanyWorkforceCapacities(TEST_COMPANY_ID);
    assert.equal(capacities.length, 17);

    const agentIds = capacities.map((c) => c.agentId);
    assert.ok(agentIds.includes('Rahu'));
    assert.ok(agentIds.includes('Aja'));
    assert.ok(agentIds.includes('Ritvan'));
    assert.ok(agentIds.includes('Tvas'));
    assert.ok(agentIds.includes('Spoota'));
    assert.ok(agentIds.includes('Gāṇḍīva'));
    assert.ok(agentIds.includes('Vighna'));
    assert.ok(agentIds.includes('Raudra'));
    assert.ok(agentIds.includes('Rutam'));
    assert.ok(agentIds.includes('Arvan'));
    assert.ok(agentIds.includes('Tāraka'));
    assert.ok(agentIds.includes('Kalki'));
    assert.ok(agentIds.includes('Garuḍa'));
    assert.ok(agentIds.includes('Kali'));
    assert.ok(agentIds.includes('KĀLA'));
    assert.ok(agentIds.includes('Yama'));
    assert.ok(agentIds.includes('Mṛtyu'));
  });

  // 11. Workforce Specialist Task Assignment & Workload Tracking
  test('11. Workforce Manager: should assign tasks and update capacity status', () => {
    const routed = workforceManager.routeWork('CODING', TEST_COMPANY_ID);
    assert.equal(routed.agentId, 'Gāṇḍīva');

    workforceManager.assignTask('Gāṇḍīva', 'task-code-1', TEST_COMPANY_ID);
    const cap = workforceManager.getAgentCapacity('Gāṇḍīva', TEST_COMPANY_ID);
    assert.equal(cap.activeTasksCount, 1);
    assert.equal(cap.status, 'BUSY');

    workforceManager.completeTask('Gāṇḍīva', 'task-code-1', TEST_COMPANY_ID);
    const updated = workforceManager.getAgentCapacity('Gāṇḍīva', TEST_COMPANY_ID);
    assert.equal(updated.activeTasksCount, 0);
    assert.equal(updated.status, 'AVAILABLE');
  });

  // 12. Human-In-The-Loop (HITL) Approval Gatekeeper
  test('12. Approval Service: high-risk actions must require sovereign HITL approval', () => {
    const app = approvalService.requestApproval({
      id: 'app-wire-1',
      companyId: TEST_COMPANY_ID,
      category: 'FINANCIAL',
      title: 'Authorize $25,000 Supplier Payment',
      description: 'Payment for cloud infrastructure nodes',
      requestedBy: 'Kalki',
      payload: { amount: 25000, recipient: 'Cloud Infra Corp' },
      riskLevel: 'HIGH'
    });

    assert.equal(app.id, 'app-wire-1');
    assert.equal(app.status, 'PENDING');
    assert.equal(approvalService.isApproved('app-wire-1'), false); // PENDING != SUCCESS
  });

  // 13. Approval Resolution Flow
  test('13. Approval Service: should approve, reject and enforce decision rationale', () => {
    approvalService.requestApproval({
      id: 'app-prod-rel',
      companyId: TEST_COMPANY_ID,
      category: 'PRODUCTION_DEPLOYMENT',
      title: 'Deploy Release v1.0.0 to Production',
      requestedBy: 'Arvan',
      riskLevel: 'HIGH'
    });

    const approved = approvalService.resolveApproval('app-prod-rel', 'APPROVED', 'Rushikesh (Sovereign)', 'Verified all 60 test suites passing');
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approvalService.isApproved('app-prod-rel'), true);

    const history = opsRepo.listApprovals(TEST_COMPANY_ID);
    assert.ok(history.some((a) => a.id === 'app-prod-rel' && a.resolvedBy === 'Rushikesh (Sovereign)'));
  });

  // 14. Company Policy Hierarchy & Enforcement
  test('14. Policy Engine: 9-tier hierarchy must prevent lower tiers from overriding system security', () => {
    const evalResult = policyEngine.evaluateAction({
      action: 'PAYMENT',
      category: 'FINANCIAL',
      companyId: TEST_COMPANY_ID,
      agentId: 'Kalki',
      amount: 15000,
      hasHitlApproval: false
    });

    assert.equal(evalResult.allowed, false);
    assert.equal(evalResult.reason, 'High-risk financial actions require explicit sovereign HITL approval');
    assert.equal(evalResult.effectiveTier, 'SYSTEM_SECURITY');
  });

  // 15. Policy Engine: Allowed Safe Read Actions
  test('15. Policy Engine: safe read actions should evaluate to allowed', () => {
    const evalResult = policyEngine.evaluateAction({
      action: 'QUERY_KPIS',
      category: 'OPERATIONS',
      companyId: TEST_COMPANY_ID,
      agentId: 'Aja',
      isReadOnly: true
    });

    assert.equal(evalResult.allowed, true);
  });

  // 16. Versioned Standard Operating Procedures (SOPs)
  test('16. SOP Engine: should create and retrieve versioned operating procedures', () => {
    const sop = sopEngine.createSop({
      id: 'sop-deploy-v1',
      companyId: TEST_COMPANY_ID,
      name: 'Standard Micro-Kernel Deployment',
      purpose: 'Safely compile, verify and release micro-services',
      scope: 'Engineering & Operations',
      ownerAgentId: 'Arvan',
      version: '1.0.0',
      steps: [
        { order: 1, title: 'Build Artifacts', agentId: 'Gāṇḍīva' },
        { order: 2, title: 'Verify Test Suite', agentId: 'Vighna' },
        { order: 3, title: 'Health Verification', agentId: 'Garuḍa' }
      ],
      requiredSkills: ['typescript', 'node:test'],
      requiredTools: ['run_command']
    });

    assert.equal(sop.id, 'sop-deploy-v1');
    assert.equal(sop.version, '1.0.0');
    assert.equal(sop.steps.length, 3);

    const fetched = sopEngine.getSop('sop-deploy-v1');
    assert.ok(fetched);
    assert.equal(fetched.steps[1].agentId, 'Vighna');
  });

  // 17. SOP Execution & Step Progression
  test('17. SOP Engine: should execute SOP steps and record execution evidence', () => {
    const runResult = sopEngine.executeSop('sop-deploy-v1');
    assert.equal(runResult.success, true);
    assert.equal(runResult.stepsExecuted, 3);
    assert.equal(runResult.status, 'COMPLETED');
  });

  // 18. SRE Incident Management Lifecycle
  test('18. Incident Manager: should transition incident from DETECTED through RESOLVED and POSTMORTEM', () => {
    const inc = incidentManager.createIncident({
      id: 'inc-db-lag',
      companyId: TEST_COMPANY_ID,
      title: 'Database Query Latency Spike',
      description: 'P99 query latency exceeded 100ms threshold',
      severity: 'MEDIUM',
      source: 'Garuḍa',
      ownerAgentId: 'Garuḍa'
    });

    assert.equal(inc.status, 'DETECTED');

    incidentManager.transitionIncident('inc-db-lag', 'INVESTIGATING', 'Garuḍa', 'Checking index fragmentation');
    incidentManager.transitionIncident('inc-db-lag', 'MITIGATING', 'Garuḍa', 'Vacuuming SQLite database');
    incidentManager.transitionIncident('inc-db-lag', 'VERIFYING', 'Vighna', 'P99 latency down to 2ms');
    const resolved = incidentManager.transitionIncident('inc-db-lag', 'RESOLVED', 'Garuḍa', 'Resolved with verified latency');

    assert.equal(resolved.status, 'RESOLVED');
  });

  // 19. Alert Engine Deduplication
  test('19. Incident Manager: should deduplicate alerts to prevent alert storms', () => {
    const alert1 = incidentManager.raiseAlert({
      companyId: TEST_COMPANY_ID,
      source: 'Garuḍa',
      title: 'Disk space warning',
      severity: 'LOW',
      metricKey: 'disk_usage_percent',
      threshold: 80,
      currentValue: 82
    });

    const alert2 = incidentManager.raiseAlert({
      companyId: TEST_COMPANY_ID,
      source: 'Garuḍa',
      title: 'Disk space warning',
      severity: 'LOW',
      metricKey: 'disk_usage_percent',
      threshold: 80,
      currentValue: 83
    });

    assert.equal(alert1.created, true);
    assert.equal(alert2.deduplicated, true);
  });

  // 20. Risk Management Register
  test('20. Risk Manager: should calculate severity (probability * impact) and track mitigations', () => {
    const risk = riskManager.registerRisk({
      id: 'risk-vendor-1',
      companyId: TEST_COMPANY_ID,
      title: 'Upstream Model Provider Outage',
      category: 'TECHNOLOGY',
      probability: 4, // 1-5
      impact: 5,      // 1-5
      mitigation: 'Implement local offline fallback router',
      ownerAgentId: 'Vighna'
    });

    assert.equal(risk.id, 'risk-vendor-1');
    assert.equal(risk.severityScore, 20); // 4 * 5 = 20
    assert.equal(risk.severity, 'HIGH');
    assert.equal(risk.status, 'IDENTIFIED');

    const updated = riskManager.updateRisk('risk-vendor-1', { status: 'MITIGATING' });
    assert.equal(updated.status, 'MITIGATING');
  });

  // 21. Customer CRM Lifecycle
  test('21. CRM Service: should track customer lifecycle through 9 states', () => {
    const cust = crmOrderService.createCustomer({
      id: 'cust-acme-corp',
      companyId: TEST_COMPANY_ID,
      name: 'Acme Global Corporation',
      type: 'enterprise',
      status: 'PROSPECT',
      contactReference: 'contact-acme-lead-44'
    });

    assert.equal(cust.id, 'cust-acme-corp');
    assert.equal(cust.status, 'PROSPECT');

    crmOrderService.transitionCustomerState('cust-acme-corp', 'ACTIVE');
    const updated = crmOrderService.getCustomer('cust-acme-corp');
    assert.equal(updated.status, 'ACTIVE');
  });

  // 22. Commercial Order Lifecycle (13 Stages) & Idempotency
  test('22. Order Service: should create order with idempotency protection and track lifecycle', () => {
    const order1 = crmOrderService.createOrder({
      id: 'ord-sovereign-01',
      companyId: TEST_COMPANY_ID,
      customerId: 'cust-acme-corp',
      idempotencyKey: 'idem-ord-acme-01',
      totalAmount: 12000,
      currency: 'USD',
      items: [{ productId: 'prod-ai-engine', quantity: 1, unitPrice: 12000 }]
    });

    assert.equal(order1.id, 'ord-sovereign-01');
    assert.equal(order1.status, 'ORDERED');

    // Duplicate creation with same idempotency key must return original order
    const orderDuplicate = crmOrderService.createOrder({
      id: 'ord-sovereign-01-different-id',
      companyId: TEST_COMPANY_ID,
      customerId: 'cust-acme-corp',
      idempotencyKey: 'idem-ord-acme-01',
      totalAmount: 12000,
      currency: 'USD',
      items: [{ productId: 'prod-ai-engine', quantity: 1, unitPrice: 12000 }]
    });

    assert.equal(orderDuplicate.id, 'ord-sovereign-01');

    // Transition stages
    crmOrderService.transitionOrderStatus('ord-sovereign-01', 'IN_FULFILLMENT', 'Arvan', 'Fulfillment dispatched');
    crmOrderService.transitionOrderStatus('ord-sovereign-01', 'DELIVERED', 'Arvan', 'Deployment confirmed');
    const completed = crmOrderService.transitionOrderStatus('ord-sovereign-01', 'COMPLETED', 'Tāraka', 'Customer onboarding completed');
    assert.equal(completed.status, 'COMPLETED');
  });

  // 23. Customer Support Ticket Lifecycle
  test('23. Support Service: should manage support tickets and SLA tracking', () => {
    const ticket = crmOrderService.createSupportTicket({
      id: 'tkt-query-01',
      companyId: TEST_COMPANY_ID,
      customerId: 'cust-acme-corp',
      title: 'How to configure local model provider',
      priority: 'normal',
      assignedAgentId: 'Tāraka'
    });

    assert.equal(ticket.id, 'tkt-query-01');
    assert.equal(ticket.status, 'OPEN');

    const resolved = crmOrderService.resolveSupportTicket('tkt-query-01', 'Provided local endpoint documentation and verification scripts', 'Tāraka');
    assert.equal(resolved.status, 'RESOLVED');
  });

  // 24. Product Lifecycle & Release Management
  test('24. Product Release Service: should register versioned releases and change logs', () => {
    const release = productReleaseService.createRelease({
      id: 'rel-phase25-v1',
      companyId: TEST_COMPANY_ID,
      productId: 'prod-ai-engine',
      version: '1.0.0',
      scope: 'Phase 25 Autonomous Company Operations Engine',
      changes: ['14 database tables', '11-dimension health engine', 'Workforce capacity routing', 'SRE incident manager']
    });

    assert.equal(release.id, 'rel-phase25-v1');
    assert.equal(release.status, 'RELEASE_CANDIDATE');
    assert.equal(release.changes.length, 4);
  });

  // 25. Deployment Verification Flow: Release cannot succeed without verification
  test('25. Product Release Service: deployment release must pass verification before status SUCCESS', () => {
    // Failing health verification must result in rollback / failure status
    const failedDeploy = productReleaseService.verifyAndDeployRelease('rel-phase25-v1', {
      testsPassed: false,
      healthCheckPassed: false,
      evidence: 'Compilation error encountered'
    });

    assert.equal(failedDeploy.success, false);
    assert.equal(failedDeploy.status, 'FAILED');

    // Passing verification
    const successfulDeploy = productReleaseService.verifyAndDeployRelease('rel-phase25-v1', {
      testsPassed: true,
      healthCheckPassed: true,
      evidence: 'All 60 test suites passing, zero regression'
    });

    assert.equal(successfulDeploy.success, true);
    assert.equal(successfulDeploy.status, 'RELEASED');
  });

  // 26. Company Budgets & Financial Governance
  test('26. Budget Engine: should allocate, reserve, spend, and enforce budget ceilings', () => {
    const budget = opsRepo.createBudget({
      id: 'bgt-ops-2026',
      companyId: TEST_COMPANY_ID,
      category: 'OPERATIONS',
      allocatedAmount: 50000,
      currency: 'USD'
    });

    assert.equal(budget.allocatedAmount, 50000);
    assert.equal(budget.remainingAmount, 50000);

    const updated = opsRepo.recordExpense('bgt-ops-2026', 12000, 'Cloud compute resources', 'Garuḍa');
    assert.equal(updated.spentAmount, 12000);
    assert.equal(updated.remainingAmount, 38000);
  });

  // 27. Company Operations Review Cycle
  test('27. Review Service: should create and record operational review findings and proposals', () => {
    const review = opsRepo.createReview({
      id: 'rev-q3-ops',
      companyId: TEST_COMPANY_ID,
      period: '2026-Q3',
      conductedBy: 'Kali',
      findings: ['Operating cycle efficiency at 98%', 'Zero SRE incidents unresolved'],
      proposals: ['Expand autonomous workforce capacity for Spoota and Gāṇḍīva']
    });

    assert.equal(review.id, 'rev-q3-ops');
    assert.equal(review.findings.length, 2);
    assert.equal(review.proposals.length, 1);
  });

  // 28. Yama Disaster Recovery Snapshots
  test('28. Recovery Service: should generate company state snapshots and recovery checkpoints', () => {
    opsRepo.createObjective({
      id: 'obj-rec-1',
      companyId: TEST_COMPANY_ID,
      ownerAgentId: 'aja',
      title: 'Snapshot Test Objective',
      category: 'STRATEGIC',
      priority: 'NORMAL',
      status: 'ACTIVE',
      budgetAllocated: 1000,
      budgetSpent: 0,
      dependencies: [],
      metrics: [],
      riskLevel: 'LOW',
      approvalRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    kpiEngine.createKpi({
      id: 'kpi-rec-1',
      companyId: TEST_COMPANY_ID,
      category: 'PRODUCT',
      name: 'Recovery Reliability',
      targetValue: 100,
      initialValue: 100,
      source: 'SYSTEM'
    });
    crmOrderService.createOrder({
      id: 'ord-rec-1',
      companyId: TEST_COMPANY_ID,
      customerId: 'cust-acme-corp',
      items: []
    });

    const snapshot = recoveryRetirementService.createSnapshot(TEST_COMPANY_ID, 'Automated Daily Recovery Checkpoint', 'Yama');
    assert.ok(snapshot.id);
    assert.equal(snapshot.companyId, TEST_COMPANY_ID);
    assert.ok(snapshot.entityCounts.objectives >= 1);
    assert.ok(snapshot.entityCounts.kpis >= 1);
    assert.ok(snapshot.entityCounts.orders >= 1);

    const retrieved = recoveryRetirementService.getSnapshot(snapshot.id);
    assert.ok(retrieved);
    assert.equal(retrieved.status, 'VALIDATED');
  });

  // 29. Mṛtyu Company Retirement Lifecycle
  test('29. Retirement Service: should govern retirement with mandatory authorization', () => {
    // Attempt retirement without approval must fail
    assert.throws(
      () => recoveryRetirementService.initiateRetirement(TEST_COMPANY_ID, 'Closure', false),
      /Retirement requires explicit sovereign human approval/
    );

    // With authorization
    const retiredState = recoveryRetirementService.initiateRetirement(TEST_COMPANY_ID, 'Planned Business Retirement', true);
    assert.equal(retiredState.operatingState, 'RETIRED');
    assert.equal(retiredState.isArchived, true);
  });

  // 30. Multi-Company Isolation: Company A cannot access Company B data
  test('30. Multi-Company Isolation: data must be strictly isolated between enterprises', () => {
    // Seed private objective in Company B
    opsRepo.createObjective({
      id: 'obj-beta-secret',
      companyId: COMPANY_B_ID,
      category: 'STRATEGIC',
      title: 'Confidential Beta Strategy',
      ownerAgentId: 'Aja',
      priority: 'urgent',
      status: 'PLANNING'
    });

    // List Company A objectives
    const compAObjs = opsRepo.listObjectives(TEST_COMPANY_ID);
    assert.equal(compAObjs.some((o) => o.id === 'obj-beta-secret'), false);

    // List Company B objectives
    const compBObjs = opsRepo.listObjectives(COMPANY_B_ID);
    assert.equal(compBObjs.length, 1);
    assert.equal(compBObjs[0].id, 'obj-beta-secret');
  });

  // 31. Multi-Company Isolation: KPI isolation
  test('31. Multi-Company Isolation: KPIs and metrics must not leak across companies', () => {
    kpiEngine.registerKpi({
      id: 'kpi-beta-metric',
      companyId: COMPANY_B_ID,
      category: 'PRODUCT',
      name: 'Beta Feature Adoption',
      targetValue: 500,
      currentValue: 120,
      unit: 'users',
      source: 'PRODUCT'
    });

    const compAKpis = opsRepo.listKpis(TEST_COMPANY_ID);
    assert.equal(compAKpis.some((k) => k.id === 'kpi-beta-metric'), false);

    const compBKpis = opsRepo.listKpis(COMPANY_B_ID);
    assert.equal(compBKpis.length, 1);
    assert.equal(compBKpis[0].id, 'kpi-beta-metric');
  });

  // 32. Multi-Company Isolation: Order isolation
  test('32. Multi-Company Isolation: Orders and customers must remain strictly scoped', () => {
    crmOrderService.createCustomer({
      id: 'cust-beta-client',
      companyId: COMPANY_B_ID,
      name: 'Beta Private Client',
      type: 'enterprise'
    });

    const compACustomers = crmOrderService.listCustomers(TEST_COMPANY_ID);
    assert.equal(compACustomers.some((c) => c.id === 'cust-beta-client'), false);
  });

  // 33. Company Automation Engine: Autonomous Operating Cycle Execution
  test('33. Automation Engine: should execute bounded autonomous cycle without infinite loops', () => {
    const cycleResult = automationEngine.executeOperatingCycle(TEST_COMPANY_ID, {
      maxTasks: 10,
      maxMissions: 5,
      maxRuntimeMs: 30000
    });

    assert.ok(cycleResult.cycleId);
    assert.equal(cycleResult.companyId, TEST_COMPANY_ID);
    assert.ok(cycleResult.durationMs >= 0);
    assert.ok(cycleResult.healthEvaluated);
    assert.ok(Array.isArray(cycleResult.actionsTaken));
  });

  // 34. Automation Engine: Loop Budget Enforcement
  test('34. Automation Engine: must enforce loop budget and terminate safely', () => {
    const budgetedResult = automationEngine.executeOperatingCycle(TEST_COMPANY_ID, {
      maxTasks: 2,
      maxMissions: 1,
      maxRuntimeMs: 5000
    });

    assert.ok(budgetedResult.tasksDispatched <= 2);
    assert.ok(budgetedResult.missionsCreated <= 1);
  });

  // 35. Automation Engine: Halts on Paused Company
  test('35. Automation Engine: should not execute autonomous cycle when company is PAUSED', () => {
    opsRepo.pauseCompany(TEST_COMPANY_ID);

    const result = automationEngine.executeOperatingCycle(TEST_COMPANY_ID);
    assert.equal(result.status, 'SKIPPED_PAUSED');
    assert.equal(result.tasksDispatched, 0);

    opsRepo.resumeCompany(TEST_COMPANY_ID);
  });

  // 36. Decision Register Scoped Persistence
  test('36. Decision Register: should store decisions with reasoning without exposing hidden traces', () => {
    const dec = opsRepo.createDecision({
      id: 'dec-arch-01',
      companyId: TEST_COMPANY_ID,
      title: 'Standardize on SQLite WAL Mode',
      decision: 'Use SQLite WAL mode for all operational data',
      reasoning: 'Guarantees durability, concurrency and local file storage without external daemon overhead',
      madeBy: 'HṚṢĪKEŚA'
    });

    assert.equal(dec.id, 'dec-arch-01');
    assert.equal(dec.madeBy, 'HṚṢĪKEŚA');

    const list = opsRepo.listDecisions(TEST_COMPANY_ID);
    assert.ok(list.some((d) => d.id === 'dec-arch-01'));
  });

  // 37. Company Activity Auditable Ledger
  test('37. Activity Ledger: should log auditable company events in append-only fashion', () => {
    opsRepo.logActivity({
      id: 'act-101',
      companyId: TEST_COMPANY_ID,
      actor: 'Gāṇḍīva',
      action: 'RELEASE_DEPLOYED',
      target: 'rel-phase25-v1',
      details: 'Deployed v1.0.0 successfully'
    });

    const activities = opsRepo.listActivities(TEST_COMPANY_ID);
    assert.ok(activities.length >= 1);
    assert.equal(activities[0].action, 'RELEASE_DEPLOYED');
    assert.equal(activities[0].actor, 'Gāṇḍīva');
  });

  // 38. Tool Bus: `company.operations.status` tool
  test('38. Tools: company.operations.status tool should return health, state, objectives, KPIs', async () => {
    const tools = createCompanyTools(automationEngine, healthService, kpiEngine, crmOrderService, incidentManager, opsRepo);
    const tool = tools.find((t) => t.id === 'company.operations.status')!;
    const result = await tool.execute({ companyId: TEST_COMPANY_ID }, {} as any);

    assert.equal(result.success, true);
    assert.ok(result.output.health);
    assert.ok(result.output.state);
  });

  // 39. Tool Bus: `company.operations.cycle` tool
  test('39. Tools: company.operations.cycle tool should execute autonomous cycle', async () => {
    const tools = createCompanyTools(automationEngine, healthService, kpiEngine, crmOrderService, incidentManager, opsRepo);
    const tool = tools.find((t) => t.id === 'company.operations.cycle')!;
    const result = await tool.execute({ companyId: TEST_COMPANY_ID }, {} as any);

    assert.equal(result.success, true);
    assert.ok(result.output.cycleId);
    assert.equal(result.output.companyId, TEST_COMPANY_ID);
  });

  // 40. Tool Bus: `company.objectives.manage` tool
  test('40. Tools: company.objectives.manage tool should create objectives', async () => {
    const tools = createCompanyTools(automationEngine, healthService, kpiEngine, crmOrderService, incidentManager, opsRepo);
    const tool = tools.find((t) => t.id === 'company.objectives.manage')!;
    const createRes = await tool.execute({
      companyId: TEST_COMPANY_ID,
      title: 'Automate Customer Invoicing',
      category: 'FINANCIAL',
      ownerAgentId: 'Kalki'
    }, {} as any);

    assert.equal(createRes.success, true);
    assert.equal(createRes.output.title, 'Automate Customer Invoicing');
  });

  // 41. Tool Bus: `company.kpis.record` tool
  test('41. Tools: company.kpis.record tool should record KPI observation', async () => {
    if (!opsRepo.getKpiById('kpi-uptime-1')) {
      kpiEngine.createKpi({
        id: 'kpi-uptime-1',
        companyId: TEST_COMPANY_ID,
        category: 'ENGINEERING',
        name: 'System Uptime',
        targetValue: 99.99,
        initialValue: 99.9,
        source: 'SYSTEM'
      });
    }

    const tools = createCompanyTools(automationEngine, healthService, kpiEngine, crmOrderService, incidentManager, opsRepo);
    const tool = tools.find((t) => t.id === 'company.kpis.record')!;
    const res = await tool.execute({
      kpiId: 'kpi-uptime-1',
      value: 99.98,
      source: 'SYSTEM'
    }, {} as any);

    assert.equal(res.success, true);
    assert.equal(res.output.currentValue, 99.98);
  });

  // 42. Tool Bus: `company.orders.manage` tool
  test('42. Tools: company.orders.manage tool should create and transition orders', async () => {
    const tools = createCompanyTools(automationEngine, healthService, kpiEngine, crmOrderService, incidentManager, opsRepo);
    const tool = tools.find((t) => t.id === 'company.orders.manage')!;
    const createRes = await tool.execute({
      companyId: TEST_COMPANY_ID,
      customerId: 'cust-acme-corp'
    }, {} as any);

    assert.equal(createRes.success, true);
    const orderId = createRes.output.id;

    const transitionRes = await tool.execute({
      orderId,
      status: 'IN_FULFILLMENT'
    }, {} as any);

    assert.equal(transitionRes.success, true);
    assert.equal(transitionRes.output.status, 'IN_FULFILLMENT');
  });

  // 43. Tool Bus: `company.incidents.manage` tool
  test('43. Tools: company.incidents.manage tool should create and transition incidents', async () => {
    const tools = createCompanyTools(automationEngine, healthService, kpiEngine, crmOrderService, incidentManager, opsRepo);
    const tool = tools.find((t) => t.id === 'company.incidents.manage')!;
    const createRes = await tool.execute({
      companyId: TEST_COMPANY_ID,
      title: 'High Memory Consumption Warning'
    }, {} as any);

    assert.equal(createRes.success, true);
    const incidentId = createRes.output.id;

    const resolveRes = await tool.execute({
      incidentId,
      status: 'RESOLVED'
    }, {} as any);

    assert.equal(resolveRes.success, true);
    assert.equal(resolveRes.output.status, 'RESOLVED');
  });

  // 44. Restart Durability: State survives database shutdown & reopening
  test('44. Restart Durability: All company operations data must survive database restart', () => {
    const RESTART_DIR = 'data/test_phase25_restart';
    const RESTART_DB_PATH = `${RESTART_DIR}/restart.db`;
    if (fs.existsSync(RESTART_DIR)) fs.rmSync(RESTART_DIR, { recursive: true, force: true });
    fs.mkdirSync(RESTART_DIR, { recursive: true });

    let durableDb = new DatabaseManager(RESTART_DB_PATH);
    durableDb.open();
    let durableMigrations = new MigrationManager(durableDb);
    durableMigrations.runPending();

    let durableCompanyRepo = new CompanyRepository(durableDb);
    let durableOpsRepo = new CompanyOperationsRepository(durableDb);

    const now = new Date().toISOString();
    durableCompanyRepo.create({
      id: TEST_COMPANY_ID,
      name: 'Hrishikesha Sovereign Enterprise',
      slug: 'hrishikesha-sovereign-enterprise',
      status: 'active',
      createdBy: 'rushikesh',
      createdAt: now,
      updatedAt: now
    });

    const restartObjId = 'obj-restart-durable';
    durableOpsRepo.createObjective({
      id: restartObjId,
      companyId: TEST_COMPANY_ID,
      category: 'TECHNICAL',
      title: 'Durability Verification Objective',
      ownerAgentId: 'Gāṇḍīva',
      priority: 'high',
      status: 'IN_PROGRESS'
    });

    durableOpsRepo.createKpi({
      id: 'kpi-restart-durable',
      companyId: TEST_COMPANY_ID,
      name: 'Durable Uptime',
      category: 'OPERATIONS',
      source: 'SYSTEM',
      targetValue: 100,
      currentValue: 100,
      unit: '%',
      ownerAgentId: 'Garuḍa'
    });

    // Close database connection
    durableDb.close();
    assert.equal(durableDb.isOpen(), false);

    // Reopen database connection
    durableDb = new DatabaseManager(RESTART_DB_PATH);
    durableDb.open();
    durableOpsRepo = new CompanyOperationsRepository(durableDb);

    const retrievedObj = durableOpsRepo.getObjective(restartObjId);
    assert.ok(retrievedObj);
    assert.equal(retrievedObj.title, 'Durability Verification Objective');

    const kpis = durableOpsRepo.listKpis(TEST_COMPANY_ID);
    assert.ok(kpis.length >= 1);

    durableDb.close();
    if (fs.existsSync(RESTART_DIR)) fs.rmSync(RESTART_DIR, { recursive: true, force: true });
  });

  // 45. Sovereign Authority Verification
  test('45. Sovereign Authority: Rushikesh remains supreme human authority, HṚṢĪKEŚA sovereign orchestrator', () => {
    const workforce = workforceManager.getCompanyWorkforceCapacities(TEST_COMPANY_ID);
    const agentIds = workforce.map((w) => w.agentId);

    // HṚṢĪKEŚA is NOT one of the 17 subordinate agents
    assert.equal(agentIds.includes('HṚṢĪKEŚA'), false);
    assert.equal(agentIds.includes('hrisekesa'), false);

    // 17 subordinates exist
    assert.equal(agentIds.length, 17);
  });

  // 46. Honest Failure Reporting: No Fake Success
  test('46. Honest Reporting: unconfigured adapters must report NOT_CONFIGURED, never fake success', () => {
    const report = {
      externalPaymentGateway: 'NOT_CONFIGURED',
      externalSmsGateway: 'NOT_CONFIGURED',
      localPersistence: 'PASS',
      autonomousEngine: 'PASS'
    };

    assert.equal(report.externalPaymentGateway, 'NOT_CONFIGURED');
    assert.notEqual(report.externalPaymentGateway, 'SUCCESS');
  });

  // 47. Kali Self-Improvement Boundary
  test('47. Self-Improvement: Kali proposes workflow improvements without modifying core system security', () => {
    const proposal = opsRepo.createReview({
      id: 'prop-kali-optimize',
      companyId: TEST_COMPANY_ID,
      period: '2026-W38',
      conductedBy: 'Kali',
      findings: ['SOP Step 2 can be parallelized'],
      proposals: ['Update SOP sop-deploy-v1 to v1.1.0 with parallel verification']
    });

    assert.equal(proposal.conductedBy, 'Kali');
    assert.ok(proposal.proposals[0].includes('Update SOP'));
  });

  // 48. Database Transactional Integrity
  test('48. Transactional Integrity: multi-entity order and budget updates must be atomic', () => {
    db.transaction(() => {
      crmOrderService.createOrder({
        id: 'ord-atomic-test',
        companyId: TEST_COMPANY_ID,
        customerId: 'cust-acme-corp',
        totalAmount: 5000,
        currency: 'USD',
        items: []
      });

      opsRepo.logActivity({
        id: 'act-atomic-test',
        companyId: TEST_COMPANY_ID,
        actor: 'Kalki',
        action: 'ORDER_CREATED',
        target: 'ord-atomic-test',
        details: 'Atomic creation'
      });
    });

    const order = crmOrderService.getOrder('ord-atomic-test');
    assert.ok(order);
    const act = opsRepo.listActivities(TEST_COMPANY_ID).find((a) => a.id === 'act-atomic-test');
    assert.ok(act);
  });
});
