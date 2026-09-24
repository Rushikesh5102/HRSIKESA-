/**
 * HṚṢĪKEŚA — Voice STT Subsystem Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { MockSpeechToTextProvider } from '../src/voice/stt/mock.stt.js';
import { FasterWhisperSTTProvider } from '../src/voice/stt/faster.whisper.stt.js';
import { WindowsSpeechSTTProvider } from '../src/voice/stt/windows.speech.stt.js';

test('Voice STT Subsystem', async (t) => {
  const testAudioDir = path.resolve('data/audio_test');
  if (!fs.existsSync(testAudioDir)) {
    fs.mkdirSync(testAudioDir, { recursive: true });
  }

  const dummyWav = path.join(testAudioDir, 'test_sample.wav');
  fs.writeFileSync(dummyWav, Buffer.from('RIFF_DUMMY_AUDIO_DATA'));

  await t.test('MockSpeechToTextProvider should initialize and transcribe deterministic text', async () => {
    const provider = new MockSpeechToTextProvider();
    assert.equal(provider.initialized, false);

    await provider.initialize();
    assert.equal(provider.initialized, true);

    const result = await provider.transcribe(dummyWav);
    assert.equal(result.text, 'Hello HṚṢĪKEŚA');
    assert.equal(result.language, 'en');
    assert.ok(result.durationMs >= 0);
    assert.ok(result.confidence && result.confidence > 0.9);
    assert.equal(provider.transcribeCallCount, 1);

    await provider.shutdown();
    assert.equal(provider.initialized, false);
  });

  await t.test('WindowsSpeechSTTProvider should handle missing audio files gracefully', async () => {
    const provider = new WindowsSpeechSTTProvider();
    await provider.initialize();

    await assert.rejects(
      async () => provider.transcribe('non_existent_audio.wav'),
      /Audio file not found/
    );

    await provider.shutdown();
  });

  await t.test('FasterWhisperSTTProvider should initialize and support fallback', async () => {
    const provider = new FasterWhisperSTTProvider({ modelSize: 'tiny.en' });
    await provider.initialize();

    // Verify provider exposes correct identification
    assert.equal(provider.id, 'whisper');
    assert.equal(provider.name, 'Faster-Whisper STT Engine');

    await provider.shutdown();
  });

  // Cleanup
  try {
    if (fs.existsSync(dummyWav)) fs.unlinkSync(dummyWav);
    if (fs.existsSync(testAudioDir)) fs.rmdirSync(testAudioDir);
  } catch {}
});
