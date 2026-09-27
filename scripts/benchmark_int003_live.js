/**
 * HṚṢĪKEŚA — INT-003 Live Baseline Benchmark
 * Tests dynamic tiered model routing across the 11 canonical task queries
 */

const BASE_URL = 'http://localhost:4200';

const TESTS = [
  { id: 'TEST_1', prompt: 'hello', desc: '1. Casual greeting "hello"' },
  { id: 'TEST_2', prompt: 'hello, please reply in English', desc: '2. Greeting + language preference' },
  { id: 'TEST_3', prompt: 'hi', desc: '3. Casual greeting "hi"' },
  { id: 'TEST_4', prompt: 'who created you?', desc: '4. Identity query' },
  { id: 'TEST_5', prompt: 'what is HṚṢĪKEŚA?', desc: '5. System identity query' },
  { id: 'TEST_6', prompt: 'what is 2+2?', desc: '6. Arithmetic question "what is 2+2?"' },
  { id: 'TEST_7', prompt: 'Do you remember what my name is?', desc: '7. Simple memory query' },
  { id: 'TEST_8', prompt: 'What are the 17 specialized Vedic agents in your workforce?', desc: '8. Knowledge query' },
  { id: 'TEST_9', prompt: 'Can you tell me what the exact time is on the system right now please?', desc: '9. Time request' },
  { id: 'TEST_10', prompt: 'Research the latest developments in local autonomous AI agents and synthesize a report.', desc: '10. Mission request' },
  { id: 'TEST_11', prompt: 'goal: Build a complete autonomous system audit across all 17 agents.', desc: '11. Goal request' },
];

async function runTest(test) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: test.prompt,
        // No hardcoded preferredModel or preferredProvider: let ModelRouter dynamically select!
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
      responseSnippet: (data.response || '').slice(0, 120).replace(/\n/g, ' ')
    };
  } catch (err) {
    return { id: test.id, prompt: test.prompt, error: err.message, elapsed: Date.now() - t0 };
  }
}

async function main() {
  console.log('====================================================');
  console.log('HṚṢĪKEŚA INT-003 — LIVE BASELINE BENCHMARK (11 CLASSES)');
  console.log('====================================================\n');

  const results = [];

  for (const test of TESTS) {
    console.log(`Running ${test.desc} ...`);
    const res = await runTest(test);
    results.push(res);
    console.log(`  -> Duration: ${res.totalDurationMs}ms | Model: ${res.model} | TTFB: ${res.ttfbMs}ms | Tools: ${res.toolCalls}`);
    console.log(`  -> Snippet: "${res.responseSnippet || res.error}"\n`);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('====================================================');
  console.log('RAW JSON SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
