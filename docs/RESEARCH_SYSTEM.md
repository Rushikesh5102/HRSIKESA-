# HṚṢĪKEŚA Research Intelligence System
## Technical Implementation & Operational Guide

---

### 1. Overview

The **HṚṢĪKEŚA Research Intelligence System** provides autonomous, multi-source research capabilities for technical investigations, market intelligence, open-source benchmarking, and regulatory analysis.

---

### 2. Core Components

#### `ResearchEngine` (`src/research/engine/research.engine.ts`)
The central orchestrator for research lifecycles. Handles:
- Natural language research intent recognition.
- Budget calculation (`QUICK`, `STANDARD`, `DEEP`).
- Multi-source search discovery via `ISearchProvider`.
- Resilient web acquisition (Playwright browser / native HTTP fetch with User-Agent identification).
- Extraction, deduplication, and evidence storage.
- Coordination with the 17-agent workforce (Rahu for discovery, Gāṇḍīva for technical repo inspection, Vighna for verification).
- Lifecycle state transitions (`PLANNING` -> `RESEARCHING` -> `VERIFYING` -> `COMPLETED` / `PAUSED` / `CANCELLED` / `FAILED`).

#### `SourceExtractor` (`src/research/extractor/source.extractor.ts`)
Extracts structured intelligence from raw web HTML or plain text:
- Title extraction (from `<title>`, `og:title`, or fallback).
- Heading hierarchy (h1, h2, h3).
- Clean text extraction with noise/script removal.
- Published timestamp resolution and Freshness categorization (`CURRENT`, `RECENT`, `DATED`, `HISTORICAL`, `UNKNOWN`).
- Credibility tier assignment (`AUTHORITATIVE`, `PRIMARY`, `SECONDARY`, `COMMUNITY`, `UNVERIFIED`).
- SHA-256 normalized content hashing for deduplication.
- Atomic claim extraction with heuristic claim typing (`FACT`, `CLAIM`, `INFERENCE`, `OPINION`).

#### `CrossSourceAnalyzer` (`src/research/analyzer/cross.source.analyzer.ts`)
Performs cross-source evidence comparison:
- Jaccard token clustering of related claims across distinct domains.
- Corroboration verification across primary and secondary sources.
- Contradiction detection (version number conflicts, platform compatibility disagreements, factual discrepancies).
- Confidence score derivation based on source credibility and domain diversity.
- Structured citation generation with 1-indexed references.

#### `ResearchSynthesizer` (`src/research/synthesizer/research.synthesizer.ts`)
Generates persistent artifacts and memory entries:
- Generates structured, readable markdown report (`research.md`).
- Exports machine-readable source registry (`sources.json`) and evidence claim log (`evidence.json`).
- Extracts verified durable facts into Long-Term Memory (Tier 9: `knowledge`, `provenance: learned`).

#### `PromptInjectionDefense` (`src/research/security/prompt.injection.defense.ts`)
Inspects raw web content for indirect prompt injections, jailbreaks, and sensitive keyword exfiltration attempts:
- Scans for instruction override phrases (`ignore previous instructions`, `you are now in developer mode`).
- Defangs executable syntax (`powershell.exe`, `process.env`, `eval(`, `curl`).
- Isolates text inside `<untrusted_web_content>` tags.

---

### 3. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/research/intent` | Parses natural language prompt into structured intent |
| `GET` | `/research` | Lists research studies with optional status/company/project filters |
| `POST` | `/research` | Creates a new research study (optional `autoExecute: true`) |
| `GET` | `/research/:id` | Retrieves full study details, sources, evidence, and findings |
| `POST` | `/research/:id/execute` | Executes the research pipeline for a study |
| `GET` | `/research/:id/report` | Returns the synthesized markdown report and artifacts |
| `POST` | `/research/:id/pause` | Pauses an active research study |
| `POST` | `/research/:id/cancel` | Cancels a research study |
| `GET` | `/research/:id/sources` | Lists acquired sources for a study |
| `GET` | `/research/:id/evidence` | Lists atomic evidence items for a study |
| `GET` | `/research/:id/findings` | Lists verified findings and citations for a study |

---

### 4. Scheduled Research Monitoring

Studies can be periodically refreshed and monitored via the Phase 16 `PersistentScheduler`:
```typescript
const schedule = scheduler.schedule({
  targetId: study.id,
  scheduleType: 'recurring',
  cronExpression: '0 8 * * *', // Daily at 8 AM
  targetType: 'research',
  action: 'execute_study',
  maxRuns: 30,
});
```
On each scheduled interval, `ResearchEngine` re-acquires sources, computes fresh content hashes, detects changes, and updates evidence.
