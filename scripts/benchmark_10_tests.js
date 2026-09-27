/**
 * HṚṢĪKEŚA — INT-001 Baseline Latency Profiler
 * Controlled execution of 10 benchmark test classes
 */

const BASE_URL = 'http://localhost:4200';

const TESTS = [
  { id: 'TEST_1', prompt: 'hello', desc: 'TEST 1: Casual greeting "hello"' },
  { id: 'TEST_2', prompt: 'hi', desc: 'TEST 2: Casual greeting "hi"' },
  { id: 'TEST_3', prompt: 'what is 2+2?', desc: 'TEST 3: Arithmetic question "what is 2+2?"' },
  { id: 'TEST_4', prompt: 'who created you?', desc: 'TEST 4: Identity query "who created you?"' },
  { id: 'TEST_5', prompt: 'what is HṚṢĪKEŚA?', desc: 'TEST 5: System identity query "what is HṚṢĪKEŚA?"' },
  { id: 'TEST_6', prompt: 'Do you remember what my name is?', desc: 'TEST 6: Simple memory query' },
  { id: 'TEST_7', prompt: 'What are the 17 specialized Vedic agents in your workforce?', desc: 'TEST 7: Simple knowledge query' },
  { id: 'TEST_8', prompt: 'Can you tell me what the exact time is on the system right now please?', desc: 'TEST 8: Tool request (time.now)' },
  { id: 'TEST_9', prompt: 'Research the latest developments in local autonomous AI agents and synthesize a report.', desc: 'TEST 9: Research/Mission request' },
  { id: 'TEST_10', prompt: 'goal: Build a complete autonomous system audit across all 17 agents.', desc: 'TEST 10: Goal/Company request' },
];

async function runTest(test, preferredModel, preferredProvider) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: test.prompt,
        preferredModel,
        preferredProvider
      })
    });

    const elapsed = Date.now() - t0;
    if (!res.ok) {
      const errText = await res.text();
      return { id: test.id, prompt: test.prompt, error: `HTTP ${res.status}: ${errText}`, elapsed };
    }

    const data = await res.json();
    return {
      id: test.id,
      prompt: test.prompt,
      model: data.model,
      provider: data.provider,
      totalDurationMs: data.durationMs || elapsed,
      ttfbMs: data.metrics?.ttfbMs,
      ttftMs: data.metrics?.ttftMs,
      modelDurationMs: data.metrics?.modelDurationMs,
      toolCalls: data.toolCallsExecuted?.length || 0,
      spans: data.metrics?.spans || {},
      responseSnippet: (data.response || '').slice(0, 100).replace(/\n/g, ' ')
    };
  } catch (err) {
    return { id: test.id, prompt: test.prompt, error: err.message, elapsed: Date.now() - t0 };
  }
}

async function main() {
  console.log('====================================================');
  console.log('HṚṢĪKEŚA INT-001 — BENCHMARK EXECUTION (10 CLASSES)');
  console.log('====================================================\n');

  const results = [];

  for (const test of TESTS) {
    console.log(`Running ${test.desc} ...`);
    const res = await runTest(test, 'qwen2.5:7b', 'ollama');
    results.push(res);
    console.log(`  -> Duration: ${res.totalDurationMs}ms | Model: ${res.model} | TTFB: ${res.ttfbMs}ms | Tools: ${res.toolCalls}`);
    console.log(`  -> Snippet: "${res.responseSnippet || res.error}"\n`);
    // Brief settle pause
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('====================================================');
  console.log('RAW JSON SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
