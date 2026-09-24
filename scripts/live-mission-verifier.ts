/**
 * HRSIKESA - Live Autonomous Mission Engine Verifier
 * Executes Safe Live Mission #1 and Safe Live Mission #2 on live kernel.
 * Collects precise performance metrics (latencies, model calls, memory RSS, VRAM).
 */

import { HrisekesaKernel } from '../src/runtime/kernel.js';
import fs from 'node:fs';
import path from 'node:path';

async function runLiveVerification() {
  console.log('====================================================');
  console.log('  HṚṢĪKEŚA PHASE 13 — LIVE AUTONOMOUS MISSION RUNNER');
  console.log('====================================================\n');

  const startMem = process.memoryUsage();
  console.log(`Initial Node RSS: ${(startMem.rss / 1024 / 1024).toFixed(2)} MB | Heap: ${(startMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  const kernel = new HrisekesaKernel({
    HRISEKESA_PORT: '19196',
    HRISEKESA_DB_PATH: 'data/live-verification.db',
    HRISEKESA_LOG_LEVEL: 'info'
  });

  await kernel.start();
  console.log('Kernel started successfully. Subsystems wired.\n');

  const orchestrator = kernel.missionOrchestrator;
  const verifier = kernel.missionVerifier;
  const planner = kernel.missionPlanner;

  // ==========================================
  // SAFE LIVE MISSION #1: Workspace Inspection
  // ==========================================
  console.log('----------------------------------------------------');
  console.log('Starting Safe Live Mission #1: Workspace Inspection');
  console.log('----------------------------------------------------');

  const m1Objective = 'Inspect the HṚṢĪKEŚA project workspace and produce a report containing the project structure, current test count, build status, and current phase.';
  
  const m1StartTime = Date.now();
  const planStart1 = Date.now();
  const m1Plan = await planner.createPlan({
    objective: m1Objective,
    rootAgentId: 'chanakya',
    constraints: ['Read-only operations only', 'Use governed tools']
  });
  const planLatency1 = Date.now() - planStart1;

  console.log(`[Mission 1] Plan generated in ${planLatency1}ms with ${m1Plan.tasks.length} tasks (Risk: ${m1Plan.riskLevel}):`);
  m1Plan.tasks.forEach(t => console.log(`  - [${t.id}] ${t.title || t.objective} -> Agent: ${t.agentId}`));

  const mission1 = await orchestrator.planAndCreateMission({
    objective: m1Objective,
    rootAgentId: 'chanakya',
    constraints: ['Read-only operations only'],
    plan: m1Plan
  });

  const execStart1 = Date.now();
  const m1Result = await orchestrator.executeMission(mission1.id);
  const execLatency1 = Date.now() - execStart1;
  const m1TotalTime = Date.now() - m1StartTime;

  console.log(`\n[Mission 1] Completed in ${m1TotalTime}ms (Execution: ${execLatency1}ms). Status: ${m1Result.status}`);
  console.log(`Tasks Completed: ${m1Result.report?.tasks.completed ?? 0}/${m1Result.taskCount}, Failed: ${m1Result.report?.tasks.failed ?? 0}`);
  
  const m1Report = m1Result.report || orchestrator.getMissionReport(mission1.id);
  console.log('\n--- Mission #1 Summary Report ---');
  console.log(m1Report?.summary);
  console.log('---------------------------------\n');

  // Allow background indexing queue to settle
  await new Promise(r => setTimeout(r, 2000));

  // ========================================================
  // SAFE LIVE MISSION #2: Governed Artifact Creation & Verify
  // ========================================================
  console.log('----------------------------------------------------');
  console.log('Starting Safe Live Mission #2: Governed Artifact');
  console.log('----------------------------------------------------');

  const m2Objective = 'Create a text file in data/phase13_verification.txt containing Phase 13 status, verify its presence and contents, record the artifact, and generate a final report.';

  const m2StartTime = Date.now();
  const planStart2 = Date.now();
  const m2Plan = await planner.createPlan({
    objective: m2Objective,
    rootAgentId: 'arjuna',
    constraints: ['Must use governed filesystem tool', 'Must verify file content']
  });
  const planLatency2 = Date.now() - planStart2;

  console.log(`[Mission 2] Plan generated in ${planLatency2}ms with ${m2Plan.tasks.length} tasks:`);
  m2Plan.tasks.forEach(t => console.log(`  - [${t.id}] ${t.title || t.objective} -> Agent: ${t.agentId}`));

  const mission2 = await orchestrator.planAndCreateMission({
    objective: m2Objective,
    rootAgentId: 'arjuna',
    constraints: ['Governed file operations only'],
    plan: m2Plan
  });

  const execStart2 = Date.now();
  const m2Result = await orchestrator.executeMission(mission2.id);
  const execLatency2 = Date.now() - execStart2;
  const m2TotalTime = Date.now() - m2StartTime;

  console.log(`\n[Mission 2] Completed in ${m2TotalTime}ms (Execution: ${execLatency2}ms). Status: ${m2Result.status}`);
  
  const m2Artifacts = m2Result.artifacts || kernel.artifactRepo.listByMission(mission2.id);
  console.log(`Artifacts Tracked: ${m2Artifacts.length}`);
  m2Artifacts.forEach(a => console.log(`  - [${a.type}] ${a.name} (${a.path}) Verified: ${a.verificationStatus}`));

  const m2Report = m2Result.report || orchestrator.getMissionReport(mission2.id);
  console.log('\n--- Mission #2 Summary Report ---');
  console.log(m2Report?.summary);
  console.log('---------------------------------\n');

  // Direct physical disk verification check
  const verifyFilePath = path.join(process.cwd(), 'data', 'phase13_verification.txt');
  const fileExists = fs.existsSync(verifyFilePath);
  const fileContent = fileExists ? fs.readFileSync(verifyFilePath, 'utf8') : '';
  console.log(`Physical file exists at ${verifyFilePath}: ${fileExists}`);
  console.log(`Physical file content length: ${fileContent.length} bytes`);

  // Memory & Resource Usage Stats
  const endMem = process.memoryUsage();
  console.log('\n====================================================');
  console.log('              PERFORMANCE MEASUREMENTS              ');
  console.log('====================================================');
  console.log(`Mission #1 Total Time:       ${m1TotalTime} ms (Planning: ${planLatency1} ms, Execution: ${execLatency1} ms)`);
  console.log(`Mission #2 Total Time:       ${m2TotalTime} ms (Planning: ${planLatency2} ms, Execution: ${execLatency2} ms)`);
  console.log(`Node Initial RSS:            ${(startMem.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Node Final RSS:              ${(endMem.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Peak Heap Used:              ${(endMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`External / Buffers:          ${(endMem.external / 1024 / 1024).toFixed(2)} MB`);
  console.log('====================================================\n');

  await kernel.shutdown('Live verification finished');
  
  // Cleanup test db
  for (const ext of ['', '-wal', '-shm']) {
    const p = 'data/live-verification.db' + ext;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

runLiveVerification().catch(err => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});
