# ADR-031: Universal Digital Creation & Media Studio (FP-17)

## Status
**ACCEPTED** (2026-09-27)

## Context
HṚṢĪKEŚA (हृषीकेश) requires a unified, local-first capability layer for creating, transforming, inspecting, and managing multimodal media:
- Vector/raster graphics, images, logos
- Video storyboards, composition, editing
- Audio tracks, narration, music, sound synthesis
- 3D assets, OBJ/mesh geometry, rendering
- Technical documentation (Markdown, PDF, DOCX)
- Slide presentations, deck compilation
- Compound media packages (launch kits, brand assets, social media suites)

Rather than simply providing an image generator or hard-coding proprietary cloud APIs, HṚṢĪKEŚA requires a sovereign creation and production orchestration layer that respects hardware constraints (16GB RAM), enforces local-first priority, deterministically verifies artifacts, bounds iteration loops, prevents infinite regeneration, and requires sovereign approval for high-risk or commercial publishing.

## Decision
We implemented **FP-17 — Universal Digital Creation & Media Studio**, architected on top of the established FP-07 through FP-16 substrate.

Key architectural decisions include:

1. **First Audit Principle & Zero Duplicate Infrastructure**:
   - Reused MigrationManager (Migration 031), EventBus, ResourceGovernor, UniversalCapabilityFabric (FP-07), WorkflowFabric (FP-11), EcosystemFabric (FP-15), DemonstrationFabric (FP-16), and the 17-agent workforce.
   - Did not create a secondary model router, workflow engine, or skill system.

2. **Durable Creation Domain Model**:
   - `CreationJob`: Complete lifecycle entity tracking ID, owner, company/project isolation, objective, prompt, inputs, outputs, provider, status (`DRAFT`, `PLANNING`, `QUEUED`, `RUNNING`, `PAUSED`, `AWAITING_APPROVAL`, `VERIFYING`, `COMPLETED`, `FAILED`, `CANCELLED`, `ARCHIVED`), progress percentage, verification results, bounded iterations (`currentIteration`, `maxIterations`), and license provenance.
   - `CreationArtifact`: Output deliverable tracking location, format, MIME type, dimensions/duration/pages, cryptographic SHA-256 hash, and deterministic QA verification flag.
   - `DesignContext`: Multi-tenant styling tokens (brand identity, colors, typography, geometric rules, aesthetic constraints).

3. **Provider-Agnostic, Local-First Capability Fabric**:
   - Deterministic native local providers (`native.image.synthesizer`, `native.video.composer`, `native.audio.synthesizer`, `native.document.compiler`) discovered and active out-of-the-box.
   - Probing host system for Blender, FFmpeg, ImageMagick without assuming availability. If uninstalled, capabilities honestly report `NOT_CONFIGURED` without fabrication.
   - Free local providers prioritized over paid cloud providers.

4. **Deterministic Multi-Stage Verifier & Quality Gate**:
   - Every artifact undergoes physical file inspection, non-zero byte check, format syntax check (SVG/XML, Markdown sections, OBJ geometry, JSON structure), dimension/aspect ratio check, and integrity validation before marked `COMPLETED`.
   - Score calculated as ratio of passed checks.

5. **Bounded Iteration Loop & Convergence Guard**:
   - Iteration requests (`iterateJob`) evaluate changes against requirements, increment iteration budget, and strictly halt when `maxIterations` is exceeded (`AWAITING_INPUT`), preventing infinite token spend or resource drain.

6. **Sovereign Approval Boundaries**:
   - Commercial generation, publishing, paid generation, and voice cloning require human confirmation (`AWAITING_APPROVAL`). Creation may be autonomous when safe; publication/distribution requires authorization.

7. **Untrusted Media Sandboxing & Security**:
   - Malicious prompt injection neutralised; embedded `<script>` tags in SVG filtered; executable extensions (`.exe`, `.bat`, `.sh`) rejected; path traversal (`../`) stripped; secrets never recorded in provenance.

8. **Control Center UI & CLI**:
   - `CreationStudioView.tsx` integrated in Control Center with real-time SSE stream (`/api/creation/events`), filtering, inspection, and creation controls.
   - CLI commands `hres create <type> ...` and `hres creation list/status/verify/cancel`.

## Consequences
### Positive
- Unified creation interface across all modalities without vendor lock-in.
- Works offline and local-first with zero external cloud dependencies for standard pipelines.
- Verifiable evidence and complete cryptographic provenance on all generated media.
- Bounded memory and iteration budgets prevent host crashes and runaway loops.
- Seamlessly invoked by FP-16 learned procedures and FP-11 workflows.

### Compliance
- FP-16 remains frozen.
- 0 TypeScript errors.
- 126 dedicated tests passing with 0 failures in `tests/fp-17-creation-media.test.ts`.
