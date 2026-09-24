import { HrisekesaKernel } from '../src/runtime/kernel.js';

interface ProfileResult {
  scenario: string;
  query: string;
  intentMode?: string;
  firstVisibleMs: number;
  firstTokenMs: number;
  totalMs: number;
  model: string;
  provider: string;
  contextAssemblyMs: number;
  modelInferenceMs: number;
  memoryRan: boolean;
  knowledgeGraphRan: boolean;
  routingRan: boolean;
  agentsRan: boolean;
  toolsRan: boolean;
  responsePreview: string;
}

async function runProfiling() {
  const TEST_PORT = '19188';
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  console.log('--- Starting HṚṢĪKEŚA Profiling Session ---');
  const kernel = new HrisekesaKernel({
    HRISEKESA_PORT: TEST_PORT,
    HRISEKESA_LOG_LEVEL: 'warn'
  });

  await kernel.start();
  console.log('Kernel started.');

  const scenarios = [
    { name: '1. Casual Greeting', prompt: 'hello' },
    { name: '2. Conversational Check', prompt: 'how are you?' },
    { name: '3. Simple Factual Question', prompt: 'What is the capital of India?' },
    { name: '4. Multi-Turn Followup', prompt: 'Tell me more about its historical significance in 2 sentences.' },
    { name: '5. Memory Preference', prompt: 'Please remember my preference for concise bulleted answers.' },
    { name: '6. Research Request', prompt: 'Research the best open-source ERP systems and summarize their architectures.' },
    { name: '7. Tool Request', prompt: 'What is the current system time and host status?' },
    { name: '8. Computer GUI Task', prompt: 'Open Notepad and type hello world' },
    { name: '9. Autonomous Goal', prompt: 'Build a comprehensive market analysis goal for Q4 enterprise AI software.' },
    { name: '10. Company Operation', prompt: 'Create a new autonomous company named SolarTech Innovations.' }
  ];

  const results: ProfileResult[] = [];
  let currentSessionId: string | undefined = undefined;

  for (const s of scenarios) {
    console.log(`\nTesting [${s.name}]: "${s.prompt}"...`);
    const reqStart = Date.now();

    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: s.prompt,
          sessionId: currentSessionId
        })
      });

      const totalMs = Date.now() - reqStart;
      const data = await res.json() as any;

      if (data.sessionId) currentSessionId = data.sessionId;

      const result: ProfileResult = {
        scenario: s.name,
        query: s.prompt,
        intentMode: data.intentMode || 'CONVERSATION',
        firstVisibleMs: totalMs, // In non-streaming baseline, first visible is total
        firstTokenMs: totalMs,
        totalMs,
        model: data.model || 'unknown',
        provider: data.provider || 'unknown',
        contextAssemblyMs: 0,
        modelInferenceMs: data.durationMs || totalMs,
        memoryRan: data.intentMode === undefined || data.intentMode === 'CONVERSATION',
        knowledgeGraphRan: false,
        routingRan: true,
        agentsRan: data.intentMode === 'MISSION_REQUEST' || data.intentMode === 'GOAL_REQUEST',
        toolsRan: Array.isArray(data.toolCallsExecuted) && data.toolCallsExecuted.length > 0,
        responsePreview: (data.response || data.error || '').slice(0, 100).replace(/\n/g, ' ')
      };

      results.push(result);
      console.log(` -> Status: ${res.status} in ${totalMs}ms | Model: ${result.model} | Response: "${result.responsePreview}..."`);
    } catch (err: any) {
      console.error(` -> Failed: ${err.message}`);
      results.push({
        scenario: s.name,
        query: s.prompt,
        firstVisibleMs: -1,
        firstTokenMs: -1,
        totalMs: Date.now() - reqStart,
        model: 'error',
        provider: 'error',
        contextAssemblyMs: 0,
        modelInferenceMs: 0,
        memoryRan: false,
        knowledgeGraphRan: false,
        routingRan: false,
        agentsRan: false,
        toolsRan: false,
        responsePreview: `ERROR: ${err.message}`
      });
    }
  }

  await kernel.stop();
  console.log('\n================ PROFILING SUMMARY ================');
  console.table(results.map(r => ({
    Scenario: r.scenario,
    TotalMs: `${r.totalMs}ms`,
    FirstVisibleMs: `${r.firstVisibleMs}ms`,
    Model: r.model,
    Provider: r.provider,
    Intent: r.intentMode,
    ToolsRan: r.toolsRan
  })));
}

runProfiling().catch(console.error);
