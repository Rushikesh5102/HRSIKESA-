# Open-Source Voice, Vision & Multimodal Inventory

## Technology Evaluation & Decision Matrix

| Technology | Domain | License | RAM / HW Reqs | Capabilities | Maintenance | Privacy | Decision | Rationale |
|------------|--------|---------|---------------|--------------|-------------|---------|----------|-----------|
| **faster-whisper** | Voice / STT | MIT | ~1-2GB RAM (CPU/int8) | High-accuracy multilingual STT | Active | 100% Local | **ADOPTED** | Highly efficient quantized whisper on CPU. |
| **whisper.cpp** | Voice / STT | MIT | ~500MB RAM (C/C++ AVX) | Extremely low latency transcription | Active | 100% Local | **ADAPTED** | Embedded lightweight fallback. |
| **Vosk** | Voice / STT | Apache 2.0 | ~300MB RAM | Streaming offline speech recognition | Active | 100% Local | **ADAPTED** | Good lightweight real-time stream parser. |
| **sherpa-onnx** | Voice / STT / TTS | Apache 2.0 | ~400MB RAM | Embedded ONNX voice runtime | Active | 100% Local | **DEFERRED** | Optional lightweight ONNX engine. |
| **Windows SAPI / WinRT** | Voice / TTS / STT | Built-in | 0MB Extra | Native zero-dependency Windows speech | Native | 100% Local | **ADOPTED** | Zero-dependency baseline for Windows desktop. |
| **Piper TTS** | Voice / TTS | MIT | ~150MB RAM | Fast, natural-sounding local neural TTS | Active | 100% Local | **ADOPTED** | Highest quality-to-performance local neural TTS. |
| **Windows UI Automation** | Vision / Desktop | Native | 0MB Extra | Semantic UI element hierarchy | Native | 100% Local | **ADOPTED** | Primary UIA-First perception stage. |
| **Tesseract OCR / ONNX OCR** | Vision / OCR | Apache 2.0 | ~100MB RAM | Bounding box text extraction | Active | 100% Local | **ADOPTED** | Reliable local text recognition without GPU. |
| **PaddleOCR** | Vision / OCR | Apache 2.0 | ~500MB RAM | Robust table and text OCR | Active | 100% Local | **DEFERRED** | Excellent for complex document scanning. |
| **Qwen2-VL / MiniCPM-V (Ollama)** | Multimodal / VLM | Apache 2.0 | ~4-6GB RAM (Q4_K_M) | Visual reasoning, diagrams, UI analysis | Active | 100% Local | **ADOPTED** | Best quantized local VLM running via Ollama. |
| **OpenCV** | Vision | Apache 2.0 | ~200MB RAM | Image manipulation, resizing, diffs | Active | 100% Local | **ADAPTED** | Fast bounded image processing & region crop. |
