# HṚṢĪKEŚA (हृषीकेश) — Engineering Standards & Quality Assurance Manual
**Document Version:** 3.0.0  
**Classification:** Software Engineering Standards, Code Quality & QA Protocol  
**Enforcement Authority:** Vighna (QA & Anti-Hallucination) & Spooṭa (AST Review)

---

## 1. Core Engineering Principles

1. **Strict TypeScript & Native ESM**:
   - Every file must compile cleanly under `tsc --noEmit` with zero type errors.
   - All internal relative imports must explicitly include the `.js` extension (e.g., `import { Kernel } from './kernel.js';`) to adhere to native Node.js ECMAScript Module standards.
2. **Zero-Regression Invariant**:
   - No code modification may break any of the 840+ tests across the 121 test suites.
   - If a test fails, the build is broken; commits are strictly prohibited until the regression is resolved.
3. **Local Hardware Budget Compliance (ADR-006)**:
   - Target Host: 16 GB RAM, Intel Core Ultra 5 125H, Intel Arc graphics.
   - **Concurrency Limit**: Exactly 1 local LLM inference stream may execute at any given moment. Parallel local LLM calls must queue behind the local model lock.
   - **Memory Ceiling**: Operational memory footprint must remain below 12 GB. If available RAM drops below 1 GB, ResourceGovernor triggers `CRITICAL_MEMORY` throttling.

---

## 2. Directory & Layer Organization

All project code must strictly adhere to the established layered architecture:

```text
src/
├── core/            <-- Hardware detection, logging, events, configuration, identity
├── runtime/         <-- Microkernel, boot lifecycle, recovery managers
├── persistence/     <-- SQLite database manager, migrations, entity repositories
├── models/          <-- Provider adapters (Ollama, OpenAI, Anthropic, Gemini), router, registry
├── conversation/    <-- Fast chat gate, session manager, context assembler, intent classifier
├── agents/          <-- 17-agent registry, DAG planner, blackboard, mission orchestrator
├── tools/           <-- ToolBus, security sandbox, permission manager, builtin tools, MCP
├── capabilities/    <-- Pluggable capability adapters (Browser, Computer, Voice, Terminal)
├── voice/           <-- Pronunciation normalizer, multilingual detector, streaming TTS, VAD
├── memory/          <-- Semantic embeddings, hybrid retriever, creator profile
├── knowledge/       <-- Entities, relations, facts, validation, consolidation
├── company/         <-- Organizations, projects, departments, workforce, KPIs, decisions
├── goal/            <-- Autonomous goal planner, decomposer, execution engine, scheduler
├── research/        <-- Web crawler, source extractor, prompt injection defense, synthesizer
├── skills/          <-- Skill registry, security validator, execution sandbox
└── self-improvement/<-- Anomaly detector, proposal manager, canary benchmarks, rollback
```

---

## 3. QA Benchmark Matrix (Track A Latency Protocol)

To verify the core invariant that conversational responsiveness is decoupled from task execution time, QA must evaluate the 10 canonical benchmark prompts:

```text
┌────┬────────────────────────────────────────────────────────┬──────────────────────┬────────────────────────┐
│ #  │ Benchmark Test Prompt                                  │ Target Triage        │ Target First Audio/Byte│
├────┼────────────────────────────────────────────────────────┼──────────────────────┼────────────────────────┤
│ 1  │ "Hello HṚṢĪKEŚA."                                      │ CASUAL_GREETING      │ < 5 ms (Instant Path)  │
│ 2  │ "Who created you and what is your purpose?"            │ IDENTITY_QUERY       │ < 5 ms (Instant Path)  │
│ 3  │ "System status report."                                │ STATUS_QUERY         │ < 15 ms (Direct SQL)   │
│ 4  │ "What are the 17 Vedic agents?"                        │ KNOWLEDGE_QUERY      │ < 100 ms (Fast Retr)   │
│ 5  │ "Remember that my favourite language is Marathi."      │ MEMORY_WRITE         │ < 50 ms (Non-blocking) │
│ 6  │ "List the files in the workspace."                     │ TOOL_EXECUTION       │ < 200 ms (Local Tool)  │
│ 7  │ "Open Notepad and type 'HṚṢĪKEŚA ready'."              │ COMPUTER_TASK        │ < 10 ms Ack -> Async   │
│ 8  │ "Launch browser and inspect GitHub."                   │ BROWSER_TASK         │ < 10 ms Ack -> Async   │
│ 9  │ "Research the latest autonomous agent architectures."  │ RESEARCH_TASK        │ < 10 ms Ack -> Async   │
│ 10 │ "Goal: Build a high-performance web analytics tool."   │ GOAL_REQUEST         │ < 10 ms Ack -> Async   │
└────┴────────────────────────────────────────────────────────┴──────────────────────┴────────────────────────┘
```

---

## 4. Test Verification Commands

Before any release or baseline freeze:

1. **Lint & Type Check**:
   ```bash
   npm run lint
   ```
2. **Full Regression Suite**:
   ```bash
   npm test
   ```
3. **Voice & Pronunciation Suite**:
   ```bash
   npx tsx --test tests/voice-pronunciation-multilingual.test.ts
   ```
4. **Live Acoustic Verification**:
   ```bash
   npx tsx tests/live_verification_runner.ts
   ```
