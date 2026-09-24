# HṚṢĪKEŚA — Voice & Speech Provider Evaluation

## 1. Local-First Provider Strategy

HṚṢĪKEŚA operates on a sovereign, local-first paradigm. Speech-to-Text (STT) and Text-to-Speech (TTS) must execute reliably on consumer hardware (16 GB RAM, Intel Core Ultra 5 125H, Intel Arc graphics) without cloud dependencies or telemetry leaks.

---

## 2. Speech-to-Text (STT) Evaluation

| Provider | Model Size | RAM Footprint | CPU Usage | Windows Compatibility | Indic Languages | Streaming | Maintenance / Licensing | Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Windows Speech SAPI / Desktop** | Native OS | ~0 MB (built-in) | <2% CPU | Native | English, Hindi (via OS pack) | Fast | Microsoft Native | **Primary Local STT**: Instant zero-latency initialization, no GPU requirements. |
| **faster-whisper (CTranslate2)** | 75MB (tiny) to 480MB (small) | ~250MB - 1GB | 15-35% CPU | Requires Python runtime | Excellent (99+ langs) | Chunked | MIT | **Secondary / Multilingual Fallback**: High accuracy for code-switching and accented Indic speech. |
| **whisper.cpp** | 75MB - 500MB | ~300MB | 10-25% CPU | C++ executable | Excellent | Chunked | MIT | Strong local alternative; requires pre-compiled binaries. |
| **AI4Bharat IndicASR** | ~600MB per lang | ~1.5GB RAM | High CPU | Linux preferred, PyTorch | Unmatched for Indian regional | Partial | MIT | Evaluated for dedicated regional deployments; heavy for casual laptop usage. |

---

## 3. Text-to-Speech (TTS) Evaluation

| Provider | Model Size | RAM Footprint | Latency | Pronunciation Control | Indic Coverage | Streaming | Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Piper Neural ONNX** | ~30MB - 60MB | ~80MB RAM | ~250ms - 450ms | Phonetic respelling via espeak-ng | English, Hindi | Sentence streaming | **Primary Neural Engine**: Extremely natural prosody, minimal RAM footprint, runs efficiently on Intel CPU. |
| **Windows SAPI (System.Speech)** | Native OS | ~0 MB | ~150ms - 350ms | Full SSML `<sub alias="...">` support | System-installed voices | Immediate | **Fast Sovereign Fallback**: Zero RAM overhead, perfect SSML phonetic override, highly reliable. |
| **espeak-ng standalone** | ~15MB | ~25MB | <50ms | Full IPA / phonemes | Wide Indic coverage | Immediate | Fast but robotic; ideal as phonetic parser for Piper. |
| **AI4Bharat Indic-TTS / VITS** | ~200MB per lang | ~1.2GB | ~800ms - 1500ms | Phonetic / Devanagari | Superior Hindi/Marathi/Tamil | Chunked | Evaluated for high-fidelity Indic voice production when GPU is available. |

---

## 4. Active Fallback Chains

1. **TTS Fallback Chain**:
   - `Piper Neural ONNX` (Primary) $\rightarrow$ `Windows SAPI` (Secondary) $\rightarrow$ `Mock Audio Synthesizer` (Verification/Headless).
   - If Piper weights or binary are unavailable, SAPI takes over transparently without dropping the conversation.

2. **STT Fallback Chain**:
   - `Windows Speech Engine` (Fast) $\rightarrow$ `Faster-Whisper Tiny/Base` (Multilingual) $\rightarrow$ `Text Input Fallback`.

---

## 5. Security & Privacy Guarantees

- **No Unauthorized Audio Uploads**: Audio streams are processed strictly in local process memory and written to `data/audio/` with permissions restricted to the current user.
- **Credential Protection**: Cloud providers (e.g. ElevenLabs, OpenAI Whisper API) remain strictly optional and can only be activated by explicit human configuration.
