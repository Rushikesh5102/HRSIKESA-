/**
 * HṚṢĪKEŚA — Voice Security & Governance Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { VoicePipeline } from '../src/voice/pipeline/voice.pipeline.js';
import { MockSpeechToTextProvider } from '../src/voice/stt/mock.stt.js';
import { MockTextToSpeechProvider } from '../src/voice/tts/mock.tts.js';
import { MockAudioRecorder, MockAudioPlayer } from '../src/voice/audio/mock.audio.js';
import { SessionManager } from '../src/conversation/session.manager.js';
import { ConversationService } from '../src/conversation/conversation.service.js';
import { IdentityManager } from '../src/core/identity/identity.manager.js';
import { ModelRouter } from '../src/models/router/model.router.js';
import { ModelRegistry } from '../src/models/registry/model.registry.js';
import { EventBus } from '../src/core/events/event-bus.js';
import { HardwareDetector } from '../src/core/hardware/hardware.detector.js';
import { DatabaseManager } from '../src/persistence/database/database.manager.js';
import { MigrationManager } from '../src/persistence/migrations/migration.manager.js';
import { SessionRepository } from '../src/persistence/repositories/session.repository.js';
import { MessageRepository } from '../src/persistence/repositories/message.repository.js';
import { ToolRegistry } from '../src/tools/registry/tool.registry.js';
import { PermissionManager } from '../src/tools/permissions/permission.manager.js';
import { ToolAuditManager } from '../src/tools/audit/tool.audit.js';
import { ToolExecutionBus } from '../src/tools/execution/tool.bus.js';
import { FileWriteTool } from '../src/tools/builtin/filesystem.write.js';
import { IModelProvider, ModelDefinition, ModelResponse } from '../src/models/interfaces/model.types.js';

class MockToolProposingVoiceProvider implements IModelProvider {
  public readonly id = 'mock-voice-tool-proposer';
  public readonly displayName = 'Mock Voice Tool Proposer';
  public readonly isLocal = true;
  public shouldProposeTool = true;

  public async listModels(): Promise<ModelMetadata[]> {
    return [{
      id: 'voice-tool-model',
      displayName: 'Voice Tool Model',
      providerId: this.id,
      contextWindow: 4096,
      supportsStreaming: false,
      supportsToolCalling: true,
      priority: 1,
      isLocal: true
    }];
  }
  public async checkHealth() {
    return { status: 'healthy' as const, message: 'OK', latencyMs: 1 };
  }
  public async generate(): Promise<ModelResponse> {
    return this.chat();
  }
  public async chat(): Promise<ModelResponse> {
    if (this.shouldProposeTool) {
      this.shouldProposeTool = false; // Next iteration returns final response
      return {
        text: 'I will write the file.',
        modelId: 'voice-tool-model',
        providerId: this.id,
        durationMs: 10,
        toolCalls: [{
          id: 'call_voice_1',
          name: 'fs.write',
          arguments: {
            path: '../../unauthorized_outside.txt',
            content: 'malicious payload'
          }
        }]
      };
    }
    return {
      text: 'Operation resulted in security boundary check.',
      modelId: 'voice-tool-model',
      providerId: this.id,
      durationMs: 10
    };
  }
}

test('Voice Security Subsystem', async (t) => {
  const testDbPath = 'data/test_voice_security.db';
  const testAudioDir = 'data/test_audio_security';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (!fs.existsSync(testAudioDir)) fs.mkdirSync(testAudioDir, { recursive: true });

  const db = new DatabaseManager(testDbPath);
  db.open();
  new MigrationManager(db).runPending();
  const sessionRepo = new SessionRepository(db);
  const messageRepo = new MessageRepository(db);
  const sessionManager = new SessionManager(sessionRepo, messageRepo);

  const eventBus = new EventBus();
  const registry = new ModelRegistry(eventBus);
  const router = new ModelRouter(registry, eventBus, undefined, new HardwareDetector());
  const provider = new MockToolProposingVoiceProvider();
  await registry.registerProvider(provider);

  const toolRegistry = new ToolRegistry(eventBus);
  toolRegistry.register(new FileWriteTool());
  const permissionManager = new PermissionManager({ allowedWorkspaceRoots: [process.cwd()] }, eventBus);
  const toolAudit = new ToolAuditManager(db, eventBus);
  const toolBus = new ToolExecutionBus(toolRegistry, permissionManager, toolAudit, eventBus);

  const identity = new IdentityManager();
  const conversation = new ConversationService(sessionManager, router, identity, undefined, undefined, toolBus, toolRegistry);

  const stt = new MockSpeechToTextProvider();
  stt.mockTextToReturn = 'Delete everything outside workspace';
  const tts = new MockTextToSpeechProvider(testAudioDir);
  const recorder = new MockAudioRecorder(testAudioDir);
  const player = new MockAudioPlayer();

  const pipeline = new VoicePipeline(stt, tts, recorder, player, conversation, { autoPlayTTS: false });
  await pipeline.initialize();

  await t.test('CRITICAL SECURITY: Voice inputs must enforce tool permission boundaries and sandbox restrictions', async () => {
    const dummyAudio = path.join(testAudioDir, 'threat_voice.wav');
    fs.writeFileSync(dummyAudio, Buffer.from('RIFF_VOICE_PAYLOAD'));

    const result = await pipeline.processAudio(dummyAudio);

    assert.equal(result.success, true);
    // Tool execution must have been audited and denied
    const auditRecords = toolAudit.listRecords();
    const deniedRecord = auditRecords.find(r => r.toolId === 'fs.write');
    assert.ok(deniedRecord, 'Tool call proposed via voice must be recorded in audit log');
    assert.ok(deniedRecord.executionStatus === 'failed' || deniedRecord.executionStatus === 'denied');
  });

  await pipeline.shutdown();
  db.close();

  // Cleanup
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    const files = fs.readdirSync(testAudioDir);
    for (const f of files) fs.unlinkSync(path.join(testAudioDir, f));
    if (fs.existsSync(testAudioDir)) fs.rmdirSync(testAudioDir);
  } catch {}
});
