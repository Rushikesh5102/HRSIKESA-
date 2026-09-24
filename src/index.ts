/**
 * HṚṢĪKEŚA (हृषीकेश) — Primary Runtime Entrypoint
 * Sovereign Personal AI Operating System & Autonomous Workforce
 */

import { HrisekesaKernel } from './runtime/kernel.js';

export * from './core/identity/identity.types.js';
export * from './core/identity/identity.manager.js';
export * from './core/configuration/config.types.js';
export * from './core/configuration/config.manager.js';
export * from './core/lifecycle/lifecycle.types.js';
export * from './core/lifecycle/lifecycle.manager.js';
export * from './core/events/event.types.js';
export * from './core/events/event-bus.js';
export * from './core/logging/logger.types.js';
export * from './core/logging/logger.js';
export * from './core/hardware/hardware.types.js';
export * from './core/hardware/hardware.detector.js';
export * from './models/interfaces/model.types.js';
export * from './models/interfaces/model.provider.js';
export * from './models/providers/ollama.provider.js';
export * from './models/providers/openai.provider.js';
export * from './models/providers/anthropic.provider.js';
export * from './models/providers/gemini.provider.js';
export * from './models/registry/model.registry.js';
export * from './models/router/model.router.js';
export * from './api/http.server.js';
export * from './conversation/session.types.js';
export * from './conversation/session.manager.js';
export * from './conversation/conversation.service.js';
export * from './conversation/context.assembler.js';
export * from './persistence/database/database.manager.js';
export * from './persistence/migrations/migration.types.js';
export * from './persistence/migrations/migration.manager.js';
export * from './persistence/repositories/session.repository.js';
export * from './persistence/repositories/message.repository.js';
export * from './persistence/repositories/memory.repository.js';
export * from './memory/memory.types.js';
export * from './memory/creator.profile.js';
export * from './memory/import/chatgpt.types.js';
export * from './memory/import/chatgpt.importer.js';

// Phase 4: Tools, Permissions, and MCP exports
export * from './tools/interfaces/danger.types.js';
export * from './tools/interfaces/tool.types.js';
export * from './tools/interfaces/execution.types.js';
export * from './tools/interfaces/permission.types.js';
export * from './tools/interfaces/audit.types.js';
export * from './tools/registry/tool.registry.js';
export * from './tools/permissions/permission.manager.js';
export * from './tools/audit/tool.audit.js';
export * from './tools/execution/tool.bus.js';
export * from './tools/builtin/system.info.js';
export * from './tools/builtin/filesystem.list.js';
export * from './tools/builtin/filesystem.read.js';
export * from './tools/builtin/filesystem.write.js';
export * from './tools/builtin/time.now.js';
export * from './tools/builtin/ollama.models.js';
export * from './tools/builtin/ollama.chat.js';
export * from './tools/builtin/terminal.execute.js';
export * from './tools/mcp/mcp.types.js';
export * from './tools/mcp/mcp.transport.js';
export * from './tools/mcp/mcp.adapter.js';

// Phase 5: Multi-Agent Workforce & Mission exports
export * from './agents/interfaces/agent.types.js';
export * from './agents/interfaces/task.types.js';
export * from './agents/interfaces/mission.types.js';
export * from './agents/registry/agent.registry.js';
export * from './agents/roster/initial.agents.js';
export * from './agents/delegation/delegation.manager.js';
export * from './agents/blackboard/blackboard.js';
export * from './agents/runtime/agent.runtime.js';
export * from './agents/mission/mission.orchestrator.js';
export * from './persistence/repositories/task.repository.js';
export * from './persistence/repositories/mission.repository.js';

// Phase 6: Browser Automation exports
export * from './tools/browser/index.js';
export * from './tools/builtin/browser/index.js';

// Phase 7: Computer / Desktop GUI Automation exports
export * from './tools/computer/index.js';
export * from './tools/builtin/computer/index.js';

// Phase 8: Voice Subsystem exports
export * from './voice/index.js';

export * from './runtime/kernel.js';

// Auto-start when executed directly
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('index.ts') ||
  process.argv[1].endsWith('index.js') ||
  process.argv[1].endsWith('hrisekesa')
);

if (isMainModule) {
  const kernel = new HrisekesaKernel();

  const handleTermination = async (signal: string) => {
    console.log(`\nReceived ${signal}. Initiating clean shutdown...`);
    try {
      await kernel.shutdown(`Signal: ${signal}`);
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void handleTermination('SIGINT'));
  process.on('SIGTERM', () => void handleTermination('SIGTERM'));

  kernel.start().catch((err) => {
    console.error('Fatal kernel startup failure:', err);
    process.exit(1);
  });
}
