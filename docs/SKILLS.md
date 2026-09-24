# HṚṢĪKEŚA Skills System Documentation

## Overview
A Skill in HṚṢĪKEŚA is a structured, reusable procedure that accomplishes a complex objective through a deterministic sequence of steps (tools, LLM calls, checkpoints, conditions, or child skill invocations).

Skills bridge the gap between high-level autonomous goals (Phase 15) and discrete tool executions (Phase 3/Phase 13), providing repeatable, auditable recipes for operational problems.

## Skill Anatomy
```typescript
interface SkillDefinition {
  id: string;                      // Unique slug (e.g. 'inspect-project')
  name: string;                    // Human-readable title
  description: string;             // Detailed capability description
  version: string;                 // Semver string ('1.0.0')
  category: SkillCategory;         // DEVELOPMENT, RESEARCH, SYSTEM, KNOWLEDGE, OPERATIONS, ANALYSIS, GENERAL
  status: SkillStatus;             // DRAFT, ACTIVE, DEPRECATED, DISABLED
  riskLevel: SkillRiskLevel;       // LOW, MEDIUM, HIGH, CRITICAL
  requiresApproval: boolean;       // High-risk human authorization gate
  author: string;                  // System or human creator
  tags: string[];                  // Discovery tags
  triggerPhrases: string[];        // Common natural language activation patterns
  inputsSchema: Record<string, SkillParameterSchema>;
  outputsSchema: Record<string, SkillParameterSchema>;
  steps: SkillStep[];              // Ordered execution steps forming a DAG
  requiredCapabilities: string[];  // e.g. ['filesystem:read', 'terminal:execute']
  providedCapabilities: string[];  // e.g. ['project:inspect']
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}
```

## Step Types
1. **TOOL**: Invokes a tool via the unified `ToolExecutionBus` with permission checks and audit logging.
2. **MODEL_PROMPT**: Routes a structured prompt to the `ModelRouter` with schema validation.
3. **CHECKPOINT**: Emits state snapshot for pause/resume and state verification.
4. **CONDITION**: Evaluates boolean predicate to branch or skip downstream steps.
5. **SUB_SKILL**: Composes another skill hierarchically with parameter mapping.

## Built-in Skills Catalog
HṚṢĪKEŚA ships with 8 baseline operational skills:
1. `inspect-project`: Scans directory structure, detects package configurations, and reports environment state.
2. `analyze-code`: Scans source files for syntax, lint issues, architectural patterns, and code quality.
3. `run-tests`: Executes test suites via local test runners and parses results into structured outcomes.
4. `research-topic`: Gathers information from local knowledge graph and web search with evidence synthesis.
5. `create-local-file`: Safely creates or edits local project files with boundary validation.
6. `verify-file`: Verifies file existence, content integrity, and checksum matches.
7. `summarize-document`: Extracts key takeaways, action items, and executive summaries from documents.
8. `investigate-error`: Diagnoses stack traces, error messages, and logs to propose root-cause remedies.

## Lifecycle States
- `DRAFT`: Under development; not matched in production requests.
- `ACTIVE`: Registered, validated, and available for matching and execution.
- `DEPRECATED`: Usable but flagged for replacement; improvement suggestions prioritized.
- `DISABLED`: Manually deactivated; excluded from matcher and runner.
