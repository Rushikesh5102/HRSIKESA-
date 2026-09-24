# HṚṢĪKEŚA (हृषीकेश) — Self-Contained Sovereign Directory Architecture

This document confirms that **all codes, pulled dependencies, downloaded LLM weights, voice models, embeddings, runtimes, and tools are now consolidated directly inside the project root folder**:

`C:\Users\Rushi\Desktop\HṚṢĪKEŚA\`

The entire system is designed to operate autonomously from within this single folder.

---

## 1. Directory Layout & Bundled Assets

```
C:\Users\Rushi\Desktop\HṚṢĪKEŚA\
├── data\
│   ├── models\
│   │   ├── ollama\                      <-- All LLM model weights & blobs
│   │   │   ├── blobs\                   <-- Model weight shards (qwen2.5, llama3.2, deepseek-r1, nomic)
│   │   │   ├── manifests\               <-- Registry manifests
│   │   │   └── metadata\                <-- Model layer metadata
│   │   └── huggingface\                 <-- Local sentence-transformer embeddings
│   ├── audio\
│   │   ├── en-us-lessac-low.onnx        <-- Piper neural TTS voice model
│   │   ├── whisper\base.pt              <-- Whisper base STT model
│   │   ├── whisper-tiny\                <-- Whisper tiny STT model
│   │   ├── pronunciations.json          <-- Sanskrit & Vedic pronunciation lexicon
│   │   └── voice_preferences.json       <-- User voice profiles & speed settings
│   └── hrisekesa.db                     <-- SQLite sovereign database
├── tools\
│   ├── ollama\                          <-- Bundled Ollama runner & CUDA/CPU engines
│   │   ├── ollama.exe                   <-- Local Ollama binary (v0.34.2)
│   │   └── lib\ollama\                  <-- Dynamic runner libraries
│   ├── bin\                             <-- Standalone CLI tools
│   │   ├── piper.exe                    <-- Neural TTS synthesizer binary
│   │   ├── uv.exe                       <-- Fast Python package & venv runner
│   │   ├── uvx.exe                      <-- Tool execution binary
│   │   └── python3.11.exe               <-- Python executable wrapper
│   └── piper\                           <-- Self-contained Python neural TTS environment
├── src\                                 <-- Microkernel, workforce, voice & cognition source
├── ui\                                  <-- Sovereign React / Vite control center interface
├── tests\                               <-- Comprehensive verification suites
├── start.bat                            <-- One-click Windows batch launcher
├── start.ps1                            <-- One-click PowerShell launcher
├── stop.bat                             <-- Graceful service terminator
├── status.bat                           <-- Diagnostic health & model audit script
└── status.ps1                           <-- PowerShell diagnostics audit
```

---

## 2. Bundled Models Verified Inside the Folder

All pulled models have been moved/copied directly into `data\models\ollama\`:

| Model Name | Parameter Size | Disk Footprint | Primary Role |
| :--- | :--- | :--- | :--- |
| **qwen2.5:7b** | 7.61B | 4.7 GB | Sovereign reasoning, workforce planning & code execution |
| **llama3.2:3b** | 3.21B | 2.0 GB | Ultra-fast conversational response & voice fast-path |
| **deepseek-r1:1.5b** | 1.78B | 1.1 GB | High-speed logic verification & chain-of-thought analysis |
| **nomic-embed-text:latest** | 137M | 274 MB | Sovereign semantic memory & knowledge vector embeddings |

### Speech Models Inside `data\audio\`
- **Piper Neural TTS**: `en-us-lessac-low.onnx` (60.18 MB)
- **Faster-Whisper STT**: `whisper-tiny` & `whisper/base.pt` (138.53 MB)
- **Pronunciation Lexicon**: `pronunciations.json` (Protected tokens for HṚṢĪKEŚA, SAHIKARA, and 17 Vedic agents)

---

## 3. Autonomous Self-Healing Operation

The runtime does not require external setup or manual terminal commands:

1. **Auto-Detection**:
   The Microkernel (`src/runtime/kernel.ts`) automatically checks whether Ollama is active on `127.0.0.1:11434`.
2. **Auto-Boot**:
   If Ollama is not running, the kernel automatically spawns `tools\ollama\ollama.exe serve` with `OLLAMA_MODELS` pinned to `data\models\ollama`.
3. **Voice Engine Scoping**:
   - `PiperTTSProvider` automatically checks `tools\bin\piper.exe` and `data\audio\en-us-lessac-low.onnx`.
   - `FasterWhisperSTTProvider` automatically checks `tools\bin\uv.exe` and `data\audio\whisper-tiny`.
4. **Environment Scoping**:
   Windows User Environment Variable `OLLAMA_MODELS` has been configured to `C:\Users\Rushi\Desktop\HṚṢĪKEŚA\data\models\ollama`, ensuring any external command or shell naturally refers to the project-local models.

---

## 4. Operational Commands

From the project root:

- **Launch Everything**:
  ```cmd
  .\start.bat
  ```
- **Check Status & Models**:
  ```cmd
  .\status.bat
  ```
- **Stop All Background Services**:
  ```cmd
  .\stop.bat
  ```
