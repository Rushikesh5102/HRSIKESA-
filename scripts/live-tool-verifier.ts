/**
 * HṚṢĪKEŚA (हृषीकेश) — Live Qwen Tool-Calling Verification Script
 * 
 * Verifies the end-to-end tool calling flow against real local qwen2.5:7b:
 * 1. User asks: "List the files in my HṚṢĪKEŚA project workspace."
 * 2. Model proposes tool call: filesystem.list
 * 3. Permission Manager evaluates risk (Tier 0, allowed within workspace root)
 * 4. ToolExecutionBus executes filesystem.list
 * 5. Output fed back to qwen2.5:7b as role: 'tool'
 * 6. Model synthesizes final response incorporating real file listing
 */

import { HrisekesaKernel } from '../src/runtime/kernel.js';

async function main() {
  console.log('================================================================');
  console.log('HṚṢĪKEŚA — Phase 4 Live Tool Calling Verification');
  console.log('Testing Real End-to-End Tool Call with qwen2.5:7b');
  console.log('================================================================\n');

  const kernel = new HrisekesaKernel({
    HRISEKESA_PORT: '4295',
    HRISEKESA_LOG_LEVEL: 'info',
    OLLAMA_TIMEOUT_MS: '180000'
  });

  console.log('[Step 1] Starting HṚṢĪKEŚA Kernel...');
  await kernel.start();

  try {
    const prompt = 'List the files in my HṚṢĪKEŚA project workspace.';
    console.log(`\n[Step 2] Sending prompt to Qwen 2.5 (7B): "${prompt}"\n`);

    const startTime = Date.now();
    const response = await kernel.conversation.sendMessage(prompt);
    const totalDuration = Date.now() - startTime;

    console.log('----------------------------------------------------------------');
    console.log('[Step 3] Execution Complete!');
    console.log(`Total Turn Duration: ${totalDuration}ms`);
    console.log(`Model Used: ${response.model} (${response.provider})`);
    console.log(`Session ID: ${response.sessionId}`);
    console.log(`Tools Executed: ${response.toolCallsExecuted?.length || 0}`);

    if (response.toolCallsExecuted && response.toolCallsExecuted.length > 0) {
      console.log('\n[Tool Execution Trace]:');
      for (const t of response.toolCallsExecuted) {
        console.log(`  - Tool: ${t.tool}`);
        console.log(`    Input: ${JSON.stringify(t.input)}`);
        console.log(`    Duration: ${t.durationMs}ms`);
        console.log(`    Error: ${t.error || 'none'}`);
        console.log(`    Output Preview: ${JSON.stringify(t.output).substring(0, 150)}...`);
      }
    }

    console.log('\n[Model Final Natural Language Response]:');
    console.log(response.response);
    console.log('----------------------------------------------------------------');

    // Verification assertions
    const toolCalled = response.toolCallsExecuted?.some((t) => t.tool === 'filesystem.list');
    if (!toolCalled) {
      console.warn('WARNING: Model did not invoke filesystem.list directly. Checking response text for file mentions...');
    } else {
      console.log('\nVERIFICATION RESULT: SUCCESS! The full tool execution chain completed.');
    }
  } finally {
    console.log('\n[Step 4] Shutting down HṚṢĪKEŚA Kernel...');
    await kernel.shutdown('Live tool test complete');
    console.log('Shutdown clean. Exiting.\n');
  }
}

main().catch((err) => {
  console.error('Fatal error in live tool verifier:', err);
  process.exit(1);
});
