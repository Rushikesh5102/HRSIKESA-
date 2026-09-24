/**
 * HṚṢĪKEŚA — Voice TTS Subsystem Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { MockTextToSpeechProvider } from '../src/voice/tts/mock.tts.js';
import { PiperTTSProvider } from '../src/voice/tts/piper.tts.js';
import { WindowsSapiTTSProvider } from '../src/voice/tts/windows.sapi.tts.js';

test('Voice TTS Subsystem', async (t) => {
  const testAudioDir = path.resolve('data/audio_test_tts');
  if (!fs.existsSync(testAudioDir)) {
    fs.mkdirSync(testAudioDir, { recursive: true });
  }

  await t.test('MockTextToSpeechProvider should initialize and synthesize mock speech', async () => {
    const provider = new MockTextToSpeechProvider(testAudioDir);
    assert.equal(provider.initialized, false);

    await provider.initialize();
    assert.equal(provider.initialized, true);

    const result = await provider.synthesize('HṚṢĪKEŚA online.');
    assert.ok(fs.existsSync(result.audioFilePath));
    assert.equal(result.characterCount, 'HṚṢĪKEŚA online.'.length);
    assert.equal(provider.synthesizeCallCount, 1);

    await provider.speak('Testing voice playback.');
    assert.equal(provider.speakCallCount, 1);
    assert.equal(provider.lastSpokenText, 'Testing voice playback.');

    await provider.shutdown();
    assert.equal(provider.initialized, false);
  });

  await t.test('WindowsSapiTTSProvider should reject empty text synthesis', async () => {
    const provider = new WindowsSapiTTSProvider({ artifactDir: testAudioDir });
    await provider.initialize();

    await assert.rejects(
      async () => provider.synthesize('   '),
      /Text to synthesize cannot be empty/
    );

    await provider.shutdown();
  });

  await t.test('PiperTTSProvider should identify correctly and initialize fallback when binary is missing', async () => {
    const provider = new PiperTTSProvider({
      piperPath: 'non_existent_piper_binary.exe',
      artifactDir: testAudioDir
    });

    assert.equal(provider.id, 'piper');
    assert.equal(provider.name, 'Piper Neural TTS Engine');

    await provider.initialize();
    await provider.shutdown();
  });

  // Cleanup
  try {
    const files = fs.readdirSync(testAudioDir);
    for (const f of files) {
      fs.unlinkSync(path.join(testAudioDir, f));
    }
    if (fs.existsSync(testAudioDir)) fs.rmdirSync(testAudioDir);
  } catch {}
});
