/**
 * HṚṢĪKEŚA (हृषीकेश) — Advanced Multilingual Voice & Pronunciation Test Suite
 *
 * Verifies:
 * - HṚṢĪKEŚA canonical Sanskrit pronunciation without altering visual UI spelling
 * - Protected vocabulary normalization across Piper (phonetic respelling) and SAPI (SSML)
 * - Multilingual language detection for English, Hindi, Marathi, Sanskrit
 * - Code-switching detection
 * - VoiceProfile manager and speed adjustment
 * - Streaming text segmentation and boundary preservation
 * - Conversational barge-in / immediate interruption
 * - Actual audio file generation and latency measurement
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PronunciationRepository,
  PronunciationNormalizer,
  LanguageDetector,
  VoiceProfileManager,
  NaturalTextSegmenter,
  StreamingTtsEngine,
  VoiceInteractionCoordinator
} from '../src/voice/index.js';
import { WindowsSapiTTSProvider } from '../src/voice/tts/windows.sapi.tts.js';
import { WindowsAudioPlayer } from '../src/voice/audio/windows.audio.player.js';

describe('Voice & Pronunciation Engine Test Suite', () => {
  const repo = new PronunciationRepository();
  const normalizer = new PronunciationNormalizer(repo);
  const langDetector = new LanguageDetector();
  const profileManager = new VoiceProfileManager();

  // =========================================================================
  // 1. HṚṢĪKEŚA PRONUNCIATION — CRITICAL
  // =========================================================================
  describe('HṚṢĪKEŚA Brand Pronunciation & Visual Protection', () => {
    it('should maintain canonical display spelling HṚṢĪKEŚA in repository', () => {
      const entry = repo.get('HṚṢĪKEŚA');
      assert.ok(entry, 'HṚṢĪKEŚA entry must exist in lexicon');
      assert.equal(entry.canonical, 'HṚṢĪKEŚA');
      assert.equal(entry.priority, 'PROTECTED');
      assert.ok(entry.phoneticVariants.piperPhonetic, 'Piper phonetic variant must exist');
      assert.ok(entry.phoneticVariants.sapiPhoneme, 'SAPI phoneme variant must exist');
    });

    it('should normalize HṚṢĪKEŚA into continuous phonetic respelling for Piper', () => {
      const input = 'Hello HṚṢĪKEŚA, how are you today?';
      const normalized = normalizer.normalize(input, 'piper-phonetic');
      // Must not read out letters "H R S I K E S A", but continuous phonetic
      assert.ok(!normalized.includes('HṚṢĪKEŚA'), 'Raw diacritic token should be replaced for Piper');
      assert.ok(normalized.includes('Hrishikesha'), 'Should contain fluent phonetic respelling');
      assert.ok(normalized.startsWith('Hello Hrishikesha,'));
    });

    it('should normalize HṚṢĪKEŚA into SSML sub alias for SAPI', () => {
      const input = 'HṚṢĪKEŚA is online.';
      const normalized = normalizer.normalize(input, 'sapi-ssml');
      assert.ok(normalized.includes('<sub alias="Hrishikesha">HṚṢĪKEŚA</sub>'));
      // The visual text inside the tag remains the exact canonical spelling
      assert.ok(normalized.includes('HṚṢĪKEŚA'));
    });

    it('should resolve Devanagari alias हृषीकेश to the canonical entry', () => {
      const entry = repo.get('हृषीकेश');
      assert.ok(entry, 'Devanagari alias must resolve');
      assert.equal(entry.canonical, 'HṚṢĪKEŚA');
    });

    it('should not allow deletion of protected core brand entry HṚṢĪKEŚA', () => {
      assert.throws(() => {
        repo.delete('HṚṢĪKEŚA');
      }, /Cannot delete protected core lexicon entry/);
    });
  });

  // =========================================================================
  // 2. PROTECTED VOCABULARY & WORKFORCE AGENTS
  // =========================================================================
  describe('Protected Lexicon Verification', () => {
    const protectedTerms = [
      'SAHIKARA',
      'Gāṇḍīva',
      'KĀLA',
      'Mṛtyu',
      'Rāhu',
      'Ṛtvan',
      'Spooṭa',
      'Vighna'
    ];

    for (const term of protectedTerms) {
      it(`should contain protected entry for ${term}`, () => {
        const entry = repo.get(term);
        assert.ok(entry, `Entry for ${term} must exist in seed lexicon`);
        assert.equal(entry.priority, 'PROTECTED');
        const normalized = normalizer.normalize(`Agent ${term} is active`, 'piper-phonetic');
        assert.ok(!normalized.includes(term), `${term} should be phonetically resolved`);
      });
    }

    it('should support teaching custom pronunciations and persist them', async () => {
      const customWord = 'Kevala';
      const phonetic = 'Kay-vuh-luh';
      const taught = await normalizer.teach(customWord, phonetic, 'sa');
      assert.equal(taught.canonical, customWord);
      assert.equal(taught.category, 'USER_DEFINED');

      const normalized = normalizer.normalize('Welcome to Kevala project.', 'piper-phonetic');
      assert.ok(normalized.includes(phonetic));

      // Cleanup
      normalizer.removeEntry(customWord);
    });
  });

  // =========================================================================
  // 3. MULTILINGUAL & CODE-SWITCHING DETECTION
  // =========================================================================
  describe('Multilingual & Code-Switching Detection', () => {
    it('should detect pure English sentence', () => {
      const res = langDetector.detect('Hello HṚṢĪKEŚA, what is the status of the system?');
      assert.equal(res.code, 'en');
      assert.equal(res.isCodeSwitched, false);
      assert.equal(res.script, 'Latin');
    });

    it('should detect Hindi sentence with Devanagari script', () => {
      const res = langDetector.detect('हृषीकेश, नमस्ते। आप कैसे हैं?');
      assert.equal(res.code, 'hi');
      assert.equal(res.isIndic, true);
      assert.equal(res.script, 'Devanagari');
    });

    it('should detect Marathi sentence with Devanagari morphemes', () => {
      const res = langDetector.detect('हृषीकेश, आज आपण काय करू शकतो?');
      assert.equal(res.code, 'mr');
      assert.equal(res.isIndic, true);
    });

    it('should detect Indian code-switching (Marathi + English)', () => {
      const res = langDetector.detect('Rishi, आज आपण SAHIKARA project deploy करूया.');
      assert.equal(res.isCodeSwitched, true);
      assert.ok(res.primaryProportion < 1.0);
      assert.equal(res.secondaryLanguage, 'en');
    });

    it('should parse spoken language switch commands', () => {
      const cmd1 = langDetector.parseVoiceCommand('Speak in Marathi');
      assert.ok(cmd1);
      assert.equal(cmd1.type, 'SWITCH_LANGUAGE');
      assert.equal(cmd1.targetLanguage, 'mr');

      const cmd2 = langDetector.parseVoiceCommand('Switch to Hindi');
      assert.ok(cmd2);
      assert.equal(cmd2.type, 'SWITCH_LANGUAGE');
      assert.equal(cmd2.targetLanguage, 'hi');

      const cmd3 = langDetector.parseVoiceCommand('मराठीत बोला');
      assert.ok(cmd3);
      assert.equal(cmd3.type, 'SWITCH_LANGUAGE');
      assert.equal(cmd3.targetLanguage, 'mr');
    });

    it('should parse speech speed commands', () => {
      const cmdSlower = langDetector.parseVoiceCommand('Speak slower');
      assert.ok(cmdSlower);
      assert.equal(cmdSlower.type, 'SPEAK_SLOWER');

      const cmdFaster = langDetector.parseVoiceCommand('Speak faster');
      assert.ok(cmdFaster);
      assert.equal(cmdFaster.type, 'SPEAK_FASTER');
    });
  });

  // =========================================================================
  // 4. NATURAL CONVERSATIONAL SEGMENTATION
  // =========================================================================
  describe('Natural Text Segmentation for Streaming TTS', () => {
    it('should segment complete sentences immediately on sentence boundary', () => {
      const segmenter = new NaturalTextSegmenter();
      const segs1 = segmenter.push('Yes, I can do that. ');
      assert.equal(segs1.length, 1);
      assert.equal(segs1[0], 'Yes, I can do that.');

      const segs2 = segmenter.push('I will first check the system status.');
      const flushed = segmenter.flush();
      const allSecond = [...segs2, ...flushed];
      assert.equal(allSecond.length, 1);
      assert.equal(allSecond[0], 'I will first check the system status.');
    });

    it('should protect abbreviations and version numbers from premature cuts', () => {
      const segmenter = new NaturalTextSegmenter();
      const segs = segmenter.push('The software version is v0.2.0 and Dr. Sharma agrees. ');
      assert.equal(segs.length, 1);
      assert.equal(segs[0], 'The software version is v0.2.0 and Dr. Sharma agrees.');
    });

    it('should support Indic danda punctuation boundaries (। and ॥)', () => {
      const segmenter = new NaturalTextSegmenter();
      const segs = segmenter.push('हृषीकेश सज्ज आहे। पुढील आज्ञा काय आहे?॥ ');
      assert.equal(segs.length, 2);
      assert.equal(segs[0], 'हृषीकेश सज्ज आहे।');
      assert.equal(segs[1], 'पुढील आज्ञा काय आहे?॥');
    });
  });

  // =========================================================================
  // 5. VOICE PROFILES & PREFERENCES
  // =========================================================================
  describe('Voice Profile Manager', () => {
    it('should list built-in sovereign profiles', () => {
      const profiles = profileManager.listProfiles();
      assert.ok(profiles.length >= 4);
      assert.ok(profiles.some((p) => p.id === 'hrisekesa-sovereign-en'));
      assert.ok(profiles.some((p) => p.id === 'hrisekesa-sovereign-hi'));
      assert.ok(profiles.some((p) => p.id === 'hrisekesa-sovereign-mr'));
    });

    it('should resolve profile according to requested language', () => {
      const enProf = profileManager.getProfileForLanguage('en');
      assert.equal(enProf.language, 'en');

      const hiProf = profileManager.getProfileForLanguage('hi');
      assert.equal(hiProf.language, 'hi');

      const mrProf = profileManager.getProfileForLanguage('mr');
      assert.equal(mrProf.language, 'mr');
    });

    it('should adjust and persist speaking speed modifier', () => {
      profileManager.adjustSpeed(0.2);
      const prefs = profileManager.getPreferences();
      assert.ok(prefs.speakingRateModifier > 0);
      profileManager.resetSpeed();
      assert.equal(profileManager.getPreferences().speakingRateModifier, 0);
    });
  });

  // =========================================================================
  // 6. BARGE-IN & INTERRUPTION
  // =========================================================================
  describe('Barge-In / Interruption Engine', () => {
    it('should immediately abort streaming TTS on abort signal', async () => {
      const dummyTts = new WindowsSapiTTSProvider({ artifactDir: 'data/audio' });
      const dummyPlayer = new WindowsAudioPlayer();
      const streaming = new StreamingTtsEngine(dummyTts, dummyPlayer, normalizer);

      let abortedEmitted = false;
      streaming.on('aborted', () => {
        abortedEmitted = true;
      });

      await streaming.abort('User spoken interruption');
      assert.equal(abortedEmitted, true);
      assert.equal(streaming.getIsSpeaking(), false);
    });
  });

  // =========================================================================
  // 7. REAL AUDIO SYNTHESIS & ACOUSTIC LATENCY VERIFICATION
  // =========================================================================
  describe('Real Audio Synthesis & Latency Measurement', () => {
    it('should synthesize real audio for HṚṢĪKEŚA with measured latency', async () => {
      const sapi = new WindowsSapiTTSProvider({ artifactDir: 'data/audio' });
      await sapi.initialize();

      const testSentence = 'HṚṢĪKEŚA is ready to assist you.';
      const normalizedSsml = normalizer.normalize(testSentence, 'sapi-ssml');

      const start = Date.now();
      const result = await sapi.synthesize(normalizedSsml);
      const elapsedMs = Date.now() - start;

      assert.ok(result.audioFilePath, 'Audio file path must be returned');
      assert.ok(fs.existsSync(result.audioFilePath), 'Generated WAV file must exist on disk');

      const stats = fs.statSync(result.audioFilePath);
      assert.ok(stats.size > 10000, `Audio file size must be substantial (>10KB, got ${stats.size} bytes)`);

      console.log(`[Audio Verification] SAPI synthesized "${testSentence}" in ${elapsedMs}ms, size=${stats.size} bytes`);
    });
  });
});
