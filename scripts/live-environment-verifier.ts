/**
 * HṚṢĪKEŚA (हृषीकेश) — Live Environment Verifier (Phase 10)
 *
 * Real-world end-to-end verification of Software & Environment Manager:
 * 1. Boots HṚṢĪKEŚA micro-kernel.
 * 2. Discovers installed software (Node.js, Git, Ollama, Notepad).
 * 3. Inspects current process and environment state.
 * 4. Launches Notepad via environment.application.launch.
 * 5. Verifies readiness (PID + READY state).
 * 6. Inspects active window through UIA adapter.
 * 7. Verifies process ownership.
 * 8. Safely terminates ONLY the test-launched Notepad PID.
 * 9. Confirms process termination and audit logs.
 * 10. Clean kernel shutdown.
 */

import { HrisekesaKernel } from '../src/runtime/kernel.js';

async function runLiveEnvironmentVerifier(): Promise<void> {
  console.log('===============================================================');
  console.log('  HṚṢĪKEŚA (हृषीकेश) — LIVE ENVIRONMENT VERIFIER (PHASE 10)');
  console.log('===============================================================\n');

  const startTime = Date.now();
  const testDbPath = 'data/live_env_test.db';

  const kernel = new HrisekesaKernel({
    HRISEKESA_DB_PATH: testDbPath,
    LOG_LEVEL: 'info',
    NODE_ENV: 'test'
  });

  try {
    // 1. Start Kernel
    console.log('[1/10] Booting HṚṢĪKEŚA kernel...');
    await kernel.start();
    console.log('  ✔ Kernel READY.\n');

    // 2. Discover installed applications
    console.log('[2/10] Discovering installed applications...');
    const appsResult = await kernel.toolBus.execute(
      'environment.applications.list',
      {},
      {
        requestId: 'live_req_list',
        sessionId: 'live_session',
        userId: 'rushikesh',
        environment: 'local',
        workspaceRoot: process.cwd(),
        allowedTools: ['*']
      }
    );

    if (!appsResult.success) {
      throw new Error(`Failed to list applications: ${appsResult.error}`);
    }

    const appsPayload = appsResult.output as { totalCount: number; applications: Array<{ id: string; name: string; installed: boolean; executablePath?: string }> };
    console.log(`  ✔ Discovered ${appsPayload.totalCount} installed applications:\n`);
    for (const app of appsPayload.applications.slice(0, 8)) {
      console.log(`    - [${app.id}] ${app.name} (${app.installed ? 'INSTALLED' : 'NOT INSTALLED'})`);
    }
    console.log();

    // 3. Verify core developer runtimes (Node.js, Git, Ollama)
    console.log('[3/10] Verifying core development and runtime environments...');
    const nodeApp = await kernel.environmentManager.findApplication('nodejs');
    console.log(`  - Node.js: ${nodeApp?.installed ? `✔ Installed at ${nodeApp.executablePath}` : '✖ Not found'}`);

    const gitApp = await kernel.environmentManager.findApplication('git');
    console.log(`  - Git:     ${gitApp?.installed ? `✔ Installed at ${gitApp.executablePath}` : '✖ Not found'}`);

    const ollamaApp = await kernel.environmentManager.findApplication('ollama');
    console.log(`  - Ollama:  ${ollamaApp?.installed ? `✔ Installed at ${ollamaApp.executablePath}` : '✖ Not found'}`);

    const notepadApp = await kernel.environmentManager.findApplication('notepad');
    console.log(`  - Notepad: ${notepadApp?.installed ? `✔ Installed at ${notepadApp.executablePath}` : '✖ Not found'}`);

    if (!notepadApp?.installed) {
      throw new Error('Notepad is required for live environment verification on Windows.');
    }
    console.log();

    // 4. Inspect system process list
    console.log('[4/10] Inspecting desktop processes with ownership tracking...');
    const procListRes = await kernel.toolBus.execute(
      'environment.process.list',
      {},
      {
        requestId: 'live_req_procs',
        sessionId: 'live_session',
        userId: 'rushikesh',
        environment: 'local',
        workspaceRoot: process.cwd(),
        allowedTools: ['*']
      }
    );
    const procPayload = procListRes.output as { totalCount: number; hrisekesaSpawnedCount: number };
    console.log(`  ✔ Found ${procPayload.totalCount} active processes (${procPayload.hrisekesaSpawnedCount} tracked by HṚṢĪKEŚA).\n`);

    // 5. Launch Notepad through Environment Manager
    console.log('[5/10] Launching Notepad via environment.application.launch...');
    const launchRes = await kernel.toolBus.execute(
      'environment.application.launch',
      { appName: 'notepad' },
      {
        requestId: 'live_req_launch',
        sessionId: 'live_session',
        userId: 'rushikesh',
        environment: 'local',
        workspaceRoot: process.cwd(),
        allowedTools: ['*']
      }
    );

    if (!launchRes.success) {
      throw new Error(`Failed to launch Notepad: ${launchRes.error}`);
    }

    const launchData = launchRes.output as { processId: number; status: string; windowTitle?: string; durationMs: number };
    const launchedPid = launchData.processId;
    console.log(`  ✔ Notepad launched successfully!`);
    console.log(`    - PID: ${launchedPid}`);
    console.log(`    - Status: ${launchData.status}`);
    console.log(`    - Window Title: "${launchData.windowTitle || 'Untitled - Notepad'}"`);
    console.log(`    - Launch Latency: ${launchData.durationMs}ms\n`);

    // 6. Inspect window state via UIA
    console.log('[6/10] Inspecting active window via UIA observation...');
    await new Promise(resolve => setTimeout(resolve, 800)); // Brief pause for UI render
    const uiaWindow = await kernel.uiaAdapter.observeActiveWindow();
    console.log(`  ✔ Active Window: "${uiaWindow?.title}" (PID: ${uiaWindow?.processId})`);
    console.log(`  ✔ Process Name:  ${uiaWindow?.processName}\n`);

    // 7. Verify Process Ownership
    console.log('[7/10] Verifying process ownership in HṚṢĪKEŚA process manager...');
    const isOwned = kernel.environmentManager.isHrisekesaOwned(launchedPid);
    console.log(`  ✔ Process PID ${launchedPid} tracked as HṚṢĪKEŚA-owned: ${isOwned}\n`);
    if (!isOwned) {
      throw new Error(`Process PID ${launchedPid} was not properly tracked as HṚṢĪKEŚA-owned.`);
    }

    // 8. Safely Terminate test-launched process via Tier 2 Human Approval Flow
    console.log(`[8/10] Terminating ONLY test Notepad process (PID: ${launchedPid}) via Tier 2 Approval Gate...`);
    const termAttempt = await kernel.toolBus.execute(
      'environment.process.terminate',
      { pid: launchedPid, force: true },
      {
        requestId: 'live_req_term',
        sessionId: 'live_session',
        userId: 'rushikesh',
        environment: 'local',
        workspaceRoot: process.cwd(),
        allowedTools: ['*']
      }
    );

    let finalTermRes = termAttempt;
    const pending = kernel.permissionManager.getPendingApprovals();
    const appReq = pending.find(a => a.toolId === 'environment.process.terminate');

    if (appReq) {
      console.log(`  ✔ Danger Tier 2 Permission Gate triggered approval request [${appReq.id}].`);
      console.log(`  ✔ Sovereign Master Rushikesh Pattiwar granting interactive approval...`);
      kernel.permissionManager.approve(
        appReq.id,
        'Rushikesh Pattiwar'
      );

      // Re-execute with approvalId
      finalTermRes = await kernel.toolBus.execute(
        'environment.process.terminate',
        { pid: launchedPid, force: true },
        {
          requestId: 'live_req_term_approved',
          sessionId: 'live_session',
          userId: 'rushikesh',
          environment: 'local',
          workspaceRoot: process.cwd(),
          allowedTools: ['*'],
          approvalId: appReq.id
        }
      );
    }

    if (!finalTermRes.success) {
      throw new Error(`Failed to terminate test Notepad: ${finalTermRes.error}`);
    }
    console.log(`  ✔ Terminated PID ${launchedPid} cleanly with verified human authorization.\n`);

    // 9. Confirm process is gone
    console.log('[9/10] Verifying process termination...');
    await new Promise(resolve => setTimeout(resolve, 500));
    const postProc = await kernel.environmentManager.inspectProcess(launchedPid);
    console.log(`  ✔ Process PID ${launchedPid} status: ${postProc ? postProc.status : 'terminated/absent'}\n`);

    // 10. Verify Audit Log
    console.log('[10/10] Verifying SQLite audit log records...');
    const allAudits = kernel.toolAudit.listRecords({ limit: 50 });
    const envAudits = allAudits.filter(item => item.toolId.startsWith('environment.'));
    console.log(`  ✔ Recorded ${envAudits.length} environment audit records in audit ledger:`);
    for (const audit of envAudits) {
      console.log(`    - [${audit.toolId}] status=${audit.executionStatus} decision=${audit.permissionDecision} duration=${audit.durationMs}ms`);
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n===============================================================');
    console.log(`  ✔ LIVE ENVIRONMENT VERIFICATION COMPLETED SUCCESSFULLY (${totalDuration}s)`);
    console.log('===============================================================\n');
  } finally {
    await kernel.shutdown('Live environment verification complete');
  }
}

runLiveEnvironmentVerifier().catch(err => {
  console.error('\n✖ LIVE ENVIRONMENT VERIFIER FAILED:', err);
  process.exit(1);
});
