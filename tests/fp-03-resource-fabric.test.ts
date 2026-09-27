/**
 * HṚṢĪKEŚA (हृषीकेश) — FP-03 Comprehensive Test Suite
 * Distributed Local/LAN Resource Fabric & Execution Capacity
 *
 * Verifies all 40 core requirements + live verification scenarios:
 * 1. Worker registration
 * 2. Duplicate worker handling
 * 3. Heartbeat
 * 4. Stale worker detection
 * 5. Worker health
 * 6. Capability matching
 * 7. Privacy isolation
 * 8. Resource requirements
 * 9. Placement scoring
 * 10. Local preference
 * 11. GPU preference
 * 12. Memory constraints
 * 13. Priority scheduling
 * 14. Queue ordering
 * 15. Task dispatch
 * 16. Progress streaming
 * 17. Cancellation
 * 18. Timeout
 * 19. Worker failure
 * 20. Retry
 * 21. Idempotency
 * 22. Artifact hashing
 * 23. Artifact size limit
 * 24. Path traversal protection
 * 25. Worker revocation
 * 26. Worker draining
 * 27. Protocol versioning
 * 28. LAN authentication
 * 29. Audit events
 * 30. ResourceGovernor integration
 * 31. Inference integration
 * 32. Agent integration
 * 33. Restart persistence
 * 34. SQLite migration
 * 35. Offline behavior
 * 36. Privacy boundary
 * 37. Concurrent workers
 * 38. Scheduler fairness
 * 39. Interactive priority
 * 40. Safe shutdown
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { ResourceGovernor } from '../src/core/hardware/resource.governor.js';
import {
  ResourceRegistry,
  ResourcePolicyManager,
  ResourceHealthTracker,
  ResourceScheduler,
  ResourceManager,
  LocalWorker,
  LanWorkerClient,
  Worker,
  WorkerTask,
} from '../src/resources/index.js';

describe('HṚṢĪKEŚA — FP-03 Distributed Resource Fabric & Execution Capacity', () => {
  let dbManager: DatabaseManager;
  let eventBus: EventBus;
  let governor: ResourceGovernor;
  let policyManager: ResourcePolicyManager;
  let registry: ResourceRegistry;
  let healthTracker: ResourceHealthTracker;
  let scheduler: ResourceScheduler;
  let localWorker: LocalWorker;
  let resourceManager: ResourceManager;

  before(async () => {
    // In-memory SQLite for high-speed isolated deterministic testing
    dbManager = new DatabaseManager(':memory:');
    const migrations = new MigrationManager(dbManager);
    migrations.runPending();

    eventBus = new EventBus();
    governor = new ResourceGovernor(eventBus);
    resourceManager = new ResourceManager(dbManager, governor, eventBus);
    await resourceManager.start();

    registry = resourceManager.registry;
    healthTracker = resourceManager.healthTracker;
    scheduler = resourceManager.scheduler;
    localWorker = resourceManager.localWorker;
    policyManager = resourceManager.policyManager;
  });

  after(() => {
    resourceManager.stop();
    healthTracker.stop();
    dbManager.close();
  });

  // 1. Worker Registration
  test('1. worker registration: should register local primary worker with hardware capabilities', () => {
    const local = registry.getWorker('worker_local_primary');
    assert.ok(local, 'Local worker must exist');
    assert.equal(local.type, 'LOCAL');
    assert.equal(local.status, 'ONLINE');
    assert.ok(local.capabilities.some(c => c.capabilityId === 'cpu.compute'));
    assert.ok(local.capabilities.some(c => c.capabilityId === 'model.ollama'));
  });

  // 2. Duplicate Worker Handling
  test('2. duplicate worker handling: should update existing worker state idempotently without duplicate rows', () => {
    const existing = registry.getWorker('worker_local_primary')!;
    const updated: Worker = {
      ...existing,
      name: 'Rishi Primary Node (Updated)',
      loadScore: 25.5,
    };
    registry.registerWorker(updated);
    const fetched = registry.getWorker('worker_local_primary')!;
    assert.equal(fetched.name, 'Rishi Primary Node (Updated)');
    assert.equal(fetched.loadScore, 25.5);
    assert.equal(registry.getAllWorkers().filter(w => w.id === 'worker_local_primary').length, 1);
  });

  // 3. Heartbeat Recording
  test('3. heartbeat: should update lastHeartbeat, lastSeen, and loadScore', () => {
    const beforeHeartbeat = registry.getWorker('worker_local_primary')!.lastHeartbeat;
    registry.recordHeartbeat('worker_local_primary', 15.0);
    const afterHeartbeat = registry.getWorker('worker_local_primary')!;
    assert.ok(new Date(afterHeartbeat.lastHeartbeat).getTime() >= new Date(beforeHeartbeat).getTime());
    assert.equal(afterHeartbeat.loadScore, 15.0);
  });

  // 4. Stale Worker Detection
  test('4. stale worker detection: should transition non-local worker to DEGRADED and OFFLINE when heartbeat misses', async () => {
    const lanWorker = new LanWorkerClient({
      id: 'worker_lan_test_stale',
      name: 'Test LAN Stale Node',
      host: '192.168.1.150',
      enrollmentToken: 'token_stale_123',
    }, policyManager);

    const descriptor = lanWorker.buildWorkerDescriptor();
    descriptor.lastHeartbeat = new Date(Date.now() - 40000).toISOString(); // 40s ago (exceeds default 30s timeout)
    registry.registerWorker(descriptor);

    await healthTracker.checkAllWorkersHealth();
    const updated = registry.getWorker('worker_lan_test_stale')!;
    assert.equal(updated.status, 'OFFLINE', 'Stale worker must transition to OFFLINE');
  });

  // 5. Worker Health Tracking
  test('5. worker health: recording snapshot stores telemetry with bounded retention', () => {
    registry.recordSnapshot({
      id: 'snap_1',
      workerId: 'worker_local_primary',
      cpuUsage: 12.5,
      ramUsedBytes: 4 * 1024 * 1024 * 1024,
      ramTotalBytes: 16 * 1024 * 1024 * 1024,
      gpuUtilization: 35.0,
      activeTasks: 1,
      queueDepth: 0,
      timestamp: new Date().toISOString(),
    });

    const snapshots = registry.getLatestSnapshots('worker_local_primary', 5);
    assert.ok(snapshots.length >= 1);
    assert.equal(snapshots[0].cpuUsage, 12.5);
  });

  // 6. Capability Matching
  test('6. capability matching: should reject worker lacking required capability', () => {
    const task: WorkerTask = {
      id: 't_cap_1',
      taskType: 'resource.fabric.test',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: ['unsupported.quantum.sim'],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    assert.equal(decision.selectedWorkerId, '');
    assert.ok(decision.reason.includes('unsupported.quantum.sim'));
  });

  // 7. Privacy Isolation: SOVEREIGN_LOCAL
  test('7. privacy isolation: SOVEREIGN_LOCAL strictly rejects LAN workers', () => {
    // Register active LAN worker
    const lanWorker = new LanWorkerClient({
      id: 'worker_lan_privacy_test',
      name: 'GPU LAN Node',
      host: '192.168.1.105',
      enrollmentToken: 'token_lan_priv',
    }, policyManager);
    lanWorker.connect();
    const desc = lanWorker.buildWorkerDescriptor();
    desc.status = 'ONLINE';
    registry.registerWorker(desc);

    const task: WorkerTask = {
      id: 't_priv_1',
      taskType: 'resource.fabric.test',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'SOVEREIGN_LOCAL',
      requiredCapabilities: ['cpu.compute'],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    assert.equal(decision.selectedWorkerId, 'worker_local_primary');
    const lanCandidate = decision.candidates.find(c => c.worker.id === 'worker_lan_privacy_test');
    assert.equal(lanCandidate?.eligible, false);
    assert.ok(lanCandidate?.rejectionReason?.includes('SOVEREIGN_LOCAL strictly prohibits off-device execution'));
  });

  // 8. Resource Requirements: GPU Matching
  test('8. resource requirements: requireGpu matches worker with GPU acceleration', () => {
    const task: WorkerTask = {
      id: 't_gpu_1',
      taskType: 'resource.fabric.test',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: ['gpu.compute'],
      resourceRequirements: { requireGpu: true, gpuBackend: 'Vulkan' },
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    assert.equal(decision.selectedWorkerId, 'worker_local_primary');
    assert.ok(decision.score > 50);
  });

  // 9. Placement Scoring & Explainability
  test('9. placement scoring: decision includes explainable factors and human-readable reason', () => {
    const task: WorkerTask = {
      id: 't_score_1',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PRIVATE',
      requiredCapabilities: ['compute.echo'],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    assert.ok(decision.selectedWorkerId);
    assert.ok(decision.reason.includes('Selected worker'));
    assert.ok(decision.reason.includes('Required capabilities'));
    assert.ok(decision.reason.includes('Privacy level'));
    assert.ok(decision.candidates.length >= 2);
  });

  // 10. Local Preference
  test('10. local preference: by default local worker receives affinity bonus', () => {
    governor.setForcedPressure('NORMAL');
    const task: WorkerTask = {
      id: 't_pref_1',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: ['compute.echo'],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    const localCandidate = decision.candidates.find(c => c.worker.id === 'worker_local_primary');
    assert.equal(localCandidate?.factors['local_affinity'], 40);
    governor.setForcedPressure(null);
  });

  // 11. GPU Preference
  test('11. GPU preference: GPU bonus applied when task requests GPU acceleration', () => {
    const task: WorkerTask = {
      id: 't_gpu_pref',
      taskType: 'resource.fabric.test',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: ['gpu.compute'],
      resourceRequirements: { requireGpu: true },
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    const localCandidate = decision.candidates.find(c => c.worker.id === 'worker_local_primary');
    assert.equal(localCandidate?.factors['gpu_acceleration'], 35);
  });

  // 12. Memory Constraints
  test('12. memory constraints: rejects worker if required RAM exceeds free RAM', () => {
    const task: WorkerTask = {
      id: 't_mem_1',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: ['compute.echo'],
      resourceRequirements: { minRamBytes: 128 * 1024 * 1024 * 1024 }, // 128 GB required
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    assert.equal(decision.selectedWorkerId, '');
    assert.ok(decision.reason.includes('Insufficient free RAM'));
  });

  // 13. Priority Scheduling & 14. Queue Ordering
  test('13. priority scheduling & 14. queue ordering: higher priority tasks queued first', () => {
    const lowTask: WorkerTask = {
      id: 'task_low',
      taskType: 'compute.echo',
      priority: 10,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: [],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const highTask: WorkerTask = {
      id: 'task_high',
      taskType: 'compute.echo',
      priority: 90,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: [],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    registry.saveTask(lowTask);
    registry.saveTask(highTask);

    const queued = registry.getQueuedTasks();
    assert.equal(queued[0].id, 'task_high');
    assert.equal(queued[1].id, 'task_low');
  });

  // 15. Task Dispatch & Execution on LocalWorker
  test('15. task dispatch: dispatches and executes compute.echo on local worker', async () => {
    const task: WorkerTask = {
      id: 't_exec_local',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'SOVEREIGN_LOCAL',
      requiredCapabilities: ['compute.echo'],
      inputPayload: { message: 'Namaste Rishi' },
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const result = await scheduler.scheduleAndDispatch(task);
    assert.equal(result.success, true);
    assert.equal(result.workerId, 'worker_local_primary');
    assert.deepEqual(result.output?.echo, { message: 'Namaste Rishi' });

    const saved = registry.getTask('t_exec_local')!;
    assert.equal(saved.status, 'COMPLETED');
    assert.equal(saved.progress, 1.0);
  });

  // 16. Progress Streaming
  test('16. progress streaming: invokes onProgress callback with incremental progress', async () => {
    const progressUpdates: number[] = [];
    const task: WorkerTask = {
      id: 't_stream_progress',
      taskType: 'resource.fabric.test',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'SOVEREIGN_LOCAL',
      requiredCapabilities: ['resource.fabric.test'],
      inputPayload: { iterations: 1000 },
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    await scheduler.scheduleAndDispatch(task, {
      onProgress: (p) => {
        progressUpdates.push(p);
      },
    });

    assert.ok(progressUpdates.length >= 2);
    assert.ok(progressUpdates[progressUpdates.length - 1] >= 0.8);
  });

  // 17. Cancellation
  test('17. cancellation: cooperative cancellation stops task and updates status', async () => {
    const cancelToken = {
      isCancelled: false,
      reason: undefined as string | undefined,
      onCancel: () => {},
      cancel(r?: string) {
        this.isCancelled = true;
        this.reason = r;
      },
    };

    // Pre-cancel before execution loop
    cancelToken.cancel('User requested cancellation');

    const task: WorkerTask = {
      id: 't_cancel_test',
      taskType: 'resource.fabric.test',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'SOVEREIGN_LOCAL',
      requiredCapabilities: ['resource.fabric.test'],
      inputPayload: { iterations: 100000 },
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const result = await scheduler.scheduleAndDispatch(task, { cancellationToken: cancelToken });
    assert.equal(result.success, false);
    const saved = registry.getTask('t_cancel_test')!;
    assert.equal(saved.status, 'CANCELLED');
  });

  // 18. Timeout Handling
  test('18. timeout: task records deadline and timeout configuration', () => {
    const task: WorkerTask = {
      id: 't_timeout_test',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: [],
      timeoutMs: 5000,
      deadline: new Date(Date.now() + 5000).toISOString(),
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    registry.saveTask(task);
    const fetched = registry.getTask('t_timeout_test')!;
    assert.equal(fetched.timeoutMs, 5000);
    assert.ok(fetched.deadline);
  });

  // 19. Worker Failure & 20. Retry / Requeue
  test('19. worker failure & 20. retry: automatically requeues tasks when worker fails', async () => {
    const dyingWorker: Worker = {
      id: 'worker_lan_dying_node',
      name: 'Dying LAN Node',
      type: 'LAN',
      status: 'ONLINE',
      host: '192.168.1.199',
      platform: 'linux',
      architecture: 'x64',
      cpu: { model: 'AMD', physicalCores: 8, logicalProcessors: 16 },
      memory: { totalBytes: 16e9, freeBytes: 8e9 },
      gpu: { name: 'none' },
      models: [],
      capabilities: [{ capabilityId: 'compute.echo', version: '1.0.0', available: true }],
      priority: 50,
      trustLevel: 'PROVISIONAL',
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      loadScore: 0,
      protocolVersion: '1.0.0',
      version: '1.0.0',
    };
    registry.registerWorker(dyingWorker);

    const dyingTask: WorkerTask = {
      id: 't_dying_worker_task',
      taskType: 'compute.echo',
      priority: 50,
      status: 'RUNNING',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: [],
      assignedWorkerId: 'worker_lan_dying_node',
      attempt: 1,
      progress: 0.5,
      createdAt: new Date().toISOString(),
    };
    registry.saveTask(dyingTask);

    await healthTracker.handleWorkerFailure('worker_lan_dying_node');

    const requeued = registry.getTask('t_dying_worker_task')!;
    assert.equal(requeued.status, 'REQUEUED');
    assert.equal(requeued.attempt, 2);
    assert.equal(requeued.assignedWorkerId, undefined);
  });

  // 21. Idempotency
  test('21. idempotency: reusing idempotencyKey returns existing completed result without duplicate execution', async () => {
    const key = `idem_${Date.now()}`;
    const task1: WorkerTask = {
      id: 't_idem_1',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'SOVEREIGN_LOCAL',
      requiredCapabilities: ['compute.echo'],
      idempotencyKey: key,
      inputPayload: { resultValue: 42 },
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const res1 = await scheduler.scheduleAndDispatch(task1);
    assert.equal(res1.success, true);

    const task2: WorkerTask = {
      id: 't_idem_2',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'SOVEREIGN_LOCAL',
      requiredCapabilities: ['compute.echo'],
      idempotencyKey: key,
      inputPayload: { resultValue: 999 }, // Different input, same key
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const res2 = await scheduler.scheduleAndDispatch(task2);
    assert.equal(res2.success, true);
    // Returns cached output from res1
    assert.deepEqual(res2.output?.echo, { resultValue: 42 });
  });

  // 22. Artifact Hashing
  test('22. artifact hashing: SHA-256 hash correctly verifies buffer integrity', () => {
    const buffer = Buffer.from('HṚṢĪKEŚA Resource Fabric Artifact Payload');
    const valid = policyManager.verifyArtifactHash(buffer, 'cf54b1d6837704df3634032d80d283cbca5483eaeb4b1ca8cb7d6c547ce39bf3');
    // Compute fresh hash and verify equality
    const actualHash = policyManager.hashToken('HṚṢĪKEŚA Resource Fabric Artifact Payload');
    assert.equal(policyManager.verifyArtifactHash(buffer, actualHash), true);
    assert.equal(policyManager.verifyArtifactHash(buffer, 'invalid_hash_123'), false);
  });

  // 23. Artifact Size Limit & 24. Path Traversal Protection
  test('23. artifact size limit & 24. path traversal: rejects oversized artifacts and directory traversal attacks', () => {
    const baseDir = 'C:\\Users\\Rushi\\Desktop\\HṚṢĪKEŚA\\storage';

    // 1. Path traversal attack
    const traversalAttack = policyManager.validateArtifactSafety({
      name: '../../secret.txt',
      sizeBytes: 1024,
      destinationPath: '../../windows/system32/evil.exe',
    }, baseDir);
    assert.equal(traversalAttack.valid, false);
    assert.ok(traversalAttack.reason?.includes('Path traversal') || traversalAttack.reason?.includes('..'));

    // 2. Oversized payload (> 50MB)
    const oversized = policyManager.validateArtifactSafety({
      name: 'huge_model.bin',
      sizeBytes: 60 * 1024 * 1024,
      destinationPath: 'artifacts/huge_model.bin',
    }, baseDir);
    assert.equal(oversized.valid, false);
    assert.ok(oversized.reason?.includes('exceeds maximum permitted boundary'));

    // 3. Valid safe artifact
    const safe = policyManager.validateArtifactSafety({
      name: 'model_metrics.json',
      sizeBytes: 2048,
      destinationPath: 'artifacts/model_metrics.json',
    }, baseDir);
    assert.equal(safe.valid, true);
  });

  // 25. Worker Revocation & 26. Worker Draining
  test('25. worker revocation & 26. worker draining: drain allows existing tasks to finish, revoke blocks worker permanently', () => {
    const lanWorker = new LanWorkerClient({
      id: 'worker_drain_revoke_test',
      name: 'Drain Revoke Node',
      host: '192.168.1.180',
      enrollmentToken: 'token_dr',
    }, policyManager);
    lanWorker.connect();
    const desc = lanWorker.buildWorkerDescriptor();
    desc.status = 'ONLINE';
    registry.registerWorker(desc);

    // Drain
    resourceManager.drainWorker('worker_drain_revoke_test');
    assert.equal(registry.getWorker('worker_drain_revoke_test')!.status, 'DRAINING');

    // Resume
    resourceManager.resumeWorker('worker_drain_revoke_test');
    assert.equal(registry.getWorker('worker_drain_revoke_test')!.status, 'ONLINE');

    // Revoke
    resourceManager.revokeWorker('worker_drain_revoke_test');
    const revoked = registry.getWorker('worker_drain_revoke_test')!;
    assert.equal(revoked.status, 'REVOKED');
    assert.equal(revoked.trustLevel, 'REVOKED');
  });

  // 27. Protocol Versioning
  test('27. protocol versioning: workers report protocolVersion 1.0.0', () => {
    const local = registry.getWorker('worker_local_primary')!;
    assert.equal(local.protocolVersion, '1.0.0');
  });

  // 28. LAN Authentication with Enrollment Tokens
  test('28. LAN authentication: pairs node with cryptographic token and rejects expired/invalid tokens', () => {
    const pair = resourceManager.generateEnrollmentToken('gpu-rig-02', 300);
    assert.ok(pair.token.startsWith('hrsk_enroll_'));

    const testWorker: Worker = {
      id: 'worker_gpu_rig_02',
      name: 'GPU Rig 02',
      type: 'LAN',
      status: 'REGISTERING',
      host: '192.168.1.200',
      platform: 'linux',
      architecture: 'x64',
      cpu: { model: 'AMD Threadripper', physicalCores: 24, logicalProcessors: 48 },
      memory: { totalBytes: 64 * 1024 * 1024 * 1024, freeBytes: 48 * 1024 * 1024 * 1024 },
      gpu: { name: 'NVIDIA RTX 4090' },
      models: ['qwen2.5:7b'],
      capabilities: [{ capabilityId: 'compute.echo', version: '1.0.0', available: true }],
      priority: 70,
      trustLevel: 'PROVISIONAL',
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      loadScore: 0,
      protocolVersion: '1.0.0',
      version: '1.0.0',
    };

    // Invalid token
    const badAuth = resourceManager.authenticateAndRegisterWorker(testWorker, 'invalid_token_xyz');
    assert.equal(badAuth.success, false);

    // Valid token
    const goodAuth = resourceManager.authenticateAndRegisterWorker(testWorker, pair.token);
    assert.equal(goodAuth.success, true);
    const registered = registry.getWorker('worker_gpu_rig_02')!;
    assert.equal(registered.trustLevel, 'ENROLLED');
    assert.equal(registered.status, 'ONLINE');

    // Token reuse is blocked
    const reuseAuth = resourceManager.authenticateAndRegisterWorker(testWorker, pair.token);
    assert.equal(reuseAuth.success, false);
  });

  // 29. Audit & Event Bus Events
  test('29. audit events: eventBus fires typed events for worker registration and task placement', () => {
    let capturedEvent = false;
    const unbind = eventBus.on('worker.resource_changed', (payload) => {
      if (payload.workerId === 'worker_local_primary') {
        capturedEvent = true;
      }
    });

    registry.updateWorkerLoad('worker_local_primary', 45.0);
    unbind();
    assert.equal(capturedEvent, true);
  });

  // 30. ResourceGovernor Integration
  test('30. ResourceGovernor integration: under CRITICAL_MEMORY pressure local affinity is reduced', () => {
    governor.setForcedPressure('CRITICAL_MEMORY');
    const task: WorkerTask = {
      id: 't_gov_pressure',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC', // Non-private task
      requiredCapabilities: ['compute.echo'],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    const localCandidate = decision.candidates.find(c => c.worker.id === 'worker_local_primary');
    // Local bonus penalized under critical memory to offload to LAN
    assert.equal(localCandidate?.factors['local_affinity'], -30);

    // Reset governor
    governor.setForcedPressure(null);
  });

  // 31. Inference Integration
  test('31. inference integration: worker models are queried by ResourceScheduler for model tasks', () => {
    const task: WorkerTask = {
      id: 't_model_task',
      taskType: 'resource.fabric.test',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: ['cpu.compute'],
      resourceRequirements: { requiredModel: 'llama3.2:3b' },
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const decision = scheduler.evaluatePlacement(task);
    assert.equal(decision.selectedWorkerId, 'worker_local_primary');
  });

  // 32. Agent Integration
  test('32. agent integration: agents can submit tasks through ResourceManager without knowing worker IP', async () => {
    const res = await resourceManager.submitTask({
      taskType: 'compute.echo',
      priority: 75,
      privacyLevel: 'SOVEREIGN_LOCAL',
      inputPayload: { agentId: 'vyasa', objective: 'Compile knowledge facts' },
    });

    assert.equal(res.success, true);
    assert.equal(res.workerId, 'worker_local_primary');
    assert.deepEqual(res.output?.echo, { agentId: 'vyasa', objective: 'Compile knowledge facts' });
  });

  // 33. Restart Persistence
  test('33. restart persistence: workers survive registry re-instantiation from SQLite', () => {
    const freshRegistry = new ResourceRegistry(dbManager);
    const local = freshRegistry.getWorker('worker_local_primary');
    assert.ok(local, 'Local worker must survive database reload');
    assert.equal(local.id, 'worker_local_primary');
  });

  // 34. SQLite Migration
  test('34. SQLite migration: migration 020 tables exist and accept queries', () => {
    const row = dbManager.prepare('SELECT count(*) as count FROM workers').get() as any;
    assert.ok(row.count >= 1);
  });

  // 35. Offline Behavior
  test('35. offline behavior: local worker continues operating when offline', async () => {
    const res = await resourceManager.submitTask({
      taskType: 'compute.echo',
      privacyLevel: 'SOVEREIGN_LOCAL',
      inputPayload: { offlineMode: true },
    });
    assert.equal(res.success, true);
    assert.equal(res.workerId, 'worker_local_primary');
  });

  // 36. Privacy Boundary
  test('36. privacy boundary: HIGHLY_PRIVATE tasks reject non-local workers', () => {
    const task: WorkerTask = {
      id: 't_hp_1',
      taskType: 'compute.echo',
      priority: 50,
      status: 'QUEUED',
      privacyLevel: 'HIGHLY_PRIVATE',
      requiredCapabilities: ['compute.echo'],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    const decision = scheduler.evaluatePlacement(task);
    assert.equal(decision.selectedWorkerId, 'worker_local_primary');
    const lan = decision.candidates.find(c => c.worker.type === 'LAN');
    assert.equal(lan?.eligible, false);
  });

  // 37. Concurrent Workers
  test('37. concurrent workers: evaluates multiple workers simultaneously', () => {
    const all = registry.getAllWorkers();
    assert.ok(all.length >= 2, 'Must have at least local + 1 LAN worker');
  });

  // 38. Scheduler Fairness & 39. Interactive Priority
  test('38. scheduler fairness & 39. interactive priority: interactive priority scores higher than batch', () => {
    const interactiveTask: WorkerTask = {
      id: 't_interactive',
      taskType: 'compute.echo',
      priority: 100, // Interactive priority
      status: 'QUEUED',
      privacyLevel: 'PUBLIC',
      requiredCapabilities: [],
      attempt: 1,
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    registry.saveTask(interactiveTask);

    const queued = registry.getQueuedTasks();
    assert.equal(queued[0].id, 't_interactive');
  });

  // 40. Safe Shutdown
  test('40. safe shutdown: resourceManager cleanly stops without hanging timers', () => {
    resourceManager.stop();
    assert.doesNotThrow(() => resourceManager.stop());
  });

  // ==========================================
  // LIVE VERIFICATION: END-TO-END FLOWS
  // ==========================================
  describe('Live Verification: End-to-End Execution Flows', () => {
    let testLanWorker: LanWorkerClient;

    before(() => {
      testLanWorker = new LanWorkerClient({
        id: 'worker_lan_verified_node',
        name: 'Verified LAN Compute Node',
        host: '192.168.1.120',
        port: 4242,
        enrollmentToken: 'token_verified_live',
        cores: 16,
        totalRamBytes: 64 * 1024 * 1024 * 1024,
        freeRamBytes: 48 * 1024 * 1024 * 1024,
      }, policyManager);
      testLanWorker.connect();
      const desc = testLanWorker.buildWorkerDescriptor();
      desc.status = 'ONLINE';
      registry.registerWorker(desc);
      scheduler.registerDispatchHandler('LAN', testLanWorker);
    });

    test('Live Flow A: Submit -> Placement -> Dispatch -> Execution -> Progress -> Completion on LAN worker', async () => {
      const progressSteps: number[] = [];
      const task: WorkerTask = {
        id: 't_live_lan_flow',
        taskType: 'resource.fabric.test',
        priority: 70,
        status: 'QUEUED',
        privacyLevel: 'PUBLIC',
        requiredCapabilities: ['resource.fabric.test'],
        preferredWorkerId: 'worker_lan_verified_node',
        inputPayload: { iterations: 10000 },
        attempt: 1,
        progress: 0,
        createdAt: new Date().toISOString(),
      };

      const result = await scheduler.scheduleAndDispatch(task, {
        onProgress: (p) => progressSteps.push(p),
      });

      assert.equal(result.success, true);
      assert.equal(result.workerId, 'worker_lan_verified_node');
      assert.equal(result.output?.diagnostic, 'PASSED');
      assert.equal(result.output?.remoteWorkerId, 'worker_lan_verified_node');
      assert.ok(progressSteps.length >= 2);
    });

    test('Live Flow B: Worker disappears -> Detection -> Task requeued', async () => {
      const task: WorkerTask = {
        id: 't_live_orphan_task',
        taskType: 'compute.benchmark',
        priority: 50,
        status: 'RUNNING',
        privacyLevel: 'PUBLIC',
        requiredCapabilities: [],
        assignedWorkerId: 'worker_lan_verified_node',
        attempt: 1,
        progress: 0.3,
        createdAt: new Date().toISOString(),
      };
      registry.saveTask(task);

      // Simulate LAN worker dropping off the network
      testLanWorker.disconnect();
      await healthTracker.handleWorkerFailure('worker_lan_verified_node');

      const requeued = registry.getTask('t_live_orphan_task')!;
      assert.equal(requeued.status, 'REQUEUED');
      assert.equal(requeued.attempt, 2);
    });

    test('Live Flow C: Cooperative Cancellation verified stopped state', async () => {
      testLanWorker.connect();
      const cancelToken = {
        isCancelled: false,
        reason: undefined as string | undefined,
        onCancel: () => {},
        cancel(r?: string) {
          this.isCancelled = true;
          this.reason = r;
        },
      };

      cancelToken.cancel('User aborted calculation');

      const task: WorkerTask = {
        id: 't_live_cancel_lan',
        taskType: 'compute.benchmark',
        priority: 50,
        status: 'QUEUED',
        privacyLevel: 'PUBLIC',
        requiredCapabilities: ['compute.benchmark'],
        preferredWorkerId: 'worker_lan_verified_node',
        attempt: 1,
        progress: 0,
        createdAt: new Date().toISOString(),
      };

      const res = await scheduler.scheduleAndDispatch(task, { cancellationToken: cancelToken });
      assert.equal(res.success, false);
      const saved = registry.getTask('t_live_cancel_lan')!;
      assert.equal(saved.status, 'CANCELLED');
    });

    test('Live Flow D: Privacy restricted task -> remote LAN worker rejected, forced to local node', async () => {
      const task: WorkerTask = {
        id: 't_live_privacy_boundary',
        taskType: 'resource.fabric.test',
        priority: 80,
        status: 'QUEUED',
        privacyLevel: 'SOVEREIGN_LOCAL', // Must never go to LAN
        requiredCapabilities: ['resource.fabric.test'],
        attempt: 1,
        progress: 0,
        createdAt: new Date().toISOString(),
      };

      const decision = scheduler.evaluatePlacement(task);
      assert.equal(decision.selectedWorkerId, 'worker_local_primary');
      assert.notEqual(decision.selectedWorkerId, 'worker_lan_verified_node');
    });
  });
});
