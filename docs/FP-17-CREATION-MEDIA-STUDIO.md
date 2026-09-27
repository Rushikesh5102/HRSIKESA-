# HṚṢĪKEŚA (हृषीकेश) — FP-17: Universal Digital Creation & Media Studio

## 1. Overview & Objective

The **Universal Digital Creation & Media Studio** establishes a unified, sovereign, local-first creation and production orchestration layer for HṚṢĪKEŚA.

It empowers HṚṢĪKEŚA to understand creative intent, formulate structured production plans, select appropriate models/tools/applications, execute generative and transformational pipelines, deterministically observe and verify output quality, iterate with bounded budgets, package compound media deliverables, enforce human approval boundaries, and deliver production-ready assets.

```
RUSHIKESH / USER
       ↓
   HṚṢĪKEŚA
       ↓
UNDERSTAND REQUEST
       ↓
  PLAN CREATION
       ↓
SELECT CAPABILITIES / MODELS / APPLICATIONS
       ↓
CREATE / EDIT / TRANSFORM
       ↓
    OBSERVE
       ↓
    VERIFY (Deterministic QA)
       ↓
    ITERATE (Bounded Convergence)
       ↓
    PACKAGE (Compound DAG)
       ↓
REQUEST APPROVAL WHEN REQUIRED (Sovereign Gate)
       ↓
DELIVER / PUBLISH
```

---

## 2. Core Architectural Principles

1. **First Audit Principle & Zero Duplication**:
   FP-17 strictly reuses existing HṚṢĪKEŚA infrastructure:
   - Universal Capability & Connector Fabric (FP-07)
   - Universal IDE (FP-09) & Autonomous Engineering (FP-10)
   - Workflow & Automation Engine (FP-11)
   - Service & Account Fabric (FP-12)
   - Digital Workspace & Application Operator (FP-13)
   - Agentic Mission & Workforce Runtime (FP-14)
   - Application & Service Ecosystem (FP-15)
   - Demonstration Learning (FP-16)
   - EventBus, ResourceGovernor, and MigrationManager (Migration 031)

2. **Local-First Priority**:
   Local tools, native synthesizers, and verified desktop applications are always prioritized over cloud services. Host capabilities (Blender, FFmpeg, ImageMagick) are probed honestly; if absent, they report `NOT_CONFIGURED` without fabricating availability or execution.

3. **Multi-Modal Native Support**:
   - **Image & Graphics**: Vector logos, astronomical geometry, raster transformations, format conversions (SVG, PNG, JPG).
   - **Video**: Scripts, storyboards, frame composition, video pipelines (MP4, WebM).
   - **Audio & Music**: Synthesized soundscapes, background melodies, audio normalization (WAV, MP3, OGG).
   - **Voice**: Speech synthesis, narration, transcriptions, speaker profiles.
   - **3D Assets**: Scene setup, OBJ/glTF geometry, mesh verification.
   - **Documents & Presentations**: Markdown reports, technical specifications, HTML slide decks, PDF/DOCX wrappers.
   - **Media Packages**: Compound multi-asset DAG packages (launch kits, brand identities).

4. **Deterministic Verification Gate**:
   Generation completion is never conflated with successful verification. Every artifact undergoes structural inspection, file existence checks, non-zero byte checks, syntax checks, dimension/aspect ratio validation, and SHA-256 cryptographic hashing.

5. **Bounded Iteration Loops**:
   Iteration loops evaluate incremental changes against requirements and increment iteration counters. When `maxIterations` is reached, the job transitions to `AWAITING_INPUT`, preventing runaway regeneration loops and token depletion.

6. **Sovereign Approval Boundaries**:
   Autonomous creation is permitted for safe local artifacts. Commercial publishing, external distribution, paid generation, and voice cloning mandate explicit sovereign approval (`AWAITING_APPROVAL`).

---

## 3. Domain Model & Database Schema (Migration 031)

### Tables Added in Migration 031:
- `creation_jobs`: Primary job registry tracking lifecycle, status, iteration counters, progress, and model attribution.
- `creation_artifacts`: Produced deliverables linked to jobs with format, location, byte size, hash, and verification status.
- `creation_iterations`: Iteration audit trail recording reasons for modification, artifacts produced, and score deltas.
- `design_contexts`: Reusable brand and design tokens (palette, typography, geometry rules, cultural aesthetic).
- `creation_reference_assets`: Reference and inspiration assets tracking provenance, license, and intent (`INSPIRE`, `ANALYZE`, `TRANSFORM`, `CLEAN_ROOM_RECREATE`).

### Lifecycle States:
- `DRAFT`: Job initialized with objectives and constraints.
- `PLANNING`: Capabilities resolved and execution strategy formulated.
- `QUEUED`: Deployed to queue under memory pressure or rate limits.
- `RUNNING`: Execution pipeline actively producing assets.
- `PAUSED`: Execution paused by sovereign command.
- `AWAITING_INPUT`: Awaiting user guidance after reaching iteration boundary.
- `AWAITING_APPROVAL`: Gated for sovereign approval (paid/commercial/publishing).
- `VERIFYING`: Artifacts undergoing multi-stage deterministic checks.
- `COMPLETED`: Verified deliverable ready for consumption.
- `FAILED`: Unrecoverable error recorded honestly.
- `CANCELLED`: Aborted by sovereign command.
- `REJECTED`: Rejected during approval gate.
- `ARCHIVED`: Archived for long-term historical retention.

---

## 4. Media Capability Fabric & Providers

