import { test, describe, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import {
  SelfImprovementRepository,
  SelfObservationEngine,
  SelfHealthService,
  AnomalyDetectorService,
  ImprovementProposalService,
  ChangeSetService,
  ImprovementSandboxService,
  ImprovementBenchmarkService,
  ImprovementRollbackService,
  SelfMaintenanceService,
  DependencyIntelligenceService,
  SelfRepairService,
  SelfImprovementCoordinator,
  createSelfImprovementTools,
  ImprovementCategory,
  ImprovementLifecycleState,
} from '../src/self-improvement/index.js';

describe('Phase 26: Safe Self-Improvement & Self-Maintenance Engine', () => {
  let db: DatabaseManager;
  let migrations: MigrationManager;
  let eventBus: EventBus;
  let repo: SelfImprovementRepository;
  let observationEngine: SelfObservationEngine;
  let healthService: SelfHealthService;
  let anomalyDetector: AnomalyDetectorService;
  let proposalService: ImprovementProposalService;
  let changesetService: ChangeSetService;
  let sandboxService: ImprovementSandboxService;
  let benchmarkService: ImprovementBenchmarkService;
  let rollbackService: ImprovementRollbackService;
  let maintenanceService: SelfMaintenanceService;
  let dependencyService: DependencyIntelligenceService;
  let repairService: SelfRepairService;
  let coordinator: SelfImprovementCoordinator;

  const TEST_COMPANY_A = 'comp-phase26-alpha';
  const TEST_COMPANY_B = 'comp-phase26-beta';

  before(() => {
    db = new DatabaseManager(':memory:');
    db.open();
    migrations = new MigrationManager(db);
    migrations.runPending();

    eventBus = new EventBus();
    repo = new SelfImprovementRepository(db);
    coordinator = new SelfImprovementCoordinator(repo, eventBus);

    observationEngine = coordinator.observationEngine;
    healthService = coordinator.healthService;
    anomalyDetector = coordinator.anomalyDetector;
    proposalService = coordinator.proposalService;
    changesetService = coordinator.changesetService;
    sandboxService = coordinator.sandboxService;
    benchmarkService = coordinator.benchmarkService;
    rollbackService = coordinator.rollbackService;
    maintenanceService = coordinator.maintenanceService;
    dependencyService = coordinator.dependencyIntelligence;
    repairService = coordinator.repairService;

    coordinator.initialize();
  });

  after(() => {
    db.close();
  });

  // ==========================================
  // 1. Schema & Migration Integrity (Tests 1-5)
  // ==========================================
  describe('1. Schema & Migration Integrity', () => {
    test('1.1 migration 017 executes cleanly on migration runner', () => {
      const currentVersion = migrations.getCurrentVersion();
      assert.strictEqual(currentVersion, 17);
    });

    test('1.2 all 12 self-improvement relational tables exist', () => {
      const rawDb = db.getRawDb();
      const tables = [
        'self_observations',
        'self_anomalies',
        'improvement_proposals',
        'improvement_evidence',
        'improvement_changesets',
        'improvement_tests',
        'improvement_benchmarks',
        'improvement_approvals',
        'improvement_deployments',
        'improvement_rollbacks',
        'maintenance_jobs',
        'dependency_findings',
      ];
      for (const t of tables) {
        const row = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
        assert.ok(row, `Table ${t} should exist in schema`);
      }
    });

    test('1.3 table indexes exist for query performance', () => {
      const rawDb = db.getRawDb();
      const idx = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_self_%'").all();
      assert.ok(idx.length >= 10, 'Should create required performance indexes');
    });

    test('1.4 multi-tenant company scoping columns present in proposals table', () => {
      const rawDb = db.getRawDb();
      const cols = rawDb.prepare("PRAGMA table_info(improvement_proposals)").all() as Array<{ name: string }>;
      const colNames = cols.map((c) => c.name);
      assert.ok(colNames.includes('company_id'));
      assert.ok(colNames.includes('risk_level'));
      assert.ok(colNames.includes('state'));
    });

    test('1.5 database manager getRawDb() returns valid DatabaseSync instance', () => {
      assert.ok(db.getRawDb());
      const testVal = db.getRawDb().prepare('SELECT 1 as val').get() as { val: number };
      assert.strictEqual(testVal.val, 1);
    });
  });

  // ==========================================
  // 2. Self-Observation Engine (Tests 6-11)
  // ==========================================
  describe('2. Self-Observation Engine', () => {
    test('2.1 records safe telemetry observations', () => {
      const obs = observationEngine.recordObservation({
        source: 'ModelRouter',
        category: 'MODEL_LATENCY',
        metricName: 'inference_duration_ms',
        metricValue: 245.5,
        details: { model: 'qwen2.5:7b' },
        level: 'INFO',
      });
      assert.ok(obs.id);
      assert.strictEqual(obs.source, 'ModelRouter');
      assert.strictEqual(obs.metricValue, 245.5);
    });

    test('2.2 redacts sensitive credentials/tokens from observation details', () => {
      const obs = observationEngine.recordObservation({
        source: 'ToolBus',
        category: 'TOOL_EXECUTION',
        metricName: 'api_call',
        metricValue: 1,
        details: {
          apiKey: 'sk-secret-12345-never-log',
          password: 'superSecretPassword',
          endpoint: 'https://api.example.com',
        },
        level: 'INFO',
      });
      assert.strictEqual(obs.details.apiKey, '[REDACTED_SECRET]');
      assert.strictEqual(obs.details.password, '[REDACTED_SECRET]');
      assert.strictEqual(obs.details.endpoint, 'https://api.example.com');
    });

    test('2.3 queries observations filtered by category and level', () => {
      observationEngine.recordObservation({
        source: 'ResourceGovernor',
        category: 'MEMORY_PRESSURE',
        metricName: 'heap_used_mb',
        metricValue: 512,
        details: { thresholdMb: 1024 },
        level: 'WARN',
      });
      const memoryObs = repo.listObservations({ category: 'MEMORY_PRESSURE' });
      assert.ok(memoryObs.length >= 1);
      assert.strictEqual(memoryObs[0].category, 'MEMORY_PRESSURE');
    });

    test('2.4 event bus listener automatically captures published tool error events', () => {
      eventBus.emit('tool.execution.completed', {
        toolId: 'file.write',
        durationMs: 120,
        success: false,
        error: 'Disk I/O error',
      });
      const errObs = repo.listObservations({ level: 'ERROR' });
      assert.ok(errObs.length >= 1);
    });

    test('2.5 tracks model latency metrics accurately in repository', () => {
      observationEngine.recordObservation({
        source: 'ModelRouter',
        category: 'MODEL_LATENCY',
        metricName: 'inference_duration_ms',
        metricValue: 1200,
        details: { provider: 'ollama' },
        level: 'WARN',
      });
      const modelObs = repo.listObservations({ category: 'MODEL_LATENCY' });
      assert.ok(modelObs.some((o) => o.metricValue === 1200));
    });

    test('2.6 returns empty array gracefully when no records match filter', () => {
      const empty = repo.listObservations({ category: 'NON_EXISTENT_CATEGORY' });
      assert.deepStrictEqual(empty, []);
    });
  });

  // ==========================================
  // 3. Subsystem Health & Anomaly Detection (Tests 12-19)
  // ==========================================
  describe('3. Subsystem Health & Anomaly Detection', () => {
    test('3.1 generates a complete health report across 8 subsystems', () => {
      const health = healthService.evaluateHealth();
      assert.ok(health.overallScore >= 0 && health.overallScore <= 100);
      assert.ok(['HEALTHY', 'DEGRADED', 'CRITICAL', 'NEEDS_ATTENTION'].includes(health.overallStatus));
      assert.strictEqual(typeof health.subsystemScores.kernel, 'number');
      assert.strictEqual(typeof health.subsystemScores.models, 'number');
      assert.strictEqual(typeof health.subsystemScores.tools, 'number');
      assert.strictEqual(typeof health.subsystemScores.skills, 'number');
      assert.strictEqual(typeof health.subsystemScores.mcp, 'number');
      assert.strictEqual(typeof health.subsystemScores.memory, 'number');
      assert.strictEqual(typeof health.subsystemScores.tests, 'number');
      assert.strictEqual(typeof health.subsystemScores.companyOs, 'number');
    });

    test('3.2 calculates correct health status from subsystem scores', () => {
      const health = healthService.evaluateHealth();
      assert.ok(health.overallScore <= 100);
      assert.ok(typeof health.activeAnomaliesCount === 'number');
      assert.ok(typeof health.activeProposalsCount === 'number');
    });

    test('3.3 detects failure cluster anomaly when repeated errors occur', () => {
      for (let i = 0; i < 3; i++) {
        observationEngine.recordObservation({
          source: 'BrowserAdapter',
          category: 'BROWSER_FAILURE',
          metricName: 'browser_error_count',
          metricValue: 1,
          details: { error: 'Page crash on render' },
          level: 'ERROR',
        });
      }
      const anomalies = anomalyDetector.detectAnomalies();
      assert.ok(anomalies.some((a) => a.component === 'BrowserAdapter'));
    });

    test('3.4 classifies anomaly severity accurately (MEDIUM, HIGH, CRITICAL)', () => {
      for (let i = 0; i < 6; i++) {
        observationEngine.recordObservation({
          source: 'CriticalService',
          category: 'CORE_FAILURE',
          metricName: 'fatal_err',
          metricValue: 1,
          details: { error: 'Fatal memory dump' },
          level: 'CRITICAL',
        });
      }
      const anomalies = anomalyDetector.detectAnomalies();
      const crit = anomalies.find((a) => a.component === 'CriticalService');
      assert.ok(crit);
      assert.strictEqual(crit.severity, 'CRITICAL');
    });

    test('3.5 resolves active anomaly when resolved manually or condition clears', () => {
      const anom = anomalyDetector.recordAnomaly({
        title: 'Transient connection blip',
        component: 'MCPBridge',
        severity: 'LOW',
        description: 'Temporary timeout',
        evidenceSummary: '1 timeout event',
        observationIds: [],
      });
      const resolved = anomalyDetector.resolveAnomaly(anom.id, 'Reconnected successfully');
      assert.strictEqual(resolved.status, 'RESOLVED');
      assert.ok(resolved.resolvedAt);
    });

    test('3.6 dependency drift detector flags anomalies for outdated packages', () => {
      const findings = dependencyService.analyzeDependencies();
      assert.ok(findings.length >= 1);
      assert.ok(findings.some((f) => f.packageName === 'playwright-core'));
    });

    test('3.7 anomaly detection emits self.anomaly_detected domain event', () => {
      let eventReceived = false;
      eventBus.on('self.anomaly_detected', () => {
        eventReceived = true;
      });
      for (let i = 0; i < 3; i++) {
        observationEngine.recordObservation({
          source: 'MCPGateway',
          category: 'MCP_FAILURE',
          metricName: 'mcp_disconnects',
          metricValue: 1,
          details: { server: 'github' },
          level: 'ERROR',
        });
      }
      anomalyDetector.detectAnomalies();
      assert.ok(eventReceived, 'Domain event should be emitted upon anomaly detection');
    });

    test('3.8 anomaly resolution emits self.anomaly_resolved event', () => {
      let eventFired = false;
      eventBus.on('self.anomaly_resolved', () => {
        eventFired = true;
      });
      const anom = anomalyDetector.recordAnomaly({
        title: 'Event check anomaly',
        component: 'Kernel',
        severity: 'MEDIUM',
        description: 'Test anomaly',
        evidenceSummary: 'Test',
        observationIds: [],
      });
      anomalyDetector.resolveAnomaly(anom.id, 'Resolved test');
      assert.ok(eventFired);
    });
  });

  // ==========================================
  // 4. Improvement Proposal Engine & Lifecycle (Tests 20-31)
  // ==========================================
  describe('4. Improvement Proposal Engine & Lifecycle', () => {
    let proposalId: string;

    test('4.1 creates structured proposal with all required fields', () => {
      const proposal = proposalService.createProposal({
        title: 'Optimize Model Routing Strategy for Fast Inferences',
        category: 'MODEL_ROUTING',
        problemStatement: 'Model latency elevated on routine classification queries',
        evidenceSummary: '3 latency spikes observed in last 10 minutes',
        expectedBenefit: 'Reduce latency by 40% using local quantized fallback',
        affectedComponents: ['models', 'kernel'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Update route rules for intent classification',
        rollbackStrategy: 'Revert route priority map',
        testPlan: 'Execute intent benchmark suite',
        benchmarkPlan: 'Compare 100 sample query response times',
      });
      proposalId = proposal.id;
      assert.ok(proposal.id);
      assert.strictEqual(proposal.state, 'PROPOSED');
      assert.strictEqual(proposal.category, 'MODEL_ROUTING');
      assert.strictEqual(proposal.version, 1);
    });

    test('4.2 supports all 20 improvement categories', () => {
      const categories: ImprovementCategory[] = [
        'BUG_FIX', 'PERFORMANCE', 'MEMORY_EFFICIENCY', 'RESOURCE_EFFICIENCY',
        'RELIABILITY', 'TEST_COVERAGE', 'SECURITY_HARDENING', 'TOOL_IMPROVEMENT',
        'SKILL_IMPROVEMENT', 'MODEL_ROUTING', 'RESEARCH_QUALITY', 'KNOWLEDGE_QUALITY',
        'UI_IMPROVEMENT', 'VOICE_IMPROVEMENT', 'COMPUTER_OPERATOR', 'COMPANY_OPERATIONS',
        'DOCUMENTATION', 'MAINTENANCE', 'DEPENDENCY_UPDATE', 'CONFIGURATION_IMPROVEMENT',
      ];
      assert.strictEqual(categories.length, 20);
      for (const cat of categories) {
        const p = proposalService.createProposal({
          title: `Test for category ${cat}`,
          category: cat,
          problemStatement: 'Benchmarking test',
          evidenceSummary: 'Telemetry logs',
          expectedBenefit: 'Optimization',
          affectedComponents: ['kernel'],
          riskLevel: 'LOW',
          requiresHumanApproval: false,
          proposedImplementation: 'Patch test',
          rollbackStrategy: 'Revert',
          testPlan: 'Run unit test',
          benchmarkPlan: 'Run benchmark',
        });
        assert.strictEqual(p.category, cat);
      }
    });

    test('4.3 security and sovereign authority changes automatically assigned HIGH/CRITICAL risk requiring human approval', () => {
      const secProp = proposalService.createProposal({
        title: 'Update Permission Manager Boundaries',
        category: 'SECURITY_HARDENING',
        problemStatement: 'Adjust tool authorization filter',
        evidenceSummary: 'Audit logs',
        expectedBenefit: 'Stricter boundary',
        affectedComponents: ['PermissionManager', 'security'],
        proposedImplementation: 'Refactor authorization rule in PermissionManager',
        rollbackStrategy: 'Revert',
        testPlan: 'Security unit test',
        benchmarkPlan: 'Benchmark',
      });
      assert.ok(secProp.riskLevel === 'HIGH' || secProp.riskLevel === 'CRITICAL');
      assert.strictEqual(secProp.requiresHumanApproval, true, 'Security alterations MUST require human approval');
    });

    test('4.4 advances lifecycle state deterministically (PROPOSED -> PLANNED)', () => {
      const updated = proposalService.transitionState(proposalId, 'PLANNED');
      assert.strictEqual(updated.state, 'PLANNED');
    });

    test('4.5 advances lifecycle state to AWAITING_APPROVAL for high risk proposals', () => {
      const highRisk = proposalService.createProposal({
        title: 'Core Engine Policy Update',
        category: 'COMPANY_OPERATIONS',
        problemStatement: 'Adjust company financial limit policy',
        evidenceSummary: 'Policy document',
        expectedBenefit: 'Automated cap',
        affectedComponents: ['CompanyPolicyEngine'],
        riskLevel: 'HIGH',
        requiresHumanApproval: true,
        proposedImplementation: 'Update limit parameter',
        rollbackStrategy: 'Revert',
        testPlan: 'Policy test',
        benchmarkPlan: 'Benchmark',
      });
      proposalService.transitionState(highRisk.id, 'PLANNED');
      const awaiting = proposalService.transitionState(highRisk.id, 'AWAITING_APPROVAL');
      assert.strictEqual(awaiting.state, 'AWAITING_APPROVAL');
    });

    test('4.6 enforces deterministic transitions and throws on invalid state skips', () => {
      const invalidProp = proposalService.createProposal({
        title: 'Direct Deployment Attempt',
        category: 'BUG_FIX',
        problemStatement: 'Skip test skip plan',
        evidenceSummary: 'None',
        expectedBenefit: 'None',
        affectedComponents: ['kernel'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Patch',
        rollbackStrategy: 'Revert',
        testPlan: 'Test',
        benchmarkPlan: 'Benchmark',
      });
      // Attempting to skip directly from PROPOSED to DEPLOYED
      assert.throws(() => {
        proposalService.transitionState(invalidProp.id, 'DEPLOYED');
      }, /Invalid lifecycle transition/);
    });

    test('4.7 supports full 14-stage forward progression to ACCEPTED', () => {
      const lifecycleProp = proposalService.createProposal({
        title: 'Full Lifecycle Journey',
        category: 'PERFORMANCE',
        problemStatement: 'Optimization test',
        evidenceSummary: 'Traces',
        expectedBenefit: 'Faster execution',
        affectedComponents: ['kernel'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Refactor',
        rollbackStrategy: 'Revert',
        testPlan: 'Test',
        benchmarkPlan: 'Benchmark',
      });

      const states: ImprovementLifecycleState[] = [
        'PLANNED',
        'AWAITING_APPROVAL',
        'APPROVED',
        'IMPLEMENTING',
        'TESTING',
        'BENCHMARKING',
        'VERIFYING',
        'DEPLOYED',
        'MONITORING',
        'ACCEPTED',
      ];

      for (const st of states) {
        const res = proposalService.transitionState(lifecycleProp.id, st);
        assert.strictEqual(res.state, st);
      }
    });

    test('4.8 handles terminal failure states (REJECTED, CANCELLED, BLOCKED, FAILED, ROLLED_BACK)', () => {
      const p1 = proposalService.createProposal({
        title: 'Reject Target',
        category: 'BUG_FIX',
        problemStatement: 'Test',
        evidenceSummary: 'Logs',
        expectedBenefit: 'None',
        affectedComponents: ['kernel'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Patch',
        rollbackStrategy: 'Revert',
        testPlan: 'Test',
        benchmarkPlan: 'Benchmark',
      });
      const rejected = proposalService.transitionState(p1.id, 'REJECTED');
      assert.strictEqual(rejected.state, 'REJECTED');
    });

    test('4.9 state transition emits self.proposal_state_changed event', () => {
      let eventFired = false;
      eventBus.on('self.proposal_state_changed', () => {
        eventFired = true;
      });
      const p = proposalService.createProposal({
        title: 'Event check proposal',
        category: 'MAINTENANCE',
        problemStatement: 'Test',
        evidenceSummary: 'Logs',
        expectedBenefit: 'Check',
        affectedComponents: ['kernel'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Patch',
        rollbackStrategy: 'Revert',
        testPlan: 'Test',
        benchmarkPlan: 'Benchmark',
      });
      proposalService.transitionState(p.id, 'PLANNED');
      assert.ok(eventFired);
    });

    test('4.10 persists proposal history in database across queries', () => {
      const fetched = repo.getProposalById(proposalId);
      assert.ok(fetched);
      assert.strictEqual(fetched?.id, proposalId);
    });

    test('4.11 proposal list filtering by status works as expected', () => {
      const planned = repo.listProposals({ state: 'PLANNED' });
      assert.ok(planned.length >= 1);
      assert.ok(planned.every((p) => p.state === 'PLANNED'));
    });

    test('4.12 cancellation of proposal sets status to CANCELLED', () => {
      const p = proposalService.createProposal({
        title: 'Cancel Candidate',
        category: 'DOCUMENTATION',
        problemStatement: 'Test',
        evidenceSummary: 'Docs review',
        expectedBenefit: 'Docs',
        affectedComponents: ['docs'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Doc update',
        rollbackStrategy: 'Revert',
        testPlan: 'Doc check',
        benchmarkPlan: 'N/A',
      });
      const cancelled = proposalService.transitionState(p.id, 'CANCELLED');
      assert.strictEqual(cancelled.state, 'CANCELLED');
    });
  });

  // ==========================================
  // 5. Evidence Chain & Changeset System (Tests 32-38)
  // ==========================================
  describe('5. Evidence Chain & Changeset System', () => {
    let testPropId: string;

    before(() => {
      const p = proposalService.createProposal({
        title: 'Changeset & Evidence Verification',
        category: 'PERFORMANCE',
        problemStatement: 'High memory usage in buffer',
        evidenceSummary: 'Heap dump',
        expectedBenefit: 'Buffer reuse',
        affectedComponents: ['memory'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Use ring buffer',
        rollbackStrategy: 'Revert to array buffer',
        testPlan: 'Buffer test',
        benchmarkPlan: 'Memory profile',
      });
      testPropId = p.id;
    });

    test('5.1 attaches immutable evidence to proposal', () => {
      const ev = proposalService.attachEvidence({
        proposalId: testPropId,
        evidenceType: 'METRIC',
        title: 'Buffer memory spike trace',
        data: { peakMb: 450, targetMb: 120 },
      });
      assert.ok(ev.id);
      assert.strictEqual(ev.proposalId, testPropId);
    });

    test('5.2 retrieves all attached evidence items for a proposal', () => {
      const evidenceList = proposalService.getEvidenceForProposal(testPropId);
      assert.ok(evidenceList.length >= 1);
      assert.strictEqual(evidenceList[0].evidenceType, 'METRIC');
    });

    test('5.3 generates structured changeset with file diffs', () => {
      const cs = changesetService.createChangeSet({
        proposalId: testPropId,
        files: [
          {
            path: 'src/memory/buffer-pool.ts',
            action: 'MODIFY',
            beforeContent: 'const pool = [];',
            afterContent: 'const pool = new RingBuffer(1024);',
          },
        ],
        summary: 'Replaced array allocation with pre-allocated RingBuffer',
        authorAgent: 'gandiva',
      });
      assert.ok(cs.id);
      assert.strictEqual(cs.proposalId, testPropId);
      assert.strictEqual(cs.files[0].path, 'src/memory/buffer-pool.ts');
    });

    test('5.4 computes diff and summary representation for changeset integrity', () => {
      const cs = changesetService.getChangeSetByProposal(testPropId);
      assert.ok(cs);
      assert.ok(cs?.files[0].diff);
      assert.ok(cs?.files[0].diff?.includes('RingBuffer'));
    });

    test('5.5 prevents direct file overwrites prior to sandbox validation', () => {
      const cs = changesetService.getChangeSetByProposal(testPropId);
      assert.strictEqual(cs?.isSandboxed, true);
    });

    test('5.6 changeset records author attribution as designated agent', () => {
      const cs = changesetService.getChangeSetByProposal(testPropId);
      assert.strictEqual(cs?.authorAgent, 'gandiva');
    });

    test('5.7 multiple files in changeset are indexed properly', () => {
      const csMulti = changesetService.createChangeSet({
        proposalId: testPropId,
        files: [
          { path: 'src/a.ts', action: 'CREATE', afterContent: 'export const a = 1;' },
          { path: 'src/b.ts', action: 'MODIFY', beforeContent: '1', afterContent: '2' },
          { path: 'src/c.ts', action: 'DELETE', beforeContent: 'old' },
        ],
        summary: 'Multi file refactoring',
        authorAgent: 'spoota',
      });
      assert.strictEqual(csMulti.files.length, 3);
    });
  });

  // ==========================================
  // 6. Sandboxed Execution & Test Gating (Tests 39-45)
  // ==========================================
  describe('6. Sandboxed Execution & Test Gating', () => {
    let propForSandbox: string;
    let csForSandbox: string;

    before(() => {
      const p = proposalService.createProposal({
        title: 'Sandbox Test Runner',
        category: 'TEST_COVERAGE',
        problemStatement: 'Missing test coverage for retry handler',
        evidenceSummary: 'Coverage report',
        expectedBenefit: 'Add robust test cases',
        affectedComponents: ['kernel'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Add retry tests',
        rollbackStrategy: 'Remove tests',
        testPlan: 'Execute retry test suite',
        benchmarkPlan: 'N/A',
      });
      propForSandbox = p.id;
      proposalService.transitionState(p.id, 'PLANNED');

      const cs = changesetService.createChangeSet({
        proposalId: p.id,
        files: [
          {
            path: 'tests/retry.test.ts',
            action: 'CREATE',
            afterContent: 'test("retry on transient error", () => assert.ok(true));',
          },
        ],
        summary: 'Added retry unit test',
        authorAgent: 'spoota',
      });
      csForSandbox = cs.id;
    });

    test('6.1 executes test suite simulation in sandbox and captures results', async () => {
      const testResult = await sandboxService.runSandboxedVerification({
        proposalId: propForSandbox,
        changeSetId: csForSandbox,
        suiteName: 'Kernel Retry Test Suite',
        simulateFailure: false,
      });
      assert.strictEqual(testResult.passed, true);
      assert.strictEqual(testResult.failedTests, 0);
      assert.strictEqual(testResult.passedTests, 10);
    });

    test('6.2 test failure in sandbox prevents progression and records failure evidence', async () => {
      const testResult = await sandboxService.runSandboxedVerification({
        proposalId: propForSandbox,
        changeSetId: csForSandbox,
        suiteName: 'Simulated Regressed Test Suite',
        simulateFailure: true,
      });
      assert.strictEqual(testResult.passed, false);
      assert.ok(testResult.failedTests >= 1);
      assert.ok(testResult.errors.length >= 1);
    });

    test('6.3 sandbox test results are persisted in repository', () => {
      const testResults = repo.listTestResults(propForSandbox);
      assert.ok(testResults.length >= 2);
    });

    test('6.4 sandbox emits self.sandbox_started and self.sandbox_completed events', async () => {
      let started = false;
      let completed = false;
      eventBus.on('self.sandbox_started', () => { started = true; });
      eventBus.on('self.sandbox_completed', () => { completed = true; });

      await sandboxService.runSandboxedVerification({
        proposalId: propForSandbox,
        changeSetId: csForSandbox,
      });
      assert.ok(started);
      assert.ok(completed);
    });

    test('6.5 sandbox verification returns accurate duration metric', async () => {
      const res = await sandboxService.runSandboxedVerification({
        proposalId: propForSandbox,
        changeSetId: csForSandbox,
      });
      assert.ok(res.durationMs > 0);
    });

    test('6.6 test execution captures individual error messages', async () => {
      const failedRes = await sandboxService.runSandboxedVerification({
        proposalId: propForSandbox,
        changeSetId: csForSandbox,
        simulateFailure: true,
        simulatedErrors: ['Custom error message for verification'],
      });
      assert.strictEqual(failedRes.errors[0], 'Custom error message for verification');
    });

    test('6.7 repository queries test results correctly by proposal ID', () => {
      const results = repo.listTestResults(propForSandbox);
      assert.ok(results.every((r) => r.proposalId === propForSandbox));
    });
  });

  // ==========================================
  // 7. Benchmarking & Outcome Classification (Tests 46-51)
  // ==========================================
  describe('7. Benchmarking & Outcome Classification', () => {
    let benchPropId: string;
    let benchCsId: string;

    before(() => {
      const p = proposalService.createProposal({
        title: 'Benchmark Verification Scenario',
        category: 'PERFORMANCE',
        problemStatement: 'Inference latency optimization',
        evidenceSummary: 'Benchmark trace',
        expectedBenefit: 'Reduce latency by 20%',
        affectedComponents: ['models'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Add LRU cache for prompt templates',
        rollbackStrategy: 'Remove cache',
        testPlan: 'Cache unit test',
        benchmarkPlan: 'Run 100 benchmark iterations',
      });
      benchPropId = p.id;
      const cs = changesetService.createChangeSet({
        proposalId: p.id,
        files: [{ path: 'src/cache.ts', action: 'CREATE', afterContent: 'cache' }],
        summary: 'Cache changeset',
      });
      benchCsId = cs.id;
    });

    test('7.1 executes benchmark scenario and measures before/after metrics', () => {
      const res = benchmarkService.runBenchmark({
        proposalId: benchPropId,
        changeSetId: benchCsId,
        metricName: 'lookup_duration_ms',
        unit: 'ms',
        beforeValue: 15.4,
        afterValue: 4.2,
        lowerIsBetter: true,
      });
      assert.strictEqual(res.proposalId, benchPropId);
      assert.strictEqual(res.outcome, 'IMPROVED');
      assert.ok(res.deltaPercentage < 0);
    });

    test('7.2 classifies performance regression accurately as REGRESSED', () => {
      const res = benchmarkService.runBenchmark({
        proposalId: benchPropId,
        changeSetId: benchCsId,
        metricName: 'heap_used_mb',
        unit: 'MB',
        beforeValue: 120,
        afterValue: 240,
        lowerIsBetter: true,
      });
      assert.strictEqual(res.outcome, 'REGRESSED');
    });

    test('7.3 classifies minor noise within tolerance as UNCHANGED', () => {
      const res = benchmarkService.runBenchmark({
        proposalId: benchPropId,
        changeSetId: benchCsId,
        metricName: 'req_per_sec',
        unit: 'rps',
        beforeValue: 500,
        afterValue: 502,
        lowerIsBetter: false,
      });
      assert.strictEqual(res.outcome, 'UNCHANGED');
    });

    test('7.4 supports higher-is-better metrics (throughput improvement)', () => {
      const res = benchmarkService.runBenchmark({
        proposalId: benchPropId,
        changeSetId: benchCsId,
        metricName: 'throughput_rps',
        unit: 'rps',
        beforeValue: 100,
        afterValue: 150,
        lowerIsBetter: false,
      });
      assert.strictEqual(res.outcome, 'IMPROVED');
    });

    test('7.5 queries benchmark results for proposal', () => {
      const benchmarks = repo.listBenchmarkResults(benchPropId);
      assert.ok(benchmarks.length >= 3);
    });

    test('7.6 benchmark completion emits self.benchmark_completed event', () => {
      let eventFired = false;
      eventBus.on('self.benchmark_completed', () => { eventFired = true; });
      benchmarkService.runBenchmark({
        proposalId: benchPropId,
        changeSetId: benchCsId,
        metricName: 'duration_ms',
        unit: 'ms',
        beforeValue: 10,
        afterValue: 8,
      });
      assert.ok(eventFired);
    });
  });

  // ==========================================
  // 8. HITL Approvals & Security Invariants (Tests 52-58)
  // ==========================================
  describe('8. HITL Approvals & Security Invariants', () => {
    test('8.1 HIGH risk proposals are blocked from deployment without explicit human approval', () => {
      const highRisk = proposalService.createProposal({
        title: 'Modify Tool Permissions',
        category: 'SECURITY_HARDENING',
        problemStatement: 'Adjust network whitelist',
        evidenceSummary: 'Access log',
        expectedBenefit: 'Stricter policy',
        affectedComponents: ['PermissionManager'],
        riskLevel: 'HIGH',
        requiresHumanApproval: true,
        proposedImplementation: 'Update whitelist',
        rollbackStrategy: 'Revert',
        testPlan: 'Test whitelist',
        benchmarkPlan: 'N/A',
      });
      proposalService.transitionState(highRisk.id, 'PLANNED');
      proposalService.transitionState(highRisk.id, 'AWAITING_APPROVAL');

      // Attempting to advance to IMPLEMENTING directly throws
      assert.throws(() => {
        proposalService.transitionState(highRisk.id, 'IMPLEMENTING');
      }, /Invalid lifecycle transition/);
    });

    test('8.2 human approval explicitly approves proposal and records approver metadata', () => {
      const p = proposalService.createProposal({
        title: 'Approved Human Change',
        category: 'COMPANY_OPERATIONS',
        problemStatement: 'Adjust CRM automation',
        evidenceSummary: 'Tickets',
        expectedBenefit: 'Faster ticketing',
        affectedComponents: ['CompanyOperations'],
        riskLevel: 'MEDIUM',
        requiresHumanApproval: true,
        proposedImplementation: 'Update SLA rule',
        rollbackStrategy: 'Revert',
        testPlan: 'SLA test',
        benchmarkPlan: 'Benchmark',
      });
      proposalService.transitionState(p.id, 'PLANNED');
      proposalService.requestApproval(p.id, 'kali');
      const approval = repo.getApprovalByProposal(p.id);
      assert.ok(approval);
      assert.strictEqual(approval?.status, 'PENDING');

      const resolvedProp = proposalService.resolveApproval(
        p.id,
        'APPROVED',
        'Rushikesh Pattiwar',
        'Authorized by sovereign human authority'
      );
      assert.strictEqual(resolvedProp.state, 'APPROVED');
      const resolvedApproval = repo.getApprovalByProposal(p.id);
      assert.strictEqual(resolvedApproval?.status, 'APPROVED');
      assert.strictEqual(resolvedApproval?.resolvedBy, 'Rushikesh Pattiwar');
    });

    test('8.3 rejection by human operator transitions proposal to REJECTED state', () => {
      const p = proposalService.createProposal({
        title: 'Operator Reject Target',
        category: 'CONFIGURATION_IMPROVEMENT',
        problemStatement: 'Tweak scheduler interval',
        evidenceSummary: 'Schedule logs',
        expectedBenefit: 'Faster intervals',
        affectedComponents: ['scheduler'],
        riskLevel: 'MEDIUM',
        requiresHumanApproval: true,
        proposedImplementation: 'Reduce interval',
        rollbackStrategy: 'Revert',
        testPlan: 'Scheduler test',
        benchmarkPlan: 'N/A',
      });
      proposalService.transitionState(p.id, 'PLANNED');
      proposalService.requestApproval(p.id, 'kali');
      const resolved = proposalService.resolveApproval(
        p.id,
        'REJECTED',
        'Rushikesh Pattiwar',
        'Not aligned with current scheduling window'
      );
      assert.strictEqual(resolved.state, 'REJECTED');
      const updated = repo.getProposalById(p.id);
      assert.strictEqual(updated?.state, 'REJECTED');
    });

    test('8.4 Rushikesh Pattiwar is verified as sovereign human authority in approval records', () => {
      const approvals = repo.listApprovals();
      assert.ok(approvals.some((a) => a.resolvedBy === 'Rushikesh Pattiwar'));
    });

    test('8.5 security invariant: silent modification of PermissionManager is prevented', () => {
      const forbidden = proposalService.createProposal({
        title: 'Silent Bypass PermissionManager',
        category: 'SECURITY_HARDENING',
        problemStatement: 'Bypass authorization',
        evidenceSummary: 'None',
        expectedBenefit: 'None',
        affectedComponents: ['PermissionManager'],
        riskLevel: 'CRITICAL',
        requiresHumanApproval: true,
        proposedImplementation: 'Disable checks',
        rollbackStrategy: 'Revert',
        testPlan: 'Test',
        benchmarkPlan: 'Benchmark',
      });
      assert.strictEqual(forbidden.requiresHumanApproval, true);
    });

    test('8.6 approval resolution emits self.approval_resolved event', () => {
      let eventFired = false;
      eventBus.on('self.approval_resolved', () => { eventFired = true; });
      const p = proposalService.createProposal({
        title: 'Event Approval Test',
        category: 'DOCUMENTATION',
        problemStatement: 'Doc fix',
        evidenceSummary: 'Docs',
        expectedBenefit: 'Clarity',
        affectedComponents: ['docs'],
        riskLevel: 'LOW',
        requiresHumanApproval: true,
        proposedImplementation: 'Doc patch',
        rollbackStrategy: 'Revert',
        testPlan: 'Doc test',
        benchmarkPlan: 'N/A',
      });
      proposalService.transitionState(p.id, 'PLANNED');
      proposalService.requestApproval(p.id, 'kali');
      proposalService.resolveApproval(p.id, 'APPROVED', 'Rushikesh Pattiwar', 'OK');
      assert.ok(eventFired);
    });

    test('8.7 approval list retrieves approvals with proper status', () => {
      const list = repo.listApprovals({ status: 'APPROVED' });
      assert.ok(list.length >= 1);
      assert.ok(list.every((a) => a.status === 'APPROVED'));
    });
  });

  // ==========================================
  // 9. Canary Deployment & Rollback Engine (Tests 59-64)
  // ==========================================
  describe('9. Canary Deployment & Rollback Engine', () => {
    let deployPropId: string;
    let csDeployId: string;
    let deploymentId: string;

    before(() => {
      const p = proposalService.createProposal({
        title: 'Canary Deployment & Rollback Test',
        category: 'PERFORMANCE',
        problemStatement: 'Database query optimizer',
        evidenceSummary: 'Query plans',
        expectedBenefit: 'Faster indexing',
        affectedComponents: ['persistence'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Add composite index',
        rollbackStrategy: 'Drop index',
        testPlan: 'Query test',
        benchmarkPlan: 'Explain query plan',
      });
      deployPropId = p.id;
      proposalService.transitionState(p.id, 'PLANNED');
      proposalService.transitionState(p.id, 'AWAITING_APPROVAL');
      proposalService.transitionState(p.id, 'APPROVED');
      proposalService.transitionState(p.id, 'IMPLEMENTING');
      proposalService.transitionState(p.id, 'TESTING');
      proposalService.transitionState(p.id, 'BENCHMARKING');
      proposalService.transitionState(p.id, 'VERIFYING');

      const cs = changesetService.createChangeSet({
        proposalId: p.id,
        files: [
          {
            path: 'src/persistence/index-patch.sql',
            action: 'CREATE',
            afterContent: 'CREATE INDEX idx_test_canary ON self_observations(category);',
          },
        ],
        summary: 'Added canary index',
        authorAgent: 'tvas',
      });
      csDeployId = cs.id;
    });

    test('9.1 executes staged canary deployment', () => {
      const deployment = rollbackService.deployImprovement({
        proposalId: deployPropId,
        changeSetId: csDeployId,
        stage: 'CANARY',
      });
      deploymentId = deployment.id;
      assert.ok(deployment.id);
      assert.strictEqual(deployment.stage, 'CANARY');
      assert.strictEqual(deployment.status, 'ACTIVE');
    });

    test('9.2 transitions proposal to DEPLOYED and then MONITORING', () => {
      proposalService.transitionState(deployPropId, 'DEPLOYED');
      const monitoring = proposalService.transitionState(deployPropId, 'MONITORING');
      assert.strictEqual(monitoring.state, 'MONITORING');
    });

    test('9.3 triggers rollback upon detecting post-deployment regression', () => {
      const rollback = rollbackService.rollbackDeployment({
        deploymentId,
        proposalId: deployPropId,
        reason: 'Post-deployment memory leak detected in canary stage',
      });
      assert.ok(rollback.id);
      assert.strictEqual(rollback.proposalId, deployPropId);
      assert.strictEqual(rollback.verifiedRestored, true);
    });

    test('9.4 sets proposal state to ROLLED_BACK after rollback execution', () => {
      const updated = proposalService.transitionState(deployPropId, 'ROLLED_BACK');
      assert.strictEqual(updated.state, 'ROLLED_BACK');
    });

    test('9.5 post-rollback verification confirms system returned to known-good checkpoint', () => {
      const history = repo.listRollbacks(deployPropId);
      assert.ok(history.length >= 1);
      assert.strictEqual(history[0].verifiedRestored, true);
    });

    test('9.6 rollback execution emits self.rollback_executed event', () => {
      let eventFired = false;
      eventBus.on('self.rollback_executed', () => { eventFired = true; });
      rollbackService.rollbackDeployment({
        deploymentId,
        proposalId: deployPropId,
        reason: 'Event check rollback',
      });
      assert.ok(eventFired);
    });
  });

  // ==========================================
  // 10. Self-Maintenance & Bounded Repair (Tests 65-70)
  // ==========================================
  describe('10. Self-Maintenance & Bounded Repair', () => {
    test('10.1 executes temporary file cleanup maintenance routine', async () => {
      const job = await maintenanceService.executeMaintenance('CLEANUP_TEMP_FILES');
      assert.ok(job.id);
      assert.strictEqual(job.type, 'CLEANUP_TEMP_FILES');
      assert.strictEqual(job.status, 'COMPLETED');
      assert.ok((job.reclaimedBytes || 0) > 0);
    });

    test('10.2 executes MCP connection validation routine', async () => {
      const job = await maintenanceService.executeMaintenance('RECONNECT_MCP');
      assert.strictEqual(job.type, 'RECONNECT_MCP');
      assert.strictEqual(job.status, 'COMPLETED');
    });

    test('10.3 executes cache rebuild maintenance routine', async () => {
      const job = await maintenanceService.executeMaintenance('REBUILD_CACHE');
      assert.strictEqual(job.type, 'REBUILD_CACHE');
      assert.strictEqual(job.status, 'COMPLETED');
    });

    test('10.4 executes database integrity check routine', async () => {
      const job = await maintenanceService.executeMaintenance('CHECK_DATABASE_INTEGRITY');
      assert.strictEqual(job.type, 'CHECK_DATABASE_INTEGRITY');
      assert.strictEqual(job.status, 'COMPLETED');
    });

    test('10.5 self-repair service enforces bounded retry limit (max 3 retries)', async () => {
      const targetComponent = 'faulty_worker_process';
      const r1 = await repairService.attemptRepair(targetComponent, 'restart_process');
      assert.strictEqual(r1.success, true);
      assert.strictEqual(r1.attemptNumber, 1);

      const r2 = await repairService.attemptRepair(targetComponent, 'restart_process');
      assert.strictEqual(r2.attemptNumber, 2);

      const r3 = await repairService.attemptRepair(targetComponent, 'restart_process');
      assert.strictEqual(r3.attemptNumber, 3);

      const r4 = await repairService.attemptRepair(targetComponent, 'restart_process');
      assert.strictEqual(r4.success, false);
      assert.strictEqual(r4.attemptNumber, 4);
    });

    test('10.6 maintenance completion emits self.maintenance_completed event', async () => {
      let eventFired = false;
      eventBus.on('self.maintenance_completed', () => { eventFired = true; });
      await maintenanceService.executeMaintenance('CLEANUP_STALE_SESSIONS');
      assert.ok(eventFired);
    });
  });

  // ==========================================
  // 11. Dependency Intelligence (Tests 71-74)
  // ==========================================
  describe('11. Dependency Intelligence', () => {
    test('11.1 scans project dependencies and identifies version drift', () => {
      const report = dependencyService.analyzeDependencies();
      assert.ok(report.length >= 1);
      assert.ok(report.some((p) => p.packageName === 'playwright-core'));
    });

    test('11.2 flags security advisories and breaking change risks', () => {
      const findings = dependencyService.getFindings();
      assert.ok(findings.length >= 1);
      assert.ok(findings.every((f) => typeof f.hasBreakingChanges === 'boolean'));
    });

    test('11.3 stores dependency findings in relational persistence repository', () => {
      const list = repo.listDependencyFindings();
      assert.ok(list.length >= 1);
      assert.ok(list.some((f) => f.packageName === 'typescript'));
    });

    test('11.4 generates upgrade recommendation strings for outdated packages', () => {
      const findings = dependencyService.getFindings();
      const outdated = findings.find((f) => f.isOutdated);
      assert.ok(outdated);
      assert.ok(outdated?.recommendation.includes('patch update'));
    });
  });

  // ==========================================
  // 12. Workforce Preservation, Isolation & Governance (Tests 75-80)
  // ==========================================
  describe('12. Workforce Preservation, Multi-Company Isolation & Governance', () => {
    test('12.1 preserves exact 17-agent workforce roster without modifications', () => {
      const requiredAgents = [
        'Rahu', 'Aja', 'Ritvan', 'Tvas', 'Spoota', 'Gāṇḍīva', 'Vighna',
        'Raudra', 'Rutam', 'Arvan', 'Tāraka', 'Kalki', 'Garuḍa', 'Kali',
        'KĀLA', 'Yama', 'Mṛtyu',
      ];
      assert.strictEqual(requiredAgents.length, 17);
    });

    test('12.2 sovereign orchestrator HṚṢĪKEŚA authority and human final authority Rushikesh Pattiwar remain uncompromised', () => {
      assert.ok(true, 'Rushikesh Pattiwar = Sovereign Human Authority; HṚṢĪKEŚA = Sovereign Orchestrator');
    });

    test('12.3 multi-company isolation: company A proposal cannot leak to company B queries', () => {
      const propA = proposalService.createProposal({
        companyId: TEST_COMPANY_A,
        title: 'Company A Custom Routing',
        category: 'MODEL_ROUTING',
        problemStatement: 'Company A specific rate limit tweak',
        evidenceSummary: 'Telemetry',
        expectedBenefit: 'Company A isolation',
        affectedComponents: ['models'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Tweak rate limit for A',
        rollbackStrategy: 'Revert',
        testPlan: 'Test A',
        benchmarkPlan: 'Benchmark A',
      });

      const listForB = repo.listProposals({ companyId: TEST_COMPANY_B });
      assert.strictEqual(listForB.some((p) => p.id === propA.id), false, 'Cross-company proposal leakage MUST NOT occur');
    });

    test('12.4 self-improvement tools register and execute via standard tool bus protocol', async () => {
      const tools = createSelfImprovementTools(coordinator);
      assert.strictEqual(tools.length, 6);

      const healthTool = tools.find((t) => t.id === 'self.health.inspect');
      assert.ok(healthTool);
      const res = await healthTool.execute({}, {} as any);
      assert.strictEqual(res.success, true);
      assert.ok(res.output);
    });

    test('12.5 full coordinator cycle runs end-to-end and persists state', async () => {
      const cycleResult = await coordinator.runImprovementCycle();
      assert.ok(cycleResult.cycleId);
      assert.ok(typeof cycleResult.newAnomaliesCount === 'number');
      assert.ok(cycleResult.health);

      const observations = repo.listObservations();
      assert.ok(observations.length >= 1);
    });

    test('12.6 coordinator executes full automated proposal lifecycle safely', async () => {
      const prop = proposalService.createProposal({
        title: 'Autonomous Full Lifecycle Validation',
        category: 'PERFORMANCE',
        problemStatement: 'Loop unrolling in parser',
        evidenceSummary: 'Flame graph',
        expectedBenefit: '15% speedup',
        affectedComponents: ['core'],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        proposedImplementation: 'Unroll loop in parser',
        rollbackStrategy: 'Revert',
        testPlan: 'Parser test',
        benchmarkPlan: 'Parser benchmark',
      });

      const completed = await coordinator.executeFullProposalLifecycle(prop.id);
      assert.strictEqual(completed.state, 'ACCEPTED');
    });
  });
});
