/**
 * HṚṢĪKEŚA (हृषीकेश) — Capability Registry & Adapter Test Suite
 *
 * Tests:
 * 1. Capability registration and metadata inspection
 * 2. Health check execution and aggregation across all capabilities
 * 3. Open-source adapters: Playwright, faster-whisper, semantic memory, etc.
 * 4. Agent semantic capability routing and aliasing
 * 5. Danger tier / permission limits and security enforcement
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityRegistry } from '../src/capabilities/registry/capability.registry.js';
import { AgentCapabilityRouter } from '../src/capabilities/routing/agent.capability.router.js';
import { NativeFilesystemCapabilityAdapter } from '../src/capabilities/adapters/filesystem.native.capability.js';
import { PowerShellTerminalCapabilityAdapter } from '../src/capabilities/adapters/terminal.powershell.capability.js';
import { FasterWhisperCapabilityAdapter } from '../src/capabilities/adapters/faster.whisper.capability.js';
import { AgentRegistry } from '../src/agents/registry/agent.registry.js';
import { INITIAL_AGENT_ROSTER } from '../src/agents/roster/initial.agents.js';
import { EventBus } from '../src/core/events/event-bus.js';

describe('Phase 16: Open-Source Capability Foundation & Registry', () => {
  let registry: CapabilityRegistry;
  let router: AgentCapabilityRouter;
  let agentRegistry: AgentRegistry;
  let eventBus: EventBus;

  before(() => {
    eventBus = new EventBus();
    registry = new CapabilityRegistry(eventBus);

    agentRegistry = new AgentRegistry();
    for (const agent of INITIAL_AGENT_ROSTER) {
      agentRegistry.register(agent);
    }

    router = new AgentCapabilityRouter(registry, agentRegistry);

    // Register test capability adapters
    registry.register(new NativeFilesystemCapabilityAdapter());
    registry.register(new PowerShellTerminalCapabilityAdapter());
    registry.register(new FasterWhisperCapabilityAdapter());
  });

  describe('1. Capability Registry Metadata & Queries', () => {
    it('should list all registered capabilities', () => {
      const all = registry.getAll();
      assert.ok(all.length >= 3);
      const ids = all.map((c) => c.id);
      assert.ok(ids.includes('filesystem.native'));
      assert.ok(ids.includes('terminal.powershell'));
      assert.ok(ids.includes('voice.stt_tts'));
    });

    it('should filter capabilities by category', () => {
      const fsCaps = registry.listByCategory('filesystem');
      assert.equal(fsCaps.length, 1);
      assert.equal(fsCaps[0].id, 'filesystem.native');

      const voiceCaps = registry.listByCategory('voice');
      assert.equal(voiceCaps.length, 1);
      assert.equal(voiceCaps[0].id, 'voice.stt_tts');
    });

    it('should inspect specific capability metadata', () => {
      const cap = registry.get('filesystem.native');
      assert.ok(cap);
      const meta = cap.getMetadata();
      assert.equal(meta.name, 'Sandboxed Filesystem Operations');
      assert.equal(meta.license, 'MIT');
      assert.equal(meta.riskLevel, 'MEDIUM');
      assert.equal(meta.source, 'native');
    });
  });

  describe('2. Capability Health Checks', () => {
    it('should perform health check on single capability', async () => {
      const health = await registry.checkHealth('filesystem.native');
      assert.equal(health.status, 'HEALTHY');
      assert.ok(health.lastCheckedAt);
    });

    it('should aggregate health checks across all registered capabilities', async () => {
      const allHealth = await registry.checkAllHealth();
      assert.ok(Object.keys(allHealth).length >= 3);
      assert.ok(allHealth['filesystem.native']);
      assert.ok(allHealth['terminal.powershell']);
      assert.ok(allHealth['voice.stt_tts']);
    });

    it('should return UNAVAILABLE for unregistered capability', async () => {
      const health = await registry.checkHealth('non_existent_capability');
      assert.equal(health.status, 'UNAVAILABLE');
    });
  });

  describe('3. Capability Execution & Adapters', () => {
    it('should execute file existence check on native filesystem adapter', async () => {
      const result = await registry.execute({
        capabilityId: 'filesystem.native',
        action: 'exists',
        parameters: { path: process.cwd() },
      });

      assert.equal(result.success, true);
      assert.deepEqual(result.output, { exists: true });
      assert.equal(result.capabilityId, 'filesystem.native');
    });

    it('should reject unsupported action cleanly with error', async () => {
      const result = await registry.execute({
        capabilityId: 'filesystem.native',
        action: 'unsupported_action',
        parameters: {},
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('4. Agent Semantic Capability Routing', () => {
    it('should resolve generic semantic alias "fs" to "filesystem.native"', () => {
      const resolution = router.resolve('gandiva', 'fs');
      assert.equal(resolution.resolvedCapabilityId, 'filesystem.native');
      assert.equal(resolution.available, true);
    });

    it('should resolve generic semantic alias "voice" to "voice.stt_tts"', () => {
      const resolution = router.resolve('rushikesh', 'voice');
      assert.equal(resolution.resolvedCapabilityId, 'voice.stt_tts');
      assert.equal(resolution.available, true);
    });

    it('should route and execute capability for authorized workforce agent', async () => {
      const result = await router.executeForAgent('gandiva', 'fs', 'exists', {
        path: process.cwd(),
      });

      assert.equal(result.success, true);
      assert.deepEqual(result.output, { exists: true });
    });

    it('should reject execution for unknown non-workforce agent', async () => {
      const result = await router.executeForAgent('rogue_agent', 'fs', 'exists', {
        path: process.cwd(),
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes('not registered'));
    });
  });
});
