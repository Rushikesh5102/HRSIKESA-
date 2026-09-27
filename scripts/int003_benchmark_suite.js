/**
 * HṚṢĪKEŚA — INT-003 Multi-Model Benchmark Suite
 *
 * Systematically profiles all installed local models:
 * 1. deepseek-r1:1.5b (1.8B Q4_K_M)
 * 2. llama3.2:3b (3.2B Q4_K_M)
 * 3. qwen2.5:7b (7.6B Q4_K_M)
 *
 * Evaluates across 13 task classes (A-M), measures streaming TTFT, tokens/sec,
 * RAM, model switching penalty, and context scaling.
 */

import fs from 'node:fs';
import path from 'node:path';

const OLLAMA_HOST = 'http://127.0.0.1:11434';
const MODELS = ['deepseek-r1:1.5b', 'llama3.2:3b', 'qwen2.5:7b'];

const TASK_CLASSES = [
  {
    id: 'TASK_A',
    name: 'Casual conversation',
    prompt: 'How are you?',
    evaluator: (text) => text.length > 5 && !text.includes('Error')
  },
  {
    id: 'TASK_B',
    name: 'Simple factual reasoning',
    prompt: 'What is 12 + 19? Answer with just the number or a single short sentence.',
    evaluator: (text) => text.includes('31')
  },
  {
    id: 'TASK_C',
    name: 'Short explanation',
    prompt: 'Explain what an API is in simple terms in two sentences.',
    evaluator: (text) => text.toLowerCase().includes('interface') || text.toLowerCase().includes('program') || text.toLowerCase().includes('connect') || text.toLowerCase().includes('communicate')
  },
  {
    id: 'TASK_D',
    name: 'Identity/context',
    prompt: 'Who created HṚṢĪKEŚA? State the creator name.',
    evaluator: (text) => text.toLowerCase().includes('rushikesh') || text.toLowerCase().includes('pattiwar')
  },
  {
    id: 'TASK_E',
    name: 'Instruction following',
    prompt: 'Give me exactly three concise numbered steps to create and switch to a new Git branch. Number them 1, 2, 3.',
    evaluator: (text) => (text.includes('1.') || text.includes('1:')) && (text.includes('2.') || text.includes('2:')) && (text.includes('3.') || text.includes('3:'))
  },
  {
    id: 'TASK_F',
    name: 'Coding',
    prompt: 'Write a TypeScript function that reverses a string. Provide only the function.',
    evaluator: (text) => text.includes('function') && (text.includes('reverse') || text.includes('split'))
  },
  {
    id: 'TASK_G',
    name: 'Debugging',
    prompt: 'Find the bug in this function:\nfunction add(a: number, b: number): number {\n  return a - b;\n}\nWhat is the bug?',
    evaluator: (text) => text.toLowerCase().includes('subtract') || text.toLowerCase().includes('minus') || text.includes('+')
  },
  {
    id: 'TASK_H',
    name: 'Planning',
    prompt: 'Give me a five-step plan to build a small web application. List steps 1 through 5.',
    evaluator: (text) => text.includes('1.') && text.includes('2.') && text.includes('3.') && text.includes('4.') && text.includes('5.')
  },
  {
    id: 'TASK_I',
    name: 'Structured output',
    prompt: 'Return a JSON object with keys: title, priority (HIGH|MEDIUM|LOW), tags (array of strings), and estimatedHours (number) for an authentication system. Output ONLY valid JSON.',
    evaluator: (text) => {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return false;
        const parsed = JSON.parse(jsonMatch[0]);
        return Boolean(parsed.title && parsed.priority && Array.isArray(parsed.tags) && typeof parsed.estimatedHours === 'number');
      } catch {
        return false;
      }
    }
  },
  {
    id: 'TASK_J',
    name: 'Knowledge/context use',
    prompt: 'Context: HṚṢĪKEŚA orchestrates 17 specialized Vedic agents. The lead agent for architecture is Aja, the research specialist is Rahu, and the security sentinel is Vighna.\n\nQuestion: Which agent is responsible for security sentinel operations?',
    evaluator: (text) => text.toLowerCase().includes('vighna')
  },
  {
    id: 'TASK_K',
    name: 'Agent planning',
    prompt: 'Determine whether this task should become a conversation, tool action, mission, or goal:\n"Deploy a multi-tier PostgreSQL cluster across three staging environments with automatic failover and backup verification."\nAnswer with the exact category name and one sentence justification.',
    evaluator: (text) => text.toLowerCase().includes('mission') || text.toLowerCase().includes('goal')
  },
  {
    id: 'TASK_L',
    name: 'Tool reasoning',
    prompt: 'Determine which tool should be used to retrieve the current local time: "time.now" or "system.info"? State only the tool name.',
    evaluator: (text) => text.includes('time.now')
  },
  {
    id: 'TASK_M',
    name: 'Long-context handling',
    prompt: `Read the following company report and answer the question at the end:
Acme Aerospace Quarterly Report:
In Q1, Acme launched Project Falcon with a budget of 4.5 million USD, achieving 92% milestone completion.
In Q2, Acme initiated Project Osprey led by Dr. Evelyn Reed with 8 team members focusing on autonomous avionics.
In Q3, Project Kestrel was initiated with a target delivery of November 2026.
In Q4, total R&D expenditure reached 12.3 million USD across all divisions.

Question: Who was the leader of Project Osprey and how many team members were on the team?`,
    evaluator: (text) => text.toLowerCase().includes('evelyn') && text.includes('8')
  }
];

