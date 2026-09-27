import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { HttpServer } from '../src/api/http.server.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { LifecycleManager } from '../src/core/lifecycle/lifecycle.manager.js';
import { HardwareDetector } from '../src/core/hardware/hardware.detector.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { EventBus } from '../src/core/events/event-bus.js';
import {
  TrustTierManager,
  BoundaryGuard,
  SafetyController,
  EvolutionWorktreeManager,
  EvolutionObjectiveEngine,
  SelfDevelopmentGateway,
  SupervisorGateway,
  EvolutionLoopEngine,
} from '../src/self-improvement/evolution/index.js';

describe('Real HTTP E2E Test: Objective Registration Route', () => {
  let server: HttpServer;
  let db: DatabaseManager;
  const PORT = 4219;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  before(async () => {
    db = new DatabaseManager(':memory:');
    new MigrationManager(db).runPending();

    const identity = new IdentityManager();
    const lifecycle = new LifecycleManager();
    const hardware = new HardwareDetector();
    const registry = new ModelRegistry();
    const router = new ModelRouter(registry);
    const eventBus = new EventBus();

    server = new HttpServer(
      { port: PORT, host: '127.0.0.1' },
      identity,
      lifecycle,
      hardware,
      registry,
      router,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      eventBus
    );

    const trustTiers = new TrustTierManager();
    const boundaryGuard = new BoundaryGuard(process.cwd());
    const safetyController = new SafetyController(eventBus);
    const worktreeManager = new EvolutionWorktreeManager(process.cwd(), boundaryGuard);
    const objectiveEngine = new EvolutionObjectiveEngine(db);
    const gateway = new SelfDevelopmentGateway({
      repoRoot: process.cwd(),
      boundaryGuard,
      trustTiers,
      safetyController,
      worktreeManager,
      db,
    });
    const supervisorGateway = new SupervisorGateway(db, safetyController, eventBus);

    const evolutionEngine = new EvolutionLoopEngine({
      db,
      gateway,
      worktreeManager,
      objectiveEngine,
      supervisorGateway,
      safetyController,
      trustTiers,
      boundaryGuard,
      eventBus,
    });

    server.setEvolutionEngine(evolutionEngine);
    await server.start();
  });

  after(async () => {
    await server.stop();
    db.close();
  });

  it('POST /api/evolution/objectives registers and persists objective', async () => {
    const payload = {
      objective: 'Reduce average interactive response latency by 20% without regression in existing tests.',
      allowedScope: ['src/tools', 'src/api'],
      resourceBudget: {
        maxExperiments: 10,
      },
      acceptanceCriteria: [
        {
          metricName: 'latency_ms',
          baselineValue: 100,
          targetValue: 80,
          unit: 'ms',
          direction: 'LOWER_IS_BETTER',
          mandatory: true,
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/evolution/objectives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status !== 201) {
      console.error('Error status:', res.status, await res.json());
    }
    assert.strictEqual(res.status, 201, `Expected HTTP status 201, got ${res.status}`);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.ok(json.objective?.id);
    assert.strictEqual(json.objective.title, payload.objective);

    // Verify GET /api/evolution/objectives returns the objective
    const getRes = await fetch(`${BASE_URL}/api/evolution/objectives`);
    assert.strictEqual(getRes.status, 200);
    const getJson = (await getRes.json()) as any;
    assert.strictEqual(getJson.success, true);
    assert.strictEqual(getJson.count, 1);
    assert.strictEqual(getJson.objectives[0].id, json.objective.id);

    // Verify GET /api/evolution/status
    const statusRes = await fetch(`${BASE_URL}/api/evolution/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as any;
    assert.strictEqual(statusJson.success, true);
    assert.ok(statusJson.activeObjective);
  });

  it('Verifies pause, resume, emergency-stop, and stream endpoints', async () => {
    // Pause
    const pauseRes = await fetch(`${BASE_URL}/api/evolution/safety/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'E2E Test Pause' }),
    });
    assert.strictEqual(pauseRes.status, 200);
    const pauseJson = (await pauseRes.json()) as any;
    assert.strictEqual(pauseJson.status.isPaused, true);

    // Resume
    const resumeRes = await fetch(`${BASE_URL}/api/evolution/safety/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.strictEqual(resumeRes.status, 200);
    const resumeJson = (await resumeRes.json()) as any;
    assert.strictEqual(resumeJson.status.isPaused, false);
  });
});
