# HṚṢĪKEŚA — Phase 18: Advanced Model Router & Intelligence Gateway

## 1. Executive Summary

Phase 18 implements the **Advanced Model Router & Intelligence Gateway** of HṚṢĪKEŚA. Rather than naively picking the largest or most expensive model, HṚṢĪKEŚA dynamically selects the **right model for the right job under multi-dimensional constraints**:

```
                              Incoming Work / Prompt
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │    Task Profiler     │
                             │ (Type, Complexity,   │
                             │  Tokens, Tools, etc.)│
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  Constraint Filter   │
                             │ (Privacy, Context,   │
                             │  Vision, JSON, Tools)│
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Explainable Scorer   │
                             │  (Weighted Factors   │
                             │  under User Policy)  │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │   Selected Model &   │
                             │  Safe Fallback Chain │
                             └──────────┬───────────┘
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
        ┌─────────────────────────┐           ┌─────────────────────────┐
        │   Local Ollama Engine   │           │ Authorized Cloud Model  │
        │  (100% Private, 0-cost) │           │ (GPT-4o, Claude, Gemini)│
        └─────────────────────────┘           └─────────────────────────┘
```

---

## 2. Key Architectural Deliverables

1. **Persistent Model & Provider Registry (`src/models/registry/model.registry.ts`)**:
   - Dynamic provider health tracking (`HEALTHY`, `DEGRADED`, `UNCONFIGURED`, `DISABLED`).
   - Enriched model metadata (capabilities, context window, max tokens, pricing, latency class, cost class, privacy class).
   - Zero hardcoded assumptions; exposes actual runtime capabilities.

2. **Multi-Dimensional Task Profiler (`src/models/router/task.profiler.ts`)**:
   - Automatically derives `TaskProfile` from prompt and message history.
   - Categorizes into 17 task types (`CONVERSATION`, `REASONING`, `CODE`, `CODE_REVIEW`, `RESEARCH`, `PLANNING`, `GOAL_DECOMPOSITION`, `MISSION_EXECUTION`, `VERIFICATION`, `SUMMARIZATION`, `DOCUMENT_ANALYSIS`, `DATA_ANALYSIS`, `VISION`, `VOICE`, `EMBEDDING`, `STRUCTURED_EXTRACTION`, `CLASSIFICATION`).
   - Classifies complexity into `SIMPLE`, `STANDARD`, `COMPLEX`, `CRITICAL`.
   - Classifies privacy into `PUBLIC`, `NORMAL`, `PRIVATE`, `HIGHLY_PRIVATE`.

3. **Deterministic Hard Constraint Filtering (`src/models/router/model.scorer.ts`)**:
   - Privacy constraints (e.g. `HIGHLY_PRIVATE` strictly requires local execution).
   - Context window constraints (rejects models whose limit is smaller than input size).
   - Capability constraints (tools, structured output, vision, reasoning).
   - Provider health and authorization status.

4. **Explainable Multi-Factor Model Scorer**:
   - Capability fit: 30%
   - Task suitability: 20%
   - Privacy: 15%
   - Reliability: 15%
   - Latency: 10%
   - Cost: 10%
   - Dynamically configurable via 6 User Policies (`BALANCED`, `LOCAL_FIRST`, `QUALITY_FIRST`, `SPEED_FIRST`, `COST_FIRST`, `PRIVACY_FIRST`).

5. **Hardware & Resource Governor Integration**:
   - Integrates with Phase 16 `ResourceGovernor` to monitor laptop memory.
   - Applies scoring penalties when RAM is constrained (`LOW_MEMORY` / `CRITICAL_MEMORY`) to prevent OOM thrashing on the 16GB host laptop.
   - Hardware concurrency lock prevents multiple concurrent local model inferences.

6. **Persistent Auditing & Cost Accounting (`src/persistence/repositories/model-audit.repository.ts`)**:
   - Migration 009 creates `model_usage_audits` and `model_preferences` tables.
   - Records prompt/completion tokens, latency, cost estimate, and routing reason.
   - **Strict credential redaction**: API keys, bearer tokens, and secrets are stripped prior to storage.

7. **Control Center UI Integration (`ui/src/views/ModelsView.tsx`)**:
   - Indian Traditional aesthetic with gold accents and mandala motifs.
   - Real-time provider health badges, model capability tags, policy switcher.
   - Interactive Live Routing Decision Previewer with constraint validation breakdown.
   - Usage telemetry and historical audit log table.

---

## 3. Verification Summary

- **Automated Unit & Integration Tests**: 35/35 PASS in `tests/phase18-model-router.test.ts`.
- **Live Verifier**: 20/20 PASS in `scripts/live-phase18-verifier.ts` with real local Ollama end-to-end execution.
- **Backend Build**: TypeScript compilation exit code 0.
- **Frontend Build**: Vite production bundle built cleanly in 4.45s.
- **Security & Privacy**: Zero credential leaks, zero secret storage, zero quota evasion.
