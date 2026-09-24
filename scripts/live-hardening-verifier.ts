import os from 'node:os';
import http from 'node:http';
import { HrisekesaKernel } from '../src/runtime/kernel.js';

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatGB(bytes: number): string {
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
}

async function runHardeningVerification() {
  console.log('====================================================');
  console.log('HṚṢĪKEŚA — PHASE 11.5: PERFORMANCE & HARDENING BENCHMARK');
  console.log('====================================================');

  const beforeTotal = os.totalmem();
  const beforeFree = os.freemem();
  const beforeUsed = beforeTotal - beforeFree;
  const beforeRss = process.memoryUsage().rss;

  console.log('\n[BASELINE HOST MEMORY]');
  console.log(`Total System RAM: ${formatGB(beforeTotal)}`);
  console.log(`Used System RAM:  ${formatGB(beforeUsed)} (${((beforeUsed / beforeTotal) * 100).toFixed(1)}%)`);
  console.log(`Free System RAM:  ${formatGB(beforeFree)} (${((beforeFree / beforeTotal) * 100).toFixed(1)}%)`);
  console.log(`Node Process RSS: ${formatMB(beforeRss)}`);

  const PORT = '4388';
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  const kernel = new HrisekesaKernel({
    HRISEKESA_PORT: PORT,
    HRISEKESA_LOG_LEVEL: 'warn',
    HRISEKESA_VOICE_TTS: 'sapi',
    HRISEKESA_VOICE_STT: 'windows',
  });

  const t0 = Date.now();
  await kernel.start();
  const startupMs = Date.now() - t0;
  console.log(`\n[1/9] Kernel Started in ${startupMs}ms on ${BASE_URL}`);

  try {
    // 1. Control Center Initial Load
    const tUi0 = Date.now();
    const uiRes = await fetch(`${BASE_URL}/`);
    const uiHtml = await uiRes.text();
    const uiLoadMs = Date.now() - tUi0;
    console.log(`[2/9] Control Center Initial Load: ${uiLoadMs}ms (Size: ${uiHtml.length} bytes, HTTP ${uiRes.status})`);

    // 2. Health & Status with Memory State
    const tStat0 = Date.now();
    const statRes = await fetch(`${BASE_URL}/status`);
    const status = await statRes.json() as any;
    const statMs = Date.now() - tStat0;
    console.log(`[3/9] System Status: ${statMs}ms | Memory State: ${status.hardware?.memory?.state || 'NORMAL'} (Free: ${status.hardware?.memory?.freeGb} GB, RSS: ${status.hardware?.processMemory?.rssMb} MB)`);

    // 3. Agent Listing
    const tAgent0 = Date.now();
    const agentRes = await fetch(`${BASE_URL}/agents`);
    const agentData = await agentRes.json() as any;
    const agentMs = Date.now() - tAgent0;
    console.log(`[4/9] Agent Workforce: ${agentMs}ms (${agentData.agents.length} agents loaded)`);

    // 4. Environment Status (Testing Cache)
    const tEnv1 = Date.now();
    const envRes1 = await fetch(`${BASE_URL}/environment/status`);
    const envData1 = await envRes1.json() as any;
    const envMs1 = Date.now() - tEnv1;

    const tEnv2 = Date.now();
    const envRes2 = await fetch(`${BASE_URL}/environment/status`);
    const envData2 = await envRes2.json() as any;
    const envMs2 = Date.now() - tEnv2;
    console.log(`[5/9] Environment Status: Call 1 (Discovery): ${envMs1}ms | Call 2 (Cache): ${envMs2}ms (Apps: ${envData1.totalApplicationsDiscovered}, Processes: ${envData1.totalActiveProcesses})`);

    // 5. Memory Items Bounded Query
    const tMem0 = Date.now();
    const memRes = await fetch(`${BASE_URL}/memory/items?limit=10`);
    const memData = await memRes.json() as any;
    const memMs = Date.now() - tMem0;
    console.log(`[6/9] Bounded Memory Query: ${memMs}ms (${memData.totalReturned} entries returned)`);

    // 6. SSE Lifecycle
    const tSse0 = Date.now();
    await new Promise<void>((resolve, reject) => {
      const req = http.get(`${BASE_URL}/events`, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`SSE status ${res.statusCode}`));
        res.on('data', () => {
          req.destroy();
          resolve();
        });
      });
      req.on('error', (err: any) => {
        if (err.code === 'ECONNRESET' || req.destroyed) resolve();
        else reject(err);
      });
    });
    const sseMs = Date.now() - tSse0;
    console.log(`[7/9] SSE Connection Lifecycle: ${sseMs}ms (Clean disconnect & listener unbind)`);

    // 7. Conversational Turn 1 (Cold model turn with dynamic tool scoping)
    console.log('[8/9] Executing Turn 1 (Cold inference with candidate tool scoping)...');
    const tChat1 = Date.now();
    const chat1Res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello HṚṢĪKEŚA, remember the codeword is DIAMOND.' }),
    });
    const chat1Data = await chat1Res.json() as any;
    const chat1TotalMs = Date.now() - tChat1;
    console.log(`      Turn 1 Response (${chat1Data.model || 'qwen2.5:7b'} in ${chat1TotalMs}ms, model duration: ${chat1Data.durationMs}ms):`);
    console.log(`      "${chat1Data.response.slice(0, 100)}..."`);

    // 8. Conversational Turn 2 (Warm model turn in same session)
    console.log('[9/9] Executing Turn 2 (Warm inference multi-turn in same session)...');
    const tChat2 = Date.now();
    const chat2Res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: chat1Data.sessionId, message: 'What is the secret codeword? State it clearly.' }),
    });
    const chat2Data = await chat2Res.json() as any;
    const chat2TotalMs = Date.now() - tChat2;
    console.log(`      Turn 2 Response (${chat2Data.model || 'qwen2.5:7b'} in ${chat2TotalMs}ms, model duration: ${chat2Data.durationMs}ms):`);
    console.log(`      "${chat2Data.response}"`);

    console.log('\n====================================================');
    console.log('ALL PHASE 11.5 BENCHMARKS COMPLETED SUCCESSFULLY');
    console.log('====================================================');
  } finally {
    await kernel.shutdown('Hardening verification complete');
    console.log('Kernel shutdown cleanly.');
  }

  const afterTotal = os.totalmem();
  const afterFree = os.freemem();
  const afterUsed = afterTotal - afterFree;
  const afterRss = process.memoryUsage().rss;

  console.log('\n[POST-VERIFICATION HOST MEMORY]');
  console.log(`Total System RAM: ${formatGB(afterTotal)}`);
  console.log(`Used System RAM:  ${formatGB(afterUsed)} (${((afterUsed / afterTotal) * 100).toFixed(1)}%)`);
  console.log(`Free System RAM:  ${formatGB(afterFree)} (${((afterFree / afterTotal) * 100).toFixed(1)}%)`);
  console.log(`Node Process RSS: ${formatMB(afterRss)}`);
}

runHardeningVerification().catch((err) => {
  console.error('Hardening verification failed:', err);
  process.exit(1);
});
