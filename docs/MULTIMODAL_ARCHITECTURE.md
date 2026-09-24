# Multimodal Architecture & Perception Layer

## Overview

The HṚṢĪKEŚA Multimodal Architecture unifies auditory, visual, textual, and desktop environmental perceptions into a cohesive, privacy-conscious reasoning fabric.

```
HEAR → UNDERSTAND → SEE → REASON → ACT → OBSERVE → SPEAK → VERIFY → REMEMBER
```

---

## 1. Unified Multimodal Input Types

The subsystem defines eight primary multimodal input contracts:

| Input Type | Description | Processing Strategy |
|------------|-------------|---------------------|
| `TEXT` | Sovereign chat & console instructions | Direct intent analysis |
| `AUDIO` | Raw microphone streaming audio | VAD $\rightarrow$ Streaming STT $\rightarrow$ Transcript |
| `IMAGE` | User-supplied images & diagrams | Local OCR $\rightarrow$ Multimodal model |
| `SCREENSHOT` | Full desktop / application capture | UIA Tree $\rightarrow$ OCR $\rightarrow$ Vision Engine |
| `CAMERA_FRAME` | Explicit opt-in webcam snapshots | Bounded 720p frame capture |
| `DOCUMENT_IMAGE` | Scanned receipts, reports, invoices | Local OCR $\rightarrow$ Table/Key extraction |
| `UI_TREE` | Accessibility tree observations | Deterministic UI element tree mapping |
| `VIDEO_FRAME` | Sampled event-driven video frames | Event-triggered bounded frame sampling |

---

## 2. Multimodal Context Assembler

The `MultimodalContextAssembler` aggregates multi-sensory inputs into a bounded, sanitized representation:

```typescript
export interface MultimodalContext {
  readonly sessionId: string;
  readonly utterance?: string;
  readonly transcript?: { text: string; confidence: number; language?: string };
  readonly audioMetadata?: { durationMs: number; vadTriggered?: boolean };
  readonly screenshot?: { pathOrData: string; dimensions: { width: number; height: number }; capturedAt: string };
  readonly uiTree?: { activeWindow?: string; activeApp?: string; treeSummary?: string };
  readonly taskBudget: MultimodalTaskBudget;
  readonly privacyTier: PrivacyTier;
  readonly confidence: number;
}
```

### Context Bounding Limits:
- **Max Images:** 5 frames per task.
- **Max Image Dimensions:** 1920x1080 (scaled down dynamically under memory pressure).
- **Max Transcript Characters:** 2,000 characters.
- **Max UI Tree Nodes:** 50 active nodes.

---

## 3. End-to-End Orchestration Workflow

1. **HEAR:** User speaks; `VadService` detects audio energy above threshold (RMS > 0.02). `StreamingVoiceCoordinator` emits partial transcripts.
2. **UNDERSTAND:** Final transcript committed; IntentClassifier extracts domain action or query.
3. **SEE:** `VisionEngine` captures screenshot and queries Windows UI Automation.
4. **REASON:** `UiaVisionRouter` resolves target using UIA-First hierarchy.
5. **ACT:** `ComputerOperator` executes physical GUI operation (click, keystroke, window focus).
6. **OBSERVE:** Vision engine captures post-action screenshot.
7. **VERIFY:** `compareObservations` checks expected changes (e.g. "Order Confirmed").
8. **SPEAK:** `StreamingVoiceCoordinator` synthesizes concise verbal confirmation with instant barge-in support.
9. **REMEMBER:** Durable facts saved to SQLite and Knowledge Graph.
