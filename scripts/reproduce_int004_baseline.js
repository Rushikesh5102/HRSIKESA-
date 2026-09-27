/**
 * HṚṢĪKEŚA — INT-004 Step 1: Reproduction Script
 * Probes the 6 specified queries against the live server
 */

const BASE_URL = 'http://localhost:4200';

const QUERIES = [
  { id: 'A', prompt: 'hello', desc: 'A: "hello"' },
  { id: 'B', prompt: "hello\n\n[Language Preference: Respond in clear, articulate Indian English.]", desc: 'B: "hello + language wrapper"' },
  { id: 'C', prompt: 'who created you?', desc: 'C: "who created you?"' },
  { id: 'D', prompt: 'what is HṚṢĪKEŚA?', desc: 'D: "what is HṚṢĪKEŚA?"' },
  { id: 'E', prompt: 'what time is it?', desc: 'E: "what time is it?"' },
  { id: 'F', prompt: "what is today's date?", desc: 'F: "what is today\'s date?"' }
];

async function runProbe(item) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: item.prompt })
    });
    const elapsed = Date.now() - t0;
    if (!res.ok) {
      const err = await res.text();
      return { id: item.id, prompt: item.prompt, error: `HTTP ${res.status}: ${err}`, elapsed };
    }
    const data = await res.json();
    return {
      id: item.id,
      desc: item.desc,
      prompt: item.prompt,
      model: data.model,
      provider: data.provider,
      intentMode: data.intentMode,
      totalDurationMs: data.durationMs || elapsed,
      ttfbMs: data.metrics?.ttfbMs,
      ttftMs: data.metrics?.ttftMs,
      modelDurationMs: data.metrics?.modelDurationMs,
      toolCalls: data.toolCallsExecuted?.length || 0,
      spans: data.metrics?.spans || {},
      responseSnippet: (data.response || '').slice(0, 140).replace(/\n/g, ' ')
    };
  } catch (err) {
    return { id: item.id, prompt: item.prompt, error: err.message, elapsed: Date.now() - t0 };
  }
}

async function main() {
  console.log('====================================================');
  console.log('HṚṢĪKEŚA INT-004 — STEP 1: REPRODUCTION PROBE (A-F)');
  console.log('====================================================\n');

  const results = [];
  for (const q of QUERIES) {
    console.log(`Testing [${q.id}] ${q.desc}...`);
    const res = await runProbe(q);
    results.push(res);
    console.log(`  -> Duration: ${res.totalDurationMs}ms | Model: ${res.model} | TTFB: ${res.ttfbMs}ms | Intent: ${res.intentMode}`);
    console.log(`  -> Snippet: "${res.responseSnippet || res.error}"\n`);
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('====================================================');
  console.log('FULL JSON REPORT:');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
