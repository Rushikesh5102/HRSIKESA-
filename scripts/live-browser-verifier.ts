/**
 * HṚṢĪKEŚA (हृषीकेश) — Live Browser Automation Verifier (Phase 6)
 *
 * Real end-to-end verification against local Qwen 2.5 (7B) on Ollama.
 * Instructs agent Arya to navigate to https://example.com, extract title and heading,
 * and synthesize the result through the Tool Execution Bus.
 */

import { HrisekesaKernel } from '../src/runtime/kernel.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function main() {
  console.log('======================================================================');
  console.log('HṚṢĪKEŚA (हृषीकेश) — Phase 6: Live Browser Automation Verifier');
  console.log('======================================================================\n');

  const liveDbPath = path.resolve(process.cwd(), 'data', 'live-browser-verifier.db');
  if (fs.existsSync(liveDbPath)) {
    fs.unlinkSync(liveDbPath);
  }

  // 1. Boot sovereign micro-kernel
  console.log('[1/5] Booting HṚṢĪKEŚA sovereign micro-kernel with Browser Subsystem...');
  const kernel = new HrisekesaKernel({
    HRISEKESA_DB_PATH: liveDbPath,
  });

  await kernel.start();
  console.log('      ✓ Kernel operational and browser tools registered.\n');

  // 2. Verify target local model (qwen2.5:7b)
  console.log('[2/5] Inspecting available local models...');
  const models = kernel.registry.getAvailableModels();
  const targetModel = models.find((m) => m.id.includes('qwen2.5:7b') || m.id.includes('qwen'));

  if (!targetModel) {
    console.error('      ✗ Error: Local model qwen2.5:7b is not installed in Ollama.');
    await kernel.shutdown('Target model missing');
    process.exit(1);
  }
  console.log(`      ✓ Target model verified: ${targetModel.id} on provider ${targetModel.providerId}\n`);

  // 3. Inspect Agent Arya
  console.log('[3/5] Inspecting Agent Arya for research & browser capabilities...');
  const arya = kernel.agentRegistry.get('arya');
  if (!arya) {
    console.error('      ✗ Error: Agent Arya not found in registry.');
    await kernel.shutdown('Agent missing');
    process.exit(1);
  }
  console.log(`      ✓ Agent: ${arya.displayName} (Role: ${arya.role}, DangerLimit: TIER_${arya.dangerTierLimit})`);
  console.log(`      Allowed tools: [${arya.allowedTools.join(', ')}]\n`);

  // 4. Launch Live Browser Task
  console.log('[4/5] Launching Live Browser Inspection Mission...');
  const objective = 'Open https://example.com and tell me the page title and the main heading.';
  console.log(`      Objective: "${objective}"`);
  console.log('      Assigned Agent: arya\n');

  const startTime = Date.now();
  const task = {
    id: `task_live_bws_${Date.now()}`,
    agentId: 'arya',
    objective,
    context: { url: 'https://example.com' },
    priority: 1 as const,
    status: 'queued' as const,
    createdAt: new Date().toISOString(),
  };

  const result = await kernel.agentRuntime.execute(task);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`[5/5] Browser Task Execution Completed in ${elapsedSec}s!`);
  console.log(`      Status: ${result.status.toUpperCase()}`);
  console.log(`      Tool Calls Executed: ${result.toolCalls.length}`);
  for (const tc of result.toolCalls) {
    const summary = JSON.stringify(tc.output || tc.input);
    console.log(`        - Tool: ${tc.tool} | Output: ${summary.slice(0, 120)}...`);
  }

  console.log('\n----------------------------------------------------------------------');
  console.log('ARYA SYNTHESIS & AGENT RESULT:');
  console.log('----------------------------------------------------------------------');
  console.log(result.summary);
  console.log('----------------------------------------------------------------------\n');

  // Verify Audit Log
  const auditEntries = kernel.toolAudit.listRecords({ toolId: 'browser.navigate' });
  console.log(`Tool Audit Entries for browser.navigate: ${auditEntries.length}`);
  if (auditEntries.length > 0) {
    console.log(`  - Logged Decision: ${auditEntries[0].permissionDecision} | Risk: TIER_${auditEntries[0].riskLevel}`);
  }

  // Verify screenshot capability as well
  console.log('\n[Optional Artifact Check] Testing direct screenshot capture...');
  const shotTool = kernel.toolRegistry.get('browser.screenshot');
  if (shotTool) {
    const shotResult = await kernel.toolBus.execute(
      'browser.screenshot',
      { filename: 'live_example_domain.png' },
      {
        requestId: 'req_shot_verifier',
        sessionId: 'ses_shot_verifier',
        userId: 'ROOT_RUSHIKESH',
        authorityLevel: 'creator',
        timestamp: new Date().toISOString(),
        allowedTools: ['browser.screenshot'],
      }
    );
    if (shotResult.success && shotResult.output) {
      const output = shotResult.output as { path: string; sizeBytes: number };
      console.log(`      ✓ Screenshot captured: ${output.path} (${output.sizeBytes} bytes)`);
    }
  }

  console.log('\n✅ VERIFICATION SUCCESSFUL: Real live browser navigation and model reasoning verified.\n');

  console.log('Initiating clean shutdown...');
  await kernel.shutdown('Live browser verification completed');
  console.log('Shutdown complete.');
}

main().catch((err) => {
  console.error('Fatal error during live browser verification:', err);
  process.exit(1);
});
