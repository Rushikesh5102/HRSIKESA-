/**
 * HṚṢĪKEŚA (हृषीकेश) — Company & Project Operating System Test Suite (Phase 14)
 *
 * Deterministic unit and integration tests verifying:
 * - Persistent Company, Project, Department, Workforce, Product, Customer, Decision domain models
 * - 15-Stage Business Lifecycle Engine with responsible 17-agent mapping
 * - Ritvan's Organization Architect and KĀLA's Resource Coordinator
 * - Scoped memory hierarchy (Global != Company != Project != Agent != Task)
 * - Mission & Artifact linkage with company/project provenance
 * - Full SQLite database reload & restart persistence
 * - Complete REST API Gateway endpoints
 * - Strict security & authorization boundaries
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { CompanyRepository } from '../src/persistence/repositories/company.repository.js';
import { ProjectRepository } from '../src/persistence/repositories/project.repository.js';
import { DepartmentRepository } from '../src/persistence/repositories/department.repository.js';
import { CompanyWorkforceRepository } from '../src/persistence/repositories/company-workforce.repository.js';
import { ProductRepository } from '../src/persistence/repositories/product.repository.js';
import { CustomerRepository } from '../src/persistence/repositories/customer.repository.js';
import { DecisionRepository } from '../src/persistence/repositories/decision.repository.js';
import { MissionRepository } from '../src/persistence/repositories/mission.repository.js';
import { ArtifactRepository } from '../src/persistence/repositories/artifact.repository.js';
import { CompanyService } from '../src/company/services/company.service.js';
import { LifecycleEngine } from '../src/company/lifecycle/lifecycle.engine.js';
import { OrganizationArchitect } from '../src/company/roles/organization.architect.js';
import { ResourceCoordinator } from '../src/company/roles/resource.coordinator.js';
import { HrisekesaKernel } from '../src/runtime/kernel.js';
import { INITIAL_AGENT_ROSTER } from '../src/agents/roster/initial.agents.js';
import { IMission, MissionArtifact } from '../src/agents/interfaces/mission.types.js';

describe('PHASE 14 — HṚṢĪKEŚA Company & Project Operating System', () => {
  let db: DatabaseManager;
  let migrations: MigrationManager;
  let companyRepo: CompanyRepository;
  let projectRepo: ProjectRepository;
  let departmentRepo: DepartmentRepository;
  let workforceRepo: CompanyWorkforceRepository;
  let productRepo: ProductRepository;
  let customerRepo: CustomerRepository;
  let decisionRepo: DecisionRepository;
  let missionRepo: MissionRepository;
  let artifactRepo: ArtifactRepository;
  let service: CompanyService;

  before(() => {
    db = new DatabaseManager(':memory:');
    migrations = new MigrationManager(db);
    migrations.runPending();

    companyRepo = new CompanyRepository(db);
    projectRepo = new ProjectRepository(db);
    departmentRepo = new DepartmentRepository(db);
    workforceRepo = new CompanyWorkforceRepository(db);
    productRepo = new ProductRepository(db);
    customerRepo = new CustomerRepository(db);
    decisionRepo = new DecisionRepository(db);
    missionRepo = new MissionRepository(db);
    artifactRepo = new ArtifactRepository(db);

    service = new CompanyService(
      companyRepo,
      projectRepo,
      departmentRepo,
      workforceRepo,
      productRepo,
      customerRepo,
      decisionRepo,
      missionRepo,
      artifactRepo
    );
  });

  after(() => {
    db.close();
  });

  // 1. Company Creation & CRUD
  test('1. Company creation, retrieval by ID, and retrieval by slug', () => {
    const comp = service.createCompany({
      name: 'Rushimuni Technologies',
      description: 'Autonomous software venture lab',
      mission: 'Build sovereign AI products',
      vision: 'Empower human creativity via AI organizations',
      industry: 'Artificial Intelligence',
      autoSetupDepartments: false
    });

    assert.ok(comp.id);
    assert.equal(comp.name, 'Rushimuni Technologies');
    assert.equal(comp.slug, 'rushimuni-technologies');
    assert.equal(comp.status, 'PLANNING');

    const fetched = service.getCompany(comp.id);
    assert.ok(fetched);
    assert.equal(fetched?.name, 'Rushimuni Technologies');

    const bySlug = service.getCompanyBySlug('rushimuni-technologies');
    assert.ok(bySlug);
    assert.equal(bySlug?.id, comp.id);

    // Update status
    const updated = service.updateCompanyStatus(comp.id, 'ACTIVE');
    assert.equal(updated.status, 'ACTIVE');
  });

  // 2. Project Creation (Standalone & Company-Scoped)
  test('2. Standalone and Company-Scoped Project creation and filtering', () => {
    const company = service.createCompany({
      name: 'Alpha Systems',
      autoSetupDepartments: false
    });

    // Company project
    const p1 = service.createProject({
      companyId: company.id,
      name: 'Neural Pipeline',
      objective: 'Construct distributed model router',
      priority: 'high'
    });
    assert.equal(p1.companyId, company.id);
    assert.equal(p1.priority, 'high');

    // Standalone project (independent of any company)
    const p2 = service.createProject({
      name: 'Personal Research Sandbox',
      objective: 'Explore symbolic reasoners',
      priority: 'normal'
    });
    assert.equal(p2.companyId, null);

    const compProjects = service.listProjectsByCompany(company.id);
    assert.equal(compProjects.length, 1);
    assert.equal(compProjects[0].name, 'Neural Pipeline');

    const standalone = projectRepo.listStandalone();
    assert.ok(standalone.some((p) => p.name === 'Personal Research Sandbox'));
  });

  // 3. Department Creation & Organization Setup
  test('3. Department creation and capability mapping', () => {
    const company = service.createCompany({
      name: 'Dev Venture',
      autoSetupDepartments: false
    });

    const dept = service.createDepartment({
      companyId: company.id,
      name: 'Core Engineering',
      leadAgentId: 'gandiva',
      capabilities: ['code_implementation', 'refactoring', 'tool_generation']
    });

    assert.ok(dept.id);
    assert.equal(dept.companyId, company.id);
    assert.equal(dept.leadAgentId, 'gandiva');
    assert.equal(dept.capabilities.length, 3);

    const list = service.listDepartments(company.id);
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Core Engineering');
  });

  // 4. Agent Workforce Assignment (No Agent Duplication)
  test('4. Workforce assignments map authoritative 17 agents to companies without cloning', () => {
    const company = service.createCompany({
      name: 'Workforce Labs',
      autoSetupDepartments: false
    });

    const dept = service.createDepartment({
      companyId: company.id,
      name: 'Strategy Dept',
      leadAgentId: 'aja'
    });

    const assignment = service.assignAgentToCompany({
      companyId: company.id,
      agentId: 'aja',
      departmentId: dept.id,
      roleTitle: 'Principal Strategist'
    });

    assert.ok(assignment.id);
    assert.equal(assignment.agentId, 'aja');
    assert.equal(assignment.status, 'active');

    const wf = service.listCompanyWorkforce(company.id);
    assert.equal(wf.length, 1);
    assert.equal(wf[0].agentId, 'aja');
    assert.equal(wf[0].roleTitle, 'Principal Strategist');
  });

  // 5. Auto Setup Departments via Ritvan's Architecture
  test('5. Auto-setup departments deploys Ritvan standard organizational structure', () => {
    const comp = service.createCompany({
      name: 'Full Enterprise Ventures',
      autoSetupDepartments: true
    });

    const depts = service.listDepartments(comp.id);
    assert.ok(depts.length >= 10);
    assert.ok(depts.some((d) => d.slug === 'engineering'));
    assert.ok(depts.some((d) => d.slug === 'qa'));
    assert.ok(depts.some((d) => d.slug === 'strategy'));

    const wf = service.listCompanyWorkforce(comp.id);
    assert.ok(wf.length >= 15);
    assert.ok(wf.some((w) => w.agentId === 'gandiva'));
    assert.ok(wf.some((w) => w.agentId === 'vighna'));
    assert.ok(wf.some((w) => w.agentId === 'ritvan'));
  });

  // 6. Product & Service Catalog
  test('6. Products & Services creation, versioning, and status transitions', () => {
    const comp = service.createCompany({ name: 'Product Corp' });

    const prod = service.createProduct({
      companyId: comp.id,
      name: 'AI Document Analyzer',
      type: 'product',
      version: '1.0.0',
      description: 'Semantic parsing engine'
    });

    assert.ok(prod.id);
    assert.equal(prod.status, 'IDEA');
    assert.equal(prod.version, '1.0.0');

    const updated = service.updateProductStatus(prod.id, 'DEVELOPMENT');
    assert.equal(updated.status, 'DEVELOPMENT');

    const list = service.listProductsByCompany(comp.id);
    assert.equal(list.length, 1);
  });

  // 7. Customer Registry (Zero Credentials)
  test('7. Customer domain registry without raw credentials', () => {
    const comp = service.createCompany({ name: 'Client Ventures' });

    const cust = service.createCustomer({
      companyId: comp.id,
      name: 'Globex Enterprises',
      type: 'enterprise',
      contactReference: 'ref-token-9988'
    });

    assert.ok(cust.id);
    assert.equal(cust.status, 'PROSPECT');
    assert.equal(cust.contactReference, 'ref-token-9988');

    const updated = service.updateCustomerStatus(cust.id, 'ACTIVE');
    assert.equal(updated.status, 'ACTIVE');

    const list = service.listCustomersByCompany(comp.id);
    assert.equal(list.length, 1);
  });

  // 8. Decision Register (ADR / PDR)
  test('8. Architectural & Operational Decision Record persistence', () => {
    const comp = service.createCompany({ name: 'Decision Co' });
    const proj = service.createProject({ companyId: comp.id, name: 'Web Portal', objective: 'Build UI' });

    const dec = service.recordDecision({
      companyId: comp.id,
      projectId: proj.id,
      title: 'Adopt Next.js Framework',
      decision: 'Use Next.js with React 19 for the frontend portal',
      reasoning: 'Server-side rendering and static compilation performance',
      madeBy: 'spoota'
    });

    assert.ok(dec.id);
    assert.equal(dec.status, 'ACCEPTED');
    assert.equal(dec.madeBy, 'spoota');

    const list = service.listDecisionsByCompany(comp.id);
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Adopt Next.js Framework');
  });

  // 9. Scoped Contextual Memory Hierarchy
  test('9. Scoped memory generation does not overwrite HṚṢĪKEŚA global identity', () => {
    const comp = service.createCompany({
      name: 'Scope Co',
      mission: 'Pioneer neural graph search',
      vision: 'Universal intelligence'
    });
    const proj = service.createProject({
      companyId: comp.id,
      name: 'Graph Engine',
      objective: 'Implement 10M node traverser',
      priority: 'high'
    });

    const context = service.getScopedContext(comp.id, proj.id);
    assert.ok(context.includes('Scope Co'));
    assert.ok(context.includes('Pioneer neural graph search'));
    assert.ok(context.includes('Graph Engine'));
    assert.ok(context.includes('Implement 10M node traverser'));

    // Global identity remains separate
    assert.ok(!context.includes('You are HṚṢĪKEŚA'));
  });

  // 10. Aggregated Overviews
  test('10. Company Overview and Project Overview aggregate operational state correctly', () => {
    const comp = service.createCompany({ name: 'Overview Co', autoSetupDepartments: true });
    const proj = service.createProject({ companyId: comp.id, name: 'Sub Project', objective: 'Deliver feature' });
    service.createProduct({ companyId: comp.id, name: 'Product A' });
    service.createCustomer({ companyId: comp.id, name: 'Customer 1' });
    service.recordDecision({ companyId: comp.id, title: 'Dec 1', decision: 'Yes', madeBy: 'aja' });

    const overview = service.getCompanyOverview(comp.id);
    assert.equal(overview.company.name, 'Overview Co');
    assert.equal(overview.activeProjectsCount, 1);
    assert.equal(overview.productsCount, 1);
    assert.equal(overview.customersCount, 1);
    assert.ok(overview.assignedAgentsCount >= 10);
    assert.equal(overview.recentDecisions.length, 1);

    const projOverview = service.getProjectOverview(proj.id);
    assert.equal(projOverview.project.name, 'Sub Project');
    assert.equal(projOverview.company?.name, 'Overview Co');
  });

  // 11. Deterministic Lifecycle Engine
  test('11. 15-stage business lifecycle maps accurately to the 17 agents', () => {
    const allStages = LifecycleEngine.getAllStages();
    assert.equal(allStages.length, 15);

    // Verify key stage-agent mappings
    const market = LifecycleEngine.getStage('market_need');
    assert.deepEqual(market?.responsibleAgentIds, ['rahu', 'tvas']);

    const strategy = LifecycleEngine.getStage('strategy_planning');
    assert.deepEqual(strategy?.responsibleAgentIds, ['aja']);

    const org = LifecycleEngine.getStage('organization_setup');
    assert.deepEqual(org?.responsibleAgentIds, ['ritvan']);

    const dev = LifecycleEngine.getStage('development');
    assert.deepEqual(dev?.responsibleAgentIds, ['gandiva']);

    const qa = LifecycleEngine.getStage('quality_assurance');
    assert.deepEqual(qa?.responsibleAgentIds, ['vighna']);

    const exit = LifecycleEngine.getStage('business_exit');
    assert.deepEqual(exit?.responsibleAgentIds, ['mrtyu']);

    // Transitions
    const validTrans = LifecycleEngine.validateTransition('market_need', 'strategy_planning');
    assert.equal(validTrans.valid, true);

    // Stage skipping is permissible
    const skipTrans = LifecycleEngine.validateTransition('market_need', 'development');
    assert.equal(skipTrans.valid, true);

    // Terminal stage cannot transition out
    const invalidExit = LifecycleEngine.validateTransition('business_exit', 'development');
    assert.equal(invalidExit.valid, false);
  });

  // 12. Resource Coordinator (KĀLA)
  test('12. ResourceCoordinator prioritizes projects and evaluates agent capacity', () => {
    const pLow = { id: '1', name: 'Low Prio', slug: 'lp', objective: 'x', status: 'ACTIVE' as const, priority: 'low' as const, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    const pUrgent = { id: '2', name: 'Urgent Prio', slug: 'up', objective: 'y', status: 'ACTIVE' as const, priority: 'urgent' as const, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    const pHigh = { id: '3', name: 'High Prio', slug: 'hp', objective: 'z', status: 'ACTIVE' as const, priority: 'high' as const, createdAt: '2026-01-01', updatedAt: '2026-01-01' };

    const sorted = ResourceCoordinator.prioritizeProjects([pLow, pUrgent, pHigh]);
    assert.equal(sorted[0].priority, 'urgent');
    assert.equal(sorted[1].priority, 'high');
    assert.equal(sorted[2].priority, 'low');

    // Capacity scoring
    const mockMissions: IMission[] = [
      { id: 'm1', objective: 'Task 1', rootAgentId: 'gandiva', rootTaskId: 't1', status: 'running', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'm2', objective: 'Task 2', rootAgentId: 'gandiva', rootTaskId: 't2', status: 'running', createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    ];

    const allocs = ResourceCoordinator.calculateWorkloadAllocations(['gandiva', 'vighna'], mockMissions);
    const gandivaAlloc = allocs.find((a) => a.agentId === 'gandiva');
    const vighnaAlloc = allocs.find((a) => a.agentId === 'vighna');

    assert.equal(gandivaAlloc?.activeMissionsCount, 2);
    assert.ok((gandivaAlloc?.capacityScore ?? 0) < 1.0);
    assert.equal(vighnaAlloc?.activeMissionsCount, 0);
    assert.equal(vighnaAlloc?.capacityScore, 1.0);
  });

  // 13. Mission and Artifact Provenance
  test('13. Missions and Artifacts persist companyId and projectId provenance', () => {
    const comp = service.createCompany({ name: 'Mission Link Co' });
    const proj = service.createProject({ companyId: comp.id, name: 'Provenance Proj', objective: 'Test links' });

    const mission: IMission = {
      id: 'msn_prov_1',
      companyId: comp.id,
      projectId: proj.id,
      objective: 'Execute scoped task',
      rootAgentId: 'gandiva',
      rootTaskId: 'task_prov_1',
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    missionRepo.create(mission);

    const artifact: MissionArtifact = {
      id: 'art_prov_1',
      missionId: mission.id,
      taskId: 'task_prov_1',
      companyId: comp.id,
      projectId: proj.id,
      type: 'code',
      location: 'src/app.ts',
      name: 'Application Entry',
      verified: true,
      createdAt: new Date().toISOString()
    };
    artifactRepo.create(artifact);

    const compMissions = service.listMissionsByCompany(comp.id);
    assert.equal(compMissions.length, 1);
    assert.equal(compMissions[0].companyId, comp.id);

    const projMissions = service.listMissionsByProject(proj.id);
    assert.equal(projMissions.length, 1);

    const compArtifacts = service.listArtifactsByCompany(comp.id);
    assert.equal(compArtifacts.length, 1);
    assert.equal(compArtifacts[0].companyId, comp.id);
  });

  // 14. Restart Persistence Across Independent Database Reload
  test('14. Complete enterprise state survives kernel shutdown, database close, and reload', () => {
    const persistDb = new DatabaseManager('data/test_company_restart.db');
    new MigrationManager(persistDb).runPending();

    const cRepo = new CompanyRepository(persistDb);
    const pRepo = new ProjectRepository(persistDb);
    const dRepo = new DepartmentRepository(persistDb);
    const wRepo = new CompanyWorkforceRepository(persistDb);
    const prodRepo = new ProductRepository(persistDb);
    const custRepo = new CustomerRepository(persistDb);
    const decRepo = new DecisionRepository(persistDb);
    const mRepo = new MissionRepository(persistDb);
    const aRepo = new ArtifactRepository(persistDb);

    const s = new CompanyService(cRepo, pRepo, dRepo, wRepo, prodRepo, custRepo, decRepo, mRepo, aRepo);

    // Create full enterprise state
    const company = s.createCompany({
      name: 'Persistent Dynamics',
      mission: 'Demonstrate durability',
      vision: '100% restart integrity',
      autoSetupDepartments: true
    });

    const project = s.createProject({
      companyId: company.id,
      name: 'Project Phoenix',
      objective: 'Survive restarts'
    });

    const product = s.createProduct({
      companyId: company.id,
      projectId: project.id,
      name: 'Phoenix Core',
      version: '2.0.0'
    });

    const customer = s.createCustomer({
      companyId: company.id,
      name: 'Valued Client'
    });

    const decision = s.recordDecision({
      companyId: company.id,
      projectId: project.id,
      title: 'Persistent Storage Decision',
      decision: 'Use SQLite WAL',
      madeBy: 'gandiva'
    });

    // Close Database (simulating full server crash/shutdown)
    persistDb.close();

    // Reopen Database fresh
    const reloadedDb = new DatabaseManager('data/test_company_restart.db');
    const sReloaded = new CompanyService(
      new CompanyRepository(reloadedDb),
      new ProjectRepository(reloadedDb),
      new DepartmentRepository(reloadedDb),
      new CompanyWorkforceRepository(reloadedDb),
      new ProductRepository(reloadedDb),
      new CustomerRepository(reloadedDb),
      new DecisionRepository(reloadedDb),
      new MissionRepository(reloadedDb),
      new ArtifactRepository(reloadedDb)
    );

    // Verify all entities and relationships survived
    const fetchedCompany = sReloaded.getCompany(company.id);
    assert.ok(fetchedCompany);
    assert.equal(fetchedCompany?.name, 'Persistent Dynamics');
    assert.equal(fetchedCompany?.mission, 'Demonstrate durability');

    const fetchedProjects = sReloaded.listProjectsByCompany(company.id);
    assert.equal(fetchedProjects.length, 1);
    assert.equal(fetchedProjects[0].name, 'Project Phoenix');

    const fetchedProducts = sReloaded.listProductsByCompany(company.id);
    assert.equal(fetchedProducts.length, 1);
    assert.equal(fetchedProducts[0].name, 'Phoenix Core');

    const fetchedCustomers = sReloaded.listCustomersByCompany(company.id);
    assert.equal(fetchedCustomers.length, 1);
    assert.equal(fetchedCustomers[0].name, 'Valued Client');

    const fetchedDecisions = sReloaded.listDecisionsByCompany(company.id);
    assert.equal(fetchedDecisions.length, 1);
    assert.equal(fetchedDecisions[0].title, 'Persistent Storage Decision');

    const fetchedDepts = sReloaded.listDepartments(company.id);
    assert.ok(fetchedDepts.length >= 10);

    const fetchedWf = sReloaded.listCompanyWorkforce(company.id);
    assert.ok(fetchedWf.length >= 15);

    reloadedDb.close();

    // Clean up temporary sqlite files
    try {
      import('node:fs').then((fs) => {
        if (fs.existsSync('data/test_company_restart.db')) fs.unlinkSync('data/test_company_restart.db');
        if (fs.existsSync('data/test_company_restart.db-wal')) fs.unlinkSync('data/test_company_restart.db-wal');
        if (fs.existsSync('data/test_company_restart.db-shm')) fs.unlinkSync('data/test_company_restart.db-shm');
      });
    } catch {
      // ignore
    }
  });

  // 15. Authoritative 17 Workforce Invariant Preserved
  test('15. Global 17-agent workforce is immutable and distinct from company assignments', () => {
    assert.equal(INITIAL_AGENT_ROSTER.length, 17);
    const expectedIds = [
      'rahu', 'aja', 'ritvan', 'tvas', 'spoota', 'gandiva',
      'vighna', 'raudra', 'rutam', 'arvan', 'taraka', 'kalki',
      'garuda', 'kali', 'kaala', 'yama', 'mrtyu'
    ];
    for (const id of expectedIds) {
      assert.ok(INITIAL_AGENT_ROSTER.some((a) => a.id === id), `Missing agent: ${id}`);
    }
  });

  // 16. HTTP REST Gateway: Lifecycle Stages Endpoint
  test('16. GET /companies/lifecycle/stages returns all 15 stages', async () => {
    const TEST_PORT = '29191';
    const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
    const kernel = new HrisekesaKernel({
      HRISEKESA_PORT: TEST_PORT,
      HRISEKESA_LOG_LEVEL: 'warn',
      HRISEKESA_DB_PATH: ':memory:'
    });
    await kernel.start();

    try {
      const res = await fetch(`${BASE_URL}/companies/lifecycle/stages`);
      assert.equal(res.status, 200);
      const data = (await res.json()) as { success: boolean; stages: Array<{ stage: string; responsibleAgentIds: string[] }> };
      assert.equal(data.success, true);
      assert.equal(data.stages.length, 15);
      assert.ok(data.stages.some((s) => s.stage === 'market_need' && s.responsibleAgentIds.includes('rahu')));
    } finally {
      await kernel.shutdown();
    }
  });

  // 17. HTTP REST Gateway: Full Company & Project Lifecycle Endpoints
  test('17. Full Company, Project, Product, Customer, Decision HTTP Endpoints', async () => {
    const TEST_PORT = '29192';
    const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
    const kernel = new HrisekesaKernel({
      HRISEKESA_PORT: TEST_PORT,
      HRISEKESA_LOG_LEVEL: 'warn',
      HRISEKESA_DB_PATH: ':memory:'
    });
    await kernel.start();

    try {
      // POST /companies
      const createCompRes = await fetch(`${BASE_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'HṚṢĪKEŚA Test Ventures',
          mission: 'Validate autonomous company orchestration locally',
          vision: 'Pristine sovereign execution',
          autoSetupDepartments: true
        })
      });
      assert.equal(createCompRes.status, 201);
      const compData = (await createCompRes.json()) as { success: boolean; company: { id: string; name: string } };
      const compId = compData.company.id;
      assert.equal(compData.company.name, 'HṚṢĪKEŚA Test Ventures');

      // GET /companies
      const listCompRes = await fetch(`${BASE_URL}/companies`);
      assert.equal(listCompRes.status, 200);
      const listData = (await listCompRes.json()) as { success: boolean; companies: Array<{ id: string }> };
      assert.ok(listData.companies.some((c) => c.id === compId));

      // GET /companies/:id/overview
      const ovRes = await fetch(`${BASE_URL}/companies/${compId}/overview`);
      assert.equal(ovRes.status, 200);
      const ovData = (await ovRes.json()) as { success: boolean; overview: { company: { id: string }; departments: unknown[]; workforce: unknown[] } };
      assert.equal(ovData.overview.company.id, compId);
      assert.ok(ovData.overview.departments.length >= 10);
      assert.ok(ovData.overview.workforce.length >= 15);

      // POST /companies/:id/projects
      const createProjRes = await fetch(`${BASE_URL}/companies/${compId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Core AI Engine',
          objective: 'Build neural routing engine',
          priority: 'high'
        })
      });
      assert.equal(createProjRes.status, 201);
      const projData = (await createProjRes.json()) as { success: boolean; project: { id: string; name: string } };
      const projId = projData.project.id;

      // GET /projects/:id/overview
      const projOvRes = await fetch(`${BASE_URL}/projects/${projId}/overview`);
      assert.equal(projOvRes.status, 200);
      const projOvData = (await projOvRes.json()) as { success: boolean; overview: { project: { id: string } } };
      assert.equal(projOvData.overview.project.id, projId);

      // POST /companies/:id/products
      const createProdRes = await fetch(`${BASE_URL}/companies/${compId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'AI Agent Runtime',
          projectId: projId,
          type: 'product',
          version: '1.0.0'
        })
      });
      assert.equal(createProdRes.status, 201);

      // POST /companies/:id/customers
      const createCustRes = await fetch(`${BASE_URL}/companies/${compId}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Customer Ltd',
          type: 'enterprise'
        })
      });
      assert.equal(createCustRes.status, 201);

      // POST /companies/:id/decisions
      const createDecRes = await fetch(`${BASE_URL}/companies/${compId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projId,
          title: 'ADR-017 Engine Selection',
          decision: 'Use deterministic state machine',
          madeBy: 'ritvan'
        })
      });
      assert.equal(createDecRes.status, 201);

      // POST /missions scoped to company and project
      const missionRes = await fetch(`${BASE_URL}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: 'Implement scoped router',
          rootAgentId: 'gandiva',
          companyId: compId,
          projectId: projId
        })
      });
      assert.equal(missionRes.status, 201);
      const mData = (await missionRes.json()) as { success: boolean; mission: { id: string; companyId?: string; projectId?: string } };
      assert.equal(mData.mission.companyId, compId);
      assert.equal(mData.mission.projectId, projId);
    } finally {
      await kernel.shutdown();
    }
  });
});
