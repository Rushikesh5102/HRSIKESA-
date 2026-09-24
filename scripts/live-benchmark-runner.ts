/**
 * HṚṢĪKEŚA (हृषीकेश) — Phase 13.5 Live Performance Benchmark Runner
 *
 * Runs the 3 official benchmark missions, measuring:
 * - Planning time
 * - Execution time
 * - Verification time
 * - Total time
 * - Model calls count
 * - Tool calls count
 * - Tasks completed
 * - Retries count
 * - Node RSS & Heap memory
 * - System RAM
 */

import { HrisekesaKernel } from '../src/runtime/kernel.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface BenchmarkResult {
  missionName: string;
  category: 'SIMPLE' | 'STANDARD' | 'ARTIFACT';
  objective: string;
  status: string;
  planningDurationMs: number;
  executionDurationMs: number;
  verificationDurationMs: number;
  totalDurationMs: number;
  modelCallsCount: number;
  toolCallsCount: number;
  tasksCompleted: number;
  tasksTotal: number;
  retriesCount: number;
  nodeRssMb: number;
  heapUsedMb: number;
  systemMemoryState: string;
  outputArtifacts: string[];
  summary: string;
}

async function runBenchmark(): Promise<void> {
  console.log('===============================================================');
  console.log('  HṚṢĪKEŚA (हृषीकेश) — PHASE 13.5 LIVE PERFORMANCE BENCHMARK');
  console.log('===============================================================');

  // Ensure data directory exists
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data', { recursive: true });
  }

  // Clean any existing benchmark artifact
  const artifactPath = path.resolve(process.cwd(), 'data', 'phase13_5_verification.txt');
  if (fs.existsSync(artifactPath)) {
    try { fs.unlinkSync(artifactPath); } catch {}
  }

  const kernel = new HrisekesaKernel({
    HRISEKESA_PORT: '19300',
    HRISEKESA_DB_PATH: 'data/live-benchmark.db',
    HRISEKESA_LOG_LEVEL: 'info'
  });

  await kernel.start();

  const orchestrator = kernel.getMissionOrchestrator();
  const hardware = kernel.getHardware();
  const results: BenchmarkResult[] = [];

  const benchmarkMissions = [
    {
      name: 'MISSION A — SIMPLE',
      category: 'SIMPLE' as const,
      objective: 'Check whether package.json exists in the HṚṢĪKEŚA workspace.'
    },
    {
      name: 'MISSION B — STANDARD',
      category: 'STANDARD' as const,
      objective: 'Inspect the HṚṢĪKEŚA workspace and report the current project structure and test count.'
    },
    {
      name: 'MISSION C — ARTIFACT',
      category: 'ARTIFACT' as const,
      objective: "Create data/phase13_5_verification.txt containing 'Phase 13.5 verification complete', then verify the file exists and contains that exact text."
    }
  ];

  try {
    for (const bMission of benchmarkMissions) {
      console.log(`\n---------------------------------------------------------------`);
      console.log(`STARTING: ${bMission.name}`);
      console.log(`OBJECTIVE: "${bMission.objective}"`);
      console.log(`---------------------------------------------------------------`);

      const tStartTotal = Date.now();

      // 1. Planning Phase
      const tStartPlan = Date.now();
      const plannedMission = await orchestrator.planAndCreateMission({
        objective: bMission.objective
      });
      const planningDurationMs = Date.now() - tStartPlan;

      console.log(`[Plan] Complexity classified. Tasks in plan: ${plannedMission.plan?.tasks.length}`);
      console.log(`[Plan] Planning latency: ${planningDurationMs}ms`);

      // 2. Execution Phase
      const tStartExec = Date.now();
      const execResult = await orchestrator.executeMission(plannedMission.id);
      const executionDurationMs = Date.now() - tStartExec;
      const totalDurationMs = Date.now() - tStartTotal;

      const memProfile = hardware.getProfile();
      const report = execResult.report;

      const verificationDurationMs = (report as any)?.verificationDurationMs ?? 0;
      const modelCalls = report?.modelCallsCount ?? 0;
      const toolCalls = report?.toolsUsed.length ?? 0;
      const tasksCompleted = report?.tasks.completed ?? 0;
      const tasksTotal = report?.tasks.total ?? 0;
      const retries = report?.retriesCount ?? 0;

      const benchRecord: BenchmarkResult = {
        missionName: bMission.name,
        category: bMission.category,
        objective: bMission.objective,
        status: execResult.status,
        planningDurationMs,
        executionDurationMs,
        verificationDurationMs,
        totalDurationMs,
        modelCallsCount: modelCalls,
        toolCallsCount: toolCalls,
        tasksCompleted,
        tasksTotal,
        retriesCount: retries,
        nodeRssMb: memProfile.processMemory.rssMb,
        heapUsedMb: memProfile.processMemory.heapUsedMb,
        systemMemoryState: memProfile.memory.state,
        outputArtifacts: (execResult.artifacts || []).map(a => a.name),
        summary: execResult.summary
      };

      results.push(benchRecord);

      console.log(`[Result] Status: ${execResult.status.toUpperCase()}`);
      console.log(`[Timing] Planning: ${planningDurationMs}ms | Execution: ${executionDurationMs}ms | Total: ${totalDurationMs}ms (${(totalDurationMs / 1000).toFixed(2)}s)`);
      console.log(`[Metrics] Model Calls: ${modelCalls} | Tasks: ${tasksCompleted}/${tasksTotal} | Retries: ${retries}`);
      console.log(`[Memory] Node RSS: ${memProfile.processMemory.rssMb}MB | Heap: ${memProfile.processMemory.heapUsedMb}MB | State: ${memProfile.memory.state}`);
      console.log(`[Summary] ${execResult.summary.slice(0, 150)}...`);
    }

    console.log('\n===============================================================');
    console.log('  FINAL PHASE 13.5 LIVE PERFORMANCE BENCHMARK MATRIX');
    console.log('===============================================================');
    console.table(results.map(r => ({
      Mission: r.missionName,
      Status: r.status,
      'Plan (ms)': r.planningDurationMs,
      'Exec (ms)': r.executionDurationMs,
      'Total (s)': (r.totalDurationMs / 1000).toFixed(2),
      'Model Calls': r.modelCallsCount,
      Tasks: `${r.tasksCompleted}/${r.tasksTotal}`,
      Retries: r.retriesCount,
      'RSS (MB)': r.nodeRssMb,
      'Heap (MB)': r.heapUsedMb
    })));

    // Verify physical artifact for Mission C
    console.log('\n---------------------------------------------------------------');
    console.log('VERIFYING PHYSICAL ARTIFACTS:');
    if (fs.existsSync(artifactPath)) {
      const content = fs.readFileSync(artifactPath, 'utf-8');
      console.log(`  Artifact [data/phase13_5_verification.txt] EXISTS.`);
      console.log(`  Content: "${content.trim()}"`);
    } else {
      console.warn(`  Artifact [data/phase13_5_verification.txt] NOT FOUND.`);
    }

    // Write benchmark report artifact
    const reportJson = JSON.stringify(results, null, 2);
    fs.writeFileSync('data/phase13_5_benchmark_results.json', reportJson, 'utf-8');
    console.log(`\nBenchmark JSON summary saved to data/phase13_5_benchmark_results.json`);

  } finally {
    await kernel.shutdown('Benchmark run complete');
  }
}

runBenchmark().catch((err) => {
  console.error('FATAL Benchmark Error:', err);
  process.exit(1);
});
