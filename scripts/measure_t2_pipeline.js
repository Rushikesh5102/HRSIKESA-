/**
 * HṚṢĪKEŚA — FP-02 Part A & Part B Pipeline Measurement Script
 * Measures live T2 request with streaming SSE timestamps, TTFB, TTFT, token generation, and spans.
 */

async function measureT2Pipeline(prompt, options = {}) {
  const {
    sessionId = `bench_${Date.now()}`,
    preferredModel = options.model,
    stream = true,
    responseMode = options.responseMode,
  } = options;

  console.log(`\n==================================================`);
  console.log(`BENCHMARKING PIPELINE: "${prompt}"`);
  console.log(`Model: ${preferredModel || 'default (T2 llama3.2:3b)'}`);
  console.log(`Stream: ${stream}`);
  console.log(`==================================================`);

  const tStart = performance.now();
  let tFirstByte = 0;
  let tFirstToken = 0;
  let tLastToken = 0;
  let tokenCount = 0;
  let accumulatedText = '';
  const tokenTimes = [];

  const bodyPayload = {
    message: prompt,
    sessionId,
    stream,
  };
  if (preferredModel) bodyPayload.preferredModel = preferredModel;
  if (responseMode) bodyPayload.responseMode = responseMode;

  const res = await fetch('http://127.0.0.1:4200/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': stream ? 'text/event-stream' : 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  tFirstByte = performance.now();
  console.log(`[HTTP] Headers received / First Byte: ${(tFirstByte - tStart).toFixed(2)} ms (HTTP ${res.status})`);

  let finalPayload = null;

  if (stream && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkTime = performance.now();
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const evt of events) {
        const lines = evt.split('\n');
        let eventType = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === 'token' && parsed.token) {
            tokenCount++;
            tLastToken = chunkTime;
            if (!tFirstToken) {
              tFirstToken = chunkTime;
              console.log(`[STREAM] FIRST TOKEN (TTFT): ${(tFirstToken - tStart).toFixed(2)} ms`);
            }
            tokenTimes.push(chunkTime - tStart);
            accumulatedText += parsed.token;
          } else if (eventType === 'done') {
            finalPayload = parsed;
          }
        } catch {}
      }
    }
  } else {
    finalPayload = await res.json();
    tFirstToken = performance.now();
    tLastToken = tFirstToken;
    accumulatedText = finalPayload.response || '';
    tokenCount = Math.round(accumulatedText.split(/\s+/).length * 1.3);
  }

  const tEnd = performance.now();
  const totalMs = tEnd - tStart;
  const genMs = tLastToken > tFirstToken ? (tLastToken - tFirstToken) : (totalMs - (tFirstToken - tStart));
  const tps = tokenCount > 0 && genMs > 0 ? (tokenCount / (genMs / 1000)) : 0;

  console.log(`\n--- RESULTS ---`);
  console.log(`Total Wall Clock:      ${totalMs.toFixed(2)} ms (${(totalMs/1000).toFixed(2)} s)`);
  console.log(`First Byte (TTFB):     ${(tFirstByte - tStart).toFixed(2)} ms`);
  console.log(`First Token (TTFT):    ${tFirstToken ? (tFirstToken - tStart).toFixed(2) : 'N/A'} ms`);
  console.log(`Token Generation Time: ${genMs.toFixed(2)} ms (${(genMs/1000).toFixed(2)} s)`);
  console.log(`Tokens Generated:      ${tokenCount}`);
  console.log(`Tokens/Second:         ${tps.toFixed(2)} tok/s`);
  console.log(`Response Snippet:      "${accumulatedText.slice(0, 100).replace(/\n/g, ' ')}..."`);

  if (finalPayload?.metrics) {
    console.log(`\n--- SERVER METRICS ---`);
    console.log(`Intent Mode:           ${finalPayload.intentMode}`);
    console.log(`Server Total Duration: ${finalPayload.durationMs} ms`);
    console.log(`Server Spans:`, JSON.stringify(finalPayload.metrics.spans, null, 2));
  }

  return {
    prompt,
    totalMs,
    ttfbMs: tFirstByte - tStart,
    ttftMs: tFirstToken ? tFirstToken - tStart : totalMs,
    genMs,
    tokenCount,
    tps,
    response: accumulatedText,
    metrics: finalPayload?.metrics,
  };
}

async function main() {
  // Test baseline prompts from FP-01
  console.log('--- WARMING UP MODEL ---');
  await measureT2Pipeline('hi'); // T0 warmup

  console.log('\n--- LIVE T2 REQUEST 1: quick TypeScript tip ---');
  const r1 = await measureT2Pipeline('Give me a quick TypeScript tip');

  console.log('\n--- LIVE T2 REQUEST 2: TypeScript function ---');
  const r2 = await measureT2Pipeline('Write a simple TypeScript function to reverse a string');

  console.log('\n==================================================');
  console.log('SUMMARY TABLE');
  console.log('==================================================');
  console.log('Query | TTFB | TTFT | Gen Time | Tokens | Tok/s | Total Wall');
  console.log(`quick TypeScript tip | ${r1.ttfbMs.toFixed(0)} ms | ${r1.ttftMs.toFixed(0)} ms | ${(r1.genMs/1000).toFixed(2)} s | ${r1.tokenCount} | ${r1.tps.toFixed(1)} t/s | ${(r1.totalMs/1000).toFixed(2)} s`);
  console.log(`TypeScript function  | ${r2.ttfbMs.toFixed(0)} ms | ${r2.ttftMs.toFixed(0)} ms | ${(r2.genMs/1000).toFixed(2)} s | ${r2.tokenCount} | ${r2.tps.toFixed(1)} t/s | ${(r2.totalMs/1000).toFixed(2)} s`);
}

main().catch(console.error);