async function callOllamaStreaming(model, prompt, options = {}) {
  const startTime = Date.now();
  let firstTokenTime = null;
  let fullText = '';

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.2,
        num_predict: options.maxTokens ?? 256,
        num_ctx: options.numCtx ?? 2048,
        num_thread: 8
      },
      keep_alive: '30m'
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let finalStats = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunkStr = decoder.decode(value, { stream: true });
    const lines = chunkStr.split('\n').filter((l) => l.trim().length > 0);

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.response) {
          if (firstTokenTime === null) {
            firstTokenTime = Date.now();
          }
          fullText += json.response;
        }
        if (json.done) {
          finalStats = json;
        }
      } catch {}
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const ttftMs = firstTokenTime ? firstTokenTime - startTime : totalDurationMs;

  const promptEvalCount = finalStats?.prompt_eval_count ?? 0;
  const evalCount = finalStats?.eval_count ?? 0;
  const promptEvalDurationMs = Math.round((finalStats?.prompt_eval_duration ?? 0) / 1e6);
  const evalDurationMs = Math.round((finalStats?.eval_duration ?? 0) / 1e6);
  const loadDurationMs = Math.round((finalStats?.load_duration ?? 0) / 1e6);

  const tokensPerSec = evalDurationMs > 0 ? Math.round((evalCount / (evalDurationMs / 1000)) * 10) / 10 : 0;

  return {
    model,
    text: fullText.trim(),
    totalDurationMs,
    ttftMs,
    loadDurationMs,
    promptEvalCount,
    promptEvalDurationMs,
    evalCount,
    evalDurationMs,
    tokensPerSec
  };
}

async function getLoadedModel() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/ps`);
    const data = await res.json();
    return data.models?.[0]?.name || null;
  } catch {
    return null;
  }
}

async function runModelTasks(model) {
  console.log(`\n======================================================`);
  console.log(`BENCHMARKING MODEL: ${model}`);
  console.log(`======================================================`);

  // Warm up / probe model
  console.log(`Warming model ${model}...`);
  const warmup = await callOllamaStreaming(model, 'Hello', { maxTokens: 10 });
  console.log(`Warmup completed: load_ms=${warmup.loadDurationMs}ms, total_ms=${warmup.totalDurationMs}ms`);

  const taskResults = [];

  for (const task of TASK_CLASSES) {
    process.stdout.write(`  -> Running ${task.id} (${task.name})... `);
    try {
      const res = await callOllamaStreaming(model, task.prompt, {
        maxTokens: task.id === 'TASK_H' || task.id === 'TASK_M' ? 384 : 256
      });

      const passed = task.evaluator(res.text);
      console.log(`[${passed ? 'PASS' : 'FAIL'}] in ${res.totalDurationMs}ms (TTFT: ${res.ttftMs}ms, ${res.tokensPerSec} t/s)`);

      taskResults.push({
        taskId: task.id,
        taskName: task.name,
        passed,
        ttftMs: res.ttftMs,
        totalDurationMs: res.totalDurationMs,
        evalCount: res.evalCount,
        tokensPerSec: res.tokensPerSec,
        promptEvalCount: res.promptEvalCount,
        snippet: res.text.slice(0, 100).replace(/\n/g, ' ')
      });
    } catch (err) {
      console.log(`[ERROR: ${err.message}]`);
      taskResults.push({
        taskId: task.id,
        taskName: task.name,
        passed: false,
        error: err.message
      });
    }
  }

  const passCount = taskResults.filter((r) => r.passed).length;
  const avgTtft = Math.round(taskResults.reduce((acc, r) => acc + (r.ttftMs || 0), 0) / taskResults.length);
  const avgTotal = Math.round(taskResults.reduce((acc, r) => acc + (r.totalDurationMs || 0), 0) / taskResults.length);
  const avgTps = Math.round((taskResults.reduce((acc, r) => acc + (r.tokensPerSec || 0), 0) / taskResults.length) * 10) / 10;

  console.log(`\nSummary for ${model}: ${passCount}/${TASK_CLASSES.length} PASSED | Avg TTFT: ${avgTtft}ms | Avg Total: ${avgTotal}ms | Avg Speed: ${avgTps} t/s`);

  return {
    model,
    passCount,
    totalTasks: TASK_CLASSES.length,
    avgTtft,
    avgTotal,
    avgTps,
    tasks: taskResults
  };
}

async function measureModelSwitching() {
  console.log(`\n======================================================`);
  console.log(`MEASURING MODEL SWITCHING PENALTY`);
  console.log(`======================================================`);

  // Step 1: Ensure Model A (llama3.2:3b) is warm
  console.log(`1. Ensuring llama3.2:3b is warm...`);
  await callOllamaStreaming('llama3.2:3b', 'Ping', { maxTokens: 5 });

  // Step 2: Switch to Model B (qwen2.5:7b)
  console.log(`2. Switching from llama3.2:3b -> qwen2.5:7b...`);
  const switchB = await callOllamaStreaming('qwen2.5:7b', 'Ping', { maxTokens: 5 });
  console.log(`   Switch to qwen2.5:7b load_ms: ${switchB.loadDurationMs}ms, total_ms: ${switchB.totalDurationMs}ms`);

  // Step 3: Switch back to Model A (llama3.2:3b)
  console.log(`3. Switching back from qwen2.5:7b -> llama3.2:3b...`);
  const switchA = await callOllamaStreaming('llama3.2:3b', 'Ping', { maxTokens: 5 });
  console.log(`   Switch back to llama3.2:3b load_ms: ${switchA.loadDurationMs}ms, total_ms: ${switchA.totalDurationMs}ms`);

  return {
    fromLlamaToQwen: { loadDurationMs: switchB.loadDurationMs, totalDurationMs: switchB.totalDurationMs },
    fromQwenToLlama: { loadDurationMs: switchA.loadDurationMs, totalDurationMs: switchA.totalDurationMs }
  };
}

async function measureContextScaling(model) {
  console.log(`\n======================================================`);
  console.log(`MEASURING CONTEXT SCALING ON ${model}`);
  console.log(`======================================================`);

  const minimalPrompt = 'Answer in one word: What color is the sky?';
  const smallPrompt = `Background notes on cloud networking:
