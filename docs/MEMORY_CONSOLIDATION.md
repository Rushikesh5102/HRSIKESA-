# HṚṢĪKEŚA Memory Consolidation Service

## 1. Overview
The Memory Consolidation Subsystem executes bounded, resource-aware background maintenance of HṚṢĪKEŚA's memory and knowledge graph. Rather than arbitrarily mutating or deleting records, consolidation promotes validated candidate claims, links duplicate entities, flags aging/stale facts, and resolves contradictions.

## 2. Resource Governor Protection
Before initiating any consolidation cycle, `KnowledgeConsolidationService` inspects the active `ResourceGovernor`:
- In `CRITICAL_MEMORY` or `LOW_MEMORY` states, consolidation aborts early or reduces batch size to preserve local laptop memory.
- Batch limits are strictly bounded (default 25 claims per pass).

## 3. Consolidation Workflow
1. **Candidate Claim Processing**: Queries pending claims in `knowledge_claims` with status `CANDIDATE`. Validates against existing active facts and promotes supported claims to `CONFIRMED`.
2. **Duplicate Entity Merging**: Resolves entity alias collisions and points relationship foreign keys to the primary canonical entity.
3. **Contradiction Resolution**: Evaluates pending contradictions in `knowledge_contradictions`. If newer primary/authoritative evidence exists, applies `NEWER_SUPERSEDES` and updates the old fact to `SUPERSEDED`.
4. **Staleness Assessment**: Identifies facts observed beyond the configured stale threshold (default 30 days) and marks them for review or re-verification without destructive deletion.
