# HṚṢĪKEŚA — Model Routing Architecture & Algorithms

## 1. Routing Lifecycle

The routing process is completely deterministic and operates in sub-millisecond in-process execution:

```
Request (Prompt / Chat Messages / Metadata)
   │
   ├─► 1. Task Profiler (src/models/router/task.profiler.ts)
   │     • Detects TaskType (17 categories)
   │     • Derives TaskComplexity (SIMPLE, STANDARD, COMPLEX, CRITICAL)
   │     • Evaluates PrivacyLevel (PUBLIC, NORMAL, PRIVATE, HIGHLY_PRIVATE)
   │     • Computes estimated input token length (~chars / 4)
   │     • Identifies requirements (tools, structured output, vision, reasoning)
   │
   ├─► 2. Hard Constraint Validation (src/models/router/model.scorer.ts)
   │     • Provider enabled & healthy
   │     • Model availability === true
   │     • Privacy check: PRIVATE/HIGHLY_PRIVATE forbids cloud transit
   │     • Tool support check (if requiresTools === true)
   │     • Structured JSON support check (if format === 'json')
   │     • Vision capability check (if requiresVision === true)
   │     • Context window check (estimatedInputTokens <= contextWindow)
   │
   ├─► 3. Explainable Multi-Factor Scoring (ModelScorer)
   │     • Computes sub-scores (0..100) for capability, suitability, privacy, reliability, latency, cost
   │     • Applies active policy weights (BALANCED, LOCAL_FIRST, QUALITY_FIRST, SPEED_FIRST, COST_FIRST, PRIVACY_FIRST)
   │     • Adjusts for ResourceGovernor memory pressure state
   │
   ├─► 4. Candidate Ranking & Fallback Assembly
   │     • Sorts valid candidates descending by total score
   │     • Highest scoring candidate becomes primary selection
   │     • Next 3 ranked candidates form fallback recovery chain
   │
   └─► 5. Execution & Audit Logging (ModelRouter)
         • Executes primary model; on failure, tries fallback chain
         • Redacts secrets from explanation & error messages
         • Records prompt/completion tokens, latency, cost in SQLite audit repository
```

## 2. Policy Weights

| Policy | Capability | Task Suitability | Privacy | Reliability | Latency | Cost | Special Boosts |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BALANCED** (Default) | 30% | 20% | 15% | 15% | 10% | 10% | Balanced optimization across all factors |
| **LOCAL_FIRST** | 20% | 15% | 25% | 15% | 10% | 15% | +25 pts boost to local models |
| **QUALITY_FIRST** | 40% | 25% | 10% | 15% | 5% | 5% | +20 pts boost to reasoning & code models |
| **SPEED_FIRST** | 20% | 15% | 10% | 15% | 30% | 10% | High weight on FAST latency class models |
| **COST_FIRST** | 20% | 15% | 10% | 15% | 10% | 30% | +35 pts boost to free-local models |
| **PRIVACY_FIRST** | 15% | 10% | 45% | 15% | 5% | 10% | +30 pts boost to local models; strict cloud rejection |

## 3. Subsystem Integrations

- **Agent Workforce**: Agents (`Rahu`, `Gandiva`, `Vighna`, etc.) request semantic roles (`reasoning`, `coding`, `verification`); the router resolves the concrete model without hardcoding.
- **Goals & Missions**: Scopes routing decisions with `goalId`, `missionId`, `companyId`, and `projectId`.
- **Research Engine**: Dynamic routing between fast local classification and deep cloud synthesis.
- **Semantic Memory**: Embeddings are routed strictly via `OllamaEmbeddingProvider` and kept isolated from general conversational routing.
