# HṚṢĪKEŚA (हृषीकेश) — FP-17 Creation & Media Capability Audit

**Document:** `docs/FP-17_CREATION_MEDIA_AUDIT.md`  
**Phase:** FP-17 Universal Digital Creation & Media Studio  
**Date:** September 2026  
**Auditor:** Antigravity Autonomous Coding Engine  
**Baseline Verified:** FP-16 Frozen, 1,883 tests, 1,877 passing, 0 failing, 6 legitimate skips, Migration 030 current.

---

## 1. Executive Summary

FP-17 provides HṚṢĪKEŚA with a unified, local-first capability layer for creating, transforming, inspecting, and managing images, graphics, video, audio, music, voice, 3D assets, documents, presentations, UI/design assets, and production-ready packages.

In accordance with the **FIRST AUDIT** non-negotiable rule, this document systematically evaluates all 30 capability areas across the current codebase (`src/`, `tests/`, migrations 001–030) before implementing any new subsystem. We map existing infrastructure, determine exact reuse strategies, avoid any duplication of FP-07 through FP-16, and classify all 30 dimensions using:
`EXISTING` | `EXTEND` | `ADAPTER_REQUIRED` | `MISSING` | `DEFERRED` | `UNSAFE`

---

## 2. 30-Dimension Capability Audit Matrix

| # | Dimension | Classification | Existing Infrastructure & Location | Extension / Reuse Strategy |
|---|---|---|---|---|
| 1 | Image generation | EXTEND | `src/models/router/`, `src/capabilities/` | Route via ModelRouter (`CLOUD_VISION`, Gemini/OpenAI image adapters) and local CLI/Node canvas where present. Never fabricate generation; report `NOT_CONFIGURED` if no provider key/engine is bound. |
| 2 | Image editing | EXTEND | `src/ecosystem/discovery/service.discovery.engine.ts` (paint, CLI), `src/operator/` | Leverage Paint via FP-13 ApplicationOperator, or ImageMagick/sharp CLI via FP-15 ecosystem when discovered. Fallback to programmatic canvas/SVG transformations. |
| 3 | Image analysis | EXISTING | `src/multimodal/vision/vision.engine.ts`, `src/multimodal/vision/uia-vision.router.ts` | Direct reuse of Phase 24 Vision Engine (OCR, visual grounding, layout analysis, element bounding). |
| 4 | Vision | EXISTING | `src/multimodal/vision/`, `src/computer/operator/` | Direct reuse of Phase 24 Multimodal Vision & Phase 22 Screen Capture. |
| 5 | Video generation | ADAPTER_REQUIRED | None native | Route via ModelRouter or specialized video generation APIs. If not configured, report `NOT_CONFIGURED`. |
| 6 | Video editing | EXTEND | `src/ecosystem/` (FFmpeg CLI discovery) | FFmpeg discovered through `KnownAppCatalog`/PATH via FP-15. Script/storyboard DAG assembly via FP-11 Workflow Engine. |
| 7 | Video analysis | EXTEND | `src/multimodal/vision/vision.engine.ts` | Frame extraction via FFmpeg/canvas then inspect frames using Phase 24 VisionEngine. |
| 8 | Audio generation | EXTEND | `src/voice/tts/`, `src/multimodal/voice/` | Reuse Phase 24 / voice audio synthesis interfaces and sound-effects synthesis wrappers. |
| 9 | Music generation | ADAPTER_REQUIRED | None native | Music model/adapter interface (e.g. MusicLM, AudioCraft, REST). Return `NOT_CONFIGURED` when unconfigured. |
| 10 | Speech synthesis | EXISTING | `src/voice/tts/`, `src/voice/pipeline/voice.pipeline.js` | Direct reuse of advanced multilingual TTS pipeline and pronunciation normalizer. |
| 11 | Speech recognition | EXISTING | `src/voice/stt/`, `src/capabilities/adapters/faster.whisper.capability.ts` | Direct reuse of Whisper / native STT pipeline. |
| 12 | Voice cloning capabilities | UNSAFE / EXTEND | `src/voice/profiles/` | Voice profiles are supported for legitimate speaker customization, but **voice cloning without explicit sovereign authorization is strictly UNSAFE**. Must enforce sovereign human approval. |
| 13 | 3D generation | ADAPTER_REQUIRED | None native | Point-cloud/mesh generation provider adapters. Return `NOT_CONFIGURED` when unconfigured. |
| 14 | 3D editing | EXTEND | `src/operator/application.operator.ts` (Blender catalog entry), `src/ecosystem/` | Discovered Blender executable via `KnownAppCatalog.findInCatalog('blender')`. Control via Python background batch script (`blender -b -P script.py`) or UIA. |
| 15 | 3D rendering | EXTEND | Blender CLI / WebGL / three.js tooling | Execute Blender headless rendering (`blender -b file.blend -o //render -F PNG -x 1 -f 1`) or local renderer. |
| 16 | Document generation | EXTEND | `src/capabilities/adapters/filesystem.native.capability.ts`, Markdown/HTML/SVG compilers | Deterministic document generation (Markdown, HTML, text, reports, briefs). Structured generation for PDF/DOCX. |
| 17 | Presentation generation | EXTEND | Native JSON/HTML/SVG slide decks, PPTX structures | Slide deck structured generation (HTML presentation packages, reveal-compatible decks, SVG slides). |
| 18 | PDF handling | EXTEND | Playwright browser PDF print (`src/capabilities/adapters/playwright.browser.capability.ts`) | Utilize Playwright headless Chromium `page.pdf()` for 100% pixel-perfect deterministic PDF generation without heavy C++ binaries. |
| 19 | UI/design generation | EXTEND | `src/ide/`, `src/engineering/` | Full UI mockup and component generator (HTML/CSS/SVG/React) leveraging existing FP-09/10 workspace tools. |
| 20 | Browser screenshot/rendering | EXISTING | `src/capabilities/adapters/playwright.browser.capability.ts`, `src/computer/operator/` | Direct reuse of Playwright and desktop screenshot capabilities. |
| 21 | Existing media libraries | EXTEND | Node `node:fs`, `node:child_process`, `playwright-core` | Leverage built-in Node and installed ecosystem tools. No bloated native C++ addons. |
| 22 | Existing model adapters | EXISTING | `src/models/providers/` (OpenAI, Anthropic, Gemini, Ollama) | Direct reuse via `ModelRouter` and `ModelRegistry`. |
| 23 | Existing MCP servers | EXISTING | `src/mcp/` (MCPServerRegistry, MCPCapabilityAdapter) | Route media tool requests to registered MCP servers when available. |
| 24 | Existing external service adapters | EXISTING | `src/accounts/adapters/` (Google, Microsoft, GitHub, Generic REST) | Direct reuse of OAuth/API key credential handling and rate-limit tracking. |
| 25 | Existing desktop application operator | EXISTING | `src/operator/application.operator.ts` (FP-13) | Desktop UIA, window focusing, and input dispatch for GUI creative tools (Paint, Blender). |
| 26 | Existing software installation/discovery | EXISTING | `src/ecosystem/discovery/service.discovery.engine.ts`, `src/environment/discovery/known.apps.ts` | Discovers Blender, VS Code, Git, Chrome, Node on PATH or standard registry paths. |
| 27 | Existing workflow engine | EXISTING | `src/workflows/workflow.fabric.ts` (FP-11) | Direct reuse for compound DAG media packages (scripts → scenes → voiceover → composition → render). |
| 28 | Existing artifact system | EXTEND | `src/persistence/repositories/artifact.repository.ts` (Migration 004 `mission_artifacts`) | Extend schema via Migration 031 (`creation_jobs`, `creation_artifacts`, `creation_iterations`, `creation_provenance`) while linking to existing `mission_artifacts`. |
| 29 | Existing verification | EXTEND | `src/ecosystem/types/` (`ConsequentialVerificationPlan`), `src/goal/verification/` | Create deterministic media verifiers (dimension/format check for images, duration/sample-rate check for audio, syntax/integrity for documents). |
| 30 | Existing provenance/license tracking | EXTEND | `src/ecosystem/types/` (`ServiceDescriptor.provenance`), `src/capabilities/interfaces/capability.types.ts` | Track model license, source asset provenance, reference inspiration vs. reproduction boundaries, transformation history. |