Virtual Private Clouds (VPCs) enable isolated virtual networks. Subnets provide CIDR partitioning.
Security groups provide stateful inspection. Route tables route packets between gateways and subnets.
Network ACLs provide stateless filtering at subnet boundaries.
Transit gateways interconnect hundreds of VPCs and on-premises networks.

Answer in one word: What provides stateless filtering at subnet boundaries?`;

  const paragraph = 'HṚṢĪKEŚA is an autonomous sovereign personal AI operating system created for Rushikesh Pattiwar. It features 17 specialized Vedic agents mapped to discrete organizational functions. ';
  const largePrompt = paragraph.repeat(20) + '\n\nAnswer in one word: Who is the creator of HṚṢĪKEŚA?';

  console.log('Running minimal context...');
  const resMin = await callOllamaStreaming(model, minimalPrompt, { maxTokens: 10 });
  console.log(`  Minimal Context: prompt_tokens=${resMin.promptEvalCount}, prompt_eval_ms=${resMin.promptEvalDurationMs}ms, TTFT=${resMin.ttftMs}ms`);

  console.log('Running small context...');
  const resSmall = await callOllamaStreaming(model, smallPrompt, { maxTokens: 10 });
  console.log(`  Small Context: prompt_tokens=${resSmall.promptEvalCount}, prompt_eval_ms=${resSmall.promptEvalDurationMs}ms, TTFT=${resSmall.ttftMs}ms`);

  console.log('Running large context (~1000 tokens)...');
  const resLarge = await callOllamaStreaming(model, largePrompt, { maxTokens: 10 });
  console.log(`  Large Context: prompt_tokens=${resLarge.promptEvalCount}, prompt_eval_ms=${resLarge.promptEvalDurationMs}ms, TTFT=${resLarge.ttftMs}ms`);

  return {
    model,
    minimal: { promptTokens: resMin.promptEvalCount, promptEvalMs: resMin.promptEvalDurationMs, ttftMs: resMin.ttftMs },
    small: { promptTokens: resSmall.promptEvalCount, promptEvalMs: resSmall.promptEvalDurationMs, ttftMs: resSmall.ttftMs },
    large: { promptTokens: resLarge.promptEvalCount, promptEvalMs: resLarge.promptEvalDurationMs, ttftMs: resLarge.ttftMs }
  };
}

async function main() {
  console.log('######################################################');
  console.log('HṚṢĪKEŚA INT-003: COMPREHENSIVE LOCAL MODEL BENCHMARK');
  console.log('######################################################');

  const allModelResults = [];
  for (const model of MODELS) {
    const res = await runModelTasks(model);
    allModelResults.push(res);
  }

  const switchingResults = await measureModelSwitching();
  const contextScalingResults = await measureContextScaling('llama3.2:3b');

  const report = {
    timestamp: new Date().toISOString(),
    models: allModelResults,
    switching: switchingResults,
    contextScaling: contextScalingResults
  };

  const outPath = path.resolve('docs/int003_raw_benchmark.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nAll raw benchmark results saved to ${outPath}`);
}

main().catch(console.error);
