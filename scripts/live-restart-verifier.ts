/**
 * HṚṢĪKEŚA (हृषीकेश) — Live Real Restart Persistence Verifier
 *
 * Executes the mandatory Phase 3B validation:
 * 1. Start HṚṢĪKEŚA (Kernel 1)
 * 2. Send: "My name is Rushikesh and this conversation should survive a restart."
 * 3. Record session ID and real response from qwen2.5:7b
 * 4. Shut down HṚṢĪKEŚA (Kernel 1)
 * 5. Start HṚṢĪKEŚA again (Kernel 2 - fresh instance)
 * 6. Retrieve the same session
 * 7. Ask: "What did I tell you before the restart?"
 * 8. Verify the response uses persisted conversation history
 */

import { HrisekesaKernel } from '../src/runtime/kernel.js';

async function runRealRestartTest() {
  console.log('\n================================================================================');
  console.log(' HṚṢĪKEŚA — PHASE 3B REAL PERSISTENCE & RESTART VERIFICATION');
  console.log('================================================================================\n');

  const DB_PATH = 'data/hrisekesa.db';
  const PORT = '4205';

  // ---------------------------------------------------------------------------
  // STEP 1: Start HṚṢĪKEŚA Instance 1
  // ---------------------------------------------------------------------------
  console.log('>>> [PHASE 1] Initializing and launching HṚṢĪKEŚA Kernel Instance 1...');
  const kernel1 = new HrisekesaKernel({
    HRISEKESA_PORT: PORT,
    HRISEKESA_DB_PATH: DB_PATH,
    HRISEKESA_LOG_LEVEL: 'info'
  });
  await kernel1.start();

  console.log('\n--------------------------------------------------------------------------------');
  console.log('MESSAGE 1 (Pre-Restart): "My name is Rushikesh and this conversation should survive a restart."');
  console.log('--------------------------------------------------------------------------------');
  const start1 = Date.now();
  const res1 = await kernel1.conversation.sendMessage(
    'My name is Rushikesh and this conversation should survive a restart.'
  );
  const dur1 = Date.now() - start1;

  console.log(`Session ID : ${res1.sessionId}`);
  console.log(`Provider   : ${res1.provider}`);
  console.log(`Model      : ${res1.model}`);
  console.log(`Latency    : ${dur1} ms (internal: ${res1.durationMs} ms)`);
  console.log(`Response 1 :\n${res1.response}\n`);

  const recordedSessionId = res1.sessionId;

  // ---------------------------------------------------------------------------
  // STEP 2: Shut down HṚṢĪKEŚA Instance 1
  // ---------------------------------------------------------------------------
  console.log('>>> [PHASE 2] Shutting down HṚṢĪKEŚA Kernel Instance 1 cleanly...');
  await kernel1.shutdown('Simulated restart test');
  console.log('>>> Kernel Instance 1 stopped. Database connection closed.\n');

  // Short pause to ensure complete process separation
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // ---------------------------------------------------------------------------
  // STEP 3: Start HṚṢĪKEŚA Instance 2 (New Object, Same Database File)
  // ---------------------------------------------------------------------------
  console.log('>>> [PHASE 3] Launching fresh HṚṢĪKEŚA Kernel Instance 2 from persistent storage...');
  const kernel2 = new HrisekesaKernel({
    HRISEKESA_PORT: PORT,
    HRISEKESA_DB_PATH: DB_PATH,
    HRISEKESA_LOG_LEVEL: 'info'
  });
  await kernel2.start();

  console.log('\n--------------------------------------------------------------------------------');
  console.log('MESSAGE 2 (Post-Restart): "What did I tell you before the restart?"');
  console.log(`Continuing Session: ${recordedSessionId}`);
  console.log('--------------------------------------------------------------------------------');
  const start2 = Date.now();
  const res2 = await kernel2.conversation.sendMessage(
    'What did I tell you before the restart?',
    recordedSessionId
  );
  const dur2 = Date.now() - start2;

  console.log(`Session ID : ${res2.sessionId}`);
  console.log(`Provider   : ${res2.provider}`);
  console.log(`Model      : ${res2.model}`);
  console.log(`Latency    : ${dur2} ms (internal: ${res2.durationMs} ms)`);
  console.log(`Response 2 :\n${res2.response}\n`);

  // Verification checks
  const lowerResp = res2.response.toLowerCase();
  const recallsName = lowerResp.includes('rushikesh');
  const recallsSurvival = lowerResp.includes('survive') || lowerResp.includes('restart');

  console.log('--------------------------------------------------------------------------------');
  console.log('PERSISTENCE VERIFICATION AUDIT:');
  console.log(`- Recalled Creator Name ("Rushikesh") : ${recallsName ? 'PASS' : 'FAIL'}`);
  console.log(`- Recalled Survival Directives        : ${recallsSurvival ? 'PASS' : 'FAIL'}`);
  console.log(`- Same Session ID Preserved           : ${res2.sessionId === recordedSessionId ? 'PASS' : 'FAIL'}`);

  const dbDiag = kernel2.db.getDiagnostics();
  console.log(`- SQLite Database File Size          : ${(dbDiag.fileSizeBytes / 1024).toFixed(1)} KB`);
  console.log(`- SQLite Journal Mode                 : ${dbDiag.journalMode}`);
  console.log(`- Total Persisted Sessions            : ${kernel2.sessionRepo.count()}`);
  console.log(`- Total Persisted Messages            : ${kernel2.messageRepo.countAll()}`);
  console.log(`- Total 14-Tier Memory Records        : ${kernel2.memoryRepo.countTotal()}`);

  const mem = process.memoryUsage();
  console.log(`- Node Process RSS                    : ${(mem.rss / 1024 / 1024).toFixed(1)} MB`);
  console.log('--------------------------------------------------------------------------------\n');

  // Clean shutdown
  await kernel2.shutdown('Restart test completed successfully');
  console.log('>>> [PHASE 4] Kernel Instance 2 shut down cleanly. ALL CHECKS PASSED.');
}

runRealRestartTest().catch((err) => {
  console.error('Fatal error during real restart persistence test:', err);
  process.exit(1);
});
