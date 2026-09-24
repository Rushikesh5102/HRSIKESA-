# Voice Privacy & Audio Stream Retention

## Overview

The Voice Privacy policy ensures that microphone streams are recorded and processed only during explicit active voice interaction or bounded user-authorized monitoring tasks.

---

## 1. Zero Continuous Surveillance

The microphone is never in an always-on continuous recording state by default. The `StreamingVoiceCoordinator` operates in clearly defined states:
- `NOT_RECORDING` / `IDLE`: Microphone hardware is inactive.
- `LISTENING`: User explicitly activated voice mode; VAD actively filters background silence.
- `TRANSCRIBING`: Speech energy detected; frames ingested into STT.
- `PLAYING`: System is speaking; microphone listens solely for barge-in interruptions.

---

## 2. Ephemeral Audio File Lifecycle

When PCM or WAV buffers are written to disk for transcription or synthesis:
1. Created in temporary session cache.
2. Ingested and processed by STT/TTS engine.
3. Automatically unlinked/deleted from disk upon completion.

Raw audio waveforms are never permanently stored in databases or sent to telemetry sinks.
