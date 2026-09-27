# HṚṢĪKEŚA — FP-01 Inference Backends, Hardware Acceleration & Model Strategy

## 1. Hardware Detection & Verification

HṚṢĪKEŚA Foundation Performance block **FP-01** introduces a hardware-agnostic inference engine that automatically probes the underlying host architecture at boot time without heavy external dependencies.

### Detected Environment Snapshot
- **Host Processor**: Intel(R) Core(TM) Ultra 5 125H (Meteor Lake architecture)
  - Physical Cores: 14 (4 Performance + 8 Efficient + 2 Low-Power Efficient)
  - Logical Threads: 18
  - Instruction Extensions Verified: `AVX`, `AVX2`, `FMA`, `F16C`, `BMI1`, `BMI2`, `AVX_VNNI`, `AES`, `SHA`
- **Host GPU**: Intel(R) Arc(TM) Graphics (GT2, 128 Execution Units / 1024 ALUs)
  - Driver Version: `32.0.101.6127`
  - Dedicated VRAM: 2,048 MiB
  - Dynamic Unified Shared System VRAM: 9,168 MiB (9.16 GB)
- **Host Memory**: 15.7 GB RAM (DDR5/LPDDR5 unified system memory)
- **Operating System**: Microsoft Windows 11 Enterprise (x64)

### API & Runtime Availability
| Backend / API | Status | Verification Detail |
|---|---|---|
| **Vulkan 1.3** | `AVAILABLE` | `vulkan-1.dll` present in System32; Vulkan 1.3.295 driver verified; `Vulkan0: Intel(R) Arc(TM) Graphics (9168 MiB)` confirmed by `llama.cpp`. |
| **llama.cpp CPU** | `AVAILABLE` | Native multi-threaded AVX2 instruction execution verified via standalone `tools/llama-vulkan/llama-cli.exe`. |
| **llama.cpp Vulkan (Intel Arc)** | `AVAILABLE` | Successfully offloaded model tensors with `-ngl 99`, generating at **11.3 tokens/sec** and evaluating prompts at **21.7 tokens/sec**. |
| **Level Zero** | `DETECTED` | `ze_loader.dll` present in System32. |
| **Intel oneAPI SYCL** | `NOT_AVAILABLE` | Recorded as `NOT_AVAILABLE`: Intel oneAPI Base Toolkit runtime (`sycl7.dll`) is not installed on the host OS. |
| **Ollama Local Engine** | `AVAILABLE` | Local daemon active on `localhost:11434` managing GGUF model blobs. |
| **LAN Worker** | `NOT_AVAILABLE` | No remote peer configured (offline sovereign mode). |
| **Remote Worker** | `NOT_AVAILABLE` | Standby bridge inactive. |
| **Cloud GPU** | `DISABLED` | Offline-first sovereignty policy prevents paid cloud GPU dependencies. |

---

## 2. Multi-Backend Architecture

```
                  ┌───────────────────────────────────────────────┐
                  │           Conversation / Agent Layer          │
                  └──────────────────────┬────────────────────────┘
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │              InferenceScheduler               │
                  └─────────┬────────────┬─────────────┬──────────┘
                            │            │             │
              ┌─────────────┘            │             └─────────────┐
              ▼                          ▼                           ▼
      ┌───────────────┐          ┌───────────────┐           ┌───────────────┐
      │   T0 Fast     │          │  T1 / T2 / T3 │           │     Ollama    │
      │   Gate (<5ms) │          │  llama.cpp    │           │    Fallback   │
      │ (Zero-Model)  │          │  Vulkan (GPU) │           │ (Local CPU)   │
      └───────────────┘          └───────┬───────┘           └───────────────┘
                                         │
                                         ▼
                                 Intel Arc Graphics
                              (9,168 MiB Shared VRAM)
```

The inference subsystem consists of four core modular classes located in `src/inference/`:
1. `InferenceBackendDetector`: Queries OS hardware and driver APIs to determine supported acceleration backends.
2. `LlamaCppBackend`: Executes models directly using `tools/llama-vulkan/` with Vulkan GPU offload (`-ngl 99`), streaming output, and real-time cancellation tokens.
3. `OllamaBackend`: Interfaces with the local Ollama HTTP engine as a secondary fallback.
4. `InferenceRegistry`: Tracks backend availability, residency records, active requests, and memory usage.
5. `InferenceScheduler`: The central orchestrator resolving compute tiers and dispatching requests to the optimal available backend.

---

## 3. Explicit Model Compute Tiers

To ensure simple conversation remains fast while heavy reasoning has sufficient compute:

| Tier | Role | Default Model | Typical TTFT | Purpose |
|---|---|---|---|---|
| **T0** | Deterministic Fast Path | *Zero-Model* (`fast-gate-instant`) | **1–15 ms** | Greetings, courtesy, system identity, time, date, basic arithmetic, STOP interrupts. |
| **T1** | Fast / Tiny Local Model | `deepseek-r1:1.5b` (or fast gate) | **0.8–1.5 s** | Quick summarization, sentiment, lightweight categorization. |
| **T2** | Normal Interactive Chat | `llama3.2:3b` | **1.2–2.0 s** | Standard back-and-forth conversational dialog, simple code explanations. |
| **T3** | Complex Local Reasoning | `qwen2.5:7b` | **3.0–5.0 s** | In-depth logic, mathematical proofs, multi-file code generation. |
| **T4** | Heavy Research & Agentic | `qwen2.5:7b` + Agent Loop | Streaming | Autonomous multi-step missions, deep research, company operations. |

---

## 4. Intelligent Model Residency & Memory Management

HṚṢĪKEŚA maintains intelligent model residency without causing uncontrolled memory pressure:

- **Preferred Resident Model**: The interactive conversational model (`llama3.2:3b`) remains preferred resident in GPU/host memory so normal chat is instantly available without load delays.
- **On-Demand Loading**: Heavy reasoning models (`qwen2.5:7b`) are loaded strictly on demand when complex tasks or agent missions are dispatched.
- **ResourceGovernor Integration**: When free system RAM drops below thresholds (`LOW_MEMORY` < 2 GB, `CRITICAL_MEMORY` < 1 GB):
  - Eviction candidate models are identified (excluding the preferred interactive resident model).
  - Heavy requests are queued.
  - Background memory compaction is triggered.
