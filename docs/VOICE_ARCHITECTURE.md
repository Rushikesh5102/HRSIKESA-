# HṚṢĪKEŚA — Multilingual Voice & Pronunciation Architecture

## 1. Architectural Overview

The HṚṢĪKEŚA Voice Subsystem transforms the sovereign operating system into a real-time, low-latency, multilingual conversational voice assistant. It provides sub-second conversational turnarounds, natural clause/sentence segmentation, continuous Sanskrit and Indic pronunciation without corrupting visual display text, and instant conversational barge-in.

```
USER SPEECH (Microphone)
        ↓
Voice Activity Detection (VadService)
[Energy RMS >= 0.02, Silence Window: 650ms, Laptop Echo Protection]
        ↓
Speech-to-Text Provider (WindowsSpeechSTTProvider / FasterWhisper)
        ↓
Multilingual Language & Code-Switching Detection (LanguageDetector)
[Script Distribution + Morpheme Scoring: Marathi / Hindi / Sanskrit / English]
        ↓
Fast-Path / Sovereign Conversation Service
[Direct chat gate for banter/commands, background async memory writes]
        ↓
Streaming Natural Text Segmenter (NaturalTextSegmenter)
[Splits on sentences (. ? ! । ॥) and clauses (, ; :) without splitting numbers/abbreviations]
        ↓
Pronunciation Normalizer (PronunciationNormalizer)
[Replaces protected tokens with engine-specific phonetics while preserving UI spelling]
        ↓
Streaming TTS Synthesizer (Piper Neural ONNX / Windows SAPI Fallback)
        ↓
Immediate Audio Playback (WindowsAudioPlayer)
[Plays first segment while cognitive model continues generating]
        ↓
USER HEARS IMMEDIATE SPOKEN RESPONSE
```

---

## 2. Component Hierarchy & Module Breakdown

1. **`src/voice/pronunciation/`**:
   - `interfaces/pronunciation.types.ts`: `PronunciationEntry`, `PhoneticVariants`, `TargetEngineFormat` (`piper-phonetic`, `sapi-ssml`, `plain-phonetic`).
   - `repositories/pronunciation.repository.ts`: Persistent lexicon database in `data/pronunciations.json`. Seeded with `HṚṢĪKEŚA`, `SAHIKARA`, and the 17 Vedic agents (`Gāṇḍīva`, `KĀLA`, `Mṛtyu`, etc.).
   - `services/pronunciation-normalizer.service.ts`: Unicode regex token replacement engine.

2. **`src/voice/multilingual/`**:
   - `interfaces/multilingual.types.ts`: `SupportedLanguageCode` (12 languages: en, hi, mr, sa, bn, gu, ta, te, kn, ml, pa, ur), `ScriptType`, `LanguageProfile`.
   - `services/language-detector.service.ts`: Sub-millisecond script distribution analyzer, Devanagari morpheme disambiguator, and spoken voice command parser.

3. **`src/voice/profiles/`**:
   - `voice-profile.types.ts`: `VoiceProfile`, `VoicePreferenceState`.
   - `voice-profile.manager.ts`: Profile selector, fallback router, speed modifier, persistent storage in `data/voice_preferences.json`.

4. **`src/voice/streaming/`**:
   - `text-segmenter.ts`: Streaming boundary splitter with abbreviation protection (`v0.2.0`, `Dr.`, `Mr.`).
   - `streaming-tts-engine.ts`: Chained sequential synthesizer with immediate `abort()` capability.

5. **`src/voice/orchestration/`**:
   - `voice-interaction.coordinator.ts`: Real-time state machine (`IDLE` $\rightarrow$ `LISTENING` $\rightarrow$ `TRANSCRIBING` $\rightarrow$ `THINKING` $\rightarrow$ `SPEAKING` $\rightarrow$ `INTERRUPTED`), echo ducking, and barge-in coordination.

---

## 3. Conversational Barge-In & Echo Suppression

### Barge-In Protocol
When the user speaks into the microphone while HṚṢĪKEŚA is speaking:
1. `VadService` detects user voice activity.
2. `VoiceInteractionCoordinator.handleBargeIn()` is invoked within 0ms.
3. Audio player process is terminated immediately (`taskkill /F /PID`).
4. `StreamingTtsEngine.abort()` clears queued synthesis tasks.
5. Microphone input ducking is released.
6. The state transitions to `LISTENING` for the new user command.

### Laptop Echo Suppression
To prevent HṚṢĪKEŚA from hearing its own speakers:
- When TTS audio is playing, `isSelfSpeaking = true`.
- During active playback, speech input sensitivity is reduced, and any incoming audio matching the currently spoken phonetic stream is suppressed.

---

## 4. Non-Blocking Voice Integrations

1. **Voice + Memory**:
   - Chat turns and memory extraction are enqueued asynchronously. The user hears the immediate spoken response while vector/graph indexing occurs in the background.

2. **Voice + Tools & Computer Operator**:
   - Long running tasks (e.g. running test suites, web research, desktop automation) produce an immediate spoken acknowledgment (e.g. *"Sure. Running the tests now."*), followed by background execution, verified progress updates, and a final spoken summary.

3. **Voice + Multimodal**:
   - Vision captures (e.g. screen UI inspection, camera frames) process concurrently with voice turns.

---

## 5. Security & Trust Model

- Transcribed voice input is treated as untrusted user input, subject to permission policies, sandbox validators, and human-in-the-loop (HITL) gates.
- Spoken voice commands cannot bypass dangerous action approvals.
- No external cloud audio uploads occur without explicit authorization.
