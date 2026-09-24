/**
 * HṚṢĪKEŚA — Voice Pipeline & Session Subsystem Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { VoicePipeline } from '../src/voice/pipeline/voice.pipeline.js';
import { VoiceSession } from '../src/voice/session/voice.session.js';
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
import { IModelProvider, ModelDefinition, ModelResponse } from '../src/models/interfaces/model.types.js';

class MockEchoProvider implements IModelProvider {
  public readonly id = 'mock-voice-echo';
  public readonly displayName = 'Mock Voice Echo Provider';
  public readonly isLocal = true;
  public async listModels(): Promise<ModelMetadata[]> {
    return [{
      id: 'voice-echo',
      displayName: 'Voice Echo Model',
      providerId: this.id,
      contextWindow: 4096,
      supportsStreaming: false,
      supportsToolCalling: false,
      priority: 1,
      isLocal: true
    }];
  }
  public async checkHealth() {
    return { status: 'healthy' as const, message: 'OK', latencyMs: 1 };
  }
  public async generate(): Promise<ModelResponse> {
    return {
      text: 'Echo response',
      modelId: 'voice-echo',
      providerId: this.id,
      durationMs: 10
    };
  }
  public async chat(request: { messages: { role: string; content: string }[] }): Promise<ModelResponse> {
    const lastUserMsg = request.messages.filter(m => m.role === 'user').pop()?.content || 'Acknowledged';
    return {
      text: `HṚṢĪKEŚA heard: ${lastUserMsg}`,
      modelId: 'voice-echo',
      providerId: this.id,
      durationMs: 10
    };
  }
}

test('Voice Pipeline Subsystem', async (t) => {
  const testDbPath = 'data/test_voice_pipeline.db';
  const testAudioDir = 'data/test_audio_pipeline';
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
  await registry.registerProvider(new MockEchoProvider());

  const identity = new IdentityManager();
  const conversation = new ConversationService(sessionManager, router, identity);

  const stt = new MockSpeechToTextProvider();
  stt.mockTextToReturn = 'Status report please';
  const tts = new MockTextToSpeechProvider(testAudioDir);
  const recorder = new MockAudioRecorder(testAudioDir);
  const player = new MockAudioPlayer();

  const pipeline = new VoicePipeline(stt, tts, recorder, player, conversation, { autoPlayTTS: true });

  await t.test('VoiceSession should record interaction metadata', () => {
    const session = new VoiceSession('session-v1');
    assert.equal(session.sessionId, 'session-v1');
    assert.equal(session.getState().interactionCount, 0);

    session.recordInteraction('User utterance', 'System response', 1200);
    const state = session.getState();
    assert.equal(state.interactionCount, 1);
    assert.equal(state.totalAudioDurationMs, 1200);
    assert.equal(state.lastTranscription, 'User utterance');
    assert.equal(state.lastResponse, 'System response');
  });

  await t.test('VoicePipeline should orchestrate full audio -> STT -> conversation -> TTS -> playback loop', async () => {
    await pipeline.initialize();

    const dummyAudio = path.join(testAudioDir, 'sample_mic.wav');
    fs.writeFileSync(dummyAudio, Buffer.from('RIFF_MOCK_AUDIO'));

    const result = await pipeline.processAudio(dummyAudio);

    assert.equal(result.success, true);
    assert.equal(result.transcription.text, 'Status report please');
    assert.equal(result.responseText, 'HṚṢĪKEŚA heard: Status report please');
    assert.ok(result.totalDurationMs >= 0);
    assert.ok(result.latencies.sttMs >= 0);
    assert.ok(result.latencies.conversationMs >= 0);
    assert.ok(result.latencies.ttsMs >= 0);

    // Verify audio player played synthesized speech
    assert.equal(player.playCount, 1);
    assert.equal(tts.synthesizeCallCount, 1);

    // Verify durable message persistence
    const messages = messageRepo.findBySessionId(result.sessionId);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].content, 'Status report please');
    assert.equal(messages[1].content, 'HṚṢĪKEŚA heard: Status report please');
  });

  await t.test('VoicePipeline should handle empty transcription gracefully', async () => {
    stt.mockTextToReturn = '   ';
    const dummyAudio = path.join(testAudioDir, 'empty_mic.wav');
    fs.writeFileSync(dummyAudio, Buffer.from('RIFF_EMPTY_AUDIO'));

    const result = await pipeline.processAudio(dummyAudio);
    assert.equal(result.success, false);
    assert.equal(result.responseText, 'No speech recognized.');
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
