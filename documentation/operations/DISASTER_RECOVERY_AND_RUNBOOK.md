# HṚṢĪKEŚA (हृषीकेश) — Disaster Recovery & Operational Runbook
**Document Version:** 3.0.0  
**Classification:** Operational Runbook & Incident Response  
**Enforcement Authority:** Kalki (Disaster Recovery) & Yama (State Restorer)

---

## 1. System Boot & Initialization Runbook

HṚṢĪKEŚA is designed for one-click sovereign operation from `C:\Users\Rushi\Desktop\HṚṢĪKEŚA\`.

### 1.1 Standard Startup (`start.bat` / `start.ps1`)
1. **Environment Setup**: Pinned `OLLAMA_MODELS` to `data\models\ollama`.
2. **Inference Check**: Probes `http://127.0.0.1:11434/api/version`. If unresponsive, spawns bundled `tools\ollama\ollama.exe serve` in background.
3. **Database Migration**: Verifies `data/hrisekesa.db`, applies pending migrations, and validates foreign key integrity.
4. **Agent Workforce Initialization**: Registers all 17 Vedic agents, applies Danger Tier 1 ceilings, and checks heartbeat.
5. **Voice Subsystem Boot**: Initializes Piper neural TTS (`tools/bin/piper.exe` + `data/audio/en-us-lessac-low.onnx`) or verifies Windows SAPI fallback.
6. **HTTP Gateway**: Opens REST API on port `4200`.
7. **Control Center UI**: Vite dev server available on port `5173`.

---

## 2. Health Auditing & Diagnostics Runbook

To inspect the system state at any time, execute:

```cmd
.\status.bat
```

### 2.1 Healthy Baseline Checklist
- [x] **Local Models**: `deepseek-r1:1.5b`, `llama3.2:3b`, `nomic-embed-text:latest`, `qwen2.5:7b` listed.
- [x] **Neural Voice**: `en-us-lessac-low.onnx` and `whisper/base.pt` present in `data/audio/`.
- [x] **Pronunciations**: `data/pronunciations.json` present and populated.
- [x] **Bundled Tools**: `ollama.exe`, `piper.exe`, `uv.exe`, `python3.11.exe` detected in `tools/`.
- [x] **Ports**: Port `4200` (API), `5173` (UI), `11434` (Ollama) active and listening.

---

## 3. Disaster Recovery & Failure Modes

### 3.1 Failure Mode 1: Abrupt Process Termination / Blue Screen
- **Symptom**: Machine reboots while a goal or mission was executing.
- **Automated Recovery (Yama)**:
  1. On next boot, `ObjectiveRecoveryManager` runs during kernel startup.
  2. Scans `missions` and `tasks` for states `IN_PROGRESS` or `EXECUTING`.
  3. Replays WAL journal from SQLite; restores mission DAGs to uncorrupted state.
  4. Automatically resumes pending tasks or flags for operator confirmation.

### 3.2 Failure Mode 2: Port Collision (4200 / 11434 / 5173 occupied)
- **Symptom**: Server reports `EADDRINUSE`.
- **Resolution Procedure**:
  ```cmd
  .\stop.bat
  ```
  `stop.bat` executes targeted process termination for orphaned `node.exe`, `tsx.exe`, and `ollama.exe` tasks.

### 3.3 Failure Mode 3: Memory Exhaustion (Resource Pressure CRITICAL)
- **Symptom**: ResourceGovernor issues `CRITICAL_MEMORY` alert (< 1GB available).
- **Automated Protection**:
  1. KĀLA immediately suspends low-priority background crawler and semantic indexing tasks.
  2. The local model inference queue rejects secondary requests until active inference completes.
  3. Memory garbage collection is requested via Node.js V8 runtime.

---

## 4. Operational Shutdown Runbook

To cleanly suspend the entire sovereign operating system:

```cmd
.\stop.bat
```

This halts active agent queues, checkpoints SQLite databases, flushes memory buffers, and terminates runner processes gracefully.