---

## 3. Existing Subsystem Reuse Analysis (Do Not Duplicate)

1. **Model Routing:** Do NOT create a second model router. Call `src/models/router/model.router.ts`.
2. **Workflow Engine:** Do NOT create a second workflow engine. Call `src/workflows/workflow.fabric.ts` for media packages.
3. **Skill Engine:** Do NOT create a second skill engine. Use `src/skills/services/skill-execution-engine.service.ts`.
4. **Application Operator:** Do NOT create a second app operator. Call `src/operator/application.operator.ts`.
5. **Mission Runtime:** Do NOT create a second agent mission engine. Call `src/mission/mission.runtime.ts`.
6. **Account & Credential Fabric:** Do NOT create a second credentials store. Call `src/accounts/account.fabric.ts`.
7. **Capability Registry:** Do NOT create a second capability registry. Extend `src/capabilities/registry/capability.registry.ts` and `src/ecosystem/`.
8. **Memory & Knowledge Graph:** Do NOT create a second graph. Link to `src/knowledge/services/knowledge-graph.service.ts` for design systems and brand assets.
9. **Cognitive Context & Working Memory:** Direct integration with INT-007 (`CognitiveContextEngine`) and INT-008 (`WorkingMemoryEngine`).
10. **Hardware Resource Governor:** Direct integration with `src/core/hardware/resource.governor.ts` to respect the 16GB RAM constraint.
11. **Demonstration Learning (FP-16):** Learned creative procedures can invoke creation capabilities seamlessly via compiler step execution.

---

## 4. Hardware Constraints & Local-First Strategy

- **Host Machine:** ~16GB RAM, Intel Core Ultra 5 125H, Intel Arc integrated GPU, Windows 11.
- **Rules:**
  - Never load high-resolution video streams into Node memory buffers uncompressed.
  - Concurrency bounded via `ResourceGovernor`: during `LOW_MEMORY` or `CRITICAL_MEMORY`, creative generation jobs queue or reject gracefully.
  - When Blender, FFmpeg, ImageMagick are missing from the host, report `NOT_CONFIGURED` or `NOT_AVAILABLE`. Never fabricate execution or hallucinate output.
  - Output files are streamed to disk in `.hrisekesa/creation_artifacts/` or designated workspace directories.

---

## 5. Audit Conclusion & Next Implementation Steps

The repository provides world-class foundational plumbing (FP-07 through FP-16). FP-17 will sit directly on top of these fabrics as **Universal Creation & Media Studio (`src/creation/`)**:
1. Domain Types (`src/creation/interfaces/creation.types.ts`)
2. Database Schema Migration 031 (`src/persistence/migrations/031_creation_media_schema.ts`)
3. Media Capability Service (`src/creation/services/media-capability.service.ts`)
4. Creation Repository & Verification Engine (`src/creation/repositories/`, `src/creation/services/`)
5. Specialized Pipelines (Image, Video, Audio/Voice, 3D, Document/Presentation, Design System)
6. Creation Fabric Orchestrator (`src/creation/creation.fabric.ts`)
7. HTTP Routes, CLI Commands (`hres create ...`), and EventBus SSE Streams.