Media operations are registered in `MediaCapabilityService` under standard identifiers:
- `image.generate`, `image.edit`, `image.upscale`, `image.analyze`
- `video.generate`, `video.edit`, `video.compose`, `video.extract_frames`
- `audio.generate`, `audio.edit`, `audio.mix`, `audio.normalize`
- `music.generate`, `music.compose`
- `voice.synthesize`, `voice.transcribe`, `voice.process`
- `3d.generate`, `3d.inspect`, `3d.convert`, `3d.render`
- `document.generate`, `document.convert`, `document.render`
- `presentation.generate`, `presentation.render`
- `design.generate`, `design.transform`, `design.inspect`

### Registered Providers:
1. **`native.document.compiler`** (Local, Always Available):
   Compiles structured technical specifications, reports, presentations, and design briefs.
2. **`native.audio.synthesizer`** (Local, Always Available):
   Synthesizes rhythmic soundscapes, voice prompts, and audio tones.
3. **`native.image.synthesizer`** (Local, Always Available):
   Generates vector SVGs, geometric emblems, Vedic astronomical layouts, and icons.
4. **`native.video.composer`** (Local, Always Available):
   Composes multi-scene video scripts, storyboards, and video media manifests.
5. **`app.blender`** (Host Desktop App):
   Probed dynamically. Marked `AVAILABLE` if Blender is discovered on disk/PATH, else `NOT_CONFIGURED`.
6. **`cli.ffmpeg`** (Host CLI Tool):
   Probed dynamically. Marked `AVAILABLE` if FFmpeg binary is on PATH, else `NOT_CONFIGURED`.
7. **`cli.imagemagick`** (Host CLI Tool):
   Probed dynamically. Marked `AVAILABLE` if ImageMagick (`magick`) is on PATH, else `NOT_CONFIGURED`.

---

## 5. Security, Provenance & Licensing Boundaries

1. **Untrusted Input Neutralization**:
   Creation prompts and instruction envelopes are sanitized. Known prompt injection patterns (system prompt overrides, roleplay jailbreaks) are defanged.
2. **Zero Credentials in Provenance**:
   API keys, passwords, bearer tokens, and credentials are strictly excluded from job provenance, logs, and artifacts.
3. **Reference Asset Protection**:
   Inspiration assets are tagged as `INSPIRE` or `CLEAN_ROOM_RECREATE`. Proprietary assets are never copied verbatim.
4. **Artifact Integrity**:
   Every artifact receives an immutable SHA-256 checksum upon generation. Spoofed verification flags are rejected.
5. **Path Traversal Defense**:
   Target paths containing `../` or `..\` are neutralized to prevent arbitrary file writes. Executable extensions (`.exe`, `.bat`, `.cmd`, `.sh`) are rejected.

---

## 6. Resource Governance & Host Hardware Safety

The host machine (16GB RAM, integrated GPU) is protected by `ResourceGovernor`:
- Under `CRITICAL_MEMORY` pressure (< 0.6 GB free RAM), heavy creation jobs are automatically transitioned to `QUEUED` rather than risking process crash.
- Concurrency is bounded to 1 heavy media pipeline at a time.
- Temporary files are stored in `.hrisekesa/creation_artifacts/` with automatic directory scoping.

---

## 7. Interfaces: REST API, SSE, CLI & UI

### REST API Endpoints:
- `POST /api/creation/jobs` — Create creation job (with optional `autoStart: true`)
- `GET /api/creation/jobs` — List jobs (filterable by `type`, `status`, `owner`, `companyId`, `projectId`)
- `GET /api/creation/jobs/:id` — Inspect job details and provenance
- `POST /api/creation/jobs/:id/start` — Start pipeline execution
- `POST /api/creation/jobs/:id/pause` — Pause running job
- `POST /api/creation/jobs/:id/resume` — Resume paused job
- `POST /api/creation/jobs/:id/cancel` — Cancel job
- `POST /api/creation/jobs/:id/iterate` — Request iteration with prompt modifications
- `POST /api/creation/jobs/:id/approve` — Sovereign approval for gated job
- `GET /api/creation/jobs/:id/artifacts` — List produced artifacts
- `GET /api/creation/capabilities` — List registered media capabilities
- `GET /api/creation/providers` — List registered providers and availability status
- `GET /api/creation/events` — Live Server-Sent Events (SSE) stream

### CLI Commands (`hres`):
- `hres create <type> "<objective>" [prompt]` — Create and execute media artifact
- `hres creation list` — Tabular listing of creation jobs
- `hres creation status <id>` — Inspect job metadata, iterations, and artifacts
- `hres creation verify <id>` — Run QA verifier on job artifacts
- `hres creation cancel <id>` — Cancel active creation job

### Control Center UI:
The **Creation Studio** view (`CreationStudioView.tsx`) provides:
- Live creation dashboard with status filtering and text search
- Active progress tracking with animated progress bars
- Comprehensive artifact inspection with size, version, and verification badges
- Complete lifecycle controls: Start, Pause, Resume, Iterate, Cancel, and Sovereign Approve
- Modal creation wizard supporting local-only execution and sovereign approval flags

---

## 8. Limitations & Deferred Work

- **Hardware**: Dedicated high-VRAM local diffusion and large text-to-video models require discrete GPU (NVIDIA RTX with ≥12GB VRAM). On the current Intel integrated GPU, heavy multi-gigabyte models are deferred in favor of lightweight local vector synthesis and CLI composition.
- **Voice Cloning**: Biometric voice cloning requires explicit sovereign biometric consent and authorized model configuration; unauthorized cloning is strictly blocked.
