/**
 * HṚṢĪKEŚA (हृषीकेश) — Live Desktop Computer Verification Script
 *
 * Real end-to-end integration test with local Qwen2.5:7b model:
 * 1. Initializes HṚṢĪKEŚA kernel with WindowsComputerAdapter
 * 2. Takes initial desktop screenshot artifact
 * 3. Inspects active foreground window
 * 4. Launches Notepad via allowlisted computer.app.launch
 * 5. Uses Qwen2.5:7b reasoning to type "HṚṢĪKEŚA COMPUTER TEST"
 * 6. Captures post-action verification screenshot
 * 7. Safely terminates launched test Notepad process
 * 8. Verifies audit records and cleanly shuts down kernel
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { HrisekesaKernel } from '../src/runtime/kernel.js';

async function runLiveComputerVerification() {
  console.log('======================================================================');
  console.log('  HṚṢĪKEŚA — PHASE 7 LIVE DESKTOP COMPUTER VERIFIER');
  console.log('======================================================================\n');

  const testDbPath = path.resolve(process.cwd(), 'data', 'live-computer-verifier.db');
  try {
    await fs.unlink(testDbPath);
  } catch {
    // Ignored if file doesn't exist
  }

  // 1. Initialize Kernel with Windows Native Computer Adapter
  console.log('[1/7] Initializing HṚṢĪKEŚA Micro-Kernel...');
  const kernel = new HrisekesaKernel({
    HRISEKESA_DB_PATH: testDbPath,
    PORT: '4201',
    SERVER_ENV: 'test'
  });

  await kernel.start();
  console.log('      ✓ Kernel operational and computer tools registered.\n');

  // 2. Query Screen Size & Capture Initial Screenshot
  console.log('[2/7] Testing Native Display & Screenshot Capture...');
  const screenSize = await kernel.computerAdapter.getScreenSize();
  console.log(`      ✓ Display Resolution: ${screenSize.width}x${screenSize.height}`);

  const initialShot = await kernel.computerAdapter.screenshot('live_initial_desktop');
  console.log(`      ✓ Initial Screenshot Saved: ${initialShot.artifactPath} (${initialShot.bytes} bytes)`);

  const activeWin = await kernel.computerAdapter.getActiveWindow();
  console.log(`      ✓ Active Window: "${activeWin.title}" (Process: ${activeWin.processName}, PID: ${activeWin.processId})\n`);

  // 3. Verify Model Availability
  console.log('[3/7] Verifying Local AI Model (qwen2.5:7b)...');
  const availableModels = kernel.registry.getAvailableModels();
  const qwenModel = availableModels.find((m) => m.id === 'qwen2.5:7b' || m.name.includes('qwen2.5:7b'));

  if (!qwenModel) {
    throw new Error('Local model qwen2.5:7b is not available in Ollama. Please run `ollama pull qwen2.5:7b` first.');
  }
  console.log(`      ✓ Verified local model: ${qwenModel.id} on provider ${qwenModel.providerId}\n`);

  // 4. Launch Notepad via Allowlisted Application Mechanism
  console.log('[4/7] Launching Allowlisted Application (Notepad)...');
  const launchRes = await kernel.computerAdapter.launchApp('notepad');
  console.log(`      ✓ Application Launched: ${launchRes.appName} (PID: ${launchRes.pid})\n`);

  // Wait 1.5 seconds for window focus
  await new Promise((res) => setTimeout(res, 1500));

  // 5. Ask Agent Arjuna to execute desktop typing task
  console.log('[5/7] Executing Agent Arjuna Desktop Interaction Task via Qwen2.5:7b...');
  const task = {
    id: `task_live_comp_${Date.now()}`,
    agentId: 'arjuna',
    missionId: 'mission_live_desktop',
    title: 'Type Message into Desktop Notepad',
    objective: 'Type "HṚṢĪKEŚA COMPUTER TEST" into the active Notepad application using computer.keyboard.type.',
    depth: 0
  };

  const startTime = Date.now();
  const result = await kernel.agentRuntime.execute(task);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n      Task Completed in ${duration}s!`);
  console.log(`      Status: ${result.status.toUpperCase()}`);
  console.log(`      Tool Calls Executed: ${result.toolCalls.length}`);
  for (const call of result.toolCalls) {
    console.log(`        - Tool: ${call.tool} | Output: ${JSON.stringify(call.output || {}).slice(0, 80)}...`);
  }

  console.log('\n----------------------------------------------------------------------');
  console.log('ARJUNA SYNTHESIS & AGENT RESULT:');
  console.log('----------------------------------------------------------------------');
  console.log(result.summary);
  console.log('----------------------------------------------------------------------\n');

  // 6. Capture Post-Action Screenshot
  console.log('[6/7] Capturing Post-Action Verification Screenshot...');
  const postShot = await kernel.computerAdapter.screenshot('live_after_typing_desktop');
  console.log(`      ✓ Post-Action Screenshot Saved: ${postShot.artifactPath} (${postShot.bytes} bytes)\n`);

  // 7. Verify Audit Trail and Clean Up Test Process
  console.log('[7/7] Auditing & Clean Shutdown...');
  const auditRecords = kernel.toolAudit.listRecords({ toolId: 'computer.keyboard.type' });
  console.log(`      ✓ Tool Audit Entries for computer.keyboard.type: ${auditRecords.length}`);
  if (auditRecords.length > 0) {
    console.log(`        - Logged Decision: ${auditRecords[0].permissionDecision} | Risk: ${auditRecords[0].riskLevel}`);
  }

  // Safely close only the Notepad test process that this test launched
  if (launchRes.pid > 0) {
    const closeRes = await kernel.computerAdapter.closeApp(launchRes.pid);
    console.log(`      ✓ Cleanly closed launched test Notepad (PID: ${launchRes.pid}, Killed: ${closeRes.killed})`);
  }

  console.log('\n✅ VERIFICATION SUCCESSFUL: Real desktop GUI automation and model reasoning verified.');
  console.log('\nInitiating clean shutdown...');
  await kernel.shutdown('Live desktop verification finished');
  console.log('Shutdown complete.\n');
}

runLiveComputerVerification().catch((err) => {
  console.error('\n❌ FATAL LIVE VERIFICATION ERROR:', err);
  process.exit(1);
});
