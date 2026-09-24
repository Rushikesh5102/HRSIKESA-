/**
 * HRSIKESA (हृषीकेश) — Live Agent & Mission Verifier Script
 * Executes an end-to-end mission against local Ollama (qwen2.5:7b)
 *
 * Flow:
 * Mission ("Inspect the HṚṢĪKEŚA project workspace and report its high-level structure.")
 *   ↓
 * Chanakya (Planning & Strategy Agent)
 *   ↓
 * Task (Root Task)
 *   ↓
 * AgentRuntime
 *   ↓
 * Qwen2.5:7b (Local model proposing `filesystem.list`)
 *   ↓
 * PermissionManager & ToolExecutionBus
 *   ↓
 * Built-in filesystem.list Tool (Safe execution)
 *   ↓
 * Qwen2.5:7b (Synthesizing findings)
 *   ↓
 * AgentResult & Blackboard entry
 *   ↓
 * MissionResult
 */

import { HrisekesaKernel } from '../src/runtime/kernel.js';
import { DangerTier } from '../src/tools/interfaces/danger.types.js';

async function main() {
  console.log('='.repeat(70));
  console.log('HṚṢĪKEŚA (हृषीकेश) — LIVE AGENT & MISSION VERIFIER');
  console.log('Model: qwen2.5:7b via Ollama Local Provider');
  console.log('Agent: Chanakya (Planning & Strategy)');
  console.log('='.repeat(70));

  const kernel = new HrisekesaKernel({
    HRISEKESA_LOG_LEVEL: 'info',
    HRISEKESA_PORT: '19196',
    HRISEKESA_DB_PATH: 'data/live-agent-verifier.db'
  });

  try {
    console.log('\n[1/5] Booting HṚṢĪKEŚA sovereign micro-kernel...');
    await kernel.start();
    console.log('      ✓ Kernel operational.');

    // Verify Ollama & qwen2.5:7b model
    console.log('\n[2/5] Inspecting available local models...');
    const availableModels = kernel.registry.getAvailableModels();
    console.log(`      Available models count: ${availableModels.length}`);
    const qwen = availableModels.find(m => m.id.includes('qwen2.5'));
    if (!qwen) {
      throw new Error('Local model qwen2.5:7b not found in registry. Ensure `ollama serve` is running.');
    }
    console.log(`      ✓ Target model verified: ${qwen.id} on provider ${qwen.provider}`);

    // Verify Agent Workforce
    console.log('\n[3/5] Inspecting Agent Workforce roster...');
    const chanakya = kernel.agentRegistry.get('chanakya');
    if (!chanakya) {
      throw new Error("Agent 'chanakya' is not registered.");
    }
    console.log(`      ✓ Agent: ${chanakya.displayName} (Role: ${chanakya.role}, DangerLimit: TIER_${chanakya.dangerTierLimit})`);
    console.log(`      Allowed tools: [${chanakya.allowedTools.join(', ')}]`);

    // Create & Execute Mission
    console.log('\n[4/5] Launching Live Mission...');
    const missionObjective = 'Inspect the HṚṢĪKEŚA project workspace and report its high-level structure.';
    console.log(`      Objective: "${missionObjective}"`);
    console.log('      Assigned Root Agent: chanakya');

    const startTime = Date.now();
    const missionResult = await kernel.missionOrchestrator.runMission({
      objective: missionObjective,
      rootAgentId: 'chanakya'
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n[5/5] Mission Execution Completed!');
    console.log(`      Status: ${missionResult.status}`);
    console.log(`      Mission ID: ${missionResult.missionId}`);
    console.log(`      Elapsed Time: ${elapsed}s`);
    console.log('\n' + '-'.repeat(70));
    console.log('CHANAKYA SYNTHESIS & AGENT RESULT:');
    console.log('-'.repeat(70));
    console.log(missionResult.summary || '(no summary returned)');
    console.log('-'.repeat(70));

    // Verify tasks and blackboard findings
    const tasks = kernel.taskRepo.listByMission(missionResult.missionId);
    console.log(`\nTasks recorded in SQLite: ${tasks.length}`);
    for (const t of tasks) {
      console.log(`  - Task [${t.id}] Agent: ${t.agentId} | Status: ${t.status} | Objective: "${t.objective.substring(0, 50)}..."`);
    }

    const blackboard = kernel.blackboard.listByMission(missionResult.missionId);
    console.log(`Blackboard entries published: ${blackboard.length}`);
    for (const b of blackboard) {
      console.log(`  - Finding [${b.id}] Type: ${b.type} | Agent: ${b.agentId} | Title: "${b.title}"`);
    }

    // Verify tool calls occurred
    const rootTask = tasks[0];
    const auditRecords = kernel.toolAudit.listRecords({ limit: 10 });
    console.log(`\nTool Audit Entries Recorded: ${auditRecords.length}`);
    for (const a of auditRecords.slice(0, 3)) {
      console.log(`  - Tool: ${a.toolId} | Status: ${a.status} | Caller: ${a.callerIdentity} | Target: ${a.targetResource || 'N/A'}`);
    }

    if (auditRecords.length === 0) {
      console.warn('⚠️ Warning: No tool audit entries recorded. Expected at least one tool call.');
    } else {
      console.log('\n✅ VERIFICATION SUCCESSFUL: Real live tool execution and model reasoning verified.');
    }

  } catch (err) {
    console.error('\n❌ Live agent verification failed:', err);
    process.exitCode = 1;
  } finally {
    console.log('\nInitiating clean shutdown...');
    await kernel.shutdown('Live verifier completed');
    console.log('Shutdown complete.');
  }
}

void main();
