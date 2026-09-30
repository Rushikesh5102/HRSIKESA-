/**
 * HṚṢĪKEŚA — Multilingual Voice & AI4Bharat Indic Parler Integration Test
 */

import { LanguageDetector } from '../src/voice/multilingual/services/language-detector.service.js';
import { ResponseLanguageResolver } from '../src/voice/multilingual/services/response-language.resolver.js';
import { UserSpeakingStateInferrer } from '../src/voice/affect/user-speaking-state.inferrer.js';
import { ResponseDeliveryResolver } from '../src/voice/affect/response-delivery.resolver.js';
import { TtsCaptionBuilder } from '../src/voice/affect/tts-caption.builder.js';
import { IndicParlerTTSProvider } from '../src/voice/tts/indic-parler.tts.js';
import { VoiceProfileManager } from '../src/voice/profiles/voice-profile.manager.js';

async function runTests() {
  console.log('================================================================');
  console.log('HṚṢĪKEŚA 2.0 — MULTILINGUAL VOICE & INDIC PARLER-TTS AUDIT TEST');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${desc}`);
    }
  }

  // 1. Language Detector Test
  console.log('--- TEST 1: Language & Script Detection ---');
  const detector = new LanguageDetector();

  const hindiDet = detector.detectDetailed('नमस्ते ऋषिकेश, आज का मौसम कैसा है?');
  assert(hindiDet.code === 'hi', `Detected Devanagari Hindi (got: ${hindiDet.code})`);
  assert(hindiDet.script === 'Devanagari', `Identified Devanagari script (got: ${hindiDet.script})`);

  const marathiDet = detector.detectDetailed('नमस्कार, मला आजच्या अहवालाची माहिती हवी आहे.');
  assert(marathiDet.code === 'mr', `Detected Marathi with unique vocabulary (got: ${marathiDet.code})`);

  const sanskritDet = detector.detectDetailed('ॐ नमो भगवते वासुदेवाय। सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः।');
  assert(sanskritDet.code === 'sa', `Detected Sanskrit with Vedic markers (got: ${sanskritDet.code})`);

  const hinglishDet = detector.detectDetailed('HṚṢĪKEŚA, please yeh data analyze karo aur summary batao.');
  assert(hinglishDet.isCodeSwitched === true, `Detected code-switched Hinglish utterance`);

  const englishDet = detector.detectDetailed('Launch the fleet coordination mission immediately.');
  assert(englishDet.code === 'en', `Detected standard English (got: ${englishDet.code})`);

  // 2. Response Language Resolver Test
  console.log('\n--- TEST 2: Response Language Policy & Code-Switching ---');
  const langResolver = new ResponseLanguageResolver();

  const explicitMarathi = langResolver.resolve(englishDet, 'Explain the architecture in Marathi please.');
  assert(explicitMarathi.language === 'mr', `Explicit request 'in Marathi' resolved to Marathi (got: ${explicitMarathi.language})`);

  const followHindi = langResolver.resolve(hindiDet, 'नमस्ते, क्या सब तैयार है?');
  assert(followHindi.language === 'hi', `FOLLOW_USER matched Hindi query (got: ${followHindi.language})`);

  // 3. Affect & Speaking State Inferrer Test
  console.log('\n--- TEST 3: User Speaking State Inference ---');
  const stateInferrer = new UserSpeakingStateInferrer();

  const urgentState = stateInferrer.infer('Emergency! The deployment failed, fix this immediately now!');
  assert(urgentState.affect === 'urgent', `Urgent exclamation detected (got: ${urgentState.affect})`);
  assert(urgentState.urgency >= 0.5, `Elevated urgency score: ${urgentState.urgency}`);

  const frustratedState = stateInferrer.infer('Why does this keep breaking? It is not working at all!');
  assert(frustratedState.affect === 'frustrated', `Frustration identified (got: ${frustratedState.affect})`);

  const calmState = stateInferrer.infer('Good morning. Whenever you have time, let us review the logs.');
  assert(calmState.affect === 'calm' || calmState.affect === 'neutral', `Calm / neutral state inferred (got: ${calmState.affect})`);

  // 4. Acoustic Caption Builder & Delivery Resolver Test
  console.log('\n--- TEST 4: Dynamic Acoustic Caption & Delivery Resolution ---');
  const caption = TtsCaptionBuilder.build({
    speakerName: 'Jon',
    language: 'en',
    emotion: 'warm',
    intensity: 0.4,
    rate: 1.0,
    pitch: 'normal',
    expressiveness: 'normal',
    reverberation: 'dry',
    quality: 'clean',
  });
  console.log(`  Dynamic Caption: "${caption}"`);
  assert(caption.includes('Jon') && caption.includes('warm'), `Dynamic caption accurately incorporates speaker and emotion`);

  const deliveryResolver = new ResponseDeliveryResolver();
  const delivery = deliveryResolver.resolve(
    urgentState,
    'System status normal. All 33 agents operational.',
    'en',
    'Jon'
  );
  assert(delivery.rate >= 1.05, `Urgent user state automatically accelerated TTS rate: ${delivery.rate}`);
  assert(delivery.caption.length > 0, `Generated acoustic prompt caption: "${delivery.caption}"`);

  // 5. Indic Parler-TTS Provider Initialization & Status Test
  console.log('\n--- TEST 5: Indic Parler-TTS Engine & Fallback Chain ---');
  const indicProvider = new IndicParlerTTSProvider({
    piperPath: 'bin/piper.exe',
    pythonPath: '.venv_indic_tts/Scripts/python.exe',
  });

  const status = await indicProvider.getStatus();
  console.log(`  Engine Status:`, JSON.stringify(status, null, 2));
  assert(status.primaryModel === 'ai4bharat/indic-parler-tts', `Primary Model is ai4bharat/indic-parler-tts`);
  assert(status.fallbackActive === true || status.isLoaded === true, `Fallback or native model is active`);
  assert(status.isGated === true, `Model gating detected accurately without false positive crash`);

  // 6. Voice Profile Manager Test
  console.log('\n--- TEST 6: Voice Profile Manager Personas ---');
  const profileManager = new VoiceProfileManager();
  const profiles = profileManager.listProfiles();
  const naturalProfile = profiles.find((p) => p.id === 'hrisekesa-natural');
  assert(Boolean(naturalProfile), `Default canonical natural Indian profile 'hrisekesa-natural' exists`);
  assert(naturalProfile?.gender === 'MALE', `Natural profile is male voice persona`);

  console.log(`\n================================================================`);
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`================================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
