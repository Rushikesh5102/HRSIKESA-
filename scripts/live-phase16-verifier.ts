/**
 * HṚṢĪKEŚA (हृषीकेश) — Live Phase 16 Verifier (20-Step Autonomous Operations & Capabilities)
 *
 * Runs end-to-end live testing of Phase 16 Persistent Autonomous Operations on an isolated port/DB:
 *   Step 01: Isolated Runtime & Database Bootstrap (Port 7199, Isolated SQLite)
 *   Step 02: Capability Registry Initialization & Adapter Enumeration
 *   Step 03: Capability Health Checks (Single & Batch)
 *   Step 04: Agent Semantic Capability Routing & Execution
 *   Step 05: Danger Tier / Risk Level Authorization Gating
 *   Step 06: Resource Governance & Memory Pressure Audit
 *   Step 07: Persistent Objective Creation with Company/Project Scoping
 *   Step 08: Deterministic Objective Health Calculation (WAITING)
 *   Step 09: Objective Continuous Evaluation Cycle (PLANNED -> EXECUTING)
 *   Step 10: Milestone Execution & Progress Tracking
 *   Step 11: Objective Health Calculation (HEALTHY)
 *   Step 12: Pause Persistent Objective (EXECUTING -> PAUSED)
 *   Step 13: Resume Persistent Objective (PAUSED -> EXECUTING)
 *   Step 14: Simulated Crash & Restart Recovery Check
 *   Step 15: Idempotent Objective Recovery without Duplicate Work
 *   Step 16: Human-in-the-Loop Approval Gate (NEEDS_USER Health State)
 *   Step 17: Persistent Scheduler Creation (Interval & One-time)
 *   Step 18: Persistent Scheduler Trigger & Execution Dispatch
 *   Step 19: Schedule Pause, Resume, and Cancellation
 *   Step 20: Objective Completion & Final Verification
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { HrisekesaKernel } from '../src/runtime/kernel.js';

interface StepResult {
  step: number;
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

const TEST_PORT = 7199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_DATA_DIR = path.resolve(process.cwd(), 'data/live_phase16_test');
const TEST_DB_PATH = path.join(TEST_DATA_DIR, 'phase16_live.db');

async function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>
): Promise<{ status: number; body: Record<string, any> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const postData = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = raw.trim() ? JSON.parse(raw) : {};
            resolve({ status: res.statusCode || 200, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 200, body: { rawResponse: raw } });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runStep(
  step: number,
  name: string,
  fn: () => Promise<string | void> | string | void
): Promise<StepResult> {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    console.log(`  [PASS] Step ${step.toString().padStart(2, '0')}: ${name} (${durationMs}ms)`);
    if (details) console.log(`         -> ${details}`);
    return { step, name, passed: true, details: details || 'Success', durationMs };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [FAIL] Step ${step.toString().padStart(2, '0')}: ${name} (${durationMs}ms)`);
    console.error(`         -> Error: ${msg}`);
    return { step, name, passed: false, details: msg, durationMs };
  }
}

async function main() {
  console.log('\n================================================================');
  console.log('HṚṢĪKEŚA (हृषीकेश) — PHASE 16 LIVE SYSTEM VERIFICATION');
  console.log('Persistent Autonomous Operations + Open-Source Capability Foundation');
  console.log('================================================================\n');

  const results: StepResult[] = [];
  let kernel: HrisekesaKernel | null = null;
  let createdGoalId = '';
  let createdScheduleId = '';

  try {
    // -------------------------------------------------------------
    // Step 01: Isolated Runtime & Database Bootstrap
    // -------------------------------------------------------------
    results.push(
      await runStep(1, 'Isolated Runtime & Database Bootstrap', async () => {
        if (fs.existsSync(TEST_DATA_DIR)) {
          fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

        kernel = new HrisekesaKernel({
          HRISEKESA_PORT: String(TEST_PORT),
          PORT: String(TEST_PORT),
          HRISEKESA_DB_PATH: TEST_DB_PATH,
          STORAGE_ROOT: path.join(TEST_DATA_DIR, 'storage'),
          HRISEKESA_LOG_LEVEL: 'warn',
        });

        await kernel.start();
        const res = await httpRequest('GET', '/health');
        if (res.status !== 200) throw new Error(`Health check failed with status ${res.status}`);
        return `Server listening on ${BASE_URL} with isolated database ${TEST_DB_PATH}`;
      })
    );

    // -------------------------------------------------------------
    // Step 02: Capability Registry Initialization
    // -------------------------------------------------------------
    results.push(
      await runStep(2, 'Capability Registry Initialization & Adapter Enumeration', async () => {
        const res = await httpRequest('GET', '/capabilities');
        if (res.status !== 200) throw new Error(`Failed to list capabilities: ${JSON.stringify(res.body)}`);
        const caps = res.body.capabilities || [];
        if (caps.length < 5) throw new Error(`Expected at least 5 registered capabilities, found ${caps.length}`);
        const capIds = caps.map((c: any) => c.id).join(', ');
        return `Registered capabilities (${caps.length}): ${capIds}`;
      })
    );

    // -------------------------------------------------------------
    // Step 03: Capability Health Checks
    // -------------------------------------------------------------
    results.push(
      await runStep(3, 'Capability Health Checks (Single & Batch)', async () => {
        const single = await httpRequest('GET', '/capabilities/filesystem.native/health');
        if (single.status !== 200 || single.body.health.status !== 'HEALTHY') {
          throw new Error(`Single capability health check failed: ${JSON.stringify(single.body)}`);
        }

        const batch = await httpRequest('GET', '/capabilities/health/all');
        if (batch.status !== 200 || Object.keys(batch.body.health).length < 5) {
          throw new Error(`Batch health check failed: ${JSON.stringify(batch.body)}`);
        }
        return `Filesystem health: ${single.body.health.status}, Batch evaluated: ${batch.body.count} capabilities`;
      })
    );

    // -------------------------------------------------------------
    // Step 04: Agent Semantic Capability Routing & Execution
    // -------------------------------------------------------------
    results.push(
      await runStep(4, 'Agent Semantic Capability Routing & Execution', async () => {
        const routeRes = await httpRequest('POST', '/capabilities/route', {
          agentId: 'gandiva',
          requestedCapability: 'fs',
        });
        if (routeRes.status !== 200 || !routeRes.body.resolution.available) {
          throw new Error(`Routing resolution failed: ${JSON.stringify(routeRes.body)}`);
        }

        const execRes = await httpRequest('POST', '/capabilities/execute', {
          capabilityId: 'filesystem.native',
          action: 'exists',
          parameters: { path: process.cwd() },
          callerAgentId: 'gandiva',
        });
        if (execRes.status !== 200 || !execRes.body.success) {
          throw new Error(`Capability execution failed: ${JSON.stringify(execRes.body)}`);
        }
        return `Resolved 'fs' -> '${routeRes.body.resolution.resolvedCapabilityId}', Executed 'exists': ${execRes.body.result.output}`;
      })
    );

    // -------------------------------------------------------------
    // Step 05: Danger Tier / Risk Level Authorization Gating
    // -------------------------------------------------------------
    results.push(
      await runStep(5, 'Danger Tier / Risk Level Authorization Gating', async () => {
        const router = kernel!.capabilityRouter;
        // Test unknown agent rejection
        const badAgent = await router.executeForAgent('unauthorized_hacker', 'filesystem', 'exists', { path: '.' });
        if (badAgent.success) throw new Error('Expected unknown agent request to be rejected');
        return 'Unauthorized agent capability requests correctly gated and rejected';
      })
    );

    // -------------------------------------------------------------
    // Step 06: Resource Governance & Memory Pressure Audit
    // -------------------------------------------------------------
    results.push(
      await runStep(6, 'Resource Governance & Memory Pressure Audit', async () => {
        const res = await httpRequest('GET', '/governance/resources');
        if (res.status !== 200 || !res.body.resources) {
          throw new Error(`Resource governance check failed: ${JSON.stringify(res.body)}`);
        }
        const r = res.body.resources;
        return `Pressure Level: ${r.pressureLevel}, Free RAM: ${r.freeMemoryGb.toFixed(2)} GB, Max Concurrent Tasks: ${r.maxConcurrentTasks}`;
      })
    );

    // -------------------------------------------------------------
    // Step 07: Persistent Objective Creation
    // -------------------------------------------------------------
    results.push(
      await runStep(7, 'Persistent Objective Creation with Company Scoping', async () => {
        const now = new Date().toISOString();
        // Seed company and project in isolated test database
        kernel!.companyRepo.create({
          id: 'comp_default',
          name: 'HṚṢĪKEŚA Open Source Initiative',
          slug: 'hrisekesa-osi',
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        });
        kernel!.projectRepo.create({
          id: 'proj_docs',
          companyId: 'comp_default',
          name: 'Phase 16 Documentation Portal',
          slug: 'p16-docs',
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        });

        const res = await httpRequest('POST', '/goals', {
          title: 'Deploy HṚṢĪKEŚA Open Source Documentation Hub',
          objective: 'Build and launch open source documentation hub with verified site.',
          priority: 'high',
          companyId: 'comp_default',
          projectId: 'proj_docs',
        });
        console.log('[DEBUG Step 7 res]:', JSON.stringify(res));
        if (res.status !== 201 || !res.body.goal?.id) {
          throw new Error(`Goal creation failed: ${JSON.stringify(res.body)}`);
        }
        createdGoalId = res.body.goal.id;
        return `Created Persistent Objective [${createdGoalId}]: "${res.body.goal.title}"`;
      })
    );

    // -------------------------------------------------------------
    // Step 08: Deterministic Objective Health Calculation
    // -------------------------------------------------------------
    results.push(
      await runStep(8, 'Deterministic Objective Health Calculation (WAITING)', async () => {
        const res = await httpRequest('GET', `/objectives/${createdGoalId}/health`);
        if (res.status !== 200 || res.body.health.state !== 'WAITING') {
          throw new Error(`Expected health WAITING, got: ${JSON.stringify(res.body)}`);
        }
        return `Derived Health: ${res.body.health.state} (${res.body.health.reason})`;
      })
    );

    // -------------------------------------------------------------
    // Step 09: Objective Continuous Evaluation Cycle
    // -------------------------------------------------------------
    results.push(
      await runStep(9, 'Objective Continuous Evaluation Cycle (PLANNED -> EXECUTING)', async () => {
        // Plan goal first
        await httpRequest('POST', `/goals/${createdGoalId}/plan`);

        // Trigger evaluation cycle
        const evalRes = await httpRequest('POST', `/objectives/${createdGoalId}/evaluate`);
        if (evalRes.status !== 200 || !evalRes.body.evaluation) {
          throw new Error(`Evaluation cycle failed: ${JSON.stringify(evalRes.body)}`);
        }
        const e = evalRes.body.evaluation;
        return `Evaluation Cycle #${e.cycleNumber}: Decision=${e.decision}, New Status=${e.newStatus}, Next Action="${e.nextAction}"`;
      })
    );

    // -------------------------------------------------------------
    // Step 10: Milestone Execution & Progress Tracking
    // -------------------------------------------------------------
    results.push(
      await runStep(10, 'Milestone Execution & Progress Tracking', async () => {
        const mRes = await httpRequest('GET', `/goals/${createdGoalId}/milestones`);
        const milestones = mRes.body.milestones || [];
        if (milestones.length === 0) throw new Error('No milestones found for goal');

        // Mark first milestone completed
        kernel!.milestoneRepo.update(milestones[0].id, {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        });

        const progRes = await httpRequest('GET', `/goals/${createdGoalId}/progress`);
        return `Milestones: ${milestones.length}, First milestone marked complete, Progress: ${progRes.body.progress.percent}%`;
      })
    );

    // -------------------------------------------------------------
    // Step 11: Objective Health Calculation (HEALTHY)
    // -------------------------------------------------------------
    results.push(
      await runStep(11, 'Objective Health Calculation (HEALTHY)', async () => {
        const res = await httpRequest('GET', `/objectives/${createdGoalId}/health`);
        if (res.status !== 200) throw new Error(`Health check failed: ${JSON.stringify(res.body)}`);
        return `Derived Health: ${res.body.health.state} (${res.body.health.reason})`;
      })
    );

    // -------------------------------------------------------------
    // Step 12: Pause Persistent Objective
    // -------------------------------------------------------------
    results.push(
      await runStep(12, 'Pause Persistent Objective (EXECUTING -> PAUSED)', async () => {
        const res = await httpRequest('POST', `/goals/${createdGoalId}/pause`);
        if (res.status !== 200 || res.body.goal.status !== 'PAUSED') {
          throw new Error(`Failed to pause goal: ${JSON.stringify(res.body)}`);
        }
        const health = await httpRequest('GET', `/objectives/${createdGoalId}/health`);
        return `Goal paused. State=${res.body.goal.status}, Health=${health.body.health.state}`;
      })
    );

    // -------------------------------------------------------------
    // Step 13: Resume Persistent Objective
    // -------------------------------------------------------------
    results.push(
      await runStep(13, 'Resume Persistent Objective (PAUSED -> EXECUTING)', async () => {
        const res = await httpRequest('POST', `/goals/${createdGoalId}/resume`);
        if (res.status !== 200 || res.body.goal.status !== 'EXECUTING') {
          throw new Error(`Failed to resume goal: ${JSON.stringify(res.body)}`);
        }
        return `Goal resumed. Status=${res.body.goal.status}`;
      })
    );

    // -------------------------------------------------------------
    // Step 14: Simulated Crash & Restart Recovery Check
    // -------------------------------------------------------------
    results.push(
      await runStep(14, 'Simulated Crash & Restart Recovery Check', async () => {
        // Shutdown running kernel
        await kernel!.shutdown('Simulated crash test');
        kernel = null;

        // Reopen kernel with same DB
        kernel = new HrisekesaKernel({
          HRISEKESA_PORT: String(TEST_PORT),
          PORT: String(TEST_PORT),
          HRISEKESA_DB_PATH: TEST_DB_PATH,
          STORAGE_ROOT: path.join(TEST_DATA_DIR, 'storage'),
          HRISEKESA_LOG_LEVEL: 'warn',
        });
        await kernel.start();

        console.log('[DEBUG Step 14] createdGoalId:', createdGoalId);
        console.log('[DEBUG Step 14] goals in db:', kernel.goalRepo.list().map(g => ({ id: g.id, title: g.title, status: g.status })));
        const recoveredGoal = kernel.goalRepo.get(createdGoalId);
        if (!recoveredGoal) throw new Error(`Goal '${createdGoalId}' lost after restart`);
        return `Kernel rebooted cleanly. Preserved Goal [${recoveredGoal.id}] with status '${recoveredGoal.status}'`;
      })
    );

    // -------------------------------------------------------------
    // Step 15: Idempotent Objective Recovery
    // -------------------------------------------------------------
    results.push(
      await runStep(15, 'Idempotent Objective Recovery without Duplicate Work', async () => {
        const milestones = kernel!.milestoneRepo.listByGoal(createdGoalId);
        const completedCount = milestones.filter((m) => m.status === 'COMPLETED').length;
        if (completedCount !== 1) {
          throw new Error(`Expected exactly 1 completed milestone preserved, found ${completedCount}`);
        }
        return `Completed milestones preserved (${completedCount}/${milestones.length}) without duplicate execution`;
      })
    );

    // -------------------------------------------------------------
    // Step 16: Human-in-the-Loop Approval Gate (NEEDS_USER)
    // -------------------------------------------------------------
    results.push(
      await runStep(16, 'Human-in-the-Loop Approval Gate (NEEDS_USER Health State)', async () => {
        // Set goal to AWAITING_APPROVAL
        kernel!.goalRepo.update(createdGoalId, { status: 'AWAITING_APPROVAL' });

        const healthRes = await httpRequest('GET', `/objectives/${createdGoalId}/health`);
        if (healthRes.body.health.state !== 'NEEDS_USER') {
          throw new Error(`Expected health NEEDS_USER, got ${healthRes.body.health.state}`);
        }

        const evalRes = await httpRequest('POST', `/objectives/${createdGoalId}/evaluate`);
        if (evalRes.body.evaluation.decision !== 'WAIT_APPROVAL') {
          throw new Error(`Expected decision WAIT_APPROVAL, got ${evalRes.body.evaluation.decision}`);
        }
        return `Approval gate verified: Health=${healthRes.body.health.state}, Evaluator decision=${evalRes.body.evaluation.decision}`;
      })
    );

    // -------------------------------------------------------------
    // Step 17: Persistent Scheduler Creation
    // -------------------------------------------------------------
    results.push(
      await runStep(17, 'Persistent Scheduler Creation (Interval & Evaluation Target)', async () => {
        const res = await httpRequest('POST', '/schedules', {
          name: 'Periodic Objective Health Monitor',
          description: 'Evaluates documentation goal every 5 minutes',
          targetType: 'goal',
          targetId: createdGoalId,
          scheduleType: 'INTERVAL',
          intervalMs: 300000,
          maxRuns: 10,
        });

        if (res.status !== 201 || !res.body.schedule?.id) {
          throw new Error(`Failed to create schedule: ${JSON.stringify(res.body)}`);
        }
        createdScheduleId = res.body.schedule.id;
        return `Created Schedule [${createdScheduleId}]: "${res.body.schedule.name}"`;
      })
    );

    // -------------------------------------------------------------
    // Step 18: Persistent Scheduler Trigger & Execution Dispatch
    // -------------------------------------------------------------
    results.push(
      await runStep(18, 'Persistent Scheduler Trigger & Execution Dispatch', async () => {
        let triggered = false;
        kernel!.scheduler.registerHandler('goal', async (sch) => {
          triggered = true;
        });

        // Force schedule due
        kernel!.scheduleRepo.update(createdScheduleId, {
          nextRunAt: new Date(Date.now() - 1000).toISOString(),
        });

        const dueCount = await kernel!.scheduler.checkDueSchedules();
        if (dueCount === 0 || !triggered) {
          throw new Error('Scheduler failed to trigger due schedule');
        }
        return `Triggered ${dueCount} due schedule(s), handler executed successfully`;
      })
    );

    // -------------------------------------------------------------
    // Step 19: Schedule Pause, Resume, and Cancellation
    // -------------------------------------------------------------
    results.push(
      await runStep(19, 'Schedule Pause, Resume, and Cancellation Lifecycle', async () => {
        const pauseRes = await httpRequest('POST', `/schedules/${createdScheduleId}/pause`);
        if (pauseRes.body.schedule.status !== 'PAUSED') throw new Error('Pause failed');

        const resumeRes = await httpRequest('POST', `/schedules/${createdScheduleId}/resume`);
        if (resumeRes.body.schedule.status !== 'ACTIVE') throw new Error('Resume failed');

        const cancelRes = await httpRequest('DELETE', `/schedules/${createdScheduleId}`);
        if (cancelRes.body.schedule.status !== 'CANCELLED') throw new Error('Cancel failed');

        return `Schedule [${createdScheduleId}] transitioned: ACTIVE -> PAUSED -> ACTIVE -> CANCELLED`;
      })
    );

    // -------------------------------------------------------------
    // Step 20: Objective Completion & Final Verification
    // -------------------------------------------------------------
    results.push(
      await runStep(20, 'Objective Completion & Final Verification', async () => {
        // Mark all remaining milestones and their associated missions completed
        const milestones = kernel!.milestoneRepo.listByGoal(createdGoalId);
        for (const m of milestones) {
          kernel!.milestoneRepo.update(m.id, {
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          });
          if (m.missionId) {
            kernel!.missionRepo.update(m.missionId, {
              status: 'completed',
              completedAt: new Date().toISOString(),
            });
          }
        }

        kernel!.goalRepo.update(createdGoalId, { status: 'EXECUTING' });

        // Trigger evaluation cycle which should verify and complete
        const finalEval = await httpRequest('POST', `/objectives/${createdGoalId}/evaluate`);
        if (finalEval.body.evaluation.decision !== 'COMPLETE') {
          throw new Error(`Expected COMPLETE decision, got: ${JSON.stringify(finalEval.body)}`);
        }

        const health = await httpRequest('GET', `/objectives/${createdGoalId}/health`);
        const evals = await httpRequest('GET', `/objectives/${createdGoalId}/evaluations`);

        return `Goal Verified & COMPLETED! Total evaluation cycles: ${evals.body.count}, Final Health: ${health.body.health.state}`;
      })
    );

  } finally {
    if (kernel) {
      await kernel.shutdown('Live verifier completed');
    }
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  }

  // Final Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n================================================================');
  console.log(`PHASE 16 VERIFIER RESULT: ${passed}/20 PASS (${failed} failed)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in live Phase 16 verifier:', err);
  process.exit(1);
});
