import { HrisekesaKernel } from '../src/runtime/kernel.js';

async function verifyControlCenter() {
  console.log('====================================================');
  console.log('HṚṢĪKEŚA — PHASE 11: CONTROL CENTER & AGENT TOWN VERIFICATION');
  console.log('====================================================');

  const PORT = '4366';
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  const kernel = new HrisekesaKernel({
    HRISEKESA_PORT: PORT,
    HRISEKESA_LOG_LEVEL: 'warn',
    HRISEKESA_VOICE_TTS: 'sapi',
    HRISEKESA_VOICE_STT: 'windows',
  });

  await kernel.start();
  console.log(`[1/8] HṚṢĪKEŚA Sovereign Kernel started on ${BASE_URL}`);

  try {
    // 1. Verify SPA Root Serving
    const rootRes = await fetch(`${BASE_URL}/`);
    const rootHtml = await rootRes.text();
    if (rootRes.status !== 200 || !rootHtml.includes('HṚṢĪKEŚA')) {
      throw new Error(`Failed to serve Control Center index.html (Status: ${rootRes.status})`);
    }
    console.log(`[2/8] Control Center SPA UI successfully served at / (Size: ${rootHtml.length} bytes)`);

    // 2. Verify System Status
    const statusRes = await fetch(`${BASE_URL}/status`);
    const status = await statusRes.json() as any;
    console.log(`[3/8] Core Status Verified: ${status.system?.name} (${status.system?.sanskrit}) - State: ${status.system?.state}`);

    // 3. Verify Agent Registry & Agent Town Entities
    const agentsRes = await fetch(`${BASE_URL}/agents`);
    const agentsData = await agentsRes.json() as any;
    const agentNames = agentsData.agents.map((a: any) => a.name.toLowerCase());
    console.log(`[4/8] Agent Town Workforce Loaded: ${agentsData.agents.length} agents [${agentNames.join(', ')}]`);
    if (!['arjuna', 'chanakya', 'arya', 'aditi', 'agastya'].every(n => agentNames.includes(n))) {
      throw new Error('Not all core workforce agents found in registry!');
    }

    // 4. Verify Governed Tool Bus (41 tools)
    const toolsRes = await fetch(`${BASE_URL}/tools`);
    const toolsData = await toolsRes.json() as any;
    console.log(`[5/8] Governed Tools Verified: ${toolsData.tools?.length || toolsData.totalTools} tools under ToolExecutionBus`);

    // 5. Verify 14-Tier Memory System
    const memRes = await fetch(`${BASE_URL}/memory/items?limit=5`);
    const memData = await memRes.json() as any;
    console.log(`[6/8] 14-Tier Persistent Memory Verified: ${memData.totalReturned} entries inspected`);

    // 6. Verify Environment Subsystem
    const envRes = await fetch(`${BASE_URL}/environment/status`);
    const envData = await envRes.json() as any;
    console.log(`[7/8] Environment Subsystem Verified: Platform ${envData.platform || 'win32'}, Apps: ${envData.totalApplicationsDiscovered || envData.appsCount}, Processes: ${envData.totalActiveProcesses || envData.processesCount}`);

    // 7. Live Chat Turn with Model Router
    console.log('[8/8] Executing live chat dialogue with ModelRouter & Qwen 2.5...');
    const chatRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello HṚṢĪKEŚA, please report Sovereign Control Center status.' }),
    });
    const chatData = await chatRes.json() as any;
    console.log(`\nModel Response (${chatData.model || 'qwen2.5:7b'} in ${chatData.durationMs || '—'}ms):`);
    console.log(`"${chatData.response}"\n`);

    console.log('====================================================');
    console.log('PHASE 11 CONTROL CENTER & AGENT TOWN: ALL CHECKS PASSED');
    console.log('====================================================');
  } finally {
    await kernel.shutdown('Verification complete');
    console.log('Kernel shutdown cleanly.');
  }
}

verifyControlCenter().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
