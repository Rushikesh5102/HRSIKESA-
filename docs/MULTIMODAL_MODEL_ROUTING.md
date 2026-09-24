# Multimodal Model Routing & Hardware Adaptation

## Overview

Phase 24 extends the Phase 18 `ModelRouter` to route tasks based on visual, auditory, and multimodal reasoning capabilities alongside hardware resource constraints.

---

## 1. Extended Capabilities

The `ModelCapability` enum includes:
- `vision`: Image and screenshot reasoning.
- `audio`: Speech audio and acoustic feature processing.
- `multimodal`: Combined image + text reasoning.
- `ocr_reasoning`: Structured OCR analysis and key-value extraction.
- `voice`: Real-time streaming voice synthesis and interaction.

---

## 2. Hardware Resource Governor Integration

Under host memory pressure on local laptop hardware (~16GB RAM, integrated Intel GPU):

| Pressure Level | Allowed Multimodal Operations | Image Max Dim | Concurrent Streams |
|----------------|-------------------------------|---------------|-------------------|
| `NORMAL` | Full VLM, OCR, STT, TTS | 1920x1080 | 4 |
| `LOW_MEMORY` | Quantized local models, UIA-first, OCR | 1024x768 | 1 |
| `CRITICAL_MEMORY` | Pause non-essential vision; prioritize core runtime | 640x480 | 1 (Sequential) |
